import sys
import subprocess
import tempfile
import os
import time
import re

def clean_stdout_output(raw_stdout: str, code: str) -> str:
    """
    Strips out question prompts emitted by Python input(...) calls from stdout 
    so the final terminal screen shows only clean output results.
    """
    if not raw_stdout:
        return ""
        
    prompts = re.findall(r'input\s*\(\s*(?:["\'](.*?)["\'])?\s*\)', code, re.DOTALL)
    cleaned = raw_stdout
    for p in prompts:
        if p:
            p_clean = p.replace('\\n', '\n').replace('\\t', '\t')
            cleaned = cleaned.replace(p_clean, '')
            cleaned = cleaned.replace(p, '')
            
    # Clean up leading empty lines left behind by stripped prompts
    cleaned_lines = [line for line in cleaned.splitlines() if line.strip() or line == '']
    return "\n".join(cleaned_lines).strip()

def run_code(code: str, user_inputs: str = "", timeout_sec: int = 10) -> dict:
    """
    Executes Python code in a separate subprocess and captures stdout, stderr, and execution time.
    Supports feeding simulated or terminal user inputs (for input() calls) safely without EOFError.
    """
    start_time = time.time()
    
    input_count = code.count("input(")
    
    if user_inputs and user_inputs.strip():
        if "\n" in user_inputs:
            input_lines = user_inputs.strip().split("\n")
        elif "," in user_inputs:
            input_lines = [item.strip() for item in user_inputs.split(",")]
        else:
            input_lines = [user_inputs.strip()]
    else:
        input_lines = []

    default_fallbacks = ["Alex", "25", "Python", "100", "Data", "True"]
    while len(input_lines) < max(input_count, 1):
        idx = len(input_lines)
        input_lines.append(default_fallbacks[idx % len(default_fallbacks)])

    stdin_data = "\n".join(input_lines) + "\n"

    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False, encoding='utf-8') as f:
        f.write(code)
        temp_file = f.name
        
    try:
        python_exe = sys.executable
        result = subprocess.run(
            [python_exe, temp_file],
            input=stdin_data,
            capture_output=True,
            text=True,
            timeout=timeout_sec
        )
        elapsed = round(time.time() - start_time, 3)

        raw_stdout = result.stdout or ""
        clean_stdout = clean_stdout_output(raw_stdout, code) if input_count > 0 else raw_stdout

        return {
            "success": result.returncode == 0,
            "stdout": clean_stdout,
            "stderr": result.stderr or "",
            "exit_code": result.returncode,
            "execution_time": elapsed
        }
    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "stdout": "",
            "stderr": f"Execution timed out after {timeout_sec} seconds. Check for infinite loops.",
            "exit_code": -1,
            "execution_time": timeout_sec
        }
    except Exception as e:
        return {
            "success": False,
            "stdout": "",
            "stderr": f"System execution error: {str(e)}",
            "exit_code": -1,
            "execution_time": 0.0
        }
    finally:
        if os.path.exists(temp_file):
            try:
                os.remove(temp_file)
            except:
                pass
