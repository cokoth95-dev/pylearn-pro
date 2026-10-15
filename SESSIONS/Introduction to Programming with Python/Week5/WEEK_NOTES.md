# Week 5: Reusing code with Python libraries

**Status: compiled for teaching; not yet marked as taught.**

## What learners should be able to do

Learners should understand that a library is code they can reuse, import a built-in module, use a random choice or number, install and import a small outside package, read command-line arguments, and recognize how an API can provide data to a program.

Use a familiar connection: a library is like a toolbox made by other people. Instead of building a random-number generator, a text-art printer, or an internet request from scratch, a programmer learns how to use the tool and checks its instructions. Explain the difference between Python's built-in modules and separately installed packages before showing commands.

## Suggested lesson order

1. **Import a Built-In Module** — explain what a module is and use `import random` with `random.choice(...)`. Show that `random.choice` means “use the `choice` tool from the `random` module.”
2. **Add Chance with the `random` Module** — use `random.randint(...)`, `random.choice(...)`, and a tiny guessing activity. Clarify that a random result can repeat and that a few coin flips need not be evenly split.
3. **Install and Import an Outside Package** — distinguish an installed package from a module name used in `import`. Use a small local example such as `emoji` or `pyfiglet`, and show installation in a terminal. Do not ask a learner to install both packages just to understand the idea.
4. **Read Command-Line Arguments** — explain that a command-line argument is extra text supplied when starting a program, such as `python greet.py Mina`. Use `sys.argv` to inspect the words and `sys.exit(...)` to end with a helpful message when an argument is missing or invalid.
5. **Read Structured Data from an API** — explain API, internet request, and JSON with everyday comparisons. Demonstrate a small response using sample data first. If using a live API, keep the request on a trusted server and keep API keys private; never place a real key in browser code or lesson starter code.
6. **Keep Library-Based Programs Readable** — put imports at the top, use clear names, format output deliberately, and use a short function when it gives a task a clear name. Connect style to helping a classmate read and maintain the program.

## Practice assignment map

| Assignment | Ideas it practices | Suggested placement |
| --- | --- | --- |
| Guessing Game | `random.randint`, loops, comparisons, and re-prompting | After lessons 1–2 and Week 4 input validation |
| Little Professor | random numbers, functions, rounds, checking answers, and score keeping | Guided project after lessons 1–2; it combines many earlier ideas |
| Emojize | install/import a package and transform text | After lesson 3; provide package setup or a browser-safe alternative |
| Frank, Ian and Glen’s Letters | third-party `pyfiglet` package, command-line arguments, and argument validation | After lessons 3–4 |
| Adieu, Adieu | collect names, handle end-of-input, and join a list with natural-language punctuation | After Week 3 lists/loops; use an `inflect` package only after explaining that it is an outside package |
| Bitcoin Price Index | command-line number, HTTP request, JSON, decimal arithmetic, and API key handling | Advanced extension after lessons 4–5. Use a safe sample response in browser lessons; never ask students to paste a real API key into shared code |

## Teaching reminders

- `import random` makes the module available; `random.choice(names)` calls one function from it.
- `pip install ...` is a terminal command for installing a package. `import ...` is Python code that uses an installed module. A package name and an import name can differ.
- `sys.argv` is a list of words supplied when the program starts. The program name is usually the first item, so user arguments begin at index 1.
- An API is a documented way for one program to request information or an action from another program. JSON is a text format for structured information, often using dictionaries and lists.
- A live API can change, be unavailable, or require a key. Teach the concept with a saved example response before relying on a live service.
- Style is about making code easier for people to read. It does not change what the program does, but it makes errors easier to find and teamwork easier.
