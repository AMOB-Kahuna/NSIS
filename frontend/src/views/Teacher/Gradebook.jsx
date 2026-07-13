import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, Loader2, Edit3, Save, X, ExternalLink } from 'lucide-react';

export default function ClassGradebook() {
  const { sectionId } = useParams();
  const { apiFetch } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState({
    students: [],
    subjects: [],
    assignments: [],
    quizzes: [],
    submissions: [],
    quizAttempts: []
  });

  // Modal grading state
  const [activeGradingSub, setActiveGradingSub] = useState(null);
  const [gradeInput, setGradeInput] = useState('');
  const [gradingError, setGradingError] = useState('');
  const [gradingSaving, setGradingSaving] = useState(false);

  const loadGradebook = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch(`/grades/section/${sectionId}`);
      setData(res);
    } catch (err) {
      console.error('Error loading gradebook:', err);
      setError(err.message || 'Failed to load gradebook data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sectionId) {
      loadGradebook();
    }
  }, [sectionId]);

  const handleCellClick = (student, assignment) => {
    // Find if submission exists
    const sub = data.submissions.find(
      s => s.student_id === student.id && s.assignment_id === assignment.id
    );

    if (!sub) {
      alert(`${student.profiles?.full_name} has not submitted this assignment yet.`);
      return;
    }

    setActiveGradingSub({
      submission: sub,
      studentName: student.profiles?.full_name,
      assignmentTitle: assignment.title,
      maxPoints: assignment.max_points
    });
    setGradeInput(sub.score !== null ? String(sub.score) : '');
    setGradingError('');
  };

  const handleSaveGrade = async (e) => {
    e.preventDefault();
    if (!activeGradingSub) return;
    const scoreVal = Number(gradeInput);
    if (isNaN(scoreVal) || scoreVal < 0 || scoreVal > activeGradingSub.maxPoints) {
      return setGradingError(`Score must be a number between 0 and ${activeGradingSub.maxPoints}.`);
    }

    setGradingSaving(true);
    setGradingError('');
    try {
      await apiFetch(`/lms/submissions/${activeGradingSub.submission.id}/grade`, {
        method: 'PUT',
        body: JSON.stringify({ score: scoreVal })
      });
      setActiveGradingSub(null);
      await loadGradebook(); // Reload data
    } catch (err) {
      setGradingError(err.message);
    } finally {
      setGradingSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-green-400">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-3 font-semibold text-lg">Assembling Gradebook Matrix...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Link to="/teacher" className="inline-flex items-center text-sm font-semibold text-green-400 hover:text-green-300 gap-1 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
        <div className="glass-panel p-8 rounded-2xl text-center">
          <p className="text-red-400 font-semibold mb-2">Error loading gradebook</p>
          <p className="text-gray-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Navigation */}
      <Link to="/teacher" className="inline-flex items-center text-sm font-semibold text-green-400 hover:text-green-300 gap-1 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white tracking-tight">Class Gradebook</h1>
        <p className="text-gray-400">View and manage grades for all section assignments and quizzes</p>
      </div>

      {/* Grid container */}
      <div className="glass-panel rounded-2xl overflow-hidden shadow-2xl border border-gray-800">
        {data.students.length === 0 ? (
          <p className="text-gray-500 py-12 text-center text-sm">No students enrolled in this section.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-900/60 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  <th className="p-4 pl-6 min-w-[200px]">Student Name</th>
                  {/* Assignment columns */}
                  {data.assignments.map(a => (
                    <th key={a.id} className="p-4 text-center border-l border-gray-800/60 min-w-[120px]">
                      <div className="truncate max-w-[150px]">{a.title}</div>
                      <div className="text-[9px] text-gray-500 font-mono mt-0.5">HW | {a.max_points} pts</div>
                    </th>
                  ))}
                  {/* Quiz columns */}
                  {data.quizzes.map(q => (
                    <th key={q.id} className="p-4 text-center border-l border-gray-800/60 min-w-[120px]">
                      <div className="truncate max-w-[150px]">{q.title}</div>
                      <div className="text-[9px] text-gray-500 font-mono mt-0.5">QUIZ | {q.max_score || 'Auto'} pts</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60 text-sm">
                {data.students.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-900/10 transition-colors">
                    <td className="p-4 pl-6 font-semibold text-white">
                      {student.profiles?.full_name}
                    </td>

                    {/* Assignment Cells */}
                    {data.assignments.map(assign => {
                      const sub = data.submissions.find(
                        s => s.student_id === student.id && s.assignment_id === assign.id
                      );

                      let cellText = 'N/A';
                      let cellStyle = 'text-gray-500';

                      if (sub) {
                        if (sub.status === 'graded') {
                          cellText = `${sub.score}/${assign.max_points}`;
                          cellStyle = 'text-emerald-400 font-bold hover:bg-emerald-950/20 cursor-pointer';
                        } else {
                          cellText = 'Submitted';
                          cellStyle = 'text-amber-400 font-medium hover:bg-amber-950/20 cursor-pointer';
                        }
                      } else {
                        cellText = 'Missing';
                        cellStyle = 'text-red-400/80 font-medium';
                      }

                      return (
                        <td
                          key={assign.id}
                          onClick={() => sub && handleCellClick(student, assign)}
                          className={`p-4 text-center border-l border-gray-800/40 select-none transition-colors ${cellStyle}`}
                        >
                          <div className="flex items-center justify-center gap-1">
                            {cellText}
                            {sub && <Edit3 className="w-3 h-3 opacity-0 hover:opacity-100 transition-opacity" />}
                          </div>
                        </td>
                      );
                    })}

                    {/* Quiz Cells */}
                    {data.quizzes.map(quiz => {
                      const att = (data.quizAttempts || []).find(
                        qa => qa.student_id === student.id && qa.quiz_id === quiz.id
                      );

                      let cellText = 'Unattempted';
                      let cellStyle = 'text-gray-500';

                      if (att) {
                        cellText = `${att.score}/${att.max_score}`;
                        cellStyle = 'text-blue-400 font-bold';
                      }

                      return (
                        <td
                          key={quiz.id}
                          className={`p-4 text-center border-l border-gray-800/40 ${cellStyle}`}
                        >
                          {cellText}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Grading Modal */}
      {activeGradingSub && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-panel w-full max-w-lg rounded-2xl p-6 shadow-2xl relative border-purple-500/20">
            <button
              onClick={() => setActiveGradingSub(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold text-white mb-2">Grade Assignment</h2>
            <div className="text-xs text-purple-400 font-semibold mb-4">
              {activeGradingSub.studentName} &bull; {activeGradingSub.assignmentTitle}
            </div>

            <div className="space-y-4 mb-6">
              {/* Submission text content */}
              <div className="p-3 bg-gray-950 border border-gray-800 rounded-lg">
                <div className="text-[10px] font-semibold text-gray-500 uppercase mb-1">Student Answer</div>
                <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                  {activeGradingSub.submission.content || '(No text answer submitted)'}
                </p>
              </div>

              {/* Submission links */}
              {activeGradingSub.submission.file_url && (
                <div>
                  <a
                    href={activeGradingSub.submission.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 font-medium"
                  >
                    View Attached Material <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSaveGrade} className="space-y-4 pt-4 border-t border-gray-800">
                {gradingError && (
                  <div className="text-xs text-red-400 bg-red-950/40 border border-red-500/30 p-2 rounded">
                    {gradingError}
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                    Assign Score (Max {activeGradingSub.maxPoints} points)
                  </label>
                  <input
                    id="grade-score-input"
                    type="number"
                    required
                    step="0.01"
                    min="0"
                    max={activeGradingSub.maxPoints}
                    value={gradeInput}
                    onChange={(e) => setGradeInput(e.target.value)}
                    className="w-full max-w-[120px] px-3 py-2 bg-gray-950 border border-gray-800 rounded-lg text-white font-bold text-center focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveGradingSub(null)}
                    className="px-4 py-2 border border-gray-800 text-gray-400 hover:text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    id="submit-grade-btn"
                    type="submit"
                    disabled={gradingSaving}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    {gradingSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Submit Grade
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
