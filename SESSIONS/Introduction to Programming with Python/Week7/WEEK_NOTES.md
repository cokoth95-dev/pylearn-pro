# Week 7: Working with Files and Structured Data

## What learners should know first

Learners should be comfortable with variables, functions, loops, lists, dictionaries, and handling errors. This week moves from information typed into a program to information saved in files.

## Lesson sequence

1. **Open and Read a Text File** — Explain that a file is saved information that can be read again later. Introduce `open`, read mode (`"r"`), and `with`, which closes the file safely when the indented block ends. Use a small `names.txt` example and explain each line.
2. **Write and Append to a File** — Compare write mode (`"w"`, which replaces existing contents) with append mode (`"a"`, which adds to the end). Warn learners to choose deliberately; show a tiny example and read it back.
3. **Turn CSV Rows into Data** — Explain CSV as a plain-text table: commas separate fields and each line is usually a row. Use Python's `csv` module and `csv.DictReader` so headings such as `name` and `house` can be used as keys. Use `newline=""` when opening CSV files for writing.
4. **Transform Data and Save a New File** — Read a source CSV, create a destination file, and write the converted rows. Teach the idea of preserving the original input, checking column names, and reporting a clear error when the file is missing.
5. **Use a Library to Edit an Image** — Introduce Pillow as an external package for opening and changing images. Demonstrate the idea of opening an image, applying one simple transformation, and saving a copy. Explain that `pip install pillow` is a terminal command and image files must be available to the local program.

## Everyday connections

A text file is like a notebook a program can reopen. A CSV is like a spreadsheet exported as a simple table. A transformed output file is like making a cleaned copy of a class register while keeping the original safe.

## Supplied practice

- **Lines of Code** — Count nonblank, noncomment lines in a Python file. Explain that comments begin with `#`, and blank lines contain no visible characters.
- **Pizza Py** — Read CSV rows and format them as a table. It also practices command-line arguments, checking whether the right number of arguments was supplied, and the outside `tabulate` package. Install packages from a terminal with `python -m pip install tabulate`; a browser editor may not have that package or terminal access.
- **Scourgify** — Read a CSV, rearrange names into separate fields, and write a new CSV. This combines reading, string splitting, and writing.
- **CS50 P-Shirt** — Use Pillow to place an overlay on a supplied image. Treat this as a local-computer extension because the browser practice editor cannot access arbitrary local image files or install Pillow.

## Beginner support and environment notes

First practice with short text typed into the editor, then with a provided sample file. The in-browser editor may not provide a normal project folder or uploaded input files; learners should use a local Python setup for file paths, multiple files, CSV inputs, and Pillow. Teach relative paths from the program's working folder and show how to keep sample inputs beside the script. Do not imply `open()` can access files that the browser runner has not been given.

## Vocabulary

- **File:** saved information with a name, such as `notes.txt`.
- **File path:** the location and name Python uses to find a file.
- **Mode:** what Python is allowed to do when opening a file, such as read, write, or append.
- **CSV:** a text format commonly used to store rows and columns.
- **Header:** the first CSV row when it names the columns.
- **Library/package:** reusable code someone else has written; Pillow is an image package.
