// Note: No 'use server' here — this file exports both an async function AND a const object.
// Next.js 'use server' only allows async function exports.
// This module is still server-only by nature (calls createAdminClient which uses server env vars).

import { createAdminClient } from '@/utils/supabase/admin'

// ─────────────────────────────────────────────────────────────────────────────
// Audit Log Helper
//
// Dipanggil dari server actions untuk mencatat setiap aksi penting ke tabel
// `audit_logs`. Jika pencatatan gagal, kita tidak throw error — aktivitas
// utama user tidak boleh diblokir hanya karena audit log gagal.
//
// Cara pakai:
//   await logAudit({
//     organizationId: '...',
//     actorId: user.id,
//     actorEmail: user.email,
//     action: 'project.create',
//     targetType: 'project',
//     targetId: project.id,
//     targetName: project.title,
//     metadata: { initial_status: 'briefing', total_price: 5000000 }
//   })
// ─────────────────────────────────────────────────────────────────────────────

export interface AuditPayload {
  /** UUID dari organization — untuk filter per tenant */
  organizationId: string | null
  /** UUID dari user yang melakukan aksi */
  actorId: string
  /** Email aktor — disimpan untuk display (tidak join setiap kali) */
  actorEmail: string | undefined
  /**
   * Format: 'entity.verb'
   * Contoh: 'project.create', 'project.update_status', 'client.create',
   *         'agency.suspend', 'revision.create', 'asset.upload'
   */
  action: string
  /** Tipe resource yang terdampak: 'project', 'client', 'agency', dll. */
  targetType?: string
  /** UUID dari resource yang terdampak */
  targetId?: string
  /** Nama human-readable dari resource (untuk display tanpa join) */
  targetName?: string
  /** Extra context — before/after value, parameter, dll. */
  metadata?: Record<string, unknown>
}

export async function logAudit(payload: AuditPayload): Promise<void> {
  try {
    const supabase = createAdminClient()
    await supabase.from('audit_logs').insert({
      organization_id: payload.organizationId,
      actor_id:        payload.actorId,
      actor_email:     payload.actorEmail ?? null,
      action:          payload.action,
      target_type:     payload.targetType ?? null,
      target_id:       payload.targetId ?? null,
      target_name:     payload.targetName ?? null,
      metadata:        payload.metadata ?? null,
    })

    // ── 🚀 Trigger Webhook & Auto-Cleanup (Fire & Forget) ──
    if (payload.organizationId) {
      // 1. Fetch webhook_url and log_retention_days for this organization
      const { data: org } = await supabase
        .from('organizations')
        .select('webhook_url, log_retention_days')
        .eq('id', payload.organizationId)
        .single()
      
      // -- Webhook Logic --
      if (org?.webhook_url) {
        const webhookPayload = {
          event: payload.action,
          timestamp: new Date().toISOString(),
          data: {
            actor: payload.actorEmail || payload.actorId,
            targetType: payload.targetType,
            targetName: payload.targetName,
            metadata: payload.metadata
          }
        }

        fetch(org.webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(webhookPayload)
        }).catch(err => {
          console.error('[Webhook Error] Failed to send webhook to', org.webhook_url, err)
        })
      }

      // -- Auto-Cleanup Logic --
      const retentionDays = org?.log_retention_days ?? 30
      if (retentionDays > 0) {
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays)
        
        // Fire and forget the delete query
        supabase
          .from('audit_logs')
          .delete()
          .eq('organization_id', payload.organizationId)
          .lt('created_at', cutoffDate.toISOString())
          .then(({ error }) => {
            if (error && process.env.NODE_ENV === 'development') {
              console.error('[Audit Cleanup Error]', error.message)
            }
          })
          .catch((err) => {
            console.error('[Audit Cleanup Exception]', err)
          })
      }
    }
  } catch (err) {
    // Hanya log di development — di production gunakan monitoring service
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Audit Log] Failed to write audit entry:', err)
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Action name constants — import dari sini untuk konsistensi
// ─────────────────────────────────────────────────────────────────────────────

export const AUDIT_ACTIONS = {
  // Project
  PROJECT_CREATE:        'project.create',
  PROJECT_UPDATE_STATUS: 'project.update_status',
  PROJECT_UPDATE:        'project.update',
  PROJECT_DELETE:        'project.delete',

  // Client
  CLIENT_CREATE:         'client.create',
  CLIENT_DELETE:         'client.delete',

  // Revision / Bug Report
  REVISION_CREATE:       'revision.create',
  REVISION_REPLY:        'revision.reply',
  REVISION_CLOSE:        'revision.close',

  // Asset
  ASSET_UPLOAD:          'asset.upload',

  // Agency (Super Admin actions)
  AGENCY_CREATE:         'agency.create',
  AGENCY_SUSPEND:        'agency.suspend',
  AGENCY_ACTIVATE:       'agency.activate',
  AGENCY_LICENSE_UPDATE: 'agency.license_update',

  // Settings
  SETTINGS_UPDATE:       'settings.update',
  PASSWORD_CHANGE:       'auth.password_change',
} as const
