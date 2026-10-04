'use client';

import { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Search,
  ShoppingCart,
  Pill,
  Scissors,
  Bone,
  Sparkles,
  MoreHorizontal,
  AlertTriangle,
  Clock,
  X,
  Check,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';

interface InventoryItem {
  id: string;
  petId: string;
  petName: string;
  name: string;
  category: 'food' | 'medicine' | 'accessories' | 'other';
  quantity: number;
  unit: 'kg' | 'g' | 'l' | 'ml' | 'szt' | 'opak';
  expiryDate?: string;
  purchaseDate: string;
  minQuantity?: number;
  notes?: string;
}

interface Pet {
  id: string;
  name: string;
  species: string;
}

const categories = [
  { id: 'food', name: 'Karma', icon: ShoppingCart },
  { id: 'medicine', name: 'Leki', icon: Pill },
  { id: 'accessories', name: 'Akcesoria', icon: Package },
  { id: 'other', name: 'Inne', icon: MoreHorizontal },
];

const units = [
  { value: 'kg', label: 'kg' },
  { value: 'g', label: 'g' },
  { value: 'l', label: 'l' },
  { value: 'ml', label: 'ml' },
  { value: 'szt', label: 'szt' },
  { value: 'opak', label: 'opak' },
];

const stepLabels = ['Nazwa', 'Kategoria', 'Ilość', 'Daty', 'Dodatkowe'];

export default function Inventory() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPet, setSelectedPet] = useState<string | null>(null);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [step, setStep] = useState(1);

  const [formData, setFormData] = useState<{
    name: string;
    category: 'food' | 'medicine' | 'accessories' | 'other';
    quantity: string;
    unit: 'kg' | 'g' | 'l' | 'ml' | 'szt' | 'opak';
    expiryDate: string;
    purchaseDate: string;
    minQuantity: string;
    notes: string;
  }>({
    name: '',
    category: 'food',
    quantity: '',
    unit: 'kg',
    expiryDate: '',
    purchaseDate: new Date().toISOString().slice(0, 10),
    minQuantity: '',
    notes: '',
  });

  useEffect(() => {
    if (showAddModal) {
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
  }, [showAddModal]);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const mockPets: Pet[] = [
        { id: '1', name: 'Burek', species: 'dog' },
        { id: '2', name: 'Mia', species: 'cat' },
      ];
      setPets(mockPets);
      setSelectedPet(mockPets[0].id);

      const savedItems = localStorage.getItem('inventoryItems');
      if (savedItems) {
        setItems(JSON.parse(savedItems));
      }
    }
  }, []);

  const getDaysUntilExpiry = (expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getExpiryStatus = (item: InventoryItem) => {
    if (!item.expiryDate) return 'none';
    const days = getDaysUntilExpiry(item.expiryDate);
    if (days < 0) return 'expired';
    if (days <= 7) return 'critical';
    if (days <= 30) return 'warning';
    return 'ok';
  };

  const filteredItems = items.filter(item => {
    if (item.petId !== selectedPet) return false;
    if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleAddItem = () => {
    if (!selectedPet || !formData.name || !formData.quantity) return;

    const item: InventoryItem = {
      id: Date.now().toString(),
      petId: selectedPet,
      petName: pets.find(p => p.id === selectedPet)?.name || '',
      name: formData.name,
      category: formData.category,
      quantity: parseFloat(formData.quantity),
      unit: formData.unit,
      expiryDate: formData.expiryDate || undefined,
      purchaseDate: formData.purchaseDate,
      minQuantity: formData.minQuantity ? parseFloat(formData.minQuantity) : undefined,
      notes: formData.notes || undefined,
    };

    const updatedItems = [...items, item];
    setItems(updatedItems);
    localStorage.setItem('inventoryItems', JSON.stringify(updatedItems));

    setFormData({
      name: '',
      category: 'food',
      quantity: '',
      unit: 'kg',
      expiryDate: '',
      purchaseDate: new Date().toISOString().slice(0, 10),
      minQuantity: '',
      notes: '',
    });
    setShowAddModal(false);
    setStep(1);
  };

  const nextStep = () => {
    if (step === 1 && !formData.name) return;
    if (step === 2 && !formData.category) return;
    if (step === 3 && !formData.quantity) return;
    if (step < 5) setStep(s => s + 1);
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
      {/* Search */}
      <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Szukaj produktu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-11 pr-4 py-3 font-medium focus:outline-none focus:border-brand-dark focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Add Button */}
      <button
        onClick={() => setShowAddModal(true)}
        className="w-full flex items-center justify-center gap-2 px-4 py-4 rounded-xl bg-brand-dark text-white font-semibold hover:bg-brand-dark transition-all"
      >
        <Plus className="w-6 h-6" />
        Dodaj produkt
      </button>

      {/* Items List */}
      {filteredItems.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-[#1B6B4A]/10 to-[#2A8A5C]/10 flex items-center justify-center">
            <Package className="w-7 h-7 text-brand" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Brak produktów</h3>
          <p className="text-gray-500">
            {searchQuery ? 'Brak produktów spełniających kryteria' : 'Dodaj pierwszy produkt do zapasów'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredItems.map((item) => {
            const category = categories.find(c => c.id === item.category);
            const Icon = category?.icon || Package;
            const expiryStatus = getExpiryStatus(item);

            return (
              <div
                key={item.id}
                className="group relative bg-white rounded-2xl border border-gray-200/70 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-brand-dark/30 transition-all duration-300 overflow-hidden"
              >
                <div className="h-1.5 bg-gradient-to-r from-brand-dark to-brand"></div>
                <div className="p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-brand-dark/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-brand-dark" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{item.name}</h3>
                      <p className="text-xs text-gray-500">{category?.name}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Ilość</span>
                      <span className="font-semibold text-gray-900">{item.quantity} {item.unit}</span>
                    </div>
                    {item.expiryDate && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Ważność</span>
                        <span className={`text-sm font-medium ${
                          expiryStatus === 'expired' ? 'text-red-600' :
                          expiryStatus === 'critical' ? 'text-amber-600' :
                          'text-gray-900'
                        }`}>
                          {expiryStatus === 'expired' ? 'Przeterminowane' :
                           expiryStatus === 'critical' ? `${getDaysUntilExpiry(item.expiryDate)} dni` :
                           new Date(item.expiryDate).toLocaleDateString('pl-PL')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
              <h3 className="font-semibold text-gray-900">Dodaj produkt</h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
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
                Krok {step} z 5 — {stepLabels[step - 1]}
              </p>

              {step === 1 && (
                <div className="space-y-4">
                  <label className="block text-sm font-semibold text-gray-900">Nazwa produktu</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="np. Karma sucha Royal Canin"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-dark"
                    autoFocus
                  />
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <label className="block text-sm font-semibold text-gray-900">Kategoria</label>
                  <div className="grid grid-cols-2 gap-2">
                    {categories.map((cat) => {
                      const Icon = cat.icon;
                      return (
                        <button
                          key={cat.id}
                          onClick={() => setFormData({ ...formData, category: cat.id as any })}
                          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all ${
                            formData.category === cat.id
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

              {step === 3 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Ilość</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      placeholder="0"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-dark"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Jednostka</label>
                    <div className="grid grid-cols-3 gap-2">
                      {units.map(u => (
                        <button
                          key={u.value}
                          onClick={() => setFormData({ ...formData, unit: u.value as any })}
                          className={`px-4 py-2 rounded-xl border font-medium transition-all ${
                            formData.unit === u.value
                              ? 'bg-brand-dark text-white border-brand-dark'
                              : 'bg-white text-gray-700 border-gray-200 hover:border-brand-dark/40'
                          }`}
                        >
                          {u.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Data zakupu</label>
                    <input
                      type="date"
                      value={formData.purchaseDate}
                      onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-dark"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Data ważności (opcjonalnie)</label>
                    <input
                      type="date"
                      value={formData.expiryDate}
                      onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-dark"
                    />
                  </div>
                </div>
              )}

              {step === 5 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Minimalny stan (opcjonalnie)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.minQuantity}
                      onChange={(e) => setFormData({ ...formData, minQuantity: e.target.value })}
                      placeholder="Alert gdy spadnie poniżej"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-dark"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Notatki (opcjonalnie)</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Dodatkowe informacje..."
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-dark resize-none"
                    />
                  </div>
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
                {step < 5 ? (
                  <button
                    onClick={nextStep}
                    disabled={
                      (step === 1 && !formData.name) ||
                      (step === 2 && !formData.category) ||
                      (step === 3 && !formData.quantity)
                    }
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-dark text-white font-medium hover:bg-brand-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Dalej
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleAddItem}
                    disabled={!formData.name || !formData.quantity}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-dark text-white font-medium hover:bg-brand-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Check className="w-5 h-5" />
                    Dodaj produkt
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
