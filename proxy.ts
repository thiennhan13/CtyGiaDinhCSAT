import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

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

  // Xác định loại route
  const isParentLoginRoute = pathname === '/login'
  const isTutorLoginRoute = pathname === '/tutor'
  const isAuthRoute = isParentLoginRoute || isTutorLoginRoute
  const isAdminRoute = pathname.startsWith('/admin')
  const isTutorDashRoute = pathname.startsWith('/tutor/') // /tutor/dashboard, /tutor/classes...
  const isParentRoute = pathname.startsWith('/parents')
  const isProtectedRoute = isAdminRoute || isTutorDashRoute
  const parentSession = request.cookies.get('parent_session')

  // Xử lý Phụ huynh đã đăng nhập: Nếu vào lại /login thì cho thẳng vào /parents
  if (isParentLoginRoute && parentSession?.value) {
    return NextResponse.redirect(new URL('/parents', request.url))
  }

  // 1. Chưa đăng nhập Supabase → redirect về /tutor nếu cố vào admin/tutor dashboard
  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/tutor'
    return NextResponse.redirect(url)
  }

  // 2. Đã đăng nhập Supabase (gia sư/admin)
  if (user) {
    const role = user.app_metadata?.role || user.user_metadata?.role || 'tutor'

    // Tutor cố vào trang /admin → redirect về /tutor/dashboard
    if (isAdminRoute && role !== 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = '/tutor/dashboard'
      return NextResponse.redirect(url)
    }

    // Gia sư đã đăng nhập mà vào lại /tutor (trang login) → redirect về dashboard
    if (isTutorLoginRoute) {
      const url = request.nextUrl.clone()
      url.pathname = role === 'admin' ? '/admin/dashboard' : '/tutor/dashboard'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
