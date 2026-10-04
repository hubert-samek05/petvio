'use client';

import { type LucideIcon } from 'lucide-react';

type Props = {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  iconBg?: string;
  iconColor?: string;
};

export default function StatCard({ icon: Icon, label, value, hint, iconBg = 'bg-brand-mint', iconColor = 'text-brand-dark' }: Props) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${iconBg}`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
      </div>
      <p className="font-serif text-3xl font-normal text-gray-900 mb-1">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
      {hint && <p className="text-xs text-gray-400 mt-1.5">{hint}</p>}
    </div>
  );
}
