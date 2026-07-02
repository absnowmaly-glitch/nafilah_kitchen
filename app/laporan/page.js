'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { formatRupiah } from '@/lib/format';
import { startOfDay, startOfWeek, startOfMonth, endOfDay } from '@/lib/dateRange';
import { STATUS } from '@/lib/statusConfig';

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
    <div className="pb-24">
      <header className="sticky top-0 z-30 bg-white border-b border-stone-100 px-4 pt-4 pb-3">
        <h1 className="text-lg font-bold text-stone-800">Laporan Penjualan</h1>
        <p className="text-xs text-stone-400">Omset dihitung dari pesanan yang sudah dibayar</p>

        <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar pb-1">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                period === p.key
                  ? 'bg-stone-800 border-stone-800 text-white'
                  : 'bg-white border-stone-200 text-stone-500'
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
              className="flex-1 border border-stone-200 rounded-xl px-2 py-2 text-xs"
            />
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="flex-1 border border-stone-200 rounded-xl px-2 py-2 text-xs"
            />
          </div>
        )}
      </header>

      <main className="px-4 pt-4 space-y-5">
        {loading ? (
          <p className="text-center text-stone-400 text-sm py-10">Memuat laporan...</p>
        ) : (
          <>
            <div className="bg-primary-500 rounded-2xl p-5 text-white">
              <p className="text-xs opacity-80 mb-1">Total Omset</p>
              <p className="text-3xl font-bold font-mono">{formatRupiah(totalOmset)}</p>
              <div className="flex justify-between mt-3 text-xs opacity-90">
                <span>{totalPesanan} pesanan</span>
                <span>Rata-rata {formatRupiah(rataRata)}/pesanan</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="border border-stone-200 rounded-2xl p-3 text-center">
                <p className="text-lg font-bold text-stone-800 font-mono">{pendingCount}</p>
                <p className="text-[11px] text-stone-400">Menunggu Bayar</p>
              </div>
              <div className="border border-stone-200 rounded-2xl p-3 text-center">
                <p className="text-lg font-bold text-stone-800 font-mono">{cancelledCount}</p>
                <p className="text-[11px] text-stone-400">Dibatalkan</p>
              </div>
            </div>

            <div>
              <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wide mb-2">
                Menu Terlaris
              </h2>
              {topItems.length === 0 ? (
                <p className="text-center text-stone-400 text-sm py-6">
                  Belum ada penjualan di periode ini
                </p>
              ) : (
                <div className="space-y-2">
                  {topItems.map((it, idx) => (
                    <div
                      key={it.name}
                      className="border border-stone-200 rounded-2xl p-3 flex items-center gap-3"
                    >
                      <span className="w-6 text-center text-xs font-bold text-stone-400 font-mono">
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-stone-800 truncate">{it.name}</p>
                        <p className="text-xs text-stone-400">{it.qty} terjual</p>
                      </div>
                      <span className="text-sm font-bold text-primary-600 font-mono">
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
