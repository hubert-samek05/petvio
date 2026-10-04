'use client';

import { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Phone, 
  MapPin, 
  Heart, 
  Thermometer, 
  Wind, 
  Bone, 
  Eye, 
  Stethoscope,
  ChevronLeft,
  ChevronRight,
  Clock,
  Navigation,
  PawPrint,
  BookOpen,
  CheckCircle2,
  XCircle,
  Info,
  Zap,
  Droplets,
  Activity,
  Shield,
  Syringe,
  Pill,
  Bug,
  Fish,
  Candy,
  Baby,
  Sparkles,
  Search,
  Filter,
  Crosshair,
  Loader2,
  Settings
} from 'lucide-react';

interface EmergencyProcedure {
  id: string;
  title: string;
  icon: any;
  category: 'critical' | 'urgent' | 'common' | 'injuries' | 'poisoning' | 'respiratory' | 'temperature';
  urgency: 'critical' | 'urgent' | 'moderate';
  symptoms: string[];
  steps: string[];
  donts: string[];
  duration: string;
  visualGuide?: string;
}

interface EmergencyClinic {
  id: string;
  name: string;
  address: string;
  phone: string;
  distance: number;
  is24h: boolean;
  coordinates: { lat: number; lng: number };
  services: string[];
}

export default function FirstAid() {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [nearbyClinics, setNearbyClinics] = useState<EmergencyClinic[]>([]);
  const [selectedProcedure, setSelectedProcedure] = useState<EmergencyProcedure | null>(null);
  const [activeTab, setActiveTab] = useState<'procedures' | 'clinics' | 'contacts'>('procedures');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [locating, setLocating] = useState(false);
  const [locationState, setLocationState] = useState<'idle' | 'denied' | 'granted' | 'unsupported'>('idle');

  const emergencyProcedures: EmergencyProcedure[] = [
    // Critical - Life Threatening
    {
      id: 'cpr',
      title: 'RKO - Resuscytacja',
      icon: Heart,
      category: 'critical',
      urgency: 'critical',
      symptoms: ['Brak oddechu', 'Brak pulsu', 'Nieprzytomność', 'Blade błony śluzowe'],
      steps: [
        'Sprawdź bezpieczeństwo otoczenia',
        'Ułóż zwierzę na boku na twardej powierzchni',
        'Rozszerz szyję, wyciągnij język do przodu',
        'Sprawdź oddech (patrz, słuchaj, czuj) przez 10 sekund',
        'Brak oddechu - rozpocznij RKO',
        'Dłonie na klatce piersiowej za łokciami',
        '30 uciśnięć (100-120/min) + 2 wdmuchi',
        'Zamknij pysk, dmuchaj przez nos',
        'Kontynuuj cykl 30:2 do przyjazdu pomocy',
        'Transportuj do lecznicy natychmiast'
      ],
      donts: ['Nie wkładaj palców w gardło', 'Nie podawaj leków doustnie', 'Nie wstrząsaj zwierzęciem', 'Każda sekunda liczy się'],
      duration: 'Natychmiastowe działanie',
      visualGuide: 'cpr'
    },
    {
      id: 'choking',
      title: 'Uduszenie',
      icon: Wind,
      category: 'respiratory',
      urgency: 'critical',
      symptoms: ['Głośne oddychanie', 'Świszczący oddech', 'Wystawienie języka', 'Panika', 'Niemoc połknięcia'],
      steps: [
        'Otwórz pysk, sprawdź widoczną blokadę',
        'Jeśli widoczny obiekt - usuń go bezpiecznie',
        'Manewr Heimlicha - małe zwierzęta: trzymaj za nogi, głową w dół, potrząśnij',
        'Manewr Heimlicha - duże zwierzęta: obejmij klatkę piersiowej, uciskaj w górę',
        'Uderz mocno między łopatki (5 razy)',
        'Sprawdź drogę oddechową po każdym manewrze',
        'Jeśli nie skutkuje - natychmiast do lecznicy'
      ],
      donts: ['Nie wkładaj palców w gardło na ślepo', 'Nie używaj szczypiec', 'Nie podawaj wody', 'Uduszenie = śmierć'],
      duration: 'Mniej niż 2 minuty',
      visualGuide: 'choking'
    },
    {
      id: 'overheating',
      title: 'Udar cieplny',
      icon: Thermometer,
      category: 'temperature',
      urgency: 'critical',
      symptoms: ['Nadmierne ślinienie', 'Szybkie płytkie oddychanie', 'Czerwone błony śluzowe', 'Drżenia mięśni', 'Temp > 40°C'],
      steps: [
        'Natychmiast przenieś w chłodne miejsce',
        'Zdejmij wszystkie akcesoria',
        'Ochładzaj letnią wodą (nie lodowatą!)',
        'Skup się na głowie, szyi, pachwinach',
        'Użyj wentylatora',
        'Monitoruj temperaturę co 5 minut',
        'Przestań ochładzać przy 39°C',
        'Podawaj małe ilości wody (jeśli przytomne)',
        'Transportuj do lecznicy'
      ],
      donts: ['Nie używaj lodu', 'Nie owijaj w mokre ręczniki', 'Nie zmuszaj do picia jeśli nieprzytomne'],
      duration: 'Do 15 minut',
      visualGuide: 'overheating'
    },
    {
      id: 'hypothermia',
      title: 'Hipotermia',
      icon: Thermometer,
      category: 'temperature',
      urgency: 'urgent',
      symptoms: ['Dreszcze', 'Słaby puls', 'Powolne oddychanie', 'Blade błony', 'Sztywność mięśni', 'Temp < 37°C'],
      steps: [
        'Przenieś do ciepłego suchego miejsca',
        'Owiń w ciepłe koce',
        'Użyj termoforów (ciepłe, nie gorące)',
        'Skup się na tułowiu',
        'Monitoruj temperaturę',
        'Podawaj ciepłe płyny (jeśli przytomne)',
        'Unikaj gwałtownego ogrzewania',
        'Transportuj do lecznicy'
      ],
      donts: ['Nie używaj gorącej wody', 'Nie masuj kończyn', 'Nie podawaj alkoholu'],
      duration: 'Stopniowe ogrzewanie',
      visualGuide: 'hypothermia'
    },
    {
      id: 'poisoning',
      title: 'Zatrucie',
      icon: AlertTriangle,
      category: 'poisoning',
      urgency: 'critical',
      symptoms: ['Wymioty', 'Biegunka', 'Niepokój', 'Drgawki', 'Ślinienie się', 'Nietypowy zapach'],
      steps: [
        'Zidentyfikuj truciznę',
        'Zadzwoń na linię weterynaryjną',
        'Nie wywołuj wymiotów (chyba że zaleci lekarz)',
        'Zbierz próbkę wymioców',
        'Zabierz opakowanie trucizny',
        'Transportuj do lecznicy natychmiast',
        'Informuj lekarza o wszystkim co zjadło'
      ],
      donts: ['Nie wywołuj wymiotów samodzielnie', 'Nie podawaj mleka', 'Nie czekaj na objawy'],
      duration: 'Natychmiastowa akcja',
      visualGuide: 'poisoning'
    },
    {
      id: 'seizures',
      title: 'Drgawki',
      icon: Zap,
      category: 'critical',
      urgency: 'urgent',
      symptoms: ['Drżenia ciała', 'Utrata przytomności', 'Sztywność mięśni', 'Ślinienie się', 'Niekontrolowane oddawanie moczu'],
      steps: [
        'Zachowaj spokój',
        'Usuń niebezpieczne przedmioty',
        'Nie wkładaj rąk do pyska',
        'Zmierz czas trwania napadu',
        'Ułóż zwierzę na boku',
        'Chroń głowę przed uderzeniem',
        'Po napadzie - utul zwierzę',
        'Transportuj jeśli napad > 5 min lub powtarza się'
      ],
      donts: ['Nie wkładaj nic do pyska', 'Nie trzymaj siłą', 'Nie polewaj wodą'],
      duration: 'Zazwyczaj 1-3 minuty',
      visualGuide: 'seizures'
    },
    {
      id: 'shock',
      title: 'Wstrząs',
      icon: Activity,
      category: 'critical',
      urgency: 'critical',
      symptoms: ['Blade błony śluzowe', 'Szybkie słabe puls', 'Zimne kończyny', 'Słabość', 'Szybkie oddychanie'],
      steps: [
        'Utrzymaj drogi oddechowe otwarte',
        'Ułóż zwierzę na boku',
        'Ogrzej zwierzę',
        'Transportuj do lecznicy natychmiast',
        'Nie podawaj nic doustnie',
        'Monitoruj parametry życiowe'
      ],
      donts: ['Nie podawaj doustnie', 'Nie zostawiaj samego', 'Nie czekaj'],
      duration: 'Natychmiastowe działanie',
      visualGuide: 'shock'
    },
    // Urgent
    {
      id: 'bleeding',
      title: 'Krwotok',
      icon: Droplets,
      category: 'injuries',
      urgency: 'urgent',
      symptoms: ['Obfite krwawienie', 'Bladość', 'Słabość', 'Szybkie bicie serca'],
      steps: [
        'Bezpośredni ucisk na ranę',
        'Użyj czystej gazy',
        'Jeśli nie ustaje - opaska uciskowa',
        'Opaska powyżej rany',
        'Zapisz czas założenia',
        'Poluzuj co 15-20 min na 1 min',
        'Transportuj natychmiast',
        'Utrzymaj spokój i ciepło'
      ],
      donts: ['Nie czyść rany głęboko', 'Nie stosuj środków drażniących', 'Nie usuń opatrunku'],
      duration: 'Natychmiastowa kontrola',
      visualGuide: 'bleeding'
    },
    {
      id: 'fracture',
      title: 'Złamanie',
      icon: Bone,
      category: 'injuries',
      urgency: 'urgent',
      symptoms: ['Nienaturalne ustawienie', 'Obrzęk', 'Ból', 'Niechęć do poruszania'],
      steps: [
        'Nie ruszaj złamanej kończyny',
        'Unieruchomienie (szyna)',
        'Użyj bandaża i sztywnego materiału',
        'Unieruchom stawy powyżej i poniżej',
        'Transportuj na tace lub w kocu',
        'Unikaj nacisku na kończynę',
        'Transportuj do lecznicy'
      ],
      donts: ['Nie prostuj kości', 'Nie masuj miejsca', 'Nie stosuj lodu bezpośrednio'],
      duration: 'Natychmiastowe unieruchomienie',
      visualGuide: 'fracture'
    },
    {
      id: 'eye-injury',
      title: 'Uraz oka',
      icon: Eye,
      category: 'injuries',
      urgency: 'urgent',
      symptoms: ['Zaczerwienienie', 'Zamknięcie powieki', 'Wyciek', 'Ocieranie oka'],
      steps: [
        'Nie dotykaj oka',
        'Zastosuj kołnierz',
        'Zabezpiecz przed drapaniem',
        'Nie płucz wodą (chyba że chemikalia)',
        'Transportuj natychmiast',
        'Czas jest kluczowy'
      ],
      donts: ['Nie dotykaj oka', 'Nie stosuj kropli', 'Nie próbuj usunąć ciała obcego'],
      duration: 'Natychmiastowa pomoc',
      visualGuide: 'eye'
    },
    {
      id: 'burns',
      title: 'Oparzenia',
      icon: Thermometer,
      category: 'injuries',
      urgency: 'urgent',
      symptoms: ['Czerwona skóra', 'Pęcherze', 'Ból', 'Obrzęk', 'Zniszczona sierść'],
      steps: [
        'Chłodź wodą (nie lodowatą!) przez 15-20 min',
        'Nie używaj lodu',
        'Nie nakładaj maści',
        'Oczyść ranę delikatnie',
        'Zastosuj sterylny opatrunek',
        'Transportuj do lecznicy'
      ],
      donts: ['Nie używaj lodu', 'Nie nakładaj maści', 'Nie przekłuwaj pęcherzy'],
      duration: 'Natychmiastowe chłodzenie',
      visualGuide: 'burns'
    },
    // Common
    {
      id: 'vomiting',
      title: 'Wymioty',
      icon: AlertTriangle,
      category: 'common',
      urgency: 'moderate',
      symptoms: ['Wymioty', 'Niechęć do jedzenia', 'Apatia', 'Ślinienie się'],
      steps: [
        'Zabierz jedzenie na 12-24h',
        'Podawaj małe ilości wody',
        'Obserwuj częstotliwość',
        'Jeśli > 24h - do lecznicy',
        'Zapisz co zjadło',
        'Transportuj jeśli inne objawy'
      ],
      donts: ['Nie zmuszaj do jedzenia', 'Nie podawaj leków bez konsultacji'],
      duration: 'Obserwacja 24h',
      visualGuide: 'vomiting'
    },
    {
      id: 'diarrhea',
      title: 'Biegunka',
      icon: AlertTriangle,
      category: 'common',
      urgency: 'moderate',
      symptoms: ['Ciekłe stolce', 'Częste wypróżnianie', 'Apatia', 'Utrata wagi'],
      steps: [
        'Dieta lekkostrawna',
        'Małe częste posiłki',
        'Dostarcz elektrolity',
        'Obserwuj konsystencję',
        'Jeśli > 48h - do lecznicy',
        'Transportuj jeśli krew'
      ],
      donts: ['Nie podawaj leków przeciwbiegunkowych', 'Nie zmieniaj diety gwałtownie'],
      duration: 'Obserwacja 48h',
      visualGuide: 'diarrhea'
    },
    {
      id: 'allergic-reaction',
      title: 'Reakcja alergiczna',
      icon: Shield,
      category: 'common',
      urgency: 'urgent',
      symptoms: ['Swędzenie', 'Opuchlizna', 'Czerwone plamy', 'Trudności w oddychaniu'],
      steps: [
        'Zidentyfikuj alergen',
        'Usuń źródło alergenu',
        'Chłodź opuchliznę',
        'Jeśli trudności w oddychaniu - RKO',
        'Transportuj do lecznicy',
        'Zapisz co zjadło/kontaktowało'
      ],
      donts: ['Nie podawaj leków bez konsultacji', 'Nie drapaj miejsca'],
      duration: 'Natychmiastowa akcja',
      visualGuide: 'allergy'
    },
    // Poisoning specific
    {
      id: 'chocolate',
      title: 'Zatrucie czekoladą',
      icon: Candy,
      category: 'poisoning',
      urgency: 'critical',
      symptoms: ['Wymioty', 'Drgawki', 'Szybkie bicie serca', 'Niepokój'],
      steps: [
        'Zidentyfikuj rodzaj i ilość czekolady',
        'Im ciemniejsza - bardziej toksyczna',
        'Transportuj do lecznicy natychmiast',
        'Zabierz opakowanie',
        'Nie wywołuj wymiotów bez konsultacji'
      ],
      donts: ['Nie czekaj na objawy', 'Czekolada jest toksyczna dla zwierząt'],
      duration: 'Natychmiastowa akcja',
      visualGuide: 'chocolate'
    },
    {
      id: 'grapes',
      title: 'Zatrucie winogronami',
      icon: Candy,
      category: 'poisoning',
      urgency: 'critical',
      symptoms: ['Wymioty', 'Biegunka', 'Apatia', 'Niewydolność nerek'],
      steps: [
        'Zidentyfikuj ilość',
        'Transportuj do lecznicy',
        'Winogrona/rodzynki są toksyczne',
        'Monitoruj parametry nerkowe'
      ],
      donts: ['Nie czekaj na objawy', 'Niewydolność nerek może być śmiertelna'],
      duration: 'Natychmiastowa akcja',
      visualGuide: 'grapes'
    },
    {
      id: 'xylitol',
      title: 'Zatrucie ksylitolem',
      icon: Candy,
      category: 'poisoning',
      urgency: 'critical',
      symptoms: ['Wymioty', 'Słabość', 'Drgawki', 'Hipoglikemia'],
      steps: [
        'Sprawdź etykiety gumy/cukierków',
        'Ksylitol jest bardzo toksyczny',
        'Transportuj natychmiast',
        'Monitoruj poziom glukozy'
      ],
      donts: ['Nie czekaj na objawy', 'Ksylitol powoduje hipoglikemię'],
      duration: 'Natychmiastowa akcja',
      visualGuide: 'xylitol'
    },
    {
      id: 'antifreeze',
      title: 'Zatrucie płynem chłodniczym',
      icon: Droplets,
      category: 'poisoning',
      urgency: 'critical',
      symptoms: ['Wymioty', 'Drgawki', 'Dyszenie', 'Nieprzytomność'],
      steps: [
        'Płyn chłodniczy jest śmiertelnie toksyczny',
        'Transportuj natychmiast',
        'Zidentyfikuj substancję',
        'Nie wywołuj wymiotów'
      ],
      donts: ['Nie czekaj - śmiertelne', 'Płyn chłodniczy = etylen glikol'],
      duration: 'Natychmiastowa akcja',
      visualGuide: 'antifreeze'
    },
    {
      id: 'medication',
      title: 'Zatrucie lekami',
      icon: Pill,
      category: 'poisoning',
      urgency: 'critical',
      symptoms: ['Zależne od leku', 'Wymioty', 'Drgawki', 'Nieprzytomność'],
      steps: [
        'Zidentyfikuj lek i dawkę',
        'Zabierz opakowanie',
        'Transportuj do lecznicy',
        'Nie wywołuj wymiotów',
        'Informuj lekarza o wszystkich lekach'
      ],
      donts: ['Nie podawaj żadnych leków', 'Nie czekaj na objawy'],
      duration: 'Natychmiastowa akcja',
      visualGuide: 'medication'
    },
    // Insect bites
    {
      id: 'bee-sting',
      title: 'Użądlenie pszczoły',
      icon: Bug,
      category: 'injuries',
      urgency: 'moderate',
      symptoms: ['Opuchlizna', 'Ból', 'Czerwoność', 'Reakcja alergiczna'],
      steps: [
        'Usuń żądło jeśli widoczne',
        'Zastosuj zimny okład',
        'Obserwuj reakcję alergiczną',
        'Jeśli reakcja alergiczna - do lecznicy',
        'Monitoruj oddychanie'
      ],
      donts: ['Nie wyciskaj żądła', 'Nie drapaj'],
      duration: 'Obserwacja 1-2h',
      visualGuide: 'bee'
    },
    {
      id: 'snake-bite',
      title: 'Ugryzienie węża',
      icon: Bug,
      category: 'injuries',
      urgency: 'critical',
      symptoms: ['Dwa ślady kłów', 'Opuchlizna', 'Ból', 'Drgawki', 'Nieprzytomność'],
      steps: [
        'Transportuj do lecznicy natychmiast',
        'Nie czyść rany',
        'Nie uciskaj',
        'Nie zastosuj opaski uciskowej',
        'Zidentyfikuj węża jeśli bezpiecznie',
        'Utrzymaj zwierzę w spokoju'
      ],
      donts: ['Nie czyść rany', 'Nie uciskaj', 'Nie stosuj opaski', 'Nie próbuj wyciągać jadu'],
      duration: 'Natychmiastowa akcja',
      visualGuide: 'snake'
    },
    // Respiratory
    {
      id: 'asthma',
      title: 'Napad astmy',
      icon: Wind,
      category: 'respiratory',
      urgency: 'urgent',
      symptoms: ['Duszność', 'Świszczący oddech', 'Szybkie oddychanie', 'Niepokój'],
      steps: [
        'Utrzymaj spokój',
        'Ułatwiaj oddychanie',
        'Transportuj do lecznicy',
        'Nie stresuj zwierzęcia',
        'Monitoruj saturację jeśli możliwe'
      ],
      donts: ['Nie stresuj', 'Nie zmuszaj do ruchu'],
      duration: 'Natychmiastowa akcja',
      visualGuide: 'asthma'
    },
    {
      id: 'pneumonia',
      title: 'Zapalenie płuc',
      icon: Wind,
      category: 'respiratory',
      urgency: 'urgent',
      symptoms: ['Kaszel', 'Duszność', 'Gorączka', 'Apatia', 'Niechęć do jedzenia'],
      steps: [
        'Transportuj do lecznicy',
        'Monitoruj temperaturę',
        'Utrzymaj ciepło',
        'Nie zmuszaj do ćwiczeń'
      ],
      donts: ['Nie zmuszaj do ruchu', 'Nie czekaj'],
      duration: 'Natychmiastowa akcja',
      visualGuide: 'pneumonia'
    },
    // Special
    {
      id: 'bloat',
      title: 'Skręt żołądka',
      icon: AlertTriangle,
      category: 'critical',
      urgency: 'critical',
      symptoms: ['Napuchnięty brzuch', 'Nieudane wymioty', 'Niepokój', 'Duszność'],
      steps: [
        'Transportuj do lecznicy natychmiast',
        'Skręt jest śmiertelny bez operacji',
        'Nie podawaj jedzenia/wody',
        'Nie zmuszaj do wymiotów',
        'Każda minuta liczy się'
      ],
      donts: ['Nie czekaj - śmiertelne', 'Nie podawaj jedzenia', 'Nie zmuszaj do wymiotów'],
      duration: 'Natychmiastowa akcja',
      visualGuide: 'bloat'
    },
    {
      id: 'dystocia',
      title: 'Trudny poród',
      icon: Baby,
      category: 'critical',
      urgency: 'critical',
      symptoms: ['Silne skurcze > 30 min', 'Szkarlatynowe wycieki', 'Zmęczenie samicy', 'Martwy płód'],
      steps: [
        'Transportuj do lecznicy natychmiast',
        'Nie ciągnij za płód',
        'Monitoruj temperaturę',
        'Zapisz czas trwania porodu'
      ],
      donts: ['Nie ciągnij za płód', 'Nie czekaj > 2h'],
      duration: 'Natychmiastowa akcja',
      visualGuide: 'dystocia'
    },
    {
      id: 'heatstroke-cats',
      title: 'Udar cieplny - koty',
      icon: Thermometer,
      category: 'temperature',
      urgency: 'critical',
      symptoms: ['Szybkie oddychanie', 'Ślinienie się', 'Czerwone błony', 'Nieprzytomność'],
      steps: [
        'Koty są bardzo wrażliwe na ciepło',
        'Natychmiast ochładzaj',
        'Transportuj do lecznicy',
        'Nie zostawiaj w samochodzie'
      ],
      donts: ['Nie zostawiaj w samochodzie', 'Nie używaj lodu'],
      duration: 'Natychmiastowa akcja',
      visualGuide: 'heatstroke-cats'
    },
    {
      id: 'fish-hook',
      title: 'Haczyk w ciele',
      icon: Fish,
      category: 'injuries',
      urgency: 'moderate',
      symptoms: ['Haczyk w skórze', 'Ból', 'Krwawienie'],
      steps: [
        'Nie ciągnij haczyka',
        'Transportuj do lecznicy',
        'Jeśli blisko powierzchni - można usunąć',
        'Zabezpiecz przed drapaniem'
      ],
      donts: ['Nie ciągnij haczyka', 'Nie próbuj wyciągać głęboko'],
      duration: 'Jak najszybciej',
      visualGuide: 'fishhook'
    }
  ];

  const veterinaryContacts = [
    { name: 'Całodobowa Klinika Weterynaryjna "Vet-24"', phone: '+48 22 123 45 67', address: 'Warszawa, ul. Medyczna 15', is24h: true },
    { name: 'Przychodnia Weterynaryjna "Zdrowe Zwierzę"', phone: '+48 22 234 56 78', address: 'Warszawa, ul. Kwiatowa 8', is24h: true },
    { name: 'Gabinet Weterynaryjny Dr. Kowalski', phone: '+48 22 345 67 89', address: 'Warszawa, ul. Leśna 23', is24h: false },
    { name: 'Klinika Weterynaryjna "Animed"', phone: '+48 22 456 78 90', address: 'Warszawa, ul. Zielona 45', is24h: true },
  ];

  const categories = [
    { id: 'all', name: 'Wszystkie', icon: Filter },
    { id: 'critical', name: 'Krytyczne', icon: AlertTriangle, color: 'red' },
    { id: 'respiratory', name: 'Oddechowe', icon: Wind, color: 'blue' },
    { id: 'temperature', name: 'Temperatura', icon: Thermometer, color: 'orange' },
    { id: 'poisoning', name: 'Zatrucia', icon: Pill, color: 'purple' },
    { id: 'injuries', name: 'Urazy', icon: Bone, color: 'green' },
    { id: 'common', name: 'Powszechne', icon: Shield, color: 'gray' },
  ];

  useEffect(() => {
    // Don't auto-request location - user must click button
    // Load default clinics without location
    findNearbyClinics(52.2297, 21.0122);
  }, []);

  const handleLocate = () => {
    if (!navigator.geolocation) {
      setLocationState('unsupported');
      return;
    }
    setLocating(true);
    setLocationState('idle');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });
        findNearbyClinics(pos.coords.latitude, pos.coords.longitude);
        setLocating(false);
        setLocationState('granted');
      },
      (error) => {
        setLocating(false);
        if (error.code === 1) {
          setLocationState('denied');
        } else if (error.code === 2) {
          setLocationState('unsupported');
        } else {
          setLocationState('denied');
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const clearLocation = () => {
    setUserLocation(null);
    setLocationState('idle');
    findNearbyClinics(52.2297, 21.0122);
  };

  const findNearbyClinics = (lat: number, lng: number) => {
    const mockClinics: EmergencyClinic[] = [
      {
        id: '1',
        name: 'Całodobowa Klinika Weterynaryjna "Vet-24"',
        address: 'ul. Medyczna 15, Warszawa',
        phone: '+48 22 123 45 67',
        distance: 2.3,
        is24h: true,
        coordinates: { lat: lat + 0.01, lng: lng + 0.01 },
        services: ['Chirurgia', 'Diagnostyka', 'Hospitalizacja', 'RTG', 'USG']
      },
      {
        id: '2',
        name: 'Przychodnia Weterynaryjna "Zdrowe Zwierzę"',
        address: 'ul. Kwiatowa 8, Warszawa',
        phone: '+48 22 234 56 78',
        distance: 3.8,
        is24h: true,
        coordinates: { lat: lat - 0.01, lng: lng + 0.02 },
        services: ['Chirurgia', 'Diagnostyka', 'Laboratorium']
      },
      {
        id: '3',
        name: 'Klinika Weterynaryjna "Animed"',
        address: 'ul. Zielona 45, Warszawa',
        phone: '+48 22 456 78 90',
        distance: 5.1,
        is24h: true,
        coordinates: { lat: lat + 0.02, lng: lng - 0.01 },
        services: ['Chirurgia', 'Diagnostyka', 'Hospitalizacja', 'RTG', 'USG', 'MRI', 'TK']
      }
    ];

    setNearbyClinics(mockClinics.sort((a, b) => a.distance - b.distance));
  };

  const handleCall = (number: string) => {
    window.location.href = `tel:${number}`;
  };

  const handleNavigate = (clinic: EmergencyClinic) => {
    if (userLocation) {
      const url = `https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${clinic.coordinates.lat},${clinic.coordinates.lng}`;
      window.open(url, '_blank');
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'bg-red-500';
      case 'urgent': return 'bg-amber-500';
      case 'moderate': return 'bg-brand-dark';
      default: return 'bg-gray-500';
    }
  };

  const getUrgencyLabel = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'Krytyczne';
      case 'urgent': return 'Pilne';
      case 'moderate': return 'Umiarkowane';
      default: return 'Standardowe';
    }
  };

  const filteredProcedures = emergencyProcedures.filter(proc => {
    const matchesCategory = selectedCategory === 'all' || proc.category === selectedCategory;
    const matchesSearch = searchQuery === '' || 
      proc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      proc.symptoms.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const renderVisualGuide = (guide: string) => {
    const guides: { [key: string]: JSX.Element } = {
      cpr: (
        <div className="bg-gray-100 rounded-xl p-4 mb-4">
          <div className="text-center mb-4">
            <div className="text-2xl font-bold text-brand-dark">30:2</div>
            <div className="text-sm text-gray-600">Uciśnięcia : Wdmuchi</div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-white p-3 rounded-lg">
              <div className="font-semibold text-gray-700 mb-1">Uciśnięcia</div>
              <div className="text-gray-600">100-120/min</div>
              <div className="text-gray-600">Za łokciami</div>
            </div>
            <div className="bg-white p-3 rounded-lg">
              <div className="font-semibold text-gray-700 mb-1">Wdmuchi</div>
              <div className="text-gray-600">Zamknij pysk</div>
              <div className="text-gray-600">Dmuchaj przez nos</div>
            </div>
          </div>
        </div>
      ),
      choking: (
        <div className="bg-gray-100 rounded-xl p-4 mb-4">
          <div className="text-center mb-4">
            <div className="text-lg font-bold text-brand-dark">Manewr Heimlicha</div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-white p-3 rounded-lg">
              <div className="font-semibold text-gray-700 mb-1">Małe zwierzęta</div>
              <div className="text-gray-600">Trzymaj za nogi</div>
              <div className="text-gray-600">Głową w dół</div>
              <div className="text-gray-600">Potrząśnij</div>
            </div>
            <div className="bg-white p-3 rounded-lg">
              <div className="font-semibold text-gray-700 mb-1">Duże zwierzęta</div>
              <div className="text-gray-600">Obejmij klatkę</div>
              <div className="text-gray-600">Uciskaj w górę</div>
              <div className="text-gray-600">5 uderzeń między łopatki</div>
            </div>
          </div>
        </div>
      ),
      overheating: (
        <div className="bg-gray-100 rounded-xl p-4 mb-4">
          <div className="text-center mb-4">
            <div className="text-lg font-bold text-red-600">STOPNE CZASOWE</div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 bg-white p-2 rounded">
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="w-4 h-4 text-red-600" />
              </div>
              <span className="text-gray-700">Nie używaj lodu</span>
            </div>
            <div className="flex items-center gap-2 bg-white p-2 rounded">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              </div>
              <span className="text-gray-700">Letnia woda</span>
            </div>
            <div className="flex items-center gap-2 bg-white p-2 rounded">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              </div>
              <span className="text-gray-700">Wentylator</span>
            </div>
          </div>
        </div>
      )
    };

    return guides[guide] || null;
  };

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
        {[
          { id: 'procedures', label: 'Procedury', icon: BookOpen },
          { id: 'clinics', label: 'Lecznice', icon: MapPin },
          { id: 'contacts', label: 'Kontakty', icon: Phone }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg font-medium text-sm transition-all ${
              activeTab === tab.id
                ? 'bg-white text-brand-dark shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {activeTab === 'procedures' && (
        <>
          {/* Search and Filter */}
          <div className="rounded-2xl bg-white border border-gray-200 p-3 sm:p-4">
            <div className="flex gap-3 mb-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Szukaj procedury..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-brand-dark/50"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
              {categories.map((cat) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                      selectedCategory === cat.id
                        ? 'bg-brand-dark text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Procedures Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredProcedures.map((procedure) => {
              const Icon = procedure.icon;
              const isSelected = selectedProcedure?.id === procedure.id;
              
              return (
                <div
                  key={procedure.id}
                  className={`rounded-xl border-2 overflow-hidden transition-all cursor-pointer ${
                    isSelected
                      ? 'border-brand-dark bg-brand-dark/5'
                      : 'border-gray-200 hover:border-brand-dark/50 bg-white'
                  }`}
                  onClick={() => setSelectedProcedure(isSelected ? null : procedure)}
                >
                  <div className="p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className={`w-10 h-10 rounded-xl ${getUrgencyColor(procedure.urgency)} flex items-center justify-center`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        procedure.urgency === 'critical' ? 'bg-red-100 text-red-700' :
                        procedure.urgency === 'urgent' ? 'bg-amber-100 text-amber-700' :
                        'bg-brand-light text-brand-dark'
                      }`}>
                        {getUrgencyLabel(procedure.urgency)}
                      </span>
                    </div>
                    <h4 className="font-semibold text-gray-900 mb-1 text-sm">{procedure.title}</h4>
                    <p className="text-xs text-gray-500">{procedure.duration}</p>
                  </div>

                  {isSelected && (
                    <div className="border-t border-gray-200 p-3 bg-gray-50">
                      {procedure.visualGuide && renderVisualGuide(procedure.visualGuide)}
                      
                      <div className="mb-3">
                        <div className="text-xs font-semibold text-gray-700 mb-2">Objawy:</div>
                        <div className="flex flex-wrap gap-1">
                          {procedure.symptoms.map((symptom, index) => (
                            <span key={index} className="px-2 py-0.5 bg-red-50 text-red-700 text-xs rounded-full">
                              {symptom}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="mb-3">
                        <div className="text-xs font-semibold text-gray-700 mb-2">Kroki postępowania:</div>
                        <ol className="text-xs text-gray-600 space-y-1">
                          {procedure.steps.map((step, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <span className="flex-shrink-0 w-4 h-4 rounded-full bg-brand-dark text-white text-xs flex items-center justify-center">
                                {index + 1}
                              </span>
                              {step}
                            </li>
                          ))}
                        </ol>
                      </div>

                      <div className="mb-3">
                        <div className="text-xs font-semibold text-red-700 mb-2">Czego NIE robić:</div>
                        <ul className="text-xs text-red-600 space-y-1">
                          {procedure.donts.map((dont, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <XCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                              {dont}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCall(veterinaryContacts[0].phone);
                          }}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-brand-dark text-white text-xs font-medium hover:bg-brand-dark transition-all"
                        >
                          <Phone className="w-3 h-3" />
                          Zadzwoń
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProcedure(null);
                          }}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-gray-200 text-gray-700 text-xs font-medium hover:bg-gray-300 transition-all"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          Zamknij
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {activeTab === 'clinics' && (
        <div className="space-y-3">
          <div className="rounded-2xl bg-white border border-gray-200 p-3 sm:p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-brand-dark" />
                <h3 className="text-base font-semibold text-gray-900">Najbliższe lecznice 24/7</h3>
              </div>
            </div>

            <button
              onClick={handleLocate}
              disabled={locating}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-dark text-white font-medium text-xs sm:text-sm hover:bg-[#173a4a] transition-all disabled:opacity-50"
            >
              {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crosshair className="w-4 h-4" />}
              {userLocation ? 'Zaktualizuj lokalizację' : 'Znajdź blisko mnie'}
            </button>
          </div>

          {locationState === 'denied' && !userLocation && (
            <div className="rounded-2xl bg-amber-50 border border-amber-100 p-3 sm:p-4 flex flex-col sm:flex-row sm:items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                <Settings className="w-4 h-4 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs sm:text-sm font-semibold text-amber-800">Brak dostępu do lokalizacji</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Aby wyszukać po okolicy, włącz lokalizację w ustawieniach przeglądarki, a następnie kliknij "Spróbuj ponownie".
                </p>
              </div>
              <button
                onClick={handleLocate}
                className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-amber-600 text-white text-xs font-medium hover:bg-amber-700 transition-all flex-shrink-0"
              >
                <Crosshair className="w-3 h-3" /> Spróbuj ponownie
              </button>
            </div>
          )}

          {locationState === 'unsupported' && (
            <div className="rounded-2xl bg-gray-50 border border-gray-200 p-3 text-xs text-gray-600">
              Twoja przeglądarka nie obsługuje geolokalizacji.
            </div>
          )}

          {userLocation && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 rounded-2xl bg-brand-dark/10 px-3 sm:px-4 py-2.5 text-xs sm:text-sm text-brand-dark">
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4" />
                <span className="font-medium">Lokalizacja włączona: znaleziono {nearbyClinics.length} lecznic w okolicy</span>
              </div>
              <button onClick={clearLocation} className="text-xs text-brand-dark underline hover:text-brand-dark sm:ml-auto">
                Wyłącz lokalizację
              </button>
            </div>
          )}

          <div className="rounded-2xl bg-white border border-gray-200 p-3 sm:p-4">
            {nearbyClinics.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MapPin className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Szukanie lecznic w pobliżu...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {nearbyClinics.map((clinic) => (
                  <div
                    key={clinic.id}
                    className="p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-all"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-900 text-sm truncate">{clinic.name}</h4>
                          {clinic.is24h && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full flex-shrink-0">
                              24/7
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-600 mb-1 truncate">{clinic.address}</div>
                        <div className="text-xs text-gray-500 mb-2">{clinic.phone}</div>
                        <div className="flex flex-wrap gap-1">
                          {clinic.services.slice(0, 3).map((service, index) => (
                            <span key={index} className="px-2 py-0.5 bg-brand-dark/10 text-brand-dark text-xs rounded-full">
                              {service}
                            </span>
                          ))}
                          {clinic.services.length > 3 && (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                              +{clinic.services.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right ml-2 flex-shrink-0">
                        <div className="font-semibold text-brand-dark text-sm">{clinic.distance} km</div>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => handleCall(clinic.phone)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-brand-dark text-white text-xs font-medium hover:bg-brand-dark transition-all"
                      >
                        <Phone className="w-3 h-3" />
                        Zadzwoń
                      </button>
                      <button
                        onClick={() => handleNavigate(clinic)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-gray-200 text-gray-700 text-xs font-medium hover:bg-gray-300 transition-all"
                      >
                        <Navigation className="w-3 h-3" />
                        Nawiguj
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'contacts' && (
        <div className="rounded-2xl bg-white border border-gray-200 p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-3">
            <Phone className="w-4 h-4 text-brand-dark" />
            <h3 className="text-base font-semibold text-gray-900">Kontakty weterynaryjne</h3>
          </div>

          <div className="space-y-3">
            {veterinaryContacts.map((contact, index) => (
              <div
                key={index}
                className="p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-gray-900 text-sm truncate">{contact.name}</h4>
                      {contact.is24h && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full flex-shrink-0">
                          24/7
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-600 mb-1 truncate">{contact.address}</div>
                    <div className="text-xs text-gray-500">{contact.phone}</div>
                  </div>
                </div>
                <button
                  onClick={() => handleCall(contact.phone)}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-brand-dark text-white text-xs font-medium hover:bg-brand-dark transition-all"
                >
                  <Phone className="w-3 h-3" />
                  Zadzwoń
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Important Notice */}
      <div className="rounded-2xl bg-amber-50 border-2 border-amber-200 p-3 sm:p-4">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-semibold text-amber-900 mb-1 text-sm">Ważna informacja</h4>
            <p className="text-xs text-amber-800">
              Ten przewodnik ma charakter informacyjny i nie zastępuje profesjonalnej pomocy weterynaryjnej. 
              W sytuacjach zagrożenia życia zawsze skontaktuj się z najbliższą lecznicą weterynaryjną. 
              Szybkość działania jest kluczowa dla ratowania życia zwierzęcia.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
