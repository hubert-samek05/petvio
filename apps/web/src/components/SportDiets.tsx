'use client';

import { useEffect, useState } from 'react';
import { petApi, sportDietApi, feedingLogApi, specialDietApi } from '@/lib/api';
import { format } from 'date-fns';
import Link from 'next/link';
import {
  Dumbbell,
  Flame,
  Utensils,
  ThumbsUp,
  ThumbsDown,
  CheckCircle2,
  Loader2,
  XCircle,
  Dog,
  Cat,
  PawPrint,
  AlertTriangle,
} from 'lucide-react';

interface SportDietTemplate {
  id: number;
  key: string;
  species: string;
  name: string;
  description: string;
  activity_level: string;
  calorie_multiplier: number;
  meal_frequency: number;
  recommended_foods: string;
  avoid_foods: string;
  tips: string;
}

interface Assignment {
  id: number;
  pet_id: number;
  template_id: number;
  template_name: string;
  template_key: string;
  calorie_multiplier: number;
  meal_frequency: number;
  recommended_foods: string | null;
  avoid_foods: string | null;
  tips: string | null;
  pet_name: string;
  assigned_at: string;
}

export default function SportDiets() {
  const [pets, setPets] = useState<any[]>([]);
  const [templates, setTemplates] = useState<SportDietTemplate[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedPetId, setSelectedPetId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [assigningId, setAssigningId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [todayMeals, setTodayMeals] = useState(0);
  const [activeSpecialDiets, setActiveSpecialDiets] = useState<{ id: number; name: string }[]>([]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [petsData, assignmentsData] = await Promise.all([
        petApi.getAll(),
        sportDietApi.getAssignments(),
      ]);
      setPets(petsData.pets || []);
      setAssignments(assignmentsData.assignments || []);
      if (petsData.pets && petsData.pets.length > 0) {
        setSelectedPetId(petsData.pets[0].id.toString());
      }
    } catch (err) {
      setError('Nie udało się pobrać danych');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    const selectedPet = pets.find((p) => p.id.toString() === selectedPetId);
    if (!selectedPet) return;
    if (!['dog', 'cat'].includes(selectedPet.species)) {
      setTemplates([]);
      setTodayMeals(0);
      setActiveSpecialDiets([]);
      return;
    }
    sportDietApi
      .getTemplates(selectedPet.species === 'cat' ? 'cat' : 'dog')
      .then((data) => setTemplates(data.templates || []))
      .catch(() => setTemplates([]));
    // Posiłki dziś (postęp względem meal_frequency) + aktywne diety specjalistyczne.
    feedingLogApi
      .getLogs({ petId: Number(selectedPetId), date: format(new Date(), 'yyyy-MM-dd') })
      .then((res) => setTodayMeals((res.logs || []).filter((l: any) => l.meal_type === 'log').length))
      .catch(() => setTodayMeals(0));
    specialDietApi
      .getAll()
      .then((res) =>
        setActiveSpecialDiets(
          (res.diets || []).filter((d: any) => d.pet_id.toString() === selectedPetId && d.is_active)
        )
      )
      .catch(() => setActiveSpecialDiets([]));
  }, [selectedPetId, pets]);

  const selectedPet = pets.find((p) => p.id.toString() === selectedPetId);
  const currentAssignment = assignments.find((a) => a.pet_id.toString() === selectedPetId);

  // Szacowane zapotrzebowanie: RER (70 × kg^0.75) × mnożnik szablonu.
  const estKcal = (multiplier: number) => {
    const w = parseFloat(selectedPet?.weight);
    if (!w || isNaN(w)) return null;
    return Math.round(70 * Math.pow(w, 0.75) * Number(multiplier));
  };

  const handleAssign = async (templateId: number) => {
    if (!selectedPetId) return;
    setAssigningId(templateId);
    setError('');
    try {
      await sportDietApi.assign(Number(selectedPetId), templateId);
      await loadAll();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Nie udało się przypisać diety');
    } finally {
      setAssigningId(null);
    }
  };

  const handleUnassign = async () => {
    if (!selectedPetId) return;
    setAssigningId(-1);
    setError('');
    try {
      await sportDietApi.unassign(Number(selectedPetId));
      await loadAll();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Nie udało się odłączyć diety');
    } finally {
      setAssigningId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="pv-skeleton h-28 rounded-3xl" />
          ))}
        </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" /> {error}
          <button
            onClick={() => { setError(''); loadAll(); }}
            className="ml-auto text-xs font-bold underline flex-shrink-0"
          >
            Spróbuj ponownie
          </button>
        </div>
      )}

      {/* Chips pupila — jak w pozostałych zakładkach */}
      {pets.length === 0 && !error && (
        <div className="pv-card p-10 text-center">
          <Dumbbell className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="font-semibold text-gray-900">Brak zwierząt w profilu</p>
          <p className="text-sm text-gray-400 mt-1 mb-4">Dodaj pupila, żeby przypisać mu dietę sportową.</p>
          <Link href="/dashboard/pets/new" className="inline-block px-5 py-2 rounded-full bg-brand-dark text-white text-sm font-bold">
            Dodaj zwierzę →
          </Link>
        </div>
      )}
      {selectedPet && !['dog', 'cat'].includes(selectedPet.species) && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-gray-50 border border-gray-200">
          <PawPrint className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-gray-600">
            Diety sportowe są dostępne dla psów i kotów. Dla <span className="font-semibold">{selectedPet.name}</span> ({selectedPet.species}) dobierz żywienie indywidualnie — skonsultuj z lekarzem weterynarii.
          </p>
        </div>
      )}
      <div className="flex gap-2 flex-wrap">
        {pets.map((pet) => {
          const PetIcon = pet.species === 'cat' ? Cat : pet.species === 'dog' ? Dog : PawPrint;
          return (
            <button
              key={pet.id}
              onClick={() => setSelectedPetId(pet.id.toString())}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] font-semibold border transition-all ${
                selectedPetId === pet.id.toString()
                  ? 'bg-brand-dark text-white border-transparent shadow-md shadow-brand-dark/20'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              <PetIcon className="w-3.5 h-3.5" />
              {pet.name}
            </button>
          );
        })}
      </div>

      {activeSpecialDiets.length > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">{selectedPet?.name} ma aktywną dietę specjalistyczną: {activeSpecialDiets.map((d) => d.name).join(', ')}</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Dieta sportowa podnosi kalorie — przy diecie medycznej (np. odchudzającej, eliminacyjnej) warto zweryfikować to z weterynarzem.
            </p>
            <Link href="/dashboard/special-diets" className="inline-block mt-1 text-xs font-semibold text-amber-800 hover:underline">
              Zobacz diety specjalistyczne →
            </Link>
          </div>
        </div>
      )}

      {currentAssignment && (
        <div className="pv-card p-5 border-brand-dark/30">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-brand-dark flex items-center justify-center text-white flex-shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-dark">Aktywna dieta sportowa</p>
                <p className="font-semibold text-gray-900">{currentAssignment.template_name}</p>
                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-brand-dark/10 text-brand-dark font-semibold">
                    ×{currentAssignment.calorie_multiplier} kcal
                  </span>
                  {estKcal(currentAssignment.calorie_multiplier) && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-semibold">
                      ~{estKcal(currentAssignment.calorie_multiplier)} kcal/dzień
                    </span>
                  )}
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-semibold">
                    {currentAssignment.meal_frequency} posiłki/dzień
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-semibold">
                    dziś: {Math.min(todayMeals, currentAssignment.meal_frequency)}/{currentAssignment.meal_frequency} zapisanych
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={handleUnassign}
              disabled={assigningId === -1}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-red-600 hover:bg-red-50 font-medium transition-all disabled:opacity-50"
            >
              {assigningId === -1 ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
              Odłącz
            </button>
          </div>
          {(currentAssignment.recommended_foods || currentAssignment.tips) && (
            <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
              {currentAssignment.recommended_foods && (
                <div className="flex items-start gap-2">
                  <ThumbsUp className="w-3.5 h-3.5 text-green-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-gray-600"><span className="font-medium">Zalecane:</span> {currentAssignment.recommended_foods}</p>
                </div>
              )}
              {currentAssignment.avoid_foods && (
                <div className="flex items-start gap-2">
                  <ThumbsDown className="w-3.5 h-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-gray-600"><span className="font-medium">Unikać:</span> {currentAssignment.avoid_foods}</p>
                </div>
              )}
              {currentAssignment.tips && (
                <div className="flex items-start gap-2">
                  <Utensils className="w-3.5 h-3.5 text-brand-dark mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-gray-600">{currentAssignment.tips}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map((template) => {
          const isActive = currentAssignment?.template_id === template.id;
          return (
            <div
              key={template.id}
              className={`p-5 rounded-2xl bg-white border shadow-sm hover:shadow-md transition-all ${
                isActive ? 'border-brand-dark ring-2 ring-[#1B6B4A]/20' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-brand-dark to-brand flex items-center justify-center text-white flex-shrink-0">
                    <Dumbbell className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{template.name}</h3>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-dark bg-brand-dark/10 px-2 py-0.5 rounded-full">
                        <Flame className="w-3 h-3" /> ×{template.calorie_multiplier}
                      </span>
                      {estKcal(template.calorie_multiplier) && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-semibold">
                          ~{estKcal(template.calorie_multiplier)} kcal/dzień
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-4">{template.description}</p>

              <div className="space-y-2 mb-4">
                {template.recommended_foods && (
                  <div className="flex items-start gap-2">
                    <ThumbsUp className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-600">
                      <span className="font-medium text-gray-700">Zalecane:</span> {template.recommended_foods}
                    </p>
                  </div>
                )}
                {template.avoid_foods && (
                  <div className="flex items-start gap-2">
                    <ThumbsDown className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-600">
                      <span className="font-medium text-gray-700">Unikać:</span> {template.avoid_foods}
                    </p>
                  </div>
                )}
                {template.tips && (
                  <div className="flex items-start gap-2">
                    <Utensils className="w-4 h-4 text-brand-dark mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-600">
                      <span className="font-medium text-gray-700">Wskazówka:</span> {template.tips}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <span className="text-xs text-gray-500">{template.meal_frequency} posiłki/dzień</span>
                <button
                  onClick={() => handleAssign(template.id)}
                  disabled={isActive || assigningId === template.id}
                  className={`flex items-center gap-2 px-5 py-2 rounded-full font-medium text-sm transition-all disabled:opacity-60 ${
                    isActive
                      ? 'bg-brand-dark/10 text-brand-dark'
                      : 'bg-brand-dark hover:bg-brand text-white shadow-md shadow-brand-dark/20'
                  }`}
                >
                  {assigningId === template.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isActive ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : null}
                  {isActive ? 'Przypisana' : `Przypisz do ${selectedPet?.name || 'zwierzęcia'}`}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
