ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS contact_email text NOT NULL DEFAULT '';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS login_user_id uuid;
CREATE UNIQUE INDEX customers_login_user_unique ON public.customers(login_user_id) WHERE login_user_id IS NOT NULL;
CREATE TABLE public.login_aliases(alias text PRIMARY KEY, user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, kind text NOT NULL CHECK(kind IN ('email','phone','id')), display_value text NOT NULL, UNIQUE(user_id,kind));
GRANT SELECT ON public.login_aliases TO authenticated;
GRANT ALL ON public.login_aliases TO service_role;
ALTER TABLE public.login_aliases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own login identifiers" ON public.login_aliases FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE TABLE public.login_attempts(key text PRIMARY KEY, attempts integer NOT NULL DEFAULT 1, started_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.login_attempts TO service_role;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION public.limit_login_attempt(_key text, _limit integer) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE n integer; BEGIN
INSERT INTO public.login_attempts(key) VALUES(_key) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN login_attempts.started_at < now()-interval '15 minutes' THEN 1 ELSE login_attempts.attempts+1 END, started_at=CASE WHEN login_attempts.started_at < now()-interval '15 minutes' THEN now() ELSE login_attempts.started_at END RETURNING attempts INTO n; RETURN n<=_limit; END $$;
REVOKE ALL ON FUNCTION public.limit_login_attempt(text,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.limit_login_attempt(text,integer) TO service_role;
INSERT INTO public.login_aliases(alias,user_id,kind,display_value) SELECT 'email:'||lower(trim(u.email)),u.id,'email',lower(trim(u.email)) FROM auth.users u JOIN public.profiles p ON p.id=u.id WHERE u.email IS NOT NULL AND u.email NOT LIKE '%@customer.farm.local' ON CONFLICT DO NOTHING;
INSERT INTO public.login_aliases(alias,user_id,kind,display_value) SELECT 'id:'||lower(user_code),id,'id',user_code FROM public.profiles WHERE user_code IS NOT NULL ON CONFLICT DO NOTHING;
CREATE FUNCTION public.sync_login_email() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
IF new.email IS NOT NULL AND new.email NOT LIKE '%@customer.farm.local' THEN
DELETE FROM public.login_aliases WHERE user_id=new.id AND kind='email';
INSERT INTO public.login_aliases(alias,user_id,kind,display_value) VALUES('email:'||lower(trim(new.email)),new.id,'email',lower(trim(new.email)));
END IF; RETURN new; END $$;
CREATE TRIGGER farm_login_email AFTER INSERT OR UPDATE OF email ON auth.users FOR EACH ROW EXECUTE FUNCTION public.sync_login_email();
CREATE FUNCTION public.provision_customer_login(_owner uuid,_viewer uuid,_customer uuid,_name text,_phone text,_email text,_address text,_login text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE cid uuid; BEGIN
IF NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_owner AND role='owner') OR NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_viewer AND role='customer') THEN RAISE EXCEPTION 'Not permitted'; END IF;
IF _customer IS NULL THEN INSERT INTO public.customers(user_id,name,phone,email,address,login_user_id) VALUES(_owner,_name,_phone,_email,_address,_viewer) RETURNING id INTO cid;
ELSE SELECT id INTO cid FROM public.customers WHERE id=_customer AND user_id=_owner AND login_user_id IS NULL FOR UPDATE; IF cid IS NULL THEN RAISE EXCEPTION 'Customer unavailable or already has login'; END IF; UPDATE public.customers SET login_user_id=_viewer WHERE id=cid; END IF;
UPDATE public.profiles SET full_name=_name,phone=_phone,contact_email=_email WHERE id=_viewer;
INSERT INTO public.login_aliases(alias,user_id,kind,display_value) VALUES('id:'||lower(_login),_viewer,'id',_login),('phone:'||regexp_replace(_phone,'[^0-9]','','g'),_viewer,'phone',_phone),('email:'||lower(_email),_viewer,'email',lower(_email));
INSERT INTO public.customer_access(customer_id,owner_id,viewer_id) VALUES(cid,_owner,_viewer) ON CONFLICT DO NOTHING;
RETURN cid; END $$;
REVOKE ALL ON FUNCTION public.provision_customer_login(uuid,uuid,uuid,text,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.provision_customer_login(uuid,uuid,uuid,text,text,text,text,text) TO service_role;
CREATE FUNCTION public.save_login_profile(_name text,_phone text,_email text,_login text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE customer_role boolean; BEGIN
IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
IF length(trim(_name)) NOT BETWEEN 1 AND 100 OR _phone !~ '^\+?[0-9 ()-]{7,20}$' OR length(regexp_replace(_phone,'[^0-9]','','g')) NOT BETWEEN 7 AND 15 OR _login !~ '^[A-Za-z][A-Za-z0-9._-]{2,31}$' OR _email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN RAISE EXCEPTION 'Enter valid profile details'; END IF;
SELECT role='customer' INTO customer_role FROM public.user_roles WHERE user_id=auth.uid();
DELETE FROM public.login_aliases WHERE user_id=auth.uid() AND (kind IN ('phone','id') OR (kind='email' AND customer_role));
INSERT INTO public.login_aliases(alias,user_id,kind,display_value) VALUES('id:'||lower(_login),auth.uid(),'id',_login),('phone:'||regexp_replace(_phone,'[^0-9]','','g'),auth.uid(),'phone',_phone);
IF customer_role THEN INSERT INTO public.login_aliases(alias,user_id,kind,display_value) VALUES('email:'||lower(_email),auth.uid(),'email',lower(_email)); END IF;
UPDATE public.profiles SET full_name=trim(_name),phone=trim(_phone),contact_email=lower(_email) WHERE id=auth.uid();
IF customer_role THEN UPDATE public.customers SET name=trim(_name),phone=trim(_phone),email=lower(_email) WHERE login_user_id=auth.uid(); END IF;
END $$;
REVOKE ALL ON FUNCTION public.save_login_profile(text,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_login_profile(text,text,text,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.invite_customer(_customer_id uuid,_email text) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN RAISE EXCEPTION 'Create a customer login instead'; END $$;
CREATE OR REPLACE FUNCTION public.connect_customer(_code text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN RAISE EXCEPTION 'Sign in with the login supplied by your farm'; END $$;
COMMENT ON TABLE public.customer_invites IS 'DEPRECATED: customer accounts are directly provisioned by the farm owner; existing customer_access connections retained.';