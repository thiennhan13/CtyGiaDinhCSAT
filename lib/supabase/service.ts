import { createClient } from '@supabase/supabase-js'

// This should ONLY be used in server-side API routes or Server Actions
// when you need to bypass Row Level Security.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key || key === 'placeholder') {
    throw new Error('CẤU HÌNH LỖI: Thiếu SUPABASE_SERVICE_ROLE_KEY. Vui lòng kiểm tra biến môi trường.');
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}
