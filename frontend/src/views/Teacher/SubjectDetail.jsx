import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { BookOpen, FileText, HelpCircle, Plus, ArrowLeft, Loader2, Save, Trash } from 'lucide-react';

export default function SubjectDetail() {
  const { id: subjectId } = useParams();
  const { apiFetch } = useAuth();

  const [subject, setSubject] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal / Form toggle states
  const [activeForm, setActiveForm] = useState(null); // 'lesson' | 'assignment' | 'quiz'

  // Forms states
  const [lessonForm, setLessonForm] = useState({ title: '', content: '', file_url: '' });
  const [assignForm, setAssignForm] = useState({ title: '', description: '', max_points: 10, due_date: '' });
  
  // Quiz creator state
  const [quizForm, setQuizForm] = useState({ title: '', description: '', due_date: '' });
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState({
    question_text: '',
    question_type: 'multiple_choice',
    points: 1,
    topic: 'General',
    options: ['', '', '', ''],
    correct_answer: ''
  });

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

      const qz = await apiFetch(`/lms/quizzes?subject_id=${subjectId}`);
      setQuizzes(qz);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [subjectId]);

  // Lessons Submission
  const handleSaveLesson = async (e) => {
    e.preventDefault();
    try {
      const data = await apiFetch('/lms/lessons', {
        method: 'POST',
        body: JSON.stringify({
          subject_id: subjectId,
          ...lessonForm
        })
      });
      setLessons([...lessons, data]);
      setLessonForm({ title: '', content: '', file_url: '' });
      setActiveForm(null);
    } catch (err) {
      alert(err.message);
    }
  };

  // Assignment Submission
  const handleSaveAssignment = async (e) => {
    e.preventDefault();
    try {
      const data = await apiFetch('/lms/assignments', {
        method: 'POST',
        body: JSON.stringify({
          subject_id: subjectId,
          ...assignForm
        })
      });
      setAssignments([...assignments, data]);
      setAssignForm({ title: '', description: '', max_points: 10, due_date: '' });
      setActiveForm(null);
    } catch (err) {
      alert(err.message);
    }
  };

  // Quiz Creator logic
  const handleAddQuestion = () => {
    if (!currentQuestion.question_text || !currentQuestion.correct_answer) {
      alert('Please fill question text and correct answer.');
      return;
    }
    setQuizQuestions([...quizQuestions, currentQuestion]);
    setCurrentQuestion({
      question_text: '',
      question_type: 'multiple_choice',
      points: 1,
      topic: 'General',
      options: ['', '', '', ''],
      correct_answer: ''
    });
  };

  const handleSaveQuiz = async (e) => {
    e.preventDefault();
    if (quizQuestions.length === 0) {
      alert('Please add at least one question to the quiz.');
      return;
    }
    try {
      const data = await apiFetch('/lms/quizzes', {
        method: 'POST',
        body: JSON.stringify({
          subject_id: subjectId,
          ...quizForm,
          questions: quizQuestions
        })
      });
      setQuizzes([...quizzes, data]);
      setQuizForm({ title: '', description: '', due_date: '' });
      setQuizQuestions([]);
      setActiveForm(null);
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-purple-400">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-3 font-semibold text-lg">Loading Course Room...</span>
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
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">{subject?.name || 'Subject details'}</h1>
          <p className="text-gray-400">Section: {subject?.section_id ? 'Grade 10' : 'Your class'}</p>
        </div>

        {/* Action Controls */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveForm(activeForm === 'lesson' ? null : 'lesson')}
            className="px-3 py-1.5 bg-gray-900 border border-gray-800 hover:border-purple-500 text-purple-400 hover:text-purple-300 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add Lesson
          </button>
          <button
            onClick={() => setActiveForm(activeForm === 'assignment' ? null : 'assignment')}
            className="px-3 py-1.5 bg-gray-900 border border-gray-800 hover:border-purple-500 text-purple-400 hover:text-purple-300 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add Assignment
          </button>
          <button
            id="btn-add-quiz"
            onClick={() => setActiveForm(activeForm === 'quiz' ? null : 'quiz')}
            className="px-3 py-1.5 bg-gray-900 border border-gray-800 hover:border-purple-500 text-purple-400 hover:text-purple-300 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add Quiz
          </button>
        </div>
      </div>

      {/* Forms Drawer */}
      {activeForm && (
        <div className="glass-panel p-6 rounded-2xl mb-8 border-purple-500/20 shadow-xl max-w-2xl mx-auto">
          {activeForm === 'lesson' && (
            <form onSubmit={handleSaveLesson} className="space-y-4">
              <h2 className="text-lg font-bold text-white mb-2">New Lesson Material</h2>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Lesson Title</label>
                <input
                  type="text"
                  required
                  value={lessonForm.title}
                  onChange={e => setLessonForm({ ...lessonForm, title: e.target.value })}
                  placeholder="E.g. Introduction to Quadratics"
                  className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Content (Text / Markdown)</label>
                <textarea
                  rows={5}
                  value={lessonForm.content}
                  onChange={e => setLessonForm({ ...lessonForm, content: e.target.value })}
                  placeholder="Enter lesson text..."
                  className="w-full p-3 bg-gray-950 border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Attachment File / Link URL</label>
                <input
                  type="text"
                  value={lessonForm.file_url}
                  onChange={e => setLessonForm({ ...lessonForm, file_url: e.target.value })}
                  placeholder="https://example.com/slide.pdf"
                  className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium shadow-md transition-colors cursor-pointer"
              >
                Publish Lesson
              </button>
            </form>
          )}

          {activeForm === 'assignment' && (
            <form onSubmit={handleSaveAssignment} className="space-y-4">
              <h2 className="text-lg font-bold text-white mb-2">New Homework Assignment</h2>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Assignment Title</label>
                <input
                  type="text"
                  required
                  value={assignForm.title}
                  onChange={e => setAssignForm({ ...assignForm, title: e.target.value })}
                  placeholder="E.g. Homework 1"
                  className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Description / Prompt</label>
                <textarea
                  rows={4}
                  value={assignForm.description}
                  onChange={e => setAssignForm({ ...assignForm, description: e.target.value })}
                  placeholder="Enter details..."
                  className="w-full p-3 bg-gray-950 border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Max Points</label>
                  <input
                    type="number"
                    required
                    value={assignForm.max_points}
                    onChange={e => setAssignForm({ ...assignForm, max_points: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Due Date</label>
                  <input
                    type="datetime-local"
                    required
                    value={assignForm.due_date}
                    onChange={e => setAssignForm({ ...assignForm, due_date: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium shadow-md transition-colors cursor-pointer"
              >
                Publish Assignment
              </button>
            </form>
          )}

          {activeForm === 'quiz' && (
            <form onSubmit={handleSaveQuiz} className="space-y-5">
              <h2 className="text-lg font-bold text-white mb-2">New Interactive Quiz</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Quiz Title</label>
                  <input
                    id="quiz-title-input"
                    type="text"
                    required
                    value={quizForm.title}
                    onChange={e => setQuizForm({ ...quizForm, title: e.target.value })}
                    placeholder="E.g. Unit 1 Quiz"
                    className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Due Date</label>
                  <input
                    id="quiz-due-input"
                    type="datetime-local"
                    required
                    value={quizForm.due_date}
                    onChange={e => setQuizForm({ ...quizForm, due_date: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Quiz Description</label>
                <input
                  type="text"
                  value={quizForm.description}
                  onChange={e => setQuizForm({ ...quizForm, description: e.target.value })}
                  placeholder="Testing core linear concepts"
                  className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Added questions list */}
              {quizQuestions.length > 0 && (
                <div className="p-4 bg-gray-950 border border-gray-800 rounded-xl space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-purple-400">Questions Stack ({quizQuestions.length})</h3>
                  <div className="space-y-1 text-xs">
                    {quizQuestions.map((q, idx) => (
                      <div key={idx} className="flex justify-between p-2 bg-gray-900 rounded">
                        <span>{idx+1}. {q.question_text} <span className="text-gray-500">({q.points} pt, {q.topic})</span></span>
                        <span className="font-semibold text-emerald-400">Ans: {q.correct_answer}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Question Editor panel */}
              <div className="p-4 bg-gray-950/60 border border-gray-800/80 rounded-xl space-y-4">
                <h3 className="text-sm font-semibold text-white">Add Question</h3>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Question Text</label>
                  <input
                    id="question-text-input"
                    type="text"
                    value={currentQuestion.question_text}
                    onChange={e => setCurrentQuestion({ ...currentQuestion, question_text: e.target.value })}
                    placeholder="Enter question prompt..."
                    className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Type</label>
                    <select
                      value={currentQuestion.question_type}
                      onChange={e => {
                        const type = e.target.value;
                        const opts = type === 'true_false' ? ['True', 'False'] : ['', '', '', ''];
                        setCurrentQuestion({ ...currentQuestion, question_type: type, options: opts, correct_answer: '' });
                      }}
                      className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="multiple_choice">Multiple Choice</option>
                      <option value="true_false">True / False</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Points</label>
                    <input
                      type="number"
                      value={currentQuestion.points}
                      onChange={e => setCurrentQuestion({ ...currentQuestion, points: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Topic Tag</label>
                    <input
                      id="question-topic-input"
                      type="text"
                      value={currentQuestion.topic}
                      onChange={e => setCurrentQuestion({ ...currentQuestion, topic: e.target.value })}
                      placeholder="E.g. Roots"
                      className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                {/* Options list */}
                {currentQuestion.question_type === 'multiple_choice' && (
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-gray-400">Answer Options</label>
                    <div className="grid grid-cols-2 gap-2">
                      {currentQuestion.options.map((opt, idx) => (
                        <input
                          key={idx}
                          id={`option-input-${idx}`}
                          type="text"
                          required
                          value={opt}
                          onChange={e => {
                            const newOpts = [...currentQuestion.options];
                            newOpts[idx] = e.target.value;
                            setCurrentQuestion({ ...currentQuestion, options: newOpts });
                          }}
                          placeholder={`Option ${idx + 1}`}
                          className="px-3 py-1.5 bg-gray-950 border border-gray-800 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Correct Answer</label>
                  {currentQuestion.question_type === 'true_false' ? (
                    <select
                      value={currentQuestion.correct_answer}
                      onChange={e => setCurrentQuestion({ ...currentQuestion, correct_answer: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">-- Choose Option --</option>
                      <option value="True">True</option>
                      <option value="False">False</option>
                    </select>
                  ) : (
                    <select
                      id="correct-answer-select"
                      value={currentQuestion.correct_answer}
                      onChange={e => setCurrentQuestion({ ...currentQuestion, correct_answer: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">-- Choose Option --</option>
                      {currentQuestion.options.map((opt, idx) => (
                        <option key={idx} value={opt} disabled={!opt}>
                          {opt || `(Option ${idx + 1} empty)`}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <button
                  id="add-question-btn"
                  type="button"
                  onClick={handleAddQuestion}
                  className="w-full py-1.5 border border-purple-500/30 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Confirm & Push Question
                </button>
              </div>

              <button
                id="submit-quiz-btn"
                type="submit"
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold shadow-lg hover:shadow-purple-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" /> Save & Publish Quiz ({quizQuestions.length} questions)
              </button>
            </form>
          )}
        </div>
      )}

      {/* Lists matrices */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Lesson list */}
        <div className="glass-panel p-6 rounded-2xl">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-purple-400" /> Lessons & Slide decks
          </h2>

          {lessons.length === 0 ? (
            <p className="text-gray-500 text-sm py-6 text-center">No materials posted.</p>
          ) : (
            <div className="space-y-4">
              {lessons.map(les => (
                <div key={les.id} className="p-4 bg-gray-950 border border-gray-800 rounded-xl space-y-2">
                  <div className="font-semibold text-white text-sm">{les.title}</div>
                  {les.content && (
                    <p className="text-xs text-gray-400 line-clamp-3 leading-relaxed">{les.content}</p>
                  )}
                  {les.file_url && (
                    <a
                      href={les.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block text-[11px] font-semibold text-purple-400 hover:text-purple-300 mt-1 transition-colors"
                    >
                      View Slides &rarr;
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Assignments list */}
        <div className="glass-panel p-6 rounded-2xl">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-400" /> Assignments
          </h2>

          {assignments.length === 0 ? (
            <p className="text-gray-500 text-sm py-6 text-center">No assignments posted.</p>
          ) : (
            <div className="space-y-4">
              {assignments.map(ass => (
                <div key={ass.id} className="p-4 bg-gray-950 border border-gray-800 rounded-xl space-y-2">
                  <div className="flex justify-between items-start">
                    <div className="font-semibold text-white text-sm">{ass.title}</div>
                    <span className="text-[10px] text-gray-400 font-semibold">{ass.max_points} pts</span>
                  </div>
                  {ass.description && (
                    <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">{ass.description}</p>
                  )}
                  <div className="text-[10px] text-gray-500 font-mono">
                    Due: {new Date(ass.due_date).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quizzes list */}
        <div className="glass-panel p-6 rounded-2xl">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-purple-400" /> Active Quizzes
          </h2>

          {quizzes.length === 0 ? (
            <p className="text-gray-500 text-sm py-6 text-center">No quizzes posted.</p>
          ) : (
            <div className="space-y-4">
              {quizzes.map(qz => (
                <div key={qz.id} className="p-4 bg-gray-950 border border-gray-800 rounded-xl space-y-2">
                  <div className="font-semibold text-white text-sm">{qz.title}</div>
                  {qz.description && (
                    <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">{qz.description}</p>
                  )}
                  <div className="text-[10px] text-gray-500 font-mono">
                    Due: {new Date(qz.due_date).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
