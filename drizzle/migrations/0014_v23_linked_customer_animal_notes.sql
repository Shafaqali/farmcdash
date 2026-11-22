DO $notes$
DECLARE definition text;
BEGIN
  definition := pg_get_functiondef('public.customer_portal()'::regprocedure);
  IF strpos(definition, '''notes'','''',''photoPath''') > 0 THEN
    definition := replace(definition, '''notes'','''',''photoPath''', '''notes'',a.notes,''photoPath''');
    EXECUTE definition;
  ELSIF strpos(definition, '''notes'',a.notes') = 0 THEN
    RAISE EXCEPTION 'Customer portal notes shape changed; inspect before updating';
  END IF;
END $notes$;