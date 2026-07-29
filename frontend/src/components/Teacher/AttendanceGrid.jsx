import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Search, Download, Loader2, Calendar, Check, X, AlertCircle, RefreshCw } from 'lucide-react';

export default function AttendanceGrid({ sectionId, students }) {
  const { apiFetch } = useAuth();
  const [loading, setLoading] = useState(true);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [termDates, setTermDates] = useState({ name: '', start: '', end: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Load term details and historical attendance
  useEffect(() => {
    const loadGridData = async () => {
      if (!sectionId) return;
      setLoading(true);
      try {
        // 1. Fetch term date from sections
        const sections = await apiFetch('/sis/sections');
        const currentSection = sections.find((s) => s.id === sectionId);
        if (currentSection?.terms) {
          setTermDates({
            name: currentSection.terms.name,
            start: currentSection.terms.start_date,
            end: currentSection.terms.end_date,
          });
        }

        // 2. Fetch all attendance for this section
        const records = await apiFetch(`/sis/attendance?section_id=${sectionId}`);
        setAttendanceRecords(records);
      } catch (err) {
        console.error('Error loading attendance grid data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadGridData();
  }, [sectionId, refreshTrigger]);

  // Generate weekday dates between start and end date
  const getWeekdaysInRange = (startStr, endStr) => {
    if (!startStr || !endStr) return [];
    const start = new Date(startStr);
    const end = new Date(endStr);
    const dates = [];
    let current = new Date(start);

    // Guard to prevent infinite loop
    let limit = 0;
    while (current <= end && limit < 366) {
      const day = current.getDay();
      if (day !== 0 && day !== 6) {
        // Monday to Friday
        dates.push(current.toISOString().split('T')[0]);
      }
      current.setDate(current.getDate() + 1);
      limit++;
    }
    return dates;
  };

  const datesList = getWeekdaysInRange(termDates.start, termDates.end);

  // Map attendance records to a fast-lookup object: studentId_date -> status
  const attendanceMap = {};
  attendanceRecords.forEach((rec) => {
    attendanceMap[`${rec.student_id}_${rec.date}`] = rec.status;
  });

  // Calculate statistics per student
  const getStudentStats = (studentId) => {
    let present = 0;
    let absent = 0;
    let tardy = 0;
    let excused = 0;
    let markedCount = 0;

    datesList.forEach((date) => {
      const status = attendanceMap[`${studentId}_${date}`];
      if (status) {
        markedCount++;
        if (status === 'present') present++;
        else if (status === 'absent') absent++;
        else if (status === 'tardy') tardy++;
        else if (status === 'excused') excused++;
      }
    });

    const activeDays = present + tardy;
    const totalDays = present + absent + tardy + excused;
    const rate = totalDays > 0 ? Math.round((activeDays / totalDays) * 100) : 100;

    return { present, absent, tardy, excused, rate, totalDays };
  };

  // Filter students based on search
  const filteredStudents = students.filter((student) => {
    const fullName = student.profiles?.full_name?.toLowerCase() || '';
    const email = student.profiles?.email?.toLowerCase() || '';
    return fullName.includes(searchTerm.toLowerCase()) || email.includes(searchTerm.toLowerCase());
  });

  // Export grid data to CSV
  const handleExportCSV = () => {
    if (!students.length || !datesList.length) return;

    // Headers
    const headers = ['Student Name', 'Email', 'Attendance Rate', 'Present', 'Absent', 'Tardy', 'Excused', ...datesList];

    // Rows
    const rows = filteredStudents.map((stud) => {
      const stats = getStudentStats(stud.id);
      const studentName = stud.profiles?.full_name || '';
      const email = stud.profiles?.email || '';
      const dailyStatuses = datesList.map((date) => attendanceMap[`${stud.id}_${date}`] || '-');

      return [
        `"${studentName.replace(/"/g, '""')}"`,
        `"${email.replace(/"/g, '""')}"`,
        `"${stats.rate}%"`,
        stats.present,
        stats.absent,
        stats.tardy,
        stats.excused,
        ...dailyStatuses.map((s) => `"${s}"`),
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `attendance_grid_${termDates.name.replace(/\s+/g, '_') || 'term'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-green-400">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="mt-3 text-sm font-medium text-gray-400">Loading attendance history...</span>
      </div>
    );
  }

  // Format YYYY-MM-DD to a nice short header like "Jul 29"
  const formatDateHeader = (dateStr) => {
    const [year, month, day] = dateStr.split('-');
    const dateObj = new Date(year, month - 1, day);
    return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* Grid Sub-Header controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-900/30 p-4 rounded-xl border border-gray-800/80">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-green-400" />
          <div>
            <div className="font-semibold text-white text-sm">
              Term: {termDates.name || 'Active Term'}
            </div>
            <div className="text-xs text-gray-400">
              {termDates.start} to {termDates.end} • {datesList.length} Weekdays
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Search bar */}
          <div className="relative flex-1 md:flex-initial">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.value || e.target.value)}
              className="pl-9 pr-4 py-2 bg-gray-950 border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-green-500 w-full md:w-64"
            />
          </div>

          {/* Action buttons */}
          <button
            onClick={() => setRefreshTrigger((prev) => prev + 1)}
            className="p-2 bg-gray-950 hover:bg-gray-900 border border-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors cursor-pointer"
            title="Refresh Grid Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={handleExportCSV}
            disabled={filteredStudents.length === 0}
            className="px-3 py-2 bg-green-700/20 hover:bg-green-700/30 border border-green-600/30 hover:border-green-600/50 text-green-400 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Roster Grid Container */}
      <div className="glass-panel rounded-2xl overflow-hidden shadow-xl border border-gray-800/80">
        {filteredStudents.length === 0 ? (
          <p className="text-gray-500 py-16 text-center text-sm">
            {students.length === 0 ? 'No students enrolled.' : 'No students matching search criteria.'}
          </p>
        ) : (
          <div className="overflow-x-auto overflow-y-hidden max-w-full">
            <table className="w-full text-left border-collapse table-fixed">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-950/60 text-gray-400 text-xs font-semibold uppercase tracking-wider">
                  {/* Sticky student name column */}
                  <th className="p-4 pl-6 w-[200px] sticky left-0 bg-gray-950 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]">
                    Student Name
                  </th>
                  <th className="p-4 w-[100px] text-center bg-gray-950/40">Rate</th>
                  <th className="p-4 w-[60px] text-center text-emerald-400 font-mono bg-gray-950/40" title="Present count">P</th>
                  <th className="p-4 w-[60px] text-center text-red-400 font-mono bg-gray-950/40" title="Absent count">A</th>
                  <th className="p-4 w-[60px] text-center text-amber-400 font-mono bg-gray-950/40" title="Tardy count">T</th>
                  <th className="p-4 w-[60px] text-center text-blue-400 font-mono bg-gray-950/40" title="Excused count">E</th>
                  
                  {/* Daily Date Headers */}
                  {datesList.map((date) => (
                    <th key={date} className="p-4 w-[80px] text-center font-mono text-[10px] whitespace-nowrap bg-gray-950/10">
                      {formatDateHeader(date)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/40 text-sm">
                {filteredStudents.map((student) => {
                  const stats = getStudentStats(student.id);
                  let rateColor = 'text-green-400 font-bold';
                  if (stats.rate < 70) rateColor = 'text-red-400 font-extrabold animate-pulse';
                  else if (stats.rate < 85) rateColor = 'text-amber-400 font-semibold';

                  return (
                    <tr key={student.id} className="hover:bg-gray-900/10 transition-colors">
                      {/* Sticky Student Name cell */}
                      <td className="p-4 pl-6 font-semibold text-white sticky left-0 bg-[#0d1117]/95 backdrop-blur-sm z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)] truncate">
                        <div>
                          <div className="truncate">{student.profiles?.full_name}</div>
                          <div className="text-[10px] text-gray-500 font-normal font-mono truncate">{student.profiles?.email}</div>
                        </div>
                      </td>

                      {/* Term Stats */}
                      <td className="p-4 text-center">
                        <span className={`px-2 py-0.5 rounded bg-gray-900 border border-gray-800 text-xs ${rateColor}`}>
                          {stats.rate}%
                        </span>
                      </td>
                      <td className="p-4 text-center text-xs font-mono text-gray-300 bg-emerald-950/10">{stats.present}</td>
                      <td className="p-4 text-center text-xs font-mono text-gray-300 bg-red-950/10">{stats.absent}</td>
                      <td className="p-4 text-center text-xs font-mono text-gray-300 bg-amber-950/10">{stats.tardy}</td>
                      <td className="p-4 text-center text-xs font-mono text-gray-300 bg-blue-950/10">{stats.excused}</td>

                      {/* Daily statuses */}
                      {datesList.map((date) => {
                        const status = attendanceMap[`${student.id}_${date}`];
                        let cellContent = <span className="text-gray-600 font-mono">-</span>;
                        let cellBg = '';

                        if (status === 'present') {
                          cellContent = <Check className="w-3.5 h-3.5 text-emerald-400 mx-auto" />;
                          cellBg = 'bg-emerald-500/5';
                        } else if (status === 'absent') {
                          cellContent = <X className="w-3.5 h-3.5 text-red-400 mx-auto" />;
                          cellBg = 'bg-red-500/5';
                        } else if (status === 'tardy') {
                          cellContent = <span className="text-[10px] font-bold text-amber-400 font-mono">T</span>;
                          cellBg = 'bg-amber-500/5';
                        } else if (status === 'excused') {
                          cellContent = <AlertCircle className="w-3.5 h-3.5 text-blue-400 mx-auto" />;
                          cellBg = 'bg-blue-500/5';
                        }

                        return (
                          <td
                            key={date}
                            className={`p-4 text-center border-l border-gray-800/20 text-xs ${cellBg}`}
                            title={`${student.profiles?.full_name} - ${date}: ${status || 'No record'}`}
                          >
                            {cellContent}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-gray-400 font-medium">
        <div className="flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5 text-emerald-400" /> Present (P)
        </div>
        <div className="flex items-center gap-1.5">
          <X className="w-3.5 h-3.5 text-red-400" /> Absent (A)
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 text-center font-bold text-amber-400 leading-none">T</span> Tardy (T)
        </div>
        <div className="flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-blue-400" /> Excused (E)
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-gray-600 font-mono">-</span> No Record
        </div>
      </div>
    </div>
  );
}
