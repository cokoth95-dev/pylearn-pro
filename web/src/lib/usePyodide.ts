"use client"

import { useEffect, useRef, useState } from 'react'

declare global {
  interface Window {
    loadPyodide: any
    pyodide: any
  }
}

interface PyodideResult {
  stdout: string
  stderr: string
  executionTime: number
}

export function usePyodide() {
  const [isReady, setIsReady] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const pyodideRef = useRef<any>(null)

  useEffect(() => {
    const loadPyodideScript = async () => {
      if (typeof window === 'undefined') return

      if (!window.loadPyodide) {
        const script = document.createElement('script')
        script.src = 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js'
        script.async = true
        script.onload = async () => {
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

  const runPython = async (
    code: string,
    inputs: string[] = []
  ): Promise<PyodideResult> => {
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
      // Set up standard input and output interception
      pyodide.globals.set('__input_queue__', inputs)
      
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

# Override input() to read from our simulated input queue
_inputs_iter = iter(__input_queue__)
def custom_input(prompt=""):
    if prompt:
        custom_out.write(str(prompt))
    try:
        return next(_inputs_iter)
    except StopIteration:
        return ""

__builtins__.input = custom_input

try:
    exec(${JSON.stringify(code)}, {})
except Exception as e:
    import traceback
    custom_err.write(traceback.format_exc())
finally:
    sys.stdout = sys_stdout_backup
    sys.stderr = sys_stderr_backup

final_stdout = custom_out.get_output()
final_stderr = custom_err.get_output()
`
      await pyodide.runPythonAsync(runnerCode)

      const stdout = pyodide.globals.get('final_stdout') || ''
      const stderr = pyodide.globals.get('final_stderr') || ''
      const executionTime = Number(((performance.now() - startTime) / 1000).toFixed(3))

      return { stdout, stderr, executionTime }
    } catch (err: any) {
      const executionTime = Number(((performance.now() - startTime) / 1000).toFixed(3))
      return {
        stdout: '',
        stderr: err.message || 'Execution error in Python runtime.',
        executionTime
      }
    }
  }

  return { isReady, isLoading, runPython }
}
