-- Beginner-friendly Week 2 and Week 3 lessons based on the supplied CS50
-- lecture notes, short transcripts, and practice sets.
DO $$
DECLARE
  v_course_id uuid;
  v_week2_id integer;
  v_week3_id integer;
BEGIN
  SELECT id INTO v_course_id FROM public.courses WHERE slug = 'python-foundations';
  IF v_course_id IS NULL THEN
    RAISE EXCEPTION 'Python Foundations course must exist before Weeks 2 and 3 are added';
  END IF;

  INSERT INTO public.modules
    (course_id, month_number, title, tagline, description, capstone_title,
     is_free, order_index, status)
  VALUES
    (v_course_id, 2, 'Decisions and Text', 'Week 2 · Sessions 1–6',
     'Teach Python to compare values, choose actions, and make simple programs respond to typed answers.',
     'A Helpful Meal and Greeting Guide', false, 2, 'published')
  ON CONFLICT (course_id, month_number, order_index)
  DO UPDATE SET title = EXCLUDED.title, tagline = EXCLUDED.tagline,
                description = EXCLUDED.description, capstone_title = EXCLUDED.capstone_title,
                is_free = EXCLUDED.is_free, status = EXCLUDED.status
  RETURNING id INTO v_week2_id;

  INSERT INTO public.modules
    (course_id, month_number, title, tagline, description, capstone_title,
     is_free, order_index, status)
  VALUES
    (v_course_id, 3, 'Loops and Collections', 'Week 3 · Sessions 1–9',
     'Repeat instructions safely and organize groups of text and values with strings, lists, dictionaries, and tuples.',
     'A Small Classroom Results Book', false, 3, 'published')
  ON CONFLICT (course_id, month_number, order_index)
  DO UPDATE SET title = EXCLUDED.title, tagline = EXCLUDED.tagline,
                description = EXCLUDED.description, capstone_title = EXCLUDED.capstone_title,
                is_free = EXCLUDED.is_free, order_index = EXCLUDED.order_index,
                status = EXCLUDED.status
  RETURNING id INTO v_week3_id;

  WITH lesson_data(session_number, title, analogy, lesson, starter, hints,
                   check_question, check_options, correct_option, explanation) AS (
    VALUES
      (1, 'Make One Decision with if',
       'A classroom door opens only when a simple rule is met. An `if` statement lets a program check a rule before it runs the indented instructions underneath.',
       E'## Goal\nCompare two values and use an `if` statement to run instructions only when a condition is true.\n\n## Plain explanation\nA **condition** is a question Python can answer with `True` or `False`. For example, `temperature > 25` asks whether the temperature is greater than 25. The comparison symbol `>` means “greater than.”\n\nAn `if` statement says: check this condition; if it is true, run the indented lines below it. The colon `:` marks the start of those lines. Indentation means spaces at the beginning of a line; Python uses it to show which instructions belong together.\n\nUse `==` to ask whether two values are equal. A single `=` stores a value in a variable. For example, `score = 10` stores 10; `score == 10` asks a question.\n\n## Everyday example\nIf the classroom is too warm, turn on a fan. If it is not too warm, do nothing.\n\n## Worked example\n```python\ntemperature = 29\n\nif temperature > 25:\n    print("Turn on the fan.")\n```\nPython stores 29 in `temperature`. It checks whether 29 is greater than 25. That is true, so it runs the indented `print()` line. If the value were 20, the condition would be false and Python would skip that line.\n\n## Try it with help\nStore a number of books in `books`. If there are fewer than 3 books, print `Ask the library for more.` Try values of 2 and 5.\n\n## Tiny glossary\n- **Condition:** a question that has a true or false answer.\n- **Boolean:** the value `True` or `False`.\n- **Comparison:** checking how two values relate.\n- **Indentation:** spaces that show which instructions belong inside a block.',
       E'# Check a classroom rule\ntemperature = 29\n\n',
       '["Use == to compare equality; use = to store a value.", "Put a colon at the end of the if line.", "Indent the instruction that should run only when the condition is true."]'::jsonb,
       'Which symbol asks whether two values are equal?',
       '["=", "==", ">"]'::jsonb, 1,
       'Two equal signs, ==, ask Python to compare values. One equal sign assigns or stores a value.'),

      (2, 'Choose Between Paths with elif and else',
       'A traffic light has more than one possible signal. A program can check choices in order and take the first path whose condition is true.',
       E'## Goal\nUse `if`, `elif`, and `else` to choose between several possible actions.\n\n## Plain explanation\n`if` checks the first rule. `elif` means “otherwise, check this next rule.” `else` catches every case that did not match an earlier rule. Python checks from top to bottom and runs only the first matching branch. Each branch starts with a condition and a colon; its instructions are indented underneath.\n\nConditions can compare numbers with `<` (less than), `>` (greater than), `<=` (less than or equal to), `>=` (greater than or equal to), `==` (equal), and `!=` (not equal). The order matters: put the more specific rule first so a broad rule does not catch it too early.\n\n## Everyday example\nA school office checks a visitor''s appointment. If there is an appointment, check them in. If there is no appointment but the person has a delivery, direct them to reception. Otherwise, ask them to wait.\n\n## Worked example\n```python\nbalance = 40\nprice = 25\n\nif balance >= price:\n    print("You can buy the book.")\nelif balance > 0:\n    print("Save a little more first.")\nelse:\n    print("Your balance is empty.")\n```\nThe first condition is true because 40 is at least 25, so Python prints the first message and skips the other branches. Try changing `balance` to 10 and then to 0.\n\n## Try it with help\nStore a person''s age. Print `Child` for ages below 13, `Teenager` for ages from 13 up to 17, and `Adult` for 18 or more. Test 12, 13, 17, and 18.\n\n## Tiny glossary\n- **Branch:** one possible path through a program.\n- **`elif`:** checks another condition when earlier conditions were false.\n- **`else`:** the final path when no earlier condition was true.\n- **At least:** greater than or equal to.',
       E'# Choose what to do with a balance\nbalance = 40\nprice = 25\n\n',
       '["Check the most specific condition first.", "Use <= when the boundary value should be included.", "Python runs only the first branch whose condition is true."]'::jsonb,
       'In an if / elif / else structure, how many branches run in one pass?',
       '["Every branch", "Only the first branch with a true condition", "Only the else branch"]'::jsonb, 1,
       'Python checks branches from top to bottom and runs only the first branch whose condition is true.'),

      (3, 'Combine Rules with and, or, and not',
       'A school trip may require both a permission slip and a packed lunch. A visitor may be admitted with either an appointment or a delivery. These are combined rules.',
       E'## Goal\nCombine simple true-or-false conditions with `and`, `or`, and `not`.\n\n## Plain explanation\n`and` is true only when both conditions are true. `or` is true when at least one condition is true. `not` reverses a result: `not True` is `False`, and `not False` is `True`. These words let a program check more than one part of a rule.\n\nUse parentheses to make a complicated check easier to read. For example, `(age >= 13 and has_ticket) or has_parent` means a person can enter if they are old enough and have a ticket, or if they have a parent with them.\n\n## Everyday example\nA learner can borrow a tablet when they are signed in **and** the tablet is available. The tablet can be returned to the shelf when it is checked in **or** marked as needing repair.\n\n## Worked example\n```python\nsigned_in = True\ntablet_available = False\n\nif signed_in and tablet_available:\n    print("You may borrow the tablet.")\nelse:\n    print("Please ask the teacher for help.")\n```\nAlthough `signed_in` is true, `tablet_available` is false. Because `and` requires both to be true, Python takes the `else` path.\n\n## Try it with help\nPrint `Pack your bag.` when it is a school day **or** a trip day. Add a second rule that says `Bring your permission slip.` only when it is a trip day **and** the slip is not already packed.\n\n## Tiny glossary\n- **`and`:** both conditions must be true.\n- **`or`:** one or both conditions must be true.\n- **`not`:** reverses a true-or-false value.\n- **Parentheses:** group parts of a condition so its meaning is clear.',
       E'# Check two requirements\nsigned_in = True\ntablet_available = False\n\n',
       '["and needs both sides to be true.", "or needs at least one side to be true.", "Use parentheses when grouping several conditions."]'::jsonb,
       'When is a condition joined with and true?',
       '["When both conditions are true", "When either condition is true", "Only when both conditions are false"]'::jsonb, 0,
       'and is true only when the condition on the left and the condition on the right are both true.'),

      (4, 'Clean Typed Text Before Comparing It',
       'A receptionist recognizes the same greeting even if a visitor writes it in capital letters or leaves spaces around it. Programs can clean text before checking it too.',
       E'## Goal\nUse string methods to clean a typed answer, then make a decision based on its text.\n\n## Plain explanation\n`input()` gives your program text. People may type extra spaces or use different capital letters, so clean the answer before comparing it. `.strip()` removes whitespace from the start and end. `.lower()` makes letters lowercase. `.replace(old, new)` makes a new string with matching pieces changed; it does not alter the original string by itself. `.startswith(prefix)` checks whether text begins with a particular piece.\n\nThe dot means “use this tool that belongs to this piece of text.” Parentheses call the tool. You can chain methods: `answer.strip().lower()` strips the ends first, then lowercases the result.\n\n## Everyday example\nWhen a receptionist searches a visitor list, `" HELLO "`, `"Hello"`, and `"hello"` should not cause confusion. Cleaning spaces and letter case makes the comparison dependable.\n\n## Worked example\n```python\ngreeting = input("Greeting: ")\ngreeting = greeting.strip().lower()\n\nif greeting.startswith("hello"):\n    print("$0")\nelif greeting.startswith("h"):\n    print("$20")\nelse:\n    print("$100")\n```\nThe program removes extra outside spaces and uses lowercase letters. It checks `hello` first because every hello greeting also starts with `h`. This is why the order of the conditions matters.\n\nTo accept `forty-two` and `forty two` as the same answer, you could also replace the hyphen with a space: `answer.replace("-", " ")`.\n\n## Try it with help\nAsk for the answer to the Great Question. Remove outside spaces, lowercase it, and print `Yes` for `42`, `forty two`, or `forty-two`; otherwise print `No`.\n\n## Tiny glossary\n- **String:** text stored in a program.\n- **Method:** a tool attached to a value, called with dot notation.\n- **Case-insensitive:** treating uppercase and lowercase letters as equivalent.\n- **Prefix:** text at the beginning of another piece of text.',
       E'# Ask for a greeting\ngreeting = input("Greeting: ")\n\n',
       '["Save the answer from input().", "Use strip() before lower().", "Check startswith(\"hello\") before startswith(\"h\")."]'::jsonb,
       'What does answer.strip().lower() do, in order?',
       '["It removes outside spaces, then makes letters lowercase", "It removes every space, then makes letters uppercase", "It changes the answer into a number"]'::jsonb, 0,
       'strip() removes whitespace at the ends of the text. lower() then makes its letters lowercase.'),

      (5, 'Match a File Name to Its Type',
       'A librarian can sort a document by the ending on its label. A small program can inspect a file name ending and choose a matching description.',
       E'## Goal\nUse text conditions to classify a file name by its ending.\n\n## Plain explanation\nA file extension is the short ending after the last dot in many file names, such as `.pdf` or `.jpg`. `.endswith()` checks whether a string ends with specified text. Make the file name lowercase first so `.PDF` and `.pdf` are treated the same. Then use `if` and `elif` to choose the matching type.\n\nThis program checks the **name** that the learner types. It does not open the file or prove what is inside it. If a file is named `notes.pdf`, the program reports the type associated with that ending.\n\n## Everyday example\nLabels on classroom folders help people find the right shelf. A file ending is a label that helps a computer choose how to treat a file.\n\n## Worked example\n```python\nfile_name = input("File name: ").strip().lower()\n\nif file_name.endswith(".gif"):\n    print("image/gif")\nelif file_name.endswith(".jpg") or file_name.endswith(".jpeg"):\n    print("image/jpeg")\nelif file_name.endswith(".pdf"):\n    print("application/pdf")\nelse:\n    print("application/octet-stream")\n```\nThe answer is cleaned first. Python checks each ending from top to bottom. `or` allows either `.jpg` or `.jpeg` to select the same result. The final `else` handles every ending not listed above.\n\n## Try it with help\nAdd checks for `.png` and `.txt`. Try `picture.PNG`, `report.pdf`, and `notes.doc`.\n\n## Tiny glossary\n- **Extension:** the ending of a file name, often used as a format label.\n- **`.endswith(...)`:** checks whether text has a particular ending.\n- **Default:** the result used when no listed condition matches.',
       E'# Sort a file name by its ending\nfile_name = input("File name: ")\n\n',
       '["Clean the file name with strip() and lower().", "Use the leading dot in endings such as .pdf.", "Use or when two endings share one result."]'::jsonb,
       'Why call lower() before checking a file name ending?',
       '["So .PDF and .pdf are treated the same", "So the file becomes a PDF", "So the dot is removed"]'::jsonb, 0,
       'lower() standardizes letter case, so the program can compare one lowercase version of each extension.'),

      (6, 'Use Decisions in a Meal-Time Guide',
       'A school canteen serves different meals at different times. A program can translate a clock time into a number and check which range contains it.',
       E'## Goal\nConvert a 24-hour time into a decimal number and use conditions to identify a meal time.\n\n## Plain explanation\nText such as `"7:30"` contains a colon between hours and minutes. `.split(":")` separates the text at the colon, producing two pieces: the hour and the minute. `float()` converts digit text into a decimal number. For example, 30 minutes is half an hour, so `7:30` becomes `7 + 30 / 60`, or `7.5`.\n\nThe comparison `7 <= hour <= 8` asks whether the value is from 7 through 8, including both endpoints. A function named `convert()` can hold the time-conversion steps so `main()` stays easier to read.\n\n## Everyday example\nA timetable says breakfast is available from 7:00 to 8:00, including exactly 7:00 and 8:00. The program turns the clock reading into a comparable number before checking that interval.\n\n## Worked example\n```python\ndef convert(time):\n    hours, minutes = time.split(":")\n    return float(hours) + float(minutes) / 60\n\ntime = input("Time: ").strip()\nhour = convert(time)\n\nif 7 <= hour <= 8:\n    print("Breakfast time")\nelif 12 <= hour <= 13:\n    print("Lunch time")\nelif 18 <= hour <= 19:\n    print("Dinner time")\n```\nThe function separates the two parts. `return` sends the converted number back to the line that called `convert()`. The conditions include the start and end of each meal period. This example assumes a correctly formatted 24-hour time.\n\n## Try it with help\nTest `7:00`, `7:30`, `12:42`, `18:32`, and `11:11`. Then, as a stretch task, ask for an arithmetic expression such as `2 * 3` and choose the operation with `if` and `elif`.\n\n## Tiny glossary\n- **Decimal (`float`):** a number that can have a fractional part, such as 7.5.\n- **`.split(...)`:** separates text wherever the chosen separator appears.\n- **Inclusive range:** includes both its lower and upper endpoints.',
       E'# Convert a time and choose a meal\n\ndef convert(time):\n    # Separate hours and minutes, then return a decimal hour\n    pass\n\ntime = input("Time: ")\n',
       '["split(\":\") separates the hours from the minutes.", "There are 60 minutes in one hour.", "Use <= at both ends when the boundary times count."]'::jsonb,
       'How many hours is 30 minutes?',
       '["0.3 hours", "0.5 hours", "30 hours"]'::jsonb, 1,
       'There are 60 minutes in an hour, and 30 divided by 60 is 0.5. So 7:30 is 7.5 hours.')
  ), inserted_sessions AS (
    INSERT INTO public.sessions
      (module_id, session_number, title, analogy_physical, content_markdown,
       starter_code, hints, xp_reward, order_index, duration_minutes, quick_check)
    SELECT v_week2_id, session_number, title, analogy, lesson, starter, hints,
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

  WITH lesson_data(session_number, title, analogy, lesson, starter, hints,
                   check_question, check_options, correct_option, explanation) AS (
    VALUES
      (1, 'Repeat While a Rule Is True',
       'A careful gardener checks soil every day and waters only when it is dry enough. A `while` loop repeats instructions as long as its condition remains true.',
       E'## Goal\nUse a `while` loop to repeat instructions until a condition becomes false.\n\n## Plain explanation\nA `while` loop asks a true-or-false question before each repetition. If the condition is true, Python runs the indented body and then checks again. If it is false, Python moves on. Change something inside the loop so the condition can eventually become false; otherwise the loop may repeat forever. This is called an infinite loop.\n\n## Everyday example\nWhile a cup is not full, keep pouring a little water. Each pour changes the amount in the cup. When it is full, the condition becomes false and you stop.\n\n## Worked example\n```python\nwater = 0\n\nwhile water < 3:\n    print("Pour one cup.")\n    water = water + 1\n\nprint("The jug is ready.")\n```\nPython begins with `water` equal to 0. The loop prints once and adds 1. It repeats for 1 and 2. When `water` reaches 3, `water < 3` is false, so the loop stops and the final message prints.\n\n## Try it with help\nStart `count` at 3. While it is greater than 0, print it and subtract 1. After the loop, print `Go!`.\n\n## Tiny glossary\n- **Loop:** instructions that can run more than once.\n- **Iteration:** one trip through a loop body.\n- **Infinite loop:** a loop whose condition never becomes false.',
       E'# Count down safely\ncount = 3\n\n',
       '["Check the loop condition before each repetition.", "Change count inside the loop.", "If the condition never becomes false, the loop will not stop by itself."]'::jsonb,
       'What must happen for a while loop to stop?',
       '["Its condition must become false", "The print line must be removed", "The variable must become text"]'::jsonb, 0,
       'A while loop repeats while its condition is true. It stops when a later check finds the condition is false.'),

      (2, 'Repeat for Each Item with a for Loop',
       'Instead of writing each invitation by hand, a teacher can keep a guest list and send one invitation to each person. A `for` loop processes each item in a group.',
       E'## Goal\nUse a `for` loop to repeat an action for each item in a sequence or a fixed range of numbers.\n\n## Plain explanation\nA `for` loop takes one item at a time from a group and runs its indented body. The loop variable names the current item. For example, `for name in names:` means “for each name in the names group.”\n\n`range(3)` produces the numbers 0, 1, and 2: it starts at 0 and stops before 3. `range(len(names))` can produce the valid position numbers for a list, but beginners should usually loop over the items directly when the position is not needed.\n\n## Everyday example\nIf a class has a list of students, the teacher can say each student''s name once without copying the same print instruction again and again.\n\n## Worked example\n```python\nnames = ["Mina", "Ali", "Sam"]\n\nfor name in names:\n    print(f"Welcome, {name}!")\n```\nThe first time through, `name` is `"Mina"`; next it is `"Ali"`; then it is `"Sam"`. When there are no more names, the loop ends.\n\n## Try it with help\nCreate a list of three classroom items and print `Please bring: ` followed by each item. Then use `for number in range(1, 4):` to print 1, 2, and 3.\n\n## Tiny glossary\n- **Sequence:** items arranged in an order.\n- **Loop variable:** the name that refers to the current item.\n- **`range(...)`:** a function that produces a sequence of counting numbers.',
       E'# Welcome each learner once\nnames = ["Mina", "Ali", "Sam"]\n\n',
       '["The loop variable changes to the next item on each repetition.", "range(3) gives 0, 1, and 2; it stops before 3.", "Indent the action that should repeat."]'::jsonb,
       'What value does name have during the second pass through the example loop?',
       '["Mina", "Ali", "Sam"]'::jsonb, 1,
       'The loop visits names in order. Mina is first, Ali is second, and Sam is third.'),

      (3, 'Keep an Ordered Group in a List',
       'A shopping list keeps several items together and in order. Python lists do the same for values a program needs to store as a group.',
       E'## Goal\nCreate a list, look up its items by position, and loop through the items.\n\n## Plain explanation\nA list uses square brackets, with commas between its items. A position in a list is called an **index**. Python starts counting indexes at 0: the first item is at index 0, the second at index 1, and so on. `len(items)` tells you how many items are in the list.\n\nLists can hold text, numbers, or other values. A list is useful when your program needs a group of related items, such as the names on a class register.\n\n## Everyday example\nA register is one ordered collection of names. You can check one name by its position or visit each name in turn.\n\n## Worked example\n```python\nsupplies = ["pencils", "books", "erasers"]\nprint(supplies[0])\n\nfor item in supplies:\n    print(f"Bring {item}.")\n```\n`supplies[0]` asks for the first item, `"pencils"`. The loop then visits every item. The square brackets in `supplies[0]` are for selecting a position; the square brackets that create the list surround the whole group.\n\n## Try it with help\nMake a list with three favorite subjects. Print the number of subjects with `len()`, then use a loop to print each subject.\n\n## Tiny glossary\n- **List:** an ordered, changeable group of values.\n- **Index:** the number used to select an item''s position.\n- **`len(...)`:** tells how many items are in a group.',
       E'# Make a list of classroom supplies\nsupplies = ["pencils", "books", "erasers"]\n\n',
       '["The first list index is 0.", "Use len(supplies) to count the items.", "A for loop can visit every list item without an index."]'::jsonb,
       'What is the index of the first item in a Python list?',
       '["0", "1", "The list length"]'::jsonb, 0,
       'Python begins list indexes at 0, so index 0 refers to the first item.'),

      (4, 'Add, Remove, and Change List Items',
       'A classroom supply list changes when new pencils arrive or a broken item is removed. List methods let a program change a list while it runs.',
       E'## Goal\nUse common list methods to add, remove, and reorder items.\n\n## Plain explanation\nA **method** is a tool attached to a value. `items.append(value)` adds one item at the end. `items.extend(more_items)` adds each item from another group. `items.remove(value)` removes the first matching value. `items.pop()` removes and gives back the last item. `items.insert(index, value)` places an item at a chosen position. `items.reverse()` reverses the order.\n\nMethods with the same general name can behave differently for different kinds of values. Here, each method belongs to the list named before the dot. Most of these methods change that list directly.\n\n## Everyday example\nWhen a learner borrows a book, the library can add their name to a borrowing list. When the book is returned, the program removes the name from the list.\n\n## Worked example\n```python\nborrowed = ["Python Basics", "Story Book"]\nborrowed.append("Space Atlas")\nborrowed.remove("Story Book")\nlast_book = borrowed.pop()\nprint(borrowed)\nprint(f"Returned: {last_book}")\n```\nAppend adds `Space Atlas`. Remove deletes `Story Book`. Pop removes the final item and stores it in `last_book`, so the program can use that returned value afterward.\n\n## Try it with help\nStart with a list of three chores. Append a new chore, remove one, and print the final list. As a challenge, use `pop()` and print the chore it removed.\n\n## Tiny glossary\n- **Append:** add one item to the end of a list.\n- **Remove:** delete the first matching item.\n- **Pop:** remove an item and give it back to the program.',
       E'# Update a reading list\nbooks = ["Python Basics", "Story Book"]\n\n',
       '["append adds one item to the end.", "remove searches for a matching value.", "pop removes an item and also returns it."]'::jsonb,
       'What does items.pop() do when it has no position number?',
       '["Removes and returns the last item", "Adds an item at the start", "Sorts the list"]'::jsonb, 0,
       'With no index supplied, pop() removes the last list item and returns that item.'),

      (5, 'Clean and Inspect Text with String Methods',
       'A sign-up form may contain names with extra spaces or different capitalization. String methods help prepare text so a program can use it consistently.',
       E'## Goal\nClean text, change its capitalization, replace characters, and test what it contains.\n\n## Plain explanation\nText is stored as a string. String methods are tools that create a cleaned or changed string. `.strip()` removes whitespace at the ends. `.lower()` and `.upper()` change letter case. `.title()` capitalizes words for display. `.replace(old, new)` returns text with matching parts replaced. `.isalpha()` asks whether every character is a letter; `.isdigit()` asks whether every character is a digit.\n\nThese methods usually return a new string. To keep the result, save it: `clean_name = name.strip().title()`. A `for` loop can also visit one character at a time in a string.\n\n## Everyday example\nWhen writing a name on a certificate, clean stray spaces and use consistent capitalization. Before accepting a code, check whether it contains only letters or digits as required.\n\n## Worked example\n```python\nraw_name = "  aLI  "\nname = raw_name.strip().title()\nmessage = "Welcome, " + name\nshort_message = message.replace("Welcome", "Hello")\nprint(short_message)\n```\n`strip()` removes outside spaces. `title()` changes the result to `Ali`. `replace()` makes a new message with `Welcome` changed to `Hello`; it does not change `message` itself.\n\n## Try it with help\nAsk for a short message. Make a second version in lowercase, replace every space with an underscore, and report whether the original message contains only letters using `.isalpha()`.\n\n## Tiny glossary\n- **String method:** a text tool used with dot notation.\n- **Whitespace:** spaces and other spacing characters.\n- **Character:** one letter, digit, space, or symbol in text.',
       E'# Clean and change a name\nraw_name = "  aLI  "\n\n',
       '["Methods are called with a dot, such as name.strip().", "Save a returned string if you want to keep it.", "Spaces are characters too, so text with spaces is not all letters."]'::jsonb,
       'Does message.replace("Welcome", "Hello") change message itself?',
       '["Yes, it always changes the original string", "No, it returns a new string", "It removes every letter"]'::jsonb, 1,
       'String methods such as replace() return a new string. Assign the result to a name if you want to keep it.'),

      (6, 'Select a Character or a Slice of Text',
       'A printed ticket has numbered character positions. Python can use an index to read one character or a slice to copy a section of text.',
       E'## Goal\nRead characters and take a slice from a string using indexes.\n\n## Plain explanation\nA string is an ordered sequence of characters. Like list indexes, string indexes start at 0. If `word = "PYTHON"`, then `word[0]` is `"P"`. A slice such as `word[1:4]` starts at index 1 and stops before index 4, producing `"YTH"`. The stop position is left out of the result.\n\nUse `len(word)` to find the number of characters. A slice is useful for inspecting part of an entry, but a loop is often easier when you need to inspect every character. Do not ask for an index beyond the end of the string.\n\n## Everyday example\nThe characters in a library card code have positions. Reading the first two characters or checking the ending is like looking at a short part of that code.\n\n## Worked example\n```python\ncode = "CS50P"\nfirst_two = code[0:2]\nlast_character = code[4]\nprint(first_two)\nprint(last_character)\n```\nThe first slice includes positions 0 and 1, but stops before 2. Position 4 is the fifth character because counting begins at 0.\n\n## Try it with help\nAsk for a word. Print its first character, its first two characters, and its length. Then use a loop to print each character on its own line.\n\n## Tiny glossary\n- **Index:** a position number in a string or list.\n- **Slice:** a new section selected from a sequence.\n- **Stop position:** the index where a slice ends, which is not included.',
       E'# Read part of a class code\ncode = "CS50P"\n\n',
       '["Indexes begin at 0.", "A slice stops before its ending index.", "Use len(text) to find how many characters it has."]'::jsonb,
       'What text does "PYTHON"[1:4] produce?',
       '["PYT", "YTH", "THO"]'::jsonb, 1,
       'The slice starts at index 1 and stops before index 4, so it contains Y, T, and H.'),

      (7, 'Look Up Related Information with a Dictionary',
       'A classroom contact book connects each person''s name to information such as their favorite subject. A dictionary stores these key-and-value pairs.',
       E'## Goal\nCreate a dictionary, look up values by key, and visit its entries.\n\n## Plain explanation\nA dictionary stores pairs: a **key** that identifies information and a **value** stored under that key. Write dictionaries with curly braces, a colon between each key and value, and commas between pairs. A key is like a label on a drawer; the value is what you find inside.\n\nUse `student["subject"]` to get the value for a key. If a key may be missing, `student.get("subject", "not listed")` gives a fallback instead of stopping with a key error. A `for` loop can visit keys; `.items()` lets a loop receive each key and value together.\n\n## Everyday example\nA small classroom directory maps each learner''s name to their favorite subject. Finding a person''s subject is faster than searching a long unrelated list.\n\n## Worked example\n```python\nlearner = {"name": "Mina", "subject": "science"}\nprint(learner["name"])\nprint(learner.get("age", "not listed"))\n\nfor key, value in learner.items():\n    print(f"{key}: {value}")\n```\nThe first lookup prints Mina. There is no `age` key, so `get()` uses the fallback text. The loop visits each stored pair in turn.\n\n## Try it with help\nCreate a dictionary for a book with keys `title`, `author`, and `pages`. Print its title, then loop through all key-and-value pairs.\n\n## Tiny glossary\n- **Dictionary:** a collection that connects keys to values.\n- **Key:** the label used to find a value.\n- **Value:** the information stored under a key.\n- **Key error:** an error caused by asking for a key that is not present.',
       E'# Record facts about one learner\nlearner = {"name": "Mina", "subject": "science"}\n\n',
       '["Use curly braces and a colon between a key and its value.", "Use get() if a key may be missing.", "Use items() when you need both each key and its value."]'::jsonb,
       'What can dictionary.get("age", "not listed") return when age is missing?',
       '["It stops the program with a key error", "The fallback text not listed", "The dictionary key itself"]'::jsonb, 1,
       'get() returns its fallback value when the requested key is not present.'),

      (8, 'Group a Fixed Set of Values with a Tuple',
       'A location on a map can be recorded as one fixed pair: latitude and longitude. A tuple groups values that belong together and are not meant to be changed item by item.',
       E'## Goal\nRecognize a tuple and use it to keep a small fixed group of values together.\n\n## Plain explanation\nA tuple is an ordered group, commonly written with parentheses and commas. For example, `("Monday", 8)` can represent a day and a room number. Like strings and lists, tuples have positions that begin at index 0. Unlike lists, a tuple is not meant to be changed after it is created.\n\nUse a list when the group needs to grow or change. Use a tuple when the values form one fixed record. Python also uses tuples behind the scenes when a loop unpacks two values, such as the key and value from a dictionary''s `.items()`.\n\n## Everyday example\nA printed timetable entry has a fixed day and room. Keeping those two facts together helps avoid mixing the room number from one class with the day from another.\n\n## Worked example\n```python\nclass_time = ("Monday", "Room 4")\nday = class_time[0]\nroom = class_time[1]\nprint(f"The class meets on {day} in {room}.")\n```\nThe tuple has two values. Index 0 selects the day; index 1 selects the room. The code reads the tuple without trying to replace its contents.\n\n## Try it with help\nCreate a tuple containing a book title and its author. Read and print each part using its index. Then explain why a changeable to-do list is better stored as a list.\n\n## Tiny glossary\n- **Tuple:** an ordered group of values that is usually kept fixed.\n- **Immutable:** not changeable item by item after creation.\n- **Unpack:** give the parts of a group their own variable names.',
       E'# Keep a fixed class time together\nclass_time = ("Monday", "Room 4")\n\n',
       '["Tuple positions, like list positions, begin at 0.", "Use a list when items need to change.", "A tuple keeps a small fixed group together."]'::jsonb,
       'Which group is usually the better choice for a to-do list that changes?',
       '["A tuple", "A list", "A string method"]'::jsonb, 1,
       'A list is changeable, so it is better for a group where tasks will be added or removed.'),

      (9, 'Build a List with a Comprehension',
       'A teacher can copy every name from a class register onto a new list while changing each one to title case. A comprehension describes that repeated transformation in one short expression.',
       E'## Goal\nRead a list comprehension and use one to transform a group of values.\n\n## Plain explanation\nA list comprehension is a compact way to make a new list from an existing group. It includes the value to make, a `for` loop that names each current item, and optionally an `if` condition that filters items. Learn the ordinary loop first; a comprehension is a shortcut for a pattern you already understand.\n\nFor example, `[name.title() for name in names]` means: make a new list containing `name.title()` for each `name` in `names`. Adding `if len(name) > 3` keeps only names longer than three characters. Learn the ordinary loop first; a comprehension is a shortcut for a pattern you already understand.\n\nA dictionary comprehension follows the same idea but creates a key and a value for each item. For example, `{name: len(name) for name in names}` makes a dictionary where each name is a key and the number of letters in that name is its value. `len(...)` counts how many characters are in the text.\n\n## Everyday example\nIf a class register contains names typed with uneven capitalization, a new cleaned list can be prepared without changing the original register.\n\n## Worked example\n```python\nnames = ["mina", "ALI", "samuel"]\nclean_names = [name.title() for name in names]\nlong_names = [name for name in clean_names if len(name) > 3]\nprint(clean_names)\nprint(long_names)\n```\nThe first comprehension makes a title-cased copy. The second keeps only names whose length is greater than 3. Read it from left to right: result value, item source, and optional filter.\n\n## Try it with help\nUse a regular `for` loop to make a list of doubled numbers. Then write the same transformation as a comprehension. Add a filter to keep only numbers greater than 5.\n\n## Tiny glossary\n- **Comprehension:** a short expression that builds a collection from existing items.\n- **Transform:** make a changed version of a value.\n- **Filter:** keep only items that pass a condition.',
       E'# Build a clean list from existing names\nnames = ["mina", "ALI", "samuel"]\n\n',
       '["Read a comprehension as result for each item in a group.", "Learn the normal for loop first.", "An if condition can filter which values are included."]'::jsonb,
       'In [name.title() for name in names], what does name.title() describe?',
       '["The value added to the new list for each name", "The name of the list method", "A condition that stops the loop"]'::jsonb, 0,
       'The expression before for is the value created for each item; here it is the title-cased version of each name.')
  ), inserted_sessions AS (
    INSERT INTO public.sessions
      (module_id, session_number, title, analogy_physical, content_markdown,
       starter_code, hints, xp_reward, order_index, duration_minutes, quick_check)
    SELECT v_week3_id, session_number, title, analogy, lesson, starter, hints,
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
