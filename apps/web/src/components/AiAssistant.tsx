'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Send,
  Sparkles,
  User,
  Bot,
  X,
  Clock,
  Trash2,
  Lightbulb,
  PawPrint,
  Heart,
  Stethoscope,
  Bone,
  Scissors,
  Activity,
  AlertCircle,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface Conversation {
  id: string;
  title: string;
  role?: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

const aiRoles = [
  {
    id: 'general',
    name: 'Ogólny asystent',
    icon: Bot,
    description: 'Pytania ogólne o opiekę nad zwierzętami',
    color: 'from-[#1B6B4A] to-[#2A8A5C]',
  },
  {
    id: 'health',
    name: 'Asystent zdrowia',
    icon: Stethoscope,
    description: 'Wskazówki zdrowotne, objawy, pierwsza pomoc',
    color: 'from-emerald-500 to-teal-600',
  },
  {
    id: 'nutrition',
    name: 'Doradca żywieniowy',
    icon: Bone,
    description: 'Diety, karmy, suplementy, porcje',
    color: 'from-orange-500 to-amber-600',
  },
  {
    id: 'behavior',
    name: 'Behawiorysta AI',
    icon: PawPrint,
    description: 'Problemy behawioralne, tresowanie',
    color: 'from-purple-500 to-pink-600',
  },
  {
    id: 'grooming',
    name: 'Pielęgnacja',
    icon: Scissors,
    description: 'Pielęgnacja sierści, pazurów, uszu',
    color: 'from-rose-500 to-pink-600',
  },
  {
    id: 'activity',
    name: 'Trening i aktywność',
    icon: Activity,
    description: 'Ćwiczenia, spacery, kondycja',
    color: 'from-cyan-500 to-blue-600',
  },
];

const suggestedQuestions = {
  general: [
    'Jak przygotować dom na przyjęcie szczeniaka?',
    'Ile razy dziennie powinien jeść dorosły pies?',
    'Jakie są podstawowe szczepienia dla kota?',
    'Jak rozpoznać stres u zwierzęcia?',
  ],
  health: [
    'Mój pies ma biegunkę, co robić?',
    'Jakie są objawy przegrzania u psa?',
    'Czy mogę podać paracetamol psu?',
    'Jak założyć opatrunek na łapę?',
  ],
  nutrition: [
    'Czy pies może jeść awokado?',
    'Jaką karmę wybrać dla kota z nadwagą?',
    'Ile kalorii dziennie potrzebuje mój pies?',
    'Czy można dawać psu kości?',
  ],
  behavior: [
    'Jak oduczyć psa szczekania na listonosza?',
    'Dlaczego mój kot drapie kanapę?',
    'Jak nauczyć psa chodzenia na smyczy?',
    'Co zrobić gdy pies płacze w nocy?',
  ],
  grooming: [
    'Jak często kąpać psa?',
    'Jak przycinać pazury kotu?',
    'Jaka szczotka jest najlepsza dla sierści długowłosej?',
    'Jak czyścić uszy psu?',
  ],
  activity: [
    'Ile spacerów dziennie potrzebuje młody pies?',
    'Jakie ćwiczenia dla psa z dysplazją?',
    'Czy rower jest bezpieczny dla psa?',
    'Jak zacząć trening z psem?',
  ],
};

export default function AiAssistant() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [activeRole, setActiveRole] = useState('general');
  const [isTyping, setIsTyping] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [view, setView] = useState<'roles' | 'chat'>('roles');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('aiConversations');
    if (saved) {
      try {
        setConversations(JSON.parse(saved));
      } catch {}
    }
    // Start on role selection screen, not inside chat
    setActiveConversation(null);
    setView('roles');
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversations, activeConversation, isTyping]);

  const currentConversation = conversations.find(c => c.id === activeConversation);

  const normalizeText = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^\wąćęłńóśźż\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const knowledgeBase: Record<string, { keywords: string[]; answer: string }[]> = {
    general: [
      {
        keywords: ['szczepienie', 'szczepionka', 'szczepic', 'szczepienia', 'szczeniak szczepienia', 'wscieklizna', 'nosowka', 'parwowirus'],
        answer: `Zgodnie z wytycznymi WSAVA (World Small Animal Veterinary Association) psy powinny otrzymywać szczepienia podstawowe (core): wścieklizna, nosówka, parwowiroza oraz zakażenie adenowirusem (wątrobowość).\n\nTypowy harmonogram dla szczeniaka:\n• 6-8 tygodni: pierwsza dawka\n• 10-12 tygodni: druga dawka\n• 14-16 tygodni: trzecia dawka\n• 12 miesiąc: przypomnienie\n\nW Polsce szczepienie przeciw wściekliźnie jest obowiązkowe. W niektórych regionach dodatkowo zaleca się szczepienie przeciwko leptospirozie. Po pierwszym roku przypomnienie wykonuje się zazwyczaj co 1-3 lata, w zależności od preparatu i ryzyka. Zawsze konsultuj indywidualny plan z weterynarzem.`,
      },
      {
        keywords: ['odrobaczanie', 'odrobaczyc', 'robaki', 'pasozyty', 'glisty', 'tasiemce'],
        answer: `Obecne wytyczna zalecają odrobaczanie ukierunkowane, a nie rutynowe w nieskończoność.\n\nStandardowo:\n• Szczeniaki: odrobaczanie co 2 tygodnie od 2. do 12. tygodnia życia, potem co miesiąc do 6. miesiąca.\n• Dorosłe psy: co 3-6 miesięcy, jeśli istnieje ryzyko, lub na podstawie badań kału (koprologia).\n\nWarto co roku wykonać badanie kału, aby sprawdzić obecność jaj pasożytów i dobrać preparat. Nie wszystkie środki działają na wszystkie pasożyty, więc lepiej podać lek po identyfikacji zagrożenia.`,
      },
      {
        keywords: ['sterylizacja', 'sterylizowac', 'kastracja', 'kastrowac', 'rujka', 'cieczka', 'kocur', 'suka'],
        answer: `Decyzja o sterylizacji/kastracji powinna być indywidualna i uzależniona od rasy, wielkości, płci i stanu zdrowia.\n\nKorzyści:\n• mniejsze ryzyko nowotworów piersi u suk i gruczołu prostaty u psów,\n• eliminacja ciąż i cieczek,\n• zmniejszenie zachowań terytorialnych i ucieczek.\n\nRyzyka:\n• u dużych ras wczesna kastracja może zwiększać ryzyko dysplazji, nowotworów kości i chorób układowych, dlatego u psów ras dużych często opóźnia się zabieg do momentu dojrzałości fizycznej (12-24 miesiące).\n\nSkonsultuj termin z weterynarzem.`,
      },
      {
        keywords: ['mikrochip', 'chip', 'identyfikacja', 'zaginiecie', 'zarejestrowac'],
        answer: `Mikroczip to bezpieczny i trwały sposób identyfikacji zwierzęcia. W Polsce obowiązkowy chipping dotyczy m.in. psów i niektórych regionów.\n\nNajważniejsze zasady:\n• Czip można wszczepić już u szczeniaka (najczęściej po 8 tygodniu).\n• Samo wszczepienie nie wystarczy – dane muszą być zarejestrowane w bazie (np. Safe-Animal, PESELZWIERZAKA).\n• Po przeprowadzce lub zmianie telefonu zaktualizuj dane w bazie.\n• Raz do roku poproś weterynarza o odczytanie czipa, aby upewnić się, że nie przemieścił się.`,
      },
      {
        keywords: ['badanie', 'kontrola', 'profilaktyka', 'badania profilaktyczne', 'wizyta kontrolna'],
        answer: `Regularne badania profilaktyczne pozwalają wcześnie wykryć choroby, zanim staną się poważne.\n\nZalecenia:\n• Dorosłe zwierzę (1-7 lat): przynajmniej raz w roku kompletne badanie fizykalne + analiza kału.\n• Senior (powyżej 7-10 lat, zależnie od rasy): co 6-12 miesięcy, często z morfologią, biochemią i badaniem moczu.\n• Waga, stan zębów, uszu, skóry, serca i stawów to podstawa każdej wizyty.\n\nProfilaktyka jest tańsza i skuteczniejsza niż leczenie zaawansowanych chorób.`,
      },
    ],
    health: [
      {
        keywords: ['biegunka', 'rozwolnienie', 'luźny stolec', 'kał wodnisty', 'biegunka u psa'],
        answer: `Biegunka u psa może mieć wiele przyczyn: dieta, stres, pasożyty, infekcje, niepożyte jedzenie lub choroby przewlekłe.\n\nPierwsza pomoc (jeśli pies jest w dobrej kondycji):\n• Pół-głodówka przez 12-24 godziny (woda do woli).\n• Potem lekkostrawny posiłek: gotowane białe mięso (kurczak/indyk) z ryżem w proporcji 1:3, małe porcje co 3-4 godziny.\n• Podaw elektrolity dostępne w aptece weterynaryjnej.\n\nNatychmiast do weterynarza, jeśli:\n• biegunka trwa dłużej niż 24-48 godzin,\n• jest krew,\n• występują wymioty, gorączka, apatia lub odwodnienie,\n• dotyczy szczeniaka, seniora lub psa z chorobą przewlekłą.`,
      },
      {
        keywords: ['wymioty', 'wymiotuje', 'rzyga', 'rzyganie', 'nudności'],
        answer: `Pojedynczy epizod wymiotów u psa zazwyczaj nie jest powodem do paniki. Najczęściej przyczyną jest podrażniony żołądek.\n\nPostępowanie:\n• Wstrzymaj jedzenie na 6-12 godzin, pozostaw świeżą wodę.\n• Po przerwie podaj mały posiłek lekkostrawny.\n• Obserwuj, czy wymioty powtarzają się.\n\nDo lekarza natychmiast, gdy:\n• wymioty są częste lub zawierają krew,\n• pies wymiotuje żółcią lub pianą,\n• występuje brzuch w kształcie beczki, ospałość,\n• podejrzewasz spożycie trucizny, czekolady lub leków.`,
      },
      {
        keywords: ['przegrzanie', 'udar cieplny', 'upal', 'dyszenie', 'gorąco', 'ciepło'],
        answer: `Przegrzanie psa to stan zagrożenia życia. Objawy: intensywne dyszenie, nadmierne ślinienie, niepokój, ciemnoczerwony język, biegunka, wymioty, osłabienie lub utrata przytomności.\n\nPierwsza pomoc:\n• Przenieś psa do cienia lub klimatyzowanego pomieszczenia.\n• Oferuj wodę do picia (nie zmuszaj).\n• Chłodź ciało letnią (nie lodowatą) wodą – szczególnie łapy, brzuch, uszy i szyję.\n• Użyj wentylatora.\n• Mierz temperaturę odbytniczą. Powyżej 40°C to stan bezpośredniego zagrożenia.\n\nPo wstępnym schłodzeniu udaj się do weterynarza, nawet jeśli pies wygląda na lepszego. Nie stosuj lodu bezpośrednio na skórę ani nie zanurzaj psa w zimnej wodzie – może to wywołać wstrząs.`,
      },
      {
        keywords: ['kleszcz', 'kleszcze', 'borelioza', 'babeszjoza', 'ehrlichioza', 'usuwanie kleszcza'],
        answer: `Profilaktyka przeciwko kleszczom jest skuteczniejsza niż leczenie następstw ukąszenia. Stosuj preparaty zalecane przez weterynarza (obroże, krople, tabletki) regularnie zgodnie z ulotką.\n\nJak usunąć kleszcza:\n• Użyj cienkich pęsetek lub specjalnego haczyka.\n• Chwyć kleszcza jak najbliżej skóry, tuż przy głowie.\n• Pociągnij powoli i równomiernie do góry, nie skręcając.\n• Nie używaj benzyny, oleju ani spirytusu – może to spowodować wymiotowanie kleszcza i zwiększyć ryzyko infekcji.\n• Miejsce przemyj wodą z mydłem.\n\nObserwuj psa przez 2-4 tygodnie: gorączka, kulawizny, brak apetytu, apatia – sygnał do wizyty.`,
      },
      {
        keywords: ['ucho', 'uszy', 'zapalenie ucha', 'drapie ucha', 'wyciek z ucha', 'smród z ucha'],
        answer: `Zapalenie ucha zewnętrznego (otitis externa) jest jedną z najczęstszych przyczyn wizyt. Objawy: drapanie ucha, potrząsanie głową, nieprzyjemny zapach, zaczerwienienie, wydzielina.\n\nPostępowanie:\n• Nie czyść słuchawkiem czy patyczakami w głębi ucha – możesz uszkodzić błonę bębenkową lub wcisnąć zanieczyszczenia.\n• Możesz delikatnie przetrzeć widoczną, zewnętrzną część małżowiny czystym płatkiem kosmetycznym.\n• Nie stosuj kropli bez konsultacji, jeśli podejrzewasz perforację błony bębenkowej.\n\nWeterynarz najpierpierw wykona cytologię ucha, aby określić, czy to bakterie, grzyby czy roztocza, i dobierze odpowiednie leczenie.`,
      },
      {
        keywords: ['nadwaga', 'otylosc', 'tluszcz', 'waga', 'odchudzanie', 'gruby'],
        answer: `Otyłość u psów i kotów znacząco skraca życie i zwiększa ryzyko cukrzycy, chorób stawów, serca i wątroby.\n\nJak ocenić:\n• Warunkowość ciała (BCS) powinna wynosić 4-5/9.\n• Wyczuwalne żebra przy lekkim nacisku, zarys talii od góry.\n\nProgram odchudzania:\n• Zmierz dokładnie karmę i podawaj porcje o 10-20% mniejsze niż obecnie.\n• Wybierz karmę o odpowiedniej gęstości energetycznej.\n• Wyklucz przysmaki i „resztki ze stołu”.\n• Zwiększ aktywność stopniowo.\n• Celem jest utrata około 1-2% masy ciała tygodniowo.\n\nRegularnie waż zwierzę. Skonsultuj dietę z weterynarzem, szczególnie jeśli istnieją choroby współistniejące.`,
      },
    ],
    nutrition: [
      {
        keywords: ['czekolada', 'czekolady', 'kakao', 'słodycze', 'trucizna'],
        answer: `Czekolada zawiera teobrominę i kofeinę, które są toksyczne dla psów i kotów. Im ciemniejsza czekolada, tym wyższe stężenie teobrominy.\n\nObjawy zatrucia pojawiają się zazwyczaj w ciągu 6-12 godzin:\n• wymioty i biegunka,\n• nadmierna pobudliwość,\n• drgawki i kichanie serca,\n• w ciężkich przypadkach śpiączka i zgon.\n\nJeśli pies zjadł czekoladę, jak najszybciej skontaktuj się z weterynarzem lub toksykologicznym centrum dla zwierząt. Podaj masę psa, rodzaj czekolady i przybliżoną ilość. Nie wywołuj wymiotów bez konsultacji.`,
      },
      {
        keywords: ['awokado', 'awokado dla psa', 'awokado dla kota', 'persyna'],
        answer: `Awokado zawiera persynę – substancję, która u niektórych zwierząt (np. ptaków, gryzoni, koni) może być niebezpieczna. U psów i kotów miąższ w małych ilościach zazwyczaj nie jest śmiertelnie toksyczny, ale może powodować wymioty i biegunkę.\n\nWiększe zagrożenie stanowi:\n• Pestka awokada – ryzyko zadławienia i niedrożności jelit.\n• Skórka – trudna do strawienia.\n\nNajlepiej nie podawać awokado zwierzętom. Jeśli pies zjadł pestkę lub większą ilość miąższu, skontaktuj się z weterynarzem.`,
      },
      {
        keywords: ['kosci', 'kość', 'gryzienie kości', 'surowe kości', 'gotowane kości'],
        answer: `Podawanie kości wiąże się z poważnymi ryzykami.\n\nGotowane kości:\n• Stają się kruche i mogą dzielić się na ostre odłamki, które kaleczą przełyk, żołądek i jelita, a także powodują zablokowanie.\n\nSurowe kości:\n• Mogą zawierać Salmonellę, E. coli i Campylobacter.\n• Twarde kości (np. udźce wołowe) mogą złamać zęby.\n\nBezpieczniejsze alternatywy:\n• Żwacze dentystyczne rekomendowane przez VOHC.\n• Zabawki typu Kong wypełnione pastą do zabawek.\n• Naturalne gryzaki rzepakowe lub rybackie dostosowane do wielkości psa.\n\nUnikaj kości wędlin, drobiowych i gotowanych.`,
      },
      {
        keywords: ['barf', 'surowa dieta', 'surowe mięso', 'dieta naturalna'],
        answer: `Dieta BARF i inne surowe diety są kontrowersyjne. Organizacje takie jak AVMA i WSAVA zalecają, aby diety surowe były omijane ze względu na ryzyko bakteryjne, pasożytnicze i odżywcze.\n\nGłówne zagrożenia:\n• bakterie (Salmonella, E. coli, Campylobacter, Listeria),\n• niedobory lub nadmiar składników odżywczych,\n• uszkodzenia zębów od kości,\n• ryzyko dla członków rodziny (zanieczyszczenie krzyżowe).\n\nJeśli chcesz karmić świeżo, najbezpieczniejszym rozwiązaniem jest konsultacja z certyfikowanym dietetykiem weterynaryjnym, który ustali zbilansowaną recepturę.`,
      },
      {
        keywords: ['cebula', 'czosnek', 'por', 'luk', 'trucizna cebula'],
        answer: `Cebula, czosnek, por i szczypiorek zawierają związki siarczkowe (N-propyl disulfid), które uszkadzają czerwone krwinki u psów i kotów, prowadząc do niedokrwistości.\n\nToksyczna dawka u psów wynosi około 15-30 g/kg cebuli (świeżej), ale chroniczne małe dawki również są szkodliwe.\n\nObjawy mogą wystąpić z opóźnieniem (1-3 dni):\n• wymioty, biegunka, brak apetytu,\n• bladość błon śluzowych,\n• ciemny mocz (kolor kawy z mlekiem),\n• osłabienie i przyspieszona czynność serca.\n\nNawet małe ilości gotowanych cebuli w jedzeniu są niebezpieczne. W razie podejrzenia zatrucia – szybko do weterynarza.`,
      },
    ],
    behavior: [
      {
        keywords: ['szczekanie', 'dzwonek', 'listonosz', 'szczeka', 'szczeka na'],
        answer: `Szczekanie na dzwonek lub listonosza często wynika z zaskoczenia, terytorializmu lub chęci „zapędzenia” intruza.\n\nSkuteczny trening:\n• Desensytyzacja dźwięku dzwonka: nagrywaj dzwonek w bardzo niskiej głośności i nagradzaj spokojne zachowanie. Zwiększaj głośność stopniowo.\n• Naucz komendę alternatywną, np. „idź do miejsca” z nagrodą.\n• Nie krzycz – pies może pomyśleć, że dołączasz do szczekania.\n• Nagradzaj spokojne zachowanie przed, w trakcie i po sygnałach z zewnątrz.\n\nTrening wymaga systematyczności. Krótkie sesje 5-10 minut dziennie dają najlepsze efekty.`,
      },
      {
        keywords: ['ciagnie na smyczy', 'ciagnie', 'smycz', 'spacer smycz', 'chodzenie na smyczy'],
        answer: `Ciągnięcie na smyczy to jeden z najczęstszych problemów, ale jest rozwiązywalny przy konsekwencji.\n\nMetoda „zatrzymaj się i zawróć”:\n• Gdy smycz się napnie, stój w miejscu lub zawracaj.\n• Idź do przodu tylko wtedy, gdy smycz jest luźna.\n• Nagradzaj psa za chodzenie przy nodze (treating przy lewej nodze).\n\nSprzęt:\n• Uprząż z zapinaniem z przodu (front-clip) pomaga kierować tułowiem psa bez ucisku na krtań.\n• Unikaj obroży obrożowej u psów z problemami oddechowymi (np. mopsy, buldoggi).\n\nĆwicz w nisko stymulującym środowisku, zanim przejdziesz na ulice z dużą ilością bodźców.`,
      },
      {
        keywords: ['lek separacyjny', 'sam w domu', 'sam', 'niszczy', 'płacze', 'wyje'],
        answer: `Lęk separacyjny wymaga powolnego oswajania z samotnością. Szybkie „przetrwanie” może pogorszyć stan.\n\nProgram stopniowego zostawania samemu:\n• Rozpocznij od kilku sekund – wyjdź i wróć, zanim pies zareaguje lękiem.\n• Nagradzaj spokój, nigdy nie pocieszaj w stanie lęku (to nagradza lęk).\n• Nie rób dramatycznych pożegnań i powitań.\n• Zostaw psu zabawkę wypełnioną smakołykami lub ubrudzoną Twoim zapachem.\n• Nagła odmiana: zachowanie absolutnie spokojne podczas przygotowań do wyjścia.\n\nW ciężkich przypadkach weterynarz może zaproponować suplementy (np. Zylkene, Adaptil, Feliway) lub leczenie farmakologiczne w połączeniu z behawiorystą.`,
      },
      {
        keywords: ['kot drapie kanape', 'drapak', 'drapanie kanapy', 'drapie meble'],
        answer: `Koty drapią, bo mają taki instynkt – to nie jest zemsta. Muszą ostrzyć pazury, rozciągać się i oznaczać terytorium feromonami z gruczołów między palcami.\n\nRozwiązania:\n• Postaw wysoki, stabilny drapak (min. 70 cm) przy miejscu odpoczynku kota.\n• Zachęcaj do drapaka kocimiętką lub nagradzaj smakołkiem, gdy go używa.\n• Obuduj chronioną kanapę materiałem, którego nie lubi drapać (np. folią aluminiową, klejem na dwustronną taśmę).\n• Regularnie obcinaj pazury (nie kocioł – jest zabroniony i okrutny).\n• Spróbuj spraye z feromonami (Feliway) w miejscach, które chcesz chronić.`,
      },
      {
        keywords: ['agresja przy jedzeniu', 'broni miski', 'gryzienie przy jedzeniu', 'zazdrość o jedzenie'],
        answer: `Agresja zasobów (resource guarding) to naturalne, choć niepożądane zachowanie. Karzenie i odbieranie miski tylko pogorszy problem.\n\nBezpieczne podejście:\n• Nie zabieraj jedzenia siłą.\n• Naucz psa, że Twoja obecność przy misce = coś dobrego: podrzucaj smakołyki do miski, gdy pies je.\n• Stopniowo podchodź bliżej, zawsze wrzucając coś wartościowego.\n• Z czasem pies powinien zacząć zapraszać Cię do miski.\n• Ćwicz z pustą miską, potem z przekąskami, potem z posiłkiem.\n\nJeśli agresja jest nasilona, skonsultuj behawiorystę – samodzielna praca może być niebezpieczna.`,
      },
    ],
    grooming: [
      {
        keywords: ['kapać psa', 'kąpiel psa', 'myć psa', 'szampon', 'kąpiel kota'],
        answer: `Częstotliwość kąpieli zależy od rasy i trybu życia. Zbyt częste mycie może uszkodzić płaszcz lipidowy skóry i prowadzić do przesuszenia.\n\nWskazówki:\n• Pies zdrowy bez alergii: zazwyczaj co 4-12 tygodni.\n• Koty zazwyczaj samodzielnie utrzymują czystość; kąpiel tylko przy silnym zabrudzeniu.\n• Używaj szamponu o odpowiednim pH dla zwierząt (nie ludzkiego).\n• Dokładnie wypłukaj i wysusz sierść, szczególnie podczini.\n• Po kąpieli przemyj uszy wilgotnym ręcznikiem.\n\nW przypadku alergii skórznych weterynarz dobierze szampon leczniczy.`,
      },
      {
        keywords: ['pazury', 'paznokcie', 'obcinać pazury', 'przycinać paznokcie'],
        answer: `Pazury należy przycinać średnio co 3-4 tygodnie lub gdy słychać stukot o podłodze.\n\nTechnika:\n• Używaj cążek do pazurów (guillotine lub scissor).\n• Odetnij tylko przezroczysty, biały czubek.\n• Unikaj różowego „żywego” (nerwu i naczynia krwionośnego). U psów z ciemnymi pazurami tnij bardzo małymi kawałkami.\n• Miej pod ręką proszek zastygający krew (styptic powder).\n• U kotów przycinaj tylko czubki pazurów – nie chwytaj opuszek.\n\nW razie przypadkowego skrócenia zbyt mocno zastosuj proszek i ucisk.`,
      },
      {
        keywords: ['szczotka', 'czesać', 'sierść', 'kołtuny', 'pielęgnacja sierści', 'wyczesywanie'],
        answer: `Regularne czesanie zapobiega kołtunom, redukuje linienie i pozwala wcześnie wykryć problemy skórne.\n\nCzęstotliwość:\n• Sierść długa: codziennie lub co drugi dzień.\n• Sierść średnia: 2-3 razy w tygodniu.\n• Sierść krótka: raz w tygodniu.\n\nNarzędzia:\n• Długowłose: grzebień + szczotka pudlówka/slicker.\n• Podwójna sierść: furminator lub grzebień do podszerstka (używaj ostrożnie, aby nie uszkodzić sierści okrywowej).\n• Krótkowłose: rękawica gumowa lub szczotka z włosia.\n\nRozpocznij czesanie od młodego wieku, aby przyzwyczaić zwierzę do zabiegu.`,
      },
      {
        keywords: ['zęby', 'szczoteczka', 'kamień', 'higiena zębów', 'zeby psa', 'zeby kota'],
        answer: `Choroby przyzębia są najczęstszym problemem zdrowotnym dorosłych psów i kotów. Mogą prowadzić do utraty zębów, a bakterie przedostają się do krwiobiegu, uszkadzając serce, wątrobę i nerki.\n\nProfilaktyka:\n• Codzienne szczotkowanie pastą do zwierząt (nigdy ludzką, ponieważ zawiera fluorek, którego nie należy połykać).\n• Żwacze dentystyczne z rekomendacją VOHC jako uzupełnienie, nie zamiast szczotkowania.\n• Profesjonalne czyszczenie zębów pod narkozą w gabinecie co 1-2 lata.\n\nObjawy problemów: nieprzyjemny oddech, czerwone dziąsła, obrzęk, krwawienie, brak chęci do gryzienia.`,
      },
    ],
    activity: [
      {
        keywords: ['szczeniak spacer', 'ile spaceru', 'młody pies spacer', 'spacer szczeniaka', 'czas spaceru'],
        answer: `Szczeniaki rosną szybko, a ich stawy i chrząstki są wrażliwe na przeciążenia. Zbyt dużo spacerów na twardym podłożu może przyczynić się do problemów rozwojowych stawów.\n\nZasada 5 minut:\n• Spacer i aktywność formalna: około 5 minut na każdy miesiąc życia, do dwóch razy dziennie.\n• 3 miesiące = 15 minut spaceru, 4 miesiące = 20 minut itd.\n• Zabawa swobodna na miękkiej trawie jest lepsza niż długie marsze na asfalcie.\n• Unikaj forsowania, skakania, schodów i biegania za rowerem do około 18 miesiąca życia (szczególnie u ras dużych i olbrzymich).\n\nKażdy pies jest inny – obserwuj zmęczenie i apetyt.`,
      },
      {
        keywords: ['rower z psem', 'biega za rowerem', 'biegać z psem', 'jazda rowerem'],
        answer: `Bieganie obok roweru wymaga dorosłego, dobrze wytrenowanego psa i stopniowego wprowadzania.\n\nZasady bezpieczeństwa:\n• Pies powinien mieć ukończone co najmniej 18 miesięcy (duże rasy nawet 24 miesiące).\n• Używaj specjalnego uchwytu do roweru, a nie skróconej smyczy na nadgarstku.\n• Zacznij od krótkich odcinków wolnego truchu, nie sprintu.\n• Unikaj upału i gorącego asfaltu.\n• Nie nadwyrężaj psów krótkonosych (mopsy, buldogi) – mają problemy z termoregulacją.\n\nPodczas spaceru kontroluj tempo i temperaturę. Pies nie powinien być zadyszany ani mieć ślinienia na skraj wyczerpania.`,
      },
      {
        keywords: ['dysplazja', 'stawy', 'biodro', 'łokieć', 'choroba stawów'],
        answer: `Dysplazja stawów (biodrowych i łokciowych) to genetyczna i środowiskowa choroba, która objawia się kulawizną, sztywnością i bólem.\n\nDieta i ruch:\n• Utrzymuj zdrową masę ciała – każdy nadprogramowy kilogram to dodatkowy nacisk na stawy.\n• Aktywność niskoskokowa: spacery na smyczy, pływanie (świetne dla stawów), fizjoterapia.\n• Unikaj skakania, biegania po twardym podłożu i gwałtownych zwrotów.\n\nSuplementacja:\n• Kwasów tłuszczowych omega-3 (EPA/DHA) mają udokumentowane działanie przeciwzapalne.\n• Glukozamina i chondroityna mogą pomóc w łagodnych przypadkach, ale efekty są indywidualne.\n\nFarmakoterapia (np. NSAIDs) i rehabilitacja powinny być zalecane przez weterynarza.`,
      },
      {
        keywords: ['upał spacer', 'spacer w upale', 'ciepła podłoga', 'lato spacer'],
        answer: `Podczas upałów bezpieczeństwo termiczne psa jest priorytetem. Psy oddychają głównie przez dyszenie i mają ograniczoną zdolność schładzania.\n\nZasady letnich spacerów:\n• Spacery wczesnym rankiem lub późnym wieczorem, gdy temperatura i podłoże są niższe.\n• Sprawdź asfalt – przytrzymaj dłoń na powierzchni przez 5-7 sekund; jeśli jest za gorąca, poparzy łapy psa.\n• Zabieraj wodę i miskę podróżną.\n• Ogranicz tempo i dystans.\n• Nigdy nie zostawiaj psa w aucie, nawet przy otwartym oknie.\n\nObjawy przegrzania: nadmierne dyszenie, ślinienie, brak chęci do ruchu, zaczerwienienie dziąseł, ospałość.`,
      },
    ],
  };

  const fallbackResponses: Record<string, string> = {
    general: 'Nie posiadam wystarczająco szczegółowych danych na ten konkretny temat. Jeśli pytanie dotyczy zdrowia, zachowania lub diety Twojego pupila, najlepiej skonsultuj się z odpowiednim specjalistą – weterynarzem, dietetykiem weterynaryjnym lub behawiorystą.',
    health: 'Na podstawie podanych informacji nie mogę postawić diagnozy ani dobrać leczenia. Jeśli zauważasz niepokojące objawy, takie jak zmiana apetytu, apatia, wymioty, biegunka, kulawizna lub duszności, skontaktuj się z weterynarzem i opisz objawy, czas trwania oraz wiek i rasę zwierzęcia.',
    nutrition: 'To pytanie wymaga indywidualnej oceny dietetycznej. Plan żywieniowy powinien uwzględniać wiek, wagę, aktywność, stan zdrowia i ewentualne alergie. Skonsultuj się z dietetykiem weterynaryjnym, który dobierze lub ułoży odpowiednią dietę.',
    behavior: 'Problemy behawioralne są złożone i zależą od historii, rasy, wieku i środowiska psa. Zamiast samodzielnie próbować agresywnych metod, skonsultuj się z certyfikowanym behawiorystą lub pozytywnym trenerem, który przeprowadzi wywiad i zaproponuje bezpieczny plan.',
    grooming: 'W przypadku skomplikowanych potrzeb pielęgnacyjnych (mocno splątana sierść, zmiany skórne, ropne uszy) najlepiej udać się do doświadczonego groomera lub weterynarza. Samodzielne użycie nieodpowiednich narzędzi może skrzywdzić zwierzę.',
    activity: 'Program aktywności powinien być dostosowany do wieku, rasy, masy ciała i stanu zdrowia. Jeśli pies ma chorobę stawów, serca lub jest bardzo młody/stary, konsultacja z weterynarzem lub fizjoterapeutą zwierząt pomoże ustalić bezpieczny plan treningowy.',
  };

  const generateAiResponse = (question: string, role: string) => {
    const normalizedQuestion = normalizeText(question);
    const roleTopics = knowledgeBase[role] || [];
    const generalTopics = knowledgeBase.general || [];
    const topics = [...roleTopics, ...generalTopics];

    const scored = topics.map((topic) => {
      const score = topic.keywords.reduce((acc, keyword) => {
        const normalizedKeyword = normalizeText(keyword);
        return normalizedQuestion.includes(normalizedKeyword) ? acc + 1 : acc;
      }, 0);
      return { topic, score };
    });

    const best = scored.sort((a, b) => b.score - a.score)[0];
    if (best && best.score > 0) {
      return best.topic.answer;
    }

    return fallbackResponses[role] || fallbackResponses.general;
  };

  const handleSend = async () => {
    if (!input.trim() || !activeConversation) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    };

    const updatedConversations = conversations.map(c => {
      if (c.id === activeConversation) {
        const messages = [...c.messages, userMessage];
        const title = messages.length === 1 ? input.slice(0, 30) + (input.length > 30 ? '...' : '') : c.title;
        return { ...c, messages, title: title === 'Nowa rozmowa' ? title : c.title, updatedAt: new Date().toISOString() };
      }
      return c;
    });

    setConversations(updatedConversations);
    setInput('');
    setIsTyping(true);
    localStorage.setItem('aiConversations', JSON.stringify(updatedConversations));

    // Symulacja odpowiedzi AI
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: generateAiResponse(input, activeRole),
        timestamp: new Date().toISOString(),
      };

      const finalConversations = updatedConversations.map(c => {
        if (c.id === activeConversation) {
          const messages = [...c.messages, aiMessage];
          const firstUserMessage = messages.find(m => m.role === 'user')?.content || 'Nowa rozmowa';
          const title = firstUserMessage.slice(0, 30) + (firstUserMessage.length > 30 ? '...' : '');
          return { ...c, messages, title, updatedAt: new Date().toISOString() };
        }
        return c;
      });

      setConversations(finalConversations);
      setIsTyping(false);
      localStorage.setItem('aiConversations', JSON.stringify(finalConversations));
    }, 1500 + Math.random() * 1000);
  };

  const createNewConversation = () => {
    const newConv: Conversation = {
      id: Date.now().toString(),
      title: 'Nowa rozmowa',
      role: activeRole,
      messages: [{
        id: Date.now().toString(),
        role: 'assistant',
        content: `Witaj! Jestem ${aiRoles.find(r => r.id === activeRole)?.name}. W czym mogę Ci dzisiaj pomóc?`,
        timestamp: new Date().toISOString(),
      }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [newConv, ...conversations];
    setConversations(updated);
    setActiveConversation(newConv.id);
    setView('chat');
    setShowSidebar(false);
    localStorage.setItem('aiConversations', JSON.stringify(updated));
  };

  const openConversation = (id: string) => {
    const conv = conversations.find(c => c.id === id);
    if (conv) {
      setActiveConversation(id);
      if (conv.role) setActiveRole(conv.role);
      setView('chat');
      setShowSidebar(false);
    }
  };

  const deleteConversation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = conversations.filter(c => c.id !== id);
    setConversations(updated);
    if (activeConversation === id) {
      const next = updated[0]?.id || null;
      setActiveConversation(next);
      if (!next) setView('roles');
    }
    localStorage.setItem('aiConversations', JSON.stringify(updated));
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-4 md:space-y-5">
      {view === 'roles' && (
        <div className="space-y-4 md:space-y-5 animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-4 md:p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Wybierz specjalizację</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {aiRoles.map((role) => {
                const Icon = role.icon;
                return (
                  <button
                    key={role.id}
                    onClick={() => {
                      setActiveRole(role.id);
                      createNewConversation();
                    }}
                    className="p-4 rounded-xl border border-gray-200 hover:border-brand-dark/40 hover:bg-gray-50 hover:-translate-y-0.5 transition-all text-left group"
                  >
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${role.color} flex items-center justify-center mb-3 group-hover:scale-105 transition-transform`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="font-semibold text-gray-900 text-sm mb-1">{role.name}</div>
                    <div className="text-xs text-gray-500 leading-relaxed">{role.description}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {conversations.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-4 md:p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Ostatnie rozmowy</h3>
                <span className="text-xs text-gray-500">{conversations.length} rozmów</span>
              </div>
              <div className="space-y-2">
                {conversations.slice(0, 6).map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => openConversation(conv.id)}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 text-left transition-all"
                  >
                    <div className="min-w-0 flex-1 pr-3">
                      <div className="font-medium text-gray-900 text-sm truncate">{conv.title}</div>
                      <div className="text-xs text-gray-500">{conv.messages.length} wiadomości</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {view === 'chat' && activeConversation && (
        <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden animate-in fade-in duration-300">
          <div className="flex items-center justify-between p-3 md:p-4 border-b border-gray-100 bg-gray-50/50 gap-2">
            <div className="flex items-center gap-2 md:gap-3 min-w-0">
              <button
                onClick={() => {
                  setView('roles');
                  setActiveConversation(null);
                }}
                className="p-2 -ml-2 rounded-lg text-gray-500 hover:bg-gray-100 flex-shrink-0"
                aria-label="Wróć do wyboru specjalizacji"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className={`w-9 h-9 md:w-10 md:h-10 rounded-xl bg-gradient-to-br ${aiRoles.find(r => r.id === activeRole)?.color} flex items-center justify-center flex-shrink-0`}>
                {(() => {
                  const Icon = aiRoles.find(r => r.id === activeRole)?.icon || Bot;
                  return <Icon className="w-4 h-4 md:w-5 md:h-5 text-white" />;
                })()}
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-gray-900 text-sm md:text-base truncate">
                  {aiRoles.find(r => r.id === activeRole)?.name}
                </h3>
                <p className="text-xs text-gray-500">
                  {currentConversation?.messages.length || 0} wiadomości
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 lg:hidden"
                aria-label="Historia rozmów"
              >
                <Clock className="w-5 h-5" />
              </button>
              <button
                onClick={createNewConversation}
                className="px-3 py-2 rounded-xl bg-brand-dark text-white text-xs md:text-sm font-medium hover:bg-brand-dark transition-all whitespace-nowrap"
              >
                Nowa rozmowa
              </button>
            </div>
          </div>

          <div className="flex relative h-[calc(100dvh-260px)] min-h-[380px] md:min-h-[500px] max-h-[720px]">
            {/* Sidebar - Conversations */}
            <div className={`${showSidebar ? 'absolute' : 'hidden'} lg:static lg:block left-0 top-0 z-20 h-full w-72 border-r border-gray-100 bg-white lg:bg-gray-50/50 overflow-y-auto shadow-xl lg:shadow-none`}>
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between lg:hidden mb-2">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Historia rozmów</h4>
                  <button onClick={() => setShowSidebar(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <h4 className="hidden lg:block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Historia rozmów</h4>
                {conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => openConversation(conv.id)}
                    className={`w-full text-left p-3 rounded-xl transition-all ${
                      activeConversation === conv.id
                        ? 'bg-brand-dark text-white'
                        : 'bg-white hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{conv.title}</div>
                        <div className={`text-xs ${activeConversation === conv.id ? 'text-white/70' : 'text-gray-500'}`}>
                          {conv.messages.length} wiadomości
                        </div>
                      </div>
                      <button
                        onClick={(e) => deleteConversation(conv.id, e)}
                        className={`p-1 rounded ${activeConversation === conv.id ? 'hover:bg-white/20' : 'hover:bg-gray-200'}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Main Chat */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4">
                {currentConversation?.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex gap-2 md:gap-3 max-w-[92%] md:max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-7 h-7 md:w-8 md:h-8 rounded-lg md:rounded-xl flex-shrink-0 flex items-center justify-center ${
                        message.role === 'user'
                          ? 'bg-gray-200'
                          : `bg-gradient-to-br ${aiRoles.find(r => r.id === activeRole)?.color || 'from-[#1B6B4A] to-[#2A8A5C]'}`
                      }`}>
                        {message.role === 'user' ? (
                          <User className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-600" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" />
                        )}
                      </div>
                      <div className={`p-3 md:p-4 rounded-2xl ${
                        message.role === 'user'
                          ? 'bg-brand-dark text-white'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        <div className={`text-[10px] md:text-xs mt-1.5 md:mt-2 ${message.role === 'user' ? 'text-white/70' : 'text-gray-500'}`}>
                          {formatTime(message.timestamp)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className="flex justify-start">
                    <div className="flex gap-2 md:gap-3 max-w-[92%] md:max-w-[80%]">
                      <div className={`w-7 h-7 md:w-8 md:h-8 rounded-lg md:rounded-xl flex-shrink-0 flex items-center justify-center bg-gradient-to-br ${aiRoles.find(r => r.id === activeRole)?.color || 'from-[#1B6B4A] to-[#2A8A5C]'}`}>
                        <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" />
                      </div>
                      <div className="p-3 md:p-4 rounded-2xl bg-gray-100">
                        <div className="flex gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"></div>
                          <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Suggested Questions */}
              {currentConversation && currentConversation.messages.length < 3 && (
                <div className="px-3 md:px-4 py-3 border-t border-gray-100 bg-gray-50/50">
                  <div className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
                    <Lightbulb className="w-3.5 h-3.5" />
                    Sugerowane pytania
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(suggestedQuestions as any)[activeRole]?.map((question: string, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => setInput(question)}
                        className="px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 text-xs font-medium hover:border-brand-dark hover:text-brand-dark transition-all text-left"
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input */}
              <div className="p-3 md:p-4 border-t border-gray-100">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Napisz pytanie..."
                    className="flex-1 px-3 md:px-4 py-2.5 md:py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-dark focus:ring-2 focus:ring-brand-dark/10 text-sm"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || isTyping}
                    className="px-3 md:px-4 py-2.5 md:py-3 rounded-xl bg-brand-dark text-white hover:bg-brand-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4 md:w-5 md:h-5" />
                  </button>
                </div>
                <p className="text-[10px] md:text-xs text-gray-400 mt-2 text-center">
                  AI Asystent udziela ogólnych porad. W nagłych przypadkach skontaktuj się z weterynarzem.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
