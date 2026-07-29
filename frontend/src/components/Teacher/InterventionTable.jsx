import React from 'react';
import { useIntervention } from '../../context/InterventionContext';
import { useAuth } from '../../context/AuthContext';

export function InterventionTable({ sectionId }) {
  const { interventions, loadInterventions, updateIntervention, loading } = useIntervention();
  const { apiFetch } = useAuth();

  React.useEffect(() => {
    loadInterventions(sectionId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionId]);

  const handleMarkCompleted = async (id) => {
    await updateIntervention(id, { status: 'completed' });
    await loadInterventions(sectionId);
  };

  if (loading) return <div className="text-gray-400">Loading interventions…</div>;

  return (
    <div className="glass-panel rounded-2xl overflow-hidden shadow-xl p-4 mt-6">
      <h2 className="text-xl font-semibold mb-4 text-white">Interventions</h2>
      <table className="w-full table-fixed border-collapse">
        <thead className="bg-gray-900/40 text-gray-400 text-xs uppercase">
          <tr>
            <th className="p-2">Student</th>
            <th className="p-2">Type</th>
            <th className="p-2">Due Date</th>
            <th className="p-2">Status</th>
            <th className="p-2">Notes</th>
            <th className="p-2">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800/60 text-sm">
          {interventions.map((intv) => (
            <tr key={intv.id} className="hover:bg-gray-900/10">
              <td className="p-2 text-white">{intv.student_name || intv.student_id}</td>
              <td className="p-2 text-gray-200">{intv.type}</td>
              <td className="p-2 text-gray-200">{intv.due_date}</td>
              <td className="p-2 text-gray-200 capitalize">{intv.status}</td>
              <td className="p-2 text-gray-300 truncate max-w-[200px]">{intv.notes}</td>
              <td className="p-2 space-x-2">
                {intv.status !== 'completed' && (
                  <button
                    className="px-2 py-1 bg-green-600 text-white text-xs rounded"
                    onClick={() => handleMarkCompleted(intv.id)}
                  >
                    Mark Completed
                  </button>
                )}
                {/* Edit and Add follow‑up could be added later */}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
