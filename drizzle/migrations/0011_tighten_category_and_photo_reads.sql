DROP POLICY IF EXISTS "read categories" ON public.categories;
CREATE POLICY "read categories" ON public.categories FOR SELECT TO authenticated USING (user_id IS NULL OR user_id = auth.uid());
DROP POLICY IF EXISTS "animal photos read" ON storage.objects;
CREATE POLICY "animal photos read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'animal-photos' AND public.can_read_animal_care((storage.foldername(name))[1]));