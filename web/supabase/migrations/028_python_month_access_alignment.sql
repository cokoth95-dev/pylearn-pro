-- Keep payments and learner access aligned with the four-weeks-per-month pathway.
-- Month 1 (weeks 1-4) is free; current paid months are 2 and 3.

UPDATE public.modules AS m
SET is_free = (m.month_number = 1)
FROM public.courses AS c
WHERE c.id = m.course_id
  AND c.slug = 'python-foundations'
  AND m.month_number BETWEEN 1 AND 3;

-- Month 4 was the former label for Week 4. Preserve requests and active access
-- when that content is regrouped under Month 1; route paid Month 4 history to
-- the final currently published paid month, Month 3.
UPDATE public.payment_requests
SET target_month = 3
WHERE course_id IN (SELECT id FROM public.courses WHERE slug = 'python-foundations')
  AND target_month = 4;

UPDATE public.course_month_entitlements
SET month_number = 3
WHERE course_id IN (SELECT id FROM public.courses WHERE slug = 'python-foundations')
  AND month_number = 4;

ALTER TABLE public.payment_requests
  DROP CONSTRAINT IF EXISTS payment_requests_target_month_check;
ALTER TABLE public.payment_requests
  ADD CONSTRAINT payment_requests_target_month_check
  CHECK (target_month BETWEEN 2 AND 3 OR target_month IS NULL);

ALTER TABLE public.course_month_entitlements
  DROP CONSTRAINT IF EXISTS course_month_entitlements_month_number_check;
ALTER TABLE public.course_month_entitlements
  ADD CONSTRAINT course_month_entitlements_month_number_check
  CHECK (month_number BETWEEN 2 AND 3);

CREATE OR REPLACE FUNCTION public.create_payment_request(
  p_course_id uuid, p_purchase_type text, p_receipt_suffix text, p_payer_phone text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_student uuid := (SELECT auth.uid()); v_month smallint; v_id uuid; v_price integer; v_phone text;
  v_monthly_price integer; v_full_course_price integer; v_global_enabled boolean;
  v_monthly_enabled boolean; v_full_enabled boolean;
BEGIN
  IF v_student IS NULL THEN RAISE EXCEPTION 'Sign in before submitting a payment'; END IF;
  IF NOT (SELECT private.has_learning_access()) THEN RAISE EXCEPTION 'Accept the admission guide before making a payment'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_student::text || ':' || p_course_id::text, 0));
  IF p_receipt_suffix !~* '^[A-Z0-9]{4}$' THEN RAISE EXCEPTION 'Enter the last four letters or numbers of the M-Pesa receipt'; END IF;
  IF p_payer_phone !~ '^\+?[0-9][0-9 ()-]{7,18}$' THEN RAISE EXCEPTION 'Enter a valid payer phone number'; END IF;
  v_phone := regexp_replace(p_payer_phone, '[^0-9]', '', 'g');
  IF length(v_phone) NOT BETWEEN 9 AND 15 THEN RAISE EXCEPTION 'Enter a valid payer phone number'; END IF;
  SELECT monthly_amount_kes, full_course_amount_kes, payments_enabled,
         monthly_payments_enabled, full_course_payments_enabled
  INTO v_monthly_price, v_full_course_price, v_global_enabled, v_monthly_enabled, v_full_enabled
  FROM public.payment_settings WHERE id;
  IF NOT FOUND OR NOT v_global_enabled THEN RAISE EXCEPTION 'Payments are temporarily disabled'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.courses WHERE id=p_course_id AND status='published') THEN RAISE EXCEPTION 'Select an available course'; END IF;
  IF EXISTS (SELECT 1 FROM public.course_enrollments WHERE course_id=p_course_id AND student_id=v_student AND plan IN ('paid_full','scholarship') AND status='active') THEN RAISE EXCEPTION 'Your account already has full-course access'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.course_enrollments WHERE course_id=p_course_id AND student_id=v_student AND status='active') THEN
    INSERT INTO public.course_enrollments(course_id,student_id,plan,status) VALUES(p_course_id,v_student,'free_month1','active') ON CONFLICT(course_id,student_id) DO UPDATE SET status='active';
  END IF;
  IF p_purchase_type='monthly' THEN
    IF NOT v_monthly_enabled THEN RAISE EXCEPTION 'Monthly payments are not open yet'; END IF;
    SELECT months.candidate::smallint INTO v_month FROM generate_series(2,3) AS months(candidate)
    WHERE NOT EXISTS (SELECT 1 FROM public.payment_requests r WHERE r.student_id=v_student AND r.course_id=p_course_id AND r.purchase_type='monthly' AND r.target_month=months.candidate AND r.status='confirmed')
    ORDER BY months.candidate LIMIT 1;
    IF v_month IS NULL THEN RAISE EXCEPTION 'There is no published paid month available to purchase'; END IF;
    IF EXISTS (SELECT 1 FROM public.payment_requests r WHERE r.student_id=v_student AND r.course_id=p_course_id AND r.purchase_type='monthly' AND r.target_month=v_month AND r.status='pending') THEN RAISE EXCEPTION 'Your next month payment is already waiting for review'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.modules m WHERE m.course_id=p_course_id AND m.month_number=v_month AND m.status='published')
      OR EXISTS (SELECT 1 FROM public.modules m WHERE m.course_id=p_course_id AND m.month_number=v_month AND m.status<>'published') THEN
      RAISE EXCEPTION 'The next paid month is not published yet';
    END IF;
    v_price := v_monthly_price;
  ELSIF p_purchase_type='full_course' THEN
    IF NOT v_full_enabled THEN RAISE EXCEPTION 'Full-course payments are not open yet'; END IF;
    IF EXISTS (SELECT 1 FROM generate_series(2,3) AS months(candidate) WHERE NOT EXISTS (
      SELECT 1 FROM public.modules m WHERE m.course_id=p_course_id AND m.month_number=months.candidate AND m.status='published'
    )) OR EXISTS (SELECT 1 FROM public.modules m WHERE m.course_id=p_course_id AND m.month_number BETWEEN 2 AND 3 AND m.status<>'published') THEN
      RAISE EXCEPTION 'The full paid curriculum is not published yet';
    END IF;
    IF EXISTS (SELECT 1 FROM public.payment_requests WHERE student_id=v_student AND course_id=p_course_id AND purchase_type='full_course' AND status='pending') THEN RAISE EXCEPTION 'A full-course payment is already waiting for review'; END IF;
    v_month := NULL; v_price := v_full_course_price;
  ELSE RAISE EXCEPTION 'Choose monthly or full-course access'; END IF;
  INSERT INTO public.payment_requests(student_id,course_id,purchase_type,target_month,amount_kes,receipt_suffix,payer_phone)
  VALUES(v_student,p_course_id,p_purchase_type,v_month,v_price,upper(p_receipt_suffix),v_phone) RETURNING id INTO v_id;
  RETURN v_id;
END; $$;
REVOKE ALL ON FUNCTION public.create_payment_request(uuid,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_payment_request(uuid,text,text,text) TO authenticated;
