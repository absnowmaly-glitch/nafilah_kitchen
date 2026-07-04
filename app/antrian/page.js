'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { formatRupiah, timeAgo, formatClock } from '@/lib/format';
import { STATUS, STATUS_CONFIG, NEXT_STATUS, NEXT_ACTION_LABEL } from '@/lib/statusConfig';
import { Clock, Printer } from 'lucide-react';

const TABS = [STATUS.MENUNGGU, STATUS.DIPROSES, STATUS.SIAP, STATUS.SELESAI];

const BORDER_COLOR = {
  [STATUS.MENUNGGU]: 'border-l-amber-400',
  [STATUS.DIPROSES]: 'border-l-blue-400',
  [STATUS.SIAP]: 'border-l-emerald-400',
  [STATUS.SELESAI]: 'border-l-stone-300',
  [STATUS.BATAL]: 'border-l-red-400',
};

export default function AntrianPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(STATUS.MENUNGGU);
  const [, forceTick] = useState(0);
  const [printOrder, setPrintOrder] = useState(null);

  useEffect(() => {
    if (!printOrder) return;
    const handleAfterPrint = () => setPrintOrder(null);
    window.addEventListener('afterprint', handleAfterPrint);
    const t = setTimeout(() => window.print(), 150);
    return () => {
      clearTimeout(t);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, [printOrder]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (mounted && !error) setOrders(data || []);
      if (mounted) setLoading(false);
    }

    load();

    const channel = supabase
      .channel('antrian-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        load();
      })
      .subscribe();

    const interval = setInterval(() => forceTick((t) => t + 1), 30000);

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  const counts = useMemo(() => {
    const c = {};
    TABS.forEach((s) => (c[s] = 0));
    orders.forEach((o) => {
      if (c[o.status] !== undefined) c[o.status] += 1;
    });
    return c;
  }, [orders]);

  const filtered = useMemo(
    () =>
      orders
        .filter((o) => o.status === tab)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
    [orders, tab]
  );

  async function advance(order) {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    await supabase.from('orders').update({ status: next }).eq('id', order.id);
  }

  async function cancelOrder(order) {
    if (!confirm('Batalkan pesanan #' + order.order_number + '?')) return;
    await supabase.from('orders').update({ status: STATUS.BATAL }).eq('id', order.id);
  }

  return (
    <div className="pb-8">
      <header className="px-5 pt-5 pb-3">
        <h1 className="text-2xl font-extrabold text-stone-900 tracking-tight">Antrian Pesanan</h1>
        <p className="text-sm text-stone-400 mt-0.5">Kelola status pesanan yang masuk</p>

        <div className="flex gap-2 mt-4 overflow-x-auto no-scrollbar pb-1">
          {TABS.map((s) => (
            <button
              key={s}
              onClick={() => setTab(s)}
              className={`whitespace-nowrap px-4 py-2 rounded-2xl text-sm font-bold flex items-center gap-2 transition-colors ${
                tab === s
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'bg-white border border-stone-200 text-stone-500'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${STATUS_CONFIG[s].dot}`} />
              {STATUS_CONFIG[s].shortLabel}
              {counts[s] > 0 && <span className="opacity-70 font-mono">({counts[s]})</span>}
            </button>
          ))}
        </div>
      </header>

      <main className="px-5 pt-2 space-y-3">
        {loading && <p className="text-center text-stone-400 text-sm py-10">Memuat...</p>}
        {!loading && filtered.length === 0 && (
          <p className="text-center text-stone-400 text-sm py-10">Tidak ada pesanan di status ini</p>
        )}
        {filtered.map((order) => (
          <div
            key={order.id}
            className={`bg-white rounded-3xl p-4 shadow-[0_2px_14px_rgba(28,25,23,0.06)] border border-stone-50 border-l-4 ${BORDER_COLOR[order.status]}`}
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-extrabold text-lg text-stone-900 font-mono">
                  #{order.order_number}
                </p>
                {order.customer_name && (
                  <p className="text-xs text-stone-500 font-medium">{order.customer_name}</p>
                )}
              </div>
              <div className="text-right">
                <span
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${STATUS_CONFIG[order.status].color}`}
                >
                  {STATUS_CONFIG[order.status].label}
                </span>
                <p className="text-[11px] text-stone-400 mt-1.5 flex items-center gap-1 justify-end">
                  <Clock size={10} /> {formatClock(order.created_at)} · {timeAgo(order.created_at)}
                </p>
              </div>
            </div>

            <div className="space-y-1 mb-3 mt-3">
              {order.items.map((it, idx) => (
                <div key={idx} className="flex justify-between text-sm text-stone-600">
                  <span>
                    {it.name} x{it.qty}
                  </span>
                  <span className="font-mono">{formatRupiah(it.subtotal)}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-stone-100">
              <span className="font-extrabold text-stone-900 font-mono">
                {formatRupiah(order.total)}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPrintOrder(order)}
                  className="w-9 h-9 flex items-center justify-center text-stone-400 bg-stone-100 rounded-xl"
                  aria-label={`Cetak nota #${order.order_number}`}
                >
                  <Printer size={15} />
                </button>
                {order.status === STATUS.MENUNGGU && (
                  <button
                    onClick={() => cancelOrder(order)}
                    className="text-xs text-red-500 font-bold px-3 py-2.5"
                  >
                    Batalkan
                  </button>
                )}
                {NEXT_STATUS[order.status] && (
                  <button
                    onClick={() => advance(order)}
                    className="text-xs bg-primary-500 text-stone-900 font-extrabold px-4 py-2.5 rounded-xl"
                  >
                    {NEXT_ACTION_LABEL[order.status]}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </main>

      {printOrder && (
        <div id="print-area" className="hidden print:block">
          <div className="text-center mb-2">
            <img src="/logo-black.png" alt="Nafilah" className="h-12 w-auto mx-auto mb-1" />
            <p className="font-bold text-sm tracking-widest">NAFILAH KITCHEN</p>
            <p className="text-[10px] text-stone-500">
              {new Date(printOrder.created_at).toLocaleDateString('id-ID')} ·{' '}
              {formatClock(printOrder.created_at)}
            </p>
          </div>
          <div className="text-center mb-2">
            <p className="text-[10px] tracking-widest uppercase">Nota Pembayaran</p>
            <p className="text-2xl font-bold font-mono">#{printOrder.order_number}</p>
            {printOrder.customer_name && <p className="text-sm mt-1">{printOrder.customer_name}</p>}
          </div>
          <div className="border-t border-dashed border-stone-400 pt-2 space-y-1 mb-2">
            {printOrder.items.map((it, idx) => (
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
            <span className="font-mono">{formatRupiah(printOrder.total)}</span>
          </div>
          <p className="text-center text-[11px]">
            Silakan bayar &amp; tunjukkan nota ini ke Kasir Utama
          </p>
        </div>
      )}
    </div>
  );
}
