import {
  Leaf, Heart, Shield, Sparkles, Star, Wind, Bone, Droplet, Droplets,
} from 'lucide-react';

export type HerbCategory = 'digestive' | 'immune' | 'calming' | 'skin' | 'joints' | 'respiratory' | 'urinary';

export interface Herb {
  id: string;
  name: string;
  latinName: string;
  category: HerbCategory;
  benefits: string[];
  usageFor: ('dog' | 'cat' | 'both')[];
  catCaution?: string;
  dosage: string;
  warnings: string[];
  preparations: string[];
  description: string;
  activeCompounds: string[];
  safetyRating: number;
}

export interface Recipe {
  id: string;
  name: string;
  herbIds: string[];
  purpose: string;
  preparation: string;
  dosage: string;
  duration: string;
  category: HerbCategory;
}

export interface SavedHerb {
  id: string;
  herbId: string;
  herbName: string;
  petId: string;
  petName: string;
  startDate: string;
  notes?: string;
}

export const CATEGORIES: { id: HerbCategory | 'all'; name: string; icon: any }[] = [
  { id: 'all', name: 'Wszystkie', icon: Leaf },
  { id: 'digestive', name: 'Trawienie', icon: Heart },
  { id: 'immune', name: 'Odporność', icon: Shield },
  { id: 'calming', name: 'Uspokajające', icon: Sparkles },
  { id: 'skin', name: 'Skóra', icon: Droplet },
  { id: 'joints', name: 'Stawy', icon: Bone },
  { id: 'respiratory', name: 'Oddechowe', icon: Wind },
  { id: 'urinary', name: 'Drogi moczowe', icon: Droplets },
];

export const HERBS: Herb[] = [
  {
    id: 'chamomile', name: 'Rumianek', latinName: 'Matricaria chamomilla', category: 'digestive',
    benefits: ['Łagodzi problemy trawienne', 'Działa przeciwzapalnie', 'Uspokaja podrażnioną skórę', 'Pomaga przy zapaleniu spojówek'],
    usageFor: ['both'], dosage: '1 łyżeczka suszu na szklankę wody, 2–3 razy dziennie',
    warnings: ['Unikać u zwierząt z alergią na rośliny z rodziny astrowatych', 'Nie stosować długotrwale bez przerwy'],
    preparations: ['Napar', 'Kompres', 'Płukanka'],
    description: 'Jedno z najłagodniejszych ziół — działa kojąco na układ trawienny i skórę, dobrze tolerowane przez większość zwierząt.',
    activeCompounds: ['Apigenina', 'Bisabolol', 'Chamazulen'], safetyRating: 5,
  },
  {
    id: 'turmeric', name: 'Kurkuma', latinName: 'Curcuma longa', category: 'joints',
    benefits: ['Silne działanie przeciwzapalne', 'Wspiera zdrowie stawów', 'Wspomaga trawienie', 'Właściwości przeciwutleniające'],
    usageFor: ['both'], catCaution: 'U kotów stosować wyłącznie bardzo małe dawki — wolniej metabolizują kurkuminę.',
    dosage: '1/4 łyżeczki na 5 kg masy ciała dziennie, z odrobiną tłuszczu dla lepszego wchłaniania',
    warnings: ['Nie stosować u zwierząt z chorobami dróg żółciowych', 'Może nasilać działanie leków przeciwzakrzepowych'],
    preparations: ['Proszek dodany do pokarmu', 'Złota pasta kurkumowa', 'Napar'],
    description: 'Zawiera kurkuminę — jeden z najlepiej przebadanych naturalnych związków przeciwzapalnych, pomocny przy problemach ze stawami.',
    activeCompounds: ['Kurkumina', 'Demetoksykurkumina', 'Bisdemetoksykurkumina'], safetyRating: 4,
  },
  {
    id: 'valerian', name: 'Waleriana', latinName: 'Valeriana officinalis', category: 'calming',
    benefits: ['Silne działanie uspokajające', 'Pomaga przy lęku separacyjnym', 'Wspomaga sen', 'Łagodzi stres sytuacyjny'],
    usageFor: ['both'], catCaution: 'U kotów działa pobudzająco (podobnie jak kocimiętka) — efekt odwrotny niż u psów.',
    dosage: 'Wyłącznie według wskazań weterynarza — dawkowanie zależy od preparatu',
    warnings: ['Nie łączyć z innymi środkami uspokajającymi', 'Może powodować nadmierną senność', 'Konsultacja z weterynarzem obowiązkowa'],
    preparations: ['Nalewka (bez alkoholu dla zwierząt)', 'Kapsułki', 'Napar'],
    description: 'Naturalny środek uspokajający, pomocny w sytuacjach stresowych — burze, fajerwerki, wizyty u weterynarza.',
    activeCompounds: ['Kwas walerianowy', 'Walepotriaty', 'Alkaloidy'], safetyRating: 3,
  },
  {
    id: 'nettle', name: 'Pokrzywa', latinName: 'Urtica dioica', category: 'immune',
    benefits: ['Wzmacnia odporność', 'Bogata w witaminy i minerały', 'Wspomaga zdrowie skóry i sierści', 'Działa oczyszczająco'],
    usageFor: ['both'], dosage: '1 łyżeczka suszu na szklankę wody, 1–2 razy dziennie',
    warnings: ['Może wchodzić w interakcje z lekami na ciśnienie krwi', 'Nie stosować u ciężarnych samic'],
    preparations: ['Napar', 'Proszek', 'Sparzone liście'],
    description: 'Skarbnica składników odżywczych — wspiera ogólną kondycję organizmu, odporność i wygląd sierści.',
    activeCompounds: ['Żelazo', 'Witamina C', 'Chlorofil', 'Flawonoidy'], safetyRating: 5,
  },
  {
    id: 'dandelion', name: 'Mniszek lekarski', latinName: 'Taraxacum officinale', category: 'digestive',
    benefits: ['Wspomaga pracę wątroby', 'Działa łagodnie moczopędnie', 'Poprawia trawienie', 'Bogaty w witaminy'],
    usageFor: ['both'], dosage: '1/2 łyżeczki suszu na szklankę wody, 1–2 razy dziennie',
    warnings: ['Nie stosować u zwierząt z chorobami dróg żółciowych', 'Może obniżać poziom cukru we krwi'],
    preparations: ['Napar z liści', 'Napar z korzenia', 'Świeże liście'],
    description: 'Wspiera naturalną detoksykację organizmu i funkcjonowanie układu trawiennego — bezpieczny dla większości zwierząt.',
    activeCompounds: ['Inulina', 'Taraksacyna', 'Witaminy A, C, K'], safetyRating: 5,
  },
  {
    id: 'echinacea', name: 'Echinacea', latinName: 'Echinacea purpurea', category: 'immune',
    benefits: ['Wzmacnia układ odpornościowy', 'Może skracać czas trwania infekcji', 'Działa przeciwbakteryjnie', 'Wspomaga gojenie ran'],
    usageFor: ['both'], dosage: 'Krótkie kuracje 7–10 dni, dawkowanie według wskazań weterynarza',
    warnings: ['Nie stosować długotrwale (ryzyko osłabienia efektu)', 'Unikać u zwierząt z chorobami autoimmunologicznymi'],
    preparations: ['Nalewka', 'Kapsułki', 'Napar'],
    description: 'Immunomodulator najlepiej działający w krótkich kuracjach — podczas infekcji lub w okresach zwiększonego ryzyka.',
    activeCompounds: ['Echinakozyd', 'Polisacharydy', 'Alkiloamidy'], safetyRating: 4,
  },
  {
    id: 'calendula', name: 'Nagietek', latinName: 'Calendula officinalis', category: 'skin',
    benefits: ['Przyspiesza gojenie ran i otarć', 'Działa przeciwzapalnie na skórę', 'Łagodzi podrażnienia i wypryski', 'Wspiera gojenie po zabiegach'],
    usageFor: ['both'], dosage: 'Okłady z naparu 2–3 razy dziennie na zmienione miejsce',
    warnings: ['Nie nakładać na głębokie, otwarte rany bez konsultacji z weterynarzem', 'Rzadko może wywołać reakcję alergiczną'],
    preparations: ['Okład z naparu', 'Maść nagietkowa', 'Płukanka'],
    description: 'Jedno z najbezpieczniejszych ziół do stosowania miejscowego — klasyka w pielęgnacji drobnych ran i podrażnień skóry.',
    activeCompounds: ['Flawonoidy', 'Karotenoidy', 'Saponiny triterpenowe'], safetyRating: 5,
  },
  {
    id: 'thyme', name: 'Tymianek', latinName: 'Thymus vulgaris', category: 'respiratory',
    benefits: ['Wspomaga drożność dróg oddechowych', 'Działa wykrztuśnie', 'Właściwości przeciwbakteryjne', 'Łagodzi kaszel'],
    usageFor: ['dog'], catCaution: 'Niezalecany dla kotów — zawarty tymol i olejki eteryczne mogą być dla nich toksyczne.',
    dosage: 'Bardzo małe ilości suszu w naparze, wyłącznie po konsultacji z weterynarzem',
    warnings: ['Nie stosować w formie olejku eterycznego bezpośrednio na skórę', 'Przeciwwskazany u kotów', 'Unikać u zwierząt z padaczką'],
    preparations: ['Napar (do inhalacji pomieszczenia, nie doustnie bez nadzoru)', 'Susz dodany w śladowej ilości do karmy'],
    description: 'Wspomaga układ oddechowy u psów, ale wymaga dużej ostrożności — nieodpowiedni dla kotów ze względu na wrażliwość na olejki eteryczne.',
    activeCompounds: ['Tymol', 'Karwakrol', 'Flawonoidy'], safetyRating: 2,
  },
  {
    id: 'peppermint', name: 'Mięta pieprzowa', latinName: 'Mentha piperita', category: 'digestive',
    benefits: ['Łagodzi wzdęcia i kolkę', 'Redukuje nudności', 'Odświeża oddech'],
    usageFor: ['dog'], catCaution: 'Olejek eteryczny z mięty jest toksyczny dla kotów — brak enzymu do jego metabolizowania. Nigdy nie stosować olejku u kotów.',
    dosage: 'Bardzo mała ilość suszu w naparze, sporadycznie',
    warnings: ['Nie stosować olejku eterycznego u żadnego zwierzęcia bezpośrednio na skórę', 'Przeciwwskazana u kotów', 'Unikać przy refluksie żołądkowym'],
    preparations: ['Napar (śladowa ilość)', 'Susz dodany do karmy w minimalnej ilości'],
    description: 'Skuteczna przy łagodnych dolegliwościach trawiennych u psów, ale wymaga dużej ostrożności — toksyczna dla kotów w formie olejkowej.',
    activeCompounds: ['Mentol', 'Mentofuran', 'Flawonoidy'], safetyRating: 3,
  },
  {
    id: 'ginger', name: 'Imbir', latinName: 'Zingiber officinale', category: 'digestive',
    benefits: ['Łagodzi mdłości i chorobę lokomocyjną', 'Wspomaga krążenie', 'Działa przeciwzapalnie'],
    usageFor: ['both'], dosage: 'Ślad startego korzenia (ok. 1/8 łyżeczki) na 10 kg masy ciała, doraźnie',
    warnings: ['Może nasilać działanie leków przeciwzakrzepowych', 'Unikać przy wrzodach żołądka', 'Nie przy kamicy żółciowej bez konsultacji'],
    preparations: ['Starty świeży korzeń w śladowej ilości', 'Napar'],
    description: 'Klasyczne wsparcie przy mdłościach i chorobie lokomocyjnej — pomocny przed podróżą samochodem.',
    activeCompounds: ['Gingerol', 'Shogaol', 'Olejki eteryczne'], safetyRating: 4,
  },
  {
    id: 'fennel', name: 'Koper włoski', latinName: 'Foeniculum vulgare', category: 'digestive',
    benefits: ['Łagodzi wzdęcia i gazy', 'Rozkurcza jelita', 'Wspomaga trawienie'],
    usageFor: ['both'], dosage: '1/4 łyżeczki zmiażdżonych nasion na szklankę wody, 1x dziennie',
    warnings: ['Nie stosować w dużych ilościach u zwierząt ciężarnych'],
    preparations: ['Napar z nasion', 'Zmiażdżone nasiona dodane do karmy'],
    description: 'Łagodne ziele rozkurczowe, pomocne przy wzdęciach i problemach z gazami.',
    activeCompounds: ['Anetol', 'Fenchon', 'Flawonoidy'], safetyRating: 4,
  },
  {
    id: 'elderberry', name: 'Czarny bez', latinName: 'Sambucus nigra', category: 'immune',
    benefits: ['Wsparcie przy przeziębieniach', 'Działanie przeciwwirusowe', 'Bogaty w antyoksydanty'],
    usageFor: ['dog'], dosage: 'Tylko przetworzony ekstrakt/syrop przeznaczony dla zwierząt, wg wskazań producenta',
    warnings: ['Surowe jagody, kora i liście są TOKSYCZNE (cyjanogenne glikozydy)', 'Nigdy nie podawać surowych części rośliny', 'Stosować wyłącznie gotowe, bezpieczne preparaty'],
    preparations: ['Gotowy syrop/ekstrakt dla zwierząt'],
    description: 'Popularne wsparcie odporności sezonowej, ale wymaga stosowania wyłącznie w formie przetworzonej — surowa roślina jest toksyczna.',
    activeCompounds: ['Antocyjany', 'Flawonoidy', 'Witamina C'], safetyRating: 3,
  },
  {
    id: 'aloe', name: 'Aloes', latinName: 'Aloe vera', category: 'skin',
    benefits: ['Łagodzi oparzenia i podrażnienia', 'Nawilża suchą skórę', 'Przyspiesza regenerację naskórka'],
    usageFor: ['both'], dosage: 'Czysty żel aloesowy (bez dodatków) cienką warstwą na skórę',
    warnings: ['Spożycie żelu lub liścia jest TOKSYCZNE (aloina)', 'Stosować wyłącznie zewnętrznie', 'Pilnować, by zwierzę nie zlizało'],
    preparations: ['Czysty żel na skórę'],
    description: 'Ceniony do stosowania zewnętrznego na podrażnioną skórę, ale niebezpieczny po spożyciu — wymaga nadzoru po aplikacji.',
    activeCompounds: ['Aloina (toksyczna doustnie)', 'Polisacharydy', 'Witaminy A, C, E'], safetyRating: 3,
  },
  {
    id: 'oats', name: 'Owies koloidalny', latinName: 'Avena sativa', category: 'skin',
    benefits: ['Łagodzi swędzenie', 'Nawilża skórę', 'Kojący przy alergiach skórnych'],
    usageFor: ['both'], dosage: 'Kąpiel z dodatkiem zmielonego owsa koloidalnego 1–2x w tygodniu',
    warnings: ['Brak istotnych przeciwwskazań przy stosowaniu zewnętrznym'],
    preparations: ['Kąpiel owsiana', 'Okład z zmielonego owsa'],
    description: 'Jedno z najbezpieczniejszych i najłagodniejszych wsparć przy swędzącej, podrażnionej skórze — odpowiednie nawet dla szczeniąt i kociąt.',
    activeCompounds: ['Beta-glukany', 'Saponiny', 'Lipidy'], safetyRating: 5,
  },
  {
    id: 'lemonbalm', name: 'Melisa', latinName: 'Melissa officinalis', category: 'calming',
    benefits: ['Łagodnie uspokaja', 'Redukuje niepokój', 'Wspomaga trawienie na tle nerwowym'],
    usageFor: ['both'], dosage: '1/2 łyżeczki suszu na szklankę wody, doraźnie przed stresującą sytuacją',
    warnings: ['Może nasilać działanie leków uspokajających', 'Zachować ostrożność przy niedoczynności tarczycy'],
    preparations: ['Napar', 'Susz dodany do karmy'],
    description: 'Jedno z najłagodniejszych ziół uspokajających, dobrze tolerowane zarówno przez psy, jak i koty.',
    activeCompounds: ['Kwas rozmarynowy', 'Cytral', 'Flawonoidy'], safetyRating: 5,
  },
  {
    id: 'lavender', name: 'Lawenda', latinName: 'Lavandula angustifolia', category: 'calming',
    benefits: ['Działanie relaksujące przez zapach', 'Pomocna przy niepokoju sytuacyjnym'],
    usageFor: ['dog'], catCaution: 'Olejek eteryczny lawendowy jest dla kotów toksyczny — unikać dyfuzorów i aplikacji na skórę u kotów.',
    dosage: 'Suszone kwiaty w poduszce legowiska lub mocno rozcieńczony hydrolat; nigdy olejek eteryczny bezpośrednio',
    warnings: ['Olejek eteryczny toksyczny dla kotów', 'Nie aplikować nierozcieńczonego olejku na skórę żadnego zwierzęcia', 'Nie dyfuzować w pomieszczeniu z kotem'],
    preparations: ['Suszone kwiaty (sasz. zapachowa)', 'Mocno rozcieńczony hydrolat'],
    description: 'Popularna w aromaterapii dla psów, ale wymaga dużej ostrożności przy kotach ze względu na wrażliwość na olejki eteryczne.',
    activeCompounds: ['Linalol', 'Octan linalylu'], safetyRating: 3,
  },
  {
    id: 'willow', name: 'Wierzba biała', latinName: 'Salix alba', category: 'joints',
    benefits: ['Łagodzi ból i stan zapalny stawów', 'Naturalne źródło salicyny'],
    usageFor: ['dog'], catCaution: 'Wierzba biała jest dla kotów NIEBEZPIECZNA — zawarte salicylany mogą prowadzić do poważnego zatrucia, podobnie jak aspiryna.',
    dosage: 'Tylko pod nadzorem weterynarza, krótkie kuracje',
    warnings: ['BEZWZGLĘDNIE przeciwwskazana u kotów', 'Ostrożnie u psów z problemami żołądka lub nerek', 'Nie łączyć z NLPZ (ryzyko krwawień)'],
    preparations: ['Napar z kory (wyłącznie pod nadzorem weterynarza)'],
    description: 'Naturalny prekursor aspiryny — skuteczny przeciwbólowo u psów, ale bezwzględnie przeciwwskazany u kotów.',
    activeCompounds: ['Salicyna', 'Flawonoidy', 'Garbniki'], safetyRating: 2,
  },
  {
    id: 'elecampane', name: 'Oman wielki', latinName: 'Inula helenium', category: 'respiratory',
    benefits: ['Tradycyjnie stosowany przy kaszlu', 'Łagodzi nieżyt dróg oddechowych'],
    usageFor: ['dog'], dosage: 'Napar z korzenia, małe ilości, krótkie kuracje',
    warnings: ['Ograniczone dane bezpieczeństwa u zwierząt — stosować ostrożnie i krótko', 'Unikać u zwierząt ciężarnych'],
    preparations: ['Napar z korzenia'],
    description: 'Ziele o tradycyjnym zastosowaniu przy kaszlu — stosować krótko i ostrożnie z uwagi na ograniczone badania.',
    activeCompounds: ['Inulina', 'Alantolakton'], safetyRating: 3,
  },
  {
    id: 'licorice', name: 'Lukrecja', latinName: 'Glycyrrhiza glabra', category: 'respiratory',
    benefits: ['Łagodzi kaszel i podrażnione gardło', 'Działa przeciwzapalnie', 'Wspiera odporność'],
    usageFor: ['both'], dosage: 'Bardzo małe dawki, maksymalnie 1–2 tygodnie',
    warnings: ['Może podnosić ciśnienie krwi', 'Wpływa na gospodarkę potasową', 'Przeciwwskazana przy nadciśnieniu, niewydolności nerek i sercowej'],
    preparations: ['Napar', 'Ekstrakt standaryzowany'],
    description: 'Skuteczna przy podrażnionym gardle i kaszlu, ale wyłącznie w krótkich kuracjach — długotrwałe stosowanie niesie ryzyko sercowo-naczyniowe.',
    activeCompounds: ['Glicyryzyna', 'Flawonoidy'], safetyRating: 2,
  },
  {
    id: 'milkthistle', name: 'Ostropest plamisty', latinName: 'Silybum marianum', category: 'digestive',
    benefits: ['Wspiera regenerację wątroby', 'Działa hepatoprotekcyjnie', 'Pomocny przy terapii hepatotoksycznymi lekami', 'Wspomaga funkcje detoksykacyjne'],
    usageFor: ['both'], dosage: 'Standaryzowany ekstrakt (sylimaryna) — dawka wg preparatu weterynaryjnego, typowo po konsultacji z weterynarzem',
    warnings: ['Rzadko może powodować luźne stolce', 'Wybierać preparaty weterynaryjne, nie ludzkie tabletki z dodatkami', 'Nie zastępuje diagnostyki choroby wątroby'],
    preparations: ['Ekstrakt standaryzowany (kapsułki/proszek dla zwierząt)', 'Mielone nasiona dodawane do karmy'],
    description: 'Najważniejsze zioło hepatoprotekcyjne — sylimaryna wspiera regenerację hepatocytów. Często zalecane jako uzupełnienie terapii chorób wątroby, ale nie zastępuje leczenia.',
    activeCompounds: ['Sylimaryna', 'Sylibina', 'Flawonoidy'], safetyRating: 5,
  },
  {
    id: 'cranberry', name: 'Żurawina', latinName: 'Vaccinium macrocarpon', category: 'urinary',
    benefits: ['Wspomaga zdrowie dróg moczowych', 'Utrudnia przyczepianie bakterii do ściany pęcherza', 'Bogata w przeciwutleniacze'],
    usageFor: ['both'], catCaution: 'U kotów ze skłonnością do kamicy struwitowej stosować ostrożnie — zakwaszanie moczu bywa niepożądane.',
    dosage: 'Ekstrakt lub sproszkowane owoce przeznaczone dla zwierząt, wg preparatu; świeże owoce w małych ilościach',
    warnings: ['Może zakwaszać mocz — nie przy kamicy struwitowej', 'Nie zastępuje antybiotykoterapii przy aktywnym zakażeniu', 'Unikać soków z cukrem'],
    preparations: ['Ekstrakt/proszek dla zwierząt', 'Świeże lub mrożone owoce (kilka sztuk)'],
    description: 'Proantocyjanidyny z żurawiny utrudniają bakteriom (zwłaszcza E. coli) przyczepianie się do ściany dróg moczowych — wsparcie profilaktyczne, nie leczenie zakażenia.',
    activeCompounds: ['Proantocyjanidyny', 'Antocyjany', 'Kwas benzoesowy'], safetyRating: 4,
  },
  {
    id: 'horsetail', name: 'Skrzyp polny', latinName: 'Equisetum arvense', category: 'urinary',
    benefits: ['Łagodne działanie moczopędne', 'Źródło krzemu', 'Tradycyjnie stosowany przy infekcjach dróg moczowych'],
    usageFor: ['dog'], catCaution: 'U kotów tylko krótko i ostrożnie — zawiera tiaminazę rozkładającą witaminę B1 przy dłuższym stosowaniu.',
    dosage: 'Napar z ziela, małe ilości, wyłącznie krótkie kuracje 5–7 dni',
    warnings: ['Zawiera tiaminazę — nie stosować długotrwale (niedobór tiaminy)', 'Nie przy niewydolności nerek bez konsultacji', 'Zbierać wyłącznie Equisteum arvense, nie trujący skrzyp bagienny'],
    preparations: ['Napar z ziela'],
    description: 'Tradycyjne ziele przy drogach moczowych z działaniem moczopędnym, ale wymaga ostrożności — zawarta tiaminaza przy dłuższym stosowaniu może powodować niedobór witaminy B1.',
    activeCompounds: ['Krzemionka', 'Tiaminaza', 'Flawonoidy'], safetyRating: 3,
  },
  {
    id: 'psyllium', name: 'Babka jajowata (płesznik)', latinName: 'Plantago ovata', category: 'digestive',
    benefits: ['Reguluje perystaltykę jelit', 'Pomaga przy zaparciach i luźnych stolcach', 'Ułatwia wydalanie kłaczków u kotów', 'Naturalna substancja śluzowa'],
    usageFor: ['both'], dosage: '1/4–1/2 łyżeczki łusek babki wymieszanej z wilgotną karmą, 1x dziennie; zawsze z dostępem do wody',
    warnings: ['Podawać wyłącznie z wilgotną karmą lub wodą — na sucho może obrzęknąć i zablokować przewód', 'Zachować odstęp od podawania leków (min. 2 godz. — może obniżać wchłanianie)', 'Nie przy podejrzeniu niedrożności jelit'],
    preparations: ['Łuski babki (psyllium) wymieszane z wilgotną karmą'],
    description: 'Naturalne włókno regulujące trawienie — klasyk przy zaparciach i problemach z kłaczkami u kotów. Kluczowe: zawsze mieszać z wilgotną karmą i zapewnić wodę.',
    activeCompounds: ['Błonnik rozpuszczalny', 'Substancje śluzowe'], safetyRating: 5,
  },
  {
    id: 'plantain', name: 'Babka lancetowata', latinName: 'Plantago lanceolata', category: 'respiratory',
    benefits: ['Łagodzi kaszel i podrażnienie gardła', 'Wykrztuśne, ułatwia odkrztuszanie', 'Osłania błony śluzowe dróg oddechowych'],
    usageFor: ['both'], dosage: 'Napar z liści, 1–2 łyżki dziennie przez kilka dni',
    warnings: ['Rzadko może wywołać reakcję alergiczną', 'Uporczywy kaszel wymaga diagnostyki weterynaryjnej'],
    preparations: ['Napar z liści', 'Syrop z babki (przeznaczony dla zwierząt)'],
    description: 'Łagodne ziele wykrztuśne i osłaniające — pomocne przy suchym, drażniącym kaszlu u psów i kotów.',
    activeCompounds: ['Substancje śluzowe', 'Irydoidy', 'Aucubina'], safetyRating: 5,
  },
  {
    id: 'catnip', name: 'Kocimiętka', latinName: 'Nepeta cataria', category: 'calming',
    benefits: ['Działa euforiecznie u kotów — zabawa i relaks', 'Może zmniejszać napięcie w nowych sytuacjach', 'Naturalny „eksponat" stymulujący aktywność kotów'],
    usageFor: ['cat'], catCaution: 'Około 30% kotów nie reaguje na kocimiętkę (cecha genetyczna) — to normalne.',
    dosage: 'Szczypię suszu na podłoże/zabawkę, 2–3x w tygodniu',
    warnings: ['U części kotów może powodować pobudzenie/agresję — obserwować reakcję', 'Nie codziennie — zmniejsza efekt', 'Nie podawać kociętom przed 3–4 miesiącem życia'],
    preparations: ['Susz posypany na matę/zabawkę', 'Napar (łagodny, uspokajający w małych ilościach)'],
    description: 'Niezastąpione „zioło kocie" — nepetalakton wywołuje u większości kotów chwilową euforię i relaks. Nietoksyczna, bezpieczna jako zabawka i środek uspokajający.',
    activeCompounds: ['Nepetalakton', 'Irydoidy'], safetyRating: 5,
  },
  {
    id: 'flaxseed', name: 'Siemię lniane', latinName: 'Linum usitatissimum', category: 'digestive',
    benefits: ['Źródło kwasów omega-3', 'Reguluje trawienie — pomaga przy zaparciach', 'Poprawia kondycję skóry i sierści'],
    usageFor: ['both'], dosage: 'Mielone siemię 1/4–1/2 łyżeczki na 10 kg m.c. dziennie, wymieszane z karmą',
    warnings: ['Podawać mielone lub namoczone — całe nasiona przechodzą nietrawione', 'Przechowywać w lodówce (łatwo jełczeje)', 'Nie w dużych ilościach przy lekach przeciwzakrzepowych'],
    preparations: ['Mielone nasiona dodane do karmy', 'Kisiel lniany (śluz) przy podrażnionym żołądku'],
    description: 'Naturalne wsparcie trawienia i sierści — błonnik i omega-3 z siemienia lnianego. Kluczowe jest mielenie bezpośrednio przed podaniem.',
    activeCompounds: ['Kwasy omega-3 (ALA)', 'Lignany', 'Błonnik'], safetyRating: 5,
  },
  {
    id: 'rosemary', name: 'Rozmaryn', latinName: 'Rosmarinus officinalis', category: 'digestive',
    benefits: ['Naturalny przeciwutleniacz', 'Wspomaga trawienie i apetyt', 'Działanie odstraszające na niektóre pasożyty zewnętrzne (słabe)'],
    usageFor: ['dog'], catCaution: 'Olejek eteryczny rozmarynu jest toksyczny dla kotów — unikać. Śladowa ilość suszonego zioła w karmie jest raczej bezpieczna, ale bez olejków.',
    dosage: 'Ślad suszonego rozmarynu w karmie, sporadycznie',
    warnings: ['Olejek eteryczny toksyczny dla kotów i wrażliwych psów', 'Unikać u zwierząt z padaczką (może obniżać próg drgawkowy)', 'Duże ilości drażnią przewód pokarmowy'],
    preparations: ['Śladowa ilość suszu w karmie'],
    description: 'Popularny przeciwutleniacz w karmach, ale wymagający ostrożności — olejek rozmarynowy jest problematyczny dla kotów i zwierząt z padaczką.',
    activeCompounds: ['Kwas rozmarynowy', 'Karnozol', 'Olejki eteryczne (problematyczne)'], safetyRating: 3,
  },
  {
    id: 'marshmallow', name: 'Prawoślaz lekarski', latinName: 'Althaea officinalis', category: 'respiratory',
    benefits: ['Osłania i nawilża podrażnione błony śluzowe', 'Łagodzi suchy, drażniący kaszel', 'Koi podrażniony przewód pokarmowy'],
    usageFor: ['both'], dosage: 'Napar z korzenia (zimna lub letnia maceracja zachowuje śluz), 1–2 łyżki dziennie',
    warnings: ['Substancja śluzowa może obniżać wchłanianie leków — zachować 2-godz. odstęp', 'Uporczywy kaszel wymaga diagnostyki weterynaryjnej'],
    preparations: ['Zimny wywar/napar z korzenia', 'Syrop prawoślazowy przeznaczony dla zwierząt'],
    description: 'Bogaty w substancje śluzowe, które osłaniają podrażnione gardło i drogi oddechowe — klasyka przy suchym kaszlu. Podobnie łagodzi podrażniony przewód pokarmowy.',
    activeCompounds: ['Substancje śluzowe (polisacharydy)', 'Flawonoidy'], safetyRating: 5,
  },
  {
    id: 'cistus', name: 'Czystek', latinName: 'Cistus incanus', category: 'immune',
    benefits: ['Bogaty w polifenole — wsparcie odporności', 'Wspomaga ochronę przed kleszczami (tradycyjne zastosowanie)', 'Działanie antyoksydacyjne'],
    usageFor: ['both'], dosage: 'Napar z ziela, 1–2 łyżki dziennie, kuracje 2–4 tygodnie',
    warnings: ['Nie zastępuje leków przeciwkleszczowych — to jedynie wsparcie', 'Ograniczone badania u zwierząt — stosować ostrożnie'],
    preparations: ['Napar z suszonego ziela', 'Proszek dodany do karmy'],
    description: 'Popularne w Polsce zioło o działaniu antyoksydacyjnym, tradycyjnie stosowane jako wsparcie w okresie kleszczowym — ale nigdy zamiast właściwej ochrony przeciwkleszczowej.',
    activeCompounds: ['Polifenole', 'Katechiny'], safetyRating: 4,
  },
  {
    id: 'yarrow', name: 'Krwawnik', latinName: 'Achillea millefolium', category: 'skin',
    benefits: ['Łagodzi drobne krwawienia naskórkowe', 'Wspomaga gojenie ran i otarć', 'Działa przeciwzapalnie na skórę'],
    usageFor: ['both'], dosage: 'Przestudzony napar jako okład lub przemywanie rany, 2–3x dziennie',
    warnings: ['Może wywołać reakcję alergiczną u zwierząt wrażliwych na astrowate', 'Nie na głębokie rany — tylko drobne skaleczenia', 'Nie podawać doustnie u ciężarnych samic'],
    preparations: ['Okład z naparu', 'Przemywanie rany naparem'],
    description: 'Klasyczne „zioło ran" — krwawnik tamował drobne krwawienia od starożytności. Stosowany głównie zewnętrznie na drobne skaleczenia i otarcia.',
    activeCompounds: ['Achilleina', 'Flawonoidy', 'Tujon (śladowo)'], safetyRating: 4,
  },
  {
    id: 'arnica', name: 'Arnika górska', latinName: 'Arnica montana', category: 'skin',
    benefits: ['Łagodzi siniaki i stłuczenia', 'Działa przeciwobrzękowo', 'Wspomaga przy naciągnięciach'],
    usageFor: ['both'], dosage: 'Wyłącznie zewnętrznie — okład lub maść na nieuszkodzoną skórę 2x dziennie',
    warnings: ['Doustnie toksyczna — nigdy nie podawać do jedzenia', 'Nie nakładać na otwarte rany ani błony śluzowe', 'Pilnować, by zwierzę nie zlizało preparatu', 'Rzadko reakcja alergiczna skórna'],
    preparations: ['Maść/żel arnikowy na sierść/skórę (nieuszkodzoną)', 'Okład z rozcieńczonej nalewki'],
    description: 'Standard przy siniakach i stłuczeniach, ale wyłącznie zewnętrznie — spożyta arnika jest toksyczna. Uważać, by zwierzę nie zlizało po nałożeniu.',
    activeCompounds: ['Helenalina', 'Flawonoidy'], safetyRating: 3,
  },
  {
    id: 'motherwort', name: 'Serdecznik', latinName: 'Leonurus cardiaca', category: 'calming',
    benefits: ['Łagodzi lęk i napięcie', 'Wspiera spokój w sytuacjach stresowych', 'Tradycyjnie wspomaga pracę serca przy napięciu'],
    usageFor: ['both'], catCaution: 'U kotów tylko małe ilości — może powodować senność.',
    dosage: 'Napar, małe ilości, doraźnie przed sytuacją stresową',
    warnings: ['Nasila działanie leków uspokajających i nasercowych — konsultacja z weterynarzem', 'Nie u zwierząt ciężarnych', 'Ostrożnie przy niedoczynności tarczycy'],
    preparations: ['Napar z ziela'],
    description: 'Łagodne ziele uspokajające z tradycyjnym zastosowaniem przy napięciu i lęku — stosować ostrożnie ze względu na interakcje z lekami uspokajającymi.',
    activeCompounds: ['Leonuryna', 'Stachydryna', 'Flawonoidy'], safetyRating: 3,
  },
  {
    id: 'devilsclaw', name: 'Czarci pazur', latinName: 'Harpagophytum procumbens', category: 'joints',
    benefits: ['Łagodzi ból i stan zapalny stawów', 'Wspiera ruchomość u starszych psów', 'Alternatywa wspomagająca przy lekkiej dyskomforcie stawów'],
    usageFor: ['dog'], catCaution: 'U kotów dane ograniczone — stosować wyłącznie po konsultacji z weterynarzem.',
    dosage: 'Standaryzowany ekstrakt dla zwierząt wg preparatu, krótkie/średnie kuracje',
    warnings: ['Może drażnić żołądek — podawać z karmą', 'Nie łączyć z NLPZ bez konsultacji', 'Unikać przy wrzodach żołądka i cukrzycy', 'Przeciwwskazany u ciężarnych samic'],
    preparations: ['Ekstrakt standaryzowany (tabletki/proszek dla zwierząt)'],
    description: 'Najlepiej przebadane zioło przeciwreumatyczne — harpagozyd działa przeciwzapalnie i przeciwbólowo, pomocny u starszych psów ze sztywnością stawów.',
    activeCompounds: ['Harpagozyd', 'Harpagid', 'Irydoidy'], safetyRating: 3,
  },
  {
    id: 'boswellia', name: 'Kadzidłowiec indyjski', latinName: 'Boswellia serrata', category: 'joints',
    benefits: ['Działa przeciwzapalnie na stawy', 'Wspiera ruchomość i komfort przy artrozie', 'Może łagodzić ból bez działania na żołądek jak NLPZ'],
    usageFor: ['dog'], dosage: 'Standaryzowany ekstrakt dla zwierząt (min. 60% kwasu boswellowego), wg preparatu',
    warnings: ['Wybierać preparaty standaryzowane dla zwierząt', 'Ograniczone dane u kotów', 'Rzadko może powodować dolegliwości żołądkowe'],
    preparations: ['Ekstrakt standaryzowany (kapsułki/proszek dla zwierząt)'],
    description: 'Kwas boswellowy hamuje enzymy zapalne w inny sposób niż NLPZ — pomocny przy chorobie zwyrodnieniowej stawów u psów, często w składzie preparatów stawowych.',
    activeCompounds: ['Kwasy boswellowe', 'AKBA'], safetyRating: 4,
  },
  {
    id: 'burdock', name: 'Łopian', latinName: 'Arctium lappa', category: 'skin',
    benefits: ['Wspomaga zdrowie skóry i sierści', 'Działa oczyszczająco i wspiera wydalanie produktów przemiany', 'Pomocny przy łupieżu i wypryskach'],
    usageFor: ['both'], dosage: 'Napar z korzenia 1x dziennie lub okład z naparu na zmienioną skórę',
    warnings: ['Może obniżać poziom cukru we krwi — ostrożnie u cukrzyków', 'Nie u zwierząt z kamicą żółciową'],
    preparations: ['Napar z korzenia', 'Okład z naparu na skórę'],
    description: 'Tradycyjne „zioło skóry" — inulina i polifenole z korzenia łopianu wspierają oczyszczanie organizmu i kondycję problematycznej skóry.',
    activeCompounds: ['Inulina', 'Polifenole', 'Arktiolina'], safetyRating: 4,
  },
];

export const HERB_IMAGES: Record<string, string> = {
  chamomile: '/herbs/chamomile.jpg', turmeric: '/herbs/turmeric.jpg', valerian: '/herbs/valerian.jpg',
  nettle: '/herbs/nettle.jpg', dandelion: '/herbs/dandelion.jpg', echinacea: '/herbs/echinacea.jpg',
  calendula: '/herbs/calendula.jpg', thyme: '/herbs/thyme.jpg', peppermint: '/herbs/peppermint.jpg',
  ginger: '/herbs/ginger.jpg', fennel: '/herbs/fennel.jpg', elderberry: '/herbs/elderberry.jpg',
  aloe: '/herbs/aloe.jpg', oats: '/herbs/oats.jpg', lemonbalm: '/herbs/lemonbalm.jpg',
  lavender: '/herbs/lavender.jpg', willow: '/herbs/willow.jpg', elecampane: '/herbs/elecampane.jpg',
  licorice: '/herbs/licorice.jpg', milkthistle: '/herbs/milkthistle.jpg', cranberry: '/herbs/cranberry.jpg',
  horsetail: '/herbs/horsetail.jpg', psyllium: '/herbs/psyllium.jpg', plantain: '/herbs/plantain.jpg',
  catnip: '/herbs/catnip.jpg', flaxseed: '/herbs/flaxseed.jpg', rosemary: '/herbs/rosemary.jpg',
  marshmallow: '/herbs/marshmallow.jpg', cistus: '/herbs/cistus.jpg', yarrow: '/herbs/yarrow.jpg',
  arnica: '/herbs/arnica.jpg', motherwort: '/herbs/motherwort.jpg', devilsclaw: '/herbs/devilsclaw.jpg',
  boswellia: '/herbs/boswellia.jpg', burdock: '/herbs/burdock.jpg',
};

export const HERB_EMOJI: Record<string, string> = {
  chamomile: '🌼', turmeric: '🟡', valerian: '🌸', nettle: '🍃', dandelion: '🌻',
  echinacea: '🪻', calendula: '🏵️', thyme: '🌿', peppermint: '🌱', ginger: '🫚',
  fennel: '🌿', elderberry: '🫐', aloe: '🪴', oats: '🌾', lemonbalm: '🍋',
  lavender: '💜', willow: '🌳', elecampane: '🌼', licorice: '🪵',
  milkthistle: '🪺', cranberry: '🍒', horsetail: '🎍', psyllium: '🌾', plantain: '🍃',
  catnip: '🐱', flaxseed: '🌰', rosemary: '🌲', marshmallow: '🌸', cistus: '🌺',
  yarrow: '🌼', arnica: '🌼', motherwort: '💗', devilsclaw: '🦴', boswellia: '🪵', burdock: '🌱',
};

export const RECIPES: Recipe[] = [
  {
    id: 'digestive-mix', name: 'Mieszanka na trawienie', herbIds: ['chamomile', 'dandelion', 'nettle'], category: 'digestive',
    purpose: 'Wspomaga trawienie i łagodzi dolegliwości żołądkowe',
    preparation: 'Zmieszaj zioła w równych proporcjach. 1 łyżeczkę mieszanki zalej szklanką wrzątku, zaparzaj 10 minut, przestudź.',
    dosage: '2–3 łyżki naparu 2 razy dziennie', duration: '7–14 dni',
  },
  {
    id: 'immune-mix', name: 'Wsparcie odporności', herbIds: ['echinacea', 'nettle'], category: 'immune',
    purpose: 'Wzmacnia układ odpornościowy w okresach zwiększonego ryzyka infekcji',
    preparation: 'Przygotuj napar z każdego zioła osobno, połącz w proporcji 1:1.',
    dosage: '1–2 łyżki naparu dziennie', duration: '7–10 dni, z przerwami',
  },
  {
    id: 'calming-mix', name: 'Uspokajająca mieszanka', herbIds: ['chamomile', 'valerian'], category: 'calming',
    purpose: 'Łagodzi stres i niepokój, pomaga w relaksacji przed sytuacją stresową',
    preparation: 'Rumianek i waleriana w proporcji 3:1, zaparzaj 15 minut.',
    dosage: '1–2 łyżki naparu przed sytuacją stresową', duration: 'Doraźnie, według potrzeb',
  },
  {
    id: 'skin-mix', name: 'Okład na podrażnioną skórę', herbIds: ['calendula', 'chamomile'], category: 'skin',
    purpose: 'Łagodzi podrażnienia, przyspiesza gojenie drobnych ran i otarć',
    preparation: 'Zaparz zioła w proporcji 1:1, przestudź do temperatury pokojowej, nasącz gazik.',
    dosage: 'Okłady 2–3 razy dziennie na zmienione miejsce', duration: 'Do ustąpienia podrażnienia',
  },
  {
    id: 'nausea-mix', name: 'Na mdłości i chorobę lokomocyjną', herbIds: ['ginger', 'peppermint'], category: 'digestive',
    purpose: 'Łagodzi nudności przed podróżą (mięta tylko dla psów)',
    preparation: 'Ślad startego imbiru i odrobina suszonej mięty zaparzone razem przez 5 minut.',
    dosage: 'Kilka łyżek naparu 30–60 minut przed podróżą', duration: 'Doraźnie',
  },
  {
    id: 'bloating-mix', name: 'Na wzdęcia i gazy', herbIds: ['fennel', 'chamomile'], category: 'digestive',
    purpose: 'Rozkurcza jelita, redukuje wzdęcia',
    preparation: 'Zioła w proporcji 1:1, zaparzaj 10 minut.',
    dosage: '1–2 łyżki naparu po posiłku', duration: 'Doraźnie lub do 5 dni',
  },
  {
    id: 'winter-immune-mix', name: 'Zimowy zestaw odpornościowy', herbIds: ['elderberry', 'echinacea', 'nettle'], category: 'immune',
    purpose: 'Sezonowe wsparcie odporności jesienią i zimą',
    preparation: 'Gotowy syrop z czarnego bzu połączony z naparem z echinacei i pokrzywy w proporcji 1:1.',
    dosage: 'Wg wskazań produktu + 1 łyżka naparu dziennie', duration: 'Okresowo w sezonie infekcyjnym',
  },
  {
    id: 'relax-travel-mix', name: 'Relaks przed podróżą lub wizytą u weterynarza', herbIds: ['lemonbalm', 'chamomile'], category: 'calming',
    purpose: 'Uspokojenie przed stresującą sytuacją',
    preparation: 'Zaparz zioła razem przez 10 minut, ostudź do temperatury pokojowej.',
    dosage: '2 łyżki naparu godzinę przed wyjściem', duration: 'Doraźnie',
  },
  {
    id: 'itchy-skin-mix', name: 'Kąpiel na swędzącą skórę', herbIds: ['oats', 'calendula'], category: 'skin',
    purpose: 'Łagodzi świąd i suchość skóry przy alergiach',
    preparation: 'Zmielony owies koloidalny i susz nagietka dodane do ciepłej kąpieli.',
    dosage: '1–2 kąpiele w tygodniu', duration: 'Według potrzeb',
  },
  {
    id: 'senior-joints-mix', name: 'Wsparcie stawów seniora', herbIds: ['turmeric', 'ginger', 'nettle'], category: 'joints',
    purpose: 'Łagodzi sztywność stawów u starszych zwierząt',
    preparation: 'Proszek kurkumy i imbiru dodany do karmy + osobny napar z pokrzywy.',
    dosage: 'Dawka dopasowana do wagi zwierzęcia, podawane codziennie', duration: 'Kuracja długoterminowa z okresową kontrolą weterynaryjną',
  },
  {
    id: 'cough-mix', name: 'Kaszel i katar (tylko psy)', herbIds: ['thyme', 'elecampane'], category: 'respiratory',
    purpose: 'Łagodzi kaszel i wspiera drożność dróg oddechowych u psów',
    preparation: 'Napar z obu ziół w małych ilościach, krótka kuracja.',
    dosage: 'Kilka łyżek dziennie, maksymalnie 5–7 dni', duration: '5–7 dni — niewskazane u kotów',
  },
  {
    id: 'liver-mix', name: 'Wsparcie wątroby', herbIds: ['milkthistle', 'dandelion'], category: 'digestive',
    purpose: 'Hepatoprotekcja i wsparcie pracy wątroby — np. przy terapii lekami obciążającymi wątrobę',
    preparation: 'Ekstrakt z ostropestu wg preparatu + napar z mniszka jako dodatek do picia.',
    dosage: 'Sylimaryna wg preparatu + 1 łyżka naparu z mniszka dziennie', duration: '2–4 tygodnie, kontrola enzymów wątrobowych',
  },
  {
    id: 'urinary-mix', name: 'Wsparcie dróg moczowych', herbIds: ['cranberry', 'horsetail'], category: 'urinary',
    purpose: 'Profilaktyka nawrotowych infekcji dróg moczowych u psów',
    preparation: 'Ekstrakt żurawiny wg preparatu + napar ze skrzypu (krótko, do 7 dni).',
    dosage: 'Żurawina wg preparatu + napar ze skrzypu 5–7 dni', duration: 'Skrzyp krótko; żurawina może być dłużej',
  },
  {
    id: 'hairball-mix', name: 'Kłaczki u kotów', herbIds: ['psyllium', 'flaxseed'], category: 'digestive',
    purpose: 'Ułatwia wydalanie kłaczków i reguluje trawienie u kotów',
    preparation: 'Łuski babki i mielone siemię lniane wymieszane z wilgotną karmą (ważne: zawsze wilgotna karma + woda).',
    dosage: '1/4 łyżeczki każdego składnika do wilgotnej karmy 1x dziennie', duration: 'Codziennie lub w okresie linienia',
  },
  {
    id: 'calm-cat-mix', name: 'Relaks dla kota', herbIds: ['catnip', 'lemonbalm'], category: 'calming',
    purpose: 'Zmniejszenie napięcia u kota w nowych sytuacjach (przeprowadzka, goście)',
    preparation: 'Szczypię kocimiętki na matę + letni napar z melisy do picia.',
    dosage: 'Kocimiętka 2–3x w tygodniu + napar z melisy doraźnie', duration: 'Wg potrzeb',
  },
  {
    id: 'senior-joints-strong', name: 'Zaawansowane wsparcie stawów', herbIds: ['devilsclaw', 'boswellia', 'turmeric'], category: 'joints',
    purpose: 'Kompleksowe wsparcie przy sztywności i dyskomforcie stawów u starszych psów',
    preparation: 'Ekstrakty czarciego pazura i boswellii wg preparatu + kurkuma z tłuszczem dodana do karmy.',
    dosage: 'Ekstrakty wg preparatu + kurkuma 1/4 łyżeczki na 5 kg m.c.', duration: 'Kuracja z okresową kontrolą weterynaryjną',
  },
];

export const GOALS: { category: HerbCategory; label: string; icon: any; description: string }[] = [
  { category: 'digestive', label: 'Problemy trawienne', icon: Heart, description: 'Wzdęcia, biegunka, brak apetytu' },
  { category: 'immune', label: 'Wsparcie odporności', icon: Shield, description: 'Infekcje, osłabienie, rekonwalescencja' },
  { category: 'calming', label: 'Stres i niepokój', icon: Sparkles, description: 'Burze, fajerwerki, lęk separacyjny' },
  { category: 'skin', label: 'Skóra i sierść', icon: Droplet, description: 'Podrażnienia, rany, wypryski' },
  { category: 'joints', label: 'Stawy i kości', icon: Bone, description: 'Sztywność, ból stawów, senior' },
  { category: 'respiratory', label: 'Układ oddechowy', icon: Wind, description: 'Kaszel, katar, drożność dróg oddechowych' },
  { category: 'urinary', label: 'Drogi moczowe', icon: Droplets, description: 'Pęcherz, infekcje, kamica' },
];

export const SPECIES_EMOJI: Record<string, string> = { dog: '🐶', cat: '🐱', rabbit: '🐰', bird: '🐦', hamster: '🐹', other: '🐾' };
