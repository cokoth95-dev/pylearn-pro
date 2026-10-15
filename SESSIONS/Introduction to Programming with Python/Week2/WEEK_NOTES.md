# Week 2: Making decisions with conditions

**Status: compiled for teaching; not yet marked as taught.**

## What learners should be able to do

By the end of this week, a learner should be able to make a program choose between actions, combine simple rules, clean up text typed by a person, and interpret a clock time for a small real-life task.

Learners begin with Week 1 ideas: `print()`, variables, `input()`, strings, arithmetic, and basic functions. Each new term should be explained before it appears in a task. A condition is a question whose answer is either true or false, much like checking whether a shop is open before going there.

## Suggested lesson order

1. **Make a Choice with `if`** — compare values and run an indented instruction only when a condition is true. Use an age check or a simple pass mark as the everyday example.
2. **Choose Between Several Outcomes** — add `elif` for another possibility and `else` for the remaining case, like choosing a greeting based on the time of day.
3. **Combine Rules with `and`, `or`, and `not`** — explain each word in ordinary language and test combinations such as “the shop is open and I have money.”
4. **Clean and Recognize Text** — use `.strip()` to remove outer spaces and `.lower()` to compare text without worrying about capital letters. Introduce `.startswith()` for greeting detection.
5. **Recognize File Types from Their Names** — use `.endswith()` to check a filename ending such as `.pdf` or `.jpg`, and explain that a file ending is a clue about the file type.
6. **Turn Clock Time into a Meal-Time Decision** — use `.split(":")` to separate hours and minutes, arithmetic to make a decimal hour, and inclusive comparisons to check breakfast, lunch, or dinner windows.

The course migration seeds these as six short sessions in this order. The arithmetic-expression challenge in Math Interpreter should be assigned only after learners have practiced `if`/`elif` and numeric conversion. It combines earlier arithmetic with this week's decisions.

## Practice assignment map

| Assignment | Ideas it practices | Suggested placement |
| --- | --- | --- |
| Deep Thought | Clean and compare a text answer; allow more than one accepted spelling | After lessons 3–4 |
| Home Federal Savings Bank | Ignore leading spaces/capitalization and select a response | After lessons 2–4 |
| File Extensions | Check a filename ending and choose a category | After lesson 5 |
| Meal Time | Convert `HH:MM` text to hours and test time ranges | After lesson 6, with the worked example available |
| Math Interpreter | Read an expression, choose an operation, and calculate | Guided challenge after lessons 1–3 and Week 1 arithmetic |
| Making Faces | Replace an emoticon with an emoji using `.replace()` | Optional extension; introduce the method first with a before/after example |
| Einstein | Use `**` to raise a number to a power | Optional extension; demonstrate `2 ** 3` means 2 × 2 × 2 |

The saved assignment pages and their `_files` folders remain together in `Practice`. Ask learners to explain their conditions in ordinary language before they translate those rules into Python.

## Teaching reminders

- Say what a value means before naming its Python type. For example, a typed answer such as `"42"` is text until it is converted; it does not become a number merely because it contains digits.
- Read conditions aloud. `score >= 50` means “is the score at least 50?”
- Show that Python checks branches from top to bottom and runs the first matching branch.
- For time examples, state that the starter assumes valid 24-hour input such as `07:30`; validating mistyped input is a later topic.
- Distinguish a filename's ending from a guarantee of its actual contents. The assignment classifies by the name only.
