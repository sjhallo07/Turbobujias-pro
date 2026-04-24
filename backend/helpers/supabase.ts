/**
 * Supabase Client Configuration
 * Backend initialization with service role for admin operations
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('⚠️  Missing Supabase environment variables');
}

/**
 * Admin client (service role)
 * Use for server-side operations, admin functions, RLS bypass
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

/**
 * Anonymous client (anon key)
 * Use for public operations, mimics browser behavior
 */
export const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false },
});

/**
 * User client (requires JWT token)
 * Create with user's session JWT for RLS enforcement
 */
export function createUserClient(userJWT: string) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${userJWT}`,
      },
    },
  });
}

export default supabaseAdmin;
