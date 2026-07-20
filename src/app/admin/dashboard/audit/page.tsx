import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Log Aktivitas | Vylogix CRM',
  description: 'Riwayat semua aktivitas yang terjadi di organisasi Anda.',
}

// ── Types ────────────────────────────────────────────────────────────────────

interface AuditLogEntry {
  id: string
  actor_email: string | null
  action: string
  target_type: string | null
  target_name: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatAction(action: string): { label: string; color: string } {
  const map: Record<string, { label: string; color: string }> = {
    'project.create':        { label: 'Buat Proyek',       color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
    'project.update_status': { label: 'Update Status',     color: 'text-blue-600 bg-blue-50 border-blue-100' },
    'project.update':        { label: 'Edit Proyek',       color: 'text-blue-600 bg-blue-50 border-blue-100' },
    'project.delete':        { label: 'Hapus Proyek',      color: 'text-rose-600 bg-rose-50 border-rose-100' },
    'client.create':         { label: 'Tambah Klien',      color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
    'client.delete':         { label: 'Hapus Klien',       color: 'text-rose-600 bg-rose-50 border-rose-100' },
    'revision.create':       { label: 'Kirim Revisi',      color: 'text-amber-600 bg-amber-50 border-amber-100' },
    'revision.reply':        { label: 'Balas Revisi',      color: 'text-blue-600 bg-blue-50 border-blue-100' },
    'asset.upload':          { label: 'Upload Aset',       color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
    'settings.update':       { label: 'Edit Pengaturan',   color: 'text-purple-600 bg-purple-50 border-purple-100' },
    'auth.password_change':  { label: 'Ganti Password',    color: 'text-purple-600 bg-purple-50 border-purple-100' },
    'agency.create':         { label: 'Daftar Agensi',     color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
    'agency.suspend':        { label: 'Suspend Agensi',    color: 'text-rose-600 bg-rose-50 border-rose-100' },
    'agency.activate':       { label: 'Aktifkan Agensi',   color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
    'agency.license_update': { label: 'Update Lisensi',    color: 'text-amber-600 bg-amber-50 border-amber-100' },
  }
  return map[action] ?? { label: action, color: 'text-gray-600 bg-gray-50 border-gray-100' }
}

function formatTargetType(type: string | null): string {
  const map: Record<string, string> = {
    project: 'Proyek',
    client:  'Klien',
    agency:  'Agensi',
    revision:'Revisi',
    asset:   'Aset',
  }
  return type ? (map[type] ?? type) : '—'
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function AuditLogPage() {
  const supabaseAuth = await createClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()

  if (!user) redirect('/login')

  const supabaseAdmin = createAdminClient()

  // Get org ID from profile using the admin client (bypassing RLS to ensure we fetch it)
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.organization_id || profile.role !== 'admin') {
    redirect('/admin/dashboard')
  }

  // Fetch the last 100 audit log entries for this org using admin client
  const { data: logs, error: logsError } = await supabaseAdmin
    .from('audit_logs')
    .select('id, actor_email, action, target_type, target_name, metadata, created_at')
    .eq('organization_id', profile.organization_id)
    .order('created_at', { ascending: false })
    .limit(100)

  if (logsError) {
    console.error('Failed to fetch audit logs:', logsError)
  }

  const auditLogs: AuditLogEntry[] = (logs ?? []) as AuditLogEntry[]

  return (
    <div className="min-h-screen bg-[#F8F9FA] p-4 sm:p-8">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8 bg-white p-6 rounded-[20px] shadow-sm border border-black/5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#EFF6FF] rounded-[16px] text-[#2563EB]">
              {/* Clipboard icon - raw SVG */}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6" aria-hidden="true">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
              </svg>
            </div>
            <div>
              <h1 className="font-extrabold text-2xl text-[#111827] font-['Plus_Jakarta_Sans']">
                Log Aktivitas
              </h1>
              <p className="text-[#4B5563] text-sm mt-0.5">
                Riwayat 100 aktivitas terakhir di organisasi Anda.
              </p>
            </div>
          </div>
          <Link
            href="/admin/dashboard"
            className="flex items-center gap-2 text-xs font-bold text-[#4B5563] hover:text-[#111827] px-5 py-2.5 border border-black/10 rounded-[12px] hover:bg-black/5 transition-all shadow-sm bg-white self-start sm:self-auto"
          >
            ← Kembali ke Dasbor
          </Link>
        </div>

        {/* Log Table */}
        <div className="bg-white rounded-[20px] shadow-sm border border-black/5 overflow-hidden">
          {auditLogs.length === 0 ? (
            <div className="p-16 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#F8F9FA] border border-black/5 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-[#9CA3AF]" aria-hidden="true">
                  <path d="M9 11l3 3L22 4" />
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
              </div>
              <p className="font-bold text-[#111827] mb-1">Belum Ada Aktivitas</p>
              <p className="text-sm text-[#6B7280]">
                Log akan muncul di sini setelah ada aksi pertama yang dicatat.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[640px]">
                <thead>
                  <tr className="border-b border-black/5 text-[10px] font-bold uppercase tracking-wider text-[#6B7280] bg-[#F8F9FA]/70">
                    <th className="py-3 px-5">Waktu</th>
                    <th className="py-3 px-5">Aksi</th>
                    <th className="py-3 px-5">Target</th>
                    <th className="py-3 px-5">Dilakukan Oleh</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => {
                    const { label, color } = formatAction(log.action)
                    return (
                      <tr
                        key={log.id}
                        className="border-b border-black/5 last:border-0 hover:bg-[#F8F9FA]/50 transition-colors"
                      >
                        {/* Waktu */}
                        <td className="py-3.5 px-5 whitespace-nowrap">
                          <p className="text-xs font-semibold text-[#111827]" suppressHydrationWarning>
                            {new Date(log.created_at).toLocaleDateString('id-ID', {
                              day: 'numeric', month: 'short', year: 'numeric',
                            })}
                          </p>
                          <p className="text-[10px] text-[#9CA3AF] mt-0.5" suppressHydrationWarning>
                            {new Date(log.created_at).toLocaleTimeString('id-ID', {
                              hour: '2-digit', minute: '2-digit', second: '2-digit',
                            })}
                          </p>
                        </td>

                        {/* Aksi */}
                        <td className="py-3.5 px-5">
                          <span className={`inline-block px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md border ${color}`}>
                            {label}
                          </span>
                        </td>

                        {/* Target */}
                        <td className="py-3.5 px-5">
                          {log.target_name ? (
                            <>
                              <p className="text-xs font-semibold text-[#111827] truncate max-w-[200px]">
                                {log.target_name}
                              </p>
                              <p className="text-[10px] text-[#9CA3AF] mt-0.5">
                                {formatTargetType(log.target_type)}
                              </p>
                            </>
                          ) : (
                            <span className="text-xs text-[#9CA3AF]">—</span>
                          )}
                        </td>

                        {/* Aktor */}
                        <td className="py-3.5 px-5">
                          <p className="text-xs font-medium text-[#4B5563] truncate max-w-[200px]">
                            {log.actor_email ?? 'Sistem'}
                          </p>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-center text-[11px] text-[#9CA3AF] mt-6">
          Menampilkan maksimal 100 entri terbaru. Data disimpan secara permanen.
        </p>
      </div>
    </div>
  )
}
