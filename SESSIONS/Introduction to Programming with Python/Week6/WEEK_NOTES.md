# Week 6: Test your code with confidence

**Status: compiled for teaching; not yet marked as taught.**

## What learners should be able to do

Learners should understand why a program needs more than one manual test, move reusable work into a function, compare a function result with an expected result using `assert`, and recognize how `pytest` can run many tests automatically.

Connect tests to checking a recipe or a shop receipt: try known examples, include unusual values, and compare the result with what should happen. Explain that a passing test gives evidence for the cases tried; no small set of tests can prove every possible input is correct.

## Suggested lesson order

1. **Test a Small Function on Its Own** — explain a unit as one small piece, usually a function. Show that a test can call a function directly without asking a person to interact with the whole program.
2. **Compare Results with `assert`** — make a prediction and write `assert function(input) == expected`. Explain that Python stays quiet when the condition is true and reports an assertion failure when it is false.
3. **Choose Normal, Boundary, and Invalid Cases** — test a typical value, zero or an edge value, and invalid input. Introduce `pytest.raises(...)` to check that a function raises the expected error.
4. **Run Tests with `pytest`** — explain the test file naming pattern `test_*.py`, test function names beginning with `test_`, and how the test runner finds and reports those checks. Treat installation and terminal commands as separate from Python code.
5. **Separate Program Startup from Reusable Functions** — show `if __name__ == "__main__":` so importing a function for tests does not immediately run the interactive program. Connect tests to small functions with clear inputs and returned results.

## Practice assignment map

| Assignment | Function to test | Suggested placement |
| --- | --- | --- |
| Back to the Bank | `value(greeting)` for different greeting starts | After lessons 1–2; include case and leading-space examples if required by your version |
| Refueling | `convert(fraction)` for common fractions, empty/full bounds, and invalid denominators | After lessons 1–3; connects directly to Week 4 Fuel Gauge |
| Re-requesting a Vanity Plate | `is_valid(plate)` across accepted and rejected plate rules | After lessons 1–3; create one test for each rule before submitting |
| Testing my twttr | `shorten(word)` for lowercase, uppercase, and strings without vowels | After lessons 1–4; use as the guided pytest exercise |

## Teaching reminders

- A **unit test** checks one small part of a program, often one function.
- `assert actual == expected` asks Python to confirm that both sides have the same value.
- A test with the same example repeated many times is less useful than tests that cover different kinds of input.
- A test file imports the function being tested. Guard the program's startup code with `if __name__ == "__main__":` so importing it does not start its prompts.
- `pytest` is an outside package. The browser practice editor may not include it or support multiple files, so demonstrate the idea with ordinary `assert` in the browser and run full pytest exercises in a local Python environment.
- A passing test means the tested case matched. Keep adding cases for important rules and boundaries.
