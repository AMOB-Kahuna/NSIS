import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, Loader2, CheckCircle, ChevronRight, AlertCircle, HelpCircle } from 'lucide-react';

export default function TakeQuiz() {
  const { id: quizId } = useParams();
  const navigate = useNavigate();
  const { apiFetch } = useAuth();

  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Progress states
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { [questionId]: "chosenAnswerText" }
  
  // Result state
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      // Find quiz details
      const subjs = await apiFetch('/lms/subjects');
      for (const subj of subjs) {
        try {
          const quizzes = await apiFetch(`/lms/quizzes?subject_id=${subj.id}`);
          const matched = quizzes.find(q => q.id === quizId);
          if (matched) {
            setQuiz(matched);
            break;
          }
        } catch (e) {
          console.warn(e);
        }
      }

      // Fetch scrubbed questions
      const qData = await apiFetch(`/lms/quizzes/${quizId}/questions`);
      setQuestions(qData);
    } catch (err) {
      console.error(err);
      setError('Failed to load quiz details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [quizId]);

  const handleOptionSelect = (optionText) => {
    if (result) return;
    const currentQ = questions[currentIndex];
    setAnswers({
      ...answers,
      [currentQ.id]: optionText
    });
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const res = await apiFetch(`/lms/quizzes/${quizId}/attempt`, {
        method: 'POST',
        body: JSON.stringify({ answers })
      });
      setResult(res.attempt);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-green-400">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-3 font-semibold">Opening Question Sheet...</span>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-md text-center">
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">No Questions Found</h2>
        <p className="text-gray-400 text-sm mb-6">This quiz does not have any active questions yet.</p>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-gray-900 border border-gray-800 text-white rounded-lg text-sm font-semibold cursor-pointer"
        >
          Go Back
        </button>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  const selectedOption = answers[currentQ.id] || '';
  const progressPercent = Math.round(((currentIndex + 1) / questions.length) * 100);

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">{quiz?.title || 'Take Quiz'}</h1>
          <p className="text-xs text-gray-400 mt-0.5">{quiz?.description || 'Class evaluation quiz'}</p>
        </div>
        {!result && (
          <div className="text-xs font-mono text-purple-400 font-semibold bg-purple-950/40 border border-purple-500/20 px-2.5 py-1 rounded-lg">
            Question {currentIndex + 1} of {questions.length}
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-950/40 border border-red-500/50 text-red-200 text-sm p-3 rounded-lg mb-6 text-center">
          {error}
        </div>
      )}

      {/* Quiz Attempt Results View */}
      {result ? (
        <div className="glass-panel p-8 rounded-2xl text-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/5 rounded-full blur-2xl -z-10"></div>
          <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white">Quiz Attempt Completed</h2>
          <p className="text-gray-400 text-sm mt-1">Your response was graded instantly server-side</p>

          <div className="my-8 max-w-xs mx-auto p-6 bg-gray-950 border border-gray-800 rounded-2xl">
            <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Your Score</div>
            <div className="text-4xl font-extrabold text-white mt-2">
              {result.score} <span className="text-sm font-normal text-gray-500">/ {result.max_score}</span>
            </div>
            <div className="text-sm font-semibold text-purple-400 mt-2">
              Percentage: {Math.round(result.percentage)}%
            </div>
          </div>

          <button
            id="close-quiz-btn"
            onClick={() => navigate(quiz ? `/subjects/${quiz.subject_id}` : '/student')}
            className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold transition-colors cursor-pointer"
          >
            Return to Classroom
          </button>
        </div>
      ) : (
        /* Question panel */
        <div className="glass-panel p-6 rounded-2xl shadow-xl relative">
          {/* Progress bar */}
          <div className="w-full bg-gray-950 h-1.5 rounded-full overflow-hidden mb-6">
            <div
              className="bg-purple-600 h-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>

          <div className="min-h-[160px] mb-8 space-y-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4" /> Topic: {currentQ.topic || 'General'} &bull; {currentQ.points} pt
            </div>
            <h3 className="text-lg font-bold text-white leading-relaxed">
              {currentQ.question_text}
            </h3>
          </div>

          {/* Options Grid */}
          <div className="grid grid-cols-1 gap-3 mb-8">
            {currentQ.options?.map((opt, idx) => {
              const isSelected = selectedOption === opt;
              return (
                <button
                  key={idx}
                  id={`option-${idx}`}
                  onClick={() => handleOptionSelect(opt)}
                  className={`p-4 text-left border rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-purple-950/30 border-purple-500 text-purple-300 shadow-md ring-2 ring-purple-500/20'
                      : 'bg-gray-950 border-gray-800 text-gray-300 hover:bg-gray-900/60 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-5 h-5 rounded-full border flex items-center justify-center text-[10px] ${
                      isSelected ? 'border-purple-400 bg-purple-600 text-white font-bold' : 'border-gray-700 text-gray-500'
                    }`}>
                      {String.fromCharCode(65 + idx)}
                    </span>
                    {opt}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Navigation Controls */}
          <div className="flex justify-between items-center border-t border-gray-800/80 pt-6">
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="px-4 py-2 border border-gray-800 disabled:opacity-30 text-gray-400 hover:text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Previous Question
            </button>

            {currentIndex === questions.length - 1 ? (
              <button
                id="submit-quiz-attempt-btn"
                onClick={handleSubmit}
                disabled={submitting || !selectedOption}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800/60 disabled:text-gray-400 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Quiz attempt'}
              </button>
            ) : (
              <button
                id="next-question-btn"
                onClick={handleNext}
                disabled={!selectedOption}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800/60 disabled:text-gray-400 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                Next Question <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
