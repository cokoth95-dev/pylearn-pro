import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { runPythonCases } from '@/lib/grading/runner'

export const maxDuration = 30

type TestCase = { input?: unknown; expected?: unknown; description?: unknown }
type GradingData = {
  assignment_id: number
  session_id: number
  title: string
  instructions: string
  max_score: number
  is_required: boolean
  public_tests: TestCase[]
  hidden_tests: TestCase[]
}

function outputForCompare(value: string) {
  return value.replace(/\r\n/g, '\n').trimEnd()
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ assignmentId: string }> },
) {
  if (request.headers.get('origin') !== request.nextUrl.origin) {
    return NextResponse.json({ error: 'Request origin is not allowed.' }, { status: 403 })
  }
  if (process.env.TRUSTED_GRADING_ENABLED !== 'true') {
    return NextResponse.json({
      error: 'Trusted grading is paused. Use the browser practice check; this request did not save a score or progress.',
      mode: 'browser-practice',
    }, { status: 503 })
  }

  const rawBody = await request.text()
  if (rawBody.length > 30000) {
    return NextResponse.json({ error: 'Submission is too large.' }, { status: 413 })
  }

  let payload: { code?: unknown }
  try {
    payload = JSON.parse(rawBody) as { code?: unknown }
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 })
  }

  if (typeof payload.code !== 'string' || payload.code.trim().length === 0 || payload.code.length > 20000) {
    return NextResponse.json({ error: 'Submit Python code between 1 and 20,000 characters.' }, { status: 400 })
  }

  const { assignmentId: rawId } = await context.params
  if (!/^\d+$/.test(rawId) || Number(rawId) < 1) {
    return NextResponse.json({ error: 'Assignment not found.' }, { status: 404 })
  }
  const assignmentId = Number(rawId)

  try {
    const userClient = await createClient()
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user || !user.email_confirmed_at) {
      return NextResponse.json({ error: 'Sign in with a verified email to submit work.' }, { status: 401 })
    }

    const { data: profile } = await userClient.from('profiles').select('role').eq('id', user.id).maybeSingle()
    if (profile?.role !== 'student') {
      return NextResponse.json({ error: 'Only learner accounts can submit assignments.' }, { status: 403 })
    }

    // This learner-scoped read enforces course enrollment and module access through RLS.
    const { data: visibleAssignment, error: accessError } = await userClient
      .from('assignments').select('id').eq('id', assignmentId).maybeSingle()
    if (accessError || !visibleAssignment) {
      return NextResponse.json({ error: 'Assignment is not available to this account.' }, { status: 404 })
    }

    const admin = createAdminClient()
    if (!process.env.PYTHON_RUNNER_URL || !process.env.PYTHON_RUNNER_TOKEN) {
      return NextResponse.json({ error: 'The secure Python grader has not been connected yet.' }, { status: 503 })
    }
    const { data: hasGradingSlot, error: limitError } = await admin.rpc('consume_assignment_grading_slot', {
      p_student_id: user.id,
    })
    if (limitError) {
      console.error('Unable to verify grading request limit', limitError.message)
      return NextResponse.json({ error: 'The grader is not ready. Please try again shortly.' }, { status: 503 })
    }
    if (!hasGradingSlot) {
      return NextResponse.json({ error: 'You have made several attempts quickly. Wait a minute and try again.' }, { status: 429 })
    }

    const { data, error: gradingDataError } = await admin.rpc('get_assignment_grading_data', {
      p_assignment_id: assignmentId,
    })
    if (gradingDataError || !data) {
      console.error('Unable to load trusted assignment grading data', gradingDataError?.message)
      return NextResponse.json({ error: 'The assignment grader is not ready for this assignment.' }, { status: 503 })
    }

    const gradingData = data as GradingData
    const publicTests = Array.isArray(gradingData.public_tests) ? gradingData.public_tests : []
    const hiddenTests = Array.isArray(gradingData.hidden_tests) ? gradingData.hidden_tests : []
    const tests = [...publicTests, ...hiddenTests]
    if (tests.length === 0 || tests.length > 10 || tests.some(test =>
      typeof test.input !== 'string' || test.input.length > 8192 ||
      typeof test.expected !== 'string' || test.expected.length > 8192
    )) {
      return NextResponse.json({ error: 'This assignment has an invalid test configuration.' }, { status: 503 })
    }

    const results = await runPythonCases(payload.code, tests.map(test => test.input as string))
    const outcomes = results.map((result, index) => ({
      passed: !result.timedOut && result.exitCode === 0 &&
        outputForCompare(result.stdout) === outputForCompare(tests[index].expected as string),
      stdout: result.stdout,
      stderr: result.stderr,
      timedOut: result.timedOut,
    }))
    const testsPassed = outcomes.filter(outcome => outcome.passed).length
    const totalTests = outcomes.length
    const score = Math.floor((testsPassed / totalTests) * 100)
    const { data: recorded, error: recordError } = await admin.rpc('record_assignment_submission', {
      p_student_id: user.id,
      p_assignment_id: assignmentId,
      p_submitted_code: payload.code,
      p_tests_passed: testsPassed,
      p_total_tests: totalTests,
      p_score: score,
    })
    if (recordError || !recorded) {
      console.error('Unable to persist trusted assignment result', recordError?.message)
      return NextResponse.json({ error: 'The result could not be saved. Please retry.' }, { status: 503 })
    }

    const publicResults = outcomes.slice(0, publicTests.length).map((outcome, index) => ({
      passed: outcome.passed,
      description: typeof publicTests[index].description === 'string'
        ? publicTests[index].description
        : `Example ${index + 1}`,
      ...(outcome.passed ? {} : {
        expected: publicTests[index].expected,
        actual: outcome.timedOut ? 'Your program took too long.' : outcome.stdout,
        error: outcome.stderr || undefined,
      }),
    }))

    return NextResponse.json({
      submissionId: recorded.submission_id,
      score,
      passed: score >= 80,
      testsPassed,
      totalTests,
      publicResults,
      privateChecksPassed: outcomes.slice(publicTests.length).filter(outcome => outcome.passed).length,
      privateChecksTotal: hiddenTests.length,
      sessionCompletedNow: recorded.session_completed_now,
      xpAwarded: recorded.xp_awarded,
      feedback: score >= 80
        ? 'You passed this assignment. Keep going to the next lesson.'
        : 'Review the failed examples, make one change, and try again. You can ask the AI mentor for help when you want it.',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected grading error'
    if (message === 'PYTHON_RUNNER_NOT_CONFIGURED') {
      return NextResponse.json({ error: 'The secure Python grader has not been connected yet.' }, { status: 503 })
    }
    console.error('Assignment grading request failed', message)
    return NextResponse.json({ error: 'The grader is temporarily unavailable. Your code was not recorded.' }, { status: 503 })
  }
}
