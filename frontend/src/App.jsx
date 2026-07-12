import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Views
import Login from './views/Login';
import AdminDashboard from './views/Admin/Dashboard';
import TeacherDashboard from './views/Teacher/Dashboard';
import SubjectDetail from './views/Teacher/SubjectDetail';
import RecordAttendance from './views/Teacher/Attendance';
import ClassGradebook from './views/Teacher/Gradebook';
import StudentDashboard from './views/Student/Dashboard';
import StudentSubjectView from './views/Student/SubjectView';
import SubmitAssignment from './views/Student/SubmitAssignment';
import TakeQuiz from './views/Student/TakeQuiz';

// Icons
import { GraduationCap, LogOut, Loader2, User } from 'lucide-react';

// 1. Auth Guard Component
function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 text-purple-400">
        <Loader2 className="w-12 h-12 animate-spin mb-4" />
        <span className="font-semibold text-lg">Authenticating session...</span>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
}

// 2. Role Guard Component
function RequireRole({ allowedRoles, children }) {
  const { profile } = useAuth();
  
  if (!profile) {
    return <Navigate to="/login" replace />;
  }
  
  if (!allowedRoles.includes(profile.role)) {
    // Redirect to default home based on role
    const defaultHomes = {
      admin: '/admin',
      teacher: '/teacher',
      student: '/student'
    };
    return <Navigate to={defaultHomes[profile.role] || '/login'} replace />;
  }
  
  return children;
}

// 3. Subject Router (different view based on role)
function SubjectRouter() {
  const { profile } = useAuth();
  
  if (!profile) return <Navigate to="/login" replace />;
  
  if (profile.role === 'student') {
    return <StudentSubjectView />;
  } else {
    return <SubjectDetail />;
  }
}

// 4. Layout Wrapper Shell
function DashboardLayout({ children }) {
  const { profile, logout } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Navbar */}
      <header className="glass-panel border-b border-gray-800/80 px-6 py-4 flex items-center justify-between sticky top-0 z-40 backdrop-blur-md">
        <Link to="/" className="flex items-center gap-2">
          <div className="p-2 bg-green-700/20 text-green-400 border border-green-600/20 rounded-lg">
            <GraduationCap className="w-5 h-5" />
          </div>
          <span className="font-bold text-white text-lg tracking-tight">EduSIS & LMS</span>
        </Link>

        {profile && (
          <div className="flex items-center gap-6">
            {/* Profile Info & Badge */}
            <div className="flex items-center gap-3">
              <div className="hidden md:block text-right">
                <div className="font-semibold text-white text-sm">{profile.full_name}</div>
                <div className="text-[10px] text-gray-400 font-mono mt-0.5">{profile.email}</div>
              </div>
              <div className="p-2 bg-gray-900 border border-gray-800 rounded-lg text-gray-400">
                <User className="w-4 h-4" />
              </div>
              <span className={`px-2 py-0.5 border text-[9px] font-extrabold uppercase tracking-wider rounded ${
                profile.role === 'admin' 
                  ? 'bg-red-500/10 border-red-500/30 text-red-400' 
                  : profile.role === 'teacher'
                    ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              }`}>
                {profile.role}
              </span>
            </div>

            {/* Logout */}
            <button
              id="logout-btn"
              onClick={logout}
              className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-950/20 rounded-lg border border-transparent hover:border-red-950 transition-all cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </header>

      {/* Main Viewport */}
      <main className="flex-1 bg-transparent">
        {children}
      </main>
    </div>
  );
}

// 5. Index Redirect Handler
function RootRedirect() {
  const { profile } = useAuth();
  
  if (!profile) return <Navigate to="/login" replace />;
  
  const dashboards = {
    admin: '/admin',
    teacher: '/teacher',
    student: '/student'
  };
  
  return <Navigate to={dashboards[profile.role] || '/login'} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Auth routes */}
          <Route path="/login" element={<Login />} />

          {/* Root redirect */}
          <Route path="/" element={<RequireAuth><RootRedirect /></RequireAuth>} />

          {/* Admin routes */}
          <Route path="/admin" element={
            <RequireAuth>
              <RequireRole allowedRoles={['admin']}>
                <DashboardLayout><AdminDashboard /></DashboardLayout>
              </RequireRole>
            </RequireAuth>
          } />

          {/* Teacher routes */}
          <Route path="/teacher" element={
            <RequireAuth>
              <RequireRole allowedRoles={['teacher', 'admin']}>
                <DashboardLayout><TeacherDashboard /></DashboardLayout>
              </RequireRole>
            </RequireAuth>
          } />

          <Route path="/attendance/:sectionId" element={
            <RequireAuth>
              <RequireRole allowedRoles={['teacher', 'admin']}>
                <DashboardLayout><RecordAttendance /></DashboardLayout>
              </RequireRole>
            </RequireAuth>
          } />

          <Route path="/gradebook/:sectionId" element={
            <RequireAuth>
              <RequireRole allowedRoles={['teacher', 'admin']}>
                <DashboardLayout><ClassGradebook /></DashboardLayout>
              </RequireRole>
            </RequireAuth>
          } />

          {/* Student routes */}
          <Route path="/student" element={
            <RequireAuth>
              <RequireRole allowedRoles={['student']}>
                <DashboardLayout><StudentDashboard /></DashboardLayout>
              </RequireRole>
            </RequireAuth>
          } />

          <Route path="/submit-assignment/:id" element={
            <RequireAuth>
              <RequireRole allowedRoles={['student']}>
                <DashboardLayout><SubmitAssignment /></DashboardLayout>
              </RequireRole>
            </RequireAuth>
          } />

          <Route path="/take-quiz/:id" element={
            <RequireAuth>
              <RequireRole allowedRoles={['student']}>
                <DashboardLayout><TakeQuiz /></DashboardLayout>
              </RequireRole>
            </RequireAuth>
          } />

          {/* Course rooms (Shared URL, distinct template loaded dynamically) */}
          <Route path="/subjects/:id" element={
            <RequireAuth>
              <DashboardLayout><SubjectRouter /></DashboardLayout>
            </RequireAuth>
          } />

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
