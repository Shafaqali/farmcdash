CREATE OR REPLACE FUNCTION public.record_owned_vaccination(_animal_id text,_name text,_date date,_next_due date,_previous_due date) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE animal public.animals;
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_farm_owner() THEN RAISE EXCEPTION 'Owner account required' USING ERRCODE='42501'; END IF;
 SELECT * INTO animal FROM public.animals WHERE id=_animal_id AND user_id=auth.uid() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Animal is not in your account' USING ERRCODE='42501'; END IF;
 IF animal.vaccine_due IS DISTINCT FROM _previous_due THEN RAISE EXCEPTION 'The vaccination schedule changed. Refresh the animal record and try again.'; END IF;
 IF _name IS NULL OR length(trim(_name))=0 OR length(trim(_name))>200 THEN RAISE EXCEPTION 'Enter a vaccine name of up to 200 characters'; END IF;
 IF _date IS NULL OR _date>(now() AT TIME ZONE 'Asia/Kolkata')::date THEN RAISE EXCEPTION 'The vaccination date cannot be in the future'; END IF;
 IF _next_due IS NOT NULL AND _next_due<=_date THEN RAISE EXCEPTION 'The next due date must be after the vaccination date'; END IF;
 INSERT INTO public.vaccinations(animal_id,user_id,name,date,next_due) VALUES(_animal_id,auth.uid(),trim(_name),_date,_next_due);
 UPDATE public.animals SET vaccine_due=_next_due WHERE id=_animal_id AND user_id=auth.uid();
END $$;
REVOKE ALL ON FUNCTION public.record_owned_vaccination(text,text,date,date,date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.record_owned_vaccination(text,text,date,date,date) TO authenticated;
CREATE OR REPLACE FUNCTION public.poll_customer_notifications_v2(_device uuid,_secret text,_include_routine boolean DEFAULT true) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE viewer uuid := public.background_device_viewer(_device,_secret);
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(viewer::text || ':customer-daily-reminder',0));
 INSERT INTO public.customer_notifications(viewer_id,owner_id,customer_id,animal_id,kind,title,message)
 SELECT viewer,c.user_id,c.id,NULL,'payment','Payment reminder','Your farm care payment is outstanding. Contact the farm owner to arrange payment.'
 FROM public.customers c JOIN public.customer_access ca ON ca.customer_id=c.id AND ca.owner_id=c.user_id
 WHERE ca.viewer_id=viewer AND public.customer_has_payment_due(c.id,c.user_id)
 AND NOT EXISTS(SELECT 1 FROM public.customer_notifications n WHERE n.viewer_id=viewer AND n.customer_id=c.id AND n.owner_id=c.user_id AND n.kind='payment' AND n.reminder_day=current_date)
 ON CONFLICT DO NOTHING;
 RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('id',n.id,'title',CASE WHEN n.kind='payment' THEN 'Payment reminder' ELSE n.title END,'body',CASE WHEN n.kind='payment' THEN 'Your farm care payment is outstanding. Open the app for details.' ELSE 'There is a new update about your animal. Open the app for details.' END))
 FROM (SELECT n.* FROM public.customer_notifications n
 JOIN public.customer_access ca ON ca.customer_id=n.customer_id AND ca.owner_id=n.owner_id AND ca.viewer_id=n.viewer_id
 JOIN public.customers c ON c.id=n.customer_id AND c.user_id=n.owner_id
 WHERE n.viewer_id=viewer AND n.read_at IS NULL AND (_include_routine OR n.kind='payment' OR n.title ILIKE '%health%')
 AND CASE WHEN n.kind='payment' THEN n.created_at>=date_trunc('day',now()) AND public.customer_has_payment_due(n.customer_id,n.owner_id) ELSE EXISTS(SELECT 1 FROM public.animals a WHERE a.id=n.animal_id AND a.user_id=n.owner_id AND a.owner_id=n.customer_id) END
 AND NOT EXISTS(SELECT 1 FROM public.customer_background_deliveries b WHERE b.device_id=_device AND b.notice_id=n.id)
 ORDER BY CASE WHEN n.kind='payment' OR n.title ILIKE '%health%' THEN 0 ELSE 1 END,n.created_at,n.id LIMIT 30) n),'[]'::jsonb);
END $$;
REVOKE ALL ON FUNCTION public.poll_customer_notifications_v2(uuid,text,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.poll_customer_notifications_v2(uuid,text,boolean) TO anon,authenticated;