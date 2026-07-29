import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

// ==========================================
// 1. Schools
// ==========================================
router.get('/schools', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('schools')
      .select('*')
      .or(`id.eq.${req.user.school_id || '00000000-0000-0000-0000-000000000000'}`);
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/schools', requireAuth, requireRole(['admin']), async (req, res) => {
  const { name, address } = req.body;
  if (!name) return res.status(400).json({ error: 'School name is required' });

  try {
    const { data, error } = await supabaseAdmin
      .from('schools')
      .insert({ name, address })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/schools', requireAuth, requireRole(['admin']), async (req, res) => {
  const schoolId = req.query.school_id || req.user.school_id;
  const { name, address } = req.body;
  if (!name) return res.status(400).json({ error: 'School name is required' });
  
  try {
    const { data, error } = await supabaseAdmin
      .from('schools')
      .update({ name, address })
      .eq('id', schoolId)
      .select();

    if (error) {
      return res.status(status || 400).json({ error: error.message });
    }

    // If no rows were updated, the ID didn't exist
    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Record not found.' });
    }

    // Success response
    return res.status(200).json(data);

  } catch (err) {
    // Catch-all for unexpected server/network errors
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 2. Terms
// ==========================================
router.get('/terms', requireAuth, async (req, res) => {
  const schoolId = req.query.school_id || req.user.school_id;
  try {
    const { data, error } = await supabaseAdmin
      .from('terms')
      .select('*')
      .eq('school_id', schoolId)
      .order('start_date', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/terms', requireAuth, requireRole(['admin']), async (req, res) => {
  const { name, start_date, end_date, school_id } = req.body;
  const sId = school_id || req.user.school_id;

  if (!name || !start_date || !end_date) {
    return res.status(400).json({ error: 'Name, start_date, and end_date are required' });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('terms')
      .insert({ school_id: sId, name, start_date, end_date })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 3. Sections
// ==========================================
router.get('/sections', requireAuth, async (req, res) => {
  const { term_id, id } = req.query;
  try {
    let query = supabaseAdmin.from('sections').select(`
      *,
      terms:term_id (name, school_id, start_date, end_date)
    `);

    if (id) {
      query = query.eq('id', id);
    } else if (term_id) {
      query = query.eq('term_id', term_id);
    } else {
      // Find sections linked to terms of the current user's school
      const schoolId = req.user.school_id;
      const { data: terms } = await supabaseAdmin.from('terms').select('id').eq('school_id', schoolId);
      const termIds = terms ? terms.map(t => t.id) : [];
      query = query.in('term_id', termIds);
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/sections', requireAuth, requireRole(['admin']), async (req, res) => {
  const { term_id, name, room } = req.body;
  if (!term_id || !name) {
    return res.status(400).json({ error: 'term_id and name are required' });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('sections')
      .insert({ term_id, name, room })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 4. Students
// ==========================================
router.get('/students', requireAuth, requireRole(['admin', 'teacher']), async (req, res) => {
  const schoolId = req.user.school_id;
  try {
    const { data, error } = await supabaseAdmin
      .from('students')
      .select(`
        id,
        school_id,
        created_at,
        profiles:profile_id (email, full_name, role)
      `)
      .eq('school_id', schoolId);

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/students', requireAuth, requireRole(['admin', 'teacher']), async (req, res) => {
  const { email, fullname, password, section_id } = req.body;
  const schoolId = req.user.school_id;
  const results = { succeeded: [], failed: [] };

  console.log(req.body)

  
  if (!email || !fullname || !password) {
    results.failed.push({ error: 'Missing email, fullName, or password' });
  }

  try {
    // 1. Create Auth User
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (authError || !authData.user) {
      results.failed.push({ error: authError?.message || 'Failed to create auth user' });
      console.log(results)
      return;
    }

    const userId = authData.user.id;

    // 2. Insert Profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: userId,
        email,
        full_name: fullname,
        role: 'student',
        school_id: schoolId
      });

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      results.failed.push({ error: profileError.message });
      console.log(results)
      return;
    }

    // 3. Insert Student
    const { data: studData, error: studentError } = await supabaseAdmin
      .from('students')
      .insert({
        profile_id: userId,
        school_id: schoolId
      })
      .select()
      .single();

    if (studentError) {
      await supabaseAdmin.from('profiles').delete().eq('id', userId);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      results.failed.push({ error: studentError.message });
      console.log(results)
      return;
    }

    // 4. Enroll in section if section_id is provided
    if (section_id && studData) {
      const { error: enrollError } = await supabaseAdmin
        .from('enrollments')
        .insert({
          student_id: studData.id,
          section_id
        });

      if (enrollError) {
        // Non-blocking but log it
        results.succeeded.push({ email, fullname, userId, studentId: studData.id, enrollmentWarning: enrollError.message });
        console.log(results)
        return;
      }
    }

    results.succeeded.push({ email, fullname, userId, studentId: studData.id });
    console.log(results)
  } catch (err) {
    results.failed.push({ error: err.message });
    return;
  }

  return res.status(207).json(results);
});

// Bulk Import Students (CSV or JSON)
router.post('/students/bulk', requireAuth, requireRole(['admin']), async (req, res) => {
  const { csv, students, section_id } = req.body;
  const schoolId = req.user.school_id;

  let studentsList = [];

  if (csv) {
    // Basic CSV parsing
    const lines = csv.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length < 2) {
      return res.status(400).json({ error: 'CSV lacks data. Headers should be: email,fullName,password' });
    }
    
    // Check headers mapping
    const headers = lines[0].split(',').map(h => h.trim());
    
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim());
      if (cols.length >= 3) {
        studentsList.push({
          email: cols[0],
          fullName: cols[1],
          password: cols[2]
        });
      }
    }
  } else if (students && Array.isArray(students)) {
    studentsList = students;
  }

  if (studentsList.length === 0) {
    return res.status(400).json({ error: 'No student data provided. Provide either csv string or students array.' });
  }

  const results = { succeeded: [], failed: [] };

  for (const student of studentsList) {
    const { email, fullName, password } = student;
    if (!email || !fullName || !password) {
      results.failed.push({ student, error: 'Missing email, fullName, or password' });
      continue;
    }

    try {
      // 1. Create Auth User
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      });

      if (authError || !authData.user) {
        results.failed.push({ student, error: authError?.message || 'Failed to create auth user' });
        continue;
      }

      const userId = authData.user.id;

      // 2. Insert Profile
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: userId,
          email,
          full_name: fullName,
          role: 'student',
          school_id: schoolId
        });

      if (profileError) {
        await supabaseAdmin.auth.admin.deleteUser(userId);
        results.failed.push({ student, error: profileError.message });
        continue;
      }

      // 3. Insert Student
      const { data: studData, error: studentError } = await supabaseAdmin
        .from('students')
        .insert({
          profile_id: userId,
          school_id: schoolId
        })
        .select()
        .single();

      if (studentError) {
        await supabaseAdmin.from('profiles').delete().eq('id', userId);
        await supabaseAdmin.auth.admin.deleteUser(userId);
        results.failed.push({ student, error: studentError.message });
        continue;
      }

      // 4. Enroll in section if section_id is provided
      if (section_id && studData) {
        const { error: enrollError } = await supabaseAdmin
          .from('enrollments')
          .insert({
            student_id: studData.id,
            section_id
          });

        if (enrollError) {
          // Non-blocking but log it
          results.succeeded.push({ email, fullName, userId, studentId: studData.id, enrollmentWarning: enrollError.message });
          continue;
        }
      }

      results.succeeded.push({ email, fullName, userId, studentId: studData.id });
    } catch (err) {
      results.failed.push({ student, error: err.message });
    }
  }

  res.status(207).json(results);
});

// ==========================================
// 5. Enrollments
// ==========================================
router.get('/enrollments', requireAuth, requireRole(['admin', 'teacher']), async (req, res) => {
  const { section_id } = req.query;
  if (!section_id) return res.status(400).json({ error: 'section_id is required' });

  try {
    const { data, error } = await supabaseAdmin
      .from('enrollments')
      .select(`
        id,
        enrolled_at,
        student:student_id (
          id,
          profiles:profile_id (email, full_name)
        )
      `)
      .eq('section_id', section_id);

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/enrollments', requireAuth, requireRole(['admin']), async (req, res) => {
  const { student_id, section_id } = req.body;
  if (!student_id || !section_id) {
    return res.status(400).json({ error: 'student_id and section_id are required' });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('enrollments')
      .insert({ student_id, section_id })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 6. Attendance
// ==========================================
router.get('/attendance', requireAuth, async (req, res) => {
  const { section_id, date } = req.query;
  if (!section_id) return res.status(400).json({ error: 'section_id is required' });

  try {
    let query = supabaseAdmin
      .from('attendance')
      .select('*')
      .eq('section_id', section_id);

    if (date) {
      query = query.eq('date', date);
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/attendance', requireAuth, requireRole(['teacher', 'admin']), async (req, res) => {
  const { section_id, date, records } = req.body;
  // records: [ { student_id: 'uuid', status: 'present' | 'absent' | 'tardy' | 'excused' } ]

  if (!section_id || !date || !records || !Array.isArray(records)) {
    return res.status(400).json({ error: 'section_id, date, and records (array) are required' });
  }

  try {
    const upserts = records.map(rec => ({
      section_id,
      student_id: rec.student_id,
      date,
      status: rec.status,
      recorded_by: req.user.id
    }));

    const { data, error } = await supabaseAdmin
      .from('attendance')
      .upsert(upserts, { onConflict: 'student_id,date' })
      .select();

    if (error) throw error;
    res.json({ message: 'Attendance records updated successfully', count: data.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
