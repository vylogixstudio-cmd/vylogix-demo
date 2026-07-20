'use client'

import { useState, useRef } from 'react'
import { uploadAssetToSupabase } from '@/app/client/dashboard/actions'
import { UploadCloud, File, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react'

// ── Constants ────────────────────────────────────────────────────────────────

const ALLOWED_MIME_TYPES: Record<string, string> = {
  'image/jpeg': 'JPG',
  'image/png': 'PNG',
  'image/webp': 'WEBP',
  'image/gif': 'GIF',
  'application/pdf': 'PDF',
  'video/mp4': 'MP4',
  'video/quicktime': 'MOV',
}

const MAX_SIZE_MB = 50
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ── Props ────────────────────────────────────────────────────────────────────

interface AssetUploaderProps {
  projectId: string
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AssetUploader({ projectId }: AssetUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<boolean>(false)

  // ── Validation (client-side mirror of server-side rules) ─────────────────

  const validateFile = (f: File): string | null => {
    // 1. Check MIME type
    if (!ALLOWED_MIME_TYPES[f.type]) {
      const allowed = Object.values(ALLOWED_MIME_TYPES).join(', ')
      return `Tipe file tidak didukung. Format yang diizinkan: ${allowed}.`
    }

    // 2. Check file size
    if (f.size > MAX_SIZE_BYTES) {
      return `Ukuran file terlalu besar (${formatFileSize(f.size)}). Maksimal ${MAX_SIZE_MB}MB.`
    }

    // 3. Check filename length (prevent edge cases with very long filenames)
    if (f.name.length > 200) {
      return 'Nama file terlalu panjang (maks. 200 karakter).'
    }

    return null
  }

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return

    setSuccess(false)
    const validationError = validateFile(selected)
    if (validationError) {
      setError(validationError)
      setFile(null)
      // Reset input so user can pick the same (corrected) file again
      if (inputRef.current) inputRef.current.value = ''
      return
    }

    setFile(selected)
    setError(null)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const dropped = e.dataTransfer.files?.[0]
    if (!dropped) return

    setSuccess(false)
    const validationError = validateFile(dropped)
    if (validationError) {
      setError(validationError)
      setFile(null)
      return
    }

    setFile(dropped)
    setError(null)
  }

  const handleUpload = async () => {
    if (!file) return

    setIsUploading(true)
    setError(null)
    setSuccess(false)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('projectId', projectId)

      const result = await uploadAssetToSupabase(formData)

      if (result?.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        setFile(null)
        if (inputRef.current) inputRef.current.value = ''
      }
    } catch {
      setError('Terjadi masalah saat mengupload. Periksa koneksi internet Anda.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleReset = () => {
    setFile(null)
    setError(null)
    setSuccess(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => !file && inputRef.current?.click()}
        className={`border-2 border-dashed rounded-[12px] p-6 text-center transition-all ${
          file
            ? 'border-[#2563EB]/30 bg-[#EFF6FF]/30 cursor-default'
            : 'border-black/10 bg-[#F8F9FA] hover:border-[#2563EB]/50 hover:bg-[#EFF6FF]/20 cursor-pointer'
        }`}
      >
        {!file ? (
          <>
            <UploadCloud className="mx-auto text-black/20 mb-3" size={32} />
            <p className="text-sm font-bold text-[#111827] mb-1">
              Upload Aset Baru
            </p>
            <p className="text-xs text-[#6B7280] mb-1">
              Klik atau seret file ke sini
            </p>
            <p className="text-[11px] text-[#9CA3AF]">
              JPG, PNG, WEBP, GIF, PDF, MP4, MOV — Maks. {MAX_SIZE_MB}MB
            </p>
            <input
              ref={inputRef}
              type="file"
              id="asset-upload"
              className="hidden"
              accept={Object.keys(ALLOWED_MIME_TYPES).join(',')}
              onChange={handleFileChange}
            />
          </>
        ) : (
          <div className="flex items-center justify-between gap-3 text-left">
            <div className="flex items-center gap-3 overflow-hidden flex-1">
              {/* File type indicator */}
              <div className="w-10 h-10 rounded-[10px] bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center flex-shrink-0">
                <File size={20} />
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-bold text-[#111827] truncate">{file.name}</p>
                <p className="text-xs text-[#6B7280]">
                  {ALLOWED_MIME_TYPES[file.type] ?? 'File'} &middot; {formatFileSize(file.size)}
                </p>
              </div>
            </div>
            {!isUploading && (
              <button
                onClick={handleReset}
                className="text-[#9CA3AF] hover:text-rose-500 transition-colors flex-shrink-0 p-1 rounded-lg hover:bg-rose-50"
                aria-label="Hapus file yang dipilih"
              >
                <X size={16} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Feedback messages */}
      {error && (
        <div className="flex items-start gap-2.5 p-3 bg-rose-50 border border-rose-100 rounded-[10px]">
          <AlertCircle size={15} className="text-rose-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs font-semibold text-rose-700 leading-relaxed">{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2.5 p-3 bg-emerald-50 border border-emerald-100 rounded-[10px]">
          <CheckCircle size={15} className="text-emerald-500 flex-shrink-0" />
          <p className="text-xs font-semibold text-emerald-700">Aset berhasil diupload!</p>
        </div>
      )}

      {/* Upload button — only shown when a valid file is selected */}
      {file && (
        <button
          onClick={handleUpload}
          disabled={isUploading}
          className="w-full flex items-center justify-center gap-2 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-60 text-white text-sm font-bold py-3 rounded-[12px] transition-all shadow-sm shadow-[#2563EB]/20"
        >
          {isUploading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Mengupload...
            </>
          ) : (
            <>
              <UploadCloud size={16} />
              Mulai Upload
            </>
          )}
        </button>
      )}
    </div>
  )
}
