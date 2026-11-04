import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { authRedirect } from '@/lib/auth-routing'

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname
  if (process.env.PORTAL_MAINTENANCE === 'true' && /^\/(api|admin|tutor|parents|auth|login)(\/|$)/.test(path)) {
    return NextResponse.json({ error: 'Portal đang bảo trì. Vui lòng quay lại sau.' }, { status: 503, headers: { 'Cache-Control': 'no-store', 'Retry-After': '300', 'X-Robots-Tag': 'noindex' } })
  }
  if (path === '/google8e5ffbef59a10505.html') return NextResponse.next({ request })
  if (path === '/chinh-sach-quyen-rieng-tu' || path === '/dang-ky-hoc' || path === '/' || path === '/hoc-lieu-mien-phi' || path === '/thanh-tich' || path === '/gia-su' || path === '/bai-dang' || /^\/bai-dang\/[a-z0-9-]+$/.test(path) || path === '/lo-trinh' || /^\/lo-trinh\/(a|b|c|e|k|co-ban|nang-cao|advanced|basic|hsgqg|voi|prevoi|custom|tuy-chinh)$/.test(path) || path === '/sitemap.xml' || path === '/robots.txt' || path === '/llms.txt' || path === '/api/consultations' || path === '/api/consultations/status' || path === '/api/cron/monthly-reviews') {
    return NextResponse.next({ request })
  }
  if (path === '/api/auth/login') {
    const response = NextResponse.next({ request })
    response.headers.set('Cache-Control', 'private, no-store')
    response.headers.set('X-Robots-Tag', 'noindex, noarchive')
    return response
  }
  let supabaseResponse = NextResponse.next({ request })
  const privatePath = ['/admin', '/tutor', '/api/admin', '/api/tutor', '/api/oj', '/parents', '/api/parents', '/auth', '/login'].some(prefix => path === prefix || path.startsWith(`${prefix}/`))
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

  const destination = authRedirect(pathname, user)
  if (destination) {
    const url = request.nextUrl.clone()
    url.pathname = destination
    url.search = ''
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
