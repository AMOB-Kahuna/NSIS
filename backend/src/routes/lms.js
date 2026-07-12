import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

// ==========================================
// 1. Subjects
// ==========================================
router.get('/subjects', requireAuth, async (req, res) => {
  const { section_id } = req.query;
  try {
    let query = supabaseAdmin.from('subjects').select(`
      *,
      teacher:teacher_id (full_name, email)
    `);

    if (section_id) {
      query = query.eq('section_id', section_id);
    } else {
      // If student, find subjects in their enrolled sections
      if (req.user.role === 'student') {
        const { data: student } = await supabaseAdmin
          .from('students')
          .select('id')
          .eq('profile_id', req.user.id)
          .single();

        if (student) {
          const { data: enrolls } = await supabaseAdmin
            .from('enrollments')
            .select('section_id')
            .eq('student_id', student.id);
          
          const sectionIds = enrolls ? enrolls.map(e => e.section_id) : [];
          query = query.in('section_id', sectionIds);
        }
      } else if (req.user.role === 'teacher') {
        // Teachers see subjects they teach
        query = query.eq('teacher_id', req.user.id);
      }
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/subjects', requireAuth, requireRole(['admin']), async (req, res) => {
  const { section_id, name, teacher_id } = req.body;
  if (!section_id || !name) {
    return res.status(400).json({ error: 'section_id and name are required' });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('subjects')
      .insert({ section_id, name, teacher_id })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 2. Lessons
// ==========================================
router.get('/lessons', requireAuth, async (req, res) => {
  const { subject_id } = req.query;
  if (!subject_id) return res.status(400).json({ error: 'subject_id is required' });

  try {
    const { data, error } = await supabaseAdmin
      .from('lessons')
      .select('*')
      .eq('subject_id', subject_id)
      .order('created_at', { ascending: true });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/lessons', requireAuth, requireRole(['teacher', 'admin']), async (req, res) => {
  const { subject_id, title, content, file_url } = req.body;
  if (!subject_id || !title) {
    return res.status(400).json({ error: 'subject_id and title are required' });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('lessons')
      .insert({ subject_id, title, content, file_url })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 3. Assignments & Submissions
// ==========================================
router.get('/assignments', requireAuth, async (req, res) => {
  const { subject_id } = req.query;
  if (!subject_id) return res.status(400).json({ error: 'subject_id is required' });

  try {
    const { data, error } = await supabaseAdmin
      .from('assignments')
      .select('*')
      .eq('subject_id', subject_id)
      .order('due_date', { ascending: true });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/assignments', requireAuth, requireRole(['teacher', 'admin']), async (req, res) => {
  const { subject_id, title, description, max_points, due_date } = req.body;
  if (!subject_id || !title || !due_date) {
    return res.status(400).json({ error: 'subject_id, title, and due_date are required' });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('assignments')
      .insert({ subject_id, title, description, max_points: max_points || 100, due_date })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET submissions
router.get('/submissions', requireAuth, async (req, res) => {
  const { assignment_id, student_id } = req.query;
  try {
    let query = supabaseAdmin.from('submissions').select(`
      *,
      student:student_id (
        id,
        profiles:profile_id (full_name, email)
      )
    `);

    if (assignment_id) {
      query = query.eq('assignment_id', assignment_id);
    }
    if (student_id) {
      query = query.eq('student_id', student_id);
    }

    // Security constraints (Student can only see their own)
    if (req.user.role === 'student') {
      const { data: student } = await supabaseAdmin
        .from('students')
        .select('id')
        .eq('profile_id', req.user.id)
        .single();
      if (!student) return res.status(403).json({ error: 'Student profile not found' });
      query = query.eq('student_id', student.id);
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Submit assignment (Student only)
router.post('/submissions', requireAuth, requireRole(['student']), async (req, res) => {
  const { assignment_id, content, file_url } = req.body;
  if (!assignment_id) return res.status(400).json({ error: 'assignment_id is required' });

  try {
    // Get student ID
    const { data: student, error: sErr } = await supabaseAdmin
      .from('students')
      .select('id')
      .eq('profile_id', req.user.id)
      .single();

    if (sErr || !student) return res.status(400).json({ error: 'Student record not found' });

    const { data, error } = await supabaseAdmin
      .from('submissions')
      .upsert({
        assignment_id,
        student_id: student.id,
        content,
        file_url,
        status: 'submitted',
        submitted_at: new Date().toISOString()
      }, { onConflict: 'assignment_id,student_id' })
      .select()
      .single();

    if (error) throw error;

    // Log engagement event
    await supabaseAdmin.from('analytics_events').insert({
      user_id: req.user.id,
      event_type: 'assignment_submitted',
      details: { assignment_id, submission_id: data.id }
    });

    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Grade submission (Teacher/Admin only)
router.put('/submissions/:id/grade', requireAuth, requireRole(['teacher', 'admin']), async (req, res) => {
  const { id } = req.params;
  const { score } = req.body;

  if (score === undefined || score === null) {
    return res.status(400).json({ error: 'score is required' });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('submissions')
      .update({
        score,
        graded_by: req.user.id,
        graded_at: new Date().toISOString(),
        status: 'graded'
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 4. Quizzes, Questions & Attempts
// ==========================================
router.get('/quizzes', requireAuth, async (req, res) => {
  const { subject_id } = req.query;
  if (!subject_id) return res.status(400).json({ error: 'subject_id is required' });

  try {
    const { data, error } = await supabaseAdmin
      .from('quizzes')
      .select('*')
      .eq('subject_id', subject_id)
      .order('due_date', { ascending: true });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/quizzes', requireAuth, requireRole(['teacher', 'admin']), async (req, res) => {
  const { subject_id, title, description, due_date, questions } = req.body;
  // questions: [ { question_text, question_type, points, options, correct_answer, topic } ]

  if (!subject_id || !title || !due_date) {
    return res.status(400).json({ error: 'subject_id, title, and due_date are required' });
  }

  try {
    // 1. Create Quiz
    const { data: quiz, error: quizError } = await supabaseAdmin
      .from('quizzes')
      .insert({ subject_id, title, description, due_date })
      .select()
      .single();

    if (quizError) throw quizError;

    // 2. Insert Questions if any
    if (questions && Array.isArray(questions) && questions.length > 0) {
      const questionsWithQuizId = questions.map(q => ({
        quiz_id: quiz.id,
        question_text: q.question_text,
        question_type: q.question_type,
        points: q.points || 1,
        options: q.options,
        correct_answer: q.correct_answer,
        topic: q.topic || 'General'
      }));

      const { error: questError } = await supabaseAdmin
        .from('questions')
        .insert(questionsWithQuizId);

      if (questError) {
        // Rollback quiz
        await supabaseAdmin.from('quizzes').delete().eq('id', quiz.id);
        throw questError;
      }
    }

    res.status(201).json(quiz);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET Quiz Questions (safe endpoint)
router.get('/quizzes/:id/questions', requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const { data: questions, error } = await supabaseAdmin
      .from('questions')
      .select('*')
      .eq('quiz_id', id);

    if (error) throw error;

    // Scrub correct answers if student
    if (req.user.role === 'student') {
      const scrubbed = questions.map(q => {
        const { correct_answer, ...rest } = q;
        return rest;
      });
      return res.json(scrubbed);
    }

    res.json(questions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Take Quiz / Submit Attempt (Student only)
router.post('/quizzes/:id/attempt', requireAuth, requireRole(['student']), async (req, res) => {
  const quizId = req.params.id;
  const { answers } = req.body; // Map: { [questionId]: "student answer string" }

  if (!answers) {
    return res.status(400).json({ error: 'answers object is required' });
  }

  try {
    // 1. Get student ID
    const { data: student, error: sErr } = await supabaseAdmin
      .from('students')
      .select('id')
      .eq('profile_id', req.user.id)
      .single();

    if (sErr || !student) return res.status(400).json({ error: 'Student record not found' });

    // Check if student already attempted this quiz
    const { data: existingAttempt } = await supabaseAdmin
      .from('quiz_attempts')
      .select('id')
      .eq('quiz_id', quizId)
      .eq('student_id', student.id)
      .single();

    if (existingAttempt) {
      return res.status(400).json({ error: 'Quiz already attempted.' });
    }

    // 2. Fetch full questions with correct answers
    const { data: questions, error: qErr } = await supabaseAdmin
      .from('questions')
      .select('*')
      .eq('quiz_id', quizId);

    if (qErr || !questions || questions.length === 0) {
      return res.status(404).json({ error: 'Questions not found for this quiz' });
    }

    // 3. Compute score server-side
    let totalScore = 0;
    let maxScore = 0;
    const recordedAnswers = [];

    for (const question of questions) {
      maxScore += question.points;
      const studentAns = answers[question.id] || '';
      
      // Compare case-insensitive & trimmed text
      const isCorrect = studentAns.trim().toLowerCase() === question.correct_answer.trim().toLowerCase();
      const pointsEarned = isCorrect ? question.points : 0;
      totalScore += pointsEarned;

      recordedAnswers.push({
        question_id: question.id,
        student_answer: studentAns,
        is_correct: isCorrect,
        points_earned: pointsEarned
      });
    }

    // 4. Insert Quiz Attempt
    const { data: attempt, error: attemptError } = await supabaseAdmin
      .from('quiz_attempts')
      .insert({
        quiz_id: quizId,
        student_id: student.id,
        score: totalScore,
        max_score: maxScore,
        completed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (attemptError) throw attemptError;

    // 5. Insert answers details
    const answersWithAttemptId = recordedAnswers.map(ans => ({
      quiz_attempt_id: attempt.id,
      ...ans
    }));

    const { error: ansError } = await supabaseAdmin
      .from('quiz_answers')
      .insert(answersWithAttemptId);

    if (ansError) {
      // Cleanup attempt on answers write failure
      await supabaseAdmin.from('quiz_attempts').delete().eq('id', attempt.id);
      throw ansError;
    }

    // 6. Log engagement event
    await supabaseAdmin.from('analytics_events').insert({
      user_id: req.user.id,
      event_type: 'quiz_attempted',
      details: { quiz_id: quizId, attempt_id: attempt.id, score: totalScore, max_score: maxScore }
    });

    res.status(201).json({
      message: 'Quiz submitted and graded successfully',
      attempt: {
        id: attempt.id,
        score: totalScore,
        max_score: maxScore,
        percentage: maxScore > 0 ? (totalScore / maxScore) * 100 : 0
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET Quiz attempts
router.get('/attempts', requireAuth, async (req, res) => {
  const { quiz_id } = req.query;
  if (!quiz_id) return res.status(400).json({ error: 'quiz_id is required' });

  try {
    let query = supabaseAdmin.from('quiz_attempts').select(`
      *,
      student:student_id (
        id,
        profiles:profile_id (full_name, email)
      )
    `).eq('quiz_id', quiz_id);

    // If student, filter own attempt
    if (req.user.role === 'student') {
      const { data: student } = await supabaseAdmin
        .from('students')
        .select('id')
        .eq('profile_id', req.user.id)
        .single();
      
      if (student) {
        query = query.eq('student_id', student.id);
      }
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
