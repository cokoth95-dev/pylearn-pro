-- ==============================================================================
-- PyLearn Pro: Master Database Schema & Row Level Security (RLS) Migrations
-- PostgreSQL / Supabase
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ENUMS & DOMAINS
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('student', 'instructor', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE fee_status_type AS ENUM ('free_month1', 'paid_full', 'paid_monthly', 'scholarship');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE submission_status AS ENUM ('submitted', 'graded', 'flagged');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. PROFILES TABLE (Linked with auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT NOT NULL,
    phone_number TEXT NOT NULL UNIQUE,
    location TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    age INTEGER NOT NULL CHECK (age >= 10 AND age <= 120),
    role user_role DEFAULT 'student',
    xp INTEGER DEFAULT 0,
    streak_count INTEGER DEFAULT 0,
    fee_status fee_status_type DEFAULT 'free_month1',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. MODULES TABLE (4 Months / 16 Weeks)
CREATE TABLE IF NOT EXISTS public.modules (
    id SERIAL PRIMARY KEY,
    month_number INTEGER NOT NULL CHECK (month_number BETWEEN 1 AND 4),
    title TEXT NOT NULL,
    tagline TEXT,
    description TEXT,
    capstone_title TEXT,
    is_free BOOLEAN DEFAULT FALSE,
    order_index INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. SESSIONS TABLE
CREATE TABLE IF NOT EXISTS public.sessions (
    id SERIAL PRIMARY KEY,
    module_id INTEGER REFERENCES public.modules(id) ON DELETE CASCADE,
    session_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    analogy_physical TEXT NOT NULL,
    content_markdown TEXT NOT NULL,
    video_url TEXT,
    starter_code TEXT DEFAULT '# Write your Python code here\nprint("Hello World!")',
    solution_code TEXT,
    hints JSONB DEFAULT '[]'::jsonb,
    xp_reward INTEGER DEFAULT 50,
    order_index INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. ASSIGNMENTS TABLE
CREATE TABLE IF NOT EXISTS public.assignments (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES public.sessions(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    instructions_markdown TEXT NOT NULL,
    starter_code TEXT,
    test_cases JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of {input: string, expected: string, is_hidden: boolean}
    max_score INTEGER DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. SUBMISSIONS TABLE
CREATE TABLE IF NOT EXISTS public.submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    assignment_id INTEGER REFERENCES public.assignments(id) ON DELETE CASCADE NOT NULL,
    submitted_code TEXT NOT NULL,
    tests_passed INTEGER DEFAULT 0,
    total_tests INTEGER DEFAULT 0,
    score INTEGER DEFAULT 0,
    ai_feedback JSONB, -- {summary: string, strengths: string[], improvements: string[], layman_hint: string}
    passed BOOLEAN DEFAULT FALSE,
    status submission_status DEFAULT 'graded',
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. USER PROGRESS (Milestone unlocking & draft code persistence)
CREATE TABLE IF NOT EXISTS public.user_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    session_id INTEGER REFERENCES public.sessions(id) ON DELETE CASCADE NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    draft_code TEXT,
    timer_seconds_spent INTEGER DEFAULT 0,
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(student_id, session_id)
);

-- 8. CERTIFICATES TABLE (Automated QR Verified Digital Credentials)
CREATE TABLE IF NOT EXISTS public.certificates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    certificate_number TEXT NOT NULL UNIQUE,
    qr_verification_url TEXT NOT NULL,
    pdf_storage_path TEXT,
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. FLASHCARDS TABLE (SuperMemo-2 Spaced Repetition)
CREATE TABLE IF NOT EXISTS public.flashcards (
    id SERIAL PRIMARY KEY,
    module_id INTEGER REFERENCES public.modules(id) ON DELETE CASCADE,
    deck_name TEXT NOT NULL,
    front_prompt TEXT NOT NULL,
    back_answer TEXT NOT NULL,
    analogy_hint TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.user_flashcard_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    flashcard_id INTEGER REFERENCES public.flashcards(id) ON DELETE CASCADE NOT NULL,
    repetition INTEGER DEFAULT 0,
    interval_days INTEGER DEFAULT 1,
    ease_factor NUMERIC(4,2) DEFAULT 2.50,
    next_review_date DATE DEFAULT CURRENT_DATE,
    last_reviewed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(student_id, flashcard_id)
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_flashcard_progress ENABLE ROW LEVEL SECURITY;

-- Profiles: Public read, self-update
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Modules & Sessions: Public/Student read
CREATE POLICY "Modules viewable by authenticated users." ON public.modules FOR SELECT USING (true);
CREATE POLICY "Sessions viewable by authenticated users." ON public.sessions FOR SELECT USING (true);
CREATE POLICY "Assignments viewable by authenticated users." ON public.assignments FOR SELECT USING (true);
CREATE POLICY "Flashcards viewable by authenticated users." ON public.flashcards FOR SELECT USING (true);

-- User Progress & Submissions: Self read/insert/update
CREATE POLICY "Students can view own progress." ON public.user_progress FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Students can manage own progress." ON public.user_progress FOR ALL USING (auth.uid() = student_id);

CREATE POLICY "Students can view own submissions." ON public.submissions FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Students can insert own submissions." ON public.submissions FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can manage own flashcards progress." ON public.user_flashcard_progress FOR ALL USING (auth.uid() = student_id);

-- Certificates: Public read for verification
CREATE POLICY "Certificates are publicly verifiable." ON public.certificates FOR SELECT USING (true);

-- Admin Global Override Policy
CREATE POLICY "Admins have full access to modules." ON public.modules FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins have full access to sessions." ON public.sessions FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins have full access to assignments." ON public.assignments FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins have full access to submissions." ON public.submissions FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ==============================================================================
-- AUTOMATIC PROFILE TRIGGER ON SIGNUP
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone_number, location, email, age, role, fee_status)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'Student'),
    COALESCE(new.raw_user_meta_data->>'phone_number', ''),
    COALESCE(new.raw_user_meta_data->>'location', 'Global'),
    new.email,
    COALESCE((new.raw_user_meta_data->>'age')::integer, 20),
    'student',
    'free_month1'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
