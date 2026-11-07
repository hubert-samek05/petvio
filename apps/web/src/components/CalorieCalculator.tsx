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
  Dumbbell,
  Dog,
  Cat,
  Scale,
  Calendar,
  Activity,
  Target,
  UtensilsCrossed,
  Baby,
  HeartPulse,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Minus,
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

const activityLabels: Record<string, string> = {
  sedentary: 'Siedzący',
  low: 'Niska',
  moderate: 'Umiarkowana',
  active: 'Wysoka',
  very_active: 'Bardzo wysoka',
  working: 'Pies pracujący',
};

const lifeStageLabels: Record<string, string> = {
  puppy_under_4mo: 'Szczeniak (0-4 mies.)',
  puppy_4_12mo: 'Szczeniak (4-12 mies.)',
  kitten_under_4mo: 'Kociak (0-4 mies.)',
  kitten_4_12mo: 'Kociak (4-12 mies.)',
  adult: 'Dorosły',
  senior: 'Senior',
  pregnant: 'Ciężarna',
  lactating: 'Karmiąca',
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
  if (!y || y < 0) return '';
  if (y < 1) return `${Math.round(y * 12)} mies.`;
  const fullYears = Math.floor(y);
  const months = Math.round((y - fullYears) * 12);
  if (months === 0) return `${fullYears} ${fullYears === 1 ? 'rok' : fullYears < 5 ? 'lata' : 'lat'}`;
  return `${fullYears} ${fullYears === 1 ? 'rok' : fullYears < 5 ? 'lata' : 'lat'} ${months} mies.`;
}

function FieldLabel({ icon: Icon, children }: { icon: any; children: React.ReactNode }) {
  return (
    <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-1.5">
      <Icon className="w-3.5 h-3.5" /> {children}
    </label>
  );
}

function SelectField({
  value,
  onChange,
  children,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-4 focus:ring-brand/10 focus:border-brand pr-10"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {children}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
    </div>
  );
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
        // ignoruj — formularz działa też ręcznie
      }
    };
    loadData();
  }, []);

  const [petSpeciesWarn, setPetSpeciesWarn] = useState(false);

  useEffect(() => {
    const pet = pets.find((p) => p.id.toString() === selectedPetId);
    if (!pet) {
      setPetSpeciesWarn(false);
      return;
    }

    const petSpecies = pet.species === 'cat' ? 'cat' : pet.species === 'dog' ? 'dog' : null;
    setPetSpeciesWarn(petSpecies === null);
    setSpecies(petSpecies ?? 'dog');

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
      setLifeStage(inferLifeStage(petSpecies ?? 'dog', months));
    } else {
      setAgeYears('');
      setLifeStage('');
    }
  }, [selectedPetId, pets]);

  // Etap życia: puppy_* ↔ kitten_* przy zmianie gatunku
  useEffect(() => {
    if (species === 'cat' && lifeStage.startsWith('puppy')) {
      setLifeStage(lifeStage.replace('puppy', 'kitten'));
    } else if (species === 'dog' && lifeStage.startsWith('kitten')) {
      setLifeStage(lifeStage.replace('kitten', 'puppy'));
    }
  }, [species, lifeStage]);

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
      try { navigator.vibrate?.(80); } catch {}
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Wystąpił błąd podczas obliczeń');
    } finally {
      setLoading(false);
    }
  };

  const currentBreeds = species === 'cat' ? breeds.cat : breeds.dog;
  const activityOptions = getActivityOptions(species);
  const lifeStageOptions = getLifeStageOptions(species);
  const selectedPet = pets.find((p) => p.id.toString() === selectedPetId);

  const goalIcons: Record<string, any> = {
    lose: TrendingDown,
    maintain: Minus,
    gain: TrendingUp,
  };

  const macroTotal = result ? result.macros.protein + result.macros.fat + result.macros.carbs : 0;

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-500 via-amber-500 to-orange-600 p-5 sm:p-6 text-white shadow-lg shadow-orange-500/20">
        <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full bg-white/10" />
        <div className="absolute -bottom-10 -left-6 w-28 h-28 rounded-full bg-white/10" />
        <div className="relative flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-serif text-xl font-normal">Spersonalizowana dieta</h2>
            <p className="text-xs text-white/85 mt-0.5">
              RER × mnożniki: gatunek, rasa, wiek, aktywność, kondycja, cel
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleCalculate} className="space-y-4">
        {/* Wybór pupila — chips */}
        {pets.length > 0 && (
          <div className="pv-card p-4">
            <FieldLabel icon={PawPrint}>Dla kogo liczymy?</FieldLabel>
            <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-1 px-1 py-1">
              <button
                type="button"
                onClick={() => setSelectedPetId('')}
                className={`pv-chip flex-shrink-0 ${!selectedPetId ? '!bg-brand-dark !text-white !border-brand-dark' : ''}`}
              >
                <Sparkles className="w-3.5 h-3.5" /> Ręcznie
              </button>
              {pets.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedPetId(p.id.toString())}
                  className={`pv-chip flex-shrink-0 ${selectedPetId === p.id.toString() ? '!bg-brand-dark !text-white !border-brand-dark' : ''}`}
                >
                  {p.species === 'cat' ? <Cat className="w-3.5 h-3.5" /> : p.species === 'dog' ? <Dog className="w-3.5 h-3.5" /> : <PawPrint className="w-3.5 h-3.5" />}
                  {p.name}
                </button>
              ))}
            </div>
            {selectedPet && (
              <p className="text-[11px] text-gray-400 mt-2">
                Dane z profilu: {selectedPet.breed || 'rasa nieznana'} • {selectedPet.weight || '?'} kg
                {selectedPet.birth_date ? ` • ${ageDisplay(ageYears)}` : ''}
              </p>
            )}
            {petSpeciesWarn && selectedPet && (
              <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5 mt-2">
                Kalkulator liczy dokładnie dla psów i kotów — wynik dla tego pupila będzie tylko orientacyjny.
              </p>
            )}
          </div>
        )}

        {/* Gatunek */}
        <div className="pv-card p-4">
          <FieldLabel icon={PawPrint}>Gatunek</FieldLabel>
          <div className="grid grid-cols-2 gap-2">
            {([
              { value: 'dog', label: 'Pies', Icon: Dog },
              { value: 'cat', label: 'Kot', Icon: Cat },
            ] as const).map(({ value, label, Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setSpecies(value)}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                  species === value
                    ? 'bg-brand-dark text-white border-brand-dark shadow-md'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-brand-dark/40'
                }`}
              >
                <Icon className="w-4.5 h-4.5" /> {label}
              </button>
            ))}
          </div>
        </div>

        {/* Rasa + waga + wiek */}
        <div className="pv-card p-4 space-y-4">
          <div>
            <FieldLabel icon={PawPrint}>Rasa</FieldLabel>
            <SelectField value={breed} onChange={setBreed}>
              {currentBreeds.map((b) => (
                <option key={b.value} value={b.value}>{b.label}</option>
              ))}
            </SelectField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel icon={Scale}>Waga (kg)</FieldLabel>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="np. 12.5"
                required
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-4 focus:ring-brand/10 focus:border-brand"
              />
            </div>
            <div>
              <FieldLabel icon={Calendar}>Wiek (lata)</FieldLabel>
              <input
                type="number"
                step="0.1"
                min="0"
                value={ageYears}
                onChange={(e) => setAgeYears(e.target.value)}
                placeholder="np. 3.5"
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-4 focus:ring-brand/10 focus:border-brand"
              />
              {ageYears && <p className="text-[11px] text-gray-400 mt-1">{ageDisplay(ageYears)}</p>}
            </div>
          </div>
        </div>

        {/* Etap życia + aktywność */}
        <div className="pv-card p-4 space-y-4">
          <div>
            <FieldLabel icon={Baby}>Etap życia</FieldLabel>
            <SelectField value={lifeStage} onChange={setLifeStage} placeholder="Wybierz etap życia">
              {lifeStageOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </SelectField>
          </div>
          <div>
            <FieldLabel icon={Activity}>Aktywność</FieldLabel>
            <SelectField value={activity} onChange={setActivity}>
              {activityOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </SelectField>
          </div>
        </div>

        {/* Kondycja + cel + posiłki */}
        <div className="pv-card p-4 space-y-4">
          <div>
            <FieldLabel icon={HeartPulse}>Kondycja ciała</FieldLabel>
            <div className="flex gap-1.5 overflow-x-auto scrollbar-none -mx-1 px-1 py-1">
              {Object.entries(bodyConditionLabels).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setBodyCondition(value)}
                  className={`pv-chip flex-shrink-0 !px-3.5 !py-2 !text-xs ${
                    bodyCondition === value ? '!bg-brand-dark !text-white !border-brand-dark' : ''
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <FieldLabel icon={Target}>Cel żywieniowy</FieldLabel>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(goalLabels).map(([value, label]) => {
                const GIcon = goalIcons[value];
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setGoal(value)}
                    className={`flex flex-col items-center gap-1 py-3 px-2 rounded-xl border-2 text-[11px] font-semibold transition-all ${
                      goal === value
                        ? 'bg-brand-dark text-white border-brand-dark shadow-md'
                        : 'bg-white text-gray-500 border-gray-200 hover:border-brand-dark/40'
                    }`}
                  >
                    <GIcon className="w-4 h-4" />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 items-end">
            <div>
              <FieldLabel icon={UtensilsCrossed}>Posiłków dziennie</FieldLabel>
              <SelectField value={meals} onChange={setMeals}>
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>{n} {n === 1 ? 'posiłek' : 'posiłki'}</option>
                ))}
              </SelectField>
            </div>
            <div className="flex items-center gap-2.5 pb-1">
              <button
                type="button"
                onClick={() => setIsSterilized(!isSterilized)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                  isSterilized ? 'bg-brand-dark' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isSterilized ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className="text-xs text-gray-600 leading-tight">Wykastrowane / sterylizowane</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-50 text-red-700 border border-red-100">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !weight}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold shadow-lg shadow-orange-500/30 hover:shadow-xl transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Flame className="w-5 h-5" />}
          Oblicz zapotrzebowanie
        </button>
      </form>

      {/* ====== WYNIK ====== */}
      {result && (
        <div className="space-y-4 animate-slide-up">
          {/* Główna liczba */}
          <div className="pv-card overflow-hidden">
            <div className="bg-gradient-to-br from-orange-500 to-amber-600 p-6 text-white text-center relative">
              <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/10" />
              <p className="text-xs font-bold uppercase tracking-widest text-white/80">Dzienne zapotrzebowanie</p>
              <p className="text-5xl font-bold mt-2">{result.dailyCalories}</p>
              <p className="text-sm text-white/85 font-medium">kcal / dzień</p>
              <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold">
                <Flame className="w-3.5 h-3.5" /> mnożnik ×{result.multiplier}
              </div>
            </div>

            <div className="grid grid-cols-3 divide-x divide-gray-100">
              <div className="p-3.5 text-center">
                <p className="text-xl font-bold text-gray-800">{result.rer}</p>
                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">RER kcal</p>
              </div>
              <div className="p-3.5 text-center">
                <p className="text-xl font-bold text-gray-800">{result.perMeal}</p>
                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">kcal / posiłek</p>
              </div>
              <div className="p-3.5 text-center">
                <p className="text-xl font-bold text-gray-800">{result.mealsCount}×</p>
                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">posiłki</p>
              </div>
            </div>
          </div>

          {/* Makra z paskami */}
          <div className="pv-card p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-4">Rozkład makroskładników</p>
            <div className="space-y-3.5">
              {([
                { key: 'protein', label: 'Białko', grams: result.macros.protein, color: 'bg-brand-dark', text: 'text-brand-dark' },
                { key: 'fat', label: 'Tłuszcz', grams: result.macros.fat, color: 'bg-amber-500', text: 'text-amber-600' },
                { key: 'carbs', label: 'Węglowodany', grams: result.macros.carbs, color: 'bg-orange-400', text: 'text-orange-600' },
              ]).map((m) => (
                <div key={m.key}>
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="text-xs font-semibold text-gray-600">{m.label}</span>
                    <span className={`text-sm font-bold ${m.text}`}>{m.grams} g</span>
                  </div>
                  <div className="pv-progress">
                    <div
                      className={`pv-progress-fill !bg-none ${m.color}`}
                      style={{ width: `${macroTotal ? Math.round((m.grams / macroTotal) * 100) : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Co wpłynęło na wynik */}
          <div className="pv-card p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-3">Co uwzględniono</p>
            <div className="flex flex-wrap gap-1.5">
              {[
                result.species === 'cat' ? 'Kot' : 'Pies',
                `${result.weight} kg`,
                result.ageMonths < 12 ? `${result.ageMonths} mies.` : `${Math.floor(result.ageMonths / 12)} lat`,
                lifeStageLabels[result.lifeStage] || result.lifeStage,
                activityLabels[result.activity] || result.activity,
                bodyConditionLabels[result.bodyCondition] || result.bodyCondition,
                goalLabels[result.goal] || result.goal,
                result.isSterilized ? 'Sterylizowane' : null,
                result.breedFactor !== 1 ? `Rasa ×${result.breedFactor}` : null,
              ].filter(Boolean).map((chip, i) => (
                <span key={i} className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 text-[11px] font-semibold">
                  {chip}
                </span>
              ))}
            </div>
          </div>

          {result.sportDiet && (
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-brand-mint border border-emerald-200">
              <Dumbbell className="w-5 h-5 flex-shrink-0 text-brand-dark" />
              <p className="text-sm text-brand-dark font-medium">
                Uwzględniono aktywną dietę sportową „{result.sportDiet.name}” (mnożnik ×{result.sportDiet.multiplier})
              </p>
            </div>
          )}

          {/* Rekomendacja */}
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-brand-dark/5 border border-brand-dark/15">
            <Info className="w-5 h-5 flex-shrink-0 text-brand-dark mt-0.5" />
            <p className="text-sm text-gray-700 leading-relaxed">{result.recommendation}</p>
          </div>

          <button
            type="button"
            onClick={() => setResult(null)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-full border-2 border-gray-200 text-gray-600 font-semibold text-sm hover:bg-brand-mint/60 hover:border-brand/30 transition-all"
          >
            <RefreshCw className="w-4 h-4" /> Oblicz ponownie
          </button>
        </div>
      )}
    </div>
  );
}
