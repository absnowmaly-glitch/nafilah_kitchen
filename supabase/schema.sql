-- =========================================================
-- Nafilah POS — Skema Database Supabase
-- Jalankan seluruh file ini di: Supabase Dashboard > SQL Editor > New query > Run
-- =========================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------
-- Tabel menu & harga
-- ---------------------------------------------------------
create table if not exists menu_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price integer not null check (price >= 0),
  category text not null default 'Lainnya',
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- Counter untuk nomor nota harian (reset otomatis tiap hari)
-- ---------------------------------------------------------
create table if not exists order_counters (
  order_date date primary key,
  counter integer not null default 0
);

-- ---------------------------------------------------------
-- Tabel pesanan
-- ---------------------------------------------------------
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  order_number integer,
  customer_name text,
  items jsonb not null default '[]'::jsonb,
  total integer not null default 0,
  status text not null default 'menunggu_pembayaran'
    check (status in ('menunggu_pembayaran', 'diproses', 'siap', 'selesai', 'dibatalkan')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_status_idx on orders (status);
create index if not exists orders_created_at_idx on orders (created_at desc);

-- ---------------------------------------------------------
-- Trigger: nomor nota otomatis, reset tiap hari (mulai dari 1)
-- ---------------------------------------------------------
create or replace function set_order_number()
returns trigger as $$
declare
  next_val integer;
  today date := current_date;
begin
  insert into order_counters (order_date, counter)
  values (today, 1)
  on conflict (order_date) do update set counter = order_counters.counter + 1
  returning counter into next_val;

  new.order_number := next_val;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_set_order_number on orders;
create trigger trg_set_order_number
before insert on orders
for each row execute function set_order_number();

-- ---------------------------------------------------------
-- Trigger: updated_at otomatis
-- ---------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_menu_items_updated_at on menu_items;
create trigger trg_menu_items_updated_at
before update on menu_items
for each row execute function set_updated_at();

drop trigger if exists trg_orders_updated_at on orders;
create trigger trg_orders_updated_at
before update on orders
for each row execute function set_updated_at();

-- ---------------------------------------------------------
-- Row Level Security
-- Catatan: kebijakan di bawah bersifat terbuka (cocok untuk 1 kedai,
-- diakses lewat anon key di HP sendiri). Jika nanti butuh login staff,
-- kebijakan ini bisa diperketat dan disatukan dengan Supabase Auth.
-- ---------------------------------------------------------
alter table menu_items enable row level security;
alter table orders enable row level security;
alter table order_counters enable row level security;

drop policy if exists "Allow all on menu_items" on menu_items;
create policy "Allow all on menu_items" on menu_items for all using (true) with check (true);

drop policy if exists "Allow all on orders" on orders;
create policy "Allow all on orders" on orders for all using (true) with check (true);

drop policy if exists "Allow all on order_counters" on order_counters;
create policy "Allow all on order_counters" on order_counters for all using (true) with check (true);

-- ---------------------------------------------------------
-- Aktifkan Realtime (auto sync tanpa refresh)
-- Jika baris ini error "already member of publication", abaikan saja —
-- artinya realtime sudah aktif. Jika error publication tidak ditemukan,
-- aktifkan manual lewat Database > Replication di dashboard Supabase.
-- ---------------------------------------------------------
alter publication supabase_realtime add table menu_items;
alter publication supabase_realtime add table orders;

-- ---------------------------------------------------------
-- Contoh menu awal (boleh dihapus/diedit lewat halaman Menu di app)
-- ---------------------------------------------------------
insert into menu_items (name, price, category) values
  ('Nasi Goreng Spesial', 20000, 'Makanan'),
  ('Mie Goreng', 18000, 'Makanan'),
  ('Ayam Bakar', 25000, 'Makanan'),
  ('Es Teh Manis', 5000, 'Minuman'),
  ('Es Jeruk', 7000, 'Minuman'),
  ('Kerupuk', 3000, 'Snack')
on conflict do nothing;
