import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { useParams } from 'react-router-dom';

const AttendanceContext = createContext();

export function AttendanceProvider({ children }) {
  const { apiFetch } = useAuth();
  const { sectionId } = useParams();
  const [students, setStudents] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]); // all records for term
  const [atRiskInfo, setAtRiskInfo] = useState([]);
  const [dateRange, setDateRange] = useState([]);
  const [loading, setLoading] = useState(true);

  // Helper to compute date range based on term dates
  const computeDateRange = (startStr, endStr) => {
    if (!startStr || !endStr) return [];
    const dates = [];
    const start = new Date(startStr);
    const end = new Date(endStr);
    const today = new Date();
    const actualEnd = end > today ? today : end;
    let cur = new Date(start);
    while (cur <= actualEnd) {
      const day = cur.getDay();
      if (day !== 0 && day !== 6) {
        dates.push(cur.toISOString().split('T')[0]);
      }
      cur.setDate(cur.getDate() + 1);
    }
    return dates;
  };

  const loadAll = async () => {
    // existing loadAll implementation
    if (!sectionId) return;
    setLoading(true);
    try {
      // 1. students in section
      const enrollments = await apiFetch(`/sis/enrollments?section_id=${sectionId}`);
      const studs = enrollments.map(e => e.student).filter(Boolean);
      setStudents(studs);
      console.log('Students loaded', studs.length);

      // 2. term info (includes dates)
      const sections = await apiFetch(`/sis/sections?id=${sectionId}`);
      console.log('Sections fetched', sections);
      const termRaw = sections[0]?.terms;
      const termData = Array.isArray(termRaw) ? termRaw[0] : termRaw || {};
      let dr = computeDateRange(termData.start_date, termData.end_date);
      console.log('Loaded term dates', termData.start_date, termData.end_date, 'computed dateRange', dr);
      // Fallback: if term dates missing, show recent 5 weekdays
      if (!dr || dr.length === 0) {
        const today = new Date();
        dr = [];
        let cur = new Date();
        // go back up to 10 days to collect 5 weekdays
        while (dr.length < 5 && cur >= new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000)) {
          const day = cur.getDay();
          if (day !== 0 && day !== 6) {
            dr.unshift(cur.toISOString().split('T')[0]);
          }
          cur.setDate(cur.getDate() - 1);
        }
      }
      setDateRange(dr);
      console.log('DateRange set', dr);

      // 3. attendance history for term
      const history = await apiFetch(`/sis/attendance?section_id=${sectionId}`);
      setAttendanceRecords(history);
      console.log('Attendance records loaded', history.length);

      // If dateRange still empty, derive from attendance records dates
      if (dr.length === 0 && history && history.length > 0) {
        const datesSet = new Set();
        history.forEach(r => {
          if (r.date) datesSet.add(r.date);
        });
        dr = Array.from(datesSet).sort();
        console.log('Derived dateRange from records', dr);
        setDateRange(dr);
      }

      // 4. at‑risk data (computed on‑fly)
      const risk = await apiFetch(`/sis/atrisk/${sectionId}`);
      setAtRiskInfo(risk);
    } catch (e) {
      console.error('Attendance load error', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionId]);

  const refresh = async () => {
    await loadAll();
  };

  // Record or update attendance for a specific date
  const recordAttendance = async (date, records) => {
    if (!sectionId) throw new Error('sectionId missing');
    try {
      await apiFetch('/attendance', {
        method: 'POST',
        body: JSON.stringify({ section_id: sectionId, date, records }),
      });
      // Reload data after successful save
      await loadAll();
    } catch (e) {
      console.error('Error recording attendance', e);
      throw e;
    }
  };

  return (
    <AttendanceContext.Provider value={{ students, attendanceRecords, atRiskInfo, dateRange, loading, refresh, recordAttendance }}>
      {children}
    </AttendanceContext.Provider>
  );
}

export function useAttendance() {
  return useContext(AttendanceContext);
}
