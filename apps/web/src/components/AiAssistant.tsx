'use client';

import { useState, useEffect, useRef } from 'react';
import { aiAssistantApi, petApi } from '@/lib/api';
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
  Stethoscope,
  Bone,
  Scissors,
  Activity,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isError?: boolean;
}

interface Conversation {
  id: string;
  title: string;
  role?: string;
  petId?: string | null;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

const aiRoles = [
  { id: 'general', name: 'Ogólny asystent', icon: Bot, description: 'Pytania ogólne o opiekę nad zwierzętami', color: 'from-[#1B6B4A] to-[#2A8A5C]' },
  { id: 'health', name: 'Asystent zdrowia', icon: Stethoscope, description: 'Wskazówki zdrowotne, objawy, pierwsza pomoc', color: 'from-emerald-500 to-teal-600' },
  { id: 'nutrition', name: 'Doradca żywieniowy', icon: Bone, description: 'Diety, karmy, suplementy, porcje', color: 'from-orange-500 to-amber-600' },
  { id: 'behavior', name: 'Behawiorysta AI', icon: PawPrint, description: 'Problemy behawioralne, tresowanie', color: 'from-purple-500 to-pink-600' },
  { id: 'grooming', name: 'Pielęgnacja', icon: Scissors, description: 'Pielęgnacja sierści, pazurów, uszu', color: 'from-rose-500 to-pink-600' },
  { id: 'activity', name: 'Trening i aktywność', icon: Activity, description: 'Ćwiczenia, spacery, kondycja', color: 'from-cyan-500 to-blue-600' },
];

const suggestedQuestions: Record<string, string[]> = {
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
  const [pets, setPets] = useState<{ id: string; name: string; species: string }[]>([]);
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Rozmowy trzymane per-konto (user_id w kluczu) — żeby dwie osoby na jednym
  // urządzeniu nie widziały cudzych czatów z danymi zdrowotnymi pupilów.
  const storageKey = () => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || 'null');
      return `aiConversations_${u?.id || 'anon'}`;
    } catch { return 'aiConversations_anon'; }
  };

  useEffect(() => {
    const key = storageKey();
    let saved = localStorage.getItem(key);
    if (!saved) {
      // migracja ze starego wspolnego klucza
      saved = localStorage.getItem('aiConversations');
      if (saved) {
        try { localStorage.setItem(key, saved); localStorage.removeItem('aiConversations'); } catch {}
      }
    }
    if (saved) {
      try {
        setConversations(JSON.parse(saved));
      } catch {}
    }
    setActiveConversation(null);
    setView('roles');

    petApi
      .getAll()
      .then((res) => {
        const list = (res.pets || res || []).map((p: any) => ({
          id: String(p.id),
          name: p.name,
          species: p.species,
        }));
        setPets(list);
        if (list.length > 0) setSelectedPetId(list[0].id);
      })
      .catch(() => setPets([]));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversations, activeConversation, isTyping]);

  const currentConversation = conversations.find((c) => c.id === activeConversation);
  const roleDef = aiRoles.find((r) => r.id === activeRole);

  const persistConversations = (convs: Conversation[]) => {
    setConversations(convs);
    try {
      // limit rozmiaru: trzymaj max 30 rozmow, zeby localStorage nie rosl w nieskonczonosc
      localStorage.setItem(storageKey(), JSON.stringify(convs.slice(0, 30)));
    } catch {}
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !activeConversation || isTyping) return;

    const userMessage: Message = {
      id: `${Date.now()}_u`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    const withUser = conversations.map((c) =>
      c.id === activeConversation
        ? { ...c, messages: [...c.messages, userMessage], updatedAt: new Date().toISOString() }
        : c
    );
    persistConversations(withUser);
    setInput('');
    setIsTyping(true);

    const conv = withUser.find((c) => c.id === activeConversation);
    const history = (conv?.messages || [])
      .slice(-12)
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await aiAssistantApi.ask({
        message: text,
        petId: selectedPetId,
        role: activeRole,
        history,
      });
      const aiMessage: Message = {
        id: `${Date.now()}_a`,
        role: 'assistant',
        content: res.reply,
        timestamp: new Date().toISOString(),
      };
      persistConversations(
        withUser.map((c) => {
          if (c.id !== activeConversation) return c;
          const messages = [...c.messages, aiMessage];
          const firstUser = messages.find((m) => m.role === 'user')?.content || 'Nowa rozmowa';
          const title = firstUser.slice(0, 40) + (firstUser.length > 40 ? '…' : '');
          return { ...c, messages, title, updatedAt: new Date().toISOString() };
        })
      );
    } catch (e: any) {
      const errText =
        e?.response?.data?.error?.message ||
        'Nie udało się połączyć z asystentem AI. Spróbuj ponownie za chwilę.';
      persistConversations(
        withUser.map((c) =>
          c.id === activeConversation
            ? {
                ...c,
                messages: [
                  ...c.messages,
                  {
                    id: `${Date.now()}_e`,
                    role: 'assistant' as const,
                    content: errText,
                    timestamp: new Date().toISOString(),
                    isError: true,
                  },
                ],
                updatedAt: new Date().toISOString(),
              }
            : c
        )
      );
    } finally {
      setIsTyping(false);
      inputRef.current?.focus();
    }
  };

  const createNewConversation = (role = activeRole) => {
    const newConv: Conversation = {
      id: `${Date.now()}`,
      title: 'Nowa rozmowa',
      role,
      petId: selectedPetId,
      messages: [
        {
          id: `${Date.now()}_g`,
          role: 'assistant',
          content: `Cześć! Jestem ${aiRoles.find((r) => r.id === role)?.name}${selectedPetId && pets.find((p) => p.id === selectedPetId) ? ` i widzę profil ${pets.find((p) => p.id === selectedPetId)?.name}` : ''}. W czym mogę pomóc?`,
          timestamp: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    persistConversations([newConv, ...conversations]);
    setActiveRole(role);
    setActiveConversation(newConv.id);
    setView('chat');
    setShowSidebar(false);
  };

  const openConversation = (id: string) => {
    const conv = conversations.find((c) => c.id === id);
    if (conv) {
      setActiveConversation(id);
      if (conv.role) setActiveRole(conv.role);
      if (conv.petId) setSelectedPetId(conv.petId);
      setView('chat');
      setShowSidebar(false);
    }
  };

  const deleteConversation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = conversations.filter((c) => c.id !== id);
    persistConversations(updated);
    if (activeConversation === id) {
      const next = updated[0]?.id || null;
      setActiveConversation(next);
      if (!next) setView('roles');
    }
  };

  const formatTime = (date: string) =>
    new Date(date).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="space-y-4 md:space-y-5">
      {view === 'roles' && (
        <div className="space-y-4 md:space-y-5 animate-in fade-in duration-300">
          <div className="pv-card p-4 md:p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Wybierz specjalizację</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {aiRoles.map((role) => {
                const Icon = role.icon;
                return (
                  <button
                    key={role.id}
                    onClick={() => createNewConversation(role.id)}
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
            <div className="pv-card p-4 md:p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Ostatnie rozmowy</h3>
                <span className="text-xs text-gray-500">{conversations.length} rozmów</span>
              </div>
              <div className="space-y-2">
                {conversations.slice(0, 6).map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => openConversation(conv.id)}
                    className="w-full flex items-center justify-between p-3 rounded-2xl bg-brand-mint/50 hover:bg-brand-mint text-left transition-all"
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
        <div className="pv-card overflow-hidden animate-in fade-in duration-300">
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
              <div className={`w-9 h-9 md:w-10 md:h-10 rounded-xl bg-gradient-to-br ${roleDef?.color} flex items-center justify-center flex-shrink-0`}>
                {(() => {
                  const Icon = roleDef?.icon || Bot;
                  return <Icon className="w-4 h-4 md:w-5 md:h-5 text-white" />;
                })()}
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-gray-900 text-sm md:text-base truncate">{roleDef?.name}</h3>
                {pets.length > 0 && (
                  <select
                    value={selectedPetId || ''}
                    onChange={(e) => setSelectedPetId(e.target.value || null)}
                    className="text-xs text-brand-dark bg-transparent border-none focus:outline-none cursor-pointer p-0 -ml-0.5"
                    title="Pupil, którego dane widzi asystent"
                  >
                    <option value="">Ogólna rozmowa (bez profilu)</option>
                    {pets.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.species === 'dog' ? '🐶' : p.species === 'cat' ? '🐱' : '🐾'} {p.name} — z profilem
                      </option>
                    ))}
                  </select>
                )}
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
                onClick={() => createNewConversation()}
                className="px-3 py-2 rounded-xl pv-btn-primary text-xs md:text-sm whitespace-nowrap"
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
                      activeConversation === conv.id ? 'bg-brand-dark text-white' : 'bg-white hover:bg-gray-100 text-gray-700'
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
              <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4">
                {currentConversation?.messages.map((message) => (
                  <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex gap-2 md:gap-3 max-w-[92%] md:max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                      <div
                        className={`w-7 h-7 md:w-8 md:h-8 rounded-lg md:rounded-xl flex-shrink-0 flex items-center justify-center ${
                          message.role === 'user'
                            ? 'bg-gray-200'
                            : `bg-gradient-to-br ${roleDef?.color || 'from-[#1B6B4A] to-[#2A8A5C]'}`
                        }`}
                      >
                        {message.role === 'user' ? (
                          <User className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-600" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" />
                        )}
                      </div>
                      <div
                        className={`p-3 md:p-4 rounded-2xl ${
                          message.role === 'user'
                            ? 'bg-brand-dark text-white'
                            : message.isError
                              ? 'bg-red-50 text-red-800 border border-red-200'
                              : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {message.isError && (
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-red-600 mb-1">
                            <AlertCircle className="w-3.5 h-3.5" /> Błąd asystenta
                          </div>
                        )}
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
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
                      <div className={`w-7 h-7 md:w-8 md:h-8 rounded-lg md:rounded-xl flex-shrink-0 flex items-center justify-center bg-gradient-to-br ${roleDef?.color || 'from-[#1B6B4A] to-[#2A8A5C]'}`}>
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
                    {(suggestedQuestions[activeRole] || []).map((question, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setInput(question);
                          inputRef.current?.focus();
                        }}
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
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    maxLength={2000}
                    placeholder={isTyping ? 'Asystent pisze…' : 'Napisz pytanie…'}
                    className="flex-1 px-3 md:px-4 py-2.5 md:py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-dark focus:ring-2 focus:ring-brand-dark/10 text-sm"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || isTyping}
                    className="px-3 md:px-4 py-2.5 md:py-3 rounded-xl pv-btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
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
