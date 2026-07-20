'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { createClientProject } from '@/app/admin/dashboard/actions'


interface AgencyService {
  id: string
  name: string
  organization_id: string
}

interface ClientProfile {
  id: string;
  full_name: string
  email: string
  services?: AgencyService[];
}

export default function CreateProjectModal({ clients, services = [] }: { clients: ClientProfile[], services?: AgencyService[] }) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setErrorMsg('')
    
    const res = await createClientProject(formData)
    
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
        className="flex items-center gap-1.5 bg-[#111827] text-white font-bold px-4 py-2 rounded-[12px] text-xs hover:bg-black transition-all shadow-sm"
      >
        <Plus size={16} /> Buat Proyek Baru
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[20px] shadow-lg w-full max-w-lg overflow-hidden border border-black/5 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-black/5 flex justify-between items-center bg-[#F8F9FA]">
              <h2 className="font-extrabold text-xl text-[#111827] font-['Plus_Jakarta_Sans']">Proyek Baru</h2>
              <button onClick={() => setIsOpen(false)} className="text-[#4B5563] hover:text-rose-500 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form action={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#4B5563] mb-1.5">Pilih Klien</label>
                <select name="clientId" required className="w-full px-4 py-3 rounded-[12px] bg-[#F8F9FA] border border-black/10 text-sm focus:outline-none focus:border-[#2563EB] transition-colors">
                  <option value="">-- Pilih Klien --</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.full_name || c.email}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#4B5563] mb-1.5">Judul Proyek</label>
                <input type="text" name="title" required placeholder="Contoh: Website E-Commerce Toko Kue" className="w-full px-4 py-3 rounded-[12px] bg-[#F8F9FA] border border-black/10 text-sm focus:outline-none focus:border-[#2563EB] transition-colors" />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#4B5563] mb-1.5">Tipe Jasa</label>
                <select name="serviceType" required className="w-full px-4 py-3 rounded-[12px] bg-[#F8F9FA] border border-black/10 text-sm focus:outline-none focus:border-[#2563EB] transition-colors">
                  <option value="">-- Pilih Tipe Jasa --</option>
                  {services.map(s => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                  {services.length === 0 && (
                    <option value="lainnya">Lainnya (Default)</option>
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#4B5563] mb-1.5">Total Harga (Rp)</label>
                  <input 
                    type="text" 
                    name="totalPrice" 
                    required 
                    placeholder="Contoh: 1.000.000" 
                    className="w-full px-4 py-3 rounded-[12px] bg-[#F8F9FA] border border-black/10 text-sm focus:outline-none focus:border-[#2563EB] transition-colors"
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '')
                      e.target.value = val ? new Intl.NumberFormat('id-ID').format(parseInt(val)) : ''
                    }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#4B5563] mb-1.5">DP Dibayar (Rp)</label>
                  <input 
                    type="text" 
                    name="dpPaid" 
                    placeholder="Contoh: 500.000" 
                    className="w-full px-4 py-3 rounded-[12px] bg-[#F8F9FA] border border-black/10 text-sm focus:outline-none focus:border-[#2563EB] transition-colors"
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '')
                      e.target.value = val ? new Intl.NumberFormat('id-ID').format(parseInt(val)) : ''
                    }}
                  />
                </div>
              </div>

              {errorMsg && (
                <div className="text-rose-500 text-xs font-bold bg-rose-50 p-3 rounded-[12px] border border-rose-100 text-center">
                  {errorMsg}
                </div>
              )}

              <div className="pt-2">
                <button disabled={loading} type="submit" className="w-full bg-[#2563EB] text-white font-bold py-3.5 rounded-[12px] hover:bg-[#1D4ED8] transition-all shadow-md disabled:opacity-50">
                  {loading ? 'Menyimpan...' : 'Simpan Proyek'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
