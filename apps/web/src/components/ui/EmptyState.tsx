'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

type Props = {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  compact?: boolean;
};

/** Spójny pusty stan z ikoną i CTA */
export default function EmptyState({ icon: Icon, title, description, actionLabel, actionHref, compact = false }: Props) {
  return (
    <div className={`text-center ${compact ? 'py-6' : 'py-10'} animate-fade-in`}>
      <div className="w-16 h-16 mx-auto mb-4 rounded-3xl bg-brand-mint flex items-center justify-center animate-float">
        <Icon className="w-7 h-7 text-brand-dark" />
      </div>
      <p className="text-gray-700 font-semibold mb-1">{title}</p>
      {description && <p className="text-sm text-gray-500 mb-5 max-w-xs mx-auto">{description}</p>}
      {actionLabel && actionHref && (
        <Link href={actionHref} className="inline-flex items-center text-sm font-semibold text-brand-dark hover:text-brand transition-colors">
          {actionLabel} <span className="ml-1">→</span>
        </Link>
      )}
    </div>
  );
}
