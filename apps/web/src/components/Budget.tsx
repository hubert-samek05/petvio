'use client';

import { useState, useEffect } from 'react';
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
  ArrowRight
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
    const userData = localStorage.getItem('user');
    if (userData) {
      const mockPets: Pet[] = [
        { id: '1', name: 'Burek', species: 'dog' },
        { id: '2', name: 'Mia', species: 'cat' },
      ];
      setPets(mockPets);
      setSelectedPet(mockPets[0].id);

      const savedBudgets = localStorage.getItem('petBudgets');
      if (savedBudgets) {
        setBudgets(JSON.parse(savedBudgets));
      }

      const savedExpenses = localStorage.getItem('petExpenses');
      if (savedExpenses) {
        setExpenses(JSON.parse(savedExpenses));
      }
    }
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
    if (!selectedPet || !newExpense.amount || !newExpense.description) return;

    const expense: Expense = {
      id: Date.now().toString(),
      petId: selectedPet,
      petName: currentPet?.name || '',
      category: newExpense.category,
      amount: parseFloat(newExpense.amount),
      description: newExpense.description,
      date: newExpense.date,
    };

    const updatedExpenses = [...expenses, expense];
    setExpenses(updatedExpenses);
    localStorage.setItem('petExpenses', JSON.stringify(updatedExpenses));

    setNewExpense({
      category: 'food',
      amount: '',
      description: '',
      date: new Date().toISOString().slice(0, 10),
    });
    setShowAddExpense(false);
    setStep(1);
  };

  const handleSetBudget = () => {
    if (!selectedPet || !budgetAmount) return;

    const newBudget: Budget = {
      petId: selectedPet,
      petName: currentPet?.name || '',
      monthlyLimit: parseFloat(budgetAmount),
    };

    const updatedBudgets = budgets.filter(b => b.petId !== selectedPet);
    updatedBudgets.push(newBudget);
    setBudgets(updatedBudgets);
    localStorage.setItem('petBudgets', JSON.stringify(updatedBudgets));

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

  return (
    <div className="space-y-5">
      {/* Month Selector */}
      <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-brand-dark" />
            <span className="font-semibold text-gray-900">Miesiąc</span>
          </div>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium focus:outline-none focus:border-brand-dark"
          />
        </div>
      </div>

      {/* Budget Overview */}
      {currentBudget ? (
        <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="text-sm text-gray-500 mb-1">Budżet miesięczny</div>
              <div className="text-4xl font-bold text-brand-dark">{currentBudget.monthlyLimit.toFixed(0)} zł</div>
            </div>
            <button
              onClick={() => setShowSetBudget(true)}
              className="px-4 py-2 rounded-xl bg-brand-dark hover:bg-brand-dark text-white font-medium transition-all"
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
        <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-[#1B6B4A]/10 to-[#2A8A5C]/10 flex items-center justify-center">
            <Wallet className="w-7 h-7 text-brand" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Ustaw budżet miesięczny</h3>
          <p className="text-gray-500 mb-6">
            Określ ile chcesz wydawać miesięcznie na {currentPet?.name}
          </p>
          <button
            onClick={() => setShowSetBudget(true)}
            className="inline-flex items-center bg-brand-dark hover:bg-brand-dark text-white px-8 py-3 rounded-full font-medium transition-all"
          >
            Ustaw budżet
          </button>
        </div>
      )}

      {/* Add Expense Button */}
      <button
        onClick={() => setShowAddExpense(true)}
        className="w-full flex items-center justify-center gap-2 px-4 py-4 rounded-xl bg-brand-dark text-white font-semibold hover:bg-brand-dark transition-all"
      >
        <Plus className="w-6 h-6" />
        Dodaj wydatek
      </button>

      {/* Expenses List */}
      {filteredExpenses.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-12 text-center">
          <DollarSign className="w-16 h-16 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">Brak wydatków w tym miesiącu</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredExpenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((expense) => {
            const category = categories.find(c => c.id === expense.category);
            const Icon = category?.icon || DollarSign;

            return (
              <div
                key={expense.id}
                className="group relative bg-white rounded-2xl border border-gray-200/70 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-brand-dark/30 transition-all duration-300 overflow-hidden"
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
                    <span className="text-xs text-gray-500">{category?.name}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Expense Modal */}
      {showAddExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
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
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition-all"
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
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-dark text-white font-medium hover:bg-brand-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Dalej
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleAddExpense}
                    disabled={!newExpense.amount || !newExpense.description}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-dark text-white font-medium hover:bg-brand-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
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

              <div className="bg-brand-mint border border-blue-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-brand-dark mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-blue-900">
                    Ustaw realistyczny budżet uwzględniający karmę, leczenie, akcesoria i inne wydatki.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowSetBudget(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition-all"
                >
                  Anuluj
                </button>
                <button
                  onClick={handleSetBudget}
                  disabled={!budgetAmount}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-dark text-white font-medium hover:bg-brand-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check className="w-5 h-5" />
                  Zapisz
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
