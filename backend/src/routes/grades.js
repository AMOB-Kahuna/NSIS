import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

// 1. Teacher/Admin View: Gradebook matrix for a Section
router.get('/section/:sectionId', requireAuth, requireRole(['teacher', 'admin']), async (req, res) => {
  const { sectionId } = req.params;

  try {
    // A. Fetch enrolled students
    const { data: enrollments, error: enrollError } = await supabaseAdmin
      .from('enrollments')
      .select(`
        student:student_id (
          id,
          profiles:profile_id (full_name, email)
        )
      `)
      .eq('section_id', sectionId);

    if (enrollError) throw enrollError;
    const students = enrollments.map(e => e.student).filter(Boolean);

    // B. Fetch subjects in this section
    const { data: subjects, error: subjError } = await supabaseAdmin
      .from('subjects')
      .select('*')
      .eq('section_id', sectionId);

    if (subjError) throw subjError;
    const subjectIds = subjects.map(s => s.id);

    if (subjectIds.length === 0) {
      return res.json({ students, subjects: [], assignments: [], quizzes: [], submissions: [], quizAttempts: [] });
    }

    // C. Fetch all assignments for these subjects
    const { data: assignments, error: assignError } = await supabaseAdmin
      .from('assignments')
      .select('*')
      .in('subject_id', subjectIds);

    if (assignError) throw assignError;
    const assignmentIds = assignments.map(a => a.id);

    // D. Fetch all quizzes for these subjects
    const { data: quizzes, error: quizError } = await supabaseAdmin
      .from('quizzes')
      .select('*')
      .in('subject_id', subjectIds);

    if (quizError) throw quizError;
    const quizIds = quizzes.map(q => q.id);

    // E. Fetch submissions for these assignments
    let submissions = [];
    if (assignmentIds.length > 0) {
      const { data: subData, error: subError } = await supabaseAdmin
        .from('submissions')
        .select('*')
        .in('assignment_id', assignmentIds);
      if (subError) throw subError;
      submissions = subData;
    }

    // F. Fetch quiz attempts for these quizzes
    let quizAttempts = [];
    if (quizIds.length > 0) {
      const { data: attData, error: attError } = await supabaseAdmin
        .from('quiz_attempts')
        .select('*')
        .in('quiz_id', quizIds);
      if (attError) throw attError;
      quizAttempts = attData;
    }

    res.json({
      students,
      subjects,
      assignments,
      quizzes,
      submissions,
      quizAttempts
    });
  } catch (err) {
    console.error('Error fetching section grades:', err);
    res.status(500).json({ error: err.message });
  }
});

// 2. Student View: Student's own grades
router.get('/student', requireAuth, requireRole(['student']), async (req, res) => {
  try {
    // A. Get Student Record
    const { data: student, error: studentError } = await supabaseAdmin
      .from('students')
      .select('id')
      .eq('profile_id', req.user.id)
      .single();

    if (studentError || !student) {
      return res.status(404).json({ error: 'Student record not found' });
    }

    // B. Get Sections Student is enrolled in
    const { data: enrollments, error: enrollError } = await supabaseAdmin
      .from('enrollments')
      .select('section_id')
      .eq('student_id', student.id);

    if (enrollError) throw enrollError;
    const sectionIds = enrollments.map(e => e.section_id);

    if (sectionIds.length === 0) {
      return res.json({ subjects: [] });
    }

    // C. Fetch all subjects in those sections
    const { data: subjects, error: subjError } = await supabaseAdmin
      .from('subjects')
      .select(`
        *,
        sections:section_id (name, terms:term_id (name))
      `)
      .in('section_id', sectionIds);

    if (subjError) throw subjError;
    const subjectIds = subjects.map(s => s.id);

    if (subjectIds.length === 0) {
      return res.json({ subjects: [] });
    }

    // D. Fetch all assignments & student submissions
    const { data: assignments, error: assignError } = await supabaseAdmin
      .from('assignments')
      .select('*')
      .in('subject_id', subjectIds);

    if (assignError) throw assignError;

    const { data: submissions, error: subError } = await supabaseAdmin
      .from('submissions')
      .select('*')
      .eq('student_id', student.id);

    if (subError) throw subError;

    // E. Fetch all quizzes & student attempts
    const { data: quizzes, error: quizError } = await supabaseAdmin
      .from('quizzes')
      .select('*')
      .in('subject_id', subjectIds);

    if (quizError) throw quizError;

    const { data: quizAttempts, error: attError } = await supabaseAdmin
      .from('quiz_attempts')
      .select('*')
      .eq('student_id', student.id);

    if (attError) throw attError;

    // F. Group by subject and calculate summaries
    const subjectGrades = subjects.map(subject => {
      const subjectAssignments = assignments.filter(a => a.subject_id === subject.id);
      const subjectQuizzes = quizzes.filter(q => q.subject_id === subject.id);

      // Map submissions
      const scoredSubmissions = subjectAssignments.map(assign => {
        const sub = submissions.find(s => s.assignment_id === assign.id);
        return {
          assignment_id: assign.id,
          title: assign.title,
          max_points: assign.max_points,
          score: sub ? sub.score : null,
          status: sub ? sub.status : 'missing',
          submitted_at: sub ? sub.submitted_at : null
        };
      });

      // Map quiz attempts
      const scoredQuizAttempts = subjectQuizzes.map(quiz => {
        const attempt = quizAttempts.find(qa => qa.quiz_id === quiz.id);
        return {
          quiz_id: quiz.id,
          title: quiz.title,
          max_score: attempt ? attempt.max_score : (quiz.max_score || 0),
          score: attempt ? attempt.score : null,
          status: attempt ? 'completed' : 'unattempted',
          completed_at: attempt ? attempt.completed_at : null
        };
      });

      // Compute Averages
      const assignmentScores = scoredSubmissions.filter(s => s.score !== null).map(s => (s.score / s.max_points) * 100);
      const assignmentAvg = assignmentScores.length > 0 ? assignmentScores.reduce((a, b) => a + b, 0) / assignmentScores.length : null;

      const quizScores = scoredQuizAttempts.filter(q => q.score !== null).map(q => q.max_score > 0 ? (q.score / q.max_score) * 100 : 0);
      const quizAvg = quizScores.length > 0 ? quizScores.reduce((a, b) => a + b, 0) / quizScores.length : null;

      return {
        id: subject.id,
        name: subject.name,
        sectionName: subject.sections?.name,
        termName: subject.sections?.terms?.name,
        assignments: scoredSubmissions,
        quizzes: scoredQuizAttempts,
        assignmentAverage: assignmentAvg,
        quizAverage: quizAvg
      };
    });

    res.json(subjectGrades);
  } catch (err) {
    console.error('Error fetching student grades:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
