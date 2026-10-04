'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Trash2, PawPrint } from 'lucide-react';
import { petApi } from '@/lib/api';
import PetModal from '@/components/PetModal';
import PetAddModal from '@/components/PetAddModal';
import PageHeader from '@/components/PageHeader';

const speciesLabel = (s: string) =>
  s === 'dog' ? 'Pies' : s === 'cat' ? 'Kot' : 'Inne';

const age = (birthDate: string): string => {
  if (!birthDate) return '';
  const diff = Date.now() - new Date(birthDate).getTime();
  const years = Math.floor(diff / (365.25 * 24 * 3600 * 1000));
  const months = Math.floor((diff / (30.44 * 24 * 3600 * 1000)) % 12);
  if (years === 0) return `${months} mies.`;
  return `${years} ${years === 1 ? 'rok' : years < 5 ? 'lata' : 'lat'}`;
};

export default function PetsPage() {
  const [pets, setPets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPetId, setSelectedPetId] = useState<number | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    loadPets();
  }, []);

  const loadPets = async () => {
    try {
      const response = await petApi.getAll();
      setPets(response.pets || []);
    } catch (error) {
      console.error('Error loading pets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Czy na pewno chcesz usunąć to zwierzę?')) return;
    try {
      await petApi.delete(id);
      loadPets();
    } catch (error) {
      console.error('Error deleting pet:', error);
    }
  };

  const Banner = () => (
    <PageHeader
      title="Moje zwierzęta"
      description="Zarządzaj profilami swoich pupili"
      icon={PawPrint}
      action={
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center w-fit bg-white text-brand-dark px-4 py-2 rounded-full font-medium text-sm hover:bg-gray-50 transition-all"
        >
          Dodaj zwierzę
        </button>
      }
    />
  );

  if (loading) {
    return (
      <div className="space-y-8">
        <Banner />
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="text-gray-600">Ładowanie...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Banner />

      {pets.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-200/70 shadow-sm">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-[#1B6B4A]/10 to-[#2A8A5C]/10 flex items-center justify-center">
            <div className="w-7 h-7 rounded-full border-2 border-dashed border-brand"></div>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Nie masz jeszcze żadnych zwierząt</h3>
          <p className="text-gray-500 mb-6">Dodaj profil swojego pupila, aby rozpocząć</p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-block bg-brand-dark hover:bg-brand-dark text-white px-8 py-3 rounded-full font-medium shadow-md shadow-brand-dark/20 transition-all"
          >
            Dodaj pierwsze zwierzę
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {pets.map((pet) => (
            <div
              key={pet.id}
              onClick={() => setSelectedPetId(pet.id)}
              className="group bg-white rounded-2xl p-5 border border-gray-200/70 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-brand-dark/30 transition-all duration-300 cursor-pointer"
            >
              <div className="flex items-center gap-4 mb-5">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-dark to-brand overflow-hidden flex items-center justify-center text-white flex-shrink-0">
                  {pet.photo_url ? (
                    <img src={pet.photo_url} alt={pet.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl font-semibold">{pet.name?.[0]?.toUpperCase()}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 truncate">{pet.name}</h3>
                  <div className="flex items-center gap-1.5 text-sm text-gray-500">
                    <PawPrint className="w-3.5 h-3.5" />
                    <span className="truncate">
                      {speciesLabel(pet.species)}
                      {pet.breed ? ` · ${pet.breed}` : ''}
                    </span>
                  </div>
                  {pet.birth_date && (
                    <p className="text-xs text-gray-400 mt-1">{age(pet.birth_date)}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); setSelectedPetId(pet.id); }}
                  className="flex-1 text-center bg-gray-50 group-hover:bg-gray-100 text-gray-700 px-4 py-2.5 rounded-xl font-medium transition-all"
                >
                  Szczegóły
                </button>
                <button
                  onClick={(e) => handleDelete(pet.id, e)}
                  className="px-4 py-2.5 text-red-500 hover:bg-red-50 rounded-xl font-medium transition-all"
                  aria-label="Usuń"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
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
    </div>
  );
}
