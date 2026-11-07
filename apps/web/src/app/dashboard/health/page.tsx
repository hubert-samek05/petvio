'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Heart, Stethoscope, ArrowRight,
  CalendarClock, AlertTriangle, ShieldCheck,
  Syringe, Shield, Pill, History, Plus,
} from 'lucide-react';
import { petApi, healthRecordApi } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import { ListRowSkeleton } from '@/components/ui/Skeleton';
import { speciesInfo } from '@/components/PetForm';
import { daysUntilDate, isDateOverdue, isDateUpcoming } from '@/lib/dates';

const CATEGORIES = [
  { key: 'vaccination', href: 'vaccinations', title: 'Szczepienia', icon: Syringe, color: '#1B6B4A' },
  { key: 'deworming', href: 'prevention', title: 'Profilaktyka', icon: Shield, color: '#3D9A6A' },
  { key: 'medication', href: 'medications', title: 'Leki', icon: Pill, color: '#2A8A5C' },
  { key: 'visit', href: 'visits', title: 'Wizyty', icon: Stethoscope, color: '#0F3D2E' },
];

const catOf = (key: string) => CATEGORIES.find((c) => c.key === key) || CATEGORIES[3];

const daysUntil = (d: string) => daysUntilDate(d);

const shortDate = (d: string) =>
  d ? new Date(d).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' }) : '';

const fullDate = (d: string) =>
  d ? new Date(d).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' }) : '';

const daysLabel = (d: string) => {
  const n = daysUntil(d);
  if (n < 0) return n === -1 ? 'Zaległe od wczoraj' : `Zaległe ${-n} dni`;
  if (n === 0) return 'Dziś!';
  if (n === 1) return 'Jutro';
  return `Za ${n} dni`;
};

type PetHealth = { upcoming: number; overdue: number; next: any | null; total: number };

/** Mały pierścień statusu zdrowia — wizualnie spójny z PetProgressRing */
function HealthRing({ overdue, upcoming }: { overdue: number; upcoming: number }) {
  const color = overdue > 0 ? '#DC2626' : upcoming > 0 ? '#C07A2B' : '#1B6B4A';
  const percent = overdue > 0 ? 30 : upcoming > 0 ? 65 : 100;
  const size = 48;
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (percent / 100) * c;
  const Icon = overdue > 0 ? AlertTriangle : upcoming > 0 ? CalendarClock : ShieldCheck;
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EEF2EF" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(0.22,1,0.36,1)' }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center" style={{ color }}>
        <Icon className="w-4 h-4" />
      </span>
    </div>
  );
}

/** Mini awatar pupila — zdjęcie lub emoji gatunku */
function PetAvatar({ pet, size = 56 }: { pet: any; size?: number }) {
  return (
    <div
      className="rounded-2xl bg-gradient-to-br from-brand to-brand-dark flex items-center justify-center flex-shrink-0 shadow-md overflow-hidden"
      style={{ width: size, height: size, fontSize: size * 0.45 }}
    >
      {pet.photo_url ? (
        <img src={pet.photo_url} alt={pet.name} className="w-full h-full object-cover" />
      ) : (
        speciesInfo(pet.species).emoji
      )}
    </div>
  );
}

export default function HealthPage() {
  const [pets, setPets] = useState<any[]>([]);
  const [health, setHealth] = useState<Record<number, PetHealth>>({});
  const [recordsByPet, setRecordsByPet] = useState<Record<number, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [petRes, recRes] = await Promise.all([petApi.getAll(), healthRecordApi.getAll()]);
      const list = petRes.pets || petRes || [];
      const recs: any[] = recRes.records || [];

      const byPet: Record<number, any[]> = {};
      for (const r of recs) (byPet[r.pet_id] ||= []).push(r);

      const healthMap: Record<number, PetHealth> = {};
      for (const p of list) {
        const pr = byPet[p.id] || [];
        const upcomingRecs = pr
          .filter((r) => isDateUpcoming(r.next_date))
          .sort((a, b) => a.next_date.localeCompare(b.next_date));
        healthMap[p.id] = {
          upcoming: upcomingRecs.length,
          overdue: pr.filter((r) => isDateOverdue(r.next_date)).length,
          next: upcomingRecs[0] || null,
          total: pr.length,
        };
      }

      setPets(list);
      setHealth(healthMap);
      setRecordsByPet(byPet);
    } catch {
      setLoadError('Nie udało się pobrać książeczek zdrowia');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /** Wszystkie wpisy ze wszystkich pupilów — z podpiętym obiektem pupila */
  const allRecords = pets.flatMap((p) =>
    (recordsByPet[p.id] || []).map((r) => ({ ...r, pet: p }))
  );

  /** Karuzela terminów: najpierw zaległe (od najstarszych), potem nadchodzące */
  const timedRecords = allRecords.filter((r) => r.next_date);
  const upcomingFeed = [
    ...timedRecords
      .filter((r) => isDateOverdue(r.next_date))
      .sort((a, b) => a.next_date.localeCompare(b.next_date)),
    ...timedRecords
      .filter((r) => isDateUpcoming(r.next_date))
      .sort((a, b) => a.next_date.localeCompare(b.next_date)),
  ].slice(0, 10);

  /** Oś czasu — ostatnie wpisy ze wszystkich książeczek */
  const recentAll = [...allRecords]
    .sort((a, b) => new Date(b.record_date).getTime() - new Date(a.record_date).getTime())
    .slice(0, 6);

  /** Kompletność książeczki pupila: ile z 4 kategorii ma wpisy */
  const completeness = (petId: number) => {
    const recs = recordsByPet[petId] || [];
    const filled = CATEGORIES.filter((c) => recs.some((r) => r.record_type === c.key)).length;
    return Math.round((filled / CATEGORIES.length) * 100);
  };

  return (
    <div className="space-y-7">
      <PageHeader
        title="Książeczka zdrowia"
        description="Szczepienia, leki, odrobaczenia i wizyty — wszystko w jednym miejscu"
        icon={Heart}
      />

      {loadError ? (
        <div className="pv-card animate-slide-up stagger-5 p-10 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-50 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          <p className="font-semibold text-gray-900 mb-1">Nie udało się pobrać książeczek zdrowia</p>
          <p className="text-sm text-gray-500 mb-5">Sprawdź połączenie i spróbuj ponownie.</p>
          <button onClick={load} className="pv-btn-primary px-8 py-3">Spróbuj ponownie</button>
        </div>
      ) : !loading && pets.length === 0 ? (
        <div className="pv-card animate-slide-up stagger-5">
          <EmptyState
            icon={Stethoscope}
            title="Najpierw dodaj zwierzę"
            description="Książeczka zdrowia jest przypisana do profilu pupila — szczepienia, leki i wizyty w jednym miejscu."
            actionLabel="Dodaj zwierzę"
            actionHref="/dashboard/pets/new"
          />
        </div>
      ) : (
        <>
          {/* ====== KARUZELA TERMINÓW ====== */}
          <section className="animate-slide-up stagger-5">
            <div className="flex items-center justify-between mb-3 px-1">
              <h2 className="pv-section-title flex items-center gap-2">
                <CalendarClock className="w-5 h-5 text-brand" /> Najbliższe terminy
              </h2>
              {upcomingFeed.length > 0 && (
                <span className="text-xs font-semibold text-gray-400">
                  {upcomingFeed.length} {upcomingFeed.length === 1 ? 'termin' : 'terminów'}
                </span>
              )}
            </div>

            {loading ? (
              <div className="flex gap-3.5 overflow-hidden">
                <div className="pv-skeleton h-[168px] w-[230px] rounded-3xl flex-shrink-0" />
                <div className="pv-skeleton h-[168px] w-[230px] rounded-3xl flex-shrink-0" />
                <div className="pv-skeleton h-[168px] w-[230px] rounded-3xl flex-shrink-0 hidden sm:block" />
              </div>
            ) : upcomingFeed.length === 0 ? (
              <div className="pv-card !bg-brand-mint/70 !border-brand-light p-5 flex items-center gap-4">
                <span className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
                  <ShieldCheck className="w-6 h-6 text-brand" />
                </span>
                <div>
                  <p className="font-semibold text-gray-900">Wszystko na bieżąco</p>
                  <p className="text-sm text-gray-500">Brak zaplanowanych terminów — dodaj je w książeczce pupila.</p>
                </div>
              </div>
            ) : (
              <div className="flex gap-3.5 overflow-x-auto scrollbar-none snap-x snap-mandatory -mx-4 px-4 sm:mx-0 sm:px-1 sm:pb-1">
                {upcomingFeed.map((r, i) => {
                  const c = catOf(r.record_type);
                  const isOverdue = isDateOverdue(r.next_date);
                  const soon = !isOverdue && daysUntil(r.next_date) <= 7;
                  return (
                    <Link
                      key={`${r.id}-${i}`}
                      href={`/dashboard/health/${r.pet.id}/${c.href}`}
                      className={`pv-card-hover snap-start flex-shrink-0 w-[230px] p-4 flex flex-col gap-3 animate-scale-in stagger-${Math.min(i + 1, 8)}`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide ${
                            isOverdue
                              ? 'bg-red-50 text-red-600'
                              : soon
                              ? 'bg-brand-peach text-[#B4701F]'
                              : 'bg-brand-mint text-brand-dark'
                          }`}
                        >
                          {daysLabel(r.next_date)}
                        </span>
                        <span
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-sm"
                          style={{ background: c.color }}
                        >
                          <c.icon className="w-4 h-4" />
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 text-[15px] leading-snug line-clamp-2">{r.title}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {c.title} · {fullDate(r.next_date)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2.5 pt-3 border-t border-gray-100/80">
                        <PetAvatar pet={r.pet} size={26} />
                        <span className="text-xs font-semibold text-gray-600 break-words flex-1 min-w-0">{r.pet.name}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-gray-300" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          {/* ====== KARTY PUPILI ====== */}
          <section>
            <div className="flex items-center justify-between mb-3 px-1">
              <h2 className="pv-section-title">Książeczki Twoich pupili</h2>
              <Link
                href="/dashboard/pets/new"
                className="text-sm font-semibold text-brand-dark hover:text-brand transition-colors inline-flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Dodaj
              </Link>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="pv-card p-5"><ListRowSkeleton /></div>
                <div className="pv-card p-5"><ListRowSkeleton /></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {pets.map((pet, i) => {
                  const h: PetHealth = health[pet.id] || { upcoming: 0, overdue: 0, next: null, total: 0 };
                  const pct = completeness(pet.id);
                  return (
                    <div
                      key={pet.id}
                      className={`pv-card-hover p-5 flex flex-col animate-slide-up stagger-${Math.min(i + 1, 8)}`}
                    >
                      <Link href={`/dashboard/health/${pet.id}`} className="flex items-center gap-4 group">
                        <PetAvatar pet={pet} />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900 text-lg group-hover:text-brand-dark transition-colors break-words">
                            {pet.name}
                          </p>
                          <p className="text-sm text-gray-500 break-words">
                            {speciesInfo(pet.species).label}{pet.breed ? ` · ${pet.breed}` : ''}
                          </p>
                          {h.overdue > 0 ? (
                            <p className="inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-600 text-xs font-bold">
                              <AlertTriangle className="w-3 h-3" />
                              {h.overdue} {h.overdue === 1 ? 'zaległy termin' : 'zaległe terminy'}
                            </p>
                          ) : h.next ? (
                            <p className="text-xs font-medium text-gray-400 mt-1.5 line-clamp-2">
                              Następnie: <span className="text-gray-600 font-semibold">{h.next.title}</span> · {shortDate(h.next.next_date)}
                            </p>
                          ) : (
                            <p className="text-xs text-gray-400 mt-1.5">Brak zaplanowanych terminów</p>
                          )}
                        </div>
                        <HealthRing overdue={h.overdue} upcoming={h.upcoming} />
                      </Link>

                      {/* Kompletność książeczki */}
                      <div className="mt-4">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Kompletność książeczki</span>
                          <span className="text-[11px] font-bold text-brand-dark tabular-nums">{pct}%</span>
                        </div>
                        <div className="pv-progress !h-1.5">
                          <div className="pv-progress-fill" style={{ width: `${pct}%` }} />
                        </div>
                      </div>

                      {/* Szybkie skróty do kategorii */}
                      <div className="mt-4 pt-4 border-t border-gray-100/80 flex items-center justify-between">
                        <div className="flex gap-1.5">
                          {CATEGORIES.map((c) => (
                            <Link
                              key={c.key}
                              href={`/dashboard/health/${pet.id}/${c.href}`}
                              title={c.title}
                              aria-label={`${c.title} — ${pet.name}`}
                              className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                              style={{ backgroundColor: `${c.color}12`, color: c.color }}
                            >
                              <c.icon className="w-[18px] h-[18px]" />
                            </Link>
                          ))}
                        </div>
                        <Link
                          href={`/dashboard/health/${pet.id}`}
                          className="text-xs font-bold text-brand-dark hover:text-brand transition-colors inline-flex items-center gap-1 flex-shrink-0"
                        >
                          Otwórz <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* ====== OŚ CZASU — OSTATNIA AKTYWNOŚĆ ====== */}
          <section className="pv-card overflow-hidden animate-slide-up stagger-8">
            <div className="px-6 py-5 border-b border-gray-100/80">
              <h3 className="pv-section-title flex items-center gap-2">
                <History className="w-5 h-5 text-brand" /> Ostatnia aktywność
              </h3>
            </div>
            <div className="p-5 sm:p-6">
              {loading ? (
                <div className="space-y-2">
                  <ListRowSkeleton />
                  <ListRowSkeleton />
                  <ListRowSkeleton />
                </div>
              ) : recentAll.length === 0 ? (
                <EmptyState
                  icon={History}
                  title="Książeczki są jeszcze puste"
                  description="Otwórz książeczkę pupila i dodaj pierwszy wpis — szczepienie, wizytę lub lek."
                  compact
                />
              ) : (
                <div>
                  {recentAll.map((r, i) => {
                    const c = catOf(r.record_type);
                    const isLast = i === recentAll.length - 1;
                    return (
                      <Link
                        key={r.id}
                        href={`/dashboard/health/${r.pet.id}/${c.href}`}
                        className="relative flex gap-4 pb-5 last:pb-0 group"
                      >
                        {!isLast && (
                          <span className="absolute left-[8px] top-5 bottom-0 w-px bg-gray-100" aria-hidden />
                        )}
                        <span
                          className="relative z-10 mt-0.5 w-[17px] h-[17px] rounded-full border-[3px] border-white shadow-sm flex-shrink-0"
                          style={{ background: c.color }}
                          aria-hidden
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <p className="font-semibold text-gray-900 break-words group-hover:text-brand-dark transition-colors">
                              {r.title}
                            </p>
                            <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                              {shortDate(r.record_date)}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                            <span className="inline-flex items-center gap-1 font-semibold" style={{ color: c.color }}>
                              <c.icon className="w-3 h-3" /> {c.title}
                            </span>
                            <span className="text-gray-300">·</span>
                            <span className="break-words">{r.pet.name}</span>
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
