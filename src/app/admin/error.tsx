'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Admin Error]', error)
    }
  }, [error])

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center bg-white rounded-[20px] shadow-sm border border-black/5 p-10">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 mb-5">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-7 h-7 text-rose-500"
            aria-hidden="true"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>

        <span className="inline-block px-2.5 py-1 bg-[#EFF6FF] text-[#2563EB] text-[10px] font-bold uppercase tracking-wider rounded-md mb-4">
          Admin Dashboard
        </span>

        <h1 className="text-xl font-extrabold text-[#111827] mb-2">
          Terjadi Kesalahan
        </h1>
        <p className="text-[#4B5563] text-sm mb-8 leading-relaxed">
          Bagian admin mengalami masalah. Data Anda aman.
          Coba muat ulang atau kembali ke dashboard.
        </p>

        {error.digest && (
          <p className="text-[10px] text-[#9CA3AF] font-mono mb-6">
            ID: {error.digest}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => reset()}
            className="px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-bold rounded-xl transition-all"
          >
            Muat Ulang
          </button>
          <Link
            href="/admin/dashboard"
            className="px-5 py-2.5 bg-white border border-black/10 hover:bg-[#F8F9FA] text-[#111827] text-sm font-bold rounded-xl transition-all"
          >
            Kembali ke Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
