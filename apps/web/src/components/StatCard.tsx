'use client';

import { type LucideIcon } from 'lucide-react';
import AnimatedNumber from '@/components/ui/AnimatedNumber';

type Props = {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  iconBg?: string;
  iconColor?: string;
  /** klasa animacji, np. stagger-2 */
  stagger?: string;
  /** czy animować liczbę (gdy value to liczba) */
  animate?: boolean;
  /** mniejszy wariant — kompaktowe wiersze statystyk */
  compact?: boolean;
};

export default function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  iconBg = 'bg-brand-mint',
  iconColor = 'text-brand-dark',
  stagger = '',
  animate = true,
  compact = false,
}: Props) {
  const numeric = typeof value === 'number';

  if (compact) {
    return (
      <div className={`pv-card-hover px-4 py-3 animate-slide-up ${stagger} group flex items-center gap-3`}>
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg} transition-transform duration-300 group-hover:scale-110`}
        >
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
        <div className="min-w-0">
          <p className="font-serif text-xl font-normal text-gray-900 leading-tight tabular-nums">
            {numeric && animate ? <AnimatedNumber value={value as number} /> : value}
          </p>
          <p className="text-[11px] text-gray-500 leading-snug truncate">{label}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`pv-card-hover p-5 animate-slide-up ${stagger} group`}>
      <div className="flex items-center justify-between mb-4">
        <div
          className={`w-12 h-12 rounded-2xl flex items-center justify-center ${iconBg} transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6`}
        >
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
      </div>
      <p className="font-serif text-3xl font-normal text-gray-900 mb-1 tabular-nums">
        {numeric && animate ? <AnimatedNumber value={value as number} /> : value}
      </p>
      <p className="text-sm text-gray-500 leading-snug">{label}</p>
      {hint && <p className="text-xs text-gray-400 mt-1.5">{hint}</p>}
    </div>
  );
}
