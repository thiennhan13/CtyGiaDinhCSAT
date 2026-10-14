import 'server-only';
import { createAdminClient } from '@/lib/supabase/service';
import { readLookupHash } from '@/lib/parent-lookup';

// Cookie possession is not proof of phone ownership. Check current access in DB.
export async function parentSession() {
  const hash = await readLookupHash();
  if (!hash) return null;
  const result = await createAdminClient().rpc('parent_phone_session_valid', { p_token_hash: hash });
  if (result.error || result.data !== true) return null;
  return { hash };
}
