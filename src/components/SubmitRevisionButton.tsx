'use client'

import { useFormStatus } from 'react-dom'
import { Loader2 } from 'lucide-react'

interface Props {
  isCompleted: boolean
}

export default function SubmitRevisionButton({ isCompleted }: Props) {
  const { pending } = useFormStatus()
  
  const defaultText = isCompleted ? 'Kirim Laporan Bug' : 'Ajukan Revisi'
  const loadingText = isCompleted ? 'Mengirim Laporan...' : 'Mengirim Revisi...'

  return (
    <button 
      type="submit" 
      disabled={pending}
      className={`w-full flex justify-center items-center gap-2 bg-rose-500 text-white text-sm font-bold py-3 rounded-[12px] transition-all shadow-sm ${
        pending ? 'opacity-70 cursor-not-allowed' : 'hover:bg-rose-600'
      }`}
    >
      {pending ? (
        <>
          <Loader2 size={18} className="animate-spin" />
          {loadingText}
        </>
      ) : (
        defaultText
      )}
    </button>
  )
}
