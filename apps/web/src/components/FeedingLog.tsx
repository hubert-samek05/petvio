'use client';

import { useEffect, useState } from 'react';
import { petApi, feedingLogApi } from '@/lib/api';
import { format, addDays, parseISO, isToday, isYesterday, isTomorrow } from 'date-fns';
import { pl } from 'date-fns/locale';
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  Pencil,
  ChevronLeft,
  ChevronRight,
  Check,
  Circle,
  AlertCircle,
  Loader2,
  Info,
  Utensils,
  Dumbbell,
  Beef,
  PawPrint,
  Dog,
  Cat,
  Cookie,
  Drumstick,
  Package,
  HelpCircle,
  ClipboardList,
  Flame,
  ListChecks,
} from 'lucide-react';
import FeedingLogModal from './FeedingLogModal';
import ConfirmModal from './ui/ConfirmModal';

const foodTypes = [
  { value: 'dry', label: 'Sucha karma', Icon: Package },
  { value: 'wet', label: 'Mokra karma', Icon: Drumstick },
  { value: 'raw', label: 'Karma BARF / surowa', Icon: Beef },
  { value: 'home', label: 'Domowe jedzenie', Icon: Utensils },
  { value: 'treat', label: 'Przysmak', Icon: Cookie },
  { value: 'other', label: 'Inne', Icon: HelpCircle },
];

const units = [
  { value: 'g', label: 'g' },
  { value: 'kcal', label: 'kcal' },
  { value: 'porcja', label: 'porcja' },
  { value: 'łyżka', label: 'łyżka' },
  { value: 'puszka', label: 'puszka' },
  { value: 'sztuka', label: 'sztuka' },
];

const tabs = [
  { value: 'log', label: 'Dziennik', Icon: ClipboardList },
  { value: 'plan', label: 'Planer', Icon: ListChecks },
];

const foodTypeStyle: Record<string, { Icon: any; bg: string; text: string }> = {
  dry: { Icon: Package, bg: 'bg-amber-100', text: 'text-amber-700' },
  wet: { Icon: Drumstick, bg: 'bg-blue-100', text: 'text-blue-700' },
  raw: { Icon: Beef, bg: 'bg-red-100', text: 'text-red-700' },
  home: { Icon: Utensils, bg: 'bg-brand-mint', text: 'text-brand-dark' },
  treat: { Icon: Cookie, bg: 'bg-purple-100', text: 'text-purple-700' },
  other: { Icon: HelpCircle, bg: 'bg-gray-100', text: 'text-gray-600' },
};

interface FeedingLogItem {
  id: number;
  pet_id: number;
  user_id: number;
  log_date: string;
  meal_time: string | null;
  meal_type: 'plan' | 'log';
  food_name: string;
  food_type: string | null;
  amount: number | null;
  unit: string | null;
  calories: number | null;
  completed: boolean;
  notes: string | null;
  created_at: string;
  pet_name?: string;
  pet_species?: string;
}

function dateLabel(dateStr: string) {
  const d = parseISO(dateStr);
  const formatted = format(d, 'EEEE, d MMMM', { locale: pl });
  if (isToday(d)) return `Dziś • ${formatted}`;
  if (isYesterday(d)) return `Wczoraj • ${formatted}`;
  if (isTomorrow(d)) return `Jutro • ${formatted}`;
  return formatted;
}

export default function FeedingLog() {
  const [pets, setPets] = useState<any[]>([]);
  const [selectedPetId, setSelectedPetId] = useState('');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [activeTab, setActiveTab] = useState<'log' | 'plan'>('log');
  const [logs, setLogs] = useState<FeedingLogItem[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [sportDiet, setSportDiet] = useState<any>(null);
  const [barfPlan, setBarfPlan] = useState<any>(null);
  const [loggingBarf, setLoggingBarf] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingLog, setEditingLog] = useState<FeedingLogItem | null>(null);
  const [dietWarnings, setDietWarnings] = useState<string[]>([]);

  useEffect(() => {
    const loadPets = async () => {
      try {
        const response = await petApi.getAll();
        const list = response.pets || [];
        setPets(list);
        if (list.length > 0 && !selectedPetId) {
          setSelectedPetId(list[0].id.toString());
        }
      } catch (err: any) {
        setError('Nie udało się pobrać listy zwierząt');
      }
    };
    loadPets();
  }, []);

  useEffect(() => {
    if (selectedPetId) {
      fetchLogs();
    }
  }, [selectedPetId, selectedDate, activeTab]);

  const fetchLogs = async () => {
    setLoading(true);
    setError('');
    try {
      const [logsResponse, summaryResponse] = await Promise.all([
        feedingLogApi.getLogs({
          petId: Number(selectedPetId),
          date: selectedDate,
          type: activeTab,
        }),
        feedingLogApi.getSummary({
          petId: Number(selectedPetId),
          date: selectedDate,
        }),
      ]);
      setLogs(logsResponse.logs || []);
      setSummary(summaryResponse.summary || null);
      setSportDiet(summaryResponse.sportDiet || null);
      setBarfPlan(summaryResponse.barfPlan || null);
      setLoadError(false);
    } catch (err: any) {
      setLoadError(true);
      setError(err.response?.data?.error?.message || 'Nie udało się pobrać danych');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (log: FeedingLogItem) => {
    setEditingLog(log);
    setShowForm(true);
  };

  const handleCloseModal = () => {
    setShowForm(false);
    setEditingLog(null);
  };

  const handleSaved = (warnings?: string[]) => {
    if (warnings && warnings.length > 0) setDietWarnings(warnings);
    fetchLogs();
  };

  const handleLogBarfMeal = async () => {
    if (!barfPlan || !selectedPetId) return;
    setLoggingBarf(true);
    setError('');
    try {
      await feedingLogApi.create({
        petId: Number(selectedPetId),
        logDate: selectedDate,
        mealType: activeTab,
        foodName: 'Posiłek BARF (z planu)',
        foodType: 'raw',
        amount: barfPlan.perMealGrams,
        unit: 'g',
        calories: barfPlan.caloriesTarget ? Math.round(barfPlan.caloriesTarget / barfPlan.mealsPerDay) : null,
        completed: activeTab === 'plan' ? false : true,
      });
      await fetchLogs();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Nie udało się dodać posiłku BARF');
    } finally {
      setLoggingBarf(false);
    }
  };

  const handleDelete = async () => {
    if (deleteId === null) return;
    setDeleting(true);
    setError('');
    try {
      await feedingLogApi.delete(deleteId);
      setDeleteId(null);
      setShowForm(false);
      setEditingLog(null);
      await fetchLogs();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Nie udało się usunąć wpisu');
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleComplete = async (log: FeedingLogItem) => {
    try {
      await feedingLogApi.update(log.id, { completed: !log.completed });
      await fetchLogs();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Nie udało się zaktualizować wpisu');
    }
  };

  const changeDate = (days: number) => {
    setSelectedDate(format(addDays(parseISO(selectedDate), days), 'yyyy-MM-dd'));
  };

  const getFoodTypeLabel = (value: string | null) =>
    foodTypes.find((f) => f.value === value)?.label || 'Inne';

  const getUnitLabel = (value: string | null) =>
    units.find((u) => u.value === value)?.label || value || '';

  const totalKcal = Number(summary?.total_calories || 0);
  const totalMeals = Number(summary?.log_count || 0);
  const planDone = summary?.plan_count ? `${summary.completed_plans}/${summary.plan_count}` : '—';

  return (
    <div className="space-y-5">
      {/* Wybór pupila — chips */}
      {pets.length > 0 && (
        <div className="pv-card p-4">
          <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-2">
            <PawPrint className="w-3.5 h-3.5" /> Dla kogo?
          </label>
          <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-1 px-1 py-1">
            {pets.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedPetId(p.id.toString())}
                className={`pv-chip flex-shrink-0 ${
                  selectedPetId === p.id.toString() ? '!bg-brand-dark !text-white !border-brand-dark' : ''
                }`}
              >
                {p.species === 'cat' ? <Cat className="w-3.5 h-3.5" /> : <Dog className="w-3.5 h-3.5" />}
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Nawigacja daty */}
      <div className="pv-card p-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => changeDate(-1)}
            className="flex-shrink-0 w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-brand-mint transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 text-center">
            <p className="font-semibold text-gray-900 capitalize text-sm sm:text-base">{dateLabel(selectedDate)}</p>
            {!isToday(parseISO(selectedDate)) && (
              <button
                type="button"
                onClick={() => setSelectedDate(format(new Date(), 'yyyy-MM-dd'))}
                className="text-[11px] text-brand-dark font-semibold hover:underline mt-0.5"
              >
                Wróć do dziś
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => changeDate(1)}
            className="flex-shrink-0 w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-brand-mint transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="mt-3 w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-xs text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand/10 focus:border-brand"
        />
      </div>

      {/* Taby Dziennik / Planer */}
      <div className="flex gap-1 p-1 rounded-2xl bg-gray-100/80">
        {tabs.map(({ value, label, Icon }) => (
          <button
            key={value}
            onClick={() => {
              setActiveTab(value as 'log' | 'plan');
              setShowForm(false);
              setEditingLog(null);
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              activeTab === value ? 'bg-white shadow-sm text-brand-dark' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {/* Dieta sportowa */}
      {sportDiet && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-brand-mint border border-emerald-200">
          <Dumbbell className="w-5 h-5 flex-shrink-0 text-brand-dark" />
          <p className="text-sm text-brand-dark font-medium">
            Dieta sportowa „{sportDiet.name}” — {sportDiet.mealFrequency} posiłki/dzień, mnożnik ×{sportDiet.multiplier}
          </p>
        </div>
      )}

      {/* Plan BARF */}
      {barfPlan && (
        <div className="p-4 rounded-2xl bg-orange-50 border border-orange-200 space-y-2.5">
          <div className="flex items-start gap-3">
            <Beef className="w-5 h-5 flex-shrink-0 text-orange-600 mt-0.5" />
            <p className="text-sm text-orange-700 font-medium">
              Plan BARF: {barfPlan.dailyFoodGrams}g/dzień ({barfPlan.mealsPerDay} × {barfPlan.perMealGrams}g) — mięso {barfPlan.muscleMeatGrams}g, kość {barfPlan.boneGrams}g, wątroba {barfPlan.liverGrams}g{barfPlan.vegFruitGrams > 0 ? `, warzywa/owoce ${barfPlan.vegFruitGrams}g` : ''}
            </p>
          </div>
          <button
            onClick={handleLogBarfMeal}
            disabled={loggingBarf || !selectedPetId}
            className="flex items-center gap-2 text-xs font-semibold text-orange-700 bg-white/80 hover:bg-white px-4 py-2 rounded-full transition-all disabled:opacity-50"
          >
            {loggingBarf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Zaloguj posiłek BARF ({barfPlan.perMealGrams}g)
          </button>
        </div>
      )}

      {/* Statystyki dnia */}
      {summary && (totalMeals > 0 || summary.plan_count > 0) && (
        <div className="pv-card overflow-hidden">
          <div className="grid grid-cols-4 divide-x divide-gray-100">
            <div className="p-3.5 text-center">
              <p className="text-xl font-bold text-gray-800">{totalMeals}</p>
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">posiłków</p>
            </div>
            <div className="p-3.5 text-center">
              <p className="text-xl font-bold text-amber-600 flex items-center justify-center gap-1">
                <Flame className="w-4 h-4" />{Math.round(totalKcal)}
              </p>
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">kcal</p>
            </div>
            <div className="p-3.5 text-center">
              <p className="text-xl font-bold text-gray-800">{Number(summary.total_amount || 0).toFixed(0)}</p>
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">gram</p>
            </div>
            <div className="p-3.5 text-center">
              <p className="text-xl font-bold text-brand-dark">{planDone}</p>
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">plan</p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-50 text-red-700 border border-red-100">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {dietWarnings.length > 0 && (
        <div className="p-4 rounded-2xl bg-red-50 border-2 border-red-200 space-y-1">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-bold text-red-700">Uwaga — konflikt z aktywną dietą!</p>
              {dietWarnings.map((w, i) => (
                <p key={i} className="text-xs text-red-600 mt-0.5">{w}</p>
              ))}
            </div>
            <button
              onClick={() => setDietWarnings([])}
              className="text-red-400 hover:text-red-600 text-xs font-bold"
            >
              Zamknij
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => {
          setEditingLog(null);
          setShowForm(true);
        }}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full bg-brand-dark hover:bg-brand text-white font-bold shadow-md shadow-brand-dark/20 transition-all active:scale-[0.98]"
      >
        <Plus className="w-4.5 h-4.5" />
        Dodaj {activeTab === 'log' ? 'posiłek' : 'plan posiłku'}
      </button>

      <FeedingLogModal
        isOpen={showForm}
        onClose={handleCloseModal}
        onSaved={handleSaved}
        onDelete={(id) => setDeleteId(id)}
        petId={Number(selectedPetId)}
        date={selectedDate}
        mealType={activeTab}
        editingLog={editingLog}
      />

      <ConfirmModal
        isOpen={deleteId !== null}
        title="Usunąć ten wpis?"
        description="Wpis zostanie trwale usunięty z dziennika karmienia."
        confirmLabel="Usuń"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />

      {/* Lista wpisów */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="pv-skeleton h-16 rounded-2xl" />
          ))}
        </div>
      ) : loadError ? (
        <div className="pv-card p-8 text-center">
          <AlertCircle className="w-8 h-8 mx-auto mb-3 text-red-400" />
          <p className="font-semibold text-gray-900 text-sm">Nie udało się pobrać dziennika</p>
          <button
            onClick={fetchLogs}
            className="mt-3 px-5 py-2.5 rounded-full bg-brand-dark text-white text-xs font-bold active:scale-95 transition-all"
          >
            Spróbuj ponownie
          </button>
        </div>
      ) : logs.length === 0 ? (
        <div className="pv-card p-10 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-3xl bg-brand-mint flex items-center justify-center animate-float">
            <Utensils className="w-7 h-7 text-brand-dark" />
          </div>
          <p className="font-semibold text-gray-900">
            Brak {activeTab === 'log' ? 'zapisanych posiłków' : 'planów posiłków'}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {activeTab === 'log'
              ? 'Dodaj pierwszy posiłek, aby śledzić karmienie pupila.'
              : 'Zaplanuj posiłki na ten dzień i odhaczaj je po wykonaniu.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {logs.map((log) => {
            const style = foodTypeStyle[log.food_type || 'other'] || foodTypeStyle.other;
            const FIcon = style.Icon;
            const isDone = log.meal_type === 'plan' && log.completed;
            return (
              <div
                key={log.id}
                className={`pv-card p-4 transition-all ${
                  isDone ? 'border-emerald-200 bg-brand-mint/40' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${style.bg} ${style.text}`}>
                    <FIcon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className={`font-semibold text-gray-900 truncate text-sm sm:text-base ${isDone ? 'line-through opacity-60' : ''}`}>
                        {log.food_name}
                      </h3>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {log.meal_type === 'plan' && (
                          <button
                            onClick={() => handleToggleComplete(log)}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                              log.completed
                                ? 'bg-brand-dark text-white'
                                : 'bg-gray-100 text-gray-400 hover:bg-brand-mint'
                            }`}
                            title={log.completed ? 'Oznacz jako niewykonany' : 'Oznacz jako wykonany'}
                          >
                            {log.completed ? <Check className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                          </button>
                        )}
                        <button
                          onClick={() => startEdit(log)}
                          className="w-8 h-8 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center hover:bg-gray-200 transition-all"
                          title="Edytuj"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteId(log.id)}
                          className="w-8 h-8 rounded-lg bg-gray-100 text-red-500 flex items-center justify-center hover:bg-red-50 transition-all"
                          title="Usuń"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${style.bg} ${style.text}`}>
                        {getFoodTypeLabel(log.food_type)}
                      </span>
                      {log.meal_time && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-semibold flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {log.meal_time.substring(0, 5)}
                        </span>
                      )}
                      {log.amount && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-semibold">
                          {log.amount} {getUnitLabel(log.unit)}
                        </span>
                      )}
                      {log.calories && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold flex items-center gap-0.5">
                          <Flame className="w-3 h-3" /> {log.calories} kcal
                        </span>
                      )}
                    </div>
                    {log.notes && (
                      <p className="text-xs text-gray-400 mt-1.5 flex items-start gap-1">
                        <Info className="w-3 h-3 flex-shrink-0 mt-0.5" />
                        <span className="break-words">{log.notes}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
