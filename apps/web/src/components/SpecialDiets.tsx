'use client';

import { useEffect, useState } from 'react';
import { petApi, specialDietApi } from '@/lib/api';
import { Apple, Plus, Pencil, Trash2, ChevronDown, AlertCircle, CheckCircle2, Dumbbell, Beef, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import SpecialDietModal from './SpecialDietModal';

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
  pet_name: string;
  sportDietWarning?: string | null;
  barfPlan?: {
    dailyFoodGrams: number;
    muscleMeatGrams: number;
    boneGrams: number;
    liverGrams: number;
    otherOrganGrams: number;
    vegFruitGrams: number;
    caloriesTarget: number | null;
    mealsPerDay: number;
    supplements: any[];
  } | null;
}

export default function SpecialDiets() {
  const [pets, setPets] = useState<any[]>([]);
  const [diets, setDiets] = useState<SpecialDiet[]>([]);
  const [selectedPetId, setSelectedPetId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDiet, setEditingDiet] = useState<SpecialDiet | null>(null);

  const fetchPets = async () => {
    try {
      const data = await petApi.getAll();
      setPets(data.pets || []);
      if (data.pets && data.pets.length > 0) {
        setSelectedPetId(data.pets[0].id.toString());
      }
    } catch (err: any) {
      setError('Nie udało się pobrać zwierząt');
    }
  };

  const fetchDiets = async () => {
    try {
      const data = await specialDietApi.getAll();
      setDiets(data.diets || []);
    } catch (err: any) {
      setError('Nie udało się pobrać diet');
    }
  };

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([fetchPets(), fetchDiets()]);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm('Czy na pewno chcesz usunąć tę dietę?')) return;
    try {
      await specialDietApi.delete(id);
      await fetchDiets();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Nie udało się usunąć diety');
    }
  };

  const startEdit = (diet: SpecialDiet) => {
    setEditingDiet(diet);
    setModalOpen(true);
  };

  const startAdd = () => {
    setEditingDiet(null);
    setModalOpen(true);
  };

  const filteredDiets = selectedPetId
    ? diets.filter((d) => d.pet_id.toString() === selectedPetId)
    : diets;

  const selectedPet = pets.find((p) => p.id.toString() === selectedPetId);

  const dietTypeLabel: Record<string, string> = {
    renal: 'Nerkowa',
    diabetic: 'Cukrzycowa',
    elimination: 'Eliminacyjna',
    barf: 'BARF',
    weight: 'Nadwaga / odchudzanie',
    allergy: 'Alergia',
    other: 'Inna',
  };

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('pl-PL') : '—';

  if (loading) {
    return (
      <div className="text-center py-16 text-gray-500">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-[#1B6B4A] rounded-full animate-spin mx-auto mb-4" />
        Ładowanie diet...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="w-full sm:w-auto">
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Wybierz zwierzę</label>
          <div className="relative w-full sm:w-64">
            <select
              value={selectedPetId}
              onChange={(e) => setSelectedPetId(e.target.value)}
              className="w-full appearance-none bg-white border border-gray-200 rounded-2xl px-4 py-3 text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-brand-dark/20 focus:border-brand-dark/50 pr-10"
            >
              <option value="">Wszystkie zwierzęta</option>
              {pets.map((pet) => (
                <option key={pet.id} value={pet.id}>
                  {pet.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        <button
          onClick={startAdd}
          className="flex items-center gap-2 px-5 py-3 rounded-full bg-brand-dark hover:bg-brand-dark text-white font-medium shadow-md shadow-brand-dark/20 transition-all"
        >
          <Plus className="w-5 h-5" />
          Dodaj dietę
        </button>
      </div>

      {filteredDiets.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-gray-200 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-brand-dark/10 flex items-center justify-center mx-auto mb-4">
            <Apple className="w-8 h-8 text-brand-dark" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Brak diet specjalistycznych</h3>
          <p className="text-gray-500 mb-6 max-w-sm mx-auto">
            {selectedPetId
              ? `${selectedPet?.name || 'To zwierzę'} nie ma jeszcze przypisanej diety. Dodaj pierwszą, aby zarządzać zaleceniami żywieniowymi.`
              : 'Nie masz jeszcze żadnych diet. Dodaj pierwszą, aby zarządzać zaleceniami żywieniowymi.'}
          </p>
          <button
            onClick={startAdd}
            className="px-6 py-2.5 rounded-full bg-brand-dark hover:bg-brand-dark text-white font-medium transition-all"
          >
            Dodaj dietę
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredDiets.map((diet) => (
            <div
              key={diet.id}
              className="p-5 rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-dark to-brand flex items-center justify-center text-white">
                    <Apple className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{diet.name}</h3>
                    <p className="text-sm text-gray-500">{diet.pet_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => startEdit(diet)}
                    className="p-2 rounded-xl text-gray-400 hover:text-brand-dark hover:bg-brand-dark/10 transition-all"
                    aria-label="Edytuj"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(diet.id)}
                    className="p-2 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
                    aria-label="Usuń"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                      diet.is_active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {diet.is_active ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                    {diet.is_active ? 'Aktywna' : 'Nieaktywna'}
                  </span>
                  <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                    {dietTypeLabel[diet.diet_type] || diet.diet_type}
                  </span>
                </div>

                {diet.indication && (
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Wskazanie:</span> {diet.indication}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-3 text-sm">
                  {diet.allowed_foods && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Dozwolone</p>
                      <p className="text-gray-700 line-clamp-2">{diet.allowed_foods}</p>
                    </div>
                  )}
                  {diet.forbidden_foods && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Zakazane</p>
                      <p className="text-gray-700 line-clamp-2">{diet.forbidden_foods}</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4 text-xs text-gray-500 pt-2 border-t border-gray-100">
                  <span>Od: {formatDate(diet.start_date)}</span>
                  <span>Do: {formatDate(diet.end_date)}</span>
                </div>

                {diet.sportDietWarning && (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200">
                    <Dumbbell className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-red-700 font-medium">{diet.sportDietWarning}</p>
                  </div>
                )}

                {diet.diet_type === 'barf' && (
                  diet.barfPlan ? (
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-orange-50 border border-orange-200">
                      <Beef className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-xs text-orange-700 font-medium">
                          Aktywny plan BARF: {diet.barfPlan.dailyFoodGrams}g/dzień ({diet.barfPlan.mealsPerDay} posiłki) — mięso {diet.barfPlan.muscleMeatGrams}g, kość {diet.barfPlan.boneGrams}g, wątroba {diet.barfPlan.liverGrams}g, narządy {diet.barfPlan.otherOrganGrams}g{diet.barfPlan.vegFruitGrams > 0 ? `, warzywa/owoce ${diet.barfPlan.vegFruitGrams}g` : ''}
                        </p>
                        {diet.barfPlan.supplements && diet.barfPlan.supplements.length > 0 && (
                          <p className="text-xs text-orange-600">
                            Suplementy: {diet.barfPlan.supplements.map((s: any) => s.name).join(', ')}
                          </p>
                        )}
                        <Link href="/dashboard/barf" className="inline-flex items-center gap-1 text-xs font-semibold text-orange-700 hover:underline">
                          Przejdź do kalkulatora BARF <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-orange-50 border border-orange-200">
                      <Beef className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-xs text-orange-700 font-medium">
                          Ta dieta jest typu BARF, ale nie masz jeszcze zapisanego planu żywienia dla tego zwierzęcia.
                        </p>
                        <Link href="/dashboard/barf" className="inline-flex items-center gap-1 text-xs font-semibold text-orange-700 hover:underline">
                          Skonfiguruj plan w kalkulatorze BARF <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <SpecialDietModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={fetchDiets}
        onDelete={handleDelete}
        pets={pets}
        editingDiet={editingDiet}
      />
    </div>
  );
}
