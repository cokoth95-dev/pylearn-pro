-- Beginner-friendly Week 4 lessons: errors, input validation, and debugging.
DO $$
DECLARE
  v_course_id uuid;
  v_module_id integer;
BEGIN
  SELECT id INTO v_course_id FROM public.courses WHERE slug = 'python-foundations';
  IF v_course_id IS NULL THEN
    RAISE EXCEPTION 'Python Foundations course must exist before Week 4 is added';
  END IF;

  INSERT INTO public.modules
    (course_id, month_number, title, tagline, description, capstone_title,
     is_free, order_index, status)
  VALUES
    (v_course_id, 4, 'Errors and Debugging', 'Week 4 · Sessions 1–5',
     'Read Python error messages, handle expected invalid input, validate values, and debug a program step by step.',
     'A Friendly Fuel Gauge', false, 4, 'published')
  ON CONFLICT (course_id, month_number, order_index)
  DO UPDATE SET title = EXCLUDED.title, tagline = EXCLUDED.tagline,
                description = EXCLUDED.description, capstone_title = EXCLUDED.capstone_title,
                is_free = EXCLUDED.is_free, order_index = EXCLUDED.order_index,
                status = EXCLUDED.status
  RETURNING id INTO v_module_id;

  WITH lesson_data(session_number, title, analogy, lesson, starter, hints,
                   check_question, check_options, correct_option, explanation) AS (
    VALUES
      (1, 'Read an Error Message as a Clue',
       'When a recipe step is unclear or a measurement is missing, you pause and find the confusing instruction. Python error messages also point to a place where the program needs attention.',
       $w4l1$## Goal
Recognize syntax errors, runtime errors, and logic errors, and use an error message to begin investigating.

## Plain explanation
A **syntax error** means Python cannot understand how a line is written. For example, a text value needs matching quotation marks: `print("Hello)` is missing its closing quote.

A **runtime error** happens after the program starts. For example, `int("cat")` asks Python to turn the word `cat` into a whole number, which is not possible, so Python raises a `ValueError`.

A **logic error** means the program runs but gives the wrong answer. If a program calculates the price of three items using `price + 3` instead of `price * 3`, Python can run the code, but the calculation is not what we intended.

Python may show a **traceback**, a report that helps locate a runtime problem. Read the last line first to see the error name and message. Then look at the nearby file name and line number to find where Python noticed the problem. The cause can be on that line or just before it.

## Everyday example
If a parcel cannot be delivered, a tracking report gives a status and a location. The report does not repair the delivery, but it gives you a useful place to start. An error message works in a similar way.

## Worked example
```python
answer = "cat"
number = int(answer)
print(number)
```
The program starts, then fails while `int()` tries to convert `"cat"`. The error is a runtime `ValueError`. If the output were wrong without an error, we would investigate the calculation as a possible logic error.

## Try it with help
Look at `print("Hello)`. Name the kind of error before running it. Then inspect `int("cat")` and explain why it fails at a different stage.

## Tiny glossary
- **Syntax:** the writing rules Python expects.
- **Runtime:** the time while a program is running.
- **Logic error:** a mistake in the plan or calculation that still lets the code run.
- **Traceback:** Python's report showing where a runtime error was noticed.$w4l1$,
       E'# Compare two common problems
print("Hello)
number = int("cat")
',
       '["Read the final line of a traceback for the error name.", "Syntax errors prevent Python from understanding the code.", "A runtime error occurs after the program starts."]'::jsonb,
       'What kind of error is int("cat") likely to raise?',
       '["SyntaxError", "ValueError", "NameError"]'::jsonb, 1,
       'The code is written in valid Python, but the text cat cannot be converted into an integer, so Python raises ValueError.'),

      (2, 'Handle Invalid Input with try and except',
       'A school form can explain that a date is not in the expected format instead of closing the whole office. A program can catch an expected input problem and give a helpful response.',
       $w4l2$## Goal
Use `try` and `except ValueError` to handle text that cannot be converted into a number.

## Plain explanation
The `input()` function gives your program text. Even if someone types digits such as `12`, Python initially receives the answer as text. `int()` can convert suitable digit text into a whole number, but it raises `ValueError` if the text is not a whole number, such as `twelve` or `12.5`.

`try` marks a small piece of code that might fail. `except ValueError` tells Python what to do if that particular conversion fails. The indented lines under `except` can show a calm explanation. Catching the specific error keeps the response focused and does not hide unrelated problems elsewhere in the program.

## Everyday example
A ticket machine might ask for the number of tickets. If someone types a word, the machine can say “Please enter a whole number” and let them try again instead of shutting down.

## Worked example
```python
answer = input("How many tickets? ")

try:
    tickets = int(answer)
except ValueError:
    print("Please enter a whole number.")
else:
    print(f"You asked for {tickets} tickets.")
```
Python attempts only the conversion inside `try`. If it succeeds, the `else` block runs. If conversion raises `ValueError`, Python skips `else` and prints the message under `except`. The `else` here means “when no matching error happened.”

## Try it with help
Ask for a number of books and convert the answer with `int()`. Print a friendly message when the answer is not a whole number. Try `4` and `four`.

## Tiny glossary
- **Exception:** a problem Python reports while the program is running.
- **`try`:** a block where Python attempts an operation that may fail.
- **`except`:** a block that responds to a matching exception.
- **`ValueError`:** an error raised when a value cannot be used in the requested way.$w4l2$,
       E'# Convert a typed answer safely
answer = input("How many tickets? ")

',
       '["Put the conversion that may fail inside try.", "Use except ValueError for text that int() cannot convert.", "Keep unrelated print statements outside try when possible."]'::jsonb,
       'Which block handles text such as four when int() expects digits?',
       '["except ValueError", "else", "A comment"]'::jsonb, 0,
       'int("four") raises ValueError, so the matching except ValueError block can respond.'),

      (3, 'Ask Again Until the Input Is Valid',
       'A turnstile keeps checking a ticket until it receives one that is accepted. A loop can repeat a question until a conversion succeeds.',
       $w4l3$## Goal
Combine a `while` loop with `try` and `except` to keep asking until a whole number is entered.

## Plain explanation
An `except` block can explain that an answer was invalid, but the program will continue after that block. To ask the question again, place the attempt inside a loop.

`while True:` starts a loop that would repeat forever unless the program leaves it. In this example, `break` means “stop the loop now.” We use `break` only after a successful conversion. If `int()` raises `ValueError`, Python runs `except`, shows a message, and returns to the top of the loop for another answer.

## Everyday example
At a self-checkout, the screen keeps asking you to scan an item until a barcode is read. A rejected scan does not end the whole shopping trip; you can try again.

## Worked example
```python
while True:
    answer = input("Enter a whole number: ")

    try:
        number = int(answer)
    except ValueError:
        print("That was not a whole number. Try again.")
    else:
        break

print(f"You entered {number}.")
```
If the learner types `three`, conversion fails and the loop repeats. If the learner types `3`, conversion succeeds, `break` exits the loop, and the final message uses the number.

## Try it with help
Keep asking for the number of apples until the answer is a whole number. Try `many` first and `6` next. The program should print the accepted number only after the valid answer.

## Tiny glossary
- **Loop:** instructions Python can repeat.
- **`while True`:** a loop that continues until code inside it stops the loop.
- **`break`:** stop the nearest loop immediately.
- **Valid input:** an answer that follows the rule the program needs.$w4l3$,
       E'# Ask until the answer can be converted
while True:
    answer = input("Enter a whole number: ")
    # Convert safely and leave the loop when successful
    pass
',
       '["A failed conversion goes to except and the loop begins again.", "Use break after conversion succeeds.", "Print the accepted number after the loop ends."]'::jsonb,
       'What makes this while True loop stop?',
       '["A valid answer reaches break", "The input prompt has a question mark", "ValueError repeats by itself"]'::jsonb, 0,
       'A valid answer reaches break, which exits the loop. A ValueError is handled and the next loop iteration asks again.'),

      (4, 'Check Boundaries and Raise a Clear Error',
       'A measuring cup has a minimum and maximum amount. A value outside those limits should be rejected before it is used in a calculation.',
       $w4l4$## Goal
Check a value against a rule and use `raise ValueError(...)` to report an invalid value from a function.

## Plain explanation
Some answers can be converted to numbers but still break the program's rules. For example, `0` is an integer, but it cannot be used as the denominator in division. A fraction for a fuel gauge also needs a numerator that is not negative and no greater than its denominator.

Use an `if` statement to check a rule before calculating. `raise ValueError("message")` deliberately reports that a value is not acceptable. The function that raises the error stops at that point; the code that called it can catch the error with `try` and `except`.

Boundary cases are values at the edges of a rule. If the allowed percentage is from 0 through 100, test 0 and 100 as well as values outside that range. Testing only a middle value can miss errors at the edges.

## Everyday example
A lift may have a maximum load. A weight can be measured accurately and still exceed that limit. The measurement is valid as a number, but it is not valid for that lift.

## Worked example
```python
def percentage(numerator, denominator):
    if denominator == 0:
        raise ValueError("The denominator must not be zero.")
    if numerator < 0 or numerator > denominator:
        raise ValueError("The numerator must be between zero and the denominator.")
    return round(numerator / denominator * 100)

try:
    print(percentage(3, 4))
except ValueError as error:
    print(error)
```
The function checks the denominator before dividing. It then checks whether the numerator is in range. `raise` reports a problem; `except` catches that report and displays its message.

## Try it with help
Test `percentage(1, 2)`, `percentage(0, 4)`, `percentage(4, 4)`, and `percentage(5, 4)`. Predict each result or error before running it.

## Tiny glossary
- **Boundary case:** a value at or just beyond a rule's limit.
- **`raise`:** deliberately report an exception.
- **Denominator:** the bottom number in a fraction.
- **`round(...)`:** return a number rounded to the nearest whole number when no decimal places are specified.$w4l4$,
       E'# Check a fraction before calculating
def percentage(numerator, denominator):
    # Check the rules before dividing
    pass
',
       '["Check for zero before division.", "Check that the numerator is not greater than the denominator.", "Use raise ValueError to report an invalid function argument."]'::jsonb,
       'Why should a function check for a zero denominator before dividing?',
       '["Division by zero raises an error", "Zero is not a number", "It makes the percentage larger"]'::jsonb, 0,
       'Python cannot divide by zero, so checking first lets the function report a clear ValueError instead.'),

      (5, 'Debug by Reproducing and Narrowing the Problem',
       'If a bicycle makes a new sound, a mechanic tries to reproduce it and inspects one part at a time. Debugging follows the same careful process with code.',
       $w4l5$## Goal
Use a repeatable process to find and fix a syntax, runtime, or logic error.

## Plain explanation
**Debugging** means investigating a problem in a program and correcting its cause. Start by reproducing the problem: write down what you ran and what answer you expected. Then compare it with what actually happened.

For a syntax error, inspect the spelling, brackets, quotes, colons, and indentation near the reported line. For a runtime error, read the final error name and check the values used on that line. For a logic error, trace the values by hand or print a temporary checkpoint to see where the result first differs from what you expected.

Change one thing at a time. After a fix, rerun the example that failed and a few normal and boundary examples. A fix is more convincing when the original problem no longer happens and the ordinary cases still work.

## Everyday example
If a lamp does not turn on, first check the switch, then the plug, then the bulb. Changing all three at once makes it hard to know what solved the problem. In code, test one likely cause at a time.

## Worked example
```python
price = 3
quantity = 4
total = price + quantity  # The program runs, but this is the wrong operation.
print(total)
```
The expected total is 12, but addition gives 7. There is no Python error message because the syntax is valid. We compare the code with the intended rule, replace `+` with `*`, and test the same values again.

## Try it with help
Change one line at a time to find why `minutes = 90` is printed as `1.5` when the intended answer is 90. Then introduce a missing closing parenthesis and a word passed to `int()`. Identify which kind of problem each one creates.

## Tiny glossary
- **Debugging:** finding and correcting the cause of a program problem.
- **Reproduce:** make the same problem happen again with the same steps.
- **Checkpoint:** a temporary print used to inspect a value while the program runs.
- **Test case:** one chosen input and the result expected from it.$w4l5$,
       E'# Find and fix the wrong calculation
price = 3
quantity = 4
total = price + quantity
print(total)
',
       '["Write down the expected and actual result.", "This program runs, so investigate its logic.", "Change one likely cause and rerun the same example."]'::jsonb,
       'The code runs but calculates 7 instead of the expected 12. What should you investigate first?',
       '["A logic error in the calculation", "A missing quotation mark", "A ValueError from int()"]'::jsonb, 0,
       'The program runs without a syntax or runtime error, but its result is wrong. That points to a logic error.' )
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
  FROM inserted_sessions JOIN lesson_data USING (session_number)
  ON CONFLICT (session_id)
  DO UPDATE SET correct_option = EXCLUDED.correct_option,
                explanation = EXCLUDED.explanation;
END;
$$;
