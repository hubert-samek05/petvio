'use client';

import type { LucideIcon } from 'lucide-react';

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
      className={`relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-dark via-brand to-emerald-800 text-white p-6 sm:p-8 ${className}`}
    >
      <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-white/[0.05]" />
      <div className="absolute right-32 -bottom-20 w-48 h-48 rounded-full bg-white/[0.04]" />
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
        <div className="flex items-center gap-4 min-w-0">
          {Icon && (
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
              <Icon className="w-6 h-6" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="font-serif text-2xl sm:text-3xl font-normal truncate">{title}</h1>
            {description && <p className="text-white/80 text-sm mt-1">{description}</p>}
          </div>
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    </div>
  );
}
