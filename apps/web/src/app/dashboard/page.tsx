'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { petApi, dashboardApi, type DashboardSummary, type DashboardEvent } from '@/lib/api';
import TipsCarousel from '@/components/TipsCarousel';
import StatCard from '@/components/StatCard';
import PetProgressRing from '@/components/PetProgressRing';
import WeeklyActivityChart from '@/components/charts/WeeklyActivityChart';
import BudgetDonutChart from '@/components/charts/BudgetDonutChart';
import Tile from '@/components/ui/Tile';
import EmptyState from '@/components/ui/EmptyState';
import ComingSoonModal from '@/components/ComingSoonModal';
import { Skeleton, StatCardSkeleton, ListRowSkeleton } from '@/components/ui/Skeleton';
import {
  PawPrint,
  Syringe,
  CalendarClock,
  BellRing,
  CalendarDays,
  ArrowRight,
  Heart,
  Scan,
  MapPin,
  Wallet,
  Sparkles,
  Utensils,
  Stethoscope,
  Footprints,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

const SPECIES_EMOJI: Record<string, string> = {
  dog: '🐶',
  cat: '🐱',
  rabbit: '🐰',
  bird: '🐦',
  hamster: '🐹',
  other: '🐾',
};

const SPECIES_LABEL: Record<string, string> = {
  dog: 'Pies',
  cat: 'Kot',
  rabbit: 'Królik',
  bird: 'Ptak',
  hamster: 'Gryzoń',
  other: 'Inne',
};

const EVENT_STYLE: Record<string, { label: string; color: string; href: string }> = {
  vaccination: { label: 'Szczepienie', color: '#1B6B4A', href: 'vaccinations' },
  deworming: { label: 'Profilaktyka', color: '#F59E0B', href: 'prevention' },
  medication: { label: 'Lek', color: '#3B82F6', href: 'medications' },
  visit: { label: 'Wizyta', color: '#8B5CF6', href: 'visits' },
  other: { label: 'Inne', color: '#9CA3AF', href: 'visits' },
};

const BUDGET_CATEGORIES = [
  { id: 'food', name: 'Karma', color: '#f97316' },
  { id: 'medical', name: 'Leczenie', color: '#ef4444' },
  { id: 'accessories', name: 'Akcesoria', color: '#3b82f6' },
  { id: 'hygiene', name: 'Higiena', color: '#a855f7' },
  { id: 'toys', name: 'Zabawki', color: '#ec4899' },
  { id: 'other', name: 'Inne', color: '#64748b' },
];

const SEASONAL: Record<'spring' | 'summer' | 'autumn' | 'winter', { title: string; text: string }> = {
  spring: {
    title: 'Wiosna to początek sezonu kleszczy i pcheł',
    text: 'Sprawdź, czy ochrona przeciwpasożytnicza Twojego pupila jest aktualna i dodaj przypomnienie.',
  },
  summer: {
    title: 'Lato to szczyt sezonu kleszczy i upałów',
    text: 'Zadbaj o ochronę przeciwkleszczową, dostęp do wody i cień. Dodaj przypomnienie o kontroli sierści.',
  },
  autumn: {
    title: 'Jesień to dobry czas na odrobaczanie i kontrolę',
    text: 'Kleszcze są aktywne aż do pierwszych mrozów. Sprawdź terminy odrobaczania i szczepień.',
  },
  winter: {
    title: 'Zimą dbaj o łapy i kondycję pupila',
    text: 'Sól na chodnikach podrażnia łapy, a mróz bywa groźny dla małych ras. Zaplanuj kontrolę zdrowia.',
  },
};

const seasonOf = (month: number) =>
  month >= 2 && month <= 4 ? 'spring' : month >= 5 && month <= 7 ? 'summer' : month >= 8 && month <= 10 ? 'autumn' : 'winter';

const parseDay = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00`);

const dayDiff = (iso: string) => {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return Math.round((parseDay(iso).getTime() - t.getTime()) / 86400000);
};

const relativeLabel = (iso: string) => {
  const d = dayDiff(iso);
  if (d < 0) return `po terminie (${Math.abs(d)} dni)`;
  if (d === 0) return 'dziś';
  if (d === 1) return 'jutro';
  return `za ${d} dni`;
};

const shortDate = (iso: string) => parseDay(iso).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });

const readMonthlyExpenses = (pets: any[]) => {
  try {
    const raw = localStorage.getItem('petExpenses');
    if (!raw) return [];
    const expenses: any[] = JSON.parse(raw);
    const petIds = new Set(pets.map((p) => String(p.id)));
    const now = new Date();
    const totals: Record<string, number> = {};
    expenses.forEach((e) => {
      const d = new Date(e.date);
      if (!petIds.has(String(e.petId)) || isNaN(d.getTime())) return;
      if (d.getFullYear() !== now.getFullYear() || d.getMonth() !== now.getMonth()) return;
      totals[e.category] = (totals[e.category] || 0) + (Number(e.amount) || 0);
    });
    return BUDGET_CATEGORIES.filter((c) => totals[c.id] > 0).map((c) => ({
      name: c.name,
      value: Math.round(totals[c.id] * 100) / 100,
      color: c.color,
    }));
  } catch {
    return [];
  }
};

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [pets, setPets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [petsError, setPetsError] = useState(false);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [summaryError, setSummaryError] = useState(false);
  const [budgetData, setBudgetData] = useState<{ name: string; value: number; color: string }[]>([]);
  const [soonOpen, setSoonOpen] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    setPetsError(false);
    setSummaryError(false);
    const [petsRes, summaryRes] = await Promise.allSettled([petApi.getAll(), dashboardApi.getSummary()]);
    let loadedPets: any[] = [];
    if (petsRes.status === 'fulfilled') {
      loadedPets = petsRes.value.pets || (Array.isArray(petsRes.value) ? petsRes.value : []);
    } else {
      setPetsError(true);
    }
    setPets(loadedPets);
    if (summaryRes.status === 'fulfilled') setSummary(summaryRes.value);
    else setSummaryError(true);
    setBudgetData(readMonthlyExpenses(loadedPets));
    setLoading(false);
  };

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch {}
    }
    loadAll();
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) return 'Dzień dobry';
    if (h >= 12 && h < 18) return 'Miłego popołudnia';
    if (h >= 18 && h < 22) return 'Dobry wieczór';
    return 'Cześć';
  };

  const today = new Date().toLocaleDateString('pl-PL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const speciesLabel = (s: string) => SPECIES_LABEL[s] || 'Inne';

  const petCompleteness = (pet: any) => {
    const fields = [pet.name, pet.species, pet.breed, pet.birth_date, pet.weight, pet.photo_url];
    const filled = fields.filter(Boolean).length;
    return (filled / fields.length) * 100;
  };

  const checklist = [
    { label: 'Utwórz konto', done: true },
    { label: 'Dodaj profil zwierzęcia', done: pets.length > 0, href: '/dashboard/pets/new' },
    { label: 'Uzupełnij książeczkę zdrowia', done: !!summary?.checklist.hasHealthRecord, href: '/dashboard/health' },
    { label: 'Ustaw pierwsze przypomnienie', done: !!summary?.checklist.hasReminder, href: '/dashboard/calendar' },
  ];
  const checklistDone = checklist.filter((c) => c.done).length;

  const stats = summary?.stats;
  const dash = (n: number | undefined) => (stats ? n ?? 0 : '—');
  const season = SEASONAL[seasonOf(new Date().getMonth())];

  const eventHref = (e: DashboardEvent) =>
    e.source === 'calendar' ? '/dashboard/calendar' : `/dashboard/health/${e.petId}/${(EVENT_STYLE[e.type] || EVENT_STYLE.other).href}`;

  return (
    <div className="space-y-7">
      {/* ====== HERO — przyjazny baner powitalny ====== */}
      <div
        className="relative rounded-[28px] text-white overflow-hidden px-6 sm:px-8 py-6 sm:py-9 animate-slide-down"
        style={{
          background: 'linear-gradient(135deg, #0F3D2E 0%, #1B6B4A 55%, #2E8B62 100%)',
          backgroundSize: '200% 200%',
          animation:
            'slide-down 0.6s cubic-bezier(0.22,1,0.36,1) both, gradient-shift 12s ease infinite',
        }}
      >
        {/* Pływające łapki */}
        <PawPrint className="absolute -right-4 -top-6 w-36 h-36 text-white/[0.07] rotate-12 animate-float" />
        <PawPrint className="absolute right-24 bottom-0 w-20 h-20 text-white/[0.06] -rotate-[24deg] animate-float-x" />
        <PawPrint className="absolute left-1/2 -bottom-8 w-28 h-28 text-white/[0.04] rotate-45 animate-float" />
        <div className="absolute -left-14 -bottom-20 w-56 h-56 rounded-full bg-white/[0.05]" />

        <div className="relative z-10 flex flex-col items-start gap-4 sm:gap-5 sm:pr-[300px] md:pr-[340px] lg:pr-[400px] sm:min-h-[150px] sm:justify-center">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-sm mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F5B97F] animate-pulse" />
              <span className="text-xs text-white/90 capitalize">{today}</span>
            </div>
            <h1 className="font-serif text-[24px] sm:text-3xl font-normal leading-tight [text-shadow:0_1px_10px_rgba(0,0,0,0.35)] sm:[text-shadow:none]">
              {greeting()}, {user?.firstName || 'Opiekunie'} 👋
            </h1>
            <p className="text-white/90 sm:text-white/75 text-sm mt-1.5 max-w-md leading-relaxed [text-shadow:0_1px_8px_rgba(0,0,0,0.35)] sm:[text-shadow:none]">
              {loading
                ? 'Sprawdzamy, jak się mają Twoje pupile...'
                : petsError
                ? 'Nie udało się pobrać danych. Spróbuj odświeżyć.'
                : pets.length === 0
                ? 'Dodaj profil pupila — zajmie to tylko chwilę.'
                : pets.length === 1
                ? `${pets[0].name} cieszy się, że tu jesteś. Wszystko na bieżąco!`
                : `Twoje ${pets.length} pupile mają się świetnie. Wszystko na bieżąco!`}
            </p>
          </div>
          <Link
            href="/dashboard/pets/new"
            className="pv-btn inline-flex items-center gap-1.5 bg-white text-brand-dark px-5 py-3 text-sm font-bold shadow-lg hover:bg-brand-cream flex-shrink-0"
          >
            <PawPrint className="w-4 h-4" />
            Dodaj zwierzę
          </Link>
        </div>

        <Image
          src="/hero-pets-razem.webp"
          alt=""
          width={900}
          height={840}
          priority
          aria-hidden
          className="pointer-events-none select-none absolute bottom-0 right-0 z-[5] w-auto h-[67%] translate-x-[6%] translate-y-[8%] sm:h-[112%] sm:translate-x-0 sm:translate-y-[12%] drop-shadow-[0_8px_16px_rgba(0,0,0,0.2)]"
        />
      </div>

      {/* ====== KAFELKI SZYBKICH AKCJI ====== */}
      <section>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="pv-section-title">Co chcesz zrobić?</h2>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
          <Tile href="/dashboard/health" label="Zdrowie" icon={Heart} iconClass="bg-brand-dark text-white" stagger="stagger-1" />
          <Tile href="/dashboard/calendar" label="Kalendarz" icon={CalendarDays} iconClass="bg-brand text-white" stagger="stagger-2" />
          <Tile href="/dashboard/walk-tracker" label="Spacer" icon={Footprints} iconClass="bg-brand-mint text-brand-dark" stagger="stagger-3" />
          <Tile href="/dashboard/feeding-log" label="Karmienie" icon={Utensils} iconClass="bg-brand-peach text-brand-dark" stagger="stagger-4" />
          <Tile href="/dashboard/food-scanner" label="Skaner karm" icon={Scan} stagger="stagger-5" soon onClick={() => setSoonOpen(true)} />
          <Tile href="/dashboard/ai-assistant" label="AI Asystent" icon={Sparkles} iconClass="bg-gradient-to-br from-brand to-brand-dark text-white" stagger="stagger-6" />
        </div>
      </section>

      {soonOpen && <ComingSoonModal open={soonOpen} onClose={() => setSoonOpen(false)} />}

      {/* ====== STATYSTYKI ====== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {loading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard icon={PawPrint} label="Zwierzęta pod opieką" value={petsError ? '—' : pets.length} iconBg="bg-brand-mint" iconColor="text-brand-dark" stagger="stagger-1" />
            <StatCard
              icon={Syringe}
              label="Szczepienia w tym miesiącu"
              value={dash(stats?.vaccinationsThisMonth)}
              hint={!stats ? 'Brak danych' : stats.nextVaccinationDate ? `Najbliższe: ${shortDate(stats.nextVaccinationDate)}` : 'Brak zaplanowanych'}
              iconBg="bg-brand-light"
              iconColor="text-brand-dark"
              stagger="stagger-2"
            />
            <StatCard
              icon={CalendarClock}
              label="Nadchodzące wizyty"
              value={dash(stats?.upcomingVisits)}
              hint={!stats ? 'Brak danych' : stats.nextVisitDate ? `Najbliższa: ${shortDate(stats.nextVisitDate)}` : 'Brak wizyt w 30 dni'}
              iconBg="bg-brand-peach"
              iconColor="text-brand-dark"
              stagger="stagger-3"
            />
            <StatCard
              icon={BellRing}
              label="Aktywne przypomnienia"
              value={dash(stats?.activeReminders)}
              hint={!stats ? 'Brak danych' : stats.overdueReminders > 0 ? `${stats.overdueReminders} po terminie` : stats.activeReminders > 0 ? 'W ciągu 30 dni' : 'Wszystko na bieżąco'}
              iconBg="bg-brand-mint"
              iconColor="text-brand-dark"
              stagger="stagger-4"
            />
          </>
        )}
      </div>

      {/* ====== WYKRESY ====== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="animate-slide-up stagger-3"><WeeklyActivityChart minutesByDay={summary?.minutesByDay} /></div>
        <div className="animate-slide-up stagger-4"><BudgetDonutChart categories={budgetData} /></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ====== MOJE ZWIERZĘTA ====== */}
        <div className="lg:col-span-2 pv-card overflow-hidden animate-slide-up stagger-5">
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100/80">
            <h3 className="pv-section-title">Twoje zwierzęta</h3>
            <Link
              href="/dashboard/pets"
              className="text-sm font-semibold text-brand-dark hover:text-brand transition-colors inline-flex items-center gap-1"
            >
              Wszystkie <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="p-4 sm:p-6">
            {loading ? (
              <div className="space-y-2">
                <ListRowSkeleton />
                <ListRowSkeleton />
                <ListRowSkeleton />
              </div>
            ) : petsError ? (
              <div className="text-center py-10">
                <div className="w-16 h-16 mx-auto mb-4 rounded-3xl bg-red-50 flex items-center justify-center">
                  <AlertTriangle className="w-7 h-7 text-red-500" />
                </div>
                <p className="text-gray-700 font-semibold mb-1">Nie udało się pobrać zwierząt</p>
                <p className="text-sm text-gray-500 mb-5">Sprawdź połączenie z internetem i spróbuj ponownie.</p>
                <button onClick={loadAll} className="pv-btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-sm">
                  <RefreshCw className="w-4 h-4" /> Spróbuj ponownie
                </button>
              </div>
            ) : pets.length === 0 ? (
              <EmptyState
                icon={PawPrint}
                title="Tu pojawią się Twoje pupile"
                description="Dodaj pierwszy profil zwierzęcia i miej wszystko w jednym miejscu."
                actionLabel="Dodaj zwierzę"
                actionHref="/dashboard/pets/new"
              />
            ) : (
              <div className="space-y-2">
                {pets.slice(0, 4).map((pet, i) => (
                  <Link
                    key={pet.id}
                    href={`/dashboard/pets/${pet.id}/profile`}
                    className={`flex items-center gap-4 p-3.5 rounded-2xl border border-transparent hover:bg-brand-mint hover:border-brand-light transition-all group animate-slide-up stagger-${Math.min(i + 1, 8)}`}
                  >
                    <div className="w-[52px] h-[52px] rounded-2xl bg-gradient-to-br from-brand to-brand-dark flex items-center justify-center text-2xl flex-shrink-0 shadow-md">
                      {SPECIES_EMOJI[pet.species] || '🐾'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900">{pet.name}</p>
                      <p className="text-sm text-gray-500 truncate">
                        {speciesLabel(pet.species)}{pet.breed ? ` · ${pet.breed}` : ''}
                      </p>
                    </div>
                    <PetProgressRing percent={petCompleteness(pet)} />
                    <span className="text-gray-300 group-hover:text-brand-dark group-hover:translate-x-1 transition-all">
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ====== NADCHODZĄCE WYDARZENIA ====== */}
        <div className="pv-card overflow-hidden animate-slide-up stagger-6">
          <div className="px-6 py-5 border-b border-gray-100/80">
            <h3 className="pv-section-title">Nadchodzące wydarzenia</h3>
          </div>
          <div className="p-4 sm:p-6">
            {loading ? (
              <div className="space-y-2">
                <ListRowSkeleton />
                <ListRowSkeleton />
              </div>
            ) : summaryError ? (
              <p className="text-sm text-gray-500 text-center py-6">Nie udało się pobrać wydarzeń.</p>
            ) : !summary || summary.upcomingEvents.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="Brak zaplanowanych wydarzeń"
                description="Dodaj szczepienie, wizytę lub przypomnienie."
                actionLabel="Otwórz kalendarz"
                actionHref="/dashboard/calendar"
                compact
              />
            ) : (
              <div className="space-y-1">
                {summary.upcomingEvents.map((e) => {
                  const style = EVENT_STYLE[e.type] || EVENT_STYLE.other;
                  return (
                    <Link
                      key={e.id}
                      href={eventHref(e)}
                      className="flex items-center gap-3 p-3 rounded-2xl hover:bg-brand-mint transition-colors"
                    >
                      <span className="w-2.5 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: style.color }} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{e.title}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {style.label} · {e.petName}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-semibold text-brand-dark">{relativeLabel(e.date)}</p>
                        <p className="text-xs text-gray-400">{shortDate(e.date)}</p>
                      </div>
                    </Link>
                  );
                })}
                <Link href="/dashboard/calendar" className="block text-center text-sm font-semibold text-brand-dark hover:text-brand pt-3">
                  Zobacz kalendarz →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ====== CHECKLISTA + WSKAZÓWKI ====== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 animate-slide-up stagger-7">
          <TipsCarousel />
        </div>

        <div className="pv-card overflow-hidden animate-slide-up stagger-8">
          <div className="px-6 py-5 border-b border-gray-100/80">
            <h3 className="pv-section-title">Checklista opiekuna</h3>
          </div>
          <div className="p-6 space-y-4">
            {checklist.map((item, i) => {
              const row = (
                <div className="flex items-center gap-3">
                  <div
                    className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 ${
                      item.done ? 'bg-gradient-to-br from-brand to-brand-dark shadow-md' : 'border-2 border-gray-200'
                    }`}
                  >
                    {item.done && <CheckCircle2 className="w-4 h-4 text-white" />}
                  </div>
                  <span className={`text-[15px] ${item.done ? 'text-gray-400 line-through' : 'text-gray-700 font-medium'}`}>
                    {item.label}
                  </span>
                </div>
              );
              return !item.done && item.href ? (
                <Link key={i} href={item.href} className="block hover:opacity-80 transition-opacity">
                  {row}
                </Link>
              ) : (
                <div key={i}>{row}</div>
              );
            })}
            <div className="pt-3">
              <div className="pv-progress">
                <div className="pv-progress-fill" style={{ width: `${(checklistDone / 4) * 100}%` }} />
              </div>
              <p className="text-xs text-gray-500 mt-2">{checklistDone} z 4 kroków ukończone</p>
            </div>
          </div>
        </div>
      </div>

      {/* ====== ARTYKUŁY ====== */}
      <section className="animate-slide-up stagger-9">
        <div className="flex items-end justify-between mb-4 px-1">
          <div>
            <h3 className="pv-section-title text-xl">Warto wiedzieć</h3>
            <p className="text-sm text-gray-500">Porady o zdrowiu i opiece nad zwierzętami z narzędziami w Petvio</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              tag: 'Żywienie',
              emoji: '🥗',
              title: 'Jak dobrać karmę do wieku i aktywności psa',
              excerpt: 'Odpowiednia dieta to fundament zdrowia. Sprawdź, na co zwracać uwagę przy wyborze karmy.',
              cta: 'Skaner karm',
              href: '/dashboard/food-scanner',
              image: 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?auto=format&fit=crop&w=600&q=80',
            },
            {
              tag: 'Zdrowie',
              emoji: '💉',
              title: 'Kalendarz szczepień kota — co i kiedy',
              excerpt: 'Koty niewychodzące też potrzebują szczepień. Poznaj harmonogram szczepień dla kotów.',
              cta: 'Książeczka zdrowia',
              href: '/dashboard/health',
              image: 'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?auto=format&fit=crop&w=600&q=80',
            },
            {
              tag: 'Zachowanie',
              emoji: '🧠',
              title: 'Sygnały stresu u zwierząt domowych',
              excerpt: 'Ziewanie, oblizywanie nosa — naucz się rozpoznawać wczesne oznaki stresu u pupili.',
              cta: 'Behawiorysta, trener',
              href: '/dashboard/specialists',
              image: 'https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?auto=format&fit=crop&w=600&q=80',
            },
          ].map((article, i) => (
            <Link key={i} href={article.href} className="block">
            <article className="pv-card-hover overflow-hidden cursor-pointer group h-full">
              <div className="h-36 relative overflow-hidden">
                <Image
                  src={article.image}
                  alt={article.tag}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                <div className="absolute left-4 bottom-3.5">
                  <span className="px-3 py-1 rounded-full bg-white/95 text-brand-dark text-xs font-bold shadow-sm">
                    {article.emoji} {article.tag}
                  </span>
                </div>
              </div>
              <div className="p-5">
                <h4 className="font-bold text-gray-900 mb-2 leading-snug group-hover:text-brand-dark transition-colors">
                  {article.title}
                </h4>
                <p className="text-sm text-gray-500 leading-relaxed mb-4">{article.excerpt}</p>
                <p className="text-xs text-brand-dark font-semibold">{article.cta} →</p>
              </div>
            </article>
            </Link>
          ))}
        </div>
      </section>

      {/* ====== BANER SEZONOWY ====== */}
      <div className="pv-card !bg-brand-mint !border-brand-light p-6 lg:p-8 flex flex-col sm:flex-row sm:items-center gap-5 animate-slide-up stagger-10 relative overflow-hidden">
        <PawPrint className="absolute -right-6 -bottom-8 w-36 h-36 text-brand/10 rotate-12" />
        <div className="flex-1 relative z-10">
          <p className="text-xs font-bold uppercase tracking-wide text-brand mb-1.5">Sezonowe przypomnienie</p>
          <h4 className="font-serif text-lg font-normal text-gray-900 mb-1">{season.title}</h4>
          <p className="text-sm text-gray-600 leading-relaxed">{season.text}</p>
        </div>
        <Link href="/dashboard/calendar" className="pv-btn-primary px-6 py-3 whitespace-nowrap relative z-10">
          Otwórz kalendarz
        </Link>
      </div>
    </div>
  );
}
