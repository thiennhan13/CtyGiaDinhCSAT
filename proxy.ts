import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { authRedirect, portalRole } from '@/lib/auth-routing'

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname
  if (process.env.PORTAL_MAINTENANCE === 'true' && /^\/(api|admin|tutor|parents|auth|login)(\/|$)/.test(path)) {
    return NextResponse.json({ error: 'Portal đang bảo trì. Vui lòng quay lại sau.' }, { status: 503, headers: { 'Cache-Control': 'no-store', 'Retry-After': '300', 'X-Robots-Tag': 'noindex' } })
  }
  if (path === '/google8e5ffbef59a10505.html') return NextResponse.next({ request })
  if (path === '/privacy-policy' || path === '/enroll' || path === '/' || path === '/self-study' || path === '/free-resources' || path === '/achievements' || path === '/team' || path === '/posts' || /^\/posts\/[a-z0-9-]+$/.test(path) || path === '/roadmap' || /^\/roadmap\/(a|b|c|e|k|co-ban|nang-cao|advanced|basic|hsgqg|voi|prevoi|custom|tuy-chinh)$/.test(path) || path === '/sitemap.xml' || path === '/robots.txt' || path === '/llms.txt' || path === '/api/consultations' || path === '/api/consultations/status' || path === '/api/cron/monthly-reviews') {
    return NextResponse.next({ request })
  }
  if (path === '/api/auth/login') {
    const response = NextResponse.next({ request })
    response.headers.set('Cache-Control', 'private, no-store')
    response.headers.set('X-Robots-Tag', 'noindex, noarchive')
    return response
  }
  let supabaseResponse = NextResponse.next({ request })
  const privatePath = ['/admin', '/tutor', '/api/admin', '/api/tutor', '/api/oj', '/parents', '/api/parents', '/auth', '/login', '/access-denied', '/api/learning', '/api/attendance'].some(prefix => path === prefix || path.startsWith(`${prefix}/`))
  const protectIndexing = (response: NextResponse) => {
    if (privatePath) { response.headers.set('X-Robots-Tag', 'noindex, noarchive'); response.headers.set('Cache-Control', 'private, no-store') }
    return response
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  const role = portalRole(user)
  const tutorId = role === 'tutor' && privatePath && !path.startsWith('/api/auth/') && !path.startsWith('/auth/') && path !== '/access-denied'
    ? await supabase.rpc('current_tutor_id') : null
  const activeTutor = !tutorId || (!tutorId.error && !!tutorId.data)
  const area = path.split('/')[2]
  if (path.startsWith('/api/') && ['admin','tutor','parents','oj','learning','attendance'].includes(area)
      && !['/api/parents/auth','/api/parents/logout'].includes(path)) {
    const allowed = area === 'parents' ? role === 'parent' : area === 'admin' || area === 'tutor'
      ? role === area : role === 'admin' || role === 'tutor'
    if (!user || !allowed || !activeTutor) {
      const denied = NextResponse.json({ error: user ? 'Quyền truy cập bị từ chối.' : 'Chưa đăng nhập.' }, { status: user ? 403 : 401 })
      supabaseResponse.cookies.getAll().forEach(cookie => denied.cookies.set(cookie))
      return protectIndexing(denied)
    }
  }
  const destination = authRedirect(pathname, user, activeTutor)
  if (destination) {
    const url = new URL(destination, request.url)
    const response = NextResponse.redirect(url)
    // Keep token refresh/deletion cookies on redirects as well as normal responses.
    supabaseResponse.cookies.getAll().forEach(cookie => response.cookies.set(cookie))
    return protectIndexing(response)
  }

  return protectIndexing(supabaseResponse)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon/|fonts/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|woff2|mp4|webm)$).*)',
  ],
}
