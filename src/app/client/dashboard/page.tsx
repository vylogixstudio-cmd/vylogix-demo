import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { logout } from '@/app/login/actions'
import { LogOut, Monitor, ExternalLink, Image as ImageIcon, MessageSquare, Video, FileText, Download, UploadCloud, Server, Bug } from 'lucide-react'
import AssetUploader from '@/components/AssetUploader'
import InvoiceGenerator from '@/components/InvoiceGenerator'
import SubmitRevisionButton from '@/components/SubmitRevisionButton'
import { createRevision } from './actions'

import Link from 'next/link'

export default async function ClientDashboard({ searchParams }: { searchParams?: { projectId?: string } | Promise<{ projectId?: string }> }) {
  const params = await Promise.resolve(searchParams || {})
  const supabase = await createClient()

  // Get current user securely
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch all projects belonging to this client. 
  // RLS ensures they only see their own projects.
  const { data: projects } = await supabase
    .from('projects')
    .select('*, profiles:client_id(email, full_name)')
    .eq('client_id', user?.id)
    .order('created_at', { ascending: false })

  let project = null
  if (projects && projects.length === 1) {
    project = projects[0]
  } else if (projects && projects.length > 1) {
    if (params.projectId) {
      project = projects.find(p => p.id === params.projectId) || null
    }
  }

  // Tipe data untuk organisasi — disesuaikan dengan schema baru
  type OrgData = {
    name: string
    whatsapp_number: string | null
    logo_url: string | null
  } | null

  let revisions: any[] = []
  let assets: any[] = []
  let organization: OrgData = null

  if (project) {
    const { data: revData } = await supabase
      .from('project_revisions')
      .select('*')
      .eq('project_id', project.id)
      .order('created_at', { ascending: false })
    revisions = revData || []

    const { data: assetData } = await supabase
      .from('project_assets')
      .select('*')
      .eq('project_id', project.id)
      .order('created_at', { ascending: false })
    assets = assetData || []

    // Ambil data org untuk tombol WA dan invoice
    // Hanya kolom yang ada di schema baru
    if (project.organization_id) {
      const supabaseAdmin = createAdminClient()
      const { data: orgData } = await supabaseAdmin
        .from('organizations')
        .select('name, whatsapp_number, logo_url')
        .eq('id', project.organization_id)
        .single()
      organization = orgData
    }
    // Catatan: suspend check sudah dihandle sepenuhnya oleh middleware.
    // Tidak perlu cek ulang di sini — middleware sudah blokir admin yang suspended
    // sebelum halaman ini pernah dirender.
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8 bg-white p-6 rounded-[20px] shadow-sm border border-black/5">
          <div>
            <h1 className="font-extrabold text-2xl text-[#111827] font-['Plus_Jakarta_Sans']">Client Portal</h1>
            <p className="text-[#4B5563] text-sm mt-1">Pantau perkembangan proyek Anda secara real-time.</p>
          </div>
          <form action={logout}>
            <button type="submit" className="flex items-center gap-2 text-xs font-bold text-[#4B5563] hover:text-rose-500 px-5 py-2.5 border border-black/10 rounded-[12px] hover:bg-rose-50 hover:border-rose-200 transition-all shadow-sm bg-[#F8F9FA]">
              <LogOut size={16} /> Logout Portal
            </button>
          </form>
        </div>

        {projects && projects.length > 1 && !project ? (
          <div className="space-y-6 animate-in fade-in zoom-in duration-300">
            <div className="mb-4">
              <h2 className="text-xl font-extrabold text-[#111827]">Pilih Proyek</h2>
              <p className="text-sm text-[#4B5563]">Anda memiliki beberapa proyek. Pilih salah satu untuk melihat detailnya.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {projects.map((p) => (
                <Link key={p.id} href={`/client/dashboard?projectId=${p.id}`} className="block group">
                  <div className="bg-white p-6 rounded-[20px] shadow-sm border border-black/5 hover:border-blue-500 hover:shadow-md transition-all h-full flex flex-col justify-between">
                    <div>
                      <div className="inline-block px-3 py-1 bg-[#EFF6FF] text-[#2563EB] text-[10px] font-bold uppercase tracking-wider rounded-md mb-3">
                        {p.service_type}
                      </div>
                      <h3 className="font-extrabold text-lg text-[#111827] mb-2 group-hover:text-blue-600 transition-colors">{p.title}</h3>
                      <div className="flex items-center gap-2 text-xs font-medium text-gray-500 mb-4">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                        Status: <span className="uppercase text-gray-700">{p.status}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                      <span className="text-sm font-bold text-gray-900">
                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(p.total_price || 0)}
                      </span>
                      <span className="text-xs font-bold text-blue-600 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                        Buka Proyek →
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : project ? (
          <div className="space-y-6">
            {/* Back Button for Multi-Project Clients */}
            {projects && projects.length > 1 && (
              <Link href="/client/dashboard" className="inline-flex items-center gap-2 text-xs font-bold text-[#4B5563] hover:text-[#2563EB] mb-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg hover:border-blue-200 transition-colors shadow-sm w-fit">
                ← Kembali ke Daftar Proyek
              </Link>
            )}

            {/* Project Status Card */}
            <div className="bg-white p-6 md:p-8 rounded-[20px] shadow-sm border border-black/5">
              <div className="flex flex-col md:flex-row justify-between md:items-start gap-4 mb-6">
                <div>
                  <div className="inline-block px-3 py-1 bg-[#EFF6FF] text-[#2563EB] text-[10px] font-bold uppercase tracking-wider rounded-md mb-3">
                    {project.service_type}
                  </div>
                  <h2 className="font-extrabold text-3xl text-[#111827] font-['Plus_Jakarta_Sans'] mb-1">{project.title}</h2>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-sm font-medium text-[#4B5563]">
                    {project.updated_at && (
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#D1D5DB]"></span>
                        Terakhir diperbarui: <span className="font-bold text-[#111827]">{new Date(project.updated_at).toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#4B5563] mb-1">Progress</p>
                  <p className="text-4xl font-extrabold text-[#2563EB]">{project.progress_percentage}%</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-4 bg-black/5 rounded-full overflow-hidden mb-6">
                <div 
                  className="h-full bg-[#2563EB] rounded-full transition-all duration-1000 ease-out relative"
                  style={{ width: `${project.progress_percentage}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {['briefing', 'design', 'development', 'completed'].map((step, idx) => {
                  const isActive = project.status === step
                  return (
                    <div key={idx} className={`p-4 rounded-[12px] border ${isActive ? 'bg-[#EFF6FF] border-[#2563EB]/20 shadow-sm' : 'bg-[#F8F9FA] border-black/5'} transition-all`}>
                      <p className={`text-xs font-bold uppercase tracking-wider text-center ${isActive ? 'text-[#2563EB]' : 'text-[#4B5563]'}`}>
                        {step}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Asset & Preview Section */}
              <div className="bg-white p-6 rounded-[20px] shadow-sm border border-black/5 flex flex-col h-full">
                <h3 className="font-bold text-lg text-[#111827] mb-4 flex items-center gap-2">
                  <Monitor size={20} className="text-[#2563EB]" /> Hasil & Aset Proyek
                </h3>
                <div className="space-y-3 flex-grow">
                  <a href={project.preview_url || '#'} target="_blank" rel="noreferrer" className={`flex items-center justify-between p-4 rounded-[12px] border border-black/5 hover:border-[#2563EB]/30 transition-all ${!project.preview_url ? 'opacity-50 pointer-events-none' : ''}`}>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[#F8F9FA] rounded-lg text-[#4B5563]"><ExternalLink size={18} /></div>
                      <div>
                        <p className="text-sm font-bold text-[#111827]">Live Preview</p>
                        <p className="text-xs text-[#4B5563]">Lihat hasil website / desain</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-[#2563EB]">Buka Link</span>
                  </a>
                  <a href={project.link_cloudinary || '#'} target="_blank" rel="noreferrer" className={`flex items-center justify-between p-4 rounded-[12px] border border-black/5 hover:border-[#2563EB]/30 transition-all ${!project.link_cloudinary ? 'opacity-50 pointer-events-none' : ''}`}>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[#F8F9FA] rounded-lg text-[#4B5563]"><ImageIcon size={18} /></div>
                      <div>
                        <p className="text-sm font-bold text-[#111827]">Aset Cloudinary</p>
                        <p className="text-xs text-[#4B5563]">Folder gambar & desain</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-[#2563EB]">Buka Link</span>
                  </a>
                  <a href={project.link_youtube || '#'} target="_blank" rel="noreferrer" className={`flex items-center justify-between p-4 rounded-[12px] border border-black/5 hover:border-[#2563EB]/30 transition-all ${!project.link_youtube ? 'opacity-50 pointer-events-none' : ''}`}>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[#F8F9FA] rounded-lg text-[#4B5563]"><Video size={18} /></div>
                      <div>
                        <p className="text-sm font-bold text-[#111827]">Video Draft</p>
                        <p className="text-xs text-[#4B5563]">Preview di YouTube</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-[#2563EB]">Buka Link</span>
                  </a>
                </div>
              </div>

              {/* Invoice Section */}
              <div className="bg-[#111827] text-white p-6 rounded-[20px] shadow-md relative overflow-hidden flex flex-col h-full">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                  <Monitor size={100} />
                </div>
                <h3 className="font-bold text-sm uppercase tracking-wider text-white/70 mb-4">Informasi Pembayaran</h3>
                
                {/* Smart Termin Logic */}
                {(() => {
                  let activeTagihanText = "Termin 1 (DP)";
                  if (project.termin_1 > 0 && project.termin_2 === 0) activeTagihanText = "Termin 2";
                  if (project.termin_2 > 0 && project.termin_3 === 0) activeTagihanText = "Termin 3";
                  if (project.payment_status === 'paid') activeTagihanText = "Lunas";

                  const sisaTagihan = Math.max(0, project.total_price - (project.termin_1 + project.termin_2 + project.termin_3));

                  return (
                    <>
                      <div className="mb-4 relative z-10">
                        <p className="text-xs text-white/70 mb-1">Tagihan Aktif Saat Ini</p>
                        <p className="text-xl font-extrabold text-amber-400">
                          {project.payment_status === 'paid' ? activeTagihanText : `Menunggu Pembayaran ${activeTagihanText}`}
                        </p>
                      </div>
                      {sisaTagihan > 0 && (
                        <div className="mb-4 relative z-10">
                          <p className="text-[10px] text-white/50 italic">Sisa total tagihan proyek Anda berikutnya: Rp {sisaTagihan.toLocaleString('id-ID')}</p>
                        </div>
                      )}
                    </>
                  )
                })()}

                <div className="flex justify-between items-end mt-auto pt-6 border-t border-white/10 relative z-10">
                  <div>
                    <p className="text-xs text-white/70 mb-1">Status Pembayaran</p>
                    <p className={`text-sm font-bold uppercase ${project.payment_status === 'paid' ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {project.payment_status}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-white/70 mb-1 text-right">Total Biaya</p>
                    <p className="text-sm font-bold">Rp {project.total_price.toLocaleString('id-ID')}</p>
                  </div>
                </div>
                
                {/* Auto-Generate Invoice Button (Client Version) */}
                <div className="relative z-10 mt-4 border-t border-white/5 pt-4">
                  <InvoiceGenerator project={project} organization={organization} variant="client" />
                </div>
              </div>
            </div>

            {/* Domain Info Card */}
            {project.service_type === 'website' && (project.domain_name || project.hosting_info) && (
              <div className="bg-gradient-to-r from-[#111827] to-[#1F2937] p-6 md:p-8 rounded-[20px] shadow-sm border border-black/5 text-white">
                <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                  <Server size={20} className="text-emerald-400" /> Informasi Server & Domain
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {project.domain_name && (
                    <div>
                      <p className="text-xs text-white/50 uppercase tracking-wider font-bold mb-1">Nama Domain</p>
                      <p className="font-medium">{project.domain_name}</p>
                    </div>
                  )}
                  {project.domain_expiry_date && (
                    <div>
                      <p className="text-xs text-white/50 uppercase tracking-wider font-bold mb-1">Expired Pada</p>
                      <p className="font-medium">{new Date(project.domain_expiry_date).toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    </div>
                  )}
                  {project.hosting_info && (
                    <div className="sm:col-span-3">
                      <p className="text-xs text-white/50 uppercase tracking-wider font-bold mb-2">Informasi Hosting / Panel</p>
                      <div className="bg-black/30 p-4 rounded-[12px] font-mono text-xs whitespace-pre-wrap text-white/80 border border-white/10">
                        {project.hosting_info}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              {/* Revision / Bug Report Section */}
              <div className="bg-white p-6 rounded-[20px] shadow-sm border border-black/5">
                <h3 className="font-bold text-lg text-[#111827] mb-4 flex items-center gap-2">
                  {project.status === 'completed' ? (
                    <><Bug size={20} className="text-rose-500" /> Laporkan Eror / Bug 
                      <span className="text-sm font-normal ml-2">
                        {project.warranty_expired_at && new Date() <= new Date(project.warranty_expired_at) 
                          ? `(Garansi Aktif s/d ${new Date(project.warranty_expired_at).toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })})`
                          : '(Masa Garansi Habis)'}
                      </span>
                    </>
                  ) : (
                    <><MessageSquare size={20} className="text-rose-500" /> Log Revisi</>
                  )}
                </h3>
                
                <form action={async (formData) => {
                  'use server'
                  await createRevision(formData)
                }} className="mb-6 space-y-4">
                  <input type="hidden" name="projectId" value={project.id} />
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#4B5563] mb-2">
                      {project.status === 'completed' ? 'Judul Laporan Bug' : 'Judul Revisi'}
                    </label>
                    <input type="text" name="title" required placeholder={project.status === 'completed' ? "Contoh: Gambar di beranda tidak muncul" : "Contoh: Ubah Warna Header"} className="w-full px-4 py-3 bg-[#F8F9FA] border border-black/10 rounded-[12px] text-sm font-medium focus:border-rose-500 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#4B5563] mb-2">
                      {project.status === 'completed' ? 'Detail Bug & Cara Reproduksi' : 'Detail Revisi'}
                    </label>
                    <textarea name="description" required rows={3} placeholder={project.status === 'completed' ? "Jelaskan error yang terjadi dan di halaman mana letaknya..." : "Tolong ubah warna header menjadi biru tua (#00008B)..."} className="w-full px-4 py-3 bg-[#F8F9FA] border border-black/10 rounded-[12px] text-sm font-medium focus:border-rose-500 outline-none transition-all resize-none"></textarea>
                  </div>
                  <SubmitRevisionButton isCompleted={project.status === 'completed'} />
                </form>

                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
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
                          <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md ${
                            rev.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-600' :
                            rev.status === 'On Progress' ? 'bg-amber-500/10 text-amber-600' :
                            'bg-rose-500/10 text-rose-600'
                          }`}>
                            {rev.status}
                          </span>
                        </div>
                        <p className="text-[#4B5563] text-xs mb-3">{rev.description}</p>
                        <div className="text-[10px] font-bold text-[#6B7280]">
                          {new Date(rev.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                        </div>
                        {rev.admin_reply && (
                          <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-blue-500 mb-1">Balasan Admin</div>
                            <p className="text-xs text-blue-900">{rev.admin_reply}</p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                  {revisions.length === 0 && (
                    <p className="text-xs text-center text-[#6B7280] italic">Belum ada revisi yang diajukan.</p>
                  )}
                </div>
              </div>

              {/* Upload Asset Section */}
              <div className="bg-white p-6 rounded-[20px] shadow-sm border border-black/5 flex flex-col h-full">
                <h3 className="font-bold text-lg text-[#111827] mb-4 flex items-center gap-2">
                  <UploadCloud size={20} className="text-indigo-500" /> Aset Proyek
                </h3>
                <AssetUploader projectId={project.id} />
                
                <div className="mt-6 flex-grow space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#4B5563] mb-3">Aset yang Anda Upload</h4>
                  {assets.map((asset) => (
                    <div key={asset.id} className="flex items-center justify-between p-3 bg-[#F8F9FA] border border-black/5 rounded-[12px]">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <FileText size={16} className="text-indigo-500 flex-shrink-0" />
                        <span className="text-xs font-medium text-[#111827] truncate">{asset.file_name}</span>
                      </div>
                      <a href={asset.file_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 bg-white border border-black/10 px-2 py-1 rounded-md text-[10px] font-bold text-[#111827] hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all flex-shrink-0">
                        <Download size={12} /> Buka
                      </a>
                    </div>
                  ))}
                  {assets.length === 0 && (
                    <p className="text-xs text-center text-[#6B7280] italic">Belum ada aset yang diupload.</p>
                  )}
                </div>
              </div>
            </div>
            

          </div>
        ) : (
          <div className="bg-white p-12 text-center rounded-[20px] shadow-sm border border-black/5">
            <Monitor size={48} className="mx-auto text-black/20 mb-4" />
            <h2 className="font-bold text-xl text-[#111827] mb-2">Belum Ada Proyek</h2>
            <p className="text-[#4B5563] text-sm">Admin belum membuatkan atau menugaskan proyek untuk akun Anda.</p>
          </div>
        )}
      </div>
    </div>
  )
}
