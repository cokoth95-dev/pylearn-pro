-- Keep KSh as the source price and derive all public USD display prices from
-- the latest saved CBK indicative rate (KES per USD).
ALTER TABLE public.payment_settings
  ADD COLUMN usd_kes_rate numeric(12, 6),
  ADD COLUMN usd_kes_rate_date date,
  ADD COLUMN usd_kes_rate_source text;

CREATE OR REPLACE FUNCTION private.derive_usd_prices_from_kes()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.usd_kes_rate IS NOT NULL AND NEW.usd_kes_rate > 0 THEN
    NEW.monthly_amount_usd := greatest(1, round(NEW.monthly_amount_kes / NEW.usd_kes_rate));
    NEW.full_course_amount_usd := greatest(1, round(NEW.full_course_amount_kes / NEW.usd_kes_rate));
    NEW.full_course_regular_amount_usd := greatest(1, round(NEW.full_course_regular_amount_kes / NEW.usd_kes_rate));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER derive_usd_prices_from_kes
  BEFORE INSERT OR UPDATE OF monthly_amount_kes, full_course_amount_kes,
    full_course_regular_amount_kes, usd_kes_rate
  ON public.payment_settings
  FOR EACH ROW
  EXECUTE FUNCTION private.derive_usd_prices_from_kes();

REVOKE ALL ON FUNCTION private.derive_usd_prices_from_kes() FROM PUBLIC, anon, authenticated;
