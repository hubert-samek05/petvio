'use client';

import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { AlertTriangle, Check, CheckCircle2, Clock, Crown, ExternalLink, History, Lock, Minus, PawPrint, RotateCcw, ShieldCheck, Sparkles, Users, X } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { planBullets } from '@/components/UpgradeModal';
import { formatPln, usePlan, type PlanCatalogItem, type UsageItem } from '@/lib/plan';
import { subscriptionApi } from '@/lib/api';
import { getIAPOfferings, iapAvailable, initIAP, onCustomerInfoUpdate, purchaseIAPPackage, restoreIAPPurchases, type RcPackage } from '@/lib/iap';

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

// Wygląd pól karty Stripe dopasowany do stylu Petvio
const stripeAppearance = {
  theme: 'stripe' as const,
  variables: {
    colorPrimary: '#1B6B4A',
    colorText: '#111827',
    colorDanger: '#DC2626',
    fontFamily: 'inherit',
    borderRadius: '14px',
    spacingUnit: '4px',
  },
  rules: {
    '.Input': { border: '1px solid #E5E7EB', boxShadow: 'none' },
    '.Input:focus': { border: '1px solid #1B6B4A', boxShadow: '0 0 0 3px #DCEFE3' },
    '.Label': { fontWeight: '600', fontSize: '12px', color: '#6B7280', marginBottom: '6px' },
    '.Tab': { borderRadius: '14px', border: '1px solid #E5E7EB' },
    '.Tab--selected': { borderColor: '#1B6B4A', boxShadow: '0 0 0 1px #1B6B4A' },
  },
};

type PaySession = {
  clientSecret: string;
  mode: 'payment' | 'setup';
  trial: boolean;
  plan: 'family' | 'xl';
  billing?: { name?: string; email?: string };
};

type HistoryEvent = {
  event_type: string;
  plan: string | null;
  billing: string | null;
  source: string | null;
  amount_grosz: number | null;
  note: string | null;
  created_at: string;
};

// Czytelne etykiety i ikony zdarzeń w popupie historii
const EVENT_META: Record<string, { label: string; icon: typeof Check; cls: string }> = {
  purchase: { label: 'Zakup subskrypcji', icon: CheckCircle2, cls: 'bg-brand-mint text-brand-dark' },
  renewal: { label: 'Odnowienie subskrypcji', icon: RotateCcw, cls: 'bg-brand-mint text-brand-dark' },
  trial_started: { label: 'Start okresu próbnego', icon: Sparkles, cls: 'bg-amber-100 text-amber-800' },
  cancel_scheduled: { label: 'Zaplanowano anulowanie', icon: Clock, cls: 'bg-amber-100 text-amber-800' },
  cancel: { label: 'Subskrypcja zakończona', icon: X, cls: 'bg-red-50 text-red-600' },
  resume: { label: 'Wznowienie subskrypcji', icon: CheckCircle2, cls: 'bg-brand-mint text-brand-dark' },
  expired: { label: 'Plan wygasł', icon: Clock, cls: 'bg-gray-100 text-gray-500' },
  payment_failed: { label: 'Nieudana płatność', icon: AlertTriangle, cls: 'bg-red-50 text-red-600' },
  admin_grant: { label: 'Plan nadany przez support', icon: ShieldCheck, cls: 'bg-brand-mint text-brand-dark' },
  admin_revoke: { label: 'Plan odebrany', icon: ShieldCheck, cls: 'bg-red-50 text-red-600' },
  refund: { label: 'Zwrot płatności', icon: RotateCcw, cls: 'bg-amber-100 text-amber-800' },
};
const SHOW_NOTE = new Set(['payment_failed', 'admin_grant', 'admin_revoke', 'refund']);

const fmtDate = (d: string) => new Date(d).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });
const daysLeft = (d: string) => Math.max(0, Math.ceil((new Date(d).getTime() - Date.now()) / 86400000));
const savePct = (p: PlanCatalogItem) => Math.round((1 - p.priceYearly / (p.priceMonthly * 12)) * 100);

function Meter({ icon: Icon, label, u, unit, hint }: { icon: typeof PawPrint; label: string; u: UsageItem; unit?: string; hint?: string }) {
  const unlimited = u.max === null;
  const pct = unlimited ? 8 : Math.min(100, Math.round((u.used / (u.max || 1)) * 100));
  const full = !unlimited && u.used >= (u.max || 0);
  return (
    <div className="rounded-2xl bg-white border border-gray-100 p-4">
      <div className="flex items-center gap-2.5 mb-3">
        <span className="w-9 h-9 rounded-xl bg-brand-mint flex items-center justify-center">
          <Icon className="w-[17px] h-[17px] text-brand-dark" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-gray-500">{label}</p>
          <p className="text-lg font-bold text-gray-900 leading-tight">
            {u.used}
            <span className="text-sm font-medium text-gray-400"> / {unlimited ? '∞' : u.max}</span>
            {unit && <span className="text-xs font-medium text-gray-400"> {unit}</span>}
          </p>
        </div>
      </div>
      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${full ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 'bg-gradient-to-r from-brand to-brand-dark'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {hint && <p className="text-[11px] text-gray-400 mt-2">{hint}</p>}
    </div>
  );
}

const Cell = ({ v }: { v: boolean | string }) =>
  v === true ? (
    <span className="inline-flex w-5 h-5 rounded-full bg-brand-mint items-center justify-center">
      <Check className="w-3 h-3 text-brand-dark" />
    </span>
  ) : v === false ? (
    <Minus className="w-4 h-4 text-gray-300 mx-auto" />
  ) : (
    <span className="text-sm font-semibold text-gray-700">{v}</span>
  );

// Własny formularz płatności — pola karty Stripe (PaymentElement), reszta to UI Petvio
function PayForm({ session, priceText, onDone, onFallback }: { session: PaySession; priceText: string; onDone: () => void; onFallback: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [slow, setSlow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setBusy(true);
    setError(null);
    setSlow(false);
    const slowTimer = setTimeout(() => setSlow(true), 8000);
    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setError(submitError.message || 'Sprawdź dane karty');
        return;
      }
      // 1) Klient tworzy tylko PaymentMethod — jedno proste wywołanie
      const { paymentMethod, error: pmError } = await Promise.race([
        stripe.createPaymentMethod({
          elements,
          params: {
            billing_details: {
              name: session.billing?.name,
              email: session.billing?.email,
            },
          },
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 45000)),
      ]);
      if (pmError || !paymentMethod) {
        subscriptionApi.paylog({
          step: 'createPaymentMethod', type: pmError?.type, code: pmError?.code,
          message: pmError?.message || 'no paymentMethod returned',
        });
        setError(pmError?.message || 'Nie udało się odczytać danych karty');
        return;
      }
      // 2) Potwierdzenie robi nasz serwer — odporniejsze na WebView
      const res = await subscriptionApi.confirm(paymentMethod.id);
      if (res.requiresAction && res.clientSecret) {
        // 3) Karta wymaga 3D Secure — dokończenie po stronie klienta
        const act = await stripe.handleNextAction({ clientSecret: res.clientSecret });
        if (act.error) {
          subscriptionApi.paylog({ step: 'handleNextAction', type: act.error.type, code: act.error.code, message: act.error.message });
          setError(act.error.message || 'Potwierdzenie w banku nie powiodło się');
          return;
        }
      }
      onDone();
    } catch (e: any) {
      subscriptionApi.paylog({
        step: 'catch', type: e?.type || e?.name, code: e?.code || e?.response?.status,
        message: e?.message || e?.response?.data?.error?.message,
      });
      if (e?.message === 'timeout' || e?.code === 'ECONNABORTED') {
        setTimedOut(true);
        setError('Przetwarzanie trwa zbyt długo — wygląda na to, że urządzenie lub sieć blokuje połączenie z operatorem płatności.');
      } else {
        setError(e?.response?.data?.error?.message || 'Płatność nie powiodła się — sprawdź dane karty i spróbuj ponownie');
      }
    } finally {
      clearTimeout(slowTimer);
      setBusy(false);
      setSlow(false);
    }
  };

  return (
    <form onSubmit={submit} className="p-5 pt-1 space-y-4">
      <PaymentElement
        options={{
          layout: 'tabs',
          wallets: { applePay: 'never', googlePay: 'never' },
          terms: { card: 'never' },
        }}
      />
      {error && (
        <div className="text-sm text-red-700 bg-red-50 rounded-xl p-3 space-y-2">
          <p>{error}</p>
          {timedOut && (
            <button
              type="button"
              onClick={onFallback}
              className="w-full py-2.5 rounded-xl bg-brand-dark text-white text-xs font-bold hover:bg-brand active:scale-[0.98] transition-all inline-flex items-center justify-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Otwórz bezpieczną stronę płatności Stripe
            </button>
          )}
        </div>
      )}
      <button
        type="submit"
        disabled={!stripe || busy}
        className="w-full py-4 rounded-2xl bg-brand-dark text-white text-sm font-bold hover:bg-brand active:scale-[0.98] transition-all disabled:opacity-60"
      >
        {busy ? 'Przetwarzam…' : session.trial ? 'Rozpocznij — 7 dni za darmo' : `Potwierdź i opłać — ${priceText}`}
      </button>
      {busy && slow && (
        <p className="text-[11px] text-amber-700 bg-amber-50 rounded-xl p-3 text-center leading-relaxed animate-fade-in">
          To trwa dłużej niż zwykle — Twój bank może wymagać potwierdzenia (3D Secure).
          Sprawdź powiadomienia z banku i nie zamykaj tego okna.
        </p>
      )}
      <p className="text-[11px] text-gray-400 text-center leading-relaxed">
        {session.trial
          ? `Podajesz kartę teraz, ale pierwszą płatność (${priceText}) pobierzemy dopiero po 7 dniach. Anulujesz w każdej chwili.`
          : 'Subskrypcja odnawia się automatycznie — anulujesz ją w każdej chwili.'}
      </p>
      <p className="flex items-center justify-center gap-1.5 text-[10px] text-gray-400">
        <ShieldCheck className="w-3.5 h-3.5" /> Bezpieczna płatność — obsługuje Stripe
      </p>
    </form>
  );
}

export default function SubscriptionPage() {
  const { info, loading, refresh } = usePlan();
  const [yearly, setYearly] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [paySession, setPaySession] = useState<PaySession | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [history, setHistory] = useState<HistoryEvent[] | null>(null);
  const [iapPackages, setIapPackages] = useState<RcPackage[] | null>(null);

  const isNative = Capacitor.isNativePlatform();
  // iOS: zakup wyłącznie przez Apple IAP (App Store 3.1.1) — Stripe zostaje dla webu i Androida
  const isIOS = Capacitor.getPlatform() === 'ios';

  // Dopasowanie paczki RevenueCat do planu + okresu (product_id zawiera family/xl + monthly/yearly)
  const packageFor = (planId: string, isYearly: boolean): RcPackage | undefined =>
    (iapPackages || []).find((pkg) => {
      const id = pkg.product.identifier.toLowerCase();
      const planOk = planId === 'xl' ? id.includes('xl') : id.includes('family') && !id.includes('xl');
      const yearlyOk = /year|annual|rocz/.test(id) === isYearly;
      return planOk && yearlyOk;
    });

  // Powrót ze Stripe Checkout — pokazujemy komunikat i odświeżamy plan (webhook ustawi go w tle)
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get('success') === '1') {
      setMsg({ ok: true, text: 'Dziękujemy! Płatność przeszła — plan aktywuje się w ciągu kilku sekund.' });
      window.history.replaceState(null, '', window.location.pathname);
      setTimeout(() => refresh(), 3000);
    } else if (q.get('canceled') === '1') {
      setMsg({ ok: false, text: 'Płatność anulowana — nic nie zostało pobrane.' });
      window.history.replaceState(null, '', window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // iOS: inicjalizacja IAP + pobranie ofert z App Store; listener odświeża plan po zakupie/odnowieniu
  useEffect(() => {
    if (!isIOS || !iapAvailable()) return;
    let cancelled = false;
    (async () => {
      try {
        const raw = localStorage.getItem('user');
        const userId = raw ? Number(JSON.parse(raw)?.id) : 0;
        if (!userId) return;
        await initIAP(userId);
        const packages = await getIAPOfferings();
        if (!cancelled) setIapPackages(packages);
        onCustomerInfoUpdate(() => refresh());
      } catch (e) {
        console.warn('IAP setup failed:', e);
        if (!cancelled) setIapPackages([]);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startTrial = async (plan: 'family' | 'xl') => {
    setBusy(plan);
    setMsg(null);
    try {
      await subscriptionApi.startTrial(plan);
      await refresh();
      setMsg({ ok: true, text: `Okres próbny uruchomiony — masz ${info?.trialDays || 7} dni pełnego dostępu.` });
    } catch (e: any) {
      setMsg({ ok: false, text: e.response?.data?.error?.message || 'Nie udało się uruchomić okresu próbnego' });
    } finally {
      setBusy(null);
    }
  };

  const buy = async (plan: 'family' | 'xl') => {
    setBusy(plan);
    setMsg(null);
    try {
      const s = await subscriptionApi.paymentSession(`${plan}_${yearly ? 'yearly' : 'monthly'}` as any);
      setPaySession({ ...s, plan });
    } catch (e: any) {
      setMsg({ ok: false, text: e.response?.data?.error?.message || 'Nie udało się rozpocząć płatności' });
    } finally {
      setBusy(null);
    }
  };

  // iOS: zakup przez Apple IAP — webhook RevenueCat aktywuje plan na backendzie,
  // customerInfoUpdate odświeża UI od razu; plan w bazie potwierdzamy po chwili
  const buyIAP = async (planId: 'family' | 'xl') => {
    const pkg = packageFor(planId, yearly);
    if (!pkg) {
      setMsg({ ok: false, text: 'Nie udało się wczytać oferty z App Store — spróbuj ponownie za chwilę' });
      return;
    }
    setBusy(planId);
    setMsg(null);
    try {
      const { success, cancelled } = await purchaseIAPPackage(pkg);
      if (success) {
        setMsg({ ok: true, text: 'Dziękujemy! Subskrypcja aktywuje się w ciągu kilku sekund.' });
        await refresh();
        setTimeout(() => refresh(), 4000);
        setTimeout(() => refresh(), 10000);
      } else if (!cancelled) {
        setMsg({ ok: false, text: 'Zakup nie został ukończony' });
      }
    } catch (e: any) {
      setMsg({ ok: false, text: e?.message || 'Zakup nie powiódł się — spróbuj ponownie' });
    } finally {
      setBusy(null);
    }
  };

  const restoreIAP = async () => {
    setBusy('restore');
    setMsg(null);
    try {
      const info2 = await restoreIAPPurchases();
      const active = Object.keys(info2?.entitlements?.active || {}).length;
      if (active > 0) {
        setMsg({ ok: true, text: 'Przywrócono zakupy — plan aktywuje się w ciągu kilku sekund.' });
        await refresh();
        setTimeout(() => refresh(), 4000);
      } else {
        setMsg({ ok: false, text: 'Nie znaleziono aktywnych subskrypcji na tym koncie Apple' });
      }
    } catch {
      setMsg({ ok: false, text: 'Nie udało się przywrócić zakupów — spróbuj ponownie' });
    } finally {
      setBusy(null);
    }
  };

  const openPortal = async () => {
    setBusy('portal');
    setMsg(null);
    try {
      const { url } = await subscriptionApi.portal();
      window.location.href = url;
    } catch (e: any) {
      setMsg({ ok: false, text: e.response?.data?.error?.message || 'Nie udało się otworzyć portalu płatności' });
      setBusy(null);
    }
  };

  const cancelSub = async () => {
    setBusy('cancel');
    setMsg(null);
    try {
      const r = await subscriptionApi.cancel();
      await refresh();
      setConfirmCancel(false);
      setMsg({
        ok: true,
        text: r.accessUntil
          ? `Subskrypcja anulowana — pełny dostęp zachowujesz do ${new Date(r.accessUntil).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })}.`
          : 'Subskrypcja anulowana — dostęp do końca opłaconego okresu.',
      });
    } catch (e: any) {
      setMsg({ ok: false, text: e.response?.data?.error?.message || 'Nie udało się anulować subskrypcji' });
    } finally {
      setBusy(null);
    }
  };

  const openHistory = async () => {
    setBusy('history');
    setMsg(null);
    try {
      const r = await subscriptionApi.history();
      setHistory(r.events);
    } catch {
      setMsg({ ok: false, text: 'Nie udało się pobrać historii subskrypcji' });
    } finally {
      setBusy(null);
    }
  };

  const resumeSub = async () => {
    setBusy('resume');
    setMsg(null);
    try {
      await subscriptionApi.resume();
      await refresh();
      setMsg({ ok: true, text: 'Subskrypcja wznowiona — odnowienia będą kontynuowane automatycznie.' });
    } catch (e: any) {
      setMsg({ ok: false, text: e.response?.data?.error?.message || 'Nie udało się wznowić subskrypcji' });
    } finally {
      setBusy(null);
    }
  };

  if (loading && !info) {
    return (
      <div className="py-28 flex justify-center">
        <span className="w-8 h-8 border-[3px] border-brand-light border-t-brand rounded-full animate-spin" />
      </div>
    );
  }
  if (!info) {
    return <p className="py-20 text-center text-gray-500">Nie udało się wczytać informacji o planie. Odśwież stronę.</p>;
  }

  const status = info.isAdmin
    ? 'Konto administratora — pełny dostęp bez limitów czasowych.'
    : info.isTrial && info.expiresAt
    ? `Okres próbny — zostało ${daysLeft(info.expiresAt)} dni (do ${fmtDate(info.expiresAt)}).`
    : info.source === 'grandfather' && info.expiresAt
    ? `Darmowy dostęp do ${fmtDate(info.expiresAt)} — dziękujemy, że jesteś z nami od początku.`
    : info.plan !== 'mini' && info.expiresAt
    ? `Aktywny do ${fmtDate(info.expiresAt)}.`
    : info.plan === 'mini'
    ? 'Plan bezpłatny — na start dla jednego pupila.'
    : 'Aktywny plan.';

  const plans = info.plans;
  const [mini, family, xl] = [plans.find((p) => p.id === 'mini')!, plans.find((p) => p.id === 'family')!, plans.find((p) => p.id === 'xl')!];

  const rows: { label: string; vals: (boolean | string)[] }[] = [
    { label: 'Zwierzęta', vals: [`${mini.maxPets}`, `${family.maxPets}`, 'Bez limitu'] },
    { label: 'Osoby do współdzielenia', vals: [`${mini.maxShares}`, `${family.maxShares}`, 'Bez limitu'] },
    { label: 'Pytania do AI dziennie', vals: [`${mini.aiPerDay}`, `${family.aiPerDay}`, `${xl.aiPerDay}`] },
    { label: 'Analiza badań krwi', vals: [false, true, true] },
    { label: 'Baza i plany BARF', vals: [false, true, true] },
    { label: 'Rozród i hodowla', vals: [false, true, true] },
    { label: 'PetvioBook, Messenger, grupy', vals: [true, true, true] },
    { label: 'Książeczka zdrowia, kalendarz, spacery', vals: [true, true, true] },
  ];

  return (
    <div className="space-y-6 pb-8">
      <PageHeader title="Subskrypcja" description="Twój plan, limity i dostępne opcje" icon={Crown} />

      {/* Aktualny plan */}
      <section className="pv-card p-5 sm:p-7 animate-slide-up">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <span className="w-12 h-12 rounded-2xl bg-brand-peach flex items-center justify-center">
              <Crown className="w-6 h-6 text-brand-dark" />
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand/70">Twój plan</p>
              <h2 className="font-serif text-2xl text-gray-900 leading-tight">{info.planName}</h2>
            </div>
          </div>
          {info.isTrial && (
            <span className="self-start px-3 py-1.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">Okres próbny</span>
          )}
          {info.source === 'grandfather' && (
            <span className="self-start px-3 py-1.5 rounded-full bg-brand-mint text-brand-dark text-xs font-bold">Darmowy rok</span>
          )}
        </div>
        <p className="text-sm text-gray-500 mb-5">{status}</p>
        {info.stripeManaged && (
          <div className="mb-5 space-y-3">
            {info.cancelAtPeriodEnd ? (
              <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4">
                <p className="text-sm text-amber-900 font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  Subskrypcja anulowana
                </p>
                <p className="text-xs text-amber-800 mt-1">
                  Pełny dostęp zachowujesz do {info.expiresAt
                    ? new Date(info.expiresAt).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })
                    : 'końca opłaconego okresu'}.
                  Po tej dacie plan wróci do Mini rodziny, a zwierzęta ponad limit zostaną zamrożone — wrócą, gdy wznówisz subskrypcję.
                </p>
                <button
                  onClick={resumeSub}
                  disabled={busy !== null}
                  className="mt-3 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-dark text-white text-sm font-semibold hover:bg-brand active:scale-[0.98] transition-all disabled:opacity-60"
                >
                  <RotateCcw className="w-4 h-4" />
                  {busy === 'resume' ? 'Wznawiam…' : 'Wznów subskrypcję'}
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                {!isNative && (
                  <button
                    onClick={openPortal}
                    disabled={busy !== null}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 active:scale-[0.98] transition-all disabled:opacity-60"
                  >
                    <ExternalLink className="w-4 h-4" />
                    {busy === 'portal' ? 'Otwieram…' : 'Karta i faktury'}
                  </button>
                )}
                <button
                  onClick={() => setConfirmCancel(true)}
                  disabled={busy !== null}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50 active:scale-[0.98] transition-all disabled:opacity-60"
                >
                  Anuluj subskrypcję
                </button>
              </div>
            )}
          </div>
        )}
        {info.appleManaged && (
          <div className="mb-5 rounded-2xl bg-brand-mint/50 border border-brand-light p-4">
            <p className="text-sm text-gray-700 font-semibold">Subskrypcja przez App Store</p>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              {info.cancelAtPeriodEnd && info.expiresAt
                ? `Odnowienie anulowane — pełny dostęp do ${fmtDate(info.expiresAt)}.`
                : 'Odnowienia i anulowanie zarządzasz w ustawieniach iPhone\u2019a:'}{' '}
              Ustawienia → Twoje imię → Subskrypcje → Petvio.
            </p>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-5">
          <button
            onClick={openHistory}
            disabled={busy !== null}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-brand transition-colors disabled:opacity-60"
          >
            <History className="w-3.5 h-3.5" />
            {busy === 'history' ? 'Ładuję…' : 'Historia subskrypcji'}
          </button>
          {isIOS && iapAvailable() && (
            <button
              onClick={restoreIAP}
              disabled={busy !== null}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-brand transition-colors disabled:opacity-60"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {busy === 'restore' ? 'Przywracam…' : 'Przywróć zakupy'}
            </button>
          )}
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <Meter icon={PawPrint} label="Zwierzęta" u={info.usage.pets} />
          <Meter icon={Users} label="Współdzielenie (osoby)" u={info.usage.shares} />
          <Meter icon={Sparkles} label="Pytania do AI dzisiaj" u={info.usage.ai} hint="Odnawia się codziennie o północy" />
        </div>
      </section>

      {msg && (
        <p className={`text-sm rounded-2xl p-4 ${msg.ok ? 'bg-brand-mint text-brand-dark' : 'bg-red-50 text-red-700'}`}>{msg.text}</p>
      )}

      {/* Przełącznik rozliczenia */}
      <div className="flex items-center justify-center">
        <div className="inline-flex p-1 rounded-full bg-white border border-gray-200 shadow-sm">
          {[
            { v: false, l: 'Miesięcznie' },
            { v: true, l: 'Rocznie' },
          ].map((o) => (
            <button
              key={o.l}
              onClick={() => setYearly(o.v)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                yearly === o.v ? 'bg-brand-dark text-white shadow' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {o.l}
              {o.v && <span className={`ml-1.5 text-[10px] font-bold ${yearly ? 'text-brand-peach' : 'text-brand'}`}>-{savePct(family)}%</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Karty planów */}
      <div className="grid lg:grid-cols-3 gap-4">
        {plans.map((p) => {
          const current = info.plan === p.id;
          const featured = p.id === 'family';
          const paid = p.id !== 'mini';
          const price = yearly ? Math.round(p.priceYearly / 12) : p.priceMonthly;
          // iOS: gdy mamy ofertę z App Store, pokazujemy jej cenę (jedyna gwarancja zgodności z ASC)
          const iapPkg = isIOS && paid ? packageFor(p.id, yearly) : undefined;
          const canTrial = paid && info.trialAvailable;
          return (
            <div
              key={p.id}
              className={`relative rounded-[28px] p-6 flex flex-col animate-slide-up ${
                featured
                  ? 'bg-brand-dark text-white shadow-2xl lg:-translate-y-2'
                  : 'bg-white border border-gray-100 shadow-sm'
              } ${current ? 'ring-2 ring-brand' : ''}`}
            >
              {featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-brand-peach text-brand-dark text-[10px] font-bold uppercase tracking-[0.14em] whitespace-nowrap">
                  Najpopularniejszy
                </span>
              )}
              <p className={`text-[11px] font-bold uppercase tracking-[0.14em] ${featured ? 'text-brand-peach' : 'text-brand/70'}`}>
                {p.name}
              </p>
              <p className={`text-sm mt-1 mb-5 ${featured ? 'text-white/70' : 'text-gray-400'}`}>{p.tagline}</p>

              <p className="mb-1">
                <span className="font-serif text-4xl">
                  {iapPkg ? iapPkg.product.priceString : paid ? formatPln(price) : '0 zł'}
                </span>
                <span className={`text-sm ${featured ? 'text-white/60' : 'text-gray-400'}`}> {iapPkg ? (yearly ? '/ rok' : '/ mies.') : '/ mies.'}</span>
              </p>
              <p className={`text-xs mb-5 h-4 ${featured ? 'text-white/60' : 'text-gray-400'}`}>
                {paid && yearly ? `${iapPkg ? iapPkg.product.priceString : formatPln(p.priceYearly)} rozliczane rocznie` : paid ? 'rozliczane co miesiąc' : 'bez karty, bez terminu'}
              </p>

              <ul className="space-y-2.5 mb-6 flex-1">
                {planBullets(p).map((b) => (
                  <li key={b} className="flex items-start gap-2.5 text-sm">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${featured ? 'bg-white/15' : 'bg-brand-mint'}`}>
                      <Check className={`w-3 h-3 ${featured ? 'text-white' : 'text-brand-dark'}`} />
                    </span>
                    <span className={featured ? 'text-white/90' : 'text-gray-600'}>{b}</span>
                  </li>
                ))}
                {!paid && (
                  <li className="flex items-start gap-2.5 text-sm text-gray-400">
                    <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Lock className="w-3 h-3 text-gray-400" />
                    </span>
                    Analiza krwi, BARF i rozród — premium
                  </li>
                )}
              </ul>

              {current ? (
                <button disabled className={`w-full py-3.5 rounded-2xl text-sm font-bold ${featured ? 'bg-white/15 text-white' : 'bg-gray-100 text-gray-400'}`}>
                  Twój obecny plan
                </button>
              ) : canTrial ? (
                <button
                  onClick={() => startTrial(p.id as 'family' | 'xl')}
                  disabled={busy !== null}
                  className={`w-full py-3.5 rounded-2xl text-sm font-bold active:scale-[0.98] transition-all disabled:opacity-60 ${
                    featured ? 'bg-white text-brand-dark hover:bg-brand-mint' : 'bg-brand-dark text-white hover:bg-brand'
                  }`}
                >
                  {busy === p.id ? 'Uruchamiam…' : `Wypróbuj ${info.trialDays} dni za darmo`}
                </button>
              ) : isIOS && iapAvailable() ? (
                iapPackages === null ? (
                  <p className={`w-full py-3.5 rounded-2xl text-center text-xs font-semibold ${
                    featured ? 'bg-white/10 text-white/70' : 'bg-gray-50 text-gray-400'
                  }`}>
                    Ładuję oferty z App Store…
                  </p>
                ) : packageFor(p.id, yearly) ? (
                  <button
                    onClick={() => buyIAP(p.id as 'family' | 'xl')}
                    disabled={busy !== null}
                    className={`w-full py-3.5 rounded-2xl text-sm font-bold active:scale-[0.98] transition-all disabled:opacity-60 ${
                      featured ? 'bg-white text-brand-dark hover:bg-brand-mint' : 'bg-brand-dark text-white hover:bg-brand'
                    }`}
                  >
                    {busy === p.id ? 'Przetwarzam…' : `Wykup — ${packageFor(p.id, yearly)!.product.priceString}`}
                  </button>
                ) : (
                  <p className={`w-full py-3.5 rounded-2xl text-center text-xs font-semibold ${
                    featured ? 'bg-white/10 text-white/70' : 'bg-gray-50 text-gray-400'
                  }`}>
                    Subskrypcja dostępna wkrótce w aplikacji
                  </p>
                )
              ) : paid && info.paymentsAvailable ? (
                isIOS ? (
                  <p className={`w-full py-3.5 rounded-2xl text-center text-xs font-semibold ${
                    featured ? 'bg-white/10 text-white/70' : 'bg-gray-50 text-gray-400'
                  }`}>
                    Subskrypcja dostępna wkrótce w aplikacji
                  </p>
                ) : (
                  <button
                    onClick={() => buy(p.id as 'family' | 'xl')}
                    disabled={busy !== null}
                    className={`w-full py-3.5 rounded-2xl text-sm font-bold active:scale-[0.98] transition-all disabled:opacity-60 ${
                      featured ? 'bg-white text-brand-dark hover:bg-brand-mint' : 'bg-brand-dark text-white hover:bg-brand'
                    }`}
                  >
                    {busy === p.id ? 'Przygotowuję…' : info.trialUsed ? 'Wykup plan' : `Wykup — ${info.trialDays} dni za darmo`}
                  </button>
                )
              ) : (
                <button disabled className={`w-full py-3.5 rounded-2xl text-sm font-bold ${featured ? 'bg-white/15 text-white/70' : 'bg-gray-100 text-gray-400'}`}>
                  {paid ? 'Płatności już wkrótce' : 'Plan bezpłatny'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Informacje wymagane przez App Store (3.1.2) — tylko na iOS */}
      {isIOS && iapAvailable() && (
        <div className="rounded-2xl bg-white border border-gray-100 p-5 space-y-2 text-center">
          <p className="text-xs text-gray-500 leading-relaxed">
            Płatność zostanie pobrana z konta Apple przy potwierdzeniu zakupu. Subskrypcja odnawia się
            automatycznie, dopóki nie zostanie anulowana co najmniej 24 godziny przed końcem bieżącego
            okresu. Zarządzanie i anulowanie: Ustawienia iPhone&#8217;a → Twoje imię → Subskrypcje.
          </p>
          <p className="text-xs text-gray-400">
            <a href="/polityka-prywatnosci" className="underline hover:text-brand">Polityka prywatności</a>
            {' · '}
            <a
              href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/"
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-brand"
            >
              Warunki korzystania (EULA)
            </a>
          </p>
        </div>
      )}

      {/* Porównanie */}
      <section className="pv-card overflow-hidden animate-slide-up">
        <div className="p-5 sm:p-6 border-b border-gray-100">
          <h3 className="font-serif text-xl text-gray-900">Porównanie planów</h3>
          <p className="text-sm text-gray-400 mt-0.5">Wszystkie plany mają dostęp do podstawowych funkcji Petvio.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px]">
            <thead>
              <tr className="bg-gray-50/70">
                <th className="px-5 sm:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide"> </th>
                {plans.map((p) => (
                  <th key={p.id} className={`px-3 py-3 text-center text-xs font-bold uppercase tracking-wide ${info.plan === p.id ? 'text-brand' : 'text-gray-500'}`}>
                    {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r) => (
                <tr key={r.label}>
                  <td className="px-5 sm:px-6 py-3.5 text-sm text-gray-600">{r.label}</td>
                  {r.vals.map((v, i) => (
                    <td key={i} className="px-3 py-3.5 text-center">
                      <Cell v={v} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ */}
      <section className="grid sm:grid-cols-2 gap-4">
        {[
          {
            q: 'Jak działa okres próbny?',
            a: 'Przy pierwszym wykupie masz 7 dni za darmo — karta jest potrzebna od razu, ale płatność pobieramy dopiero po zakończeniu próby. Anulujesz w każdej chwili w portalu płatności.',
          },
          {
            q: 'Jak anulować subskrypcję?',
            a: 'Kliknij „Zarządzaj subskrypcją i płatnościami" przy swoim planie — otworzy się portal płatności, w którym anulujesz jednym przyciskiem. Plan działa do końca opłaconego okresu.',
          },
          {
            q: 'Czy stracę dane po zmianie planu?',
            a: 'Nie. Wszystkie Twoje zwierzęta, wpisy i zdjęcia zostają. Po przejściu na niższy plan nie dodasz tylko nowych elementów ponad limit.',
          },
          {
            q: 'Jak działają limity AI?',
            a: 'Asystent AI i Doradca ziołowy korzystają ze wspólnej dziennej puli pytań. Pula odnawia się codziennie o północy.',
          },
          {
            q: 'Dlaczego niektóre funkcje są premium?',
            a: 'Analiza krwi, BARF i rozród wymagają dodatkowych zasobów i rozwoju. Opłaty pozwalają nam utrzymać i rozwijać Petvio.',
          },
        ].map((f) => (
          <div key={f.q} className="rounded-2xl bg-white border border-gray-100 p-5">
            <p className="font-semibold text-gray-900 text-sm mb-1.5">{f.q}</p>
            <p className="text-sm text-gray-500 leading-relaxed">{f.a}</p>
          </div>
        ))}
      </section>

      {/* Modal płatności — własny formularz Petvio, pola karty napędzane przez Stripe */}
      {paySession && stripePromise && (
        <div
          className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6"
          onClick={() => setPaySession(null)}
        >
          <div
            className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] overflow-y-auto animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white/95 backdrop-blur flex items-center justify-between px-5 py-4 border-b border-gray-100 z-10">
              <div>
                <p className="font-serif text-lg text-gray-900 leading-tight">
                  {plans.find((p) => p.id === paySession.plan)?.name}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {yearly
                    ? `${formatPln(plans.find((p) => p.id === paySession.plan)?.priceYearly || 0)} / rok`
                    : `${formatPln(plans.find((p) => p.id === paySession.plan)?.priceMonthly || 0)} / mies.`}
                  {paySession.trial ? ` — pierwsze ${info.trialDays} dni za darmo` : ''}
                </p>
              </div>
              <button
                onClick={() => setPaySession(null)}
                className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                aria-label="Zamknij"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>
            <Elements
              stripe={stripePromise}
              options={
                {
                  clientSecret: paySession.clientSecret,
                  appearance: stripeAppearance,
                  locale: 'pl',
                  paymentMethodCreation: 'manual',
                } as Parameters<typeof Elements>[0]['options']
              }
            >
              <PayForm
                session={paySession}
                priceText={
                  yearly
                    ? formatPln(plans.find((p) => p.id === paySession.plan)?.priceYearly || 0)
                    : formatPln(plans.find((p) => p.id === paySession.plan)?.priceMonthly || 0)
                }
                onDone={() => {
                  setPaySession(null);
                  setMsg({ ok: true, text: 'Dziękujemy! Subskrypcja aktywuje się w ciągu kilku sekund.' });
                  setTimeout(() => refresh(), 3000);
                }}
                onFallback={async () => {
                  try {
                    const { url } = await subscriptionApi.checkout(
                      `${paySession.plan}_${yearly ? 'yearly' : 'monthly'}` as any
                    );
                    window.location.href = url;
                  } catch {
                    setMsg({ ok: false, text: 'Nie udało się otworzyć strony płatności' });
                    setPaySession(null);
                  }
                }}
              />
            </Elements>
          </div>
        </div>
      )}

      {/* Popup historii subskrypcji */}
      {history !== null && (
        <div
          className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6"
          onClick={() => setHistory(null)}
        >
          <div
            className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[85vh] flex flex-col animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-brand-mint flex items-center justify-center">
                  <History className="w-4.5 h-4.5 text-brand-dark" />
                </span>
                <h3 className="font-serif text-lg text-gray-900">Historia subskrypcji</h3>
              </div>
              <button
                onClick={() => setHistory(null)}
                className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                aria-label="Zamknij"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>
            <div className="overflow-y-auto p-5">
              {history.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">Brak zdarzeń — tu pojawią się zakupy, odnowienia i zmiany planu.</p>
              ) : (
                <ul className="space-y-3">
                  {history.map((ev, i) => {
                    const meta = EVENT_META[ev.event_type] || { label: ev.event_type, icon: Clock, cls: 'bg-gray-100 text-gray-500' };
                    const Icon = meta.icon;
                    const planName = ev.plan ? plans.find((p) => p.id === ev.plan)?.name || ev.plan : null;
                    return (
                      <li key={i} className="flex gap-3">
                        <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${meta.cls}`}>
                          <Icon className="w-4 h-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-gray-900 leading-tight">
                            {meta.label}
                            {ev.amount_grosz ? (
                              <span className="text-brand-dark"> — {formatPln(ev.amount_grosz)}</span>
                            ) : null}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {new Date(ev.created_at).toLocaleString('pl-PL', {
                              day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
                            })}
                            {planName ? ` · ${planName}` : ''}
                            {ev.billing ? ` (${ev.billing === 'yearly' ? 'roczny' : 'miesięczny'})` : ''}
                          </p>
                          {ev.note && SHOW_NOTE.has(ev.event_type) && (
                            <p className="text-xs text-gray-500 mt-1 leading-relaxed">{ev.note}</p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal potwierdzenia anulowania subskrypcji */}
      {confirmCancel && (
        <div
          className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6"
          onClick={() => setConfirmCancel(false)}
        >
          <div
            className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="font-serif text-xl text-gray-900 mb-2">Anulować subskrypcję?</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Pełny dostęp zachowasz <strong>do końca opłaconego okresu</strong>
                {info.expiresAt
                  ? ` — do ${new Date(info.expiresAt).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })}`
                  : ''}.
                Potem plan wróci do Mini rodziny.
              </p>
              <p className="text-sm text-gray-600 leading-relaxed mt-2">
                Żadne dane nie znikną — zwierzęta ponad limit zostaną <strong>zamrożone</strong> i odblokują się
                automatycznie, gdy wznówisz subskrypcję.
              </p>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setConfirmCancel(false)}
                  disabled={busy !== null}
                  className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 active:scale-[0.98] transition-all disabled:opacity-60"
                >
                  Zostań przy planie
                </button>
                <button
                  onClick={cancelSub}
                  disabled={busy !== null}
                  className="flex-1 py-3 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 active:scale-[0.98] transition-all disabled:opacity-60"
                >
                  {busy === 'cancel' ? 'Anuluję…' : 'Tak, anuluj'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
