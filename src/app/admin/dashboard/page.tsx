import { createClient } from '@/utils/supabase/server'
import { logout } from '@/app/login/actions'
import { updateProjectStatus } from './actions'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LogOut, LayoutDashboard, Briefcase } from 'lucide-react'
import CreateProjectModal from '@/components/CreateProjectModal'
import CreateClientModal from '@/components/CreateClientModal'
import WebhookSettingsModal from '@/components/WebhookSettingsModal'
import { Settings } from 'lucide-react'

import { createAdminClient } from '@/utils/supabase/admin'

export default async function AdminDashboard() {
  const supabaseAuth = await createClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()

  const supabase = createAdminClient()

  // Org data: fetch name and logo for dynamic header branding.
  let currentOrgId: string | null = null
  let orgName = ''
  let orgLogoUrl: string | null = null
  let currentWebhookUrl: string | null = null

  if (user) {
    // 1. Get the admin's profile to find their organization_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (profile?.organization_id) {
      // 2. Fetch the organization details
      const { data: org } = await supabase
        .from('organizations')
        .select('id, name, logo_url, is_active, auto_suspend, license_expires_at, webhook_url')
        .eq('id', profile.organization_id)
        .single()

      const isExpired = org?.license_expires_at ? new Date() > new Date(org.license_expires_at) : false
      // Jika org tidak ada (karena query error akibat missing column, dll), kita tidak suspend,
      // kita biarkan nilai default tapi berikan console error.
      if (!org) {
        console.error("Organization data missing or query failed. Check database schema for webhook_url.")
      } else if (org.is_active === false || (org.auto_suspend && isExpired)) {
        redirect('/suspended')
      }

      currentOrgId = org?.id ?? currentOrgId
      orgName = org?.name ?? orgName
      orgLogoUrl = org?.logo_url ?? orgLogoUrl
      currentWebhookUrl = org?.webhook_url ?? null
    }
    // Jika tidak ditemukan: biarkan nilai default, dashboard tetap dapat diakses.
    // Admin harus didaftarkan dulu lewat Super Admin.
  }

  let projectsQuery = supabase
    .from('projects')
    .select(`
      *,
      profiles:client_id (full_name, email)
    `)
    .order('created_at', { ascending: false })

  if (currentOrgId) {
    projectsQuery = projectsQuery.eq('organization_id', currentOrgId)
  } else {
    // Fallback if the user has no organization
    projectsQuery = projectsQuery.eq('organization_id', '00000000-0000-0000-0000-000000000000')
  }

  const { data: projects } = await projectsQuery

  // Kalkulasi Finansial
  let totalIncome = 0
  let totalReceivables = 0

  projects?.forEach(proj => {
    totalIncome += Number(proj.dp_paid || 0)
    
    const diff = Number(proj.total_price || 0) - Number(proj.dp_paid || 0)
    if (diff > 0) {
      totalReceivables += diff
    }
  })

  const { count: clientsCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact' })
    .eq('role', 'client')
    .eq('organization_id', currentOrgId)

  // Fetch all clients for the dropdown in Modal
  const { data: clientsList } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('role', 'client')
    .eq('organization_id', currentOrgId)
    .order('created_at', { ascending: false })

  // Fetch services for the active organization
  const { data: servicesList } = await supabase
    .from('agency_services')
    .select('id, name, organization_id')
    .eq('organization_id', currentOrgId)
    .order('name', { ascending: true })

  async function handleUpdate(formData: FormData) {
    'use server'
    const id = formData.get('id') as string
    const status = formData.get('status') as string
    const progress = parseInt(formData.get('progress') as string) || 0
    await updateProjectStatus(id, status, progress)
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8 bg-white p-6 rounded-[20px] shadow-sm border border-black/5">
          <div className="flex items-center gap-4">
            {/* Agency Logo — shown only when available */}
            {orgLogoUrl ? (
              <div className="w-12 h-12 rounded-[16px] overflow-hidden border border-black/5 bg-[#F8F9FA] flex items-center justify-center shrink-0 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={orgLogoUrl}
                  alt={`Logo ${orgName}`}
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="p-3 bg-[#EFF6FF] rounded-[16px] text-[#2563EB]">
                <LayoutDashboard size={28} />
              </div>
            )}
            <div>
              <h1 className="font-extrabold text-2xl text-[#111827] font-['Plus_Jakarta_Sans']">Admin Dashboard</h1>
              <p className="text-[#4B5563] text-sm mt-1">Sistem Manajemen {orgName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin/dashboard/audit" className="flex items-center gap-2 text-xs font-bold text-[#4B5563] hover:text-[#2563EB] px-4 py-2.5 border border-black/10 rounded-[12px] hover:bg-blue-50 hover:border-blue-200 transition-all shadow-sm bg-[#F8F9FA]">
              {/* Clipboard icon */}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden="true">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
              </svg>
              Log
            </Link>
            <Link href="/admin/dashboard/settings" className="flex items-center gap-2 text-xs font-bold text-[#4B5563] hover:text-[#2563EB] px-5 py-2.5 border border-black/10 rounded-[12px] hover:bg-blue-50 hover:border-blue-200 transition-all shadow-sm bg-[#F8F9FA]">
              <Settings size={16} /> Pengaturan
            </Link>
            <WebhookSettingsModal currentUrl={currentWebhookUrl} />
            <form action={logout}>
              <button type="submit" className="flex items-center gap-2 text-xs font-bold text-[#4B5563] hover:text-rose-500 px-5 py-2.5 border border-black/10 rounded-[12px] hover:bg-rose-50 hover:border-rose-200 transition-all shadow-sm bg-[#F8F9FA]">
                <LogOut size={16} /> Logout System
              </button>
            </form>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-5 rounded-[20px] shadow-sm border border-black/5">
            <p className="text-xs font-bold uppercase text-[#4B5563] tracking-wider mb-2">Total Proyek</p>
            <p className="text-3xl font-extrabold text-[#2563EB]">{projects?.length || 0}</p>
          </div>
          <div className="bg-white p-5 rounded-[20px] shadow-sm border border-black/5">
            <p className="text-xs font-bold uppercase text-[#4B5563] tracking-wider mb-2">Total Klien</p>
            <p className="text-3xl font-extrabold text-[#111827]">{clientsCount || 0}</p>
          </div>
          <div className="bg-white p-5 rounded-[20px] shadow-sm border border-black/5">
            <p className="text-xs font-bold uppercase text-[#4B5563] tracking-wider mb-2">Total Pemasukan</p>
            <p className="text-2xl font-extrabold text-emerald-600">Rp {totalIncome.toLocaleString('id-ID')}</p>
          </div>
          <div className="bg-white p-5 rounded-[20px] shadow-sm border border-black/5">
            <p className="text-xs font-bold uppercase text-[#4B5563] tracking-wider mb-2">Total Piutang</p>
            <p className="text-2xl font-extrabold text-amber-600">Rp {totalReceivables.toLocaleString('id-ID')}</p>
          </div>
        </div>

        {/* Kanban / Project List */}
        <div className="bg-white rounded-[20px] border border-black/5 shadow-sm overflow-hidden flex flex-col h-full min-h-[500px]">
          <div className="p-6 border-b border-black/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h3 className="font-bold text-lg text-[#111827] flex items-center gap-2">
              <Briefcase size={20} className="text-[#2563EB]" /> Semua Proyek
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              <CreateClientModal />
              <CreateProjectModal clients={clientsList || []} services={servicesList || []} />
            </div>
          </div>
          
          <div className="overflow-x-auto p-2">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-black/5 text-[11px] font-bold uppercase tracking-wider text-[#4B5563] bg-[#F8F9FA]/50">
                  <th className="py-3 px-4 rounded-tl-[12px]">Klien & Proyek</th>
                  <th className="py-3 px-4">Tipe Jasa</th>
                  <th className="py-3 px-4">Harga / Status Pembayaran</th>
                  <th className="py-3 px-4">Progress (%)</th>
                  <th className="py-3 px-4">Tahapan (Status)</th>
                  <th className="py-3 px-4 text-right rounded-tr-[12px]">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {projects?.map((proj) => (
                  <tr key={proj.id} className="border-b border-black/5 last:border-0 hover:bg-[#F8F9FA] transition-colors relative group">
                    <td className="py-4 px-4">
                      <Link href={`/admin/dashboard/project/${proj.id}`} className="absolute inset-0 z-0" aria-label={`Detail Proyek ${proj.title}`}></Link>
                      <div className="font-extrabold text-[#111827] relative z-10">{proj.title}</div>
                      <div className="text-xs font-medium text-[#4B5563] mt-1 relative z-10">👤 {proj.profiles?.full_name || 'Klien'}</div>
                      <div className="text-[11px] font-medium text-[#6B7280] mt-0.5 relative z-10 flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                          <path d="M3 4a2 2 0 00-2 2v8a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2H3zm1 2h12l-6 3.75L4 6z" />
                        </svg>
                        {proj.profiles?.email}
                      </div>
                    </td>
                    <td className="py-4 px-4 relative z-10">
                      <span className="px-2.5 py-1 bg-[#EFF6FF] text-[#2563EB] text-[10px] font-bold uppercase tracking-wider rounded-md">
                        {proj.service_type}
                      </span>
                    </td>
                    <td className="py-4 px-4 relative z-10">
                      <div className="text-sm font-bold text-[#111827]">Rp {proj.total_price.toLocaleString('id-ID')}</div>
                      <div className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${proj.payment_status === 'paid' ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {proj.payment_status}
                      </div>
                    </td>
                    <td className="py-4 px-4 relative z-10">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-black/5 rounded-full overflow-hidden">
                          <div className="h-full bg-[#2563EB] rounded-full" style={{ width: `${proj.progress_percentage}%` }}></div>
                        </div>
                        <span className="text-xs font-bold text-[#4B5563]">{proj.progress_percentage}%</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 relative z-10">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#4B5563]">{proj.status}</span>
                    </td>
                    <td className="py-4 px-4 text-right relative z-10">
                      <Link href={`/admin/dashboard/project/${proj.id}`} className="bg-white border border-black/10 hover:bg-[#F8F9FA] text-[#111827] font-bold px-4 py-2 rounded-[8px] text-xs transition-all shadow-sm whitespace-nowrap">
                        Kelola
                      </Link>
                    </td>
                  </tr>
                ))}

                {(!projects || projects.length === 0) && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[#4B5563] font-medium text-sm">
                      Belum ada proyek klien. Tambahkan pengguna klien baru di Dashboard Supabase Auth.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
