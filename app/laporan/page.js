'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { formatRupiah } from '@/lib/format';
import { startOfDay, startOfWeek, startOfMonth, endOfDay } from '@/lib/dateRange';
import { STATUS } from '@/lib/statusConfig';
import { TrendingUp, ShoppingBag, Clock3, Ban } from 'lucide-react';

// Omset dihitung dari pesanan yang statusnya sudah lewat "menunggu bayar"
// (artinya sudah dikonfirmasi dibayar), dan bukan yang dibatalkan.
const PAID_STATUSES = [STATUS.DIPROSES, STATUS.SIAP, STATUS.SELESAI];

const PERIODS = [
  { key: 'hari', label: 'Hari Ini' },
  { key: 'minggu', label: 'Minggu Ini' },
  { key: 'bulan', label: 'Bulan Ini' },
  { key: 'custom', label: 'Kustom' },
];

function toInputDate(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function LaporanPage() {
  const [period, setPeriod] = useState('hari');
  const [customFrom, setCustomFrom] = useState(toInputDate(new Date()));
  const [customTo, setCustomTo] = useState(toInputDate(new Date()));
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const range = useMemo(() => {
    const now = new Date();
    if (period === 'hari') return { start: startOfDay(now), end: endOfDay(now) };
    if (period === 'minggu') return { start: startOfWeek(now), end: endOfDay(now) };
    if (period === 'bulan') return { start: startOfMonth(now), end: endOfDay(now) };
    const start = customFrom ? startOfDay(new Date(customFrom)) : startOfDay(now);
    const end = customTo ? endOfDay(new Date(customTo)) : endOfDay(now);
    return { start, end };
  }, [period, customFrom, customTo]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    async function load() {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .gte('created_at', range.start.toISOString())
        .lte('created_at', range.end.toISOString())
        .order('created_at', { ascending: false });
      if (mounted && !error) setOrders(data || []);
      if (mounted) setLoading(false);
    }

    load();

    const channel = supabase
      .channel('laporan-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        load();
      })
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [range]);

  const paidOrders = useMemo(
    () => orders.filter((o) => PAID_STATUSES.includes(o.status)),
    [orders]
  );
  const cancelledCount = useMemo(
    () => orders.filter((o) => o.status === STATUS.BATAL).length,
    [orders]
  );
  const pendingCount = useMemo(
    () => orders.filter((o) => o.status === STATUS.MENUNGGU).length,
    [orders]
  );

  const totalOmset = paidOrders.reduce((sum, o) => sum + o.total, 0);
  const totalPesanan = paidOrders.length;
  const rataRata = totalPesanan > 0 ? Math.round(totalOmset / totalPesanan) : 0;

  const topItems = useMemo(() => {
    const map = new Map();
    paidOrders.forEach((o) => {
      (o.items || []).forEach((it) => {
        const prev = map.get(it.name) || { name: it.name, qty: 0, revenue: 0 };
        prev.qty += it.qty;
        prev.revenue += it.subtotal;
        map.set(it.name, prev);
      });
    });
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [paidOrders]);

  return (
    <div className="pb-8">
      <header className="px-5 pt-5 pb-3">
        <h1 className="text-2xl font-extrabold text-stone-900 tracking-tight">Laporan Penjualan</h1>
        <p className="text-sm text-stone-400 mt-0.5">Omset dari pesanan yang sudah dibayar</p>

        <div className="flex gap-2 mt-4 overflow-x-auto no-scrollbar pb-1">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`whitespace-nowrap px-4 py-2 rounded-2xl text-sm font-bold transition-colors ${
                period === p.key
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'bg-white border border-stone-200 text-stone-500'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {period === 'custom' && (
          <div className="flex gap-2 mt-3">
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="flex-1 bg-stone-100 rounded-2xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="flex-1 bg-stone-100 rounded-2xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>
        )}
      </header>

      <main className="px-5 pt-2 space-y-5">
        {loading ? (
          <p className="text-center text-stone-400 text-sm py-10">Memuat laporan...</p>
        ) : (
          <>
            <div className="bg-stone-900 rounded-[28px] p-6 text-white relative overflow-hidden">
              <div className="w-11 h-11 rounded-2xl bg-primary-500 flex items-center justify-center mb-3">
                <TrendingUp size={20} className="text-stone-900" strokeWidth={2.5} />
              </div>
              <p className="text-xs text-white/60 font-semibold mb-1">Total Omset</p>
              <p className="text-4xl font-extrabold font-mono text-primary-400">
                {formatRupiah(totalOmset)}
              </p>
              <div className="flex justify-between mt-4 text-xs text-white/80 font-semibold">
                <span>{totalPesanan} pesanan</span>
                <span>Rata-rata {formatRupiah(rataRata)}/pesanan</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-3xl p-4 shadow-[0_2px_14px_rgba(28,25,23,0.06)] border border-stone-50">
                <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center mb-2">
                  <Clock3 size={16} className="text-amber-600" />
                </div>
                <p className="text-xl font-extrabold text-stone-900 font-mono">{pendingCount}</p>
                <p className="text-[11px] text-stone-400 font-semibold">Menunggu Bayar</p>
              </div>
              <div className="bg-white rounded-3xl p-4 shadow-[0_2px_14px_rgba(28,25,23,0.06)] border border-stone-50">
                <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center mb-2">
                  <Ban size={16} className="text-red-500" />
                </div>
                <p className="text-xl font-extrabold text-stone-900 font-mono">{cancelledCount}</p>
                <p className="text-[11px] text-stone-400 font-semibold">Dibatalkan</p>
              </div>
            </div>

            <div>
              <h2 className="text-xs font-extrabold text-stone-400 uppercase tracking-wide mb-2.5 flex items-center gap-1.5">
                <ShoppingBag size={13} /> Menu Terlaris
              </h2>
              {topItems.length === 0 ? (
                <p className="text-center text-stone-400 text-sm py-6">
                  Belum ada penjualan di periode ini
                </p>
              ) : (
                <div className="space-y-2.5">
                  {topItems.map((it, idx) => (
                    <div
                      key={it.name}
                      className="bg-white rounded-3xl p-3.5 flex items-center gap-3 shadow-[0_2px_14px_rgba(28,25,23,0.06)] border border-stone-50"
                    >
                      <span className="w-8 h-8 rounded-xl bg-primary-50 flex items-center justify-center text-xs font-extrabold text-primary-700 font-mono">
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-stone-900 truncate">{it.name}</p>
                        <p className="text-xs text-stone-400 font-medium">{it.qty} terjual</p>
                      </div>
                      <span className="text-sm font-extrabold text-stone-900 font-mono">
                        {formatRupiah(it.revenue)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
