import 'server-only';
import { createHmac } from 'node:crypto';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/service';
import { readLookupHash } from '@/lib/parent-lookup';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Verify independently of the project's optional "require current password" flag.
// This client never changes the browser's Auth cookies.
export async function verifyParentPassword(userId: string, phone: string, password: string) {
  const verifier = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  const signed = await verifier.auth.signInWithPassword({ phone, password });
  if (signed.error || !signed.data.session) return false;
  const matches = signed.data.user?.id === userId && signed.data.user?.app_metadata?.role === 'parent';
  const closed = await verifier.auth.signOut({ scope: 'local' });
  return matches && !closed.error;
}

export function authAttemptKeys(request: Request, identity: string) {
  const key = process.env.AUTH_RATE_LIMIT_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('Missing authentication configuration');
  const source = process.env.VERCEL === '1' ? request.headers.get('x-vercel-forwarded-for')?.split(',')[0].trim() || 'unknown' : 'local';
  const digest = (value: string) => createHmac('sha256', key).update(value).digest('hex');
  return { p_source: digest('auth-source:' + source), p_identity: digest('auth-identity:' + identity) };
}
export async function parentSession() {
  const hash = await readLookupHash(); if (!hash) return null;
  const db = await createClient();
  const { data: { user }, error } = await db.auth.getUser();
  if (error || user?.app_metadata?.role !== 'parent') return null;
  const { data: claims, error: claimsError } = await db.auth.getClaims();
  const sessionId = claims?.claims?.session_id;
  if (claimsError || typeof sessionId !== 'string') return null;
  const result = await createAdminClient().rpc('parent_password_session_valid', { p_token_hash: hash, p_auth_uid: user.id, p_session_id: sessionId });
  if (result.error || result.data !== true) return null;
  return { db, user, hash, sessionId };
}
