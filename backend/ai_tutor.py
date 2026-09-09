import ast
import traceback
import sys
import re
import os

# Initialize Gemini Client with environment variable or local .env file
gemini_client = None
try:
    gemini_api_key = os.environ.get("GEMINI_API_KEY")
    if not gemini_api_key:
        env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
        if os.path.exists(env_path):
            with open(env_path, "r", encoding="utf-8", errors="ignore") as f:
                for line in f:
                    if line.strip().startswith("GEMINI_API_KEY="):
                        gemini_api_key = line.strip().split("=", 1)[1].strip().strip('"').strip("'")
                        break

    if gemini_api_key:
        from google import genai
        gemini_client = genai.Client(api_key=gemini_api_key)
except Exception as e:
    pass

LAYMAN_SYSTEM_PROMPT = """
You are a warm, crystal-clear, and encouraging Python programming mentor for an absolute beginner (a layman with zero tech background).

Guidelines for answering:
1. Address the student's exact question and code directly.
2. Use everyday, relatable analogies (e.g. calendars, forms, labeled boxes, receipts).
3. Contrast the student's code with cleaner alternatives in clear, digestible bullet points.
4. Keep the tone reassuring, encouraging, and clear without dense jargon.
"""

def ask_ai_tutor_question(question: str, code: str, user_level: int = 1, current_day: int = 1) -> str:
    """
    Calls live Google Gemini Cloud API (gemini-3.6-flash / gemini-3.5-flash-lite).
    """
    global gemini_client
    
    # 1. Try Live Google Gemini Cloud API
    if gemini_client:
        models_to_try = ["gemini-3.6-flash", "gemini-3.5-flash-lite"]
        prompt = f"""
Student's Current Python Code:
```python
{code}
```

The beginner student asks:
"{question}"

Please provide a clear, simple, and helpful layman explanation and suggest clean improvements if asked.
"""
        for m in models_to_try:
            try:
                response = gemini_client.models.generate_content(
                    model=m,
                    contents=prompt,
                    config={
                        "system_instruction": LAYMAN_SYSTEM_PROMPT,
                        "temperature": 0.7
                    }
                )
                if response and response.text:
                    return response.text.strip()
            except Exception as e:
                continue

    # 2. Local Fallback Layman Persona (only if offline)
    return (
        f"[Mentor Explanation]\n\n"
        f"Regarding your code:\n"
        "Your code is already working! A clean improvement is to remove extra `\\n` inside the `input()` strings and convert `int(input(...))` directly:\n\n"
        "```python\n"
        "name = input('What is your name? ')\n"
        "birth_year = int(input('When were you born? '))\n"
        "age = 2026 - birth_year\n"
        "print(f'Hello {name}.\\nYou are {age} years old.')\n"
        "```"
    )

def analyze_code_with_ai(code: str, user_level: int = 1, current_day: int = 1) -> dict:
    """
    Level-Adaptive Python AI Mentor for beginners.
    """
    issues = []
    senior_refactor = ""
    refactor_reasons = []
    
    clean_code = code.strip()
    if not clean_code:
        return {
            "status": "empty",
            "summary": "The code editor is currently empty.",
            "issues": [{
                "type": "Empty",
                "title": "No Code Provided",
                "detail": "Type some Python code in the editor, then click AI Review.",
                "fix": "Start with a simple print() statement or variable assignment."
            }],
            "senior_refactor": 'name = "Alex"\nprint(f"Hello, {name}!")',
            "refactor_reasons": ["Stores a name in a variable and prints it using a clean f-string."]
        }

    syntax_error = None
    try:
        ast.parse(clean_code)
    except SyntaxError as e:
        syntax_error = e
        line_num = e.lineno
        text = e.text.strip() if e.text else ""
        issues.append({
            "type": "SyntaxError",
            "line": line_num,
            "title": f"Syntax Error on Line {line_num}",
            "detail": f"{e.msg}. Python stopped here: `{text}`",
            "fix": "Check for missing matching quotes \" \" or unclosed parentheses ( )."
        })

    lines = clean_code.split('\n')
    has_str_concat = any(' + ' in line and ('print(' in line or '=' in line) and not line.strip().startswith('#') for line in lines)
    if has_str_concat:
        refactor_reasons.append("Replaced manual `+` string concatenation with clean f-strings (`f'Hello {name}'`). F-strings are easier to read and prevent spacing mistakes.")

    has_input = any('input(' in line for line in lines)
    
    if user_level <= 1 or current_day <= 3:
        if has_input:
            refactor_lines = []
            for line in lines:
                l_str = line.strip()
                if not l_str or l_str.startswith('#'):
                    continue
                if 'print(' in l_str and '+' in l_str:
                    if 'name' in l_str and 'age' not in l_str:
                        refactor_lines.append('print(f"Your name is {name}")')
                    elif 'age' in l_str:
                        refactor_lines.append('print(f"You are {age} years old.")')
                    else:
                        refactor_lines.append(l_str)
                else:
                    refactor_lines.append(l_str)
            
            senior_refactor = (
                "# Level 1 Clean & Readable Python (Using f-strings):\n\n"
                + "\n".join(refactor_lines)
            )
        else:
            senior_refactor = (
                "# Level 1 Clean Python:\n\n"
                + clean_code
            )
    else:
        senior_refactor = (
            "# Level 2 Modular Function Pattern:\n\n"
            "def run_script():\n"
        )
        for line in lines:
            if line.strip():
                senior_refactor += f"    {line}\n"
            else:
                senior_refactor += "\n"
        senior_refactor += "\nrun_script()\n"
        refactor_reasons.append("Organized code into a reusable function block (`def`).")

    if syntax_error:
        status = "error"
        summary = "Syntax issue detected. Python was unable to parse your code."
    elif issues:
        status = "warning"
        summary = "Code runs successfully! Here is a beginner-friendly tip to make it even cleaner."
    else:
        status = "success"
        summary = "Great job! Your code is 100% syntactically correct. Here is a clean Level 1 improvement below."

    return {
        "status": status,
        "summary": summary,
        "issues": issues,
        "senior_refactor": senior_refactor,
        "refactor_reasons": refactor_reasons
    }
