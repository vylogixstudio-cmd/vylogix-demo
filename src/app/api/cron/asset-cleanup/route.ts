import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { deletePhysicalAssets } from '@/utils/storageCleanup'

// Force dynamic to ensure it runs every time (Vercel Cron)
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    // 1. Verifikasi Vercel Cron Secret (Opsional namun sangat disarankan untuk keamanan)
    // Jika dijalankan dari browser (manual) tanpa header ini, bisa ditolak.
    // Namun untuk keperluan testing awal, kita bisa melonggarkan atau menambahkan secret.
    const authHeader = request.headers.get('authorization')
    if (
      process.env.CRON_SECRET &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseAdmin = createAdminClient()

    // 2. Cari proyek yang berumur > 30 hari DAN skip_asset_cleanup = false
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const thirtyDaysAgoISO = thirtyDaysAgo.toISOString()

    const { data: expiredProjects, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('id, title, skip_asset_cleanup')
      .lt('created_at', thirtyDaysAgoISO)
      .eq('skip_asset_cleanup', false)

    if (projectError) throw projectError

    if (!expiredProjects || expiredProjects.length === 0) {
      return NextResponse.json({ message: 'Tidak ada proyek kedaluwarsa yang memerlukan penghapusan aset.' })
    }

    const projectIds = expiredProjects.map(p => p.id)

    // 3. Tarik semua file_url dari tabel project_assets
    const { data: assets, error: assetError } = await supabaseAdmin
      .from('project_assets')
      .select('id, file_url, project_id')
      .in('project_id', projectIds)

    if (assetError) throw assetError

    if (!assets || assets.length === 0) {
      return NextResponse.json({ message: 'Proyek kedaluwarsa ditemukan, tetapi tidak ada aset yang terkait.' })
    }

    // 4. Eksekusi fungsi penghapusan file di Supabase Storage secara total
    const fileUrls = assets.map(a => a.file_url)
    const deletePhysicalSuccess = await deletePhysicalAssets(fileUrls, 'project-assets')

    if (!deletePhysicalSuccess) {
      throw new Error('Gagal menghapus file fisik di Supabase Storage. Penghapusan baris database dibatalkan untuk mencegah Ghost Files.')
    }

    // 5. Hapus baris datanya di database
    const assetIds = assets.map(a => a.id)
    const { error: dbDeleteError } = await supabaseAdmin
      .from('project_assets')
      .delete()
      .in('id', assetIds)

    if (dbDeleteError) throw dbDeleteError

    return NextResponse.json({
      message: 'Monthly Asset Cleanup berhasil dieksekusi.',
      deletedProjectsCount: expiredProjects.length,
      deletedAssetsCount: assets.length
    })
  } catch (error: any) {
    console.error('Error in executeMonthlyAssetCleanup:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    )
  }
}
