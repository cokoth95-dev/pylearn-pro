# Week 10: Recursion and a Beginner's Final Project

## Purpose of this week

Week 10 brings together the skills from the course. Learners review how to plan, build, test, and explain a small Python program. Recursion is included as a new idea from the supplied lecture material, but it should not be a barrier to choosing or completing a useful project.

## Lesson sequence

1. **Plan a Small Program That Solves a Real Problem** — Choose one user, one problem, and a small first version. List what the program receives, what it does, and what it produces before coding.
2. **Make Code Easier to Read** — Use clear function and variable names, constants for values that should stay the same, and short docstrings to describe functions. Introduce type hints as helpful labels for expected values, while explaining that Python does not enforce them automatically.
3. **Test, Debug, and Improve the Program** — Reuse Week 4 error handling and Week 6 tests. Try typical, boundary, and invalid inputs. The final project asks for `main`, at least three additional top-level functions, and tests for at least three of those functions in `test_project.py`. Explain what pytest does and help learners run it in a local environment.
4. **Understand Recursion with a Countdown** — A recursive function calls itself on a smaller version of a problem. It needs a base case that stops the calls. Trace a countdown on paper and explain each call before writing a more complicated recursive solution.
5. **Explain and Demonstrate the Finished Project** — Show the problem, a short run of the program, and the important code choices. Prepare the requested README and short video, explain limitations honestly, and identify one possible future improvement.

The lecture also introduces more advanced features such as decorators, class/static methods, flexible arguments, unpacking, and generators. Treat these as optional demonstrations or later study; learners do not need to use them in their projects unless they solve a clear problem.

## Everyday connections

A final project is like preparing a small community event: decide what success means, divide the work into steps, check the essentials, and explain the result. Recursion is like opening nested boxes until reaching the smallest box, then returning through the boxes; without a stopping case the process continues indefinitely.

## Supplied practice and project guidance

The supplied **Final Project** prompt requires a Python program with a `main` function and at least three additional top-level functions. At least three of those functions need tests that can be run with pytest. It also asks for a `project.py` file, a `test_project.py` test file, a README that explains the project, and a short video demonstration. Treat this as a capstone with a manageable scope, not a demand for a large commercial app. Encourage projects such as a simple quiz, expense totaler, reading log, class attendance helper, or text-based menu. Teach the file and test requirements before the final deadline so they are not a surprise.

Suggested milestones:

1. Write a one-paragraph problem statement and list the intended user.
2. Sketch the inputs, outputs, and 2–4 core features.
3. Build the smallest version that works.
4. Add validation and test cases.
5. Prepare a short demonstration and explanation.

## Beginner support

Learners may use functions and other course topics they understand; do not require recursion or classes if they are not useful to the project. Keep code and data simple, avoid secrets/API keys and personal data, and ensure the project can be run in the learner's available environment. Agree on a small scope before coding. Explain that a type hint documents an intended type but does not convert or validate a value by itself.

## Vocabulary

- **Scope:** what the first version will and will not do.
- **Milestone:** a small checkpoint on the way to finishing a project.
- **Base case:** the condition that stops a recursive function.
- **Recursive case:** the part that calls the function again on a smaller problem.
- **Demonstration:** a short example showing the program working.
