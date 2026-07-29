import React, { useEffect } from 'react';
import { useAttendance } from '../../context/AttendanceContext';
import { format } from 'date-fns';

export function AttendanceGrid() {
  const { students, attendanceRecords, dateRange, loading } = useAttendance();

  // Debug logs
  useEffect(() => {
    console.log('AttendanceGrid students:', students?.length);
    console.log('AttendanceGrid attendanceRecords:', attendanceRecords?.length);
    console.log('AttendanceGrid dateRange:', dateRange?.length);
  }, [students, attendanceRecords, dateRange]);

  // Debug logging for dateRange
  useEffect(() => {
    console.log('AttendanceGrid dateRange:', dateRange);
  }, [dateRange]);

  if (loading) {
    return <div className="text-gray-400">Loading attendance grid...</div>;
  }

  if (!dateRange || dateRange.length === 0) {
    return <div className="text-gray-400">No term dates available.</div>;
  }
  // Helper to get record for a student on a specific date
  const getRecord = (studentId, date) =>
    attendanceRecords.find((r) => r.student_id === studentId && r.date === date);

  return (
    <div className="glass-panel rounded-2xl overflow-hidden shadow-xl p-4">
      <h2 className="text-xl font-semibold mb-4 text-white">Attendance Grid</h2>
      <div className="overflow-x-auto">
        <table className="w-full table-fixed border-collapse min-w-max">
          <thead>
            <tr className="bg-gray-900/40 text-gray-400 text-xs uppercase tracking-wider">
              <th className="p-2 pl-6 sticky left-0 bg-gray-950/95 backdrop-blur border-r border-gray-800/80 w-[200px]">
                Student
              </th>
              {dateRange.map((d) => {
                const dateObj = new Date(d);
                const dayName = format(dateObj, 'EE');
                const dateLabel = format(dateObj, 'MM/dd');
                return (
                  <th key={d} className="p-2 text-center w-[60px] border-r border-gray-800/40">
                    <div className="text-[10px] text-gray-500">{dayName}</div>
                    <div className="text-xs font-bold text-white">{dateLabel}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/60 text-sm">
            {students.map((stud) => (
              <tr key={stud.id} className="hover:bg-gray-900/10 transition-colors">
                <td className="p-2 pl-6 sticky left-0 bg-gray-950/95 backdrop-blur border-r border-gray-800/80">
                  <div className="font-medium text-white truncate max-w-[180px]">{stud.profiles?.full_name}</div>
                  <div className="text-[10px] text-gray-500 truncate max-w-[180px]">{stud.profiles?.email}</div>
                </td>
                {dateRange.map((d) => {
                  const rec = getRecord(stud.id, d);
                  let symbol = '-';
                  let colorClass = 'text-gray-600 bg-gray-900/20';
                  if (rec) {
                    switch (rec.status) {
                      case 'present':
                        symbol = 'P';
                        colorClass = 'text-emerald-400 bg-emerald-500/10 font-extrabold border border-emerald-500/20';
                        break;
                      case 'absent':
                        symbol = 'A';
                        colorClass = 'text-red-400 bg-red-500/10 font-extrabold border border-red-500/20';
                        break;
                      case 'tardy':
                        symbol = 'T';
                        colorClass = 'text-amber-400 bg-amber-500/10 font-extrabold border border-amber-500/20';
                        break;
                      case 'excused':
                        symbol = 'E';
                        colorClass = 'text-blue-400 bg-blue-500/10 font-extrabold border border-blue-500/20';
                        break;
                      default:
                        break;
                    }
                  }
                  return (
                    <td key={d} className="p-1 text-center border-r border-gray-800/40">
                      <span
                        className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs ${colorClass}`}
                        title={rec ? `${rec.status} on ${d}` : `No record on ${d}`}
                      >
                        {symbol}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
