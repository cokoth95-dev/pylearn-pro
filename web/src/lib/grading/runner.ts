export type RunnerResult = {
  stdout: string
  stderr: string
  exitCode: number | null
  timedOut: boolean
}

type RunnerResponse = { results?: RunnerResult[] }

export async function runPythonCases(code: string, inputs: string[]): Promise<RunnerResult[]> {
  const runnerUrl = process.env.PYTHON_RUNNER_URL?.replace(/\/$/, '')
  const runnerToken = process.env.PYTHON_RUNNER_TOKEN
  if (!runnerUrl || !runnerToken) throw new Error('PYTHON_RUNNER_NOT_CONFIGURED')

  const response = await fetch(runnerUrl, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${runnerToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      language: 'python',
      version: '3.12',
      files: [{ name: 'main.py', content: code }],
      tests: inputs.map((stdin, index) => ({ id: index, stdin, timeout_ms: 3000 })),
    }),
    signal: AbortSignal.timeout(20000),
    cache: 'no-store',
  })

  if (!response.ok) throw new Error(`PYTHON_RUNNER_FAILED_${response.status}`)
  const raw = await response.text()
  if (raw.length > 1_000_000) throw new Error('PYTHON_RUNNER_RESPONSE_TOO_LARGE')

  let result: RunnerResponse
  try {
    result = JSON.parse(raw) as RunnerResponse
  } catch {
    throw new Error('PYTHON_RUNNER_INVALID_RESPONSE')
  }

  if (!Array.isArray(result.results) || result.results.length !== inputs.length) {
    throw new Error('PYTHON_RUNNER_INVALID_RESPONSE')
  }

  return result.results.map((item) => {
    if (
      typeof item?.stdout !== 'string' ||
      typeof item?.stderr !== 'string' ||
      !(typeof item.exitCode === 'number' || item.exitCode === null) ||
      typeof item.timedOut !== 'boolean'
    ) throw new Error('PYTHON_RUNNER_INVALID_RESPONSE')
    return {
      stdout: item.stdout.slice(0, 65536),
      stderr: item.stderr.slice(0, 4000),
      exitCode: item.exitCode,
      timedOut: item.timedOut,
    }
  })
}
