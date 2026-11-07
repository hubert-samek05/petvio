'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, PawPrint, Heart, MapPin } from 'lucide-react';
import MobileMenu from './MobileMenu';

const navItems = [
  { href: '/dashboard', label: 'Panel', icon: LayoutDashboard, match: '/dashboard', exact: true },
  { href: '/dashboard/pets', label: 'Pupile', icon: PawPrint, match: '/dashboard/pets' },
  { href: '/dashboard/walk-tracker', label: 'Spacer', icon: MapPin, match: '/dashboard/walk-tracker', fab: true },
  { href: '/dashboard/health', label: 'Zdrowie', icon: Heart, match: '/dashboard/health' },
];

export default function BottomNav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const left = navItems.slice(0, 2);
  const right = navItems.slice(3);
  const fab = navItems[2];

  const isActive = (item: (typeof navItems)[number]) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.match);

  const renderItem = (item: (typeof navItems)[number]) => {
    const Icon = item.icon;
    const active = isActive(item);
    return (
      <Link
        key={item.href}
        href={item.href}
        className={`relative flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-2xl min-w-[58px] transition-all duration-300 ${
          active ? 'text-brand-dark' : 'text-gray-400 hover:text-gray-600'
        }`}
      >
        {active && (
          <span className="absolute -top-1 w-8 h-1 rounded-full bg-gradient-to-r from-brand to-brand-dark animate-scale-in" />
        )}
        <span
          className={`flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-300 ${
            active ? 'bg-brand-mint scale-105' : ''
          }`}
        >
          <Icon className={`w-5 h-5 transition-transform duration-300 ${active ? 'scale-110' : ''}`} />
        </span>
        <span className={`text-[10px] leading-none transition-all ${active ? 'font-bold' : 'font-medium'}`}>
          {item.label}
        </span>
      </Link>
    );
  };

  const FabIcon = fab.icon;
  const fabActive = isActive(fab);

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pointer-events-none">
      <div className="pointer-events-auto mx-auto max-w-md pv-glass border border-white/60 shadow-[0_8px_32px_rgba(15,61,46,0.14)] rounded-[28px] px-2 py-2 flex items-center justify-around relative">
        {left.map(renderItem)}

        {/* Centralny FAB — szybki spacer */}
        <Link
          href={fab.href}
          aria-label={fab.label}
          className="relative -mt-8 mx-1 flex-shrink-0"
        >
          <span
            className={`flex items-center justify-center w-14 h-14 rounded-full text-white shadow-xl transition-all duration-300 active:scale-90 ${
              fabActive ? 'animate-ring-pulse' : ''
            }`}
            style={{
              background: 'linear-gradient(135deg, #1B6B4A 0%, #0F3D2E 100%)',
              boxShadow: '0 8px 20px -4px rgba(15,61,46,0.45), inset 0 -3px 6px rgba(0,0,0,0.15), inset 0 2px 4px rgba(255,255,255,0.25)',
            }}
          >
            <FabIcon className="w-6 h-6" />
          </span>
          <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-gray-500 whitespace-nowrap">
            {fab.label}
          </span>
        </Link>

        {right.map(renderItem)}

        <MobileMenu onOpen={setMenuOpen} />
      </div>
    </nav>
  );
}
