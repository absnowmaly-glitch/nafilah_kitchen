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
    <div className="pb-24">
      <header className="sticky top-0 z-30 bg-white border-b border-stone-100 px-4 pt-4 pb-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-stone-800">Pengaturan Menu</h1>
          <p className="text-xs text-stone-400">Kelola menu &amp; harga</p>
        </div>
        <button
          onClick={openNew}
          className="w-9 h-9 rounded-full bg-primary-500 text-white flex items-center justify-center"
          aria-label="Tambah menu"
        >
          <Plus size={18} />
        </button>
      </header>

      <main className="px-4 pt-4 space-y-5">
        {loading && <p className="text-center text-stone-400 text-sm py-10">Memuat menu...</p>}
        {!loading && items.length === 0 && (
          <p className="text-center text-stone-400 text-sm py-10">
            Belum ada menu. Tambahkan menu pertama Anda.
          </p>
        )}
        {Object.entries(grouped).map(([cat, list]) => (
          <div key={cat}>
            <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wide mb-2">{cat}</h2>
            <div className="space-y-2">
              {list.map((item) => (
                <div
                  key={item.id}
                  className="border border-stone-200 rounded-2xl p-3 flex items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-stone-800 truncate">{item.name}</p>
                    <p className="text-sm text-primary-600 font-semibold font-mono">
                      {formatRupiah(item.price)}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleAvailable(item)}
                    className={`text-[11px] px-2 py-1 rounded-full border font-medium whitespace-nowrap ${
                      item.is_available
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-stone-100 text-stone-400 border-stone-200'
                    }`}
                  >
                    {item.is_available ? 'Tersedia' : 'Habis'}
                  </button>
                  <button
                    onClick={() => openEdit(item)}
                    className="w-8 h-8 flex items-center justify-center text-stone-400"
                    aria-label={`Edit ${item.name}`}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => remove(item)}
                    className="w-8 h-8 flex items-center justify-center text-red-400"
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

      {form && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setForm(null)} />
          <div className="relative w-full max-w-md mx-auto bg-white rounded-t-3xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-stone-800">{form.id ? 'Edit Menu' : 'Tambah Menu'}</h2>
              <button onClick={() => setForm(null)} aria-label="Tutup">
                <X size={20} className="text-stone-400" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-stone-500 mb-1 block">Nama Menu</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary-400"
                  placeholder="Nasi Goreng Spesial"
                />
              </div>
              <div>
                <label className="text-xs text-stone-500 mb-1 block">Harga (Rp)</label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary-400"
                  placeholder="20000"
                />
              </div>
              <div>
                <label className="text-xs text-stone-500 mb-1 block">Kategori</label>
                <input
                  type="text"
                  list="category-list"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary-400"
                  placeholder="Makanan / Minuman / dll"
                />
                <datalist id="category-list">
                  {existingCategories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              <label className="flex items-center gap-2 text-sm text-stone-600">
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
              className="w-full bg-primary-500 text-white rounded-xl py-3.5 font-semibold mt-5 disabled:opacity-60"
            >
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
