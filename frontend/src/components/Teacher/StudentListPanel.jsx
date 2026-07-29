import React from 'react';
import { AtRiskBadgePanel } from './AtRiskBadgePanel';
import { InterventionForm } from './InterventionForm';

export function StudentListPanel({ students, atRiskInfo, onViewAttendance, onCreateIntervention }) {
  const [selectedStudent, setSelectedStudent] = React.useState(null);
  const [showBadgePanel, setShowBadgePanel] = React.useState(false);
  const [showInterventionForm, setShowInterventionForm] = React.useState(false);

  const handleBadgeClick = (student) => {
    setSelectedStudent(student);
    setShowBadgePanel(true);
  };

  const handleCreateIntervention = (student) => {
    setSelectedStudent(student);
    setShowInterventionForm(true);
  };

  return (
    <div className="glass-panel rounded-2xl p-4">
      <h2 className="text-xl font-semibold mb-4 text-white">Class Roster</h2>
      <table className="w-full text-left border-collapse">
        <thead className="bg-gray-900/40 text-gray-400 text-xs uppercase">
          <tr>
            <th className="p-2">Student</th>
            <th className="p-2">At‑Risk</th>
            <th className="p-2">Top Triggers</th>
            <th className="p-2">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800/60">
          {students.map((stud) => {
            const risk = atRiskInfo?.find(r => r.student_id === stud.id) || {};
            const badgeColor = {
              high: 'bg-badge-high text-white',
              medium: 'bg-badge-medium text-white',
              low: 'bg-badge-low text-white',
            }[risk.badge] || 'bg-gray-600 text-white';
            return (
              <tr key={stud.id} className="hover:bg-gray-900/10">
                <td className="p-2 font-medium text-white">{stud.profiles?.full_name}</td>
                <td className="p-2">
                  <button
                    className={`px-2 py-1 text-xs rounded ${badgeColor}`}
                    onClick={() => handleBadgeClick(stud)}
                  >
                    {risk.badge?.toUpperCase() || 'N/A'}
                  </button>
                </td>
                <td className="p-2 text-sm text-gray-300">
                  {risk.triggers?.slice(0, 3).join(', ') || '—'}
                </td>
                <td className="p-2 space-x-2">
                  <button
                    className="inline-flex items-center gap-1 px-3 py-1 bg-gray-700 text-gray-200 text-xs rounded"
                    onClick={() => onViewAttendance(stud)}
                  >
                    View Attendance
                  </button>
                  <button
                    className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-xs rounded"
                    onClick={() => handleCreateIntervention(stud)}
                  >
                    Create Intervention
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {showBadgePanel && selectedStudent && (
        <AtRiskBadgePanel
          student={selectedStudent}
          onClose={() => setShowBadgePanel(false)}
          onCreateIntervention={() => {
            setShowBadgePanel(false);
            setShowInterventionForm(true);
          }}
          riskInfo={atRiskInfo?.find(r => r.student_id === selectedStudent.id)}
        />
      )}

      {showInterventionForm && selectedStudent && (
        <InterventionForm
          student={selectedStudent}
          defaultReason={atRiskInfo?.find(r => r.student_id === selectedStudent.id)?.triggers?.[0]}
          onClose={() => setShowInterventionForm(false)}
        />
      )}
    </div>
  );
}
