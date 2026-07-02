'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { formatRupiah, timeAgo, formatClock } from '@/lib/format';
import { STATUS, STATUS_CONFIG, NEXT_STATUS, NEXT_ACTION_LABEL } from '@/lib/statusConfig';
import { Clock } from 'lucide-react';

const TABS = [STATUS.MENUNGGU, STATUS.DIPROSES, STATUS.SIAP, STATUS.SELESAI];

export default function AntrianPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(STATUS.MENUNGGU);
  const [, forceTick] = useState(0);

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

    // Perbarui teks "x menit lalu" tiap 30 detik tanpa perlu refetch
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
    <div className="pb-24">
      <header className="sticky top-0 z-30 bg-white border-b border-stone-100 px-4 pt-4 pb-3">
        <h1 className="text-lg font-bold text-stone-800">Antrian Pesanan</h1>

        <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar pb-1">
          {TABS.map((s) => (
            <button
              key={s}
              onClick={() => setTab(s)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold border flex items-center gap-1.5 transition-colors ${
                tab === s
                  ? 'bg-stone-800 border-stone-800 text-white'
                  : 'bg-white border-stone-200 text-stone-500'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${STATUS_CONFIG[s].dot}`} />
              {STATUS_CONFIG[s].shortLabel}
              {counts[s] > 0 && <span className="opacity-70 font-mono">({counts[s]})</span>}
            </button>
          ))}
        </div>
      </header>

      <main className="px-4 pt-4 space-y-3">
        {loading && <p className="text-center text-stone-400 text-sm py-10">Memuat...</p>}
        {!loading && filtered.length === 0 && (
          <p className="text-center text-stone-400 text-sm py-10">Tidak ada pesanan di status ini</p>
        )}
        {filtered.map((order) => (
          <div key={order.id} className="border border-stone-200 rounded-2xl p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-bold text-stone-800 font-mono">#{order.order_number}</p>
                {order.customer_name && (
                  <p className="text-xs text-stone-500">{order.customer_name}</p>
                )}
              </div>
              <div className="text-right">
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full border ${STATUS_CONFIG[order.status].color}`}
                >
                  {STATUS_CONFIG[order.status].label}
                </span>
                <p className="text-[11px] text-stone-400 mt-1 flex items-center gap-1 justify-end">
                  <Clock size={10} /> {formatClock(order.created_at)} · {timeAgo(order.created_at)}
                </p>
              </div>
            </div>

            <div className="space-y-1 mb-3">
              {order.items.map((it, idx) => (
                <div key={idx} className="flex justify-between text-sm text-stone-600">
                  <span>
                    {it.name} x{it.qty}
                  </span>
                  <span className="font-mono">{formatRupiah(it.subtotal)}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-stone-100">
              <span className="font-bold text-stone-800 font-mono">{formatRupiah(order.total)}</span>
              <div className="flex gap-2">
                {order.status === STATUS.MENUNGGU && (
                  <button
                    onClick={() => cancelOrder(order)}
                    className="text-xs text-red-500 font-semibold px-3 py-2"
                  >
                    Batalkan
                  </button>
                )}
                {NEXT_STATUS[order.status] && (
                  <button
                    onClick={() => advance(order)}
                    className="text-xs bg-primary-500 text-white font-semibold px-3 py-2 rounded-xl"
                  >
                    {NEXT_ACTION_LABEL[order.status]}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
