'use client';

import { useEffect, useMemo, useState } from 'react';
import { petApi, barfApi } from '@/lib/api';
import {
  Scale,
  Activity,
  ChevronDown,
  Beef,
  Bone,
  Leaf,
  Flame,
  Utensils,
  Save,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sparkles,
  Pill,
  Plus,
  Trash2,
  ShieldAlert,
} from 'lucide-react';

const activityOptions = [
  { value: 'puppy', label: 'Szczenię / kocię (wzrost)', pct: 5 },
  { value: 'active', label: 'Aktywny dorosły', pct: 3 },
  { value: 'moderate', label: 'Umiarkowanie aktywny', pct: 2.5 },
  { value: 'senior', label: 'Senior', pct: 2 },
  { value: 'weight_loss', label: 'Odchudzanie', pct: 1.5 },
];

const ratioModelOptions = [
  { value: 'standard', label: 'Standardowy 80/10/10', hint: '80% mięso · 10% kość · 5% wątroba · 5% inne narządy' },
  { value: 'adjusted', label: 'Zmodyfikowany (z warzywami)', hint: '70% mięso · 10% kość · 5% wątroba · 5% narządy · 10% warzywa/owoce' },
  { value: 'senior_light', label: 'Lekki dla seniora', hint: '75% mięso · 10% kość · 5% wątroba · 5% narządy · 5% warzywa' },
  { value: 'custom', label: 'Własne proporcje', hint: 'Ustaw dowolne proporcje sumujące się do 100%' },
];

const RATIO_PRESETS: Record<string, { musclePct: number; bonePct: number; liverPct: number; otherOrganPct: number; vegFruitPct: number }> = {
  standard: { musclePct: 80, bonePct: 10, liverPct: 5, otherOrganPct: 5, vegFruitPct: 0 },
  adjusted: { musclePct: 70, bonePct: 10, liverPct: 5, otherOrganPct: 5, vegFruitPct: 10 },
  senior_light: { musclePct: 75, bonePct: 10, liverPct: 5, otherOrganPct: 5, vegFruitPct: 5 },
};

const CALORIES_PER_GRAM = 1.5;

function computeLocal(weightKg: number, activityLevel: string, ratios: { musclePct: number; bonePct: number; liverPct: number; otherOrganPct: number; vegFruitPct: number }, mealsPerDay: number) {
  const activity = activityOptions.find((a) => a.value === activityLevel) || activityOptions[1];
  const dailyFoodGrams = weightKg * 1000 * (activity.pct / 100);
  const total = ratios.musclePct + ratios.bonePct + ratios.liverPct + ratios.otherOrganPct + ratios.vegFruitPct;
  const norm = (pct: number) => (total > 0 ? (pct / total) * 100 : 0);

  const musclePct = norm(ratios.musclePct);
  const bonePct = norm(ratios.bonePct);
  const liverPct = norm(ratios.liverPct);
  const otherOrganPct = norm(ratios.otherOrganPct);
  const vegFruitPct = norm(ratios.vegFruitPct);

  const muscleMeatGrams = dailyFoodGrams * (musclePct / 100);
  const boneGrams = dailyFoodGrams * (bonePct / 100);
  const liverGrams = dailyFoodGrams * (liverPct / 100);
  const otherOrganGrams = dailyFoodGrams * (otherOrganPct / 100);
  const vegFruitGrams = dailyFoodGrams * (vegFruitPct / 100);
  const caloriesTarget = Math.round(dailyFoodGrams * CALORIES_PER_GRAM);
  const perMealGrams = mealsPerDay > 0 ? dailyFoodGrams / mealsPerDay : dailyFoodGrams;

  return {
    dailyPct: activity.pct,
    dailyFoodGrams: Math.round(dailyFoodGrams * 10) / 10,
    muscleMeatGrams: Math.round(muscleMeatGrams * 10) / 10,
    boneGrams: Math.round(boneGrams * 10) / 10,
    liverGrams: Math.round(liverGrams * 10) / 10,
    otherOrganGrams: Math.round(otherOrganGrams * 10) / 10,
    vegFruitGrams: Math.round(vegFruitGrams * 10) / 10,
    caloriesTarget,
    perMealGrams: Math.round(perMealGrams * 10) / 10,
  };
}

interface Supplement {
  name: string;
  amount: number | '';
  unit: string;
  source: 'database' | 'custom';
  ingredientId?: number | null;
  notes?: string;
}

interface BarfPreset {
  activityLevel?: string;
  ratioModel?: string;
  customRatios?: { musclePct: number; bonePct: number; liverPct: number; otherOrganPct: number; vegFruitPct: number };
  mealsPerDay?: number;
}

export default function BarfCalculator({ preset }: { preset?: BarfPreset | null }) {
  const [pets, setPets] = useState<any[]>([]);
  const [selectedPetId, setSelectedPetId] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [activityLevel, setActivityLevel] = useState('active');
  const [ratioModel, setRatioModel] = useState('standard');
  const [customRatios, setCustomRatios] = useState({ musclePct: 80, bonePct: 10, liverPct: 5, otherOrganPct: 5, vegFruitPct: 0 });
  const [mealsPerDay, setMealsPerDay] = useState('2');
  const [activePlan, setActivePlan] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loadingPets, setLoadingPets] = useState(true);
  const [specialDietWarning, setSpecialDietWarning] = useState<string | null>(null);
  const [supplementOptions, setSupplementOptions] = useState<any[]>([]);
  const [supplements, setSupplements] = useState<Supplement[]>([]);
  const [customSupName, setCustomSupName] = useState('');
  const [customSupAmount, setCustomSupAmount] = useState('');
  const [customSupUnit, setCustomSupUnit] = useState('g');

  useEffect(() => {
    const load = async () => {
      try {
        const data = await petApi.getAll();
        setPets(data.pets || []);
        if (data.pets && data.pets.length > 0) {
          setSelectedPetId(data.pets[0].id.toString());
        }
      } catch {
        setError('Nie udało się pobrać listy zwierząt');
      } finally {
        setLoadingPets(false);
      }
    };
    load();
    barfApi.getIngredients({ category: 'supplement' }).then((data) => {
      setSupplementOptions(data.ingredients || []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!preset) return;
    if (preset.activityLevel) setActivityLevel(preset.activityLevel);
    if (preset.ratioModel) setRatioModel(preset.ratioModel);
    if (preset.customRatios) setCustomRatios(preset.customRatios);
    if (preset.mealsPerDay) setMealsPerDay(preset.mealsPerDay.toString());
  }, [preset]);

  useEffect(() => {
    const pet = pets.find((p) => p.id.toString() === selectedPetId);
    if (pet?.weight) setWeightKg(pet.weight.toString());
    if (!selectedPetId) return;

    barfApi.getPlanByPet(Number(selectedPetId)).then((data) => {
      setActivePlan(data.plan || null);
      setSpecialDietWarning(data.specialDietWarning || null);
      if (data.plan) {
        setWeightKg(data.plan.weight_kg?.toString() || '');
        setActivityLevel(data.plan.activity_level || 'active');
        setRatioModel(data.plan.ratio_model || 'standard');
        setMealsPerDay(data.plan.meals_per_day?.toString() || '2');
        if (data.plan.ratio_model === 'custom') {
          setCustomRatios({
            musclePct: parseFloat(data.plan.muscle_meat_pct),
            bonePct: parseFloat(data.plan.bone_pct),
            liverPct: parseFloat(data.plan.liver_pct),
            otherOrganPct: parseFloat(data.plan.other_organ_pct),
            vegFruitPct: parseFloat(data.plan.veg_fruit_pct),
          });
        }
        setSupplements(
          Array.isArray(data.plan.supplements)
            ? data.plan.supplements.map((s: any) => ({
                name: s.name,
                amount: s.amount ?? '',
                unit: s.unit || 'g',
                source: s.source || 'custom',
                ingredientId: s.ingredientId || null,
                notes: s.notes || '',
              }))
            : []
        );
      } else {
        setSupplements([]);
      }
    });
  }, [selectedPetId, pets]);

  const selectedPet = pets.find((p) => p.id.toString() === selectedPetId);

  const activeRatios = ratioModel === 'custom' ? customRatios : RATIO_PRESETS[ratioModel];
  const customSum = customRatios.musclePct + customRatios.bonePct + customRatios.liverPct + customRatios.otherOrganPct + customRatios.vegFruitPct;

  const preview = useMemo(() => {
    const w = parseFloat(weightKg);
    if (!w || w <= 0) return null;
    return computeLocal(w, activityLevel, activeRatios, parseInt(mealsPerDay, 10) || 2);
  }, [weightKg, activityLevel, activeRatios, mealsPerDay]);

  const handleSave = async () => {
    if (!selectedPetId || !weightKg || parseFloat(weightKg) <= 0) {
      setError('Wybierz zwierzę i podaj prawidłową wagę');
      return;
    }
    if (ratioModel === 'custom' && Math.abs(customSum - 100) > 0.5) {
      setError('Suma własnych proporcji musi wynosić 100%');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const data = await barfApi.savePlan({
        petId: Number(selectedPetId),
        weightKg: parseFloat(weightKg),
        activityLevel,
        ratioModel,
        customRatios: ratioModel === 'custom' ? customRatios : undefined,
        mealsPerDay: parseInt(mealsPerDay, 10) || 2,
        supplements: supplements.map((s) => ({
          name: s.name,
          amount: s.amount === '' ? null : Number(s.amount),
          unit: s.unit,
          source: s.source,
          ingredientId: s.ingredientId || null,
          notes: s.notes || null,
        })),
      });
      setActivePlan(data.plan);
      setSuccess('Plan BARF został zapisany i jest teraz aktywny dla tego zwierzęcia.');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Nie udało się zapisać planu BARF');
    } finally {
      setSaving(false);
    }
  };

  const handleRemovePlan = async () => {
    if (!selectedPetId) return;
    try {
      await barfApi.deletePlan(Number(selectedPetId));
      setActivePlan(null);
      setSuccess('Plan BARF został usunięty.');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Nie udało się usunąć planu BARF');
    }
  };

  const toggleDatabaseSupplement = (ingredient: any) => {
    setSupplements((prev) => {
      const exists = prev.find((s) => s.ingredientId === ingredient.id);
      if (exists) {
        return prev.filter((s) => s.ingredientId !== ingredient.id);
      }
      return [
        ...prev,
        {
          name: ingredient.name,
          amount: '',
          unit: 'g',
          source: 'database',
          ingredientId: ingredient.id,
          notes: ingredient.feeding_tip || '',
        },
      ];
    });
  };

  const updateSupplementAmount = (index: number, amount: string) => {
    setSupplements((prev) => prev.map((s, i) => (i === index ? { ...s, amount: amount === '' ? '' : Number(amount) } : s)));
  };

  const updateSupplementUnit = (index: number, unit: string) => {
    setSupplements((prev) => prev.map((s, i) => (i === index ? { ...s, unit } : s)));
  };

  const removeSupplement = (index: number) => {
    setSupplements((prev) => prev.filter((_, i) => i !== index));
  };

  const addCustomSupplement = () => {
    if (!customSupName.trim()) return;
    setSupplements((prev) => [
      ...prev,
      {
        name: customSupName.trim(),
        amount: customSupAmount === '' ? '' : Number(customSupAmount),
        unit: customSupUnit || 'g',
        source: 'custom',
        ingredientId: null,
        notes: '',
      },
    ]);
    setCustomSupName('');
    setCustomSupAmount('');
    setCustomSupUnit('g');
  };

  if (loadingPets) {
    return (
      <div className="text-center py-16 text-gray-500">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-[#1B6B4A] rounded-full animate-spin mx-auto mb-4" />
        Ładowanie...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium">{error}</div>
      )}
      {success && (
        <div className="p-4 rounded-2xl bg-brand-mint border border-emerald-100 text-brand-dark text-sm font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> {success}
        </div>
      )}
      {specialDietWarning && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-100 flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 font-medium">{specialDietWarning}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="space-y-4">
          <Field label="Zwierzę">
            <select
              value={selectedPetId}
              onChange={(e) => setSelectedPetId(e.target.value)}
              className="w-full bg-transparent text-gray-900 font-medium focus:outline-none"
            >
              {pets.map((pet) => (
                <option key={pet.id} value={pet.id}>
                  {pet.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Waga zwierzęcia (kg)">
            <div className="relative flex items-center w-full">
              <Scale className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
              <input
                type="number"
                step="0.1"
                min="0"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                placeholder="np. 15"
                className="w-full bg-transparent text-gray-900 font-medium placeholder:text-gray-400 focus:outline-none"
              />
            </div>
          </Field>

          <Field label="Poziom aktywności / etap życia">
            <div className="relative">
              <select
                value={activityLevel}
                onChange={(e) => setActivityLevel(e.target.value)}
                className="w-full bg-transparent text-gray-900 font-medium focus:outline-none appearance-none pr-6"
              >
                {activityOptions.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label} ({a.pct}% masy ciała)
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </Field>

          <Field label="Model proporcji BARF">
            <div className="relative">
              <select
                value={ratioModel}
                onChange={(e) => setRatioModel(e.target.value)}
                className="w-full bg-transparent text-gray-900 font-medium focus:outline-none appearance-none pr-6"
              >
                {ratioModelOptions.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            <p className="text-xs text-gray-400 mt-2">{ratioModelOptions.find((r) => r.value === ratioModel)?.hint}</p>
          </Field>

          {ratioModel === 'custom' && (
            <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Własne proporcje (%)</label>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${Math.abs(customSum - 100) < 0.5 ? 'bg-brand-mint text-brand-dark' : 'bg-red-50 text-red-600'}`}>
                  Suma: {customSum.toFixed(0)}%
                </span>
              </div>
              <RatioSlider label="Mięso mięśniowe" value={customRatios.musclePct} onChange={(v) => setCustomRatios({ ...customRatios, musclePct: v })} />
              <RatioSlider label="Kości mięsno-kostne" value={customRatios.bonePct} onChange={(v) => setCustomRatios({ ...customRatios, bonePct: v })} />
              <RatioSlider label="Wątroba" value={customRatios.liverPct} onChange={(v) => setCustomRatios({ ...customRatios, liverPct: v })} />
              <RatioSlider label="Inne narządy" value={customRatios.otherOrganPct} onChange={(v) => setCustomRatios({ ...customRatios, otherOrganPct: v })} />
              <RatioSlider label="Warzywa / owoce" value={customRatios.vegFruitPct} onChange={(v) => setCustomRatios({ ...customRatios, vegFruitPct: v })} />
            </div>
          )}

          <Field label="Liczba posiłków dziennie">
            <div className="relative flex items-center w-full">
              <Utensils className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
              <input
                type="number"
                min="1"
                max="6"
                value={mealsPerDay}
                onChange={(e) => setMealsPerDay(e.target.value)}
                className="w-full bg-transparent text-gray-900 font-medium focus:outline-none"
              />
            </div>
          </Field>

          <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Pill className="w-4 h-4 text-brand-dark" />
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Suplementy</label>
            </div>

            {supplementOptions.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs text-gray-500">Wybierz z bazy suplementów BARF:</p>
                <div className="flex flex-wrap gap-2">
                  {supplementOptions.map((opt) => {
                    const active = supplements.some((s) => s.ingredientId === opt.id);
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => toggleDatabaseSupplement(opt)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                          active
                            ? 'bg-brand-dark text-white border-brand-dark'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-brand-dark/50'
                        }`}
                      >
                        {opt.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {supplements.length > 0 && (
              <div className="space-y-2">
                {supplements.map((s, idx) => (
                  <div key={`${s.source}-${s.ingredientId ?? s.name}-${idx}`} className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                    <span className="text-sm text-gray-700 font-medium flex-1 truncate">{s.name}</span>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="ilość"
                      value={s.amount}
                      onChange={(e) => updateSupplementAmount(idx, e.target.value)}
                      className="w-20 text-sm bg-white border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-brand-dark/50"
                    />
                    <select
                      value={s.unit}
                      onChange={(e) => updateSupplementUnit(idx, e.target.value)}
                      className="text-sm bg-white border border-gray-200 rounded-lg px-1.5 py-1 focus:outline-none"
                    >
                      <option value="g">g</option>
                      <option value="ml">ml</option>
                      <option value="łyżeczka">łyżeczka</option>
                      <option value="kapsułka">kapsułka</option>
                      <option value="szczypta">szczypta</option>
                    </select>
                    <button type="button" onClick={() => removeSupplement(idx)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
              <input
                type="text"
                placeholder="Nazwa własnego suplementu"
                value={customSupName}
                onChange={(e) => setCustomSupName(e.target.value)}
                className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-dark/50"
              />
              <input
                type="number"
                step="0.1"
                min="0"
                placeholder="ilość"
                value={customSupAmount}
                onChange={(e) => setCustomSupAmount(e.target.value)}
                className="w-20 text-sm bg-gray-50 border border-gray-200 rounded-lg px-2 py-2 focus:outline-none"
              />
              <select
                value={customSupUnit}
                onChange={(e) => setCustomSupUnit(e.target.value)}
                className="text-sm bg-gray-50 border border-gray-200 rounded-lg px-1.5 py-2 focus:outline-none"
              >
                <option value="g">g</option>
                <option value="ml">ml</option>
                <option value="łyżeczka">łyżeczka</option>
                <option value="kapsułka">kapsułka</option>
                <option value="szczypta">szczypta</option>
              </select>
              <button
                type="button"
                onClick={addCustomSupplement}
                className="p-2 rounded-lg bg-brand-dark/10 text-brand-dark hover:bg-brand-dark/20 transition-all flex-shrink-0"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-brand-dark text-white font-medium hover:bg-brand-dark transition-all shadow-md shadow-brand-dark/20 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {activePlan ? 'Zapisz jako nowy aktywny plan' : 'Zapisz i aktywuj plan BARF'}
          </button>

          {activePlan && (
            <button
              onClick={handleRemovePlan}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl text-red-600 hover:bg-red-50 font-medium transition-all text-sm"
            >
              <XCircle className="w-4 h-4" /> Usuń aktywny plan dla {selectedPet?.name}
            </button>
          )}
        </div>

        {/* Preview */}
        <div className="space-y-4">
          {activePlan && (
            <div className="p-4 rounded-2xl bg-brand-mint border border-emerald-200 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-brand-dark flex-shrink-0" />
              <p className="text-sm text-brand-dark font-medium">
                {selectedPet?.name} ma aktywny plan BARF — widoczny również w Dzienniku karmienia.
              </p>
            </div>
          )}

          {preview ? (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 sm:p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-dark to-brand flex items-center justify-center text-white flex-shrink-0">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Dzienna dawka pokarmu</p>
                  <h3 className="text-2xl font-bold text-gray-900">
                    {preview.dailyFoodGrams} g <span className="text-sm font-medium text-gray-500">({preview.dailyPct}% masy ciała)</span>
                  </h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {mealsPerDay} posiłki × <span className="font-semibold text-gray-800">{preview.perMealGrams} g</span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <NutrientCard icon={Beef} label="Mięso mięśniowe" grams={preview.muscleMeatGrams} color="text-red-600" bg="bg-red-50" />
                <NutrientCard icon={Bone} label="Kości mięsno-kostne" grams={preview.boneGrams} color="text-gray-600" bg="bg-gray-50" />
                <NutrientCard icon={Activity} label="Wątroba" grams={preview.liverGrams} color="text-amber-700" bg="bg-amber-50" />
                <NutrientCard icon={Activity} label="Inne narządy" grams={preview.otherOrganGrams} color="text-orange-700" bg="bg-orange-50" />
                <NutrientCard icon={Leaf} label="Warzywa / owoce" grams={preview.vegFruitGrams} color="text-brand-dark" bg="bg-brand-mint" />
                <NutrientCard icon={Flame} label="Szacowane kcal" grams={preview.caloriesTarget} unit="kcal" color="text-brand-dark" bg="bg-brand-dark/10" />
              </div>

              {supplements.length > 0 && (
                <div className="p-4 rounded-xl bg-brand-dark/5 border border-brand-dark/10 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Pill className="w-3.5 h-3.5 text-brand-dark" />
                    <p className="text-xs font-semibold uppercase tracking-wide text-brand-dark">Suplementacja</p>
                  </div>
                  <ul className="text-sm text-gray-700 space-y-0.5">
                    {supplements.map((s, idx) => (
                      <li key={idx}>
                        {s.name}{s.amount !== '' ? ` — ${s.amount} ${s.unit}` : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex items-start gap-2 p-4 rounded-xl bg-amber-50 border border-amber-100">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  Wartości są szacunkowe (ok. {CALORIES_PER_GRAM} kcal/g surowego pokarmu). Wprowadzaj dietę BARF stopniowo i konsultuj z weterynarzem, szczególnie u szczeniąt dużych ras i zwierząt z chorobami przewlekłymi.
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 px-4 rounded-2xl bg-gray-50 border border-gray-200 border-dashed">
              <Scale className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Podaj wagę zwierzęcia, aby zobaczyć obliczony plan BARF</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-sm focus-within:border-brand-dark/50 focus-within:ring-2 focus-within:ring-[#1B6B4A]/10 transition-all">
      <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">{label}</label>
      {children}
    </div>
  );
}

function RatioSlider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-gray-600">{label}</span>
        <span className="text-sm font-semibold text-gray-900">{value}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[#1B6B4A]"
      />
    </div>
  );
}

function NutrientCard({
  icon: Icon,
  label,
  grams,
  unit = 'g',
  color,
  bg,
}: {
  icon: any;
  label: string;
  grams: number;
  unit?: string;
  color: string;
  bg: string;
}) {
  return (
    <div className={`p-3 rounded-xl ${bg}`}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={`w-3.5 h-3.5 ${color}`} />
        <span className="text-xs text-gray-600">{label}</span>
      </div>
      <p className={`text-lg font-semibold ${color}`}>
        {grams} {unit}
      </p>
    </div>
  );
}
