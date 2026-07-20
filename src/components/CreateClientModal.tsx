'use client'

import { useState } from 'react'
import { UserPlus, X } from 'lucide-react'
import { createClientAccount } from '@/app/admin/dashboard/actions'

export default function CreateClientModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setErrorMsg('')
    
    const res = await createClientAccount(formData)
    
    if (res?.error) {
      setErrorMsg(res.error)
      setLoading(false)
    } else {
      setIsOpen(false)
      setLoading(false)
    }
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 bg-white text-[#111827] border border-black/10 font-bold px-4 py-2 rounded-[12px] text-xs hover:bg-[#F8F9FA] transition-all shadow-sm"
      >
        <UserPlus size={16} /> Tambah Klien Baru
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[20px] shadow-lg w-full max-w-md overflow-hidden border border-black/5 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-black/5 flex justify-between items-center bg-[#F8F9FA]">
              <h2 className="font-extrabold text-xl text-[#111827] font-['Plus_Jakarta_Sans']">Akun Klien Baru</h2>
              <button onClick={() => setIsOpen(false)} className="text-[#4B5563] hover:text-rose-500 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form action={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#4B5563] mb-1.5">Nama Lengkap</label>
                <input type="text" name="fullName" required placeholder="Contoh: Budi Santoso" className="w-full px-4 py-3 rounded-[12px] bg-[#F8F9FA] border border-black/10 text-sm focus:outline-none focus:border-[#2563EB] transition-colors" />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#4B5563] mb-1.5">Email Klien</label>
                <input type="email" name="email" required placeholder="budi@email.com" className="w-full px-4 py-3 rounded-[12px] bg-[#F8F9FA] border border-black/10 text-sm focus:outline-none focus:border-[#2563EB] transition-colors" />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#4B5563] mb-1.5">Password Akses</label>
                <input type="password" name="password" required minLength={6} placeholder="Minimal 6 karakter" className="w-full px-4 py-3 rounded-[12px] bg-[#F8F9FA] border border-black/10 text-sm focus:outline-none focus:border-[#2563EB] transition-colors" />
              </div>

              {errorMsg && (
                <div className="text-rose-500 text-xs font-bold bg-rose-50 p-3 rounded-[12px] border border-rose-100 text-center">
                  {errorMsg}
                </div>
              )}

              <div className="pt-2">
                <button disabled={loading} type="submit" className="w-full bg-[#111827] text-white font-bold py-3.5 rounded-[12px] hover:bg-black transition-all shadow-md disabled:opacity-50">
                  {loading ? 'Membuat Akun...' : 'Daftarkan Klien'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
