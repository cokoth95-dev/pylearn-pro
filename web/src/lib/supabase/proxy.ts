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
    path.startsWith('/classroom/') ||
    path === '/instructor' ||
    path.startsWith('/instructor/') ||
    path === '/guardian-pending' ||
    path.startsWith('/guardian-pending/') ||
    path === '/admission' ||
    path.startsWith('/admission/')

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

  const learningRoute = path === '/dashboard' || path.startsWith('/dashboard/') || path === '/classroom' || path.startsWith('/classroom/') || path === '/instructor' || path.startsWith('/instructor/')
  if (learningRoute && claims?.sub && typeof claims.sub === 'string') {
    const { data: gateData } = await supabase.rpc('get_my_admission_gate')
    const gate = gateData as { role?: string; age_missing?: boolean; guardian_pending?: boolean; needs_acceptance?: boolean } | null
    if (gate?.role === 'student') {
      if (gate.guardian_pending) {
        const guardianUrl = request.nextUrl.clone()
        guardianUrl.pathname = '/guardian-pending'
        guardianUrl.search = ''
        return NextResponse.redirect(guardianUrl)
      }
      if (gate.age_missing || gate.needs_acceptance) {
        const admissionUrl = request.nextUrl.clone()
        admissionUrl.pathname = '/admission'
        admissionUrl.search = ''
        return NextResponse.redirect(admissionUrl)
      }
    }
  }

  return response
}
