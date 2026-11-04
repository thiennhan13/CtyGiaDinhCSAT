import 'server-only';
import { createClient } from '@/lib/supabase/server';
export async function parentSession() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  const result = await supabase.rpc('parent_access');
  if (result.error) throw new Error('Không đọc được quyền phụ huynh.');
  const access = result.data as { state: 'active' | 'unlinked' | 'blocked'; student_id?: string; parent_id?: string; revision?: number; contact_revision?: number };
  return { supabase, user, access };
}
