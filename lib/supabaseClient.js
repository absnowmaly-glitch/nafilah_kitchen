import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Ini hanya peringatan di console browser/server, bukan error yang menghentikan app.
  // Pastikan environment variable NEXT_PUBLIC_SUPABASE_URL dan
  // NEXT_PUBLIC_SUPABASE_ANON_KEY sudah diisi di Vercel (Settings > Environment
  // Variables) lalu redeploy, atau di .env.local kalau menjalankan di komputer.
  console.warn(
    '[Nafilah POS] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY belum diatur.'
  );
}

// Fallback placeholder dipakai supaya proses build tidak crash kalau env var
// belum sempat terbaca. Kalau nilai ini yang terpakai, aplikasi akan tetap
// tampil tapi gagal konek ke database sampai env var asli diisi & di-redeploy.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
);
