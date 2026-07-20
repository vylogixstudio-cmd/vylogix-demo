import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// ---------------------------------------------------------------------------
// Type Definitions
// ---------------------------------------------------------------------------

type UserRole = 'super_admin' | 'admin' | 'client'

interface OrganizationData {
  is_active: boolean
  auto_suspend: boolean
  license_expires_at: string | null
}

interface ProfileWithOrg {
  role: UserRole
  organization_id: string | null
  organizations: OrganizationData | null
}

// ---------------------------------------------------------------------------
// Route Definitions
// ---------------------------------------------------------------------------

const PROTECTED_ROUTE_PREFIXES = ['/super-admin', '/admin', '/client']
const PUBLIC_ONLY_ROUTES = ['/login', '/']

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

function isPublicOnlyRoute(pathname: string): boolean {
  return PUBLIC_ONLY_ROUTES.includes(pathname)
}

// ---------------------------------------------------------------------------
// Suspension Check Logic
// ---------------------------------------------------------------------------

function isOrganizationSuspended(org: OrganizationData): boolean {
  if (org.is_active === false) {
    return true
  }
  if (org.auto_suspend && org.license_expires_at) {
    const isExpired = new Date() > new Date(org.license_expires_at)
    if (isExpired) {
      return true
    }
  }
  return false
}

// ---------------------------------------------------------------------------
// Role Guard Logic
// ---------------------------------------------------------------------------

function getRoleRequiredForPath(pathname: string): UserRole | null {
  if (pathname.startsWith('/super-admin')) return 'super_admin'
  if (pathname.startsWith('/admin')) return 'admin'
  if (pathname.startsWith('/client')) return 'client'
  return null
}

function getDefaultRedirectForRole(role: UserRole): string {
  switch (role) {
    case 'super_admin':
      return '/super-admin'
    case 'admin':
      return '/admin/dashboard'
    case 'client':
      return '/client/dashboard'
  }
}

// ---------------------------------------------------------------------------
// Cookie Propagation Helper
// ---------------------------------------------------------------------------

function redirectWithCookies(url: URL | string, supabaseResponse: NextResponse) {
  const redirectRes = NextResponse.redirect(url)
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    redirectRes.cookies.set(cookie.name, cookie.value, { ...cookie })
  })
  return redirectRes
}

// ---------------------------------------------------------------------------
// Main updateSession Function
// ---------------------------------------------------------------------------

export async function updateSession(request: NextRequest) {
  // We must carry supabaseResponse through so cookies are properly propagated.
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
          // First, set on the request (needed for createServerClient internals).
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          // Recreate supabaseResponse with the updated request.
          supabaseResponse = NextResponse.next({ request })
          // Then propagate to the outgoing response.
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // IMPORTANT: Use auth.getUser() — NOT auth.getSession() — for cryptographic
  // server-side token verification. getSession() trusts the client cookie value
  // without re-validating it against the Supabase auth server.
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  const url = request.nextUrl.clone()
  const { pathname } = url

  // ---------------------------------------------------------------------------
  // Case 1: No authenticated user
  // ---------------------------------------------------------------------------
  if (userError || !user) {
    if (isProtectedRoute(pathname)) {
      url.pathname = '/login'
      return redirectWithCookies(url, supabaseResponse)
    }
    return supabaseResponse
  }

  // ---------------------------------------------------------------------------
  // Case 2: Authenticated user — fetch profile + org in ONE roundtrip
  // We use a relational join to avoid the N+1 query anti-pattern.
  // ---------------------------------------------------------------------------
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, organization_id, organizations(is_active, auto_suspend, license_expires_at)')
    .eq('id', user.id)
    .single<ProfileWithOrg>()

  // If the profile is missing, we cannot determine access rights.
  // Redirect to login to prevent a silent bypass.
  if (profileError || !profile) {
    // Sign out the dangling session and send to login.
    await supabase.auth.signOut()
    url.pathname = '/login'
    return redirectWithCookies(url, supabaseResponse)
  }

  // ---------------------------------------------------------------------------
  // Case 3: Authenticated user on a public-only route → redirect to dashboard
  // ---------------------------------------------------------------------------
  if (isPublicOnlyRoute(pathname)) {
    url.pathname = getDefaultRedirectForRole(profile.role)
    return redirectWithCookies(url, supabaseResponse)
  }

  // ---------------------------------------------------------------------------
  // Case 4: Authenticated user on a protected route — run guards
  // ---------------------------------------------------------------------------
  if (isProtectedRoute(pathname)) {
    // --- Guard 4a: Auto-Suspend Check ---
    //
    // 📖 DESAIN KEPUTUSAN:
    //    Suspend adalah masalah bisnis antara Vylogix (super_admin) dan Agency (admin).
    //    Client adalah pengguna akhir yang tidak bersalah — mereka tetap boleh
    //    akses dashboard dan lihat progress proyek mereka seperti biasa.
    //
    //    Yang kena blokir saat suspend: hanya role 'admin'
    //    Yang bebas: 'super_admin' (évidemment) dan 'client'
    if (profile.role === 'admin') {
      const org = profile.organizations

      if (!org) {
        // Admin tidak punya org — sesuatu yang aneh, blokir untuk keamanan
        url.pathname = '/suspended'
        return redirectWithCookies(url, supabaseResponse)
      }

      if (isOrganizationSuspended(org)) {
        // Org kena suspend → blokir admin, arahkan ke halaman info
        // Halaman /suspended menampilkan nomor WA Vylogix Studio agar
        // admin bisa menghubungi untuk perpanjang lisensi
        url.pathname = '/suspended'
        return redirectWithCookies(url, supabaseResponse)
      }
    }

    // --- Guard 4b: Role-Based Access Control (RBAC) ---
    const requiredRole = getRoleRequiredForPath(pathname)

    if (requiredRole !== null && profile.role !== requiredRole) {
      // User authenticated tapi akses bagian role lain → arahkan ke dasboard mereka
      url.pathname = getDefaultRedirectForRole(profile.role)
      return redirectWithCookies(url, supabaseResponse)
    }
  }

  return supabaseResponse
}
