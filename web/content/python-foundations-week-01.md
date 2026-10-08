# Python Foundations — Week 1

**Draft for review.** Five short sessions introduce Python through familiar home, classroom, and small-shop situations. Each session is designed for about 10–15 minutes and follows the agreed pattern: everyday analogy, plain explanation, worked example, guided coding, and a quick check.

The source folder was reviewed recursively. This draft draws on its beginner topics—programs, variables, text, input/output, numbers, functions, and return values—and adapts them into original examples. Editor and terminal installation steps are omitted because learners use the browser classroom.

## Week goal

By the end of the week, a learner can ask for simple information, store it in variables, work with text and whole numbers, write a small function, and use the value that a function returns.

## Day 1 — Give the computer clear instructions

**Goal:** Run a short program and use `print()` to show a message. Store text in a named variable.

**Everyday analogy:** A program is a short list of instructions, like a classroom notice that says what to do first and next. A variable is a labeled jar: the label is its name, and the item inside is its value.

**Plain explanation:** Python reads instructions from top to bottom. `print()` shows information. A variable gives a value a name so the program can use it again.

**Worked example:**

```python
print("Welcome to Python!")

student_name = "Sam"
print(student_name)
```

The first line displays a message. The second line stores the text `Sam` under the name `student_name`. The last line displays the value stored in that variable.

**Guided task:** Change the name to your own name. Add a second variable called `favorite_subject` and print it.

**Quick check:** In `class_name = "Blue Room"`, what is the variable name, and what value does it hold?

## Day 2 — Ask a question and use the answer

**Goal:** Collect text with `input()` and place it into a variable. Use an f-string to make a message.

**Everyday analogy:** `input()` is like asking a visitor to write their name on a sign-in sheet. The program keeps the answer so it can use it in a reply.

**Plain explanation:** `input()` pauses and waits for the learner to type. The typed answer is text. An f-string lets a program place a variable inside a message.

**Worked example:**

```python
name = input("What is your name? ")
name = name.strip()
print(f"Hello, {name}!")
```

`strip()` removes extra spaces at the start or end. The `f` before the quote lets Python put the value of `name` inside the message.

**Guided task:** Ask for a learner's name and favorite subject. Print one friendly sentence that includes both answers.

**Quick check:** Does `input()` give the program a number, or does it give the program text?

## Day 3 — Work with whole numbers

**Goal:** Turn typed digits into a whole number and use arithmetic to solve a small problem.

**Everyday analogy:** If a class has 12 notebooks and receives 3 more, counting the total is a number problem. A typed answer starts as a written label; Python needs it changed into a number before it can add it.

**Plain explanation:** `input()` gives text, even when the learner types digits. `int()` changes digit text into a whole number. Python can then add or multiply the values.

**Worked example:**

```python
notebooks = int(input("How many notebooks are on the desk? "))
more_notebooks = 3
total = notebooks + more_notebooks
print(f"There are {total} notebooks.")
```

**Guided task:** Ask how many pencils are in a box. Add 5 more pencils and print the new total.

**Quick check:** Why does this example use `int(input(...))` instead of only `input(...)` before adding?

## Day 4 — Make a reusable function

**Goal:** Define a function, give it a parameter, and call it with an argument.

**Everyday analogy:** A function is like a reusable classroom routine. The routine stays the same, but the name you pass in can change each time.

**Plain explanation:** `def` starts a function definition. A parameter is the named space in the definition. An argument is the value given when the function is called. Indented lines belong to the function.

**Worked example:**

```python
def welcome(name):
    print(f"Welcome to class, {name}!")

welcome("Mina")
welcome("Ali")
```

`name` is the parameter. `"Mina"` and `"Ali"` are arguments. The function runs once for each call.

**Guided task:** Write a function named `show_subject` with a parameter named `subject`. Call it with two different subjects.

**Quick check:** In `welcome("Mina")`, which part is the parameter and which part is the argument?

## Day 5 — Return a result and use it again

**Goal:** Explain the difference between showing a result with `print()` and handing a result back with `return`. Combine the week's ideas in a small project.

**Everyday analogy:** `print()` is like announcing a total to the class. `return` is like writing the total on a note and handing it back so another step can use it.

**Plain explanation:** `print()` displays information. `return` sends a value back to the code that called the function. The caller can store that value, add it to something else, or print it later.

**Worked example:**

```python
def count_supplies(notebooks, pencils):
    return notebooks + pencils

total_items = count_supplies(12, 8)
print(f"The class has {total_items} supplies.")
```

**Guided mini-project — Classroom Supply Counter:** Ask for the number of notebooks and pencils. Convert both answers to whole numbers. Write `count_supplies` to return their total. Print a clear sentence with the answer.

**Quick check:** If a function must send a number back so the program can use it in another calculation, should it use `print()` or `return`?

**Completion reflection:** Which part was easiest? Which word or code line would you like explained again?

## Small glossary

| Word | Simple meaning |
| --- | --- |
| Program | Instructions that a computer follows. |
| Output | Information the program shows. |
| Input | Information the learner gives to a program. |
| Variable | A name that holds a value for the program. |
| Value | The information stored under a name, such as text or a number. |
| String (`str`) | Text in a program, written between quotes. |
| Integer (`int`) | A whole number, such as `4` or `25`. |
| Function | A named set of instructions that can be used when needed. |
| Parameter | A named input slot in a function definition. |
| Argument | The value supplied to a function when it is called. |
| Return | Send a value back from a function so the program can use it. |
| F-string | A quoted message that can include variable values. |

## Source review notes

- The lecture PDF and transcript cover first programs, variables, input/output, strings, numbers, functions, and returned values. Later topics in the lecture outline—conditions, loops, exceptions, libraries, tests, files, regular expressions, and objects—are intentionally saved for later weeks.
- The variables, functions, return-value, and side-effect notes informed the sequence and vocabulary. Explanations and examples above are newly written for this classroom.
- The two assignment pages provided examples of text transformation and numeric calculation. This draft uses different, original classroom and supply examples; it does not copy their prompts or test cases.
- The source's VS Code and terminal instructions do not fit the browser-based practice mode, so they are not part of this learner week.
