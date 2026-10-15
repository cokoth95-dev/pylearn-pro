# Week 3: Repeating actions and working with groups of data

**Status: compiled for teaching; not yet marked as taught.**

## What learners should be able to do

By the end of this week, learners should be able to repeat an instruction safely, work through a group of values, change or inspect text, store related information, and recognize a shorter way to build a list after understanding the longer loop form.

Week 3 depends on Week 1 variables, strings, input, functions and arithmetic, and Week 2 comparisons and conditions. Introduce each new structure using a familiar object: a repeated countdown, a class list, a labelled contact card, or a fixed set of coordinates.

## Suggested lesson order

1. **Repeat While a Rule Is True** — explain a loop as instructions repeated while a true-or-false question stays true. Update the counter inside the loop and show how that makes the loop stop.
2. **Repeat for Each Item with a `for` Loop** — visit one item at a time in a group. Introduce `range()` as a way to produce a counting sequence, and show its stopping point is not included.
3. **Keep an Ordered Group in a List** — create a list, use square brackets, and read an item by its position. Explain that Python starts counting positions at zero.
4. **Add, Remove, and Change List Items** — demonstrate `.append()`, `.remove()` and changing an item by position. Connect these actions to updating a shopping list or class register.
5. **Clean and Inspect Text with String Methods** — demonstrate methods such as `.lower()`, `.upper()`, `.title()`, `.strip()`, and `.replace()` with visible before-and-after values.
6. **Select a Character or a Slice of Text** — index one character and slice out part of a string. Explain start and stop positions and that the stop position is left out.
7. **Look Up Related Information with a Dictionary** — connect a key and value to a labelled record, such as a food name and its calories. Show adding and retrieving a value by key.
8. **Group a Fixed Set of Values with a Tuple** — show a tuple as an ordered group used for values that belong together and should normally stay fixed, such as an RGB color or map coordinate.
9. **Build a List with a Comprehension** — first build the same result with an ordinary `for` loop, then show the shorter comprehension and read each part in order. Treat this as a compact notation, not a replacement for understanding loops.

The supplied lecture and short videos include more list, dictionary, and string methods than a beginner needs to memorize. Teach the specific methods used in the exercises, and keep the rest as reference material for later practice.

## Practice assignment map

| Assignment | Ideas it practices | Suggested placement |
| --- | --- | --- |
| Coke Machine | Repeatedly accept coins, update a total, stop at a target, and calculate change | After lessons 1–2 and Week 2 conditions |
| Just setting up my twttr | Visit text characters and omit selected vowels | After lessons 2, 5 and 6; first practice the loop on a short word |
| camelCase | Inspect characters, detect uppercase letters and build changed text | After lessons 2, 5 and 6; use as guided string practice |
| Nutrition Facts | Look up a food in a mapping and retrieve its calories | After lesson 7; discuss what should happen for an unrecognized food |
| Vanity Plates | Combine conditions, string inspection, positions, and character checks | Stretch assignment after lessons 2, 5 and 6; work through one rule at a time |

## Teaching reminders

- Trace a loop by hand with a tiny example. Write the variable value before and after each repetition.
- Explain the difference between a list's position (an index) and the value stored there.
- Show method calls with concrete output. For example, `"  Mina  ".strip()` becomes `"Mina"`; `.strip()` removes spaces at the two ends, not spaces between words.
- For string slicing, use a short labelled word and point out which positions are included.
- In dictionaries, explain that a key is the label used for a lookup and a value is the information found under that label.
- Mention that tuples are introduced for recognition and simple use; learners do not need to choose tuples over lists without a clear reason yet.
- Introduce comprehensions only after the equivalent regular loop is understood.
