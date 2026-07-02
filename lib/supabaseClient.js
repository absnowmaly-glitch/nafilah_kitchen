import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Ini hanya peringatan di console browser/server, bukan error yang menghentikan app.
  // Pastikan file .env.local sudah diisi (lihat .env.local.example).
  console.warn(
    '[Nafilah POS] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY belum diatur.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
