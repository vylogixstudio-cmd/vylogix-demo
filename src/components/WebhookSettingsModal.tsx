'use client'

import { useState, useTransition } from 'react'
import { Webhook, X, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react'
import { updateWebhookUrl } from '@/app/admin/dashboard/actions'

interface WebhookSettingsModalProps {
  currentUrl: string | null
}

export default function WebhookSettingsModal({ currentUrl }: WebhookSettingsModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    const formData = new FormData(e.currentTarget)
    
    startTransition(async () => {
      const result = await updateWebhookUrl(formData)
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        setTimeout(() => setIsOpen(false), 2000)
      }
    })
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-[#4B5563] bg-white border border-[#E5E7EB] rounded-[10px] hover:bg-[#F3F4F6] transition-colors"
      >
        <Webhook size={14} className={currentUrl ? "text-emerald-500" : "text-gray-400"} />
        <span className="hidden sm:inline">Webhook</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-[24px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-100 text-blue-600 rounded-xl">
                  <Webhook size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-gray-900">Pengaturan Webhook</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Kirim notifikasi real-time ke aplikasi pihak ketiga</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="mb-6">
                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
                  URL Webhook
                </label>
                <input
                  type="url"
                  name="webhookUrl"
                  defaultValue={currentUrl || ''}
                  placeholder="https://hook.make.com/..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-[12px] text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-gray-400"
                />
                <p className="mt-2 text-xs text-gray-500">
                  Kosongkan field ini jika ingin mematikan fitur Webhook. Payload dikirim dalam format JSON.
                </p>
              </div>

              {error && (
                <div className="mb-6 p-3 bg-red-50 text-red-600 rounded-[12px] flex items-start gap-2 text-sm border border-red-100">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              {success && (
                <div className="mb-6 p-3 bg-emerald-50 text-emerald-600 rounded-[12px] flex items-center gap-2 text-sm border border-emerald-100">
                  <CheckCircle size={16} />
                  <p className="font-semibold">URL Webhook berhasil disimpan!</p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-[12px] transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2.5 bg-[#111827] text-white text-sm font-bold rounded-[12px] hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 shadow-md shadow-gray-900/10"
                >
                  {isPending ? <Loader2 size={16} className="animate-spin" /> : null}
                  Simpan Pengaturan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
