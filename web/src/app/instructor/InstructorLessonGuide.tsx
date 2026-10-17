import LessonMarkdown from '@/components/content/LessonMarkdown'

type TeachingLesson = { title: string; analogy_physical: string; content_markdown: string; starter_code: string; hints: string[]; quick_check: { question?: string } }

export default function InstructorLessonGuide({ lesson }: { lesson: TeachingLesson }) {
  return <details className="lesson-guide rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 text-sm leading-6 text-stone-800">
    <summary className="cursor-pointer font-bold text-emerald-900">Video-session teaching plan and speaking guide</summary>
    <p className="mt-2 text-xs text-stone-600">A practical walkthrough built around this lesson’s published explanation, example, and practice hints. Adjust the pace to the learner; invite questions before moving on.</p>
    <ol className="mt-3 space-y-3">
      <li><strong>1. Connect to something familiar (about 3 minutes).</strong><br/>Say: “Think about this everyday situation: {lesson.analogy_physical} What parts of that situation do you think a computer could help us handle?” Let the learner answer in their own words, then connect their answer to today’s lesson: <strong>{lesson.title}</strong>.</li>
      <li><strong>2. Explain before showing code (about 5 minutes).</strong><br/>Say: “We will first describe the steps in ordinary words. Then we’ll ask Python to follow those steps. You do not need to memorize the punctuation today; focus on what each instruction is asking Python to do.” Read the lesson explanation below in small parts. Pause after each new term and ask the learner to explain it back in their own words.</li>
      <li><strong>3. Demonstrate and think aloud (about 7 minutes).</strong><br/>Share the starter example. Before running it, ask: “What do you predict the computer will do first? What do you think we will see?” Run it, compare the prediction with the result, and explain each line. If it does not work, read the error together and model changing one thing at a time.</li>
      <li><strong>4. Let the learner drive (about 7 minutes).</strong><br/>Ask the learner to change one small value or line and predict the new result before running it. Ask them to narrate their steps. If they get stuck, offer one hint at a time rather than taking over the keyboard.</li>
      <li><strong>5. Check understanding and connect it to life (about 3 minutes).</strong><br/>Ask the quick-check question without giving away the answer: “{lesson.quick_check?.question || 'Can you explain the main idea from today in your own words?'}” Then ask the learner for one real situation where this idea could be useful. Correct misunderstandings kindly and explain why the right answer makes sense.</li>
      <li><strong>6. Close with a recap (about 2 minutes).</strong><br/>Say: “Today you learned {lesson.title}. Tell me one thing Python did, and one thing you changed yourself.” Celebrate the specific step they completed and note anything to revisit next session.</li>
    </ol>
    <div className="mt-4 grid gap-3 lg:grid-cols-2">
      <section className="lesson-guide-card"><h4 className="font-bold">Student lesson explanation</h4><LessonMarkdown source={lesson.content_markdown} compact/></section>
      <section className="rounded-lg bg-white p-3"><h4 className="font-bold">Code to demonstrate</h4><pre className="mt-2 overflow-x-auto rounded-lg bg-stone-950 p-3 text-xs leading-5 text-stone-100"><code>{lesson.starter_code || '# Start by asking the learner to describe the steps in plain language.'}</code></pre>{lesson.hints?.length > 0 && <><h4 className="mt-3 font-bold">Hints to offer one at a time</h4><ul className="mt-1 list-disc space-y-1 pl-5 text-xs">{lesson.hints.map((hint, index) => <li key={index}>{hint}</li>)}</ul></>}</section>
    </div>
  </details>
}
