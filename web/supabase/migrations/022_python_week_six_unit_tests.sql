-- Beginner-friendly Week 6 lessons on unit testing and pytest.
DO $$
DECLARE
  v_course_id uuid;
  v_module_id integer;
BEGIN
  SELECT id INTO v_course_id FROM public.courses WHERE slug = 'python-foundations';
  IF v_course_id IS NULL THEN
    RAISE EXCEPTION 'Python Foundations course must exist before Week 6 is added';
  END IF;
  INSERT INTO public.modules
    (course_id, month_number, title, tagline, description, capstone_title, is_free, order_index, status)
  VALUES
    (v_course_id, 6, 'Testing Your Code', 'Week 6 · Sessions 1–5',
     'Write repeatable checks for functions, cover normal and unusual cases, and run tests with pytest.',
     'A Tested Text Helper', false, 6, 'published')
  ON CONFLICT (course_id, month_number, order_index)
  DO UPDATE SET title = EXCLUDED.title, tagline = EXCLUDED.tagline,
                description = EXCLUDED.description, capstone_title = EXCLUDED.capstone_title,
                is_free = EXCLUDED.is_free, order_index = EXCLUDED.order_index,
                status = EXCLUDED.status
  RETURNING id INTO v_module_id;

  WITH lesson_data(session_number, title, analogy, lesson, starter, hints, check_question, check_options, correct_option, explanation) AS (
    VALUES
      (1, 'Test One Function at a Time',
       'A mechanic checks one wheel before taking apart the entire bicycle. A unit test checks one small part of a program on its own.',
       $w6l1$## Goal
Understand what a unit test checks and prepare a function to be tested from another file.

## Plain explanation
A **unit test** checks one small part of a program, often one function. A function with clear inputs and a returned result is easier to test than a program that only asks questions and prints answers.

Put reusable functions in a Python file. Put interactive startup code under `if __name__ == "__main__":`. When Python runs the file directly, that condition is true and the program starts. When another file imports a function, the condition is false, so input prompts do not start by surprise.

## Worked example
```python
def square(number):
    return number * number

def main():
    number = int(input("Number: "))
    print(square(number))

if __name__ == "__main__":
    main()
```
A test file can import `square` and call it directly. The main guard keeps the input prompt from running during that import.

## Everyday example
Before checking a whole bicycle, a mechanic can test one brake lever. Isolating one part makes a problem easier to find.

## Try it with help
Write `double(number)` so it returns twice its input. Explain why a test can call the function without typing into an input prompt.

## Tiny glossary
- **Unit:** one small part of a program.
- **Unit test:** a check of one small part, often one function.
- **Main guard:** a condition that starts the interactive program only when the file is run directly.$w6l1$,
       E'# A small function that can be tested
def double(number):
    return number * 2

if __name__ == "__main__":
    print(double(3))
',
       '["Return a result so a separate test can inspect it.", "Keep interactive startup under the main guard.", "A test can pass a value directly to a function."]'::jsonb,
       'Why use a main guard around the interactive startup?',
       '["So importing a function does not automatically start the prompts", "So Python multiplies numbers", "So return becomes print"]'::jsonb, 0,
       'The main guard starts the interactive part only when the file is run directly, not when a test imports a function.'),

      (2, 'Compare Results with assert',
       'A receipt checker compares a total with the expected cost. Python assert compares an actual result with the value we expect.',
       $w6l2$## Goal
Use `assert` to check whether a function returns an expected value.

## Plain explanation
`assert condition` asks Python to check whether a condition is true. A test often compares a function result with the expected answer: `assert square(2) == 4`.

If the comparison is true, Python continues quietly. If it is false, Python raises `AssertionError` and identifies the failed check. Different inputs can uncover different mistakes, so do not repeat only one example.

## Worked example
```python
def square(number):
    return number * number

assert square(2) == 4
assert square(3) == 9
```
Both checks pass. If the function accidentally used addition, the first check would still pass, but the second would fail. A test result only tells us about the cases we chose.

## Everyday example
If two items cost 10 shillings each, a receipt checker expects a total of 20. It compares the actual total with that expected value.

## Try it with help
Write `is_even(number)` and assert that 2 and 0 are even while 7 is not.

## Tiny glossary
- **Assertion:** a statement that checks whether a condition is true.
- **Expected:** the result we believe correct code should produce.
- **Actual:** the result the function produced.$w6l2$,
       E'# Check one calculation
def square(number):
    return number * number

assert square(2) == 4
',
       '["Compare the function result with the expected value.", "Test more than one kind of input.", "A failed assert raises AssertionError."]'::jsonb,
       'What happens when an assert condition is false?',
       '["Python reports AssertionError", "Python fixes the function automatically", "Python changes the expected value"]'::jsonb, 0,
       'A false assertion raises AssertionError so the test run can report that the actual result differed from the expected result.'),

      (3, 'Test Normal, Boundary, and Invalid Cases',
       'A shoe shop checks a common shoe size and the smallest and largest sizes it sells. Good tests examine ordinary values and the edges of a rule.',
       $w6l3$## Goal
Choose useful normal, boundary, and invalid inputs for a function.

## Plain explanation
A program can work for one example and fail for another. Test a normal value, a boundary value at a limit, and an invalid value that should be rejected. For a percentage from 0 through 100, test a middle value, 0, 100, and values below and above the limits.

`pytest.raises(ValueError)` checks that a function reports the expected error for invalid input. This is useful when raising an error is the correct behavior, not an unexpected crash.

## Worked example
```python
import pytest
from fuel import convert

def test_convert_half():
    assert convert("1/2") == 50

def test_zero_denominator():
    with pytest.raises(ValueError):
        convert("1/0")
```
The first test checks a normal fraction. The second checks that a zero denominator is rejected. The function must be written to raise `ValueError` for the second check to pass.

## Everyday example
A bridge inspector checks the supports and weight limits as well as the middle of the bridge. Limits matter too.

## Try it with help
For a function that accepts values from 0 to 100, list a normal value, both boundaries, and one value outside each boundary. Predict the result for each.

## Tiny glossary
- **Boundary case:** a value at or just beyond a rule's limit.
- **Invalid case:** an input that does not follow the function's rules.
- **`pytest.raises(...)`:** a check that a specific error occurs.$w6l3$,
       E'# Plan test cases for a percentage function
def convert(fraction):
    # Return the percent represented by a fraction
    pass
',
       '["Write down the expected result first.", "Test at least one ordinary value and one limit.", "Use pytest.raises when an error is expected."]'::jsonb,
       'Why test a boundary such as zero?',
       '["Limits can reveal mistakes that ordinary values do not", "Zero is never a valid number", "Boundary tests replace every other test"]'::jsonb, 0,
       'An ordinary example may not expose a mistaken limit check. Boundary tests examine where the allowed range begins or ends.'),

      (4, 'Run Tests with pytest',
       'A consistent checklist can inspect many items in the same way. pytest finds and runs test functions so the same checks can be repeated quickly.',
       $w6l4$## Goal
Recognize pytest file and function naming conventions and understand a basic test report.

## Plain explanation
`pytest` is a Python package that discovers and runs tests. By convention, a test file begins with `test_`, such as `test_twttr.py`, and a test function also begins with `test_`, such as `test_shorten_lowercase()`.

Inside each test function, write `assert` statements for behavior you expect. In a terminal, run `pytest` from the project folder. pytest finds matching files, runs their tests, and reports which checks passed or failed. A failure report shows the comparison so you can investigate it.

Install pytest in a terminal with `python -m pip install pytest`. That command is not Python code for the editor. A browser editor may not support installing packages or running a separate test file, so use a local Python environment for a full pytest project.

## Worked example
```python
from twttr import shorten

def test_shorten_lowercase():
    assert shorten("twitter") == "twttr"

def test_shorten_uppercase():
    assert shorten("TWITTER") == "TWTTR"
```
Save this as `test_twttr.py`. Both test function names start with `test_`, so pytest can find them.

## Everyday example
A shared answer key helps a teacher check repeated work in a consistent way. A test runner acts like a repeatable answer key for program behavior.

## Try it with help
Write `test_double()` to check that `double(4)` returns 8. Name the terminal command that runs pytest.

## Tiny glossary
- **Test suite:** a group of related tests run together.
- **Discover:** find matching test files and functions automatically.
- **Pass or fail:** whether a check matched the expected behavior.$w6l4$,
       E'# Write one pytest check
from math_helpers import double

def test_double():
    assert double(4) == 8
',
       '["The file name begins with test_.", "Test function names also begin with test_.", "Run pytest in a terminal from the project folder."]'::jsonb,
       'What prefix helps pytest discover a test function?',
       '["test_", "check-", "run__"]'::jsonb, 0,
       'pytest looks for test functions whose names begin with test_ in files that follow its discovery pattern.'),

      (5, 'Keep Imports from Starting the Program',
       'A light switch lets someone choose when a room lamp turns on. A main guard lets a programmer choose when the interactive part of a file starts.',
       $w6l5$## Goal
Use a main guard so another file can import a function without starting an interactive program.

## Plain explanation
A test file often imports a function from the program it checks. If the program asks for input as soon as it is imported, the test may unexpectedly wait for a person. Put the interactive work inside `main()`, then call `main()` only when the file is started directly.

Python sets the special variable `__name__`. When a file is run directly, its value is `"__main__"`. When another file imports it, the value is the module name, so the guarded call to `main()` is skipped. A test can then import a function and supply its own values.

## Worked example
```python
def greet(name):
    return f"Hello, {name}!"

def main():
    name = input("Name: ")
    print(greet(name))

if __name__ == "__main__":
    main()
```
A test can import `greet` and call `greet("Mina")`. It receives the greeting without the program asking for a name.

## Everyday example
A reusable instruction sheet can sit on a shelf without starting the activity. The activity begins only when someone chooses to run it. The main guard is like that start button.

## Try it with help
Place an input prompt inside `main()` and add the main guard. Explain what happens when the file runs directly and when a test imports one of its functions.

## Tiny glossary
- **Main function:** a function that organizes the starting steps of a program.
- **Main guard:** a condition that runs the program only when its file is started directly.
- **Import:** use code from another Python file.$w6l5$,
       E'# Separate a function from program startup\ndef shout(text):\n    return text.upper()\n\ndef main():\n    answer = input("Text: ")\n    print(shout(answer))\n',
       '["Put the input prompt inside main().", "Importing the file should not run the prompt.", "Call main() under the name check."]'::jsonb,
       'What should happen when a test imports shout?',
       '["The function is available without starting the prompt", "The prompt always runs first", "Python deletes the function"]'::jsonb, 0,
       'With a main guard, importing the file defines shout but does not call main, so a test can use the function directly.')
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
