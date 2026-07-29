import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

const InterventionContext = createContext();

export function InterventionProvider({ children }) {
  const { apiFetch } = useAuth();
  const [interventions, setInterventions] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadInterventions = async (sectionId) => {
    setLoading(true);
    try {
      const data = await apiFetch(`/sis/interventions${sectionId ? `?section_id=${sectionId}` : ''}`);
      setInterventions(data);
    } catch (e) {
      console.error('Failed to load interventions', e);
    } finally {
      setLoading(false);
    }
  };

  const createIntervention = async (payload) => {
    try {
      const newIntervention = await apiFetch('/sis/interventions', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      // Refresh list after creation
      await loadInterventions(payload.section_id);
      return newIntervention;
    } catch (e) {
      console.error('Create intervention error', e);
      throw e;
    }
  };

  const updateIntervention = async (id, patch) => {
    try {
      await apiFetch(`/sis/interventions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch)
      });
      // Refresh list (assuming patch contains section_id)
      if (patch.section_id) await loadInterventions(patch.section_id);
    } catch (e) {
      console.error('Update intervention error', e);
      throw e;
    }
  };

  return (
    <InterventionContext.Provider value={{ interventions, loading, loadInterventions, createIntervention, updateIntervention }}>
      {children}
    </InterventionContext.Provider>
  );
}

export function useIntervention() {
  return useContext(InterventionContext);
}
