# Week 9: Organizing Programs with Classes and Objects

## What learners should know first

Learners should be able to write functions, use dictionaries and lists, and understand that a value can be passed into a function. A class groups data and actions that belong together.

## Lesson sequence

1. **Describe a Class and Create an Object** — A class is a plan for a kind of thing; an object is one specific thing made from that plan. Create a simple `Student` class and make two student objects.
2. **Store Each Object's Information** — Introduce instance variables: values that belong to one object. Explain `self` as Python's way to refer to the particular object currently being used. Show that changing one object's name does not change another object's name.
3. **Write Methods for an Object** — A method is a function defined in a class. Use a `CookieJar` with `deposit`, `withdraw`, and `__str__`; explain that methods use `self` to read or update the jar's own cookie count.
4. **Check Rules When an Object Is Created or Changed** — Use `__init__` to set up a new object and validate its starting values. Raise a clear `ValueError` when a rule is broken, connecting this to Week 4 exceptions.
5. **Share Information Across a Class** — Compare instance variables with class variables. An instance variable belongs to one object; a class variable is shared as a setting or counter by the class. Introduce a `@classmethod` only through a concrete example and explain the `cls` parameter.

## Everyday connections

A class is like a cookie-jar design; each actual jar has its own number of cookies. The design describes what a jar can do, while each object remembers its own count. A school-wide passing score could be shared by all student records, while each student's name is individual.

## Supplied practice

- **Cookie Jar** — Build a class that tracks cookie capacity and current cookies. Validate capacity and prevent depositing or withdrawing beyond allowed amounts.
- **Seasons of Love** — Convert a date into the number of minutes since birth. This is a date/time and formatting exercise; it can be solved with functions and does not require forcing a class into the solution.
- **CS50 Shirtificate** — Extend the Week 7 Pillow task by drawing a name onto an image. This requires local image files and Pillow; teach it as an applied extension.

## Beginner support

Do not introduce classes as a requirement for every program. First show the same data in separate variables or a dictionary, then point out how a class keeps related information and actions together. Explain every appearance of `self`, and compare two objects explicitly. Keep inheritance and advanced design patterns out of this introduction.

## Vocabulary

- **Class:** a definition that describes data and actions for a kind of object.
- **Object / instance:** one specific value created from a class.
- **Attribute / instance variable:** information stored on an object.
- **Method:** a function that belongs to a class.
- **`self`:** the parameter Python uses to identify the current object in an instance method.
- **Class variable:** a value shared by instances of the class.
- **Class method:** a method that receives the class itself, commonly written with `@classmethod`.
