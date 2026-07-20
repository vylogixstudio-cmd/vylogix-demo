'use client'

import { useEffect, useState, useTransition } from 'react'
import { getProjectsByAgency, toggleProjectRetention } from './actions'
import { Loader2, ToggleLeft, ToggleRight, HardDrive } from 'lucide-react'

interface Project {
  id: string
  title: string
  skip_asset_cleanup: boolean
  created_at: string
  profiles: {
    full_name: string | null
    email: string | null
  } | null
}

export default function AgencyProjects({ organizationId }: { organizationId: string }) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    let isMounted = true
    const fetchProjects = async () => {
      setLoading(true)
      const res = await getProjectsByAgency(organizationId)
      if (isMounted) {
        if (res.error) {
          setError(res.error)
        } else {
          setProjects(res.projects || [])
        }
        setLoading(false)
      }
    }
    fetchProjects()

    return () => {
      isMounted = false
    }
  }, [organizationId])

  const handleToggle = (projectId: string, currentStatus: boolean) => {
    startTransition(async () => {
      const res = await toggleProjectRetention(projectId, currentStatus)
      if (!res.error) {
        setProjects(prev =>
          prev.map(p =>
            p.id === projectId
              ? { ...p, skip_asset_cleanup: !currentStatus }
              : p
          )
        )
      } else {
        alert('Gagal mengubah retensi aset: ' + res.error)
      }
    })
  }

  if (loading) {
    return (
      <div className="flex justify-center p-6 border border-black/8 rounded-[14px] bg-[#F8F9FA]">
        <Loader2 className="animate-spin text-[#2563EB]" size={24} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 border border-rose-200 bg-rose-50 text-rose-600 rounded-[14px] text-sm font-semibold">
        {error}
      </div>
    )
  }

  return (
    <div className="border border-black/8 rounded-[14px] overflow-hidden">
      <div className="p-4 border-b border-black/5 bg-[#F8F9FA]/60">
        <h3 className="text-sm font-bold text-[#111827] flex items-center gap-1.5">
          <HardDrive size={16} className="text-[#2563EB]" />
          Daftar Proyek & Retensi Aset
        </h3>
        <p className="text-[11px] text-[#6B7280] mt-1">
          Jika toggle aktif, aset proyek tidak akan dihapus otomatis oleh sistem setelah 30 hari.
        </p>
      </div>

      <div className="max-h-60 overflow-y-auto">
        {projects.length > 0 ? (
          <ul className="divide-y divide-black/5">
            {projects.map(project => (
              <li key={project.id} className="p-4 flex items-center justify-between hover:bg-[#F8F9FA] transition-colors">
                <div className="min-w-0 pr-4">
                  <p className="text-sm font-bold text-[#111827] truncate">{project.title}</p>
                  <p className="text-xs text-[#6B7280] truncate mt-0.5">
                    Klien: {project.profiles?.full_name || project.profiles?.email || '—'}
                  </p>
                  <p className="text-[10px] text-[#9CA3AF] mt-0.5">
                    Dibuat: {new Date(project.created_at).toLocaleDateString('id-ID')}
                  </p>
                </div>
                
                <div className="flex flex-col items-end shrink-0 gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#4B5563]">
                    Simpan Selamanya
                  </span>
                  <button
                    type="button"
                    onClick={() => handleToggle(project.id, project.skip_asset_cleanup)}
                    disabled={isPending}
                    className={`transition-colors disabled:opacity-50 ${project.skip_asset_cleanup ? 'text-[#2563EB]' : 'text-[#9CA3AF]'}`}
                    aria-label="Toggle Asset Retention"
                  >
                    {project.skip_asset_cleanup ? (
                      <ToggleRight size={32} />
                    ) : (
                      <ToggleLeft size={32} />
                    )}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-6 text-center text-sm text-[#6B7280] italic">
            Belum ada proyek di agensi ini.
          </div>
        )}
      </div>
    </div>
  )
}
