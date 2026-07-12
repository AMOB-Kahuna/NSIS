import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, Save, Calendar, Loader2, CheckCircle2 } from 'lucide-react';

export default function RecordAttendance() {
  const { sectionId } = useParams();
  const { apiFetch } = useAuth();

  const [students, setStudents] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceMarks, setAttendanceMarks] = useState({}); // { [studentId]: 'present' | 'absent' ... }
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch students enrolled
      const enrollments = await apiFetch(`/sis/enrollments?section_id=${sectionId}`);
      const studentsList = enrollments.map(e => e.student).filter(Boolean);
      setStudents(studentsList);

      // 2. Fetch existing attendance for this date
      const attendance = await apiFetch(`/sis/attendance?section_id=${sectionId}&date=${date}`);
      
      // Initialize marks
      const marks = {};
      studentsList.forEach(stud => {
        const record = attendance.find(a => a.student_id === stud.id);
        marks[stud.id] = record ? record.status : 'present'; // default present
      });
      setAttendanceMarks(marks);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sectionId) {
      loadData();
    }
  }, [sectionId, date]);

  const handleMarkChange = (studentId, status) => {
    setAttendanceMarks({
      ...attendanceMarks,
      [studentId]: status
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setStatus('');
    try {
      const records = Object.keys(attendanceMarks).map(studentId => ({
        student_id: studentId,
        status: attendanceMarks[studentId]
      }));

      await apiFetch('/sis/attendance', {
        method: 'POST',
        body: JSON.stringify({
          section_id: sectionId,
          date,
          records
        })
      });

      setStatus('Attendance saved successfully!');
      setTimeout(() => setStatus(''), 4000);
    } catch (err) {
      console.error(err);
      setStatus(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-purple-400">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-3 font-semibold">Loading Attendance Roster...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Navigation */}
      <Link to="/teacher" className="inline-flex items-center text-sm font-semibold text-purple-400 hover:text-purple-300 gap-1 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </Link>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Record Attendance</h1>
          <p className="text-gray-400">Manage daily presence for class section</p>
        </div>

        {/* Date Selector & Save controls */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-lg px-3 py-1.5">
            <Calendar className="w-4 h-4 text-purple-400" />
            <input
              id="attendance-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-transparent text-white text-sm focus:outline-none cursor-pointer"
            />
          </div>

          <button
            id="save-attendance-btn"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white rounded-lg text-sm font-medium shadow-md transition-colors flex items-center gap-2 cursor-pointer"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Attendance
          </button>
        </div>
      </div>

      {status && (
        <div className={`mb-6 p-4 rounded-lg border text-sm text-center ${
          status.includes('Error') 
            ? 'bg-red-950/40 border-red-500/50 text-red-200' 
            : 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
        }`}>
          {status}
        </div>
      )}

      {/* Roster Table */}
      <div className="glass-panel rounded-2xl overflow-hidden shadow-xl">
        {students.length === 0 ? (
          <p className="text-gray-500 py-12 text-center text-sm">No students enrolled in this section.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-900/40 text-gray-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="p-4 pl-6">Student Name</th>
                  <th className="p-4">Email</th>
                  <th className="p-4 text-center">Attendance Marks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60 text-sm">
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-900/10 transition-colors">
                    <td className="p-4 pl-6 font-semibold text-white">
                      {student.profiles?.full_name}
                    </td>
                    <td className="p-4 text-gray-400">
                      {student.profiles?.email}
                    </td>
                    <td className="p-4">
                      <div className="flex justify-center items-center gap-2">
                        {['present', 'absent', 'tardy', 'excused'].map((status) => {
                          const isSelected = attendanceMarks[student.id] === status;
                          let theme = '';
                          if (status === 'present') theme = isSelected ? 'bg-emerald-600 border-emerald-500 text-white' : 'text-emerald-400 hover:bg-emerald-500/10 border-emerald-500/20';
                          if (status === 'absent') theme = isSelected ? 'bg-red-600 border-red-500 text-white' : 'text-red-400 hover:bg-red-500/10 border-red-500/20';
                          if (status === 'tardy') theme = isSelected ? 'bg-amber-600 border-amber-500 text-white' : 'text-amber-400 hover:bg-amber-500/10 border-amber-500/20';
                          if (status === 'excused') theme = isSelected ? 'bg-blue-600 border-blue-500 text-white' : 'text-blue-400 hover:bg-blue-500/10 border-blue-500/20';

                          return (
                            <button
                              key={status}
                              id={`mark-${student.id}-${status}`}
                              onClick={() => handleMarkChange(student.id, status)}
                              className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer capitalize ${theme}`}
                            >
                              {status}
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
  );
}
