-- Trusted grading data is retrieved and written only by the server-side service role.
ALTER TABLE public.assignments
  ADD COLUMN is_required boolean NOT NULL DEFAULT true;

-- Preserve the learner-visible lesson and assignment content used for each attempt
-- and completion, even if an administrator edits the course later.
ALTER TABLE public.submissions
  ADD COLUMN content_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.user_progress
  ADD COLUMN completed_content_snapshot jsonb;

UPDATE public.submissions sub
SET content_snapshot = jsonb_build_object(
  'captured_at', sub.submitted_at,
  'module', jsonb_build_object('id', m.id, 'title', m.title, 'month_number', m.month_number),
  'session', jsonb_build_object(
    'id', s.id, 'title', s.title, 'analogy_physical', s.analogy_physical,
    'content_markdown', s.content_markdown, 'starter_code', s.starter_code,
    'hints', s.hints, 'xp_reward', s.xp_reward, 'order_index', s.order_index
  ),
  'assignment', jsonb_build_object(
    'id', a.id, 'title', a.title, 'instructions_markdown', a.instructions_markdown,
    'starter_code', a.starter_code, 'public_test_cases', COALESCE(a.test_cases, '[]'::jsonb),
    'max_score', a.max_score, 'is_required', a.is_required
  )
)
FROM public.assignments a
JOIN public.sessions s ON s.id = a.session_id
JOIN public.modules m ON m.id = s.module_id
WHERE sub.assignment_id = a.id;

UPDATE public.user_progress up
SET completed_content_snapshot = jsonb_build_object(
  'captured_at', up.last_accessed,
  'session', jsonb_build_object(
    'id', s.id, 'title', s.title, 'analogy_physical', s.analogy_physical,
    'content_markdown', s.content_markdown, 'starter_code', s.starter_code,
    'hints', s.hints, 'xp_reward', s.xp_reward, 'order_index', s.order_index
  ),
  'required_assignments', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                              'id', a.id, 'title', a.title,
                              'instructions_markdown', a.instructions_markdown,
                              'starter_code', a.starter_code,
                              'public_test_cases', COALESCE(a.test_cases, '[]'::jsonb),
                              'max_score', a.max_score, 'is_required', a.is_required
                            ) ORDER BY a.id), '[]'::jsonb)
                           FROM public.assignments a
                           WHERE a.session_id = s.id AND a.is_required)
)
FROM public.sessions s
WHERE up.session_id = s.id AND up.completed;

CREATE OR REPLACE FUNCTION public.get_assignment_grading_data(p_assignment_id integer)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'assignment_id', a.id,
    'session_id', s.id,
    'title', a.title,
    'instructions', a.instructions_markdown,
    'max_score', a.max_score,
    'is_required', a.is_required,
    'public_tests', COALESCE(a.test_cases, '[]'::jsonb),
    'hidden_tests', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object('input', h.input, 'expected', h.expected, 'description', h.description)
        ORDER BY h.test_order
      )
      FROM private.assignment_hidden_test_cases h
      WHERE h.assignment_id = a.id
    ), '[]'::jsonb)
  )
  FROM public.assignments a
  JOIN public.sessions s ON s.id = a.session_id
  WHERE a.id = p_assignment_id;
$$;

REVOKE ALL ON FUNCTION public.get_assignment_grading_data(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_assignment_grading_data(integer) TO service_role;

CREATE TABLE private.assignment_grading_rate_windows (
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  minute_bucket timestamptz NOT NULL,
  request_count integer NOT NULL CHECK (request_count > 0),
  PRIMARY KEY (student_id, minute_bucket)
);
REVOKE ALL ON private.assignment_grading_rate_windows FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON private.assignment_grading_rate_windows TO service_role;

CREATE OR REPLACE FUNCTION public.consume_assignment_grading_slot(p_student_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_bucket timestamptz := date_trunc('minute', now());
  v_count integer;
BEGIN
  DELETE FROM private.assignment_grading_rate_windows
  WHERE minute_bucket < v_bucket - interval '1 hour';

  INSERT INTO private.assignment_grading_rate_windows (student_id, minute_bucket, request_count)
  VALUES (p_student_id, v_bucket, 1)
  ON CONFLICT (student_id, minute_bucket)
  DO UPDATE SET request_count = private.assignment_grading_rate_windows.request_count + 1
  RETURNING request_count INTO v_count;

  RETURN v_count <= 8;
END;
$$;
REVOKE ALL ON FUNCTION public.consume_assignment_grading_slot(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_assignment_grading_slot(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.record_assignment_submission(
  p_student_id uuid,
  p_assignment_id integer,
  p_submitted_code text,
  p_tests_passed integer,
  p_total_tests integer,
  p_score integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_session_id integer;
  v_xp_reward integer;
  v_submission_id uuid;
  v_passed boolean;
  v_is_required boolean;
  v_completed_now boolean := false;
  v_expected_total integer;
  v_content_snapshot jsonb;
BEGIN
  IF p_student_id IS NULL OR p_assignment_id IS NULL OR p_submitted_code IS NULL
     OR p_total_tests IS NULL OR p_tests_passed IS NULL OR p_score IS NULL
     OR p_total_tests < 1 OR p_tests_passed < 0 OR p_tests_passed > p_total_tests
     OR p_score < 0 OR p_score > 100 OR length(p_submitted_code) > 20000
     OR p_score <> floor((p_tests_passed::numeric / p_total_tests) * 100)::integer THEN
    RAISE EXCEPTION 'Invalid grading values';
  END IF;

  SELECT s.id, s.xp_reward, a.is_required,
         jsonb_array_length(COALESCE(a.test_cases, '[]'::jsonb)) + (
           SELECT count(*)::integer FROM private.assignment_hidden_test_cases h WHERE h.assignment_id = a.id
         ),
         jsonb_build_object(
           'captured_at', now(),
           'module', jsonb_build_object('id', m.id, 'title', m.title, 'month_number', m.month_number),
           'session', jsonb_build_object(
             'id', s.id, 'title', s.title, 'analogy_physical', s.analogy_physical,
             'content_markdown', s.content_markdown, 'starter_code', s.starter_code,
             'hints', s.hints, 'xp_reward', s.xp_reward, 'order_index', s.order_index
           ),
           'assignment', jsonb_build_object(
             'id', a.id, 'title', a.title, 'instructions_markdown', a.instructions_markdown,
             'starter_code', a.starter_code, 'public_test_cases', COALESCE(a.test_cases, '[]'::jsonb),
             'max_score', a.max_score, 'is_required', a.is_required
           )
         )
    INTO v_session_id, v_xp_reward, v_is_required, v_expected_total, v_content_snapshot
  FROM public.assignments a
  JOIN public.sessions s ON s.id = a.session_id
  JOIN public.modules m ON m.id = s.module_id
  WHERE a.id = p_assignment_id;

  IF v_session_id IS NULL THEN
    RAISE EXCEPTION 'Assignment not found';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = p_student_id AND p.role = 'student') THEN
    RAISE EXCEPTION 'Learner profile not found';
  END IF;
  IF p_total_tests <> v_expected_total THEN
    RAISE EXCEPTION 'Test total does not match assignment';
  END IF;

  v_passed := p_score >= 80;

  INSERT INTO public.submissions
    (student_id, assignment_id, submitted_code, tests_passed, total_tests, score, passed, status, content_snapshot)
  VALUES
    (p_student_id, p_assignment_id, p_submitted_code, p_tests_passed, p_total_tests, p_score, v_passed, 'graded', v_content_snapshot)
  RETURNING id INTO v_submission_id;

  IF v_passed AND v_is_required THEN
    INSERT INTO public.user_progress (student_id, session_id, completed, last_accessed)
    VALUES (p_student_id, v_session_id, false, now())
    ON CONFLICT (student_id, session_id) DO NOTHING;

    UPDATE public.user_progress up
    SET completed = true,
        last_accessed = now(),
        completed_content_snapshot = jsonb_build_object(
          'captured_at', now(),
          'module', (SELECT jsonb_build_object('id', m.id, 'title', m.title, 'month_number', m.month_number)
                     FROM public.modules m JOIN public.sessions s ON s.module_id = m.id WHERE s.id = v_session_id),
          'session', (SELECT jsonb_build_object(
                        'id', s.id, 'title', s.title, 'analogy_physical', s.analogy_physical,
                        'content_markdown', s.content_markdown, 'starter_code', s.starter_code,
                        'hints', s.hints, 'xp_reward', s.xp_reward, 'order_index', s.order_index
                      ) FROM public.sessions s WHERE s.id = v_session_id),
          'required_assignments', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                                      'id', a.id, 'title', a.title,
                                      'instructions_markdown', a.instructions_markdown,
                                      'starter_code', a.starter_code,
                                      'public_test_cases', COALESCE(a.test_cases, '[]'::jsonb),
                                      'max_score', a.max_score, 'is_required', a.is_required
                                    ) ORDER BY a.id), '[]'::jsonb)
                                   FROM public.assignments a JOIN public.sessions s ON s.id = a.session_id
                                   WHERE s.id = v_session_id AND a.is_required)
        )
    WHERE up.student_id = p_student_id
      AND up.session_id = v_session_id
      AND up.completed = false
      AND NOT EXISTS (
        SELECT 1
        FROM public.assignments required_assignment
        WHERE required_assignment.session_id = v_session_id
          AND required_assignment.is_required
          AND NOT EXISTS (
            SELECT 1 FROM public.submissions passing_attempt
            WHERE passing_attempt.student_id = p_student_id
              AND passing_attempt.assignment_id = required_assignment.id
              AND passing_attempt.passed
              AND passing_attempt.score >= 80
          )
      );

    v_completed_now := FOUND;
    IF v_completed_now THEN
      UPDATE public.profiles
      SET xp = xp + COALESCE(v_xp_reward, 0), updated_at = now()
      WHERE id = p_student_id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'submission_id', v_submission_id,
    'passed', v_passed,
    'session_completed_now', v_completed_now,
    'xp_awarded', CASE WHEN v_completed_now THEN COALESCE(v_xp_reward, 0) ELSE 0 END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_assignment_submission(uuid, integer, text, integer, integer, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_assignment_submission(uuid, integer, text, integer, integer, integer)
  TO service_role;
