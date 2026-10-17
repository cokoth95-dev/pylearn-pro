-- The options in migration 030 were rotated, but the private answer key rows
-- retained their pre-rotation indexes. Apply the same rotation to the key.
UPDATE private.session_quick_check_question_answers AS answer
SET correct_option = (
  (answer.correct_option
    - ((module.order_index + session.session_number + answer.question_number - 1) % 3)
    + 3) % 3
)::smallint
FROM public.sessions AS session
JOIN public.modules AS module ON module.id = session.module_id
JOIN public.courses AS course ON course.id = module.course_id
WHERE answer.session_id = session.id
  AND course.slug = 'python-foundations'
  AND answer.question_number BETWEEN 2 AND 4;
