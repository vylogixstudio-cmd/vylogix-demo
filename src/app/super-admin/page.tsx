import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import SuperAdminForm from './SuperAdminForm'
import AgenciesList from './AgenciesList'
import { Crown, LogOut, Building2, Users, Layers, Ban, CheckCircle } from 'lucide-react'
import { logout } from '@/app/login/actions'
import { createAdminClient } from '@/utils/supabase/admin'

// ── Types ──────────────────────────────────────────────────────────────────────

interface AgencyService {
  id: string
  name: string
  organization_id: string
}

interface EnrichedAgency {
  id: string
  name: string
  slug: string
  owner_id: string
  created_at: string
  is_active: boolean | null
  license_expires_at: string | null
  auto_suspend: boolean | null
  temp_password: string | null
  profiles: { email: string | undefined }
  projectCount: number
  services: AgencyService[]
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function SuperAdminDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/')

  // Verify super_admin role
  const supabaseAdmin = createAdminClient()
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'super_admin' && profile.role !== 'superadmin')) {
    redirect('/admin/dashboard')
  }

  // ── Fetch base org list ────────────────────────────────────────────────────
  const { data: orgs } = await supabaseAdmin
    .from('organizations')
    .select('*')
    .order('created_at', { ascending: false })

  let agencies: EnrichedAgency[] = []

  if (orgs && orgs.length > 0) {
    const orgIds = orgs.map((a) => a.id).filter(Boolean)

    // Parallel fetch: admin emails + project counts + services + total clients
    const [profilesResult, projectCountsResult, servicesResult, totalClientsResult] = await Promise.all([
      orgIds.length > 0
        ? supabaseAdmin.from('profiles').select('email, organization_id').in('organization_id', orgIds).eq('role', 'admin')
        : Promise.resolve({ data: [] }),
      orgIds.length > 0
        ? supabaseAdmin.from('projects').select('organization_id').in('organization_id', orgIds)
        : Promise.resolve({ data: [] }),
      orgIds.length > 0
        ? supabaseAdmin
            .from('agency_services')
            .select('id, name, organization_id')
            .in('organization_id', orgIds)
            .order('name', { ascending: true })
        : Promise.resolve({ data: [] }),
      supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'client')
    ])

    const profilesData = profilesResult.data ?? []
    const projectRows = projectCountsResult.data ?? []
    const servicesData = (servicesResult.data ?? []) as AgencyService[]
    var totalClients = totalClientsResult.count ?? 0

    agencies = orgs.map((a) => ({
      ...a,
      profiles: { email: profilesData.find((p) => p.organization_id === a.id)?.email },
      projectCount: projectRows.filter((p) => p.organization_id === a.id).length,
      services: servicesData.filter((s) => s.organization_id === a.id),
    })) as EnrichedAgency[]
  } else {
    var totalClients = 0
  }

  // ── Metrics Calculation ────────────────────────────────────────────────────
  const totalAgencies = agencies.length
  let activeAgencies = 0
  let suspendedAgencies = 0
  let totalProjects = 0

  agencies.forEach((a) => {
    totalProjects += a.projectCount
    const isExpired = a.license_expires_at ? new Date() > new Date(a.license_expires_at) : false
    const isSuspended = a.is_active === false || (a.auto_suspend && isExpired)
    
    if (isSuspended) {
      suspendedAgencies++
    } else {
      activeAgencies++
    }
  })

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F8F9FA] pt-16 px-4 sm:px-8 pb-10 font-sans">
      <div className="max-w-7xl mx-auto mt-6">

        {/* ── Header Super Admin ─────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8 mt-2 bg-[#111827] p-6 sm:p-7 rounded-[20px] shadow-lg border border-white/5 text-white">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-amber-500/20 rounded-[16px] text-amber-400 border border-amber-500/20 shrink-0">
              <Crown size={30} />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="font-extrabold text-2xl font-['Plus_Jakarta_Sans']">God Mode</h1>
                <span className="px-2 py-1 bg-amber-500 text-amber-950 text-[10px] font-extrabold uppercase tracking-widest rounded-md">
                  SUPER ADMIN
                </span>
              </div>
              <p className="text-white/60 text-sm mt-1">Pusat Kendali Multi-Tenant Vylogix SaaS</p>
            </div>
          </div>

          <form action={logout}>
            <button
              type="submit"
              className="flex items-center gap-2 text-xs font-bold text-white/70 hover:text-white px-5 py-2.5 border border-white/10 rounded-[12px] hover:bg-white/5 transition-all self-start sm:self-auto"
            >
              <LogOut size={16} /> Keluar dari God Mode
            </button>
          </form>
        </div>

        {/* ── Analytics Dashboard ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-6 rounded-[20px] shadow-sm border border-black/5 flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-[#6B7280] text-xs font-bold uppercase tracking-wider mb-1">Total Agensi</p>
                <h3 className="text-3xl font-extrabold text-[#111827]">{totalAgencies}</h3>
              </div>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-[14px]">
                <Building2 size={24} />
              </div>
            </div>
            <div className="text-xs text-[#6B7280] font-medium flex gap-2">
              <span className="flex items-center gap-1 text-emerald-600"><CheckCircle size={14}/> {activeAgencies} Aktif</span>
              <span className="text-gray-300">|</span>
              <span className="flex items-center gap-1 text-rose-600"><Ban size={14}/> {suspendedAgencies} Suspended</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-[20px] shadow-sm border border-black/5 flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-[#6B7280] text-xs font-bold uppercase tracking-wider mb-1">Total Proyek</p>
                <h3 className="text-3xl font-extrabold text-[#111827]">{totalProjects}</h3>
              </div>
              <div className="p-3 bg-purple-50 text-purple-600 rounded-[14px]">
                <Layers size={24} />
              </div>
            </div>
            <p className="text-xs text-[#6B7280] font-medium">Proyek dari seluruh agensi</p>
          </div>

          <div className="bg-white p-6 rounded-[20px] shadow-sm border border-black/5 flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-[#6B7280] text-xs font-bold uppercase tracking-wider mb-1">Total Klien</p>
                <h3 className="text-3xl font-extrabold text-[#111827]">{totalClients}</h3>
              </div>
              <div className="p-3 bg-amber-50 text-amber-600 rounded-[14px]">
                <Users size={24} />
              </div>
            </div>
            <p className="text-xs text-[#6B7280] font-medium">End-client dari seluruh agensi</p>
          </div>

          <div className="bg-white p-6 rounded-[20px] shadow-sm border border-black/5 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-teal-50 opacity-50 pointer-events-none"></div>
            <div className="flex justify-between items-start mb-4 relative z-10">
              <div>
                <p className="text-[#6B7280] text-xs font-bold uppercase tracking-wider mb-1">System Status</p>
                <h3 className="text-2xl font-extrabold text-emerald-600">All Good</h3>
              </div>
              <div className="p-3 bg-emerald-100 text-emerald-600 rounded-[14px]">
                <Crown size={24} />
              </div>
            </div>
            <p className="text-xs text-[#6B7280] font-medium relative z-10">Server & Database running smoothly</p>
          </div>
        </div>

        {/* ── Main content ───────────────────────────────────────────────── */}
        <div className="space-y-6">
          {/* Register Form */}
          <div className="w-full">
            <SuperAdminForm />
          </div>

          {/* Agencies Table */}
          <div className="bg-white rounded-[20px] shadow-sm border border-black/5 overflow-hidden">
            <div className="p-6 border-b border-black/5 bg-[#F8F9FA]/60 flex justify-between items-center">
              <h2 className="font-extrabold text-lg text-[#111827] flex items-center gap-2">
                <Building2 className="text-[#2563EB]" size={20} />
                Agensi Terdaftar
              </h2>
              <span className="px-3 py-1 bg-[#EFF6FF] text-[#2563EB] text-xs font-bold rounded-full">
                {agencies.length} Total Tenant
              </span>
            </div>
            <AgenciesList agencies={agencies} />
          </div>
        </div>

        <p className="text-center text-xs text-[#6B7280] mt-10">
          Anda sedang mengakses area terlarang. Segala perubahan di sini bersifat absolut.
        </p>
      </div>
    </div>
  )
}
