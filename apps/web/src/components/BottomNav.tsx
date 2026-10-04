'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, PawPrint, Heart, Calendar } from 'lucide-react';
import MobileMenu from './MobileMenu';

const navItems = [
  { href: '/dashboard', label: 'Panel', icon: LayoutDashboard, match: '/dashboard' },
  { href: '/dashboard/pets', label: 'Pupile', icon: PawPrint, match: '/dashboard/pets' },
  { href: '/dashboard/health', label: 'Zdrowie', icon: Heart, match: '/dashboard/health' },
  { href: '/dashboard/calendar', label: 'Kalendarz', icon: Calendar, match: '/dashboard/calendar' },
];

export default function BottomNav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 pointer-events-none">
      <div className="pointer-events-auto mx-auto max-w-md bg-white/95 backdrop-blur-md border border-gray-200/70 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] rounded-2xl px-2 py-2 flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.match);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-xl min-w-[56px] transition-all ${
                active
                  ? 'text-brand-dark bg-brand-mint'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium leading-none">{item.label}</span>
            </Link>
          );
        })}

        <MobileMenu onOpen={setMenuOpen} />
      </div>
    </nav>
  );
}
