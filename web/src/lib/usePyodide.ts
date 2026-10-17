"use client"

import { useEffect, useRef, useState } from 'react'

declare global {
  interface Window {
    loadPyodide?: (options: { indexURL: string }) => Promise<PyodideInstance>
    pyodide?: PyodideInstance
  }
}

interface PyodideInstance {
  globals: {
    set: (name: string, value: unknown) => void
    get: (name: string) => unknown
    delete: (name: string) => void
  }
  runPythonAsync: (code: string) => Promise<unknown>
}

interface PyodideResult {
  stdout: string
  stderr: string
  executionTime: number
}

export function usePyodide() {
  const [isReady, setIsReady] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const pyodideRef = useRef<PyodideInstance | null>(null)

  useEffect(() => {
    const loadPyodideScript = async () => {
      if (typeof window === 'undefined') return

      if (!window.loadPyodide) {
        const script = document.createElement('script')
        script.src = 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js'
        script.async = true
        script.onload = async () => {
          try {
            const loadPyodide = window.loadPyodide
            if (!loadPyodide) throw new Error('Python runtime loaded without its initializer.')
            const pyodideInstance = await loadPyodide({
              indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/'
            })
            pyodideRef.current = pyodideInstance
            window.pyodide = pyodideInstance
            setIsReady(true)
            setIsLoading(false)
          } catch (err) {
            console.error('Failed to initialize Pyodide instance:', err)
            setIsLoading(false)
          }
        }
        document.body.appendChild(script)
      } else if (!pyodideRef.current) {
        try {
          const pyodideInstance = await window.loadPyodide({
            indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/'
          })
          pyodideRef.current = pyodideInstance
          window.pyodide = pyodideInstance
          setIsReady(true)
          setIsLoading(false)
        } catch (err) {
          console.error('Failed to initialize Pyodide instance:', err)
          setIsLoading(false)
        }
      }
    }

    loadPyodideScript()
  }, [])

  const runPython = async (code: string): Promise<PyodideResult> => {
    if (!pyodideRef.current) {
      return {
        stdout: '',
        stderr: 'Python WebAssembly runtime is initializing. Please wait a moment...',
        executionTime: 0
      }
    }

    const pyodide = pyodideRef.current
    const startTime = performance.now()

    try {
      // Let Python's input() call the browser prompt with its own question.
      // A null result means the learner pressed Cancel; an empty string is a valid answer.
      pyodide.globals.set('__browser_prompt__', (message: string) => window.prompt(message))
      
      const runnerCode = `
import sys
import io

class WebStdout:
    def __init__(self):
        self.content = []
    def write(self, s):
        self.content.append(s)
    def flush(self):
        pass
    def get_output(self):
        return "".join(self.content)

sys_stdout_backup = sys.stdout
sys_stderr_backup = sys.stderr
custom_out = WebStdout()
custom_err = WebStdout()
sys.stdout = custom_out
sys.stderr = custom_err

# Give each run its own input() implementation so we do not change Python's
# shared builtins for later runs.
import builtins as _builtins
def custom_input(prompt=""):
    answer = __browser_prompt__(str(prompt))
    if answer is None:
        raise EOFError("Input was cancelled.")
    # Show the question and answer in Output after the browser dialog closes.
    if prompt:
        custom_out.write(str(prompt))
    custom_out.write(str(answer) + "\\n")
    return str(answer)

__user_builtins__ = dict(vars(_builtins))
__user_builtins__["input"] = custom_input
__user_globals__ = {"__name__": "__main__", "__builtins__": __user_builtins__}

try:
    exec(${JSON.stringify(code)}, __user_globals__)
except Exception as e:
    import traceback
    custom_err.write(traceback.format_exc())
finally:
    sys.stdout = sys_stdout_backup
    sys.stderr = sys_stderr_backup

final_stdout = custom_out.get_output()
final_stderr = custom_err.get_output()
`
      try {
        await pyodide.runPythonAsync(runnerCode)
      } finally {
        pyodide.globals.delete('__browser_prompt__')
      }

      const stdoutValue = pyodide.globals.get('final_stdout')
      const stderrValue = pyodide.globals.get('final_stderr')
      const stdout = typeof stdoutValue === 'string' ? stdoutValue : ''
      const stderr = typeof stderrValue === 'string' ? stderrValue : ''
      const executionTime = Number(((performance.now() - startTime) / 1000).toFixed(3))

      return { stdout, stderr, executionTime }
    } catch (err: unknown) {
      const executionTime = Number(((performance.now() - startTime) / 1000).toFixed(3))
      return {
        stdout: '',
        stderr: err instanceof Error ? err.message : 'Execution error in Python runtime.',
        executionTime
      }
    }
  }

  return { isReady, isLoading, runPython }
}
