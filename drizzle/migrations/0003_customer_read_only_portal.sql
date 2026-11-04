CREATE TABLE public.customer_access (customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE, owner_id uuid NOT NULL, viewer_id uuid NOT NULL, PRIMARY KEY(customer_id, viewer_id));
GRANT SELECT ON public.customer_access TO authenticated;
GRANT ALL ON public.customer_access TO service_role;
ALTER TABLE public.customer_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY owner_access_read ON public.customer_access FOR SELECT TO authenticated USING(owner_id=auth.uid());
CREATE TABLE public.customer_invites (customer_id uuid PRIMARY KEY REFERENCES public.customers(id) ON DELETE CASCADE, owner_id uuid NOT NULL, email text NOT NULL, token_hash text NOT NULL UNIQUE, expires_at timestamptz NOT NULL, used_at timestamptz);
GRANT ALL ON public.customer_invites TO service_role;
ALTER TABLE public.customer_invites ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.invite_customer(_customer_id uuid, _email text) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE token text; BEGIN
IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.customers WHERE id=_customer_id AND user_id=auth.uid()) THEN RAISE EXCEPTION 'Customer unavailable'; END IF;
IF _email NOT LIKE '%@%.%' THEN RAISE EXCEPTION 'Enter customer email'; END IF;
token:=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','');
INSERT INTO public.customer_invites(customer_id,owner_id,email,token_hash,expires_at) VALUES(_customer_id,auth.uid(),lower(trim(_email)),encode(sha256(token::bytea),'hex'),now()+interval '7 days') ON CONFLICT(customer_id) DO UPDATE SET email=EXCLUDED.email,token_hash=EXCLUDED.token_hash,expires_at=EXCLUDED.expires_at,used_at=NULL;
RETURN token; END $$;
CREATE OR REPLACE FUNCTION public.connect_customer(_code text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE i public.customer_invites; BEGIN
IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
SELECT * INTO i FROM public.customer_invites WHERE token_hash=encode(sha256(trim(_code)::bytea),'hex') AND email=lower(auth.jwt()->>'email') AND expires_at>now() AND used_at IS NULL FOR UPDATE;
IF NOT FOUND THEN RAISE EXCEPTION 'Invalid or expired code for this account'; END IF;
IF NOT EXISTS(SELECT 1 FROM public.customers WHERE id=i.customer_id AND user_id=i.owner_id) THEN RAISE EXCEPTION 'Customer unavailable'; END IF;
INSERT INTO public.customer_access(customer_id,owner_id,viewer_id) VALUES(i.customer_id,i.owner_id,auth.uid()) ON CONFLICT DO NOTHING;
UPDATE public.customer_invites SET used_at=now() WHERE customer_id=i.customer_id;
END $$;
CREATE OR REPLACE FUNCTION public.revoke_customer_access(_customer_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.customers WHERE id=_customer_id AND user_id=auth.uid()) THEN RAISE EXCEPTION 'Customer unavailable'; END IF;
DELETE FROM public.customer_access WHERE customer_id=_customer_id AND owner_id=auth.uid();
DELETE FROM public.customer_invites WHERE customer_id=_customer_id AND owner_id=auth.uid(); END $$;
CREATE OR REPLACE FUNCTION public.customer_portal() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$ BEGIN
IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
RETURN jsonb_build_object('customers',coalesce((SELECT jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'phone','','village','')) FROM public.customers c JOIN public.customer_access ca ON ca.customer_id=c.id AND ca.owner_id=c.user_id WHERE ca.viewer_id=auth.uid()),'[]'::jsonb),
'animals',coalesce((SELECT jsonb_agg(jsonb_build_object('id',a.id,'userId',a.user_id,'ownerId',a.owner_id,'categoryId',a.category_id,'subcategoryId',a.subcategory_id,'species',cat.name,'sub',coalesce(sub.name,''),'breed',a.breed,'status',a.status,'arrival',a.arrival,'monthlyCharge',a.monthly_charge,'vaccineDue',coalesce(a.vaccine_due::text,''),'soldDate',a.sold_date,'soldPrice',NULL,'notes','','photoPath',NULL,'photoUrl',NULL,
'weights',coalesce((SELECT jsonb_agg(jsonb_build_object('id',w.id,'date',w.date,'kg',w.kg) ORDER BY w.date) FROM public.weights w WHERE w.animal_id=a.id AND w.user_id=a.user_id),'[]'::jsonb),
'vaccinations',coalesce((SELECT jsonb_agg(jsonb_build_object('id',v.id,'name',v.name,'date',v.date,'nextDue',v.next_due) ORDER BY v.date) FROM public.vaccinations v WHERE v.animal_id=a.id AND v.user_id=a.user_id),'[]'::jsonb))) FROM public.animals a JOIN public.customer_access ca ON ca.customer_id=a.owner_id AND ca.owner_id=a.user_id LEFT JOIN public.categories cat ON cat.id=a.category_id LEFT JOIN public.categories sub ON sub.id=a.subcategory_id WHERE ca.viewer_id=auth.uid()),'[]'::jsonb),
'payments',coalesce((SELECT jsonb_agg(jsonb_build_object('id',p.id,'customerId',p.customer_id,'animalId',p.animal_id,'periodStart',p.period_start,'amount',p.amount,'date',p.date)) FROM public.payments p JOIN public.customer_access ca ON ca.customer_id=p.customer_id AND ca.owner_id=p.user_id WHERE ca.viewer_id=auth.uid() AND (p.animal_id IS NULL OR EXISTS(SELECT 1 FROM public.animals a WHERE a.id=p.animal_id AND a.owner_id=p.customer_id AND a.user_id=p.user_id))),'[]'::jsonb)); END $$;
REVOKE ALL ON FUNCTION public.invite_customer(uuid,text),public.connect_customer(text),public.revoke_customer_access(uuid),public.customer_portal() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.invite_customer(uuid,text),public.connect_customer(text),public.revoke_customer_access(uuid),public.customer_portal() TO authenticated;
