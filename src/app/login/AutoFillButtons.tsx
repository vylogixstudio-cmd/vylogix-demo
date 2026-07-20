'use client'

import React from 'react'

export default function AutoFillButtons() {
  const fillCredentials = (email: string, pass: string) => {
    const emailInput = document.getElementById('login-email') as HTMLInputElement
    const passInput = document.getElementById('login-password') as HTMLInputElement
    if (emailInput && passInput) {
      emailInput.value = email
      passInput.value = pass
    }
  }

  return (
    <div className="flex flex-col gap-2 mb-6 p-4 rounded-xl bg-blue-50/50 border border-blue-100">
      <p className="text-xs text-center text-blue-800 font-medium mb-1">
        Akses Cepat Mode Demo:
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => fillCredentials('superadmin@demo.com', 'demo12345')}
          className="px-3 py-2 text-xs font-semibold text-blue-700 bg-white border border-blue-200 rounded-lg shadow-sm hover:bg-blue-50 transition-colors"
        >
          Super Admin
        </button>
        <button
          type="button"
          onClick={() => fillCredentials('adminagensi@demo.com', 'Demo67890')}
          className="px-3 py-2 text-xs font-semibold text-blue-700 bg-white border border-blue-200 rounded-lg shadow-sm hover:bg-blue-50 transition-colors"
        >
          Admin Agensi
        </button>
        <button
          type="button"
          onClick={() => fillCredentials('klien@demo.com', 'Demo54321')}
          className="px-3 py-2 text-xs font-semibold text-blue-700 bg-white border border-blue-200 rounded-lg shadow-sm hover:bg-blue-50 transition-colors"
        >
          Klien
        </button>
      </div>
      <p className="text-[10px] text-center text-blue-600/70 font-medium mt-3 px-2">
        ⚠️ Mohon hindari menekan tombol masuk berkali-kali dalam waktu singkat untuk mencegah pembatasan akses (rate limit) dari sistem keamanan kami.
      </p>
    </div>
  )
}
