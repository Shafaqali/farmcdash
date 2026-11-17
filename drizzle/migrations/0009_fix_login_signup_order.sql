DROP TRIGGER IF EXISTS farm_login_email ON auth.users;
CREATE TRIGGER farm_login_email AFTER UPDATE OF email ON auth.users FOR EACH ROW EXECUTE FUNCTION public.sync_login_email();
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
INSERT INTO public.profiles(id,full_name) VALUES(new.id,coalesce(new.raw_user_meta_data->>'full_name',new.raw_user_meta_data->>'name',split_part(new.email,'@',1)));
INSERT INTO public.user_roles(user_id,role) VALUES(new.id,CASE WHEN new.raw_user_meta_data->>'account_type'='customer' THEN 'customer'::public.farm_account_role ELSE 'owner'::public.farm_account_role END);
IF new.email IS NOT NULL AND new.email NOT LIKE '%@customer.farm.local' THEN INSERT INTO public.login_aliases(alias,user_id,kind,display_value) VALUES('email:'||lower(trim(new.email)),new.id,'email',lower(trim(new.email))); END IF;
IF new.raw_user_meta_data->>'account_type' IS DISTINCT FROM 'customer' THEN INSERT INTO public.login_aliases(alias,user_id,kind,display_value) SELECT 'id:'||lower(user_code),id,'id',user_code FROM public.profiles WHERE id=new.id; END IF;
RETURN new; END $$;
CREATE OR REPLACE FUNCTION public.provision_customer_login(_owner uuid,_viewer uuid,_customer uuid DEFAULT NULL,_name text DEFAULT '',_phone text DEFAULT '',_email text DEFAULT '',_address text DEFAULT '',_login text DEFAULT '') RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE cid uuid; BEGIN
IF NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_owner AND role='owner') OR NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_viewer AND role='customer') THEN RAISE EXCEPTION 'Not permitted'; END IF;
IF _customer IS NULL THEN INSERT INTO public.customers(user_id,name,phone,email,address,login_user_id) VALUES(_owner,_name,_phone,_email,_address,_viewer) RETURNING id INTO cid;
ELSE SELECT id INTO cid FROM public.customers WHERE id=_customer AND user_id=_owner AND login_user_id IS NULL FOR UPDATE; IF cid IS NULL THEN RAISE EXCEPTION 'Customer unavailable or already has login'; END IF; UPDATE public.customers SET login_user_id=_viewer WHERE id=cid; END IF;
UPDATE public.profiles SET full_name=_name,phone=_phone,contact_email=_email WHERE id=_viewer;
INSERT INTO public.login_aliases(alias,user_id,kind,display_value) VALUES('id:'||lower(_login),_viewer,'id',_login),('phone:'||regexp_replace(_phone,'[^0-9]','','g'),_viewer,'phone',_phone),('email:'||lower(_email),_viewer,'email',lower(_email));
INSERT INTO public.customer_access(customer_id,owner_id,viewer_id) VALUES(cid,_owner,_viewer) ON CONFLICT DO NOTHING;
RETURN cid; END $$;