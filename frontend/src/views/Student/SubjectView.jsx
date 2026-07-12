import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, BookOpen, FileText, HelpCircle, Loader2, ExternalLink, Play, AlertCircle } from 'lucide-react';

export default function StudentSubjectView() {
  const { id: subjectId } = useParams();
  const { apiFetch } = useAuth();

  const [subject, setSubject] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Lesson reader active slide
  const [activeLesson, setActiveLesson] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      // Find subject name
      const subjs = await apiFetch('/lms/subjects');
      const sObj = subjs.find(s => s.id === subjectId);
      setSubject(sObj);

      // Load items
      const les = await apiFetch(`/lms/lessons?subject_id=${subjectId}`);
      setLessons(les);

      const ass = await apiFetch(`/lms/assignments?subject_id=${subjectId}`);
      setAssignments(ass);

      const subs = await apiFetch('/lms/submissions');
      setSubmissions(subs);

      const qz = await apiFetch(`/lms/quizzes?subject_id=${subjectId}`);
      setQuizzes(qz);

      // Load student's own attempts
      const atts = [];
      for (const q of qz) {
        try {
          const res = await apiFetch(`/lms/attempts?quiz_id=${q.id}`);
          if (res && res.length > 0) {
            atts.push(res[0]); // since student only has one attempt
          }
        } catch (e) {
          console.warn('Attempt error', e);
        }
      }
      setAttempts(atts);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [subjectId]);

  const handleLessonOpen = async (lesson) => {
    setActiveLesson(lesson);
    try {
      // Log event
      await apiFetch('/analytics/log', {
        method: 'POST',
        body: JSON.stringify({
          event_type: 'material_opened',
          details: { lesson_id: lesson.id, title: lesson.title }
        })
      });
    } catch (err) {
      console.warn('Analytics log failed', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-purple-400">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-3 font-semibold text-lg">Entering Course Room...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Navigation */}
      <Link to="/student" className="inline-flex items-center text-sm font-semibold text-purple-400 hover:text-purple-300 gap-1 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white tracking-tight">{subject?.name || 'Course Room'}</h1>
        <p className="text-gray-400">Instructor: Timothy Teacher</p>
      </div>

      {/* Lesson Reader Modal */}
      {activeLesson && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-panel w-full max-w-2xl rounded-2xl p-6 shadow-2xl relative border-purple-500/20">
            <button
              onClick={() => setActiveLesson(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white cursor-pointer font-bold text-sm"
            >
              Close
            </button>
            <h2 className="text-xl font-bold text-white mb-2">{activeLesson.title}</h2>
            <div className="text-[10px] text-purple-400 font-semibold mb-6 flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5" /> Engagement Logged
            </div>
            
            <div className="p-4 bg-gray-950 border border-gray-800 rounded-xl max-h-[300px] overflow-y-auto mb-6">
              <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                {activeLesson.content || 'This lesson contains only external attachments.'}
              </p>
            </div>

            {activeLesson.file_url && (
              <div className="flex justify-between items-center pt-4 border-t border-gray-800">
                <span className="text-xs text-gray-400">Supporting slides or handout:</span>
                <a
                  href={activeLesson.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 font-bold"
                >
                  Download Material <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Lessons List */}
        <div className="glass-panel p-6 rounded-2xl">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-purple-400" /> Course Materials
          </h2>

          {lessons.length === 0 ? (
            <p className="text-gray-500 text-sm py-6 text-center">No materials posted.</p>
          ) : (
            <div className="space-y-3">
              {lessons.map(les => (
                <div
                  key={les.id}
                  id={`lesson-${les.id}`}
                  onClick={() => handleLessonOpen(les)}
                  className="p-4 bg-gray-950 hover:bg-purple-950/20 border border-gray-800 hover:border-purple-500/40 rounded-xl flex justify-between items-center transition-all cursor-pointer group"
                >
                  <div>
                    <div className="font-semibold text-white text-sm group-hover:text-purple-400 transition-colors">{les.title}</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">Click to read & log participation</div>
                  </div>
                  <Play className="w-4 h-4 text-purple-400 group-hover:text-purple-300 transition-colors" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Assignments List */}
        <div className="glass-panel p-6 rounded-2xl">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-400" /> Homework Tasks
          </h2>

          {assignments.length === 0 ? (
            <p className="text-gray-500 text-sm py-6 text-center">No assignments posted.</p>
          ) : (
            <div className="space-y-4">
              {assignments.map(ass => {
                const sub = submissions.find(s => s.assignment_id === ass.id);
                const hasSubmitted = !!sub;

                let tagStyle = '';
                let tagText = '';

                if (hasSubmitted) {
                  if (sub.status === 'graded') {
                    tagText = `Graded: ${sub.score}/${ass.max_points}`;
                    tagStyle = 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400';
                  } else {
                    tagText = 'Submitted';
                    tagStyle = 'bg-amber-500/20 border-amber-500/40 text-amber-400';
                  }
                } else {
                  tagText = 'Assigned';
                  tagStyle = 'bg-gray-800 border-gray-700 text-gray-300';
                }

                return (
                  <div key={ass.id} className="p-4 bg-gray-950 border border-gray-800 rounded-xl space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold text-white text-sm">{ass.title}</div>
                        <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                          Due: {new Date(ass.due_date).toLocaleString()}
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 border text-[9px] font-bold uppercase rounded ${tagStyle}`}>
                        {tagText}
                      </span>
                    </div>

                    {ass.description && (
                      <p className="text-xs text-gray-400 leading-relaxed">{ass.description}</p>
                    )}

                    {!hasSubmitted && (
                      <Link
                        id={`submit-link-${ass.id}`}
                        to={`/submit-assignment/${ass.id}`}
                        className="w-full py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                      >
                        Submit Response
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quizzes List */}
        <div className="glass-panel p-6 rounded-2xl">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-purple-400" /> Quizzes
          </h2>

          {quizzes.length === 0 ? (
            <p className="text-gray-500 text-sm py-6 text-center">No quizzes posted.</p>
          ) : (
            <div className="space-y-4">
              {quizzes.map(qz => {
                const att = attempts.find(a => a.quiz_id === qz.id);
                const hasAttempted = !!att;

                return (
                  <div key={qz.id} className="p-4 bg-gray-950 border border-gray-800 rounded-xl space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold text-white text-sm">{qz.title}</div>
                        <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                          Due: {new Date(qz.due_date).toLocaleString()}
                        </div>
                      </div>
                      {hasAttempted ? (
                        <span className="px-2 py-0.5 bg-blue-500/20 border border-blue-500/40 text-blue-400 text-[9px] font-bold uppercase rounded">
                          Score: {att.score}/{att.max_score}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-gray-800 border border-gray-700 text-gray-300 text-[9px] font-bold uppercase rounded">
                          Unattempted
                        </span>
                      )}
                    </div>

                    {qz.description && (
                      <p className="text-xs text-gray-400 leading-relaxed">{qz.description}</p>
                    )}

                    {!hasAttempted && (
                      <Link
                        id={`take-quiz-link-${qz.id}`}
                        to={`/take-quiz/${qz.id}`}
                        className="w-full py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                      >
                        Start Quiz attempt
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
