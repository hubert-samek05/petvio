# Petvio - Kompleksowa Aplikacja dla Właścicieli Zwierząt

## Opis projektu

Petvio to zaawansowana aplikacja mobilna i webowa stworzona dla właścicieli psów i kotów. Aplikacja oferuje szeroki zakres funkcji związanych ze zdrowiem, dietetyką, treningiem i codzienną opieką nad zwierzętami.

## Główne funkcje

### Zdrowie
- Książeczka zdrowia (szczepienia, wizyty, leki, dokumenty)
- Kalendarz zdrowia i terminarz
- Leczenie i pierwsza pomoc
- Ziołolecznictwo
- Analiza wyników badań krwi

### Dietetyka
- Skaner karm z analizą AI
- Kalkulator kalorii
- Dziennik karmienia + planer posiłków
- Diety specjalistyczne
- Przepisy społeczności
- Baza BARF + kalkulator

### Specjaliści
- Wyszukiwarka behawiorystów/trenerów
- Wyszukiwarka weterynarzy/dietetyków
- Wyszukiwarka hoteli dla psów/petsitterów

### Trening i Aktywność
- Tracker spacerów z GPS
- Mapa miejsc przyjaznych dla psów
- Noclegi i wakacje z psem

### Behawiorystyka
- Analiza zachowań
- Porady AI
- Trening psa (komendy, posłuszeństwo)

### Inne
- Dziennik pupila + foto dziennik
- Budżet domowy
- Lista zakupów
- Rozród
- Forum
- Blog edukacyjny
- Adopcje
- Pet Alert (zaginione zwierzęta)
- Pogoda z ostrzeżeniami
- Sklep z akcesoriami

## Technologie

### Backend
- Node.js + Express
- PostgreSQL
- JWT Authentication
- PM2

### Frontend
- Next.js 14
- React
- TypeScript
- TailwindCSS
- shadcn/ui
- Lucide Icons

### Mobile
- React Native (planowane)

## Struktura projektu

```
petvio/
├── apps/
│   ├── api/          # Backend API
│   └── web/          # Frontend Next.js
├── packages/         # Współdzielone pakiety
└── docs/            # Dokumentacja
```

## Instalacja

```bash
npm install
```

## Uruchomienie (development)

```bash
npm run dev
```

## Uruchomienie (production)

```bash
npm run build
npm start
```

## Autor

Petvio Team © 2026
