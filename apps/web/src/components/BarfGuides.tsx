'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ChevronDown,
  BookOpen,
  ShieldCheck,
  Scale,
  Pill,
  Baby,
  HeartPulse,
  ArrowRight,
} from 'lucide-react';

interface GuideSection {
  heading: string;
  content: string;
}

interface Guide {
  id: string;
  title: string;
  icon: any;
  readTime: string;
  summary: string;
  sections: GuideSection[];
  ctaHref?: string;
  ctaLabel?: string;
  ctaCalculator?: boolean; // CTA otwiera Kalkulator BARF w tej samej zakładce
}

const guides: Guide[] = [
  {
    id: 'start',
    title: 'Jak bezpiecznie zacząć dietę BARF',
    icon: BookOpen,
    readTime: '5 min',
    summary: 'Krok po kroku: jak przejść z gotowej karmy na dietę BARF bez problemów żołądkowych.',
    sections: [
      {
        heading: 'Przejście stopniowe',
        content:
          'Nie zmieniaj diety z dnia na dzień. Wprowadzaj BARF stopniowo przez 7–14 dni, zaczynając od 20–25% nowego pokarmu wymieszanego ze starą karmą, zwiększając udział co 2–3 dni.',
      },
      {
        heading: 'Pierwszy tydzień',
        content:
          'Zacznij od jednego rodzaju mięsa (np. kurczak) bez kości, aby zaobserwować reakcję układu pokarmowego. Dodawaj kości mięsno-kostne po adaptacji do samego mięsa.',
      },
      {
        heading: 'Obserwacja zwierzęcia',
        content:
          'Zwracaj uwagę na konsystencję kału (może być twardszy niż na karmie suchej – to normalne przy BARF), apetyt i energię. Biegunka lub wymioty przez pierwsze dni mogą oznaczać zbyt szybkie tempo przejścia.',
      },
      {
        heading: 'Higiena od pierwszego dnia',
        content:
          'Surowe mięso wymaga odpowiedniej higieny – osobne naczynia, dokładne mycie rąk i powierzchni, przechowywanie w lodówce maks. 2 dni lub zamrażanie porcji.',
      },
    ],
  },
  {
    id: 'ratios',
    title: 'Proporcje BARF – modele 80/10/10 i inne',
    icon: Scale,
    readTime: '6 min',
    summary: 'Wyjaśnienie najpopularniejszych modeli proporcji i kiedy stosować który z nich.',
    sections: [
      {
        heading: 'Model standardowy 80/10/10',
        content:
          '80% mięso mięśniowe, 10% kości mięsno-kostne, 5% wątroba, 5% inne narządy. Podstawowy model dla zdrowych, dorosłych, aktywnych zwierząt bez dodatku warzyw.',
      },
      {
        heading: 'Model zmodyfikowany (z warzywami)',
        content:
          '70% mięso, 10% kości, 5% wątroba, 5% inne narządy, 10% warzywa/owoce. Popularny wśród opiekunów, którzy chcą wzbogacić dietę o błonnik i dodatkowe witaminy — szczególnie u psów mniej aktywnych.',
      },
      {
        heading: 'Model lekki dla seniora',
        content:
          '75% mięso, 10% kości, 5% wątroba, 5% narządy, 5% warzywa — z niższą całkowitą kalorycznością (mniejszy % masy ciała dziennie), dopasowany do zmniejszonego metabolizmu seniorów.',
      },
      {
        heading: 'Kości mięsno-kostne — na co uważać',
        content:
          'Zawsze surowe, nigdy gotowane (gotowane kości łatwo się rozłupują i mogą uszkodzić przełyk lub jelita). Wielkość kości powinna być dopasowana do rozmiaru zwierzęcia.',
      },
    ],
  },
  {
    id: 'hygiene',
    title: 'Higiena i bezpieczeństwo żywieniowe',
    icon: ShieldCheck,
    readTime: '4 min',
    summary: 'Zasady bezpiecznego przechowywania i podawania surowego mięsa.',
    sections: [
      {
        heading: 'Przechowywanie',
        content:
          'Surowe mięso przechowuj w lodówce maksymalnie 1-2 dni. Porcje na kolejne dni zamroź i rozmrażaj w lodówce, nigdy w temperaturze pokojowej.',
      },
      {
        heading: 'Naczynia i powierzchnie',
        content:
          'Używaj osobnych misek i desek do krojenia dla surowego mięsa zwierzęcego. Dokładnie myj gorącą wodą z detergentem po każdym kontakcie.',
      },
      {
        heading: 'Bezpieczeństwo domowników',
        content:
          'Szczególną ostrożność zachowaj przy dzieciach, osobach starszych i z obniżoną odpornością – ryzyko przenoszenia bakterii (Salmonella, Campylobacter) jest wyższe przy kontakcie z surowym mięsem.',
      },
      {
        heading: 'Czas podawania',
        content:
          'Nie zostawiaj surowego mięsa na dłużej niż 20-30 minut w misce w temperaturze pokojowej — usuń niezjedzone resztki.',
      },
    ],
  },
  {
    id: 'supplements',
    title: 'Suplementacja w diecie BARF',
    icon: Pill,
    readTime: '5 min',
    summary: 'Jakie suplementy warto rozważyć i dlaczego dieta BARF ich potrzebuje.',
    sections: [
      {
        heading: 'Dlaczego suplementacja jest ważna',
        content:
          'Nawet dobrze zbilansowana dieta BARF może mieć niedobory niektórych mikroelementów (np. jod, witamina D, kwasy omega-3), których nie dostarczy samo mięso i kości.',
      },
      {
        heading: 'Kluczowe suplementy',
        content:
          'Olej z ryb (omega-3 EPA/DHA) na skórę i stawy, algi/spirulina jako źródło jodu, zmielone skorupki jaj jako alternatywne źródło wapnia, drożdże piwne na witaminy z grupy B.',
      },
      {
        heading: 'Dawkowanie',
        content:
          'Zawsze zaczynaj od niższych dawek i zwiększaj stopniowo. W Kalkulatorze BARF możesz wybrać suplementy z bazy lub dodać własne z indywidualną dawką i notatką.',
      },
      {
        heading: 'Kiedy skonsultować się z weterynarzem',
        content:
          'Przy suplementacji witamin rozpuszczalnych w tłuszczach (A, D, E, K) zawsze konsultuj dawki z weterynarzem – ich nadmiar może być szkodliwy.',
      },
    ],
    ctaCalculator: true,
    ctaLabel: 'Dodaj suplementy w Kalkulatorze BARF',
  },
  {
    id: 'growth',
    title: 'BARF dla szczeniąt i kociąt',
    icon: Baby,
    readTime: '5 min',
    summary: 'Na co zwrócić szczególną uwagę przy diecie BARF u zwierząt w okresie wzrostu.',
    sections: [
      {
        heading: 'Wapń i fosfor',
        content:
          'Prawidłowy balans wapnia i fosforu jest krytyczny dla rozwoju szkieletu, szczególnie u szczeniąt dużych ras. Nadmiar lub niedobór wapnia może prowadzić do wad kostnych.',
      },
      {
        heading: 'Częstsze, mniejsze posiłki',
        content:
          'Szczenięta i kocięta powinny jeść częściej niż dorosłe zwierzęta – zazwyczaj 3-4 posiłki dziennie, dopasowane do etapu wzrostu.',
      },
      {
        heading: 'Duże rasy psów – szczególna uwaga',
        content:
          'Szczenięta dużych i gigantycznych ras rosną bardzo szybko i są bardziej narażone na choroby stawów przy nieprawidłowej diecie. Skonsultuj proporcje z weterynarzem żywieniowym.',
      },
      {
        heading: 'Aktywność w kalkulatorze',
        content:
          'W Kalkulatorze BARF wybierz poziom aktywności „Szczenię / kocię (wzrost)”, aby uzyskać wyższy % masy ciała dziennie odpowiedni dla intensywnego wzrostu.',
      },
    ],
    ctaCalculator: true,
    ctaLabel: 'Przejdź do Kalkulatora BARF',
  },
  {
    id: 'chronic',
    title: 'BARF a choroby przewlekłe',
    icon: HeartPulse,
    readTime: '5 min',
    summary: 'Kiedy dieta BARF wymaga szczególnej ostrożności lub konsultacji weterynaryjnej.',
    sections: [
      {
        heading: 'Choroby nerek',
        content:
          'Standardowa dieta BARF z wysoką zawartością białka i fosforu może obciążać nerki. Zwierzęta z chorobą nerek wymagają zmodyfikowanych proporcji i częstszych badań kontrolnych.',
      },
      {
        heading: 'Cukrzyca',
        content:
          'Regularność posiłków i kontrola kaloryczności są kluczowe. Unikaj owoców o wysokim indeksie glikemicznym w diecie BARF u zwierząt cukrzycowych.',
      },
      {
        heading: 'Alergie i nietolerancje pokarmowe',
        content:
          'Dieta BARF ułatwia eliminację konkretnych alergenów (np. kurczaka) poprzez pełną kontrolę składu posiłku – warto jednak wprowadzać nowe białka jedno po drugim.',
      },
      {
        heading: 'Sprawdź swoje diety specjalistyczne',
        content:
          'Jeśli Twoje zwierzę ma aktywną dietę specjalistyczną (nerkowa, cukrzycowa, alergia, redukcja masy), Kalkulator BARF wyświetli automatyczne ostrzeżenie o możliwym konflikcie.',
      },
    ],
    ctaHref: '/dashboard/special-diets',
    ctaLabel: 'Zobacz Diety specjalistyczne',
  },
];

export default function BarfGuides({ onGoCalculator }: { onGoCalculator?: () => void }) {
  const [openId, setOpenId] = useState<string | null>(guides[0]?.id || null);

  return (
    <div className="space-y-4">
      {guides.map((guide) => {
        const Icon = guide.icon;
        const isOpen = openId === guide.id;
        return (
          <div key={guide.id} className="pv-card overflow-hidden">
            <button
              onClick={() => setOpenId(isOpen ? null : guide.id)}
              className="w-full flex items-center gap-4 p-5 text-left hover:bg-brand-mint/60 transition-all"
            >
              <div className="w-11 h-11 rounded-xl bg-brand-mint flex items-center justify-center text-brand-dark flex-shrink-0">
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{guide.title}</h3>
                <p className="text-sm text-gray-500">{guide.summary}</p>
              </div>
              <span className="text-xs text-gray-400 flex-shrink-0 hidden sm:inline">{guide.readTime} czytania</span>
              <ChevronDown className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
              <div className="px-5 pb-5 space-y-4 border-t border-gray-100 pt-4">
                {guide.sections.map((section, idx) => (
                  <div key={idx}>
                    <h4 className="text-sm font-semibold text-gray-800 mb-1">{section.heading}</h4>
                    <p className="text-sm text-gray-600 leading-relaxed">{section.content}</p>
                  </div>
                ))}
                {guide.ctaCalculator && onGoCalculator ? (
                  <button
                    onClick={onGoCalculator}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-dark hover:underline pt-1"
                  >
                    {guide.ctaLabel} <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : guide.ctaHref ? (
                  <Link
                    href={guide.ctaHref}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-dark hover:underline pt-1"
                  >
                    {guide.ctaLabel} <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                ) : null}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
