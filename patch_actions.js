const fs = require('fs');

function patchFile(filePath, replacements) {
    let content = fs.readFileSync(filePath, 'utf-8');
    for (const [target, replacement] of replacements) {
        if (!content.includes(target)) {
            console.error(`Target not found in ${filePath}:\n${target}`);
        }
        content = content.replace(target, replacement);
    }
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Patched ${filePath}`);
}

const DEMO_RETURN = `  // 🚫 DEMO MODE: Intercept database mutations
  await new Promise(r => setTimeout(r, 500))
  return { error: '👀 Mode Demo: Tindakan ini disimulasikan dan tidak disimpan.' }`;

// src/app/admin/dashboard/actions.ts
const adminActionsPath = 'src/app/admin/dashboard/actions.ts';
patchFile(adminActionsPath, [
    [
        `  const supabaseAdmin = createAdminClient()
  
  const { error } = await supabaseAdmin
    .from('organizations')
    .update({ webhook_url: webhookUrl })`,
        `${DEMO_RETURN}\n\n  const supabaseAdmin = createAdminClient()
  
  const { error } = await supabaseAdmin
    .from('organizations')
    .update({ webhook_url: webhookUrl })`
    ],
    [
        `  const supabaseAdmin = createAdminClient()

  // Buat user baru di Supabase Auth
  const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({`,
        `${DEMO_RETURN}\n\n  const supabaseAdmin = createAdminClient()

  // Buat user baru di Supabase Auth
  const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({`
    ],
    [
        `  if (!clientProfile) {
    return { error: 'Klien tidak ditemukan atau bukan bagian dari organisasi Anda.' }
  }

  const { error } = await supabaseAdmin
    .from('projects')
    .insert({`,
        `  if (!clientProfile) {
    return { error: 'Klien tidak ditemukan atau bukan bagian dari organisasi Anda.' }
  }

${DEMO_RETURN}

  const { error } = await supabaseAdmin
    .from('projects')
    .insert({`
    ],
    [
        `  const oldStatus = existingProject?.status

  // 🔒 IDOR Prevention: .eq('organization_id', orgId) memastikan
  //    admin hanya bisa update project milik org-nya sendiri.
  //    Jika projectId milik org lain, query tidak akan match → 0 rows updated.
  const { error } = await supabaseAdmin
    .from('projects')
    .update({`,
        `  const oldStatus = existingProject?.status

${DEMO_RETURN}

  // 🔒 IDOR Prevention: .eq('organization_id', orgId) memastikan
  //    admin hanya bisa update project milik org-nya sendiri.
  //    Jika projectId milik org lain, query tidak akan match → 0 rows updated.
  const { error } = await supabaseAdmin
    .from('projects')
    .update({`
    ],
    [
        `  const oldStatus = existingProject?.status

  // 🔒 IDOR Prevention: filter by organization_id
  const { error } = await supabaseAdmin
    .from('projects')
    .update({`,
        `  const oldStatus = existingProject?.status

${DEMO_RETURN}

  // 🔒 IDOR Prevention: filter by organization_id
  const { error } = await supabaseAdmin
    .from('projects')
    .update({`
    ],
    [
        `  if (!revision) {
    return { error: 'Revisi tidak ditemukan atau bukan milik organisasi Anda.' }
  }

  const { error } = await supabaseAdmin
    .from('project_revisions')
    .update({ status, updated_at: new Date().toISOString() })`,
        `  if (!revision) {
    return { error: 'Revisi tidak ditemukan atau bukan milik organisasi Anda.' }
  }

${DEMO_RETURN}

  const { error } = await supabaseAdmin
    .from('project_revisions')
    .update({ status, updated_at: new Date().toISOString() })`
    ],
    [
        `  if (!revision) {
    return { error: 'Revisi tidak ditemukan atau bukan milik organisasi Anda.' }
  }

  const { error } = await supabaseAdmin
    .from('project_revisions')
    .update({ admin_reply: adminReply, updated_at: new Date().toISOString() })`,
        `  if (!revision) {
    return { error: 'Revisi tidak ditemukan atau bukan milik organisasi Anda.' }
  }

${DEMO_RETURN}

  const { error } = await supabaseAdmin
    .from('project_revisions')
    .update({ admin_reply: adminReply, updated_at: new Date().toISOString() })`
    ],
    [
        `  if (!asset) {
    return { error: 'Asset tidak ditemukan atau bukan milik organisasi Anda.' }
  }

  // Hapus dari Supabase Storage`,
        `  if (!asset) {
    return { error: 'Asset tidak ditemukan atau bukan milik organisasi Anda.' }
  }

${DEMO_RETURN}

  // Hapus dari Supabase Storage`
    ],
    [
        `  const supabaseAdmin = createAdminClient()

  const { error } = await supabaseAdmin
    .from('agency_services')
    .insert({ organization_id: orgId, name: name.trim() })`,
        `  const supabaseAdmin = createAdminClient()

${DEMO_RETURN}

  const { error } = await supabaseAdmin
    .from('agency_services')
    .insert({ organization_id: orgId, name: name.trim() })`
    ],
    [
        `  const supabaseAdmin = createAdminClient()

  // 🔒 IDOR Prevention: filter by organization_id
  const { error } = await supabaseAdmin
    .from('agency_services')
    .update({ name: newName.trim() })`,
        `  const supabaseAdmin = createAdminClient()

${DEMO_RETURN}

  // 🔒 IDOR Prevention: filter by organization_id
  const { error } = await supabaseAdmin
    .from('agency_services')
    .update({ name: newName.trim() })`
    ],
    [
        `  const supabaseAdmin = createAdminClient()

  // 🔒 IDOR Prevention: filter by organization_id
  const { error } = await supabaseAdmin
    .from('agency_services')
    .delete()`,
        `  const supabaseAdmin = createAdminClient()

${DEMO_RETURN}

  // 🔒 IDOR Prevention: filter by organization_id
  const { error } = await supabaseAdmin
    .from('agency_services')
    .delete()`
    ]
]);

// src/app/admin/dashboard/settings/actions.ts
const adminSettingsPath = 'src/app/admin/dashboard/settings/actions.ts';
patchFile(adminSettingsPath, [
    [
        `  // ── Bagian 1: Update teks (name & tagline) — SELALU dijalankan ─────────────
  const textPayload: Record<string, string | number | null> = { name, whatsapp_number, log_retention_days }`,
        `${DEMO_RETURN}\n\n  // ── Bagian 1: Update teks (name & tagline) — SELALU dijalankan ─────────────
  const textPayload: Record<string, string | number | null> = { name, whatsapp_number, log_retention_days }`
    ],
    [
        `  if (!name?.trim()) {
    return { error: 'Nama layanan wajib diisi.' }
  }

  const { error } = await supabase
    .from('agency_services')
    .insert([{ organization_id: orgId, name: name.trim() }])`,
        `  if (!name?.trim()) {
    return { error: 'Nama layanan wajib diisi.' }
  }

${DEMO_RETURN}

  const { error } = await supabase
    .from('agency_services')
    .insert([{ organization_id: orgId, name: name.trim() }])`
    ],
    [
        `  if (!newName?.trim() || !serviceId) {
    return { error: 'Nama layanan tidak valid.' }
  }

  const { error } = await supabase
    .from('agency_services')
    .update({ name: newName.trim() })`,
        `  if (!newName?.trim() || !serviceId) {
    return { error: 'Nama layanan tidak valid.' }
  }

${DEMO_RETURN}

  const { error } = await supabase
    .from('agency_services')
    .update({ name: newName.trim() })`
    ],
    [
        `  if (!serviceId) {
    return { error: 'ID layanan tidak valid.' }
  }

  const { error } = await supabase
    .from('agency_services')
    .delete()`,
        `  if (!serviceId) {
    return { error: 'ID layanan tidak valid.' }
  }

${DEMO_RETURN}

  const { error } = await supabase
    .from('agency_services')
    .delete()`
    ],
    [
        `  const validation = updatePasswordSchema.safeParse({ password: newPassword })
  if (!validation.success) {
    return { error: validation.error.issues[0].message }
  }

  const { error } = await supabase.auth.updateUser({ password: validation.data.password })`,
        `  const validation = updatePasswordSchema.safeParse({ password: newPassword })
  if (!validation.success) {
    return { error: validation.error.issues[0].message }
  }

${DEMO_RETURN}

  const { error } = await supabase.auth.updateUser({ password: validation.data.password })`
    ]
]);

// src/app/client/dashboard/actions.ts
const clientActionsPath = 'src/app/client/dashboard/actions.ts';
patchFile(clientActionsPath, [
    [
        `  // Baru boleh insert setelah ownership terkonfirmasi
  const supabaseAdmin = createAdminClient()

  const { error } = await supabaseAdmin
    .from('project_revisions')
    .insert({`,
        `  // Baru boleh insert setelah ownership terkonfirmasi
${DEMO_RETURN}

  const supabaseAdmin = createAdminClient()

  const { error } = await supabaseAdmin
    .from('project_revisions')
    .insert({`
    ],
    [
        `  // 🔒 IDOR Prevention: verifikasi kepemilikan project SEBELUM upload
  const { isOwner, error: ownerError } = await verifyProjectOwnership(projectId)
  if (!isOwner) return { error: ownerError }

  const supabaseAdmin = createAdminClient()

  // Buat nama file yang unik dan aman`,
        `  // 🔒 IDOR Prevention: verifikasi kepemilikan project SEBELUM upload
  const { isOwner, error: ownerError } = await verifyProjectOwnership(projectId)
  if (!isOwner) return { error: ownerError }

${DEMO_RETURN}

  const supabaseAdmin = createAdminClient()

  // Buat nama file yang unik dan aman`
    ]
]);

// src/app/super-admin/actions.ts
const superAdminActionsPath = 'src/app/super-admin/actions.ts';
patchFile(superAdminActionsPath, [
    [
        `  const slug = agencyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')

  // Password kriptografis — TIDAK disimpan ke database
  const generatedPassword = generateStrongPassword()

  try {
    // 1. Buat user baru di Supabase Auth`,
        `  const slug = agencyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')

  // Password kriptografis — TIDAK disimpan ke database
  const generatedPassword = generateStrongPassword()

${DEMO_RETURN}

  try {
    // 1. Buat user baru di Supabase Auth`
    ],
    [
        `  const supabase = createAdminClient()

  const { error } = await supabase
    .from('organizations')
    .update({ is_active: !shouldSuspend })`,
        `  const supabase = createAdminClient()

${DEMO_RETURN}

  const { error } = await supabase
    .from('organizations')
    .update({ is_active: !shouldSuspend })`
    ],
    [
        `  const updatePayload: Record<string, unknown> = {
    license_expires_at: expiryDate || null,
    auto_suspend: autoSuspend,
  }

  if (isActive !== null) {
    updatePayload.is_active = isActive
  }

  const { error } = await supabase
    .from('organizations')
    .update(updatePayload)`,
        `  const updatePayload: Record<string, unknown> = {
    license_expires_at: expiryDate || null,
    auto_suspend: autoSuspend,
  }

  if (isActive !== null) {
    updatePayload.is_active = isActive
  }

${DEMO_RETURN}

  const { error } = await supabase
    .from('organizations')
    .update(updatePayload)`
    ],
    [
        `  if (!org) return { error: 'Organisasi tidak ditemukan.' }

  // Generate password kriptografis
  const generatedPassword = generateStrongPassword(14)

  // Buat user baru di Auth`,
        `  if (!org) return { error: 'Organisasi tidak ditemukan.' }

  // Generate password kriptografis
  const generatedPassword = generateStrongPassword(14)

${DEMO_RETURN}

  // Buat user baru di Auth`
    ],
    [
        `  if (!profile) return { error: 'Admin tidak ditemukan di organisasi ini.' }

  // Hapus dari Supabase Auth sekalian (hard delete)
  const { error: deleteError } = await supabase.auth.admin.deleteUser(adminUserId)`,
        `  if (!profile) return { error: 'Admin tidak ditemukan di organisasi ini.' }

${DEMO_RETURN}

  // Hapus dari Supabase Auth sekalian (hard delete)
  const { error: deleteError } = await supabase.auth.admin.deleteUser(adminUserId)`
    ],
    [
        `  const supabase = createAdminClient()

  const { error } = await supabase
    .from('projects')
    .update({ skip_asset_cleanup: !currentStatus })`,
        `  const supabase = createAdminClient()

${DEMO_RETURN}

  const { error } = await supabase
    .from('projects')
    .update({ skip_asset_cleanup: !currentStatus })`
    ]
]);

console.log("All files patched successfully.");
