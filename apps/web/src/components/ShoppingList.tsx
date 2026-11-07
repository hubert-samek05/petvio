'use client';

import { petApi, userPreferencesApi } from '@/lib/api';
import ConfirmModal from '@/components/ui/ConfirmModal';
import Tesseract from 'tesseract.js';
import { useState, useEffect, useRef } from 'react';
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
  Trash2,
  Loader2,
  ImageIcon,
  Eye,
  ScanText,
  AlertTriangle
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
  photo?: string; // data URL zmniejszonego zdjecia listy
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

// Listy zakupow w user_preferences (per-konto, synchronizacja) + mirror lokalny.
// Zdjecia (data URL) przekraczaja limit preferencji — synchronizujemy pozycje bez
// pola `photo`; same zdjecia zostaja w mirrorze na urzadzeniu, na ktorym zrobiono skan.
const PREFS_KEY = 'shopping_lists';
const stripPhotos = (its: ShoppingItem[]) =>
  its.map((i) => (i.photo ? { ...i, photo: undefined } : i));
const persistLocalAll = (ls: ShoppingListFolder[], its: ShoppingItem[]) => {
  try {
    localStorage.setItem('shoppingLists', JSON.stringify(ls));
    localStorage.setItem('shoppingListItems', JSON.stringify(its));
  } catch {}
};

// Zmniejsza zdjecie do max szerokosci — data URL miesci sie w localStorage
const downscaleImage = (file: File, maxW = 1200): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.75));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

// Kazda niepusta linia tekstu = pozycja listy zakupow.
// Wzorzec ilosci: "2x karma" / "karma x2" / "2 szt karma".
const parseListLines = (text: string) => {
  const out: { name: string; quantity: number }[] = [];
  for (const raw of text.split('\n')) {
    let line = raw.trim().replace(/^[•\-*_~]+\s*/, '');
    if (line.length < 2 || !/[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ]{2,}/.test(line)) continue;
    // pomin tytuly typu "LISTA ZAKUPOW" / "zakupy"
    if (/^(lista|zakupy|do\s+kupienia)(\s+\w+){0,2}\s*[:.!]*$/i.test(line)) continue;
    // "2x karma" lub "2 karma"
    let quantity = 1;
    const lead = line.match(/^(\d+)\s*[x×]?\s+(\S.*)$/);
    const trail = line.match(/^(.+?)\s+[x×]\s*(\d+)$/);
    if (lead) {
      quantity = parseInt(lead[1], 10) || 1;
      line = lead[2];
    } else if (trail) {
      quantity = parseInt(trail[2], 10) || 1;
      line = trail[1];
    }
    line = line.replace(/^[\s*#\-_]+|[\s*#\-_]+$/g, '').slice(0, 60);
    if (line.length < 2) continue;
    out.push({ name: line, quantity });
  }
  return out.slice(0, 40);
};

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

  // Zdjecie listy zakupow -> OCR / pozycja-ze-zdjeciem
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanError, setScanError] = useState('');
  const [showScanModal, setShowScanModal] = useState(false);
  const [scanItems, setScanItems] = useState<{ name: string; quantity: number; checked: boolean }[]>([]);
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);
  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null);
  const scanFileRef = useRef<HTMLInputElement>(null);
  const photoFileRef = useRef<HTMLInputElement>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'list' | 'item'; id: string; name: string } | null>(null);
  const [syncError, setSyncError] = useState('');

  // ESC zamyka modale
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setViewingPhoto(null);
      setShowScanModal(false);
      setScanItems([]);
      setPendingPhoto(null);
      setShowAddModal(false);
      setShowAddListModal(false);
      setEditingList(null);
      setNewListName('');
      setStep(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const [formData, setFormData] = useState({
    name: '',
    quantity: '',
    unit: 'szt',
    estimatedPrice: '',
    notes: '',
  });

  useEffect(() => {
    if (showAddModal || showAddListModal || editingList || showScanModal || viewingPhoto) {
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
  }, [showAddModal, showAddListModal, editingList, showScanModal, viewingPhoto]);

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

      // Ładowanie: serwer wygrywa, fallback/migracja z localStorage.
      const mkDefault = (): ShoppingListFolder => ({
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        petId: '',
        name: 'Zakupy',
        createdAt: new Date().toISOString(),
      });
      (async () => {
        let serverData: { lists?: ShoppingListFolder[]; items?: ShoppingItem[] } | null = null;
        try {
          const res = await userPreferencesApi.get(PREFS_KEY);
          if (res?.value && (Array.isArray(res.value.lists) || Array.isArray(res.value.items))) {
            serverData = res.value;
          }
        } catch {}
        try {
          const localItems: ShoppingItem[] = JSON.parse(localStorage.getItem('shoppingListItems') || '[]');
          const localLists: ShoppingListFolder[] = JSON.parse(localStorage.getItem('shoppingLists') || '[]');
          if (serverData) {
            // scal zdjecia z mirrora po id pozycji
            const photoById = new Map<string, string>();
            (Array.isArray(localItems) ? localItems : []).forEach((i) => {
              if (i?.id && i?.photo) photoById.set(i.id, i.photo);
            });
            const sLists = Array.isArray(serverData.lists) ? serverData.lists! : [];
            const sItems = (Array.isArray(serverData.items) ? serverData.items! : []).map((i) =>
              photoById.has(i.id) ? { ...i, photo: photoById.get(i.id) } : i
            );
            const finalLists = sLists.length ? sLists : [mkDefault()];
            setLists(finalLists);
            setItems(sItems);
            setSelectedList((prev) => prev || finalLists[0].id);
            persistLocalAll(finalLists, sItems);
          } else {
            const finalLists = Array.isArray(localLists) && localLists.length ? localLists : [mkDefault()];
            const finalItems = Array.isArray(localItems) ? localItems : [];
            setLists(finalLists);
            setItems(finalItems);
            setSelectedList((prev) => prev || finalLists[0].id);
            persistLocalAll(finalLists, finalItems);
            // migracja na serwer (bez zdjec — za duze na limit preferencji)
            userPreferencesApi
              .set(PREFS_KEY, { lists: finalLists, items: stripPhotos(finalItems) })
              .catch(() => {});
          }
        } catch {
          setLists([mkDefault()]);
        }
      })();
    }
  }, []);

  const currentList = lists.find(l => l.id === selectedList);
  const petLists = lists.filter(l => !l.petId || l.petId === selectedPet);

  // Jeden zapis: stan + mirror lokalny + serwer (bez zdjec).
  const persistAll = (newLists: ShoppingListFolder[], newItems: ShoppingItem[]) => {
    setLists(newLists);
    setItems(newItems);
    persistLocalAll(newLists, newItems);
    setSyncError('');
    userPreferencesApi
      .set(PREFS_KEY, { lists: newLists, items: stripPhotos(newItems) })
      .catch(() => setSyncError('Nie udało się zsynchronizować z serwerem — zmiany zapisane tylko na tym urządzeniu.'));
  };

  const persistItems = (updated: ShoppingItem[]) => persistAll(lists, updated);
  const persistLists = (updated: ShoppingListFolder[]) => persistAll(updated, items);

  // Gdy nie ma listy dla pupila — utworz domyslna przed dodaniem pozycji
  const ensureList = (): string | null => {
    if (!selectedPet) return null;
    if (selectedList) return selectedList;
    const list: ShoppingListFolder = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      petId: selectedPet,
      name: 'Zakupy',
      createdAt: new Date().toISOString(),
    };
    persistLists([...lists, list]);
    setSelectedList(list.id);
    return list.id;
  };

  // Pozycja-ze-zdjeciem — np. gdy OCR nie rozczytal pisma
  const addPhotoItem = (photo: string, name = 'Zdjęcie listy zakupów') => {
    const listId = ensureList();
    if (!listId || !selectedPet) return;
    persistItems([
      ...items,
      {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        petId: selectedPet,
        listId,
        name,
        quantity: 1,
        unit: 'szt',
        purchased: false,
        photo,
        createdAt: new Date().toISOString(),
      },
    ]);
  };

  const handlePhotoOnly = async (file: File) => {
    try {
      addPhotoItem(await downscaleImage(file));
    } catch {
      setScanError('Nie udało się wczytać zdjęcia.');
    }
  };

  const handlePhotoScan = async (file: File) => {
    setScanning(true);
    setScanError('');
    setScanProgress(0);
    let photo = '';
    try {
      photo = await downscaleImage(file);
      const result = await Tesseract.recognize(photo, 'pol+eng', {
        logger: (m: any) => {
          if (m.status === 'recognizing text') setScanProgress(Math.round(m.progress * 100));
        },
      });
      const parsed = parseListLines(result.data.text);
      if (parsed.length === 0) {
        // OCR nie rozczytal pisma — zapisz samo zdjecie jako pozycje
        addPhotoItem(photo);
        setScanError('Nie rozpoznano tekstu — zapisano zdjęcie jako pozycję listy.');
        return;
      }
      setPendingPhoto(photo);
      setScanItems(parsed.map((p) => ({ ...p, checked: true })));
      setShowScanModal(true);
    } catch (e) {
      console.error('OCR error:', e);
      if (photo) {
        addPhotoItem(photo);
        setScanError('OCR nie zadziałał — zapisano zdjęcie jako pozycję listy.');
      } else {
        setScanError('Nie udało się wczytać zdjęcia.');
      }
    } finally {
      setScanning(false);
    }
  };

  const handleAddScanItems = () => {
    const listId = ensureList();
    const selected = scanItems.filter((s) => s.checked && s.name.trim());
    if (!listId || !selectedPet || selected.length === 0) return;
    const petName = pets.find((p) => p.id === selectedPet)?.name || '';
    persistItems([
      ...items,
      ...selected.map((s, i) => ({
        id: `${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
        petId: selectedPet,
        listId,
        name: s.name.trim(),
        quantity: s.quantity,
        unit: 'szt',
        purchased: false,
        notes: `Ze zdjęcia listy`,
        createdAt: new Date().toISOString(),
      })),
    ]);
    setScanItems([]);
    setPendingPhoto(null);
    setShowScanModal(false);
  };

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
    const name = newListName.trim();
    if (!selectedPet || !name) return;

    const newList: ShoppingListFolder = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      petId: selectedPet,
      name: name.slice(0, 60),
      createdAt: new Date().toISOString(),
    };

    persistLists([...lists, newList]);
    setSelectedList(newList.id);
    setNewListName('');
    setShowAddListModal(false);
  };

  const handleUpdateList = () => {
    const name = newListName.trim();
    if (!editingList || !name) return;

    persistLists(lists.map((l) => (l.id === editingList.id ? { ...l, name: name.slice(0, 60) } : l)));
    setEditingList(null);
    setNewListName('');
  };

  const handleDeleteList = (listId: string) => {
    const updatedLists = lists.filter(l => l.id !== listId);
    persistAll(updatedLists, items.filter(i => i.listId !== listId));
    if (selectedList === listId) {
      setSelectedList(updatedLists.length > 0 ? updatedLists[0].id : null);
    }
  };

  const handleDeleteItem = (itemId: string) => {
    persistItems(items.filter((i) => i.id !== itemId));
  };

  const handleConfirmDelete = () => {
    if (!confirmDelete) return;
    if (confirmDelete.type === 'list') handleDeleteList(confirmDelete.id);
    else handleDeleteItem(confirmDelete.id);
    setConfirmDelete(null);
  };

  const handleAddItem = () => {
    const name = formData.name.trim();
    const qty = parseFloat(formData.quantity);
    const price = parseFloat(formData.estimatedPrice);
    if (!selectedPet || !selectedList || !name || !Number.isFinite(qty) || qty <= 0) return;

    const item: ShoppingItem = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      petId: selectedPet,
      listId: selectedList,
      name: name.slice(0, 120),
      quantity: Math.round(qty * 100) / 100,
      unit: formData.unit,
      estimatedPrice: Number.isFinite(price) && price >= 0 ? Math.round(price * 100) / 100 : undefined,
      purchased: false,
      notes: formData.notes ? formData.notes.slice(0, 500) : undefined,
      createdAt: new Date().toISOString(),
    };

    persistItems([...items, item]);

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

    persistItems(items.map(i => i.id === item.id ? updatedItem : i));
  };

  const handleClearPurchased = () => {
    persistItems(items.filter(i => !(i.listId === selectedList && i.purchased)));
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
      <div className="pv-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Listy zakupów</h3>
          <button
            onClick={() => setShowAddListModal(true)}
            className="px-3 py-2 rounded-xl pv-btn-primary text-sm"
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
              onClick={() =>
                setConfirmDelete({ type: 'list', id: selectedList, name: currentList?.name || '' })
              }
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
            <div className="pv-card p-4 text-center">
              <div className="text-2xl font-bold text-brand-dark">{activeItems.length}</div>
              <div className="text-xs text-gray-500 mt-1">Do kupienia</div>
            </div>
            <div className="pv-card p-4 text-center">
              <div className="text-2xl font-bold text-brand-dark">{purchasedItems.length}</div>
              <div className="text-xs text-gray-500 mt-1">Kupione</div>
            </div>
            <div className="pv-card p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">{totalEstimated.toFixed(0)} zł</div>
              <div className="text-xs text-gray-500 mt-1">Szacowany koszt</div>
            </div>
          </div>

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

          {/* Add Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-4 rounded-xl pv-btn-primary text-sm"
            >
              <Plus className="w-5 h-5" />
              Dodaj produkt
            </button>
            <button
              onClick={() => scanFileRef.current?.click()}
              disabled={scanning || !selectedPet}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-4 rounded-xl bg-white border-2 border-brand-dark text-brand-dark font-semibold hover:bg-brand-dark/5 transition-all disabled:opacity-50 text-sm"
            >
              {scanning ? <Loader2 className="w-5 h-5 animate-spin" /> : <ScanText className="w-5 h-5" />}
              {scanning ? `${scanProgress}%` : 'Ze zdjęcia'}
            </button>
            <button
              onClick={() => photoFileRef.current?.click()}
              disabled={scanning || !selectedPet}
              className="flex items-center justify-center gap-1.5 px-3 py-4 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-all disabled:opacity-50 text-sm"
              title="Zapisz samo zdjęcie jako pozycję (bez rozpoznawania tekstu)"
            >
              <ImageIcon className="w-5 h-5" />
            </button>
          </div>
          <input
            ref={scanFileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handlePhotoScan(f);
              e.target.value = '';
            }}
          />
          <input
            ref={photoFileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handlePhotoOnly(f);
              e.target.value = '';
            }}
          />
          {scanError && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
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
                    className="pv-card hover:shadow-lg hover:border-brand-dark/30 transition-all p-4"
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleTogglePurchased(item)}
                        className="flex-shrink-0 w-6 h-6 rounded-lg border-2 border-gray-300 hover:border-brand-dark transition-all"
                      />
                      {item.photo && (
                        <button
                          onClick={() => setViewingPhoto(item.photo!)}
                          className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border border-gray-200 relative group"
                          title="Podgląd zdjęcia"
                        >
                          <img src={item.photo} alt="Lista" className="w-full h-full object-cover" />
                          <span className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Eye className="w-4 h-4 text-white" />
                          </span>
                        </button>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900">{item.name}</div>
                        <div className="text-sm text-gray-500">
                          {item.photo
                            ? 'Pozycja ze zdjęcia — dotknij miniatury'
                            : <>{item.quantity} {item.unit}
                              {item.estimatedPrice ? <> • ~{item.estimatedPrice.toFixed(2)} zł</> : null}</>}
                        </div>
                      </div>
                      <button
                        onClick={() => setConfirmDelete({ type: 'item', id: item.id, name: item.name })}
                        className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all flex-shrink-0"
                        title="Usuń pozycję"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
                    className="pv-card p-4 opacity-60"
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
            <div className="pv-card p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-[#1B6B4A]/10 to-[#2A8A5C]/10 flex items-center justify-center">
                <ShoppingCart className="w-7 h-7 text-brand" />
              </div>
              <h3 className="pv-section-title mb-2">Lista jest pusta</h3>
              <p className="text-gray-500">
                {searchQuery
                  ? 'Brak produktów spełniających kryteria'
                  : 'Dodaj produkt, zrób zdjęcie listy albo zapisz samo zdjęcie'}
              </p>
            </div>
          )}
        </>
      )}

      {/* Add List Modal */}
      {(showAddListModal || editingList) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm animate-fade-in p-4"
          onClick={() => { setShowAddListModal(false); setEditingList(null); setNewListName(''); }}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
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
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl pv-btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
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
                    Dodaj
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal zatwierdzenia pozycji odczytanych ze zdjecia */}
      {showScanModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm animate-fade-in p-4"
          onClick={() => { setShowScanModal(false); setScanItems([]); setPendingPhoto(null); }}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
              <div>
                <h3 className="font-semibold text-gray-900">Pozycje ze zdjęcia</h3>
                <p className="text-xs text-gray-500 mt-0.5">Zaznacz i popraw — OCR może się mylić</p>
              </div>
              <button
                onClick={() => {
                  setShowScanModal(false);
                  setScanItems([]);
                  setPendingPhoto(null);
                }}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              {pendingPhoto && (
                <button
                  onClick={() => setViewingPhoto(pendingPhoto)}
                  className="w-full flex items-center gap-3 p-2 rounded-xl bg-gray-50 border border-gray-200"
                >
                  <img src={pendingPhoto} alt="Zdjęcie listy" className="w-14 h-14 rounded-lg object-cover" />
                  <span className="text-xs text-gray-500 text-left">
                    Podgląd oryginalnego zdjęcia — porównaj z odczytanymi pozycjami
                  </span>
                </button>
              )}

              {scanItems.map((item, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    item.checked ? 'border-brand-dark/30 bg-brand-mint/30' : 'border-gray-200 opacity-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={(e) =>
                      setScanItems((r) => r.map((x, i) => (i === idx ? { ...x, checked: e.target.checked } : x)))
                    }
                    className="w-4 h-4 accent-brand-dark flex-shrink-0"
                  />
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) =>
                      setScanItems((r) => r.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)))
                    }
                    className="flex-1 min-w-0 px-2 py-1.5 rounded-lg border border-gray-200 text-sm font-medium focus:outline-none focus:border-brand-dark"
                  />
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) =>
                      setScanItems((r) =>
                        r.map((x, i) => (i === idx ? { ...x, quantity: Math.max(1, Number(e.target.value) || 1) } : x))
                      )
                    }
                    className="w-14 px-2 py-1.5 rounded-lg border border-gray-200 text-xs text-center focus:outline-none focus:border-brand-dark"
                  />
                </div>
              ))}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowScanModal(false);
                    setScanItems([]);
                    setPendingPhoto(null);
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-all"
                >
                  Anuluj
                </button>
                {pendingPhoto && (
                  <button
                    onClick={() => {
                      addPhotoItem(pendingPhoto);
                      setScanItems([]);
                      setPendingPhoto(null);
                      setShowScanModal(false);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-all"
                    title="Zapisz też samo zdjęcie jako pozycję"
                  >
                    <ImageIcon className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={handleAddScanItems}
                  disabled={scanItems.every((s) => !s.checked)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl pv-btn-primary text-sm disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  Dodaj {scanItems.filter((s) => s.checked).length} poz.
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Podgląd zdjęcia */}
      {viewingPhoto && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/80 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setViewingPhoto(null)}
        >
          <div className="relative max-w-2xl max-h-[85vh]">
            <button
              onClick={() => setViewingPhoto(null)}
              className="absolute -top-2 -right-2 p-2 rounded-full bg-white text-gray-700 shadow-lg hover:bg-gray-100 z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={viewingPhoto}
              alt="Lista zakupów"
              className="max-w-full max-h-[85vh] rounded-2xl object-contain"
            />
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!confirmDelete}
        title={confirmDelete?.type === 'list' ? 'Usunąć listę?' : 'Usunąć pozycję?'}
        description={
          confirmDelete?.type === 'list'
            ? `Lista „${confirmDelete?.name || ''}" i wszystkie jej pozycje zostaną trwale usunięte.`
            : `Pozycja „${confirmDelete?.name || ''}" zostanie usunięta z listy.`
        }
        confirmLabel="Usuń"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
