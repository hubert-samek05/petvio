'use client';

import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight, Camera, PawPrint } from 'lucide-react';
import { petApi } from '@/lib/api';

type PetAddModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
};

export default function PetAddModal({ isOpen, onClose, onSaved }: PetAddModalProps) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: '',
    species: 'dog',
    breed: '',
    birthDate: '',
    gender: '',
    weight: '',
    microchipNumber: '',
    photoUrl: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    setError('');
    setForm({
      name: '',
      species: 'dog',
      breed: '',
      birthDate: '',
      gender: '',
      weight: '',
      microchipNumber: '',
      photoUrl: '',
    });
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

  const stepTitles = ['Podstawowe dane', 'Szczegóły', 'Zdjęcie i podsumowanie'];

  const formatDate = (d: string) =>
    d ? new Date(d).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';

  const speciesLabel = (s: string) =>
    s === 'dog' ? 'Pies' : s === 'cat' ? 'Kot' : 'Inne';

  const genderLabel = (g: string) =>
    g === 'male' ? 'Samiec' : g === 'female' ? 'Samica' : '—';

  const stepValid = () => {
    if (step === 1) return !!form.name.trim() && !!form.species;
    if (step === 2) return true;
    return true;
  };

  const nextStep = () => {
    if (!stepValid()) {
      setError('Uzupełnij wymagane pola, aby przejść dalej');
      return;
    }
    setError('');
    setStep((s) => Math.min(s + 1, 3));
  };

  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('Zdjęcie nie może być większe niż 5 MB');
      return;
    }
    const src = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const max = 512;
      const ratio = Math.min(max / img.width, max / img.height, 1);
      const w = Math.round(img.width * ratio);
      const h = Math.round(img.height * ratio);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.drawImage(img, 0, 0, w, h);
      const base64 = canvas.toDataURL('image/jpeg', 0.85);
      setForm((f) => ({ ...f, photoUrl: base64 }));
      setError('');
      URL.revokeObjectURL(src);
    };
    img.onerror = () => {
      URL.revokeObjectURL(src);
      setError('Nie udało się wczytać zdjęcia');
    };
    img.src = src;
  };

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
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto overscroll-y-contain">
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
              <WizardField label="Imię">
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="np. Burek"
                  className="w-full bg-transparent text-gray-900 font-medium placeholder:text-gray-400 placeholder:font-normal focus:outline-none"
                />
              </WizardField>
              <WizardField label="Gatunek">
                <select
                  value={form.species}
                  onChange={(e) => setForm({ ...form, species: e.target.value })}
                  className="w-full bg-transparent text-gray-900 font-medium focus:outline-none"
                >
                  <option value="dog">Pies</option>
                  <option value="cat">Kot</option>
                  <option value="other">Inne</option>
                </select>
              </WizardField>
              <WizardField label="Rasa" optional full>
                <input
                  type="text"
                  value={form.breed}
                  onChange={(e) => setForm({ ...form, breed: e.target.value })}
                  placeholder="np. Golden Retriever"
                  className="w-full bg-transparent text-gray-900 font-medium placeholder:text-gray-400 placeholder:font-normal focus:outline-none"
                />
              </WizardField>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <WizardField label="Data urodzenia" optional>
                <input
                  type="date"
                  value={form.birthDate}
                  onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
                  className="w-full bg-transparent text-gray-900 font-medium focus:outline-none"
                />
              </WizardField>
              <WizardField label="Płeć" optional>
                <select
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value })}
                  className="w-full bg-transparent text-gray-900 font-medium focus:outline-none"
                >
                  <option value="">Wybierz</option>
                  <option value="male">Samiec</option>
                  <option value="female">Samica</option>
                </select>
              </WizardField>
              <WizardField label="Waga (kg)" optional>
                <input
                  type="number"
                  step="0.1"
                  value={form.weight}
                  onChange={(e) => setForm({ ...form, weight: e.target.value })}
                  placeholder="np. 12.5"
                  className="w-full bg-transparent text-gray-900 font-medium placeholder:text-gray-400 placeholder:font-normal focus:outline-none"
                />
              </WizardField>
              <WizardField label="Numer mikroczipu" optional>
                <input
                  type="text"
                  value={form.microchipNumber}
                  onChange={(e) => setForm({ ...form, microchipNumber: e.target.value })}
                  placeholder="np. 123456789012345"
                  className="w-full bg-transparent text-gray-900 font-medium placeholder:text-gray-400 placeholder:font-normal focus:outline-none"
                />
              </WizardField>
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div className="space-y-4">
              <WizardField label="Zdjęcie" optional full>
                <div className="flex flex-col items-center gap-4">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="group relative w-28 h-28 rounded-full overflow-hidden bg-gradient-to-br from-brand-dark to-brand ring-4 ring-gray-100"
                  >
                    {form.photoUrl ? (
                      <img src={form.photoUrl} alt="Podgląd" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white">
                        <PawPrint className="w-10 h-10" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera className="w-7 h-7 text-white" />
                    </div>
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <p className="text-sm text-gray-500">Kliknij okrąg, aby dodać zdjęcie</p>
                </div>
              </WizardField>

              <div className="p-5 rounded-2xl bg-gray-50 border border-gray-100">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-4">Podsumowanie</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Imię</p>
                    <p className="font-medium text-gray-900">{form.name || '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Gatunek</p>
                    <p className="font-medium text-gray-900">{speciesLabel(form.species)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Rasa</p>
                    <p className="font-medium text-gray-900">{form.breed || '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Data urodzenia</p>
                    <p className="font-medium text-gray-900">{formatDate(form.birthDate)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Płeć</p>
                    <p className="font-medium text-gray-900">{genderLabel(form.gender)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Waga</p>
                    <p className="font-medium text-gray-900">{form.weight ? `${form.weight} kg` : '—'}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-sm text-gray-500">Numer mikroczipu</p>
                    <p className="font-medium text-gray-900">{form.microchipNumber || '—'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            {step > 1 && (
              <button
                onClick={prevStep}
                className="px-8 py-3.5 rounded-full border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" /> Wstecz
              </button>
            )}
            {step < 3 ? (
              <button
                onClick={nextStep}
                className="flex-1 bg-brand-dark hover:bg-brand-dark text-white py-3.5 rounded-full font-medium shadow-md shadow-brand-dark/20 transition-all flex items-center justify-center gap-2"
              >
                Dalej <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-brand-dark hover:bg-brand-dark text-white py-3.5 rounded-full font-medium shadow-md shadow-brand-dark/20 transition-all disabled:opacity-50"
              >
                {saving ? 'Zapisywanie...' : 'Dodaj zwierzę'}
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
