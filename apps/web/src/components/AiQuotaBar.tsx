'use client';

import { Sparkles } from 'lucide-react';
import { useAiQuota, usePlan } from '@/lib/plan';

// Pasek „Pytania do AI dziś: X z Y” + CTA po wyczerpaniu limitu
export default function AiQuotaBar() {
  const { openUpgrade } = usePlan();
  const { loaded, max, used, left, out } = useAiQuota();
  if (!loaded || max === null) return null;
  const pct = Math.min(100, Math.round((used / max) * 100));
  const low = !out && left !== null && left <= Math.max(1, Math.floor(max * 0.2));

  return (
    <div
      className={`mb-2.5 rounded-xl px-3 py-2 flex items-center gap-2.5 ${
        out ? 'bg-amber-50 border border-amber-200' : 'bg-brand-cream/70 border border-brand-light/60'
      }`}
    >
      <Sparkles className={`w-3.5 h-3.5 flex-shrink-0 ${out ? 'text-amber-600' : 'text-brand'}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-[11px] font-semibold ${out ? 'text-amber-800' : 'text-gray-600'}`}>
          {out
            ? 'Dzienny limit pytań wyczerpany — odnowi się o północy'
            : `Pytania do AI dziś: ${left} z ${max}${low ? ' — kończy się limit' : ''}`}
        </p>
        <div className="h-1 rounded-full bg-white mt-1.5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              out || low ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 'bg-gradient-to-r from-brand to-brand-dark'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      {(out || low) && (
        <button
          type="button"
          onClick={() => openUpgrade({ code: 'AI_LIMIT', limit: max })}
          className="text-[11px] font-bold text-brand-dark bg-white border border-brand-light rounded-full px-3 py-1.5 flex-shrink-0 hover:bg-brand-mint transition-colors"
        >
          Więcej pytań
        </button>
      )}
    </div>
  );
}
