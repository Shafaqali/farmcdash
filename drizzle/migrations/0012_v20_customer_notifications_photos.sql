DO $install_notifications$
BEGIN
  IF to_regclass('public.customer_notifications') IS NULL THEN
    RAISE EXCEPTION 'Existing farm notification schema is missing. Stop and inspect prior migrations.';
  END IF;
  IF to_regprocedure('public.remind_unpaid_customers()') IS NULL THEN
    EXECUTE $notification_base$
ALTER TABLE public.customer_notifications
  ALTER COLUMN animal_id DROP NOT NULL,
  ADD COLUMN kind text NOT NULL DEFAULT 'animal' CHECK (kind IN ('animal','payment'));

CREATE FUNCTION public.customer_has_payment_due(_customer uuid, _owner uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
SELECT EXISTS (SELECT 1 FROM public.customers c WHERE c.id=_customer AND c.user_id=_owner
  AND coalesce((SELECT sum(a.monthly_charge * (
    SELECT count(*) FROM generate_series(0, greatest(0,
      (extract(year FROM least(current_date,coalesce(a.sold_date,current_date)))::int-extract(year FROM a.arrival)::int)*12
      + extract(month FROM least(current_date,coalesce(a.sold_date,current_date)))::int-extract(month FROM a.arrival)::int)) n
    WHERE (a.arrival + make_interval(months=>n))::date <= least(current_date,coalesce(a.sold_date,current_date))
  )) FROM public.animals a WHERE a.owner_id=c.id AND a.user_id=c.user_id),0)
  > coalesce((SELECT sum(p.amount) FROM public.payments p WHERE p.customer_id=c.id AND p.user_id=c.user_id),0))
$$;
REVOKE ALL ON FUNCTION public.customer_has_payment_due(uuid,uuid) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.can_read_customer_notice(_viewer uuid, _owner uuid, _customer uuid, _animal text, _kind text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
SELECT _viewer=auth.uid()
  AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND role='customer')
  AND EXISTS (SELECT 1 FROM public.customer_access ca JOIN public.customers c ON c.id=ca.customer_id AND c.user_id=ca.owner_id
    WHERE ca.viewer_id=auth.uid() AND ca.owner_id=_owner AND ca.customer_id=_customer)
  AND CASE WHEN _kind='payment' THEN public.customer_has_payment_due(_customer,_owner)
    ELSE EXISTS (SELECT 1 FROM public.animals WHERE id=_animal AND user_id=_owner AND owner_id=_customer) END
$$;
REVOKE ALL ON FUNCTION public.can_read_customer_notice(uuid,uuid,uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.can_read_customer_notice(uuid,uuid,uuid,text,text) TO authenticated;
ALTER POLICY "customer reads assigned notifications" ON public.customer_notifications
  USING(public.can_read_customer_notice(viewer_id,owner_id,customer_id,animal_id,kind));
ALTER POLICY "customer marks own notification" ON public.customer_notifications
  USING(public.can_read_customer_notice(viewer_id,owner_id,customer_id,animal_id,kind))
  WITH CHECK(public.can_read_customer_notice(viewer_id,owner_id,customer_id,animal_id,kind));

CREATE FUNCTION public.remind_unpaid_customers() RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE sent integer;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_farm_owner() THEN RAISE EXCEPTION 'Owner account required'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text || ':payment-reminders',0));
  INSERT INTO public.customer_notifications(viewer_id,owner_id,customer_id,animal_id,kind,title,message)
  SELECT ca.viewer_id,c.user_id,c.id,NULL,'payment','Payment reminder',
    'Aapki farm care payment baki hai. Payment ke liye farm owner se sampark karein.'
  FROM public.customers c JOIN public.customer_access ca ON ca.customer_id=c.id AND ca.owner_id=c.user_id
  JOIN public.user_roles r ON r.user_id=ca.viewer_id AND r.role='customer'
  WHERE c.user_id=auth.uid() AND public.customer_has_payment_due(c.id,c.user_id)
    AND NOT EXISTS (SELECT 1 FROM public.customer_notifications n WHERE n.customer_id=c.id AND n.owner_id=c.user_id
      AND n.viewer_id=ca.viewer_id AND n.kind='payment' AND n.created_at >= date_trunc('day',now()));
  GET DIAGNOSTICS sent=ROW_COUNT;
  RETURN sent;
END $$;
REVOKE ALL ON FUNCTION public.remind_unpaid_customers() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.remind_unpaid_customers() TO authenticated;
CREATE INDEX customer_payment_reminder_dedup ON public.customer_notifications(owner_id,customer_id,viewer_id,created_at) WHERE kind='payment';
$notification_base$;
  ELSIF to_regprocedure('public.customer_has_payment_due(uuid,uuid)') IS NULL
    OR NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='customer_notifications' AND column_name='kind') THEN
    RAISE EXCEPTION 'Partial v17 notification migration. Stop and inspect schema.';
  END IF;
  IF to_regprocedure('public.register_background_device(uuid,text)') IS NULL THEN
    EXECUTE $notification_background$
ALTER TABLE public.customer_notifications ADD COLUMN reminder_day date NOT NULL DEFAULT CURRENT_DATE;
UPDATE public.customer_notifications SET reminder_day=created_at::date;
CREATE UNIQUE INDEX customer_payment_one_per_day ON public.customer_notifications(viewer_id,owner_id,customer_id,reminder_day) WHERE kind='payment';

CREATE OR REPLACE FUNCTION public.remind_unpaid_customers() RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE sent integer;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_farm_owner() THEN RAISE EXCEPTION 'Owner account required'; END IF;
  INSERT INTO public.customer_notifications(viewer_id,owner_id,customer_id,animal_id,kind,title,message)
  SELECT ca.viewer_id,c.user_id,c.id,NULL,'payment','Payment reminder',
    'Aapki farm care payment baki hai. Payment ke liye farm owner se sampark karein.'
  FROM public.customers c JOIN public.customer_access ca ON ca.customer_id=c.id AND ca.owner_id=c.user_id
  JOIN public.user_roles r ON r.user_id=ca.viewer_id AND r.role='customer'
  WHERE c.user_id=auth.uid() AND public.customer_has_payment_due(c.id,c.user_id)
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS sent=ROW_COUNT;
  RETURN sent;
END $$;
CREATE TABLE public.customer_background_devices (
  id uuid PRIMARY KEY, viewer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id uuid NOT NULL, secret_hash text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT now()+interval '30 days'
);
CREATE TABLE public.customer_background_deliveries (
  device_id uuid REFERENCES public.customer_background_devices(id) ON DELETE CASCADE,
  notice_id uuid REFERENCES public.customer_notifications(id) ON DELETE CASCADE,
  PRIMARY KEY(device_id,notice_id)
);
ALTER TABLE public.customer_background_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_background_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.customer_background_devices,public.customer_background_deliveries FROM anon,authenticated;
GRANT ALL ON public.customer_background_devices,public.customer_background_deliveries TO service_role;

CREATE FUNCTION public.register_background_device(_device uuid,_secret text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE sid uuid := (auth.jwt()->>'session_id')::uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND role='customer')
    OR NOT EXISTS(SELECT 1 FROM auth.sessions WHERE id=sid AND user_id=auth.uid() AND (not_after IS NULL OR not_after>now()))
    THEN RAISE EXCEPTION 'Customer session required' USING ERRCODE='28000'; END IF;
  IF _secret IS NULL OR _secret !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'Invalid device credential'; END IF;
  INSERT INTO public.customer_background_devices(id,viewer_id,session_id,secret_hash)
    VALUES(_device,auth.uid(),sid,encode(sha256(_secret::bytea),'hex'))
  ON CONFLICT(id) DO UPDATE SET session_id=sid,expires_at=now()+interval '30 days'
    WHERE customer_background_devices.viewer_id=auth.uid()
      AND customer_background_devices.secret_hash=encode(sha256(_secret::bytea),'hex');
  IF NOT FOUND THEN RAISE EXCEPTION 'Device unavailable'; END IF;
END $$;

CREATE FUNCTION public.background_device_viewer(_device uuid,_secret text) RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE viewer uuid;
BEGIN
  SELECT d.viewer_id INTO viewer FROM public.customer_background_devices d
    JOIN auth.sessions s ON s.id=d.session_id AND s.user_id=d.viewer_id
    JOIN auth.users u ON u.id=d.viewer_id
    JOIN public.user_roles r ON r.user_id=d.viewer_id AND r.role='customer'
    WHERE d.id=_device AND d.secret_hash=encode(sha256(_secret::bytea),'hex') AND d.expires_at>now()
      AND (s.not_after IS NULL OR s.not_after>now()) AND (u.banned_until IS NULL OR u.banned_until<now());
  IF viewer IS NULL THEN RAISE EXCEPTION 'Background access expired' USING ERRCODE='28000'; END IF;
  RETURN viewer;
END $$;

CREATE FUNCTION public.poll_customer_notifications(_device uuid,_secret text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE viewer uuid := public.background_device_viewer(_device,_secret);
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(viewer::text || ':customer-daily-reminder',0));
  INSERT INTO public.customer_notifications(viewer_id,owner_id,customer_id,animal_id,kind,title,message)
  SELECT viewer,c.user_id,c.id,NULL,'payment','Payment reminder',
    'Aapki farm care payment baki hai. Payment ke liye farm owner se sampark karein.'
  FROM public.customers c JOIN public.customer_access ca ON ca.customer_id=c.id AND ca.owner_id=c.user_id
  WHERE ca.viewer_id=viewer AND public.customer_has_payment_due(c.id,c.user_id)
    AND NOT EXISTS(SELECT 1 FROM public.customer_notifications n WHERE n.viewer_id=viewer AND n.customer_id=c.id
      AND n.owner_id=c.user_id AND n.kind='payment' AND n.reminder_day=current_date)
  ON CONFLICT DO NOTHING;
  RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('id',n.id,'title',
    CASE WHEN n.kind='payment' THEN 'Payment reminder' ELSE n.title END,
    'body',CASE WHEN n.kind='payment' THEN 'Farm care payment baki hai. App kholkar dekhein.' ELSE 'Aapke animal ka naya update hai. App kholkar dekhein.' END))
    FROM (SELECT n.* FROM public.customer_notifications n
      JOIN public.customer_access ca ON ca.customer_id=n.customer_id AND ca.owner_id=n.owner_id AND ca.viewer_id=n.viewer_id
      JOIN public.customers c ON c.id=n.customer_id AND c.user_id=n.owner_id
      WHERE n.viewer_id=viewer AND n.read_at IS NULL
        AND CASE WHEN n.kind='payment' THEN n.created_at>=date_trunc('day',now()) AND public.customer_has_payment_due(n.customer_id,n.owner_id)
          ELSE EXISTS(SELECT 1 FROM public.animals a WHERE a.id=n.animal_id AND a.user_id=n.owner_id AND a.owner_id=n.customer_id) END
        AND NOT EXISTS(SELECT 1 FROM public.customer_background_deliveries b WHERE b.device_id=_device AND b.notice_id=n.id)
      ORDER BY n.created_at,n.id LIMIT 30) n),'[]'::jsonb);
END $$;

CREATE FUNCTION public.ack_customer_notifications(_device uuid,_secret text,_ids uuid[]) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE viewer uuid := public.background_device_viewer(_device,_secret);
BEGIN
  IF cardinality(_ids)>30 THEN RAISE EXCEPTION 'Batch too large'; END IF;
  INSERT INTO public.customer_background_deliveries(device_id,notice_id)
    SELECT _device,id FROM public.customer_notifications WHERE viewer_id=viewer AND id=ANY(_ids)
    ON CONFLICT DO NOTHING;
END $$;
CREATE FUNCTION public.revoke_background_device(_device uuid,_secret text) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
  DELETE FROM public.customer_background_devices WHERE id=_device AND secret_hash=encode(sha256(_secret::bytea),'hex')
$$;
REVOKE ALL ON FUNCTION public.register_background_device(uuid,text),public.background_device_viewer(uuid,text),
  public.poll_customer_notifications(uuid,text),public.ack_customer_notifications(uuid,text,uuid[]),public.revoke_background_device(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.register_background_device(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.poll_customer_notifications(uuid,text),public.ack_customer_notifications(uuid,text,uuid[]),
  public.revoke_background_device(uuid,text) TO anon,authenticated;
$notification_background$;
  ELSIF to_regprocedure('public.poll_customer_notifications(uuid,text)') IS NULL
    OR to_regprocedure('public.ack_customer_notifications(uuid,text,uuid[])') IS NULL
    OR to_regprocedure('public.revoke_background_device(uuid,text)') IS NULL
    OR to_regclass('public.customer_payment_one_per_day') IS NULL THEN
    RAISE EXCEPTION 'Partial v18 notification migration. Stop and inspect schema.';
  END IF;
END
$install_notifications$;
DO $install_customer_photos$
BEGIN
  IF to_regprocedure('public.customer_animal_photos()') IS NULL THEN
    EXECUTE $customer_photos$
CREATE FUNCTION public.customer_animal_photos()
RETURNS TABLE(animal_id text,photo_path text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND role='customer')
    THEN RAISE EXCEPTION 'Customer account required'; END IF;
  RETURN QUERY SELECT DISTINCT a.id,a.photo_url FROM public.animals a
    JOIN public.customer_access ca ON ca.customer_id=a.owner_id AND ca.owner_id=a.user_id
    JOIN public.customers c ON c.id=ca.customer_id AND c.user_id=ca.owner_id
    WHERE ca.viewer_id=auth.uid() AND a.photo_url IS NOT NULL
      AND split_part(a.photo_url,'/',1)=a.id;
END $$;
REVOKE ALL ON FUNCTION public.customer_animal_photos() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.customer_animal_photos() TO authenticated;
DROP POLICY IF EXISTS "animal photos read" ON storage.objects;
CREATE POLICY "animal photos read" ON storage.objects FOR SELECT TO authenticated
  USING(bucket_id='animal-photos' AND public.can_read_animal_care((storage.foldername(name))[1]));
$customer_photos$;
  END IF;
END
$install_customer_photos$;
DO $english_notifications$
DECLARE fn regprocedure; definition text;
BEGIN
  FOREACH fn IN ARRAY ARRAY['public.remind_unpaid_customers()'::regprocedure,'public.poll_customer_notifications(uuid,text)'::regprocedure] LOOP
    definition := pg_get_functiondef(fn);
    definition := replace(definition, 'Aapki farm care payment baki hai. Payment ke liye farm owner se sampark karein.', 'Your farm care payment is outstanding. Contact the farm owner to arrange payment.');
    definition := replace(definition, 'Farm care payment baki hai. App kholkar dekhein.', 'Your farm care payment is outstanding. Open the app for details.');
    definition := replace(definition, 'Aapke animal ka naya update hai. App kholkar dekhein.', 'There is a new update about your animal. Open the app for details.');
    EXECUTE definition;
  END LOOP;
END
$english_notifications$;
UPDATE public.customer_notifications SET message='Your farm care payment is outstanding. Contact the farm owner to arrange payment.' WHERE kind='payment' AND message='Aapki farm care payment baki hai. Payment ke liye farm owner se sampark karein.';