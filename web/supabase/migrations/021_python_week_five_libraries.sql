-- Beginner-friendly Week 5 lessons on reusable Python libraries.
DO $$
DECLARE
  v_course_id uuid;
  v_module_id integer;
BEGIN
  ALTER TABLE public.modules
    DROP CONSTRAINT IF EXISTS modules_month_number_check;
  ALTER TABLE public.modules
    ADD CONSTRAINT modules_month_number_check CHECK (month_number BETWEEN 1 AND 10);

  SELECT id INTO v_course_id FROM public.courses WHERE slug = 'python-foundations';
  IF v_course_id IS NULL THEN
    RAISE EXCEPTION 'Python Foundations course must exist before Week 5 is added';
  END IF;

  INSERT INTO public.modules
    (course_id, month_number, title, tagline, description, capstone_title,
     is_free, order_index, status)
  VALUES
    (v_course_id, 5, 'Libraries and Reusable Code', 'Week 5 · Sessions 1–6',
     'Reuse built-in and outside Python tools, use randomness, accept command-line information, and understand API data safely.',
     'A Helpful Randomized Study Tool', false, 5, 'published')
  ON CONFLICT (course_id, month_number, order_index)
  DO UPDATE SET title = EXCLUDED.title, tagline = EXCLUDED.tagline,
                description = EXCLUDED.description, capstone_title = EXCLUDED.capstone_title,
                is_free = EXCLUDED.is_free, order_index = EXCLUDED.order_index,
                status = EXCLUDED.status
  RETURNING id INTO v_module_id;

  WITH lesson_data(session_number, title, analogy, lesson, starter, hints,
                   check_question, check_options, correct_option, explanation) AS (
    VALUES
      (1, 'Import a Built-In Module',
       'A toolbox gives you tools that someone has already made. A Python module is a file of reusable tools that your program can import when it needs them.',
       $w5l1$## Goal
Explain what a module is and use `import` to call a function from a built-in module.

## Plain explanation
Python includes modules: files that collect useful code. A **library** is a group of reusable tools; a **module** is commonly one Python file that provides some of those tools. For example, the `random` module provides functions for making random selections.

Write `import random` near the top of the program to make the module available. Then call one of its functions with the module name, a dot, the function name, and parentheses: `random.choice(...)`. The dot connects a tool to the module that provides it. This also makes the source of the function clear to someone reading your code.

## Everyday example
A toolbox can contain a screwdriver and a measuring tape. You do not need to build those tools before using them; you learn which tool is useful and how to handle it. A module works similarly for code.

## Worked example
```python
import random

classmates = ["Mina", "Ali", "Sam"]
picked_name = random.choice(classmates)
print(picked_name)
```
Python loads the `random` module. `random.choice(classmates)` selects one item from the list, and the program stores that result in `picked_name`. The result can be different each time the program runs.

## Try it with help
Create a list of three lunch choices. Import `random`, choose one item, and print a message that names the selected lunch.

## Tiny glossary
- **Library:** reusable code made available to programs.
- **Module:** a Python file that provides related functions or other tools.
- **Import:** make a module or a name from it available in your program.
- **Function:** a named action that can receive information and produce a result.$w5l1$,
       E'# Choose a study break
import random

break_ideas = ["Stretch", "Drink water", "Rest your eyes"]
',
       '["Put import statements near the top of the file.", "Use random.choice(list_name) to choose one item.", "Store the returned choice if you want to use it again."]'::jsonb,
       'In random.choice(choices), what does random identify?',
       '["The module that provides choice", "The list position", "The item selected by the user"]'::jsonb, 0,
       'random is the module name. The dot shows that choice is a function provided by that module.'),

      (2, 'Add Chance with the random Module',
       'A board game may use a die to choose how many spaces a player moves. The random module can select a number or item for a small game.',
       $w5l2$## Goal
Use `random.randint(...)` and `random.choice(...)` to add a chance-based result to a program.

## Plain explanation
The `random` module includes different ways to make a choice. `random.randint(1, 6)` returns an integer from 1 through 6, including both ends. `random.choice(items)` returns one item from a list or another sequence.

Random does not promise a perfect pattern in a small number of tries. If you toss a coin five times, you might get heads four times. Over many tries the results may become closer to an even split, but short runs can vary.

## Everyday example
A classroom can use a die to choose a student number for a turn. The number is selected by chance, and the same student could be selected again on a later roll.

## Worked example
```python
import random

roll = random.randint(1, 6)
print(f"The die shows {roll}.")
```
The number 1 and the number 6 are both possible. Each time the program runs, Python makes a new selection.

## Try it with help
Choose a random number from 1 through 10. Then make a list with three after-school activities and choose one at random. Run the program a few times and describe what changes.

## Tiny glossary
- **Random:** selected by chance rather than by a fixed order.
- **Inclusive:** includes the first and last values in a range.
- **`randint(start, end)`:** choose a whole number from start through end, including both.$w5l2$,
       E'# Roll one die
import random

roll = random.randint(1, 6)
',
       '["randint includes both its first and last number.", "The result is stored in roll.", "A random result can repeat on another run."]'::jsonb,
       'Can random.randint(1, 6) return 6?',
       '["Yes, both ends are included", "No, the end is always excluded", "Only when the program runs twice"]'::jsonb, 0,
       'randint includes both boundary numbers, so 1 and 6 can both be returned.'),

      (3, 'Install and Import an Outside Package',
       'A special kitchen appliance may not come with a basic kitchen. You can get it separately and then learn how to use it.',
       $w5l3$## Goal
Distinguish Python code from a separately installed package and use a package after it is installed.

## Plain explanation
Python comes with many modules, such as `random`. A **third-party package** is extra code published by another person or group. A package often needs to be installed once in the Python environment before a program can import and use it.

In a terminal, `python -m pip install emoji` asks Python's package installer, `pip`, to download the `emoji` package. That command is not Python code to type into the editor. After installation, Python code can say `import emoji` and call a function from the package. The package name and its import name are often similar, but sometimes they differ.

## Everyday example
A phone may include a clock app, while a photo editor is installed separately. Both can be used once available, but they arrived on the phone in different ways.

## Worked example
```python
import emoji

message = emoji.emojize("Hello :thumbs_up:")
print(message)
```
First install the package in a terminal with `python -m pip install emoji`. Then run the Python program. The package recognizes the written code `:thumbs_up:` and replaces it with the matching emoji.

## Try it with help
With the package installed, emojize a message that contains `:earth_africa:`. If the package is not installed, read the error and explain why the program cannot import it yet.

## Tiny glossary
- **Third-party:** made available by people outside the core Python installation.
- **Package:** downloadable code that can add features to Python.
- **`pip`:** the tool commonly used to install Python packages.
- **Environment:** the Python installation and packages available to a program.$w5l3$,
       E'# Use an installed package
# After installing with: python -m pip install emoji
import emoji

message = emoji.emojize("Hello :thumbs_up:")
',
       '["Run the pip install command in a terminal, not as a Python statement.", "Import the package in the Python file.", "An import error can mean the package is not installed in this environment."]'::jsonb,
       'Where should python -m pip install emoji be entered?',
       '["In a terminal", "Inside a print() call", "As a dictionary key"]'::jsonb, 0,
       'pip is a separate terminal tool. The Python program uses import emoji after the package is installed.'),

      (4, 'Read Command-Line Arguments',
       'When ordering a meal, you can give the restaurant your choices before it begins preparing the order. Command-line arguments provide starting information when a program launches.',
       $w5l4$## Goal
Read a word supplied when the program starts and stop with a helpful message when it is missing.

## Plain explanation
A **command line** is a text-based way to start a program and give it information. For example, `python greet.py Mina` starts `greet.py` and supplies the word `Mina` as an argument.

The `sys` module provides `sys.argv`, a list of the words used to start the program. `sys.argv[0]` is usually the program file name. The user's first argument is at position 1. Check the list length before reading position 1 so the program does not crash when the user forgets the name.

`sys.exit("message")` stops the program and can display a useful error message. Use it when the supplied information does not match what the program requires.

## Everyday example
A parcel label needs a recipient name before a delivery can be made. The program can check for that name at startup and explain what is missing if no name was supplied.

## Worked example
```python
import sys

if len(sys.argv) != 2:
    sys.exit("Usage: python greet.py name")

name = sys.argv[1]
print(f"Hello, {name}!")
```
With `python greet.py Mina`, the list contains the program name and `Mina`, so its length is 2. With no name, the length is 1 and the program exits before trying to read a missing list item.

## Try it with help
Write a program that expects one color after its filename and prints it. Try starting it with and without a color. Show a helpful usage message for the missing color.

## Tiny glossary
- **Command line:** a text area where commands can start programs.
- **Argument:** information supplied to a program when it starts.
- **`sys.argv`:** the list of command-line words.
- **`sys.exit(...)`:** stop a program, optionally with a message.$w5l4$,
       E'# Read one name supplied at startup
import sys

',
       '["Check len(sys.argv) before reading an argument.", "The program name is at index 0.", "The first user value is at index 1."]'::jsonb,
       'In sys.argv, where is the first user-supplied argument?',
       '["Index 0", "Index 1", "The last index is always 10"]'::jsonb, 1,
       'Index 0 holds the program name. The first extra word is at index 1.'),

      (5, 'Request Data from an API',
       'A library card catalog answers a request for information about a book. An API is a set of agreed ways for programs to request information from another service.',
       $w5l5$## Goal
Explain an API and JSON, and read a simple structured response from a web service.

## Plain explanation
An **API** (Application Programming Interface) is a documented way for one program to ask another program for information or an action. A program can send an internet request to a service and receive a response.

Many APIs return **JSON**, a text format for organized data. JSON objects use braces and named keys, much like a Python dictionary. A response might contain `{"price": "38000.5"}`. Python can read that information as a dictionary and convert the price text to a number for a calculation.

The `requests` package can send a web request, and its response can be converted from JSON into Python data. A real service might be slow, unavailable, changed, or require a key. A private key is like a password: do not put it in a public code file or browser lesson. Use a saved example response when teaching the basic steps.

## Everyday example
A weather app asks a weather service for today's forecast. The service sends back organized information, and the app chooses which pieces to show on screen.

## Worked example
```python
response_data = {"price": "38000.5"}
price = float(response_data["price"])
print(f"The sample price is ${price:,.2f}.")
```
This example uses saved sample data so it works without internet access or a key. The value under `price` is text, so `float()` changes it to a decimal number before formatting it.

## Try it with help
Change the sample price to `42000.25`. Read it from the dictionary, convert it to a decimal number, and print it with two digits after the decimal point. Point out which part would be different if the data came from a live API.

## Tiny glossary
- **API:** a documented way for programs to communicate.
- **Request:** a message asking a service for information or an action.
- **JSON:** a text format that organizes data with objects and lists.
- **API key:** a secret value used to identify or authorize a request.$w5l5$,
       E'# Read a saved API-style response
response_data = {"price": "38000.5"}

',
       '["JSON keys can be read like dictionary keys.", "Convert numeric text before doing arithmetic.", "Never put a private API key into shared browser code."]'::jsonb,
       'Why does the example convert the price with float()?',
       '["The saved value is text but a calculation needs a number", "JSON only stores lists", "float() sends an internet request"]'::jsonb, 0,
       'The JSON-style response stores the price as text. float() converts it to a decimal number so arithmetic and numeric formatting can use it.'),

      (6, 'Make Library-Based Code Easy to Read',
       'A clear instruction card helps another person use a tool without guessing. Readable code helps another programmer understand how a library is being used.',
       $w5l6$## Goal
Organize imports, choose clear names, and format output so another person can follow a short library-based program.

## Plain explanation
Code is written for people as well as for Python. Two programs can produce the same answer while one is much easier to read. Put imports near the top, use names that describe values, and give each step enough space to see where it begins and ends.

Python community style guidance recommends consistent indentation, readable line lengths, and lowercase words separated by underscores for ordinary variable and function names. A useful function name says what action it performs. These choices do not change the program's result; they make it easier to review, explain, and maintain.

Formatting also helps a result make sense. For example, a price is easier to read with a currency sign and two digits after the decimal point. Decide what the user needs to see, then format the output to match.

## Everyday example
A shared class notebook is easier to use when headings, dates, and labels follow the same pattern. Consistent code style helps classmates recognize the parts of a program quickly.

## Worked example
```python
import random

activities = ["Read", "Draw", "Walk"]
chosen_activity = random.choice(activities)
print(f"Your activity: {chosen_activity}")
```
The import is easy to find, the list name describes its contents, and the selected value has its own clear name. The output also labels the result so the reader knows what was selected.

## Try it with help
Improve the names and spacing in a short program that selects a random snack. Then add a label to the printed result. Explain how the changes help a classmate understand the code.

## Tiny glossary
- **Style:** conventions that make code easier for people to read.
- **Readable:** clear enough that another person can follow it.
- **Maintain:** understand, correct, and improve a program over time.
- **PEP 8:** a widely used guide to Python code style.$w5l6$,
       E'# Choose a random activity clearly
import random

activities = ["Read", "Draw", "Walk"]
',
       '["Put imports near the top.", "Use a name that explains what a variable contains.", "Label output so a person knows what the value means."]'::jsonb,
       'Which variable name is easiest to understand?',
       '["x", "chosen_activity", "temp2"]'::jsonb, 1,
       'chosen_activity describes the value stored there, so a reader does not need to guess what x or temp2 means.')
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
