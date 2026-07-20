import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '404 — Halaman Tidak Ditemukan | Vylogix CRM',
  description: 'Halaman yang Anda cari tidak ditemukan.',
}

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {/* Big 404 */}
        <div className="mb-6 select-none">
          <p className="text-[120px] font-extrabold text-[#2563EB]/10 leading-none tracking-tighter">
            404
          </p>
        </div>

        {/* Icon */}
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#EFF6FF] border border-[#BFDBFE] mb-5 -mt-10 relative z-10">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-7 h-7 text-[#2563EB]"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
            <line x1="11" y1="8" x2="11" y2="14" />
            <line x1="8" y1="11" x2="14" y2="11" />
          </svg>
        </div>

        <h1 className="text-2xl font-extrabold text-[#111827] mb-2">
          Halaman Tidak Ditemukan
        </h1>
        <p className="text-[#4B5563] text-sm mb-8 leading-relaxed">
          Halaman yang Anda cari mungkin sudah dipindahkan, dihapus, atau URL-nya tidak valid.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/login"
            className="px-6 py-3 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-bold rounded-xl transition-all shadow-sm"
          >
            Ke Halaman Login
          </Link>
          <Link
            href="/"
            className="px-6 py-3 bg-white border border-black/10 hover:bg-[#F8F9FA] text-[#111827] text-sm font-bold rounded-xl transition-all"
          >
            Ke Beranda
          </Link>
        </div>
      </div>
    </div>
  )
}
