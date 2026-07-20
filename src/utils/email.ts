import { Resend } from 'resend'

// Inisialisasi Resend SDK dengan API Key dari environment variables
const resend = new Resend(process.env.RESEND_API_KEY)

interface ProjectCompletedEmailParams {
  clientEmail: string
  clientName: string
  projectName: string
  agencyName: string
}

/**
 * Mengirim email notifikasi transaksional ke klien saat proyek ditandai sebagai "Completed".
 */
export async function sendProjectCompletedEmail({
  clientEmail,
  clientName,
  projectName,
  agencyName,
}: ProjectCompletedEmailParams) {
  // Verifikasi ketersediaan API key
  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY is not set in environment variables.')
    return { success: false, error: 'Resend API Key missing' }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: `${agencyName} <onboarding@resend.dev>`,
      to: [clientEmail],
      subject: `🎉 Proyek Selesai: ${projectName}`,
      html: `
        <!DOCTYPE html>
        <html lang="id">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Proyek Selesai</title>
          <style>
            body { font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #F8F9FA; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); border: 1px solid #E5E7EB; }
            .header { background-color: #2563EB; padding: 32px 24px; text-align: center; color: #ffffff; }
            .header h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em; }
            .content { padding: 32px 24px; color: #374151; line-height: 1.6; }
            .content p { margin: 0 0 16px 0; font-size: 15px; }
            .highlight-box { background-color: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 8px; padding: 16px; margin: 24px 0; }
            .highlight-box p { margin: 0; color: #1E3A8A; font-weight: 600; font-size: 16px; text-align: center; }
            .cta-button { display: inline-block; background-color: #2563EB; color: #ffffff; text-decoration: none; font-weight: 700; padding: 12px 24px; border-radius: 8px; margin-top: 16px; text-align: center; width: calc(100% - 48px); }
            .footer { background-color: #F9FAFB; border-top: 1px solid #E5E7EB; padding: 24px; text-align: center; color: #6B7280; font-size: 13px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Selamat, ${clientName}! 🎉</h1>
            </div>
            <div class="content">
              <p>Halo <strong>${clientName}</strong>,</p>
              <p>Kami memiliki kabar gembira untuk Anda! Tim kami di <strong>${agencyName}</strong> telah menyelesaikan proyek Anda dengan hasil terbaik.</p>
              
              <div class="highlight-box">
                <p>Nama Proyek: ${projectName}</p>
              </div>
              
              <p>Tahap <em>development</em> & <em>quality assurance</em> telah rampung. Sekarang saatnya Anda meninjau hasil akhir proyek, melihat detail garansi, dan mengunduh aset terkait (jika ada).</p>
              
              <a href="https://vylogix.com/client/dashboard" class="cta-button">Cek Portal Klien Sekarang</a>
            </div>
            <div class="footer">
              <p>Pesan ini dikirim secara otomatis oleh sistem CRM ${agencyName}.<br>Silakan balas email ini jika Anda memiliki pertanyaan lebih lanjut.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    })

    if (error) {
      console.error('Failed to send Resend email:', error)
      return { success: false, error: error.message }
    }

    console.log('Successfully sent completed project email to:', clientEmail)
    return { success: true, data }
  } catch (err: any) {
    console.error('Unexpected error sending email:', err)
    return { success: false, error: err.message }
  }
}
