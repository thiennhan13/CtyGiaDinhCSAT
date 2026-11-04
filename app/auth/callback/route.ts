import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
export async function GET(request: Request) {
  const origin = new URL(process.env.APP_ORIGIN || request.url).origin;
  const code = new URL(request.url).searchParams.get('code');
  try { if (code && code.length < 2048) {
    const db = await createClient();
    const { error } = await db.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL('/parents', origin));
  } } catch { /* OAuth failures return to the login screen without exposing provider details. */ }
  return NextResponse.redirect(new URL('/login?error=google', origin));
}
