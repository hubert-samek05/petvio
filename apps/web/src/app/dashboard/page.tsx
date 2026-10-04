'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { petApi } from '@/lib/api';
import TipsCarousel from '@/components/TipsCarousel';
import StatCard from '@/components/StatCard';
import PetProgressRing from '@/components/PetProgressRing';
import WeeklyActivityChart from '@/components/charts/WeeklyActivityChart';
import BudgetDonutChart from '@/components/charts/BudgetDonutChart';
import { PawPrint, Syringe, CalendarClock, BellRing, CalendarDays, ArrowRight } from 'lucide-react';

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [pets, setPets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch {}
    }
    loadPets();
  }, []);

  const loadPets = async () => {
    try {
      const response = await petApi.getAll();
      setPets(response.pets || response || []);
    } catch {
      setPets([]);
    } finally {
      setLoading(false);
    }
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Dzień dobry';
    if (h < 18) return 'Miłego popołudnia';
    return 'Dobry wieczór';
  };

  const today = new Date().toLocaleDateString('pl-PL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const speciesLabel = (s: string) =>
    s === 'dog' ? 'Pies' : s === 'cat' ? 'Kot' : 'Inne';

  const petCompleteness = (pet: any) => {
    const fields = [pet.name, pet.species, pet.breed, pet.birthDate, pet.weight, pet.photo];
    const filled = fields.filter(Boolean).length;
    return (filled / fields.length) * 100;
  };

  return (
    <div className="space-y-8">
      {/* Compact greeting bar */}
      <div className="relative rounded-3xl bg-gradient-to-br from-brand-dark via-[#123f30] to-brand-dark text-white overflow-hidden px-6 sm:px-8 py-7 sm:py-8">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djZoLTJ2LTRoLTJ2NGgtMnYtNGgtMnY0aC0ydjZoMnYtNGgydjRoMnYtNGgydjZoLTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30"></div>
        <div className="absolute right-0 -bottom-16 w-56 h-56 rounded-full bg-brand/10 blur-2xl"></div>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 backdrop-blur-sm mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-peach animate-pulse"></span>
              <span className="text-xs text-white/90 capitalize">{today}</span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-normal">
              {greeting()}, {user?.firstName || 'Opiekunie'}
            </h1>
            <p className="text-brand-light/70 text-sm mt-1">
              {pets.length === 0
                ? 'Dodaj profil pupila, aby zacząć.'
                : pets.length === 1
                ? `${pets[0].name} czeka na Ciebie — brak zaległych wydarzeń.`
                : `Twoje ${pets.length} pupile mają się dobrze — brak zaległych wydarzeń.`}
            </p>
          </div>
          <Link
            href="/dashboard/pets/new"
            className="inline-flex items-center gap-1.5 self-start sm:self-center bg-white text-brand-dark px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-brand-cream transition-all shadow-lg flex-shrink-0"
          >
            Dodaj zwierzę
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* KPI stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={PawPrint} label="Zwierzęta pod opieką" value={loading ? '—' : pets.length} iconBg="bg-brand-mint" iconColor="text-brand-dark" />
        <StatCard icon={Syringe} label="Szczepienia w tym miesiącu" value={0} hint="Brak zaplanowanych" iconBg="bg-brand-light" iconColor="text-brand-dark" />
        <StatCard icon={CalendarClock} label="Nadchodzące wizyty" value={0} hint="Brak wizyt" iconBg="bg-brand-peach" iconColor="text-brand-dark" />
        <StatCard icon={BellRing} label="Aktywne przypomnienia" value={0} hint="Wszystko na bieżąco" iconBg="bg-brand-mint" iconColor="text-brand-dark" />
      </div>

      {/* Quick links */}
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
        {[
          { href: '/dashboard/health', label: 'Księżeczka zdrowia' },
          { href: '/dashboard/calendar', label: 'Kalendarz' },
          { href: '/dashboard/budget', label: 'Budżet' },
          { href: '/dashboard/food-scanner', label: 'Skaner karm' },
          { href: '/dashboard/walk-tracker', label: 'Spacer' },
          { href: '/dashboard/profile', label: 'Profil' },
        ].map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex-shrink-0 px-4 py-2.5 rounded-full bg-white border border-gray-100 shadow-sm text-sm font-medium text-gray-600 hover:border-brand-dark hover:text-brand-dark transition-all"
          >
            {link.label}
          </Link>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WeeklyActivityChart />
        <BudgetDonutChart />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pets list */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
            <h3 className="font-serif text-lg font-normal text-gray-900">Twoje zwierzęta</h3>
            <Link href="/dashboard/pets" className="text-sm font-medium text-brand-dark hover:underline transition-colors">
              Zobacz wszystkie
            </Link>
          </div>
          <div className="p-6">
            {loading ? (
              <p className="text-gray-500 text-sm py-8 text-center">Ładowanie...</p>
            ) : pets.length === 0 ? (
              <div className="text-center py-10">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-brand-mint flex items-center justify-center">
                  <div className="w-7 h-7 rounded-full border-2 border-dashed border-brand"></div>
                </div>
                <p className="text-gray-600 font-medium mb-1">Brak zwierząt</p>
                <p className="text-sm text-gray-500 mb-5">Dodaj profil pupila, aby rozpocząć</p>
                <Link
                  href="/dashboard/pets/new"
                  className="inline-flex items-center text-sm font-semibold text-brand-dark hover:underline transition-colors"
                >
                  Dodaj zwierzę →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {pets.slice(0, 4).map((pet) => (
                  <Link
                    key={pet.id}
                    href={`/dashboard/pets/${pet.id}/profile`}
                    className="flex items-center gap-4 p-4 rounded-xl hover:bg-brand-mint border border-transparent hover:border-brand-light transition-all group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-brand-dark flex items-center justify-center text-white font-semibold flex-shrink-0">
                      {pet.name?.[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900">{pet.name}</p>
                      <p className="text-sm text-gray-500">
                        {speciesLabel(pet.species)}{pet.breed ? ` · ${pet.breed}` : ''}
                      </p>
                    </div>
                    <PetProgressRing percent={petCompleteness(pet)} />
                    <span className="text-gray-300 group-hover:text-brand-dark transition-colors">→</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Upcoming events */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-6 py-5 border-b border-gray-100">
            <h3 className="font-serif text-lg font-normal text-gray-900">Nadchodzące wydarzenia</h3>
          </div>
          <div className="p-6">
            <div className="text-center py-6">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-brand-mint flex items-center justify-center">
                <CalendarDays className="w-6 h-6 text-brand-dark" />
              </div>
              <p className="text-gray-600 font-medium mb-1">Brak zaplanowanych wydarzeń</p>
              <p className="text-sm text-gray-500 mb-5">Dodaj szczepienie, wizytę lub przypomnienie</p>
              <Link
                href="/dashboard/calendar"
                className="inline-flex items-center text-sm font-semibold text-brand-dark hover:underline transition-colors"
              >
                Otwórz kalendarz →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Tips carousel + checklist */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TipsCarousel />
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-6 py-5 border-b border-gray-100">
            <h3 className="font-serif text-lg font-normal text-gray-900">Checklista opiekuna</h3>
          </div>
          <div className="p-6 space-y-4">
            {[
              { label: 'Utwórz konto', done: true },
              { label: 'Dodaj profil zwierzęcia', done: pets.length > 0 },
              { label: 'Uzupełnij książeczkę zdrowia', done: false },
              { label: 'Ustaw pierwsze przypomnienie', done: false },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div
                  className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                    item.done
                      ? 'bg-brand-dark'
                      : 'border-2 border-gray-200'
                  }`}
                >
                  {item.done && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  )}
                </div>
                <span className={`text-[15px] ${item.done ? 'text-gray-400 line-through' : 'text-gray-700 font-medium'}`}>
                  {item.label}
                </span>
              </div>
            ))}
            <div className="pt-3">
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-brand-dark transition-all duration-500"
                  style={{ width: `${((1 + (pets.length > 0 ? 1 : 0)) / 4) * 100}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {1 + (pets.length > 0 ? 1 : 0)} z 4 kroków ukończone
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Articles */}
      <div>
        <div className="flex items-end justify-between mb-5">
          <div>
            <h3 className="font-serif text-xl font-normal text-gray-900">Warto przeczytać</h3>
            <p className="text-sm text-gray-500">Artykuły o zdrowiu i opiece nad zwierzętami</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              tag: 'Żywienie',
              title: 'Jak dobrać karmę do wieku i aktywności psa',
              excerpt: 'Odpowiednia dieta to fundament zdrowia. Sprawdź, na co zwracać uwagę przy wyborze karmy dla szczeniąt, dorosłych psów i seniorów.',
              time: '5 min czytania',
              image: 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?auto=format&fit=crop&w=600&q=80',
            },
            {
              tag: 'Zdrowie',
              title: 'Kalendarz szczepień kota — co i kiedy',
              excerpt: 'Koty niewychodzące też potrzebują szczepień. Poznaj harmonogram szczepień podstawowych i dodatkowych dla kotów w każdym wieku.',
              time: '4 min czytania',
              image: 'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?auto=format&fit=crop&w=600&q=80',
            },
            {
              tag: 'Zachowanie',
              title: 'Sygnały stresu u zwierząt domowych',
              excerpt: 'Ziewanie, oblizywanie nosa, unikanie kontaktu — naucz się rozpoznawać wczesne oznaki stresu u psów i kotów, zanim staną się problemem.',
              time: '6 min czytania',
              image: 'https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?auto=format&fit=crop&w=600&q=80',
            },
          ].map((article, i) => (
            <article
              key={i}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md hover:border-brand/30 transition-all cursor-pointer group"
            >
              <div className="h-32 relative">
                <Image src={article.image} alt={article.tag} fill className="object-cover" />
                <div className="absolute left-5 bottom-4">
                  <span className="px-3 py-1 rounded-full bg-white/90 text-brand-dark text-xs font-semibold">
                    {article.tag}
                  </span>
                </div>
              </div>
              <div className="p-5">
                <h4 className="font-semibold text-gray-900 mb-2 leading-snug group-hover:text-brand-dark transition-colors">
                  {article.title}
                </h4>
                <p className="text-sm text-gray-500 leading-relaxed mb-4">{article.excerpt}</p>
                <p className="text-xs text-gray-400 font-medium">{article.time}</p>
              </div>
            </article>
          ))}
        </div>
      </div>

      {/* Seasonal banner */}
      <div className="rounded-2xl border border-brand-light bg-brand-mint p-6 lg:p-8 flex flex-col sm:flex-row sm:items-center gap-5">
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-dark mb-1">Sezonowe przypomnienie</p>
          <h4 className="font-serif text-lg font-normal text-gray-900 mb-1">Lato to szczyt sezonu kleszczy</h4>
          <p className="text-sm text-gray-600">
            Sprawdź, czy ochrona przeciwkleszczowa Twojego pupila jest aktualna, i dodaj przypomnienie o kolejnej dawce.
          </p>
        </div>
        <Link
          href="/dashboard/calendar"
          className="inline-flex items-center justify-center whitespace-nowrap bg-brand-dark hover:bg-brand text-white px-6 py-3 rounded-full font-semibold shadow-md shadow-brand-dark/15 transition-all"
        >
          Otwórz kalendarz
        </Link>
      </div>
    </div>
  );
}
