'use client'

import { useState, useTransition } from 'react'
import {
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Layers,
  Loader2,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { addAgencyService, updateAgencyService, deleteAgencyService } from './actions'

// ── Types ────────────────────────────────────────────────────────────────────
interface AgencyService {
  id: string
  name: string
  organization_id: string
}

interface AgencyServicesCardProps {
  services: AgencyService[]
  organizationId: string
}

// ── Component ────────────────────────────────────────────────────────────────
export default function AgencyServicesCard({
  services: initialServices,
  organizationId,
}: AgencyServicesCardProps) {
  const [services, setServices] = useState<AgencyService[]>(initialServices)
  const [isAdding, setIsAdding] = useState(false)
  const [newServiceName, setNewServiceName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [globalSuccess, setGlobalSuccess] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const showSuccess = (msg: string) => {
    setGlobalError(null)
    setGlobalSuccess(msg)
    setTimeout(() => setGlobalSuccess(null), 3500)
  }

  const showError = (msg: string) => {
    setGlobalSuccess(null)
    setGlobalError(msg)
    setTimeout(() => setGlobalError(null), 5000)
  }

  // ── Add ─────────────────────────────────────────────────────────────────────

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedName = newServiceName.trim()
    if (!trimmedName) return

    startTransition(async () => {
      const res = await addAgencyService(organizationId, trimmedName)
      if (res?.error) {
        showError(res.error)
      } else {
        // Optimistic UI: Next.js revalidation will refresh the server data,
        // but we also do a local push so the list updates without a full page reload.
        setServices((prev) => [
          ...prev,
          {
            id: `temp-${Date.now()}`,
            name: trimmedName,
            organization_id: organizationId,
          },
        ])
        setNewServiceName('')
        setIsAdding(false)
        showSuccess(`Layanan "${trimmedName}" berhasil ditambahkan.`)
      }
    })
  }

  // ── Edit ─────────────────────────────────────────────────────────────────────

  const startEdit = (service: AgencyService) => {
    setEditingId(service.id)
    setEditName(service.name)
    setGlobalError(null)
    setGlobalSuccess(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditName('')
  }

  const handleEditSubmit = (serviceId: string) => {
    const trimmedName = editName.trim()
    const original = services.find((s) => s.id === serviceId)

    if (!trimmedName || trimmedName === original?.name) {
      cancelEdit()
      return
    }

    startTransition(async () => {
      const res = await updateAgencyService(serviceId, trimmedName)
      if (res?.error) {
        showError(res.error)
      } else {
        setServices((prev) =>
          prev.map((s) => (s.id === serviceId ? { ...s, name: trimmedName } : s))
        )
        cancelEdit()
        showSuccess(`Layanan berhasil diperbarui menjadi "${trimmedName}".`)
      }
    })
  }

  // ── Delete ──────────────────────────────────────────────────────────────────

  const handleDelete = (service: AgencyService) => {
    if (
      !confirm(
        `Yakin ingin menghapus layanan "${service.name}"?\nProyek yang menggunakan tipe ini mungkin tidak akan tampil dengan benar.`
      )
    )
      return

    startTransition(async () => {
      const res = await deleteAgencyService(service.id)
      if (res?.error) {
        showError(res.error)
      } else {
        setServices((prev) => prev.filter((s) => s.id !== service.id))
        showSuccess(`Layanan "${service.name}" telah dihapus.`)
      }
    })
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-[20px] shadow-sm border border-black/5 overflow-hidden">
      {/* Card Header */}
      <div className="flex items-center justify-between p-6 border-b border-black/5">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[#EFF6FF] rounded-[14px] text-[#2563EB] shrink-0">
            <Layers size={22} />
          </div>
          <div>
            <h2 className="font-extrabold text-lg text-[#111827] font-['Plus_Jakarta_Sans']">
              Manajemen Layanan Agensi
            </h2>
            <p className="text-[#4B5563] text-xs mt-0.5">
              Kelola tipe jasa yang Anda tawarkan kepada klien.
            </p>
          </div>
        </div>

        {/* Add Button — shown when NOT in adding mode */}
        {!isAdding && (
          <button
            onClick={() => {
              setIsAdding(true)
              setGlobalError(null)
              setGlobalSuccess(null)
            }}
            disabled={isPending}
            className="flex items-center gap-2 bg-[#F8F9FA] border border-black/10 text-[#4B5563] hover:bg-[#111827] hover:text-white hover:border-[#111827] font-bold px-4 py-2.5 rounded-[12px] text-xs transition-all shadow-sm disabled:opacity-50"
          >
            <Plus size={14} />
            Tambah Jasa
          </button>
        )}
      </div>

      {/* Card Body */}
      <div className="p-6 space-y-4">
        {/* Global feedback messages */}
        {globalError && (
          <div className="flex items-start gap-2.5 p-3.5 bg-rose-50 border border-rose-100 rounded-[12px]">
            <XCircle size={15} className="text-rose-500 mt-0.5 shrink-0" />
            <p className="text-xs font-semibold text-rose-600">{globalError}</p>
          </div>
        )}
        {globalSuccess && (
          <div className="flex items-start gap-2.5 p-3.5 bg-emerald-50 border border-emerald-100 rounded-[12px]">
            <CheckCircle2 size={15} className="text-emerald-500 mt-0.5 shrink-0" />
            <p className="text-xs font-semibold text-emerald-700">{globalSuccess}</p>
          </div>
        )}

        {/* Inline Add Form */}
        {isAdding && (
          <form
            onSubmit={handleAdd}
            className="flex gap-2 p-3 bg-[#F8F9FA] border border-[#2563EB]/30 rounded-[12px]"
          >
            <input
              type="text"
              autoFocus
              value={newServiceName}
              onChange={(e) => setNewServiceName(e.target.value)}
              placeholder="Contoh: Social Media Management"
              className="flex-1 px-4 py-2.5 bg-white border border-black/10 rounded-[10px] text-sm font-medium text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
              disabled={isPending}
            />
            <button
              type="submit"
              disabled={isPending || !newServiceName.trim()}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-[#2563EB] text-white rounded-[10px] text-xs font-bold hover:bg-[#1D4ED8] disabled:opacity-50 transition-colors shadow-sm"
            >
              {isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Check size={14} />
              )}
              Simpan
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAdding(false)
                setNewServiceName('')
              }}
              disabled={isPending}
              className="px-4 py-2.5 bg-white border border-black/10 text-[#4B5563] rounded-[10px] text-xs font-bold hover:bg-[#F8F9FA] transition-colors"
            >
              Batal
            </button>
          </form>
        )}

        {/* Empty State */}
        {services.length === 0 && !isAdding && (
          <div className="flex flex-col items-center justify-center py-10 text-center bg-[#F8F9FA] rounded-[14px] border border-dashed border-black/10">
            <Layers size={28} className="text-black/15 mb-3" />
            <p className="text-sm font-semibold text-[#4B5563]">
              Belum ada layanan yang ditambahkan.
            </p>
            <p className="text-xs text-[#9CA3AF] mt-1">
              Klik &ldquo;+ Tambah Jasa&rdquo; untuk mulai membuat daftar layanan Anda.
            </p>
          </div>
        )}

        {/* Service List */}
        <div className="space-y-2">
          {services.map((service) => (
            <div
              key={service.id}
              className="flex items-center justify-between p-4 bg-[#F8F9FA] border border-black/5 rounded-[12px] group hover:border-black/10 hover:shadow-sm transition-all"
            >
              {editingId === service.id ? (
                /* Inline Edit Row */
                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="text"
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleEditSubmit(service.id)
                      if (e.key === 'Escape') cancelEdit()
                    }}
                    className="flex-1 px-3 py-2 bg-white border border-[#2563EB] rounded-[8px] text-sm font-medium text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 transition-all"
                    disabled={isPending}
                  />
                  <button
                    onClick={() => handleEditSubmit(service.id)}
                    disabled={isPending || !editName.trim()}
                    className="p-2 bg-[#2563EB] text-white rounded-[8px] hover:bg-[#1D4ED8] disabled:opacity-50 transition-colors"
                    title="Simpan perubahan"
                  >
                    {isPending ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Check size={14} />
                    )}
                  </button>
                  <button
                    onClick={cancelEdit}
                    disabled={isPending}
                    className="p-2 bg-white border border-black/10 text-[#4B5563] rounded-[8px] hover:bg-[#F8F9FA] transition-colors"
                    title="Batalkan"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                /* Display Row */
                <>
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-[#2563EB] shrink-0" />
                    <span className="text-sm font-semibold text-[#111827]">
                      {service.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => startEdit(service)}
                      disabled={isPending}
                      className="p-1.5 text-[#4B5563] hover:bg-black/5 rounded-[6px] transition-colors"
                      title="Edit layanan"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(service)}
                      disabled={isPending}
                      className="p-1.5 text-rose-400 hover:bg-rose-50 hover:text-rose-600 rounded-[6px] transition-colors"
                      title="Hapus layanan"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Count badge */}
        {services.length > 0 && (
          <p className="text-[11px] text-[#9CA3AF] font-medium text-right pt-1">
            {services.length} layanan terdaftar
          </p>
        )}
      </div>
    </div>
  )
}
