import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { AttendanceProvider, useAttendance } from '../../context/AttendanceContext';
import StudentRiskList from '../../components/Teacher/StudentRiskList';
import AttendanceGrid from '../../components/Teacher/AttendanceGrid';
import { ArrowLeft, Save, Calendar, Loader2, AlertTriangle, Grid, ClipboardCheck } from 'lucide-react';

export default function RecordAttendance() {
  return (
    <AttendanceProvider>
      <AttendanceDashboard />
    </AttendanceProvider>
  );
}

function AttendanceDashboard() {
  const { sectionId } = useParams();
  const { apiFetch } = useAuth();
  const { students, atRiskInfo, loading: contextLoading } = useAttendance();

  const [activeTab, setActiveTab] = useState('roster'); // 'roster' | 'grid' | 'daily'
  const [sectionName, setSectionName] = useState('');
  
  // Daily marking states
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceMarks, setAttendanceMarks] = useState({}); // { [studentId]: 'present' | 'absent' | 'tardy' | 'excused' }
  const [loadingMarks, setLoadingMarks] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');

  // Fetch section name for the header
  useEffect(() => {
    const getSectionInfo = async () => {
      try {
        const sections = await apiFetch('/sis/sections');
        const sec = sections.find((s) => s.id === sectionId);
        if (sec) {
          setSectionName(sec.name);
        }
      } catch (err) {
        console.error('Error fetching section name:', err);
      }
    };
    if (sectionId) {
      getSectionInfo();
    }
  }, [sectionId]);

  // Load existing attendance marks for the selected date
  useEffect(() => {
    const fetchMarks = async () => {
      if (!sectionId || students.length === 0) return;
      setLoadingMarks(true);
      try {
        const attendance = await apiFetch(`/sis/attendance?section_id=${sectionId}&date=${date}`);
        const marks = {};
        students.forEach((stud) => {
          const record = attendance.find((a) => a.student_id === stud.id);
          marks[stud.id] = record ? record.status : 'present'; // Default to present
        });
        setAttendanceMarks(marks);
      } catch (err) {
        console.error('Error loading daily attendance marks:', err);
      } finally {
        setLoadingMarks(false);
      }
    };
    fetchMarks();
  }, [sectionId, date, students]);

  const handleMarkChange = (studentId, markStatus) => {
    setAttendanceMarks({
      ...attendanceMarks,
      [studentId]: markStatus,
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setStatus('');
    try {
      const records = Object.keys(attendanceMarks).map((studentId) => ({
        student_id: studentId,
        status: attendanceMarks[studentId],
      }));

      await apiFetch('/sis/attendance', {
        method: 'POST',
        body: JSON.stringify({
          section_id: sectionId,
          date,
          records,
        }),
      });

      setStatus('Attendance saved successfully!');
      setTimeout(() => setStatus(''), 4000);
    } catch (err) {
      console.error('Error saving attendance:', err);
      setStatus(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (contextLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-green-400">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-3 font-semibold">Loading Attendance Dashboard...</span>
      </div>
    );
  }

  const tabs = [
    { id: 'roster', label: 'Student Risk Flags', icon: AlertTriangle },
    { id: 'grid', label: 'Full Attendance Grid', icon: Grid },
    { id: 'daily', label: 'Mark Daily Attendance', icon: ClipboardCheck },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Navigation */}
      <Link
        to="/teacher"
        className="inline-flex items-center text-sm font-semibold text-green-400 hover:text-green-300 gap-1 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </Link>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            {sectionName ? `${sectionName} Attendance` : 'Class Attendance'}
          </h1>
          <p className="text-gray-400">Manage daily presence, analyze risk levels, and view term-long roster metrics</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-800 mb-8 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 border-b-2 text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'border-green-500 text-green-400 bg-green-500/5'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-900/40'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      <div className="tab-content transition-all duration-300">
        {activeTab === 'roster' && (
          <StudentRiskList students={students} atRiskInfo={atRiskInfo} />
        )}

        {activeTab === 'grid' && (
          <AttendanceGrid sectionId={sectionId} students={students} />
        )}

        {activeTab === 'daily' && (
          <div className="space-y-6">
            {/* Daily Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-900/30 p-4 rounded-xl border border-gray-800/80">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-gray-950 border border-gray-800 rounded-lg px-3 py-1.5">
                  <Calendar className="w-4 h-4 text-green-400" />
                  <input
                    id="attendance-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="bg-transparent text-white text-sm focus:outline-none cursor-pointer"
                  />
                </div>
                {loadingMarks && (
                  <div className="flex items-center text-xs text-gray-400 gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading marks...
                  </div>
                )}
              </div>

              <button
                id="save-attendance-btn"
                onClick={handleSave}
                disabled={saving || loadingMarks}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white rounded-lg text-sm font-medium shadow-md transition-colors flex items-center gap-2 cursor-pointer"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Daily Attendance
              </button>
            </div>

            {status && (
              <div
                className={`p-4 rounded-lg border text-sm text-center ${
                  status.includes('Error')
                    ? 'bg-red-950/40 border-red-500/50 text-red-200'
                    : 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                }`}
              >
                {status}
              </div>
            )}

            {/* Daily Mark Table */}
            <div className="glass-panel rounded-2xl overflow-hidden shadow-xl border border-gray-800/80">
              {students.length === 0 ? (
                <p className="text-gray-500 py-12 text-center text-sm">No students enrolled in this section.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-800 bg-gray-950/60 text-gray-400 text-xs font-semibold uppercase tracking-wider">
                        <th className="p-4 pl-6">Student Name</th>
                        <th className="p-4">Email</th>
                        <th className="p-4 text-center">Attendance Marks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/40 text-sm">
                      {students.map((student) => (
                        <tr key={student.id} className="hover:bg-gray-900/10 transition-colors">
                          <td className="p-4 pl-6 font-semibold text-white">
                            {student.profiles?.full_name}
                          </td>
                          <td className="p-4 text-gray-400 font-mono text-xs">
                            {student.profiles?.email}
                          </td>
                          <td className="p-4">
                            <div className="flex justify-center items-center gap-2">
                              {['present', 'absent', 'tardy', 'excused'].map((markStatus) => {
                                const isSelected = attendanceMarks[student.id] === markStatus;
                                let theme = '';
                                if (markStatus === 'present') {
                                  theme = isSelected
                                    ? 'bg-emerald-600 border-emerald-500 text-white'
                                    : 'text-emerald-400 hover:bg-emerald-500/10 border-emerald-500/20';
                                } else if (markStatus === 'absent') {
                                  theme = isSelected
                                    ? 'bg-red-600 border-red-500 text-white'
                                    : 'text-red-400 hover:bg-red-500/10 border-red-500/20';
                                } else if (markStatus === 'tardy') {
                                  theme = isSelected
                                    ? 'bg-amber-600 border-amber-500 text-white'
                                    : 'text-amber-400 hover:bg-amber-500/10 border-amber-500/20';
                                } else if (markStatus === 'excused') {
                                  theme = isSelected
                                    ? 'bg-blue-600 border-blue-500 text-white'
                                    : 'text-blue-400 hover:bg-blue-500/10 border-blue-500/20';
                                }

                                return (
                                  <button
                                    key={markStatus}
                                    id={`mark-${student.id}-${markStatus}`}
                                    onClick={() => handleMarkChange(student.id, markStatus)}
                                    className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer capitalize ${theme}`}
                                  >
                                    {markStatus}
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
