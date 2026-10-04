'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { recipeApi } from '@/lib/api';
import {
  X,
  Heart,
  Clock,
  Users,
  Flame,
  Lock,
  Globe2,
  Pencil,
  Trash2,
  PawPrint,
  Loader2,
  ChefHat,
} from 'lucide-react';
import { Recipe, speciesOptions, categoryOptions, difficultyOptions } from './RecipeModal';

type RecipeDetailModalProps = {
  isOpen: boolean;
  onClose: () => void;
  recipe: Recipe | null;
  currentUserId?: number;
  onEdit?: (recipe: Recipe) => void;
  onDelete?: (id: number) => void;
  onLikeChanged?: (id: number, liked: boolean, likesCount: number) => void;
};

export default function RecipeDetailModal({
  isOpen,
  onClose,
  recipe,
  currentUserId,
  onEdit,
  onDelete,
  onLikeChanged,
}: RecipeDetailModalProps) {
  const [liking, setLiking] = useState(false);
  const [localLiked, setLocalLiked] = useState(false);
  const [localCount, setLocalCount] = useState(0);

  useEffect(() => {
    if (recipe) {
      setLocalLiked(!!recipe.is_liked);
      setLocalCount(recipe.likes_count || 0);
    }
  }, [recipe]);

  useEffect(() => {
    if (!isOpen) return;
    const scrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    document.documentElement.style.touchAction = 'none';

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);

    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      document.body.style.touchAction = '';
      document.documentElement.style.touchAction = '';
      window.scrollTo(0, scrollY);
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !recipe) return null;

  const isOwner = currentUserId === recipe.user_id;
  const speciesLabel = speciesOptions.find((s) => s.value === recipe.species)?.label || recipe.species;
  const categoryLabel = categoryOptions.find((c) => c.value === recipe.category)?.label || recipe.category;
  const difficultyLabel = difficultyOptions.find((d) => d.value === recipe.difficulty)?.label || recipe.difficulty;
  const authorName = [recipe.author_first_name, recipe.author_last_name].filter(Boolean).join(' ');
  const createdDate = new Date(recipe.created_at).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });

  const handleLike = async () => {
    setLiking(true);
    try {
      const data = await recipeApi.toggleLike(recipe.id);
      setLocalLiked(data.liked);
      setLocalCount(data.likesCount);
      onLikeChanged?.(recipe.id, data.liked, data.likesCount);
    } catch {
      // silent fail on like toggle
    } finally {
      setLiking(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto overscroll-y-contain bg-white rounded-3xl shadow-2xl animate-in fade-in zoom-in-95 duration-300">
        <div className="relative bg-gradient-to-br from-brand-dark via-brand to-emerald-800 rounded-t-3xl px-5 sm:px-8 pt-6 sm:pt-8 pb-6 text-white">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 transition-all flex items-center justify-center"
            aria-label="Zamknij"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center flex-shrink-0">
              <ChefHat className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wide text-white/70 font-semibold flex items-center gap-1.5">
                {recipe.visibility === 'public' ? <Globe2 className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                {recipe.visibility === 'public' ? 'Przepis publiczny' : 'Przepis prywatny'}
              </p>
              <h2 className="text-xl sm:text-2xl font-semibold break-words">{recipe.title}</h2>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap text-sm text-white/85">
            <span className="inline-flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full">
              <PawPrint className="w-3.5 h-3.5" /> {speciesLabel}
            </span>
            <span className="inline-flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full">{categoryLabel}</span>
            <span className="inline-flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full">{difficultyLabel}</span>
            {authorName && recipe.visibility === 'public' && !isOwner && (
              <span className="inline-flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full">Autor: {authorName}</span>
            )}
          </div>
        </div>

        <div className="px-5 sm:px-8 py-6 space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              {recipe.prep_time_minutes ? (
                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                  <Clock className="w-4 h-4 text-brand-dark" /> {recipe.prep_time_minutes} min
                </div>
              ) : null}
              {recipe.servings ? (
                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                  <Users className="w-4 h-4 text-brand-dark" /> {recipe.servings} porcje
                </div>
              ) : null}
              {recipe.calories_per_serving ? (
                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                  <Flame className="w-4 h-4 text-brand-dark" /> {recipe.calories_per_serving} kcal/porcję
                </div>
              ) : null}
            </div>

            <button
              onClick={handleLike}
              disabled={liking}
              className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm transition-all disabled:opacity-60 ${
                localLiked ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
              }`}
            >
              {liking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Heart className={`w-4 h-4 ${localLiked ? 'fill-red-500 text-red-500' : ''}`} />}
              {localCount}
            </button>
          </div>

          {recipe.description && (
            <p className="text-sm text-gray-600 italic border-l-4 border-brand-dark/20 pl-4">{recipe.description}</p>
          )}

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Składniki</p>
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 whitespace-pre-line text-sm text-gray-700">
              {recipe.ingredients}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Przygotowanie</p>
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 whitespace-pre-line text-sm text-gray-700">
              {recipe.instructions}
            </div>
          </div>

          <p className="text-xs text-gray-400">Dodano {createdDate}</p>

          {isOwner && (
            <div className="flex gap-3 pt-2 border-t border-gray-100">
              {onDelete && (
                <button
                  onClick={() => onDelete(recipe.id)}
                  className="flex items-center gap-2 text-red-600 hover:bg-red-50 px-6 py-3 rounded-full font-medium transition-all"
                >
                  <Trash2 className="w-4 h-4" /> Usuń
                </button>
              )}
              {onEdit && (
                <button
                  onClick={() => onEdit(recipe)}
                  className="flex-1 flex items-center justify-center gap-2 bg-brand-dark hover:bg-brand-dark text-white py-3 rounded-full font-medium shadow-md shadow-brand-dark/20 transition-all"
                >
                  <Pencil className="w-4 h-4" /> Edytuj przepis
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
