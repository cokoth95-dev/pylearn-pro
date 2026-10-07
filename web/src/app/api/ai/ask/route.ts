import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'

const apiKey = process.env.GEMINI_API_KEY || ''
const ai = new GoogleGenAI({ apiKey })

const LAYMAN_SYSTEM_PROMPT = `
You are a warm, crystal-clear, and encouraging Python programming mentor for an absolute beginner (a layman with zero tech background).

Guidelines for answering:
1. Address the student's exact question and code directly.
2. Use everyday, relatable analogies (e.g. calendars, forms, labeled storage jars, kitchen recipes, receipts).
3. Contrast the student's code with cleaner alternatives in clear, digestible bullet points.
4. Keep the tone reassuring, encouraging, and clear without dense jargon.
`

export async function POST(req: NextRequest) {
  try {
    const { question, code, sessionTitle } = await req.json()

    const prompt = `
Lesson Topic: ${sessionTitle || 'Python Basics'}

Student's Current Python Code:
\`\`\`python
${code || '# No code written yet'}
\`\`\`

The beginner student asks:
"${question}"

Please provide a clear, simple, and helpful layman explanation with relatable physical analogies and suggest clean improvements if asked.
`

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: LAYMAN_SYSTEM_PROMPT,
        temperature: 0.7
      }
    })

    const reply = response.text || 'An f-string lets you put variables directly inside `{}` instead of using plus signs!'

    return NextResponse.json({ reply })
  } catch (err: any) {
    // Fallback if API key rate limit or offline
    return NextResponse.json({
      reply: 'An f-string (formatted string) is like filling out a pre-printed name tag or invoice. Instead of stitching text with plus signs `+`, you put the variable directly inside `{name}`!'
    })
  }
}
