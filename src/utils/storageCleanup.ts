import { createAdminClient } from './supabase/admin'

/**
 * Utility untuk mengekstrak path relatif dari full URL Supabase Storage
 * Contoh: "https://[project-ref].supabase.co/storage/v1/object/public/project-assets/123/file.jpg"
 * Menjadi: "123/file.jpg"
 */
function extractPathFromUrl(fileUrl: string, bucketName: string = 'project-assets'): string {
  // Mencari index di mana nama bucket berada
  const searchString = `/object/public/${bucketName}/`
  const startIndex = fileUrl.indexOf(searchString)

  if (startIndex === -1) {
    // Jika tidak ketemu struktur URL public, kembalikan apa adanya
    // (Mungkin fileUrl sudah berupa path)
    return fileUrl
  }

  // Potong URL dan ambil hanya bagian path-nya saja
  return fileUrl.substring(startIndex + searchString.length)
}

/**
 * Menghapus file fisik di Supabase Storage.
 * Mencegah terjadinya Ghost Files / Storage Orphan.
 * 
 * @param fileUrls Array dari file URL atau path.
 * @param bucketName Nama bucket di Supabase (default: 'project-assets').
 * @returns boolean Status keberhasilan penghapusan fisik.
 */
export async function deletePhysicalAssets(fileUrls: string[], bucketName: string = 'project-assets'): Promise<boolean> {
  if (!fileUrls || fileUrls.length === 0) return true // Tidak ada yang perlu dihapus

  const supabaseAdmin = createAdminClient()
  
  // Ubah semua full URL menjadi relative path
  const filePaths = fileUrls.map(url => extractPathFromUrl(url, bucketName))
  
  // Hapus dari Supabase Storage
  const { data, error } = await supabaseAdmin.storage.from(bucketName).remove(filePaths)

  if (error) {
    console.error('Error deleting physical assets from Storage:', error)
    return false
  }

  console.log(`Successfully deleted ${data?.length || 0} files from bucket '${bucketName}'.`)
  return true
}
