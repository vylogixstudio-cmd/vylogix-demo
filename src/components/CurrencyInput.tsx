'use client'

import { useState, useEffect } from 'react'

interface CurrencyInputProps {
  name: string
  defaultValue?: number
  label?: string
}

export default function CurrencyInput({ name, defaultValue = 0, label }: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = useState('')
  const [rawValue, setRawValue] = useState(defaultValue)

  useEffect(() => {
    setDisplayValue(formatRupiah(defaultValue))
  }, [defaultValue])

  const formatRupiah = (value: number) => {
    if (value === 0) return ''
    return 'Rp ' + value.toLocaleString('id-ID')
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove all non-numeric characters
    const numericString = e.target.value.replace(/[^0-9]/g, '')
    const numberValue = parseInt(numericString, 10) || 0
    
    setRawValue(numberValue)
    if (numericString === '') {
      setDisplayValue('')
    } else {
      setDisplayValue(formatRupiah(numberValue))
    }
  }

  return (
    <div>
      {label && <label className="block text-xs font-bold uppercase tracking-wider text-[#4B5563] mb-2">{label}</label>}
      <input
        type="text"
        value={displayValue}
        onChange={handleChange}
        placeholder="Rp 0"
        className="w-full px-4 py-3 bg-[#F8F9FA] border border-black/10 rounded-[12px] text-sm font-medium focus:border-[#2563EB] outline-none transition-all"
      />
      <input type="hidden" name={name} value={rawValue} />
    </div>
  )
}
