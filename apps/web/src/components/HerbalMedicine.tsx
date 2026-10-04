'use client';

import { useState, useEffect } from 'react';
import {
  Leaf,
  Search,
  Plus,
  X,
  Check,
  AlertCircle,
  Info,
  Heart,
  Sparkles,
  BookOpen,
  MessageCircle,
  ChevronRight,
  Star,
  Clock,
  Shield
} from 'lucide-react';

interface Herb {
  id: string;
  name: string;
  latinName: string;
  category: 'digestive' | 'immune' | 'calming' | 'skin' | 'joints' | 'respiratory' | 'other';
  benefits: string[];
  usageFor: ('dog' | 'cat' | 'both')[];
  dosage: string;
  warnings: string[];
  preparations: string[];
  description: string;
  activeCompounds: string[];
  safetyRating: number;
}

interface Recipe {
  id: string;
  name: string;
  herbs: string[];
  purpose: string;
  preparation: string;
  dosage: string;
  duration: string;
}

interface SavedHerb {
  id: string;
  herbId: string;
  herbName: string;
  petId: string;
  petName: string;
  startDate: string;
  notes?: string;
}

const categories = [
  { id: 'all', name: 'Wszystkie', icon: Leaf },
  { id: 'digestive', name: 'Trawienie', icon: Heart },
  { id: 'immune', name: 'Odporność', icon: Shield },
  { id: 'calming', name: 'Uspokajające', icon: Sparkles },
  { id: 'skin', name: 'Skóra', icon: Star },
  { id: 'joints', name: 'Stawy', icon: Info },
  { id: 'respiratory', name: 'Oddechowe', icon: AlertCircle },
];

const herbsDatabase: Herb[] = [
  {
    id: '1',
    name: 'Rumianek',
    latinName: 'Matricaria chamomilla',
    category: 'digestive',
    benefits: [
      'Łagodzi problemy trawienne',
      'Działa przeciwzapalnie',
      'Uspokaja podrażnioną skórę',
      'Pomaga przy zapaleniu spojówek'
    ],
    usageFor: ['both'],
    dosage: '1 łyżeczka suszu na szklankę wody, 2-3 razy dziennie',
    warnings: ['Unikać u zwierząt z alergią na rośliny złożone', 'Nie stosować długotrwale'],
    preparations: ['Napar', 'Kompres', 'Płukanka'],
    description: 'Rumianek to jedno z najbezpieczniejszych ziół dla zwierząt. Działa łagodząco na układ trawienny i pomaga w stanach zapalnych.',
    activeCompounds: ['Apigenina', 'Bisabolol', 'Chamazulen'],
    safetyRating: 5,
  },
  {
    id: '2',
    name: 'Kurkuma',
    latinName: 'Curcuma longa',
    category: 'joints',
    benefits: [
      'Silne działanie przeciwzapalne',
      'Wspiera zdrowiestawów',
      'Wspomaga trawienie',
      'Właściwości przeciwutleniające'
    ],
    usageFor: ['both'],
    dosage: '1/4 łyżeczki na 5kg masy ciała dziennie',
    warnings: ['Nie stosować u zwierząt z problemami z żółcią', 'Może wchodzić w interakcje z lekami'],
    preparations: ['Proszek dodany do pokarmu', 'Pasta kurkumowa', 'Napar'],
    description: 'Kurkuma zawiera kurkuminę - potężny związek przeciwzapalny. Szczególnie pomocna przy problemach zestawami i zapaleniach.',
    activeCompounds: ['Kurkumina', 'Demethoksykurkumina', 'Bisdemethoksykurkumina'],
    safetyRating: 4,
  },
  {
    id: '3',
    name: 'Waleriana',
    latinName: 'Valeriana officinalis',
    category: 'calming',
    benefits: [
      'Silne działanie uspokajające',
      'Pomaga przy lęku separacyjnym',
      'Wspomaga sen',
      'Łagodzi stres'
    ],
    usageFor: ['both'],
    dosage: 'Według wskazań weterynarza - zazwyczaj 1-2 krople nalewki na kg masy ciała',
    warnings: ['Nie łączyć z innymi środkami uspokajającymi', 'Może powodować senność', 'Konsultacja z weterynarzem obowiązkowa'],
    preparations: ['Nalewka', 'Kapsułki', 'Napar'],
    description: 'Waleriana to naturalne uspokajające dla zwierząt. Pomaga w sytuacjach stresowych jak burze, fajerwerki czy wizyty u weterynarza.',
    activeCompounds: ['Kwas walerianowy', 'Walepotriaты', 'Alkaloidy'],
    safetyRating: 3,
  },
  {
    id: '4',
    name: 'Pokrzywa',
    latinName: 'Urtica dioica',
    category: 'immune',
    benefits: [
      'Wzmacnia odporność',
      'Bogata w witaminy i minerały',
      'Wspomaga zdrowie skóry',
      'Działa oczyszczająco'
    ],
    usageFor: ['both'],
    dosage: '1 łyżeczka suszu na szklankę wody, 1-2 razy dziennie',
    warnings: ['Może wchodzić w interakcje z lekami na ciśnienie', 'Nie stosować u ciężarnych samic'],
    preparations: ['Napar', 'Proszek', 'Świeże liście (po obróbce)'],
    description: 'Pokrzywa to prawdziwa skarbnica składników odżywczych. Wspiera ogólną kondycję organizmu i wzmacnia odporność.',
    activeCompounds: ['Żelazo', 'Witamina C', 'Chlorofil', 'Flawonoidy'],
    safetyRating: 5,
  },
  {
    id: '5',
    name: 'Mniszek lekarski',
    latinName: 'Taraxacum officinale',
    category: 'digestive',
    benefits: [
      'Wspomaga pracę wątroby',
      'Działa moczopędnie',
      'Poprawia trawienie',
      'Bogaty w witaminy'
    ],
    usageFor: ['both'],
    dosage: '1/2 łyżeczki suszu na szklankę wody, 1-2 razy dziennie',
    warnings: ['Nie stosować u zwierząt z problemami z żółcią', 'Może obniżać poziom cukru'],
    preparations: ['Napar z liści', 'Napar z korzenia', 'Świeże liście'],
    description: 'Mniszek wspiera detoksykację organizmu i poprawia funkcjonowanie układu trawiennego. Bezpieczny dla większości zwierząt.',
    activeCompounds: ['Inulina', 'Taraksacyna', 'Witaminy A, C, K'],
    safetyRating: 5,
  },
  {
    id: '6',
    name: 'Echinacea',
    latinName: 'Echinacea purpurea',
    category: 'immune',
    benefits: [
      'Wzmacnia system immunologiczny',
      'Skraca czas trwania infekcji',
      'Działa przeciwbakteryjnie',
      'Wspomaga gojenie ran'
    ],
    usageFor: ['both'],
    dosage: 'Według wskazań weterynarza - zazwyczaj kuracja 7-10 dni',
    warnings: ['Nie stosować długotrwale', 'Unikać u zwierząt z chorobami autoimmunologicznymi'],
    preparations: ['Nalewka', 'Kapsułki', 'Napar'],
    description: 'Echinacea to potężny immunomodulator. Najlepiej działa w krótkich kuracjach podczas infekcji lub w okresach zwiększonego ryzyka.',
    activeCompounds: ['Echinakozyd', 'Polisacharydy', 'Alkiloamidy'],
    safetyRating: 4,
  }
];

const recipes: Recipe[] = [
  {
    id: '1',
    name: 'Mieszanka na trawienie',
    herbs: ['Rumianek', 'Mniszek lekarski', 'Pokrzywa'],
    purpose: 'Wspomaga trawienie i łagodzi dolegliwości żołądkowe',
    preparation: 'Zmieszać zioła w równych proporcjach. 1 łyżeczkę mieszanki zalać szklanką wrzątku, zaparzać 10 minut.',
    dosage: '2-3 łyżki naparu 2 razy dziennie',
    duration: '7-14 dni',
  },
  {
    id: '2',
    name: 'Wsparcie odporności',
    herbs: ['Echinacea', 'Pokrzywa'],
    purpose: 'Wzmacnia system immunologiczny w okresach zwiększonego ryzyka infekcji',
    preparation: 'Przygotować napar z każdego zioła osobno. Połączyć w proporcji 1:1.',
    dosage: '1-2 łyżki naparu dziennie',
    duration: '7-10 dni, z przerwami',
  },
  {
    id: '3',
    name: 'Uspokajająca mieszanka',
    herbs: ['Rumianek', 'Waleriana'],
    purpose: 'Łagodzi stres i niepokój, pomaga w relaksacji',
    preparation: 'Rumianek i waleriana w proporcji 3:1. Zaparzać 15 minut.',
    dosage: '1-2 łyżki naparu przed sytuacją stresową',
    duration: 'Doraźnie, według potrzeb',
  }
];

export default function HerbalMedicine() {
  const [activeTab, setActiveTab] = useState<'herbs' | 'recipes' | 'saved' | 'ai'>('herbs');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHerb, setSelectedHerb] = useState<Herb | null>(null);
  const [savedHerbs, setSavedHerbs] = useState<SavedHerb[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiResponse, setAiResponse] = useState('');

  useEffect(() => {
    if (selectedHerb || showAddModal) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      document.body.classList.add('modal-open');
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      document.body.classList.remove('modal-open');
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      document.body.classList.remove('modal-open');
    };
  }, [selectedHerb, showAddModal]);

  useEffect(() => {
    const saved = localStorage.getItem('savedHerbs');
    if (saved) {
      setSavedHerbs(JSON.parse(saved));
    }
  }, []);

  const filteredHerbs = herbsDatabase.filter(herb => {
    if (selectedCategory !== 'all' && herb.category !== selectedCategory) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!herb.name.toLowerCase().includes(query) &&
          !herb.latinName.toLowerCase().includes(query) &&
          !herb.description.toLowerCase().includes(query)) {
        return false;
      }
    }
    return true;
  });

  const handleAskAI = () => {
    if (!aiQuestion) return;
    
    // Symulacja odpowiedzi AI
    setTimeout(() => {
      setAiResponse(`Na podstawie Twojego pytania: "${aiQuestion}"\n\nZalecam skonsultowanie się z weterynarzem przed zastosowaniem jakichkolwiek ziół. Ogólnie rzecz biorąc, zioła takie jak rumianek i pokrzywa są bezpieczne dla większości zwierząt, ale zawsze należy dostosować dawkowanie do wagi i stanu zdrowia pupila.\n\nPamiętaj:\n• Zawsze zaczynaj od małych dawek\n• Obserwuj reakcję zwierzęcia\n• Nie łącz ziół z lekami bez konsultacji\n• W razie wątpliwości skontaktuj się z weterynarzem`);
    }, 1000);
  };

  return (
    <div className="space-y-5">
      {/* Warning Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-900 mb-1">Ważne!</h3>
            <p className="text-sm text-amber-700">
              Informacje zawarte w tej sekcji mają charakter edukacyjny. Przed zastosowaniem jakichkolwiek ziół u swojego pupila, skonsultuj się z weterynarzem.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-2">
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={() => setActiveTab('herbs')}
            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all ${
              activeTab === 'herbs'
                ? 'bg-brand-dark text-white'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Leaf className="w-5 h-5" />
            <span className="hidden sm:inline">Baza ziół</span>
          </button>
          <button
            onClick={() => setActiveTab('recipes')}
            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all ${
              activeTab === 'recipes'
                ? 'bg-brand-dark text-white'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <BookOpen className="w-5 h-5" />
            <span className="hidden sm:inline">Przepisy</span>
          </button>
          <button
            onClick={() => setActiveTab('saved')}
            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all ${
              activeTab === 'saved'
                ? 'bg-brand-dark text-white'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Heart className="w-5 h-5" />
            <span className="hidden sm:inline">Zapisane</span>
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all ${
              activeTab === 'ai'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Sparkles className="w-5 h-5" />
            <span className="hidden sm:inline">AI Asystent</span>
          </button>
        </div>
      </div>

      {/* Herbs Tab */}
      {activeTab === 'herbs' && (
        <>
          {/* Categories */}
          <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-5">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {categories.map((cat) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl whitespace-nowrap transition-all border font-medium ${
                      selectedCategory === cat.id
                        ? 'bg-brand-dark text-white border-brand-dark'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-brand-dark/40'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {cat.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search */}
          <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Szukaj ziół po nazwie, właściwościach..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-11 pr-4 py-3 font-medium focus:outline-none focus:border-brand-dark focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Herbs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredHerbs.map((herb) => (
              <div
                key={herb.id}
                onClick={() => setSelectedHerb(herb)}
                className="bg-white rounded-2xl border border-gray-200/70 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-brand-dark/30 transition-all duration-300 overflow-hidden cursor-pointer"
              >
                <div className="h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
                
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 mb-1">{herb.name}</h3>
                      <p className="text-sm text-gray-500 italic">{herb.latinName}</p>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-100">
                      <Star className="w-4 h-4 text-amber-600 fill-current" />
                      <span className="text-sm font-semibold text-amber-700">{herb.safetyRating}/5</span>
                    </div>
                  </div>

                  <p className="text-sm text-gray-700 line-clamp-2 mb-3">{herb.description}</p>

                  <div className="space-y-2 mb-3">
                    <div className="text-xs font-semibold text-gray-900">Główne korzyści:</div>
                    <div className="flex flex-wrap gap-1">
                      {herb.benefits.slice(0, 2).map((benefit, idx) => (
                        <span key={idx} className="px-2 py-1 rounded-lg bg-brand-light text-brand-dark text-xs">
                          {benefit}
                        </span>
                      ))}
                      {herb.benefits.length > 2 && (
                        <span className="px-2 py-1 rounded-lg bg-gray-100 text-gray-600 text-xs">
                          +{herb.benefits.length - 2}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <span className="text-xs text-gray-500">
                      {herb.usageFor.includes('both') ? 'Psy i koty' : herb.usageFor.join(', ')}
                    </span>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Recipes Tab */}
      {activeTab === 'recipes' && (
        <div className="space-y-4">
          {recipes.map((recipe) => (
            <div
              key={recipe.id}
              className="bg-white rounded-2xl border border-gray-200/70 shadow-sm hover:shadow-lg transition-all p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{recipe.name}</h3>
                  <p className="text-gray-600">{recipe.purpose}</p>
                </div>
                <BookOpen className="w-6 h-6 text-brand-dark" />
              </div>

              <div className="space-y-4">
                <div>
                  <div className="text-sm font-semibold text-gray-900 mb-2">Zioła:</div>
                  <div className="flex flex-wrap gap-2">
                    {recipe.herbs.map((herb, idx) => (
                      <span key={idx} className="px-3 py-1.5 rounded-lg bg-brand-light text-brand-dark text-sm font-medium">
                        {herb}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-semibold text-gray-900 mb-2">Przygotowanie:</div>
                  <p className="text-sm text-gray-700">{recipe.preparation}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-semibold text-gray-900 mb-1">Dawkowanie:</div>
                    <p className="text-sm text-gray-600">{recipe.dosage}</p>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900 mb-1">Czas kuracji:</div>
                    <p className="text-sm text-gray-600">{recipe.duration}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Saved Tab */}
      {activeTab === 'saved' && (
        <div className="space-y-4">
          {savedHerbs.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 flex items-center justify-center">
                <Heart className="w-7 h-7 text-brand-dark" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Brak zapisanych ziół</h3>
              <p className="text-gray-500">Dodaj zioła, które stosujesz u swojego pupila</p>
            </div>
          ) : (
            savedHerbs.map((saved) => (
              <div key={saved.id} className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 mb-1">{saved.herbName}</h3>
                    <p className="text-sm text-gray-600 mb-2">Dla: {saved.petName}</p>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Clock className="w-4 h-4" />
                      Rozpoczęto: {new Date(saved.startDate).toLocaleDateString('pl-PL')}
                    </div>
                    {saved.notes && (
                      <p className="text-sm text-gray-600 mt-2">{saved.notes}</p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* AI Assistant Tab */}
      {activeTab === 'ai' && (
        <div className="space-y-5">
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl border border-purple-200 p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 mb-1">AI Asystent Ziołolecznictwa</h3>
                <p className="text-sm text-gray-600">
                  Zadaj pytanie o zioła, ich zastosowanie lub bezpieczeństwo dla Twojego pupila
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <textarea
                value={aiQuestion}
                onChange={(e) => setAiQuestion(e.target.value)}
                placeholder="np. Jakie zioła mogę podać psu na problemy trawienne?"
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-purple-200 focus:outline-none focus:border-purple-400 resize-none"
              />
              <button
                onClick={handleAskAI}
                disabled={!aiQuestion}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <MessageCircle className="w-5 h-5" />
                Zapytaj AI
              </button>
            </div>
          </div>

          {aiResponse && (
            <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-6">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-2">Odpowiedź AI:</h4>
                  <p className="text-gray-700 whitespace-pre-wrap">{aiResponse}</p>
                </div>
              </div>
            </div>
          )}

          {/* Suggested Questions */}
          <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-5">
            <h4 className="font-semibold text-gray-900 mb-3">Sugerowane pytania:</h4>
            <div className="space-y-2">
              {[
                'Jakie zioła są bezpieczne dla szczeniąt?',
                'Jak przygotować napar z rumianku dla psa?',
                'Czy kurkuma pomaga przy zapaleniu stawów?',
                'Które zioła mogę łączyć ze sobą?'
              ].map((question, idx) => (
                <button
                  key={idx}
                  onClick={() => setAiQuestion(question)}
                  className="w-full text-left px-4 py-3 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 text-sm transition-all"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Herb Details Modal */}
      {selectedHerb && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
              <div>
                <h3 className="font-semibold text-gray-900">{selectedHerb.name}</h3>
                <p className="text-sm text-gray-500 italic">{selectedHerb.latinName}</p>
              </div>
              <button
                onClick={() => setSelectedHerb(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Safety Rating */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200">
                <div>
                  <div className="text-sm font-semibold text-gray-900 mb-1">Ocena bezpieczeństwa</div>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-5 h-5 ${i < selectedHerb.safetyRating ? 'text-amber-500 fill-current' : 'text-gray-300'}`}
                      />
                    ))}
                  </div>
                </div>
                <Shield className="w-8 h-8 text-brand-dark" />
              </div>

              {/* Description */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Opis</h4>
                <p className="text-gray-700">{selectedHerb.description}</p>
              </div>

              {/* Benefits */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Korzyści</h4>
                <div className="space-y-2">
                  {selectedHerb.benefits.map((benefit, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-brand-dark flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Active Compounds */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Aktywne związki</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedHerb.activeCompounds.map((compound, idx) => (
                    <span key={idx} className="px-3 py-1.5 rounded-lg bg-brand-light text-brand-dark text-sm font-medium">
                      {compound}
                    </span>
                  ))}
                </div>
              </div>

              {/* Dosage */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Dawkowanie</h4>
                <p className="text-gray-700 bg-gray-50 p-3 rounded-xl">{selectedHerb.dosage}</p>
              </div>

              {/* Preparations */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Formy podawania</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedHerb.preparations.map((prep, idx) => (
                    <span key={idx} className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-sm">
                      {prep}
                    </span>
                  ))}
                </div>
              </div>

              {/* Warnings */}
              {selectedHerb.warnings.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-start gap-2 mb-2">
                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <h4 className="font-semibold text-amber-900">Ostrzeżenia</h4>
                  </div>
                  <ul className="space-y-1 ml-7">
                    {selectedHerb.warnings.map((warning, idx) => (
                      <li key={idx} className="text-sm text-amber-800">• {warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
