'use client'

import { useRef, useState, useTransition } from 'react'
import {
  ShieldCheck,
  Eye,
  EyeOff,
  Lock,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react'
import { updatePassword } from './actions'

// ── Component ────────────────────────────────────────────────────────────────

export default function ChangePasswordCard() {
  const formRef = useRef<HTMLFormElement>(null)
  const [isPending, startTransition] = useTransition()

  // Field values (controlled so we can clear on success)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Visibility toggles for each field
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  // Feedback states
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // ── Client-side validation ────────────────────────────────────────────────

  const validate = (): string | null => {
    if (!password || !confirmPassword) {
      return 'Semua field password harus diisi.'
    }
    if (password.length < 6) {
      return 'Password baru minimal harus 6 karakter.'
    }
    if (password !== confirmPassword) {
      return 'Password baru dan konfirmasi tidak cocok!'
    }
    return null
  }

  // ── Submit handler ────────────────────────────────────────────────────────

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSuccessMsg(null)
    setErrorMsg(null)

    const validationError = validate()
    if (validationError) {
      setErrorMsg(validationError)
      return
    }

    startTransition(async () => {
      try {
        const result = await updatePassword(password)
        if (result?.error) {
          setErrorMsg(result.error)
        } else {
          setSuccessMsg('Password berhasil diperbarui!')
          // Clear form fields on success
          setPassword('')
          setConfirmPassword('')
          setShowPassword(false)
          setShowConfirm(false)
        }
      } catch {
        setErrorMsg('Terjadi kesalahan yang tidak terduga. Coba lagi.')
      }
    })
  }

  // ── Strength indicator helpers ────────────────────────────────────────────

  const getStrength = (): { level: number; label: string; color: string } => {
    const len = password.length
    if (len === 0) return { level: 0, label: '', color: '' }
    if (len < 6)  return { level: 1, label: 'Terlalu pendek', color: 'bg-rose-400' }
    if (len < 8)  return { level: 2, label: 'Lemah', color: 'bg-amber-400' }
    if (len < 12) return { level: 3, label: 'Cukup', color: 'bg-yellow-400' }
    return       { level: 4, label: 'Kuat', color: 'bg-emerald-500' }
  }

  const strength = getStrength()

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-[20px] shadow-sm border border-black/5 overflow-hidden">

      {/* ── Card Header ───────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 p-6 border-b border-black/5">
        <div className="p-3 bg-rose-50 rounded-[14px] text-rose-500 shrink-0">
          <ShieldCheck size={22} />
        </div>
        <div>
          <h2 className="font-extrabold text-lg text-[#111827] font-['Plus_Jakarta_Sans']">
            Keamanan &amp; Ubah Password
          </h2>
          <p className="text-[#4B5563] text-xs mt-0.5">
            Perbarui password akun admin Anda secara berkala untuk menjaga keamanan.
          </p>
        </div>
      </div>

      {/* ── Form Body ─────────────────────────────────────────────────────── */}
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        autoComplete="new-password"
        className="p-6 space-y-5"
      >
        {/* Password Baru */}
        <div>
          <label
            htmlFor="settings-new-password"
            className="flex items-center gap-1.5 text-xs font-bold text-[#4B5563] uppercase tracking-wider mb-2"
          >
            <Lock size={11} />
            Password Baru
            <span className="text-rose-500">*</span>
          </label>

          <div className="relative">
            <input
              id="settings-new-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setErrorMsg(null)
                setSuccessMsg(null)
              }}
              placeholder="Masukkan password baru"
              className="w-full px-4 py-3 pr-11 bg-[#F8F9FA] border border-black/10 rounded-[12px] text-sm font-medium text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
              disabled={isPending}
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#4B5563] transition-colors p-0.5"
              aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {/* Password Strength Bar */}
          {password.length > 0 && (
            <div className="mt-2.5 space-y-1.5">
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                      strength.level >= step ? strength.color : 'bg-black/8'
                    }`}
                  />
                ))}
              </div>
              <p className={`text-[11px] font-semibold ${
                strength.level <= 1 ? 'text-rose-500'
                : strength.level === 2 ? 'text-amber-500'
                : strength.level === 3 ? 'text-yellow-600'
                : 'text-emerald-600'
              }`}>
                {strength.label}
              </p>
            </div>
          )}
        </div>

        {/* Konfirmasi Password */}
        <div>
          <label
            htmlFor="settings-confirm-password"
            className="flex items-center gap-1.5 text-xs font-bold text-[#4B5563] uppercase tracking-wider mb-2"
          >
            <Lock size={11} />
            Konfirmasi Password Baru
            <span className="text-rose-500">*</span>
          </label>

          <div className="relative">
            <input
              id="settings-confirm-password"
              name="confirmPassword"
              type={showConfirm ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value)
                setErrorMsg(null)
                setSuccessMsg(null)
              }}
              placeholder="Ulangi password baru"
              className={`w-full px-4 py-3 pr-11 bg-[#F8F9FA] border rounded-[12px] text-sm font-medium text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 transition-all ${
                confirmPassword.length > 0 && confirmPassword !== password
                  ? 'border-rose-300 focus:ring-rose-500/20 focus:border-rose-400'
                  : confirmPassword.length > 0 && confirmPassword === password
                  ? 'border-emerald-300 focus:ring-emerald-500/20 focus:border-emerald-400'
                  : 'border-black/10 focus:ring-[#2563EB]/20 focus:border-[#2563EB]'
              }`}
              disabled={isPending}
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#4B5563] transition-colors p-0.5"
              aria-label={showConfirm ? 'Sembunyikan konfirmasi' : 'Tampilkan konfirmasi'}
            >
              {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {/* Live match indicator */}
          {confirmPassword.length > 0 && (
            <p className={`text-[11px] font-semibold mt-1.5 flex items-center gap-1 ${
              confirmPassword === password ? 'text-emerald-600' : 'text-rose-500'
            }`}>
              {confirmPassword === password ? (
                <><CheckCircle2 size={11} /> Password cocok</>
              ) : (
                <><XCircle size={11} /> Password tidak cocok</>
              )}
            </p>
          )}
        </div>

        {/* ── Feedback Banners ────────────────────────────────────────────── */}
        {errorMsg && (
          <div className="flex items-start gap-2.5 p-3.5 bg-rose-50 border border-rose-100 rounded-[12px]">
            <XCircle size={16} className="text-rose-500 mt-0.5 shrink-0" />
            <p className="text-xs font-semibold text-rose-600">{errorMsg}</p>
          </div>
        )}
        {successMsg && (
          <div className="flex items-start gap-2.5 p-3.5 bg-emerald-50 border border-emerald-100 rounded-[12px]">
            <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 shrink-0" />
            <p className="text-xs font-semibold text-emerald-700">{successMsg}</p>
          </div>
        )}

        {/* ── Submit ──────────────────────────────────────────────────────── */}
        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={isPending}
            id="settings-update-password-btn"
            className="flex items-center gap-2.5 bg-[#111827] hover:bg-black disabled:opacity-60 text-white font-bold text-sm px-6 py-3 rounded-[12px] transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-[#111827]/30"
          >
            {isPending ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Memperbarui...
              </>
            ) : (
              <>
                <ShieldCheck size={16} />
                Perbarui Password
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
