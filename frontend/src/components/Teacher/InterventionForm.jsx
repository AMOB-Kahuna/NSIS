import React, { useState } from 'react';
import { useIntervention } from '../../context/InterventionContext';
import { useAuth } from '../../context/AuthContext';

export function InterventionForm({ student, defaultReason = '', onClose }) {
  const { createIntervention } = useIntervention();
  const { apiFetch } = useAuth();
  const [type, setType] = useState('Check‑in');
  const [reason, setReason] = useState(defaultReason);
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await createIntervention({
        student_id: student.id,
        section_id: student.section_id || undefined,
        type,
        reason,
        notes,
        due_date: dueDate,
        status: 'open'
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create intervention');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm z-50">
      <div className="glass-panel rounded-2xl w-96 p-6 relative">
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-white"
          onClick={onClose}
        >
          ×
        </button>
        <h3 className="text-lg font-semibold text-white mb-4">Create Intervention</h3>
        {error && <div className="mb-2 text-sm text-red-300">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block">
            <span className="text-gray-300">Type</span>
            <select
              className="mt-1 block w-full rounded bg-gray-800 text-white"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option>Check‑in</option>
              <option>Parent Outreach</option>
              <option>Support Session</option>
            </select>
          </label>
          <label className="block">
            <span className="text-gray-300">Reason</span>
            <input
              className="mt-1 block w-full rounded bg-gray-800 text-white"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-gray-300">Notes</span>
            <textarea
              className="mt-1 block w-full rounded bg-gray-800 text-white"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-gray-300">Due date</span>
            <input
              type="date"
              className="mt-1 block w-full rounded bg-gray-800 text-white"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </label>
          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              className="px-3 py-1 bg-gray-600 text-gray-200 rounded"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
