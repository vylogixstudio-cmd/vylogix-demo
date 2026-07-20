// ─────────────────────────────────────────────────────────────────────────────
// Rate Limiting Utility (Upstash Redis)
//
// Cara pakai:
//   1. Buat akun gratis di upstash.com
//   2. Buat Redis database baru
//   3. Copy REST URL dan REST Token ke .env.local:
//      UPSTASH_REDIS_REST_URL=https://...
//      UPSTASH_REDIS_REST_TOKEN=...
//   4. Tambahkan juga ke Vercel Environment Variables di dashboard.vercel.com
//
// Jika env var tidak ada → rate limiting di-SKIP (tidak error).
// Ini memastikan development lokal tetap berjalan tanpa Redis.
// ─────────────────────────────────────────────────────────────────────────────

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// ── Singleton instances (reused across requests in the same serverless instance)

let _redis: Redis | null = null
let _loginRatelimit: Ratelimit | null = null

function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null // Env vars not configured — skip rate limiting
  }
  if (!_redis) {
    _redis = new Redis({
      url:   process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  }
  return _redis
}

// ── Rate limit rules ──────────────────────────────────────────────────────────
//
// Login: Maksimal 5 percobaan per 15 menit per IP.
// Setelah 5 gagal → block dan tampilkan pesan ramah user.

function getLoginRatelimit(): Ratelimit | null {
  const redis = getRedis()
  if (!redis) return null

  if (!_loginRatelimit) {
    _loginRatelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '15 m'),
      analytics: false, // Aktifkan jika mau lihat statistik di dashboard Upstash
      prefix:  '@crm/login', // Namespace agar tidak konflik dengan key lain
    })
  }
  return _loginRatelimit
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface RatelimitResult {
  /** true = request diizinkan, false = di-block */
  allowed: boolean
  /** Sisa percobaan yang boleh dilakukan */
  remaining: number
  /** Waktu reset (Unix timestamp dalam detik) */
  resetAt: number
}

/**
 * Cek apakah IP ini masih boleh coba login.
 *
 * @param ip - IP address pengirim request. Gunakan header X-Forwarded-For
 *             yang di-set oleh Vercel/proxy (sudah ditangani di login action).
 */
export async function checkLoginRatelimit(ip: string): Promise<RatelimitResult> {
  const ratelimit = getLoginRatelimit()

  // Rate limiting tidak dikonfigurasi — izinkan semua request
  if (!ratelimit) {
    return { allowed: true, remaining: 999, resetAt: 0 }
  }

  try {
    const result = await ratelimit.limit(ip)
    return {
      allowed:   result.success,
      remaining: result.remaining,
      resetAt:   result.reset,
    }
  } catch (err) {
    // Jika Redis down → fail open (izinkan request) agar user tidak terkena dampak
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Rate Limit] Redis error, failing open:', err)
    }
    return { allowed: true, remaining: 999, resetAt: 0 }
  }
}
