-- Manual Safaricom Paybill payments with admin review and month-scoped access.
CREATE TABLE public.payment_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  payments_enabled boolean NOT NULL DEFAULT false,
  paybill_number text NOT NULL DEFAULT '522522' CHECK (paybill_number = '522522'),
  account_number text NOT NULL DEFAULT '1288171692' CHECK (account_number = '1288171692'),
  monthly_amount_kes integer NOT NULL DEFAULT 6500 CHECK (monthly_amount_kes = 6500),
  full_course_amount_kes integer NOT NULL DEFAULT 18500 CHECK (full_course_amount_kes = 18500),
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.payment_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

CREATE TABLE public.payment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE RESTRICT,
  purchase_type text NOT NULL CHECK (purchase_type IN ('monthly', 'full_course')),
  target_month smallint CHECK (target_month BETWEEN 2 AND 4),
  amount_kes integer NOT NULL CHECK (amount_kes IN (6500,18500)),
  receipt_suffix text NOT NULL CHECK (receipt_suffix ~ '^[A-Za-z0-9]{4}$'),
  payer_phone text NOT NULL CHECK (length(payer_phone) BETWEEN 9 AND 16),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','declined')),
  decline_reason text,
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((purchase_type = 'monthly' AND target_month IS NOT NULL AND amount_kes = 6500)
      OR (purchase_type = 'full_course' AND target_month IS NULL AND amount_kes = 18500))
);
CREATE INDEX payment_requests_admin_queue_idx ON public.payment_requests(status, created_at);
CREATE INDEX payment_requests_student_idx ON public.payment_requests(student_id, created_at DESC);

CREATE TABLE public.course_month_entitlements (
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  month_number smallint NOT NULL CHECK (month_number BETWEEN 2 AND 4),
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  payment_request_id uuid NOT NULL UNIQUE REFERENCES public.payment_requests(id) ON DELETE RESTRICT,
  PRIMARY KEY (course_id, student_id, month_number, payment_request_id),
  CHECK (expires_at > starts_at)
);
CREATE INDEX course_month_entitlements_access_idx ON public.course_month_entitlements(course_id, student_id, month_number, expires_at);

ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_month_entitlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users read payment settings" ON public.payment_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins update payment settings" ON public.payment_settings FOR UPDATE TO authenticated USING ((SELECT private.is_admin())) WITH CHECK ((SELECT private.is_admin()));
CREATE POLICY "Learners and admins read payment requests" ON public.payment_requests FOR SELECT TO authenticated USING (student_id = (SELECT auth.uid()) OR (SELECT private.is_admin()));
CREATE POLICY "Learners and admins read month entitlements" ON public.course_month_entitlements FOR SELECT TO authenticated USING (student_id = (SELECT auth.uid()) OR (SELECT private.is_admin()));
GRANT SELECT ON public.payment_settings, public.payment_requests, public.course_month_entitlements TO authenticated;
GRANT UPDATE (payments_enabled, updated_at) ON public.payment_settings TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.payment_requests, public.course_month_entitlements FROM anon, authenticated;
REVOKE INSERT, DELETE ON public.payment_settings FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_payment_request(
  p_course_id uuid, p_purchase_type text, p_receipt_suffix text, p_payer_phone text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_student uuid := (SELECT auth.uid()); v_month smallint; v_id uuid; v_price integer; v_phone text;
BEGIN
  IF v_student IS NULL THEN RAISE EXCEPTION 'Sign in before submitting a payment'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_student::text || ':' || p_course_id::text, 0));
  IF p_receipt_suffix !~* '^[A-Z0-9]{4}$' THEN RAISE EXCEPTION 'Enter the last four letters or numbers of the M-Pesa receipt'; END IF;
  IF p_payer_phone !~ '^\+?[0-9][0-9 ()-]{7,18}$' THEN RAISE EXCEPTION 'Enter a valid payer phone number'; END IF;
  v_phone := regexp_replace(p_payer_phone, '[^0-9]', '', 'g');
  IF length(v_phone) NOT BETWEEN 9 AND 15 THEN RAISE EXCEPTION 'Enter a valid payer phone number'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.payment_settings WHERE id AND payments_enabled) THEN RAISE EXCEPTION 'Payments are temporarily disabled'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.courses WHERE id = p_course_id AND status = 'published') THEN RAISE EXCEPTION 'Select an available course'; END IF;
  IF EXISTS (SELECT 1 FROM public.course_enrollments WHERE course_id = p_course_id AND student_id = v_student AND plan IN ('paid_full','scholarship') AND status = 'active') THEN RAISE EXCEPTION 'Your account already has full-course access'; END IF;
  IF EXISTS (SELECT 1 FROM public.payment_requests WHERE student_id=v_student AND course_id=p_course_id AND purchase_type='full_course' AND status='pending') THEN RAISE EXCEPTION 'A full-course payment is already waiting for review'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.course_enrollments WHERE course_id = p_course_id AND student_id = v_student AND status = 'active') THEN
    INSERT INTO public.course_enrollments (course_id, student_id, plan, status) VALUES (p_course_id, v_student, 'free_month1', 'active') ON CONFLICT (course_id, student_id) DO UPDATE SET status='active';
  END IF;
  IF p_purchase_type = 'monthly' THEN
    SELECT candidate::smallint INTO v_month FROM generate_series(2,4) AS candidates(candidate)
    WHERE NOT EXISTS (SELECT 1 FROM public.payment_requests r WHERE r.student_id = v_student AND r.course_id = p_course_id AND r.purchase_type = 'monthly' AND r.target_month = candidate AND r.status = 'confirmed')
      AND NOT EXISTS (SELECT 1 FROM public.payment_requests r WHERE r.student_id = v_student AND r.course_id = p_course_id AND r.purchase_type = 'monthly' AND r.target_month = candidate AND r.status = 'pending')
    ORDER BY candidate LIMIT 1;
    IF v_month IS NULL THEN RAISE EXCEPTION 'There is no next monthly module available to purchase'; END IF;
    v_price := 6500;
  ELSIF p_purchase_type = 'full_course' THEN
    v_month := NULL; v_price := 18500;
  ELSE RAISE EXCEPTION 'Choose monthly or full-course access'; END IF;
  INSERT INTO public.payment_requests(student_id,course_id,purchase_type,target_month,amount_kes,receipt_suffix,payer_phone)
  VALUES(v_student,p_course_id,p_purchase_type,v_month,v_price,upper(p_receipt_suffix),v_phone) RETURNING id INTO v_id;
  RETURN v_id;
END; $$;
REVOKE ALL ON FUNCTION public.create_payment_request(uuid,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_payment_request(uuid,text,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_review_payment_request(p_request_id uuid, p_decision text, p_decline_reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_request public.payment_requests%ROWTYPE; v_reason text;
BEGIN
  IF (SELECT auth.uid()) IS NULL OR NOT (SELECT private.is_admin()) THEN RAISE EXCEPTION 'Administrator access is required'; END IF;
  SELECT * INTO v_request FROM public.payment_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND OR v_request.status <> 'pending' THEN RAISE EXCEPTION 'This payment request is no longer pending'; END IF;
  IF p_decision = 'declined' THEN
    v_reason := NULLIF(BTRIM(p_decline_reason), '');
    IF v_reason IS NULL OR length(v_reason) > 500 THEN RAISE EXCEPTION 'Give the learner a short reason for declining this payment'; END IF;
    UPDATE public.payment_requests SET status='declined', decline_reason=v_reason, reviewed_by=(SELECT auth.uid()), reviewed_at=now() WHERE id=p_request_id;
    RETURN;
  ELSIF p_decision <> 'confirmed' THEN RAISE EXCEPTION 'Choose confirm or decline'; END IF;
  UPDATE public.payment_requests SET status='confirmed', reviewed_by=(SELECT auth.uid()), reviewed_at=now() WHERE id=p_request_id;
  IF v_request.purchase_type = 'full_course' THEN
    INSERT INTO public.course_enrollments(course_id,student_id,plan,status,paid_through)
    VALUES(v_request.course_id,v_request.student_id,'paid_full','active',NULL)
    ON CONFLICT(course_id,student_id) DO UPDATE SET plan='paid_full',status='active',paid_through=NULL;
  ELSE
    INSERT INTO public.course_month_entitlements(course_id,student_id,month_number,starts_at,expires_at,payment_request_id)
    VALUES(v_request.course_id,v_request.student_id,v_request.target_month,now(),now()+interval '30 days',p_request_id);
  END IF;
END; $$;
REVOKE ALL ON FUNCTION public.admin_review_payment_request(uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_review_payment_request(uuid,text,text) TO authenticated;

-- A free Month 1 enrollment remains valid for 30 days. Paid monthly access is now scoped
-- to the specific month confirmed by an administrator; full-course and scholarship access remain global.
DROP POLICY IF EXISTS "Learners read entitled published modules" ON public.modules;
CREATE POLICY "Learners read entitled published modules" ON public.modules FOR SELECT TO authenticated
USING (
  (status='published' AND EXISTS (SELECT 1 FROM public.courses c WHERE c.id=modules.course_id AND c.status='published') AND (
    EXISTS (SELECT 1 FROM public.course_enrollments e WHERE e.course_id=modules.course_id AND e.student_id=(SELECT auth.uid()) AND e.status='active' AND e.plan='free_month1' AND modules.is_free AND e.started_at > now()-interval '30 days')
    OR EXISTS (SELECT 1 FROM public.course_enrollments e WHERE e.course_id=modules.course_id AND e.student_id=(SELECT auth.uid()) AND e.status='active' AND e.plan IN ('paid_full','scholarship'))
    OR EXISTS (SELECT 1 FROM public.course_month_entitlements e WHERE e.course_id=modules.course_id AND e.student_id=(SELECT auth.uid()) AND e.month_number=modules.month_number AND e.starts_at <= now() AND e.expires_at > now())
  )) OR (SELECT private.is_admin()) OR (SELECT private.is_course_instructor(course_id))
);

CREATE OR REPLACE FUNCTION public.submit_session_quick_check(p_session_id integer, p_selected_option smallint)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_student_id uuid := (SELECT auth.uid()); v_correct_option smallint; v_option_count integer; v_explanation text; v_xp_reward integer; v_content_snapshot jsonb; v_is_correct boolean; v_completed_now boolean := false;
BEGIN
  IF v_student_id IS NULL OR p_session_id IS NULL OR p_selected_option IS NULL OR p_selected_option < 0 THEN RAISE EXCEPTION 'A signed-in learner and valid answer are required'; END IF;
  SELECT answer.correct_option, jsonb_array_length(s.quick_check->'options'), answer.explanation, s.xp_reward,
    jsonb_build_object('captured_at',now(),'module',jsonb_build_object('id',m.id,'title',m.title,'month_number',m.month_number),'session',jsonb_build_object('id',s.id,'session_number',s.session_number,'title',s.title,'analogy_physical',s.analogy_physical,'content_markdown',s.content_markdown,'starter_code',s.starter_code,'hints',s.hints,'duration_minutes',s.duration_minutes,'quick_check',s.quick_check))
  INTO v_correct_option,v_option_count,v_explanation,v_xp_reward,v_content_snapshot
  FROM public.sessions s JOIN public.modules m ON m.id=s.module_id JOIN private.session_quick_check_answers answer ON answer.session_id=s.id
  WHERE s.id=p_session_id AND m.status='published' AND (
    (SELECT private.is_admin()) OR (SELECT private.is_course_instructor(m.course_id)) OR
    (EXISTS (SELECT 1 FROM public.course_enrollments e WHERE e.course_id=m.course_id AND e.student_id=v_student_id AND e.status='active' AND e.plan='free_month1' AND m.is_free AND e.started_at > now()-interval '30 days')) OR
    (EXISTS (SELECT 1 FROM public.course_enrollments e WHERE e.course_id=m.course_id AND e.student_id=v_student_id AND e.status='active' AND e.plan IN ('paid_full','scholarship'))) OR
    (EXISTS (SELECT 1 FROM public.course_month_entitlements e WHERE e.course_id=m.course_id AND e.student_id=v_student_id AND e.month_number=m.month_number AND e.starts_at<=now() AND e.expires_at>now()))
  );
  IF v_correct_option IS NULL THEN RAISE EXCEPTION 'This quick check is unavailable to your account'; END IF;
  IF NOT (SELECT private.is_admin()) AND NOT (SELECT private.is_course_instructor((SELECT m.course_id FROM public.sessions s JOIN public.modules m ON m.id=s.module_id WHERE s.id=p_session_id))) AND EXISTS (
    SELECT 1 FROM public.sessions earlier JOIN public.sessions current_session ON current_session.module_id=earlier.module_id
    WHERE current_session.id=p_session_id AND earlier.session_number<current_session.session_number AND NOT EXISTS (SELECT 1 FROM public.user_progress progress WHERE progress.student_id=v_student_id AND progress.session_id=earlier.id AND progress.completed)
  ) THEN RAISE EXCEPTION 'Complete the earlier lessons in this week first'; END IF;
  IF p_selected_option < 0 OR p_selected_option >= v_option_count THEN RAISE EXCEPTION 'Selected answer is outside the available options'; END IF;
  v_is_correct := p_selected_option=v_correct_option;
  INSERT INTO public.session_quick_check_attempts(student_id,session_id,selected_option,correct,content_snapshot) VALUES(v_student_id,p_session_id,p_selected_option,v_is_correct,v_content_snapshot);
  IF v_is_correct THEN
    INSERT INTO public.user_progress(student_id,session_id,completed,last_accessed) VALUES(v_student_id,p_session_id,false,now()) ON CONFLICT(student_id,session_id) DO NOTHING;
    UPDATE public.user_progress SET completed=true,completed_at=now(),last_accessed=now(),completed_content_snapshot=v_content_snapshot WHERE student_id=v_student_id AND session_id=p_session_id AND completed=false;
    v_completed_now := FOUND;
    IF v_completed_now THEN UPDATE public.profiles SET xp=xp+COALESCE(v_xp_reward,0),updated_at=now() WHERE id=v_student_id AND role='student'; END IF;
  END IF;
  RETURN jsonb_build_object('correct',v_is_correct,'explanation',v_explanation,'session_completed_now',v_completed_now,'xp_awarded',CASE WHEN v_completed_now THEN COALESCE(v_xp_reward,0) ELSE 0 END);
END; $$;
REVOKE ALL ON FUNCTION public.submit_session_quick_check(integer,smallint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_session_quick_check(integer,smallint) TO authenticated;
