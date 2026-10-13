-- Expand Week 1 lesson text for learners who are new to programming.
-- Keep the lesson titles and quick checks; clarify the language and add concrete examples.
UPDATE public.sessions s
SET content_markdown = lesson.content
FROM public.modules m
CROSS JOIN (VALUES
(1, $lesson$
## Goal
Run a short Python program, display a message, and save text under a variable name.

## Plain explanation
A **program** is a set of instructions for a computer. Python reads those instructions from the first line to the last line. `print(...)` asks Python to show something on the screen. The parentheses hold what `print` should show, and quotation marks tell Python that words are text.

A **variable** is a name that lets the program remember a value. In `student_name = "Sam"`, the left side, `student_name`, is the variable name. The right side, `"Sam"`, is the value. The equals sign stores the value under that name; here it does not mean “is equal to” as it does in a maths question.

## Worked example
```python
print("Welcome to Python!")

student_name = "Sam"
print(student_name)
```
The first line displays the words `Welcome to Python!`. The blank line is only there to make the code easier to read. The third line remembers the text `Sam` under the name `student_name`. The last line displays the remembered value. Notice there are no quotation marks around `student_name` in the last line: Python looks up the variable instead of printing its name literally.

## Try it with help
Replace `Sam` with your own name, keeping the quotation marks. Then create `favorite_subject = "Science"` and use `print(favorite_subject)` to display it. Try removing the quotes once and run the code: Python will look for a variable called `Science`, which has not been created.

## Tiny glossary
- **Program:** instructions a computer follows.
- **Code:** the instructions written in a programming language.
- **Output:** information the program displays.
- **Variable:** a name that remembers a value.
- **Value:** the information stored under a name.
- **String (`str`):** text, written between quotation marks in Python code.$lesson$),
(2, $lesson$
## Goal
Ask the learner a question, keep the answer as text, clean extra spaces, and use the answer in a reply.

## Plain explanation
`input("What is your name? ")` displays the question inside the parentheses, then waits for an answer supplied to the program. In this browser classroom, first type the answer in **Answers for `input()` questions** below the editor, then choose **Run code**. Put one answer on each line, in the order the questions appear. For this example, enter `Amina` on the first line. The browser runner uses that prepared answer when Python reaches `input()`; it cannot pause the running program and open a live typing box.

The result of `input()` is text, which Python calls a **string**. Even if you type `12`, Python initially treats those two digit characters as text, like a word on paper. This is useful for names and other words; a later lesson shows how to convert digit text into a number for arithmetic.

An **f-string** is a text message with an `f` placed immediately before its opening quote, as in `f"Hello, {name}!"`. The braces `{}` mean “put the current value of this variable here.” If `name` contains `Amina`, Python builds the text `Hello, Amina!`. Without the `f`, Python would show the braces and the word `name` literally.

`name.strip()` calls the `strip` method on the text stored in `name`. A **method** is an operation that belongs to a value; the dot connects the value to that operation, and `()` tells Python to perform it. `strip()` removes whitespace only from the two ends. Whitespace includes spaces and line breaks. It does not remove spaces between words.

## Worked example
```python
name = input("What is your name? ")
name = name.strip()
print(f"Hello, {name}!")
```
Before running, enter `  Amina  ` (with spaces) in the first answer line. `input()` saves that answer in `name`; `strip()` changes it to `Amina`; the f-string inserts that cleaned value into the greeting. The terminal shows the question and echoes the answer as if you typed it, then shows the greeting on the next line: `What is your name?   Amina` followed by `Hello, Amina!`.

## `strip()` examples
```python
"  Amina  ".strip()       # gives "Amina"
"  Python class".strip()  # gives "Python class"
"Python class".strip()   # still gives "Python class"
```
The spaces at the beginning and end disappear. The space between `Python` and `class` stays. `strip()` returns cleaned text; assigning it back with `name = name.strip()` replaces the old value in `name` with the cleaned one.

## Try it with help
Ask two questions, one for a learner's name and one for a favorite subject. Add two answer lines below the editor, such as `Amina` and `Science`. Clean the name with `.strip()` and print one friendly f-string containing both variables.

## Tiny glossary
- **Input:** information supplied to a program.
- **String (`str`):** text that a program can store.
- **F-string:** a quoted text message beginning with `f`; `{variable_name}` inserts that variable's current value.
- **Method:** an operation attached to a value and called with a dot, such as `.strip()`.
- **Whitespace:** spaces, tabs, or line breaks.
- **Prompt:** the question or instruction shown to ask for input.$lesson$),
(3, $lesson$
## Goal
Turn digit text from an answer into a whole number, then do arithmetic with it.

## Plain explanation
`input()` always gives the program text. If the learner types `12`, the value is the text `"12"`, not the number `12`. Python keeps these types separate: text is for words and labels, while numbers can be added and multiplied mathematically.

`int(...)` converts text made of whole-number digits into an **integer**, which is a whole number without a decimal part. For example, `int("12")` gives the number `12`. The learner must type digits that form a valid whole number; `int("twelve")` causes an error because those letters do not describe digits Python can convert. A decimal such as `2.5` uses `float(...)` instead.

## Worked example
```python
notebooks = int(input("How many notebooks are on the desk? "))
more_notebooks = 3
total = notebooks + more_notebooks
print(f"There are {total} notebooks.")
```
Before running, enter a whole number such as `12` in the answer box. First Python asks for input and receives the text `"12"`; `int(...)` converts it to the number `12`. The next line stores the number `3`. The plus sign adds the two numbers, and `total` remembers the result, `15`. The f-string places that result in the displayed sentence.

## Try it with help
Ask how many pencils are in a box. Convert the answer with `int(input(...))`, add `5`, and print the new total. Enter a digit answer such as `7` in Program inputs before running; the result should say there are 12 pencils.

## Tiny glossary
- **Convert:** change a value from one type into another.
- **Integer (`int`):** a whole number such as `4`, `0`, or `25`.
- **Float (`float`):** a number that can have a decimal part, such as `2.5`.
- **Arithmetic:** maths such as addition (`+`) and multiplication (`*`).$lesson$),
(4, $lesson$
## Goal
Create a named set of instructions (a function), give it information, and run it more than once.

## Plain explanation
A **function** is a named group of instructions that Python can run when asked. `def` begins a function definition. The function name below is `welcome`. Parentheses after the name hold its inputs, and the colon `:` marks the start of the instructions inside the function.

The indented line is the function body: it belongs to the function. Indentation means spaces at the beginning of a line; Python uses it to see which lines are grouped together. Here, `name` is a **parameter**, a named slot that receives information each time the function runs. Calling `welcome("Mina")` supplies `"Mina"` as an **argument**, the actual value for that slot. The same instructions can then be called with a different argument.

## Worked example
```python
def welcome(name):
    print(f"Welcome to class, {name}!")

welcome("Mina")
welcome("Ali")
```
Defining the function describes what it should do; it does not display anything yet. The first call runs its indented instruction with `name` holding `Mina`. The second call runs the same instruction with `name` holding `Ali`.

## Try it with help
Define `show_subject(subject)` with an indented line that prints `I like {subject}.` using an f-string. Then call it twice, each time with a different subject in quotation marks. Keep the four spaces before the instruction inside the function.

## Tiny glossary
- **Function:** named instructions that can be run when needed.
- **Define:** write down what a function should do.
- **Call:** ask a defined function to run.
- **Parameter:** a named input slot in a function definition.
- **Argument:** the value supplied to a parameter in a function call.
- **Indentation:** spaces at the start of a line that show it belongs to a code group.$lesson$),
(5, $lesson$
## Goal
Use `return` to send a function's result back to its caller, then combine input, conversion, variables, and a function in a small project.

## Plain explanation
`print(...)` displays information for a person to read. `return` does a different job: it sends a value out of a function back to the line that called the function. That line can store the value, use it in more arithmetic, or display it later. A returned value is not automatically shown on screen.

In the example, `count_supplies(12, 8)` calls the function. The function adds its two parameters and returns `20`. The assignment stores that returned number in `total_items`. The final `print(...)` displays a sentence containing the saved result. If the function used `print(notebooks + pencils)` instead, it would show the total, but it would not hand the total back for the caller to save and reuse.

## Worked example
```python
def count_supplies(notebooks, pencils):
    return notebooks + pencils

total_items = count_supplies(12, 8)
print(f"The class has {total_items} supplies.")
```

## Week project: Classroom Supply Counter
Ask how many notebooks and pencils are needed. For each question, enter one answer per line in Program inputs before running. Convert each answer using `int(input(...))`, because the answers begin as text and addition needs numbers. Define `count_supplies(notebooks, pencils)` so it returns their sum. Call the function with the two saved numbers, store what it returns, and use an f-string with `print()` to show a clear result.

## Tiny glossary
- **Return:** send a value from a function back to the line that called it.
- **Caller:** the line of code that asks a function to run.
- **Reuse:** use a saved value or the same function again.

## Reflection
Which part felt easiest? Which word or code line would you like explained again?$lesson$)
) AS lesson(session_number, content)
WHERE s.module_id = m.id
  AND m.course_id = (SELECT id FROM public.courses WHERE slug = 'python-foundations')
  AND m.month_number = 1
  AND s.session_number = lesson.session_number;

UPDATE public.sessions s
SET starter_code = E'# Ask a question and save the answer\nname = input("What is your name? ")\n\n# Remove spaces at the start and end\nname = name.strip()\n\n# Put the answer into a friendly message\nprint(f"Hello, {name}!")'
FROM public.modules m
WHERE s.module_id = m.id
  AND m.course_id = (SELECT id FROM public.courses WHERE slug = 'python-foundations')
  AND m.month_number = 1
  AND s.session_number = 2;
