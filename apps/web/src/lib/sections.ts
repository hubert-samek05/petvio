export type AppSection = { href: string; label: string; keywords?: string };

export const APP_SECTIONS: AppSection[] = [
  { href: '/dashboard', label: 'Panel główny', keywords: 'pulpit start home' },
  { href: '/dashboard/pets', label: 'Moje zwierzęta', keywords: 'pies kot pupil profil zwierzaki' },
  { href: '/dashboard/pets/new', label: 'Dodaj zwierzę', keywords: 'nowy pupil dodaj profil' },
  { href: '/dashboard/shop', label: 'Sklep', keywords: 'zakupy karma produkty' },
  { href: '/dashboard/health', label: 'Książeczka zdrowia', keywords: 'zdrowie szczepienia wizyty leki weterynarz odrobaczanie' },
  { href: '/dashboard/calendar', label: 'Kalendarz', keywords: 'przypomnienia terminy wydarzenia' },
  { href: '/dashboard/blood-analysis', label: 'Analiza badań krwi', keywords: 'badania krew wyniki' },
  { href: '/dashboard/first-aid', label: 'Pierwsza pomoc', keywords: 'ratunek zatrucie uraz' },
  { href: '/dashboard/herbal-medicine', label: 'Ziołolecznictwo', keywords: 'zioła naturalne' },
  { href: '/dashboard/food-scanner', label: 'Skaner karm', keywords: 'karma skład kod kreskowy' },
  { href: '/dashboard/calorie-calculator', label: 'Kalkulator kalorii', keywords: 'dieta kalorie porcja' },
  { href: '/dashboard/feeding-log', label: 'Dziennik karmienia', keywords: 'posiłki jedzenie' },
  { href: '/dashboard/special-diets', label: 'Diety specjalistyczne', keywords: 'dieta choroba' },
  { href: '/dashboard/sport-diets', label: 'Dietetyka sportowa', keywords: 'dieta aktywność' },
  { href: '/dashboard/recipes', label: 'Przepisy', keywords: 'gotowanie jedzenie' },
  { href: '/dashboard/barf', label: 'Baza BARF', keywords: 'dieta surowa' },
  { href: '/dashboard/specialists', label: 'Behawiorysta, trener', keywords: 'specjalista szkolenie zachowanie' },
  { href: '/dashboard/vets', label: 'Weterynarz / dietetyk', keywords: 'lekarz klinika' },
  { href: '/dashboard/hotels-petsitters', label: 'Hotel / petsitter', keywords: 'opieka wyjazd' },
  { href: '/dashboard/walk-tracker', label: 'Spacer', keywords: 'trasa gps spacery' },
  { href: '/dashboard/activity', label: 'Aktywność', keywords: 'ruch' },
  { href: '/dashboard/statistics', label: 'Statystyki', keywords: 'wykresy' },
  { href: '/dashboard/budget', label: 'Budżet', keywords: 'wydatki koszty pieniądze' },
  { href: '/dashboard/inventory', label: 'Zapasy', keywords: 'magazyn karma zapas' },
  { href: '/dashboard/shopping-list', label: 'Lista zakupów', keywords: 'zakupy' },
  { href: '/dashboard/ai-assistant', label: 'AI Asystent', keywords: 'pomoc czat sztuczna inteligencja' },
  { href: '/dashboard/lost-pets', label: 'Zaginione', keywords: 'zaginął zguba' },
  { href: '/dashboard/adoptions', label: 'Adopcje', keywords: 'adopcja schronisko' },
  { href: '/dashboard/sharing', label: 'Współdzielenie', keywords: 'udostępnij opiekun' },
  { href: '/dashboard/community', label: 'PetvioBook', keywords: 'społeczność posty znajomi' },
  { href: '/dashboard/messages', label: 'Messenger', keywords: 'wiadomości czat' },
  { href: '/dashboard/groups', label: 'Grupy', keywords: 'społeczność' },
  { href: '/dashboard/forum', label: 'Forum', keywords: 'dyskusja pytania' },
  { href: '/dashboard/breeding', label: 'Rozród', keywords: 'hodowla szczenięta mioty' },
  { href: '/dashboard/profile', label: 'Profil', keywords: 'konto ustawienia hasło usuń konto' },
];

const normalize = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ł/g, 'l');

export function searchSections(term: string, limit = 6): AppSection[] {
  const q = normalize(term.trim());
  if (!q) return [];
  const words = q.split(/\s+/);
  return APP_SECTIONS
    .map((s) => {
      const label = normalize(s.label);
      const hay = `${label} ${normalize(s.keywords || '')}`;
      if (!words.every((w) => hay.includes(w))) return null;
      return { s, score: label.startsWith(q) ? 0 : label.includes(q) ? 1 : 2 };
    })
    .filter((x): x is { s: AppSection; score: number } => x !== null)
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map((x) => x.s);
}
