-- Update lesson instructions to match the browser prompt used by input().
UPDATE public.sessions s
SET content_markdown = replace(
  replace(
    replace(
      s.content_markdown,
      $old$
`input("What is your name? ")` displays the question inside the parentheses, then waits for an answer supplied to the program. In this browser classroom, first type the answer in **Answers for `input()` questions** below the editor, then choose **Run code**. Put one answer on each line, in the order the questions appear. For this example, enter `Amina` on the first line. The browser runner uses that prepared answer when Python reaches `input()`; it cannot pause the running program and open a live typing box.
$old$,
      $new$
`input("What is your name? ")` asks a question. The words inside the parentheses are the message shown in a browser dialog. When Python reaches this line, the dialog opens over the lesson. Type your answer and choose **OK**; Python saves your reply as text in `name`. For example, type `Amina` in the dialog. You answer after choosing **Run code**, not before. Choosing **Cancel** stops the program.
$new$
    ),
    $old$
Before running, enter `  Amina  ` (with spaces) in the first answer line. `input()` saves that answer in `name`; `strip()` changes it to `Amina`; the f-string inserts that cleaned value into the greeting. The terminal shows the question and echoes the answer as if you typed it, then shows the greeting on the next line: `What is your name?   Amina` followed by `Hello, Amina!`.
$old$,
    $new$
When you run the code, type `  Amina  ` (including the spaces) in the browser dialog and choose **OK**. `input()` returns that text and saves it in `name`; `strip()` changes it to `Amina`; the f-string inserts that cleaned value into the greeting. After the dialog closes, Output shows the question and your reply, followed by `Hello, Amina!`.
$new$
  ),
  $old$
Ask two questions, one for a learner's name and one for a favorite subject. Add two answer lines below the editor, such as `Amina` and `Science`. Clean the name with `.strip()` and print one friendly f-string containing both variables.
$old$,
  $new$
Ask two questions, one for a learner's name and one for a favorite subject. Run the code, then type `Amina` in the first browser dialog and `Science` in the second. Clean the name with `.strip()` and print one friendly f-string containing both answers.
$new$
  )
FROM public.modules m
WHERE s.module_id = m.id
  AND m.course_id = (SELECT id FROM public.courses WHERE slug = 'python-foundations')
  AND m.month_number = 1
  AND s.session_number = 2;

UPDATE public.sessions s
SET content_markdown = replace(
  replace(
    s.content_markdown,
    $old$
Before running, enter a whole number such as `12` in the answer box. First Python asks for input and receives the text `"12"`; `int(...)` converts it to the number `12`. The next line stores the number `3`. The plus sign adds the two numbers, and `total` remembers the result, `15`. The f-string places that result in the displayed sentence.
$old$,
    $new$
When you run the code, the browser asks, “How many notebooks are on the desk?” Type a whole number such as `12` and choose **OK**. Python first receives the text `"12"`; `int(...)` converts it to the number `12`. The next line stores the number `3`. The plus sign adds the two numbers, and `total` remembers the result, `15`. The f-string places that result in the displayed sentence.
$new$
  ),
  $old$
Ask how many pencils are in a box. Convert the answer with `int(input(...))`, add `5`, and print the new total. Enter a digit answer such as `7` in Program inputs before running; the result should say there are 12 pencils.
$old$,
  $new$
Ask how many pencils are in a box. Convert the answer with `int(input(...))`, add `5`, and print the new total. When the browser asks how many pencils there are, type `7` and choose **OK**; the result should say there are 12 pencils.
$new$
  )
FROM public.modules m
WHERE s.module_id = m.id
  AND m.course_id = (SELECT id FROM public.courses WHERE slug = 'python-foundations')
  AND m.month_number = 1
  AND s.session_number = 3;

UPDATE public.sessions s
SET content_markdown = replace(
  s.content_markdown,
  $old$
Ask how many notebooks and pencils are needed. For each question, enter one answer per line in Program inputs before running. Convert each answer using `int(input(...))`, because the answers begin as text and addition needs numbers. Define `count_supplies(notebooks, pencils)` so it returns their sum. Call the function with the two saved numbers, store what it returns, and use an f-string with `print()` to show a clear result.
$old$,
  $new$
Ask how many notebooks and pencils are needed. Run the code and answer each browser dialog when it appears. Convert each answer using `int(input(...))`, because the answers begin as text and addition needs numbers. Define `count_supplies(notebooks, pencils)` so it returns their sum. Call the function with the two saved numbers, store what it returns, and use an f-string with `print()` to show a clear result.
$new$
  )
FROM public.modules m
WHERE s.module_id = m.id
  AND m.course_id = (SELECT id FROM public.courses WHERE slug = 'python-foundations')
  AND m.month_number = 1
  AND s.session_number = 5;
