'use client';

import { useState, useEffect, useRef } from 'react';
import { petApi, herbalAdvisorApi, userPreferencesApi } from '@/lib/api';
import AiQuotaBar from '@/components/AiQuotaBar';
import { useAiQuota } from '@/lib/plan';
import {
  Leaf, Search, ChevronRight, X, Check, AlertTriangle,
  BookOpen, Heart, Trash2, Plus, Cat, Dog, Sparkles, Clock,
  Send, Loader2, Bot, User, RotateCcw,
} from 'lucide-react';
import {
  HERBS, RECIPES, CATEGORIES, SPECIES_EMOJI, HERB_EMOJI, HERB_IMAGES,
  Herb, SavedHerb, HerbCategory,
} from './herbalData';

type Tab = 'herbs' | 'recipes' | 'saved' | 'advisor';

export default function HerbalMedicine() {
  const [tab, setTab] = useState<Tab>('herbs');
  const [selectedCategory, setSelectedCategory] = useState<HerbCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHerb, setSelectedHerb] = useState<Herb | null>(null);

  const [pets, setPets] = useState<any[]>([]);
  const [petsError, setPetsError] = useState(false);
  const [savedHerbs, setSavedHerbs] = useState<SavedHerb[]>([]);
  const [savedError, setSavedError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [addHerbId, setAddHerbId] = useState('');
  const [addPetId, setAddPetId] = useState('');
  const [addNotes, setAddNotes] = useState('');
  const [addDate, setAddDate] = useState(() => new Date().toISOString().slice(0, 10));

  type ChatMessage = { role: 'user' | 'assistant'; content: string };
  const [chatPetId, setChatPetId] = useState<string>('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatLoading]);

  const aiQuota = useAiQuota();

  const sendChatMessage = async (text?: string) => {
    const content = (text ?? chatInput).trim();
    if (!content || chatLoading || aiQuota.out) return;
    const nextMessages: ChatMessage[] = [...chatMessages, { role: 'user', content }];
    setChatMessages(nextMessages);
    setChatInput('');
    setChatError('');
    setChatLoading(true);
    try {
      const res = await herbalAdvisorApi.ask({
        message: content,
        petId: chatPetId || undefined,
        history: nextMessages.slice(0, -1).slice(-10),
      });
      setChatMessages([...nextMessages, { role: 'assistant', content: res.reply }]);
    } catch (e: any) {
      setChatError(e?.response?.data?.error?.message || 'Nie udało się połączyć z doradcą AI. Spróbuj ponownie.');
    }
    setChatLoading(false);
    window.dispatchEvent(new Event('pv:plan-refresh'));
  };

  const resetChat = () => { setChatMessages([]); setChatError(''); };

  useEffect(() => {
    petApi.getAll().then((res) => {
      const list = res.pets || res || [];
      setPets(list);
      if (list.length > 0) { setAddPetId(String(list[0].id)); setChatPetId(String(list[0].id)); }
    }).catch(() => setPetsError(true));
    (async () => {
      let serverList: SavedHerb[] = [];
      try {
        const res = await userPreferencesApi.get('saved_herbs');
        if (Array.isArray(res.value)) serverList = res.value;
      } catch {}
      try {
        const legacy = JSON.parse(localStorage.getItem('savedHerbs') || '[]');
        if (Array.isArray(legacy) && legacy.length && serverList.length === 0) {
          serverList = legacy;
          userPreferencesApi.set('saved_herbs', legacy).catch(() => {});
        }
        localStorage.removeItem('savedHerbs');
      } catch {}
      setSavedHerbs(serverList);
    })();
  }, []);

  const persistSaved = (list: SavedHerb[]) => {
    setSavedHerbs(list);
    setSavedError('');
    userPreferencesApi.set('saved_herbs', list).catch(() => setSavedError('Nie udało się zapisać zmiany na serwerze. Spróbuj ponownie.'));
  };

  const openAddModal = (herbId?: string) => {
    setAddHerbId(herbId || HERBS[0].id);
    setAddDate(new Date().toISOString().slice(0, 10));
    setAddNotes('');
    setShowAddModal(true);
  };

  const confirmAdd = () => {
    const herb = HERBS.find((h) => h.id === addHerbId);
    const pet = pets.find((p) => String(p.id) === addPetId);
    if (!herb || !pet) return;
    const entry: SavedHerb = {
      id: `${Date.now()}`, herbId: herb.id, herbName: herb.name,
      petId: String(pet.id), petName: pet.name, startDate: addDate, notes: addNotes.trim() || undefined,
    };
    persistSaved([entry, ...savedHerbs]);
    setShowAddModal(false);
  };

  const removeSaved = (id: string) => persistSaved(savedHerbs.filter((s) => s.id !== id));

  const filteredHerbs = HERBS.filter((h) => {
    const catOk = selectedCategory === 'all' || h.category === selectedCategory;
    const q = searchQuery.toLowerCase();
    const qOk = !q || h.name.toLowerCase().includes(q) || h.benefits.some((b) => b.toLowerCase().includes(q));
    return catOk && qOk;
  });

  const daysSince = (date: string) => Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 86400000));

  const HerbImage = ({ herb, className, emojiSize }: { herb: Herb; className: string; emojiSize?: string }) => {
    const [err, setErr] = useState(false);
    const src = HERB_IMAGES[herb.id];
    return (
      <span className={`${className} rounded-xl overflow-hidden bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 flex items-center justify-center flex-shrink-0 ${emojiSize || 'text-xl'}`}>
        {src && !err ? (
          <img src={src} alt={herb.name} className="w-full h-full object-cover" loading="lazy" onError={() => setErr(true)} />
        ) : (
          HERB_EMOJI[herb.id] || '🌿'
        )}
      </span>
    );
  };

  const SpeciesIcons = ({ usageFor }: { usageFor: Herb['usageFor'] }) => (
    <div className="flex items-center gap-1">
      {(usageFor.includes('both') || usageFor.includes('dog')) && <Dog className="w-3.5 h-3.5 text-gray-400" />}
      {(usageFor.includes('both') || usageFor.includes('cat')) && <Cat className="w-3.5 h-3.5 text-gray-400" />}
    </div>
  );

  const HerbCard = ({ herb }: { herb: Herb }) => (
    <button onClick={() => setSelectedHerb(herb)} className="w-full flex items-center gap-3.5 px-4 py-3.5 text-left hover:bg-gray-50/60 active:bg-gray-50 transition-all">
      <HerbImage herb={herb} className="w-11 h-11" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-gray-900 text-sm truncate">{herb.name}</p>
          <SpeciesIcons usageFor={herb.usageFor} />
        </div>
        <p className="text-[11px] text-gray-400 italic truncate">{herb.latinName}</p>
        <div className="flex flex-wrap gap-1 mt-1.5">
          {herb.benefits.slice(0, 2).map((b, i) => (
            <span key={i} className="px-1.5 py-0.5 rounded-md bg-brand-light text-brand-dark text-[10px] font-medium">{b}</span>
          ))}
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
    </button>
  );

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3.5 flex items-start gap-2.5">
        <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-amber-800 leading-relaxed">
          Informacje mają charakter edukacyjny i nie zastępują konsultacji z weterynarzem. Przed podaniem jakiegokolwiek zioła skonsultuj dawkowanie, zwłaszcza u kotów, szczeniąt, zwierząt ciężarnych lub przyjmujących leki.
        </p>
      </div>

      {/* Taby */}
      <div className="flex gap-1 p-1 rounded-2xl bg-gray-100/80">
        {([
          { key: 'herbs', label: 'Zioła', Icon: Leaf },
          { key: 'recipes', label: 'Przepisy', Icon: BookOpen },
          { key: 'saved', label: 'Zapisane', Icon: Heart },
          { key: 'advisor', label: 'Doradca', Icon: Sparkles },
        ] as { key: Tab; label: string; Icon: any }[]).map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 px-1 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              tab === key ? 'bg-white shadow-sm text-brand-dark' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* TAB: ZIOŁA */}
      {tab === 'herbs' && (
        <div className="space-y-4 animate-fade-in">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Szukaj ziół: trawienie, stres, stawy…"
              className="w-full bg-white border border-gray-200 rounded-2xl pl-11 pr-4 py-3.5 text-sm shadow-sm focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedCategory === cat.id ? 'bg-brand-dark text-white' : 'bg-white text-gray-600 border border-gray-200'
                }`}
              >
                <cat.icon className="w-3.5 h-3.5" /> {cat.name}
              </button>
            ))}
          </div>

          <div className="pv-card overflow-hidden divide-y divide-gray-100">
            {filteredHerbs.map((herb) => <HerbCard key={herb.id} herb={herb} />)}
            {filteredHerbs.length === 0 && (
              <div className="p-8 text-center text-sm text-gray-400">Brak ziół pasujących do wyszukiwania</div>
            )}
          </div>
        </div>
      )}

      {/* TAB: PRZEPISY */}
      {tab === 'recipes' && (
        <div className="space-y-3.5 animate-fade-in">
          {RECIPES.map((recipe) => (
            <div key={recipe.id} className="pv-card p-4">
              <div className="flex items-start justify-between gap-2 mb-2.5">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 text-sm">{recipe.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{recipe.purpose}</p>
                </div>
                <span className="w-9 h-9 rounded-xl bg-brand-mint flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-4 h-4 text-brand-dark" />
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-3">
                {recipe.herbIds.map((hid) => {
                  const h = HERBS.find((x) => x.id === hid);
                  if (!h) return null;
                  return (
                    <button key={hid} onClick={() => setSelectedHerb(h)} className="px-2.5 py-1 rounded-full bg-brand-light text-brand-dark text-[11px] font-semibold active:scale-95 transition-all">
                      {h.name}
                    </button>
                  );
                })}
              </div>

              <p className="text-xs text-gray-600 bg-gray-50 rounded-xl p-3 mb-3 leading-relaxed">{recipe.preparation}</p>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-50 rounded-xl p-2.5">
                  <p className="text-[10px] font-bold uppercase text-gray-400">Dawkowanie</p>
                  <p className="text-xs text-gray-700 mt-0.5">{recipe.dosage}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-2.5">
                  <p className="text-[10px] font-bold uppercase text-gray-400">Czas kuracji</p>
                  <p className="text-xs text-gray-700 mt-0.5">{recipe.duration}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* TAB: ZAPISANE */}
      {tab === 'saved' && (
        <div className="space-y-3.5 animate-fade-in">
          <button
            onClick={() => openAddModal()}
            disabled={pets.length === 0}
            className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-brand-dark text-white font-bold text-sm active:scale-[0.98] transition-all disabled:opacity-50"
          >
            <Plus className="w-4 h-4" /> Dodaj zioło do dziennika
          </button>
          {petsError && (
            <div className="pv-card p-3.5 flex items-center justify-between gap-3">
              <p className="text-xs text-red-600 flex items-center gap-2"><AlertTriangle className="w-4 h-4 flex-shrink-0" /> Nie udało się pobrać listy pupili.</p>
              <button onClick={() => { setPetsError(false); petApi.getAll().then((res) => { const list = res.pets || res || []; setPets(list); if (list.length > 0) { setAddPetId(String(list[0].id)); setChatPetId(String(list[0].id)); } }).catch(() => setPetsError(true)); }} className="text-xs font-bold text-brand-dark">Ponów</button>
            </div>
          )}
          {pets.length === 0 && !petsError && (
            <p className="text-xs text-gray-400 text-center px-4">Dodaj najpierw profil pupila, aby móc zapisywać stosowane zioła.</p>
          )}
          {savedError && (
            <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-xs text-red-700 flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> {savedError}
            </div>
          )}

          {savedHerbs.length === 0 ? (
            <div className="pv-card p-10 text-center">
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-brand-mint flex items-center justify-center">
                <Heart className="w-6 h-6 text-brand-dark" />
              </div>
              <p className="text-sm font-semibold text-gray-700">Brak zapisanych ziół</p>
              <p className="text-xs text-gray-400 mt-1">Śledź, jakie zioła i od kiedy stosujesz u swojego pupila.</p>
            </div>
          ) : (
            savedHerbs.map((saved) => (
              <div key={saved.id} className="pv-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">{saved.herbName}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Dla: {saved.petName}</p>
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mt-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      Od {new Date(saved.startDate).toLocaleDateString('pl-PL')} · {daysSince(saved.startDate)} dni
                    </div>
                    {saved.notes && <p className="text-xs text-gray-600 mt-2 bg-gray-50 rounded-xl p-2.5">{saved.notes}</p>}
                  </div>
                  <button onClick={() => removeSaved(saved.id)} className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0" aria-label="Usuń">
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB: DORADCA — prawdziwy czat AI z kontekstem pupila */}
      {tab === 'advisor' && (
        <div className="space-y-3.5 animate-fade-in">
          {pets.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2 px-1">Dla kogo pytasz?</p>
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
                <button
                  onClick={() => setChatPetId('')}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    chatPetId === '' ? 'bg-brand-dark text-white' : 'bg-white text-gray-600 border border-gray-200'
                  }`}
                >
                  Pytanie ogólne
                </button>
                {pets.map((pet) => (
                  <button
                    key={pet.id}
                    onClick={() => setChatPetId(String(pet.id))}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                      chatPetId === String(pet.id) ? 'bg-brand-dark text-white' : 'bg-white text-gray-600 border border-gray-200'
                    }`}
                  >
                    <span>{SPECIES_EMOJI[pet.species] || '🐾'}</span> {pet.name}
                  </button>
                ))}
              </div>
              {chatPetId && (
                <p className="text-[11px] text-gray-400 mt-1.5 px-1">
                  Doradca automatycznie uwzględni gatunek, wiek i historię zdrowia tego pupila z Książeczki Zdrowia.
                </p>
              )}
            </div>
          )}

          <div className="pv-card overflow-hidden flex flex-col" style={{ height: '60vh', minHeight: 420 }}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0 bg-brand-mint/30">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-brand-dark flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </span>
                <div>
                  <p className="text-sm font-bold text-gray-900">Doradca ziołowy AI</p>
                  <p className="text-[11px] text-gray-500">Odpowiada na podstawie bazy ziół i danych pupila</p>
                </div>
              </div>
              {chatMessages.length > 0 && (
                <button onClick={resetChat} className="w-8 h-8 rounded-xl bg-white flex items-center justify-center" aria-label="Nowa rozmowa">
                  <RotateCcw className="w-3.5 h-3.5 text-gray-500" />
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {chatMessages.length === 0 && (
                <div className="space-y-3">
                  <p className="text-xs text-gray-400">Przykładowe pytania:</p>
                  {[
                    'Mój pies jest niespokojny podczas burzy, jakie zioło pomoże?',
                    'Czy mogę podać kurkumę kotu na stawy?',
                    'Pupil ma lekko luźny stolec od wczoraj, co polecasz?',
                    'Jakie zioło pomoże na swędzącą skórę?',
                  ].map((q, i) => (
                    <button
                      key={i}
                      onClick={() => sendChatMessage(q)}
                      className="w-full text-left px-3.5 py-2.5 rounded-xl bg-gray-50 hover:bg-brand-mint/40 text-xs text-gray-700 transition-all"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
              {chatMessages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex gap-2 max-w-[88%] ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <span className={`w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center ${m.role === 'user' ? 'bg-gray-200' : 'bg-brand-dark'}`}>
                      {m.role === 'user' ? <User className="w-3.5 h-3.5 text-gray-600" /> : <Sparkles className="w-3.5 h-3.5 text-white" />}
                    </span>
                    <div className={`px-3.5 py-2.5 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed ${m.role === 'user' ? 'bg-brand-dark text-white' : 'bg-gray-100 text-gray-800'}`}>
                      {m.content}
                    </div>
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="flex gap-2 max-w-[88%]">
                    <span className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center bg-brand-dark">
                      <Sparkles className="w-3.5 h-3.5 text-white" />
                    </span>
                    <div className="px-3.5 py-2.5 rounded-2xl bg-gray-100 flex items-center">
                      <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                    </div>
                  </div>
                </div>
              )}
              {chatError && (
                <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-xs text-red-700 flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> {chatError}
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="p-3 border-t border-gray-100 flex-shrink-0">
              <AiQuotaBar />
              <div className="flex gap-2">
                <input
                  type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} disabled={aiQuota.out}
                  onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
                  placeholder={aiQuota.out ? 'Limit pytań na dziś wyczerpany' : 'Napisz pytanie o zioła dla Twojego pupila…'}
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-brand"
                />
                <button
                  onClick={() => sendChatMessage()}
                  disabled={!chatInput.trim() || chatLoading || aiQuota.out}
                  className="w-10 h-10 rounded-xl bg-brand-dark text-white flex items-center justify-center flex-shrink-0 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[10px] text-gray-400 mt-2 text-center">
                Doradca AI udziela porad edukacyjnych i może dopytać o brakujące informacje. Nie zastępuje konsultacji z weterynarzem.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Dodaj do dziennika */}
      {showAddModal && (
        <div className="fixed inset-0 z-[70] bg-gray-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h3 className="font-bold text-gray-900">Dodaj zioło do dziennika</h3>
              <button onClick={() => setShowAddModal(false)} className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center"><X className="w-4 h-4 text-gray-600" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Pupil</label>
                <div className="flex gap-2 overflow-x-auto pb-1 mt-2 scrollbar-none">
                  {pets.map((pet) => (
                    <button
                      key={pet.id}
                      onClick={() => setAddPetId(String(pet.id))}
                      className={`flex flex-col items-center flex-shrink-0 px-3 py-2 rounded-xl border-2 transition-all ${
                        addPetId === String(pet.id) ? 'border-brand-dark bg-brand-mint' : 'border-gray-100'
                      }`}
                    >
                      <span className="text-xl">{SPECIES_EMOJI[pet.species] || '🐾'}</span>
                      <span className="text-[11px] font-semibold mt-0.5 max-w-[60px] truncate">{pet.name}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Zioło</label>
                <select
                  value={addHerbId} onChange={(e) => setAddHerbId(e.target.value)}
                  className="w-full mt-2 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-3 text-sm focus:outline-none focus:border-brand"
                >
                  {HERBS.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Data rozpoczęcia</label>
                <input
                  type="date" value={addDate} onChange={(e) => setAddDate(e.target.value)}
                  className="w-full mt-2 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-3 text-sm focus:outline-none focus:border-brand"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Notatki (opcjonalnie)</label>
                <textarea
                  value={addNotes} onChange={(e) => setAddNotes(e.target.value)} rows={2}
                  placeholder="np. dawka, reakcja pupila…"
                  className="w-full mt-2 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-3 text-sm resize-none focus:outline-none focus:border-brand"
                />
              </div>
              <button
                onClick={confirmAdd}
                disabled={!addPetId || !addHerbId}
                className="w-full py-3.5 rounded-2xl bg-brand-dark text-white font-bold text-sm disabled:opacity-50"
              >
                Zapisz
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PEŁNOEKRANOWY DETAL ZIOŁA */}
      {selectedHerb && (
        <div className="fixed inset-0 z-[70] bg-white flex flex-col" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 flex-shrink-0">
            <button onClick={() => setSelectedHerb(null)} className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0" aria-label="Zamknij">
              <X className="w-5 h-5 text-gray-600" />
            </button>
            <HerbImage herb={selectedHerb} className="w-10 h-10" />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 text-sm truncate">{selectedHerb.name}</p>
              <p className="text-[11px] text-gray-400 italic truncate">{selectedHerb.latinName}</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
            {HERB_IMAGES[selectedHerb.id] && (
              <div className="w-full h-44 rounded-2xl overflow-hidden bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100">
                <img src={HERB_IMAGES[selectedHerb.id]} alt={selectedHerb.name} className="w-full h-full object-cover" />
              </div>
            )}
            <p className="text-sm text-gray-700 leading-relaxed">{selectedHerb.description}</p>

            <div className="flex items-center gap-2">
              <SpeciesIcons usageFor={selectedHerb.usageFor} />
              <span className="text-xs text-gray-500">
                {selectedHerb.usageFor.includes('both') ? 'Psy i koty' : selectedHerb.usageFor.includes('dog') ? 'Tylko psy' : 'Tylko koty'}
              </span>
            </div>

            {selectedHerb.catCaution && (
              <div className="rounded-2xl bg-orange-50 border border-orange-200 p-3.5 flex items-start gap-2.5">
                <Cat className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-orange-800 leading-relaxed"><b>Uwaga u kotów:</b> {selectedHerb.catCaution}</p>
              </div>
            )}

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">Korzyści</h4>
              <div className="space-y-2">
                {selectedHerb.benefits.map((b, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-brand-dark flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">{b}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">Aktywne związki</h4>
              <div className="flex flex-wrap gap-1.5">
                {selectedHerb.activeCompounds.map((c, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-full bg-brand-light text-brand-dark text-xs font-medium">{c}</span>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-gray-50 p-3.5">
              <h4 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-1.5">Dawkowanie</h4>
              <p className="text-sm text-gray-700">{selectedHerb.dosage}</p>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">Formy podawania</h4>
              <div className="flex flex-wrap gap-1.5">
                {selectedHerb.preparations.map((p, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 text-xs">{p}</span>
                ))}
              </div>
            </div>

            {selectedHerb.warnings.length > 0 && (
              <div className="rounded-2xl bg-red-50 border border-red-100 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <h4 className="text-xs font-bold uppercase tracking-wide text-red-700">Ostrzeżenia</h4>
                </div>
                <ul className="space-y-1.5">
                  {selectedHerb.warnings.map((w, i) => (
                    <li key={i} className="text-xs text-red-700 flex items-start gap-1.5">
                      <span className="mt-1 w-1 h-1 rounded-full bg-red-400 flex-shrink-0" />{w}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="px-4 pb-4 pt-2 border-t border-gray-100 flex-shrink-0 bg-white">
            <button
              onClick={() => { const id = selectedHerb.id; setSelectedHerb(null); openAddModal(id); }}
              disabled={pets.length === 0}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-brand-dark text-white font-bold text-sm disabled:opacity-50"
            >
              <Plus className="w-4 h-4" /> Dodaj do dziennika
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
