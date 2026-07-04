'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ShoppingCart, ClipboardList, UtensilsCrossed, BarChart3 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { ACTIVE_STATUSES } from '@/lib/statusConfig';

export default function BottomNav() {
  const pathname = usePathname();
  const [activeCount, setActiveCount] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function fetchCount() {
      const { count } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .in('status', ACTIVE_STATUSES);
      if (mounted) setActiveCount(count || 0);
    }

    fetchCount();

    const channel = supabase
      .channel('bottomnav-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchCount();
      })
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const items = [
    { href: '/', label: 'Kasir', icon: ShoppingCart },
    { href: '/antrian', label: 'Antrian', icon: ClipboardList, badge: activeCount },
    { href: '/menu', label: 'Menu', icon: UtensilsCrossed },
    { href: '/laporan', label: 'Laporan', icon: BarChart3 },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white rounded-t-3xl shadow-[0_-6px_20px_rgba(0,0,0,0.08)]">
      <div className="max-w-md mx-auto grid grid-cols-4 px-2 pt-2.5 pb-3">
        {items.map(({ href, label, icon: Icon, badge }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center justify-center gap-1"
            >
              <div className="relative">
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-200 ${
                    active ? 'bg-primary-500 scale-105' : 'bg-transparent scale-100'
                  }`}
                >
                  <Icon
                    size={20}
                    strokeWidth={active ? 2.5 : 2}
                    className={active ? 'text-stone-900' : 'text-stone-400'}
                  />
                </div>
                {badge > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-ember-500 text-white text-[10px] leading-none rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 font-mono">
                    {badge}
                  </span>
                )}
              </div>
              <span
                className={`text-[11px] font-bold ${active ? 'text-stone-900' : 'text-stone-400'}`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
