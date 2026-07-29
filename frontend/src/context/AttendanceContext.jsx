import React, { createContext, useContext, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from './AuthContext';

// Create a context that will expose attendance‑related state and helpers.
const AttendanceContext = createContext(null);

/**
 * AttendanceProvider loads the essential data for a given class section and makes
 * it available to the rest of the teacher UI.
 *
 * Expected shape of the exposed value:
 *   {
 *     students:    Array   // list of student objects for the section
 *     atRiskInfo: Object   // risk metadata returned by /sis/atrisk/:section_id
 *     loading:    boolean // true while the initial load is in progress
 *     refresh:    () => void // re‑fetch data for the current section
 *   }
 */
export const AttendanceProvider = ({ children }) => {
  const { apiFetch } = useAuth();
  const { sectionId } = useParams();

  const [students, setStudents] = useState([]);
  const [atRiskInfo, setAtRiskInfo] = useState({});
  const [loading, setLoading] = useState(true);

  // Load all required data for the supplied sectionId.
  const loadAll = async (id) => {
    if (!id) return;
    setLoading(true);
    try {
      // 1️⃣ Enrollments – gives us the roster of students.
      const enrollments = await apiFetch(`/sis/enrollments?section_id=${id}`);
      const roster = enrollments.map((e) => e.student).filter(Boolean);
      setStudents(roster);

      // 2️⃣ At‑risk information – optional but useful for the badge UI.
      const atrisk = await apiFetch(`/sis/atrisk/${id}`);
      setAtRiskInfo(atrisk);
    } catch (err) {
      console.error('AttendanceContext load error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Refresh simply re‑runs the load for the current section.
  const refresh = () => loadAll(sectionId);

  // Initial load whenever the route's sectionId changes.
  useEffect(() => {
    loadAll(sectionId);
    // eslint‑disable-next-line react-hooks/exhaustive-deps – we want to run
    // only when sectionId changes, not on every render.
  }, [sectionId]);

  return (
    <AttendanceContext.Provider value={{ students, atRiskInfo, loading, refresh }}>
      {children}
    </AttendanceContext.Provider>
  );
};

/** Hook to consume the AttendanceContext. */
export const useAttendance = () => useContext(AttendanceContext);
