# Monitor Proyek Online

Versi Vercel ini bersifat baca-saja untuk pengguna. Login Google menerima akun Gmail mana pun, tetapi hanya email di `ALLOWED_EMAILS` yang dapat masuk.

## Data

Excel di Google Drive adalah sumber utama. Buat Google Service Account, bagikan file Excel kepada email service account tersebut sebagai Viewer, lalu simpan kredensialnya sebagai Environment Variables Vercel. Jangan unggah `.env` atau kunci privat ke Git.

Setelah membuat proyek Supabase, jalankan `supabase/schema.sql` melalui SQL Editor. Pada paket Vercel Hobby, administrator menjalankan sinkronisasi saat diperlukan melalui endpoint terlindungi `GET /api/cron/sync`, dengan header `Authorization: Bearer <CRON_SECRET>`. Endpoint tersebut mengunduh Excel, lalu melakukan upsert data ke database.

## Izin pengguna

Tambahkan atau hapus alamat Gmail dari `ALLOWED_EMAILS`, kemudian redeploy. Semua akun yang tidak terdaftar akan ditolak, bahkan bila berhasil login Google.
