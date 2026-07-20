-- ============================================================
-- VYLOGIX CRM — SCHEMA BARU (BERSIH & AMAN)
-- Versi: 2.0
-- Jalankan file ini di Supabase → SQL Editor
-- ============================================================
-- ⚠️  PERHATIAN: Script ini akan MENGHAPUS semua data lama!
--     Gunakan hanya saat development / fresh start.
-- ============================================================


-- ============================================================
-- BAGIAN 0: BERSIH-BERSIH DULU
-- Hapus semua yang lama agar tidak ada konflik
-- ============================================================

-- Hapus policies lama (supaya tidak bentrok saat dibuat ulang)
DROP POLICY IF EXISTS "Super Admin full access profiles"        ON profiles;
DROP POLICY IF EXISTS "Admin bisa lihat profiles org sendiri"  ON profiles;
DROP POLICY IF EXISTS "Client lihat profil sendiri"            ON profiles;
DROP POLICY IF EXISTS "Client update profil sendiri"           ON profiles;

DROP POLICY IF EXISTS "Super Admin full access projects"       ON projects;
DROP POLICY IF EXISTS "Admin kelola projects org sendiri"      ON projects;
DROP POLICY IF EXISTS "Client lihat projects sendiri"          ON projects;

DROP POLICY IF EXISTS "Super Admin full access assets"         ON project_assets;
DROP POLICY IF EXISTS "Admin kelola assets org sendiri"        ON project_assets;
DROP POLICY IF EXISTS "Client lihat assets projectnya"         ON project_assets;
DROP POLICY IF EXISTS "Client upload assets ke projectnya"     ON project_assets;

DROP POLICY IF EXISTS "Super Admin full access revisions"      ON project_revisions;
DROP POLICY IF EXISTS "Admin kelola revisions org sendiri"     ON project_revisions;
DROP POLICY IF EXISTS "Client lihat revisions projectnya"      ON project_revisions;
DROP POLICY IF EXISTS "Client kirim revisions ke projectnya"   ON project_revisions;

DROP POLICY IF EXISTS "Super Admin full access organizations"  ON organizations;
DROP POLICY IF EXISTS "Admin lihat org sendiri"                ON organizations;

DROP POLICY IF EXISTS "Super Admin full access services"       ON agency_services;
DROP POLICY IF EXISTS "Admin kelola services org sendiri"      ON agency_services;
DROP POLICY IF EXISTS "Semua user login bisa lihat services"   ON agency_services;

-- Hapus helper functions lama beserta semua policy yang bergantung padanya
-- CASCADE = "hapus juga semua yang bergantung ke function ini"
DROP FUNCTION IF EXISTS public.is_admin()        CASCADE;
DROP FUNCTION IF EXISTS public.is_super_admin()  CASCADE;
DROP FUNCTION IF EXISTS public.get_my_org_id()   CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Hapus trigger lama
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Hapus tabel (urutan penting: anak dulu, baru induk)
DROP TABLE IF EXISTS project_revisions  CASCADE;
DROP TABLE IF EXISTS project_assets     CASCADE;
DROP TABLE IF EXISTS project_feedbacks  CASCADE;
DROP TABLE IF EXISTS projects           CASCADE;
DROP TABLE IF EXISTS agency_services    CASCADE;
DROP TABLE IF EXISTS profiles           CASCADE;
DROP TABLE IF EXISTS organizations      CASCADE;


-- ============================================================
-- BAGIAN 1: BUAT TABEL-TABEL
--
-- 📖 KONSEP "MULTI-TENANT":
--    Bayangkan kamu punya gedung apartemen (= Vylogix platform).
--    Setiap agency adalah penghuni satu lantai.
--    Data setiap agency harus terisolasi — Agency A tidak boleh
--    bisa lihat data Agency B. Kunci isolasinya: organization_id.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- TABEL: organizations
-- Ini adalah "agency" yang mendaftar ke platform Vylogix.
-- Setiap agency punya satu baris di sini.
-- ────────────────────────────────────────────────────────────
CREATE TABLE organizations (
    id                  UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    name                TEXT        NOT NULL,
    slug                TEXT        UNIQUE,               -- URL-friendly name, misal: "vylogix-studio"

    -- Kolom untuk sistem suspend lisensi
    is_active           BOOLEAN     DEFAULT true,         -- false = agency diblokir
    auto_suspend        BOOLEAN     DEFAULT false,         -- true = otomatis blokir saat lisensi habis
    license_expires_at  TIMESTAMPTZ DEFAULT NULL,         -- NULL = tidak ada batas waktu

    -- Info kontak (untuk tombol WhatsApp)
    whatsapp_number     TEXT        DEFAULT NULL,

    -- Kapan dibuat
    created_at          TIMESTAMPTZ DEFAULT now() NOT NULL,

    -- 📝 CATATAN: Kita TIDAK menyimpan password di sini.
    --    Password dikelola oleh Supabase Auth, bukan kita.
    --    (Masalah temp_password dari versi lama sudah dihapus)

    CONSTRAINT organizations_name_not_empty CHECK (char_length(name) > 0)
);


-- ────────────────────────────────────────────────────────────
-- TABEL: profiles
-- Setiap user (super_admin, admin, client) punya satu baris
-- di sini yang terhubung ke akun Supabase Auth mereka.
--
-- 📖 KONSEP "ROLE":
--    super_admin = pemilik platform Vylogix (kamu)
--    admin       = pemilik agency yang daftar ke platform
--    client      = pelanggan dari agency tersebut
-- ────────────────────────────────────────────────────────────
CREATE TABLE profiles (
    id              UUID    PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email           TEXT    NOT NULL,
    full_name       TEXT,

    -- Role hanya boleh salah satu dari 3 nilai ini
    -- CHECK = database menolak nilai lain (seperti validasi)
    role            TEXT    DEFAULT 'client'
                    CHECK (role IN ('super_admin', 'admin', 'client')),

    -- Hubungan ke agency. NULL artinya user belum punya agency
    -- (super_admin tidak perlu punya organization_id)
    organization_id UUID    REFERENCES organizations(id) ON DELETE SET NULL,

    created_at      TIMESTAMPTZ DEFAULT now() NOT NULL
);


-- ────────────────────────────────────────────────────────────
-- TABEL: agency_services
-- Daftar layanan yang ditawarkan oleh sebuah agency.
-- Contoh: "Website", "Social Media", "Graphic Design"
-- ────────────────────────────────────────────────────────────
CREATE TABLE agency_services (
    id              UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID    NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name            TEXT    NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT now() NOT NULL,

    CONSTRAINT agency_services_name_not_empty CHECK (char_length(name) > 0)
);


-- ────────────────────────────────────────────────────────────
-- TABEL: projects
-- Proyek yang dikerjakan untuk klien.
--
-- 📖 KENAPA ADA organization_id DI SINI?
--    Tanpa organization_id, kita tidak bisa tahu proyek ini
--    milik agency mana. Ini KUNCI dari multi-tenant isolation.
--    Admin Agency A hanya boleh lihat projects dengan
--    organization_id = ID Agency A.
-- ────────────────────────────────────────────────────────────
CREATE TABLE projects (
    id                  UUID        DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Proyek ini milik agency mana?
    organization_id     UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Proyek ini untuk klien mana?
    client_id           UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    title               TEXT        NOT NULL,
    service_type        TEXT,

    status              TEXT        DEFAULT 'briefing'
                        CHECK (status IN ('briefing', 'design', 'development', 'revision', 'completed')),

    progress_percentage INTEGER     DEFAULT 0
                        CHECK (progress_percentage >= 0 AND progress_percentage <= 100),

    -- Info pembayaran
    total_price         NUMERIC     DEFAULT 0,
    termin_1            NUMERIC     DEFAULT 0,
    termin_2            NUMERIC     DEFAULT 0,
    termin_3            NUMERIC     DEFAULT 0,
    payment_status      TEXT        DEFAULT 'pending'
                        CHECK (payment_status IN ('pending', 'partial', 'paid')),
    -- ↑ Tambah 'partial' — untuk kasus termin belum lunas

    -- Info teknis proyek
    preview_url         TEXT,
    link_youtube        TEXT,
    link_cloudinary     TEXT,

    -- Info garansi & domain
    warranty_months     INTEGER     DEFAULT 0,
    warranty_expired_at DATE,
    domain_name         TEXT,
    domain_expiry_date  DATE,
    hosting_info        TEXT,

    -- Asset Cleanup Flag (Bypass cron job)
    skip_asset_cleanup  BOOLEAN     DEFAULT false,

    created_at          TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at          TIMESTAMPTZ DEFAULT now()
);


-- ────────────────────────────────────────────────────────────
-- TABEL: project_assets
-- File-file yang diupload ke dalam proyek
-- (hasil desain, foto, video, dll.)
-- ────────────────────────────────────────────────────────────
CREATE TABLE project_assets (
    id          UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id  UUID    NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    file_name   TEXT    NOT NULL,
    file_url    TEXT    NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);


-- ────────────────────────────────────────────────────────────
-- TABEL: project_revisions
-- Permintaan revisi dari klien ke admin
-- ────────────────────────────────────────────────────────────
CREATE TABLE project_revisions (
    id          UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id  UUID    NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Permintaan dari klien
    title       TEXT    NOT NULL,
    description TEXT    NOT NULL,
    status      TEXT    DEFAULT 'Pending'
                CHECK (status IN ('Pending', 'On Progress', 'Completed')),

    -- Balasan dari admin
    admin_reply TEXT,

    created_at  TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);


-- ============================================================
-- BAGIAN 2: TRIGGER OTOMATIS
--
-- 📖 KONSEP "TRIGGER":
--    Trigger = aksi otomatis yang jalan di database.
--    Saat user baru daftar lewat Supabase Auth,
--    trigger ini otomatis bikin baris baru di tabel "profiles".
--    Role default = 'client'. Super admin diset manual.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        new.id,
        new.email,
        new.raw_user_meta_data ->> 'full_name',
        -- Semua user baru = 'client' by default
        -- Role diubah secara manual oleh super_admin lewat dashboard
        -- TIDAK ADA lagi hardcode email di sini
        COALESCE(new.raw_user_meta_data ->> 'role', 'client')
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- ============================================================
-- BAGIAN 3: HELPER FUNCTIONS UNTUK RLS
--
-- 📖 KONSEP "HELPER FUNCTION":
--    Daripada menulis query panjang di setiap policy,
--    kita bungkus jadi fungsi kecil yang bisa dipanggil ulang.
-- ============================================================

-- Cek apakah user yang sedang login adalah super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'super_admin'
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;


-- Cek apakah user yang sedang login adalah admin (agency owner)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;


-- Ambil organization_id milik user yang sedang login
-- Ini dipakai untuk filter "hanya lihat data org sendiri"
CREATE OR REPLACE FUNCTION public.get_my_org_id()
RETURNS UUID AS $$
    SELECT organization_id FROM profiles
    WHERE id = auth.uid()
    LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;


-- ============================================================
-- BAGIAN 4: ROW LEVEL SECURITY (RLS)
--
-- 📖 KONSEP "RLS":
--    RLS = gembok di setiap laci database.
--    Walaupun query berhasil sampai ke database,
--    RLS akan filter lagi: "Boleh akses ini tidak?"
--
--    Contoh nyata:
--    Admin Agency A query: SELECT * FROM projects
--    → Tanpa RLS: dapat semua projects dari semua agency (berbahaya!)
--    → Dengan RLS: hanya dapat projects milik Agency A (aman!)
--
--    📌 CATATAN PENTING:
--    createAdminClient() (service role) BYPASS RLS.
--    Ini kenapa di server actions yang pakai adminClient,
--    kita WAJIB manual filter by organization_id.
-- ============================================================

-- Aktifkan RLS di semua tabel
ALTER TABLE organizations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_services  ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects         ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_assets   ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_revisions ENABLE ROW LEVEL SECURITY;


-- ──────────────────────────────────
-- RLS: organizations
-- ──────────────────────────────────

-- Super admin bisa lihat & kelola semua organization
CREATE POLICY "Super Admin full access organizations" ON organizations
    FOR ALL USING (public.is_super_admin());

-- Admin hanya bisa lihat organization miliknya sendiri
CREATE POLICY "Admin lihat org sendiri" ON organizations
    FOR SELECT USING (
        id = public.get_my_org_id()
        AND public.is_admin()
    );


-- ──────────────────────────────────
-- RLS: profiles
-- ──────────────────────────────────

-- Super admin bisa lihat & kelola semua profiles
CREATE POLICY "Super Admin full access profiles" ON profiles
    FOR ALL USING (public.is_super_admin());

-- Admin bisa lihat profiles yang ada di org-nya (untuk lihat daftar klien)
CREATE POLICY "Admin bisa lihat profiles org sendiri" ON profiles
    FOR SELECT USING (
        public.is_admin()
        AND organization_id = public.get_my_org_id()
    );

-- Setiap user bisa lihat & update profil mereka sendiri
CREATE POLICY "Client lihat profil sendiri" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Client update profil sendiri" ON profiles
    FOR UPDATE USING (auth.uid() = id);


-- ──────────────────────────────────
-- RLS: agency_services
-- ──────────────────────────────────

CREATE POLICY "Super Admin full access services" ON agency_services
    FOR ALL USING (public.is_super_admin());

-- Admin kelola services milik org-nya sendiri
CREATE POLICY "Admin kelola services org sendiri" ON agency_services
    FOR ALL USING (
        public.is_admin()
        AND organization_id = public.get_my_org_id()
    );

-- Client boleh lihat services (untuk ditampilkan di form pilih layanan)
CREATE POLICY "Semua user login bisa lihat services" ON agency_services
    FOR SELECT USING (auth.uid() IS NOT NULL);


-- ──────────────────────────────────
-- RLS: projects
-- ──────────────────────────────────

CREATE POLICY "Super Admin full access projects" ON projects
    FOR ALL USING (public.is_super_admin());

-- Admin hanya bisa lihat & kelola projects di org-nya
CREATE POLICY "Admin kelola projects org sendiri" ON projects
    FOR ALL USING (
        public.is_admin()
        AND organization_id = public.get_my_org_id()
    );

-- Client hanya bisa lihat projects yang ditugaskan ke mereka
CREATE POLICY "Client lihat projects sendiri" ON projects
    FOR SELECT USING (client_id = auth.uid());


-- ──────────────────────────────────
-- RLS: project_assets
-- ──────────────────────────────────

CREATE POLICY "Super Admin full access assets" ON project_assets
    FOR ALL USING (public.is_super_admin());

-- Admin lihat & kelola assets di projects org mereka
CREATE POLICY "Admin kelola assets org sendiri" ON project_assets
    FOR ALL USING (
        public.is_admin()
        AND EXISTS (
            SELECT 1 FROM projects
            WHERE id = project_id
            AND organization_id = public.get_my_org_id()
        )
    );

-- Client lihat assets di projects mereka
CREATE POLICY "Client lihat assets projectnya" ON project_assets
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM projects
            WHERE id = project_id AND client_id = auth.uid()
        )
    );

-- Client upload assets ke projects mereka
-- (Tapi ini dihandle oleh adminClient di server action,
--  yang sudah kita verify ownership-nya secara manual)
CREATE POLICY "Client upload assets ke projectnya" ON project_assets
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM projects
            WHERE id = project_id AND client_id = auth.uid()
        )
    );


-- ──────────────────────────────────
-- RLS: project_revisions
-- ──────────────────────────────────

CREATE POLICY "Super Admin full access revisions" ON project_revisions
    FOR ALL USING (public.is_super_admin());

-- Admin lihat & kelola revisions di projects org mereka
CREATE POLICY "Admin kelola revisions org sendiri" ON project_revisions
    FOR ALL USING (
        public.is_admin()
        AND EXISTS (
            SELECT 1 FROM projects
            WHERE id = project_id
            AND organization_id = public.get_my_org_id()
        )
    );

-- Client lihat revisions di projects mereka
CREATE POLICY "Client lihat revisions projectnya" ON project_revisions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM projects
            WHERE id = project_id AND client_id = auth.uid()
        )
    );

-- Client kirim (INSERT) revisions ke projects mereka
CREATE POLICY "Client kirim revisions ke projectnya" ON project_revisions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM projects
            WHERE id = project_id AND client_id = auth.uid()
        )
    );


-- ============================================================
-- SELESAI!
-- ============================================================
-- Setelah menjalankan script ini di Supabase SQL Editor:
--
-- 1. Buka Supabase Dashboard → Authentication → Users
-- 2. Buat user baru dengan email kamu (misal: kamu@vylogix.com)
-- 3. Buka Table Editor → profiles
-- 4. Cari baris user kamu, ubah kolom 'role' menjadi 'super_admin'
-- 5. Sekarang kamu bisa login dan akses /super-admin
--
-- Tidak perlu hardcode email di kode manapun. Role dikelola
-- sepenuhnya dari database. ✅
-- ============================================================
