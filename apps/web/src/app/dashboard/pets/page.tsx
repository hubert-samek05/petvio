'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Trash2, PawPrint, Plus, Heart, User, Cake, Weight, RefreshCw } from 'lucide-react';
import { petApi } from '@/lib/api';
import PetModal from '@/components/PetModal';
import PetAddModal from '@/components/PetAddModal';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { SPECIES, speciesInfo, speciesLabel, ageLabel } from '@/components/PetForm';

/** Pastelowe tło portretu — gdy pupil nie ma zdjęcia */
const SPECIES_BG: Record<string, string> = {
  dog: 'linear-gradient(135deg, #DCEFE3 0%, #EEF7F1 100%)',
  cat: 'linear-gradient(135deg, #FCEADB 0%, #FBF3E8 100%)',
  rabbit: 'linear-gradient(135deg, #E8F3EC 0%, #F4FAF6 100%)',
  bird: 'linear-gradient(135deg, #FCEFE0 0%, #FBF8F3 100%)',
  hamster: 'linear-gradient(135deg, #F6ECE0 0%, #FBF5EC 100%)',
  other: 'linear-gradient(135deg, #EEF7F1 0%, #FBF8F3 100%)',
};

export default function PetsPage() {
  const [pets, setPets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPetId, setSelectedPetId] = useState<number | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadPets();
  }, []);

  const loadPets = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await petApi.getAll();
      setPets(response.pets || []);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Nie udało się pobrać zwierząt');
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await petApi.delete(deleteTarget.id);
      setDeleteTarget(null);
      loadPets();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Nie udało się usunąć zwierzęcia');
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const filteredPets =
    filter === 'all' ? pets : pets.filter((p) => p.species === filter);

  const filters = [
    { key: 'all', label: 'Wszyscy', emoji: '', n: pets.length },
    ...SPECIES.map((s) => ({
      key: s.value,
      label: s.label,
      emoji: s.emoji,
      n: pets.filter((p) => p.species === s.value).length,
    })),
  ].filter((f) => f.key === 'all' || f.n > 0);

  const Banner = () => (
    <PageHeader
      title="Moje zwierzęta"
      description={
        pets.length > 0
          ? `Twoja paczka — ${pets.length} ${pets.length === 1 ? 'pupil' : pets.length < 5 ? 'pupile' : 'pupilów'} pod opieką`
          : 'Zarządzaj profilami swoich pupili'
      }
      icon={PawPrint}
      action={
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="pv-btn bg-white text-brand-dark px-5 py-3 text-sm font-bold shadow-lg"
        >
          <Plus className="w-4 h-4" />
          Dodaj zwierzę
        </button>
      }
    />
  );

  if (loading) {
    return (
      <div className="space-y-7">
        <Banner />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="pv-card overflow-hidden">
              <div className="pv-skeleton h-44 !rounded-none" />
              <div className="p-5 space-y-2">
                <div className="pv-skeleton h-6 w-1/2" />
                <div className="pv-skeleton h-4 w-2/3" />
                <div className="pv-skeleton h-10 rounded-xl mt-4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <Banner />

      {error && (
        <div className="pv-card p-5 flex flex-col sm:flex-row items-center gap-4 animate-slide-down">
          <p className="flex-1 text-sm text-red-500 font-medium">{error}</p>
          <button
            onClick={loadPets}
            className="pv-btn-ghost px-5 py-2.5 text-sm inline-flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Spróbuj ponownie
          </button>
        </div>
      )}

      {pets.length === 0 && !error ? (
        <div className="pv-card">
          <EmptyState
            icon={PawPrint}
            title="Nie masz jeszcze żadnych zwierząt"
            description="Dodaj profil swojego pupila i miej wszystko w jednym miejscu — zdrowie, karmienie, spacery."
          />
          <div className="text-center pb-10 -mt-4">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="pv-btn-primary px-8 py-3"
            >
              <Plus className="w-4 h-4" />
              Dodaj pierwsze zwierzę
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* ====== FILTRY GATUNKÓW ====== */}
          <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0 animate-slide-up stagger-1">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all active:scale-95 ${
                  filter === f.key
                    ? 'bg-brand-dark text-white shadow-md'
                    : 'bg-white border border-gray-200/80 text-gray-500 hover:border-brand hover:text-brand-dark'
                }`}
              >
                {f.emoji && <span>{f.emoji}</span>}
                {f.label}
                <span
                  className={`min-w-[20px] h-5 px-1 rounded-full text-[10px] font-bold flex items-center justify-center ${
                    filter === f.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {f.n}
                </span>
              </button>
            ))}
          </div>

          {/* ====== ALBUM PUPILI ====== */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredPets.map((pet, i) => (
              <div
                key={pet.id}
                onClick={() => setSelectedPetId(pet.id)}
                className={`group pv-card-hover overflow-hidden cursor-pointer flex flex-col animate-slide-up stagger-${Math.min(i + 2, 12)}`}
              >
                {/* Portret */}
                <div
                  className="relative h-44 flex items-center justify-center overflow-hidden flex-shrink-0"
                  style={{ background: SPECIES_BG[pet.species] || SPECIES_BG.other }}
                >
                  {pet.photo_url ? (
                    <img
                      src={pet.photo_url}
                      alt={pet.name}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <>
                      <PawPrint className="absolute -left-4 -bottom-6 w-24 h-24 text-brand-dark/[0.06] -rotate-12" aria-hidden />
                      <PawPrint className="absolute right-2 -top-5 w-20 h-20 text-brand-dark/[0.05] rotate-12" aria-hidden />
                      <span className="text-6xl drop-shadow-sm group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300">
                        {speciesInfo(pet.species).emoji}
                      </span>
                    </>
                  )}

                  {/* Chipy na portercie */}
                  <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-white/90 backdrop-blur-sm text-[11px] font-bold text-brand-dark shadow-sm">
                    {speciesInfo(pet.species).emoji} {speciesLabel(pet.species)}
                  </span>
                  {pet.birth_date && ageLabel(pet.birth_date) && (
                    <span className="absolute top-3 right-3 px-3 py-1 rounded-full bg-white/90 backdrop-blur-sm text-[11px] font-bold text-gray-600 shadow-sm inline-flex items-center gap-1">
                      <Cake className="w-3 h-3" /> {ageLabel(pet.birth_date)}
                    </span>
                  )}
                </div>

                {/* Dane */}
                <div className="p-5 flex flex-col flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-serif text-xl font-normal text-gray-900 break-words group-hover:text-brand-dark transition-colors">
                      {pet.name}
                    </h3>
                    {pet.gender && (
                      <span
                        className={`flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          pet.gender === 'male'
                            ? 'bg-brand-light text-brand-dark'
                            : 'bg-brand-peach text-[#B4701F]'
                        }`}
                      >
                        {pet.gender === 'male' ? '♂ Samiec' : '♀ Samica'}
                      </span>
                    )}
                  </div>
                  {pet.breed && (
                    <p className="text-sm text-gray-500 mt-0.5 break-words">{pet.breed}</p>
                  )}

                  {pet.weight && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-mint text-brand-dark text-[11px] font-semibold">
                        <Weight className="w-3 h-3" /> {parseFloat(pet.weight)} kg
                      </span>
                    </div>
                  )}

                  {/* Szybkie akcje */}
                  <div className="mt-auto pt-4 border-t border-gray-100/80 flex items-center gap-2">
                    <Link
                      href={`/dashboard/pets/${pet.id}/profile`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-brand-mint text-brand-dark text-xs font-bold hover:bg-brand-light transition-all active:scale-95"
                    >
                      <User className="w-3.5 h-3.5" /> Profil
                    </Link>
                    <Link
                      href={`/dashboard/health/${pet.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-brand-mint text-brand-dark text-xs font-bold hover:bg-brand-light transition-all active:scale-95"
                    >
                      <Heart className="w-3.5 h-3.5" /> Zdrowie
                    </Link>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(pet);
                      }}
                      className="w-10 h-10 rounded-xl text-red-300 hover:text-red-500 hover:bg-red-50 transition-all active:scale-90 flex items-center justify-center flex-shrink-0"
                      aria-label={`Usuń ${pet.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Karta „Dodaj pupila" */}
            <button
              onClick={() => setIsAddModalOpen(true)}
              className={`rounded-3xl border-2 border-dashed border-brand-light bg-white/50 hover:bg-brand-mint/50 hover:border-brand transition-all flex flex-col items-center justify-center gap-3 min-h-[280px] text-center px-6 group animate-slide-up stagger-${Math.min(filteredPets.length + 2, 12)}`}
            >
              <span className="w-14 h-14 rounded-full bg-brand-mint group-hover:bg-brand-light flex items-center justify-center transition-all group-hover:scale-110 group-hover:-rotate-6">
                <Plus className="w-6 h-6 text-brand-dark" />
              </span>
              <span>
                <span className="block font-bold text-brand-dark">Dodaj pupila</span>
                <span className="block text-xs text-gray-400 mt-1">Nowy członek paczki</span>
              </span>
            </button>
          </div>
        </>
      )}

      {selectedPetId && (
        <PetModal
          petId={selectedPetId}
          isOpen={!!selectedPetId}
          onClose={() => setSelectedPetId(null)}
          onSaved={loadPets}
        />
      )}

      <PetAddModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSaved={loadPets}
      />

      <ConfirmModal
        isOpen={!!deleteTarget}
        title={`Usunąć ${deleteTarget?.name || 'zwierzę'}?`}
        description="Ta operacja jest nieodwracalna."
        details={[
          'wpisy zdrowia i kalendarz zdrowia',
          'spacery, diety i karmienia',
          'aktywne zgłoszenie zaginięcia (jeśli istnieje)',
        ]}
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
