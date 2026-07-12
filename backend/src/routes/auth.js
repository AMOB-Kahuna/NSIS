import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

// Get current user information & role
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// Admin-only registration endpoint
router.post('/register', requireAuth, requireRole(['admin']), async (req, res) => {
  const { email, password, fullName, role, schoolId } = req.body;

  if (!email || !password || !fullName || !role) {
    return res.status(400).json({ error: 'Missing required fields: email, password, fullName, role' });
  }

  if (!['admin', 'teacher', 'student'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role. Must be admin, teacher, or student' });
  }

  try {
    // 1. Create auth user via admin client (auto-confirm email to simplify MVP)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (authError || !authData.user) {
      return res.status(400).json({ error: authError?.message || 'Failed to create auth user' });
    }

    const userId = authData.user.id;

    // 2. Create entry in profiles
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: userId,
        email,
        full_name: fullName,
        role,
        school_id: schoolId || req.user.school_id // Use admin's school if not specified
      })
      .select()
      .single();

    if (profileError) {
      // Cleanup auth user on profile failure
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return res.status(400).json({ error: profileError.message });
    }

    // 3. If role is student, create entry in public.students
    if (role === 'student') {
      const { error: studentError } = await supabaseAdmin
        .from('students')
        .insert({
          profile_id: userId,
          school_id: schoolId || req.user.school_id
        });

      if (studentError) {
        // Rollback
        await supabaseAdmin.from('profiles').delete().eq('id', userId);
        await supabaseAdmin.auth.admin.deleteUser(userId);
        return res.status(400).json({ error: studentError.message });
      }
    }

    res.status(201).json({
      message: `User ${fullName} (${role}) registered successfully.`,
      user: profileData
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal Server Error during user registration' });
  }
});

export default router;
