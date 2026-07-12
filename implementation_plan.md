# Implementation Plan: SIS/LMS Education Platform MVP

This document outlines the detailed architecture, database schema, API design, and UI layouts for building a lightweight yet full-featured Education Platform MVP.

---

## 1. Project Structure

The project will be organized into two main directories, `frontend` and `backend`, plus a `supabase` directory for database setup.

```text
school/
├── supabase/
│   ├── schema.sql         # SQL migrations and schema setup
│   └── seed.sql           # Database seeding script for local testing
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── supabase.js  # Supabase Client setup (Service Role & Public)
│   │   ├── middleware/
│   │   │   └── auth.js      # Auth & Role-based Access Middleware
│   │   ├── routes/
│   │   │   ├── auth.js      # Custom auth helper routers (e.g. role check)
│   │   │   ├── sis.js       # /schools, /terms, /sections, /students, /enrollments, /attendance
│   │   │   ├── lms.js       # /subjects, /lessons, /assignments, /submissions, /quizzes, /questions, /attempts
│   │   │   ├── grades.js    # /grades
│   │   │   └── analytics.js # /analytics, including at-risk calculation
│   │   ├── controllers/     # Controller logic split by domain
│   │   └── server.js        # Main Express application entry point (ES modules)
│   ├── package.json
│   └── .env
└── frontend/
    ├── src/
    │   ├── components/      # Common UI elements (Layout, Navbar, Guard, Button, Table)
    │   ├── context/
    │   │   └── AuthContext.jsx # App-wide Auth State using Supabase JS client
    │   ├── views/
    │   │   ├── Login.jsx
    │   │   ├── Admin/
    │   │   │   ├── Dashboard.jsx
    │   │   │   └── BulkImport.jsx
    │   │   ├── Teacher/
    │   │   │   ├── Dashboard.jsx
    │   │   │   ├── SubjectDetail.jsx
    │   │   │   ├── Attendance.jsx
    │   │   │   └── Gradebook.jsx
    │   │   └── Student/
    │   │       ├── Dashboard.jsx
    │   │       ├── SubjectView.jsx
    │   │       ├── SubmitAssignment.jsx
    │   │       └── TakeQuiz.jsx
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css
    ├── package.json
    ├── tailwind.config.js
    └── .env
```

---

## 2. Database Schema (Supabase / Postgres)

We will use Postgres with Supabase. The schema handles roles, school structures, enrollment, attendance, courses, lessons, assignments, submissions, quizzes, and analytics events.

```sql
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Profiles (linked to auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text not null,
  role text not null check (role in ('admin', 'teacher', 'student')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Schools
create table public.schools (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  address text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Link profile to a school (Admin/Teacher/Student belongs to a school)
alter table public.profiles add column school_id uuid references public.schools(id) on delete set null;

-- 3. Terms
create table public.terms (
  id uuid default uuid_generate_v4() primary key,
  school_id uuid references public.schools(id) on delete cascade not null,
  name text not null, -- e.g., "Fall 2026"
  start_date date not null,
  end_date date not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Sections (Classes)
create table public.sections (
  id uuid default uuid_generate_v4() primary key,
  term_id uuid references public.terms(id) on delete cascade not null,
  name text not null, -- e.g., "Grade 10 - Section A"
  room text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Students
create table public.students (
  id uuid default uuid_generate_v4() primary key,
  profile_id uuid references public.profiles(id) on delete cascade not null unique,
  school_id uuid references public.schools(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Enrollments (Many-to-Many student <-> section per term)
create table public.enrollments (
  id uuid default uuid_generate_v4() primary key,
  student_id uuid references public.students(id) on delete cascade not null,
  section_id uuid references public.sections(id) on delete cascade not null,
  enrolled_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (student_id, section_id)
);

-- 7. Attendance
create table public.attendance (
  id uuid default uuid_generate_v4() primary key,
  section_id uuid references public.sections(id) on delete cascade not null,
  student_id uuid references public.students(id) on delete cascade not null,
  date date not null,
  status text not null check (status in ('present', 'absent', 'tardy', 'excused')),
  recorded_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (student_id, date)
);

-- 8. Subjects
create table public.subjects (
  id uuid default uuid_generate_v4() primary key,
  section_id uuid references public.sections(id) on delete cascade not null,
  name text not null, -- e.g., "Algebra I"
  teacher_id uuid references public.profiles(id) on delete set null, -- Teacher profile
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 9. Lessons (materials)
create table public.lessons (
  id uuid default uuid_generate_v4() primary key,
  subject_id uuid references public.subjects(id) on delete cascade not null,
  title text not null,
  content text, -- Text or markdown body
  file_url text, -- Supabase storage URL or external link
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 10. Assignments
create table public.assignments (
  id uuid default uuid_generate_v4() primary key,
  subject_id uuid references public.subjects(id) on delete cascade not null,
  title text not null,
  description text,
  max_points integer not null default 100,
  due_date timestamp with time zone not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 11. Submissions
create table public.submissions (
  id uuid default uuid_generate_v4() primary key,
  assignment_id uuid references public.assignments(id) on delete cascade not null,
  student_id uuid references public.students(id) on delete cascade not null,
  submitted_at timestamp with time zone default timezone('utc'::text, now()) not null,
  content text,
  file_url text,
  score numeric(5, 2), -- Graded score
  graded_by uuid references public.profiles(id) on delete set null,
  graded_at timestamp with time zone,
  status text not null check (status in ('submitted', 'graded')),
  unique (assignment_id, student_id)
);

-- 12. Quizzes
create table public.quizzes (
  id uuid default uuid_generate_v4() primary key,
  subject_id uuid references public.subjects(id) on delete cascade not null,
  title text not null,
  description text,
  due_date timestamp with time zone not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 13. Quiz Questions
create table public.questions (
  id uuid default uuid_generate_v4() primary key,
  quiz_id uuid references public.quizzes(id) on delete cascade not null,
  question_text text not null,
  question_type text not null check (question_type in ('multiple_choice', 'true_false')),
  points integer not null default 1,
  options jsonb not null, -- Array of strings e.g. ["A", "B", "C", "D"]
  correct_answer text not null, -- Expected option value (string)
  topic text, -- Simple tag for tracking tags
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 14. Quiz Attempts
create table public.quiz_attempts (
  id uuid default uuid_generate_v4() primary key,
  quiz_id uuid references public.quizzes(id) on delete cascade not null,
  student_id uuid references public.students(id) on delete cascade not null,
  score numeric(5, 2) not null default 0.00,
  max_score numeric(5, 2) not null default 0.00,
  started_at timestamp with time zone default timezone('utc'::text, now()) not null,
  completed_at timestamp with time zone,
  unique (quiz_id, student_id)
);

-- 15. Quiz Answers (Details of attempts)
create table public.quiz_answers (
  id uuid default uuid_generate_v4() primary key,
  quiz_attempt_id uuid references public.quiz_attempts(id) on delete cascade not null,
  question_id uuid references public.questions(id) on delete cascade not null,
  student_answer text not null,
  is_correct boolean not null,
  points_earned integer not null default 0,
  unique (quiz_attempt_id, question_id)
);

-- 16. Analytics Events (Engagement Log)
create table public.analytics_events (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  event_type text not null check (event_type in ('material_opened', 'assignment_submitted', 'quiz_attempted')),
  details jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
```

---

## 3. Row-Level Security (RLS) Strategy

To secure the frontend calls and database access, RLS policies will be implemented:

1. **`profiles`**:
   - Reading: Any logged-in user can read all profiles in their school.
   - Writing: Only users matching their own `id` or admins can update.
2. **`schools` / `terms` / `sections`**:
   - Reading: All profiles associated with the school.
   - Writing: Admins only.
3. **`students` / `enrollments`**:
   - Reading: Teachers can view all, Students can view their own, Admins can view all.
   - Writing: Admins only.
4. **`attendance`**:
   - Reading: Admins, teachers, and student can view their own.
   - Writing: Teachers and admins.
5. **`subjects` / `lessons` / `assignments` / `quizzes` / `questions`**:
   - Reading: Any student enrolled in the section, the teacher assigned, or admins.
   - Writing: Teachers and admins.
6. **`submissions` / `quiz_attempts` / `quiz_answers`**:
   - Reading: The student who created it, teachers of the subject, and admins.
   - Writing: Student can create/update their own submissions. Teachers can grade them.
7. **`analytics_events`**:
   - Reading: Teachers and admins.
   - Writing: Logged-in user can insert their own.

*Note: For the backend Express API, we will use a Supabase Admin Client (Service Role Key) to compute cross-table queries, bulk imports, and run analytics safely.*

---

## 4. Backend Express.js API Design

The backend will expose a clean REST API running on port 5000:

### Auth Middleware:
All endpoints except `/auth/login` require an `Authorization` header containing the JWT token from Supabase Auth (`Bearer <token>`). The middleware will:
1. Verify the token using `supabase.auth.getUser()`.
2. Retrieve the user's role from the `public.profiles` table.
3. Attach `req.user = { id, email, role, school_id }` to the request.
4. Provide helper checks (e.g. `requireRole(['admin', 'teacher'])`).

### Endpoint Routes:
- **`GET /schools`**, **`POST /schools`** (Admin only)
- **`GET /terms`**, **`POST /terms`** (Admin only)
- **`GET /sections`**, **`POST /sections`** (Admin only)
- **`GET /students`** (Admin/Teacher), **`POST /students/bulk`** (Admin only - CSV/JSON import)
- **`GET /enrollments`** (Admin/Teacher), **`POST /enrollments`** (Admin only)
- **`GET /attendance`** (Admin/Teacher/Student), **`POST /attendance`** (Teacher only)
- **`GET /subjects`** (All authenticated), **`POST /subjects`** (Admin only)
- **`GET /lessons`**, **`POST /lessons`** (Teacher only)
- **`GET /assignments`**, **`POST /assignments`** (Teacher only)
- **`POST /submissions`** (Student only), **`PUT /submissions/:id/grade`** (Teacher only)
- **`GET /quizzes`**, **`POST /quizzes`** (Teacher only)
- **`POST /quizzes/:id/attempt`** (Student only - submits answers, computes score server-side, saves attempt & details)
- **`GET /grades`**
  - Teacher view: `/grades/section/:sectionId` (lists all students, assignment grades, and quiz grades)
  - Student view: `/grades/student` (lists student's own grades for all enrolled subjects)
- **`GET /analytics`**
  - **Teacher dashboard (`/analytics/teacher/:sectionId`)**:
    - Performance summary by subject (average quiz scores, assignment submission rates).
    - Overall attendance rate for the section.
    - List of "At Risk" students in the section computed via the rule-based warning flags.
  - **Student dashboard (`/analytics/student`)**:
    - Attendance percentage (number of present / total days recorded).
    - Quiz performance (average score vs max score).
    - Assignment completion rate.
    - Personal "At Risk" warning indicator.
  - **`POST /analytics/log`**: Save `material_opened` or other engagement events.

### Early Warning Rules ("At Risk"):
A student is flagged as "At risk" if:
1. `(attendance_rate < 0.70) AND (quiz_average < 0.50)`
2. **OR** `(no submissions in the last 14 days)` (for students who have been enrolled but haven't submitted assignments or quiz attempts in the last 14 days, given there was an assignment/quiz due/assigned).

---

## 5. Frontend React Views (Clean Premium Dashboard UI)

We will use Tailwind CSS with standard Inter typography, subtle gradients, and dark-accents/glassmorphic patterns. The layouts will adapt dynamically based on the logged-in user's role.

### Screens:
1. **Login View**: Simple card layout with credentials.
2. **Admin Dashboard**:
   - School settings, term management, section list.
   - Bulk student upload: Text area to paste CSV data, or simple form inputs.
   - Teacher & student directory.
3. **Teacher Dashboard**:
   - Class selector (Select term and section).
   - Subject detail view: Add materials (lessons), assignments, and quizzes.
   - Attendance grid: Table listing all enrolled students with checkboxes (Present/Absent/Tardy/Excused) for a selected date.
   - Gradebook: Matrices of assignments and quizzes with grades and inline submission details.
   - Analytics Tab: At-risk list with reason badges, overall section charts (built with pure HTML/CSS flex elements for charts, ensuring high performance).
4. **Student Dashboard**:
   - Current enrollments: Cards linking to subject page.
   - Attendance indicator (circular progress style).
   - Grades overview list.
   - Subject Detail page:
     - Lessons lists (clicking opens content and logs `material_opened`).
     - Assignments list (click to submit text content or external link).
     - Quizzes list: Clicking starts quiz.
   - Quiz Taking screen: Multi-step quiz form showing questions one-by-one.
   - Alerts: At-risk alert if flagged.

---

## 6. Verification & Testing Plan

### Automated Tests
We will write a set of backend integration tests (a test runner script or endpoint verifications) and verify standard operations.

### Manual Verification via Browser
We will use the browser tool to:
1. Load the web interface.
2. Log in as Admin, create a school, term, section, and import test students/teachers.
3. Log in as Teacher, create a subject, lesson, assignment, quiz, and take attendance.
4. Log in as Student, check dashboard, open a lesson (logs event), submit an assignment, and take a quiz.
5. Log in as Teacher, grade the assignment, check the analytics dashboard, and verify that the "At risk" calculation updates appropriately (e.g. testing the <70% attendance + <50% quiz avg threshold).

---

## 7. Open Questions & User Review Required

> [!IMPORTANT]
> **Authentication Setup**: Since Supabase email auth normally requires confirmation, for this MVP we will auto-confirm users or create profiles directly via the admin API. Can we assume local development will use Supabase Local (Docker) or a free Supabase cloud instance? (If cloud, we can configure automatic confirmation of users).
>
> **Bulk Import CSV Format**: We will assume a CSV format: `email,full_name,password`. We will create the authentication user and profile programmatically via the backend Admin API.

Please approve the plan or provide feedback so we can start the implementation!
