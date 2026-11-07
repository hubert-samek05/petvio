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
}: Props) {
  const numeric = typeof value === 'number';

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
