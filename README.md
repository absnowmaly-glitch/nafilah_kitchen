# Nafilah POS

Aplikasi kasir untuk kedai Nafilah. Berbasis web (Next.js), database realtime (Supabase),
dan bisa dipakai langsung dari browser HP Android — tidak perlu install dari Play Store.

## Alur pesanan

```
Kasir pilih menu → Buat Pesanan (nota terbit)
        │  status: Menunggu Bayar
        ▼
Customer bayar di kasir → Tandai Sudah Bayar
        │  status: Diproses
        ▼
Dapur menyiapkan pesanan → Tandai Siap Diambil
        │  status: Siap Diambil
        ▼
Customer tunjukkan nota → Selesai / Sudah Diambil
        │  status: Selesai
```

Ada juga status **Dibatalkan** untuk pesanan yang batal sebelum dibayar.

Setiap perubahan (menu, harga, pesanan baru, status) otomatis tersimpan ke database dan
langsung muncul di semua HP/tab yang sedang membuka aplikasi ini — tanpa perlu refresh
(realtime lewat Supabase).

## Halaman aplikasi

- **Kasir** (`/`) — pilih menu, atur jumlah, buat pesanan, nota langsung muncul.
- **Antrian** (`/antrian`) — daftar pesanan per status, tombol untuk memproses tiap tahap.
  Ada angka merah di ikon Antrian (bottom nav) yang menunjukkan jumlah pesanan aktif.
- **Menu** (`/menu`) — tambah/edit/hapus menu, atur harga & kategori, tandai stok habis.

---

## 1. Setup database (Supabase — gratis)

1. Buka https://supabase.com → daftar/login → **New project**.
2. Tunggu project selesai dibuat (±1-2 menit), catat password database Anda (untuk jaga-jaga).
3. Di sidebar kiri, buka **SQL Editor** → **New query**.
4. Buka file `supabase/schema.sql` di folder project ini, copy semua isinya, paste ke SQL
   Editor, lalu klik **Run**. Ini akan membuat tabel `menu_items`, `orders`, mengaktifkan
   realtime, dan mengisi 6 menu contoh (boleh dihapus nanti lewat halaman Menu).
5. Buka **Settings → API**. Catat dua nilai ini:
   - **Project URL** → contoh: `https://xxxxxxxxxxxx.supabase.co`
   - **anon public key** (bagian Project API keys)

Kedua nilai ini yang dipakai aplikasi untuk konek ke database — tidak ada backend/server
terpisah yang perlu dijalankan.

---

## 2. Jalankan di komputer (opsional, untuk coba-coba dulu)

Butuh [Node.js](https://nodejs.org) versi 18 ke atas.

```bash
npm install
cp .env.local.example .env.local
```

Buka file `.env.local`, isi dengan URL dan anon key dari langkah 1:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=isi-anon-key-anda
```

Lalu jalankan:

```bash
npm run dev
```

Buka `http://localhost:3000` di browser. Coba buat pesanan, cek Antrian, tambah menu baru.

Sebelum deploy, sebaiknya jalankan juga:

```bash
npm run build
```

untuk memastikan tidak ada error sebelum di-deploy ke Vercel.

---

## 3. Deploy ke Vercel

**Cara paling gampang — lewat GitHub:**

1. Push folder project ini ke repository GitHub baru.
2. Buka https://vercel.com → **Add New → Project** → pilih repo tersebut → **Import**.
3. Di bagian **Environment Variables**, tambahkan:
   - `NEXT_PUBLIC_SUPABASE_URL` = URL project Supabase Anda
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = anon key Anda
4. Klik **Deploy**. Setelah selesai, Anda dapat URL seperti `https://nafilah-pos.vercel.app`.

**Alternatif — lewat CLI (tanpa GitHub):**

```bash
npm install -g vercel
vercel
```

Ikuti pertanyaan yang muncul, lalu tambahkan environment variables:

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel --prod
```

---

## 4. Pakai di HP Android

1. Buka URL Vercel Anda lewat **Chrome** di HP.
2. Ketuk menu titik tiga (⋮) di pojok kanan atas → **Add to Home screen / Install app**.
3. Ikon Nafilah POS akan muncul di homescreen dan terbuka fullscreen seperti aplikasi
   native (tanpa address bar), lengkap dengan logo Nafilah.

Karena datanya tersimpan di Supabase (bukan di HP), Anda bisa buka aplikasi yang sama dari
beberapa HP/tablet sekaligus (misalnya satu untuk kasir, satu untuk dapur) dan semuanya
akan tetap sinkron secara realtime.

---

## Struktur project

```
app/
  page.js            → halaman Kasir (pilih menu, buat pesanan)
  antrian/page.js    → halaman Antrian (kelola status pesanan)
  menu/page.js        → halaman Menu (CRUD menu & harga)
  layout.js           → layout global, font, bottom navigation
components/
  BottomNav.js         → navigasi bawah + badge jumlah antrian aktif
lib/
  supabaseClient.js   → koneksi ke Supabase
  format.js            → format Rupiah & waktu
  statusConfig.js      → label, warna, dan alur status pesanan
supabase/
  schema.sql           → skema database + data contoh (jalankan sekali di awal)
```

## Ide pengembangan lanjutan

- **PIN/login staff** — saat ini aplikasi terbuka bebas tanpa login (cocok untuk 1 kedai,
  1 HP). Bisa ditambah Supabase Auth kalau nanti staf makin banyak / device makin banyak.
- **Cetak struk ke printer thermal** — nota saat ini tampil di layar; kalau punya printer
  Bluetooth thermal, bisa ditambahkan integrasi Web Bluetooth atau print via browser.
- **Laporan penjualan harian** — tabel `orders` sudah menyimpan semua riwayat pesanan,
  tinggal dibuatkan halaman rekap total penjualan per hari/menu.
- **Ubah warna nomor nota** — nomor nota (`order_number`) reset otomatis tiap hari mulai
  dari 1, diatur lewat tabel `order_counters` di `schema.sql`.
