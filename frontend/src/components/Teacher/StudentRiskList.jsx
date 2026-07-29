import React, { useState } from 'react';
import { Search, AlertTriangle, CheckCircle, ArrowRight, ShieldAlert, Award, Calendar, HelpCircle, Clock } from 'lucide-react';

// ── Helpers ──────────────────────────────────────────────────────────────────

function statusColor(status) {
  switch (status) {
    case 'critical': return 'text-red-400';
    case 'warning':  return 'text-amber-400';
    case 'ok':       return 'text-emerald-400';
    default:         return 'text-gray-500';
  }
}

function progressBarColor(status) {
  switch (status) {
    case 'critical': return 'bg-red-500';
    case 'warning':  return 'bg-amber-500';
    case 'ok':       return 'bg-emerald-500';
    default:         return 'bg-gray-700';
  }
}

function MetricStatusBadge({ status }) {
  if (status === 'not_enough_data') {
    return (
      <span className="flex items-center gap-1 text-[10px] font-semibold text-gray-500 bg-gray-900 border border-gray-800 rounded px-2 py-0.5">
        <Clock className="w-3 h-3" /> Not enough data
      </span>
    );
  }
  if (status === 'critical') {
    return (
      <span className="text-[10px] font-bold text-red-400 bg-red-950/50 border border-red-800 rounded px-2 py-0.5 uppercase tracking-wide">
        Critical
      </span>
    );
  }
  if (status === 'warning') {
    return (
      <span className="text-[10px] font-bold text-amber-400 bg-amber-950/50 border border-amber-800 rounded px-2 py-0.5 uppercase tracking-wide">
        Warning
      </span>
    );
  }
  return (
    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/50 border border-emerald-800 rounded px-2 py-0.5 uppercase tracking-wide">
      OK
    </span>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function StudentRiskList({ students, atRiskInfo }) {
  const [searchTerm, setSearchTerm]       = useState('');
  const [filterMode, setFilterMode]       = useState('all'); // 'all' | 'atRisk' | 'good'
  const [sortBy, setSortBy]               = useState('name');
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Build a fast-lookup map: student_id → riskProfile
  const riskMap = {};
  if (Array.isArray(atRiskInfo)) {
    atRiskInfo.forEach((p) => { riskMap[p.student_id] = p; });
  }

  // Merge student list with their risk profile
  const studentsWithRisk = students.map((student) => {
    const risk = riskMap[student.id] ?? {
      student_id: student.id,
      attendanceRate: null,
      attendanceStatus: 'not_enough_data',
      totalAttendanceDays: 0,
      quizAverage: null,
      quizStatus: 'not_enough_data',
      availableQuizCount: 0,
      isAtRisk: false,
      reasons: [],
    };
    return { ...student, risk };
  });

  // Filter
  const filteredStudents = studentsWithRisk.filter(({ profiles, risk }) => {
    const name  = profiles?.full_name?.toLowerCase() ?? '';
    const email = profiles?.email?.toLowerCase()     ?? '';
    if (!name.includes(searchTerm.toLowerCase()) && !email.includes(searchTerm.toLowerCase())) return false;
    if (filterMode === 'atRisk') return risk.isAtRisk;
    if (filterMode === 'good')   return !risk.isAtRisk;
    return true;
  });

  // Sort
  const sortedStudents = [...filteredStudents].sort((a, b) => {
    if (sortBy === 'attendance') {
      // null (not enough data) goes to end
      const ar = a.risk.attendanceRate ?? 2;
      const br = b.risk.attendanceRate ?? 2;
      return ar - br;
    }
    if (sortBy === 'quiz') {
      const aq = a.risk.quizAverage ?? 2;
      const bq = b.risk.quizAverage ?? 2;
      return aq - bq;
    }
    return (a.profiles?.full_name ?? '').localeCompare(b.profiles?.full_name ?? '');
  });

  const totalEnrolled    = students.length;
  const flaggedCount     = studentsWithRisk.filter(s => s.risk.isAtRisk).length;
  const goodStandingCount = totalEnrolled - flaggedCount;

  // Compute overall card badge
  function overallBadge(risk) {
    if (risk.isAtRisk) return 'atRisk';
    const anyData = risk.attendanceStatus !== 'not_enough_data' || risk.quizStatus !== 'not_enough_data';
    return anyData ? 'clear' : 'pending';
  }

  return (
    <div className="space-y-6">

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden border border-gray-800/80">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-600/5 rounded-full blur-xl -z-10" />
          <div className="text-sm font-medium text-gray-400">Total Class Roster</div>
          <div className="text-3xl font-bold text-white mt-1.5 flex items-baseline gap-1">
            {totalEnrolled} <span className="text-xs text-gray-500 font-normal">Active Students</span>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden border border-red-500/10 bg-red-950/5">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-600/5 rounded-full blur-xl -z-10" />
          <div className="text-sm font-medium text-red-400/80 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-red-400" /> At-Risk Flags
          </div>
          <div className="text-3xl font-bold text-red-400 mt-1.5">{flaggedCount}</div>
        </div>

        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden border border-emerald-500/10 bg-emerald-950/5">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-600/5 rounded-full blur-xl -z-10" />
          <div className="text-sm font-medium text-emerald-400/80 flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-emerald-400" /> Good Standing
          </div>
          <div className="text-3xl font-bold text-emerald-400 mt-1.5">{goodStandingCount}</div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-900/30 p-4 rounded-xl border border-gray-800/80">
        <div className="flex items-center gap-2">
          {[
            { mode: 'all',    label: `All Students (${totalEnrolled})`,  active: 'bg-purple-600 border-purple-500 text-white', inactive: 'border-gray-800 text-gray-400 hover:text-white hover:bg-gray-800' },
            { mode: 'atRisk', label: `Flagged (${flaggedCount})`,         active: 'bg-red-600 border-red-500 text-white',       inactive: 'border-gray-800 text-gray-400 hover:text-red-400 hover:bg-red-950/20' },
            { mode: 'good',   label: `Good Standing (${goodStandingCount})`, active: 'bg-emerald-600 border-emerald-500 text-white', inactive: 'border-gray-800 text-gray-400 hover:text-emerald-400 hover:bg-emerald-950/20' },
          ].map(({ mode, label, active, inactive }) => (
            <button
              key={mode}
              onClick={() => setFilterMode(mode)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${filterMode === mode ? active : `bg-transparent ${inactive}`}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-gray-950 border border-gray-800 rounded px-2.5 py-1.5 text-white focus:outline-none cursor-pointer"
            >
              <option value="name">Student Name</option>
              <option value="attendance">Lowest Attendance</option>
              <option value="quiz">Lowest Quiz Avg</option>
            </select>
          </div>

          <div className="relative flex-1 md:flex-initial">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-gray-950 border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-green-500 w-full md:w-64"
            />
          </div>
        </div>
      </div>

      {/* Student Row List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {sortedStudents.length === 0 ? (
          <div className="col-span-full py-16 bg-gray-900/10 border border-gray-800/80 rounded-2xl text-center text-gray-500 text-sm">
            No students found matching current filters.
          </div>
        ) : (
          sortedStudents.map(({ id, profiles, risk }) => {
            const badge = overallBadge(risk);
            return (
              <div
                key={id}
                onClick={() => setSelectedStudent({ id, profiles, risk })}
                className={`glass-panel px-4 py-3.5 rounded-xl flex items-center justify-between border cursor-pointer transition-all duration-200 hover:shadow-md ${
                  badge === 'atRisk'
                    ? 'border-red-500/20 hover:border-red-500/50 bg-red-950/5'
                    : badge === 'pending'
                    ? 'border-gray-800/60 hover:border-gray-700'
                    : 'border-gray-800/80 hover:border-purple-500/40 hover:bg-purple-950/5'
                }`}
              >
                {/* Name & email */}
                <div className="truncate pr-4 min-w-0">
                  <h3 className="font-bold text-white text-sm tracking-tight truncate">{profiles?.full_name}</h3>
                  <p className="text-[11px] text-gray-400 font-mono mt-0.5 truncate">{profiles?.email}</p>
                </div>

                {/* Right side: per-metric mini-pills + chevron */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Attendance pill */}
                  <span className={`text-[10px] font-semibold flex items-center gap-1 ${statusColor(risk.attendanceStatus)}`}>
                    <Calendar className="w-3 h-3" />
                    {risk.attendanceStatus === 'not_enough_data'
                      ? '—'
                      : `${Math.round(risk.attendanceRate * 100)}%`
                    }
                  </span>

                  <span className="text-gray-700 text-xs">|</span>

                  {/* Quiz pill */}
                  <span className={`text-[10px] font-semibold flex items-center gap-1 ${statusColor(risk.quizStatus)}`}>
                    <Award className="w-3 h-3" />
                    {risk.quizStatus === 'not_enough_data'
                      ? '—'
                      : `${Math.round(risk.quizAverage * 100)}%`
                    }
                  </span>

                  <span className="text-gray-700 text-xs">|</span>

                  {/* Overall badge */}
                  {badge === 'atRisk' ? (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded-full text-[10px] font-bold uppercase animate-pulse">
                      <ShieldAlert className="w-3 h-3" /> At Risk
                    </span>
                  ) : badge === 'pending' ? (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-gray-800 border border-gray-700 text-gray-500 rounded-full text-[10px] font-bold uppercase">
                      <Clock className="w-3 h-3" /> Pending
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full text-[10px] font-bold uppercase">
                      <CheckCircle className="w-3 h-3" /> Clear
                    </span>
                  )}

                  <ArrowRight className="w-3.5 h-3.5 text-gray-600" />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Detail Modal ─────────────────────────────────────────── */}
      {selectedStudent && (() => {
        const { profiles, risk } = selectedStudent;
        const badge = overallBadge(risk);

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
            onClick={() => setSelectedStudent(null)}
          >
            <div
              className={`glass-panel w-full max-w-md rounded-2xl border p-6 space-y-5 relative overflow-hidden shadow-2xl ${
                badge === 'atRisk' ? 'border-red-500/30 bg-red-950/20' : 'border-gray-800 bg-gray-950/90'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close */}
              <button
                onClick={() => setSelectedStudent(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl font-bold bg-gray-900/50 hover:bg-gray-800/80 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-colors"
              >
                &times;
              </button>

              {/* Header */}
              <div className="space-y-1 pr-8">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-bold text-white tracking-tight">{profiles?.full_name}</h2>
                  {badge === 'atRisk' && (
                    <span className="flex items-center gap-1 px-2.5 py-0.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded-full text-[10px] font-bold uppercase animate-pulse">
                      <ShieldAlert className="w-3.5 h-3.5" /> At Risk
                    </span>
                  )}
                  {badge === 'clear' && (
                    <span className="flex items-center gap-1 px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full text-[10px] font-bold uppercase">
                      <CheckCircle className="w-3.5 h-3.5" /> Clear
                    </span>
                  )}
                  {badge === 'pending' && (
                    <span className="flex items-center gap-1 px-2.5 py-0.5 bg-gray-800 border border-gray-700 text-gray-400 rounded-full text-[10px] font-bold uppercase">
                      <Clock className="w-3.5 h-3.5" /> Pending Data
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 font-mono">{profiles?.email}</p>
              </div>

              {/* Flag Reasons */}
              {risk.reasons.length > 0 && (
                <div className="space-y-2 p-4 bg-red-950/40 border border-red-500/20 rounded-xl">
                  <div className="text-[10px] text-red-300 font-bold uppercase tracking-wider flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4 text-red-400" /> Triggered Warnings
                  </div>
                  <ul className="list-disc list-inside text-xs text-red-200 space-y-1 pl-1 leading-normal">
                    {risk.reasons.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              )}

              {/* Metrics */}
              <div className="space-y-4 pt-2 border-t border-gray-800/60">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Performance Statistics</h3>

                {/* Attendance */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-gray-400 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" /> Term Attendance
                      <span className="text-gray-600 font-normal">({risk.totalAttendanceDays} days marked)</span>
                    </span>
                    <MetricStatusBadge status={risk.attendanceStatus} />
                  </div>

                  {risk.attendanceStatus === 'not_enough_data' ? (
                    <div className="w-full h-1.5 bg-gray-900 rounded-full overflow-hidden">
                      <div className="h-full w-full bg-gray-800 animate-pulse rounded-full" />
                    </div>
                  ) : (
                    <>
                      <div className="w-full h-1.5 bg-gray-900 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${progressBarColor(risk.attendanceStatus)}`}
                          style={{ width: `${Math.round(risk.attendanceRate * 100)}%` }}
                        />
                      </div>
                      <p className={`text-right text-xs font-bold ${statusColor(risk.attendanceStatus)}`}>
                        {Math.round(risk.attendanceRate * 100)}%
                      </p>
                    </>
                  )}

                  {risk.attendanceStatus === 'not_enough_data' && (
                    <p className="text-[10px] text-gray-600 leading-normal">
                      Flagging begins after <strong className="text-gray-500">15 marked days</strong>. Currently at {risk.totalAttendanceDays}/15.
                    </p>
                  )}
                </div>

                {/* Quiz */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-gray-400 flex items-center gap-1.5">
                      <Award className="w-4 h-4" /> Quiz Performance
                      <span className="text-gray-600 font-normal">({risk.availableQuizCount} quizzes set)</span>
                    </span>
                    <MetricStatusBadge status={risk.quizStatus} />
                  </div>

                  {risk.quizStatus === 'not_enough_data' ? (
                    <div className="w-full h-1.5 bg-gray-900 rounded-full overflow-hidden">
                      <div className="h-full w-full bg-gray-800 animate-pulse rounded-full" />
                    </div>
                  ) : (
                    <>
                      <div className="w-full h-1.5 bg-gray-900 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${progressBarColor(risk.quizStatus)}`}
                          style={{ width: `${Math.round(risk.quizAverage * 100)}%` }}
                        />
                      </div>
                      <p className={`text-right text-xs font-bold ${statusColor(risk.quizStatus)}`}>
                        {Math.round(risk.quizAverage * 100)}%
                      </p>
                    </>
                  )}

                  {risk.quizStatus === 'not_enough_data' && (
                    <p className="text-[10px] text-gray-600 leading-normal">
                      Flagging begins after <strong className="text-gray-500">4 quizzes</strong> are published. Currently {risk.availableQuizCount}/4.
                    </p>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end pt-2 border-t border-gray-800/60">
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Legend / Footnote */}
      <div className="bg-gray-900/10 border border-gray-800/80 p-4 rounded-xl flex items-start gap-2.5 text-xs text-gray-400 leading-relaxed">
        <HelpCircle className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
        <p>
          <strong className="text-gray-300">Early Warning Criteria:</strong>{' '}
          Attendance is only evaluated after <span className="text-amber-400 font-semibold">15 marked days</span> (start of 4th week).
          Flags trigger at <span className="text-amber-400 font-semibold">&lt;80%</span> (warning) or{' '}
          <span className="text-red-400 font-semibold">&lt;70%</span> (critical).
          Quiz performance is only evaluated after <span className="text-amber-400 font-semibold">4 quizzes</span> are published.
          Flags trigger at <span className="text-amber-400 font-semibold">&lt;65%</span> (warning) or{' '}
          <span className="text-red-400 font-semibold">&lt;50%</span> (critical).
          Students with insufficient data show a <span className="text-gray-300 font-semibold">Pending</span> status.
        </p>
      </div>
    </div>
  );
}
