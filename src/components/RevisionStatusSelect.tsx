'use client'

import { useTransition } from 'react'
import { updateRevisionStatus } from '@/app/admin/dashboard/actions'

interface RevisionStatusSelectProps {
  revisionId: string
  currentStatus: string
}

export default function RevisionStatusSelect({ revisionId, currentStatus }: RevisionStatusSelectProps) {
  const [isPending, startTransition] = useTransition()

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value
    startTransition(() => {
      updateRevisionStatus(revisionId, newStatus)
    })
  }

  return (
    <select 
      value={currentStatus} 
      onChange={handleChange}
      disabled={isPending}
      className="px-3 py-1.5 bg-[#F8F9FA] border border-black/10 rounded-lg text-xs font-bold focus:border-[#2563EB] outline-none text-[#111827] cursor-pointer transition-all disabled:opacity-50"
    >
      <option value="Pending">Pending</option>
      <option value="On Progress">On Progress</option>
      <option value="Completed">Completed</option>
    </select>
  )
}
