import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, Settings } from 'lucide-react'
import type { Metadata } from 'next'

import OrgProfileForm from './OrgProfileForm'
import AgencyServicesCard from './AgencyServicesCard'
import ChangePasswordCard from './ChangePasswordCard'

// ── Types ────────────────────────────────────────────────────────────────────

interface Organization {
  id: string
  name: string
  tagline: string | null
  logo_url: string | null
  whatsapp_number: string | null
}

interface AgencyService {
  id: string
  name: string
  organization_id: string
}

// ── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: 'Pengaturan Agensi | Vylogix CRM',
  description: 'Kelola profil, branding, dan layanan agensi Anda di Vylogix CRM.',
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function SettingsPage() {
  // ── Auth Check ──────────────────────────────────────────────────────────────
  const supabaseAuth = await createClient()
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // ── Data Fetching ───────────────────────────────────────────────────────────
  // Use admin client so RLS never blocks data retrieval on this server component
  const supabase = createAdminClient()

  // 1. Fetch organization via admin's profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!profile?.organization_id) {
    // Admin belum memiliki organisasi yang terdaftar → kembalikan ke login
    redirect('/login')
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('id, name, tagline, logo_url, whatsapp_number, log_retention_days')
    .eq('id', profile.organization_id)
    .single()

  if (!org) {
    redirect('/login')
  }

  // 2. Fetch agency services for this organization
  const { data: servicesRaw } = await supabase
    .from('agency_services')
    .select('id, name, organization_id')
    .eq('organization_id', org.id)
    .order('name', { ascending: true })

  const services: AgencyService[] = (servicesRaw as AgencyService[] | null) ?? []

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F8F9FA] p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">

        {/* ── Page Header ──────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8 bg-white p-6 rounded-[20px] shadow-sm border border-black/5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#EFF6FF] rounded-[16px] text-[#2563EB]">
              <Settings size={26} />
            </div>
            <div>
              <h1 className="font-extrabold text-2xl text-[#111827] font-['Plus_Jakarta_Sans']">
                Pengaturan Agensi
              </h1>
              <p className="text-[#4B5563] text-sm mt-0.5">
                Konfigurasi profil, branding, dan layanan operasional.
              </p>
            </div>
          </div>

          <Link
            href="/admin/dashboard"
            className="flex items-center gap-2 text-xs font-bold text-[#4B5563] hover:text-[#111827] px-5 py-2.5 border border-black/10 rounded-[12px] hover:bg-black/5 transition-all shadow-sm bg-white self-start sm:self-auto"
          >
            <LayoutDashboard size={15} />
            Kembali ke Dasbor
          </Link>
        </div>

        {/* ── Cards Layout ─────────────────────────────────────────────────── */}
        <div className="space-y-6">

          {/* CARD 1: Org Profile & Branding */}
          <OrgProfileForm
            orgId={org.id}
            initialName={org.name}
            initialTagline={org.tagline ?? 'Bridging Design and Code'}
            initialLogoUrl={org.logo_url}
            initialLogRetentionDays={org.log_retention_days ?? 30}
          />

          {/* CARD 2: Agency Services Management */}
          <AgencyServicesCard
            services={services}
            organizationId={org.id}
          />

          {/* CARD 3: Keamanan & Ubah Password */}
          <ChangePasswordCard />

        </div>

        {/* ── Footer spacer ─────────────────────────────────────────────────── */}
        <div className="h-12" />
      </div>
    </div>
  )
}
