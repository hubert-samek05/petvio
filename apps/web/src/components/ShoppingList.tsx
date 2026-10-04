'use client';

import { useState, useEffect } from 'react';
import {
  ShoppingCart,
  Plus,
  Check,
  X,
  Search,
  ChevronRight,
  ChevronLeft,
  Folder,
  Archive,
  Edit2,
  Trash2
} from 'lucide-react';

interface ShoppingItem {
  id: string;
  petId: string;
  listId: string;
  name: string;
  quantity: number;
  unit: string;
  estimatedPrice?: number;
  purchased: boolean;
  purchasedDate?: string;
  notes?: string;
  createdAt: string;
}

interface ShoppingListFolder {
  id: string;
  petId: string;
  name: string;
  createdAt: string;
}

interface Pet {
  id: string;
  name: string;
  species: string;
}

const stepLabels = ['Nazwa', 'Ilość', 'Cena'];

export default function ShoppingList() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPet, setSelectedPet] = useState<string | null>(null);
  const [lists, setLists] = useState<ShoppingListFolder[]>([]);
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [selectedList, setSelectedList] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddListModal, setShowAddListModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [step, setStep] = useState(1);
  const [editingList, setEditingList] = useState<ShoppingListFolder | null>(null);
  const [newListName, setNewListName] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    quantity: '',
    unit: 'szt',
    estimatedPrice: '',
    notes: '',
  });

  useEffect(() => {
    if (showAddModal || showAddListModal || editingList) {
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
  }, [showAddModal, showAddListModal, editingList]);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const mockPets: Pet[] = [
        { id: '1', name: 'Burek', species: 'dog' },
        { id: '2', name: 'Mia', species: 'cat' },
      ];
      setPets(mockPets);
      setSelectedPet(mockPets[0].id);

      const savedLists = localStorage.getItem('shoppingLists');
      if (savedLists) {
        const parsedLists = JSON.parse(savedLists);
        setLists(parsedLists);
        if (parsedLists.length > 0) {
          setSelectedList(parsedLists[0].id);
        }
      } else {
        const defaultList: ShoppingListFolder = {
          id: Date.now().toString(),
          petId: mockPets[0].id,
          name: 'Zakupy',
          createdAt: new Date().toISOString(),
        };
        setLists([defaultList]);
        setSelectedList(defaultList.id);
        localStorage.setItem('shoppingLists', JSON.stringify([defaultList]));
      }

      const savedItems = localStorage.getItem('shoppingListItems');
      if (savedItems) {
        setItems(JSON.parse(savedItems));
      }
    }
  }, []);

  const currentList = lists.find(l => l.id === selectedList);
  const petLists = lists.filter(l => l.petId === selectedPet);

  const filteredItems = items.filter(item => {
    if (item.petId !== selectedPet) return false;
    if (item.listId !== selectedList) return false;
    if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const activeItems = filteredItems.filter(i => !i.purchased);
  const purchasedItems = filteredItems.filter(i => i.purchased);
  const totalEstimated = activeItems.reduce((sum, i) => sum + (i.estimatedPrice || 0), 0);

  const handleAddList = () => {
    if (!selectedPet || !newListName) return;

    const newList: ShoppingListFolder = {
      id: Date.now().toString(),
      petId: selectedPet,
      name: newListName,
      createdAt: new Date().toISOString(),
    };

    const updatedLists = [...lists, newList];
    setLists(updatedLists);
    localStorage.setItem('shoppingLists', JSON.stringify(updatedLists));
    setSelectedList(newList.id);

    setNewListName('');
    setShowAddListModal(false);
  };

  const handleUpdateList = () => {
    if (!editingList || !newListName) return;

    const updatedList = {
      ...editingList,
      name: newListName,
    };

    const updatedLists = lists.map(l => l.id === editingList.id ? updatedList : l);
    setLists(updatedLists);
    localStorage.setItem('shoppingLists', JSON.stringify(updatedLists));

    setEditingList(null);
    setNewListName('');
  };

  const handleDeleteList = (listId: string) => {
    const updatedLists = lists.filter(l => l.id !== listId);
    setLists(updatedLists);
    localStorage.setItem('shoppingLists', JSON.stringify(updatedLists));

    const updatedItems = items.filter(i => i.listId !== listId);
    setItems(updatedItems);
    localStorage.setItem('shoppingListItems', JSON.stringify(updatedItems));

    if (selectedList === listId && updatedLists.length > 0) {
      setSelectedList(updatedLists[0].id);
    }
  };

  const handleAddItem = () => {
    if (!selectedPet || !selectedList || !formData.name || !formData.quantity) return;

    const item: ShoppingItem = {
      id: Date.now().toString(),
      petId: selectedPet,
      listId: selectedList,
      name: formData.name,
      quantity: parseFloat(formData.quantity),
      unit: formData.unit,
      estimatedPrice: formData.estimatedPrice ? parseFloat(formData.estimatedPrice) : undefined,
      purchased: false,
      notes: formData.notes || undefined,
      createdAt: new Date().toISOString(),
    };

    const updatedItems = [...items, item];
    setItems(updatedItems);
    localStorage.setItem('shoppingListItems', JSON.stringify(updatedItems));

    setFormData({
      name: '',
      quantity: '',
      unit: 'szt',
      estimatedPrice: '',
      notes: '',
    });
    setShowAddModal(false);
    setStep(1);
  };

  const handleTogglePurchased = (item: ShoppingItem) => {
    const updatedItem: ShoppingItem = {
      ...item,
      purchased: !item.purchased,
      purchasedDate: !item.purchased ? new Date().toISOString() : undefined,
    };

    const updatedItems = items.map(i => i.id === item.id ? updatedItem : i);
    setItems(updatedItems);
    localStorage.setItem('shoppingListItems', JSON.stringify(updatedItems));
  };

  const handleClearPurchased = () => {
    const updatedItems = items.filter(i => !(i.listId === selectedList && i.purchased));
    setItems(updatedItems);
    localStorage.setItem('shoppingListItems', JSON.stringify(updatedItems));
  };

  const nextStep = () => {
    if (step === 1 && !formData.name) return;
    if (step === 2 && !formData.quantity) return;
    if (step < 3) setStep(s => s + 1);
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
      {/* Lists */}
      <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Listy zakupów</h3>
          <button
            onClick={() => setShowAddListModal(true)}
            className="px-3 py-2 rounded-xl bg-brand-dark text-white text-sm font-medium hover:bg-brand-dark transition-all"
          >
            + Nowa
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2">
          {petLists.map((list) => (
            <button
              key={list.id}
              onClick={() => setSelectedList(list.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl whitespace-nowrap transition-all border ${
                selectedList === list.id
                  ? 'bg-brand-dark text-white border-brand-dark'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-brand-dark/40'
              }`}
            >
              <Folder className="w-4 h-4" />
              {list.name}
              <span className="text-xs opacity-75">
                ({items.filter(i => i.listId === list.id && !i.purchased).length})
              </span>
            </button>
          ))}
        </div>

        {selectedList && petLists.length > 1 && (
          <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
            <button
              onClick={() => {
                setEditingList(currentList || null);
                setNewListName(currentList?.name || '');
              }}
              className="flex-1 px-3 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-all"
            >
              Edytuj
            </button>
            <button
              onClick={() => {
                if (confirm('Czy na pewno chcesz usunąć tę listę?')) {
                  handleDeleteList(selectedList);
                }
              }}
              className="flex-1 px-3 py-2 rounded-lg bg-red-50 text-red-700 text-sm font-medium hover:bg-red-100 transition-all"
            >
              Usuń
            </button>
          </div>
        )}
      </div>

      {selectedList && currentList && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-4 text-center">
              <div className="text-2xl font-bold text-brand-dark">{activeItems.length}</div>
              <div className="text-xs text-gray-500 mt-1">Do kupienia</div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-4 text-center">
              <div className="text-2xl font-bold text-brand-dark">{purchasedItems.length}</div>
              <div className="text-xs text-gray-500 mt-1">Kupione</div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">{totalEstimated.toFixed(0)} zł</div>
              <div className="text-xs text-gray-500 mt-1">Szacowany koszt</div>
            </div>
          </div>

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

          {/* Clear Purchased */}
          {purchasedItems.length > 0 && (
            <button
              onClick={handleClearPurchased}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-all"
            >
              <Archive className="w-5 h-5" />
              Wyczyść kupione ({purchasedItems.length})
            </button>
          )}

          {/* Active Items */}
          {activeItems.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 px-1">Do kupienia</h3>
              <div className="grid grid-cols-1 gap-3">
                {activeItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl border border-gray-200/70 shadow-sm hover:shadow-lg hover:border-brand-dark/30 transition-all p-4"
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleTogglePurchased(item)}
                        className="flex-shrink-0 w-6 h-6 rounded-lg border-2 border-gray-300 hover:border-brand-dark transition-all"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900">{item.name}</div>
                        <div className="text-sm text-gray-500">
                          {item.quantity} {item.unit}
                          {item.estimatedPrice && <> • ~{item.estimatedPrice.toFixed(2)} zł</>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Purchased Items */}
          {purchasedItems.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 px-1">Kupione</h3>
              <div className="grid grid-cols-1 gap-3">
                {purchasedItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-4 opacity-60"
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleTogglePurchased(item)}
                        className="flex-shrink-0 w-6 h-6 rounded-lg bg-brand-dark border-2 border-emerald-500 flex items-center justify-center"
                      >
                        <Check className="w-4 h-4 text-white" />
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 line-through">{item.name}</div>
                        <div className="text-sm text-gray-500">
                          {item.purchasedDate && new Date(item.purchasedDate).toLocaleDateString('pl-PL')}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {filteredItems.length === 0 && (
            <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-[#1B6B4A]/10 to-[#2A8A5C]/10 flex items-center justify-center">
                <ShoppingCart className="w-7 h-7 text-brand" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Lista jest pusta</h3>
              <p className="text-gray-500">
                {searchQuery ? 'Brak produktów spełniających kryteria' : 'Dodaj pierwszy produkt do listy'}
              </p>
            </div>
          )}
        </>
      )}

      {/* Add List Modal */}
      {(showAddListModal || editingList) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">
                {editingList ? 'Edytuj listę' : 'Nowa lista'}
              </h3>
              <button
                onClick={() => {
                  setShowAddListModal(false);
                  setEditingList(null);
                  setNewListName('');
                }}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Nazwa listy</label>
                <input
                  type="text"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="np. Zakupy tygodniowe"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-dark"
                  autoFocus
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowAddListModal(false);
                    setEditingList(null);
                    setNewListName('');
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition-all"
                >
                  Anuluj
                </button>
                <button
                  onClick={editingList ? handleUpdateList : handleAddList}
                  disabled={!newListName}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-dark text-white font-medium hover:bg-brand-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check className="w-5 h-5" />
                  {editingList ? 'Zapisz' : 'Utwórz'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Item Modal */}
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
                Krok {step} z 3 — {stepLabels[step - 1]}
              </p>

              {step === 1 && (
                <div className="space-y-4">
                  <label className="block text-sm font-semibold text-gray-900">Nazwa produktu</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="np. Karma sucha 5kg"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-dark"
                    autoFocus
                  />
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Ilość</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      placeholder="1"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-dark"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Jednostka</label>
                    <select
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-dark"
                    >
                      <option value="szt">szt</option>
                      <option value="kg">kg</option>
                      <option value="g">g</option>
                      <option value="l">l</option>
                      <option value="ml">ml</option>
                      <option value="opak">opak</option>
                    </select>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Szacowana cena (zł)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.estimatedPrice}
                      onChange={(e) => setFormData({ ...formData, estimatedPrice: e.target.value })}
                      placeholder="0.00"
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
                {step < 3 ? (
                  <button
                    onClick={nextStep}
                    disabled={
                      (step === 1 && !formData.name) ||
                      (step === 2 && !formData.quantity)
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
                    Dodaj
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
