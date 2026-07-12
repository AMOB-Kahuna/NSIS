import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

// 1. Log engagement events (material_opened, etc.)
router.post('/log', requireAuth, async (req, res) => {
  const { event_type, details } = req.body;
  if (!event_type) return res.status(400).json({ error: 'event_type is required' });

  try {
    const { data, error } = await supabaseAdmin
      .from('analytics_events')
      .insert({
        user_id: req.user.id,
        event_type,
        details
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper: Calculate at-risk criteria for a student
async function getStudentAtRiskStatus(studentId, schoolId) {
  // A. Get student details & creation date
  const { data: student, error: studErr } = await supabaseAdmin
    .from('students')
    .select(`
      id,
      created_at,
      profiles:profile_id (full_name, email)
    `)
    .eq('id', studentId)
    .single();

  if (studErr || !student) return null;

  // B. Attendance Rate
  const { data: attendance } = await supabaseAdmin
    .from('attendance')
    .select('status')
    .eq('student_id', studentId);

  let attendanceRate = 1.00; // default 100%
  let totalAttendanceDays = attendance?.length || 0;
  if (totalAttendanceDays > 0) {
    const activeDays = attendance.filter(a => ['present', 'tardy'].includes(a.status)).length;
    attendanceRate = activeDays / totalAttendanceDays;
  }

  // C. Quiz Average
  const { data: attempts } = await supabaseAdmin
    .from('quiz_attempts')
    .select('score, max_score')
    .eq('student_id', studentId);

  let quizAverage = 1.00; // default 100%
  let totalAttempts = attempts?.length || 0;
  if (totalAttempts > 0) {
    let totalScore = 0;
    let totalMaxScore = 0;
    attempts.forEach(att => {
      totalScore += Number(att.score);
      totalMaxScore += Number(att.max_score);
    });
    quizAverage = totalMaxScore > 0 ? totalScore / totalMaxScore : 1.00;
  } else {
    // Check if quizzes exist for their subjects
    // If they exist and student has 0 attempts, then they are failing quizzes (average = 0)
    const { data: enrolls } = await supabaseAdmin.from('enrollments').select('section_id').eq('student_id', studentId);
    const secIds = enrolls?.map(e => e.section_id) || [];
    
    if (secIds.length > 0) {
      const { data: subjects } = await supabaseAdmin.from('subjects').select('id').in('section_id', secIds);
      const subjIds = subjects?.map(s => s.id) || [];
      if (subjIds.length > 0) {
        const { count: quizCount } = await supabaseAdmin
          .from('quizzes')
          .select('*', { count: 'exact', head: true })
          .in('subject_id', subjIds);
        if (quizCount && quizCount > 0) {
          quizAverage = 0.00; // 0 attempts but quizzes exist means 0 average score
        }
      }
    }
  }

  // D. No submissions in last 14 days
  // Fetch latest submission date
  const { data: lastSub } = await supabaseAdmin
    .from('submissions')
    .select('submitted_at')
    .eq('student_id', studentId)
    .order('submitted_at', { ascending: false })
    .limit(1);

  // Fetch latest quiz attempt date
  const { data: lastQuiz } = await supabaseAdmin
    .from('quiz_attempts')
    .select('completed_at')
    .eq('student_id', studentId)
    .order('completed_at', { ascending: false })
    .limit(1);

  const dates = [];
  if (lastSub && lastSub.length > 0) dates.push(new Date(lastSub[0].submitted_at));
  if (lastQuiz && lastQuiz.length > 0) dates.push(new Date(lastQuiz[0].completed_at));

  let lastActivityDate = null;
  if (dates.length > 0) {
    lastActivityDate = new Date(Math.max(...dates));
  } else {
    // If no activity, use student profile creation date
    lastActivityDate = new Date(student.created_at);
  }

  const daysSinceLastActivity = (new Date() - lastActivityDate) / (1000 * 60 * 60 * 24);
  const noSubmissions14Days = daysSinceLastActivity > 14;

  // E. Check rules:
  // 1) (attendance < 70%) AND (last quiz avg < 50%)
  // 2) OR (no submissions for 14 days)
  const isLowAttendanceAndQuiz = (attendanceRate < 0.70) && (quizAverage < 0.50);
  const isAtRisk = isLowAttendanceAndQuiz || noSubmissions14Days;

  const reasons = [];
  if (isLowAttendanceAndQuiz) {
    reasons.push(`Low Attendance (${Math.round(attendanceRate * 100)}%) & Low Quizzes (${Math.round(quizAverage * 100)}%)`);
  }
  if (noSubmissions14Days) {
    reasons.push(`No submissions for ${Math.round(daysSinceLastActivity)} days`);
  }

  return {
    student_id: studentId,
    fullName: student.profiles?.full_name,
    email: student.profiles?.email,
    attendanceRate,
    quizAverage,
    daysSinceLastActivity: Math.round(daysSinceLastActivity),
    isAtRisk,
    reasons
  };
}

// 2. Teacher View: Section Analytics
router.get('/teacher/:sectionId', requireAuth, requireRole(['teacher', 'admin']), async (req, res) => {
  const { sectionId } = req.params;

  try {
    // A. Fetch enrolled students
    const { data: enrollments, error: enrollError } = await supabaseAdmin
      .from('enrollments')
      .select('student_id')
      .eq('section_id', sectionId);

    if (enrollError) throw enrollError;
    const studentIds = enrollments.map(e => e.student_id);

    // B. Fetch subjects in this section
    const { data: subjects } = await supabaseAdmin
      .from('subjects')
      .select('id, name')
      .eq('section_id', sectionId);

    const subjectIds = subjects?.map(s => s.id) || [];

    if (studentIds.length === 0) {
      return res.json({
        totalStudents: 0,
        sectionAttendanceRate: 100,
        quizAverage: 100,
        submissionRate: 100,
        atRiskStudents: [],
        subjectPerformances: []
      });
    }

    // C. Overall Section Attendance Rate
    const { data: attendance } = await supabaseAdmin
      .from('attendance')
      .select('status')
      .eq('section_id', sectionId);

    let sectionAttendanceRate = 100;
    if (attendance && attendance.length > 0) {
      const active = attendance.filter(a => ['present', 'tardy'].includes(a.status)).length;
      sectionAttendanceRate = Math.round((active / attendance.length) * 100);
    }

    // D. Fetch all student at-risk statuses
    const atRiskStudents = [];
    for (const sId of studentIds) {
      const status = await getStudentAtRiskStatus(sId, req.user.school_id);
      if (status && status.isAtRisk) {
        atRiskStudents.push(status);
      }
    }

    // E. Subject performances
    const subjectPerformances = [];
    let overallQuizAvg = 0;
    let quizAvgCount = 0;
    let overallSubRate = 0;
    let subRateCount = 0;

    for (const subj of subjects) {
      // Get all assignments for subject
      const { data: assigns } = await supabaseAdmin.from('assignments').select('id').eq('subject_id', subj.id);
      const assignIds = assigns?.map(a => a.id) || [];

      // Get all quizzes for subject
      const { data: quizzes } = await supabaseAdmin.from('quizzes').select('id').eq('subject_id', subj.id);
      const quizIds = quizzes?.map(q => q.id) || [];

      let subjSubRate = 100;
      if (assignIds.length > 0 && studentIds.length > 0) {
        const { count: submissionCount } = await supabaseAdmin
          .from('submissions')
          .select('*', { count: 'exact', head: true })
          .in('assignment_id', assignIds)
          .in('student_id', studentIds);

        const totalExpected = assignIds.length * studentIds.length;
        subjSubRate = Math.round((submissionCount / totalExpected) * 100);
        overallSubRate += subjSubRate;
        subRateCount++;
      }

      let subjQuizAvg = 100;
      if (quizIds.length > 0 && studentIds.length > 0) {
        const { data: qAttempts } = await supabaseAdmin
          .from('quiz_attempts')
          .select('score, max_score')
          .in('quiz_id', quizIds)
          .in('student_id', studentIds);

        if (qAttempts && qAttempts.length > 0) {
          let sumScore = 0;
          let sumMax = 0;
          qAttempts.forEach(qa => {
            sumScore += Number(qa.score);
            sumMax += Number(qa.max_score);
          });
          subjQuizAvg = sumMax > 0 ? Math.round((sumScore / sumMax) * 100) : 100;
          overallQuizAvg += subjQuizAvg;
          quizAvgCount++;
        }
      }

      subjectPerformances.push({
        subject_id: subj.id,
        name: subj.name,
        submissionRate: subjSubRate,
        quizAverage: subjQuizAvg
      });
    }

    res.json({
      totalStudents: studentIds.length,
      sectionAttendanceRate,
      quizAverage: quizAvgCount > 0 ? Math.round(overallQuizAvg / quizAvgCount) : 100,
      submissionRate: subRateCount > 0 ? Math.round(overallSubRate / subRateCount) : 100,
      atRiskStudents,
      subjectPerformances
    });
  } catch (err) {
    console.error('Error generating section analytics:', err);
    res.status(500).json({ error: err.message });
  }
});

// 3. Student View: Student Personal Analytics
router.get('/student', requireAuth, requireRole(['student']), async (req, res) => {
  try {
    const { data: student, error: sErr } = await supabaseAdmin
      .from('students')
      .select('id')
      .eq('profile_id', req.user.id)
      .single();

    if (sErr || !student) return res.status(404).json({ error: 'Student record not found' });

    const status = await getStudentAtRiskStatus(student.id, req.user.school_id);
    if (!status) return res.status(500).json({ error: 'Failed to compute student analytics' });

    // Count submissions vs assigned assignments
    const { data: enrollments } = await supabaseAdmin.from('enrollments').select('section_id').eq('student_id', student.id);
    const secIds = enrollments?.map(e => e.section_id) || [];

    let totalAssignments = 0;
    let totalSubmissions = 0;

    if (secIds.length > 0) {
      const { data: subjects } = await supabaseAdmin.from('subjects').select('id').in('section_id', secIds);
      const subjIds = subjects?.map(s => s.id) || [];

      if (subjIds.length > 0) {
        const { count: assignCount } = await supabaseAdmin
          .from('assignments')
          .select('*', { count: 'exact', head: true })
          .in('subject_id', subjIds);
        
        totalAssignments = assignCount || 0;

        const { count: subCount } = await supabaseAdmin
          .from('submissions')
          .select('*', { count: 'exact', head: true })
          .eq('student_id', student.id);

        totalSubmissions = subCount || 0;
      }
    }

    res.json({
      student_id: student.id,
      attendanceRate: Math.round(status.attendanceRate * 100),
      quizAverage: Math.round(status.quizAverage * 100),
      assignmentSubmissionRate: totalAssignments > 0 ? Math.round((totalSubmissions / totalAssignments) * 100) : 100,
      daysSinceLastActivity: status.daysSinceLastActivity,
      isAtRisk: status.isAtRisk,
      reasons: status.reasons
    });
  } catch (err) {
    console.error('Error fetching student analytics:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
