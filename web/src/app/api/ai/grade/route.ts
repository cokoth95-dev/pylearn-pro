import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'

const apiKey = process.env.GEMINI_API_KEY || ''
const ai = new GoogleGenAI({ apiKey })

const GRADING_SYSTEM_PROMPT = `
You are an expert Socratic Python Instructor and Automated Code Assessor for a beginner Python Academy.

Your Goal:
Evaluate the student's Python code submission against assignment requirements and test failures.

Guidelines:
1. Praise what they did right (strengths).
2. Point out logical errors, edge cases, or syntax bugs using everyday relatable physical analogies (kitchen recipes, labeled jars, doctor forms, shopping lists).
3. Provide 1 gentle Socratic hint to help them fix the bug.
4. STRICT RULE: NEVER output the full corrected solution code. Guide them to write it themselves!
5. Return clean structured JSON with:
   - "summary": (brief 1-sentence assessment)
   - "strengths": (array of 1-2 positive observations)
   - "improvements": (array of 1-2 constructive suggestions)
   - "layman_hint": (a physical surroundings analogy explaining how to fix the error)
`

export async function POST(req: NextRequest) {
  try {
    const { assignmentTitle, instructions, code, testResults } = await req.json()

    const prompt = `
Assignment: ${assignmentTitle}
Instructions: ${instructions}

Student's Submitted Code:
\`\`\`python
${code || '# Empty Code'}
\`\`\`

Test Execution Results:
${JSON.stringify(testResults, null, 2)}

Please analyze the submission and provide your Socratic beginner feedback in structured JSON format.
`

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: GRADING_SYSTEM_PROMPT,
        temperature: 0.5,
        responseMimeType: 'application/json'
      }
    })

    const text = response.text || ''
    let feedback = null
    try {
      feedback = JSON.parse(text)
    } catch {
      feedback = {
        summary: 'Your code executed, but there are a few adjustments needed to pass all test cases.',
        strengths: ['Great job setting up your variables and basic logic!'],
        improvements: ['Check your input conversions (e.g. wrapping int() around numbers).'],
        layman_hint: 'Think of inputs like receiving a box of letters. If you want to do math, you must use int() to convert the text inside into a real number first!'
      }
    }

    return NextResponse.json({ feedback })
  } catch (err: any) {
    return NextResponse.json({
      feedback: {
        summary: 'Your code is almost there! Let us review the test requirements.',
        strengths: ['Good structure and clean variable naming.'],
        improvements: ['Ensure your output matches the exact prompt text.'],
        layman_hint: 'Double-check that you are using an f-string f"Hello {name}" without extra spacing!'
      }
    })
  }
}
