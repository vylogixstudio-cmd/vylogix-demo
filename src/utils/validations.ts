import { z } from 'zod'

export const clientAccountSchema = z.object({
  email: z.string().email("Format email tidak valid."),
  password: z.string().min(6, "Password minimal 6 karakter."),
  fullName: z.string().min(3, "Nama lengkap minimal 3 karakter."),
})

export const clientProjectSchema = z.object({
  clientId: z.string().uuid("Client ID tidak valid."),
  title: z.string().min(3, "Judul proyek minimal 3 karakter."),
  serviceType: z.string().min(2, "Tipe jasa tidak valid."),
  totalPrice: z.number().nonnegative("Total harga tidak boleh negatif."),
})

export const updatePasswordSchema = z.object({
  password: z.string().min(6, "Password minimal 6 karakter."),
})

export const registerAgencySchema = z.object({
  agencyName: z.string().min(3, "Nama agensi minimal 3 karakter."),
  ownerEmail: z.string().email("Format email tidak valid."),
})
