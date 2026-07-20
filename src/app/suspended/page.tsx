export const metadata = {
  title: 'Akses Ditangguhkan — Vylogix Portal',
  description: 'Lisensi layanan agensi Anda telah ditangguhkan atau kedaluwarsa.',
}

/**
 * SuspendedPage — rendered when the middleware detects that a user's
 * organization is either deactivated (`is_active = false`) or that
 * `auto_suspend` is active and `license_expires_at` has been exceeded.
 */
export default function SuspendedPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-[#F8F9FA] to-slate-100 flex flex-col items-center justify-center p-4 text-[#111827]">

      {/* ── Main Card ── */}
      <div className="w-full max-w-md bg-white rounded-3xl border border-black/[0.06] shadow-2xl shadow-black/[0.07] p-10 text-center flex flex-col items-center">

        {/* Shield-X Icon (raw SVG) */}
        <div className="relative mb-7">
          <div className="w-20 h-20 bg-red-50 rounded-2xl flex items-center justify-center shadow-inner">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-10 h-10 text-red-500"
              aria-hidden="true"
            >
              {/* Shield path */}
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              {/* X mark inside shield */}
              <line x1="9.5" y1="9.5" x2="14.5" y2="14.5" />
              <line x1="14.5" y1="9.5" x2="9.5" y2="14.5" />
            </svg>
          </div>
          {/* Pulse ring for visual emphasis */}
          <span
            className="absolute inset-0 rounded-2xl ring-4 ring-red-400/20 animate-ping"
            aria-hidden="true"
          />
        </div>

        {/* Badge */}
        <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-600 text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full border border-red-200/70 mb-5">
          {/* Exclamation triangle icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-3 h-3"
            aria-hidden="true"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          Akses Ditangguhkan
        </span>

        <h1 className="text-2xl font-extrabold text-[#111827] tracking-tight mb-3 leading-snug">
          Lisensi Layanan Telah<br />Ditangguhkan
        </h1>

        <p className="text-[#6B7280] text-sm leading-relaxed mb-8 max-w-xs">
          Sistem mendeteksi bahwa lisensi agensi Anda telah{' '}
          <span className="font-semibold text-[#4B5563]">kedaluwarsa</span> atau{' '}
          <span className="font-semibold text-[#4B5563]">dinonaktifkan</span> oleh Administrator.
          Silakan hubungi Vylogix Studio untuk memperpanjang atau mengaktifkan kembali layanan Anda.
        </p>

        {/* Divider */}
        <div className="w-full border-t border-black/[0.05] mb-7" />


      </div>

      {/* ── Footer ── */}
      <p className="mt-8 text-xs text-[#9CA3AF] text-center">
        &copy; {new Date().getFullYear()} Vylogix Studio. All rights reserved.
      </p>
    </div>
  )
}
