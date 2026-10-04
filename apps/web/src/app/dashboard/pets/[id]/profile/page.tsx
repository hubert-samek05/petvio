'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Trash2, Pencil } from 'lucide-react';
import { petApi } from '@/lib/api';

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
      await petApi.update(petId, form);
      await load();
      setEditing(false);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Błąd zapisywania');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Czy na pewno chcesz usunąć to zwierzę?')) return;
    try {
      await petApi.delete(petId);
      router.push('/dashboard/pets');
    } catch {}
  };

  const formatDate = (d: string) =>
    d ? new Date(d).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

  const age = (birthDate: string): string => {
    if (!birthDate) return '—';
    const diff = Date.now() - new Date(birthDate).getTime();
    const years = Math.floor(diff / (365.25 * 24 * 3600 * 1000));
    const months = Math.floor((diff / (30.44 * 24 * 3600 * 1000)) % 12);
    if (years === 0) return `${months} mies.`;
    return `${years} ${years === 1 ? 'rok' : years < 5 ? 'lata' : 'lat'}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Ładowanie...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Link href="/dashboard/pets" className="font-medium text-brand-dark hover:text-brand-dark transition-colors">
          Moje zwierzęta
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-500">{pet?.name}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl lg:text-4xl font-semibold text-gray-900 mb-2">Profil pupila</h1>
          <p className="text-gray-500">Dane podstawowe i opcje edycji</p>
        </div>
        <div className="flex gap-3">
          <Link
            href={`/dashboard/health/${petId}`}
            className="inline-flex items-center justify-center border border-brand-dark/30 text-brand-dark px-6 py-3 rounded-full font-medium hover:bg-brand-dark/5 transition-all"
          >
            Książeczka zdrowia
          </Link>
          <button
            onClick={() => setEditing(!editing)}
            className="inline-flex items-center justify-center gap-2 bg-brand-dark hover:bg-brand-dark text-white px-6 py-3 rounded-full font-medium shadow-md shadow-brand-dark/20 transition-all"
          >
            <Pencil className="w-4 h-4" /> {editing ? 'Anuluj' : 'Edytuj'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main info card */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200/70 shadow-sm p-6 sm:p-8">
          {editing ? (
            <div className="space-y-4">
              {error && (
                <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium">
                  {error}
                </div>
              )}
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
                    <option value="dog">Pies</option>
                    <option value="cat">Kot</option>
                    <option value="other">Inne</option>
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
                className="w-full bg-brand-dark hover:bg-brand-dark text-white py-3.5 rounded-full font-medium shadow-md shadow-brand-dark/20 transition-all disabled:opacity-50"
              >
                {saving ? 'Zapisywanie...' : 'Zapisz zmiany'}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-5">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-brand-dark to-brand flex items-center justify-center text-white text-3xl font-semibold">
                  {pet?.name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900">{pet?.name}</h2>
                  <p className="text-gray-500">
                    {pet?.species === 'dog' ? 'Pies' : pet?.species === 'cat' ? 'Kot' : 'Inne'}
                    {pet?.breed ? ` · ${pet.breed}` : ''}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoCard label="Data urodzenia" value={pet?.birth_date ? formatDate(pet.birth_date) : '—'} />
                <InfoCard label="Wiek" value={pet?.birth_date ? age(pet.birth_date) : '—'} />
                <InfoCard label="Płeć" value={pet?.gender === 'male' ? 'Samiec' : pet?.gender === 'female' ? 'Samica' : '—'} />
                <InfoCard label="Waga" value={pet?.weight ? `${pet.weight} kg` : '—'} />
                <InfoCard label="Numer mikroczipu" value={pet?.microchip_number || '—'} />
                <InfoCard label="Dodano" value={pet?.created_at ? formatDate(pet.created_at) : '—'} />
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Akcje</h3>
            <div className="space-y-3">
              <Link
                href={`/dashboard/health/${petId}`}
                className="block w-full text-center border border-brand-dark/30 text-brand-dark px-5 py-3 rounded-xl font-medium hover:bg-brand-dark/5 transition-all"
              >
                Przejdź do książeczki zdrowia
              </Link>
              <button
                onClick={handleDelete}
                className="w-full flex items-center justify-center gap-2 border border-red-200 text-red-600 px-5 py-3 rounded-xl font-medium hover:bg-red-50 transition-all"
              >
                <Trash2 className="w-4 h-4" /> Usuń zwierzę
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FormField({ label, optional, full, children }: { label: string; optional?: boolean; full?: boolean; children: React.ReactNode }) {
  return (
    <div className={`p-5 rounded-2xl bg-gray-50 border border-gray-100 focus-within:border-brand-dark/40 focus-within:bg-white transition-all ${full ? 'sm:col-span-2' : ''}`}>
      <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
        {label}
        {optional && <span className="normal-case font-normal text-gray-400"> (opcjonalnie)</span>}
      </label>
      {children}
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-5 rounded-2xl bg-gray-50 border border-gray-100">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">{label}</p>
      <p className="font-medium text-gray-900">{value}</p>
    </div>
  );
}
