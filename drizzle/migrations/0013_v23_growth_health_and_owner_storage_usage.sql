CREATE OR REPLACE FUNCTION public.animal_growth_photos(_animal_id text)
RETURNS TABLE(photo_path text, uploaded_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,storage AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.can_read_animal_care(_animal_id) THEN
    RAISE EXCEPTION 'Animal access required' USING ERRCODE='42501';
  END IF;
  RETURN QUERY
  SELECT DISTINCT ON (date_trunc('month',o.created_at AT TIME ZONE 'Asia/Kolkata')) o.name,o.created_at
  FROM storage.objects o
  WHERE o.bucket_id='animal-photos' AND split_part(o.name,'/',1)=_animal_id
    AND o.created_at >= (date_trunc('month',now() AT TIME ZONE 'Asia/Kolkata')-interval '2 months') AT TIME ZONE 'Asia/Kolkata'
    AND o.created_at < (date_trunc('month',now() AT TIME ZONE 'Asia/Kolkata')+interval '1 month') AT TIME ZONE 'Asia/Kolkata'
  ORDER BY date_trunc('month',o.created_at AT TIME ZONE 'Asia/Kolkata') DESC,o.created_at DESC,o.name DESC;
END $$;
REVOKE ALL ON FUNCTION public.animal_growth_photos(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.animal_growth_photos(text) TO authenticated;
ALTER TABLE public.animal_health ADD COLUMN IF NOT EXISTS created_at timestamptz;
ALTER TABLE public.animal_health ALTER COLUMN created_at SET DEFAULT now();
COMMENT ON COLUMN public.animal_health.created_at IS 'Creation time for new observations; NULL means historical creation time and same-day order are unknown.';
CREATE OR REPLACE FUNCTION public.farm_storage_usage() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,storage AS $$
DECLARE viewer uuid := auth.uid(); result jsonb; files jsonb;
BEGIN
  IF viewer IS NULL OR NOT public.is_farm_owner() THEN
    RAISE EXCEPTION 'Owner account required' USING ERRCODE='42501';
  END IF;
  WITH sizes AS (
    SELECT 'Animals' AS label,count(*) AS records,coalesce(sum(pg_column_size(a)),0) AS bytes FROM public.animals a WHERE a.user_id=viewer
    UNION ALL SELECT 'Customers',count(*),coalesce(sum(pg_column_size(c)),0) FROM public.customers c WHERE c.user_id=viewer
    UNION ALL SELECT 'Payments',count(*),coalesce(sum(pg_column_size(p)),0) FROM public.payments p WHERE p.user_id=viewer
    UNION ALL SELECT 'Weights',count(*),coalesce(sum(pg_column_size(w)),0) FROM public.weights w JOIN public.animals a ON a.id=w.animal_id WHERE a.user_id=viewer
    UNION ALL SELECT 'Vaccinations',count(*),coalesce(sum(pg_column_size(v)),0) FROM public.vaccinations v JOIN public.animals a ON a.id=v.animal_id WHERE a.user_id=viewer
    UNION ALL SELECT 'Health records',count(*),coalesce(sum(pg_column_size(h)),0) FROM public.animal_health h JOIN public.animals a ON a.id=h.animal_id WHERE a.user_id=viewer
    UNION ALL SELECT 'Categories',count(*),coalesce(sum(pg_column_size(c)),0) FROM public.categories c WHERE c.user_id=viewer
    UNION ALL SELECT 'Profile',count(*),coalesce(sum(pg_column_size(p)),0) FROM public.profiles p WHERE p.id=viewer
    UNION ALL SELECT 'Notifications',count(*),coalesce(sum(pg_column_size(n)),0) FROM public.customer_notifications n WHERE n.owner_id=viewer
    UNION ALL SELECT 'Customer connections',count(*),coalesce(sum(pg_column_size(c)),0) FROM public.customer_access c WHERE c.owner_id=viewer
  ) SELECT jsonb_build_object('record_bytes',coalesce(sum(bytes),0),'record_count',coalesce(sum(records),0),
      'breakdown',jsonb_agg(jsonb_build_object('label',label,'count',records,'bytes',bytes) ORDER BY label)) INTO result FROM sizes;
  WITH owned_files AS (
    SELECT o.metadata->>'size' AS size FROM storage.objects o
    WHERE o.bucket_id='animal-photos' AND (
      coalesce(to_jsonb(o)->>'owner_id',to_jsonb(o)->>'owner')=viewer::text
      OR EXISTS(SELECT 1 FROM public.animals a WHERE a.user_id=viewer AND a.id=split_part(o.name,'/',1)))
  ) SELECT jsonb_build_object('photo_count',count(*),
      'photo_bytes',coalesce(sum(CASE WHEN size ~ '^[0-9]{1,18}$' THEN size::bigint ELSE 0 END),0),
      'unknown_photo_sizes',count(*) FILTER(WHERE size IS NULL OR size !~ '^[0-9]{1,18}$')) INTO files FROM owned_files;
  RETURN result || files || jsonb_build_object('checked_at',now(),'limit_bytes',NULL);
END $$;
REVOKE ALL ON FUNCTION public.farm_storage_usage() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.farm_storage_usage() TO authenticated;