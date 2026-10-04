'use client';

import { useEffect, useState } from 'react';
import { petApi, feedingLogApi } from '@/lib/api';
import { format, addDays, parseISO } from 'date-fns';
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  Pencil,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  Circle,
  AlertCircle,
  Loader2,
  Info,
  Utensils,
  Dumbbell,
  Beef,
} from 'lucide-react';
import FeedingLogModal from './FeedingLogModal';

const foodTypes = [
  { value: 'dry', label: 'Sucha karma' },
  { value: 'wet', label: 'Mokra karma' },
  { value: 'raw', label: 'Karma BARF / surowa' },
  { value: 'home', label: 'Domowe jedzenie' },
  { value: 'treat', label: 'Przysmak' },
  { value: 'other', label: 'Inne' },
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
  { value: 'log', label: 'Dziennik' },
  { value: 'plan', label: 'Planer' },
];

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
  const [showForm, setShowForm] = useState(false);
  const [editingLog, setEditingLog] = useState<FeedingLogItem | null>(null);

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
    } catch (err: any) {
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

  const handleSaved = () => fetchLogs();

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

  const handleDelete = async (id: number) => {
    if (!confirm('Czy na pewno chcesz usunąć ten wpis?')) return;
    try {
      await feedingLogApi.delete(id);
      setShowForm(false);
      setEditingLog(null);
      await fetchLogs();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Nie udało się usunąć wpisu');
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

  const getFoodTypeLabel = (value: string | null) => {
    return foodTypes.find((f) => f.value === value)?.label || 'Inne';
  };

  const getUnitLabel = (value: string | null) => {
    return units.find((u) => u.value === value)?.label || value || '';
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        <div className="space-y-1.5 sm:space-y-2">
          <label className="text-[11px] sm:text-xs font-semibold uppercase tracking-wide text-gray-500">Wybierz pupila</label>
          <div className="relative flex items-center w-full">
            <select
              value={selectedPetId}
              onChange={(e) => setSelectedPetId(e.target.value)}
              className="w-full appearance-none bg-white border border-gray-200 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-dark/30 focus:border-brand-dark pr-10"
            >
              <option value="">Wybierz zwierzę</option>
              {pets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.species === 'cat' ? 'kot' : 'pies'})
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        <div className="space-y-1.5 sm:space-y-2">
          <label className="text-[11px] sm:text-xs font-semibold uppercase tracking-wide text-gray-500">Data</label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => changeDate(-1)}
              className="flex-shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:border-brand-dark/30 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="flex-1 bg-white border border-gray-200 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-dark/30 focus:border-brand-dark"
            />
            <button
              type="button"
              onClick={() => changeDate(1)}
              className="flex-shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:border-brand-dark/30 transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 p-1 bg-gray-100 rounded-xl">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => {
              setActiveTab(tab.value as 'log' | 'plan');
              setShowForm(false);
              setEditingLog(null);
            }}
            className={`flex-1 px-3 py-2 sm:py-2.5 rounded-lg text-sm sm:text-base font-medium transition-all ${
              activeTab === tab.value
                ? 'bg-white text-brand-dark shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {sportDiet && (
        <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl bg-brand-mint border border-emerald-200">
          <Dumbbell className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 text-brand-dark" />
          <p className="text-xs sm:text-sm text-brand-dark font-medium">
            Aktywna dieta sportowa: „{sportDiet.name}” — zalecane {sportDiet.mealFrequency} posiłki/dzień (mnożnik kalorii x{sportDiet.multiplier})
          </p>
        </div>
      )}

      {barfPlan && (
        <div className="p-3 sm:p-4 rounded-xl bg-orange-50 border border-orange-200 space-y-2">
          <div className="flex items-start gap-2 sm:gap-3">
            <Beef className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 text-orange-600 mt-0.5" />
            <p className="text-xs sm:text-sm text-orange-700 font-medium">
              Aktywny plan BARF: {barfPlan.dailyFoodGrams}g/dzień ({barfPlan.mealsPerDay} posiłki × {barfPlan.perMealGrams}g) — mięso {barfPlan.muscleMeatGrams}g, kość {barfPlan.boneGrams}g, wątroba {barfPlan.liverGrams}g, narządy {barfPlan.otherOrganGrams}g{barfPlan.vegFruitGrams > 0 ? `, warzywa/owoce ${barfPlan.vegFruitGrams}g` : ''}
            </p>
          </div>
          <button
            onClick={handleLogBarfMeal}
            disabled={loggingBarf || !selectedPetId}
            className="flex items-center gap-2 text-xs sm:text-sm font-medium text-orange-700 bg-white/70 hover:bg-white px-3 py-1.5 rounded-full transition-all disabled:opacity-50"
          >
            {loggingBarf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Zaloguj posiłek BARF z planu ({barfPlan.perMealGrams}g)
          </button>
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <div className="p-2 sm:p-3 rounded-xl bg-gray-50 text-center">
            <p className="text-lg sm:text-2xl font-semibold text-gray-700">{summary.log_count || 0}</p>
            <p className="text-[10px] sm:text-xs text-gray-500">Posiłków</p>
          </div>
          <div className="p-2 sm:p-3 rounded-xl bg-gray-50 text-center">
            <p className="text-lg sm:text-2xl font-semibold text-gray-700">{Number(summary.total_calories || 0).toFixed(0)}</p>
            <p className="text-[10px] sm:text-xs text-gray-500">kcal</p>
          </div>
          <div className="p-2 sm:p-3 rounded-xl bg-gray-50 text-center">
            <p className="text-lg sm:text-2xl font-semibold text-gray-700">{Number(summary.total_amount || 0).toFixed(0)}</p>
            <p className="text-[10px] sm:text-xs text-gray-500">Ilość</p>
          </div>
          <div className="p-2 sm:p-3 rounded-xl bg-gray-50 text-center">
            <p className="text-lg sm:text-2xl font-semibold text-gray-700">
              {summary.plan_count ? `${summary.completed_plans}/${summary.plan_count}` : '—'}
            </p>
            <p className="text-[10px] sm:text-xs text-gray-500">Plan wykonany</p>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl bg-red-50 text-red-700 border border-red-200">
          <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
          <p className="text-xs sm:text-sm font-medium">{error}</p>
        </div>
      )}

      <button
        onClick={() => {
          setEditingLog(null);
          setShowForm(true);
        }}
        className="w-full flex items-center justify-center gap-2 py-2.5 sm:py-3 rounded-xl bg-brand-dark text-white text-sm sm:text-base font-medium hover:bg-brand-dark transition-all"
      >
        <Plus className="w-4 h-4" />
        Dodaj {activeTab === 'log' ? 'posiłek' : 'plan'}
      </button>

      <FeedingLogModal
        isOpen={showForm}
        onClose={handleCloseModal}
        onSaved={handleSaved}
        onDelete={handleDelete}
        petId={Number(selectedPetId)}
        date={selectedDate}
        mealType={activeTab}
        editingLog={editingLog}
      />

      {loading ? (
        <div className="text-center py-12 text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
          <p className="text-sm">Ładowanie...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 px-4 rounded-2xl bg-gray-50 border border-gray-200 border-dashed">
          <Utensils className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm sm:text-base text-gray-600 font-medium">
            Brak {activeTab === 'log' ? 'zapisanych posiłków' : 'planów posiłków'} na ten dzień
          </p>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Dodaj pierwszy wpis, aby rozpocząć śledzenie karmienia.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <div
              key={log.id}
              className={`bg-white rounded-2xl border p-3 sm:p-4 transition-all ${
                log.meal_type === 'plan' && log.completed ? 'border-emerald-200 bg-brand-mint/30' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
                  log.meal_type === 'plan' ? 'bg-brand-light text-brand-dark' : 'bg-amber-100 text-amber-600'
                }`}>
                  {log.meal_type === 'plan' ? <Calendar className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm sm:text-base font-semibold text-gray-900 truncate">{log.food_name}</h3>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {log.meal_type === 'plan' && (
                        <button
                          onClick={() => handleToggleComplete(log)}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                            log.completed ? 'bg-brand-light text-brand-dark' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                          }`}
                          title={log.completed ? 'Oznacz jako niewykonany' : 'Oznacz jako wykonany'}
                        >
                          {log.completed ? <Check className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                        </button>
                      )}
                      <button
                        onClick={() => startEdit(log)}
                        className="w-8 h-8 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center hover:bg-gray-200 transition-all"
                        title="Edytuj"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(log.id)}
                        className="w-8 h-8 rounded-lg bg-gray-100 text-red-600 flex items-center justify-center hover:bg-red-50 transition-all"
                        title="Usuń"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="text-[10px] sm:text-xs px-2 py-1 rounded-lg bg-gray-100 text-gray-600">
                      {getFoodTypeLabel(log.food_type)}
                    </span>
                    {log.meal_time && (
                      <span className="text-[10px] sm:text-xs px-2 py-1 rounded-lg bg-gray-100 text-gray-600 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {log.meal_time.substring(0, 5)}
                      </span>
                    )}
                    {log.amount && (
                      <span className="text-[10px] sm:text-xs px-2 py-1 rounded-lg bg-gray-100 text-gray-600">
                        {log.amount} {getUnitLabel(log.unit)}
                      </span>
                    )}
                    {log.calories && (
                      <span className="text-[10px] sm:text-xs px-2 py-1 rounded-lg bg-amber-100 text-amber-700">
                        {log.calories} kcal
                      </span>
                    )}
                    {log.meal_type === 'plan' && log.completed && (
                      <span className="text-[10px] sm:text-xs px-2 py-1 rounded-lg bg-brand-light text-brand-dark flex items-center gap-1">
                        <Check className="w-3 h-3" /> Wykonany
                      </span>
                    )}
                  </div>
                  {log.notes && (
                    <p className="text-[11px] sm:text-xs text-gray-500 mt-2 flex items-start gap-1">
                      <Info className="w-3 h-3 flex-shrink-0 mt-0.5" />
                      <span className="break-words">{log.notes}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

