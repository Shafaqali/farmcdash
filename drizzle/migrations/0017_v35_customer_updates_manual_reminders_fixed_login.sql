ALTER TABLE public.customer_notifications DROP CONSTRAINT IF EXISTS customer_notifications_kind_check;
ALTER TABLE public.customer_notifications ADD CONSTRAINT customer_notifications_kind_check CHECK (kind IN ('animal','payment','account'));
CREATE OR REPLACE FUNCTION public.can_read_customer_notice(_viewer uuid,_owner uuid,_customer uuid,_animal text,_kind text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
SELECT _viewer=auth.uid()
 AND EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND role='customer')
 AND EXISTS(SELECT 1 FROM public.customer_access ca JOIN public.customers c ON c.id=ca.customer_id AND c.user_id=ca.owner_id WHERE ca.viewer_id=auth.uid() AND ca.owner_id=_owner AND ca.customer_id=_customer)
 AND CASE WHEN _kind='payment' THEN public.customer_has_payment_due(_customer,_owner)
 WHEN _kind='account' THEN _animal IS NULL
 ELSE EXISTS(SELECT 1 FROM public.animals WHERE id=_animal AND user_id=_owner AND owner_id=_customer) END
$$;
CREATE OR REPLACE FUNCTION public.enqueue_customer_update(_owner uuid,_customer uuid,_animal text,_title text,_message text,_kind text DEFAULT 'animal') RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
INSERT INTO public.customer_notifications(viewer_id,owner_id,customer_id,animal_id,kind,title,message)
SELECT ca.viewer_id,_owner,_customer,_animal,_kind,_title,_message
FROM public.customer_access ca JOIN public.customers c ON c.id=ca.customer_id AND c.user_id=ca.owner_id
JOIN public.user_roles r ON r.user_id=ca.viewer_id AND r.role='customer'
WHERE ca.owner_id=_owner AND ca.customer_id=_customer
AND ((_kind='account' AND _animal IS NULL) OR EXISTS(SELECT 1 FROM public.animals a WHERE a.id=_animal AND a.user_id=_owner AND a.owner_id=_customer))
$$;
REVOKE ALL ON FUNCTION public.enqueue_customer_update(uuid,uuid,text,text,text,text) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.notify_animal_update() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.animals; title text; body text;
BEGIN
 IF TG_OP='UPDATE' AND to_jsonb(NEW)=to_jsonb(OLD) THEN RETURN NEW; END IF;
 SELECT * INTO a FROM public.animals WHERE id=NEW.animal_id AND user_id=NEW.user_id;
 IF NOT FOUND OR a.owner_id IS NULL THEN RETURN NEW; END IF;
 IF TG_TABLE_NAME='animal_health' THEN title:='Health update'; body:='A health observation was recorded. Open the animal record for details.';
 ELSIF TG_TABLE_NAME='weights' THEN title:='Growth update'; body:='The animal weight record was updated.';
 ELSE title:='Vaccination update'; body:='The vaccination record was updated.'; END IF;
 PERFORM public.enqueue_customer_update(a.user_id,a.owner_id,a.id,title,body);
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS health_customer_update ON public.animal_health;
CREATE TRIGGER health_customer_update AFTER INSERT OR UPDATE ON public.animal_health FOR EACH ROW EXECUTE FUNCTION public.notify_animal_update();
DROP TRIGGER IF EXISTS weight_customer_update ON public.weights;
CREATE TRIGGER weight_customer_update AFTER INSERT OR UPDATE ON public.weights FOR EACH ROW EXECUTE FUNCTION public.notify_animal_update();
DROP TRIGGER IF EXISTS vaccine_customer_update ON public.vaccinations;
CREATE TRIGGER vaccine_customer_update AFTER INSERT OR UPDATE ON public.vaccinations FOR EACH ROW EXECUTE FUNCTION public.notify_animal_update();
CREATE OR REPLACE FUNCTION public.notify_animal_details_update() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF TG_OP='UPDATE' THEN
 IF (to_jsonb(NEW)-'updated_at')=(to_jsonb(OLD)-'updated_at') THEN RETURN NEW; END IF;
 IF OLD.owner_id IS DISTINCT FROM NEW.owner_id AND OLD.owner_id IS NOT NULL THEN
 PERFORM public.enqueue_customer_update(OLD.user_id,OLD.owner_id,NULL,'Animal list updated','Your farm animal list has changed. Open the app to refresh.','account');
 END IF;
 END IF;
 IF NEW.owner_id IS NOT NULL THEN
 PERFORM public.enqueue_customer_update(NEW.user_id,NEW.owner_id,NEW.id,
 CASE WHEN TG_OP='INSERT' THEN 'Animal registered' ELSE 'Animal details updated' END,
 'The farm owner updated this animal. Open the animal record for the latest information.');
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS animal_details_customer_update ON public.animals;
CREATE TRIGGER animal_details_customer_update AFTER INSERT OR UPDATE ON public.animals FOR EACH ROW EXECUTE FUNCTION public.notify_animal_details_update();
CREATE OR REPLACE FUNCTION public.notify_payment_record_update() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE row_data jsonb;
BEGIN
 IF TG_OP='UPDATE' AND to_jsonb(NEW)=to_jsonb(OLD) THEN RETURN NEW; END IF;
 row_data:=CASE WHEN TG_OP='DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
 IF TG_OP='UPDATE' AND OLD.customer_id IS DISTINCT FROM NEW.customer_id THEN
 PERFORM public.enqueue_customer_update(OLD.user_id,OLD.customer_id,NULL,'Payment record updated','Your payment records changed. Open the app to view your current payment status.','account');
 END IF;
 PERFORM public.enqueue_customer_update((row_data->>'user_id')::uuid,(row_data->>'customer_id')::uuid,NULL,'Payment record updated','Your payment records changed. Open the app to view your current payment status.','account');
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS payment_record_customer_update ON public.payments;
CREATE TRIGGER payment_record_customer_update AFTER INSERT OR UPDATE OR DELETE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.notify_payment_record_update();
CREATE OR REPLACE FUNCTION public.notify_customer_details_update() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF (to_jsonb(NEW)-'updated_at') IS DISTINCT FROM (to_jsonb(OLD)-'updated_at') THEN
 PERFORM public.enqueue_customer_update(NEW.user_id,NEW.id,NULL,'Customer details updated','The farm owner updated your customer details. Open the app to refresh.','account');
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS customer_details_notice ON public.customers;
CREATE TRIGGER customer_details_notice AFTER UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.notify_customer_details_update();
CREATE OR REPLACE FUNCTION public.notify_farm_contact_update() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c record;
BEGIN
 IF jsonb_build_array(to_jsonb(NEW)->'full_name',to_jsonb(NEW)->'phone') IS DISTINCT FROM jsonb_build_array(to_jsonb(OLD)->'full_name',to_jsonb(OLD)->'phone') THEN
 FOR c IN SELECT id FROM public.customers WHERE user_id=NEW.id LOOP
 PERFORM public.enqueue_customer_update(NEW.id,c.id,NULL,'Farm contact updated','Your farm contact information changed. Open the app for the latest details.','account');
 END LOOP;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS farm_contact_customer_notice ON public.profiles;
CREATE TRIGGER farm_contact_customer_notice AFTER UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.notify_farm_contact_update();
REVOKE ALL ON FUNCTION public.notify_farm_contact_update() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.notify_animal_update(),public.notify_animal_details_update(),public.notify_payment_record_update(),public.notify_customer_details_update() FROM PUBLIC,anon,authenticated;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime') AND NOT EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='customer_notifications') THEN
 ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_notifications;
 END IF;
END $$;
ALTER TABLE public.customer_notifications ADD COLUMN IF NOT EXISTS manual_reminder boolean NOT NULL DEFAULT false;
DROP INDEX IF EXISTS public.customer_payment_one_per_day;
CREATE UNIQUE INDEX customer_payment_one_per_day ON public.customer_notifications(viewer_id,owner_id,customer_id,reminder_day) WHERE kind='payment' AND NOT manual_reminder;
CREATE OR REPLACE FUNCTION public.remind_unpaid_customers_now() RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE sent integer;
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_farm_owner() THEN RAISE EXCEPTION 'Owner account required'; END IF;
 INSERT INTO public.customer_notifications(viewer_id,owner_id,customer_id,animal_id,kind,title,message,manual_reminder)
 SELECT DISTINCT ca.viewer_id,c.user_id,c.id,NULL,'payment','Payment reminder',
 'Your farm care payment is outstanding. Contact the farm owner to arrange payment.',true
 FROM public.customers c JOIN public.customer_access ca ON ca.customer_id=c.id AND ca.owner_id=c.user_id
 JOIN public.user_roles r ON r.user_id=ca.viewer_id AND r.role='customer'
 WHERE c.user_id=auth.uid() AND public.customer_has_payment_due(c.id,c.user_id);
 GET DIAGNOSTICS sent=ROW_COUNT;
 RETURN sent;
END $$;
REVOKE ALL ON FUNCTION public.remind_unpaid_customers_now() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.remind_unpaid_customers_now() TO authenticated;
CREATE OR REPLACE FUNCTION public.remind_unpaid_customers() RETURNS integer
LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$ SELECT public.remind_unpaid_customers_now() $$;
REVOKE ALL ON FUNCTION public.remind_unpaid_customers() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.remind_unpaid_customers() TO authenticated;
CREATE OR REPLACE FUNCTION public.poll_customer_notifications_v2(_device uuid,_secret text,_include_routine boolean DEFAULT true) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE viewer uuid := public.background_device_viewer(_device,_secret);
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(viewer::text || ':customer-daily-reminder',0));
 INSERT INTO public.customer_notifications(viewer_id,owner_id,customer_id,animal_id,kind,title,message)
 SELECT viewer,c.user_id,c.id,NULL,'payment','Payment reminder',
 'Your farm care payment is outstanding. Contact the farm owner to arrange payment.'
 FROM public.customers c JOIN public.customer_access ca ON ca.customer_id=c.id AND ca.owner_id=c.user_id
 WHERE ca.viewer_id=viewer AND public.customer_has_payment_due(c.id,c.user_id)
 AND NOT EXISTS(SELECT 1 FROM public.customer_notifications n WHERE n.viewer_id=viewer AND n.customer_id=c.id
 AND n.owner_id=c.user_id AND n.kind='payment' AND n.reminder_day=current_date AND NOT n.manual_reminder)
 ON CONFLICT DO NOTHING;
 RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('id',n.id,'title',
 CASE WHEN n.kind='payment' THEN 'Payment reminder' ELSE n.title END,
 'body',CASE WHEN n.kind='payment' THEN 'Your farm care payment is outstanding. Open the app for details.' WHEN n.kind='account' THEN 'Your farm account was updated. Open the app for details.' ELSE 'There is a new update about your animal. Open the app for details.' END))
 FROM (SELECT n.* FROM public.customer_notifications n
 JOIN public.customer_access ca ON ca.customer_id=n.customer_id AND ca.owner_id=n.owner_id AND ca.viewer_id=n.viewer_id
 JOIN public.customers c ON c.id=n.customer_id AND c.user_id=n.owner_id
 WHERE n.viewer_id=viewer AND n.read_at IS NULL
 AND (_include_routine OR n.kind='payment' OR n.title ILIKE '%health%' OR (n.kind='account' AND n.title ILIKE '%payment%'))
 AND CASE WHEN n.kind='payment' THEN (n.manual_reminder OR n.created_at>=date_trunc('day',now())) AND public.customer_has_payment_due(n.customer_id,n.owner_id)
 WHEN n.kind='account' THEN n.animal_id IS NULL ELSE EXISTS(SELECT 1 FROM public.animals a WHERE a.id=n.animal_id AND a.user_id=n.owner_id AND a.owner_id=n.customer_id) END
 AND NOT EXISTS(SELECT 1 FROM public.customer_background_deliveries b WHERE b.device_id=_device AND b.notice_id=n.id)
 ORDER BY CASE WHEN n.kind='payment' OR n.title ILIKE '%health%' OR (n.kind='account' AND n.title ILIKE '%payment%') THEN 0 ELSE 1 END,n.created_at,n.id LIMIT 30) n),'[]'::jsonb);
END $$;
REVOKE ALL ON FUNCTION public.poll_customer_notifications_v2(uuid,text,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.poll_customer_notifications_v2(uuid,text,boolean) TO anon,authenticated;
CREATE OR REPLACE FUNCTION public.poll_customer_notifications(_device uuid,_secret text) RETURNS jsonb
LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$ SELECT public.poll_customer_notifications_v2(_device,_secret,true) $$;
REVOKE ALL ON FUNCTION public.poll_customer_notifications(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.poll_customer_notifications(uuid,text) TO anon,authenticated;
CREATE OR REPLACE FUNCTION public.save_login_profile(_name text,_phone text,_email text,_login text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE customer_role boolean; assigned_login text; BEGIN
IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
IF length(trim(_name)) NOT BETWEEN 1 AND 100 OR _phone !~ '^\+?[0-9 ()-]{7,20}$' OR length(regexp_replace(_phone,'[^0-9]','','g')) NOT BETWEEN 7 AND 15 OR _login !~ '^[A-Za-z][A-Za-z0-9._-]{2,31}$' OR _email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN RAISE EXCEPTION 'Enter valid profile details'; END IF;
SELECT role='customer' INTO customer_role FROM public.user_roles WHERE user_id=auth.uid();
IF customer_role THEN
 SELECT display_value INTO assigned_login FROM public.login_aliases WHERE user_id=auth.uid() AND kind='id' FOR UPDATE;
 IF assigned_login IS NULL OR _login IS DISTINCT FROM assigned_login THEN RAISE EXCEPTION 'Your assigned login ID cannot be changed'; END IF;
END IF;
DELETE FROM public.login_aliases WHERE user_id=auth.uid() AND (kind='phone' OR (kind='id' AND NOT coalesce(customer_role,false)) OR (kind='email' AND customer_role));
INSERT INTO public.login_aliases(alias,user_id,kind,display_value) VALUES('phone:'||regexp_replace(_phone,'[^0-9]','','g'),auth.uid(),'phone',_phone);
IF NOT coalesce(customer_role,false) THEN INSERT INTO public.login_aliases(alias,user_id,kind,display_value) VALUES('id:'||lower(_login),auth.uid(),'id',_login); END IF;
IF customer_role THEN INSERT INTO public.login_aliases(alias,user_id,kind,display_value) VALUES('email:'||lower(_email),auth.uid(),'email',lower(_email)); END IF;
UPDATE public.profiles SET full_name=trim(_name),phone=trim(_phone),contact_email=lower(_email) WHERE id=auth.uid();
IF customer_role THEN UPDATE public.customers SET name=trim(_name),phone=trim(_phone),email=lower(_email) WHERE login_user_id=auth.uid(); END IF;
END $$;
REVOKE ALL ON FUNCTION public.save_login_profile(text,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_login_profile(text,text,text,text) TO authenticated;