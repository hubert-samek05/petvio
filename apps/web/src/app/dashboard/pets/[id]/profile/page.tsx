'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Trash2, Pencil, Heart, ArrowLeft, PawPrint, Cake, CalendarClock,
  Weight, Hash, CalendarPlus, Footprints, Utensils, CalendarDays, CheckCircle2,
} from 'lucide-react';
import { petApi } from '@/lib/api';
import Tile from '@/components/ui/Tile';
import ConfirmModal from '@/components/ui/ConfirmModal';
import {
  SPECIES, speciesInfo, speciesLabel, ageLabel, todayDateInput, PhotoPicker,
} from '@/components/PetForm';

export default function PetProfilePage() {
  const params = useParams();
  const router = useRouter();
  const petId = Number(params.id);

  const [pet, setPet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({});
  const [error, setError] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await petApi.getById(petId);
      const p = res.pet || res;
      setPet(p);
      setForm({
        name: p.name || '',
        species: p.species || '',
        breed: p.breed || '',
        birthDate: p.birth_date ? p.birth_date.slice(0, 10) : '',
        gender: p.gender || '',
        weight: p.weight || '',
        microchipNumber: p.microchip_number || '',
        photoUrl: p.photo_url || '',
      });
    } catch {
      router.push('/dashboard/pets');
    } finally {
      setLoading(false);
    }
  }, [petId, router]);

  useEffect(() => {
    if (petId) load();
  }, [petId, load]);

  const handleSubmit = async () => {
    if (!form.name || !form.species) {
      setError('Imię i gatunek są wymagane');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = { ...form };
      if (payload.photoUrl === (pet?.photo_url || '')) delete payload.photoUrl;
      await petApi.update(petId, payload);
      await load();
      setEditing(false);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Błąd zapisywania');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await petApi.delete(petId);
      router.push('/dashboard/pets');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Nie udało się usunąć zwierzęcia');
      setConfirmingDelete(false);
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (d: string) =>
    d ? new Date(d).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

  if (loading) {
    return (
      <div className="space-y-7">
        <div className="pv-skeleton h-6 w-56" />
        <div className="pv-skeleton h-64 rounded-[28px]" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 pv-skeleton h-80 rounded-3xl" />
          <div className="pv-skeleton h-80 rounded-3xl" />
        </div>
      </div>
    );
  }

  const completenessFields: { key: string; label: string; filled: boolean }[] = [
    { key: 'name', label: 'imię', filled: !!pet?.name },
    { key: 'species', label: 'gatunek', filled: !!pet?.species },
    { key: 'breed', label: 'rasa', filled: !!pet?.breed },
    { key: 'birth_date', label: 'data urodzenia', filled: !!pet?.birth_date },
    { key: 'gender', label: 'płeć', filled: !!pet?.gender },
    { key: 'weight', label: 'waga', filled: !!pet?.weight },
    { key: 'microchip', label: 'mikroczip', filled: !!pet?.microchip_number },
    { key: 'photo', label: 'zdjęcie', filled: !!pet?.photo_url },
  ];
  const filledCount = completenessFields.filter((f) => f.filled).length;
  const completenessPct = Math.round((filledCount / completenessFields.length) * 100);
  const missing = completenessFields.filter((f) => !f.filled).map((f) => f.label);

  const infoRows = [
    { icon: Cake, label: 'Data urodzenia', value: pet?.birth_date ? formatDate(pet.birth_date) : '—' },
    { icon: CalendarClock, label: 'Wiek', value: (pet?.birth_date && ageLabel(pet.birth_date)) || '—' },
    { icon: PawPrint, label: 'Płeć', value: pet?.gender === 'male' ? 'Samiec' : pet?.gender === 'female' ? 'Samica' : '—' },
    { icon: Weight, label: 'Waga', value: pet?.weight ? `${parseFloat(pet.weight)} kg` : '—' },
    { icon: Hash, label: 'Numer mikroczipu', value: pet?.microchip_number || '—' },
    { icon: CalendarPlus, label: 'W paczce od', value: pet?.created_at ? formatDate(pet.created_at) : '—' },
  ];

  return (
    <div className="space-y-7">
      <Link
        href="/dashboard/pets"
        className="inline-flex items-center gap-2 text-sm font-medium text-brand-dark hover:text-brand transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Moje zwierzęta
      </Link>

      {/* ====== HERO — cover + awatar na banerze ====== */}
      <div className="pv-card overflow-hidden animate-slide-down">
        <div
          className="relative h-32 sm:h-40"
          style={{
            background: 'linear-gradient(135deg, #0F3D2E 0%, #1B6B4A 55%, #2E8B62 100%)',
            backgroundSize: '200% 200%',
            animation: 'gradient-shift 12s ease infinite',
          }}
        >
          <PawPrint className="absolute right-6 -top-4 w-24 h-24 text-white/[0.08] rotate-12 animate-float" aria-hidden />
          <PawPrint className="absolute right-32 bottom-2 w-16 h-16 text-white/[0.06] -rotate-12" aria-hidden />
          <PawPrint className="absolute left-8 top-3 w-14 h-14 text-white/[0.05] rotate-45" aria-hidden />
          <div className="absolute -left-8 -bottom-10 w-36 h-36 rounded-full bg-white/[0.05]" aria-hidden />

          {/* Awatar — na krawędzi banera */}
          <div className="absolute left-1/2 -translate-x-1/2 -bottom-12 sm:-bottom-14">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-[26px] bg-gradient-to-br from-brand to-brand-dark flex items-center justify-center text-5xl shadow-xl ring-4 ring-white overflow-hidden">
              {pet?.photo_url ? (
                <img src={pet.photo_url} alt={pet.name} className="w-full h-full object-cover" />
              ) : (
                speciesInfo(pet?.species).emoji
              )}
            </div>
          </div>
        </div>

        <div className="px-5 sm:px-7 pt-16 sm:pt-[72px] pb-6 text-center">
          <h1 className="font-serif text-[26px] sm:text-3xl font-normal text-gray-900 break-words leading-tight">
            {pet?.name}
          </h1>
          <div className="flex flex-wrap justify-center gap-1.5 mt-2.5">
            <span className="px-3 py-1 rounded-full bg-brand-mint text-brand-dark text-xs font-bold">
              {speciesInfo(pet?.species).emoji} {speciesLabel(pet?.species)}
            </span>
            {pet?.breed && (
              <span className="px-3 py-1 rounded-full bg-white border border-gray-200 text-gray-600 text-xs font-semibold">
                {pet.breed}
              </span>
            )}
            {pet?.gender && (
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  pet.gender === 'male' ? 'bg-brand-light text-brand-dark' : 'bg-brand-peach text-[#B4701F]'
                }`}
              >
                {pet.gender === 'male' ? '♂ Samiec' : '♀ Samica'}
              </span>
            )}
            {pet?.birth_date && (
              <span className="px-3 py-1 rounded-full bg-white border border-gray-200 text-gray-600 text-xs font-semibold inline-flex items-center gap-1">
                <Cake className="w-3 h-3" /> {ageLabel(pet.birth_date) || ''}
              </span>
            )}
            {pet?.weight && (
              <span className="px-3 py-1 rounded-full bg-white border border-gray-200 text-gray-600 text-xs font-semibold inline-flex items-center gap-1">
                <Weight className="w-3 h-3" /> {parseFloat(pet.weight)} kg
              </span>
            )}
          </div>
          <div className="flex flex-wrap justify-center gap-2.5 mt-5">
            <Link href={`/dashboard/health/${petId}`} className="pv-btn-ghost px-5 py-3 text-sm">
              <Heart className="w-4 h-4" /> Książeczka
            </Link>
            <button onClick={() => setEditing(!editing)} className="pv-btn-primary px-5 py-3 text-sm">
              <Pencil className="w-4 h-4" /> {editing ? 'Anuluj' : 'Edytuj'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {error && !editing && (
            <div className="pv-card p-4 text-red-600 text-sm font-medium animate-slide-down">
              {error}
            </div>
          )}
          {editing ? (
            /* ====== FORMULARZ EDYCJI ====== */
            <div className="pv-card p-6 sm:p-8 space-y-4 animate-fade-in">
              {error && (
                <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium">
                  {error}
                </div>
              )}
              <PhotoPicker
                photoUrl={form.photoUrl || ''}
                species={form.species || 'other'}
                onChange={(b64) => setForm({ ...form, photoUrl: b64 })}
                onError={setError}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Imię">
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full bg-transparent text-gray-900 font-medium focus:outline-none"
                  />
                </FormField>
                <FormField label="Gatunek">
                  <select
                    value={form.species}
                    onChange={(e) => setForm({ ...form, species: e.target.value })}
                    className="w-full bg-transparent text-gray-900 font-medium focus:outline-none"
                  >
                    <option value="">Wybierz</option>
                    {SPECIES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.emoji} {s.label}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Rasa" optional>
                  <input
                    type="text"
                    value={form.breed}
                    onChange={(e) => setForm({ ...form, breed: e.target.value })}
                    className="w-full bg-transparent text-gray-900 font-medium focus:outline-none"
                  />
                </FormField>
                <FormField label="Data urodzenia" optional>
                  <input
                    type="date"
                    value={form.birthDate}
                    max={todayDateInput()}
                    onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
                    className="w-full bg-transparent text-gray-900 font-medium focus:outline-none"
                  />
                </FormField>
                <FormField label="Płeć" optional>
                  <select
                    value={form.gender}
                    onChange={(e) => setForm({ ...form, gender: e.target.value })}
                    className="w-full bg-transparent text-gray-900 font-medium focus:outline-none"
                  >
                    <option value="">Wybierz</option>
                    <option value="male">Samiec</option>
                    <option value="female">Samica</option>
                  </select>
                </FormField>
                <FormField label="Waga (kg)" optional>
                  <input
                    type="number"
                    step="0.1"
                    value={form.weight}
                    onChange={(e) => setForm({ ...form, weight: e.target.value })}
                    className="w-full bg-transparent text-gray-900 font-medium focus:outline-none"
                  />
                </FormField>
                <FormField label="Numer mikroczipu" optional full>
                  <input
                    type="text"
                    value={form.microchipNumber}
                    onChange={(e) => setForm({ ...form, microchipNumber: e.target.value })}
                    className="w-full bg-transparent text-gray-900 font-medium focus:outline-none"
                  />
                </FormField>
              </div>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="pv-btn-primary w-full py-4 disabled:opacity-50"
              >
                {saving ? 'Zapisywanie...' : 'Zapisz zmiany'}
              </button>
            </div>
          ) : (
            <>
              {/* ====== DANE PODSTAWOWE ====== */}
              <div className="pv-card overflow-hidden animate-slide-up stagger-1">
                <div className="px-6 py-5 border-b border-gray-100/80">
                  <h3 className="pv-section-title">Dane podstawowe</h3>
                </div>
                <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {infoRows.map((row) => (
                    <div
                      key={row.label}
                      className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-brand-mint/50 border border-brand-light/50 hover:bg-brand-mint transition-colors"
                    >
                      <span className="w-10 h-10 rounded-xl bg-white text-brand-dark flex items-center justify-center flex-shrink-0 shadow-sm">
                        <row.icon className="w-4 h-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">{row.label}</p>
                        <p className="font-semibold text-gray-900 text-sm mt-0.5 break-words">{row.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ====== SZYBKIE SKRÓTY ====== */}
              <section className="animate-slide-up stagger-2">
                <h3 className="pv-section-title mb-3 px-1">Szybkie skróty</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Tile href={`/dashboard/health/${petId}`} label="Zdrowie" icon={Heart} iconClass="bg-brand-dark text-white" stagger="stagger-1" />
                  <Tile href="/dashboard/walk-tracker" label="Spacer" icon={Footprints} iconClass="bg-brand text-white" stagger="stagger-2" />
                  <Tile href="/dashboard/feeding-log" label="Karmienie" icon={Utensils} iconClass="bg-brand-peach text-brand-dark" stagger="stagger-3" />
                  <Tile href="/dashboard/calendar" label="Kalendarz" icon={CalendarDays} iconClass="bg-brand-light text-brand-dark" stagger="stagger-4" />
                </div>
              </section>
            </>
          )}
        </div>

        {/* ====== PRAWY PANEL ====== */}
        <div className="space-y-5">
          {/* Kompletność profilu */}
          <div className="pv-card p-6 animate-slide-up stagger-2">
            <div className="flex items-center justify-between mb-1">
              <h3 className="pv-section-title">Kompletność profilu</h3>
              {completenessPct === 100 && <CheckCircle2 className="w-5 h-5 text-brand" />}
            </div>
            <p className="font-serif text-4xl text-brand-dark tabular-nums mt-2">{completenessPct}%</p>
            <div className="pv-progress mt-3">
              <div className="pv-progress-fill" style={{ width: `${completenessPct}%` }} />
            </div>
            <p className="text-xs text-gray-500 mt-3 leading-relaxed">
              {completenessPct === 100
                ? 'Profil kompletny — świetna robota!'
                : `Brakuje: ${missing.join(', ')}.`}
            </p>
          </div>

          {/* CTA — książeczka */}
          <Link
            href={`/dashboard/health/${petId}`}
            className="pv-card-hover !bg-brand-mint !border-brand-light p-5 flex items-center gap-4 animate-slide-up stagger-3 group"
          >
            <span className="w-12 h-12 rounded-2xl bg-white text-brand-dark flex items-center justify-center flex-shrink-0 shadow-sm">
              <Heart className="w-5 h-5" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 group-hover:text-brand-dark transition-colors">Książeczka zdrowia</p>
              <p className="text-xs text-gray-500 mt-0.5">Szczepienia, leki i wizyty</p>
            </div>
          </Link>

          {/* Strefa ryzyka */}
          <div className="pv-card p-5 animate-slide-up stagger-4">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-3">Strefa ryzyka</p>
            <button
              onClick={() => setConfirmingDelete(true)}
              className="pv-btn w-full px-5 py-3 border border-red-200 text-red-500 text-sm hover:bg-red-50 hover:border-red-300"
            >
              <Trash2 className="w-4 h-4" /> Usuń {pet?.name ? `„${pet.name}"` : 'zwierzę'}
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmingDelete}
        title={`Usunąć ${pet?.name || 'zwierzę'}?`}
        description="Ta operacja jest nieodwracalna."
        details={[
          'wpisy zdrowia i kalendarz zdrowia',
          'spacery, diety i karmienia',
          'aktywne zgłoszenie zaginięcia (jeśli istnieje)',
        ]}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
    </div>
  );
}

function FormField({ label, optional, full, children }: { label: string; optional?: boolean; full?: boolean; children: React.ReactNode }) {
  return (
    <div className={`p-5 pv-card shadow-sm focus-within:border-brand-dark/50 focus-within:ring-2 focus-within:ring-[#1B6B4A]/10 transition-all ${full ? 'sm:col-span-2' : ''}`}>
      <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
        {label}
        {optional && <span className="normal-case font-normal text-gray-400"> (opcjonalnie)</span>}
      </label>
      {children}
    </div>
  );
}
