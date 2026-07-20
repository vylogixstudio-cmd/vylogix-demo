import { createAdminClient } from '@/utils/supabase/admin'
import { updateProjectDetails, deleteProjectAsset, replyToRevision } from '../../actions'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, Save, Briefcase, User, Monitor, DollarSign, Link as LinkIcon, FileText, Download, Server, Trash2 } from 'lucide-react'
import CurrencyInput from '@/components/CurrencyInput'
import RevisionStatusSelect from '@/components/RevisionStatusSelect'
import InvoiceGenerator from '@/components/InvoiceGenerator'

// Next.js 15 requires async params
export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = createAdminClient()

  const { data: project } = await supabase
    .from('projects')
    .select('*, profiles:client_id (full_name, email)')
    .eq('id', id)
    .single()

  if (!project) {
    redirect('/admin/dashboard')
  }

  const { data: revisions } = await supabase
    .from('project_revisions')
    .select('*')
    .eq('project_id', id)
    .order('created_at', { ascending: false })

  const { data: assets } = await supabase
    .from('project_assets')
    .select('*')
    .eq('project_id', id)
    .order('created_at', { ascending: false })

  // Fetch org branding for dynamic invoice (name, tagline, logo)
  let organization = null
  if (project.organization_id) {
    const { data } = await supabase
      .from('organizations')
      .select('name, tagline, logo_url')
      .eq('id', project.organization_id)
      .single()
    organization = data
  } else {
    // Fallback for old projects without an organization_id
    const { data } = await supabase
      .from('organizations')
      .select('name, tagline, logo_url')
      .order('created_at', { ascending: true })
      .limit(1)
      .single()
    organization = data
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] p-4 sm:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <Link href="/admin/dashboard" className="inline-flex items-center gap-2 text-xs font-bold text-[#4B5563] hover:text-[#111827] bg-white px-4 py-2 rounded-[12px] shadow-sm border border-black/5 transition-all">
            <ArrowLeft size={16} /> Kembali ke Dashboard
          </Link>
        </div>

        <div className="bg-white rounded-[20px] shadow-sm border border-black/5 overflow-hidden">
          <div className="p-6 md:p-8 border-b border-black/5 bg-[#F8F9FA]/50">
            <div className="inline-block px-3 py-1 bg-[#EFF6FF] text-[#2563EB] text-[10px] font-bold uppercase tracking-wider rounded-md mb-3">
              {project.service_type}
            </div>
            <h1 className="font-extrabold text-3xl text-[#111827] font-['Plus_Jakarta_Sans'] mb-2">{project.title}</h1>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-[#4B5563] text-sm font-medium">
              <div className="flex items-center gap-2">
                <User size={16} /> Klien: <span className="font-bold text-[#111827]">{project.profiles?.full_name || project.profiles?.email}</span>
              </div>
              {project.updated_at && (
                <div className="flex items-center gap-2 text-[#6B7280]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D1D5DB]"></span>
                  Terakhir diperbarui: {new Date(project.updated_at).toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })}
                </div>
              )}
            </div>
          </div>

          <form action={async (formData) => {
            'use server'
            await updateProjectDetails(id, formData)
          }} className="space-y-6">

            <div className="bg-white rounded-[20px] shadow-sm border border-black/5 overflow-hidden">
              <div className="p-6 md:p-8 space-y-8">
            
            {/* Status & Progress Section */}
            <div>
              <h3 className="font-bold text-[#111827] mb-4 flex items-center gap-2 border-b border-black/5 pb-2">
                <Monitor size={18} className="text-[#2563EB]" /> Progress & Tahapan
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#4B5563] mb-2">Tahapan (Status)</label>
                  <select name="status" defaultValue={project.status} className="w-full px-4 py-3 bg-[#F8F9FA] border border-black/10 rounded-[12px] text-sm font-medium focus:border-[#2563EB] outline-none text-[#111827] cursor-pointer transition-all">
                    <option value="briefing">Briefing</option>
                    <option value="design">Design</option>
                    <option value="development">Development</option>
                    <option value="revision">Revision</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#4B5563] mb-2">Progress (%)</label>
                  <div className="flex items-center gap-3">
                    <input type="number" name="progress" min="0" max="100" defaultValue={project.progress_percentage} className="w-24 px-4 py-3 bg-[#F8F9FA] border border-black/10 rounded-[12px] text-sm font-bold focus:border-[#2563EB] outline-none transition-all" />
                    <div className="flex-1 h-3 bg-black/5 rounded-full overflow-hidden">
                      <div className="h-full bg-[#2563EB] rounded-full" style={{ width: `${project.progress_percentage}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Section */}
            <div>
              <h3 className="font-bold text-[#111827] mb-4 flex items-center gap-2 border-b border-black/5 pb-2">
                <DollarSign size={18} className="text-emerald-500" /> Keuangan & Pembayaran
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                <CurrencyInput name="totalPrice" defaultValue={project.total_price} label="Total Harga" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <CurrencyInput name="termin_1" defaultValue={project.termin_1} label="Termin 1 (DP)" />
                <CurrencyInput name="termin_2" defaultValue={project.termin_2} label="Termin 2" />
                <CurrencyInput name="termin_3" defaultValue={project.termin_3} label="Termin 3" />
              </div>
              
              <div className="mt-6 bg-[#111827] text-white p-4 rounded-[12px] shadow-sm relative overflow-hidden flex flex-col justify-center">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <DollarSign size={50} />
                </div>
                <div className="flex justify-between items-start z-10">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-white/70 tracking-wider mb-1">Sisa Tagihan</p>
                    <p className="text-xl font-extrabold">Rp {Math.max(0, project.total_price - (project.termin_1 + project.termin_2 + project.termin_3)).toLocaleString('id-ID')}</p>
                  </div>
                  <div className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md ${(project.termin_1 + project.termin_2 + project.termin_3) >= project.total_price && project.total_price > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                    {(project.termin_1 + project.termin_2 + project.termin_3) >= project.total_price && project.total_price > 0 ? 'LUNAS' : 'PENDING'}
                  </div>
                </div>
                
                {/* Auto-Generate Invoice Button */}
                <InvoiceGenerator project={project} organization={organization} />
              </div>
            </div>

            {/* Asset Links Section */}
            <div>
              <h3 className="font-bold text-[#111827] mb-4 flex items-center gap-2 border-b border-black/5 pb-2">
                <LinkIcon size={18} className="text-purple-500" /> Tautan Aset & Hasil
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#4B5563] mb-2">Live Preview URL (Website / App)</label>
                  <input type="url" name="previewUrl" defaultValue={project.preview_url || ''} placeholder="https://..." className="w-full px-4 py-3 bg-[#F8F9FA] border border-black/10 rounded-[12px] text-sm font-medium focus:border-[#2563EB] outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#4B5563] mb-2">Link YouTube (Video Draft)</label>
                  <input type="url" name="linkYoutube" defaultValue={project.link_youtube || ''} placeholder="https://youtube.com/..." className="w-full px-4 py-3 bg-[#F8F9FA] border border-black/10 rounded-[12px] text-sm font-medium focus:border-[#2563EB] outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#4B5563] mb-2">Link Cloudinary (Folder Aset/Gambar)</label>
                  <input type="url" name="linkCloudinary" defaultValue={project.link_cloudinary || ''} placeholder="https://cloudinary.com/..." className="w-full px-4 py-3 bg-[#F8F9FA] border border-black/10 rounded-[12px] text-sm font-medium focus:border-[#2563EB] outline-none transition-all" />
                </div>
              </div>
            </div>
            
            {/* End of white card container */}
            </div>
          </div>

            {/* Deployment & Warranty Section (Dark Mode Refactor) */}
            {(project.service_type === 'website') && (
              <div className="bg-[#111827] rounded-[20px] shadow-lg border border-white/5 p-6 md:p-8 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-20 pointer-events-none">
                  <Server size={120} className="text-emerald-500" />
                </div>
                
                <div className="flex justify-between items-start mb-6 relative z-10">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <Server size={20} className="text-emerald-400" /> Informasi Deployment & Garansi
                  </h3>
                  <div className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-[10px] font-extrabold uppercase tracking-widest rounded-md border border-emerald-500/20">
                    PROYEK FINISH LINE
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-4 relative z-10">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">Durasi Garansi</label>
                    <select name="warrantyMonths" defaultValue={project.warranty_months || 0} className="w-full px-4 py-3 bg-[#1F2937] border border-white/10 rounded-[12px] text-sm font-medium focus:border-emerald-500 outline-none text-white cursor-pointer transition-all">
                      <option value="0" className="bg-[#1F2937]">Tidak Ada Garansi</option>
                      <option value="1" className="bg-[#1F2937]">1 Bulan</option>
                      <option value="3" className="bg-[#1F2937]">3 Bulan</option>
                      <option value="6" className="bg-[#1F2937]">6 Bulan</option>
                      <option value="12" className="bg-[#1F2937]">12 Bulan</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">Tanggal Habis Garansi</label>
                    <input type="date" name="warrantyExpiredAt" defaultValue={project.warranty_expired_at ? new Date(project.warranty_expired_at).toISOString().split('T')[0] : ''} className="w-full px-4 py-3 bg-[#1F2937] border border-white/10 rounded-[12px] text-sm font-medium focus:border-emerald-500 outline-none text-white transition-all [color-scheme:dark]" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-4 relative z-10">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">Nama Domain</label>
                    <input type="text" name="domainName" defaultValue={project.domain_name || ''} placeholder="contoh.com" className="w-full px-4 py-3 bg-[#1F2937] border border-white/10 rounded-[12px] text-sm font-medium focus:border-emerald-500 outline-none text-white transition-all placeholder:text-white/20" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">Tanggal Expired Domain</label>
                    <input type="date" name="domainExpiryDate" defaultValue={project.domain_expiry_date ? new Date(project.domain_expiry_date).toISOString().split('T')[0] : ''} className="w-full px-4 py-3 bg-[#1F2937] border border-white/10 rounded-[12px] text-sm font-medium focus:border-emerald-500 outline-none text-white transition-all [color-scheme:dark]" />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-6 relative z-10">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">Informasi Hosting/Server</label>
                    <textarea name="hostingInfo" defaultValue={project.hosting_info || ''} rows={4} placeholder="Detail login panel / URL hosting..." className="w-full px-4 py-3 bg-[#1F2937] border border-white/10 rounded-[12px] text-sm font-medium font-mono focus:border-emerald-500 outline-none text-emerald-400 transition-all resize-none placeholder:text-white/20 placeholder:font-sans"></textarea>
                  </div>
                </div>
              </div>
            )}

            <div className="px-6 md:px-8 py-5 border-t border-black/5 bg-[#F8F9FA]/50 flex justify-end">
              <button
                type="submit"
                className="flex items-center gap-2 bg-[#2563EB] text-white font-bold px-8 py-3.5 rounded-[12px] hover:bg-[#1D4ED8] transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
              >
                <Save size={18} /> Simpan Semua Perubahan
              </button>
            </div>
          </form>
        </div>

        {/* Daftar Revisi Klien */}
        <div className="bg-white rounded-[20px] shadow-sm border border-black/5 p-6 md:p-8">
          <h3 className="font-bold text-[#111827] mb-4 flex items-center gap-2 border-b border-black/5 pb-2">
            <FileText size={18} className="text-rose-500" /> Daftar Revisi Klien
          </h3>
          {revisions && revisions.length > 0 ? (
            <div className="space-y-4">
              {revisions.map((rev, index) => {
                const nomorRevisi = revisions.length - index;
                return (
                  <div key={rev.id} className="p-4 bg-[#F8F9FA] border border-black/5 rounded-[12px]">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-rose-50 text-rose-600 text-[10px] font-extrabold uppercase rounded-md border border-rose-100">
                          Revisi #{nomorRevisi}
                        </span>
                        <h4 className="font-bold text-[#111827] text-sm">{rev.title}</h4>
                      </div>
                      <RevisionStatusSelect revisionId={rev.id} currentStatus={rev.status} />
                    </div>
                    <p className="text-[#4B5563] text-xs mb-3">{rev.description}</p>
                    <div className="text-[10px] font-bold text-[#6B7280]">
                      Diajukan pada: {new Date(rev.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                    </div>
                    
                    {rev.admin_reply ? (
                      <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-blue-500 mb-1">Balasan Admin</div>
                        <p className="text-xs text-blue-900">{rev.admin_reply}</p>
                      </div>
                    ) : (
                      <form action={async (formData) => {
                        'use server'
                        await replyToRevision(formData)
                      }} className="mt-4 border-t border-black/5 pt-4">
                        <input type="hidden" name="revisionId" value={rev.id} />
                        <input type="hidden" name="projectId" value={id} />
                        <textarea name="adminReply" required rows={2} placeholder="Tulis tanggapan atau konfirmasi perbaikan..." className="w-full px-3 py-2 bg-white border border-black/10 rounded-lg text-xs font-medium focus:border-[#2563EB] outline-none transition-all resize-none mb-2"></textarea>
                        <button type="submit" className="text-xs font-bold text-white bg-[#2563EB] hover:bg-[#1D4ED8] px-4 py-2 rounded-lg transition-all">
                          Kirim Balasan
                        </button>
                      </form>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-[#4B5563] italic bg-[#F8F9FA] p-4 rounded-[12px] text-center border border-black/5">
              Belum ada revisi yang diajukan oleh klien.
            </p>
          )}
        </div>

        {/* Daftar Aset Klien */}
        <div className="bg-white rounded-[20px] shadow-sm border border-black/5 p-6 md:p-8">
          <h3 className="font-bold text-[#111827] mb-4 flex items-center gap-2 border-b border-black/5 pb-2">
            <Download size={18} className="text-indigo-500" /> Aset dari Klien
          </h3>
          {assets && assets.length > 0 ? (
            <div className="space-y-3">
              {assets.map((asset) => (
                <div key={asset.id} className="flex items-center justify-between p-4 bg-[#F8F9FA] border border-black/5 rounded-[12px]">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="p-2 bg-white rounded-lg shadow-sm border border-black/5">
                      <FileText size={16} className="text-indigo-500" />
                    </div>
                    <span className="text-sm font-medium text-[#111827] truncate">{asset.file_name}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <a href={asset.file_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-white border border-black/10 px-3 py-1.5 rounded-lg text-xs font-bold text-[#111827] hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all">
                      <Download size={14} /> Unduh
                    </a>
                    <form action={async (formData) => {
                      'use server'
                      await deleteProjectAsset(asset.id, asset.file_url, id)
                    }}>
                      <button type="submit" className="flex items-center justify-center bg-white border border-rose-100 text-rose-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 p-1.5 rounded-lg transition-all" title="Hapus Aset">
                        <Trash2 size={16} />
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#4B5563] italic bg-[#F8F9FA] p-4 rounded-[12px] text-center border border-black/5">
              Klien belum mengupload aset apapun.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
