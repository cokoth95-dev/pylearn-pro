# Week 8: Finding Patterns in Text with Regular Expressions

## What learners should know first

Learners should know strings, conditions, functions, and basic error handling. A regular expression is a pattern that describes which text is accepted; it is useful for checking formats, but it is not a substitute for explaining every rule in plain language.

## Lesson sequence

1. **Describe a Text Pattern** — Start with exact text and simple choices such as `a|b`. Introduce `re.search` as finding a match somewhere in text and `re.fullmatch` as requiring the entire string to fit the pattern.
2. **Match Digits and Repeated Characters** — Explain `\d` as one digit, `\d{4}` as exactly four digits, and `+` as one or more repetitions. Use raw strings such as `r"\d+"` so backslashes are easier to read.
3. **Capture Parts of a Match** — Use parentheses to group and capture parts, then explain that `group(1)` is the first captured part. Work through one small example slowly and show the actual groups.
4. **Check a Format and Explain the Result** — Use `re.fullmatch` to check a simple format, then return a clear yes/no result. Compare a valid and invalid example and state which rule each one meets or breaks.
5. **Build a Validator from Small Rules** — Combine checks only after learners can explain them separately. A validator should have a readable name, clear conditions, and ordinary test examples; avoid presenting a dense pattern as magic.

## Everyday connections

A regex resembles a form's format rule: a class code may need two letters followed by four digits. Matching tells us whether the characters follow that shape; it does not prove the code belongs to a real class.

## Supplied practice

- **Working 9 to 5** — Convert a range such as `9 AM to 5 PM` to 24-hour time. Teach the input format first, then parse and validate it; a regex can help recognize the shape, while conversion logic handles the clock values.
- **NUMB3RS** — Recognize an IPv4-looking address. Explain that checking four groups of digits is only the first step; each group must also be between 0 and 255.
- **Regular, um, Expressions** — Count instances of `um` as a word, not as letters inside another word. Show how word boundaries affect matching.
- **Response Validation** — Check whether an email address has a syntactically acceptable shape using an external validation package. The assignment specifically does not use `re` and does not check whether the email domain really exists. This is a useful comparison: some tasks are clearer with a purpose-built library than with a hand-written regex.
- **Watch on YouTube** — Extract a video identifier from a supplied URL format. Explain that a pattern recognizing an ID is not the same as contacting YouTube or confirming the video exists.

## Beginner support

Teach one symbol at a time and keep a small pattern beside matching examples. Introduce `re.fullmatch` for whole-input validation to avoid confusion about partial matches. Let learners test inputs that differ by one character. Add flags such as `re.IGNORECASE` only when a lesson needs them.

## Vocabulary

- **Regular expression (regex):** a written pattern used to search or check text.
- **Match:** text that satisfies a pattern.
- **Capture group:** a parenthesized part of a pattern whose matched text can be retrieved.
- **Escape:** a backslash that gives a character a special meaning, for example `\d` for a digit.
- **Validation:** checking input against stated rules.
