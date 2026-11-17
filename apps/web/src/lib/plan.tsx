'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { subscriptionApi } from '@/lib/api';
import UpgradeModal from '@/components/UpgradeModal';

export type PlanId = 'mini' | 'family' | 'xl';

export type PlanCatalogItem = {
  id: PlanId;
  name: string;
  tagline: string;
  maxPets: number | null;
  maxShares: number | null;
  aiPerDay: number;
  premiumFeatures: boolean;
  priceMonthly: number;
  priceYearly: number;
};

export type UsageItem = { used: number; max: number | null };

export type PlanInfo = {
  plan: PlanId;
  planName: string;
  source: string;
  billing: string | null;
  expiresAt: string | null;
  isTrial: boolean;
  isAdmin: boolean;
  trialUsed?: boolean;
  trialAvailable: boolean;
  trialDays: number;
  premiumFeatures: boolean;
  features: Record<string, { name: string; description: string; unlocked: boolean }>;
  usage: { pets: UsageItem; shares: UsageItem; ai: UsageItem & { resetsAt: string } };
  plans: PlanCatalogItem[];
  paymentsAvailable?: boolean;
  stripeManaged?: boolean;
  appleManaged?: boolean;
  cancelAtPeriodEnd?: boolean;
};

export type UpgradeCode = 'PREMIUM_FEATURE' | 'PET_LIMIT' | 'SHARE_LIMIT' | 'AI_LIMIT' | 'PET_FROZEN';

export type UpgradeDetail = {
  code: UpgradeCode;
  message?: string;
  feature?: string;
  requiredPlan?: PlanId;
  limit?: number;
  plan?: PlanId;
};

type Ctx = {
  info: PlanInfo | null;
  loading: boolean;
  refresh: () => Promise<void>;
  openUpgrade: (d: UpgradeDetail) => void;
};

const PlanContext = createContext<Ctx>({
  info: null,
  loading: true,
  refresh: async () => {},
  openUpgrade: () => {},
});

export const usePlan = () => useContext(PlanContext);

// Pozostała dzienna pula pytań do AI (wspólna dla Asystenta i Doradcy ziołowego)
export const useAiQuota = () => {
  const { info } = useContext(PlanContext);
  const max = info?.usage.ai.max ?? null;
  const used = info?.usage.ai.used ?? 0;
  const left = max === null ? null : Math.max(0, max - used);
  return { loaded: !!info, max, used, left, out: left === 0 };
};

export const formatPln = (grosz: number) =>
  `${(grosz / 100).toFixed(grosz % 100 === 0 ? 0 : 2).replace('.', ',')} zł`;

export const petsWord = (n: number) => (n === 1 ? 'zwierzę' : n >= 2 && n <= 4 ? 'zwierzęta' : 'zwierząt');

export function PlanProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [info, setInfo] = useState<PlanInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrade, setUpgrade] = useState<UpgradeDetail | null>(null);

  const refresh = useCallback(async () => {
    if (typeof window === 'undefined' || !localStorage.getItem('token')) {
      setLoading(false);
      return;
    }
    try {
      setInfo(await subscriptionApi.getMe());
    } catch {
      /* brak planu = nie blokujemy interfejsu, backend i tak egzekwuje limity */
    } finally {
      setLoading(false);
    }
  }, []);

  // odśwież przy zmianie strony (liczniki zwierząt / AI zmieniają się w trakcie używania)
  useEffect(() => {
    refresh();
  }, [pathname, refresh]);

  useEffect(() => {
    const onUpgrade = (e: Event) => {
      setUpgrade((e as CustomEvent<UpgradeDetail>).detail);
      refresh();
    };
    const onRefresh = () => refresh();
    window.addEventListener('pv:upgrade', onUpgrade);
    window.addEventListener('pv:plan-refresh', onRefresh);
    return () => {
      window.removeEventListener('pv:upgrade', onUpgrade);
      window.removeEventListener('pv:plan-refresh', onRefresh);
    };
  }, [refresh]);

  const value = useMemo(
    () => ({ info, loading, refresh, openUpgrade: (d: UpgradeDetail) => setUpgrade(d) }),
    [info, loading, refresh]
  );

  return (
    <PlanContext.Provider value={value}>
      {children}
      {upgrade && <UpgradeModal detail={upgrade} onClose={() => setUpgrade(null)} />}
    </PlanContext.Provider>
  );
}
