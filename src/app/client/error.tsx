'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function ClientError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Client Portal Error]', error)
    }
  }, [error])

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center bg-white rounded-[20px] shadow-sm border border-black/5 p-10">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-50 border border-amber-100 mb-5">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-7 h-7 text-amber-500"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        <span className="inline-block px-2.5 py-1 bg-[#EFF6FF] text-[#2563EB] text-[10px] font-bold uppercase tracking-wider rounded-md mb-4">
          Client Portal
        </span>

        <h1 className="text-xl font-extrabold text-[#111827] mb-2">
          Gagal Memuat Portal
        </h1>
        <p className="text-[#4B5563] text-sm mb-8 leading-relaxed">
          Portal klien mengalami gangguan sementara. Data proyek Anda aman.
          Silakan muat ulang halaman.
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
            href="/client/dashboard"
            className="px-5 py-2.5 bg-white border border-black/10 hover:bg-[#F8F9FA] text-[#111827] text-sm font-bold rounded-xl transition-all"
          >
            Kembali ke Portal
          </Link>
        </div>
      </div>
    </div>
  )
}
