'use client'

import { FileText } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Organization {
  name: string
  tagline?: string | null
  logo_url?: string | null
}

interface InvoiceGeneratorProps {
  project: {
    id: string
    title: string
    service_type: string
    total_price: number
    termin_1: number
    termin_2: number
    termin_3: number
    profiles?: { full_name?: string | null; email?: string | null } | null
  }
  organization?: Organization | null
  variant?: 'admin' | 'client'
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function InvoiceGenerator({
  project,
  organization,
  variant = 'admin',
}: InvoiceGeneratorProps) {
  const isPaid =
    project.termin_1 + project.termin_2 + project.termin_3 >= project.total_price &&
    project.total_price > 0

  if (!isPaid) return null

  // ── Resolve org display values ────────────────────────────────────────────
  const orgName = organization?.name ?? 'Studio'
  const orgTagline = organization?.tagline ?? ''
  const orgLogoUrl = organization?.logo_url ?? null

  // Build the logo/name block for the invoice header
  const logoBlock = orgLogoUrl
    ? `<img src="${orgLogoUrl}" alt="${orgName}" style="max-height:56px; max-width:180px; object-fit:contain; display:block;" />
       <p style="margin-top: 8px; font-weight: 800; font-size: 14px; color: #111827; letter-spacing: -0.5px;">${orgName}</p>`
    : `<div class="logo">${orgName}</div>`

  // ── Print handler ─────────────────────────────────────────────────────────
  const handlePrint = () => {
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8" />
        <title>Invoice - ${project.title}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Arial', sans-serif; padding: 48px; color: #111827; background: #fff; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #E5E7EB; padding-bottom: 24px; margin-bottom: 32px; }
          .logo { font-size: 24px; font-weight: 900; letter-spacing: -1px; color: #111827; }
          .tagline { margin-top: 6px; font-size: 12px; color: #6B7280; }
          .invoice-title { font-size: 32px; font-weight: 800; color: #2563EB; text-transform: uppercase; }
          .invoice-number { margin-top: 6px; font-size: 14px; font-weight: bold; color: #374151; }
          .info-grid { display: flex; justify-content: space-between; margin-bottom: 40px; gap: 24px; }
          .info-block h4 { font-size: 11px; color: #6B7280; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
          .info-block p { font-size: 14px; font-weight: bold; }
          .info-block p.light { font-weight: normal; color: #4B5563; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 32px; }
          th { background: #F8F9FA; padding: 12px 16px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #4B5563; border-bottom: 1px solid #E5E7EB; }
          td { padding: 16px; border-bottom: 1px solid #F3F4F6; font-size: 14px; }
          .total-row td { background: #F8F9FA; border-top: 2px solid #111827; font-size: 16px; font-weight: bold; }
          .footer { margin-top: 48px; text-align: center; font-size: 12px; color: #9CA3AF; border-top: 1px solid #E5E7EB; padding-top: 24px; }
          .badge { display: inline-block; padding: 5px 12px; background: #10B981; color: white; border-radius: 4px; font-size: 12px; font-weight: bold; letter-spacing: 0.5px; }
          @media print {
            body { padding: 32px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            ${logoBlock}
          </div>
          <div style="text-align: right;">
            <p class="invoice-title">INVOICE</p>
            <p class="invoice-number">#INV-${project.id.split('-')[0].toUpperCase()}</p>
          </div>
        </div>

        <div class="info-grid">
          <div class="info-block">
            <h4>Ditagihkan Kepada:</h4>
            <p>${project.profiles?.full_name || 'Klien'}</p>
            <p class="light">${project.profiles?.email || '-'}</p>
          </div>
          <div class="info-block" style="text-align: right;">
            <h4>Tanggal Terbit:</h4>
            <p>${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            <h4 style="margin-top: 14px;">Status:</h4>
            <div class="badge">LUNAS</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Deskripsi Layanan</th>
              <th style="text-align: center; width: 120px;">Tipe</th>
              <th style="text-align: right; width: 160px;">Jumlah</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>${project.title}</strong><br/>
                <span style="font-size: 12px; color: #6B7280;">Layanan pengembangan secara komprehensif</span>
              </td>
              <td style="text-align: center; text-transform: uppercase; font-weight: bold;">
                ${project.service_type}
              </td>
              <td style="text-align: right; font-weight: bold;">
                Rp ${project.total_price.toLocaleString('id-ID')}
              </td>
            </tr>
            <tr class="total-row">
              <td colspan="2" style="text-align: right; padding-right: 16px;">TOTAL DIBAYARKAN</td>
              <td style="text-align: right;">Rp ${project.total_price.toLocaleString('id-ID')}</td>
            </tr>
          </tbody>
        </table>

        <div class="footer">
          <p>Terima kasih atas kepercayaan Anda menggunakan layanan <strong>${orgName}</strong>.</p>
          <p style="margin-top: 6px;">Dokumen ini dibuat otomatis secara elektronik dan sah sebagai bukti pembayaran.</p>
        </div>
      </body>
      </html>
    `

    const iframe = document.createElement('iframe')
    iframe.style.display = 'none'
    document.body.appendChild(iframe)

    iframe.contentWindow?.document.open()
    iframe.contentWindow?.document.write(htmlContent)
    iframe.contentWindow?.document.close()

    setTimeout(() => {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
      setTimeout(() => {
        document.body.removeChild(iframe)
      }, 1000)
    }, 500)
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const adminClasses =
    'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700 border-emerald-400/30'
  const clientClasses = 'bg-transparent border border-white/20 text-white hover:bg-white/10'
  const buttonClass = variant === 'client' ? clientClasses : adminClasses

  return (
    <button
      type="button"
      onClick={handlePrint}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all shadow-md mt-4 w-full justify-center ${buttonClass}`}
    >
      <FileText size={16} />
      {variant === 'client' ? 'Unduh Invoice Resmi' : 'Cetak Invoice Resmi'}
    </button>
  )
}
