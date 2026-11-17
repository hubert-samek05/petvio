'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle, CreditCard, Crown, Gift, Receipt, Search, Sparkles, TrendingUp, Users, X, Timer, BadgePercent,
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { adminSubscriptionsApi } from '@/lib/api';
import { formatPln } from '@/lib/plan';

const PLAN_NAME: Record<string, string> = { mini: 'Mini rodzina', family: 'Duża rodzina', xl: 'Bardzo duża rodzina' };
const PLAN_COLOR: Record<string, string> = {
  mini: 'bg-gray-100 text-gray-600',
  family: 'bg-brand-mint text-brand-dark',
  xl: 'bg-brand-peach text-brand-dark',
};
const SOURCE_NAME: Record<string, string> = {
  free: 'Bezpłatny', trial: 'Okres próbny', grandfather: 'Darmowy rok', admin: 'Nadany ręcznie',
  apple: 'App Store', google: 'Google Play', stripe: 'Strona www',
};
const EVENT_NAME: Record<string, string> = {
  trial_started: 'Start okresu próbnego', purchase: 'Zakup', renewal: 'Odnowienie', refund: 'Zwrot',
  cancel: 'Anulowanie', expired: 'Wygaśnięcie planu', admin_grant: 'Nadany przez admina',
  admin_revoke: 'Odebrany przez admina', grandfather: 'Darmowy rok',
};
const EVENT_COLOR: Record<string, string> = {
  trial_started: 'bg-amber-100 text-amber-800', purchase: 'bg-green-100 text-green-800',
  renewal: 'bg-green-100 text-green-800', refund: 'bg-red-100 text-red-700', cancel: 'bg-red-100 text-red-700',
  expired: 'bg-gray-100 text-gray-600', admin_grant: 'bg-brand-mint text-brand-dark', admin_revoke: 'bg-gray-100 text-gray-600',
};

const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—');
const fmtDateTime = (d: string) =>
  new Date(d).toLocaleString('pl-PL', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
const uname = (u: any) => `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email;

function Kpi({ icon: Icon, label, value, sub, tone = 'mint' }: { icon: any; label: string; value: string; sub?: string; tone?: 'mint' | 'peach' | 'amber' }) {
  const tones = { mint: 'bg-brand-mint text-brand-dark', peach: 'bg-brand-peach text-brand-dark', amber: 'bg-amber-100 text-amber-700' };
  return (
    <div className="pv-card p-5">
      <div className="flex items-center gap-3 mb-3">
        <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${tones[tone]}`}>
          <Icon className="w-5 h-5" />
        </span>
        <p className="text-xs font-semibold text-gray-500 leading-tight">{label}</p>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function AdminSubscriptionsPage() {
  const [stats, setStats] = useState<any>(null);
  const [statsError, setStatsError] = useState('');
  const [tab, setTab] = useState<'users' | 'events'>('users');

  const [users, setUsers] = useState<any[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersPage, setUsersPage] = useState(1);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [usersLoading, setUsersLoading] = useState(true);

  const [events, setEvents] = useState<any[]>([]);
  const [eventsTotal, setEventsTotal] = useState(0);
  const [eventsPage, setEventsPage] = useState(1);
  const [eventType, setEventType] = useState('');

  const [manage, setManage] = useState<any>(null);
  const LIMIT = 20;

  const loadStats = useCallback(async () => {
    try {
      setStats(await adminSubscriptionsApi.stats());
      setStatsError('');
    } catch (e: any) {
      setStatsError(e.response?.data?.error?.message || 'Nie udało się pobrać statystyk');
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const d = await adminSubscriptionsApi.list({
        search: search || undefined, plan: planFilter || undefined, source: sourceFilter || undefined, page: usersPage, limit: LIMIT,
      });
      setUsers(d.users || []);
      setUsersTotal(d.total || 0);
    } catch {
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  }, [search, planFilter, sourceFilter, usersPage]);

  const loadEvents = useCallback(async () => {
    try {
      const d = await adminSubscriptionsApi.events({ type: eventType || undefined, page: eventsPage, limit: LIMIT });
      setEvents(d.events || []);
      setEventsTotal(d.total || 0);
    } catch {
      setEvents([]);
    }
  }, [eventType, eventsPage]);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => {
    const t = setTimeout(loadUsers, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [loadUsers, search]);
  useEffect(() => { if (tab === 'events') loadEvents(); }, [tab, loadEvents]);

  const refreshAll = () => { loadStats(); loadUsers(); if (tab === 'events') loadEvents(); };

  const planTotal = stats ? Math.max(1, stats.byPlan.mini + stats.byPlan.family + stats.byPlan.xl) : 1;
  const maxWeek = stats ? Math.max(1, ...stats.weekly.map((w: any) => Math.max(w.trials, w.purchases))) : 1;

  const Pager = ({ page, total, onPage }: { page: number; total: number; onPage: (p: number) => void }) => {
    const pages = Math.max(1, Math.ceil(total / LIMIT));
    return (
      <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 text-xs text-gray-500">
        <span>{total} wyników</span>
        <div className="flex items-center gap-2">
          <button disabled={page <= 1} onClick={() => onPage(page - 1)} className="px-3 py-1.5 rounded-lg bg-gray-100 disabled:opacity-40">Wstecz</button>
          <span>{page} / {pages}</span>
          <button disabled={page >= pages} onClick={() => onPage(page + 1)} className="px-3 py-1.5 rounded-lg bg-gray-100 disabled:opacity-40">Dalej</button>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <PageHeader title="Subskrypcje i płatności" description="Subskrybenci, przychody, okresy próbne i zarządzanie planami" icon={Crown} />

      {statsError && <p className="rounded-2xl bg-red-50 text-red-700 text-sm p-4">{statsError}</p>}

      {stats && !stats.paymentsConfigured && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800 leading-relaxed">
            <strong>Płatności nie są jeszcze podłączone</strong> (App Store, Google Play, strona www). Przychody i MRR
            zaczną się wypełniać automatycznie po uruchomieniu płatności — każdy zakup, odnowienie i zwrot trafi tu jako zdarzenie.
          </p>
        </div>
      )}

      {stats && (
        <>
          {/* KPI */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Kpi icon={Users} label="Wszyscy użytkownicy" value={String(stats.totalUsers)} sub={`${stats.byPlan.mini} na planie Mini`} />
            <Kpi icon={CreditCard} label="Płacący subskrybenci" value={String(stats.paid.count)} sub="App Store / Google Play / www" tone="peach" />
            <Kpi icon={TrendingUp} label="MRR (brutto)" value={formatPln(stats.paid.mrrGrosz)} sub={`ARR ${formatPln(stats.paid.arrGrosz)}`} tone="peach" />
            <Kpi icon={Receipt} label="Przychód — 30 dni" value={formatPln(stats.revenue.last30Grosz)} sub={`łącznie ${formatPln(stats.revenue.totalGrosz)} · ten miesiąc ${formatPln(stats.revenue.thisMonthGrosz)}`} />
            <Kpi icon={Timer} label="Aktywne okresy próbne" value={String(stats.trials.active)} sub={`${stats.trials.endingIn3Days} kończy się w 3 dni`} tone="amber" />
            <Kpi icon={BadgePercent} label="Konwersja trial → płatny" value={`${stats.trials.conversionPct}%`} sub={`${stats.trials.converted} z ${stats.trials.usedTotal} okresów próbnych`} tone="amber" />
            <Kpi
              icon={Gift}
              label="Darmowy rok (stare konta)"
              value={String(stats.grandfather.count)}
              sub={stats.grandfather.firstExpiry ? `najbliższe wygaśnięcie ${fmtDate(stats.grandfather.firstExpiry)}` : '—'}
            />
            <Kpi
              icon={Sparkles}
              label="Potencjał po darmowym roku"
              value={`${formatPln(stats.grandfather.potentialMrrGrosz)}/mies.`}
              sub="gdyby wszyscy wykupili Dużą rodzinę"
              tone="peach"
            />
          </div>

          {/* Podział planów + wykres */}
          <div className="grid lg:grid-cols-2 gap-4">
            <div className="pv-card p-5 sm:p-6">
              <h3 className="font-serif text-lg text-gray-900 mb-4">Podział na plany</h3>
              <div className="flex h-3 rounded-full overflow-hidden bg-gray-100 mb-4">
                <div className="bg-gray-300" style={{ width: `${(stats.byPlan.mini / planTotal) * 100}%` }} />
                <div className="bg-brand" style={{ width: `${(stats.byPlan.family / planTotal) * 100}%` }} />
                <div className="bg-brand-dark" style={{ width: `${(stats.byPlan.xl / planTotal) * 100}%` }} />
              </div>
              <div className="space-y-2.5">
                {(['mini', 'family', 'xl'] as const).map((p) => (
                  <div key={p} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${p === 'mini' ? 'bg-gray-300' : p === 'family' ? 'bg-brand' : 'bg-brand-dark'}`} />
                      {PLAN_NAME[p]}
                    </span>
                    <span className="font-semibold text-gray-900">
                      {stats.byPlan[p]} <span className="text-gray-400 font-normal">({Math.round((stats.byPlan[p] / planTotal) * 100)}%)</span>
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-gray-100">
                {Object.entries(stats.bySource).map(([k, v]) => (
                  <span key={k} className="px-2.5 py-1 rounded-full bg-gray-50 border border-gray-100 text-xs text-gray-600">
                    {SOURCE_NAME[k] || k}: <strong>{v as number}</strong>
                  </span>
                ))}
              </div>
            </div>

            <div className="pv-card p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif text-lg text-gray-900">Ostatnie 12 tygodni</h3>
                <div className="flex items-center gap-3 text-[11px] text-gray-500">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-amber-400" />Okresy próbne</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-brand" />Zakupy</span>
                </div>
              </div>
              <div className="flex items-end gap-1.5 h-36">
                {stats.weekly.map((w: any) => (
                  <div key={w.week} className="flex-1 flex flex-col items-center justify-end gap-1 h-full" title={`${w.week}: próby ${w.trials}, zakupy ${w.purchases}, przychód ${formatPln(w.revenue)}`}>
                    <div className="w-full flex items-end gap-0.5 h-full">
                      <div className="flex-1 rounded-t bg-amber-400" style={{ height: `${(w.trials / maxWeek) * 100}%`, minHeight: w.trials ? 3 : 0 }} />
                      <div className="flex-1 rounded-t bg-brand" style={{ height: `${(w.purchases / maxWeek) * 100}%`, minHeight: w.purchases ? 3 : 0 }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-gray-400 mt-2">
                <span>{fmtDate(stats.weekly[0]?.week)}</span>
                <span>{fmtDate(stats.weekly[stats.weekly.length - 1]?.week)}</span>
              </div>
              <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-gray-100 text-center">
                {[
                  ['Zakupy', stats.revenue.purchases], ['Odnowienia', stats.revenue.renewals],
                  ['Zwroty', stats.revenue.refunds], ['Anulowania', stats.revenue.cancels],
                ].map(([l, v]) => (
                  <div key={l as string}>
                    <p className="text-lg font-bold text-gray-900">{v as number}</p>
                    <p className="text-[11px] text-gray-400">{l}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Zakładki */}
      <div className="pv-card overflow-hidden">
        <div className="flex border-b border-gray-100">
          {[
            { id: 'users', label: 'Użytkownicy i plany' },
            { id: 'events', label: 'Płatności i zdarzenia' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as 'users' | 'events')}
              className={`px-5 py-4 text-sm font-semibold transition-colors ${tab === t.id ? 'text-brand-dark border-b-2 border-brand' : 'text-gray-400 hover:text-gray-700'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'users' ? (
          <>
            <div className="p-4 flex flex-col sm:flex-row gap-3 border-b border-gray-100">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setUsersPage(1); }}
                  placeholder="Szukaj po imieniu, nazwisku lub emailu…"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand"
                />
              </div>
              <select value={planFilter} onChange={(e) => { setPlanFilter(e.target.value); setUsersPage(1); }} className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white">
                <option value="">Wszystkie plany</option>
                {Object.entries(PLAN_NAME).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <select value={sourceFilter} onChange={(e) => { setSourceFilter(e.target.value); setUsersPage(1); }} className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white">
                <option value="">Wszystkie źródła</option>
                {Object.entries(SOURCE_NAME).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px]">
                <thead className="bg-gray-50">
                  <tr>
                    {['Użytkownik', 'Plan', 'Źródło', 'Ważny do', 'Zwierzęta', 'Konto od', ''].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {usersLoading ? (
                    <tr><td colSpan={7} className="px-5 py-10 text-center text-sm text-gray-400">Ładowanie…</td></tr>
                  ) : users.length === 0 ? (
                    <tr><td colSpan={7} className="px-5 py-10 text-center text-sm text-gray-400">Brak wyników</td></tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50/60">
                        <td className="px-5 py-3.5">
                          <p className="text-sm font-semibold text-gray-900">{uname(u)}</p>
                          <p className="text-xs text-gray-400">{u.email}</p>
                        </td>
                        <td className="px-5 py-3.5"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${PLAN_COLOR[u.plan]}`}>{PLAN_NAME[u.plan]}</span></td>
                        <td className="px-5 py-3.5 text-sm text-gray-600">{SOURCE_NAME[u.source] || u.source}{u.billing ? ` · ${u.billing === 'yearly' ? 'rocznie' : 'miesięcznie'}` : ''}</td>
                        <td className="px-5 py-3.5 text-sm text-gray-600">{fmtDate(u.expires_at)}</td>
                        <td className="px-5 py-3.5 text-sm text-gray-600">{u.pets}</td>
                        <td className="px-5 py-3.5 text-sm text-gray-400">{fmtDate(u.created_at)}</td>
                        <td className="px-5 py-3.5 text-right">
                          <button onClick={() => setManage(u)} className="px-3.5 py-1.5 rounded-lg bg-brand-mint text-brand-dark text-xs font-bold hover:bg-brand-light transition-colors">Zarządzaj</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <Pager page={usersPage} total={usersTotal} onPage={setUsersPage} />
          </>
        ) : (
          <>
            <div className="p-4 border-b border-gray-100">
              <select value={eventType} onChange={(e) => { setEventType(e.target.value); setEventsPage(1); }} className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white">
                <option value="">Wszystkie zdarzenia</option>
                {Object.entries(EVENT_NAME).filter(([k]) => k !== 'grandfather').map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px]">
                <thead className="bg-gray-50">
                  <tr>
                    {['Data', 'Użytkownik', 'Zdarzenie', 'Plan', 'Źródło', 'Kwota', 'Notatka'].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {events.length === 0 ? (
                    <tr><td colSpan={7} className="px-5 py-10 text-center text-sm text-gray-400">Brak zdarzeń</td></tr>
                  ) : (
                    events.map((e) => (
                      <tr key={e.id} className="hover:bg-gray-50/60">
                        <td className="px-5 py-3.5 text-xs text-gray-500 whitespace-nowrap">{fmtDateTime(e.created_at)}</td>
                        <td className="px-5 py-3.5"><p className="text-sm font-medium text-gray-900">{uname(e)}</p><p className="text-xs text-gray-400">{e.email}</p></td>
                        <td className="px-5 py-3.5"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${EVENT_COLOR[e.event_type] || 'bg-gray-100 text-gray-600'}`}>{EVENT_NAME[e.event_type] || e.event_type}</span></td>
                        <td className="px-5 py-3.5 text-sm text-gray-600">{e.plan ? PLAN_NAME[e.plan] : '—'}</td>
                        <td className="px-5 py-3.5 text-sm text-gray-600">{SOURCE_NAME[e.source] || e.source || '—'}</td>
                        <td className="px-5 py-3.5 text-sm font-semibold text-gray-900">{e.amount_grosz ? formatPln(e.amount_grosz) : '—'}</td>
                        <td className="px-5 py-3.5 text-xs text-gray-500 max-w-[260px] truncate" title={e.note || ''}>{e.note || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <Pager page={eventsPage} total={eventsTotal} onPage={setEventsPage} />
          </>
        )}
      </div>

      {manage && <ManageModal user={manage} onClose={() => setManage(null)} onDone={() => { setManage(null); refreshAll(); }} />}
    </div>
  );
}

function ManageModal({ user, onClose, onDone }: { user: any; onClose: () => void; onDone: () => void }) {
  const [plan, setPlan] = useState<'family' | 'xl'>('family');
  const [days, setDays] = useState(30);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmRevoke, setConfirmRevoke] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const run = async (fn: () => Promise<any>) => {
    setBusy(true);
    setError('');
    try {
      await fn();
      onDone();
    } catch (e: any) {
      setError(e.response?.data?.error?.message || 'Operacja nie powiodła się');
      setBusy(false);
    }
  };

  const isAdminUser = user.role === 'admin';

  return (
    <div className="fixed inset-0 z-[140] bg-gray-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white rounded-t-[28px] sm:rounded-[28px] w-full sm:max-w-md max-h-[92vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between p-5 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-900">{uname(user)}</h3>
            <p className="text-xs text-gray-400">{user.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${PLAN_COLOR[user.plan]}`}>{PLAN_NAME[user.plan]}</span>
              <span className="text-xs text-gray-400">{SOURCE_NAME[user.source] || user.source}{user.expires_at ? ` · do ${fmtDate(user.expires_at)}` : ''}</span>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center" aria-label="Zamknij"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 space-y-5">
          {isAdminUser ? (
            <p className="text-sm text-gray-500 bg-gray-50 rounded-2xl p-4">To konto administratora — ma pełny dostęp bez ograniczeń, nie wymaga planu.</p>
          ) : (
            <>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">Nadaj plan</p>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {(['family', 'xl'] as const).map((p) => (
                    <button key={p} onClick={() => setPlan(p)} className={`py-3 rounded-xl text-sm font-semibold border-2 transition-all ${plan === p ? 'border-brand bg-brand-mint text-brand-dark' : 'border-gray-100 text-gray-500'}`}>
                      {PLAN_NAME[p]}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 mb-3">
                  {[7, 30, 90, 365].map((d) => (
                    <button key={d} onClick={() => setDays(d)} className={`flex-1 py-2 rounded-lg text-xs font-bold ${days === d ? 'bg-brand-dark text-white' : 'bg-gray-100 text-gray-600'}`}>
                      {d === 365 ? '1 rok' : `${d} dni`}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <input type="number" min={1} max={3650} value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-24 px-3 py-2 rounded-lg border border-gray-200 text-sm" />
                  <span className="text-sm text-gray-500">dni</span>
                </div>
                <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="Notatka (np. powód, współpraca)…" className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand" />
                <button
                  disabled={busy || !Number.isInteger(days) || days < 1}
                  onClick={() => run(() => adminSubscriptionsApi.grant(user.id, { plan, days, note }))}
                  className="pv-btn-primary w-full py-3 mt-3 disabled:opacity-50"
                >
                  {busy ? 'Zapisuję…' : `Nadaj ${PLAN_NAME[plan]} na ${days} dni`}
                </button>
              </div>

              {user.plan !== 'mini' && (
                <div className="pt-4 border-t border-gray-100">
                  {confirmRevoke ? (
                    <div className="rounded-2xl bg-red-50 p-4 space-y-3">
                      <p className="text-sm text-red-700">Użytkownik wróci do planu Mini rodzina. Dane zostają, ale nie doda nowych elementów ponad limit.</p>
                      <div className="flex gap-2">
                        <button disabled={busy} onClick={() => run(() => adminSubscriptionsApi.revoke(user.id, note))} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold disabled:opacity-50">Tak, odbierz plan</button>
                        <button onClick={() => setConfirmRevoke(false)} className="flex-1 py-2.5 rounded-xl bg-white text-gray-600 text-sm font-bold">Anuluj</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmRevoke(true)} className="w-full py-2.5 rounded-xl text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 transition-colors">
                      Odbierz plan (powrót do Mini)
                    </button>
                  )}
                </div>
              )}
            </>
          )}
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl p-3">{error}</p>}
        </div>
      </div>
    </div>
  );
}
