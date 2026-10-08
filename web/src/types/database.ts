export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Profile {
  id: string
  full_name: string
  role: 'student' | 'instructor' | 'admin'
  xp: number
  streak_count: number
  last_activity_date: string | null
  fee_status: 'free_month1' | 'paid_full' | 'paid_monthly' | 'scholarship' | null
  created_at: string
  updated_at: string
}

export interface Module {
  id: number
  course_id: string
  month_number: number
  title: string
  tagline: string | null
  description: string | null
  capstone_title: string | null
  is_free: boolean
  order_index: number
  status: 'draft' | 'published' | 'archived'
  created_at: string
  sessions?: Session[]
}

export interface Session {
  id: number
  module_id: number
  session_number: number
  title: string
  analogy_physical: string
  content_markdown: string
  video_url: string | null
  starter_code: string
  solution_code: string | null
  hints: string[] | Json
  xp_reward: number
  order_index: number
  duration_minutes: number
  quick_check: QuickCheck
  created_at: string
  assignment?: Assignment
}

export interface QuickCheck {
  question: string
  options: string[]
}

export interface Assignment {
  id: number
  session_id: number
  title: string
  instructions_markdown: string
  starter_code: string | null
  test_cases: TestCase[]
  max_score: number
  created_at: string
}

export interface TestCase {
  input: string
  expected: string
  is_hidden?: boolean
  description?: string
}

export interface Submission {
  id: string
  student_id: string
  assignment_id: number
  submitted_code: string
  tests_passed: number
  total_tests: number
  score: number
  ai_feedback: AIFeedback | null
  passed: boolean
  status: 'submitted' | 'graded' | 'flagged'
  submitted_at: string
}

export interface AIFeedback {
  summary: string
  strengths: string[]
  improvements: string[]
  layman_hint: string
}

export interface UserProgress {
  id: string
  student_id: string
  session_id: number
  completed: boolean
  draft_code: string | null
  timer_seconds_spent: number
  last_accessed: string
  completed_at: string | null
  completed_content_snapshot: Json | null
}

export interface QuickCheckAttempt {
  id: string
  student_id: string
  session_id: number
  selected_option: number
  correct: boolean
  content_snapshot: Json
  attempted_at: string
}

export interface Certificate {
  id: string
  student_id: string
  certificate_number: string
  qr_verification_url: string
  pdf_storage_path: string | null
  issued_at: string
  profile?: Profile
}

export interface Flashcard {
  id: number
  module_id: number
  deck_name: string
  front_prompt: string
  back_answer: string
  analogy_hint: string | null
  created_at: string
}
