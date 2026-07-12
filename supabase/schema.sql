-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Clean up existing tables (if any)
drop table if exists public.analytics_events cascade;
drop table if exists public.quiz_answers cascade;
drop table if exists public.quiz_attempts cascade;
drop table if exists public.questions cascade;
drop table if exists public.quizzes cascade;
drop table if exists public.submissions cascade;
drop table if exists public.assignments cascade;
drop table if exists public.lessons cascade;
drop table if exists public.subjects cascade;
drop table if exists public.attendance cascade;
drop table if exists public.enrollments cascade;
drop table if exists public.students cascade;
drop table if exists public.sections cascade;
drop table if exists public.terms cascade;
drop table if exists public.profiles cascade;
drop table if exists public.schools cascade;

-- 1. Schools
create table public.schools (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  address text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Profiles (linked to auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text not null,
  role text not null check (role in ('admin', 'teacher', 'student')),
  school_id uuid references public.schools(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

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

-- 6. Enrollments
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
  teacher_id uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 9. Lessons (materials)
create table public.lessons (
  id uuid default uuid_generate_v4() primary key,
  subject_id uuid references public.subjects(id) on delete cascade not null,
  title text not null,
  content text,
  file_url text,
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
  score numeric(5, 2),
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
  options jsonb not null, -- Array of strings e.g. ["Choice A", "Choice B", "Choice C", "Choice D"]
  correct_answer text not null, -- Correct option text
  topic text,
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

-- 15. Quiz Answers
create table public.quiz_answers (
  id uuid default uuid_generate_v4() primary key,
  quiz_attempt_id uuid references public.quiz_attempts(id) on delete cascade not null,
  question_id uuid references public.questions(id) on delete cascade not null,
  student_answer text not null,
  is_correct boolean not null,
  points_earned integer not null default 0,
  unique (quiz_attempt_id, question_id)
);

-- 16. Analytics Events
create table public.analytics_events (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  event_type text not null check (event_type in ('material_opened', 'assignment_submitted', 'quiz_attempted')),
  details jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.schools enable row level security;
alter table public.terms enable row level security;
alter table public.sections enable row level security;
alter table public.students enable row level security;
alter table public.enrollments enable row level security;
alter table public.attendance enable row level security;
alter table public.subjects enable row level security;
alter table public.lessons enable row level security;
alter table public.assignments enable row level security;
alter table public.submissions enable row level security;
alter table public.quizzes enable row level security;
alter table public.questions enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.quiz_answers enable row level security;
alter table public.analytics_events enable row level security;

-- =========================================================================
-- ROW LEVEL SECURITY POLICIES
-- =========================================================================

-- Helper function to check if the current user is an admin
create or replace function public.is_admin()
returns boolean security definer as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
end;
$$ language plpgsql;

-- Helper function to check user's school id
create or replace function public.user_school_id()
returns uuid security definer as $$
declare
  s_id uuid;
begin
  select school_id into s_id from public.profiles where id = auth.uid();
  return s_id;
end;
$$ language plpgsql;

-- 1. Profiles policies
create policy "Allow select profiles for members of the same school"
  on public.profiles for select
  using (auth.uid() is not null and (school_id = public.user_school_id() or public.is_admin()));

create policy "Allow insert profiles for self or admin"
  on public.profiles for insert
  with check (auth.uid() = id or public.is_admin());

create policy "Allow update profiles for self or admin"
  on public.profiles for update
  using (auth.uid() = id or public.is_admin());

-- 2. Schools policies
create policy "Allow select schools for members or admin"
  on public.schools for select
  using (id = public.user_school_id() or public.is_admin());

create policy "Admin complete control on schools"
  on public.schools for all
  using (public.is_admin());

-- 3. Terms policies
create policy "Allow select terms for members or admin"
  on public.terms for select
  using (school_id = public.user_school_id() or public.is_admin());

create policy "Admin complete control on terms"
  on public.terms for all
  using (public.is_admin());

-- 4. Sections policies
create policy "Allow select sections for members or admin"
  on public.sections for select
  using (exists (
    select 1 from public.terms
    where terms.id = sections.term_id and (terms.school_id = public.user_school_id() or public.is_admin())
  ));

create policy "Admin complete control on sections"
  on public.sections for all
  using (public.is_admin());

-- 5. Students policies
create policy "Allow select students for members or admin"
  on public.students for select
  using (school_id = public.user_school_id() or public.is_admin());

create policy "Admin complete control on students"
  on public.students for all
  using (public.is_admin());

-- 6. Enrollments policies
create policy "Allow select enrollments for members or admin"
  on public.enrollments for select
  using (exists (
    select 1 from public.students
    where students.id = enrollments.student_id and (students.school_id = public.user_school_id() or public.is_admin())
  ));

create policy "Admin complete control on enrollments"
  on public.enrollments for all
  using (public.is_admin());

-- 7. Attendance policies
create policy "Allow select attendance for school members"
  on public.attendance for select
  using (exists (
    select 1 from public.students
    where students.id = attendance.student_id and (students.school_id = public.user_school_id() or public.is_admin())
  ));

create policy "Allow write attendance for teachers and admin"
  on public.attendance for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and (profiles.role = 'teacher' or profiles.role = 'admin')
    )
  );

-- 8. Subjects policies
create policy "Allow select subjects for school members"
  on public.subjects for select
  using (exists (
    select 1 from public.sections
    join public.terms on terms.id = sections.term_id
    where sections.id = subjects.section_id and (terms.school_id = public.user_school_id() or public.is_admin())
  ));

create policy "Admin complete control on subjects"
  on public.subjects for all
  using (public.is_admin());

-- 9. Lessons policies
create policy "Allow select lessons for members"
  on public.lessons for select
  using (exists (
    select 1 from public.subjects
    join public.sections on sections.id = subjects.section_id
    join public.terms on terms.id = sections.term_id
    where subjects.id = lessons.subject_id and (terms.school_id = public.user_school_id() or public.is_admin())
  ));

create policy "Allow teacher and admin complete control on lessons"
  on public.lessons for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and (profiles.role = 'teacher' or profiles.role = 'admin')
    )
  );

-- 10. Assignments policies
create policy "Allow select assignments for members"
  on public.assignments for select
  using (exists (
    select 1 from public.subjects
    join public.sections on sections.id = subjects.section_id
    join public.terms on terms.id = sections.term_id
    where subjects.id = assignments.subject_id and (terms.school_id = public.user_school_id() or public.is_admin())
  ));

create policy "Allow teacher and admin complete control on assignments"
  on public.assignments for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and (profiles.role = 'teacher' or profiles.role = 'admin')
    )
  );

-- 11. Submissions policies
create policy "Allow select submissions for owner, teacher or admin"
  on public.submissions for select
  using (
    exists (
      select 1 from public.students
      where students.id = submissions.student_id and students.profile_id = auth.uid()
    ) or exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and (profiles.role = 'teacher' or profiles.role = 'admin')
    )
  );

create policy "Allow students to insert/update submissions"
  on public.submissions for all
  using (
    exists (
      select 1 from public.students
      where students.id = submissions.student_id and students.profile_id = auth.uid()
    )
  );

create policy "Allow teachers/admin to grade submissions"
  on public.submissions for update
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and (profiles.role = 'teacher' or profiles.role = 'admin')
    )
  );

-- 12. Quizzes policies
create policy "Allow select quizzes for members"
  on public.quizzes for select
  using (exists (
    select 1 from public.subjects
    join public.sections on sections.id = subjects.section_id
    join public.terms on terms.id = sections.term_id
    where subjects.id = quizzes.subject_id and (terms.school_id = public.user_school_id() or public.is_admin())
  ));

create policy "Allow teacher and admin complete control on quizzes"
  on public.quizzes for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and (profiles.role = 'teacher' or profiles.role = 'admin')
    )
  );

-- 13. Questions policies
create policy "Allow select questions for members"
  on public.questions for select
  using (exists (
    select 1 from public.quizzes
    join public.subjects on subjects.id = quizzes.subject_id
    join public.sections on sections.id = subjects.section_id
    join public.terms on terms.id = sections.term_id
    where quizzes.id = questions.quiz_id and (terms.school_id = public.user_school_id() or public.is_admin())
  ));

create policy "Allow teacher and admin complete control on questions"
  on public.questions for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and (profiles.role = 'teacher' or profiles.role = 'admin')
    )
  );

-- 14. Quiz Attempts policies
create policy "Allow select quiz attempts for student, teacher, admin"
  on public.quiz_attempts for select
  using (
    exists (
      select 1 from public.students
      where students.id = quiz_attempts.student_id and students.profile_id = auth.uid()
    ) or exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and (profiles.role = 'teacher' or profiles.role = 'admin')
    )
  );

create policy "Allow student to create own quiz attempts"
  on public.quiz_attempts for insert
  with check (
    exists (
      select 1 from public.students
      where students.id = quiz_attempts.student_id and students.profile_id = auth.uid()
    )
  );

create policy "Allow teachers/admin to update quiz attempts"
  on public.quiz_attempts for update
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and (profiles.role = 'teacher' or profiles.role = 'admin')
    )
  );

-- 15. Quiz Answers policies
create policy "Allow select quiz answers for student, teacher, admin"
  on public.quiz_answers for select
  using (
    exists (
      select 1 from public.quiz_attempts
      join public.students on students.id = quiz_attempts.student_id
      where quiz_attempts.id = quiz_answers.quiz_attempt_id and students.profile_id = auth.uid()
    ) or exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and (profiles.role = 'teacher' or profiles.role = 'admin')
    )
  );

create policy "Allow student to submit answers"
  on public.quiz_answers for insert
  with check (
    exists (
      select 1 from public.quiz_attempts
      join public.students on students.id = quiz_attempts.student_id
      where quiz_attempts.id = quiz_answers.quiz_attempt_id and students.profile_id = auth.uid()
    )
  );

-- 16. Analytics Events policies
create policy "Allow select events for teachers and admins"
  on public.analytics_events for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and (profiles.role = 'teacher' or profiles.role = 'admin')
    )
  );

create policy "Allow inserting own events"
  on public.analytics_events for insert
  with check (
    user_id = auth.uid()
  );
