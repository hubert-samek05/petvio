'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, Crown, Lock, PawPrint } from 'lucide-react';
import { formatPln, petsWord, usePlan } from '@/lib/plan';
import { subscriptionApi } from '@/lib/api';
import { planBullets } from '@/components/UpgradeModal';

function Spinner() {
  return (
    <div className="py-28 flex justify-center">
      <span className="w-8 h-8 border-[3px] border-brand-light border-t-brand rounded-full animate-spin" />
    </div>
  );
}

function LockedCard({
  icon: Icon,
  badge,
  title,
  lead,
  usage,
  target = 'family',
}: {
  icon: typeof Lock;
  badge: string;
  title: string;
  lead: string;
  usage?: { used: number; max: number };
  target?: 'family' | 'xl';
}) {
  const { info, refresh } = usePlan();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const plan = info?.plans.find((p) => p.id === target);
  const canTrial = !!info?.trialAvailable;

  const startTrial = async () => {
    setBusy(true);
    setError('');
    try {
      await subscriptionApi.startTrial(target);
      await refresh();
    } catch (e: any) {
      setError(e.response?.data?.error?.message || 'Nie udało się uruchomić okresu próbnego');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-6 sm:py-12 animate-slide-up">
      <div className="pv-card overflow-hidden">
        <div
          className="relative px-6 sm:px-8 pt-8 pb-7 text-white overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #0F3D2E 0%, #1B6B4A 60%, #2E8B62 100%)' }}
        >
          <PawPrint className="absolute -right-6 -top-8 w-40 h-40 text-white/[0.06] rotate-12" />
          <span className="w-16 h-16 rounded-2xl bg-white/15 ring-1 ring-white/20 flex items-center justify-center mb-4">
            <Icon className="w-8 h-8" />
          </span>
          <span className="inline-block px-2.5 py-1 rounded-full bg-white/15 text-[10px] font-bold uppercase tracking-[0.14em] mb-2">
            {badge}
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl leading-snug">{title}</h1>
        </div>

        <div className="p-6 sm:p-8 space-y-5">
          <p className="text-gray-600 leading-relaxed">{lead}</p>

          {usage && (
            <div className="rounded-2xl bg-brand-cream/70 border border-brand-light/60 p-4">
              <div className="flex items-center justify-between text-xs font-semibold text-gray-600 mb-2">
                <span>Twój plan: {info?.planName}</span>
                <span>
                  {usage.used} / {usage.max}
                </span>
              </div>
              <div className="h-2 rounded-full bg-white overflow-hidden">
                <div className="h-full w-full rounded-full bg-gradient-to-r from-brand to-brand-dark" />
              </div>
            </div>
          )}

          {plan && (
            <div className="rounded-2xl border border-brand-light p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-9 h-9 rounded-xl bg-brand-peach flex items-center justify-center">
                    <Crown className="w-[18px] h-[18px] text-brand-dark" />
                  </span>
                  <div>
                    <p className="font-bold text-gray-900 text-sm leading-tight">{plan.name}</p>
                    <p className="text-[11px] text-gray-400">{plan.tagline}</p>
                  </div>
                </div>
                <p className="flex-shrink-0 text-right">
                  <span className="font-bold text-gray-900">{formatPln(plan.priceMonthly)}</span>
                  <span className="text-[11px] text-gray-400"> / mies.</span>
                </p>
              </div>
              <ul className="grid sm:grid-cols-2 gap-x-4 gap-y-1.5">
                {planBullets(plan).map((b) => (
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

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl p-3">{error}</p>}

          <div className="grid sm:grid-cols-2 gap-3">
            {canTrial && (
              <button onClick={startTrial} disabled={busy} className="pv-btn-primary py-3.5 disabled:opacity-60">
                {busy ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>Wypróbuj {info?.trialDays || 7} dni za darmo</>
                )}
              </button>
            )}
            <Link
              href="/dashboard/subscription"
              className={`py-3.5 rounded-2xl font-bold text-sm text-center active:scale-[0.98] transition-all ${
                canTrial ? 'bg-brand-mint text-brand-dark hover:bg-brand-light' : 'bg-brand-dark text-white hover:bg-brand sm:col-span-2'
              }`}
            >
              Zobacz plany i ceny
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// Strona premium — plan Mini widzi zachętę zamiast treści
export function PremiumGate({ feature, children }: { feature: string; children: React.ReactNode }) {
  const { info, loading } = usePlan();
  if (loading && !info) return <Spinner />;
  const f = info?.features?.[feature];
  if (!info || !f || f.unlocked) return <>{children}</>;
  return (
    <LockedCard
      icon={Lock}
      badge="Funkcja premium"
      title={`${f.name} to funkcja premium`}
      lead={`${f.description} Dostępne w planach Duża rodzina i Bardzo duża rodzina.`}
    />
  );
}

// /dashboard/pets/new — przy wyczerpanym limicie zamiast formularza komunikat
export function PetLimitGate({ children }: { children: React.ReactNode }) {
  const { info, loading } = usePlan();
  if (loading && !info) return <Spinner />;
  const u = info?.usage.pets;
  if (!info || !u || u.max === null || u.used < u.max) return <>{children}</>;
  const target = info.plan === 'family' ? 'xl' : 'family';
  return (
    <LockedCard
      icon={PawPrint}
      badge="Limit zwierząt"
      title="Osiągnięto limit zwierząt"
      lead={`Plan ${info.planName} pozwala na ${u.max} ${petsWord(u.max)}. Przejdź na wyższy plan, aby dodać kolejnych pupili.`}
      usage={{ used: u.used, max: u.max }}
      target={target}
    />
  );
}
