ALTER TABLE public.payments ADD COLUMN animal_id text REFERENCES public.animals(id) ON UPDATE CASCADE;
ALTER TABLE public.payments ADD COLUMN period_start date;
CREATE INDEX payments_animal_period_idx ON public.payments (animal_id, period_start);
CREATE OR REPLACE FUNCTION public.validate_payment_link()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE a public.animals; expected_day integer;
BEGIN
  IF NEW.amount <= 0 THEN RAISE EXCEPTION 'Payment amount must be positive'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.customers c WHERE c.id = NEW.customer_id AND c.user_id = NEW.user_id) THEN RAISE EXCEPTION 'Customer is not in your account'; END IF;
  IF (NEW.animal_id IS NULL) <> (NEW.period_start IS NULL) THEN RAISE EXCEPTION 'Choose both animal and care period'; END IF;
  IF NEW.animal_id IS NOT NULL THEN
    SELECT * INTO a FROM public.animals WHERE id = NEW.animal_id AND user_id = NEW.user_id AND owner_id = NEW.customer_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Animal is not assigned to this customer in your account'; END IF;
    expected_day := LEAST(EXTRACT(day FROM a.arrival)::integer, EXTRACT(day FROM (date_trunc('month', NEW.period_start) + interval '1 month - 1 day'))::integer);
    IF NEW.period_start < a.arrival OR EXTRACT(day FROM NEW.period_start)::integer <> expected_day OR (a.sold_date IS NOT NULL AND NEW.period_start > a.sold_date) THEN RAISE EXCEPTION 'Invalid arrival-date care period'; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER payments_validate_link BEFORE INSERT OR UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.validate_payment_link();