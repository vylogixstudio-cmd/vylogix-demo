'use client'

import { useState } from 'react'
import { Plus, Edit2, Check, X, Layers, Trash2 } from 'lucide-react'
import { addAgencyService, editAgencyService, deleteAgencyService } from './actions'

interface AgencyService {
  id: string
  name: string
  organization_id: string
}

export default function AgencyServicesSection({ services, organizationId }: { services: AgencyService[], organizationId: string }) {
  const [isAdding, setIsAdding] = useState(false)
  const [newServiceName, setNewServiceName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newServiceName.trim()) return
    setLoading(true)
    setErrorMsg('')
    const res = await addAgencyService(organizationId, newServiceName.trim())
    if (res?.error) setErrorMsg(res.error)
    else {
      setNewServiceName('')
      setIsAdding(false)
    }
    setLoading(false)
  }

  const handleEditSubmit = async (serviceId: string) => {
    if (!editName.trim() || editName.trim() === services.find(s => s.id === serviceId)?.name) {
      setEditingId(null)
      return
    }
    setLoading(true)
    setErrorMsg('')
    const res = await editAgencyService(serviceId, editName.trim())
    if (res?.error) setErrorMsg(res.error)
    else setEditingId(null)
    setLoading(false)
  }

  const handleDelete = async (serviceId: string) => {
    if (!confirm('Yakin ingin menghapus layanan ini? Data yang terkait mungkin tidak akan tampil dengan benar.')) return
    setLoading(true)
    setErrorMsg('')
    const res = await deleteAgencyService(serviceId)
    if (res?.error) setErrorMsg(res.error)
    setLoading(false)
  }

  return (
    <div className="bg-white p-6 rounded-[20px] shadow-sm border border-black/5 w-full max-w-4xl mx-auto mt-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#EFF6FF] rounded-[12px] text-[#2563EB]">
            <Layers size={20} />
          </div>
          <div>
            <h2 className="font-extrabold text-lg text-[#111827] font-['Plus_Jakarta_Sans']">Layanan Agensi (Jasa)</h2>
            <p className="text-[#4B5563] text-xs mt-0.5">Kelola tipe layanan yang Anda tawarkan ke klien.</p>
          </div>
        </div>
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1.5 bg-[#F8F9FA] border border-black/10 text-[#4B5563] font-bold px-4 py-2 rounded-[12px] text-xs hover:bg-[#111827] hover:text-white hover:border-black transition-all shadow-sm"
          >
            <Plus size={14} /> Tambah Jasa
          </button>
        )}
      </div>

      {errorMsg && (
        <div className="text-rose-500 text-xs font-bold bg-rose-50 p-3 rounded-[12px] border border-rose-100 mb-4">
          {errorMsg}
        </div>
      )}

      <div className="space-y-3">
        {isAdding && (
          <form onSubmit={handleAdd} className="flex gap-2">
            <input 
              type="text" 
              autoFocus
              value={newServiceName}
              onChange={(e) => setNewServiceName(e.target.value)}
              placeholder="Contoh: Social Media Management"
              className="flex-1 px-4 py-2.5 bg-[#F8F9FA] border border-[#2563EB] rounded-[12px] text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 transition-all"
            />
            <button disabled={loading} type="submit" className="px-4 py-2.5 bg-[#2563EB] text-white rounded-[12px] text-xs font-bold hover:bg-[#1D4ED8] transition-colors shadow-sm flex items-center gap-2">
              <Check size={14} /> Simpan
            </button>
            <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2.5 bg-[#F8F9FA] border border-black/10 text-[#4B5563] rounded-[12px] text-xs font-bold hover:bg-black/5 transition-colors">
              Batal
            </button>
          </form>
        )}

        {services.length === 0 && !isAdding && (
          <div className="text-center py-6 text-sm text-[#4B5563] bg-[#F8F9FA] rounded-[12px] border border-black/5">
            Belum ada layanan yang ditambahkan.
          </div>
        )}

        {services.map((service) => (
          <div key={service.id} className="flex items-center justify-between p-4 bg-[#F8F9FA] border border-black/5 rounded-[12px] group hover:border-black/10 transition-colors">
            {editingId === service.id ? (
              <div className="flex-1 flex gap-2 mr-2">
                <input 
                  type="text" 
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="flex-1 px-3 py-2 bg-white border border-[#2563EB] rounded-[8px] text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 transition-all"
                />
                <button onClick={() => handleEditSubmit(service.id)} disabled={loading} className="p-2 bg-[#2563EB] text-white rounded-[8px] hover:bg-[#1D4ED8] transition-colors">
                  <Check size={16} />
                </button>
                <button onClick={() => setEditingId(null)} className="p-2 bg-white border border-black/10 text-[#4B5563] rounded-[8px] hover:bg-black/5 transition-colors">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#2563EB]"></div>
                  <span className="text-sm font-semibold text-[#111827]">{service.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => {
                      setEditingId(service.id)
                      setEditName(service.name)
                    }}
                    className="text-[#4B5563] p-1.5 hover:bg-black/5 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                    title="Edit Jasa"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button 
                    onClick={() => handleDelete(service.id)}
                    disabled={loading}
                    className="text-rose-500 p-1.5 hover:bg-rose-50 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                    title="Hapus Jasa"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
