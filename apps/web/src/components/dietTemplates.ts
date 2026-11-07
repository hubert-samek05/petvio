export type DietTemplate = {
  type: string;
  label: string;
  description: string;
  indication: string;
  allowedFoods: string;
  forbiddenFoods: string;
  recommendations: string;
  searchTerms: string[];
};

export const DIET_TEMPLATES: DietTemplate[] = [
  {
    type: 'renal',
    label: 'Nerkowa',
    description: 'Ograniczony fosfor i białko — wsparcie przy chorobie nerek',
    indication: 'Choroba nerek / niewydolność nerek',
    allowedFoods: 'Karmy renal (np. Royal Canin Renal, Hill\'s k/d), ryż, dynia, białko jaja, chude mięso w małych ilościach, olej z łososia',
    forbiddenFoods: 'Kości, wątroba i podroby, nabiał wysokofosforowy (żółte sery), suszone skóry, karmy z fosforanami, słone przekąski, duże ilości mięsa',
    recommendations: 'Stały dostęp do świeżej wody, małe częste posiłki, regularna kontrola kreatyniny i SDMA. Unikaj przysmaków bogatych w fosfor.',
    searchTerms: ["renal veterinary diet", "kidney care karma"],
  },
  {
    type: 'diabetic',
    label: 'Cukrzycowa',
    description: 'Stałe godziny posiłków, wysokie białko, niski indeks glikemiczny',
    indication: 'Cukrzyca',
    allowedFoods: 'Karmy diabetic, chude mięso (kurczak, indyk), zielone warzywa (fasolka, brokuł), jaja',
    forbiddenFoods: 'Cukier i słodycze, ziemniaki, biały ryż, chleb, wysokowęglowodanowe karmy, przysmaki między posiłkami',
    recommendations: 'Posiłki o stałych porach zsynchronizowane z insuliną. Kontrola glukozy po zmianach diety. Nie zmieniaj ilości bez konsultacji z weterynarzem.',
    searchTerms: ["diabetic pet food", "weight control karma"],
  },
  {
    type: 'elimination',
    label: 'Eliminacyjna',
    description: 'Jedno nowe źródło białka — diagnostyka alergii pokarmowej',
    indication: 'Podejrzenie alergii pokarmowej — diagnostyka',
    allowedFoods: 'Jedno nowe białko: dziczyzna, koń, kangur lub królik + jeden węglowodan (np. ziemniak) LUB karma hydrolyzowana',
    forbiddenFoods: 'ABSOLUTNIE wszystko poza listą: przysmaki, resztki ze stołu, kości do żucia, pastylki na odrobaczenie o smaku, suplementy smakowe',
    recommendations: 'Ścisłe przestrzeganie 8-12 tygodni. Jakikolwiek błąd (1 przysmak) unieważnia test. Reakcja może trwać do 2 tygodni po kontakcie z alergenem.',
    searchTerms: ["hypoallergenic veterinary", "karma hipoalergiczna"],
  },
  {
    type: 'allergy',
    label: 'Hipoalergiczna',
    description: 'Brak najczęstszych alergenów — po potwierdzonej alergii',
    indication: 'Potwierdzona alergia pokarmowa',
    allowedFoods: 'Karmy hipoalergiczne/hydrolyzowane, białka reakcyjne dla pupila (po diagnostyce), ryż, bataty',
    forbiddenFoods: 'Kurczak, wołowina, nabiał, pszenica, soja, jaja, kukurydza — typowe alergeny (dostosuj do wyników testu eliminacyjnego)',
    recommendations: 'Dostosuj listę do wyników testu eliminacyjnego. Unikaj karm zmieniających skład (sprawdzaj etykiety przy każdym zakupie).',
    searchTerms: ["hypoallergenic dog food", "karma dla alergika"],
  },
  {
    type: 'weight',
    label: 'Odchudzająca',
    description: 'Ograniczenie kalorii, wysoka objętość przy niskiej gęstości',
    indication: 'Nadwaga / otyłość',
    allowedFoods: 'Karmy light/satiety, gotowana marchew i zielona fasolka jako uzupełnienie, dużo wody',
    forbiddenFoods: 'Przysmaki wysokokaloryczne, resztki ze stołu, karmy wysokotłuszczowe, dowolny dostęp do karmy',
    recommendations: 'Ważenie co 2 tygodnie — cel: redukcja 1-2% masy tygodniowo. Zwiększ aktywność stopniowo. Karmy light + kontrola porcji.',
    searchTerms: ["light dog food", "weight management karma"],
  },
  {
    type: 'gastro',
    label: 'Lekkostrawna',
    description: 'Dla wrażliwego żołądka — łatwe do strawienia składniki',
    indication: 'Wrażliwy żołądek / przewlekłe problemy trawienne',
    allowedFoods: 'Gotowany kurczak bez skóry, gotowany ryż, dynia, marchew, karmy gastrointestinal (np. Royal Canin GI, Hill\'s i/d)',
    forbiddenFoods: 'Tłuste potrawy, smażone, surowe mięso, nabiał, ostre przyprawy, nagłe zmiany karmy, duże pojedyncze posiłki',
    recommendations: '3-4 małe posiłki dziennie. Zmiany karmy wprowadzaj stopniowo przez 7-10 dni. Stałe składniki bez eksperymentów.',
    searchTerms: ["gastrointestinal dog food", "karma lekkostrawna"],
  },
  {
    type: 'hepatic',
    label: 'Wątrobowa',
    description: 'Wysokiej jakości białko w umiarkowanej ilości, mało miedzi',
    indication: 'Choroby wątroby',
    allowedFoods: 'Karmy hepatic, ryż, gotowany kurczak, białko jaja, warzywa, niskomiedziowe źródła białka',
    forbiddenFoods: 'Wątroba i podroby (wysoka miedź), duże ilości czerwonego mięsa, tłuste karmy, kości',
    recommendations: 'Małe częste posiłki. Regularne badania ALT/ALP/bilirubiny. Unikaj suplementów z miedzią.',
    searchTerms: ["hepatic dog food", "liver care karma"],
  },
  {
    type: 'urinary',
    label: 'Moczowa',
    description: 'Wsparcie dróg moczowych — zakwaszanie moczu i nawodnienie',
    indication: 'Kamica moczowa (struwity/uraty) / zapalenie pęcherza',
    allowedFoods: 'Karmy urinary (Royal Canin Urinary, Hill\'s c/d), mokra karma, duże ilości wody, brusznica (potencjalnie)',
    forbiddenFoods: 'Skóry i podroby (wysokie puryny), słone karmy, małe ilości wody, karmy alkalizujące mocz',
    recommendations: 'Podwyższ nawodnienie — mokra karma lub dodawanie wody. Regularne badania moczu. Pilnuj otyłości.',
    searchTerms: ["urinary care dog", "karma urinary"],
  },
  {
    type: 'barf',
    label: 'BARF',
    description: 'Surowe karmienie — wymaga zbalansowanego planu',
    indication: 'Decyzja o karmieniu surowym',
    allowedFoods: 'Surowe mięso mięśniowe, kości miękkie, wątroba, inne narządy, warzywa i owoce, oleje, suplementy (wapń, omega-3)',
    forbiddenFoods: 'Kości gotowane/suszone (łamią się!), cebula, czosnek, winogrona, czekolada, ksylitol, awokado, orzechy makadamia',
    recommendations: 'WYMAGA zbalansowanego planu — użyj kalkulatora BARF w aplikacji. Nigdy nie gotuj kości. Regularne badania kału.',
    searchTerms: ["raw dog food", "karma surowa"],
  },
  {
    type: 'senior',
    label: 'Senior',
    description: 'Dla starszych zwierząt — mniej kalorii, wsparcie stawów',
    indication: 'Podeszły wiek (pies 7+, kot 11+)',
    allowedFoods: 'Karmy senior, łatwe do strawienia białko, omega-3, glukozamina/chondroityna, antyoksydanty',
    forbiddenFoods: 'Wysokokaloryczne przysmaki, tłuste karmy, duże pojedyncze posiłki',
    recommendations: 'Regularne badania krwi co 6 miesięcy. Kontrola wagi i mobilności. Suplementy na stawy wg zaleceń weterynarza.',
    searchTerms: ["senior dog food", "karma senior"],
  },
  {
    type: 'other',
    label: 'Własna dieta',
    description: 'Niestandardowe zalecenia żywieniowe',
    indication: '',
    allowedFoods: '',
    forbiddenFoods: '',
    recommendations: '',
    searchTerms: ["karma"],
  },
];

export const getDietTemplate = (type: string) =>
  DIET_TEMPLATES.find((t) => t.type === type);
