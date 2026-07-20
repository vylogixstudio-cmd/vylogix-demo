import { login } from './actions'
import AutoFillButtons from './AutoFillButtons'

export const metadata = {
  title: 'Masuk — Vylogix CRM & Client Portal',
  description: 'Masuk ke portal Vylogix Studio untuk mengelola proyek dan melihat laporan perkembangan.',
}

/**
 * LoginPage renders a clean, full-screen portal access form.
 *
 * Authentication flow:
 *   1. User submits email + password via a Server Action form.
 *   2. `login()` server action authenticates with Supabase, reads the role
 *      from the `profiles` table, and redirects to the correct dashboard.
 *   3. If already authenticated, the middleware intercepts and redirects
 *      before this page component is ever rendered.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>
}) {
  const resolvedParams = await searchParams
  const errorMessage = resolvedParams?.message

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center p-4">
      {/* ── Brand Header ── */}
      <div className="mb-8 text-center select-none">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#2563EB] shadow-lg shadow-blue-500/25 mb-4">
          {/* Shield Icon — Raw SVG, no external icon library required */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-7 h-7 text-white"
            aria-hidden="true"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </div>
        <h1 className="text-2xl font-extrabold text-[#111827] tracking-tight">
          Vylogix{' '}
          <span className="text-[#2563EB]">Portal</span>
        </h1>
        <p className="mt-1.5 text-sm text-[#6B7280]">
          Masuk dengan akun yang diberikan administrator.
        </p>
      </div>

      {/* ── Card ── */}
      <div className="w-full max-w-sm bg-white rounded-2xl border border-black/[0.06] shadow-xl shadow-black/[0.04] p-8">
        
        <AutoFillButtons />

        <form action={login} className="space-y-5">
          {/* Email */}
          <div>
            <label
              htmlFor="login-email"
              className="block text-xs font-semibold uppercase tracking-widest text-[#6B7280] mb-1.5"
            >
              Email Akses
            </label>
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="akun@email.com"
              className="w-full px-4 py-3 rounded-xl bg-[#F9FAFB] border border-black/[0.08] text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/40 focus:border-[#2563EB] transition-all duration-150"
            />
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="login-password"
              className="block text-xs font-semibold uppercase tracking-widest text-[#6B7280] mb-1.5"
            >
              Password
            </label>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••••"
              className="w-full px-4 py-3 rounded-xl bg-[#F9FAFB] border border-black/[0.08] text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/40 focus:border-[#2563EB] transition-all duration-150"
            />
          </div>

          {/* Error message (passed via query param from server action redirect) */}
          {errorMessage && (
            <div
              role="alert"
              className="flex items-start gap-3 bg-rose-50 border border-rose-200/80 text-rose-700 text-sm p-3.5 rounded-xl"
            >
              {/* Exclamation Icon */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4 mt-0.5 shrink-0 text-rose-500"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{decodeURIComponent(errorMessage)}</span>
            </div>
          )}

          {/* Submit */}
          <button
            id="login-submit-button"
            type="submit"
            className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] active:scale-[0.99] text-white font-semibold py-3.5 rounded-xl transition-all duration-150 shadow-md shadow-blue-500/20 mt-1 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/50"
          >
            Akses Portal
          </button>
        </form>
      </div>

      {/* ── Footer ── */}
      <p className="mt-8 text-xs text-[#9CA3AF] text-center">
        &copy; {new Date().getFullYear()} Vylogix Studio. All rights reserved.
      </p>
    </div>
  )
}
