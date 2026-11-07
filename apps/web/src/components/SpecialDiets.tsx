'use client';

import { useEffect, useState, useMemo } from 'react';
import { petApi, specialDietApi, feedingLogApi } from '@/lib/api';
import { format, differenceInDays, parseISO } from 'date-fns';
import {
  Plus,
  Pencil,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Beef,
  PawPrint,
  Dog,
  Cat,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  ClipboardList,
  Droplets,
  Syringe,
  FlaskConical,
  ShieldCheck,
  Scale,
  Stethoscope,
  Waves,
  GlassWater,
  HeartPulse,
} from 'lucide-react';
import Link from 'next/link';
import SpecialDietModal from './SpecialDietModal';
import ConfirmModal from './ui/ConfirmModal';
import { DIET_TEMPLATES, DietTemplate } from './dietTemplates';

interface SpecialDiet {
  id: number;
  pet_id: number;
  name: string;
  diet_type: string;
  indication: string | null;
  allowed_foods: string | null;
  forbidden_foods: string | null;
  recommendations: string | null;
  notes: string | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  pet_name: string;
  sportDietWarning?: string | null;
  barfPlan?: {
    dailyFoodGrams: number;
    muscleMeatGrams: number;
    boneGrams: number;
    liverGrams: number;
    otherOrganGrams: number;
    vegFruitGrams: number;
    caloriesTarget: number | null;
    mealsPerDay: number;
    supplements: any[];
  } | null;
}

interface FeedingLogItem {
  id: number;
  log_date: string;
  food_name: string;
  food_type: string | null;
  notes: string | null;
  meal_type: 'plan' | 'log';
  completed: boolean;
}

// Stonowana paleta — subtelny tint per typ diety.
const dietTypeMeta: Record<string, { label: string; Icon: any; tint: string }> = {
  renal: { label: 'Nerkowa', Icon: Droplets, tint: 'bg-sky-100 text-sky-700' },
  diabetic: { label: 'Cukrzycowa', Icon: Syringe, tint: 'bg-violet-100 text-violet-700' },
  elimination: { label: 'Eliminacyjna', Icon: FlaskConical, tint: 'bg-rose-100 text-rose-700' },
  allergy: { label: 'Hipoalergiczna', Icon: ShieldCheck, tint: 'bg-amber-100 text-amber-700' },
  weight: { label: 'Odchudzająca', Icon: Scale, tint: 'bg-teal-100 text-teal-700' },
  gastro: { label: 'Lekkostrawna', Icon: Stethoscope, tint: 'bg-green-100 text-green-700' },
  hepatic: { label: 'Wątrobowa', Icon: Waves, tint: 'bg-yellow-100 text-yellow-700' },
  urinary: { label: 'Moczowa', Icon: GlassWater, tint: 'bg-cyan-100 text-cyan-700' },
  barf: { label: 'BARF', Icon: Beef, tint: 'bg-orange-100 text-orange-700' },
  senior: { label: 'Senior', Icon: HeartPulse, tint: 'bg-indigo-100 text-indigo-700' },
};

const getMeta = (type: string) =>
  dietTypeMeta[type] || { label: type, Icon: ClipboardList, tint: 'bg-gray-100 text-gray-600' };

const splitList = (s: string | null) =>
  (s || '').split(/[,;\n]/).map((x) => x.trim()).filter(Boolean);

const norm = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// Odmiana polska — „wątroba" musi trafić też w „wątroby"/„wątrobę".
const POL_ENDINGS = ['ami', 'ach', 'em', 'ow', 'om', 'y', 'i', 'e', 'a', 'u', 'o'];
const STOP_WORDS = new Set(['i', 'z', 'ze', 'oraz', 'lub', 'o', 'w', 'na', 'bez', 'do', 'przy', 'dla', 'po', 'od', 'np', 'sie']);
const GENERIC_WORDS = new Set([
  'duze', 'male', 'duzych', 'malych', 'ilosci', 'wszystko', 'absolutnie', 'karmy', 'karma', 'karm',
  'potrawy', 'potraw', 'resztki', 'przekaski', 'przysmaki', 'gotowane', 'smazone', 'suszone',
  'surowe', 'tluste', 'ostre', 'nagle', 'stale', 'regularne', 'wysokie', 'niskie', 'swieze',
  'dowolny', 'dostep', 'stolu', 'zmiany', 'poza', 'lista', 'smaku', 'smakowe', 'suplementy', 'duzo',
]);
const stemWord = (w: string) => {
  if (w.length <= 4) return w;
  for (const end of POL_ENDINGS) {
    if (w.endsWith(end) && w.length - end.length >= 4) return w.slice(0, -end.length);
  }
  return w;
};
const itemMatches = (text: string, item: string) => {
  const words = norm(item).split(/[^a-z0-9]+/).filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
  const sig = words.filter((w) => !GENERIC_WORDS.has(w));
  const pool = sig.length > 0 ? sig : words;
  return pool.length > 0 && pool.some((w) => text.includes(stemWord(w)));
};

export default function SpecialDiets() {
  const [pets, setPets] = useState<any[]>([]);
  const [diets, setDiets] = useState<SpecialDiet[]>([]);
  const [selectedPetId, setSelectedPetId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDiet, setEditingDiet] = useState<SpecialDiet | null>(null);
  const [prefill, setPrefill] = useState<DietTemplate | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [todayLogs, setTodayLogs] = useState<FeedingLogItem[]>([]);
  const [monthLogs, setMonthLogs] = useState<FeedingLogItem[]>([]);
  const [deletingDiet, setDeletingDiet] = useState<SpecialDiet | null>(null);
  const [deleting, setDeleting] = useState(false);

  const today = format(new Date(), 'yyyy-MM-dd');

  const loadAll = async () => {
    setLoading(true);
    try {
      const [petsData, dietsData] = await Promise.all([petApi.getAll(), specialDietApi.getAll()]);
      const list = petsData.pets || [];
      setPets(list);
      setDiets(dietsData.diets || []);
      if (list.length > 0 && !selectedPetId) {
        setSelectedPetId(list[0].id.toString());
      }
    } catch {
      setError('Nie udało się pobrać danych');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  // Kontrola przestrzegania diety — wpisy z dziennika karmienia (dziś + 7 dni).
  useEffect(() => {
    if (!selectedPetId) { setTodayLogs([]); setMonthLogs([]); return; }
    // 30 dni historii — do passy dni bez naruszeń i podsumowania tygodnia.
    const monthAgo = format(new Date(Date.now() - 29 * 86400000), 'yyyy-MM-dd');
    feedingLogApi
      .getLogs({ petId: Number(selectedPetId), date: today })
      .then((res) => setTodayLogs(res.logs || []))
      .catch(() => setTodayLogs([]));
    feedingLogApi
      .getLogs({ petId: Number(selectedPetId), from: monthAgo, to: today })
      .then((res) => setMonthLogs(res.logs || []))
      .catch(() => setMonthLogs([]));
  }, [selectedPetId]);

  const fetchDiets = async () => {
    try {
      const data = await specialDietApi.getAll();
      setDiets(data.diets || []);
    } catch {
      setError('Nie udało się pobrać diet');
    }
  };

  const askDelete = (id: number) => {
    const diet = diets.find((d) => d.id === id) || null;
    setDeletingDiet(diet || ({ id } as SpecialDiet));
  };

  const confirmDelete = async () => {
    if (!deletingDiet) return;
    setDeleting(true);
    try {
      await specialDietApi.delete(deletingDiet.id);
      setDeletingDiet(null);
      setModalOpen(false);
      setEditingDiet(null);
      await fetchDiets();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Nie udało się usunąć diety');
    } finally {
      setDeleting(false);
    }
  };

  const startEdit = (diet: SpecialDiet) => {
    setEditingDiet(diet);
    setPrefill(null);
    setModalOpen(true);
  };

  const startAdd = (template?: DietTemplate) => {
    setEditingDiet(null);
    setPrefill(template || null);
    setModalOpen(true);
  };

  const toggleActive = async (diet: SpecialDiet) => {
    try {
      await specialDietApi.update(diet.id, { isActive: !diet.is_active });
      await fetchDiets();
    } catch {
      setError('Nie udało się zmienić statusu diety');
    }
  };

  const filteredDiets = selectedPetId
    ? diets.filter((d) => d.pet_id.toString() === selectedPetId)
    : diets;
  const activeDiets = filteredDiets.filter((d) => d.is_active);
  const inactiveDiets = filteredDiets.filter((d) => !d.is_active);
  const selectedPet = pets.find((p) => p.id.toString() === selectedPetId);

  // Zakazane składniki aktywnych diet × posiłki z dziennika (dziś + 7 dni).
  const compliance = useMemo(() => {
    if (!selectedPetId || activeDiets.length === 0) return null;
    const check = (meals: FeedingLogItem[]) => {
      const violations: { meal: string; diet: string; foods: string[] }[] = [];
      for (const diet of activeDiets) {
        const forbidden = splitList(diet.forbidden_foods);
        for (const meal of meals) {
          const text = norm(`${meal.food_name} ${meal.food_type || ''} ${meal.notes || ''}`);
          const hits = forbidden.filter((f) => itemMatches(text, f));
          if (hits.length > 0) violations.push({ meal: meal.food_name, diet: diet.name, foods: hits });
        }
      }
      return violations;
    };
    const loggedToday = todayLogs.filter((l) => l.meal_type === 'log');
    const loggedMonth = monthLogs.filter((l) => l.meal_type === 'log');
    const weekAgo = format(new Date(Date.now() - 6 * 86400000), 'yyyy-MM-dd');
    const loggedWeek = loggedMonth.filter((l) => l.log_date >= weekAgo);
    // Passa: kolejne dni wstecz od dziś z zapisanymi posiłkami i bez naruszeń.
    const byDay: Record<string, FeedingLogItem[]> = {};
    for (const m of loggedMonth) {
      (byDay[m.log_date] = byDay[m.log_date] || []).push(m);
    }
    let streak = 0;
    for (let i = 0; i < 30; i++) {
      const d = format(new Date(Date.now() - i * 86400000), 'yyyy-MM-dd');
      const dayMeals = byDay[d];
      if (!dayMeals || dayMeals.length === 0) continue; // dni bez posiłków nie przerywają passy
      if (check(dayMeals).length > 0) break;
      streak++;
    }
    return {
      loggedMeals: loggedToday.length,
      violations: check(loggedToday),
      weekViolations: check(loggedWeek).length,
      weekMeals: loggedWeek.length,
      streak,
    };
  }, [selectedPetId, activeDiets, todayLogs, monthLogs]);

  const eliminationProgress = (diet: SpecialDiet) => {
    if (diet.diet_type !== 'elimination' || !diet.start_date) return null;
    const weeks = Math.floor(differenceInDays(new Date(), parseISO(diet.start_date)) / 7);
    const pct = Math.min(100, Math.round((weeks / 10) * 100));
    return { weeks, pct };
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="pv-skeleton h-28 rounded-3xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" /> {error}
          <button
            onClick={() => { setError(''); loadAll(); }}
            className="ml-auto text-xs font-bold underline flex-shrink-0"
          >
            Spróbuj ponownie
          </button>
        </div>
      )}

      {/* Wybór pupila */}
      {pets.length > 0 && (
        <div className="pv-card p-4">
          <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-2">
            <PawPrint className="w-3.5 h-3.5" /> Pupil
          </label>
          <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-1 px-1 py-1">
            <button
              type="button"
              onClick={() => setSelectedPetId('')}
              className={`pv-chip flex-shrink-0 ${!selectedPetId ? '!bg-brand-dark !text-white !border-brand-dark' : ''}`}
            >
              Wszystkie
            </button>
            {pets.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedPetId(p.id.toString())}
                className={`pv-chip flex-shrink-0 ${selectedPetId === p.id.toString() ? '!bg-brand-dark !text-white !border-brand-dark' : ''}`}
              >
                {p.species === 'cat' ? <Cat className="w-3.5 h-3.5" /> : p.species === 'dog' ? <Dog className="w-3.5 h-3.5" /> : <PawPrint className="w-3.5 h-3.5" />}
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Kontrola przestrzegania diety — dziś */}
      {compliance && (
        <div className={`pv-card p-4 border-2 ${
          compliance.violations.length > 0 ? 'border-red-200 bg-red-50/50' : 'border-emerald-200 bg-brand-mint/40'
        }`}>
          <div className="flex items-start gap-3">
            {compliance.violations.length > 0 ? (
              <ShieldAlert className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-brand-dark flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <p className={`font-bold text-sm ${compliance.violations.length > 0 ? 'text-red-700' : 'text-brand-dark'}`}>
                {compliance.violations.length > 0
                  ? `Naruszenie diety dziś (${compliance.violations.length})`
                  : compliance.loggedMeals > 0
                  ? 'Dieta przestrzegana — dzisiejsze posiłki czyste'
                  : 'Brak zapisanych posiłków dziś'}
              </p>
              {compliance.violations.length > 0 ? (
                <div className="mt-1.5 space-y-1">
                  {compliance.violations.map((v, i) => (
                    <p key={i} className="text-xs text-red-600">
                      <span className="font-semibold">{v.meal}</span> zawiera {v.foods.join(', ')} — zakazane przy diecie „{v.diet}"
                    </p>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500 mt-0.5">
                  Posiłki z dziennika karmienia są porównywane z zakazanymi składnikami aktywnych diet.
                </p>
              )}
              {compliance.weekMeals > 0 && (
                <p className="text-[11px] text-gray-400 mt-2 pt-2 border-t border-gray-100">
                  Ostatnie 7 dni: {compliance.weekViolations === 0
                    ? `0 naruszeń w ${compliance.weekMeals} posiłkach ✓`
                    : `${compliance.weekViolations} ${compliance.weekViolations === 1 ? 'naruszenie' : 'naruszeń'} w ${compliance.weekMeals} posiłkach`}
                </p>
              )}
              {compliance.streak > 1 && (
                <p className="text-[11px] text-brand-dark font-semibold mt-1">
                  Passa: {compliance.streak} {compliance.streak < 5 ? 'dni' : 'dni'} bez naruszeń
                </p>
              )}
              {compliance.loggedMeals === 0 && (
                <Link href="/dashboard/feeding-log" className="inline-block mt-1.5 text-xs font-semibold text-brand-dark hover:underline">
                  Zapisz posiłek w dzienniku →
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Wybór diety — kafelki szablonów */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="font-bold text-gray-900 text-sm">Nowa dieta</p>
            <p className="text-[11px] text-gray-400">Wybierz szablon — zasady wypełnią się automatycznie</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {DIET_TEMPLATES.map((t) => {
            const meta = getMeta(t.type);
            const TIcon = meta.Icon;
            return (
              <button
                key={t.type}
                onClick={() => startAdd(t)}
                className="pv-card p-3 text-left transition-all hover:border-brand-dark/40 hover:shadow-sm group"
              >
                <div className="flex items-center gap-2.5">
                  <span className={`w-9 h-9 rounded-xl ${meta.tint} flex items-center justify-center flex-shrink-0`}>
                    <TIcon className="w-4.5 h-4.5" />
                  </span>
                  <p className="text-sm font-bold text-gray-900 leading-tight group-hover:text-brand-dark transition-colors">{t.label}</p>
                </div>
                <p className="text-[11px] text-gray-400 leading-snug line-clamp-2 mt-2">{t.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Lista diet */}
      {filteredDiets.length === 0 ? (
        <div className="pv-card p-10 text-center">
          <p className="font-semibold text-gray-900">
            {selectedPet ? `${selectedPet.name} nie ma jeszcze diety` : 'Brak diet specjalistycznych'}
          </p>
          <p className="text-sm text-gray-400 mt-1">Wybierz szablon powyżej — zasady wypełnią się automatycznie.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeDiets.map((diet) => {
            const meta = getMeta(diet.diet_type);
            const DIcon = meta.Icon;
            const days = diet.start_date ? Math.max(0, differenceInDays(new Date(), parseISO(diet.start_date))) : null;
            const expanded = expandedId === diet.id;
            const allowed = splitList(diet.allowed_foods);
            const forbidden = splitList(diet.forbidden_foods);
            const elProgress = eliminationProgress(diet);
            return (
              <div key={diet.id} className="pv-card overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl ${meta.tint} flex items-center justify-center flex-shrink-0`}>
                      <DIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-bold text-gray-900 truncate text-sm sm:text-base">{diet.name}</h3>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button onClick={() => startEdit(diet)} className="w-8 h-8 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center hover:bg-gray-200 transition-all" title="Edytuj">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => askDelete(diet.id)} className="w-8 h-8 rounded-lg bg-gray-100 text-red-500 flex items-center justify-center hover:bg-red-50 transition-all" title="Usuń">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${meta.tint}`}>{meta.label}</span>
                        {!selectedPetId && <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-semibold">{diet.pet_name}</span>}
                        {days !== null && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-semibold">
                            {days === 0 ? 'od dziś' : `${days} dni na diecie`}
                          </span>
                        )}
                        {diet.end_date && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-semibold">
                            {differenceInDays(parseISO(diet.end_date), new Date()) > 0
                              ? `do końca: ${differenceInDays(parseISO(diet.end_date), new Date())} dni`
                              : 'po terminie'}
                          </span>
                        )}
                      </div>
                      {diet.indication && (
                        <p className="text-xs text-gray-500 mt-1.5">{diet.indication}</p>
                      )}
                    </div>
                  </div>

                  {/* Postęp diety eliminacyjnej */}
                  {elProgress && (
                    <div className="mt-3">
                      <div className="flex justify-between text-[11px] font-semibold mb-1">
                        <span className="text-gray-500">Test eliminacyjny</span>
                        <span className="text-brand-dark">tydzień {elProgress.weeks + 1} / ~10</span>
                      </div>
                      <div className="pv-progress">
                        <div className="pv-progress-fill" style={{ width: `${Math.max(5, elProgress.pct)}%` }} />
                      </div>
                    </div>
                  )}

                  {diet.sportDietWarning && (
                    <div className="flex items-start gap-2 p-3 mt-3 rounded-xl bg-red-50 border border-red-200">
                      <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-red-700 font-medium">{diet.sportDietWarning}</p>
                    </div>
                  )}

                  {(allowed.length > 0 || forbidden.length > 0 || diet.recommendations) && (
                    <button
                      onClick={() => setExpandedId(expanded ? null : diet.id)}
                      className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-brand-dark hover:underline"
                    >
                      {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      {expanded ? 'Ukryj zasady' : `Zasady diety (${allowed.length} dozwolone / ${forbidden.length} zakazane)`}
                    </button>
                  )}

                  {expanded && (
                    <div className="mt-3 space-y-3">
                      {allowed.length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600 mb-1.5">Dozwolone</p>
                          <div className="flex flex-wrap gap-1.5">
                            {allowed.map((f, i) => (
                              <span key={i} className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-[11px] font-medium">{f}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {forbidden.length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wide text-red-600 mb-1.5">Zakazane — pilnowane przez skaner i dziennik</p>
                          <div className="flex flex-wrap gap-1.5">
                            {forbidden.map((f, i) => (
                              <span key={i} className="px-2.5 py-1 rounded-full bg-red-50 border border-red-100 text-red-600 text-[11px] font-medium">{f}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {diet.recommendations && (
                        <p className="text-xs text-gray-600 bg-gray-50 rounded-xl p-3 leading-relaxed">{diet.recommendations}</p>
                      )}
                      {diet.notes && <p className="text-xs text-gray-400 italic">{diet.notes}</p>}
                    </div>
                  )}

                  {diet.diet_type === 'barf' && (
                    <div className="flex items-center justify-between gap-2 p-3 mt-3 rounded-xl bg-orange-50 border border-orange-200">
                      <div className="flex items-center gap-2">
                        <Beef className="w-4 h-4 text-orange-600 flex-shrink-0" />
                        <p className="text-xs text-orange-700 font-medium">
                          {diet.barfPlan
                            ? `Plan BARF: ${diet.barfPlan.dailyFoodGrams}g/dzień (${diet.barfPlan.mealsPerDay} posiłki)`
                            : 'Brak planu BARF dla tego zwierzęcia'}
                        </p>
                      </div>
                      <Link href="/dashboard/barf" className="text-xs font-semibold text-orange-700 hover:underline flex-shrink-0">
                        Kalkulator →
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {inactiveDiets.length > 0 && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-2 mt-2">Zakończone / nieaktywne ({inactiveDiets.length})</p>
              <div className="space-y-2">
                {inactiveDiets.map((diet) => {
                  const meta = getMeta(diet.diet_type);
                  return (
                    <div key={diet.id} className="pv-card p-3.5 opacity-60 flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl ${meta.tint} flex items-center justify-center flex-shrink-0`}>
                        <meta.Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-700 truncate">{diet.name}</p>
                        <p className="text-[10px] text-gray-400">{meta.label} • {diet.pet_name}</p>
                      </div>
                      <button onClick={() => startEdit(diet)} className="w-8 h-8 rounded-lg bg-gray-100 text-gray-400 flex items-center justify-center hover:bg-gray-200" title="Edytuj">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => startAdd()}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full bg-brand-dark hover:bg-brand text-white font-bold shadow-md shadow-brand-dark/20 transition-all active:scale-[0.98]"
      >
        <Plus className="w-4.5 h-4.5" /> Dodaj dietę
      </button>

      <SpecialDietModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setPrefill(null); }}
        onSaved={fetchDiets}
        onDelete={askDelete}
        pets={pets}
        editingDiet={editingDiet}
        prefill={prefill}
        defaultPetId={selectedPetId || undefined}
      />

      <ConfirmModal
        isOpen={!!deletingDiet}
        onCancel={() => setDeletingDiet(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Usuń dietę"
        description={deletingDiet ? `Czy na pewno chcesz usunąć dietę „${deletingDiet.name}"?` : ''}
        confirmLabel="Usuń"
      />
    </div>
  );
}
