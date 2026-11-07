'use client';

import { useState, useEffect } from 'react';
import { petApi, userPreferencesApi } from '@/lib/api';
import ConfirmModal from '@/components/ui/ConfirmModal';
import {
  Wallet,
  TrendingUp,
  Plus,
  Calendar,
  DollarSign,
  ShoppingCart,
  Heart,
  Scissors,
  Bone,
  Package,
  MoreHorizontal,
  X,
  Check,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  Trash2,
  PieChart
} from 'lucide-react';

interface Expense {
  id: string;
  petId: string;
  petName: string;
  category: 'food' | 'medical' | 'accessories' | 'hygiene' | 'toys' | 'other';
  amount: number;
  description: string;
  date: string;
}

interface Budget {
  petId: string;
  petName: string;
  monthlyLimit: number;
}

interface Pet {
  id: string;
  name: string;
  species: string;
}

const categories = [
  { id: 'food', name: 'Karma', icon: ShoppingCart, color: '#f97316' },
  { id: 'medical', name: 'Leczenie', icon: Heart, color: '#ef4444' },
  { id: 'accessories', name: 'Akcesoria', icon: Package, color: '#3b82f6' },
  { id: 'hygiene', name: 'Higiena', icon: Scissors, color: '#a855f7' },
  { id: 'toys', name: 'Zabawki', icon: Bone, color: '#ec4899' },
  { id: 'other', name: 'Inne', icon: MoreHorizontal, color: '#64748b' },
];

const stepLabels = ['Kategoria', 'Kwota', 'Opis', 'Data'];

// Budżet w user_preferences (per-konto, synchronizacja) + mirror lokalny na offline.
const PREFS_KEY = 'budget_data';
const persistLocal = (expenses: Expense[], budgets: Budget[]) => {
  try {
    localStorage.setItem('petExpenses', JSON.stringify(expenses));
    localStorage.setItem('petBudgets', JSON.stringify(budgets));
  } catch {}
};

export default function Budget() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPet, setSelectedPet] = useState<string | null>(null);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showSetBudget, setShowSetBudget] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [step, setStep] = useState(1);

  const [newExpense, setNewExpense] = useState({
    category: 'food' as const,
    amount: '',
    description: '',
    date: new Date().toISOString().slice(0, 10),
  });

  const [budgetAmount, setBudgetAmount] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [syncError, setSyncError] = useState('');

  // Zapis: serwer (per-konto) + mirror lokalny. Błąd serwera nie gubi danych.
  const persist = (updatedExpenses: Expense[], updatedBudgets: Budget[]) => {
    setExpenses(updatedExpenses);
    setBudgets(updatedBudgets);
    persistLocal(updatedExpenses, updatedBudgets);
    setSyncError('');
    userPreferencesApi
      .set(PREFS_KEY, { expenses: updatedExpenses, budgets: updatedBudgets })
      .catch(() => setSyncError('Nie udało się zsynchronizować z serwerem — zmiany zapisane tylko na tym urządzeniu.'));
  };

  // ESC zamyka modale
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowAddExpense(false);
        setShowSetBudget(false);
        setStep(1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (showAddExpense || showSetBudget) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      document.body.classList.add('modal-open');
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      document.body.classList.remove('modal-open');
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      document.body.classList.remove('modal-open');
    };
  }, [showAddExpense, showSetBudget]);

  useEffect(() => {
    petApi
      .getAll()
      .then((res) => {
        const list = (res.pets || res || []).map((p: any) => ({
          id: String(p.id),
          name: p.name,
          species: p.species,
        }));
        setPets(list);
        if (list.length > 0) setSelectedPet(list[0].id);
      })
      .catch(() => setPets([]));

    // Ładowanie: serwer wygrywa, fallback na mirror lokalny
    (async () => {
      let serverExpenses: Expense[] | null = null;
      let serverBudgets: Budget[] | null = null;
      try {
        const res = await userPreferencesApi.get(PREFS_KEY);
        if (res?.value) {
          if (Array.isArray(res.value.expenses)) serverExpenses = res.value.expenses;
          if (Array.isArray(res.value.budgets)) serverBudgets = res.value.budgets;
        }
      } catch {}
      try {
        if (serverExpenses !== null || serverBudgets !== null) {
          setExpenses(serverExpenses || []);
          setBudgets(serverBudgets || []);
          persistLocal(serverExpenses || [], serverBudgets || []);
        } else {
          const le = JSON.parse(localStorage.getItem('petExpenses') || '[]');
          const lb = JSON.parse(localStorage.getItem('petBudgets') || '[]');
          setExpenses(Array.isArray(le) ? le : []);
          setBudgets(Array.isArray(lb) ? lb : []);
          if ((le.length || lb.length) && (serverExpenses === null && serverBudgets === null)) {
            userPreferencesApi.set(PREFS_KEY, { expenses: le, budgets: lb }).catch(() => {});
          }
        }
      } catch {}
    })();
  }, []);

  const currentPet = pets.find(p => p.id === selectedPet);
  const currentBudget = budgets.find(b => b.petId === selectedPet);
  
  const filteredExpenses = expenses.filter(e => 
    e.petId === selectedPet && 
    e.date.startsWith(selectedMonth)
  );

  const totalSpent = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const budgetPercentage = currentBudget ? (totalSpent / currentBudget.monthlyLimit) * 100 : 0;

  const handleAddExpense = () => {
    if (!selectedPet || !newExpense.amount || !newExpense.description.trim()) return;
    const amount = parseFloat(newExpense.amount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 999999) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newExpense.date)) return;

    const expense: Expense = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      petId: selectedPet,
      petName: currentPet?.name || '',
      category: newExpense.category,
      amount: Math.round(amount * 100) / 100,
      description: newExpense.description.trim().slice(0, 200),
      date: newExpense.date,
    };

    persist([...expenses, expense], budgets);

    setNewExpense({
      category: 'food',
      amount: '',
      description: '',
      date: new Date().toISOString().slice(0, 10),
    });
    setShowAddExpense(false);
    setStep(1);
  };

  const handleDeleteExpense = () => {
    if (!deleteTarget) return;
    persist(expenses.filter((e) => e.id !== deleteTarget.id), budgets);
    setDeleteTarget(null);
  };

  const handleSetBudget = () => {
    if (!selectedPet || !budgetAmount) return;
    const limit = parseFloat(budgetAmount);
    if (!Number.isFinite(limit) || limit <= 0 || limit > 999999) return;

    const newBudget: Budget = {
      petId: selectedPet,
      petName: currentPet?.name || '',
      monthlyLimit: limit,
    };

    persist(expenses, [...budgets.filter(b => b.petId !== selectedPet), newBudget]);

    setBudgetAmount('');
    setShowSetBudget(false);
  };

  const nextStep = () => {
    if (step === 1 && !newExpense.category) return;
    if (step === 2 && !newExpense.amount) return;
    if (step === 3 && !newExpense.description) return;
    if (step < 4) setStep(s => s + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(s => s - 1);
  };

  const StepIndicator = () => (
    <div className="flex items-center gap-2 mb-6">
      {stepLabels.map((label, idx) => {
        const n = idx + 1;
        const active = n === step;
        const done = n < step;
        return (
          <div key={n} className="flex-1">
            <div
              className={`h-2 rounded-full transition-all ${active ? 'bg-brand-dark' : done ? 'bg-emerald-400' : 'bg-gray-200'}`}
            />
          </div>
        );
      })}
    </div>
  );

  if (pets.length === 0) {
    return (
      <div className="pv-card p-12 text-center animate-pop-in">
        <div className="w-20 h-20 mx-auto mb-5 rounded-3xl bg-brand-mint flex items-center justify-center text-4xl animate-float">
          🐾
        </div>
        <h3 className="font-serif text-xl font-normal text-gray-900 mb-2">Najpierw dodaj zwierzę</h3>
        <p className="text-gray-500 mb-6">Budżet jest przypisany do konkretnego pupila</p>
        <a href="/dashboard/pets/new" className="pv-btn-primary px-7 py-3 inline-flex">
          <Plus className="w-4 h-4" /> Dodaj zwierzę
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Pet picker + Month */}
      <div className="pv-card p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-2 overflow-x-auto flex-1 pb-1">
            {pets.map((p) => {
              const sel = selectedPet === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedPet(p.id)}
                  className={`pv-chip ${sel ? 'pv-chip-active' : ''}`}
                >
                  {p.species === 'dog' ? '🐶' : p.species === 'cat' ? '🐱' : '🐾'} {p.name}
                </button>
              );
            })}
          </div>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-4 py-2.5 rounded-2xl bg-white border border-gray-200 shadow-sm text-sm font-medium focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10"
          />
        </div>
      </div>

      {/* Budget Overview */}
      {currentBudget ? (
        <div className="pv-card p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="text-sm text-gray-500 mb-1">Budżet miesięczny</div>
              <div className="text-4xl font-bold text-brand-dark">{currentBudget.monthlyLimit.toFixed(0)} zł</div>
            </div>
            <button
              onClick={() => setShowSetBudget(true)}
              className="pv-btn-ghost px-4 py-2 text-sm"
            >
              Edytuj
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Wydano</span>
              <span className="font-semibold text-gray-900">{totalSpent.toFixed(2)} zł ({budgetPercentage.toFixed(0)}%)</span>
            </div>
            <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  budgetPercentage > 100 ? 'bg-red-500' : budgetPercentage > 80 ? 'bg-amber-500' : 'bg-brand-dark'
                }`}
                style={{ width: `${Math.min(budgetPercentage, 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Pozostało</span>
              <span className="font-semibold text-gray-900">{Math.max(0, currentBudget.monthlyLimit - totalSpent).toFixed(2)} zł</span>
            </div>
          </div>

          {budgetPercentage > 80 && (
            <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-amber-900">
                {budgetPercentage > 100
                  ? 'Przekroczono budżet! Rozważ ograniczenie wydatków.'
                  : 'Zbliżasz się do limitu budżetu.'}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="pv-card p-12 text-center animate-pop-in">
          <div className="w-16 h-16 mx-auto mb-5 rounded-3xl bg-brand-mint flex items-center justify-center animate-float">
            <Wallet className="w-7 h-7 text-brand-dark" />
          </div>
          <h3 className="font-serif text-xl font-normal text-gray-900 mb-2">Ustaw budżet miesięczny</h3>
          <p className="text-gray-500 mb-6">
            Określ ile chcesz wydawać miesięcznie na {currentPet?.name}
          </p>
          <button
            onClick={() => setShowSetBudget(true)}
            className="pv-btn-primary px-8 py-3"
          >
            Ustaw budżet
          </button>
        </div>
      )}

      {/* Add Expense Button */}
      <button
        onClick={() => setShowAddExpense(true)}
        className="w-full flex items-center justify-center gap-2 px-4 py-4 rounded-xl pv-btn-primary"
      >
        <Plus className="w-6 h-6" />
        Dodaj wydatek
      </button>

      {/* Podsumowanie po kategoriach */}
      {filteredExpenses.length > 0 && (
        <div className="pv-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="w-5 h-5 text-brand-dark" />
            <h3 className="text-sm font-semibold text-gray-900">Wydatki wg kategorii</h3>
          </div>
          <div className="space-y-2.5">
            {categories
              .map((cat) => ({
                ...cat,
                sum: filteredExpenses.filter((e) => e.category === cat.id).reduce((s, e) => s + e.amount, 0),
              }))
              .filter((c) => c.sum > 0)
              .sort((a, b) => b.sum - a.sum)
              .map((cat) => {
                const Icon = cat.icon;
                const pct = totalSpent > 0 ? (cat.sum / totalSpent) * 100 : 0;
                return (
                  <div key={cat.id} className="flex items-center gap-3">
                    <Icon className="w-4 h-4 flex-shrink-0" style={{ color: cat.color }} />
                    <span className="text-sm text-gray-600 w-20 flex-shrink-0">{cat.name}</span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: cat.color }} />
                    </div>
                    <span className="text-sm font-semibold text-gray-900 w-20 text-right">
                      {cat.sum.toFixed(0)} zł
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Expenses List */}
      {filteredExpenses.length === 0 ? (
        <div className="pv-card p-12 text-center animate-pop-in">
          <div className="w-16 h-16 mx-auto mb-4 rounded-3xl bg-brand-mint flex items-center justify-center animate-float">
            <DollarSign className="w-7 h-7 text-brand-dark" />
          </div>
          <p className="font-semibold text-gray-700">Brak wydatków w tym miesiącu</p>
          <p className="text-sm text-gray-500 mt-1">Dodaj pierwszy wydatek przyciskiem powyżej</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredExpenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((expense, i) => {
            const category = categories.find(c => c.id === expense.category);
            const Icon = category?.icon || DollarSign;

            return (
              <div
                key={expense.id}
                className={`group relative pv-card-hover overflow-hidden animate-slide-up stagger-${Math.min(i + 1, 8)}`}
              >
                <div className="h-1.5 bg-gradient-to-r from-brand-dark to-brand"></div>
                <div className="p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-brand-dark/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-brand-dark" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{expense.description}</h3>
                      <p className="text-xs text-gray-500">{new Date(expense.date).toLocaleDateString('pl-PL')}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-brand-dark">{expense.amount.toFixed(2)} zł</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">{category?.name}</span>
                      <button
                        onClick={() => setDeleteTarget(expense)}
                        className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all"
                        title="Usuń wydatek"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {syncError && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 text-amber-700 text-xs">
          {syncError}
        </div>
      )}

      {/* Add Expense Modal */}
      {showAddExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-fade-in" onClick={() => { setShowAddExpense(false); setStep(1); }}>
          <div className="bg-white rounded-[28px] shadow-2xl w-full max-w-md max-h-[85vh] overflow-y-auto animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-[28px] z-10">
              <h3 className="font-semibold text-gray-900">Dodaj wydatek</h3>
              <button
                onClick={() => {
                  setShowAddExpense(false);
                  setStep(1);
                }}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5">
              <StepIndicator />
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-4">
                Krok {step} z 4 — {stepLabels[step - 1]}
              </p>

              {step === 1 && (
                <div className="space-y-4">
                  <label className="block text-sm font-semibold text-gray-900">Kategoria</label>
                  <div className="grid grid-cols-2 gap-2">
                    {categories.map((cat) => {
                      const Icon = cat.icon;
                      return (
                        <button
                          key={cat.id}
                          onClick={() => setNewExpense({ ...newExpense, category: cat.id as any })}
                          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all ${
                            newExpense.category === cat.id
                              ? 'bg-brand-dark text-white border-brand-dark'
                              : 'bg-white text-gray-700 border-gray-200 hover:border-brand-dark/40'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span className="text-sm font-medium">{cat.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <label className="block text-sm font-semibold text-gray-900">Kwota (zł)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-2xl font-bold focus:outline-none focus:border-brand-dark"
                    autoFocus
                  />
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <label className="block text-sm font-semibold text-gray-900">Opis wydatku</label>
                  <input
                    type="text"
                    value={newExpense.description}
                    onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                    placeholder="np. Karma sucha 5kg"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-dark"
                    autoFocus
                  />
                </div>
              )}

              {step === 4 && (
                <div className="space-y-4">
                  <label className="block text-sm font-semibold text-gray-900">Data wydatku</label>
                  <input
                    type="date"
                    value={newExpense.date}
                    onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-dark"
                  />
                </div>
              )}

              <div className="flex gap-3 mt-6">
                {step > 1 && (
                  <button
                    onClick={prevStep}
                    className="pv-btn-ghost px-4 py-2.5"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Wstecz
                  </button>
                )}
                {step < 4 ? (
                  <button
                    onClick={nextStep}
                    disabled={
                      (step === 1 && !newExpense.category) ||
                      (step === 2 && !newExpense.amount) ||
                      (step === 3 && !newExpense.description)
                    }
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl pv-btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Dalej
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleAddExpense}
                    disabled={!newExpense.amount || !newExpense.description}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl pv-btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Check className="w-5 h-5" />
                    Dodaj wydatek
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Set Budget Modal */}
      {showSetBudget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setShowSetBudget(false)}>
          <div className="bg-white rounded-[28px] shadow-2xl w-full max-w-md animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Ustaw budżet miesięczny</h3>
              <button
                onClick={() => setShowSetBudget(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Miesięczny limit dla {currentPet?.name} (zł)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={budgetAmount}
                  onChange={(e) => setBudgetAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-4 rounded-xl border border-gray-200 text-2xl font-bold focus:outline-none focus:border-brand-dark"
                />
              </div>

              <div className="bg-brand-mint border border-brand-light rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-brand-dark mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-brand-dark">
                    Ustaw realistyczny budżet uwzględniający karmę, leczenie, akcesoria i inne wydatki.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowSetBudget(false)}
                  className="pv-btn-ghost flex-1 px-4 py-2.5"
                >
                  Anuluj
                </button>
                <button
                  onClick={handleSetBudget}
                  disabled={!budgetAmount}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl pv-btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check className="w-5 h-5" />
                  Zapisz
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Usuń wydatek"
        description={`Czy na pewno usunąć wydatek${deleteTarget ? ` „${deleteTarget.description}" (${deleteTarget.amount.toFixed(2)} zł)` : ''}?`}
        confirmLabel="Usuń"
        cancelLabel="Anuluj"
        onConfirm={handleDeleteExpense}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
