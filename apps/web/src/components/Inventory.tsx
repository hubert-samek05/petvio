'use client';

import { petApi, userPreferencesApi } from '@/lib/api';
import ConfirmModal from '@/components/ui/ConfirmModal';
import Tesseract from 'tesseract.js';
import { useState, useEffect, useRef } from 'react';
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
  ChevronLeft,
  Trash2,
  Minus,
  Receipt,
  Loader2
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

// Zapasy w user_preferences (per-konto, synchronizacja) + mirror lokalny na offline.
const PREFS_KEY = 'inventory_items';
const persistLocal = (items: InventoryItem[]) => {
  try { localStorage.setItem('inventoryItems', JSON.stringify(items)); } catch {}
};

// Linie paragonu do pominiecia — naglowki, podsumowania, platnosci, PTU
const RECEIPT_SKIP =
  /paragon|fiskaln|nip|regon|kasa|kasjer|ptu|sprzeda|suma|karta|got[oó]w|reszta|razem|podatek|nr\s|tel\.|ul\.|z[eé]od|zwrot|rabat|bon|faktur|dzi[ee]kuj|zaprasz|sklep|market/i;

// Wyciaga pozycje z tekstu paragonu: NAZWA [ilosc x cena] CENA[A]
const parseReceiptLines = (text: string) => {
  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 2);
  const items: { name: string; quantity: number; price: number }[] = [];
  for (const line of lines) {
    if (RECEIPT_SKIP.test(line)) continue;
    // wymaga litery i ceny na koncu (opcjonalna litera VAT A/B/C)
    const priceMatch = line.match(/(\d+[.,]\d{2})\s*[A-Za-z]?$/);
    if (!priceMatch) continue;
    const price = parseFloat(priceMatch[1].replace(',', '.'));
    if (!Number.isFinite(price) || price <= 0) continue;
    let name = line.slice(0, priceMatch.index).trim();
    // wzorzec ilosci: "2 x 12,50" lub "0,450 kg x 25,00"
    const qtyMatch = name.match(/(\d+[.,]?\d*)\s*(?:kg|g|l|ml|szt)?\s*[x×]\s*(\d+[.,]\d{2})$/i);
    let quantity = 1;
    if (qtyMatch) {
      quantity = parseFloat(qtyMatch[1].replace(',', '.')) || 1;
      name = name.slice(0, qtyMatch.index).trim();
    }
    name = name.replace(/^[\s*#\-_]+|[\s*#\-_]+$/g, '').slice(0, 60);
    // musi zawierac litery i miec sensowna dlugosc
    if (!/[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ]{2,}/.test(name) || name.length < 3) continue;
    items.push({ name, quantity, price });
  }
  return items.slice(0, 30);
};

export default function Inventory() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPet, setSelectedPet] = useState<string | null>(null);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | InventoryItem['category']>('all');
  const [step, setStep] = useState(1);

  // Skaner paragonu
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanError, setScanError] = useState('');
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptItems, setReceiptItems] = useState<
    { name: string; quantity: number; price: number; checked: boolean; unit: InventoryItem['unit']; category: InventoryItem['category'] }[]
  >([]);
  const receiptFileRef = useRef<HTMLInputElement>(null);
  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null);
  const [syncError, setSyncError] = useState('');

  // ESC zamyka modale
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowAddModal(false);
        setShowReceiptModal(false);
        setStep(1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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
    if (showAddModal || showReceiptModal) {
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
  }, [showAddModal, showReceiptModal]);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
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
        let serverItems: InventoryItem[] | null = null;
        try {
          const res = await userPreferencesApi.get(PREFS_KEY);
          if (Array.isArray(res?.value)) serverItems = res.value;
        } catch {}
        try {
          if (serverItems !== null) {
            setItems(serverItems);
            persistLocal(serverItems);
          } else {
            const legacy = JSON.parse(localStorage.getItem('inventoryItems') || '[]');
            const list = Array.isArray(legacy) ? legacy : [];
            setItems(list);
            if (list.length) userPreferencesApi.set(PREFS_KEY, list).catch(() => {});
          }
        } catch {}
      })();
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

  const isLowStock = (item: InventoryItem) =>
    item.minQuantity != null && item.quantity <= item.minQuantity;

  const filteredItems = items.filter(item => {
    if (item.petId !== selectedPet) return false;
    if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
    if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const persist = (updated: InventoryItem[]) => {
    setItems(updated);
    persistLocal(updated);
    setSyncError('');
    userPreferencesApi
      .set(PREFS_KEY, updated)
      .catch(() => setSyncError('Nie udało się zsynchronizować z serwerem — zmiany zapisane tylko na tym urządzeniu.'));
  };

  const handleDeleteItem = () => {
    if (!deleteTarget) return;
    persist(items.filter((i) => i.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  const adjustQuantity = (id: string, delta: number) => {
    persist(
      items.map((i) =>
        i.id === id ? { ...i, quantity: Math.max(0, Math.round((i.quantity + delta) * 100) / 100) } : i
      )
    );
  };

  const handleReceiptScan = async (file: File) => {
    setScanning(true);
    setScanError('');
    setScanProgress(0);
    try {
      const imageData = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const result = await Tesseract.recognize(imageData, 'pol+eng', {
        logger: (m: any) => {
          if (m.status === 'recognizing text') setScanProgress(Math.round(m.progress * 100));
        },
      });
      const parsed = parseReceiptLines(result.data.text);
      if (parsed.length === 0) {
        setScanError('Nie udało się odczytać produktów z paragonu. Zrób wyraźniejsze zdjęcie na prostym tle.');
        return;
      }
      setReceiptItems(
        parsed.map((p) => ({
          ...p,
          checked: true,
          unit: 'szt' as const,
          category: 'food' as const,
        }))
      );
      setShowReceiptModal(true);
    } catch (e) {
      console.error('Receipt OCR error:', e);
      setScanError('OCR nie zadziałał. Spróbuj ponownie z innym zdjęciem.');
    } finally {
      setScanning(false);
    }
  };

  const handleAddReceiptItems = () => {
    const selected = receiptItems.filter((r) => r.checked);
    if (selected.length === 0 || !selectedPet) return;
    const petName = pets.find((p) => p.id === selectedPet)?.name || '';
    const newItems: InventoryItem[] = selected.map((r, i) => ({
      id: `${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
      petId: selectedPet,
      petName,
      name: r.name.trim(),
      category: r.category,
      quantity: r.quantity,
      unit: r.unit,
      purchaseDate: new Date().toISOString().slice(0, 10),
      notes: `Z paragonu — ${r.price.toFixed(2)} zł`,
    }));
    persist([...items, ...newItems]);
    setReceiptItems([]);
    setShowReceiptModal(false);
  };

  const petItems = items.filter((i) => i.petId === selectedPet);
  const lowStockCount = petItems.filter(isLowStock).length;
  const expiringCount = petItems.filter((i) => ['expired', 'critical'].includes(getExpiryStatus(i))).length;

  const handleAddItem = () => {
    if (!selectedPet || !formData.name.trim() || !formData.quantity) return;
    const qty = parseFloat(formData.quantity);
    if (!Number.isFinite(qty) || qty < 0) return;

    const item: InventoryItem = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      petId: selectedPet,
      petName: pets.find(p => p.id === selectedPet)?.name || '',
      name: formData.name.trim().slice(0, 120),
      category: formData.category,
      quantity: Math.round(qty * 100) / 100,
      unit: formData.unit,
      expiryDate: formData.expiryDate || undefined,
      purchaseDate: /^\d{4}-\d{2}-\d{2}$/.test(formData.purchaseDate) ? formData.purchaseDate : new Date().toISOString().slice(0, 10),
      minQuantity: formData.minQuantity && Number.isFinite(parseFloat(formData.minQuantity)) ? Math.max(0, parseFloat(formData.minQuantity)) : undefined,
      notes: formData.notes ? formData.notes.slice(0, 500) : undefined,
    };

    persist([...items, item]);

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
      <div className="pv-card p-5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Szukaj produktu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-2xl shadow-sm pl-11 pr-4 py-3 font-medium focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all"
          />
        </div>
      </div>

      {/* Alerty: niski stan / waznosc */}
      {(lowStockCount > 0 || expiringCount > 0) && (
        <div className="flex flex-col gap-2">
          {lowStockCount > 0 && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span><strong>{lowStockCount}</strong> {lowStockCount === 1 ? 'produkt ma' : 'produktów ma'} niski stan</span>
            </div>
          )}
          {expiringCount > 0 && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
              <Clock className="w-4 h-4 flex-shrink-0" />
              <span><strong>{expiringCount}</strong> {expiringCount === 1 ? 'produkt wygasa' : 'produktów wygasa'} lub jest przeterminowanych</span>
            </div>
          )}
        </div>
      )}

      {/* Filtr kategorii */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setCategoryFilter('all')}
          className={`pv-chip ${categoryFilter === 'all' ? 'pv-chip-active' : ''}`}
        >
          Wszystkie
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategoryFilter(cat.id as InventoryItem['category'])}
            className={`pv-chip ${categoryFilter === cat.id ? 'pv-chip-active' : ''}`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Add Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => setShowAddModal(true)}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-4 rounded-xl pv-btn-primary"
        >
          <Plus className="w-5 h-5" />
          Dodaj produkt
        </button>
        <button
          onClick={() => receiptFileRef.current?.click()}
          disabled={scanning || !selectedPet}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-4 rounded-xl bg-white border-2 border-brand-dark text-brand-dark font-semibold hover:bg-brand-dark/5 transition-all disabled:opacity-50"
        >
          {scanning ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Receipt className="w-5 h-5" />
          )}
          {scanning ? `Skanuję… ${scanProgress}%` : 'Z paragonu'}
        </button>
      </div>
      <input
        ref={receiptFileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleReceiptScan(f);
          e.target.value = '';
        }}
      />
      {scanError && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{scanError}</span>
        </div>
      )}
      {syncError && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{syncError}</span>
        </div>
      )}

      {/* Items List */}
      {filteredItems.length === 0 ? (
        <div className="pv-card p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-[#1B6B4A]/10 to-[#2A8A5C]/10 flex items-center justify-center">
            <Package className="w-7 h-7 text-brand" />
          </div>
          <h3 className="pv-section-title mb-2">Brak produktów</h3>
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
                className="group relative pv-card-hover overflow-hidden"
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
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => adjustQuantity(item.id, item.unit === 'szt' || item.unit === 'opak' ? -1 : -0.1)}
                          className="w-6 h-6 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center justify-center transition-colors"
                          title="Zużyj"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className={`font-semibold ${isLowStock(item) ? 'text-amber-600' : 'text-gray-900'} min-w-[3.5rem] text-center`}>
                          {item.quantity} {item.unit}
                        </span>
                        <button
                          onClick={() => adjustQuantity(item.id, item.unit === 'szt' || item.unit === 'opak' ? 1 : 0.1)}
                          className="w-6 h-6 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center justify-center transition-colors"
                          title="Uzupełnij"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    {isLowStock(item) && (
                      <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 rounded-lg px-2 py-1">
                        <AlertTriangle className="w-3 h-3" />
                        Niski stan (min. {item.minQuantity} {item.unit})
                      </div>
                    )}
                    {item.expiryDate && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Ważność</span>
                        <span className={`text-sm font-medium ${
                          expiryStatus === 'expired' ? 'text-red-600' :
                          expiryStatus === 'critical' ? 'text-amber-600' :
                          expiryStatus === 'warning' ? 'text-amber-600' :
                          'text-gray-900'
                        }`}>
                          {expiryStatus === 'expired' ? 'Przeterminowane' :
                           expiryStatus === 'critical' ? `${getDaysUntilExpiry(item.expiryDate)} dni` :
                           `${new Date(item.expiryDate).toLocaleDateString('pl-PL')} (${getDaysUntilExpiry(item.expiryDate)} dni)`}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-end pt-1">
                      <button
                        onClick={() => setDeleteTarget(item)}
                        className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all"
                        title="Usuń produkt"
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

      {/* Add Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm animate-fade-in p-4"
          onClick={() => { setShowAddModal(false); setStep(1); }}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
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
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl pv-btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Dalej
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleAddItem}
                    disabled={!formData.name || !formData.quantity}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl pv-btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
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

      {/* Modal potwierdzenia paragonu */}
      {showReceiptModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm animate-fade-in p-4"
          onClick={() => { setShowReceiptModal(false); setReceiptItems([]); }}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
              <div>
                <h3 className="font-semibold text-gray-900">Pozycje z paragonu</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Zaznacz i zweryfikuj — OCR może się mylić
                </p>
              </div>
              <button
                onClick={() => {
                  setShowReceiptModal(false);
                  setReceiptItems([]);
                }}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              {receiptItems.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border transition-all ${
                    item.checked ? 'border-brand-dark/30 bg-brand-mint/30' : 'border-gray-200 opacity-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={(e) =>
                        setReceiptItems((r) => r.map((x, i) => (i === idx ? { ...x, checked: e.target.checked } : x)))
                      }
                      className="w-4 h-4 accent-brand-dark flex-shrink-0"
                    />
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) =>
                        setReceiptItems((r) => r.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)))
                      }
                      className="flex-1 min-w-0 px-2 py-1.5 rounded-lg border border-gray-200 text-sm font-medium focus:outline-none focus:border-brand-dark"
                    />
                    <span className="text-xs font-semibold text-gray-500 flex-shrink-0 w-14 text-right">
                      {item.price.toFixed(2)} zł
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-2 pl-7">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.quantity}
                      onChange={(e) =>
                        setReceiptItems((r) =>
                          r.map((x, i) => (i === idx ? { ...x, quantity: Number(e.target.value) || 0 } : x))
                        )
                      }
                      className="w-16 px-2 py-1 rounded-lg border border-gray-200 text-xs focus:outline-none focus:border-brand-dark"
                    />
                    <select
                      value={item.unit}
                      onChange={(e) =>
                        setReceiptItems((r) =>
                          r.map((x, i) => (i === idx ? { ...x, unit: e.target.value as InventoryItem['unit'] } : x))
                        )
                      }
                      className="px-2 py-1 rounded-lg border border-gray-200 text-xs focus:outline-none focus:border-brand-dark"
                    >
                      {units.map((u) => (
                        <option key={u.value} value={u.value}>{u.label}</option>
                      ))}
                    </select>
                    <select
                      value={item.category}
                      onChange={(e) =>
                        setReceiptItems((r) =>
                          r.map((x, i) => (i === idx ? { ...x, category: e.target.value as InventoryItem['category'] } : x))
                        )
                      }
                      className="px-2 py-1 rounded-lg border border-gray-200 text-xs focus:outline-none focus:border-brand-dark"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowReceiptModal(false);
                    setReceiptItems([]);
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-all"
                >
                  Anuluj
                </button>
                <button
                  onClick={handleAddReceiptItems}
                  disabled={receiptItems.every((r) => !r.checked)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl pv-btn-primary text-sm disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  Dodaj {receiptItems.filter((r) => r.checked).length} poz.
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Usunąć produkt?"
        description={`Produkt „${deleteTarget?.name || ''}" zostanie trwale usunięty z zapasów.`}
        confirmLabel="Usuń"
        onConfirm={handleDeleteItem}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
