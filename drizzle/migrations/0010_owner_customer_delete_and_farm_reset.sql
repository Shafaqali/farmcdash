ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS farm_generation integer NOT NULL DEFAULT 0;
CREATE FUNCTION public.delete_owned_customer(_customer_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
IF auth.uid() IS NULL OR NOT public.is_farm_owner() THEN RAISE EXCEPTION 'Owner account required'; END IF;
PERFORM 1 FROM public.customers WHERE id=_customer_id AND user_id=auth.uid() FOR UPDATE;
IF NOT FOUND THEN RAISE EXCEPTION 'Customer is not in your account'; END IF;
DELETE FROM public.customer_notifications WHERE customer_id=_customer_id AND owner_id=auth.uid();
DELETE FROM public.customer_access WHERE customer_id=_customer_id AND owner_id=auth.uid();
DELETE FROM public.customer_invites WHERE customer_id=_customer_id AND owner_id=auth.uid();
DELETE FROM public.payments WHERE customer_id=_customer_id AND user_id=auth.uid();
UPDATE public.animals SET owner_id=NULL,monthly_charge=0 WHERE owner_id=_customer_id AND user_id=auth.uid();
DELETE FROM public.customers WHERE id=_customer_id AND user_id=auth.uid();
END $$;
REVOKE ALL ON FUNCTION public.delete_owned_customer(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.delete_owned_customer(uuid) TO authenticated;
CREATE FUNCTION public.reset_owned_farm(_confirmation text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
IF auth.uid() IS NULL OR NOT public.is_farm_owner() THEN RAISE EXCEPTION 'Owner account required'; END IF;
IF _confirmation IS DISTINCT FROM 'DELETE' THEN RAISE EXCEPTION 'Type DELETE to confirm'; END IF;
PERFORM 1 FROM public.profiles WHERE id=auth.uid() FOR UPDATE;
DELETE FROM public.customer_notifications WHERE owner_id=auth.uid();
DELETE FROM public.customer_access WHERE owner_id=auth.uid();
DELETE FROM public.customer_invites WHERE owner_id=auth.uid();
DELETE FROM public.payments WHERE user_id=auth.uid();
DELETE FROM public.animal_health WHERE user_id=auth.uid() OR animal_id IN (SELECT id FROM public.animals WHERE user_id=auth.uid());
DELETE FROM public.weights WHERE user_id=auth.uid() OR animal_id IN (SELECT id FROM public.animals WHERE user_id=auth.uid());
DELETE FROM public.vaccinations WHERE user_id=auth.uid() OR animal_id IN (SELECT id FROM public.animals WHERE user_id=auth.uid());
DELETE FROM public.animals WHERE user_id=auth.uid();
DELETE FROM public.customers WHERE user_id=auth.uid();
UPDATE public.profiles SET farm_generation=farm_generation+1 WHERE id=auth.uid();
END $$;
REVOKE ALL ON FUNCTION public.reset_owned_farm(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.reset_owned_farm(text) TO authenticated;
CREATE OR REPLACE FUNCTION public.profiles_before_write() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN
IF tg_op='INSERT' THEN IF new.user_code IS NULL THEN new.user_code:='U'||lpad(nextval('public.user_code_seq')::text,2,'0'); END IF;
ELSE new.user_code:=old.user_code; IF current_user IN ('authenticated','anon') THEN new.farm_generation:=old.farm_generation; END IF; END IF;
RETURN new; END $$;
CREATE OR REPLACE FUNCTION public.animals_before_write() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ DECLARE pfx text; ucode text; n int; generation int; BEGIN
IF new.status NOT IN ('Active','Sold','Discharged','Dead') THEN RAISE EXCEPTION 'Invalid status %',new.status; END IF;
IF tg_op='INSERT' THEN
PERFORM 1 FROM public.profiles WHERE id=new.user_id FOR SHARE;
IF new.id IS NULL OR new.id='' THEN
SELECT coalesce(nullif(code,''),upper(left(name,1)),'A') INTO pfx FROM public.categories WHERE id=new.category_id;
SELECT user_code,farm_generation INTO ucode,generation FROM public.profiles WHERE id=new.user_id;
ucode:=coalesce(ucode,'U00'); IF coalesce(generation,0)>0 THEN ucode:=ucode||'-R'||generation::text; END IF;
PERFORM pg_advisory_xact_lock(hashtext(ucode||'-'||pfx));
SELECT coalesce(max(substring(id FROM length(ucode||'-'||pfx)+1)::int),0)+1 INTO n FROM public.animals WHERE id ~ ('^'||ucode||'-'||pfx||'[0-9]+$');
new.id:=ucode||'-'||pfx||lpad(n::text,4,'0'); END IF;
END IF;
IF tg_op='UPDATE' THEN new.user_id:=old.user_id; END IF;
new.updated_at:=now(); RETURN new; END $$;