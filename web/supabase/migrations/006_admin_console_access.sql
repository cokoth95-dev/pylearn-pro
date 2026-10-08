-- Admin console capabilities. RLS remains the authority for every browser request.

-- Grant the verbs needed by the admin console. These grants do not bypass RLS.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.courses, public.course_instructors TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.modules, public.sessions TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.modules_id_seq, public.sessions_id_seq TO authenticated;

-- Only admins can promote a learner to instructor and assign that instructor to a course.
-- This SECURITY DEFINER function intentionally cannot create or promote an admin.
CREATE OR REPLACE FUNCTION public.admin_assign_course_instructor(
  p_course_id uuid,
  p_profile_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF (SELECT auth.uid()) IS NULL OR NOT (SELECT private.is_admin()) THEN
    RAISE EXCEPTION 'Administrator access is required';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.courses WHERE id = p_course_id) THEN
    RAISE EXCEPTION 'Course not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_profile_id AND role IN ('student', 'instructor')
  ) THEN
    RAISE EXCEPTION 'Select an existing learner or instructor';
  END IF;

  UPDATE public.profiles
  SET role = 'instructor', updated_at = now()
  WHERE id = p_profile_id;

  INSERT INTO public.course_instructors (course_id, instructor_id)
  VALUES (p_course_id, p_profile_id)
  ON CONFLICT (course_id, instructor_id) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_assign_course_instructor(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_assign_course_instructor(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_remove_course_instructor(
  p_course_id uuid,
  p_profile_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF (SELECT auth.uid()) IS NULL OR NOT (SELECT private.is_admin()) THEN
    RAISE EXCEPTION 'Administrator access is required';
  END IF;

  DELETE FROM public.course_instructors
  WHERE course_id = p_course_id AND instructor_id = p_profile_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_remove_course_instructor(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_remove_course_instructor(uuid, uuid) TO authenticated;

-- Create or edit a lesson and its private answer key as one admin-only operation.
-- Historical attempts and completed snapshots remain unchanged when lesson content changes.
CREATE OR REPLACE FUNCTION public.admin_save_lesson(
  p_session_id integer,
  p_module_id integer,
  p_session_number integer,
  p_title text,
  p_analogy text,
  p_content_markdown text,
  p_starter_code text,
  p_hints jsonb,
  p_xp_reward integer,
  p_duration_minutes smallint,
  p_question text,
  p_options jsonb,
  p_correct_option smallint,
  p_explanation text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_session_id integer;
BEGIN
  IF (SELECT auth.uid()) IS NULL OR NOT (SELECT private.is_admin()) THEN
    RAISE EXCEPTION 'Administrator access is required';
  END IF;

  IF p_module_id IS NULL OR p_session_number IS NULL OR p_session_number NOT BETWEEN 1 AND 20
     OR p_title IS NULL OR NULLIF(BTRIM(p_title), '') IS NULL OR length(p_title) > 160
     OR p_analogy IS NULL OR NULLIF(BTRIM(p_analogy), '') IS NULL OR length(p_analogy) > 2000
     OR p_content_markdown IS NULL OR NULLIF(BTRIM(p_content_markdown), '') IS NULL OR length(p_content_markdown) > 30000
     OR length(COALESCE(p_starter_code, '')) > 30000
     OR p_xp_reward IS NULL OR p_xp_reward NOT BETWEEN 0 AND 1000
     OR p_duration_minutes IS NULL OR p_duration_minutes NOT BETWEEN 5 AND 60
     OR p_question IS NULL OR NULLIF(BTRIM(p_question), '') IS NULL OR length(p_question) > 1000
     OR p_options IS NULL OR jsonb_typeof(p_options) <> 'array'
     OR jsonb_array_length(CASE WHEN jsonb_typeof(p_options) = 'array' THEN p_options ELSE '[]'::jsonb END) NOT BETWEEN 2 AND 6
     OR p_correct_option IS NULL OR p_correct_option < 0
     OR p_correct_option >= jsonb_array_length(CASE WHEN jsonb_typeof(p_options) = 'array' THEN p_options ELSE '[]'::jsonb END)
     OR EXISTS (
       SELECT 1
       FROM jsonb_array_elements_text(CASE WHEN jsonb_typeof(p_options) = 'array' THEN p_options ELSE '[]'::jsonb END) AS options(option_value)
       WHERE BTRIM(options.option_value) = ''
     )
     OR p_explanation IS NULL OR NULLIF(BTRIM(p_explanation), '') IS NULL OR length(p_explanation) > 2000
     OR (p_hints IS NOT NULL AND jsonb_typeof(p_hints) <> 'array') THEN
    RAISE EXCEPTION 'Check the lesson fields and quick-check answers';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.modules WHERE id = p_module_id) THEN
    RAISE EXCEPTION 'Week not found';
  END IF;

  IF p_session_id IS NULL THEN
    INSERT INTO public.sessions
      (module_id, session_number, title, analogy_physical, content_markdown,
       starter_code, hints, xp_reward, order_index, duration_minutes, quick_check)
    VALUES
      (p_module_id, p_session_number, BTRIM(p_title), BTRIM(p_analogy), p_content_markdown,
       COALESCE(p_starter_code, ''), COALESCE(p_hints, '[]'::jsonb), p_xp_reward,
       p_session_number, p_duration_minutes,
       jsonb_build_object('question', BTRIM(p_question), 'options', p_options))
    RETURNING id INTO v_session_id;
  ELSE
    UPDATE public.sessions
    SET session_number = p_session_number,
        title = BTRIM(p_title),
        analogy_physical = BTRIM(p_analogy),
        content_markdown = p_content_markdown,
        starter_code = COALESCE(p_starter_code, ''),
        hints = COALESCE(p_hints, '[]'::jsonb),
        xp_reward = p_xp_reward,
        order_index = p_session_number,
        duration_minutes = p_duration_minutes,
        quick_check = jsonb_build_object('question', BTRIM(p_question), 'options', p_options)
    WHERE id = p_session_id AND module_id = p_module_id
    RETURNING id INTO v_session_id;

    IF v_session_id IS NULL THEN
      RAISE EXCEPTION 'Lesson not found in this week';
    END IF;
  END IF;

  INSERT INTO private.session_quick_check_answers (session_id, correct_option, explanation)
  VALUES (v_session_id, p_correct_option, BTRIM(p_explanation))
  ON CONFLICT (session_id) DO UPDATE
  SET correct_option = EXCLUDED.correct_option,
      explanation = EXCLUDED.explanation;

  RETURN v_session_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_save_lesson(integer, integer, integer, text, text, text, text, jsonb, integer, smallint, text, jsonb, smallint, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_save_lesson(integer, integer, integer, text, text, text, text, jsonb, integer, smallint, text, jsonb, smallint, text) TO authenticated;

-- Administrators can view the answer key while editing a lesson; learners cannot call this.
CREATE OR REPLACE FUNCTION public.admin_get_lesson_key(p_session_id integer)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v_key jsonb;
BEGIN
  IF (SELECT auth.uid()) IS NULL OR NOT (SELECT private.is_admin()) THEN
    RAISE EXCEPTION 'Administrator access is required';
  END IF;

  SELECT jsonb_build_object('correct_option', correct_option, 'explanation', explanation)
  INTO v_key
  FROM private.session_quick_check_answers
  WHERE session_id = p_session_id;

  IF v_key IS NULL THEN RAISE EXCEPTION 'Quick-check answer key not found'; END IF;
  RETURN v_key;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_lesson_key(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_lesson_key(integer) TO authenticated;

-- A paused or archived course must not leak its weeks to learners. Admins and assigned
-- instructors can still see and manage content while a course is being prepared.
DROP POLICY IF EXISTS "Learners read entitled published modules" ON public.modules;
CREATE POLICY "Learners read entitled published modules"
  ON public.modules FOR SELECT TO authenticated
  USING (
    (
      status = 'published'
      AND EXISTS (
        SELECT 1 FROM public.courses c
        WHERE c.id = modules.course_id AND c.status = 'published'
      )
      AND (
        EXISTS (
          SELECT 1 FROM public.course_enrollments e
          WHERE e.course_id = modules.course_id AND e.student_id = (SELECT auth.uid())
            AND e.status = 'active' AND is_free
            AND e.started_at > now() - interval '30 days'
        )
        OR EXISTS (
          SELECT 1 FROM public.course_enrollments e
          WHERE e.course_id = modules.course_id AND e.student_id = (SELECT auth.uid())
            AND e.status = 'active'
            AND (e.plan IN ('paid_full', 'scholarship') OR (e.plan = 'paid_monthly' AND e.paid_through > now()))
        )
      )
    )
    OR (SELECT private.is_admin())
    OR (SELECT private.is_course_instructor(course_id))
  );
