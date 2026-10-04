'use client';

import { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { feedingLogApi } from '@/lib/api';
import {
  X,
  Utensils,
  Calendar,
  Clock,
  Loader2,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

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
}

type FeedingLogModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  onDelete?: (id: number) => void;
  petId: number;
  date: string;
  mealType: 'plan' | 'log';
  editingLog?: FeedingLogItem | null;
};

export default function FeedingLogModal({
  isOpen,
  onClose,
  onSaved,
  onDelete,
  petId,
  date,
  mealType,
  editingLog,
}: FeedingLogModalProps) {
  const [form, setForm] = useState({
    foodName: '',
    foodType: 'dry',
    amount: '',
    unit: 'g',
    calories: '',
    mealTime: '',
    notes: '',
    completed: false,
  });
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const initialForm = useMemo(
    () => ({
      foodName: '',
      foodType: 'dry',
      amount: '',
      unit: 'g',
      calories: '',
      mealTime: '',
      notes: '',
      completed: false,
    }),
    []
  );

  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    setError('');
    if (editingLog) {
      setForm({
        foodName: editingLog.food_name,
        foodType: editingLog.food_type || 'dry',
        amount: editingLog.amount?.toString() || '',
        unit: editingLog.unit || 'g',
        calories: editingLog.calories?.toString() || '',
        mealTime: editingLog.meal_time ? editingLog.meal_time.substring(0, 5) : '',
        notes: editingLog.notes || '',
        completed: editingLog.completed,
      });
    } else {
      setForm(initialForm);
    }
  }, [isOpen, editingLog, initialForm]);

  useEffect(() => {
    if (!isOpen) return;
    const scrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    document.documentElement.style.touchAction = 'none';

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);

    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      document.body.style.touchAction = '';
      document.documentElement.style.touchAction = '';
      window.scrollTo(0, scrollY);
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  const isPlan = (editingLog ? editingLog.meal_type : mealType) === 'plan';

  const title = editingLog
    ? `Edytuj ${isPlan ? 'plan' : 'posiłek'}`
    : isPlan
    ? 'Dodaj plan'
    : 'Dodaj posiłek';

  const stepTitles = ['Posiłek', 'Szczegóły', 'Podsumowanie'];

  const formatDate = (d: string) =>
    d ? new Date(d).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';

  const selectedFoodType = foodTypes.find((f) => f.value === form.foodType)?.label || 'Inne';
  const selectedUnit = units.find((u) => u.value === form.unit)?.label || form.unit || '';

  const stepValid = () => {
    if (step === 1) return !!form.foodName.trim();
    return true;
  };

  const nextStep = () => {
    if (!stepValid()) {
      setError('Podaj nazwę posiłku, aby przejść dalej');
      return;
    }
    setError('');
    setStep((s) => Math.min(s + 1, 3));
  };

  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  const handleSubmit = async () => {
    if (!form.foodName.trim()) {
      setError('Podaj nazwę posiłku');
      setStep(1);
      return;
    }

    setSaving(true);
    setError('');
    try {
      const data = {
        petId,
        logDate: date,
        mealTime: form.mealTime || null,
        mealType: editingLog ? editingLog.meal_type : mealType,
        foodName: form.foodName.trim(),
        foodType: form.foodType || null,
        amount: form.amount ? Number(form.amount) : null,
        unit: form.unit || null,
        calories: form.calories ? Number(form.calories) : null,
        notes: form.notes.trim() || null,
        completed: form.completed,
      };

      if (editingLog) {
        await feedingLogApi.update(editingLog.id, data);
      } else {
        await feedingLogApi.create(data);
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Nie udało się zapisać wpisu');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-300">
      <div
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto overscroll-y-contain bg-white rounded-3xl shadow-2xl animate-in fade-in zoom-in-95 duration-300">
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm px-5 sm:px-8 pt-6 sm:pt-8 pb-4 rounded-t-3xl z-10">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1 text-brand-dark">
                Dziennik karmienia
              </p>
              <h2 className="text-2xl font-semibold text-gray-900">{title}</h2>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition-all flex items-center justify-center"
              aria-label="Zamknij"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="px-5 sm:px-8 pb-6 sm:pb-8">
          {error && (
            <div className="mb-5 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium">
              {error}
            </div>
          )}

          {/* Stepper */}
          <div className="flex items-center gap-2 mb-6">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex-1 flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                    s < step
                      ? 'bg-brand-dark text-white'
                      : s === step
                      ? 'bg-brand-dark/10 text-brand-dark ring-2 ring-[#1B6B4A]'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {s < step ? '✓' : s}
                </div>
                <span className={`hidden sm:block text-sm ${s <= step ? 'text-gray-800 font-medium' : 'text-gray-400'}`}>
                  {stepTitles[s - 1]}
                </span>
                {s < 3 && <div className="hidden sm:block flex-1 h-0.5 bg-gray-200 rounded-full" />}
              </div>
            ))}
          </div>

          {/* Step 1 */}
          {step === 1 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <WizardField label="Nazwa posiłku / karmy" full>
                <input
                  type="text"
                  value={form.foodName}
                  onChange={(e) => setForm({ ...form, foodName: e.target.value })}
                  placeholder="np. Royal Canin, kurczak z ryżem"
                  className="w-full bg-transparent text-gray-900 font-medium placeholder:text-gray-400 placeholder:font-normal focus:outline-none"
                />
              </WizardField>

              <WizardField label="Typ karmy">
                <select
                  value={form.foodType}
                  onChange={(e) => setForm({ ...form, foodType: e.target.value })}
                  className="w-full bg-transparent text-gray-900 font-medium focus:outline-none"
                >
                  {foodTypes.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </WizardField>

              <WizardField label="Godzina">
                <div className="relative flex items-center w-full">
                  <Clock className="w-5 h-5 text-gray-400 mr-3" />
                  <input
                    type="time"
                    value={form.mealTime}
                    onChange={(e) => setForm({ ...form, mealTime: e.target.value })}
                    className="w-full bg-transparent text-gray-900 font-medium focus:outline-none"
                  />
                </div>
              </WizardField>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <WizardField label="Ilość">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="np. 250"
                  className="w-full bg-transparent text-gray-900 font-medium placeholder:text-gray-400 placeholder:font-normal focus:outline-none"
                />
              </WizardField>

              <WizardField label="Jednostka">
                <select
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  className="w-full bg-transparent text-gray-900 font-medium focus:outline-none"
                >
                  {units.map((u) => (
                    <option key={u.value} value={u.value}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </WizardField>

              <WizardField label="Kalorie" optional>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={form.calories}
                  onChange={(e) => setForm({ ...form, calories: e.target.value })}
                  placeholder="np. 350"
                  className="w-full bg-transparent text-gray-900 font-medium placeholder:text-gray-400 placeholder:font-normal focus:outline-none"
                />
              </WizardField>

              {isPlan && (
                <WizardField label="Status">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, completed: !form.completed })}
                    className="flex items-center gap-3 w-full"
                  >
                    <span
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        form.completed ? 'bg-brand-dark' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                          form.completed ? 'translate-x-5' : 'translate-x-1'
                        }`}
                      />
                    </span>
                    <span className="text-sm font-medium text-gray-700">
                      {form.completed ? 'Wykonany' : 'Niewykonany'}
                    </span>
                  </button>
                </WizardField>
              )}
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div className="space-y-4">
              <WizardField label="Notatki" optional full>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Dodatkowe informacje..."
                  rows={3}
                  className="w-full bg-transparent text-gray-900 font-medium placeholder:text-gray-400 placeholder:font-normal focus:outline-none resize-none"
                />
              </WizardField>

              <div className="p-5 rounded-2xl bg-gray-50 border border-gray-100">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-4">Podsumowanie</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Nazwa posiłku</p>
                    <p className="font-medium text-gray-900">{form.foodName || '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Typ karmy</p>
                    <p className="font-medium text-gray-900">{selectedFoodType}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Godzina</p>
                    <p className="font-medium text-gray-900">{form.mealTime || '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Ilość</p>
                    <p className="font-medium text-gray-900">{form.amount ? `${form.amount} ${selectedUnit}` : '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Kalorie</p>
                    <p className="font-medium text-gray-900">{form.calories ? `${form.calories} kcal` : '—'}</p>
                  </div>
                  {isPlan && (
                    <div>
                      <p className="text-sm text-gray-500">Status</p>
                      <p className="font-medium text-gray-900">{form.completed ? 'Wykonany' : 'Niewykonany'}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-500">Data</p>
                    <p className="font-medium text-gray-900">{formatDate(date)}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-sm text-gray-500">Notatki</p>
                    <p className="font-medium text-gray-900">{form.notes || '—'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <div className="flex flex-col sm:flex-row gap-3">
              {editingLog && onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(editingLog.id)}
                  className="flex items-center gap-2 text-red-600 hover:bg-red-50 px-6 py-3.5 rounded-full font-medium transition-all"
                >
                  <Trash2 className="w-4 h-4" /> Usuń
                </button>
              )}
              {step > 1 && (
                <button
                  type="button"
                  onClick={prevStep}
                  className="px-8 py-3.5 rounded-full border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                >
                  <ChevronLeft className="w-4 h-4" /> Wstecz
                </button>
              )}
            </div>
            {step < 3 ? (
              <button
                type="button"
                onClick={nextStep}
                className="flex-1 bg-brand-dark hover:bg-brand-dark text-white py-3.5 rounded-full font-medium shadow-md shadow-brand-dark/20 transition-all flex items-center justify-center gap-2"
              >
                Dalej <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving}
                className="flex-1 bg-brand-dark hover:bg-brand-dark text-white py-3.5 rounded-full font-medium shadow-md shadow-brand-dark/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {editingLog ? 'Zapisz zmiany' : 'Dodaj'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function WizardField({
  label,
  optional,
  children,
  full,
}: {
  label: string;
  optional?: boolean;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div
      className={`p-5 rounded-2xl bg-white border border-gray-200 shadow-sm focus-within:border-brand-dark/50 focus-within:ring-2 focus-within:ring-[#1B6B4A]/10 transition-all ${
        full ? 'sm:col-span-2' : ''
      }`}
    >
      <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
        {label}
        {optional && <span className="normal-case font-normal text-gray-400"> (opcjonalnie)</span>}
      </label>
      {children}
    </div>
  );
}
