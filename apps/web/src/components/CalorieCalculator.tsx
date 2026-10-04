'use client';

import { useEffect, useState } from 'react';
import { petApi, calorieCalculatorApi } from '@/lib/api';
import {
  Flame,
  PawPrint,
  ChevronDown,
  Loader2,
  AlertCircle,
  RefreshCw,
  Info,
  Activity,
  Dumbbell,
} from 'lucide-react';

type CalculationResult = {
  dailyCalories: number;
  perMeal: number;
  mealsCount: number;
  rer: number;
  multiplier: number;
  species: string;
  weight: number;
  ageMonths: number;
  lifeStage: string;
  activity: string;
  bodyCondition: string;
  goal: string;
  isSterilized: boolean;
  breedFactor: number;
  macros: { protein: number; fat: number; carbs: number };
  recommendation: string;
  sportDiet?: { name: string; key: string; multiplier: number } | null;
};

type BreedOption = { value: string; label: string };

type Pet = {
  id: number;
  name: string;
  species: string;
  breed: string;
  birth_date: string;
  weight: string;
};

const bodyConditionLabels: Record<string, string> = {
  very_underweight: 'Bardzo niedowaga',
  underweight: 'Niedowaga',
  ideal: 'Idealna',
  overweight: 'Nadwaga',
  obese: 'Otyłość',
};

const goalLabels: Record<string, string> = {
  lose: 'Redukcja wagi',
  maintain: 'Utrzymanie wagi',
  gain: 'Wzrost wagi',
};

function getActivityOptions(species: 'dog' | 'cat') {
  const base = [
    { value: 'sedentary', label: 'Siedzący tryb życia' },
    { value: 'low', label: 'Niska aktywność' },
    { value: 'moderate', label: 'Umiarkowana aktywność' },
    { value: 'active', label: 'Wysoka aktywność' },
    { value: 'very_active', label: 'Bardzo wysoka aktywność' },
  ];
  if (species === 'dog') {
    return [...base, { value: 'working', label: 'Pies pracujący / sportowy' }];
  }
  return base;
}

function getLifeStageOptions(species: 'dog' | 'cat') {
  const common = [
    { value: 'adult', label: 'Dorosły' },
    { value: 'senior', label: 'Senior' },
    { value: 'pregnant', label: 'Ciężarna' },
    { value: 'lactating', label: 'Karmiąca' },
  ];
  if (species === 'dog') {
    return [
      { value: 'puppy_under_4mo', label: 'Szczeniak (0-4 miesiące)' },
      { value: 'puppy_4_12mo', label: 'Szczeniak (4-12 miesięcy)' },
      ...common,
    ];
  }
  return [
    { value: 'kitten_under_4mo', label: 'Kociak (0-4 miesiące)' },
    { value: 'kitten_4_12mo', label: 'Kociak (4-12 miesięcy)' },
    ...common,
  ];
}

function monthsBetween(start: string, end: Date) {
  const s = new Date(start);
  const e = new Date(end);
  return Math.max(0, (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()));
}

function inferLifeStage(species: 'dog' | 'cat', ageMonths: number) {
  if (species === 'cat') {
    if (ageMonths < 4) return 'kitten_under_4mo';
    if (ageMonths < 12) return 'kitten_4_12mo';
    if (ageMonths >= 132) return 'senior';
    return 'adult';
  }
  if (ageMonths < 4) return 'puppy_under_4mo';
  if (ageMonths < 12) return 'puppy_4_12mo';
  if (ageMonths >= 84) return 'senior';
  return 'adult';
}

function ageDisplay(years: string) {
  const y = parseFloat(years);
  if (!y || y < 0) return '-';
  if (y < 1) return `${Math.round(y * 12)} mies.`;
  const fullYears = Math.floor(y);
  const months = Math.round((y - fullYears) * 12);
  if (months === 0) return `${fullYears} lat`;
  return `${fullYears} lat ${months} mies.`;
}

export default function CalorieCalculator() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [breeds, setBreeds] = useState<{ dog: BreedOption[]; cat: BreedOption[] }>({ dog: [], cat: [] });
  const [selectedPetId, setSelectedPetId] = useState('');
  const [species, setSpecies] = useState<'dog' | 'cat'>('dog');
  const [breed, setBreed] = useState('');
  const [weight, setWeight] = useState('');
  const [ageYears, setAgeYears] = useState('');
  const [activity, setActivity] = useState('moderate');
  const [lifeStage, setLifeStage] = useState('');
  const [bodyCondition, setBodyCondition] = useState('ideal');
  const [goal, setGoal] = useState('maintain');
  const [isSterilized, setIsSterilized] = useState(false);
  const [meals, setMeals] = useState('2');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<CalculationResult | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [petsResponse, breedsResponse] = await Promise.all([petApi.getAll(), calorieCalculatorApi.getBreeds()]);
        const list = petsResponse.pets || [];
        setPets(list);
        setBreeds(breedsResponse || { dog: [], cat: [] });
        if (list.length > 0) {
          setSelectedPetId(list[0].id.toString());
        }
      } catch {
        // ignore
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    const pet = pets.find((p) => p.id.toString() === selectedPetId);
    if (!pet) return;

    const petSpecies = pet.species === 'cat' ? 'cat' : 'dog';
    setSpecies(petSpecies);

    if (pet.breed) {
      setBreed(pet.breed);
    } else {
      setBreed('inna');
    }

    if (pet.weight) {
      setWeight(pet.weight.toString());
    }

    if (pet.birth_date) {
      const months = monthsBetween(pet.birth_date, new Date());
      const years = months / 12;
      setAgeYears(years.toFixed(2));
      setLifeStage(inferLifeStage(petSpecies, months));
    } else {
      setAgeYears('');
      setLifeStage('');
    }
  }, [selectedPetId, pets]);

  useEffect(() => {
    const currentBreeds = species === 'cat' ? breeds.cat : breeds.dog;
    const found = currentBreeds.some((b) => b.value === breed);
    if (!found) {
      setBreed('inna');
    }
  }, [species, breeds, breed]);

  useEffect(() => {
    if (ageYears && !lifeStage) {
      const y = parseFloat(ageYears);
      if (!isNaN(y)) {
        setLifeStage(inferLifeStage(species, Math.round(y * 12)));
      }
    }
  }, [ageYears, species, lifeStage]);

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const data: any = {
        species,
        weight: parseFloat(weight),
        ageYears: ageYears ? parseFloat(ageYears) : undefined,
        breed,
        activity,
        lifeStage,
        bodyCondition,
        goal,
        isSterilized,
        meals: parseInt(meals, 10),
      };
      if (selectedPetId) {
        data.petId = parseInt(selectedPetId, 10);
      }
      const response = await calorieCalculatorApi.calculate(data);
      setResult(response);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Wystąpił błąd podczas obliczeń');
    } finally {
      setLoading(false);
    }
  };

  const currentBreeds = species === 'cat' ? breeds.cat : breeds.dog;
  const activityOptions = getActivityOptions(species);
  const lifeStageOptions = getLifeStageOptions(species);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-brand-dark via-brand to-emerald-800 rounded-2xl p-4 sm:p-5 text-white">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 sm:w-5 sm:h-5" />
          <h2 className="text-base sm:text-lg font-semibold">Spersonalizowany kalkulator kalorii</h2>
        </div>
        <p className="text-xs sm:text-sm text-white/80 mt-1">
          Uwzględnia gatunek, rasę, wagę, wiek, aktywność, kondycję i cel żywieniowy.
        </p>
      </div>

      <form onSubmit={handleCalculate} className="space-y-4 sm:space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          <div className="space-y-1.5 sm:space-y-2">
            <label className="text-[11px] sm:text-xs font-semibold uppercase tracking-wide text-gray-500">Wybierz pupila</label>
            <div className="relative flex items-center w-full">
              <select
                value={selectedPetId}
                onChange={(e) => setSelectedPetId(e.target.value)}
                className="w-full appearance-none bg-white border border-gray-200 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-dark/30 focus:border-brand-dark pr-10"
              >
                <option value="">Wpisz dane ręcznie</option>
                {pets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.species === 'cat' ? 'kot' : 'pies'})
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <label className="text-[11px] sm:text-xs font-semibold uppercase tracking-wide text-gray-500">Gatunek</label>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => setSpecies('dog')}
                className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 rounded-xl border text-sm sm:text-base font-medium transition-all ${
                  species === 'dog'
                    ? 'bg-brand-dark text-white border-brand-dark'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-brand-dark/30'
                }`}
              >
                <PawPrint className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Pies
              </button>
              <button
                type="button"
                onClick={() => setSpecies('cat')}
                className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 rounded-xl border text-sm sm:text-base font-medium transition-all ${
                  species === 'cat'
                    ? 'bg-brand-dark text-white border-brand-dark'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-brand-dark/30'
                }`}
              >
                <PawPrint className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Kot
              </button>
            </div>
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <label className="text-[11px] sm:text-xs font-semibold uppercase tracking-wide text-gray-500">Rasa</label>
            <div className="relative flex items-center w-full">
              <select
                value={breed}
                onChange={(e) => setBreed(e.target.value)}
                className="w-full appearance-none bg-white border border-gray-200 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-dark/30 focus:border-brand-dark pr-10"
              >
                {currentBreeds.map((b) => (
                  <option key={b.value} value={b.value}>
                    {b.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <label className="text-[11px] sm:text-xs font-semibold uppercase tracking-wide text-gray-500">Waga (kg)</label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="np. 12.5"
              className="w-full bg-white border border-gray-200 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-dark/30 focus:border-brand-dark"
              required
            />
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <label className="text-[11px] sm:text-xs font-semibold uppercase tracking-wide text-gray-500">Wiek (lata)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              value={ageYears}
              onChange={(e) => setAgeYears(e.target.value)}
              placeholder="np. 3.5"
              className="w-full bg-white border border-gray-200 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-dark/30 focus:border-brand-dark"
            />
            {ageYears && <p className="text-[11px] sm:text-xs text-gray-500">{ageDisplay(ageYears)}</p>}
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <label className="text-[11px] sm:text-xs font-semibold uppercase tracking-wide text-gray-500">Etap życia</label>
            <div className="relative flex items-center w-full">
              <select
                value={lifeStage}
                onChange={(e) => setLifeStage(e.target.value)}
                className="w-full appearance-none bg-white border border-gray-200 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-dark/30 focus:border-brand-dark pr-10"
              >
                <option value="">Wybierz etap życia</option>
                {lifeStageOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <label className="text-[11px] sm:text-xs font-semibold uppercase tracking-wide text-gray-500">Aktywność</label>
            <div className="relative flex items-center w-full">
              <select
                value={activity}
                onChange={(e) => setActivity(e.target.value)}
                className="w-full appearance-none bg-white border border-gray-200 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-dark/30 focus:border-brand-dark pr-10"
              >
                {activityOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <label className="text-[11px] sm:text-xs font-semibold uppercase tracking-wide text-gray-500">Kondycja ciała</label>
            <div className="relative flex items-center w-full">
              <select
                value={bodyCondition}
                onChange={(e) => setBodyCondition(e.target.value)}
                className="w-full appearance-none bg-white border border-gray-200 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-dark/30 focus:border-brand-dark pr-10"
              >
                {Object.entries(bodyConditionLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <label className="text-[11px] sm:text-xs font-semibold uppercase tracking-wide text-gray-500">Cel żywieniowy</label>
            <div className="relative flex items-center w-full">
              <select
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className="w-full appearance-none bg-white border border-gray-200 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-dark/30 focus:border-brand-dark pr-10"
              >
                {Object.entries(goalLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <label className="text-[11px] sm:text-xs font-semibold uppercase tracking-wide text-gray-500">Liczba posiłków dziennie</label>
            <div className="relative flex items-center w-full">
              <select
                value={meals}
                onChange={(e) => setMeals(e.target.value)}
                className="w-full appearance-none bg-white border border-gray-200 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-dark/30 focus:border-brand-dark pr-10"
              >
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? 'posiłek' : 'posiłki'}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="flex items-center gap-3 md:col-span-2">
            <button
              type="button"
              onClick={() => setIsSterilized(!isSterilized)}
              className={`relative inline-flex h-5 sm:h-6 w-9 sm:w-11 items-center rounded-full transition-colors ${
                isSterilized ? 'bg-brand-dark' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-3.5 sm:h-4 w-3.5 sm:w-4 transform rounded-full bg-white transition-transform ${
                  isSterilized ? 'translate-x-5 sm:translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className="text-xs sm:text-sm text-gray-700">Zwierzę wykastrowane / sterylizowane</span>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl bg-red-50 text-red-700 border border-red-200">
            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
            <p className="text-xs sm:text-sm font-medium">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 sm:py-3.5 rounded-xl bg-brand-dark text-white text-sm sm:text-base font-medium hover:bg-brand-dark transition-all disabled:opacity-60"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flame className="w-4 h-4" />}
          Oblicz zapotrzebowanie
        </button>
      </form>

      {result && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-6 space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            <div className="relative w-24 h-24 sm:w-32 sm:h-32 flex-shrink-0">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                <Flame className="w-9 h-9 sm:w-12 sm:h-12 text-orange-500" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-brand-dark text-white flex items-center justify-center text-[10px] sm:text-xs font-semibold">
                {result.multiplier}x
              </div>
            </div>
            <div className="text-center sm:text-left flex-1">
              <p className="text-xs sm:text-sm text-gray-500 uppercase tracking-wide font-semibold mb-1">Dzienne zapotrzebowanie</p>
              <h3 className="text-3xl sm:text-4xl font-bold text-gray-900">{result.dailyCalories} <span className="text-lg sm:text-xl font-medium text-gray-500">kcal</span></h3>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                {result.mealsCount > 1 ? (
                  <>
                    {result.mealsCount} posiłki po <span className="font-semibold text-gray-900">{result.perMeal} kcal</span>
                  </>
                ) : (
                  'Jeden posiłek dziennie'
                )}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <div className="p-2 sm:p-3 rounded-xl bg-gray-50 text-center">
              <p className="text-lg sm:text-2xl font-semibold text-gray-700">{result.rer}</p>
              <p className="text-[10px] sm:text-xs text-gray-500">RER kcal</p>
            </div>
            <div className="p-2 sm:p-3 rounded-xl bg-gray-50 text-center">
              <p className="text-lg sm:text-2xl font-semibold text-gray-700">{result.weight}</p>
              <p className="text-[10px] sm:text-xs text-gray-500">kg</p>
            </div>
            <div className="p-2 sm:p-3 rounded-xl bg-gray-50 text-center">
              <p className="text-lg sm:text-2xl font-semibold text-gray-700">{result.breedFactor}</p>
              <p className="text-[10px] sm:text-xs text-gray-500">Mnożnik rasy</p>
            </div>
            <div className="p-2 sm:p-3 rounded-xl bg-gray-50 text-center">
              <p className="text-lg sm:text-2xl font-semibold text-gray-700">{result.isSterilized ? 'Tak' : 'Nie'}</p>
              <p className="text-[10px] sm:text-xs text-gray-500">Wykastrowane</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="p-3 sm:p-4 rounded-xl bg-brand-mint text-center">
              <p className="text-base sm:text-xl font-semibold text-brand-dark">{result.macros.protein}g</p>
              <p className="text-[10px] sm:text-xs text-brand-dark">Białko</p>
            </div>
            <div className="p-3 sm:p-4 rounded-xl bg-amber-50 text-center">
              <p className="text-base sm:text-xl font-semibold text-amber-700">{result.macros.fat}g</p>
              <p className="text-[10px] sm:text-xs text-amber-600">Tłuszcz</p>
            </div>
            <div className="p-3 sm:p-4 rounded-xl bg-brand-mint text-center">
              <p className="text-base sm:text-xl font-semibold text-brand-dark">{result.macros.carbs}g</p>
              <p className="text-[10px] sm:text-xs text-brand-dark">Węglowodany</p>
            </div>
          </div>

          {result.sportDiet && (
            <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl bg-brand-mint border border-emerald-200">
              <Dumbbell className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 text-brand-dark" />
              <p className="text-xs sm:text-sm text-brand-dark font-medium">
                Uwzględniono aktywną dietę sportową „{result.sportDiet.name}” (mnożnik x{result.sportDiet.multiplier})
              </p>
            </div>
          )}

          <div className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl bg-brand-dark/5 border border-brand-dark/20">
            <Info className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 text-brand-dark" />
            <p className="text-xs sm:text-sm text-gray-700">{result.recommendation}</p>
          </div>

          <button
            type="button"
            onClick={() => setResult(null)}
            className="w-full flex items-center justify-center gap-2 py-2.5 sm:py-3 rounded-xl border border-gray-200 text-gray-600 text-sm sm:text-base font-medium hover:bg-gray-50 transition-all"
          >
            <RefreshCw className="w-4 h-4" /> Oblicz ponownie
          </button>
        </div>
      )}
    </div>
  );
}
