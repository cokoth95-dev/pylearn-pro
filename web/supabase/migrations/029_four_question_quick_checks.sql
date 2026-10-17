-- Expand lesson checks from one question to a four-question sequence.
-- Old attempts remain question 1; already completed lessons stay completed.
CREATE TABLE private.session_quick_check_question_answers (
  session_id integer NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  question_number smallint NOT NULL CHECK (question_number BETWEEN 1 AND 4),
  correct_option smallint NOT NULL CHECK (correct_option BETWEEN 0 AND 5),
  explanation text NOT NULL CHECK (length(explanation) BETWEEN 1 AND 2000),
  PRIMARY KEY (session_id, question_number)
);
REVOKE ALL ON private.session_quick_check_question_answers FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON private.session_quick_check_question_answers TO service_role;

INSERT INTO private.session_quick_check_question_answers(session_id,question_number,correct_option,explanation)
SELECT session_id,1,correct_option,explanation FROM private.session_quick_check_answers;

-- Keep existing admin and instructor lesson editors compatible: edits to the
-- original single-question fields replace question 1 and preserve questions 2-4.
CREATE OR REPLACE FUNCTION private.preserve_extra_quick_check_questions()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE v_extra jsonb;
BEGIN
  IF jsonb_typeof(OLD.quick_check->'questions') = 'array'
     AND jsonb_typeof(NEW.quick_check->'questions') IS DISTINCT FROM 'array' THEN
    SELECT COALESCE(jsonb_agg(item ORDER BY ordinal), '[]'::jsonb)
    INTO v_extra
    FROM jsonb_array_elements(OLD.quick_check->'questions') WITH ORDINALITY AS old_question(item, ordinal)
    WHERE ordinal > 1;
    NEW.quick_check := jsonb_set(NEW.quick_check,'{questions}',
      jsonb_build_array(jsonb_build_object('question',NEW.quick_check->>'question','options',NEW.quick_check->'options')) || v_extra,true);
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION private.preserve_extra_quick_check_questions() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS preserve_extra_quick_check_questions ON public.sessions;
CREATE TRIGGER preserve_extra_quick_check_questions
BEFORE UPDATE OF quick_check ON public.sessions
FOR EACH ROW EXECUTE FUNCTION private.preserve_extra_quick_check_questions();

CREATE OR REPLACE FUNCTION private.sync_legacy_quick_check_answer()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO private.session_quick_check_question_answers(session_id,question_number,correct_option,explanation)
  VALUES(NEW.session_id,1,NEW.correct_option,NEW.explanation)
  ON CONFLICT(session_id,question_number) DO UPDATE
  SET correct_option=EXCLUDED.correct_option, explanation=EXCLUDED.explanation;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION private.sync_legacy_quick_check_answer() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS sync_legacy_quick_check_answer ON private.session_quick_check_answers;
CREATE TRIGGER sync_legacy_quick_check_answer
AFTER INSERT OR UPDATE ON private.session_quick_check_answers
FOR EACH ROW EXECUTE FUNCTION private.sync_legacy_quick_check_answer();

ALTER TABLE public.session_quick_check_attempts
  ADD COLUMN question_number smallint NOT NULL DEFAULT 1 CHECK (question_number BETWEEN 1 AND 4);

CREATE OR REPLACE FUNCTION public.submit_session_quick_check(
  p_session_id integer,
  p_question_number smallint,
  p_selected_option smallint
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_student_id uuid := (SELECT auth.uid());
  v_correct_option smallint;
  v_option_count integer;
  v_question_count integer;
  v_explanation text;
  v_xp_reward integer;
  v_content_snapshot jsonb;
  v_is_correct boolean;
  v_completed_now boolean := false;
  v_correct_count integer;
BEGIN
  IF v_student_id IS NULL OR p_session_id IS NULL OR p_question_number IS NULL
     OR p_question_number NOT BETWEEN 1 AND 4 OR p_selected_option IS NULL OR p_selected_option < 0 THEN
    RAISE EXCEPTION 'A signed-in learner and valid question and answer are required';
  END IF;

  SELECT answer.correct_option,
         COALESCE(
           jsonb_array_length((s.quick_check->'questions'->(p_question_number - 1))->'options'),
           CASE WHEN p_question_number=1 THEN jsonb_array_length(s.quick_check->'options') END
         ),
         COALESCE(jsonb_array_length(s.quick_check->'questions'),1),
         answer.explanation,
         s.xp_reward,
         jsonb_build_object(
           'captured_at', now(),
           'module', jsonb_build_object('id', m.id, 'title', m.title, 'month_number', m.month_number),
           'session', jsonb_build_object('id', s.id, 'session_number', s.session_number, 'title', s.title,
             'analogy_physical', s.analogy_physical, 'content_markdown', s.content_markdown,
             'starter_code', s.starter_code, 'hints', s.hints,
             'duration_minutes', s.duration_minutes, 'quick_check', s.quick_check)
         )
  INTO v_correct_option, v_option_count, v_question_count, v_explanation, v_xp_reward, v_content_snapshot
  FROM public.sessions s
  JOIN public.modules m ON m.id = s.module_id
  JOIN private.session_quick_check_question_answers answer
    ON answer.session_id = s.id AND answer.question_number = p_question_number
  WHERE s.id = p_session_id AND m.status = 'published'
    AND (
      jsonb_typeof(s.quick_check->'questions') = 'array'
      OR (p_question_number = 1 AND jsonb_typeof(s.quick_check->'options') = 'array')
    )
    AND (SELECT private.is_admin() OR private.is_course_instructor(m.course_id)
      OR EXISTS (SELECT 1 FROM public.course_enrollments e WHERE e.course_id=m.course_id AND e.student_id=v_student_id AND e.status='active' AND e.plan IN ('paid_full','scholarship'))
      OR EXISTS (SELECT 1 FROM public.course_enrollments e WHERE e.course_id=m.course_id AND e.student_id=v_student_id AND e.status='active' AND e.plan='free_month1' AND m.is_free AND e.started_at>now()-interval '30 days')
      OR EXISTS (SELECT 1 FROM public.course_month_entitlements e WHERE e.course_id=m.course_id AND e.student_id=v_student_id AND e.month_number=m.month_number AND e.starts_at<=now() AND e.expires_at>now()));

  IF v_correct_option IS NULL THEN RAISE EXCEPTION 'This quick-check question is unavailable to your account'; END IF;
  IF v_question_count NOT BETWEEN 1 AND 4 OR p_question_number > v_question_count THEN RAISE EXCEPTION 'This quick-check question is unavailable'; END IF;
  IF NOT (SELECT private.is_admin())
     AND NOT (SELECT private.is_course_instructor((SELECT m.course_id FROM public.sessions s JOIN public.modules m ON m.id=s.module_id WHERE s.id=p_session_id)))
     AND EXISTS (
       SELECT 1 FROM public.sessions earlier
       JOIN public.sessions current_session ON current_session.module_id=earlier.module_id
       WHERE current_session.id=p_session_id AND earlier.session_number<current_session.session_number
         AND NOT EXISTS (SELECT 1 FROM public.user_progress progress WHERE progress.student_id=v_student_id AND progress.session_id=earlier.id AND progress.completed)
     ) THEN RAISE EXCEPTION 'Complete the earlier lessons in this week first'; END IF;
  IF p_selected_option >= v_option_count THEN RAISE EXCEPTION 'Selected answer is outside the available options'; END IF;

  v_is_correct := p_selected_option = v_correct_option;
  INSERT INTO public.session_quick_check_attempts(student_id,session_id,question_number,selected_option,correct,content_snapshot)
  VALUES(v_student_id,p_session_id,p_question_number,p_selected_option,v_is_correct,v_content_snapshot);

  IF v_is_correct THEN
    SELECT count(DISTINCT question_number) INTO v_correct_count
    FROM public.session_quick_check_attempts
    WHERE student_id=v_student_id AND session_id=p_session_id AND correct;
    IF v_correct_count = v_question_count THEN
      INSERT INTO public.user_progress(student_id,session_id,completed,last_accessed)
      VALUES(v_student_id,p_session_id,false,now()) ON CONFLICT(student_id,session_id) DO NOTHING;
      UPDATE public.user_progress SET completed=true,completed_at=now(),last_accessed=now(),completed_content_snapshot=v_content_snapshot
      WHERE student_id=v_student_id AND session_id=p_session_id AND completed=false;
      v_completed_now := FOUND;
      IF v_completed_now THEN UPDATE public.profiles SET xp=xp+COALESCE(v_xp_reward,0),updated_at=now() WHERE id=v_student_id AND role='student'; END IF;
    END IF;
  END IF;
  RETURN jsonb_build_object('correct',v_is_correct,'explanation',v_explanation,
    'session_completed_now',v_completed_now,'xp_awarded',CASE WHEN v_completed_now THEN COALESCE(v_xp_reward,0) ELSE 0 END);
END; $$;

REVOKE ALL ON FUNCTION public.submit_session_quick_check(integer,smallint) FROM PUBLIC, anon, authenticated;
DROP FUNCTION public.submit_session_quick_check(integer,smallint);
REVOKE ALL ON FUNCTION public.submit_session_quick_check(integer,smallint,smallint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_session_quick_check(integer,smallint,smallint) TO authenticated;
