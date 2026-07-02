'use client';

export const dynamic = 'force-dynamic';


import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { formatRupiah, formatClock } from '@/lib/format';
import { STATUS } from '@/lib/statusConfig';
import { Plus, Minus, ShoppingCart, X, Check, Printer } from 'lucide-react';

export default function KasirPage() {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState({}); // { menuItemId: qty }
  const [cartOpen, setCartOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [activeCategory, setActiveCategory] = useState('Semua');

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
    return menuItems.filter(
      (m) => m.is_available && (activeCategory === 'Semua' || m.category === activeCategory)
    );
  }, [menuItems, activeCategory]);

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
    <div className="pb-24">
      <header className="sticky top-0 z-30 bg-white border-b border-stone-100 px-4 pt-4 pb-3">
        <h1 className="text-lg font-bold text-stone-800">Pesanan</h1>
        <p className="text-xs text-stone-400">Pilih menu untuk membuat pesanan baru</p>

        <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                activeCategory === cat
                  ? 'bg-primary-500 border-primary-500 text-white'
                  : 'bg-white border-stone-200 text-stone-500'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </header>

      <main className="px-4 pt-3 grid grid-cols-2 gap-3">
        {loading && (
          <p className="col-span-2 text-center text-stone-400 text-sm py-10">Memuat menu...</p>
        )}
        {!loading && visibleItems.length === 0 && (
          <p className="col-span-2 text-center text-stone-400 text-sm py-10">
            Belum ada menu tersedia. Tambahkan lewat tab Menu.
          </p>
        )}
        {visibleItems.map((item) => {
          const qty = cart[item.id] || 0;
          return (
            <div key={item.id} className="border border-stone-200 rounded-2xl p-3 flex flex-col">
              <p className="font-semibold text-sm text-stone-800 leading-snug">{item.name}</p>
              <p className="text-xs text-stone-400 mb-3">{item.category}</p>
              <div className="mt-auto flex items-center justify-between">
                <span className="text-sm font-bold text-primary-600 font-mono">
                  {formatRupiah(item.price)}
                </span>
                {qty === 0 ? (
                  <button
                    onClick={() => addToCart(item.id)}
                    className="w-8 h-8 rounded-full bg-primary-500 text-white flex items-center justify-center active:scale-95"
                    aria-label={`Tambah ${item.name}`}
                  >
                    <Plus size={16} />
                  </button>
                ) : (
                  <div className="flex items-center gap-2 bg-primary-50 rounded-full px-1">
                    <button
                      onClick={() => decFromCart(item.id)}
                      className="w-7 h-7 rounded-full bg-white text-primary-600 flex items-center justify-center shadow-sm"
                      aria-label={`Kurangi ${item.name}`}
                    >
                      <Minus size={14} />
                    </button>
                    <span className="text-sm font-semibold w-4 text-center font-mono">{qty}</span>
                    <button
                      onClick={() => addToCart(item.id)}
                      className="w-7 h-7 rounded-full bg-primary-500 text-white flex items-center justify-center"
                      aria-label={`Tambah ${item.name}`}
                    >
                      <Plus size={14} />
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
          className="fixed bottom-20 left-4 right-4 max-w-md mx-auto bg-primary-500 text-white rounded-2xl py-3.5 px-5 flex items-center justify-between shadow-ticket z-40"
        >
          <span className="flex items-center gap-2 text-sm font-semibold">
            <ShoppingCart size={18} />
            {cartCount} item
          </span>
          <span className="font-bold font-mono">{formatRupiah(cartTotal)}</span>
        </button>
      )}

      {cartOpen && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setCartOpen(false)} />
          <div className="relative w-full max-w-md mx-auto bg-white rounded-t-3xl p-5 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-stone-800">Pesanan</h2>
              <button onClick={() => setCartOpen(false)} aria-label="Tutup">
                <X size={20} className="text-stone-400" />
              </button>
            </div>

            <div className="space-y-3 mb-4">
              {cartLines.map((l) => (
                <div key={l.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-stone-700">{l.name}</p>
                    <p className="text-xs text-stone-400 font-mono">
                      {formatRupiah(l.price)} x {l.qty}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => decFromCart(l.id)}
                      className="w-7 h-7 rounded-full bg-stone-100 flex items-center justify-center"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="text-sm w-4 text-center font-mono">{l.qty}</span>
                    <button
                      onClick={() => addToCart(l.id)}
                      className="w-7 h-7 rounded-full bg-stone-100 flex items-center justify-center"
                    >
                      <Plus size={14} />
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
              className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm mb-4 focus:outline-none focus:border-primary-400"
            />

            <div className="flex items-center justify-between mb-4 text-sm">
              <span className="text-stone-500">Total</span>
              <span className="font-bold text-lg text-stone-800 font-mono">
                {formatRupiah(cartTotal)}
              </span>
            </div>

            <button
              onClick={submitOrder}
              disabled={submitting}
              className="w-full bg-primary-500 text-white rounded-xl py-3.5 font-semibold disabled:opacity-60"
            >
              {submitting ? 'Menyimpan...' : 'Buat Pesanan & Cetak Nota'}
            </button>
          </div>
        </div>
      )}

      {receipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative w-full max-w-sm bg-white rounded-2xl rounded-b-none p-5 receipt-tear">
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

            <div className="text-center mb-4">
              <p className="text-xs text-stone-400 tracking-widest uppercase">Nota Pembayaran</p>
              <p className="text-3xl font-bold text-primary-600 font-mono mt-1">
                #{receipt.order_number}
              </p>
              {receipt.customer_name && (
                <p className="text-sm text-stone-600 mt-1">{receipt.customer_name}</p>
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

            <div className="border-t border-dashed border-stone-300 pt-3 flex justify-between font-bold text-stone-800 mb-6">
              <span>Total</span>
              <span className="font-mono">{formatRupiah(receipt.total)}</span>
            </div>

            <p className="text-xs text-center text-stone-400 mb-4">
              Silakan bayar &amp; tunjukkan nota ini ke Kasir Utama
            </p>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => window.print()}
                className="w-full bg-stone-800 text-white rounded-xl py-3 font-semibold flex items-center justify-center gap-2"
              >
                <Printer size={16} /> Cetak Nota
              </button>
              <button
                onClick={markPaidNow}
                className="w-full bg-primary-500 text-white rounded-xl py-3 font-semibold flex items-center justify-center gap-2"
              >
                <Check size={16} /> Sudah Dibayar, Proses Pesanan
              </button>
              <button onClick={() => setReceipt(null)} className="w-full text-stone-400 text-sm py-2">
                Tutup (proses pembayaran nanti di Antrian)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
