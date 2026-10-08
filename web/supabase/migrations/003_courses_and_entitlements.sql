-- Course catalog and access periods. Python is the first independent course;
-- future languages can be added without changing learner identity or progress.

CREATE TYPE public.course_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE public.enrollment_status AS ENUM ('active', 'past_due', 'cancelled', 'expired');
CREATE TYPE public.enrollment_plan AS ENUM ('free_month1', 'paid_full', 'paid_monthly', 'scholarship');

CREATE TABLE public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  language_code text NOT NULL,
  description text NOT NULL DEFAULT '',
  status public.course_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.courses (slug, title, language_code, description, status)
VALUES ('python-foundations', 'Python Foundations', 'python', 'A beginner course in Python programming.', 'published');

ALTER TABLE public.modules
  ADD COLUMN course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  ADD COLUMN status public.course_status NOT NULL DEFAULT 'published';

UPDATE public.modules
SET course_id = (SELECT id FROM public.courses WHERE slug = 'python-foundations');

ALTER TABLE public.modules ALTER COLUMN course_id SET NOT NULL;
CREATE INDEX modules_course_order_idx ON public.modules(course_id, order_index);

CREATE TABLE public.course_instructors (
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  instructor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (course_id, instructor_id)
);

CREATE TABLE public.course_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan public.enrollment_plan NOT NULL DEFAULT 'free_month1',
  status public.enrollment_status NOT NULL DEFAULT 'active',
  started_at timestamptz NOT NULL DEFAULT now(),
  paid_through timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, student_id),
  CHECK (plan <> 'paid_monthly' OR paid_through IS NOT NULL)
);

CREATE INDEX course_enrollments_student_idx ON public.course_enrollments(student_id, course_id);

CREATE OR REPLACE FUNCTION private.is_course_instructor(target_course_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.course_instructors
    WHERE course_id = target_course_id AND instructor_id = (SELECT auth.uid())
  );
$$;

REVOKE ALL ON FUNCTION private.is_course_instructor(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_course_instructor(uuid) TO authenticated;

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_instructors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published courses are visible to authenticated users"
  ON public.courses FOR SELECT TO authenticated
  USING (status = 'published' OR (SELECT private.is_admin()) OR (SELECT private.is_course_instructor(id)));
CREATE POLICY "Admins manage courses"
  ON public.courses FOR ALL TO authenticated
  USING ((SELECT private.is_admin())) WITH CHECK ((SELECT private.is_admin()));

CREATE POLICY "Users see their course instructor assignments"
  ON public.course_instructors FOR SELECT TO authenticated
  USING (instructor_id = (SELECT auth.uid()) OR (SELECT private.is_admin()));
CREATE POLICY "Admins manage course instructor assignments"
  ON public.course_instructors FOR ALL TO authenticated
  USING ((SELECT private.is_admin())) WITH CHECK ((SELECT private.is_admin()));

CREATE POLICY "Learners and assigned instructors see enrollments"
  ON public.course_enrollments FOR SELECT TO authenticated
  USING (student_id = (SELECT auth.uid()) OR (SELECT private.is_admin()) OR (SELECT private.is_course_instructor(course_id)));
CREATE POLICY "Admins manage enrollments"
  ON public.course_enrollments FOR ALL TO authenticated
  USING ((SELECT private.is_admin())) WITH CHECK ((SELECT private.is_admin()));

CREATE POLICY "Assigned instructors review their course submissions"
  ON public.submissions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.assignments a
    JOIN public.sessions s ON s.id = a.session_id
    JOIN public.modules m ON m.id = s.module_id
    WHERE a.id = submissions.assignment_id
      AND private.is_course_instructor(m.course_id)
  ));

REVOKE ALL ON public.courses, public.course_instructors, public.course_enrollments FROM anon, authenticated;
GRANT SELECT ON public.courses, public.course_instructors, public.course_enrollments TO authenticated;

INSERT INTO public.course_enrollments (course_id, student_id, plan, status)
SELECT c.id, p.id, 'free_month1', 'active'
FROM public.profiles p
CROSS JOIN public.courses c
WHERE c.slug = 'python-foundations'
  AND p.role = 'student'
ON CONFLICT (course_id, student_id) DO NOTHING;

-- Module rows are the boundary for free-month and paid access. Instructors may
-- author content only in courses assigned to them; only admins can publish.
DROP POLICY IF EXISTS "Signed-in users can read modules" ON public.modules;
DROP POLICY IF EXISTS "Admins manage modules" ON public.modules;
CREATE POLICY "Learners read entitled published modules"
  ON public.modules FOR SELECT TO authenticated
  USING (
    (status = 'published' AND (
      (is_free AND EXISTS (
        SELECT 1 FROM public.course_enrollments e
        WHERE e.course_id = modules.course_id AND e.student_id = (SELECT auth.uid())
          AND e.status = 'active'
          AND e.started_at > now() - interval '30 days'
      ))
      OR EXISTS (
        SELECT 1 FROM public.course_enrollments e
        WHERE e.course_id = modules.course_id AND e.student_id = (SELECT auth.uid())
          AND e.status = 'active'
          AND (e.plan IN ('paid_full', 'scholarship') OR (e.plan = 'paid_monthly' AND e.paid_through > now()))
      )
    )) OR (SELECT private.is_admin()) OR (SELECT private.is_course_instructor(course_id))
  );
CREATE POLICY "Admins and assigned instructors insert draft modules"
  ON public.modules FOR INSERT TO authenticated
  WITH CHECK ((SELECT private.is_admin()) OR ((SELECT private.is_course_instructor(course_id)) AND status = 'draft'));
CREATE POLICY "Admins and assigned instructors update draft modules"
  ON public.modules FOR UPDATE TO authenticated
  USING ((SELECT private.is_admin()) OR ((SELECT private.is_course_instructor(course_id)) AND status = 'draft'))
  WITH CHECK ((SELECT private.is_admin()) OR ((SELECT private.is_course_instructor(course_id)) AND status = 'draft'));
CREATE POLICY "Only admins delete modules"
  ON public.modules FOR DELETE TO authenticated
  USING ((SELECT private.is_admin()));

DROP POLICY IF EXISTS "Signed-in users can read sessions" ON public.sessions;
DROP POLICY IF EXISTS "Admins manage sessions" ON public.sessions;
CREATE POLICY "Users read sessions within visible modules"
  ON public.sessions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.modules m WHERE m.id = sessions.module_id));
CREATE POLICY "Admins and assigned instructors insert draft sessions"
  ON public.sessions FOR INSERT TO authenticated
  WITH CHECK ((SELECT private.is_admin()) OR EXISTS (
    SELECT 1 FROM public.modules m WHERE m.id = sessions.module_id AND private.is_course_instructor(m.course_id) AND m.status = 'draft'
  ));
CREATE POLICY "Admins and assigned instructors update draft sessions"
  ON public.sessions FOR UPDATE TO authenticated
  USING ((SELECT private.is_admin()) OR EXISTS (
    SELECT 1 FROM public.modules m WHERE m.id = sessions.module_id AND private.is_course_instructor(m.course_id) AND m.status = 'draft'
  ))
  WITH CHECK ((SELECT private.is_admin()) OR EXISTS (
    SELECT 1 FROM public.modules m WHERE m.id = sessions.module_id AND private.is_course_instructor(m.course_id) AND m.status = 'draft'
  ));
CREATE POLICY "Admins and assigned instructors delete draft sessions"
  ON public.sessions FOR DELETE TO authenticated
  USING ((SELECT private.is_admin()) OR EXISTS (
    SELECT 1 FROM public.modules m WHERE m.id = sessions.module_id AND private.is_course_instructor(m.course_id) AND m.status = 'draft'
  ));

DROP POLICY IF EXISTS "Signed-in users can read assignments" ON public.assignments;
DROP POLICY IF EXISTS "Admins manage assignments" ON public.assignments;
CREATE POLICY "Users read assignments within visible sessions"
  ON public.assignments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = assignments.session_id));
CREATE POLICY "Admins and assigned instructors insert draft assignments"
  ON public.assignments FOR INSERT TO authenticated
  WITH CHECK ((SELECT private.is_admin()) OR EXISTS (
    SELECT 1 FROM public.sessions s JOIN public.modules m ON m.id = s.module_id
    WHERE s.id = assignments.session_id AND private.is_course_instructor(m.course_id) AND m.status = 'draft'
  ));
CREATE POLICY "Admins and assigned instructors update draft assignments"
  ON public.assignments FOR UPDATE TO authenticated
  USING ((SELECT private.is_admin()) OR EXISTS (
    SELECT 1 FROM public.sessions s JOIN public.modules m ON m.id = s.module_id
    WHERE s.id = assignments.session_id AND private.is_course_instructor(m.course_id) AND m.status = 'draft'
  ))
  WITH CHECK ((SELECT private.is_admin()) OR EXISTS (
    SELECT 1 FROM public.sessions s JOIN public.modules m ON m.id = s.module_id
    WHERE s.id = assignments.session_id AND private.is_course_instructor(m.course_id) AND m.status = 'draft'
  ));
CREATE POLICY "Admins and assigned instructors delete draft assignments"
  ON public.assignments FOR DELETE TO authenticated
  USING ((SELECT private.is_admin()) OR EXISTS (
    SELECT 1 FROM public.sessions s JOIN public.modules m ON m.id = s.module_id
    WHERE s.id = assignments.session_id AND private.is_course_instructor(m.course_id) AND m.status = 'draft'
  ));

DROP POLICY IF EXISTS "Flashcards viewable by authenticated users." ON public.flashcards;
CREATE POLICY "Users read flashcards within visible modules"
  ON public.flashcards FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.modules m WHERE m.id = flashcards.module_id));

-- New accounts receive the Python free-month enrollment. Entitlement is per course,
-- rather than a mutable profile field, so adding another language stays independent.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE python_course_id uuid;
BEGIN
  INSERT INTO public.profiles (id, full_name, role, fee_status)
  VALUES (new.id, COALESCE(NULLIF(BTRIM(new.raw_user_meta_data->>'full_name'), ''), 'Student'), 'student', 'free_month1');
  SELECT id INTO python_course_id FROM public.courses WHERE slug = 'python-foundations';
  IF python_course_id IS NOT NULL THEN
    INSERT INTO public.course_enrollments (course_id, student_id, plan, status)
    VALUES (python_course_id, new.id, 'free_month1', 'active');
  END IF;
  RETURN new;
END;
$$;

