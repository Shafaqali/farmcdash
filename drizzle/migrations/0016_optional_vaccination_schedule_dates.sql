DO $$ DECLARE definition text; BEGIN
 definition := pg_get_functiondef('public.record_owned_vaccination(text,text,date,date,date)'::regprocedure);
 definition := replace(definition, '_next_due date, _previous_due date)', '_next_due date DEFAULT NULL::date, _previous_due date DEFAULT NULL::date)');
 EXECUTE definition;
END $$;