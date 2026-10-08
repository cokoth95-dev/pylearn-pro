-- Security hardening for the initial schema. Apply before enabling signups.
-- Student-visible tables must not contain solutions or hidden test data.

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO service_role;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = (SELECT auth.uid())
      AND role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION private.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_admin() TO authenticated;

-- Registration now collects only a name and email. Auth owns the email address.
ALTER TABLE public.profiles
  DROP COLUMN phone_number,
  DROP COLUMN location,
  DROP COLUMN email,
  DROP COLUMN age;

ALTER TABLE public.profiles
  ALTER COLUMN role SET NOT NULL,
  ALTER COLUMN xp SET NOT NULL,
  ALTER COLUMN streak_count SET NOT NULL;

-- Keep model solutions and hidden test cases outside the PostgREST-exposed schema.
CREATE TABLE private.session_solutions (
  session_id integer PRIMARY KEY REFERENCES public.sessions(id) ON DELETE CASCADE,
  solution_code text NOT NULL
);

INSERT INTO private.session_solutions (session_id, solution_code)
SELECT id, solution_code
FROM public.sessions
WHERE solution_code IS NOT NULL
ON CONFLICT (session_id) DO UPDATE SET solution_code = EXCLUDED.solution_code;

ALTER TABLE public.sessions DROP COLUMN solution_code;

CREATE TABLE private.assignment_hidden_test_cases (
  assignment_id integer NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  test_order integer NOT NULL,
  input text NOT NULL DEFAULT '',
  expected text NOT NULL DEFAULT '',
  description text,
  PRIMARY KEY (assignment_id, test_order)
);

INSERT INTO private.assignment_hidden_test_cases
  (assignment_id, test_order, input, expected, description)
SELECT
  assignment.id,
  test_case.ordinality::integer,
  COALESCE(test_case.value->>'input', ''),
  COALESCE(test_case.value->>'expected', ''),
  test_case.value->>'description'
FROM public.assignments AS assignment
CROSS JOIN LATERAL jsonb_array_elements(
  CASE
    WHEN jsonb_typeof(assignment.test_cases) = 'array' THEN assignment.test_cases
    ELSE '[]'::jsonb
  END
) WITH ORDINALITY AS test_case(value, ordinality)
WHERE LOWER(COALESCE(test_case.value->>'is_hidden', 'false')) = 'true'
ON CONFLICT (assignment_id, test_order) DO UPDATE
SET input = EXCLUDED.input,
    expected = EXCLUDED.expected,
    description = EXCLUDED.description;

UPDATE public.assignments AS assignment
SET test_cases = COALESCE(
  (
    SELECT jsonb_agg(test_case.value - 'is_hidden' ORDER BY test_case.ordinality)
    FROM jsonb_array_elements(
      CASE
        WHEN jsonb_typeof(assignment.test_cases) = 'array' THEN assignment.test_cases
        ELSE '[]'::jsonb
      END
    ) WITH ORDINALITY AS test_case(value, ordinality)
    WHERE LOWER(COALESCE(test_case.value->>'is_hidden', 'false')) <> 'true'
  ),
  '[]'::jsonb
);

REVOKE ALL ON ALL TABLES IN SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA private TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA private
  REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA private
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO service_role;

-- Profiles: private by default. Learners can change their display name, never their role,
-- XP, streak, or fee state. Admin review is performed by server-side code.
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
CREATE POLICY "Learners can read their own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = id OR (SELECT private.is_admin()));
CREATE POLICY "Learners can update their own name"
  ON public.profiles FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

REVOKE ALL ON public.profiles FROM anon, authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE (full_name) ON public.profiles TO authenticated;

-- Course content is available only to signed-in learners. Private solution material was
-- moved out of these tables above. Entitlement and lesson-order checks are enforced by the
-- application until the course enrollment model is introduced.
DROP POLICY IF EXISTS "Modules viewable by authenticated users." ON public.modules;
DROP POLICY IF EXISTS "Sessions viewable by authenticated users." ON public.sessions;
DROP POLICY IF EXISTS "Assignments viewable by authenticated users." ON public.assignments;
DROP POLICY IF EXISTS "Flashcards viewable by authenticated users." ON public.flashcards;

CREATE POLICY "Signed-in users can read modules"
  ON public.modules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Signed-in users can read sessions"
  ON public.sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Signed-in users can read assignments"
  ON public.assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Signed-in users can read flashcards"
  ON public.flashcards FOR SELECT TO authenticated USING (true);

-- Replace recursive admin checks with the SECURITY DEFINER helper.
DROP POLICY IF EXISTS "Admins have full access to modules." ON public.modules;
DROP POLICY IF EXISTS "Admins have full access to sessions." ON public.sessions;
DROP POLICY IF EXISTS "Admins have full access to assignments." ON public.assignments;
DROP POLICY IF EXISTS "Admins have full access to submissions." ON public.submissions;

CREATE POLICY "Admins manage modules"
  ON public.modules FOR ALL TO authenticated
  USING ((SELECT private.is_admin()))
  WITH CHECK ((SELECT private.is_admin()));
CREATE POLICY "Admins manage sessions"
  ON public.sessions FOR ALL TO authenticated
  USING ((SELECT private.is_admin()))
  WITH CHECK ((SELECT private.is_admin()));
CREATE POLICY "Admins manage assignments"
  ON public.assignments FOR ALL TO authenticated
  USING ((SELECT private.is_admin()))
  WITH CHECK ((SELECT private.is_admin()));
CREATE POLICY "Admins manage submissions"
  ON public.submissions FOR ALL TO authenticated
  USING ((SELECT private.is_admin()))
  WITH CHECK ((SELECT private.is_admin()));

-- Learners may inspect their attempts. Only trusted server code may insert or change scores.
DROP POLICY IF EXISTS "Students can insert own submissions." ON public.submissions;
REVOKE ALL ON public.submissions FROM anon, authenticated;
GRANT SELECT ON public.submissions TO authenticated;
CREATE POLICY "Learners can read their own submissions"
  ON public.submissions FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = student_id OR (SELECT private.is_admin()));

-- A browser can save drafts, but cannot mark a lesson complete or award itself progress.
DROP POLICY IF EXISTS "Students can view own progress." ON public.user_progress;
DROP POLICY IF EXISTS "Students can manage own progress." ON public.user_progress;
REVOKE ALL ON public.user_progress FROM anon, authenticated;
GRANT SELECT ON public.user_progress TO authenticated;
GRANT INSERT (student_id, session_id, draft_code, timer_seconds_spent, last_accessed)
  ON public.user_progress TO authenticated;
GRANT UPDATE (draft_code, timer_seconds_spent, last_accessed)
  ON public.user_progress TO authenticated;
CREATE POLICY "Learners can read their own progress"
  ON public.user_progress FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = student_id OR (SELECT private.is_admin()));
CREATE POLICY "Learners can create their own draft records"
  ON public.user_progress FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = student_id AND completed = false);
CREATE POLICY "Learners can update their own drafts"
  ON public.user_progress FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = student_id)
  WITH CHECK ((SELECT auth.uid()) = student_id);

-- Certificates are not a public directory. Public verification will use a narrow server
-- endpoint that returns only the fields needed to verify a certificate number.
DROP POLICY IF EXISTS "Certificates are publicly verifiable." ON public.certificates;
REVOKE ALL ON public.certificates FROM anon, authenticated;
GRANT SELECT ON public.certificates TO authenticated;
CREATE POLICY "Learners can read their own certificates"
  ON public.certificates FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = student_id OR (SELECT private.is_admin()));

-- Spaced-repetition state is personal data; do not allow a client to transfer it to another
-- learner's account.
DROP POLICY IF EXISTS "Students can manage own flashcards progress." ON public.user_flashcard_progress;
CREATE POLICY "Learners manage their own flashcard progress"
  ON public.user_flashcard_progress FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = student_id)
  WITH CHECK ((SELECT auth.uid()) = student_id);

-- The signup trigger creates only a student profile. Elevated roles are assigned separately
-- by an administrator through trusted server-side code.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, fee_status)
  VALUES (
    new.id,
    COALESCE(NULLIF(BTRIM(new.raw_user_meta_data->>'full_name'), ''), 'Student'),
    'student',
    'free_month1'
  );
  RETURN new;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
