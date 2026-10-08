# 🐍 PyLearn Pro: Master Project Documentation & Status Audit

> **Platform**: PyLearn Pro (desktop learning prototype and web academy in active development)  
> **Repository**: [https://github.com/cokoth95-dev/pylearn-pro](https://github.com/cokoth95-dev/pylearn-pro)  
> **Live Production Web Application**: [https://web-mu-seven-40.vercel.app](https://web-mu-seven-40.vercel.app)  
> **Production Hosting**: Vercel (Edge & Serverless)  
> **Database & Auth**: Supabase Cloud (PostgreSQL, Row-Level Security, Auth)  
> **In-Browser Execution**: Pyodide (WebAssembly Python 3.12)  
> **Code Editor**: Monaco Editor (VS Code Engine with Python IntelliSense)  
> **AI Mentorship**: Google Gemini API; current web route uses `gemini-2.5-flash`. Trusted assignment grading is disabled in the no-cost browser-practice mode.

## Current implementation status (authoritative)

This status note supersedes older “completed” feature lists below. Sections 2–7 preserve the original product vision and early implementation notes; they are not a claim that every listed web feature is currently shipped.

| Area | Current status |
| --- | --- |
| Production site | The web app is deployed at the Vercel URL above. Vercel is connected to GitHub `main`, with the project root set to `web/`. Commit `1f50601` is the current deployed version; future pushes to `main` trigger Vercel deployments. The separate raw `SESSIONS/` source folder is intentionally not committed. |
| Authentication | Supabase sign-up, sign-in, password recovery, and reset routes exist. Password recovery has encountered Supabase rate limiting and still needs a successful end-to-end email check. |
| Account profile | A profile page now shows email, role, XP, and current streak; learners can edit their display name. Avatar actions include profile and sign-out. |
| Student learning | Dashboard, Python browser editor, AI help, quick checks, saved lesson completion, and XP are implemented. Running arbitrary code in the browser does not produce a trusted grade or assignment score. |
| Content | Week 1 is loaded. Other weeks and capstone lesson content are not yet loaded. |
| Admin and instructor | Admin access is confirmed by the owner. Course/curriculum management and assigned-course instructor tools exist. The owner plans to test the role-specific workflows. Admin hero image controls are live and can be tested. |
| Learning streak | Streaks are recorded by the database when a learner completes a lesson. A missed day does not remove XP; the displayed current streak expires after a gap. Migration 008 is applied. |
| Paid grading | Deferred until funding is available. The optional hosted runner is not deployed or enabled. |
| Payments and pricing | Manual KCB Paybill/M-Pesa flow is live. Admins can manage monthly/full-course charges in KSh and display prices separately in USD; full-course savings are calculated from regular minus sale price. Migration 010 adds the admin pricing controls and must be applied/deployed before they are available. This is not an automated M-Pesa integration. |
| Capstones and certificates | Still planned. The app does not yet provide complete capstone submission/unlock flows or certificate creation and verification. |
| Database updates | Migrations 001–009 are applied to the linked Supabase project. |
| Verification | Local and Vercel production builds succeeded. The new profile, hero image, and streak interactions still need owner testing with signed-in accounts. |

### Manual payment and pricing flow

- Learners use `/payments` to see the Paybill instructions, select a published course and access option, and submit the last four receipt characters plus payer phone number. The app never asks for an M-Pesa PIN.
- Payment requests are private to the learner and admin. Learners cannot set the amount, course owner, target month, or status directly; a database RPC reads the current KSh sale price and sets the amount and target month.
- The landing page and learner payment page read the same admin-managed Supabase price record. Admins set USD and KSh prices separately; M-Pesa charges always use the saved KSh amount. Full-course savings are calculated from regular price minus sale price, and monthly access has no discount.
- Admins review requests in the Admin panel’s **Payments** section. Confirming grants either full-course access or access to the next unpurchased paid month for 30 days from confirmation. Declining requires a learner-visible reason; the request stays in history and can be resubmitted.
- Payments default to disabled. Admins may disable new requests while still reviewing pending requests; existing access is unchanged. The only payment destination is KCB Paybill `522522`, account `1288171692`.
- Month-specific entitlements are checked by both module row-level security and the quick-check grading RPC. Previously saved progress remains in the learner account when a 30-day entitlement expires.
- Before using the pricing controls: apply `web/supabase/migrations/010_admin_managed_pricing.sql` and deploy the update. Test with learner/admin accounts; do not confirm a request unless the corresponding M-Pesa message is visible to the administrator.

The owner confirmed that `cokoth95@gmail.com` can sign in with Admin access and switch to the learner view. Password recovery verification is intentionally deferred for now. The owner will test instructor and learner workflows and report back.

---

## 📑 Table of Contents
1. [Executive Summary & Evolution](#1-executive-summary--evolution)
2. [Phase 1: PyLearn Pro Desktop App (Completed)](#2-phase-1-pylearn-pro-desktop-app-completed)
3. [Phase 2: PyLearn Pro Web Academy (Completed & Live)](#3-phase-2-pylearn-pro-web-academy-completed--live)
4. [Frontend Architecture & UI/UX Implemented](#4-frontend-architecture--uiux-implemented)
5. [Backend Architecture & Cloud Integrations Implemented](#5-backend-architecture--cloud-integrations-implemented)
6. [Pedagogy: The "Surroundings-First" Framework](#6-pedagogy-the-surroundings-first-framework)
7. [Comprehensive Database Schema (Supabase PostgreSQL)](#7-comprehensive-database-schema-supabase-postgresql)
8. [What Remains to be Done (Next Phase Roadmap)](#8-what-remains-to-be-done-next-phase-roadmap)
9. [How to Run, Build & Deploy](#9-how-to-run-build--deploy)

---

## 1. Executive Summary & Evolution

PyLearn Pro started as a high-performance **desktop learning app** built with Python and PyWebView, and has now expanded into a **production-grade full-stack Web Application** hosted on Vercel with Supabase.

### 🎯 The Core Problem We Solved:
Most Python courses fail complete beginners because:
- They require complex local environment setups (terminal commands, Python PATH issues, VS Code extensions).
- They use dense, abstract mathematical explanations instead of relatable everyday analogies.
- They lack automated instant feedback on coding assignments.

### 💡 Our Solution:
- **Zero-Install Web Sandbox**: Python runs directly in the user's web browser using WebAssembly (**Pyodide**).
- **Physical Surroundings Pedagogy**: Variables as labeled kitchen storage jars, control flow as road crossroads, loops as repeating clocks, and OOP as architectural blueprints.
- **Socratic AI Mentor (Gemini 3.6 Flash)**: An intelligent tutor that diagnoses bugs and explains concepts with everyday analogies **without spoiling the answer**.

---

## 2. Phase 1: PyLearn Pro Desktop App (Completed)

The desktop application (`app.py`) provides an offline-first learning studio using `pywebview`.

### Key Features Built:
1. **Monaco Code Editor**: Full VS Code engine with syntax highlighting, rainbow bracket matching, auto-indentation, and method autocompletion (`.strip()`, `.upper()`, `.append()`, `.keys()`).
2. **Interactive Terminal**: Safe subprocess execution with real-time `input()` prompt stripping and interaction.
3. **Live Memory State Inspector**: Clickable drawers for Call Stack frames, Heap variable allocations with simulated memory addresses, and Garbage Collection tracking.
4. **Google Gemini Live AI Integration**: Configured in `backend/ai_tutor.py` with multi-model fallback (`gemini-3.6-flash` -> `gemini-3.5-flash-lite`).
5. **State & Progress Persistence**: Auto-saves student code drafts (500ms debounce) into SQLite (`pylearn.db`) and preserves the 30-minute focus timer state upon restarting.
6. **SuperMemo-2 (SM-2) Flashcards**: Spaced repetition active recall engine to lock in memory.

---

## 3. Phase 2: PyLearn Pro Web Academy (Completed & Live)

We transitioned the platform to a modern web architecture in the `web/` directory and deployed it to Vercel.

### Live Production Infrastructure:
- **Next.js 16 (App Router)** with TypeScript and Tailwind CSS v4.
- **Vercel Production Deployment**: Aliased at `https://web-mu-seven-40.vercel.app`.
- **Git Repository**: Synced and tracked to GitHub `main` branch (`https://github.com/cokoth95-dev/pylearn-pro`).

---

## 4. Frontend Architecture & UI/UX Implemented

### 🌟 1. Public Landing Page (`src/app/page.tsx` & `src/components/landing/`)
- **Modern Capsule & Arch Aesthetics**: Vibrant 5-capsule hero gallery (Amber, Sky Blue, Purple, Rose, Emerald) inspired by modern high-end school portals.
- **⚡ Live In-Browser Monaco Hero Playground (`HeroPlayground.tsx`)**: Visitors can test and execute real Python code directly on the homepage before registering.
- **Dynamic Pathway Selector**: Interactive filter pills (*All 4 Months, Foundations, Data Structures, OOP & APIs, AI & Data Science*) to dynamically filter syllabus cards.
- **💳 Multi-Currency Tuition Calculator (`PricingSection.tsx`)**: Live toggle between **USD ($)** and **KES (KSh)** featuring:
  - Month 1: **100% Free Starter ($0 / KSh 0)**
  - Full 4-Month Academy Bundle: **$149 / KSh 18,500** (with savings badge)
  - Monthly Subscription: **$49/mo / KSh 6,500/mo**
- **❓ Interactive FAQ Accordion (`FAQSection.tsx`)**: 6 collapsible cards covering zero installation, certification, and AI guidance.

---

### 🔐 2. Authentication System (`src/app/(auth)/`)
- **6-Field Student Registration (`register/page.tsx`)**:
  - Captures: **Full Name**, **Email Address**, **Phone Number** (with international prefix support), **Location** (City/Country), **Age** (validated between 10 and 120), and **Password**.
  - **Password Strength Meter (`PasswordStrengthMeter.tsx`)**: Real-time visual progress bar with live validation checklist (8+ chars, upper/lower case, numbers, special characters).
- **Dual-Credential Login (`login/page.tsx`)**:
  - Single input field accepting **either Email Address OR Phone Number** alongside password.
  - Automatically queries the Supabase `profiles` table to resolve phone numbers to registered student accounts.

---

### 🎓 3. Student Classroom Hub (`src/app/dashboard/page.tsx`)
- **Student Stats Header**: Displays XP points, Level badge, 3-day flame streak counter, and student avatar.
- **Today's Focus Target Card**: 1-click launch into the active daily lesson with focus objectives and XP rewards (+50 XP).
- **4-Month Milestone Roadmap Tree**: Shows Month 1 (Active Free Trial) and Months 2–4 with progress bars and milestone lock badges.
- **Interactive Modals**:
  - **Sessions List Modal**: Expandable list of all daily micro-sessions with status indicators and 1-click IDE launcher buttons.
  - **Course Outline & Fee Breakdown Modal**: Tuition details, payment methods (Stripe, MPesa, PayPal, Bank Transfer), and offline receipt submission guidelines.

---

### 💻 4. 3-Pane Split-Screen Classroom IDE (`src/app/classroom/[sessionId]/page.tsx`)
- **Left Pane (Lesson Guide & Surroundings)**:
  - Physical surroundings analogy card (*"Labeled storage boxes in your kitchen pantry"*).
  - Rich markdown lesson theory and Socratic tip checklists.
- **Center Pane (Monaco VS Code Editor)**:
  - Full Python 3.12 syntax highlighting, rainbow bracket matching, auto-indentation, and method autocompletion.
- **Right Pane (Multi-Tab Interactive Studio)**:
  1. **Terminal (`src/lib/usePyodide.ts`)**: Client-side WebAssembly Python execution (zero latency, zero cloud costs) with real-time inline `input()` prompt handling.
  2. **Memory & Heap Visualizer (`MemoryVisualizer.tsx`)**: Clickable cards for live variables showing Python types, values, simulated RAM addresses, and physical layman analogies.
  3. **Google Gemini Socratic AI Tutor (`AIChatMentor.tsx` & `/api/ai/ask`)**: 24/7 in-lesson conversational AI answering student questions using everyday layman analogies.
- **Pomodoro Focus Timer**: 30-minute focus countdown timer with start/pause toggles.

---

### 🛡️ 5. Admin CMS & Instructor Portal (`src/app/admin/page.tsx`)
- **Curriculum & Session Authoring**: Create new sessions, attach YouTube/Vimeo video links, configure physical analogies, starter code, and XP rewards.
- **Enrolled Student & Tuition Manager**: Searchable student directory displaying contact info, age, progress, XP, and **1-Click Access Toggles** to verify payments and unlock Months 2–4.

---

## 5. Backend Architecture & Cloud Integrations Implemented

### 1. Google Gemini 3.6 Flash Socratic AI Engine
- **Q&A Chat Route (`src/app/api/ai/ask/route.ts`)**: Connects to `@google/genai` to provide beginner-friendly, layman explanations with everyday analogies.
- **Automated Grading Route (`src/app/api/ai/grade/route.ts`)**: Evaluates student code against test cases and returns structured JSON with strengths, improvements, and Socratic layman hints **without giving away the solution code**.

### 2. Client-Side WebAssembly Python Engine (`src/lib/usePyodide.ts`)
- Custom React hook that loads `pyodide.js` (WebAssembly Python 3.12).
- Intercepts `sys.stdout` and `sys.stderr` in real-time.
- Overrides `__builtins__.input` to read from an asynchronous user input queue.

### 3. Supabase Cloud Integration (`src/lib/supabase/client.ts`)
- Configured using `@supabase/ssr` with browser client helpers.
- Full TypeScript interfaces defined in `src/types/database.ts`.

---

## 6. Pedagogy: The "Surroundings-First" Framework

| Month | Real-World Surroundings Analogy | Key Technical Competencies | Milestone Capstone Project |
| :--- | :--- | :--- | :--- |
| **Month 1 (FREE)** | **Storage Jars, Road Crossroads & Repeating Clocks** | Variables, Data Types, `input()`, `print()`, f-strings, If/Elif/Else, While & For loops. | **Automated Personal Budget & Expense Auditor** |
| **Month 2** | **Shopping Carts, Telephone Books & Filing Cabinets** | Lists, Tuples, Dictionaries, Sets, File I/O (CSV/TXT), Custom Exceptions, List Comprehensions. | **Smart File Organizer & Automated Excel Report Generator** |
| **Month 3** | **Architectural Blueprints, Restaurant Menus & Waiters** | Functions, Scope, OOP (Classes, Methods, Inheritance), HTTP Requests, REST APIs, JSON Serialization. | **Live Multi-City Weather & Stock Dashboard with REST APIs** |
| **Month 4** | **Dynamic Spreadsheets & AI Pattern Recognition** | NumPy, Pandas, Data Cleaning, Gemini API integration, FastAPI/Streamlit basics, Cloud Deployment. | **Full-Stack AI Data Analyst Web Application** |

---

## 7. Comprehensive Database Schema (Supabase PostgreSQL)

Located in `web/supabase/migrations/001_initial_schema.sql`:

1. **`profiles`**: Linked to `auth.users` (`full_name`, `phone_number` UNIQUE, `location`, `email` UNIQUE, `age`, `role`, `fee_status`, `xp`, `streak_count`).
2. **`modules`**: 4-Month roadmap structure with `is_free` flags (`true` for Month 1, `false` for Months 2–4).
3. **`sessions`**: Classroom sessions containing `analogy_physical`, markdown content, video links, starter code, and XP rewards.
4. **`assignments`**: Dynamic test cases (`test_cases` JSONB supporting visible and hidden test cases).
5. **`submissions`**: Student code submissions, test scores, and structured `ai_feedback` from Gemini.
6. **`user_progress`**: Milestone-gated progression tracking with code draft persistence.
7. **`certificates`**: Digital graduation credentials with QR verification URLs.
8. **`flashcards` & `user_flashcard_progress`**: SuperMemo-2 spaced repetition state.
9. **Row Level Security (RLS)**: Enforces complete data privacy so students only see/edit their own submissions while admins have global override.

---

## 8. What Remains to be Done (Next Phase Roadmap)

### 📌 Remaining Tasks for Full Production Maturity:

1. **Live Supabase Project Linking**:
   - Create a live project on [supabase.com](https://supabase.com) and run the `001_initial_schema.sql` migration.
   - Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to Vercel Production Environment Variables.
2. **Dynamic Route Population**:
   - Replace mock curriculum arrays in `src/app/dashboard/page.tsx` and `src/app/classroom/[sessionId]/page.tsx` with live `supabase.from('sessions').select('*')` database queries.
3. **Automated QR-Verified PDF Certificate Generator**:
   - Implement `/verify/[certId]` public verification page.
   - Build automated PDF generation using `@react-pdf/renderer` or `pdfkit` upon completing all 4 capstones.
4. **Automated M-Pesa integration (optional later)**:
   - The current payment workflow is manual Paybill review. Consider Daraja integration only if/when its business onboarding and operating costs are acceptable.
5. **SuperMemo-2 (SM-2) Flashcard Classroom Tab**:
   - Embed the interactive active recall flashcard drawer directly into the classroom interface.

---

## 9. How to Run, Build & Deploy

### 💻 Local Development:
```bash
# 1. Desktop App:
python app.py  # or .\start.ps1

# 2. Web Academy:
cd web
npm install
npm run dev
# Open http://localhost:3000
```

### 🚀 Production Deployment:
```bash
cd web
git add .
git commit -m "update: your changes"
git push origin main
vercel --prod
```
