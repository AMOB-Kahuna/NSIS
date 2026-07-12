import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import { BookOpen, Users, CheckSquare, Award, AlertTriangle, ChevronRight, BarChart2 } from 'lucide-react';

export default function TeacherDashboard() {
  const { apiFetch, profile } = useAuth();

  const [sections, setSections] = useState([]);
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [subjects, setSubjects] = useState([]);

  // Section Analytics
  const [analytics, setAnalytics] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  const loadSections = async () => {
    try {
      const sectionsData = await apiFetch('/sis/sections');
      setSections(sectionsData);
      if (sectionsData.length > 0) {
        setSelectedSectionId(sectionsData[0].id);
      }
    } catch (err) {
      console.error('Error loading sections:', err);
    }
  };

  const loadSubjectsAndAnalytics = async (sectionId) => {
    if (!sectionId) return;
    setLoadingAnalytics(true);
    try {
      // Load subjects for this section
      const subjData = await apiFetch(`/lms/subjects?section_id=${sectionId}`);
      setSubjects(subjData);

      // Load analytics for this section
      const analyticsData = await apiFetch(`/analytics/teacher/${sectionId}`);
      setAnalytics(analyticsData);
    } catch (err) {
      console.error('Error loading section details:', err);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  useEffect(() => {
    loadSections();
  }, []);

  useEffect(() => {
    if (selectedSectionId) {
      loadSubjectsAndAnalytics(selectedSectionId);
    }
  }, [selectedSectionId]);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header & Section Selector */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Teacher Dashboard</h1>
          <h1 className="text-lg font-medium text-gray-300 tracking-tight">{profile?.school_name}</h1>
          <p className="text-gray-400">Review class stats, organize lessons, and track student success</p>
        </div>

        {/* Section drop down */}
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-400">Active Class:</label>
          <select
            id="section-select"
            value={selectedSectionId}
            onChange={(e) => setSelectedSectionId(e.target.value)}
            className="px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer font-medium"
          >
            {sections.map(sec => (
              <option key={sec.id} value={sec.id}>{sec.name}</option>
            ))}
          </select>
        </div>
      </div>

      {loadingAnalytics ? (
        <div className="flex items-center justify-center py-20 text-purple-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
          <span className="ml-3 font-medium">Gathering metrics...</span>
        </div>
      ) : (
        <>
          {/* Metrics Overview Cards */}
          {analytics && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="glass-panel p-5 rounded-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-purple-600/5 rounded-full blur-xl -z-10"></div>
                <div className="text-sm font-medium text-gray-400">Enrolled Students</div>
                <div className="text-3xl font-bold text-white mt-1.5 flex items-baseline gap-1">
                  {analytics.totalStudents} <span className="text-xs text-gray-500 font-normal">Active</span>
                </div>
              </div>

              <div className="glass-panel p-5 rounded-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-600/5 rounded-full blur-xl -z-10"></div>
                <div className="text-sm font-medium text-gray-400">Attendance Rate</div>
                <div className="text-3xl font-bold mt-1.5 flex items-baseline gap-1">
                  <span className={analytics.sectionAttendanceRate < 70 ? 'text-red-400' : 'text-emerald-400'}>
                    {analytics.sectionAttendanceRate}%
                  </span>
                </div>
              </div>

              <div className="glass-panel p-5 rounded-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600/5 rounded-full blur-xl -z-10"></div>
                <div className="text-sm font-medium text-gray-400">Quiz Average</div>
                <div className="text-3xl font-bold mt-1.5 flex items-baseline gap-1">
                  <span className={analytics.quizAverage < 50 ? 'text-red-400' : 'text-blue-400'}>
                    {analytics.quizAverage}%
                  </span>
                </div>
              </div>

              <div className="glass-panel p-5 rounded-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-600/5 rounded-full blur-xl -z-10"></div>
                <div className="text-sm font-medium text-gray-400">Assignment Completion</div>
                <div className="text-3xl font-bold text-indigo-400 mt-1.5">
                  {analytics.submissionRate}%
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Subjects and Actions (Left 2 columns) */}
            <div className="lg:col-span-2 space-y-6">
              {/* Core links */}
              <div className="grid grid-cols-2 gap-4">
                <Link
                  id="link-attendance"
                  to={`/attendance/${selectedSectionId}`}
                  className="glass-card p-5 rounded-xl flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-purple-500/10 text-purple-400 rounded-lg group-hover:bg-purple-500/20 transition-colors">
                      <CheckSquare className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-white">Record Attendance</div>
                      <div className="text-xs text-gray-400 mt-0.5">Track daily class presence</div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
                </Link>

                <Link
                  id="link-gradebook"
                  to={`/gradebook/${selectedSectionId}`}
                  className="glass-card p-5 rounded-xl flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-500/10 text-blue-400 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                      <Award className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-white">Class Gradebook</div>
                      <div className="text-xs text-gray-400 mt-0.5">View & manage grades</div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
                </Link>
              </div>

              {/* Subject list */}
              <div className="glass-panel p-6 rounded-2xl">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-purple-400" />
                  Course Subjects
                </h2>

                {subjects.length === 0 ? (
                  <p className="text-gray-500 py-6 text-center text-sm">
                    No subjects assigned to you in this section.
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
                          <div className="font-semibold text-white group-hover:text-purple-400 transition-colors">
                            {subj.name}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            Instructor: {subj.teacher?.full_name || 'You'}
                          </div>
                        </div>
                        <div className="flex justify-end mt-4">
                          <span className="text-xs font-semibold text-purple-400 flex items-center gap-1 group-hover:text-purple-300">
                            Course Room <ChevronRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Early Warning Flag Panel (Right column) */}
            <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
              <div>
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500 animate-pulse" />
                  Early Warning flags
                </h2>
                <p className="text-xs text-gray-400 mb-6">
                  Students flagged as “At Risk” based on criteria: attendance &lt; 70% AND quiz average &lt; 50%, or no submissions for 14 days.
                </p>

                {!analytics?.atRiskStudents || analytics.atRiskStudents.length === 0 ? (
                  <div className="text-center py-12 bg-gray-950/20 border border-gray-900 rounded-xl">
                    <span className="text-emerald-400 font-semibold block text-sm">All Clear</span>
                    <span className="text-xs text-gray-500 mt-1 block">No students currently flagged at risk</span>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                    {analytics.atRiskStudents.map((stud) => (
                      <div
                        key={stud.student_id}
                        className="p-3 bg-red-950/20 border border-red-500/20 rounded-xl space-y-2"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-semibold text-white text-sm">{stud.fullName}</div>
                            <div className="text-[10px] text-gray-400">{stud.email}</div>
                          </div>
                          <span className="px-2 py-0.5 bg-red-500/20 border border-red-500/40 text-red-400 rounded text-[9px] font-bold uppercase tracking-wider">
                            At Risk
                          </span>
                        </div>

                        {/* Details */}
                        <div className="grid grid-cols-2 gap-1 text-[10px] text-gray-300">
                          <div>Attendance: <span className={stud.attendanceRate < 0.7 ? 'text-red-400 font-bold' : 'text-gray-400'}>{Math.round(stud.attendanceRate * 100)}%</span></div>
                          <div>Quiz Avg: <span className={stud.quizAverage < 0.5 ? 'text-red-400 font-bold' : 'text-gray-400'}>{Math.round(stud.quizAverage * 100)}%</span></div>
                        </div>

                        {/* Reasons */}
                        <div className="space-y-1 pt-1.5 border-t border-red-500/10">
                          {stud.reasons.map((reason, idx) => (
                            <span
                              key={idx}
                              className="inline-block bg-red-950 text-red-300 border border-red-900 rounded px-1.5 py-0.5 text-[9px] font-medium mr-1"
                            >
                              {reason}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-8 pt-4 border-t border-gray-800/80 text-[10px] text-gray-500 text-center font-mono">
                At-risk parameters computed dynamically
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
