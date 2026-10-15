# Week 4: Finding, handling, and preventing errors

**Status: compiled for teaching; not yet marked as taught.**

## What learners should be able to do

Learners should be able to read a basic Python error message, tell a typing or syntax problem from a problem that happens while a program runs, handle expected bad input with `try` and `except`, and test boundary cases instead of checking only one normal answer.

Connect the topic to everyday instructions: a form can reject a date written in the wrong shape, a fuel gauge must not divide by zero, and a cashier should explain a mistake instead of crashing. Explain that an exception is Python's name for a problem it encounters while running. It is useful information that points to what needs attention.

## Suggested lesson order

1. **Read an Error Message as a Clue** — introduce syntax errors, runtime errors, and logic errors. Show a missing quotation mark, a word where an integer is expected, and an incorrect result. Explain that the last line of a traceback usually names the error and the line above often identifies where Python noticed it.
2. **Handle Invalid Input with `try` and `except`** — explain that `try` means “attempt this small piece of work” and `except ValueError` means “if converting this text to a number fails, show a helpful response.” Keep only the line that can fail inside the `try` block.
3. **Ask Again Until the Answer Is Valid** — combine `while`, `try`, `except`, and `break` to repeat a prompt after invalid input and stop after a valid answer. Trace one invalid answer and then one valid answer line by line.
4. **Check the Edges and Raise a Clear Error** — test zero, negative values, exact limits, and malformed input. Demonstrate `raise ValueError(...)` inside a small function to reject a value that violates a rule; explain that raising an error is a way for a function to report an invalid request to its caller.
5. **Debug by Reproducing and Narrowing the Problem** — change one thing at a time, reproduce the problem, read the error, inspect nearby values, and test the fix. Demonstrate temporary `print()` checks and remove them after the issue is understood.

## Practice assignment map

| Assignment | Ideas it practices | Suggested placement |
| --- | --- | --- |
| Fuel Gauge | Split a fraction, convert numbers, handle `ValueError` and division by zero, check range and boundary cases | After lessons 2–4; first work through one valid and one invalid fraction together |
| Outdated | Re-prompt for invalid dates, separate date pieces, validate month/day bounds, format values with leading zeroes | Guided challenge after lessons 3–4; it combines several earlier skills |
| Grocery List | Read until end-of-input, count repeated items in a dictionary, normalize case, sort and format output | Extension after Week 3 loops/dictionaries; introduce `EOFError` and the terminal's end-of-input key explicitly |
| Felipe’s Taqueria | Repeat prompts, find menu entries, ignore unknown items, keep a running total, format money | Extension after Week 3 loops/dictionaries; explain `KeyError` or check membership before lookup |

The browser practice runner provides prepared answers for `input()` prompts. End-of-input keyboard behavior such as Control-D may differ from a terminal; explain that these last two exercises model a terminal session and use a supplied input sequence or a simplified stop word in browser practice when needed.

## Teaching reminders

- A syntax error means Python cannot understand how the code is written. A runtime error happens after the program starts. A logic error means the program runs but gives the wrong result.
- An error message is feedback, not a score. Ask learners to find the error name and the line before trying a fix.
- Catch the specific error expected. Avoid `except:` by itself because it can hide unrelated mistakes.
- `ValueError` commonly means a value has the right general shape for an operation but cannot be used as requested, such as `int("cat")`.
- `ZeroDivisionError` means a calculation tried to divide by zero. The solution is to check the denominator or reject the input before dividing.
- A `try` block is not a way to make incorrect input magically valid. The `except` block must tell the user what happened or ask again.
- Reproduce errors with small examples and test both ordinary and boundary values after fixing them.
