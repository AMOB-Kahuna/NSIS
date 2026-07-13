import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, Loader2, Save, FileText } from 'lucide-react';

export default function SubmitAssignment() {
  const { id: assignmentId } = useParams();
  const navigate = useNavigate();
  const { apiFetch } = useAuth();

  const [assignment, setAssignment] = useState(null);
  const [content, setContent] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      // Find assignment details
      const subjs = await apiFetch('/lms/subjects');
      // Look for assignment in any subject
      for (const subj of subjs) {
        try {
          const assigns = await apiFetch(`/lms/assignments?subject_id=${subj.id}`);
          const matched = assigns.find(a => a.id === assignmentId);
          if (matched) {
            setAssignment(matched);
            break;
          }
        } catch (e) {
          console.warn(e);
        }
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load assignment details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [assignmentId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) {
      return setError('Please write an answer before submitting.');
    }
    setError('');
    setSubmitting(true);
    try {
      await apiFetch('/lms/submissions', {
        method: 'POST',
        body: JSON.stringify({
          assignment_id: assignmentId,
          content,
          file_url: fileUrl || undefined
        })
      });
      // Redirect back to subject view
      if (assignment) {
        navigate(`/subjects/${assignment.subject_id}`);
      } else {
        navigate('/student');
      }
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
        <span className="ml-3 font-semibold">Opening Assignment Sheet...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Navigation */}
      {assignment && (
        <Link
          to={`/subjects/${assignment.subject_id}`}
          className="inline-flex items-center text-sm font-semibold text-green-400 hover:text-green-300 gap-1 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Subject
        </Link>
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white tracking-tight">Submit Assignment</h1>
        <p className="text-gray-400">Deliver your homework response online</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Assignment Sheet Prompt */}
        <div className="lg:col-span-1 glass-panel p-6 rounded-2xl">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-green-400" /> Assignment prompt
          </h2>

          <div className="space-y-4">
            <div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Title</div>
              <div className="text-base font-bold text-white mt-0.5">{assignment?.title}</div>
            </div>
            {assignment?.description && (
              <div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Instructions</div>
                <p className="text-sm text-gray-300 leading-relaxed mt-1">{assignment.description}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-800/80">
              <div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Max Points</div>
                <div className="text-sm font-semibold text-white mt-0.5">{assignment?.max_points} pts</div>
              </div>
              <div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Due Date</div>
                <div className="text-xs font-semibold text-white mt-0.5 font-mono">
                  {assignment ? new Date(assignment.due_date).toLocaleString() : ''}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Input submission Form */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl">
          <h2 className="text-lg font-bold text-white mb-4">Your Response</h2>
          {error && (
            <div className="bg-red-950/40 border border-red-500/50 text-red-200 text-sm p-3 rounded-lg mb-4 text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                Written Response
              </label>
              <textarea
                id="submission-content-input"
                rows={8}
                required
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Type your homework solution here..."
                className="w-full p-4 bg-gray-950 border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                Supporting link / file url (optional)
              </label>
              <input
                id="submission-link-input"
                type="text"
                value={fileUrl}
                onChange={(e) => setFileUrl(e.target.value)}
                placeholder="https://example.com/docs/homework.pdf"
                className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <button
              id="submit-assignment-btn"
              type="submit"
              disabled={submitting}
              className="py-2.5 px-6 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white rounded-lg text-sm font-semibold shadow-lg hover:shadow-green-500/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Submit to Gradebook
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
