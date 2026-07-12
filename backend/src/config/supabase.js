import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  console.error('Warning: SUPABASE_URL is missing in environment variables.');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

export const supabaseAdmin = createClient(supabaseUrl || '', supabaseServiceKey || '', {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
