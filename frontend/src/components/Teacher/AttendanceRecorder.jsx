import React, { useState, useEffect } from 'react';
import { useAttendance } from '../../context/AttendanceContext';
import { format, parseISO } from 'date-fns';

export function AttendanceRecorder({ onClose }) {
  const { students, attendanceRecords, recordAttendance } = useAttendance();
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const [date, setDate] = useState(todayStr);
  const [statusMap, setStatusMap] = useState({}); // studentId -> status

  // Populate initial statuses based on existing records for selected date
  useEffect(() => {
    const map = {};
    students.forEach((s) => {
      const rec = attendanceRecords.find((r) => r.student_id === s.id && r.date === date);
      if (rec) map[s.id] = rec.status;
    });
    setStatusMap(map);
  }, [date, students, attendanceRecords]);

  const handleChange = (studentId, newStatus) => {
    setStatusMap((prev) => ({ ...prev, [studentId]: newStatus }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const records = Object.entries(statusMap).map(([studentId, status]) => ({ student_id: studentId, status }));
    try {
      await recordAttendance(date, records);
      onClose();
    } catch (err) {
      console.error('Failed to save attendance', err);
    }
  };

  const statusOptions = [
    { value: '', label: 'No Change' },
    { value: 'present', label: 'Present' },
    { value: 'absent', label: 'Absent' },
    { value: 'tardy', label: 'Tardy' },
    { value: 'excused', label: 'Excused' },
  ];

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity duration-300">
      <div className="glass-panel rounded-xl p-6 w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4 text-white">Record / Edit Attendance</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="attendance-date">
              Date
            </label>
            <input
              type="date"
              id="attendance-date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded px-3 py-2 bg-gray-800 text-white border border-gray-600 w-full"
              required
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full table-fixed border-collapse min-w-max">
              <thead>
                <tr className="bg-gray-900/40 text-gray-400 text-xs uppercase tracking-wider">
                  <th className="p-2 pl-6 text-left w-[200px]">Student</th>
                  <th className="p-2 text-center w-[120px]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60 text-sm">
                {students.map((stud) => (
                  <tr key={stud.id} className="hover:bg-gray-900/10 transition-colors">
                    <td className="p-2 pl-6">
                      <div className="font-medium text-white truncate max-w-[180px]">{stud.profiles?.full_name}</div>
                      <div className="text-[10px] text-gray-500 truncate max-w-[180px]">{stud.profiles?.email}</div>
                    </td>
                    <td className="p-2 text-center">
                      <select
                        value={statusMap[stud.id] || ''}
                        onChange={(e) => handleChange(stud.id, e.target.value)}
                        className="rounded bg-gray-800 text-white border border-gray-600 p-1"
                      >
                        {statusOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end mt-6 space-x-3">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500 transition">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 transition">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
