'use client'

import { useState } from 'react'
import { registerAgency } from './actions'
import { Building2, Mail, Plus, Loader2, Copy, CheckCircle2 } from 'lucide-react'

export default function SuperAdminForm() {
  const [isPending, setIsPending] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null)
  const [credentials, setCredentials] = useState<{ agencyName: string, email: string, password: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsPending(true)
    setMessage(null)
    setCredentials(null)
    setCopied(false)

    const formData = new FormData(e.currentTarget)
    
    try {
      const result = await registerAgency(formData)
      if (result.error) {
        setMessage({ type: 'error', text: result.error })
      } else if (result.success && result.email && result.password) {
        setMessage({ type: 'success', text: 'Agensi berhasil didaftarkan secara instan!' })
        setCredentials({
          agencyName: result.agencyName || '',
          email: result.email,
          password: result.password
        })
        ;(e.target as HTMLFormElement).reset()
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Terjadi kesalahan sistem.' })
    } finally {
      setIsPending(false)
    }
  }

  const handleCopy = () => {
    if (!credentials) return
    const textToCopy = `Halo tim ${credentials.agencyName}!\n\nPlatform manajemen proyek Anda sudah aktif. Berikut adalah detail akun untuk login:\n\nEmail: ${credentials.email}\nPassword: ${credentials.password}\n\nSilakan login ke platform dan segera ubah password Anda.`
    
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    })
  }

  return (
    <div className="bg-white rounded-[20px] shadow-sm border border-black/5 overflow-hidden w-full mx-auto">
      <div className="p-8 border-b border-black/5 bg-[#F8F9FA]">
        <h2 className="font-extrabold text-2xl text-[#111827] mb-2 flex items-center gap-3">
          <Building2 className="text-[#2563EB]" size={28} /> Daftarkan Agensi Baru
        </h2>
        <p className="text-sm text-[#4B5563]">
          Buat ruang kerja (tenant) baru dengan pembuatan akun instan otomatis.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-8 space-y-6">
        {message && message.type === 'error' && (
          <div className="p-4 rounded-[12px] border text-sm font-bold bg-rose-50 border-rose-200 text-rose-600">
            {message.text}
          </div>
        )}

        {credentials && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-[16px] p-6 mb-6">
            <div className="flex items-center gap-2 text-emerald-700 font-bold mb-4">
              <CheckCircle2 size={20} />
              {message?.text}
            </div>
            
            <div className="bg-white rounded-[12px] p-5 border border-emerald-100 space-y-3 mb-4">
              <div>
                <span className="text-xs font-bold text-[#4B5563] uppercase">Nama Agensi</span>
                <p className="text-[#111827] font-medium">{credentials.agencyName}</p>
              </div>
              <div>
                <span className="text-xs font-bold text-[#4B5563] uppercase">Email Login</span>
                <p className="text-[#111827] font-medium">{credentials.email}</p>
              </div>
              <div>
                <span className="text-xs font-bold text-[#4B5563] uppercase">Password Sementara</span>
                <p className="text-[#111827] font-mono bg-gray-100 px-2 py-1 rounded inline-block mt-1">{credentials.password}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopy}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white font-bold py-3 rounded-[12px] hover:bg-emerald-700 transition-colors shadow-sm"
            >
              {copied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
              {copied ? 'Berhasil Disalin!' : 'Salin Kredensial Akun'}
            </button>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#4B5563] mb-2">Nama Agensi / Studio</label>
            <div className="relative">
              <Building2 size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-black/30" />
              <input 
                type="text" 
                name="agencyName" 
                required 
                placeholder="Contoh: Arta Media" 
                className="w-full pl-12 pr-4 py-3 bg-[#F8F9FA] border border-black/10 rounded-[12px] text-sm font-medium focus:border-[#2563EB] outline-none transition-all" 
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#4B5563] mb-2">Email Owner Agensi</label>
            <div className="relative">
              <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-black/30" />
              <input 
                type="email" 
                name="ownerEmail" 
                required 
                placeholder="owner.arta@gmail.com" 
                className="w-full pl-12 pr-4 py-3 bg-[#F8F9FA] border border-black/10 rounded-[12px] text-sm font-medium focus:border-[#2563EB] outline-none transition-all" 
              />
            </div>
          </div>
        </div>

        <button 
          type="submit" 
          disabled={isPending}
          className="w-full flex items-center justify-center gap-2 bg-[#111827] text-white font-bold py-4 rounded-[12px] hover:bg-[#2563EB] hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:transform-none disabled:hover:shadow-none"
        >
          {isPending ? (
            <><Loader2 size={18} className="animate-spin" /> Mendaftarkan...</>
          ) : (
            <><Plus size={18} /> Daftarkan Agensi Instan</>
          )}
        </button>
      </form>
    </div>
  )
}
