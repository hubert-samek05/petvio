'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

type TileProps = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Klasy tła ikony, np. "bg-brand-dark text-white" */
  iconClass?: string;
  /** opcjonalny badge w rogu */
  badge?: string | number;
  /** klasa animacji wejścia, np. stagger-3 */
  stagger?: string;
  /** funkcja w przygotowaniu — wyszarzony kafelek otwierający info zamiast linku */
  soon?: boolean;
  onClick?: () => void;
};

/** Kafelek funkcyjny — nowoczesny, zaokrąglony, z animacją hover/press */
export default function Tile({ href, label, icon: Icon, iconClass = 'bg-brand-dark text-white', badge, stagger = '', soon = false, onClick }: TileProps) {
  if (soon) {
    return (
      <button type="button" onClick={onClick} className={`pv-tile animate-scale-in ${stagger} opacity-60`}>
        <span className="absolute top-2.5 right-2.5 px-1.5 h-5 rounded-full bg-gray-200 text-gray-500 text-[9px] font-bold uppercase tracking-wide flex items-center justify-center">
          wkrótce
        </span>
        <div className="pv-tile-icon bg-gray-100 text-gray-400">
          <Icon className="w-5 h-5" />
        </div>
        <span className="pv-tile-label !text-gray-400">{label}</span>
      </button>
    );
  }

  return (
    <Link href={href} className={`pv-tile animate-scale-in ${stagger}`}>
      {badge !== undefined && badge !== null && badge !== 0 && badge !== '' && (
        <span className="absolute top-2.5 right-2.5 min-w-[20px] h-5 px-1.5 rounded-full bg-brand text-white text-[10px] font-bold flex items-center justify-center">
          {badge}
        </span>
      )}
      <div className={`pv-tile-icon ${iconClass}`}>
        <Icon className="w-5 h-5" />
      </div>
      <span className="pv-tile-label">{label}</span>
    </Link>
  );
}
