'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { recipeApi } from '@/lib/api';
import { checkToxicIngredients, toxicTargetLabel } from './toxicIngredients';
import {
  X,
  ChefHat,
  Loader2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Lock,
  Globe2,
  Clock,
  Users,
  Flame,
  ShieldAlert,
} from 'lucide-react';

const speciesOptions = [
  { value: 'dog', label: 'Pies' },
  { value: 'cat', label: 'Kot' },
  { value: 'both', label: 'Pies i kot' },
];

const categoryOptions = [
  { value: 'main_meal', label: 'Danie główne' },
  { value: 'treat', label: 'Przysmak' },
  { value: 'cake', label: 'Tort / urodzinowe' },
  { value: 'barf', label: 'BARF / surowa dieta' },
  { value: 'snack', label: 'Przekąska' },
  { value: 'other', label: 'Inne' },
];

const difficultyOptions = [
  { value: 'easy', label: 'Łatwy' },
  { value: 'medium', label: 'Średni' },
  { value: 'hard', label: 'Trudny' },
];

export interface Recipe {
  id: number;
  user_id: number;
  title: string;
  species: string;
  category: string;
  description: string | null;
  ingredients: string;
  instructions: string;
  prep_time_minutes: number | null;
  servings: number | null;
  calories_per_serving: number | null;
  difficulty: string;
  visibility: 'private' | 'public';
  likes_count: number;
  is_liked?: boolean;
  author_first_name?: string;
  author_last_name?: string;
  created_at: string;
}

type RecipeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  onDelete?: (id: number) => void;
  editingRecipe?: Recipe | null;
};

const emptyForm = {
  title: '',
  species: 'dog',
  category: 'main_meal',
  difficulty: 'easy',
  visibility: 'private' as 'private' | 'public',
  description: '',
  ingredients: '',
  instructions: '',
  prepTimeMinutes: '',
  servings: '',
  caloriesPerServing: '',
};

export default function RecipeModal({ isOpen, onClose, onSaved, onDelete, editingRecipe }: RecipeModalProps) {
  const [form, setForm] = useState(emptyForm);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    setError('');
    if (editingRecipe) {
      setForm({
        title: editingRecipe.title,
        species: editingRecipe.species,
        category: editingRecipe.category,
        difficulty: editingRecipe.difficulty,
        visibility: editingRecipe.visibility,
        description: editingRecipe.description || '',
        ingredients: editingRecipe.ingredients,
        instructions: editingRecipe.instructions,
        prepTimeMinutes: editingRecipe.prep_time_minutes?.toString() || '',
        servings: editingRecipe.servings?.toString() || '',
        caloriesPerServing: editingRecipe.calories_per_serving?.toString() || '',
      });
    } else {
      setForm(emptyForm);
    }
  }, [isOpen, editingRecipe]);

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

  const title = editingRecipe ? 'Edytuj przepis' : 'Dodaj przepis';
  const stepTitles = ['Podstawowe', 'Składniki', 'Szczegóły'];

  const speciesLabel = speciesOptions.find((s) => s.value === form.species)?.label || form.species;
  const categoryLabel = categoryOptions.find((c) => c.value === form.category)?.label || form.category;

  const stepValid = () => {
    if (step === 1) return !!form.title.trim();
    if (step === 2) return !!form.ingredients.trim() && !!form.instructions.trim();
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
      setStep(!form.title.trim() ? 1 : 2);
      return;
    }

    setSaving(true);
    setError('');

    try {
      const data = {
        title: form.title.trim(),
        species: form.species,
        category: form.category,
        difficulty: form.difficulty,
        visibility: form.visibility,
        description: form.description.trim() || null,
        ingredients: form.ingredients.trim(),
        instructions: form.instructions.trim(),
        prepTimeMinutes: form.prepTimeMinutes ? Number(form.prepTimeMinutes) : null,
        servings: form.servings ? Number(form.servings) : null,
        caloriesPerServing: form.caloriesPerServing ? Number(form.caloriesPerServing) : null,
      };

      if (editingRecipe) {
        await recipeApi.update(editingRecipe.id, data);
      } else {
        await recipeApi.create(data);
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Nie udało się zapisać przepisu');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto overscroll-y-contain bg-white rounded-3xl shadow-2xl animate-in fade-in zoom-in-95 duration-300">
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm px-5 sm:px-8 pt-6 sm:pt-8 pb-4 rounded-t-3xl z-10">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1 text-brand-dark">Przepisy</p>
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

          {step === 1 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <WizardField label="Nazwa przepisu" full>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="np. Domowe klopsiki dla psa"
                  className="w-full bg-transparent text-gray-900 font-medium placeholder:text-gray-400 placeholder:font-normal focus:outline-none"
                />
              </WizardField>

              <WizardField label="Dla kogo">
                <select
                  value={form.species}
                  onChange={(e) => setForm({ ...form, species: e.target.value })}
                  className="w-full bg-transparent text-gray-900 font-medium focus:outline-none"
                >
                  {speciesOptions.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </WizardField>

              <WizardField label="Kategoria">
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full bg-transparent text-gray-900 font-medium focus:outline-none"
                >
                  {categoryOptions.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </WizardField>

              <WizardField label="Poziom trudności">
                <select
                  value={form.difficulty}
                  onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                  className="w-full bg-transparent text-gray-900 font-medium focus:outline-none"
                >
                  {difficultyOptions.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </WizardField>

              <WizardField label="Widoczność">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, visibility: 'private' })}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium border transition-all ${
                      form.visibility === 'private'
                        ? 'bg-brand-dark text-white border-brand-dark'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <Lock className="w-4 h-4" /> Prywatny
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, visibility: 'public' })}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium border transition-all ${
                      form.visibility === 'public'
                        ? 'bg-brand-dark text-white border-brand-dark'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <Globe2 className="w-4 h-4" /> Publiczny
                  </button>
                </div>
              </WizardField>

              <WizardField label="Opis" optional full>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Krótki opis przepisu, dla kogo się nadaje..."
                  rows={2}
                  className="w-full bg-transparent text-gray-900 font-medium placeholder:text-gray-400 placeholder:font-normal focus:outline-none resize-none"
                />
              </WizardField>
            </div>
          )}

          {step === 2 && (
            <div className="grid grid-cols-1 gap-4">
              <WizardField label="Składniki" full>
                <textarea
                  value={form.ingredients}
                  onChange={(e) => setForm({ ...form, ingredients: e.target.value })}
                  placeholder={'np.\n300g kurczaka\n1 marchewka\n100g ryżu\n1 łyżka oleju rybnego'}
                  rows={5}
                  className="w-full bg-transparent text-gray-900 font-medium placeholder:text-gray-400 placeholder:font-normal focus:outline-none resize-none"
                />
                {(() => {
                  const toxic = checkToxicIngredients(form.ingredients, form.species);
                  return toxic.length > 0 ? (
                    <div className="mt-2 flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200">
                      <ShieldAlert className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-red-700">
                        <span className="font-semibold">Uwaga:</span> {toxic.join(', ')} — potencjalnie szkodliwe dla {toxicTargetLabel(form.species)}. Zweryfikuj przed zapisem.
                      </p>
                    </div>
                  ) : null;
                })()}
              </WizardField>

              <WizardField label="Sposób przygotowania" full>
                <textarea
                  value={form.instructions}
                  onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                  placeholder={'np.\n1. Ugotuj kurczaka w wodzie bez przypraw\n2. Zetrzyj marchewkę\n3. Wymieszaj wszystkie składniki i ostudź'}
                  rows={6}
                  className="w-full bg-transparent text-gray-900 font-medium placeholder:text-gray-400 placeholder:font-normal focus:outline-none resize-none"
                />
              </WizardField>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <WizardField label="Czas przygotowania">
                  <div className="relative flex items-center w-full">
                    <Clock className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                    <input
                      type="number"
                      min={0}
                      value={form.prepTimeMinutes}
                      onChange={(e) => setForm({ ...form, prepTimeMinutes: e.target.value })}
                      placeholder="min"
                      className="w-full bg-transparent text-gray-900 font-medium placeholder:text-gray-400 focus:outline-none"
                    />
                  </div>
                </WizardField>

                <WizardField label="Porcje">
                  <div className="relative flex items-center w-full">
                    <Users className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                    <input
                      type="number"
                      min={0}
                      value={form.servings}
                      onChange={(e) => setForm({ ...form, servings: e.target.value })}
                      placeholder="liczba"
                      className="w-full bg-transparent text-gray-900 font-medium placeholder:text-gray-400 focus:outline-none"
                    />
                  </div>
                </WizardField>

                <WizardField label="Kcal / porcję">
                  <div className="relative flex items-center w-full">
                    <Flame className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                    <input
                      type="number"
                      min={0}
                      value={form.caloriesPerServing}
                      onChange={(e) => setForm({ ...form, caloriesPerServing: e.target.value })}
                      placeholder="kcal"
                      className="w-full bg-transparent text-gray-900 font-medium placeholder:text-gray-400 focus:outline-none"
                    />
                  </div>
                </WizardField>
              </div>

              <div className="p-5 rounded-2xl bg-brand-mint/50 border border-brand-light/60">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-4">Podsumowanie</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Nazwa</p>
                    <p className="font-medium text-gray-900">{form.title || '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Dla kogo / kategoria</p>
                    <p className="font-medium text-gray-900">{speciesLabel} · {categoryLabel}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Widoczność</p>
                    <p className="font-medium text-gray-900 flex items-center gap-1.5">
                      {form.visibility === 'public' ? <Globe2 className="w-4 h-4 text-brand-dark" /> : <Lock className="w-4 h-4 text-gray-500" />}
                      {form.visibility === 'public' ? 'Publiczny (widoczny dla społeczności)' : 'Prywatny (widoczny tylko dla Ciebie)'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Trudność</p>
                    <p className="font-medium text-gray-900">{difficultyOptions.find((d) => d.value === form.difficulty)?.label}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-6">
            <div className="flex flex-col sm:flex-row gap-3">
              {editingRecipe && onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(editingRecipe.id)}
                  className="flex items-center gap-2 text-red-600 hover:bg-red-50 px-6 py-3.5 rounded-full font-medium transition-all"
                >
                  <Trash2 className="w-4 h-4" /> Usuń
                </button>
              )}
              {step > 1 && (
                <button
                  type="button"
                  onClick={prevStep}
                  className="px-8 py-3.5 rounded-full pv-btn-ghost flex items-center justify-center gap-2"
                >
                  <ChevronLeft className="w-4 h-4" /> Wstecz
                </button>
              )}
            </div>
            {step < 3 ? (
              <button
                type="button"
                onClick={nextStep}
                className="flex-1 bg-brand-dark hover:bg-brand text-white py-3.5 rounded-full font-medium shadow-md shadow-brand-dark/20 transition-all flex items-center justify-center gap-2"
              >
                Dalej <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving}
                className="flex-1 bg-brand-dark hover:bg-brand text-white py-3.5 rounded-full font-medium shadow-md shadow-brand-dark/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChefHat className="w-4 h-4" />}
                {editingRecipe ? 'Zapisz zmiany' : 'Dodaj przepis'}
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
      className={`p-5 pv-card shadow-sm focus-within:border-brand-dark/50 focus-within:ring-2 focus-within:ring-[#1B6B4A]/10 transition-all ${
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

export { speciesOptions, categoryOptions, difficultyOptions };
