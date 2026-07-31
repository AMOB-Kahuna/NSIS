# Classroom Support & Learning Analytics (CSLA)

An all-in-one educational platform combining a Student Information System (SIS) for administrative tasks (school, term, section configuration, bulk student importing, daily attendance tracking) and a Learning Management System (LMS) for courserooms (lessons, homework assignments with grading, auto-graded quizzes) and rule-based engagement analytics.

---

## 1. Features & Capabilities

- **Role-Based Access Control**: Admins, Teachers, and Students access customized dashboards.
- **SIS Core**: Section & term administration, daily calendar attendance rosters, and student registers.
- **Three-Tab Teacher Attendance Dashboard**:
  - **Student Risk Flags Tab**: Lists enrolled students with color-coded risk tags (*Clear* or *At Risk*). Clicking any student launches a details modal displaying term attendance rates, quiz averages, last activity, and triggered early warning reasons.
  - **Full Attendance Grid Tab**: Renders a term-long weekday grid sheet. Includes sticky student name columns (to easily scroll horizontally), daily status indicators, summary statistics (present/absent/tardy/excused counts and rates), search filtering, and export-to-CSV functionality.
  - **Mark Daily Attendance Tab**: The standard form for recording daily attendance. It has been expanded to support **Tardy** marks in addition to Present, Absent, and Excused status.
- **LMS Core**: Markdown-compatible lessons, homework assignments with grading overlays, and server-side graded quizzes with topic tags.
- **Gradebook Matrix**: Grid spreadsheets for teachers with inline submission inspectors.
- **Real-Time Participation Analytics**:
  - **Teacher Dashboard**: Section averages and class submission stats.
  - **Early Warning Flagging**: Dynamically flags students as "At Risk" if they meet criteria:
    1. `(Attendance Rate < 70%) AND (Quiz Average < 50%)`
    2. **OR** `(No submissions in the last 14 days)`
  - **Student Dashboard**: Personal metrics gauges, logs lesson opening events, and at-risk notifications.
- **Performance & Navigation Polish**:
  - **Seamless Navigation (GET Caching)**: Out-of-the-box API caching for GET requests prevents page flickering and loading animations when navigating back to the dashboard or class views. Non-GET requests (mutations) automatically invalidate the cache.
  - **Silent Token Refresh**: Tab-focus switching and Supabase session refreshes run silently in the background, preventing full-screen re-authentication loops.

---

## 2. Project Architecture

The application splits cleanly into two folders:
1. `backend/`: Node.js Express server using **ES modules** (`import` statements). Integrates with Supabase Admin/Service-Role APIs to bypass RLS safely for calculations, registration, and grading.
2. `frontend/`: React Vite client using **Tailwind CSS v4** and Lucide icons. Communicates directly with the backend REST endpoints using Bearer JWT tokens.

---

## 3. Database Schema

Tables are designed in PostgreSQL for Supabase:
- `profiles` & `students` (user registry)
- `schools`, `terms`, `sections` (SIS structure)
- `attendance` (daily records)
- `subjects`, `lessons` (LMS course rooms)
- `assignments` & `submissions` (homework grading)
- `quizzes`, `questions`, `quiz_attempts`, `quiz_answers` (evaluation)
- `analytics_events` (engagement logs)

*RLS (Row-Level Security) policies are enabled on all tables to secure frontend calls, restricting students to their own submissions and classes, and granting admins/teachers complete control.*

---

## 4. Setup Instructions

### Step 1: Database Setup
1. Create a new project on [Supabase](https://supabase.com/).
2. Navigate to the **SQL Editor** on the Supabase console.
3. Open the file `supabase/schema.sql` from this repository, copy its contents, paste them into the SQL editor, and click **Run**. This will create all tables, indexes, and Row-Level Security policies.

### Step 2: Backend Configuration
1. Change into the backend directory:
   ```bash
   cd backend
   ```
2. Copy the `.env` template or write a `.env` file:
   ```env
   PORT=5000
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key-secret
   SUPABASE_ANON_KEY=your-supabase-anon-key
   ```
   > [!IMPORTANT]
   > Make sure to get the **Service Role Key** (found in Project Settings > API) for the `SUPABASE_SERVICE_ROLE_KEY` to allow programmatic student creation.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Seed the database (creates school, class section, subjects, lesson materials, assignments, quizzes, and registers user accounts):
   ```bash
   npm run seed
   ```
5. Start the server:
   ```bash
   npm run dev
   ```

### Step 3: Frontend Configuration
1. Change into the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Create a `.env` file:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   VITE_API_URL=http://localhost:5000/api
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Run the frontend development server:
   ```bash
   npm run dev
   ```
5. Open your browser and navigate to `http://localhost:5173`.

---

## 5. Sandboxed Credentials

The database seeding process creates the following accounts with pre-loaded mock profiles for sandbox testing:

| Role | Username | Password |
| :--- | :--- | :--- |
| **Admin** | `admin@ihs.edu` | `AdminPass123!` |
| **Teacher** | `teacher@ihs.edu` | `TeacherPass123!` |
| **Student 1** | `student1@ihs.edu` | `StudentPass123!` |
| **Student 2** | `student2@ihs.edu` | `StudentPass123!` |
| **Student 3** | `student3@ihs.edu` | `StudentPass123!` |
| **Student 4** | `student4@ihs.edu` | `StudentPass123!` |

*(Use the quick login shortcuts on the Login view to bypass credentials entry!)*
