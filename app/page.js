'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { formatRupiah, formatClock } from '@/lib/format';
import { STATUS } from '@/lib/statusConfig';
import { Plus, Minus, ShoppingBag, X, Check, Printer, Search } from 'lucide-react';
import Spinner from '@/components/Spinner';

export default function KasirPage() {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState({}); // { menuItemId: qty }
  const [cartOpen, setCartOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [activeCategory, setActiveCategory] = useState('Semua');
  const [query, setQuery] = useState('');

  useEffect(() => {
    let mounted = true;

    async function load() {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });
      if (mounted && !error) setMenuItems(data || []);
      if (mounted) setLoading(false);
    }

    load();

    const channel = supabase
      .channel('kasir-menu-items')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, () => {
        load();
      })
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const categories = useMemo(() => {
    const set = new Set(menuItems.map((m) => m.category || 'Lainnya'));
    return ['Semua', ...Array.from(set)];
  }, [menuItems]);

  const visibleItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return menuItems.filter(
      (m) =>
        m.is_available &&
        (activeCategory === 'Semua' || m.category === activeCategory) &&
        (q === '' || m.name.toLowerCase().includes(q))
    );
  }, [menuItems, activeCategory, query]);

  const cartLines = useMemo(() => {
    return Object.entries(cart)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => {
        const item = menuItems.find((m) => m.id === id);
        return item ? { ...item, qty } : null;
      })
      .filter(Boolean);
  }, [cart, menuItems]);

  const cartTotal = cartLines.reduce((sum, l) => sum + l.price * l.qty, 0);
  const cartCount = cartLines.reduce((sum, l) => sum + l.qty, 0);

  function addToCart(id) {
    setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 }));
  }

  function decFromCart(id) {
    setCart((c) => {
      const next = { ...c };
      const qty = (next[id] || 0) - 1;
      if (qty <= 0) delete next[id];
      else next[id] = qty;
      return next;
    });
  }

  async function submitOrder() {
    if (cartLines.length === 0) return;
    setSubmitting(true);

    const items = cartLines.map((l) => ({
      menu_item_id: l.id,
      name: l.name,
      price: l.price,
      qty: l.qty,
      subtotal: l.price * l.qty,
    }));

    const { data, error } = await supabase
      .from('orders')
      .insert({
        customer_name: customerName || null,
        items,
        total: cartTotal,
        status: STATUS.MENUNGGU,
      })
      .select()
      .single();

    setSubmitting(false);

    if (error) {
      alert('Gagal membuat pesanan: ' + error.message);
      return;
    }

    setReceipt(data);
    setCart({});
    setCustomerName('');
    setCartOpen(false);
  }

  async function markPaidNow() {
    if (!receipt) return;
    const { error } = await supabase
      .from('orders')
      .update({ status: STATUS.DIPROSES })
      .eq('id', receipt.id);
    if (!error) setReceipt(null);
  }

  return (
    <div className="pb-8">
      <header className="px-5 pt-5 pb-3">
        <h1 className="text-2xl font-extrabold text-stone-900 tracking-tight">Pilih Menu</h1>
        <p className="text-sm text-stone-400 mt-0.5">Sentuh menu untuk mulai pesanan baru</p>

        <div className="relative mt-4">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari menu..."
            className="w-full bg-stone-100 rounded-2xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
        </div>

        <div className="flex gap-2 mt-4 overflow-x-auto no-scrollbar pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`whitespace-nowrap px-4 py-2 rounded-2xl text-sm font-bold transition-colors ${
                activeCategory === cat
                  ? 'bg-primary-500 text-stone-900 shadow-sm'
                  : 'bg-white border border-stone-200 text-stone-500'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </header>

      <main className="px-5 pt-2 grid grid-cols-2 gap-3">
        {loading && (
          <div className="col-span-2">
            <Spinner label="Memuat menu..." />
          </div>
        )}
        {!loading && visibleItems.length === 0 && (
          <p className="col-span-2 text-center text-stone-400 text-sm py-10">
            Menu tidak ditemukan.
          </p>
        )}
        {visibleItems.map((item, idx) => {
          const qty = cart[item.id] || 0;
          return (
            <div
              key={item.id}
              style={{ animationDelay: `${Math.min(idx * 30, 300)}ms` }}
              className="bg-white rounded-3xl p-3.5 flex flex-col shadow-[0_2px_14px_rgba(28,25,23,0.06)] border border-stone-50 animate-fade-in-up"
            >
              <span className="inline-block self-start text-[10px] font-bold uppercase tracking-wide text-primary-700 bg-primary-50 rounded-full px-2 py-0.5 mb-2">
                {item.category}
              </span>
              <p className="font-bold text-sm text-stone-900 leading-snug mb-3">{item.name}</p>
              <div className="mt-auto flex items-center justify-between">
                <span className="text-sm font-extrabold text-stone-900 font-mono">
                  {formatRupiah(item.price)}
                </span>
                {qty === 0 ? (
                  <button
                    onClick={() => addToCart(item.id)}
                    className="w-9 h-9 rounded-full bg-primary-500 text-stone-900 flex items-center justify-center active:scale-90 transition-transform shadow-sm"
                    aria-label={`Tambah ${item.name}`}
                  >
                    <Plus size={18} strokeWidth={2.5} />
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 bg-stone-900 rounded-full pl-1 pr-1 py-1">
                    <button
                      onClick={() => decFromCart(item.id)}
                      className="w-7 h-7 rounded-full bg-primary-500 text-stone-900 flex items-center justify-center"
                      aria-label={`Kurangi ${item.name}`}
                    >
                      <Minus size={14} strokeWidth={2.5} />
                    </button>
                    <span className="text-sm font-bold w-4 text-center font-mono text-white">
                      {qty}
                    </span>
                    <button
                      onClick={() => addToCart(item.id)}
                      className="w-7 h-7 rounded-full bg-primary-500 text-stone-900 flex items-center justify-center"
                      aria-label={`Tambah ${item.name}`}
                    >
                      <Plus size={14} strokeWidth={2.5} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </main>

      {cartCount > 0 && !cartOpen && (
        <button
          onClick={() => setCartOpen(true)}
          className="fixed bottom-24 left-5 right-5 max-w-md mx-auto bg-stone-900 text-white rounded-full py-4 px-5 flex items-center justify-between shadow-ticket z-40 animate-slide-up active:scale-[0.98] transition-transform"
        >
          <span className="flex items-center gap-2.5 text-sm font-bold">
            <span className="w-7 h-7 rounded-full bg-primary-500 text-stone-900 flex items-center justify-center">
              <ShoppingBag size={14} strokeWidth={2.5} />
            </span>
            {cartCount} item
          </span>
          <span className="font-extrabold font-mono text-primary-400">
            {formatRupiah(cartTotal)}
          </span>
        </button>
      )}

      {cartOpen && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/40 animate-fade-in" onClick={() => setCartOpen(false)} />
          <div className="relative w-full max-w-md mx-auto bg-white rounded-t-[32px] p-6 max-h-[80vh] overflow-y-auto animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-extrabold text-xl text-stone-900">Pesanan Anda</h2>
              <button
                onClick={() => setCartOpen(false)}
                aria-label="Tutup"
                className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center"
              >
                <X size={18} className="text-stone-500" />
              </button>
            </div>

            <div className="space-y-4 mb-5">
              {cartLines.map((l) => (
                <div key={l.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-stone-800">{l.name}</p>
                    <p className="text-xs text-stone-400 font-mono">
                      {formatRupiah(l.price)} x {l.qty}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 bg-stone-900 rounded-full pl-1 pr-1 py-1">
                    <button
                      onClick={() => decFromCart(l.id)}
                      className="w-7 h-7 rounded-full bg-primary-500 text-stone-900 flex items-center justify-center"
                    >
                      <Minus size={14} strokeWidth={2.5} />
                    </button>
                    <span className="text-sm w-4 text-center font-mono text-white">{l.qty}</span>
                    <button
                      onClick={() => addToCart(l.id)}
                      className="w-7 h-7 rounded-full bg-primary-500 text-stone-900 flex items-center justify-center"
                    >
                      <Plus size={14} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <input
              type="text"
              placeholder="Nama pelanggan (opsional)"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full bg-stone-100 rounded-2xl px-4 py-3 text-sm mb-5 focus:outline-none focus:ring-2 focus:ring-primary-400"
            />

            <div className="flex items-center justify-between mb-5">
              <span className="text-stone-500 text-sm font-semibold">Total</span>
              <span className="font-extrabold text-2xl text-stone-900 font-mono">
                {formatRupiah(cartTotal)}
              </span>
            </div>

            <button
              onClick={submitOrder}
              disabled={submitting}
              className="w-full bg-primary-500 text-stone-900 rounded-2xl py-4 font-extrabold text-sm disabled:opacity-60 btn-shine"
            >
              {submitting ? 'Menyimpan...' : 'Buat Pesanan & Cetak Nota'}
            </button>
          </div>
        </div>
      )}

      {receipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 animate-fade-in" />
          <div className="relative w-full max-w-sm bg-white rounded-3xl rounded-b-none p-6 receipt-tear animate-scale-in">
            <div id="print-area" className="hidden print:block">
              <div className="text-center mb-2">
                <img src="/logo-black.png" alt="Nafilah" className="h-12 w-auto mx-auto mb-1" />
                <p className="font-bold text-sm tracking-widest">NAFILAH KITCHEN</p>
                <p className="text-[10px] text-stone-500">
                  {new Date(receipt.created_at).toLocaleDateString('id-ID')} ·{' '}
                  {formatClock(receipt.created_at)}
                </p>
              </div>
              <div className="text-center mb-2">
                <p className="text-[10px] tracking-widest uppercase">Nota Pembayaran</p>
                <p className="text-2xl font-bold font-mono">#{receipt.order_number}</p>
                {receipt.customer_name && <p className="text-sm mt-1">{receipt.customer_name}</p>}
              </div>
              <div className="border-t border-dashed border-stone-400 pt-2 space-y-1 mb-2">
                {receipt.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between text-xs">
                    <span>
                      {it.name} x{it.qty}
                    </span>
                    <span className="font-mono">{formatRupiah(it.subtotal)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-dashed border-stone-400 pt-2 flex justify-between font-bold text-sm mb-3">
                <span>Total</span>
                <span className="font-mono">{formatRupiah(receipt.total)}</span>
              </div>
              <p className="text-center text-[11px]">
                Silakan bayar &amp; tunjukkan nota ini ke Kasir Utama
              </p>
            </div>

            <div className="text-center mb-5">
              <p className="text-xs text-stone-400 font-bold tracking-widest uppercase">
                Nota Pembayaran
              </p>
              <p className="text-4xl font-extrabold text-stone-900 font-mono mt-1">
                #{receipt.order_number}
              </p>
              {receipt.customer_name && (
                <p className="text-sm text-stone-600 mt-1 font-medium">{receipt.customer_name}</p>
              )}
            </div>

            <div className="border-t border-dashed border-stone-300 pt-3 space-y-1.5 mb-3">
              {receipt.items.map((it, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="text-stone-600">
                    {it.name} x{it.qty}
                  </span>
                  <span className="text-stone-700 font-mono">{formatRupiah(it.subtotal)}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-dashed border-stone-300 pt-3 flex justify-between font-extrabold text-stone-900 mb-6">
              <span>Total</span>
              <span className="font-mono">{formatRupiah(receipt.total)}</span>
            </div>

            <p className="text-xs text-center text-stone-400 mb-5">
              Silakan bayar &amp; tunjukkan nota ini ke Kasir Utama
            </p>

            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => window.print()}
                className="w-full bg-stone-900 text-white rounded-2xl py-3.5 font-extrabold text-sm flex items-center justify-center gap-2"
              >
                <Printer size={16} /> Cetak Nota
              </button>
              <button
                onClick={markPaidNow}
                className="w-full bg-primary-500 text-stone-900 rounded-2xl py-3.5 font-extrabold text-sm flex items-center justify-center gap-2 btn-shine"
              >
                <Check size={16} strokeWidth={2.5} /> Sudah Dibayar, Proses Pesanan
              </button>
              <button
                onClick={() => setReceipt(null)}
                className="w-full text-stone-400 text-sm font-semibold py-2"
              >
                Tutup (proses pembayaran nanti di Antrian)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
