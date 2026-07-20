'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Verifikasi bahwa projectId memang milik user yang sedang login
//
// 📖 Ini adalah inti dari anti-IDOR untuk client.
//    Setiap kali client mau lakukan sesuatu ke sebuah project,
//    kita WAJIB cek dulu: "Apakah project ini client_id-nya sama dengan
//    user yang sedang login?"
//    Kalau tidak cocok → tolak request.
// ─────────────────────────────────────────────────────────────────────────────

async function verifyProjectOwnership(projectId: string): Promise<{
  userId: string | null
  isOwner: boolean
  error: string | null
}> {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return { userId: null, isOwner: false, error: 'Sesi tidak valid. Silakan login kembali.' }
  }

  // Cek: apakah project ini memang milik user yang sedang login?
  // Query ini akan return null jika:
  //   - projectId tidak ada di database
  //   - projectId ada, TAPI client_id bukan user ini (= IDOR attempt)
  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('client_id', user.id) // ← Filter kritis: harus cocok dengan user login
    .single()

  if (!project) {
    return {
      userId: user.id,
      isOwner: false,
      error: 'Proyek tidak ditemukan atau Anda tidak memiliki akses.',
    }
  }

  return { userId: user.id, isOwner: true, error: null }
}

// ─────────────────────────────────────────────────────────────────────────────
// createRevision
// ─────────────────────────────────────────────────────────────────────────────

export async function createRevision(formData: FormData) {
  const projectId   = formData.get('projectId')   as string
  const title       = formData.get('title')        as string
  const description = formData.get('description')  as string

  if (!projectId || !title || !description) {
    return { error: 'Semua field wajib diisi.' }
  }

  // 🔒 IDOR Prevention: verifikasi kepemilikan project SEBELUM insert
  const { isOwner, error: ownerError } = await verifyProjectOwnership(projectId)
  if (!isOwner) return { error: ownerError }

  // Baru boleh insert setelah ownership terkonfirmasi
  // 🚫 DEMO MODE: Intercept database mutations
  await new Promise(r => setTimeout(r, 500))
  return { error: '👀 Mode Demo: Tindakan ini disimulasikan dan tidak disimpan.' }

  const supabaseAdmin = createAdminClient()

  const { error } = await supabaseAdmin
    .from('project_revisions')
    .insert({
      project_id: projectId,
      title,
      description,
      status: 'Pending',
    })

  if (error) return { error: 'Gagal mengirim permintaan revisi.' }

  revalidatePath('/client/dashboard')
  revalidatePath(`/admin/dashboard/project/${projectId}`)
  return { success: true }
}

// ─────────────────────────────────────────────────────────────────────────────
// uploadAssetToSupabase
// ─────────────────────────────────────────────────────────────────────────────

export async function uploadAssetToSupabase(formData: FormData) {
  const file      = formData.get('file')      as File
  const projectId = formData.get('projectId') as string

  if (!file || !projectId) {
    return { error: 'File dan ID proyek diperlukan.' }
  }

  // Validasi tipe file (keamanan tambahan — tolak file berbahaya)
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf',
    'video/mp4', 'video/quicktime',
  ]
  if (!allowedTypes.includes(file.type)) {
    return { error: 'Tipe file tidak diizinkan. Gunakan JPG, PNG, PDF, atau MP4.' }
  }

  // Batasi ukuran file: maksimal 50MB
  const MAX_SIZE_BYTES = 50 * 1024 * 1024
  if (file.size > MAX_SIZE_BYTES) {
    return { error: 'Ukuran file terlalu besar. Maksimal 50MB.' }
  }

  // 🔒 IDOR Prevention: verifikasi kepemilikan project SEBELUM upload
  const { isOwner, error: ownerError } = await verifyProjectOwnership(projectId)
  if (!isOwner) return { error: ownerError }

  // 🚫 DEMO MODE: Intercept database mutations
  await new Promise(r => setTimeout(r, 500))
  return { error: '👀 Mode Demo: Tindakan ini disimulasikan dan tidak disimpan.' }

  const supabaseAdmin = createAdminClient()

  // Buat nama file yang unik dan aman
  const timestamp   = Date.now()
  const cleanName   = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
  const storagePath = `${projectId}-${timestamp}-${cleanName}`

  // Upload ke Supabase Storage
  const { error: storageError } = await supabaseAdmin.storage
    .from('client-assets')
    .upload(storagePath, file, { cacheControl: '3600', upsert: false })

  if (storageError) {
    return { error: 'Gagal mengupload file.' }
    // ↑ Pesan error generik — tidak bocorkan detail teknis ke client
  }

  // Ambil public URL
  const { data: publicUrlData } = supabaseAdmin.storage
    .from('client-assets')
    .getPublicUrl(storagePath)

  // Simpan record ke database
  const { error: dbError } = await supabaseAdmin
    .from('project_assets')
    .insert({
      project_id: projectId,
      file_name: file.name,
      file_url: publicUrlData.publicUrl,
    })

  if (dbError) {
    // Rollback: hapus file dari storage jika insert DB gagal
    await supabaseAdmin.storage.from('client-assets').remove([storagePath])
    return { error: 'Gagal menyimpan informasi file.' }
  }

  revalidatePath('/client/dashboard')
  revalidatePath(`/admin/dashboard/project/${projectId}`)
  return { success: true }
}
