import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, Lock, Mail, Loader2 } from 'lucide-react';

export default function Login() {
  const { profile, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      navigate('/');
    }
  }, [profile, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      return setError('Please enter both email and password.');
    }
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (role) => {
    setError('');
    if (role === 'admin') {
      setEmail('admin@beacon.edu');
      setPassword('AdminPass123!');
    } else if (role === 'teacher') {
      setEmail('teacher@beacon.edu');
      setPassword('TeacherPass123!');
    } else if (role === 'student') {
      setEmail('student1@beacon.edu');
      setPassword('StudentPass123!');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl -z-10"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl -z-10"></div>

      <div className="w-full max-w-md glass-card rounded-2xl p-8 shadow-2xl">
        <div className="flex flex-col items-center justify-center text-center mb-8">
          <div className="p-3 bg-green-600/20 text-green-400 rounded-xl mb-3 border border-green-500/30">
            <GraduationCap className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">EduSIS & LMS</h1>
          <p className="text-gray-400 text-sm mt-1">Sign in to access your classroom</p>
        </div>

        {error && (
          <div className="bg-red-950/50 border border-red-500/50 text-red-200 rounded-lg p-3 text-sm mb-6 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
                <Mail className="w-4 h-4" />
              </span>
              <input
                id="email-input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@school.edu"
                className="w-full pl-10 pr-4 py-2.5 bg-gray-900/60 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
                <Lock className="w-4 h-4" />
              </span>
              <input
                id="password-input"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-gray-900/60 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <button
            id="login-btn"
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-green-700 hover:bg-green-700 disabled:bg-green-800/50 text-white font-medium rounded-lg shadow-lg hover:shadow-green-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-800/80">
          <p className="text-center text-xs font-medium uppercase tracking-wider text-gray-500 mb-3">
            Quick Sandbox Logins
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              id="quick-admin"
              onClick={() => handleQuickFill('admin')}
              className="py-1.5 px-2 bg-gray-900/80 hover:bg-green-950/30 border border-gray-800 text-green-400 hover:text-green-300 rounded text-xs transition-colors cursor-pointer text-center"
            >
              Admin
            </button>
            <button
              id="quick-teacher"
              onClick={() => handleQuickFill('teacher')}
              className="py-1.5 px-2 bg-gray-900/80 hover:bg-green-950/30 border border-gray-800 text-green-400 hover:text-green-300 rounded text-xs transition-colors cursor-pointer text-center"
            >
              Teacher
            </button>
            <button
              id="quick-student"
              onClick={() => handleQuickFill('student')}
              className="py-1.5 px-2 bg-gray-900/80 hover:bg-green-950/30 border border-gray-800 text-green-400 hover:text-green-300 rounded text-xs transition-colors cursor-pointer text-center"
            >
              Student
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
