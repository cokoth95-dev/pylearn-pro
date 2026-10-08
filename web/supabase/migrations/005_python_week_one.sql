-- Week 1 of Python Foundations: five beginner lessons with private answer keys.
-- Content is newly written from the concepts found in the supplied source folder.

ALTER TABLE public.sessions
  ADD COLUMN duration_minutes smallint NOT NULL DEFAULT 15
    CHECK (duration_minutes BETWEEN 5 AND 60),
  ADD COLUMN quick_check jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.user_progress
  ADD COLUMN completed_at timestamptz;

CREATE UNIQUE INDEX modules_course_month_order_uidx
  ON public.modules(course_id, month_number, order_index);
CREATE UNIQUE INDEX sessions_module_number_uidx
  ON public.sessions(module_id, session_number);

CREATE TABLE private.session_quick_check_answers (
  session_id integer PRIMARY KEY REFERENCES public.sessions(id) ON DELETE CASCADE,
  correct_option smallint NOT NULL CHECK (correct_option >= 0),
  explanation text NOT NULL
);
REVOKE ALL ON private.session_quick_check_answers FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON private.session_quick_check_answers TO service_role;

CREATE TABLE public.session_quick_check_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_id integer NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  selected_option smallint NOT NULL CHECK (selected_option >= 0),
  correct boolean NOT NULL,
  content_snapshot jsonb NOT NULL,
  attempted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX session_quick_check_attempts_student_session_idx
  ON public.session_quick_check_attempts(student_id, session_id, attempted_at DESC);
ALTER TABLE public.session_quick_check_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.session_quick_check_attempts FROM anon, authenticated;
GRANT SELECT ON public.session_quick_check_attempts TO authenticated;
CREATE POLICY "Learners and course staff read quick-check attempts"
  ON public.session_quick_check_attempts FOR SELECT TO authenticated
  USING (
    student_id = (SELECT auth.uid())
    OR (SELECT private.is_admin())
    OR EXISTS (
      SELECT 1 FROM public.sessions s
      JOIN public.modules m ON m.id = s.module_id
      WHERE s.id = session_quick_check_attempts.session_id
        AND (SELECT private.is_course_instructor(m.course_id))
    )
  );

DO $$
DECLARE
  v_course_id uuid;
  v_module_id integer;
BEGIN
  SELECT id INTO v_course_id
  FROM public.courses
  WHERE slug = 'python-foundations';

  IF v_course_id IS NULL THEN
    RAISE EXCEPTION 'Python Foundations course must exist before Week 1 is added';
  END IF;

  INSERT INTO public.modules
    (course_id, month_number, title, tagline, description, capstone_title,
     is_free, order_index, status)
  VALUES
    (v_course_id, 1, 'Foundations & Pure Logic', 'Week 1 • Sessions 1–5',
     'Learn to give Python clear instructions, work with text and whole numbers, and build a small reusable function.',
     'Classroom Supply Counter', true, 1, 'published')
  ON CONFLICT (course_id, month_number, order_index)
  DO UPDATE SET title = EXCLUDED.title,
                tagline = EXCLUDED.tagline,
                description = EXCLUDED.description,
                capstone_title = EXCLUDED.capstone_title,
                is_free = EXCLUDED.is_free,
                status = EXCLUDED.status
  RETURNING id INTO v_module_id;

  WITH lesson_data(session_number, title, analogy, lesson, starter, hints,
                   check_question, check_options, correct_option, explanation) AS (
    VALUES
      (1, 'Meet Python: Programs, Print, and Variables',
       'A program is a short list of classroom instructions. A variable is like a labeled jar: the label is its name, and the value is what the jar holds.',
       $lesson1$## Goal
Run a short program, show a message, and store text in a named variable.

## Plain explanation
Python follows instructions from top to bottom. `print()` shows information on the screen. A variable gives a value a name so your program can use it again.

## Worked example
```python
print("Welcome to Python!")

student_name = "Sam"
print(student_name)
```
The first line shows a message. The next line stores the text `Sam` under the name `student_name`. The last line shows the value stored in that variable.

## Try it with help
Change `Sam` to your name. Add a variable named `favorite_subject` and show its value with `print()`.

## Tiny glossary
- **Program:** instructions a computer follows.
- **Output:** information a program shows.
- **Variable:** a name that holds a value for the program.
- **Value:** the information stored under a name.
- **String (`str`):** text written between quotes.$lesson1$,
       E'# Write your code below\n\n',
       '["Text needs quotes.", "Python reads the file from top to bottom."]'::jsonb,
       'In `class_name = "Blue Room"`, what is the variable name?',
       '["Blue Room", "class_name", "print"]'::jsonb, 1,
       'The variable name is class_name. Blue Room is the value stored in it.'),

      (2, 'Ask a Question and Use the Answer',
       'Input is like asking a visitor to write a name on a classroom sign-in sheet. Your program keeps the answer so it can reply.',
       $lesson2$## Goal
Ask for text with `input()` and use the answer in a message.

## Plain explanation
`input()` waits while someone types. The answer is text, even when it contains digits. An f-string lets Python place a value inside a message. `strip()` removes extra spaces from the start and end of text.

## Worked example
```python
name = input("What is your name? ")
name = name.strip()
print(f"Hello, {name}!")
```

## Try it with help
Ask for a learner's name and favorite subject. Show one friendly sentence with both answers.

## Tiny glossary
- **Input:** information a person gives to a program.
- **F-string:** a message that can include variable values.
- **`strip()`:** a text tool that removes extra spaces at the ends.$lesson2$,
       E'# Ask a question and save the answer\nname = input("What is your name? ")\n\n# Show a friendly reply\n',
       '["input() gives you text.", "Put an f before the opening quote to use {name}."]'::jsonb,
       'What kind of value does input() give your program?',
       '["A whole number every time", "Text", "A function"]'::jsonb, 1,
       'input() gives text. You can convert it to a number when you need to do math.'),

      (3, 'Turn Typed Digits into Numbers',
       'A sign-in sheet stores what a person wrote. Before adding counts, the program must understand those digits as numbers.',
       $lesson3$## Goal
Convert typed digits into a whole number and use arithmetic.

## Plain explanation
`input()` returns text. `int()` changes digit text into a whole number so Python can add or multiply it. A decimal number can be converted with `float()` when a task needs one.

## Worked example
```python
notebooks = int(input("How many notebooks are on the desk? "))
more_notebooks = 3
total = notebooks + more_notebooks
print(f"There are {total} notebooks.")
```

## Try it with help
Ask how many pencils are in a box. Convert the answer with `int()`, add 5, and show the new total.

## Tiny glossary
- **Integer (`int`):** a whole number, such as 4 or 25.
- **Decimal number (`float`):** a number with a part after the dot, such as 2.5.
- **Convert:** change information from one type to another.$lesson3$,
       E'# Ask for a whole number\nitems = input("How many pencils? ")\n\n# Convert the text before doing math\n',
       '["input() starts as text.", "Wrap the answer in int(...) before adding."]'::jsonb,
       'Why use `int(input(...))` before adding a typed count?',
       '["It changes the text digits into a whole number", "It prints the answer twice", "It makes a new question"]'::jsonb, 0,
       'int() converts the typed digit text into a whole number that Python can add.'),

      (4, 'Create a Reusable Function',
       'A function is like a classroom routine you can use again. The routine stays the same, while the name you give it can change.',
       $lesson4$## Goal
Define a function, give it a parameter, and call it with an argument.

## Plain explanation
`def` begins a function. A parameter is the named input space in the function. An argument is the value you give that space when you call the function. Indented lines belong to the function.

## Worked example
```python
def welcome(name):
    print(f"Welcome to class, {name}!")

welcome("Mina")
welcome("Ali")
```
`name` is the parameter. `"Mina"` and `"Ali"` are arguments. Each call runs the function once.

## Try it with help
Write a function named `show_subject` with a parameter named `subject`. Call it with two different subjects.

## Tiny glossary
- **Function:** named instructions you can use when needed.
- **Define:** describe what the function should do.
- **Call:** ask the function to run.
- **Parameter:** a named input space in a function definition.
- **Argument:** the value given to a parameter.$lesson4$,
       E'# Write a function named show_subject\n\n\n# Call your function with a subject\n',
       '["Start the function with def.", "Remember the colon and indent the function body."]'::jsonb,
       'In `welcome("Mina")`, what is Mina?',
       '["The function name", "The argument passed to name", "The keyword def"]'::jsonb, 1,
       'Mina is the argument. The function passes it into the name parameter.'),

      (5, 'Return a Result: Classroom Supply Counter',
       'print() is like announcing a total to the class. return is like writing the total on a note and handing it back so another step can use it.',
       $lesson5$## Goal
Use `return` to send a value back from a function, then combine the week's ideas in a small project.

## Plain explanation
`print()` shows information. `return` sends a value back to the code that called the function. The program can save that value, use it in a calculation, or print it later.

## Worked example
```python
def count_supplies(notebooks, pencils):
    return notebooks + pencils

total_items = count_supplies(12, 8)
print(f"The class has {total_items} supplies.")
```

## Week project: Classroom Supply Counter
Ask how many notebooks and pencils are needed. Convert both answers to whole numbers. Write `count_supplies` to return the total. Show a clear sentence with the result.

## Tiny glossary
- **Return:** send a value back from a function so the program can use it.
- **Reuse:** use the same function or value again instead of starting over.

## Reflection
Which part felt easiest? Which word or code line would you like explained again?$lesson5$,
       E'# Classroom Supply Counter\n\ndef count_supplies(notebooks, pencils):\n    # Return the total number of items\n    return notebooks + pencils\n\nnotebooks = int(input("How many notebooks? "))\npencils = int(input("How many pencils? "))\n',
       '["A function body is indented.", "return sends a value back; print shows it.", "Use int(input(...)) for each count."]'::jsonb,
       'If your program needs to add a function result later, which should the function use?',
       '["print() only", "return", "input() only"]'::jsonb, 1,
       'return sends a value back so the caller can save it and use it again.')
  ), inserted_sessions AS (
    INSERT INTO public.sessions
      (module_id, session_number, title, analogy_physical, content_markdown,
       starter_code, hints, xp_reward, order_index, duration_minutes, quick_check)
    SELECT v_module_id, session_number, title, analogy, lesson, starter, hints,
           50, session_number, 15,
           jsonb_build_object('question', check_question, 'options', check_options)
    FROM lesson_data
    ON CONFLICT (module_id, session_number)
    DO UPDATE SET title = EXCLUDED.title,
                  analogy_physical = EXCLUDED.analogy_physical,
                  content_markdown = EXCLUDED.content_markdown,
                  starter_code = EXCLUDED.starter_code,
                  hints = EXCLUDED.hints,
                  xp_reward = EXCLUDED.xp_reward,
                  order_index = EXCLUDED.order_index,
                  duration_minutes = EXCLUDED.duration_minutes,
                  quick_check = EXCLUDED.quick_check
    RETURNING id, session_number
  )
  INSERT INTO private.session_quick_check_answers(session_id, correct_option, explanation)
  SELECT inserted_sessions.id, lesson_data.correct_option, lesson_data.explanation
  FROM inserted_sessions
  JOIN lesson_data USING (session_number)
  ON CONFLICT (session_id)
  DO UPDATE SET correct_option = EXCLUDED.correct_option,
                explanation = EXCLUDED.explanation;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_session_quick_check(
  p_session_id integer,
  p_selected_option smallint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_student_id uuid := (SELECT auth.uid());
  v_correct_option smallint;
  v_option_count integer;
  v_explanation text;
  v_xp_reward integer;
  v_is_correct boolean;
  v_completed_now boolean := false;
  v_content_snapshot jsonb;
BEGIN
  IF v_student_id IS NULL OR p_session_id IS NULL OR p_selected_option IS NULL OR p_selected_option < 0 THEN
    RAISE EXCEPTION 'A signed-in learner and valid answer are required';
  END IF;

  SELECT answer.correct_option,
         jsonb_array_length(s.quick_check->'options'),
         answer.explanation,
         s.xp_reward,
         jsonb_build_object(
           'captured_at', now(),
           'module', jsonb_build_object('id', m.id, 'title', m.title, 'month_number', m.month_number),
           'session', jsonb_build_object(
             'id', s.id, 'session_number', s.session_number, 'title', s.title,
             'analogy_physical', s.analogy_physical, 'content_markdown', s.content_markdown,
             'starter_code', s.starter_code, 'hints', s.hints,
             'duration_minutes', s.duration_minutes, 'quick_check', s.quick_check
           )
         )
    INTO v_correct_option, v_option_count, v_explanation, v_xp_reward, v_content_snapshot
  FROM public.sessions s
  JOIN public.modules m ON m.id = s.module_id
  JOIN private.session_quick_check_answers answer ON answer.session_id = s.id
  WHERE s.id = p_session_id
    AND m.status = 'published'
    AND (
      (SELECT private.is_admin())
      OR (SELECT private.is_course_instructor(m.course_id))
      OR EXISTS (
        SELECT 1 FROM public.course_enrollments e
        WHERE e.course_id = m.course_id
          AND e.student_id = v_student_id
          AND e.status = 'active'
          AND (
            (m.is_free AND e.started_at > now() - interval '30 days')
            OR e.plan IN ('paid_full', 'scholarship')
            OR (e.plan = 'paid_monthly' AND e.paid_through > now())
          )
      )
    );

  IF v_correct_option IS NULL THEN
    RAISE EXCEPTION 'This quick check is unavailable to your account';
  END IF;
  IF NOT (SELECT private.is_admin())
     AND NOT (SELECT private.is_course_instructor((
       SELECT m.course_id FROM public.sessions s JOIN public.modules m ON m.id = s.module_id WHERE s.id = p_session_id
     )))
     AND EXISTS (
       SELECT 1
       FROM public.sessions earlier
       JOIN public.sessions current_session ON current_session.module_id = earlier.module_id
       WHERE current_session.id = p_session_id
         AND earlier.session_number < current_session.session_number
         AND NOT EXISTS (
           SELECT 1 FROM public.user_progress progress
           WHERE progress.student_id = v_student_id
             AND progress.session_id = earlier.id
             AND progress.completed
         )
     ) THEN
    RAISE EXCEPTION 'Complete the earlier lessons in this week first';
  END IF;
  IF p_selected_option >= v_option_count THEN
    RAISE EXCEPTION 'Selected answer is outside the available options';
  END IF;

  v_is_correct := p_selected_option = v_correct_option;

  INSERT INTO public.session_quick_check_attempts
    (student_id, session_id, selected_option, correct, content_snapshot)
  VALUES (v_student_id, p_session_id, p_selected_option, v_is_correct, v_content_snapshot);

  IF v_is_correct THEN
    INSERT INTO public.user_progress (student_id, session_id, completed, last_accessed)
    VALUES (v_student_id, p_session_id, false, now())
    ON CONFLICT (student_id, session_id) DO NOTHING;

    UPDATE public.user_progress
    SET completed = true,
        completed_at = now(),
        last_accessed = now(),
        completed_content_snapshot = v_content_snapshot
    WHERE student_id = v_student_id AND session_id = p_session_id AND completed = false;

    v_completed_now := FOUND;
    IF v_completed_now THEN
      UPDATE public.profiles
      SET xp = xp + COALESCE(v_xp_reward, 0), updated_at = now()
      WHERE id = v_student_id AND role = 'student';
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'correct', v_is_correct,
    'explanation', v_explanation,
    'session_completed_now', v_completed_now,
    'xp_awarded', CASE WHEN v_completed_now THEN COALESCE(v_xp_reward, 0) ELSE 0 END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_session_quick_check(integer, smallint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_session_quick_check(integer, smallint) TO authenticated;
