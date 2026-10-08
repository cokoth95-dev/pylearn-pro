-- Admin-managed public prices and KES Paybill charges. USD prices are display-only.
ALTER TABLE public.payment_settings
  DROP CONSTRAINT payment_settings_monthly_amount_kes_check,
  DROP CONSTRAINT payment_settings_full_course_amount_kes_check,
  ADD COLUMN monthly_amount_usd numeric(10,2) NOT NULL DEFAULT 49.00,
  ADD COLUMN full_course_amount_usd numeric(10,2) NOT NULL DEFAULT 149.00,
  ADD COLUMN full_course_regular_amount_kes integer NOT NULL DEFAULT 35000,
  ADD COLUMN full_course_regular_amount_usd numeric(10,2) NOT NULL DEFAULT 299.00,
  ADD CONSTRAINT payment_settings_monthly_kes_range CHECK (monthly_amount_kes BETWEEN 1 AND 1000000),
  ADD CONSTRAINT payment_settings_full_kes_range CHECK (full_course_amount_kes BETWEEN 1 AND 1000000),
  ADD CONSTRAINT payment_settings_regular_kes_range CHECK (full_course_regular_amount_kes BETWEEN full_course_amount_kes AND 2000000),
  ADD CONSTRAINT payment_settings_monthly_usd_range CHECK (monthly_amount_usd BETWEEN 0.01 AND 10000),
  ADD CONSTRAINT payment_settings_full_usd_range CHECK (full_course_amount_usd BETWEEN 0.01 AND 10000),
  ADD CONSTRAINT payment_settings_regular_usd_range CHECK (full_course_regular_amount_usd BETWEEN full_course_amount_usd AND 20000);

ALTER TABLE public.payment_requests
  DROP CONSTRAINT payment_requests_amount_kes_check,
  ADD CONSTRAINT payment_requests_positive_amount CHECK (amount_kes BETWEEN 1 AND 1000000);

DROP POLICY IF EXISTS "Signed-in users read payment settings" ON public.payment_settings;
CREATE POLICY "Public can read pricing and payment settings"
  ON public.payment_settings FOR SELECT TO anon, authenticated USING (true);
GRANT SELECT ON public.payment_settings TO anon, authenticated;
GRANT UPDATE (
  payments_enabled, updated_at,
  monthly_amount_kes, full_course_amount_kes,
  monthly_amount_usd, full_course_amount_usd,
  full_course_regular_amount_kes, full_course_regular_amount_usd
) ON public.payment_settings TO authenticated;

CREATE OR REPLACE FUNCTION public.create_payment_request(
  p_course_id uuid, p_purchase_type text, p_receipt_suffix text, p_payer_phone text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_student uuid := (SELECT auth.uid());
  v_month smallint;
  v_id uuid;
  v_price integer;
  v_phone text;
  v_monthly_price integer;
  v_full_course_price integer;
BEGIN
  IF v_student IS NULL THEN RAISE EXCEPTION 'Sign in before submitting a payment'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_student::text || ':' || p_course_id::text, 0));
  IF p_receipt_suffix !~* '^[A-Z0-9]{4}$' THEN RAISE EXCEPTION 'Enter the last four letters or numbers of the M-Pesa receipt'; END IF;
  IF p_payer_phone !~ '^\+?[0-9][0-9 ()-]{7,18}$' THEN RAISE EXCEPTION 'Enter a valid payer phone number'; END IF;
  v_phone := regexp_replace(p_payer_phone, '[^0-9]', '', 'g');
  IF length(v_phone) NOT BETWEEN 9 AND 15 THEN RAISE EXCEPTION 'Enter a valid payer phone number'; END IF;
  SELECT monthly_amount_kes, full_course_amount_kes
  INTO v_monthly_price, v_full_course_price
  FROM public.payment_settings
  WHERE id AND payments_enabled;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payments are temporarily disabled'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.courses WHERE id = p_course_id AND status = 'published') THEN RAISE EXCEPTION 'Select an available course'; END IF;
  IF EXISTS (SELECT 1 FROM public.course_enrollments WHERE course_id = p_course_id AND student_id = v_student AND plan IN ('paid_full','scholarship') AND status = 'active') THEN RAISE EXCEPTION 'Your account already has full-course access'; END IF;
  IF EXISTS (SELECT 1 FROM public.payment_requests WHERE student_id=v_student AND course_id=p_course_id AND purchase_type='full_course' AND status='pending') THEN RAISE EXCEPTION 'A full-course payment is already waiting for review'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.course_enrollments WHERE course_id = p_course_id AND student_id = v_student AND status = 'active') THEN
    INSERT INTO public.course_enrollments (course_id, student_id, plan, status) VALUES (p_course_id, v_student, 'free_month1', 'active') ON CONFLICT (course_id, student_id) DO UPDATE SET status='active';
  END IF;
  IF p_purchase_type = 'monthly' THEN
    SELECT candidate::smallint INTO v_month FROM generate_series(2,4) AS candidates(candidate)
    WHERE NOT EXISTS (SELECT 1 FROM public.payment_requests r WHERE r.student_id=v_student AND r.course_id=p_course_id AND r.purchase_type='monthly' AND r.target_month=candidate AND r.status='confirmed')
      AND NOT EXISTS (SELECT 1 FROM public.payment_requests r WHERE r.student_id=v_student AND r.course_id=p_course_id AND r.purchase_type='monthly' AND r.target_month=candidate AND r.status='pending')
    ORDER BY candidate LIMIT 1;
    IF v_month IS NULL THEN RAISE EXCEPTION 'There is no next monthly module available to purchase'; END IF;
    v_price := v_monthly_price;
  ELSIF p_purchase_type = 'full_course' THEN
    v_month := NULL;
    v_price := v_full_course_price;
  ELSE RAISE EXCEPTION 'Choose monthly or full-course access'; END IF;
  INSERT INTO public.payment_requests(student_id,course_id,purchase_type,target_month,amount_kes,receipt_suffix,payer_phone)
  VALUES(v_student,p_course_id,p_purchase_type,v_month,v_price,upper(p_receipt_suffix),v_phone) RETURNING id INTO v_id;
  RETURN v_id;
END; $$;
REVOKE ALL ON FUNCTION public.create_payment_request(uuid,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_payment_request(uuid,text,text,text) TO authenticated;
