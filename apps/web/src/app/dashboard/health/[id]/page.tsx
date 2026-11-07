'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Syringe, Pill, Shield, Stethoscope, PawPrint, ArrowLeft,
  CalendarClock, AlertTriangle, CheckCircle2, ChevronRight, Clock, ShieldCheck,
} from 'lucide-react';
import { petApi, healthRecordApi } from '@/lib/api';
import { ageLabel, speciesInfo } from '@/components/PetForm';
import { daysUntilDate, isDateOverdue, isDateUpcoming } from '@/lib/dates';

const CATEGORIES = [
  { key: 'vaccination', href: 'vaccinations', num: '01', title: 'Szczepienia', icon: Syringe, color: '#1B6B4A' },
  { key: 'deworming', href: 'prevention', num: '02', title: 'Profilaktyka', icon: Shield, color: '#3D9A6A' },
  { key: 'medication', href: 'medications', num: '03', title: 'Leki', icon: Pill, color: '#2A8A5C' },
  { key: 'visit', href: 'visits', num: '04', title: 'Wizyty', icon: Stethoscope, color: '#0F3D2E' },
];

const daysUntil = (d: string) => daysUntilDate(d);

const wpisPl = (n: number) => (n === 1 ? 'wpis' : n >= 2 && n <= 4 ? 'wpisy' : 'wpisów');

export default function PetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const petId = Number(params.id);

  const [pet, setPet] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [petRes, recRes] = await Promise.all([
        petApi.getById(petId),
        healthRecordApi.getByPet(petId),
      ]);
      setPet(petRes.pet || petRes);
      setRecords(recRes.records || []);
    } catch (err: any) {
      if (err?.response?.status === 404) {
        router.push('/dashboard/health');
      } else {
        setLoadError('Nie udało się pobrać książeczki zdrowia');
      }
    } finally {
      setLoading(false);
    }
  }, [petId, router]);

  useEffect(() => {
    if (petId) load();
  }, [petId, load]);

  const formatDate = (d: string) =>
    d ? new Date(d).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' }) : '';

  const catOf = (key: string) => CATEGORIES.find((c) => c.key === key);
  const countByType = (key: string) => records.filter((r) => r.record_type === key).length;
  const overdueForType = (key: string) =>
    records.filter((r) => r.record_type === key && isDateOverdue(r.next_date)).length;

  const overdueRecords = records
    .filter((r) => isDateOverdue(r.next_date))
    .sort((a, b) => a.next_date.localeCompare(b.next_date));
  const totalOverdue = overdueRecords.length;

  const allUpcoming = records
    .filter((r) => isDateUpcoming(r.next_date))
    .sort((a, b) => a.next_date.localeCompare(b.next_date));

  const next = allUpcoming[0] || null;
  const nextCat = next ? catOf(next.record_type) : null;
  const nextDays = next ? daysUntil(next.next_date) : 0;
  const moreUpcoming = allUpcoming.slice(1, 4);

  const lastRecords = [...records]
    .sort((a, b) => new Date(b.record_date).getTime() - new Date(a.record_date).getTime())
    .slice(0, 6);

  if (loading) {
    return (
      <div className="space-y-7">
        <div className="pv-skeleton h-6 w-40" />
        <div className="pv-skeleton h-64 rounded-[28px]" />
        <div className="pv-skeleton h-28 rounded-3xl" />
        <div className="pv-skeleton h-72 rounded-3xl" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="pv-card p-10 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-50 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-red-400" />
        </div>
        <p className="font-semibold text-gray-900 mb-1">Nie udało się pobrać książeczki zdrowia</p>
        <p className="text-sm text-gray-500 mb-5">Sprawdź połączenie i spróbuj ponownie.</p>
        <button onClick={load} className="pv-btn-primary px-8 py-3">Spróbuj ponownie</button>
      </div>
    );
  }

  const docRows = [
    { label: 'Gatunek', value: pet ? speciesInfo(pet.species).label : '—' },
    { label: 'Rasa', value: pet?.breed || '—' },
    { label: 'Wiek', value: pet?.birth_date ? ageLabel(pet.birth_date) : '—' },
    { label: 'Waga', value: pet?.weight ? `${parseFloat(pet.weight)} kg` : '—' },
  ];

  return (
    <div className="space-y-7">
      <Link
        href="/dashboard/health"
        className="inline-flex items-center gap-2 text-sm font-medium text-brand-dark hover:text-brand transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Wszystkie pupile
      </Link>

      {/* ====== OKŁADKA KSIĄŻECZKI ====== */}
      <div className="pv-card relative overflow-hidden animate-slide-down">
        {/* Grzbiet książeczki */}
        <span
          className="absolute left-0 top-0 bottom-0 w-2.5"
          style={{ background: 'linear-gradient(180deg, #0F3D2E 0%, #1B6B4A 55%, #2E8B62 100%)' }}
          aria-hidden
        />
        {/* Tekstura papieru */}
        <span
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(27,107,74,0.05) 1px, transparent 1.4px)',
            backgroundSize: '16px 16px',
          }}
          aria-hidden
        />

        {/* Pieczątka */}
        <div className="absolute top-4 right-4 sm:top-6 sm:right-7 -rotate-[10deg] pointer-events-none select-none animate-pop-in stagger-2">
          <div
            className={`relative w-[84px] h-[84px] sm:w-24 sm:h-24 rounded-full border-[2.5px] flex flex-col items-center justify-center gap-1 ${
              totalOverdue > 0 ? 'border-red-300 text-red-400' : 'border-brand/40 text-brand'
            }`}
          >
            <span className="absolute inset-[5px] rounded-full border border-current opacity-40" aria-hidden />
            {totalOverdue > 0 ? (
              <AlertTriangle className="w-4 h-4" />
            ) : (
              <ShieldCheck className="w-4 h-4" />
            )}
            <span className="text-[9px] sm:text-[10px] font-extrabold tracking-[0.16em] uppercase">
              {totalOverdue > 0 ? 'Zaległe' : 'Aktualna'}
            </span>
          </div>
        </div>

        <div className="relative pl-7 sm:pl-9 pr-5 sm:pr-8 pt-6 sm:pt-8 pb-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand">
            Książeczka zdrowia · nr {String(petId).padStart(3, '0')}
          </p>
          <div className="flex items-center gap-4 sm:gap-5 mt-3 pr-[92px] sm:pr-[110px]">
            <div className="w-16 h-16 sm:w-[76px] sm:h-[76px] rounded-[22px] bg-gradient-to-br from-brand to-brand-dark flex items-center justify-center text-3xl sm:text-4xl flex-shrink-0 shadow-md overflow-hidden ring-4 ring-white">
              {pet?.photo_url ? (
                <img src={pet.photo_url} alt={pet.name} className="w-full h-full object-cover" />
              ) : (
                speciesInfo(pet?.species).emoji
              )}
            </div>
            <div className="min-w-0">
              <h1 className="font-serif text-[26px] sm:text-3xl font-normal leading-tight text-gray-900 break-words">
                {pet?.name}
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">Cyfrowy dokument zdrowia pupila</p>
            </div>
          </div>

          {/* Dane jak w dokumencie */}
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3.5 mt-6">
            {docRows.map((row) => (
              <div key={row.label} className="min-w-0">
                <dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">{row.label}</dt>
                <dd className="text-sm font-semibold text-gray-800 mt-0.5 break-words">{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Licznik książeczki */}
        <div className="relative flex divide-x divide-gray-100 border-t border-gray-100/80 bg-brand-mint/40">
          {[
            { v: records.length, l: 'wpisów', red: false },
            { v: allUpcoming.length, l: 'nadchodzących', red: false },
            { v: totalOverdue, l: 'zaległych', red: totalOverdue > 0 },
          ].map((s) => (
            <div key={s.l} className="flex-1 py-3.5 text-center">
              <p className={`font-serif text-xl leading-none tabular-nums ${s.red ? 'text-red-500' : 'text-brand-dark'}`}>
                {s.v}
              </p>
              <p className="text-[10px] uppercase tracking-[0.12em] text-gray-400 mt-1">{s.l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ====== NASTĘPNY KROK ====== */}
      <section className="animate-slide-up stagger-2">
        <h2 className="pv-section-title mb-3 px-1">Następny krok</h2>

        {totalOverdue > 0 && (
          <Link
            href={`/dashboard/health/${petId}/${catOf(overdueRecords[0].record_type)?.href || 'visits'}`}
            className="pv-card !border-red-100 !bg-red-50/60 p-4 sm:p-5 mb-3.5 flex items-center gap-4 group"
          >
            <span className="w-11 h-11 rounded-2xl bg-red-100 text-red-500 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-red-600 text-sm">
                {totalOverdue} {totalOverdue === 1 ? 'zaległy termin' : 'zaległe terminy'} — wymaga uwagi
              </p>
              <p className="text-xs text-red-400 mt-0.5 line-clamp-2">
                Najstarszy: {overdueRecords[0].title}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-red-300 group-hover:text-red-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
          </Link>
        )}

        {next ? (
          <div className="pv-card overflow-hidden">
            <Link
              href={`/dashboard/health/${petId}/${nextCat?.href || 'visits'}`}
              className="flex items-center gap-4 sm:gap-6 p-5 sm:p-6 group"
            >
              <div className="flex-shrink-0 w-[72px] text-center">
                <p className="font-serif text-[34px] sm:text-[42px] text-brand-dark leading-none">
                  {nextDays === 0 ? 'dziś' : nextDays}
                </p>
                {nextDays > 0 && (
                  <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400 mt-1.5">
                    {nextDays === 1 ? 'dzień' : 'dni'}
                  </p>
                )}
              </div>
              <span className="w-px self-stretch bg-gray-100 flex-shrink-0" aria-hidden />
              <div className="flex-1 min-w-0">
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide mb-2"
                  style={{ backgroundColor: `${nextCat?.color || '#1B6B4A'}12`, color: nextCat?.color || '#1B6B4A' }}
                >
                  {nextCat?.icon && <nextCat.icon className="w-3 h-3" />}
                  {nextCat?.title}
                </span>
                <h3 className="font-serif text-lg sm:text-xl font-normal text-gray-900 line-clamp-2 group-hover:text-brand-dark transition-colors">
                  {next.title}
                </h3>
                <p className="text-sm text-gray-400 mt-0.5">{formatDate(next.next_date)}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-brand-dark group-hover:translate-x-1 transition-all flex-shrink-0" />
            </Link>

            {moreUpcoming.length > 0 && (
              <div className="border-t border-gray-100/80 divide-y divide-gray-100/80">
                {moreUpcoming.map((r) => {
                  const c = catOf(r.record_type);
                  return (
                    <Link
                      key={r.id}
                      href={`/dashboard/health/${petId}/${c?.href || 'visits'}`}
                      className="flex items-center gap-3.5 px-5 sm:px-6 py-3.5 hover:bg-brand-mint/50 transition-colors group"
                    >
                      <span
                        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${c?.color || '#1B6B4A'}12`, color: c?.color || '#1B6B4A' }}
                      >
                        {c?.icon ? <c.icon className="w-4 h-4" /> : <PawPrint className="w-4 h-4" />}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 line-clamp-2 group-hover:text-brand-dark transition-colors">
                          {r.title}
                        </p>
                        <p className="text-xs text-gray-400">{formatDate(r.next_date)}</p>
                      </div>
                      <span className="px-3 py-1 rounded-full bg-brand-mint text-brand-dark text-[11px] font-bold flex-shrink-0">
                        {daysUntil(r.next_date) === 0 ? 'dziś' : daysUntil(r.next_date) === 1 ? 'jutro' : `za ${daysUntil(r.next_date)} d.`}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="pv-card !bg-brand-mint/70 !border-brand-light p-5 flex items-center gap-4">
            <span className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
              <CheckCircle2 className="w-6 h-6 text-brand" />
            </span>
            <div>
              <p className="font-semibold text-gray-900">Wszystko aktualne</p>
              <p className="text-sm text-gray-500">Brak nadchodzących terminów — książeczka jest na bieżąco.</p>
            </div>
          </div>
        )}
      </section>

      {/* ====== ROZDZIAŁY KSIĄŻECZKI ====== */}
      <section className="animate-slide-up stagger-3">
        <h2 className="pv-section-title mb-3 px-1">Rozdziały książeczki</h2>
        <div className="pv-card overflow-hidden">
          <div className="divide-y divide-gray-100/80">
            {CATEGORIES.map((cat, i) => {
              const count = countByType(cat.key);
              const od = overdueForType(cat.key);
              const nextRec = records
                .filter((r) => r.record_type === cat.key && isDateUpcoming(r.next_date))
                .sort((a, b) => a.next_date.localeCompare(b.next_date))[0];
              return (
                <Link
                  key={cat.key}
                  href={`/dashboard/health/${petId}/${cat.href}`}
                  className="flex items-center gap-4 sm:gap-5 px-5 sm:px-6 py-4 sm:py-[18px] hover:bg-brand-mint/50 transition-colors group"
                >
                  <span
                    className="font-serif text-[26px] sm:text-3xl leading-none w-9 text-center select-none flex-shrink-0"
                    style={{ color: 'rgba(27,107,74,0.20)' }}
                    aria-hidden
                  >
                    {cat.num}
                  </span>
                  <span
                    className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3"
                    style={{ backgroundColor: `${cat.color}12`, color: cat.color }}
                  >
                    <cat.icon className="w-5 h-5" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 group-hover:text-brand-dark transition-colors">
                      {cat.title}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {count} {wpisPl(count)}
                      {nextRec && od === 0 ? ` · nast. ${formatDate(nextRec.next_date)}` : ''}
                    </p>
                  </div>
                  {od > 0 && (
                    <span className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center shadow-sm flex-shrink-0">
                      {od}
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-brand-dark group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ====== OŚ CZASU ZDROWIA ====== */}
      <section className="pv-card overflow-hidden animate-slide-up stagger-4">
        <div className="px-6 py-5 border-b border-gray-100/80 flex items-center justify-between">
          <h3 className="pv-section-title flex items-center gap-2">
            <Clock className="w-4 h-4 text-brand" /> Oś czasu zdrowia
          </h3>
        </div>
        <div className="p-5 sm:p-6">
          {lastRecords.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-brand-mint flex items-center justify-center animate-float">
                <PawPrint className="w-6 h-6 text-brand-dark" />
              </div>
              <p className="text-sm text-gray-500 max-w-[260px] mx-auto">
                Książeczka jest jeszcze pusta — wybierz rozdział powyżej i dodaj pierwszy wpis.
              </p>
            </div>
          ) : (
            <div>
              {lastRecords.map((r, i) => {
                const c = catOf(r.record_type);
                const isLast = i === lastRecords.length - 1;
                return (
                  <Link
                    key={r.id}
                    href={`/dashboard/health/${petId}/${c?.href || 'visits'}`}
                    className="relative flex gap-4 pb-5 last:pb-0 group"
                  >
                    {!isLast && (
                      <span className="absolute left-[8px] top-5 bottom-0 w-px bg-gray-100" aria-hidden />
                    )}
                    <span
                      className="relative z-10 mt-0.5 w-[17px] h-[17px] rounded-full border-[3px] border-white shadow-sm flex-shrink-0"
                      style={{ background: c?.color || '#0F3D2E' }}
                      aria-hidden
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-semibold text-gray-900 break-words group-hover:text-brand-dark transition-colors">
                          {r.title}
                        </p>
                        <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                          {formatDate(r.record_date)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 inline-flex items-center gap-1 font-semibold" style={{ color: c?.color || '#0F3D2E' }}>
                        {c?.icon ? <c.icon className="w-3 h-3" /> : <PawPrint className="w-3 h-3" />} {c?.title}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
