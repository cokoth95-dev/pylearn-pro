-- Assign a learner's primary instructor within a course and expose safe progress summaries.
CREATE TABLE public.student_instructors (
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  instructor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id),
  PRIMARY KEY (course_id, student_id)
);

ALTER TABLE public.student_instructors ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.student_instructors FROM anon, authenticated;
GRANT SELECT ON public.student_instructors TO authenticated;
CREATE POLICY "Admins and assigned instructors see learner instructor links"
  ON public.student_instructors FOR SELECT TO authenticated
  USING ((SELECT private.is_admin()) OR instructor_id = (SELECT auth.uid()));

CREATE OR REPLACE FUNCTION public.admin_assign_student_instructor(
  p_course_id uuid, p_student_id uuid, p_instructor_id uuid
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT (SELECT private.is_admin()) THEN RAISE EXCEPTION 'Administrator access required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.course_enrollments e WHERE e.course_id=p_course_id AND e.student_id=p_student_id AND e.status='active') THEN
    RAISE EXCEPTION 'The learner must have active access to this course';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.course_instructors ci WHERE ci.course_id=p_course_id AND ci.instructor_id=p_instructor_id) THEN
    RAISE EXCEPTION 'Assign this instructor to the course first';
  END IF;
  INSERT INTO public.student_instructors(course_id,student_id,instructor_id,assigned_by)
  VALUES(p_course_id,p_student_id,p_instructor_id,(SELECT auth.uid()))
  ON CONFLICT(course_id,student_id) DO UPDATE SET instructor_id=EXCLUDED.instructor_id, assigned_at=now(), assigned_by=(SELECT auth.uid());
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_remove_student_instructor(p_course_id uuid,p_student_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT (SELECT private.is_admin()) THEN RAISE EXCEPTION 'Administrator access required'; END IF;
  DELETE FROM public.student_instructors WHERE course_id=p_course_id AND student_id=p_student_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_assign_student_instructor(uuid,uuid,uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.admin_remove_student_instructor(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_assign_student_instructor(uuid,uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_remove_student_instructor(uuid,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.instructor_course_learner_overview(p_course_id uuid)
RETURNS TABLE(
  student_id uuid, full_name text, assigned_instructor_id uuid,
  available_lessons bigint, completed_lessons bigint,
  quiz_attempts bigint, correct_attempts bigint, last_active timestamptz,
  session_details jsonb
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT (SELECT private.is_course_instructor(p_course_id)) AND NOT (SELECT private.is_admin()) THEN
    RAISE EXCEPTION 'You are not assigned to this course';
  END IF;
  RETURN QUERY
  WITH eligible_lessons AS (
    SELECT e.student_id,s.id AS session_id
    FROM public.course_enrollments e
    JOIN public.modules m ON m.course_id=e.course_id AND m.status='published'
    JOIN public.sessions s ON s.module_id=m.id
    WHERE e.course_id=p_course_id AND e.status='active'
      AND (
        e.plan IN ('paid_full','scholarship')
        OR (e.plan='free_month1' AND m.is_free AND e.started_at > now()-interval '30 days')
        OR EXISTS (
          SELECT 1 FROM public.payment_requests pr
          WHERE pr.course_id=e.course_id AND pr.student_id=e.student_id
            AND pr.purchase_type='monthly' AND pr.target_month=m.month_number AND pr.status='confirmed'
        )
      )
  ), lesson_totals AS (
    SELECT el.student_id,count(*) AS total,
      count(*) FILTER (WHERE up.completed) AS completed,
      max(up.last_accessed) AS last_progress
    FROM eligible_lessons el
    LEFT JOIN public.user_progress up ON up.student_id=el.student_id AND up.session_id=el.session_id
    GROUP BY el.student_id
  ), quiz_totals AS (
    SELECT el.student_id,count(qa.id) AS attempts,
      count(qa.id) FILTER (WHERE qa.correct) AS correct,
      max(qa.attempted_at) AS last_quiz
    FROM eligible_lessons el
    LEFT JOIN public.session_quick_check_attempts qa ON qa.student_id=el.student_id AND qa.session_id=el.session_id
    GROUP BY el.student_id
  ), session_results AS (
    SELECT per_lesson.student_id,jsonb_agg(jsonb_build_object(
      'session_id',per_lesson.session_id,'title',per_lesson.title,'module_title',per_lesson.module_title,
      'completed',per_lesson.completed,'quiz_attempts',per_lesson.attempts,'correct_attempts',per_lesson.correct
    ) ORDER BY per_lesson.module_order,per_lesson.session_number) AS details
    FROM (
      SELECT el.student_id,s.id AS session_id,s.title,m.title AS module_title,m.order_index AS module_order,s.session_number,
        COALESCE(up.completed,false) AS completed,count(qa.id) AS attempts,count(qa.id) FILTER (WHERE qa.correct) AS correct
      FROM eligible_lessons el
      JOIN public.sessions s ON s.id=el.session_id
      JOIN public.modules m ON m.id=s.module_id
      LEFT JOIN public.user_progress up ON up.student_id=el.student_id AND up.session_id=el.session_id
      LEFT JOIN public.session_quick_check_attempts qa ON qa.student_id=el.student_id AND qa.session_id=el.session_id
      GROUP BY el.student_id,s.id,m.id,up.completed
    ) per_lesson
    GROUP BY per_lesson.student_id
  )
  SELECT e.student_id, COALESCE(p.full_name,'Learner'), si.instructor_id,
    COALESCE(lt.total,0), COALESCE(lt.completed,0), COALESCE(qt.attempts,0), COALESCE(qt.correct,0),
    GREATEST(lt.last_progress,qt.last_quiz),sr.details
  FROM public.course_enrollments e
  JOIN public.profiles p ON p.id=e.student_id
  LEFT JOIN public.student_instructors si ON si.course_id=e.course_id AND si.student_id=e.student_id
  LEFT JOIN lesson_totals lt ON lt.student_id=e.student_id
  LEFT JOIN quiz_totals qt ON qt.student_id=e.student_id
  LEFT JOIN session_results sr ON sr.student_id=e.student_id
  WHERE e.course_id=p_course_id AND e.status='active'
    AND ((SELECT private.is_admin()) OR si.instructor_id=(SELECT auth.uid()))
  ORDER BY p.full_name;
END;
$$;

REVOKE ALL ON FUNCTION public.instructor_course_learner_overview(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.instructor_course_learner_overview(uuid) TO authenticated;
