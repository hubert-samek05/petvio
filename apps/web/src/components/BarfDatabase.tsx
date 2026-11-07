'use client';

import { useEffect, useState, useCallback } from 'react';
import { barfApi } from '@/lib/api';
import {
  Search,
  ChevronDown,
  CheckCircle,
  AlertCircle,
  XCircle,
  Beef,
  Fish,
  Bone,
  Leaf,
  Apple,
  Droplet,
  Milk,
  Pill,
  Activity,
} from 'lucide-react';

const categoryOptions = [
  { value: 'muscle_meat', label: 'Mięso mięśniowe', icon: Beef },
  { value: 'fish', label: 'Ryby', icon: Fish },
  { value: 'liver', label: 'Wątroba', icon: Activity },
  { value: 'other_organ', label: 'Inne narządy', icon: Activity },
  { value: 'bone', label: 'Kości mięsno-kostne', icon: Bone },
  { value: 'vegetable', label: 'Warzywa', icon: Leaf },
  { value: 'fruit', label: 'Owoce', icon: Apple },
  { value: 'oil', label: 'Oleje', icon: Droplet },
  { value: 'dairy_egg', label: 'Nabiał i jajka', icon: Milk },
  { value: 'supplement', label: 'Suplementy', icon: Pill },
];

const statusStyle: Record<string, { bg: string; border: string; text: string; badge: string; label: string; icon: any }> = {
  good: { bg: 'bg-brand-mint', border: 'border-emerald-200', text: 'text-brand-dark', badge: 'bg-brand-light text-brand-dark border-emerald-200', label: 'Zalecane', icon: CheckCircle },
  caution: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700 border-amber-200', label: 'Ostrożnie', icon: AlertCircle },
  avoid: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', badge: 'bg-red-100 text-red-700 border-red-200', label: 'Unikać', icon: XCircle },
};

interface BarfIngredient {
  id: number;
  name: string;
  category: string;
  species: string;
  calories_per_100g: number | null;
  protein_per_100g: number | null;
  fat_per_100g: number | null;
  calcium_mg_per_100g: number | null;
  phosphorus_mg_per_100g: number | null;
  recommended_pct: string | null;
  description: string | null;
  feeding_tip: string | null;
  caution: string | null;
  status: 'good' | 'caution' | 'avoid';
}

export default function BarfDatabase() {
  const [ingredients, setIngredients] = useState<BarfIngredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [species, setSpecies] = useState('');
  const [status, setStatus] = useState('');

  const fetchIngredients = useCallback(async () => {
    setLoading(true);
    try {
      const data = await barfApi.getIngredients({
        category: category || undefined,
        species: species || undefined,
        status: status || undefined,
        search: search || undefined,
      });
      setIngredients(data.ingredients || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [category, species, status, search]);

  useEffect(() => {
    const timeout = setTimeout(fetchIngredients, 250);
    return () => clearTimeout(timeout);
  }, [fetchIngredients]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Szukaj składnika..."
            className="w-full bg-white border border-gray-200 rounded-2xl pl-11 pr-4 py-3 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-dark/20 focus:border-brand focus:ring-4 focus:ring-brand/10"
          />
        </div>

        <div className="relative">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="appearance-none bg-white border border-gray-200 rounded-2xl pl-4 pr-10 py-3 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-dark/20 focus:border-brand focus:ring-4 focus:ring-brand/10"
          >
            <option value="">Wszystkie kategorie</option>
            {categoryOptions.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>

        <div className="relative">
          <select
            value={species}
            onChange={(e) => setSpecies(e.target.value)}
            className="appearance-none bg-white border border-gray-200 rounded-2xl pl-4 pr-10 py-3 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-dark/20 focus:border-brand focus:ring-4 focus:ring-brand/10"
          >
            <option value="">Pies i kot</option>
            <option value="dog">Pies</option>
            <option value="cat">Kot</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>

        <div className="relative">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="appearance-none bg-white border border-gray-200 rounded-2xl pl-4 pr-10 py-3 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-dark/20 focus:border-brand focus:ring-4 focus:ring-brand/10"
          >
            <option value="">Wszystkie statusy</option>
            <option value="good">Zalecane</option>
            <option value="caution">Ostrożnie</option>
            <option value="avoid">Unikać</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {loading ? (
        <div className="space-y-4 animate-fade-in">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="pv-skeleton h-28 rounded-3xl" />
          ))}
        </div>
      ) : ingredients.length === 0 ? (
        <div className="pv-card p-14 text-center">
          <p className="text-gray-500 text-sm">Brak składników spełniających kryteria wyszukiwania</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {ingredients.map((ing) => {
            const style = statusStyle[ing.status] || statusStyle.good;
            const StatusIcon = style.icon;
            const CategoryIcon = categoryOptions.find((c) => c.value === ing.category)?.icon || Beef;
            return (
              <div key={ing.id} className={`p-5 rounded-2xl border ${style.border} ${style.bg} flex flex-col gap-3`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-mint flex items-center justify-center flex-shrink-0">
                      <CategoryIcon className="w-5 h-5 text-brand-dark" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{ing.name}</h3>
                      <p className="text-xs text-gray-500">
                        {categoryOptions.find((c) => c.value === ing.category)?.label}
                        {ing.recommended_pct ? ` · ${ing.recommended_pct}` : ''}
                      </p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full border ${style.badge} flex-shrink-0`}>
                    <StatusIcon className="w-3 h-3" /> {style.label}
                  </span>
                </div>

                {ing.description && <p className="text-sm text-gray-600">{ing.description}</p>}

                <div className="flex items-center gap-3 flex-wrap text-xs text-gray-500">
                  {ing.calories_per_100g != null && <span className="bg-white/70 px-2 py-1 rounded-full">{ing.calories_per_100g} kcal/100g</span>}
                  {ing.protein_per_100g != null && <span className="bg-white/70 px-2 py-1 rounded-full">B: {ing.protein_per_100g}g</span>}
                  {ing.fat_per_100g != null && <span className="bg-white/70 px-2 py-1 rounded-full">T: {ing.fat_per_100g}g</span>}
                  {ing.calcium_mg_per_100g != null && ing.calcium_mg_per_100g > 0 && (
                    <span className="bg-white/70 px-2 py-1 rounded-full">Ca: {ing.calcium_mg_per_100g}mg</span>
                  )}
                </div>

                {ing.feeding_tip && (
                  <p className="text-xs text-gray-600 border-l-2 border-brand-dark/30 pl-2">💡 {ing.feeding_tip}</p>
                )}
                {ing.caution && (
                  <p className={`text-xs font-medium border-l-2 pl-2 ${style.text} border-current`}>⚠️ {ing.caution}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
