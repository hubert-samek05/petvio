'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Crown, Lock, PawPrint, Sparkles, Users, X, type LucideIcon } from 'lucide-react';
import { formatPln, petsWord, usePlan, type PlanCatalogItem, type UpgradeDetail } from '@/lib/plan';
import { subscriptionApi } from '@/lib/api';

const META: Record<UpgradeDetail['code'], { icon: LucideIcon; badge: string }> = {
  PREMIUM_FEATURE: { icon: Lock, badge: 'Funkcja premium' },
  PET_LIMIT: { icon: PawPrint, badge: 'Limit zwierząt' },
  PET_FROZEN: { icon: Lock, badge: 'Zwierzę zamrożone' },
  SHARE_LIMIT: { icon: Users, badge: 'Limit współdzielenia' },
  AI_LIMIT: { icon: Sparkles, badge: 'Limit pytań do AI' },
};

export const planBullets = (p: PlanCatalogItem) => [
  p.maxPets === null ? 'Bez limitu zwierząt' : `Do ${p.maxPets} ${petsWord(p.maxPets)}`,
  p.maxShares === null ? 'Współdzielenie bez limitu osób' : `Współdzielenie z ${p.maxShares} ${p.maxShares === 1 ? 'osobą' : 'osobami'}`,
  `${p.aiPerDay} pytań do AI dziennie`,
  ...(p.premiumFeatures ? ['Analiza krwi, BARF i rozród'] : []),
];

export default function UpgradeModal({ detail, onClose }: { detail: UpgradeDetail; onClose: () => void }) {
  const router = useRouter();
  const { info, refresh } = usePlan();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const meta = META[detail.code] || META.PREMIUM_FEATURE;
  const Icon = meta.icon;
  const currentId = info?.plan || detail.plan || 'mini';
  const target: 'family' | 'xl' =
    detail.requiredPlan === 'xl' || (currentId === 'family' && detail.code !== 'PREMIUM_FEATURE') ? 'xl' : 'family';
  const targetPlan = info?.plans.find((p) => p.id === target);
  const atTop = currentId === 'xl';
  const feature = detail.feature ? info?.features?.[detail.feature] : undefined;

  const title =
    detail.code === 'PREMIUM_FEATURE'
      ? `${feature?.name || 'Ta funkcja'} to funkcja premium`
      : detail.code === 'PET_LIMIT'
      ? 'Osiągnięto limit zwierząt'
      : detail.code === 'PET_FROZEN'
      ? 'Ten pupil jest zamrożony'
      : detail.code === 'SHARE_LIMIT'
      ? 'Osiągnięto limit współdzielenia'
      : 'Dzienny limit pytań do AI wyczerpany';

  const lead =
    detail.code === 'PREMIUM_FEATURE'
      ? feature?.description || detail.message
      : detail.code === 'PET_FROZEN'
      ? detail.message ||
        'Twój obecny plan obejmuje mniej zwierząt. Ten pupil jest bezpiecznie zamrożony — wszystkie jego dane są zachowane. Wróć do planu premium, a odblokuje się automatycznie.'
      : detail.message;

  const startTrial = async () => {
    setBusy(true);
    setError('');
    try {
      await subscriptionApi.startTrial(target);
      await refresh();
      window.dispatchEvent(new Event('pv:plan-refresh'));
      setDone(`Masz ${info?.trialDays || 7} dni planu ${targetPlan?.name || ''} za darmo — wszystko odblokowane.`);
    } catch (e: any) {
      setError(e.response?.data?.error?.message || 'Nie udało się uruchomić okresu próbnego');
    } finally {
      setBusy(false);
    }
  };

  const goPlans = () => {
    onClose();
    router.push('/dashboard/subscription');
  };

  const canTrial = !!info?.trialAvailable && !atTop;

  return (
    <div
      className="fixed inset-0 z-[140] bg-gray-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white rounded-t-[28px] sm:rounded-[28px] w-full sm:max-w-md max-h-[92vh] overflow-y-auto shadow-2xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Nagłówek */}
        <div
          className="relative overflow-hidden px-6 pt-7 pb-6 text-white"
          style={{ background: 'linear-gradient(135deg, #0F3D2E 0%, #1B6B4A 60%, #2E8B62 100%)' }}
        >
          <PawPrint className="absolute -right-5 -top-6 w-32 h-32 text-white/[0.07] rotate-12" />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
            aria-label="Zamknij"
          >
            <X className="w-4 h-4" />
          </button>
          <span className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center mb-4 ring-1 ring-white/20">
            <Icon className="w-7 h-7" />
          </span>
          <span className="inline-block px-2.5 py-1 rounded-full bg-white/15 text-[10px] font-bold uppercase tracking-[0.14em] mb-2">
            {meta.badge}
          </span>
          <h3 className="font-serif text-2xl leading-snug pr-8">{title}</h3>
        </div>

        <div className="p-6 space-y-5">
          {done ? (
            <div className="text-center py-4 space-y-4 animate-scale-in">
              <span className="w-16 h-16 rounded-full bg-brand-mint flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 text-brand-dark" />
              </span>
              <p className="font-semibold text-gray-900">Okres próbny uruchomiony</p>
              <p className="text-sm text-gray-500">{done}</p>
              <button onClick={onClose} className="pv-btn-primary w-full py-3.5">
                Super, działamy
              </button>
            </div>
          ) : (
            <>
              {lead && <p className="text-sm text-gray-600 leading-relaxed">{lead}</p>}

              {/* Pasek zużycia dla limitów */}
              {detail.code !== 'PREMIUM_FEATURE' && detail.limit !== undefined && (
                <div className="rounded-2xl bg-brand-cream/70 border border-brand-light/60 p-4">
                  <div className="flex items-center justify-between text-xs font-semibold text-gray-600 mb-2">
                    <span>Twój plan: {info?.planName || 'Mini rodzina'}</span>
                    <span>
                      {detail.limit} / {detail.limit}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-white overflow-hidden">
                    <div className="h-full w-full rounded-full bg-gradient-to-r from-brand to-brand-dark" />
                  </div>
                  {detail.code === 'AI_LIMIT' && (
                    <p className="text-[11px] text-gray-400 mt-2">Limit odnawia się codziennie o północy.</p>
                  )}
                </div>
              )}

              {/* Rekomendowany plan */}
              {!atTop && targetPlan && (
                <div className="rounded-2xl border border-brand-light bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-9 h-9 rounded-xl bg-brand-peach flex items-center justify-center">
                        <Crown className="w-[18px] h-[18px] text-brand-dark" />
                      </span>
                      <div>
                        <p className="font-bold text-gray-900 text-sm leading-tight">{targetPlan.name}</p>
                        <p className="text-[11px] text-gray-400">{targetPlan.tagline}</p>
                      </div>
                    </div>
                    <p className="text-right flex-shrink-0">
                      <span className="font-bold text-gray-900">{formatPln(targetPlan.priceMonthly)}</span>
                      <span className="text-[11px] text-gray-400"> / mies.</span>
                    </p>
                  </div>
                  <ul className="space-y-1.5">
                    {planBullets(targetPlan).map((b) => (
                      <li key={b} className="flex items-center gap-2 text-[13px] text-gray-600">
                        <span className="w-4 h-4 rounded-full bg-brand-mint flex items-center justify-center flex-shrink-0">
                          <Check className="w-2.5 h-2.5 text-brand-dark" />
                        </span>
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {atTop && (
                <p className="text-sm text-gray-500 bg-gray-50 rounded-2xl p-4">
                  Masz już najwyższy plan. Limit odnowi się automatycznie jutro.
                </p>
              )}

              {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl p-3">{error}</p>}

              <div className="space-y-2.5">
                {canTrial && (
                  <button
                    onClick={startTrial}
                    disabled={busy}
                    className="pv-btn-primary w-full py-3.5 disabled:opacity-60"
                  >
                    {busy ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>Wypróbuj {info?.trialDays || 7} dni za darmo</>
                    )}
                  </button>
                )}
                {!atTop && (
                  <button
                    onClick={goPlans}
                    className={`w-full py-3.5 rounded-2xl font-bold text-sm active:scale-[0.98] transition-all ${
                      canTrial
                        ? 'bg-brand-mint text-brand-dark hover:bg-brand-light'
                        : 'bg-brand-dark text-white hover:bg-brand'
                    }`}
                  >
                    Zobacz plany i ceny
                  </button>
                )}
                <button onClick={onClose} className="w-full py-2.5 text-sm font-medium text-gray-400 hover:text-gray-600">
                  {atTop ? 'Zamknij' : 'Może później'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
