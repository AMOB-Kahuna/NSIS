import React from 'react';

export function AtRiskBadgePanel({ student, riskInfo, onClose, onCreateIntervention }) {
  if (!riskInfo) return null;
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm z-50">
      <div className="glass-panel rounded-2xl w-96 p-6 relative">
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-white"
          onClick={onClose}
        >
          ×
        </button>
        <h3 className="text-lg font-semibold text-white mb-4">
          At‑Risk Details for {student.profiles?.full_name}
        </h3>
        <div className="mb-3">
          <span className="font-medium text-gray-300">Badge:</span>{' '}
          <span className="uppercase text-white">{riskInfo.badge}</span>
        </div>
        <div className="mb-3">
          <span className="font-medium text-gray-300">Triggers:</span>{' '}
          <ul className="list-disc list-inside text-gray-200">
            {riskInfo.triggers?.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </div>
        <div className="mb-4">
          <span className="font-medium text-gray-300">Fired Rules:</span>
          {riskInfo.rules?.map((rule, i) => (
            <div key={i} className="mt-2 p-2 border border-gray-700 rounded">
              <p className="text-sm text-gray-200"><strong>{rule.name}</strong></p>
              <p className="text-xs text-gray-400">Measured: {rule.measured}</p>
              <p className="text-xs text-gray-400">Threshold: {rule.threshold}</p>
              <p className="text-xs text-gray-400">Value: {rule.value}</p>
              {rule.events && (
                <p className="text-xs text-gray-400">Events: {rule.events.join(', ')}</p>
              )}
            </div>
          ))}
        </div>
        <button
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          onClick={onCreateIntervention}
        >
          Create Intervention
        </button>
      </div>
    </div>
  );
}
