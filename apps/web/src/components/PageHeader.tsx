'use client';

import type { LucideIcon } from 'lucide-react';
import { PawPrint } from 'lucide-react';

export default function PageHeader({
  title,
  description,
  icon: Icon,
  action,
  className = '',
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-[28px] text-white p-6 sm:p-8 animate-slide-down ${className}`}
      style={{
        background: 'linear-gradient(135deg, #0F3D2E 0%, #1B6B4A 60%, #2E8B62 100%)',
        backgroundSize: '200% 200%',
        animation: 'slide-down 0.6s cubic-bezier(0.22,1,0.36,1) both, gradient-shift 10s ease infinite',
      }}
    >
      {/* Dekoracyjne łapki */}
      <PawPrint className="absolute -right-6 -top-8 w-40 h-40 text-white/[0.06] rotate-12 animate-float" />
      <PawPrint className="absolute right-28 -bottom-10 w-28 h-28 text-white/[0.05] -rotate-12 animate-float-x" />
      <div className="absolute -left-10 -bottom-16 w-48 h-48 rounded-full bg-white/[0.05]" />

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
        <div className="flex items-center gap-4 min-w-0">
          {Icon && (
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center flex-shrink-0 shadow-inner">
              <Icon className="w-6 h-6" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="font-serif text-2xl sm:text-3xl font-normal truncate">{title}</h1>
            {description && <p className="text-white/80 text-sm mt-1 leading-relaxed">{description}</p>}
          </div>
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    </div>
  );
}
