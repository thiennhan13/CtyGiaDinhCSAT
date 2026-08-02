import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
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
  const isAuthRoute = pathname === '/login' || pathname.startsWith('/(auth)')
  const isAdminRoute = pathname.startsWith('/admin')
  const isTutorRoute = pathname.startsWith('/tutor')
  const isProtectedRoute = isAdminRoute || isTutorRoute

  // 1. Chưa đăng nhập → redirect về /login nếu cố vào route được bảo vệ
  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // 2. Đã đăng nhập
  if (user) {
    const role = user.app_metadata?.role || user.user_metadata?.role || (user.email === 'csattutor@gmail.com' ? 'admin' : 'tutor')

    // Tutor cố vào trang /admin → redirect về /tutor/dashboard
    if (isAdminRoute && role !== 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = '/tutor/dashboard'
      return NextResponse.redirect(url)
    }

    // Đã đăng nhập mà vào lại /login → redirect về dashboard tương ứng
    if (isAuthRoute) {
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
