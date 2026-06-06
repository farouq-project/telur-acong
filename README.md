# Telur Acong — Sistem Manajemen Peternakan Ayam Layer

Aplikasi web manajemen peternakan ayam layer berbasis mobile-first.

## Setup Lokal (Laragon)

### 1. Install dependencies
```bash
npm install
```

### 2. Setup database MySQL
Pastikan Laragon berjalan. Buat database baru:
```sql
CREATE DATABASE telur_acong CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 3. Konfigurasi environment
File `.env.local` sudah tersedia. Edit jika perlu:
```
DATABASE_URL="mysql://root:@localhost:3306/telur_acong"
NEXTAUTH_SECRET="ganti-dengan-string-acak-panjang"
NEXTAUTH_URL="http://localhost:3000"
```

### 4. Jalankan migrasi database
```bash
npm run db:push
```

### 5. Seed data awal (akun default)
```bash
npm run db:seed
```

**Akun default:**
| Role   | Email              | Password    |
|--------|--------------------|-------------|
| Owner  | owner@farm.com     | Admin1234   |
| Staff  | staf@farm.com      | Staff1234   |

### 6. Generate Prisma client
```bash
npm run db:generate
```

### 7. Jalankan development server
```bash
npm run dev
```

Buka http://localhost:3000

---

## Deploy ke Vercel

1. Push ke GitHub
2. Connect repository di Vercel
3. Set environment variables:
   - `DATABASE_URL` — gunakan PlanetScale atau MySQL hosting lain
   - `NEXTAUTH_SECRET` — generate dengan `openssl rand -base64 32`
   - `NEXTAUTH_URL` — URL Vercel Anda

---

## Struktur Modul

| Modul | Path | Akses |
|-------|------|-------|
| Dashboard | `/dashboard` | Semua |
| Produksi Telur | `/production` | Semua |
| Penjualan Telur | `/sales` | Semua |
| Stok | `/stock` | Semua |
| Manajemen Pakan | `/feed` | Semua |
| Obat & Vaksin | `/medicine` | Semua |
| Jadwal Vaksin | `/vaccination` | Semua |
| Kematian | `/mortality` | Semua |
| Notifikasi | `/notifications` | Semua |
| Laporan | `/reports` | Owner |
| Kelola Pengguna | `/settings/users` | Owner |
| Ganti Password | `/settings/password` | Semua |

---

## Upgrade ke Multi-Tenant (Masa Depan)

Untuk upgrade ke SaaS multi-tenant:
1. Tambah tabel `farms` dan `farm_users`
2. Tambah kolom `farmId` ke semua tabel business
3. Tambah `farmId` ke JWT session
4. Inject `farmId` di semua Prisma queries via middleware

Semua service layer sudah dibuat modular untuk memudahkan perubahan ini.
