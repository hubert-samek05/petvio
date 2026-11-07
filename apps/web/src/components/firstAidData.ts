import {
  AlertTriangle, Heart, Thermometer, Wind, Bone, Eye, Zap, Droplets,
  Activity, Shield, Pill, Bug, Fish, Candy, Baby, Filter,
} from 'lucide-react';

export interface EmergencyProcedure {
  id: string;
  title: string;
  icon: any;
  category: 'critical' | 'common' | 'injuries' | 'poisoning' | 'respiratory' | 'temperature';
  urgency: 'critical' | 'urgent' | 'moderate';
  symptoms: string[];
  steps: string[];
  donts: string[];
  duration: string;
  timer?: boolean;
  metronome?: boolean;
  sizeHint?: boolean;
}

export interface EmergencyClinic {
  id: string;
  name: string;
  address: string;
  phone: string;
  distance: number;
  is24h: boolean;
  hours: string;
  coordinates: { lat: number; lng: number };
  services: string[];
  osmType?: string;
  osmId?: string;
  emergency?: boolean;
}

export const PROCEDURES: EmergencyProcedure[] = [
  { id: 'cpr', title: 'RKO — resuscytacja', icon: Heart, category: 'critical', urgency: 'critical', timer: true, metronome: true, sizeHint: true,
    symptoms: ['Brak oddechu', 'Brak pulsu', 'Nieprzytomność', 'Blade błony śluzowe'],
    steps: ['Sprawdź bezpieczeństwo otoczenia', 'Ułóż zwierzę na prawym boku na twardej powierzchni', 'Wyciągnij szyję, wysuń język do przodu', 'Sprawdź oddech (patrz, słuchaj, czuj) przez max 10 s', 'Brak oddechu — rozpocznij RKO', 'Dłonie na klatce piersiowej za łokciem (małe zwierzęta — jedna dłoń)', '30 uciśnięć w rytmie 100–120/min (użyj metronomu poniżej)', 'Zamknij pysk, 2 wdmuchy przez nos — klatka powinna się unieść', 'Kontynuuj cykle 30:2 bez przerwy', 'Co 2 min sprawdź oddech i tętno', 'Transportuj do lecznicy nawet jeśli odzyska oddech'],
    donts: ['Nie wkładaj palców w gardło', 'Nie podawaj nic doustnie', 'Nie przerywaj uciśnięć dłużej niż 10 s', 'Każda sekunda się liczy'],
    duration: 'Działaj natychmiast' },
  { id: 'choking', title: 'Zadławienie', icon: Wind, category: 'respiratory', urgency: 'critical', sizeHint: true,
    symptoms: ['Głośny, świszczący oddech', 'Wystawiony język', 'Panika', 'Nie może połknąć', 'Sine błony śluzowe'],
    steps: ['Otwórz pysk i sprawdź, czy widać blokadę', 'Widoczny, luźny obiekt — usuń delikatnie', 'Małe zwierzęta: unieś za tylne łapy głową w dół, potrząśnij', 'Duże zwierzęta: obejmij od tyłu klatkę, uciskaj ku górze', 'Uderz 5 razy mocno między łopatki', 'Sprawdzaj drogę oddechową po każdej próbie', 'Jeśli bez skutku — jedź do lecznicy'],
    donts: ['Nie wkładaj palców w gardło na ślepo', 'Nie używaj szczypiec', 'Nie podawaj wody', 'Zadławienie = minuty'],
    duration: 'Mniej niż 2 minuty' },
  { id: 'overheating', title: 'Udar cieplny', icon: Thermometer, category: 'temperature', urgency: 'critical', timer: true,
    symptoms: ['Szybkie, płytkie oddychanie', 'Nadmierne ślinienie', 'Czerwone błony śluzowe', 'Drżenie mięśni', 'Temperatura > 40°C'],
    steps: ['Natychmiast przenieś w chłód/cień', 'Zdejmij obrożę, kaganiec, ubranko', 'Ochładzaj LETNIĄ wodą (nie lodowatą!)', 'Mokruj głowę, szyję, pachwiny, łapy', 'Włącz wentylator', 'Mierz temperaturę co 5 minut', 'Przestań chłodzić przy 39°C', 'Daj mało wody — tylko jeśli przytomne', 'Transportuj do lecznicy'],
    donts: ['Nie używaj lodu ani lodowatej wody', 'Nie owijaj w mokre ręczniki', 'Nie zmuszaj nieprzytomnego do picia'],
    duration: 'Do 15 minut' },
  { id: 'hypothermia', title: 'Wychłodzenie (hipotermia)', icon: Thermometer, category: 'temperature', urgency: 'urgent', timer: true,
    symptoms: ['Dreszcze', 'Słaby puls', 'Powolny oddech', 'Blade błony', 'Sztywne mięśnie', 'Temp < 37°C'],
    steps: ['Przenieś w ciepłe, suche miejsce', 'Owiń w ciepłe koce', 'Termofor owinięty w ręcznik na tułów', 'Ogrzewaj STOPNIOWO — najpierw korpus', 'Mierz temperaturę', 'Ciepłe płyny — tylko jeśli przytomne', 'Jedź do lecznicy'],
    donts: ['Nie używaj gorącej wody', 'Nie masuj kończyn', 'Nie podawaj alkoholu'],
    duration: 'Stopniowe ogrzewanie' },
  { id: 'poisoning', title: 'Zatrucie (ogólne)', icon: AlertTriangle, category: 'poisoning', urgency: 'critical',
    symptoms: ['Wymioty', 'Biegunka', 'Niepokój', 'Drgawki', 'Ślinienie się', 'Nietypowy zapach'],
    steps: ['Zidentyfikuj truciznę i ilość', 'Zadzwoń do lecznicy — powiedz CO i ILE zjadło', 'Nie wywołuj wymiotów bez zalecenia lekarza', 'Zachowaj opakowanie/próbkę', 'Zbierz próbkę wymiocin', 'Jedź do lecznicy natychmiast'],
    donts: ['Nie wywołuj wymiotów samodzielnie', 'Nie podawaj mleka ani wody na siłę', 'Nie czekaj na objawy'],
    duration: 'Działaj natychmiast' },
  { id: 'seizures', title: 'Napad drgawek', icon: Zap, category: 'critical', urgency: 'urgent', timer: true,
    symptoms: ['Drżenie ciała', 'Utrata przytomności', 'Sztywne mięśnie', 'Ślinienie', 'Oddawanie moczu'],
    steps: ['Zachowaj spokój — większość napadów mija', 'Usuń niebezpieczne przedmioty wokół', 'Użyj stopera — zmierz czas napadu', 'Ułóż na boku, chroń głowę poduszką', 'Ścisz hałas, przygaś światło', 'NIE wkładaj nic do pyska', 'Po napadzie — otul, uspokój, może być zdezorientowane', 'Napad > 5 min lub seria napadów = jedź natychmiast'],
    donts: ['Nie wkładaj rąk ani przedmiotów do pyska', 'Nie trzymaj na siłę', 'Nie polewaj wodą'],
    duration: 'Zwykle 1–3 minuty' },
  { id: 'shock', title: 'Wstrząs', icon: Activity, category: 'critical', urgency: 'critical',
    symptoms: ['Blade błony śluzowe', 'Szybki, słaby puls', 'Zimne kończyny', 'Osłabienie', 'Płytki oddech'],
    steps: ['Utrzymaj drożność dróg oddechowych', 'Ułóż na boku, lekko unieś zad', 'Ogrzej — koce, ciepło', 'Nie podawaj NIC doustnie', 'Jedź do lecznicy natychmiast', 'Monitoruj oddech i puls w drodze'],
    donts: ['Nie podawaj jedzenia ani picia', 'Nie zostawiaj samego', 'Nie czekaj'],
    duration: 'Działaj natychmiast' },
  { id: 'bloat', title: 'Skręt żołądka (duże psy)', icon: AlertTriangle, category: 'critical', urgency: 'critical',
    symptoms: ['Napęczniały brzuch', 'Nieudane próby wymiotów', 'Niepokój, krążenie', 'Duszność', 'Ślinienie'],
    steps: ['To stan natychmiastowego zagrożenia życia', 'Jedź do lecznicy NATYCHMIAST — potrzebna operacja', 'Nie podawaj jedzenia ani wody', 'Nie wywołuj wymiotów', 'Każda minuta się liczy'],
    donts: ['Nie czekaj — śmiertelne bez operacji', 'Nie podawaj jedzenia', 'Nie wywołuj wymiotów'],
    duration: 'Minuty liczą się' },
  { id: 'bleeding', title: 'Silne krwawienie', icon: Droplets, category: 'injuries', urgency: 'urgent', timer: true,
    symptoms: ['Obfite krwawienie', 'Bladość', 'Osłabienie', 'Szybkie bicie serca'],
    steps: ['Przyłóż czystą gazę i mocno uciskaj', 'Utrzymaj ucisk min. 3–5 minut', 'Nie ustaje? — opaska uciskowa POWYŻEJ rany', 'Zapisz godzinę założenia opaski', 'Nie zdejmuj i nie luzuj opaski samodzielnie — zrobi to lekarz', 'Jedź do lecznicy', 'Utrzymaj zwierzę w cieple i spokoju'],
    donts: ['Nie zdejmuj nasiąkniętego opatrunku — dokładaj kolejny', 'Nie czyść głębokiej rany', 'Nie używaj wody utlenionej do głębokich ran'],
    duration: 'Kontroluj natychmiast' },
  { id: 'fracture', title: 'Złamanie', icon: Bone, category: 'injuries', urgency: 'urgent',
    symptoms: ['Nienaturalne ułożenie łapy', 'Obrzęk', 'Ból', 'Nie chce obciążać kończyny'],
    steps: ['Nie ruszaj złamanej kończyny', 'Unieruchom szyną (deska, tektura + bandaż)', 'Unieruchom staw powyżej i poniżej', 'Transportuj na twardej tacy lub w kocu', 'Nie obciążaj kończyny', 'Jedź do lecznicy'],
    donts: ['Nie prostuj kości', 'Nie masuj', 'Nie przykładaj lodu gołego na skórę'],
    duration: 'Unieruchom natychmiast' },
  { id: 'eye-injury', title: 'Uraz oka', icon: Eye, category: 'injuries', urgency: 'urgent',
    symptoms: ['Zaczerwienienie', 'Zamknięta powieka', 'Wyciek', 'Drapanie łapą'],
    steps: ['Nie dotykaj oka', 'Załóż kołnierz lub zabezpiecz przed drapaniem', 'Nie płucz (wyjątek: chemikalia — płucz dużo wody)', 'Jedź do lecznicy — czas jest kluczowy'],
    donts: ['Nie dotykaj oka', 'Nie stosuj kropli „na własną rękę"', 'Nie wyciągaj ciał obcych'],
    duration: 'Pomoc natychmiast' },
  { id: 'burns', title: 'Oparzenie', icon: Thermometer, category: 'injuries', urgency: 'urgent', timer: true,
    symptoms: ['Czerwona skóra', 'Pęcherze', 'Ból', 'Obrzęk', 'Zniszczona sierść'],
    steps: ['Chłodź letnią, bieżącą wodą 15–20 min', 'Nie używaj lodu', 'Nie nakładaj maści ani masła', 'Przykryj sterylnym, luźnym opatrunkiem', 'Jedź do lecznicy'],
    donts: ['Nie używaj lodu', 'Nie smaruj maściami', 'Nie przekłuwaj pęcherzy'],
    duration: 'Chłodź od razu' },
  { id: 'vomiting', title: 'Wymioty', icon: AlertTriangle, category: 'common', urgency: 'moderate',
    symptoms: ['Wymioty', 'Niechęć do jedzenia', 'Apatia', 'Ślinienie'],
    steps: ['Odstaw jedzenie na 12–24 h (woda zostaje)', 'Podawaj małe porcje wody często', 'Obserwuj częstotliwość', 'Zapisz co i kiedy zjadło', 'Wymioty > 24 h, krew, apatia = lecznica'],
    donts: ['Nie zmuszaj do jedzenia', 'Nie podawaj leków bez konsultacji'],
    duration: 'Obserwuj do 24 h' },
  { id: 'diarrhea', title: 'Biegunka', icon: AlertTriangle, category: 'common', urgency: 'moderate',
    symptoms: ['Ciekły stolec', 'Częste wypróżnianie', 'Apatia'],
    steps: ['Lekkostrawna dieta (ryż + kurczak)', 'Małe, częste posiłki', 'Dużo świeżej wody', 'Obserwuj konsystencję', 'Krew w stolcu lub > 48 h = lecznica'],
    donts: ['Nie podawaj leków przeciwbiegunkowych dla ludzi', 'Nie zmieniaj diety gwałtownie'],
    duration: 'Obserwuj do 48 h' },
  { id: 'allergic-reaction', title: 'Reakcja alergiczna', icon: Shield, category: 'common', urgency: 'urgent',
    symptoms: ['Opuchlizna pyska', 'Czerwone plamy', 'Swędzenie', 'Trudny oddech'],
    steps: ['Zidentyfikuj i usuń alergen', 'Chłodź opuchliznę', 'Obserwuj oddech', 'Problemy z oddychaniem = nagły wypadek — jedź', 'Zapisz, z czym miało kontakt'],
    donts: ['Nie podawaj leków bez konsultacji', 'Nie pozwól drapać'],
    duration: 'Działaj szybko' },
  { id: 'chocolate', title: 'Czekolada', icon: Candy, category: 'poisoning', urgency: 'critical',
    symptoms: ['Wymioty', 'Niepokój', 'Szybkie bicie serca', 'Drgawki'],
    steps: ['Im ciemniejsza czekolada, tym groźniejsza', 'Oszacuj ile i jaką zjadło', 'Jedź do lecznicy — nie czekaj na objawy', 'Zabierz opakowanie'],
    donts: ['Nie czekaj na objawy', 'Teobromina jest toksyczna dla psów i kotów'],
    duration: 'Działaj natychmiast' },
  { id: 'grapes', title: 'Winogrona i rodzynki', icon: Candy, category: 'poisoning', urgency: 'critical',
    symptoms: ['Wymioty', 'Biegunka', 'Apatia', 'Ból brzucha'],
    steps: ['Nawet mała ilość może uszkodzić nerki', 'Oszacuj ilość', 'Jedź do lecznicy natychmiast', 'Monitoruj nawodnienie'],
    donts: ['Nie czekaj — niewydolność nerek może być śmiertelna'],
    duration: 'Działaj natychmiast' },
  { id: 'xylitol', title: 'Ksylitol (guma, słodycze)', icon: Candy, category: 'poisoning', urgency: 'critical',
    symptoms: ['Wymioty', 'Osłabienie', 'Drgawki', 'Zaburzenia chodu'],
    steps: ['Ksylitol powoduje gwałtowną hipoglikemię', 'Sprawdź etykietę gumy/słodyczy', 'Jedź do lecznicy natychmiast', 'Podaj ile i kiedy zjadło'],
    donts: ['Nie czekaj — hipoglikemia rozwija się szybko'],
    duration: 'Działaj natychmiast' },
  { id: 'antifreeze', title: 'Płyn chłodniczy', icon: Droplets, category: 'poisoning', urgency: 'critical',
    symptoms: ['Wymioty', 'Chód jak „po pijanemu"', 'Drgawki', 'Osłabienie'],
    steps: ['Etylen glikol jest ŚMIERTELNIE toksyczny', 'Koty lubią słodki smak — uważaj', 'Jedź do lecznicy natychmiast', 'Nie wywołuj wymiotów'],
    donts: ['Nie czekaj ani minuty', 'Nie wywołuj wymiotów'],
    duration: 'Minuty liczą się' },
  { id: 'medication', title: 'Zatrucie lekami', icon: Pill, category: 'poisoning', urgency: 'critical',
    symptoms: ['Zależne od leku', 'Wymioty', 'Drgawki', 'Apatia'],
    steps: ['Zidentyfikuj lek i oszacuj dawkę', 'Zabierz opakowanie ze sobą', 'Jedź do lecznicy', 'Nie wywołuj wymiotów', 'Powiedz lekarzowi o wszystkich lekach'],
    donts: ['Nie podawaj żadnych leków', 'Leki dla ludzi mogą być toksyczne dla zwierząt'],
    duration: 'Działaj natychmiast' },
  { id: 'bee-sting', title: 'Użądlenie owada', icon: Bug, category: 'injuries', urgency: 'moderate',
    symptoms: ['Opuchlizna', 'Ból', 'Zaczerwienienie'],
    steps: ['Usuń żądło zeskrobiąc je (kartą, nie szczypcami)', 'Zimny okład 10 min', 'Obserwuj reakcję alergiczną 1–2 h', 'Opuchlizna pyska/gardła = jedź do lecznicy'],
    donts: ['Nie wyciskaj żądła szczypcami', 'Nie pozwól drapać'],
    duration: 'Obserwuj 1–2 h' },
  { id: 'snake-bite', title: 'Ugryzienie węża', icon: Bug, category: 'injuries', urgency: 'critical',
    symptoms: ['Dwa ślady po kłach', 'Szybka opuchlizna', 'Silny ból', 'Osłabienie'],
    steps: ['Jedź do lecznicy natychmiast', 'Utrzymaj zwierzę w spokoju — ruch przyspiesza jad', 'Nie uciskaj, nie zakładaj opaski', 'Sfotografuj węża tylko jeśli bezpieczne'],
    donts: ['Nie wysysaj jadu', 'Nie nacinaj rany', 'Nie zakładaj opaski uciskowej'],
    duration: 'Działaj natychmiast' },
  { id: 'fish-hook', title: 'Haczyk w ciele', icon: Fish, category: 'injuries', urgency: 'moderate',
    symptoms: ['Haczyk w skórze', 'Ból', 'Krwawienie'],
    steps: ['Nie ciągnij — zadzior nie wyjdzie wstecz', 'Odetnij żyłkę, zostaw krótki koniec', 'Zabezpiecz przed wyrwaniem', 'Jedź do lecznicy'],
    donts: ['Nie ciągnij haczyka', 'Nie wykręcaj na siłę'],
    duration: 'Jak najszybciej' },
  { id: 'dystocia', title: 'Trudny poród', icon: Baby, category: 'critical', urgency: 'critical',
    symptoms: ['Silne skurcze > 30 min bez efektu', 'Ciemnawy wyciek', 'Osłabiona samica'],
    steps: ['Jedź do lecznicy natychmiast', 'Nie ciągnij za płód', 'Monitoruj temperaturę', 'Zapisuj czas trwania porodu'],
    donts: ['Nie ciągnij za płód', 'Nie czekaj > 2 h'],
    duration: 'Działaj natychmiast' },
];

export const CATEGORIES = [
  { id: 'all', name: 'Wszystkie', icon: Filter },
  { id: 'critical', name: 'Krytyczne', icon: AlertTriangle },
  { id: 'poisoning', name: 'Zatrucia', icon: Pill },
  { id: 'injuries', name: 'Urazy', icon: Bone },
  { id: 'respiratory', name: 'Oddechowe', icon: Wind },
  { id: 'temperature', name: 'Temperatura', icon: Thermometer },
  { id: 'common', name: 'Powszechne', icon: Shield },
];

export const URGENCY_CFG: Record<string, { label: string; badge: string; iconBg: string }> = {
  critical: { label: 'Krytyczne', badge: 'bg-red-100 text-red-700', iconBg: 'bg-red-500' },
  urgent: { label: 'Pilne', badge: 'bg-amber-100 text-amber-700', iconBg: 'bg-amber-500' },
  moderate: { label: 'Umiarkowane', badge: 'bg-emerald-100 text-emerald-700', iconBg: 'bg-emerald-500' },
};

export const KIT_ITEMS: { group: string; items: { id: string; label: string }[] }[] = [
  { group: 'Opatrunki', items: [
    { id: 'gauze', label: 'Sterylne gazy i bandaże' },
    { id: 'tape', label: 'Plaster opatrunkowy' },
    { id: 'blanket', label: 'Koc ratunkowy (izotermiczny)' },
    { id: 'saline', label: 'Sól fizjologiczna do przemywania' },
  ]},
  { group: 'Narzędzia', items: [
    { id: 'thermometer', label: 'Termometr elektroniczny' },
    { id: 'scissors', label: 'Nożyczki z zaokrąglonymi końcami' },
    { id: 'tweezers', label: 'Pęseta (kleszcze, ciała obce)' },
    { id: 'muzzle', label: 'Kaganiec lub bandaż na pysk' },
    { id: 'carrier', label: 'Sprawny transporter' },
  ]},
  { group: 'Higiena i bezpieczeństwo', items: [
    { id: 'gloves', label: 'Rękawiczki jednorazowe' },
    { id: 'antiseptic', label: 'Środek odkażający (np. oktanisept)' },
    { id: 'towel', label: 'Ręcznik i koce' },
    { id: 'collar', label: 'Kołnierz ochronny' },
  ]},
  { group: 'Informacje', items: [
    { id: 'vet-phone', label: 'Zapisany telefon lecznicy 24/7' },
    { id: 'chip', label: 'Numer chipu i książeczka zdrowia' },
    { id: 'meds', label: 'Lista przyjmowanych leków pupila' },
  ]},
];

export const VET_CONTACTS = [
  { name: 'Numer alarmowy', phone: '112', note: 'Przekieruje do najbliższej pomocy', is24h: true },
];

export const SPECIES_EMOJI: Record<string, string> = { dog: '🐶', cat: '🐱', rabbit: '🐰', bird: '🐦', hamster: '🐹', other: '🐾' };
