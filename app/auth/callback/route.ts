import { NextResponse } from 'next/server';
import { portalHome, portalRole } from '@/lib/auth-routing';
import { createClient } from '@/lib/supabase/server';
export async function GET(request: Request) {
  const origin = new URL(process.env.APP_ORIGIN || request.url).origin;
  const code = new URL(request.url).searchParams.get('code');
  try { if (code && code.length < 2048) {
    const db = await createClient();
    const { data, error } = await db.auth.exchangeCodeForSession(code);
    if (!error && data.user) return NextResponse.redirect(new URL(portalHome(portalRole(data.user)), origin));
  } } catch { /* OAuth failures return to the login screen without exposing provider details. */ }
  return NextResponse.redirect(new URL('/login?error=google', origin));
}
