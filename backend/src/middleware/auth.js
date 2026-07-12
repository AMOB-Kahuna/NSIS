import { supabase, supabaseAdmin } from '../config/supabase.js';

export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization header missing or invalid' });
    }

    const token = authHeader.split(' ')[1];
    
    // Verify token with Supabase Auth
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    // Retrieve user's role and details from profiles, joining school name
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*, school:school_id(name)')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return res.status(403).json({ error: 'Forbidden: Profile not found' });
    }

    // Attach user profile info to request
    req.user = {
      id: user.id,
      email: user.email,
      role: profile.role,
      school_id: profile.school_id,
      school_name: profile.school?.name || null,
      full_name: profile.full_name
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Internal Server Error during authentication' });
  }
};

export const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: `Forbidden: Requires one of roles: [${allowedRoles.join(', ')}]` });
    }
    
    next();
  };
};
