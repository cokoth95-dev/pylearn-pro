-- Group the ten Python Foundations course weeks into four-week months.
-- Global order_index remains 1..10; month/week labels are derived from it.
WITH numbered_modules AS (
  SELECT
    m.id,
    ((m.order_index - 1) / 4) + 1 AS month_number,
    ((m.order_index - 1) % 4) + 1 AS week_number
  FROM public.modules AS m
  JOIN public.courses AS c ON c.id = m.course_id
  WHERE c.slug = 'python-foundations'
    AND m.order_index BETWEEN 1 AND 10
)
UPDATE public.modules AS m
SET month_number = numbered_modules.month_number,
    tagline = format(
      'Week %s | %s sessions',
      numbered_modules.week_number,
      COALESCE((
        SELECT max(s.session_number)
        FROM public.sessions AS s
        WHERE s.module_id = m.id
      ), 5)
    )
FROM numbered_modules
WHERE numbered_modules.id = m.id;
