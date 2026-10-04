'use client';

import { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { specialDietApi } from '@/lib/api';
import {
  X,
  Apple,
  Loader2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Calendar,
} from 'lucide-react';

const dietTypes = [
  { value: 'renal', label: 'Nerkowa' },
  { value: 'diabetic', label: 'Cukrzycowa' },
  { value: 'elimination', label: 'Eliminacyjna' },
  { value: 'barf', label: 'BARF' },
  { value: 'weight', label: 'Nadwaga / odchudzanie' },
  { value: 'allergy', label: 'Alergia' },
  { value: 'other', label: 'Inna' },
];

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
}

type SpecialDietModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  onDelete?: (id: number) => void;
  pets: any[];
  editingDiet?: SpecialDiet | null;
};

export default function SpecialDietModal({
  isOpen,
  onClose,
  onSaved,
  onDelete,
  pets,
  editingDiet,
}: SpecialDietModalProps) {
  const [form, setForm] = useState({
    petId: '',
    name: '',
    dietType: 'renal',
    customDietType: '',
    indication: '',
    allowedFoods: '',
    forbiddenFoods: '',
    recommendations: '',
    notes: '',
    startDate: '',
    endDate: '',
    isActive: true,
  });
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const initialForm = useMemo(
    () => ({
      petId: pets[0]?.id?.toString() || '',
      name: '',
      dietType: 'renal',
      customDietType: '',
      indication: '',
      allowedFoods: '',
      forbiddenFoods: '',
      recommendations: '',
      notes: '',
      startDate: '',
      endDate: '',
      isActive: true,
    }),
    [pets]
  );

  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    setError('');
    if (editingDiet) {
      const isCustom = !dietTypes.some((t) => t.value === editingDiet.diet_type);
      setForm({
        petId: editingDiet.pet_id.toString(),
        name: editingDiet.name,
        dietType: isCustom ? 'other' : editingDiet.diet_type,
        customDietType: isCustom ? editingDiet.diet_type : '',
        indication: editingDiet.indication || '',
        allowedFoods: editingDiet.allowed_foods || '',
        forbiddenFoods: editingDiet.forbidden_foods || '',
        recommendations: editingDiet.recommendations || '',
        notes: editingDiet.notes || '',
        startDate: editingDiet.start_date || '',
        endDate: editingDiet.end_date || '',
        isActive: editingDiet.is_active,
      });
    } else {
      setForm(initialForm);
    }
  }, [isOpen, editingDiet, initialForm]);

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

  const title = editingDiet ? 'Edytuj dietę' : 'Dodaj dietę';
  const stepTitles = ['Podstawowe', 'Składniki', 'Szczegóły'];

  const selectedPet = pets.find((p) => p.id.toString() === form.petId);
  const selectedTypeLabel =
    dietTypes.find((t) => t.value === form.dietType)?.label ||
    (form.dietType === 'other' ? 'Inna' : form.dietType);

  const formatDate = (d: string) =>
    d ? new Date(d).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';

  const stepValid = () => {
    if (step === 1) return !!form.petId && !!form.name.trim() && (!!form.dietType && (form.dietType !== 'other' || !!form.customDietType.trim()));
    return true;
  };

  const nextStep = () => {
    if (!stepValid()) {
      setError('Uzupełnij wymagane pola');
      return;
    }
    setError('');
    setStep((s) => Math.min(s + 1, 3));
  };

  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  const handleSubmit = async () => {
    if (!stepValid()) {
      setError('Uzupełnij wymagane pola');
      setStep(1);
      return;
    }

    setSaving(true);
    setError('');

    const dietTypeValue = form.dietType === 'other' ? form.customDietType.trim() : form.dietType;

    try {
      const data = {
        petId: Number(form.petId),
        name: form.name.trim(),
        dietType: dietTypeValue,
        indication: form.indication.trim() || null,
        allowedFoods: form.allowedFoods.trim() || null,
        forbiddenFoods: form.forbiddenFoods.trim() || null,
        recommendations: form.recommendations.trim() || null,
        notes: form.notes.trim() || null,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        isActive: form.isActive,
      };

      if (editingDiet) {
        await specialDietApi.update(editingDiet.id, data);
      } else {
        await specialDietApi.create(data);
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Nie udało się zapisać diety');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto overscroll-y-contain bg-white rounded-3xl shadow-2xl animate-in fade-in zoom-in-95 duration-300">
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm px-5 sm:px-8 pt-6 sm:pt-8 pb-4 rounded-t-3xl z-10">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1 text-brand-dark">Diety specjalistyczne</p>
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
              <WizardField label="Zwierzę" full>
                <select
                  value={form.petId}
                  onChange={(e) => setForm({ ...form, petId: e.target.value })}
                  className="w-full bg-transparent text-gray-900 font-medium focus:outline-none"
                >
                  <option value="">Wybierz zwierzę</option>
                  {pets.map((pet) => (
                    <option key={pet.id} value={pet.id}>
                      {pet.name}
                    </option>
                  ))}
                </select>
              </WizardField>

              <WizardField label="Nazwa diety" full>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="np. Dieta nerkowa"
                  className="w-full bg-transparent text-gray-900 font-medium placeholder:text-gray-400 placeholder:font-normal focus:outline-none"
                />
              </WizardField>

              <WizardField label="Typ diety" full>
                <select
                  value={form.dietType}
                  onChange={(e) => setForm({ ...form, dietType: e.target.value })}
                  className="w-full bg-transparent text-gray-900 font-medium focus:outline-none"
                >
                  {dietTypes.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </WizardField>

              {form.dietType === 'other' && (
                <WizardField label="Nazwa typu diety" full>
                  <input
                    type="text"
                    value={form.customDietType}
                    onChange={(e) => setForm({ ...form, customDietType: e.target.value })}
                    placeholder="np. Dla wrażliwego żołądka"
                    className="w-full bg-transparent text-gray-900 font-medium placeholder:text-gray-400 placeholder:font-normal focus:outline-none"
                  />
                </WizardField>
              )}

              <WizardField label="Wskazanie" optional full>
                <textarea
                  value={form.indication}
                  onChange={(e) => setForm({ ...form, indication: e.target.value })}
                  placeholder="np. Choroba nerek, alergia pokarmowa"
                  rows={2}
                  className="w-full bg-transparent text-gray-900 font-medium placeholder:text-gray-400 placeholder:font-normal focus:outline-none resize-none"
                />
              </WizardField>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div className="grid grid-cols-1 gap-4">
              <WizardField label="Dozwolone składniki / karmy" full>
                <textarea
                  value={form.allowedFoods}
                  onChange={(e) => setForm({ ...form, allowedFoods: e.target.value })}
                  placeholder="np. ryż, jagnięcina, dynia, Royal Canin Renal"
                  rows={3}
                  className="w-full bg-transparent text-gray-900 font-medium placeholder:text-gray-400 placeholder:font-normal focus:outline-none resize-none"
                />
              </WizardField>

              <WizardField label="Zakazane składniki / karmy" full>
                <textarea
                  value={form.forbiddenFoods}
                  onChange={(e) => setForm({ ...form, forbiddenFoods: e.target.value })}
                  placeholder="np. wołowina, pszenica, nabiał, karmy z fosforanem"
                  rows={3}
                  className="w-full bg-transparent text-gray-900 font-medium placeholder:text-gray-400 placeholder:font-normal focus:outline-none resize-none"
                />
              </WizardField>

              <WizardField label="Zalecenia" optional full>
                <textarea
                  value={form.recommendations}
                  onChange={(e) => setForm({ ...form, recommendations: e.target.value })}
                  placeholder="np. 3 małe posiłki dziennie, stała dostępność wody"
                  rows={3}
                  className="w-full bg-transparent text-gray-900 font-medium placeholder:text-gray-400 placeholder:font-normal focus:outline-none resize-none"
                />
              </WizardField>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <WizardField label="Data rozpoczęcia" optional>
                  <div className="relative flex items-center w-full">
                    <Calendar className="w-5 h-5 text-gray-400 mr-3" />
                    <input
                      type="date"
                      value={form.startDate}
                      onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                      className="w-full bg-transparent text-gray-900 font-medium focus:outline-none"
                    />
                  </div>
                </WizardField>

                <WizardField label="Data zakończenia" optional>
                  <div className="relative flex items-center w-full">
                    <Calendar className="w-5 h-5 text-gray-400 mr-3" />
                    <input
                      type="date"
                      value={form.endDate}
                      onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                      className="w-full bg-transparent text-gray-900 font-medium focus:outline-none"
                    />
                  </div>
                </WizardField>
              </div>

              <WizardField label="Status" full>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, isActive: !form.isActive })}
                  className="flex items-center gap-3 w-full"
                >
                  <span
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      form.isActive ? 'bg-brand-dark' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                        form.isActive ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </span>
                  <span className="text-sm font-medium text-gray-700">{form.isActive ? 'Aktywna' : 'Nieaktywna'}</span>
                </button>
              </WizardField>

              <div className="p-5 rounded-2xl bg-gray-50 border border-gray-100">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-4">Podsumowanie</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Zwierzę</p>
                    <p className="font-medium text-gray-900">{selectedPet?.name || '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Nazwa diety</p>
                    <p className="font-medium text-gray-900">{form.name || '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Typ</p>
                    <p className="font-medium text-gray-900">{selectedTypeLabel}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <p className="font-medium text-gray-900">{form.isActive ? 'Aktywna' : 'Nieaktywna'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Data rozpoczęcia</p>
                    <p className="font-medium text-gray-900">{formatDate(form.startDate)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Data zakończenia</p>
                    <p className="font-medium text-gray-900">{formatDate(form.endDate)}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-sm text-gray-500">Wskazanie</p>
                    <p className="font-medium text-gray-900">{form.indication || '—'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <div className="flex flex-col sm:flex-row gap-3">
              {editingDiet && onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(editingDiet.id)}
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
                {editingDiet ? 'Zapisz zmiany' : 'Dodaj dietę'}
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
