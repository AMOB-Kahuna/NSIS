import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import { BookOpen, Calendar, Award, AlertTriangle, ArrowRight, BarChart2, CheckCircle } from 'lucide-react';

export default function StudentDashboard() {
  const { apiFetch, profile } = useAuth();

  const [subjects, setSubjects] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch enrolled subjects
      const subData = await apiFetch('/lms/subjects');
      setSubjects(subData);

      // 2. Fetch student analytics
      const analyticsData = await apiFetch('/analytics/student');
      setAnalytics(analyticsData);
    } catch (err) {
      console.error('Error loading student dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-green-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
        <span className="ml-3 font-semibold">Loading Student Portal...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white tracking-tight">Student Portal</h1>
        <h1 className="text-lg font-medium text-gray-300 tracking-tight">{profile?.school_name}</h1>
        <p className="text-gray-400">Review your schedule, open slides, submit work, and check grades</p>
      </div>

      {/* At-risk Warning Alert */}
      {analytics?.isAtRisk && (
        <div className="mb-8 bg-red-950/40 border border-red-500/40 rounded-2xl p-6 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/5 rounded-full blur-2xl -z-10"></div>
          <div className="flex items-start gap-4">
            <div className="p-3 bg-red-500/20 text-red-400 rounded-xl border border-red-500/30">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Academic Warning Flagged</h2>
              <p className="text-sm text-red-300 mt-1 max-w-xl">
                You have been flagged as "At Risk" based on current participation metrics. Please review the criteria below:
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {analytics.reasons?.map((reason, idx) => (
                  <span
                    key={idx}
                    className="bg-red-900/50 text-red-200 border border-red-900 rounded px-2.5 py-0.5 text-xs font-semibold"
                  >
                    {reason}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="text-xs text-red-400 font-mono self-end md:self-center">
            Contact your instructor immediately
          </div>
        </div>
      )}

      {/* Personal Analytics Row */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="glass-panel p-5 rounded-2xl flex items-center gap-4">
            <div className="p-3 bg-green-500/10 text-green-400 rounded-xl">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">Attendance Rate</div>
              <div className="text-2xl font-bold text-white mt-0.5">{analytics.attendanceRate}%</div>
              <p className="text-[10px] text-gray-400 mt-0.5">Target &gt; 70%</p>
            </div>
          </div>

          <div className="glass-panel p-5 rounded-2xl flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">Quiz Performance</div>
              <div className="text-2xl font-bold text-white mt-0.5">{analytics.quizAverage}%</div>
              <p className="text-[10px] text-gray-400 mt-0.5">Target &gt; 50%</p>
            </div>
          </div>

          <div className="glass-panel p-5 rounded-2xl flex items-center gap-4">
            <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl">
              <BarChart2 className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">Submissions Completed</div>
              <div className="text-2xl font-bold text-white mt-0.5">{analytics.assignmentSubmissionRate}%</div>
              <p className="text-[10px] text-gray-400 mt-0.5">Active inside last 14 days</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Enrolled Courses */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-green-400" />
            My Active Courses
          </h2>

          {subjects.length === 0 ? (
            <p className="text-gray-500 py-8 text-center text-sm">
              You are not enrolled in any sections for the current term.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {subjects.map(subj => (
                <Link
                  key={subj.id}
                  to={`/subjects/${subj.id}`}
                  className="p-4 bg-gray-950 hover:bg-gray-900 border border-gray-800 rounded-xl flex flex-col justify-between transition-colors cursor-pointer group"
                >
                  <div>
                    <span className="text-[10px] font-bold tracking-wider text-green-400 uppercase">
                      Grade 10
                    </span>
                    <div className="font-semibold text-white text-base mt-0.5 group-hover:text-green-400 transition-colors">
                      {subj.name}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Instructor: {subj.teacher?.full_name || 'Timothy Teacher'}
                    </div>
                  </div>
                  <div className="flex justify-end mt-4">
                    <span className="text-xs font-semibold text-green-400 flex items-center gap-1 group-hover:text-green-300">
                      Open Room <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Academic Standings (Right column) */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              Academic standing
            </h2>
            <div className="p-4 bg-gray-950 border border-gray-800 rounded-xl space-y-4">
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Status</div>
                <span className={`inline-block px-3 py-1 text-xs font-bold rounded-lg mt-1 ${analytics?.isAtRisk
                    ? 'bg-red-500/20 border border-red-500/40 text-red-400'
                    : 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
                  }`}>
                  {analytics?.isAtRisk ? 'Requires Attention' : 'Good Standing'}
                </span>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Last Activity</div>
                <div className="text-sm font-semibold text-white mt-1">
                  {analytics?.daysSinceLastActivity === 0 ? 'Today' : `${analytics?.daysSinceLastActivity} days ago`}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-gray-800/80 text-[10px] text-gray-500 text-center font-mono">
            Education early-warning logs
          </div>
        </div>
      </div>
    </div>
  );
}
