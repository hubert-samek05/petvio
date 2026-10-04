'use client';

import { useEffect, useState, useCallback } from 'react';
import { recipeApi } from '@/lib/api';
import RecipeModal, { Recipe, speciesOptions, categoryOptions } from './RecipeModal';
import RecipeDetailModal from './RecipeDetailModal';
import {
  Plus,
  ChefHat,
  Heart,
  Lock,
  Globe2,
  Clock,
  Users,
  PawPrint,
  ChevronDown,
  Search,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

const categoryIcon: Record<string, string> = {
  main_meal: '🍲',
  treat: '🦴',
  cake: '🎂',
  barf: '🥩',
  snack: '🍪',
  other: '🍽️',
};

export default function Recipes() {
  const [activeTab, setActiveTab] = useState<'mine' | 'community'>('mine');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [speciesFilter, setSpeciesFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sort, setSort] = useState<'new' | 'popular'>('new');
  const [search, setSearch] = useState('');
  const [currentUserId, setCurrentUserId] = useState<number | undefined>(undefined);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [detailRecipe, setDetailRecipe] = useState<Recipe | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        setCurrentUserId(JSON.parse(userData).id);
      } catch {}
    }
  }, []);

  const fetchRecipes = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (activeTab === 'mine') {
        const data = await recipeApi.getMine({
          species: speciesFilter || undefined,
          category: categoryFilter || undefined,
        });
        setRecipes(data.recipes || []);
      } else {
        const data = await recipeApi.getCommunity({
          species: speciesFilter || undefined,
          category: categoryFilter || undefined,
          sort,
          search: search || undefined,
        });
        setRecipes(data.recipes || []);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Nie udało się pobrać przepisów');
    } finally {
      setLoading(false);
    }
  }, [activeTab, speciesFilter, categoryFilter, sort, search]);

  useEffect(() => {
    fetchRecipes();
  }, [fetchRecipes]);

  const handleSaved = () => {
    fetchRecipes();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Czy na pewno chcesz usunąć ten przepis?')) return;
    try {
      await recipeApi.delete(id);
      setModalOpen(false);
      setDetailOpen(false);
      fetchRecipes();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Nie udało się usunąć przepisu');
    }
  };

  const openDetail = (recipe: Recipe) => {
    setDetailRecipe(recipe);
    setDetailOpen(true);
  };

  const openEditFromDetail = (recipe: Recipe) => {
    setDetailOpen(false);
    setEditingRecipe(recipe);
    setModalOpen(true);
  };

  const handleLikeChanged = (id: number, liked: boolean, likesCount: number) => {
    setRecipes((prev) => prev.map((r) => (r.id === id ? { ...r, is_liked: liked, likes_count: likesCount } : r)));
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-2xl w-full sm:w-fit">
        <button
          onClick={() => setActiveTab('mine')}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
            activeTab === 'mine' ? 'bg-white text-brand-dark shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <ChefHat className="w-4 h-4" /> Moje przepisy
        </button>
        <button
          onClick={() => setActiveTab('community')}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
            activeTab === 'community' ? 'bg-white text-brand-dark shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Sparkles className="w-4 h-4" /> Społeczność
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        {activeTab === 'community' && (
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Szukaj przepisu..."
              className="w-full bg-white border border-gray-200 rounded-2xl pl-11 pr-4 py-3 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-dark/20 focus:border-brand-dark/50"
            />
          </div>
        )}

        <div className="relative">
          <select
            value={speciesFilter}
            onChange={(e) => setSpeciesFilter(e.target.value)}
            className="appearance-none bg-white border border-gray-200 rounded-2xl pl-4 pr-10 py-3 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-dark/20 focus:border-brand-dark/50"
          >
            <option value="">Wszystkie zwierzęta</option>
            {speciesOptions.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>

        <div className="relative">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="appearance-none bg-white border border-gray-200 rounded-2xl pl-4 pr-10 py-3 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-dark/20 focus:border-brand-dark/50"
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

        {activeTab === 'community' && (
          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-2xl">
            <button
              onClick={() => setSort('new')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                sort === 'new' ? 'bg-white text-brand-dark shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Najnowsze
            </button>
            <button
              onClick={() => setSort('popular')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                sort === 'popular' ? 'bg-white text-brand-dark shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" /> Popularne
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium">{error}</div>
      )}

      {activeTab === 'mine' && (
        <button
          onClick={() => {
            setEditingRecipe(null);
            setModalOpen(true);
          }}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-brand-dark text-white font-medium hover:bg-brand-dark transition-all shadow-md shadow-brand-dark/20"
        >
          <Plus className="w-4 h-4" /> Dodaj nowy przepis
        </button>
      )}

      {loading ? (
        <div className="text-center py-16 text-gray-500">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-[#1B6B4A] rounded-full animate-spin mx-auto mb-4" />
          Ładowanie przepisów...
        </div>
      ) : recipes.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-2xl bg-gray-50 border border-gray-200 border-dashed">
          <ChefHat className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">
            {activeTab === 'mine' ? 'Nie masz jeszcze żadnych przepisów' : 'Brak publicznych przepisów spełniających kryteria'}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {activeTab === 'mine' ? 'Dodaj swój pierwszy przepis dla pupila!' : 'Spróbuj zmienić filtry wyszukiwania'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {recipes.map((recipe) => (
            <button
              key={recipe.id}
              onClick={() => openDetail(recipe)}
              className="text-left p-5 rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow-md hover:border-brand-dark/30 transition-all flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-brand-dark to-brand flex items-center justify-center text-xl flex-shrink-0">
                  {categoryIcon[recipe.category] || '🍽️'}
                </div>
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full ${
                    recipe.visibility === 'public' ? 'bg-brand-mint text-brand-dark' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {recipe.visibility === 'public' ? <Globe2 className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                  {recipe.visibility === 'public' ? 'Publiczny' : 'Prywatny'}
                </span>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 line-clamp-2">{recipe.title}</h3>
                {recipe.description && (
                  <p className="text-sm text-gray-500 line-clamp-2 mt-1">{recipe.description}</p>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap text-xs text-gray-500">
                <span className="inline-flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-full">
                  <PawPrint className="w-3 h-3" /> {speciesOptions.find((s) => s.value === recipe.species)?.label}
                </span>
                {recipe.prep_time_minutes ? (
                  <span className="inline-flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-full">
                    <Clock className="w-3 h-3" /> {recipe.prep_time_minutes} min
                  </span>
                ) : null}
                {recipe.servings ? (
                  <span className="inline-flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-full">
                    <Users className="w-3 h-3" /> {recipe.servings}
                  </span>
                ) : null}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                {activeTab === 'community' && (
                  <span className="text-xs text-gray-400 truncate max-w-[60%]">
                    {[recipe.author_first_name, recipe.author_last_name].filter(Boolean).join(' ')}
                  </span>
                )}
                <span
                  className={`inline-flex items-center gap-1.5 text-sm font-medium ${
                    recipe.is_liked ? 'text-red-500' : 'text-gray-400'
                  } ${activeTab === 'mine' ? 'ml-auto' : ''}`}
                >
                  <Heart className={`w-4 h-4 ${recipe.is_liked ? 'fill-red-500' : ''}`} /> {recipe.likes_count}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      <RecipeModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
        onDelete={handleDelete}
        editingRecipe={editingRecipe}
      />

      <RecipeDetailModal
        isOpen={detailOpen}
        onClose={() => setDetailOpen(false)}
        recipe={detailRecipe}
        currentUserId={currentUserId}
        onEdit={openEditFromDetail}
        onDelete={handleDelete}
        onLikeChanged={handleLikeChanged}
      />
    </div>
  );
}
