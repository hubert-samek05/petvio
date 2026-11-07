'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, PawPrint, Hash, Scale, Dna } from 'lucide-react';
import { petApi } from '@/lib/api';
import {
  PetFormData, EMPTY_PET_FORM, Field, inputCls,
  SpeciesPicker, GenderPicker, PhotoPicker, PetPreview, todayDateInput,
} from '@/components/PetForm';

export default function NewPetPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<PetFormData>(EMPTY_PET_FORM);

  const set = (patch: Partial<PetFormData>) => setForm((f) => ({ ...f, ...patch }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Podaj imię zwierzęcia');
      return;
    }
    setError('');
    setLoading(true);

    try {
      await petApi.create({
        name: form.name.trim(),
        species: form.species,
        breed: form.breed || null,
        birthDate: form.birthDate || null,
        gender: form.gender || null,
        weight: form.weight ? parseFloat(form.weight) : null,
        microchipNumber: form.microchipNumber || null,
        photoUrl: form.photoUrl || null,
      });
      router.push('/dashboard/pets');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Wystąpił błąd podczas dodawania zwierzęcia');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-7">
      <Link
        href="/dashboard/pets"
        className="inline-flex items-center gap-2 text-sm font-medium text-brand-dark hover:text-brand transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Powrót do listy
      </Link>

      {/* Nagłówek */}
      <div className="flex items-center gap-4 animate-slide-up">
        <div
          className="w-14 h-14 rounded-3xl flex items-center justify-center text-2xl shadow-lg animate-float"
          style={{ background: 'linear-gradient(135deg,#0F3D2E,#1B6B4A)' }}
        >
          <PawPrint className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-normal text-gray-900">Nowy pupil</h1>
          <p className="text-gray-500 text-sm">Dodaj zwierzę, aby śledzić jego zdrowie, spacery i karmienie</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-medium animate-slide-down">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Sekcja 1: Kim jest twój pupil */}
        <div className="pv-card p-5 sm:p-7 animate-slide-up stagger-1">
          <p className="pv-section-title mb-5">Kim jest twój pupil?</p>
          <div className="flex flex-col sm:flex-row gap-6">
            <PhotoPicker
              photoUrl={form.photoUrl}
              species={form.species}
              onChange={(b64) => set({ photoUrl: b64 })}
              onError={setError}
            />
            <div className="flex-1 space-y-4">
              <Field label="Imię zwierzęcia" full>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => set({ name: e.target.value })}
                  required
                  className={inputCls}
                  placeholder="np. Burek"
                />
              </Field>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2.5">Gatunek</p>
                <SpeciesPicker value={form.species} onChange={(v) => set({ species: v })} />
              </div>
            </div>
          </div>
        </div>

        {/* Sekcja 2: Szczegóły */}
        <div className="pv-card p-5 sm:p-7 animate-slide-up stagger-2">
          <p className="pv-section-title mb-5">Szczegóły</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Rasa" optional>
              <div className="flex items-center gap-3">
                <Dna className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <input
                  type="text"
                  value={form.breed}
                  onChange={(e) => set({ breed: e.target.value })}
                  className={inputCls}
                  placeholder="np. Golden Retriever"
                />
              </div>
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
                <Scale className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={form.weight}
                  onChange={(e) => set({ weight: e.target.value })}
                  className={inputCls}
                  placeholder="np. 12.5"
                />
                <span className="text-sm font-semibold text-gray-400 flex-shrink-0">kg</span>
              </div>
            </Field>

            <Field label="Numer mikroczipu" optional>
              <div className="flex items-center gap-3">
                <Hash className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <input
                  type="text"
                  value={form.microchipNumber}
                  onChange={(e) => set({ microchipNumber: e.target.value })}
                  className={inputCls}
                  placeholder="np. 123456789012345"
                />
              </div>
            </Field>
          </div>

          <div className="mt-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2.5">Płeć</p>
            <GenderPicker value={form.gender} onChange={(v) => set({ gender: v })} />
          </div>
        </div>

        {/* Sekcja 3: Podgląd + akcje */}
        <div className="pv-card p-5 sm:p-7 animate-slide-up stagger-3">
          <p className="pv-section-title mb-4">Tak będzie wyglądać profil</p>
          <PetPreview form={form} />
          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <button type="submit" disabled={loading} className="pv-btn-primary flex-1 py-4 disabled:opacity-50">
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Dodawanie…
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" /> Dodaj zwierzę
                </>
              )}
            </button>
            <Link href="/dashboard/pets" className="pv-btn-ghost px-8 py-4">
              Anuluj
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}
