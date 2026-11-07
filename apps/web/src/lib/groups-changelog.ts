// Historia aktualizacji zakładki Grupy — dopisuj nowe wydania na początku listy.
// Wersja w formacie 'YYYY-MM-DD' (unikalna) — na jej podstawie liczony jest badge "Co nowego?".
export interface GroupsRelease {
  version: string;
  date: string;
  title: string;
  items: string[];
}

export const GROUPS_CHANGELOG: GroupsRelease[] = [
  {
    version: '2025-01-tickets',
    date: 'Styczeń 2025',
    title: 'Wydarzenia z biletami',
    items: [
      'Wydarzenia biletowane — przy tworzeniu ustawisz pulę biletów, cenę i informacje o odbiorze',
      'Rezerwacja biletów jednym kliknięciem (1–5 sztuk), pula pilnowana po stronie serwera',
      'Zwrot biletu — możesz oddać zarezerwowane miejsca',
      'Nowy przycisk „Co nowego?" — tutaj znajdziesz listę wszystkich aktualizacji grup',
    ],
  },
  {
    version: '2024-12-events',
    date: 'Grudzień 2024',
    title: 'Wydarzenia, ankiety i konkursy',
    items: [
      'Wydarzenia grupowe z datą, miejscem, okładką i odpowiedziami (Wezmę udział / Zainteresowany / Nie mogę)',
      'Ankiety z głosowaniem i terminami zakończenia',
      'Konkursy ze zgłoszeniami i wyborem zwycięzcy przez moderatora',
      'Poczekalnia postów i role członków (moderatorzy)',
    ],
  },
];

export const LATEST_GROUPS_VERSION = GROUPS_CHANGELOG[0]?.version || '';
