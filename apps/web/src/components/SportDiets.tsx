'use client';

import { useEffect, useState } from 'react';
import { petApi, sportDietApi } from '@/lib/api';
import {
  Dumbbell,
  ChevronDown,
  Flame,
  Utensils,
  ThumbsUp,
  ThumbsDown,
  CheckCircle2,
  Loader2,
  XCircle,
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
  pet_name: string;
}

export default function SportDiets() {
  const [pets, setPets] = useState<any[]>([]);
  const [templates, setTemplates] = useState<SportDietTemplate[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedPetId, setSelectedPetId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [assigningId, setAssigningId] = useState<number | null>(null);
  const [error, setError] = useState('');

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
    sportDietApi.getTemplates(selectedPet.species === 'cat' ? 'cat' : 'dog').then((data) => {
      setTemplates(data.templates || []);
    });
  }, [selectedPetId, pets]);

  const selectedPet = pets.find((p) => p.id.toString() === selectedPetId);
  const currentAssignment = assignments.find((a) => a.pet_id.toString() === selectedPetId);

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
      <div className="text-center py-16 text-gray-500">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-[#1B6B4A] rounded-full animate-spin mx-auto mb-4" />
        Ładowanie diet sportowych...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium">
          {error}
        </div>
      )}

      <div className="w-full sm:w-auto">
        <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
          Wybierz zwierzę
        </label>
        <div className="relative w-full sm:w-64">
          <select
            value={selectedPetId}
            onChange={(e) => setSelectedPetId(e.target.value)}
            className="w-full appearance-none bg-white border border-gray-200 rounded-2xl px-4 py-3 text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-brand-dark/20 focus:border-brand-dark/50 pr-10"
          >
            {pets.map((pet) => (
              <option key={pet.id} value={pet.id}>
                {pet.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {currentAssignment && (
        <div className="p-5 rounded-2xl bg-gradient-to-br from-[#1B6B4A]/10 to-[#2A8A5C]/10 border border-brand-dark/20 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-brand-dark flex items-center justify-center text-white flex-shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-dark">Aktywna dieta sportowa</p>
              <p className="font-semibold text-gray-900">{currentAssignment.template_name}</p>
              <p className="text-sm text-gray-500">
                Mnożnik kalorii: x{currentAssignment.calorie_multiplier} — stosowany automatycznie w Kalkulatorze kalorii
              </p>
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
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-dark bg-brand-dark/10 px-2 py-0.5 rounded-full mt-1">
                      <Flame className="w-3 h-3" /> mnożnik x{template.calorie_multiplier}
                    </span>
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
                      : 'bg-brand-dark hover:bg-brand-dark text-white shadow-md shadow-brand-dark/20'
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
