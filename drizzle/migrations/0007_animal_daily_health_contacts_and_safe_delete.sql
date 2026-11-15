ALTER TABLE public.customers ADD COLUMN address text NOT NULL DEFAULT '', ADD COLUMN email text NOT NULL DEFAULT '';
UPDATE public.customers SET address=village WHERE address='';
COMMENT ON COLUMN public.customers.village IS 'DEPRECATED: replaced by address';
ALTER TABLE public.profiles ADD COLUMN phone text NOT NULL DEFAULT '';
ALTER TABLE public.animal_health ADD COLUMN temperature_c numeric, ADD COLUMN illness_started date;
CREATE OR REPLACE FUNCTION public.enforce_personal_animal_care() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN IF NEW.owner_id IS NULL THEN NEW.monthly_charge:=0; END IF; RETURN NEW; END $$;
CREATE TRIGGER enforce_personal_animal_care BEFORE INSERT OR UPDATE ON public.animals FOR EACH ROW EXECUTE FUNCTION public.enforce_personal_animal_care();
CREATE OR REPLACE FUNCTION public.validate_daily_health() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN IF NEW.temperature_c IS NOT NULL AND (NEW.temperature_c<20 OR NEW.temperature_c>50) THEN RAISE EXCEPTION 'Enter temperature between 20 and 50 °C'; END IF; IF NEW.illness_started IS NOT NULL AND NEW.illness_started>NEW.date THEN RAISE EXCEPTION 'Illness start cannot be after the update date'; END IF; RETURN NEW; END $$;
CREATE TRIGGER validate_daily_health BEFORE INSERT OR UPDATE ON public.animal_health FOR EACH ROW EXECUTE FUNCTION public.validate_daily_health();
CREATE OR REPLACE FUNCTION public.delete_owned_animal(_animal_id text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
IF auth.uid() IS NULL OR NOT public.is_farm_owner() THEN RAISE EXCEPTION 'Owner account required'; END IF;
PERFORM 1 FROM public.animals WHERE id=_animal_id AND user_id=auth.uid() FOR UPDATE;
IF NOT FOUND THEN RAISE EXCEPTION 'Animal is not in your account'; END IF;
UPDATE public.payments SET animal_id=NULL,period_start=NULL WHERE animal_id=_animal_id AND user_id=auth.uid();
DELETE FROM public.customer_notifications WHERE animal_id=_animal_id;
DELETE FROM public.animal_health WHERE animal_id=_animal_id;
DELETE FROM public.animals WHERE id=_animal_id AND user_id=auth.uid();
END $$;
REVOKE ALL ON FUNCTION public.delete_owned_animal(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.delete_owned_animal(text) TO authenticated;
CREATE OR REPLACE FUNCTION public.customer_portal() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$ BEGIN
IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
IF NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND role='customer') THEN RAISE EXCEPTION 'Customer account required'; END IF;
RETURN jsonb_build_object(
'customers',coalesce((SELECT jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'phone',c.phone,'address',c.address,'email',c.email,'village','','farmName',pr.full_name,'farmPhone',coalesce(pr.phone,''))) FROM public.customers c JOIN public.customer_access ca ON ca.customer_id=c.id AND ca.owner_id=c.user_id LEFT JOIN public.profiles pr ON pr.id=c.user_id WHERE ca.viewer_id=auth.uid()),'[]'::jsonb),
'animals',coalesce((SELECT jsonb_agg(jsonb_build_object('id',a.id,'userId',a.user_id,'ownerId',a.owner_id,'categoryId',a.category_id,'subcategoryId',a.subcategory_id,'species',cat.name,'sub',coalesce(sub.name,''),'breed',a.breed,'status',a.status,'arrival',a.arrival,'monthlyCharge',0,'vaccineDue',coalesce(a.vaccine_due::text,''),'soldDate',a.sold_date,'soldPrice',NULL,'notes','','photoPath',NULL,'photoUrl',NULL,
'weights',coalesce((SELECT jsonb_agg(jsonb_build_object('id',w.id,'date',w.date,'kg',w.kg) ORDER BY w.date) FROM public.weights w WHERE w.animal_id=a.id AND w.user_id=a.user_id),'[]'::jsonb),
'vaccinations',coalesce((SELECT jsonb_agg(jsonb_build_object('id',v.id,'name',v.name,'date',v.date,'nextDue',v.next_due) ORDER BY v.date) FROM public.vaccinations v WHERE v.animal_id=a.id AND v.user_id=a.user_id),'[]'::jsonb))) FROM public.animals a JOIN public.customer_access ca ON ca.customer_id=a.owner_id AND ca.owner_id=a.user_id LEFT JOIN public.categories cat ON cat.id=a.category_id LEFT JOIN public.categories sub ON sub.id=a.subcategory_id WHERE ca.viewer_id=auth.uid()),'[]'::jsonb),
'payments','[]'::jsonb,
'paymentStatuses',coalesce((SELECT jsonb_agg(jsonb_build_object('animalId',a.id,'periodStart',period.start::date,'status',CASE WHEN coalesce((SELECT sum(p.amount) FROM public.payments p WHERE p.animal_id=a.id AND p.customer_id=a.owner_id AND p.user_id=a.user_id AND p.period_start=period.start::date),0)>=a.monthly_charge THEN 'Paid' ELSE 'Payment due' END) ORDER BY a.id,period.start) FROM public.animals a JOIN public.customer_access ca ON ca.customer_id=a.owner_id AND ca.owner_id=a.user_id CROSS JOIN LATERAL (SELECT (a.arrival + make_interval(months=>n))::date AS start FROM generate_series(0,greatest(0,(extract(year FROM least(current_date,coalesce(a.sold_date,current_date)))::int-extract(year FROM a.arrival)::int)*12+extract(month FROM least(current_date,coalesce(a.sold_date,current_date)))::int-extract(month FROM a.arrival)::int)) n) period WHERE ca.viewer_id=auth.uid() AND a.monthly_charge>0 AND period.start<=least(current_date,coalesce(a.sold_date,current_date))),'[]'::jsonb)); END $$;