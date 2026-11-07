'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { petApi } from '@/lib/api';
import {
  PetFormData, EMPTY_PET_FORM, Field, inputCls,
  SpeciesPicker, GenderPicker, PhotoPicker, PetPreview,
  speciesInfo, genderLabel, todayDateInput,
} from '@/components/PetForm';

type PetAddModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
};

export default function PetAddModal({ isOpen, onClose, onSaved }: PetAddModalProps) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<PetFormData>(EMPTY_PET_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (patch: Partial<PetFormData>) => setForm((f) => ({ ...f, ...patch }));

  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    setError('');
    setForm(EMPTY_PET_FORM);
  }, [isOpen]);

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
    };
  }, [isOpen]);

  const stepTitles = ['Pupil', 'Szczegóły', 'Zdjęcie i podsumowanie'];

  const formatDate = (d: string) =>
    d ? new Date(d).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';

  const stepValid = () => {
    if (step === 1) return !!form.name.trim() && !!form.species;
    return true;
  };

  const nextStep = () => {
    if (!stepValid()) {
      setError('Podaj imię zwierzęcia, aby przejść dalej');
      return;
    }
    setError('');
    setStep((s) => Math.min(s + 1, 3));
  };

  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  const handleSave = async () => {
    if (!form.name.trim() || !form.species) {
      setError('Imię i gatunek są wymagane');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await petApi.create({
        name: form.name.trim(),
        species: form.species,
        breed: form.breed || null,
        birthDate: form.birthDate || null,
        gender: form.gender || null,
        weight: form.weight ? Number(form.weight) : null,
        microchipNumber: form.microchipNumber || null,
        photoUrl: form.photoUrl || null,
      });
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Błąd zapisywania zwierzęcia');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative bg-white rounded-[28px] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto overscroll-y-contain animate-scale-in">
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm px-5 sm:px-8 pt-6 sm:pt-8 pb-4 rounded-t-3xl z-10">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1 text-brand-dark">
                Moje zwierzęta
              </p>
              <h2 className="text-2xl font-semibold text-gray-900">Dodaj zwierzę</h2>
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
            <div className="mb-5 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium animate-slide-down">
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

          {/* Krok 1: imię + gatunek */}
          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <Field label="Imię zwierzęcia" full>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => set({ name: e.target.value })}
                  placeholder="np. Burek"
                  className={inputCls}
                  autoFocus
                />
              </Field>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2.5">Gatunek</p>
                <SpeciesPicker value={form.species} onChange={(v) => set({ species: v })} />
              </div>
            </div>
          )}

          {/* Krok 2: szczegóły */}
          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Rasa" optional>
                  <input
                    type="text"
                    value={form.breed}
                    onChange={(e) => set({ breed: e.target.value })}
                    placeholder="np. Golden Retriever"
                    className={inputCls}
                  />
                </Field>
                <Field label="Data urodzenia" optional>
                  <input
                    type="date"
                    value={form.birthDate}
                    onChange={(e) => set({ birthDate: e.target.value })}
                    max={todayDateInput()}
                    className={inputCls}
                  />
                </Field>
                <Field label="Waga" optional>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={form.weight}
                      onChange={(e) => set({ weight: e.target.value })}
                      placeholder="np. 12.5"
                      className={inputCls}
                    />
                    <span className="text-sm font-semibold text-gray-400 flex-shrink-0">kg</span>
                  </div>
                </Field>
                <Field label="Numer mikroczipu" optional>
                  <input
                    type="text"
                    value={form.microchipNumber}
                    onChange={(e) => set({ microchipNumber: e.target.value })}
                    placeholder="np. 123456789012345"
                    className={inputCls}
                  />
                </Field>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2.5">Płeć</p>
                <GenderPicker value={form.gender} onChange={(v) => set({ gender: v })} />
              </div>
            </div>
          )}

          {/* Krok 3: zdjęcie + podsumowanie */}
          {step === 3 && (
            <div className="space-y-5 animate-fade-in">
              <Field label="Zdjęcie" optional full>
                <PhotoPicker
                  photoUrl={form.photoUrl}
                  species={form.species}
                  onChange={(b64) => set({ photoUrl: b64 })}
                  onError={setError}
                />
              </Field>

              <div className="p-5 rounded-2xl bg-brand-mint/50 border border-brand-light/60">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-4">Podsumowanie</p>
                <PetPreview form={form} />
                <div className="grid grid-cols-2 gap-4 mt-5">
                  <div>
                    <p className="text-xs text-gray-500">Gatunek</p>
                    <p className="font-medium text-gray-900 text-sm">{speciesInfo(form.species).label}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Data urodzenia</p>
                    <p className="font-medium text-gray-900 text-sm">{formatDate(form.birthDate)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Płeć</p>
                    <p className="font-medium text-gray-900 text-sm">{genderLabel(form.gender)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Mikroczip</p>
                    <p className="font-medium text-gray-900 text-sm">{form.microchipNumber || '—'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            {step > 1 && (
              <button
                onClick={prevStep}
                className="px-8 py-3.5 rounded-full pv-btn-ghost flex items-center justify-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" /> Wstecz
              </button>
            )}
            {step < 3 ? (
              <button
                onClick={nextStep}
                className="flex-1 bg-brand-dark hover:bg-brand text-white py-3.5 rounded-full font-medium shadow-md shadow-brand-dark/20 transition-all flex items-center justify-center gap-2"
              >
                Dalej <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-brand-dark hover:bg-brand text-white py-3.5 rounded-full font-medium shadow-md shadow-brand-dark/20 transition-all disabled:opacity-50"
              >
                {saving ? 'Zapisywanie…' : 'Dodaj zwierzę'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
