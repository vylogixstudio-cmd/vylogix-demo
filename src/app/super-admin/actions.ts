'use server'

import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { registerAgencySchema } from '@/utils/validations'
import { randomBytes } from 'crypto'
import { logAudit, AUDIT_ACTIONS } from '@/utils/audit'

// ─────────────────────────────────────────────────────────────────────────────
// GUARD: Pastikan yang memanggil action ini adalah super_admin
//
// 📖 Kenapa perlu ini padahal middleware sudah jaga route /super-admin?
//    Middleware melindungi HALAMAN (UI).
//    Tapi Server Actions bisa dipanggil langsung via HTTP POST
//    tanpa melalui halaman — jadi kita perlu guard di sini juga.
//    Ini disebut "defense in depth" (pertahanan berlapis).
// ─────────────────────────────────────────────────────────────────────────────

async function requireSuperAdmin(): Promise<{ authorized: boolean; error: string | null }> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return { authorized: false, error: 'Sesi tidak valid.' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'super_admin') {
    return { authorized: false, error: 'Akses ditolak. Hanya Super Admin yang boleh melakukan tindakan ini.' }
  }

  return { authorized: true, error: null }
}

// ─────────────────────────────────────────────────────────────────────────────
// generateStrongPassword
//
// 📖 Kenapa pakai crypto.randomBytes bukan Math.random()?
//    Math.random() = "acak biasa" — bisa diprediksi oleh attacker
//    crypto.randomBytes() = "acak kriptografis" — tidak bisa diprediksi
//    Untuk password, WAJIB pakai yang kriptografis.
// ─────────────────────────────────────────────────────────────────────────────

function generateStrongPassword(length = 14): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  const bytes   = randomBytes(length)
  let password  = ''

  for (let i = 0; i < length; i++) {
    // Modulo bias diminimalkan karena charset.length (72) << 256
    password += charset[bytes[i] % charset.length]
  }

  return password
}

// ─────────────────────────────────────────────────────────────────────────────
// registerAgency — Onboarding agensi baru oleh Super Admin
// ─────────────────────────────────────────────────────────────────────────────

export async function registerAgency(formData: FormData) {
  // 🔒 Guard: hanya super_admin
  const { authorized, error: authError } = await requireSuperAdmin()
  if (!authorized) return { error: authError }

  const supabase = createAdminClient()

  const validation = registerAgencySchema.safeParse({
    agencyName: formData.get('agencyName'),
    ownerEmail: formData.get('ownerEmail'),
  })

  if (!validation.success) {
    return { error: validation.error.issues[0].message }
  }

  const { agencyName, ownerEmail } = validation.data

  const slug = agencyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')

  // Password kriptografis — TIDAK disimpan ke database
  const generatedPassword = generateStrongPassword()

  // 🚫 DEMO MODE: Intercept database mutations
  await new Promise(r => setTimeout(r, 500))
  return { error: '👀 Mode Demo: Tindakan ini disimulasikan dan tidak disimpan.' }

  try {
    // 1. Buat user baru di Supabase Auth
    const { data: authData, error: createError } = await supabase.auth.admin.createUser({
      email: ownerEmail,
      password: generatedPassword,
      email_confirm: true,
    })

    if (createError) return { error: createError.message }
    if (!authData.user) return { error: 'Gagal membuat akun baru.' }

    const newUserId = authData.user.id

    // 2. Buat organisasi dulu
    //    CATATAN: Tidak ada kolom temp_password — password hanya ditampilkan
    //    sekali di UI dan tidak disimpan ke database.
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .insert({ name: agencyName, slug, is_active: true })
      .select('id')
      .single()

    if (orgError) {
      // Rollback: hapus auth user jika org gagal dibuat
      await supabase.auth.admin.deleteUser(newUserId)
      return { error: 'Gagal membuat organisasi: ' + orgError.message }
    }

    // 3. Update profile user: jadikan admin, hubungkan ke org
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        role: 'admin',
        organization_id: orgData.id,
      })
      .eq('id', newUserId)

    if (profileError) {
      // Rollback
      await supabase.auth.admin.deleteUser(newUserId)
      await supabase.from('organizations').delete().eq('id', orgData.id)
      return { error: 'Gagal mengatur profil admin: ' + profileError.message }
    }

    // 4. Provision 3 layanan default
    const defaultServices = [
      { organization_id: orgData.id, name: 'Website' },
      { organization_id: orgData.id, name: 'Graphic Design' },
      { organization_id: orgData.id, name: 'Social Media Management' },
    ]

    const { error: srvError } = await supabase.from('agency_services').insert(defaultServices)
    if (srvError) {
      console.error('Gagal membuat layanan default:', srvError)
      // Non-fatal: lanjutkan saja, admin bisa tambah manual
    }

    revalidatePath('/super-admin')

    // 📝 Catat audit: agensi baru didaftarkan
    const { data: { user: superAdmin } } = await (await createClient()).auth.getUser()
    if (superAdmin) {
      await logAudit({
        organizationId: null, // Super admin tidak punya org sendiri
        actorId: superAdmin.id,
        actorEmail: superAdmin.email,
        action: AUDIT_ACTIONS.AGENCY_CREATE,
        targetType: 'agency',
        targetId: orgData.id,
        targetName: agencyName,
        metadata: { owner_email: ownerEmail, slug },
      })
    }

    // Password dikembalikan ke UI untuk ditampilkan SEKALI ke super admin
    return {
      success: true,
      agencyName,
      email: ownerEmail,
      password: generatedPassword,
    }

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Terjadi kesalahan internal.'
    return { error: msg }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// suspendAgency
// ─────────────────────────────────────────────────────────────────────────────

export async function suspendAgency(orgId: string, shouldSuspend: boolean) {
  const { authorized, error: authError } = await requireSuperAdmin()
  if (!authorized) return { error: authError }

  if (!orgId) return { error: 'ID organisasi tidak valid.' }

  const supabase = createAdminClient()

  // 🚫 DEMO MODE: Intercept database mutations
  await new Promise(r => setTimeout(r, 500))
  return { error: '👀 Mode Demo: Tindakan ini disimulasikan dan tidak disimpan.' }

  const { error } = await supabase
    .from('organizations')
    .update({ is_active: !shouldSuspend })
    .eq('id', orgId)

  if (error) return { error: error.message }

  // 📝 Catat audit: status suspend agensi berubah
  const { data: { user: superAdmin } } = await (await createClient()).auth.getUser()
  if (superAdmin) {
    await logAudit({
      organizationId: null,
      actorId: superAdmin.id,
      actorEmail: superAdmin.email,
      action: shouldSuspend ? AUDIT_ACTIONS.AGENCY_SUSPEND : AUDIT_ACTIONS.AGENCY_ACTIVATE,
      targetType: 'agency',
      targetId: orgId,
      metadata: { is_active: !shouldSuspend },
    })
  }

  revalidatePath('/super-admin')
  return { success: true }
}

// ─────────────────────────────────────────────────────────────────────────────
// updateLicenseExpiry
// ─────────────────────────────────────────────────────────────────────────────

export async function updateLicenseExpiry(
  orgId: string,
  expiryDate: string | null,
  autoSuspend: boolean,
) {
  const { authorized, error: authError } = await requireSuperAdmin()
  if (!authorized) return { error: authError }

  if (!orgId) return { error: 'ID organisasi tidak valid.' }

  const supabase = createAdminClient()

  // Jika auto_suspend aktif dan tanggal sudah lewat → langsung suspend
  let isActive: boolean | null = null
  if (autoSuspend && expiryDate) {
    if (new Date(expiryDate) < new Date()) {
      isActive = false
    }
  }

  const updatePayload: Record<string, unknown> = {
    license_expires_at: expiryDate || null,
    auto_suspend: autoSuspend,
  }

  if (isActive !== null) {
    updatePayload.is_active = isActive
  }

  // 🚫 DEMO MODE: Intercept database mutations
  await new Promise(r => setTimeout(r, 500))
  return { error: '👀 Mode Demo: Tindakan ini disimulasikan dan tidak disimpan.' }

  const { error } = await supabase
    .from('organizations')
    .update(updatePayload)
    .eq('id', orgId)

  if (error) return { error: error.message }

  revalidatePath('/super-admin')
  return { success: true, autoSuspended: isActive === false }
}

// ─────────────────────────────────────────────────────────────────────────────
// addAdminToAgency — Multi-Admin Model A
//
// Super admin bisa tambah admin baru ke agensi yang sudah ada.
// Admin baru punya akses penuh yang sama dengan admin pertama (Model A).
// ─────────────────────────────────────────────────────────────────────────────

export async function addAdminToAgency(
  orgId: string,
  email: string,
  fullName: string,
) {
  // 🔒 Guard: hanya super_admin
  const { authorized, error: authError } = await requireSuperAdmin()
  if (!authorized) return { error: authError }

  if (!orgId)                  return { error: 'ID organisasi tidak valid.' }
  if (!email?.trim())          return { error: 'Email tidak boleh kosong.' }
  if (!fullName?.trim())       return { error: 'Nama tidak boleh kosong.' }

  const supabase = createAdminClient()

  // Pastikan org ada
  const { data: org } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('id', orgId)
    .single()

  if (!org) return { error: 'Organisasi tidak ditemukan.' }

  // Generate password kriptografis
  const generatedPassword = generateStrongPassword(14)

  // 🚫 DEMO MODE: Intercept database mutations
  await new Promise(r => setTimeout(r, 500))
  return { error: '👀 Mode Demo: Tindakan ini disimulasikan dan tidak disimpan.' }

  // Buat user baru di Auth
  const { data: authData, error: createError } = await supabase.auth.admin.createUser({
    email: email.trim(),
    password: generatedPassword,
    email_confirm: true,
  })

  if (createError) {
    // User dengan email ini sudah ada
    if (createError.message.includes('already registered') || createError.status === 422) {
      return { error: `Email ${email} sudah terdaftar di sistem.` }
    }
    return { error: createError.message }
  }

  if (!authData.user) return { error: 'Gagal membuat akun.' }

  // Set role admin dan hubungkan ke org yang dipilih
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      full_name:       fullName.trim(),
      role:            'admin',
      organization_id: orgId,
    })
    .eq('id', authData.user.id)

  if (profileError) {
    // Rollback: hapus auth user jika profile gagal
    await supabase.auth.admin.deleteUser(authData.user.id)
    return { error: 'Gagal menyimpan profil admin baru.' }
  }

  // 📝 Audit log
  const { data: { user: superAdmin } } = await (await createClient()).auth.getUser()
  if (superAdmin) {
    await logAudit({
      organizationId: null,
      actorId:        superAdmin.id,
      actorEmail:     superAdmin.email,
      action:         AUDIT_ACTIONS.CLIENT_CREATE, // Re-use for now; can add ADMIN_CREATE constant later
      targetType:     'admin',
      targetId:       authData.user.id,
      targetName:     fullName.trim(),
      metadata:       { email: email.trim(), organization: org.name, organization_id: orgId },
    })
  }

  revalidatePath('/super-admin')

  return {
    success:      true,
    adminName:    fullName.trim(),
    email:        email.trim(),
    password:     generatedPassword,
    agencyName:   org.name,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// removeAdminFromAgency — Hapus admin dari agensi
//
// Hanya bisa dilakukan oleh super_admin.
// Admin yang dihapus profilenya di-unlink dari org (organization_id = null).
// ─────────────────────────────────────────────────────────────────────────────

export async function removeAdminFromAgency(adminUserId: string, orgId: string) {
  const { authorized, error: authError } = await requireSuperAdmin()
  if (!authorized) return { error: authError }

  if (!adminUserId || !orgId) return { error: 'Parameter tidak valid.' }

  const supabase = createAdminClient()

  // Verifikasi: user ini memang admin di org ini
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, role, organization_id')
    .eq('id', adminUserId)
    .eq('organization_id', orgId)
    .eq('role', 'admin')
    .single()

  if (!profile) return { error: 'Admin tidak ditemukan di organisasi ini.' }

  // 🚫 DEMO MODE: Intercept database mutations
  await new Promise(r => setTimeout(r, 500))
  return { error: '👀 Mode Demo: Tindakan ini disimulasikan dan tidak disimpan.' }

  // Hapus dari Supabase Auth sekalian (hard delete)
  const { error: deleteError } = await supabase.auth.admin.deleteUser(adminUserId)
  if (deleteError) return { error: deleteError.message }

  revalidatePath('/super-admin')
  return { success: true }
}

// ─────────────────────────────────────────────────────────────────────────────
// getProjectsByAgency
// ─────────────────────────────────────────────────────────────────────────────

export async function getProjectsByAgency(orgId: string) {
  const { authorized, error: authError } = await requireSuperAdmin()
  if (!authorized) return { error: authError }

  if (!orgId) return { error: 'ID organisasi tidak valid.' }

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('projects')
    .select(`
      id,
      title,
      skip_asset_cleanup,
      created_at,
      profiles:client_id (
        full_name,
        email
      )
    `)
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })

  if (error) return { error: error.message }
  return { projects: data }
}

// ─────────────────────────────────────────────────────────────────────────────
// toggleProjectRetention
// ─────────────────────────────────────────────────────────────────────────────

export async function toggleProjectRetention(projectId: string, currentStatus: boolean) {
  const { authorized, error: authError } = await requireSuperAdmin()
  if (!authorized) return { error: authError }

  if (!projectId) return { error: 'ID proyek tidak valid.' }

  const supabase = createAdminClient()

  // 🚫 DEMO MODE: Intercept database mutations
  await new Promise(r => setTimeout(r, 500))
  return { error: '👀 Mode Demo: Tindakan ini disimulasikan dan tidak disimpan.' }

  const { error } = await supabase
    .from('projects')
    .update({ skip_asset_cleanup: !currentStatus })
    .eq('id', projectId)

  if (error) return { error: error.message }

  // revalidatePath tidak perlu strict di sini karena fetching dari sisi client,
  // tapi kita bisa tetap sediakan.
  return { success: true, skip_asset_cleanup: !currentStatus }
}

