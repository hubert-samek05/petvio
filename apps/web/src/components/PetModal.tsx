'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { petApi } from '@/lib/api';
import {
  X,
  Pencil,
  Camera,
  PawPrint,
  Tag,
  Calendar,
  Cake,
  Weight,
  Hash,
  Trash2,
} from 'lucide-react';

type PetModalProps = {
  petId: number;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
};

export default function PetModal({ petId, isOpen, onClose, onSaved }: PetModalProps) {
  const [pet, setPet] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchPet = useCallback(async () => {
    setLoading(true);
    setError('');
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
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Błąd pobierania danych');
    } finally {
      setLoading(false);
    }
  }, [petId]);

  useEffect(() => {
    if (isOpen) fetchPet();
  }, [isOpen, fetchPet]);

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
      setForm((f: any) => ({ ...f, photoUrl: base64 }));
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
    if (!form.name || !form.species) {
      setError('Imię i gatunek są wymagane');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await petApi.update(petId, form);
      await fetchPet();
      setEditing(false);
      onSaved();
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
      onSaved();
      onClose();
    } catch {}
  };

  const speciesLabel = (s: string) =>
    s === 'dog' ? 'Pies' : s === 'cat' ? 'Kot' : 'Inne';

  const formatDate = (d: string) =>
    d ? new Date(d).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';

  const age = (birthDate: string): string => {
    if (!birthDate) return '—';
    const diff = Date.now() - new Date(birthDate).getTime();
    const years = Math.floor(diff / (365.25 * 24 * 3600 * 1000));
    const months = Math.floor((diff / (30.44 * 24 * 3600 * 1000)) % 12);
    if (years === 0) return `${months} mies.`;
    return `${years} ${years === 1 ? 'rok' : years < 5 ? 'lata' : 'lat'}`;
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-300">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto overscroll-y-contain bg-white rounded-3xl shadow-2xl animate-in fade-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="relative p-6 sm:p-8 bg-gradient-to-br from-brand-dark via-brand to-emerald-800 text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/15 hover:bg-white/25 text-white transition-colors"
            aria-label="Zamknij"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-5">
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-white/15 ring-4 ring-white/20 flex-shrink-0">
              {form.photoUrl || pet?.photo_url ? (
                <img
                  src={form.photoUrl || pet?.photo_url}
                  alt={pet?.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-semibold">
                  {pet?.name?.[0]?.toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <h2 className="text-2xl sm:text-3xl font-semibold truncate">{pet?.name}</h2>
              <p className="text-white/80 flex items-center gap-2 mt-1">
                <PawPrint className="w-4 h-4" />
                <span>
                  {speciesLabel(pet?.species)}
                  {pet?.breed ? ` · ${pet.breed}` : ''}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 sm:p-8">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500">Ładowanie...</div>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-5 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium">
                  {error}
                </div>
              )}

              {editing ? (
                <div className="space-y-5">
                  <div className="flex justify-center">
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="group relative w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-brand-dark to-brand ring-4 ring-gray-100"
                    >
                      {form.photoUrl || pet?.photo_url ? (
                        <img
                          src={form.photoUrl || pet?.photo_url}
                          alt="Podgląd"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl font-semibold text-white">
                          {pet?.name?.[0]?.toUpperCase()}
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
                  </div>

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
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InfoCard
                    icon={<PawPrint className="w-5 h-5 text-brand-dark" />}
                    label="Gatunek"
                    value={speciesLabel(pet?.species)}
                  />
                  <InfoCard
                    icon={<Tag className="w-5 h-5 text-brand-dark" />}
                    label="Rasa"
                    value={pet?.breed || '—'}
                  />
                  <InfoCard
                    icon={<Calendar className="w-5 h-5 text-brand-dark" />}
                    label="Data urodzenia"
                    value={pet?.birth_date ? formatDate(pet.birth_date) : '—'}
                  />
                  <InfoCard
                    icon={<Cake className="w-5 h-5 text-brand-dark" />}
                    label="Wiek"
                    value={pet?.birth_date ? age(pet.birth_date) : '—'}
                  />
                  <InfoCard
                    icon={<PawPrint className="w-5 h-5 text-brand-dark" />}
                    label="Płeć"
                    value={pet?.gender === 'male' ? 'Samiec' : pet?.gender === 'female' ? 'Samica' : '—'}
                  />
                  <InfoCard
                    icon={<Weight className="w-5 h-5 text-brand-dark" />}
                    label="Waga"
                    value={pet?.weight ? `${pet.weight} kg` : '—'}
                  />
                  <InfoCard
                    icon={<Hash className="w-5 h-5 text-brand-dark" />}
                    label="Numer mikroczipu"
                    value={pet?.microchip_number || '—'}
                    full
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white p-4 sm:p-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={handleDelete}
            className="order-2 sm:order-1 flex items-center gap-2 text-red-600 hover:bg-red-50 px-4 py-2.5 rounded-xl font-medium transition-all"
          >
            <Trash2 className="w-4 h-4" /> Usuń
          </button>
          <div className="order-1 sm:order-2 flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl font-medium text-gray-600 hover:bg-gray-100 transition-all"
            >
              Zamknij
            </button>
            {editing ? (
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl font-medium bg-brand-dark hover:bg-brand-dark text-white transition-all disabled:opacity-50"
              >
                {saving ? 'Zapisywanie...' : 'Zapisz zmiany'}
              </button>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-medium bg-brand-dark hover:bg-brand-dark text-white transition-all"
              >
                <Pencil className="w-4 h-4" /> Edytuj
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function FormField({ label, optional, full, children }: { label: string; optional?: boolean; full?: boolean; children: React.ReactNode }) {
  return (
    <div className={`p-4 rounded-2xl bg-gray-50 border border-gray-100 focus-within:border-brand-dark/40 focus-within:bg-white transition-all ${full ? 'sm:col-span-2' : ''}`}>
      <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
        {label}
        {optional && <span className="normal-case font-normal text-gray-400"> (opcjonalnie)</span>}
      </label>
      {children}
    </div>
  );
}

function InfoCard({ label, value, icon, full }: { label: string; value: string; icon: React.ReactNode; full?: boolean }) {
  return (
    <div className={`p-4 rounded-2xl bg-gray-50 border border-gray-100 flex items-start gap-3 transition-all ${full ? 'sm:col-span-2' : ''}`}>
      <div className="p-2.5 rounded-xl bg-white shadow-sm">{icon}</div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">{label}</p>
        <p className="font-medium text-gray-900">{value}</p>
      </div>
    </div>
  );
}
