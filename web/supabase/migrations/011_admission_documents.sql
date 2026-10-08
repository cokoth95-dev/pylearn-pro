-- Versioned admission guide, learner acknowledgement, guardian consent and payment-plan gates.
-- Requires 010_admin_managed_pricing.sql to have been applied first.

ALTER TABLE public.profiles
  ADD COLUMN age smallint,
  ADD COLUMN guardian_name text,
  ADD COLUMN guardian_email text,
  ADD COLUMN guardian_consent_status text NOT NULL DEFAULT 'not_required',
  ADD COLUMN guardian_consent_verified_at timestamptz,
  ADD CONSTRAINT profiles_age_range CHECK (age IS NULL OR age BETWEEN 10 AND 120),
  ADD CONSTRAINT profiles_guardian_consent_status_check CHECK (guardian_consent_status IN ('not_required','pending','verified')),
  ADD CONSTRAINT profiles_minor_guardian_check CHECK (
    age IS NULL OR age >= 18 OR
    (guardian_name IS NOT NULL AND length(btrim(guardian_name)) BETWEEN 2 AND 120
      AND guardian_email IS NOT NULL AND length(btrim(guardian_email)) BETWEEN 5 AND 254)
  );

ALTER TABLE public.payment_settings
  ADD COLUMN monthly_payments_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN full_course_payments_enabled boolean NOT NULL DEFAULT false;
UPDATE public.payment_settings
SET monthly_payments_enabled = false, full_course_payments_enabled = false;
GRANT UPDATE (monthly_payments_enabled, full_course_payments_enabled, updated_at)
  ON public.payment_settings TO authenticated;

CREATE TABLE public.admission_document_versions (
  version integer PRIMARY KEY CHECK (version > 0),
  title text NOT NULL,
  content_markdown text NOT NULL,
  requires_reacceptance boolean NOT NULL DEFAULT false,
  published_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  published_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.admission_document_draft (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  title text NOT NULL,
  content_markdown text NOT NULL,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles
  ADD COLUMN guardian_consent_version integer REFERENCES public.admission_document_versions(version);

CREATE TABLE public.admission_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  document_version integer NOT NULL REFERENCES public.admission_document_versions(version) ON DELETE RESTRICT,
  document_title text NOT NULL,
  content_snapshot text NOT NULL,
  fee_snapshot jsonb NOT NULL,
  learner_confirmed_read boolean NOT NULL CHECK (learner_confirmed_read),
  learner_confirmed_materials boolean NOT NULL CHECK (learner_confirmed_materials),
  accepted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (learner_id, document_version)
);
CREATE INDEX admission_acceptances_learner_idx ON public.admission_acceptances(learner_id, accepted_at DESC);

CREATE TABLE public.guardian_consent_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  document_version integer NOT NULL REFERENCES public.admission_document_versions(version),
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX guardian_consent_tokens_learner_idx ON public.guardian_consent_tokens(learner_id, created_at DESC);

ALTER TABLE public.admission_document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admission_document_draft ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admission_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guardian_consent_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in users read published admission guides"
  ON public.admission_document_versions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins read and edit admission guide draft"
  ON public.admission_document_draft FOR ALL TO authenticated
  USING ((SELECT private.is_admin())) WITH CHECK ((SELECT private.is_admin()));
CREATE POLICY "Learners read their admission copies"
  ON public.admission_acceptances FOR SELECT TO authenticated
  USING (learner_id = (SELECT auth.uid()) OR (SELECT private.is_admin()));
REVOKE ALL ON public.admission_document_versions, public.admission_document_draft,
  public.admission_acceptances, public.guardian_consent_tokens FROM anon, authenticated;
GRANT SELECT ON public.admission_document_versions, public.admission_acceptances TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.admission_document_draft TO authenticated;
GRANT ALL ON public.admission_document_versions, public.admission_document_draft,
  public.admission_acceptances, public.guardian_consent_tokens TO service_role;

INSERT INTO public.admission_document_versions(version, title, content_markdown, requires_reacceptance)
VALUES (1, 'Admission Document — PyLearn Pro Python Foundations', $doc$
## Welcome
PyLearn Pro teaches Python with plain-English explanations, everyday examples, worked examples, guided coding, and quick checks. This guide explains the course, materials, fees, access, and support.

## Course plan and what is available
The planned Python Foundations course spans four months. Lessons are self-paced, with a suggested goal of five sessions of about 30 minutes each week. There is no penalty for missed days. Learners should try each activity and complete its quick check before moving on.

Week 1 is currently published. Later weeks are being prepared. Capstone submission and certificate features are not available yet, and no release date is promised. Only published lessons can be opened. Paid payment options must stay disabled until the relevant paid lessons are published and can be accessed.

## What you need
- A laptop or desktop computer and a reliable internet connection.
- A modern web browser and access to the email address used for your account.
- Python installation is optional. The classroom has an in-browser practice editor.
- A notebook and pen are useful for notes, but are not required.

## Fees and M-Pesa access
The website and Payments page show the current prices set by the administrator. KSh and USD display prices are set separately. M-Pesa uses the KSh amount. The full-course card may show a regular price, sale price, and automatically calculated saving. Your accepted copy records the prices shown when you accepted this guide; a later price-only change does not require you to accept the guide again.

When a payment option is enabled, pay using Safaricom M-Pesa: choose Lipa na M-Pesa, then Pay Bill; business number 522522 (KCB); account number 1288171692. Pay the amount shown in PyLearn Pro, then submit the last four receipt characters and the payer phone number. Never enter or share your M-Pesa PIN in PyLearn Pro.

A payment request remains pending until an administrator checks the M-Pesa message and confirms it. Monthly access lasts 30 days from confirmation. A decline includes a reason and you may submit corrected details again. Unclear or mistaken payments are reviewed by an administrator; this guide does not promise a refund. Turning payments off blocks new requests and does not remove access already confirmed.

## Progress and optional AI help
Completed quick checks, lesson progress, and XP are saved to your account. Streaks are optional encouragement; missing a day does not remove XP. Browser code practice helps you learn, but does not create a trusted assignment grade. Capstones and certificates will be described here when those features are ready.

AI help is optional. When you send a question or code to the AI tutor, it is sent to Google Gemini to prepare a reply. Depending on the Google service tier used, Google may use prompts and replies to improve services and may have human reviewers inspect them. Do not include passwords, private information, or anything you would not want shared with the AI provider. AI replies can be wrong; check important information against your lesson.

## Learners under 18
A parent or legal guardian must review this guide and confirm permission before a learner under 18 can enter lessons. During sign-up, provide the guardian's name and email. PyLearn Pro will email the guardian this guide and a one-time confirmation link. Learning access stays locked until the guardian confirms. The learner must also read and accept this guide and confirm they have the required materials.

## Your copy and important notices
After you check both boxes and submit, PyLearn Pro saves an uneditable copy of the guide and fee snapshot under Profile and emails a PDF copy to you. Major guide changes require a new learner acceptance. Price-only changes do not.

Terms of Use and the Privacy Notice are separate pages. Please read them from the links shown with this guide. For school support, contact: [Support email to be provided before launch].
$doc$, true);

INSERT INTO public.admission_document_draft(id, title, content_markdown)
VALUES (true, 'Admission Document — PyLearn Pro Python Foundations', $doc$
## Welcome
PyLearn Pro teaches Python with plain-English explanations, everyday examples, worked examples, guided coding, and quick checks. This guide explains the course, materials, fees, access, and support.

## Course plan and what is available
The planned Python Foundations course spans four months. Lessons are self-paced, with a suggested goal of five sessions of about 30 minutes each week. There is no penalty for missed days. Learners should try each activity and complete its quick check before moving on.

Week 1 is currently published. Later weeks are being prepared. Capstone submission and certificate features are not available yet, and no release date is promised. Only published lessons can be opened. Paid payment options must stay disabled until the relevant paid lessons are published and can be accessed.

## What you need
- A laptop or desktop computer and a reliable internet connection.
- A modern web browser and access to the email address used for your account.
- Python installation is optional. The classroom has an in-browser practice editor.
- A notebook and pen are useful for notes, but are not required.

## Fees and M-Pesa access
The website and Payments page show the current prices set by the administrator. KSh and USD display prices are set separately. M-Pesa uses the KSh amount. The full-course card may show a regular price, sale price, and automatically calculated saving. Your accepted copy records the prices shown when you accepted this guide; a later price-only change does not require you to accept the guide again.

When a payment option is enabled, pay using Safaricom M-Pesa: choose Lipa na M-Pesa, then Pay Bill; business number 522522 (KCB); account number 1288171692. Pay the amount shown in PyLearn Pro, then submit the last four receipt characters and the payer phone number. Never enter or share your M-Pesa PIN in PyLearn Pro.

A payment request remains pending until an administrator checks the M-Pesa message and confirms it. Monthly access lasts 30 days from confirmation. A decline includes a reason and you may submit corrected details again. Unclear or mistaken payments are reviewed by an administrator; this guide does not promise a refund. Turning payments off blocks new requests and does not remove access already confirmed.

## Progress and optional AI help
Completed quick checks, lesson progress, and XP are saved to your account. Streaks are optional encouragement; missing a day does not remove XP. Browser code practice helps you learn, but does not create a trusted assignment grade. Capstones and certificates will be described here when those features are ready.

AI help is optional. When you send a question or code to the AI tutor, it is sent to Google Gemini to prepare a reply. Depending on the Google service tier used, Google may use prompts and replies to improve services and may have human reviewers inspect them. Do not include passwords, private information, or anything you would not want shared with the AI provider. AI replies can be wrong; check important information against your lesson.

## Learners under 18
A parent or legal guardian must review this guide and confirm permission before a learner under 18 can enter lessons. During sign-up, provide the guardian's name and email. PyLearn Pro will email the guardian this guide and a one-time confirmation link. Learning access stays locked until the guardian confirms. The learner must also read and accept this guide and confirm they have the required materials.

## Your copy and important notices
After you check both boxes and submit, PyLearn Pro saves an uneditable copy of the guide and fee snapshot under Profile and emails a PDF copy to you. Major guide changes require a new learner acceptance. Price-only changes do not.

Terms of Use and the Privacy Notice are separate pages. Please read them from the links shown with this guide. For school support, contact: [Support email to be provided before launch].
$doc$)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION private.has_learning_access()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid())
      AND (
        p.role IN ('admin','instructor') OR
        (
          p.role = 'student'
          AND p.age IS NOT NULL
          AND (p.age >= 18 OR (
            p.guardian_consent_status = 'verified' AND p.guardian_consent_verified_at IS NOT NULL
            AND p.guardian_consent_version IS NOT NULL
            AND p.guardian_consent_version >= COALESCE((SELECT max(d.version) FROM public.admission_document_versions d WHERE d.requires_reacceptance), 1)
          ))
          AND EXISTS (SELECT 1 FROM public.admission_acceptances a WHERE a.learner_id = p.id)
          AND NOT EXISTS (
            SELECT 1 FROM public.admission_document_versions d
            WHERE d.requires_reacceptance
              AND NOT EXISTS (
                SELECT 1 FROM public.admission_acceptances a
                WHERE a.learner_id = p.id AND a.document_version >= d.version
              )
          )
        )
      )
  );
$$;
REVOKE ALL ON FUNCTION private.has_learning_access() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_learning_access() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_admission_gate()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'role', p.role,
    'age_missing', p.age IS NULL,
    'guardian_pending', p.age < 18 AND (
      p.guardian_consent_status <> 'verified' OR p.guardian_consent_verified_at IS NULL OR
      p.guardian_consent_version IS NULL OR p.guardian_consent_version < COALESCE((
        SELECT max(d.version) FROM public.admission_document_versions d WHERE d.requires_reacceptance
      ), 1)
    ),
    'needs_acceptance', NOT EXISTS (SELECT 1 FROM public.admission_acceptances a WHERE a.learner_id = p.id)
      OR EXISTS (
        SELECT 1 FROM public.admission_document_versions d
        WHERE d.requires_reacceptance AND NOT EXISTS (
          SELECT 1 FROM public.admission_acceptances a WHERE a.learner_id=p.id AND a.document_version>=d.version
        )
      )
  ) FROM public.profiles p WHERE p.id=(SELECT auth.uid());
$$;
REVOKE ALL ON FUNCTION public.get_my_admission_gate() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_admission_gate() TO authenticated;

CREATE OR REPLACE FUNCTION public.can_use_learning_features()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT private.has_learning_access(); $$;
REVOKE ALL ON FUNCTION public.can_use_learning_features() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_use_learning_features() TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  python_course_id uuid;
  learner_age smallint := NULLIF(new.raw_user_meta_data->>'age', '')::smallint;
  guardian_name_value text := NULLIF(BTRIM(new.raw_user_meta_data->>'guardian_name'), '');
  guardian_email_value text := NULLIF(LOWER(BTRIM(new.raw_user_meta_data->>'guardian_email')), '');
BEGIN
  IF learner_age IS NULL OR learner_age NOT BETWEEN 10 AND 120 THEN
    RAISE EXCEPTION 'Enter an age from 10 to 120';
  END IF;
  IF learner_age < 18 AND (guardian_name_value IS NULL OR guardian_email_value IS NULL) THEN
    RAISE EXCEPTION 'A parent or guardian name and email are required for learners under 18';
  END IF;
  IF learner_age < 18 AND (guardian_email_value !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' OR guardian_email_value = lower(new.email)) THEN
    RAISE EXCEPTION 'Enter a valid guardian email that is different from the learner email';
  END IF;
  INSERT INTO public.profiles (id, full_name, role, fee_status, age, guardian_name, guardian_email, guardian_consent_status)
  VALUES (
    new.id,
    COALESCE(NULLIF(BTRIM(new.raw_user_meta_data->>'full_name'), ''), 'Student'),
    'student', 'free_month1', learner_age, guardian_name_value, guardian_email_value,
    CASE WHEN learner_age < 18 THEN 'pending' ELSE 'not_required' END
  );
  SELECT id INTO python_course_id FROM public.courses WHERE slug = 'python-foundations';
  IF python_course_id IS NOT NULL THEN
    INSERT INTO public.course_enrollments (course_id, student_id, plan, status)
    VALUES (python_course_id, new.id, 'free_month1', 'active');
  END IF;
  RETURN new;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_publish_admission_document(p_requires_reacceptance boolean)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE next_version integer;
BEGIN
  IF NOT (SELECT private.is_admin()) THEN RAISE EXCEPTION 'Administrator access is required'; END IF;
  SELECT COALESCE(max(version), 0) + 1 INTO next_version FROM public.admission_document_versions;
  INSERT INTO public.admission_document_versions(version, title, content_markdown, requires_reacceptance, published_by)
  SELECT next_version, title, content_markdown, p_requires_reacceptance, (SELECT auth.uid())
  FROM public.admission_document_draft WHERE id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Save the admission guide draft before publishing'; END IF;
  IF p_requires_reacceptance THEN
    UPDATE public.profiles SET guardian_consent_status='pending', updated_at=now()
    WHERE age < 18 AND guardian_consent_status='verified';
  END IF;
  RETURN next_version;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_publish_admission_document(boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_publish_admission_document(boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_save_admission_draft(p_title text, p_content_markdown text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NOT (SELECT private.is_admin()) THEN RAISE EXCEPTION 'Administrator access is required'; END IF;
  IF length(btrim(p_title)) NOT BETWEEN 5 AND 160 THEN RAISE EXCEPTION 'Enter a guide title from 5 to 160 characters'; END IF;
  IF length(btrim(p_content_markdown)) NOT BETWEEN 100 AND 30000 THEN RAISE EXCEPTION 'The guide must contain 100 to 30000 characters'; END IF;
  INSERT INTO public.admission_document_draft(id, title, content_markdown, updated_by, updated_at)
  VALUES (true, btrim(p_title), p_content_markdown, (SELECT auth.uid()), now())
  ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, content_markdown=EXCLUDED.content_markdown,
    updated_by=EXCLUDED.updated_by, updated_at=EXCLUDED.updated_at;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_save_admission_draft(text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_save_admission_draft(text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.accept_current_admission_document(p_read boolean, p_materials boolean)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  user_id uuid := (SELECT auth.uid());
  profile_row public.profiles%ROWTYPE;
  document_row public.admission_document_versions%ROWTYPE;
  prices jsonb;
  acceptance_id uuid;
BEGIN
  IF user_id IS NULL THEN RAISE EXCEPTION 'Sign in to accept the admission guide'; END IF;
  IF p_read IS DISTINCT FROM true OR p_materials IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Read the guide and confirm that you have the required materials';
  END IF;
  SELECT * INTO profile_row FROM public.profiles WHERE id = user_id FOR UPDATE;
  IF profile_row.role <> 'student' THEN RAISE EXCEPTION 'Only learner accounts need to accept the admission guide'; END IF;
  IF profile_row.age IS NULL THEN RAISE EXCEPTION 'Tell us your age before continuing'; END IF;
  IF profile_row.age < 18 AND profile_row.guardian_consent_status <> 'verified' THEN
    RAISE EXCEPTION 'Your parent or guardian must confirm first';
  END IF;
  SELECT * INTO document_row FROM public.admission_document_versions ORDER BY version DESC LIMIT 1;
  IF document_row.version IS NULL THEN RAISE EXCEPTION 'The admission guide is not available yet'; END IF;
  SELECT to_jsonb(s) INTO prices FROM public.payment_settings s WHERE id;
  SELECT id INTO acceptance_id FROM public.admission_acceptances
    WHERE learner_id = user_id AND document_version = document_row.version;
  IF FOUND THEN
    RETURN acceptance_id;
  END IF;
  INSERT INTO public.admission_acceptances(
    learner_id, document_version, document_title, content_snapshot, fee_snapshot,
    learner_confirmed_read, learner_confirmed_materials
  ) VALUES (
    user_id, document_row.version, document_row.title, document_row.content_markdown,
    COALESCE(prices, '{}'::jsonb), p_read, p_materials
  ) RETURNING id INTO acceptance_id;
  RETURN acceptance_id;
END;
$$;
REVOKE ALL ON FUNCTION public.accept_current_admission_document(boolean, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_current_admission_document(boolean, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.confirm_guardian_admission(p_token_hash text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE token_row public.guardian_consent_tokens%ROWTYPE; required_version integer;
BEGIN
  SELECT * INTO token_row FROM public.guardian_consent_tokens
  WHERE token_hash = p_token_hash AND consumed_at IS NULL AND expires_at > now()
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'This guardian link is invalid, expired, or already used'; END IF;
  SELECT COALESCE(max(version), 1) INTO required_version FROM public.admission_document_versions WHERE requires_reacceptance;
  IF token_row.document_version < required_version THEN RAISE EXCEPTION 'A newer admission guide needs guardian review'; END IF;
  UPDATE public.profiles SET guardian_consent_status='verified', guardian_consent_verified_at=now(),
    guardian_consent_version=token_row.document_version, updated_at=now()
  WHERE id=token_row.learner_id AND age < 18 AND guardian_consent_status='pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'Guardian approval is no longer needed for this learner'; END IF;
  UPDATE public.guardian_consent_tokens SET consumed_at=now() WHERE id=token_row.id;
  RETURN token_row.learner_id;
END;
$$;
REVOKE ALL ON FUNCTION public.confirm_guardian_admission(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_guardian_admission(text) TO service_role;

-- Do not expose age or guardian contact details through profile reads. The learner gate
-- is returned through an auth.uid()-scoped SECURITY DEFINER function instead.
REVOKE SELECT ON public.profiles FROM authenticated;
GRANT SELECT (id, full_name, role, xp, streak_count, last_activity_date, fee_status, created_at, updated_at)
  ON public.profiles TO authenticated;

DROP POLICY IF EXISTS "Published courses are visible to authenticated users" ON public.courses;
CREATE POLICY "Published courses are visible to learners with admission access"
  ON public.courses FOR SELECT TO authenticated
  USING ((status = 'published' AND (SELECT private.has_learning_access()))
    OR (SELECT private.is_admin()) OR (SELECT private.is_course_instructor(id)));

DROP POLICY IF EXISTS "Learners read entitled published modules" ON public.modules;
CREATE POLICY "Learners read entitled published modules" ON public.modules FOR SELECT TO authenticated
USING (
  (status='published' AND EXISTS (SELECT 1 FROM public.courses c WHERE c.id=modules.course_id AND c.status='published')
    AND (SELECT private.has_learning_access()) AND (
      EXISTS (SELECT 1 FROM public.course_enrollments e WHERE e.course_id=modules.course_id AND e.student_id=(SELECT auth.uid()) AND e.status='active' AND e.plan='free_month1' AND modules.is_free AND e.started_at > now()-interval '30 days')
      OR EXISTS (SELECT 1 FROM public.course_enrollments e WHERE e.course_id=modules.course_id AND e.student_id=(SELECT auth.uid()) AND e.status='active' AND e.plan IN ('paid_full','scholarship'))
      OR EXISTS (SELECT 1 FROM public.course_month_entitlements e WHERE e.course_id=modules.course_id AND e.student_id=(SELECT auth.uid()) AND e.month_number=modules.month_number AND e.starts_at<=now() AND e.expires_at>now())
    )) OR (SELECT private.is_admin()) OR (SELECT private.is_course_instructor(course_id))
);

CREATE OR REPLACE FUNCTION private.require_admission_before_quick_check()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NOT (SELECT private.has_learning_access()) THEN
    RAISE EXCEPTION 'Complete guardian confirmation and accept the admission guide before starting lessons';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.require_admission_before_quick_check() FROM PUBLIC;
CREATE TRIGGER require_admission_for_quick_check
  BEFORE INSERT ON public.session_quick_check_attempts
  FOR EACH ROW EXECUTE FUNCTION private.require_admission_before_quick_check();

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
    SELECT months.candidate::smallint INTO v_month FROM generate_series(2,4) AS months(candidate)
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
    IF EXISTS (SELECT 1 FROM generate_series(2,4) AS months(candidate) WHERE NOT EXISTS (
      SELECT 1 FROM public.modules m WHERE m.course_id=p_course_id AND m.month_number=months.candidate AND m.status='published'
    )) OR EXISTS (SELECT 1 FROM public.modules m WHERE m.course_id=p_course_id AND m.month_number BETWEEN 2 AND 4 AND m.status<>'published') THEN
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

-- Existing legacy profiles have no stored age. They must provide it in the admission flow.
