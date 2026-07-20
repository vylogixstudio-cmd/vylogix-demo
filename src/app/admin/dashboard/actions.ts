'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'
import { logAudit, AUDIT_ACTIONS } from '@/utils/audit'
import { sendProjectCompletedEmail } from '@/utils/email'

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Ambil data user yang sedang login + organization_id mereka
//
// 📖 Kenapa ini penting?
//    Setiap server action yang ubah data WAJIB tahu:
//    1. Siapa yang request (user ID)
//    2. Mereka dari agency mana (organization_id)
//    Tanpa ini, kita tidak bisa memverifikasi kepemilikan data.
// ─────────────────────────────────────────────────────────────────────────────

export async function getAuthenticatedUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return { user: null, orgId: null, error: 'Sesi tidak valid. Silakan login kembali.' }
  }

  // Ambil organization_id dari profil user yang sedang login
  // (Admin sudah punya organization_id yang di-set saat registerAgency)
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.organization_id) {
    return { user: null, orgId: null, error: 'Akun ini belum terhubung ke organisasi manapun.' }
  }

  return { user, orgId: profile.organization_id, error: null }
}

// ─────────────────────────────────────────────────────────────────────────────
// updateWebhookUrl
// ─────────────────────────────────────────────────────────────────────────────

export async function updateWebhookUrl(formData: FormData) {
  const { user, orgId, error: authError } = await getAuthenticatedUser()
  if (authError || !user || !orgId) return { error: authError }

  const webhookUrl = (formData.get('webhookUrl') as string)?.trim() || null
  
  if (webhookUrl) {
    if (!webhookUrl.startsWith('https://')) {
      return { error: 'URL Webhook wajib menggunakan protokol https://' }
    }
    // Block localhost, local IPs, and Cloud Metadata IPs (SSRF protection)
    const localIpPattern = /^(https?:\/\/)(localhost|127\.0\.0\.1|0\.0\.0\.0|::1|192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])|169\.254\.)/i
    if (localIpPattern.test(webhookUrl)) {
      return { error: 'URL Webhook tidak boleh menggunakan IP lokal, localhost, atau IP metadata.' }
    }
    try {
      new URL(webhookUrl) // check if parseable
    } catch {
      return { error: 'Format URL Webhook tidak valid.' }
    }
  }

  // 🚫 DEMO MODE: Intercept database mutations
  await new Promise(r => setTimeout(r, 500))
  return { error: '👀 Mode Demo: Tindakan ini disimulasikan dan tidak disimpan.' }

  const supabaseAdmin = createAdminClient()
  
  const { error } = await supabaseAdmin
    .from('organizations')
    .update({ webhook_url: webhookUrl })
    .eq('id', orgId)

  if (error) {
    return { error: 'Gagal menyimpan URL Webhook: ' + (error?.message || 'Unknown error') }
  }

  revalidatePath('/admin/dashboard')
  
  // 📝 Catat aksi: webhook diubah
  await logAudit({
    organizationId: orgId,
    actorId: user.id,
    actorEmail: user.email || '',
    action: 'UPDATE_WEBHOOK',
    targetType: 'organization',
    targetId: orgId,
    targetName: 'Webhook Settings',
    metadata: { webhookUrl },
  })

  return { success: true }
}

// ─────────────────────────────────────────────────────────────────────────────
// createClientAccount
// ─────────────────────────────────────────────────────────────────────────────

export async function createClientAccount(formData: FormData) {
  const { user, orgId, error: authError } = await getAuthenticatedUser()
  if (authError || !user || !orgId) return { error: authError }

  const email    = (formData.get('email')    as string)?.trim()
  const password = (formData.get('password') as string)
  const fullName = (formData.get('fullName') as string)?.trim()

  if (!email || !password || !fullName) {
    return { error: 'Semua field wajib diisi.' }
  }

  // 🚫 DEMO MODE: Intercept database mutations
  await new Promise(r => setTimeout(r, 500))
  return { error: '👀 Mode Demo: Tindakan ini disimulasikan dan tidak disimpan.' }

  const supabaseAdmin = createAdminClient()

  // Buat user baru di Supabase Auth
  const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (createError) return { error: createError.message }
  if (!authData.user) return { error: 'Gagal membuat akun.' }

  // Set role = 'client' dan hubungkan ke org admin yang sedang login
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .update({
      full_name: fullName,
      role: 'client',
      organization_id: orgId, // ← org milik admin yang lagi login, bukan dari input user
    })
    .eq('id', authData.user.id)

  if (profileError) {
    // Rollback: hapus auth user jika profile gagal diupdate
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
    return { error: 'Gagal menyimpan profil klien.' }
  }

  revalidatePath('/admin/dashboard')

  // 📝 Catat aksi: klien baru dibuat
  await logAudit({
    organizationId: orgId,
    actorId: user.id,
    actorEmail: user.email,
    action: AUDIT_ACTIONS.CLIENT_CREATE,
    targetType: 'client',
    targetId: authData.user.id,
    targetName: fullName,
    metadata: { email },
  })

  return { success: true }
}

// ─────────────────────────────────────────────────────────────────────────────
// createClientProject
// ─────────────────────────────────────────────────────────────────────────────

export async function createClientProject(formData: FormData) {
  const { user, orgId, error: authError } = await getAuthenticatedUser()
  if (authError || !user || !orgId) return { error: authError }

  const clientId    = formData.get('clientId')    as string
  const title       = formData.get('title')        as string
  const serviceType = formData.get('serviceType')  as string
  
  const rawTotalPrice = formData.get('totalPrice') as string
  const totalPrice    = parseInt(rawTotalPrice?.replace(/\D/g, '')) || 0

  const rawDpPaid = formData.get('dpPaid') as string
  const dpPaid    = parseInt(rawDpPaid?.replace(/\D/g, '')) || 0

  if (!clientId || !title || !serviceType) {
    return { error: 'Data proyek tidak lengkap.' }
  }

  const supabaseAdmin = createAdminClient()

  // 🔒 IDOR Prevention: verifikasi clientId memang ada di org kita
  //    Kita cek di profiles: apakah client tersebut punya organization_id yang sama
  const { data: clientProfile } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('id', clientId)
    .eq('organization_id', orgId) // ← Filter ganda: ID + harus milik org kita
    .single()

  if (!clientProfile) {
    return { error: 'Klien tidak ditemukan atau bukan bagian dari organisasi Anda.' }
  }

  // 🚫 DEMO MODE: Intercept database mutations
  await new Promise(r => setTimeout(r, 500))
  return { error: '👀 Mode Demo: Tindakan ini disimulasikan dan tidak disimpan.' }

  const { error } = await supabaseAdmin
    .from('projects')
    .insert({
      organization_id: orgId,   // ← Selalu dari server, bukan dari input
      client_id: clientId,
      title,
      service_type: serviceType,
      total_price: totalPrice,
      termin_1: dpPaid,
      termin_2: 0,
      termin_3: 0,
      payment_status: dpPaid >= totalPrice && totalPrice > 0 ? 'paid' : (dpPaid > 0 ? 'partial' : 'pending'),
      progress_percentage: 0,
      status: 'briefing',
    })

  if (error) return { error: 'Gagal membuat proyek.' }

  // 📝 Catat aksi: proyek baru dibuat
  await logAudit({
    organizationId: orgId,
    actorId: user.id,
    actorEmail: user.email,
    action: AUDIT_ACTIONS.PROJECT_CREATE,
    targetType: 'project',
    targetName: title,
    metadata: { service_type: serviceType, total_price: totalPrice, client_id: clientId },
  })

  revalidatePath('/admin/dashboard')
  return { success: true }
}

// ─────────────────────────────────────────────────────────────────────────────
// updateProjectStatus
// ─────────────────────────────────────────────────────────────────────────────

export async function updateProjectStatus(projectId: string, status: string, progress: number) {
  const { orgId, error: authError } = await getAuthenticatedUser()
  if (authError || !orgId) return { error: authError }

  const supabaseAdmin = createAdminClient()

  // Ambil data lama untuk mengecek perubahan status dan data email
  const { data: existingProject, error: fetchError } = await supabaseAdmin
    .from('projects')
    .select('status, title, profiles(full_name, email), organizations(name)')
    .eq('id', projectId)
    .single()
    
  if (fetchError) {
    console.error('Error fetching existing project for status update:', fetchError)
  }

  const oldStatus = existingProject?.status

  // 🚫 DEMO MODE: Intercept database mutations
  await new Promise(r => setTimeout(r, 500))
  return { error: '👀 Mode Demo: Tindakan ini disimulasikan dan tidak disimpan.' }

  // 🔒 IDOR Prevention: .eq('organization_id', orgId) memastikan
  //    admin hanya bisa update project milik org-nya sendiri.
  //    Jika projectId milik org lain, query tidak akan match → 0 rows updated.
  const { error } = await supabaseAdmin
    .from('projects')
    .update({
      status,
      progress_percentage: Math.min(100, Math.max(0, progress)),
      updated_at: new Date().toISOString(),
    })
    .eq('id', projectId)
    .eq('organization_id', orgId) // ← Kunci anti-IDOR

  if (error) return { error: 'Gagal update status proyek.' }

  // 📝 Catat aksi: status proyek diupdate
  const { user } = await getAuthenticatedUser()
  if (user) {
    await logAudit({
      organizationId: orgId,
      actorId: user.id,
      actorEmail: user.email,
      action: AUDIT_ACTIONS.PROJECT_UPDATE_STATUS,
      targetType: 'project',
      targetId: projectId,
      metadata: { new_status: status, new_progress: progress },
    })
  }

  // 📧 Kirim notifikasi email jika proyek baru saja diselesaikan
  if (status === 'completed' && oldStatus !== 'completed' && existingProject) {
    const profile = existingProject.profiles as any
    const org = existingProject.organizations as any
    
    const clientEmail = profile?.email
    const clientName = profile?.full_name || 'Klien'
    const projectName = existingProject.title
    const agencyName = org?.name || 'Agensi'

    if (clientEmail) {
      sendProjectCompletedEmail({
        clientEmail,
        clientName,
        projectName,
        agencyName
      }).catch(err => console.error('Background email task failed:', err))
    }
  }

  revalidatePath('/admin/dashboard')
  revalidatePath('/client/dashboard')
  return { success: true }
}

// ─────────────────────────────────────────────────────────────────────────────
// updateProjectDetails
// ─────────────────────────────────────────────────────────────────────────────

export async function updateProjectDetails(projectId: string, formData: FormData) {
  const { orgId, error: authError } = await getAuthenticatedUser()
  if (authError || !orgId) return { error: authError }

  const status    = formData.get('status')   as string
  let   progress  = parseInt(formData.get('progress')   as string) || 0
  if (progress > 100) progress = 100
  if (progress < 0)   progress = 0

  const rawTotalPrice = formData.get('totalPrice') as string
  const totalPrice = parseInt(rawTotalPrice?.replace(/\D/g, '')) || 0
  
  const rawTermin1 = formData.get('termin_1') as string
  const termin_1   = parseInt(rawTermin1?.replace(/\D/g, '')) || 0
  
  const rawTermin2 = formData.get('termin_2') as string
  const termin_2   = parseInt(rawTermin2?.replace(/\D/g, '')) || 0
  
  const rawTermin3 = formData.get('termin_3') as string
  const termin_3   = parseInt(rawTermin3?.replace(/\D/g, '')) || 0

  const totalPaid = termin_1 + termin_2 + termin_3
  let paymentStatus = 'pending'
  if (totalPaid > 0 && totalPaid < totalPrice)              paymentStatus = 'partial'
  if (totalPaid >= totalPrice && totalPrice > 0)            paymentStatus = 'paid'

  const previewUrl       = (formData.get('previewUrl')       as string) || null
  const linkYoutube      = (formData.get('linkYoutube')      as string) || null
  const linkCloudinary   = (formData.get('linkCloudinary')   as string) || null
  const warrantyMonths   = parseInt(formData.get('warrantyMonths') as string) || 0
  const domainName       = (formData.get('domainName')       as string) || null
  const domainExpiryDate = (formData.get('domainExpiryDate') as string) || null
  const hostingInfo      = (formData.get('hostingInfo')      as string) || null
  const warrantyExpiredAt = (formData.get('warrantyExpiredAt') as string) || null

  const supabaseAdmin = createAdminClient()

  // Ambil data lama untuk mengecek apakah status BERUBAH menjadi completed
  // dan untuk mendapatkan data klien & agensi untuk keperluan email
  const { data: existingProject, error: fetchError } = await supabaseAdmin
    .from('projects')
    .select('status, title, profiles(full_name, email), organizations(name)')
    .eq('id', projectId)
    .single()
  
  if (fetchError) {
    console.error('Error fetching existing project:', fetchError)
  }

  const oldStatus = existingProject?.status

  // 🚫 DEMO MODE: Intercept database mutations
  await new Promise(r => setTimeout(r, 500))
  return { error: '👀 Mode Demo: Tindakan ini disimulasikan dan tidak disimpan.' }

  // 🔒 IDOR Prevention: filter by organization_id
  const { error } = await supabaseAdmin
    .from('projects')
    .update({
      status,
      progress_percentage: progress,
      payment_status: paymentStatus,
      total_price: totalPrice,
      termin_1,
      termin_2,
      termin_3,
      preview_url: previewUrl,
      link_youtube: linkYoutube,
      link_cloudinary: linkCloudinary,
      warranty_months: warrantyMonths,
      domain_name: domainName,
      domain_expiry_date: domainExpiryDate,
      hosting_info: hostingInfo,
      warranty_expired_at: warrantyExpiredAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', projectId)
    .eq('organization_id', orgId) // ← Kunci anti-IDOR

  if (error) return { error: 'Gagal menyimpan perubahan proyek.' }

  // 📧 Kirim notifikasi email jika proyek baru saja diselesaikan
  if (status === 'completed' && oldStatus !== 'completed' && existingProject) {
    // Supabase relationship returns object or array of objects, cast appropriately
    const profile = existingProject.profiles as any
    const org = existingProject.organizations as any
    
    const clientEmail = profile?.email
    const clientName = profile?.full_name || 'Klien'
    const projectName = existingProject.title
    const agencyName = org?.name || 'Agensi'

    if (clientEmail) {
      // Eksekusi secara asynchronous, jangan gunakan await agar tidak menahan response UI
      // Kita bungkus dalam try-catch internal (sudah di dalam fungsi email)
      sendProjectCompletedEmail({
        clientEmail,
        clientName,
        projectName,
        agencyName
      }).catch(err => console.error('Background email task failed:', err))
    }
  }

  revalidatePath('/admin/dashboard')
  revalidatePath(`/admin/dashboard/project/${projectId}`)
  revalidatePath('/client/dashboard')
  return { success: true }
}

// ─────────────────────────────────────────────────────────────────────────────
// updateRevisionStatus
// ─────────────────────────────────────────────────────────────────────────────

export async function updateRevisionStatus(revisionId: string, status: string) {
  const { orgId, error: authError } = await getAuthenticatedUser()
  if (authError || !orgId) return { error: authError }

  const supabaseAdmin = createAdminClient()

  // 🔒 IDOR Prevention: join ke projects untuk verifikasi org
  //    Kita tidak bisa filter revision langsung by org,
  //    jadi kita cek dulu apakah revision ini ada di project milik org kita
  const { data: revision } = await supabaseAdmin
    .from('project_revisions')
    .select('id, projects!inner(organization_id)')
    .eq('id', revisionId)
    .eq('projects.organization_id', orgId)
    .single()

  if (!revision) {
    return { error: 'Revisi tidak ditemukan atau bukan milik organisasi Anda.' }
  }

  // 🚫 DEMO MODE: Intercept database mutations
  await new Promise(r => setTimeout(r, 500))
  return { error: '👀 Mode Demo: Tindakan ini disimulasikan dan tidak disimpan.' }

  const { error } = await supabaseAdmin
    .from('project_revisions')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', revisionId)

  if (error) return { error: 'Gagal update status revisi.' }

  revalidatePath('/admin/dashboard')
  revalidatePath('/client/dashboard')
  return { success: true }
}

// ─────────────────────────────────────────────────────────────────────────────
// replyToRevision
// ─────────────────────────────────────────────────────────────────────────────

export async function replyToRevision(formData: FormData) {
  const { orgId, error: authError } = await getAuthenticatedUser()
  if (authError || !orgId) return { error: authError }

  const revisionId = formData.get('revisionId') as string
  const adminReply = formData.get('adminReply')  as string
  const projectId  = formData.get('projectId')   as string

  if (!revisionId || !adminReply || !projectId) {
    return { error: 'Data tidak lengkap.' }
  }

  const supabaseAdmin = createAdminClient()

  // 🔒 IDOR Prevention: verifikasi revision ada di project milik org kita
  const { data: revision } = await supabaseAdmin
    .from('project_revisions')
    .select('id, projects!inner(organization_id)')
    .eq('id', revisionId)
    .eq('projects.organization_id', orgId)
    .single()

  if (!revision) {
    return { error: 'Revisi tidak ditemukan atau bukan milik organisasi Anda.' }
  }

  // 🚫 DEMO MODE: Intercept database mutations
  await new Promise(r => setTimeout(r, 500))
  return { error: '👀 Mode Demo: Tindakan ini disimulasikan dan tidak disimpan.' }

  const { error } = await supabaseAdmin
    .from('project_revisions')
    .update({ admin_reply: adminReply, updated_at: new Date().toISOString() })
    .eq('id', revisionId)

  if (error) return { error: 'Gagal mengirim balasan.' }

  revalidatePath(`/admin/dashboard/project/${projectId}`)
  revalidatePath('/client/dashboard')
  return { success: true }
}

// ─────────────────────────────────────────────────────────────────────────────
// deleteProjectAsset
// ─────────────────────────────────────────────────────────────────────────────

export async function deleteProjectAsset(assetId: string, fileUrl: string, projectId: string) {
  const { orgId, error: authError } = await getAuthenticatedUser()
  if (authError || !orgId) return { error: authError }

  const supabaseAdmin = createAdminClient()

  // 🔒 IDOR Prevention: verifikasi asset ada di project milik org kita
  const { data: asset } = await supabaseAdmin
    .from('project_assets')
    .select('id, projects!inner(organization_id)')
    .eq('id', assetId)
    .eq('projects.organization_id', orgId)
    .single()

  if (!asset) {
    return { error: 'Asset tidak ditemukan atau bukan milik organisasi Anda.' }
  }

  // 🚫 DEMO MODE: Intercept database mutations
  await new Promise(r => setTimeout(r, 500))
  return { error: '👀 Mode Demo: Tindakan ini disimulasikan dan tidak disimpan.' }

  // Hapus dari Supabase Storage
  const urlParts = fileUrl.split('/client-assets/')
  const filePath = urlParts.length > 1 ? urlParts[1] : null

  if (filePath) {
    await supabaseAdmin.storage.from('client-assets').remove([filePath])
  }

  // Hapus dari database
  const { error } = await supabaseAdmin
    .from('project_assets')
    .delete()
    .eq('id', assetId)

  if (error) return { error: 'Gagal menghapus asset.' }

  revalidatePath(`/admin/dashboard/project/${projectId}`)
  revalidatePath('/client/dashboard')
  return { success: true }
}

// ─────────────────────────────────────────────────────────────────────────────
// Agency Services
// ─────────────────────────────────────────────────────────────────────────────

export async function addAgencyService(organizationId: string, name: string) {
  const { orgId, error: authError } = await getAuthenticatedUser()
  if (authError || !orgId) return { error: authError }

  // 🔒 Abaikan organizationId dari parameter, selalu pakai dari session
  if (!name?.trim()) return { error: 'Nama layanan wajib diisi.' }

  const supabaseAdmin = createAdminClient()

  // 🚫 DEMO MODE: Intercept database mutations
  await new Promise(r => setTimeout(r, 500))
  return { error: '👀 Mode Demo: Tindakan ini disimulasikan dan tidak disimpan.' }

  const { error } = await supabaseAdmin
    .from('agency_services')
    .insert({ organization_id: orgId, name: name.trim() })

  if (error) return { error: 'Gagal menambah layanan.' }

  revalidatePath('/admin/dashboard')
  revalidatePath('/admin/dashboard/settings')
  return { success: true }
}

export async function editAgencyService(serviceId: string, newName: string) {
  const { orgId, error: authError } = await getAuthenticatedUser()
  if (authError || !orgId) return { error: authError }

  if (!newName?.trim() || !serviceId) return { error: 'Nama layanan tidak valid.' }

  const supabaseAdmin = createAdminClient()

  // 🚫 DEMO MODE: Intercept database mutations
  await new Promise(r => setTimeout(r, 500))
  return { error: '👀 Mode Demo: Tindakan ini disimulasikan dan tidak disimpan.' }

  // 🔒 IDOR Prevention: filter by organization_id
  const { error } = await supabaseAdmin
    .from('agency_services')
    .update({ name: newName.trim() })
    .eq('id', serviceId)
    .eq('organization_id', orgId) // ← Admin hanya bisa edit service milik org-nya

  if (error) return { error: 'Gagal mengubah layanan.' }

  revalidatePath('/admin/dashboard')
  revalidatePath('/admin/dashboard/settings')
  return { success: true }
}

export async function deleteAgencyService(serviceId: string) {
  const { orgId, error: authError } = await getAuthenticatedUser()
  if (authError || !orgId) return { error: authError }

  if (!serviceId) return { error: 'ID layanan tidak valid.' }

  const supabaseAdmin = createAdminClient()

  // 🚫 DEMO MODE: Intercept database mutations
  await new Promise(r => setTimeout(r, 500))
  return { error: '👀 Mode Demo: Tindakan ini disimulasikan dan tidak disimpan.' }

  // 🔒 IDOR Prevention: filter by organization_id
  const { error } = await supabaseAdmin
    .from('agency_services')
    .delete()
    .eq('id', serviceId)
    .eq('organization_id', orgId) // ← Admin hanya bisa hapus service milik org-nya

  if (error) return { error: 'Gagal menghapus layanan.' }

  revalidatePath('/admin/dashboard')
  revalidatePath('/admin/dashboard/settings')
  return { success: true }
}
