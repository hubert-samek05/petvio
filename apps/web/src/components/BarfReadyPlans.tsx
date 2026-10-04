'use client';

import {
  Beef,
  Cat,
  Dog,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

export interface BarfPresetPayload {
  activityLevel: string;
  ratioModel: string;
  customRatios?: { musclePct: number; bonePct: number; liverPct: number; otherOrganPct: number; vegFruitPct: number };
  mealsPerDay: number;
}

interface ReadyPlan {
  id: string;
  name: string;
  species: 'dog' | 'cat';
  tag: string;
  weightRange: string;
  description: string;
  preset: BarfPresetPayload;
}

const readyPlans: ReadyPlan[] = [
  {
    id: 'puppy-small',
    name: 'Szczenię małej rasy (wzrost)',
    species: 'dog',
    tag: 'Wzrost',
    weightRange: '1–10 kg',
    description: 'Wyższy udział mięsa i większa dzienna porcja wspierająca intensywny wzrost małych ras.',
    preset: { activityLevel: 'puppy', ratioModel: 'standard', mealsPerDay: 4 },
  },
  {
    id: 'puppy-large',
    name: 'Szczenię dużej rasy (wzrost)',
    species: 'dog',
    tag: 'Wzrost',
    weightRange: '10–40 kg',
    description: 'Kontrolowany model z warzywami — pomaga zbilansować tempo wzrostu u dużych ras. Skonsultuj proporcje wapnia z weterynarzem.',
    preset: { activityLevel: 'puppy', ratioModel: 'adjusted', mealsPerDay: 4 },
  },
  {
    id: 'dog-active',
    name: 'Pies aktywny / sportowy',
    species: 'dog',
    tag: 'Aktywność',
    weightRange: 'każda waga',
    description: 'Standardowy model 80/10/10 dla psów o wysokiej aktywności fizycznej i dobrej kondycji.',
    preset: { activityLevel: 'active', ratioModel: 'standard', mealsPerDay: 2 },
  },
  {
    id: 'dog-moderate',
    name: 'Pies mniej aktywny / kanapowy',
    species: 'dog',
    tag: 'Umiarkowana aktywność',
    weightRange: 'każda waga',
    description: 'Model z warzywami — dodatkowy błonnik i niższa kaloryczność dla psów o umiarkowanej aktywności.',
    preset: { activityLevel: 'moderate', ratioModel: 'adjusted', mealsPerDay: 2 },
  },
  {
    id: 'dog-senior',
    name: 'Pies senior',
    species: 'dog',
    tag: 'Senior',
    weightRange: 'każda waga',
    description: 'Lekki model dopasowany do wolniejszego metabolizmu i mniejszych potrzeb energetycznych seniorów.',
    preset: { activityLevel: 'senior', ratioModel: 'senior_light', mealsPerDay: 2 },
  },
  {
    id: 'dog-weight-loss',
    name: 'Pies z nadwagą (redukcja)',
    species: 'dog',
    tag: 'Redukcja masy',
    weightRange: 'każda waga',
    description: 'Niższa dzienna porcja i model z warzywami wspierający kontrolowaną redukcję masy ciała.',
    preset: { activityLevel: 'weight_loss', ratioModel: 'adjusted', mealsPerDay: 3 },
  },
  {
    id: 'cat-active',
    name: 'Kot aktywny',
    species: 'cat',
    tag: 'Aktywność',
    weightRange: 'każda waga',
    description: 'Standardowy model 80/10/10 — koty jako drapieżniki obligatoryjni najlepiej tolerują dietę bez warzyw.',
    preset: { activityLevel: 'active', ratioModel: 'standard', mealsPerDay: 3 },
  },
  {
    id: 'cat-moderate',
    name: 'Kot domowy / mało aktywny',
    species: 'cat',
    tag: 'Umiarkowana aktywność',
    weightRange: 'każda waga',
    description: 'Standardowy model z mniejszą dzienną porcją dopasowaną do kotów domowych o niższej aktywności.',
    preset: { activityLevel: 'moderate', ratioModel: 'standard', mealsPerDay: 3 },
  },
  {
    id: 'cat-senior',
    name: 'Kot senior',
    species: 'cat',
    tag: 'Senior',
    weightRange: 'każda waga',
    description: 'Lekki model dla kotów seniorów — łatwiej przyswajalne proporcje przy wolniejszym metabolizmie.',
    preset: { activityLevel: 'senior', ratioModel: 'senior_light', mealsPerDay: 3 },
  },
];

export default function BarfReadyPlans({ onApply }: { onApply: (preset: BarfPresetPayload) => void }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {readyPlans.map((plan) => {
          const SpeciesIcon = plan.species === 'dog' ? Dog : Cat;
          return (
            <div key={plan.id} className="p-5 rounded-2xl bg-white border border-gray-200 shadow-sm flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-dark to-brand flex items-center justify-center text-white flex-shrink-0">
                    <SpeciesIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{plan.name}</h3>
                    <p className="text-xs text-gray-500">{plan.weightRange}</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full bg-brand-dark/10 text-brand-dark flex-shrink-0">
                  <Sparkles className="w-3 h-3" /> {plan.tag}
                </span>
              </div>

              <p className="text-sm text-gray-600">{plan.description}</p>

              <button
                onClick={() => onApply(plan.preset)}
                className="mt-auto inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand-dark/10 text-brand-dark font-medium text-sm hover:bg-brand-dark/20 transition-all"
              >
                Zastosuj w kalkulatorze <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex items-start gap-2 p-4 rounded-xl bg-amber-50 border border-amber-100">
        <Beef className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700">
          Gotowe plany ustawiają model proporcji i poziom aktywności w Kalkulatorze BARF — po zastosowaniu podaj wagę zwierzęcia i zapisz plan, aby go aktywować.
        </p>
      </div>
    </div>
  );
}
