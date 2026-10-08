import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) return NextResponse.next({ request })

  let response = NextResponse.next({ request })
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  // getClaims may return data: null when there is no valid session (for
  // example, on the first visit). Treat that as signed out and let protected
  // routes redirect normally instead of throwing from the proxy.
  let claims: { sub?: unknown } | null = null
  try {
    const { data, error } = await supabase.auth.getClaims()
    if (!error) claims = data?.claims ?? null
  } catch {
    // Fail closed for protected routes if session verification is unavailable.
  }
  const path = request.nextUrl.pathname
  const isProtected =
    path === '/dashboard' ||
    path.startsWith('/dashboard/') ||
    path === '/admin' ||
    path.startsWith('/admin/') ||
    path === '/classroom' ||
    path.startsWith('/classroom/')

  if (isProtected && !claims) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('next', `${path}${request.nextUrl.search}`)
    return NextResponse.redirect(loginUrl)
  }

  if (path === '/admin' || path.startsWith('/admin/')) {
    const userId = typeof claims?.sub === 'string' ? claims.sub : null
    const { data: profile } = userId
      ? await supabase.from('profiles').select('role').eq('id', userId).maybeSingle()
      : { data: null }

    if (profile?.role !== 'admin') {
      const dashboardUrl = request.nextUrl.clone()
      dashboardUrl.pathname = '/dashboard'
      dashboardUrl.search = ''
      return NextResponse.redirect(dashboardUrl)
    }
  }

  return response
}
