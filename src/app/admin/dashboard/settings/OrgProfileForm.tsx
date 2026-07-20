'use client'

import { useRef, useState, useTransition } from 'react'
import { updateOrganizationSettings } from './actions'
import {
  Building2,
  UploadCloud,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  ImageIcon,
} from 'lucide-react'

interface OrgProfileFormProps {
  orgId: string
  initialName: string
  initialTagline: string
  initialLogoUrl: string | null
  initialLogRetentionDays: number
}

// ── Component ────────────────────────────────────────────────────────────────
export default function OrgProfileForm({
  orgId,
  initialName,
  initialTagline,
  initialLogoUrl,
  initialLogRetentionDays,
}: OrgProfileFormProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [isPending, startTransition] = useTransition()
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [warningMsg, setWarningMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialLogoUrl)
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null)

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 500 * 1024) {
      setErrorMsg('Ukuran logo maksimal 500KB.')
      e.target.value = ''
      return
    }

    setSelectedFileName(file.name)
    const objectUrl = URL.createObjectURL(file)
    setPreviewUrl(objectUrl)
    setErrorMsg(null)
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSuccessMsg(null)
    setErrorMsg(null)

    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      try {
        const result = await updateOrganizationSettings(formData)
        if (result?.error) {
          setErrorMsg(result.error)
          setSuccessMsg(null)
          setWarningMsg(null)
        } else {
          setErrorMsg(null)
          setSelectedFileName(null)
          // Show warning (logo failed) or clean success
          if ('warning' in result && result.warning) {
            setWarningMsg(result.warning as string)
            setSuccessMsg(null)
          } else {
            setSuccessMsg('Pengaturan agensi berhasil disimpan!')
            setWarningMsg(null)
          }
        }
      } catch {
        setErrorMsg('Terjadi kesalahan yang tidak terduga. Coba lagi.')
        setSuccessMsg(null)
        setWarningMsg(null)
      }
    })
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-[20px] shadow-sm border border-black/5 overflow-hidden">
      {/* Card Header */}
      <div className="flex items-center gap-4 p-6 border-b border-black/5">
        <div className="p-3 bg-[#EFF6FF] rounded-[14px] text-[#2563EB] shrink-0">
          <Building2 size={22} />
        </div>
        <div>
          <h2 className="font-extrabold text-lg text-[#111827] font-['Plus_Jakarta_Sans']">
            Profil &amp; Branding Agensi
          </h2>
          <p className="text-[#4B5563] text-xs mt-0.5">
            Ubah nama, tagline, dan logo yang tampil di seluruh platform.
          </p>
        </div>
      </div>

      {/* Form Body */}
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        encType="multipart/form-data"
        className="p-6 space-y-6"
      >
        {/* Hidden org id (not strictly needed by action but handy) */}
        <input type="hidden" name="orgId" value={orgId} />

        {/* Two-column layout on md+ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left: Text fields */}
          <div className="space-y-5">
            {/* Agency Name */}
            <div>
              <label
                htmlFor="settings-name"
                className="block text-xs font-bold text-[#4B5563] uppercase tracking-wider mb-2"
              >
                Nama Agensi / Studio
                <span className="text-rose-500 ml-0.5">*</span>
              </label>
              <input
                id="settings-name"
                name="name"
                type="text"
                required
                defaultValue={initialName}
                placeholder="Contoh: Vylogix Studio"
                className="w-full px-4 py-3 bg-[#F8F9FA] border border-black/10 rounded-[12px] text-sm font-medium text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
              />
            </div>

            {/* Tagline */}
            <div>
              <label
                htmlFor="settings-tagline"
                className="block text-xs font-bold text-[#4B5563] uppercase tracking-wider mb-2"
              >
                Tagline Studio
              </label>
              <input
                id="settings-tagline"
                name="tagline"
                type="text"
                defaultValue={initialTagline || 'Bridging Design and Code'}
                placeholder="Bridging Design and Code"
                className="w-full px-4 py-3 bg-[#F8F9FA] border border-black/10 rounded-[12px] text-sm font-medium text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
              />
              <p className="text-[11px] text-[#9CA3AF] mt-1.5 font-medium">
                Kalimat singkat yang menggambarkan agensi Anda.
              </p>
            </div>



            {/* Log Retention */}
            <div>
              <label
                htmlFor="settings-log-retention"
                className="block text-xs font-bold text-[#4B5563] uppercase tracking-wider mb-2"
              >
                Masa Simpan Audit Log (Hari)
              </label>
              <input
                id="settings-log-retention"
                name="log_retention_days"
                type="number"
                min="1"
                defaultValue={initialLogRetentionDays}
                placeholder="Contoh: 30"
                className="w-full px-4 py-3 bg-[#F8F9FA] border border-black/10 rounded-[12px] text-sm font-medium text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
              />
              <p className="text-[11px] text-[#9CA3AF] mt-1.5 font-medium">
                Log sistem otomatis dihapus setelah masa simpan lewat (default: 30 hari).
              </p>
            </div>
          </div>

          {/* Right: Logo upload */}
          <div>
            <span className="block text-xs font-bold text-[#4B5563] uppercase tracking-wider mb-2">
              Logo Agensi
            </span>

            {/* Preview Box */}
            <div
              className="relative flex flex-col items-center justify-center gap-3 h-36 w-full bg-[#F8F9FA] border-2 border-dashed border-black/10 rounded-[14px] cursor-pointer hover:border-[#2563EB]/40 hover:bg-[#EFF6FF]/30 transition-all group overflow-hidden"
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
              aria-label="Upload logo agensi"
            >
              {previewUrl ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="Logo preview"
                    className="max-h-24 max-w-[80%] object-contain"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <span className="text-[11px] font-bold text-[#2563EB] bg-white/90 px-3 py-1.5 rounded-full shadow-sm backdrop-blur-sm">
                      Ganti Logo
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <ImageIcon size={28} className="text-black/20" />
                  <div className="text-center">
                    <p className="text-xs font-bold text-[#4B5563]">
                      <span className="text-[#2563EB]">Klik untuk upload</span>
                    </p>
                    <p className="text-[10px] text-[#9CA3AF] mt-0.5">
                      PNG, JPG, SVG — Maks. 5MB
                    </p>
                  </div>
                  <UploadCloud size={16} className="text-[#9CA3AF]" />
                </>
              )}
            </div>

            {/* Hidden actual file input */}
            <input
              ref={fileInputRef}
              id="settings-logo"
              name="logo"
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />

            {selectedFileName && (
              <p className="text-[11px] font-medium text-emerald-600 mt-2 flex items-center gap-1.5">
                <CheckCircle2 size={12} />
                {selectedFileName} dipilih
              </p>
            )}
          </div>
        </div>

        {/* Feedback messages */}
        {errorMsg && (
          <div className="flex items-start gap-2.5 p-3.5 bg-rose-50 border border-rose-100 rounded-[12px]">
            <XCircle size={16} className="text-rose-500 mt-0.5 shrink-0" />
            <p className="text-xs font-semibold text-rose-600">{errorMsg}</p>
          </div>
        )}
        {warningMsg && (
          <div className="flex items-start gap-2.5 p-3.5 bg-amber-50 border border-amber-200 rounded-[12px]">
            <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" />
            <p className="text-xs font-semibold text-amber-700">{warningMsg}</p>
          </div>
        )}
        {successMsg && (
          <div className="flex items-start gap-2.5 p-3.5 bg-emerald-50 border border-emerald-100 rounded-[12px]">
            <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 shrink-0" />
            <p className="text-xs font-semibold text-emerald-700">{successMsg}</p>
          </div>
        )}

        {/* Submit */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isPending}
            className="flex items-center gap-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-60 text-white font-bold text-sm px-6 py-3 rounded-[12px] transition-all shadow-sm shadow-[#2563EB]/20 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30"
          >
            {isPending ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Menyimpan...
              </>
            ) : (
              'Simpan Perubahan'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
