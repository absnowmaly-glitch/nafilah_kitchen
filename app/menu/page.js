'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { formatRupiah } from '@/lib/format';
import { Plus, Pencil, Trash2, X } from 'lucide-react';

const EMPTY_FORM = { id: null, name: '', price: '', category: '', is_available: true };

export default function MenuPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .order('category')
        .order('name');
      if (mounted && !error) setItems(data || []);
      if (mounted) setLoading(false);
    }

    load();

    const channel = supabase
      .channel('menu-page-items')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, () => {
        load();
      })
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const grouped = useMemo(() => {
    const g = {};
    items.forEach((it) => {
      const cat = it.category || 'Lainnya';
      if (!g[cat]) g[cat] = [];
      g[cat].push(it);
    });
    return g;
  }, [items]);

  const existingCategories = useMemo(
    () => Array.from(new Set(items.map((i) => i.category).filter(Boolean))),
    [items]
  );

  function openNew() {
    setForm({ ...EMPTY_FORM });
  }

  function openEdit(item) {
    setForm({
      id: item.id,
      name: item.name,
      price: String(item.price),
      category: item.category || '',
      is_available: item.is_available,
    });
  }

  async function save() {
    if (!form.name.trim() || !form.price) {
      alert('Nama dan harga wajib diisi');
      return;
    }
    setSaving(true);

    const payload = {
      name: form.name.trim(),
      price: Number(form.price),
      category: form.category.trim() || 'Lainnya',
      is_available: form.is_available,
    };

    let error;
    if (form.id) {
      ({ error } = await supabase.from('menu_items').update(payload).eq('id', form.id));
    } else {
      ({ error } = await supabase.from('menu_items').insert(payload));
    }

    setSaving(false);

    if (error) {
      alert('Gagal menyimpan: ' + error.message);
      return;
    }
    setForm(null);
  }

  async function toggleAvailable(item) {
    await supabase.from('menu_items').update({ is_available: !item.is_available }).eq('id', item.id);
  }

  async function remove(item) {
    if (!confirm(`Hapus menu "${item.name}"?`)) return;
    const { error } = await supabase.from('menu_items').delete().eq('id', item.id);
    if (error) alert('Gagal menghapus: ' + error.message);
  }

  return (
    <div className="pb-8">
      <header className="px-5 pt-5 pb-3">
        <h1 className="text-2xl font-extrabold text-stone-900 tracking-tight">Menu &amp; Harga</h1>
        <p className="text-sm text-stone-400 mt-0.5">Kelola menu yang dijual di kedai</p>
      </header>

      <main className="px-5 pt-2 space-y-6">
        {loading && <p className="text-center text-stone-400 text-sm py-10">Memuat menu...</p>}
        {!loading && items.length === 0 && (
          <p className="text-center text-stone-400 text-sm py-10">
            Belum ada menu. Tambahkan menu pertama Anda lewat tombol + di kanan bawah.
          </p>
        )}
        {Object.entries(grouped).map(([cat, list]) => (
          <div key={cat}>
            <h2 className="text-xs font-extrabold text-stone-400 uppercase tracking-wide mb-2.5">
              {cat}
            </h2>
            <div className="space-y-2.5">
              {list.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-3xl p-3.5 flex items-center gap-3 shadow-[0_2px_14px_rgba(28,25,23,0.06)] border border-stone-50"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-stone-900 truncate">{item.name}</p>
                    <p className="text-sm text-stone-900 font-extrabold font-mono">
                      {formatRupiah(item.price)}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleAvailable(item)}
                    className={`text-[11px] px-2.5 py-1.5 rounded-full font-bold whitespace-nowrap ${
                      item.is_available
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-stone-100 text-stone-400'
                    }`}
                  >
                    {item.is_available ? 'Tersedia' : 'Habis'}
                  </button>
                  <button
                    onClick={() => openEdit(item)}
                    className="w-9 h-9 flex items-center justify-center text-stone-500 bg-stone-100 rounded-xl"
                    aria-label={`Edit ${item.name}`}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => remove(item)}
                    className="w-9 h-9 flex items-center justify-center text-red-500 bg-red-50 rounded-xl"
                    aria-label={`Hapus ${item.name}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </main>

      <button
        onClick={openNew}
        className="fixed bottom-24 right-5 w-14 h-14 rounded-full bg-primary-500 text-stone-900 flex items-center justify-center shadow-ticket z-40"
        aria-label="Tambah menu"
      >
        <Plus size={26} strokeWidth={2.5} />
      </button>

      {form && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setForm(null)} />
          <div className="relative w-full max-w-md mx-auto bg-white rounded-t-[32px] p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-extrabold text-xl text-stone-900">
                {form.id ? 'Edit Menu' : 'Tambah Menu'}
              </h2>
              <button
                onClick={() => setForm(null)}
                aria-label="Tutup"
                className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center"
              >
                <X size={18} className="text-stone-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-stone-500 mb-1.5 block">Nama Menu</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-stone-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                  placeholder="Nasi Goreng Spesial"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-stone-500 mb-1.5 block">Harga (Rp)</label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="w-full bg-stone-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                  placeholder="20000"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-stone-500 mb-1.5 block">Kategori</label>
                <input
                  type="text"
                  list="category-list"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full bg-stone-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                  placeholder="Makanan / Minuman / dll"
                />
                <datalist id="category-list">
                  {existingCategories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              <label className="flex items-center gap-2 text-sm font-semibold text-stone-600">
                <input
                  type="checkbox"
                  checked={form.is_available}
                  onChange={(e) => setForm({ ...form, is_available: e.target.checked })}
                  className="w-4 h-4"
                />
                Tersedia dijual
              </label>
            </div>

            <button
              onClick={save}
              disabled={saving}
              className="w-full bg-primary-500 text-stone-900 rounded-2xl py-4 font-extrabold text-sm mt-6 disabled:opacity-60"
            >
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
