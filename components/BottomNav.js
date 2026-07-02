'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ShoppingCart, ClipboardList, UtensilsCrossed } from 'lucide-react';
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
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-stone-200 bg-white">
      <div className="max-w-md mx-auto grid grid-cols-3">
        {items.map(({ href, label, icon: Icon, badge }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center gap-1 py-2.5 ${
                active ? 'text-primary-600' : 'text-stone-400'
              }`}
            >
              <div className="relative">
                <Icon size={22} strokeWidth={active ? 2.5 : 2} />
                {badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-ember-500 text-white text-[10px] leading-none rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 font-mono">
                    {badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-semibold">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
