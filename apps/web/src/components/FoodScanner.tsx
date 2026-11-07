'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { foodScannerApi, petApi } from '@/lib/api';
import {
  Scan,
  AlignLeft,
  Camera,
  Loader2,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  HelpCircle,
  RefreshCw,
  Dumbbell,
  History,
  Trash2,
  X,
  ShieldAlert,
  PawPrint,
  Zap,
  ZapOff,
  ListChecks,
} from 'lucide-react';

type AnalysisStatus = 'good' | 'caution' | 'avoid' | 'unknown';

type IngredientResult = {
  name: string;
  status: AnalysisStatus;
  description: string;
  sportDietFlag?: 'avoid' | 'recommended';
};

type DietConflict = { dietName: string; dietType: string; matchedFoods: string[] };

type Analysis = {
  score: number;
  verdict: string;
  verdictClass: string;
  petType: string;
  ingredients: IngredientResult[];
  summary: { good: number; caution: number; avoid: number; unknown: number };
  sportDiet?: { name: string; key: string; conflicts: string[]; recommended: string[] } | null;
  dietConflicts?: DietConflict[];
};

type Product = {
  barcode: string;
  name: string;
  brands?: string;
  image?: string;
  ingredientsText: string;
  allergens?: string[];
  nutrients?: { energy: number | null; proteins: number | null; fat: number | null; carbs: number | null; sugars: number | null; salt: number | null } | null;
};

type HistoryItem = {
  id: string;
  timestamp: string;
  petType: string;
  petName?: string;
  title: string;
  score: number;
  verdictClass: string;
  product: Product | null;
  result: Analysis;
};

const statusStyle: Record<AnalysisStatus, { bg: string; border: string; text: string; badge: string; label: string; icon: any; order: number }> = {
  avoid: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', badge: 'bg-red-100 text-red-700 border-red-200', label: 'Unikaj', icon: XCircle, order: 0 },
  caution: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700 border-amber-200', label: 'Ostrożnie', icon: AlertCircle, order: 1 },
  unknown: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-600', badge: 'bg-gray-100 text-gray-600 border-gray-200', label: 'Nieznany', icon: HelpCircle, order: 2 },
  good: { bg: 'bg-brand-mint', border: 'border-emerald-200', text: 'text-brand-dark', badge: 'bg-brand-light text-brand-dark border-emerald-200', label: 'Dobry', icon: CheckCircle, order: 3 },
};

const verdictColor = (score: number) => {
  if (score >= 70) return 'text-brand-dark';
  if (score >= 50) return 'text-amber-600';
  if (score >= 30) return 'text-orange-600';
  return 'text-red-600';
};

const ringColor = (score: number) => {
  if (score >= 70) return 'text-brand-dark';
  if (score >= 50) return 'text-amber-500';
  if (score >= 30) return 'text-orange-500';
  return 'text-red-500';
};

const HISTORY_KEY = 'foodScanHistory';

export default function FoodScanner() {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<'scan' | 'manual'>('scan');
  const [petType, setPetType] = useState('dog');

  useEffect(() => {
    if (searchParams?.get('mode') === 'manual') setMode('manual');
  }, [searchParams]);

  const [pets, setPets] = useState<any[]>([]);
  const [selectedPetId, setSelectedPetId] = useState('');
  const [barcode, setBarcode] = useState('');
  const [ingredientsText, setIngredientsText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Analysis | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [cameras, setCameras] = useState<any[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanHint, setScanHint] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [showTip, setShowTip] = useState(true);
  const [nameQuery, setNameQuery] = useState('');
  const [nameResults, setNameResults] = useState<{ barcode: string; name: string; brands: string; image: string; hasIngredients: boolean }[]>([]);
  const [nameLoading, setNameLoading] = useState(false);
  const [partialInfo, setPartialInfo] = useState<string>('');
  const html5QrCode = useRef<any>(null);
  const readerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try { setShowTip(localStorage.getItem('foodScannerTipDismissed') !== '1'); } catch {}
  }, []);

  const dismissTip = () => {
    setShowTip(false);
    try { localStorage.setItem('foodScannerTipDismissed', '1'); } catch {}
  };

  useEffect(() => {
    const loadPets = async () => {
      try {
        const response = await petApi.getAll();
        const list = response.pets || [];
        setPets(list);
        if (list.length > 0) {
          setSelectedPetId(list[0].id.toString());
          setPetType(list[0].species === 'cat' ? 'cat' : 'dog');
        }
      } catch {
        // ignore
      }
    };
    loadPets();
    try {
      const saved = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
      if (Array.isArray(saved)) setHistory(saved);
    } catch {}
  }, []);

  useEffect(() => {
    const pet = pets.find((p) => p.id.toString() === selectedPetId);
    if (pet) setPetType(pet.species === 'cat' ? 'cat' : 'dog');
  }, [selectedPetId, pets]);

  useEffect(() => {
    if (mode !== 'scan') {
      stopScan();
      return;
    }
    let mounted = true;

    const initScanner = async () => {
      try {
        const mod = await import('html5-qrcode');
        if (!mounted || !readerRef.current) return;
        const { Html5Qrcode } = mod;
        html5QrCode.current = new Html5Qrcode('reader');

        const camerasList = await Html5Qrcode.getCameras();
        if (camerasList && camerasList.length > 0) {
          setCameras(camerasList);
          const back = camerasList.find((c: any) => /back|tyl|rear|environment/i.test(c.label || ''));
          const selected = back ? back.id : camerasList[0].id;
          setSelectedCameraId(selected);
          startScan(selected);
        } else {
          setScanHint('Nie znaleziono kamery. Wpisz kod ręcznie poniżej.');
        }
      } catch (err: any) {
        if (err?.name === 'NotAllowedError') {
          setScanHint('Brak zgody na dostęp do kamery. Zezwól na kamerę w ustawieniach przeglądarki.');
        } else {
          setScanHint('Nie udało się uzyskać dostępu do kamery. Spróbuj wpisać kod ręcznie.');
        }
      }
    };

    initScanner();

    return () => {
      mounted = false;
      stopScan();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const stopScan = async () => {
    if (html5QrCode.current && scanning) {
      try {
        await html5QrCode.current.stop();
      } catch {}
    }
    setScanning(false);
    setTorchOn(false);
    setTorchSupported(false);
  };

  const startScan = async (cameraId: string) => {
    if (!html5QrCode.current) return;
    try {
      setScanning(true);
      setScanHint('Ustaw kod kreskowy w ramce');
      await html5QrCode.current.start(
        cameraId,
        {
          fps: 10,
          qrbox: (w: number, h: number) => {
            const dim = Math.max(120, Math.min(w, h) - 32);
            return { width: Math.min(260, dim), height: Math.min(260, dim) };
          },
          aspectRatio: 1.0,
        },
        (decodedText: string) => handleBarcode(decodedText),
        () => {}
      );
      try {
        const capabilities = html5QrCode.current.getRunningTrackCapabilities?.();
        setTorchSupported(!!capabilities?.torch);
      } catch {
        setTorchSupported(false);
      }
    } catch {
      setScanning(false);
      setScanHint('Nie udało się uruchomić kamery. Spróbuj innej kamery.');
    }
  };

  const toggleTorch = async () => {
    if (!html5QrCode.current) return;
    try {
      const next = !torchOn;
      await html5QrCode.current.applyVideoConstraints({ advanced: [{ torch: next }] });
      setTorchOn(next);
    } catch {
      setTorchSupported(false);
    }
  };

  const handleCameraChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedCameraId(id);
    if (scanning) await stopScan();
    startScan(id);
  };

  const pushHistory = (item: Omit<HistoryItem, 'id' | 'timestamp'>) => {
    const entry: HistoryItem = { ...item, id: `${Date.now()}`, timestamp: new Date().toISOString() };
    const next = [entry, ...history].slice(0, 15);
    setHistory(next);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem(HISTORY_KEY);
  };

  const loadFromHistory = (item: HistoryItem) => {
    setProduct(item.product);
    setResult(item.result);
    setIngredientsText(item.product?.ingredientsText || '');
    setError('');
    setNotFound(false);
    setMode(item.product ? 'scan' : 'manual');
  };

  const currentPetName = () => pets.find((p) => p.id.toString() === selectedPetId)?.name;

  const autoScannedRef = useRef(false);

  const handleBarcode = async (code: string) => {
    await stopScan();
    try { navigator.vibrate?.(150); } catch {}
    setBarcode(code);
    setLoading(true);
    setError('');
    setResult(null);
    setProduct(null);
    setNotFound(false);
    setNameResults([]);
    setPartialInfo('');
    try {
      const data = await foodScannerApi.scan(code, petType, selectedPetId ? Number(selectedPetId) : undefined);
      if (!data.found) {
        setNotFound(true);
        setError('');
      } else if (data.partial) {
        // Znamy nazwę/markę, ale brak składu — pokaż kartę i zaproponuj search
        setProduct(data.product);
        setPartialInfo(data.message || 'Baza nie zawiera składu tego produktu.');
        setNameQuery(data.product.name || '');
        setMode('manual');
      } else {
        setProduct(data.product);
        setIngredientsText(data.product.ingredientsText || '');
        if (data.analysis) {
          setResult(data.analysis);
          pushHistory({
            petType, petName: currentPetName(),
            title: data.product.name || `Kod ${code}`,
            score: data.analysis.score, verdictClass: data.analysis.verdictClass,
            product: data.product, result: data.analysis,
          });
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Błąd podczas skanowania');
    } finally {
      setLoading(false);
    }
  };

  // Auto-skan po wejściu z linku ?barcode=...&petId=... (np. z sugestii karm przy diecie)
  useEffect(() => {
    if (autoScannedRef.current) return;
    const bc = searchParams?.get('barcode');
    if (!bc) return;
    const pid = searchParams?.get('petId');
    if (pid) setSelectedPetId(pid);
    autoScannedRef.current = true;
    handleBarcode(bc);
  }, [searchParams]);

  const handleManualAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingredientsText.trim()) {
      setError('Wpisz skład karmy');
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);
    setProduct(null);
    setNotFound(false);
    try {
      const data: Analysis = await foodScannerApi.analyze({ ingredients: ingredientsText, petType, petId: selectedPetId ? Number(selectedPetId) : undefined });
      setResult(data);
      pushHistory({
        petType, petName: currentPetName(),
        title: ingredientsText.slice(0, 40) + (ingredientsText.length > 40 ? '…' : ''),
        score: data.score, verdictClass: data.verdictClass,
        product: null, result: data,
      });
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Błąd podczas analizy');
    } finally {
      setLoading(false);
    }
  };

  const handleNameSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!nameQuery.trim() || nameQuery.trim().length < 3) {
      setError('Wpisz co najmniej 3 znaki nazwy produktu');
      return;
    }
    setNameLoading(true);
    setError('');
    setNameResults([]);
    try {
      const data = await foodScannerApi.search(nameQuery.trim(), petType);
      setNameResults(data.results || []);
      if ((data.results || []).length === 0) {
        setError('Brak wyników dla tej nazwy. Wpisz skład ręcznie.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Błąd podczas wyszukiwania');
    } finally {
      setNameLoading(false);
    }
  };

  const score = result?.score ?? 0;
  const circumference = 2 * Math.PI * 52;
  const dashOffset = circumference - (score / 100) * circumference;
  const sortedIngredients = result ? [...result.ingredients].sort((a, b) => statusStyle[a.status].order - statusStyle[b.status].order) : [];

  return (
    <div className="space-y-5">
      {/* Taby */}
      <div className="flex gap-1 p-1 rounded-2xl bg-gray-100/80">
        {([
          { key: 'scan', label: 'Skanuj kod', Icon: Scan },
          { key: 'manual', label: 'Wpisz skład', Icon: AlignLeft },
        ] as { key: 'scan' | 'manual'; label: string; Icon: any }[]).map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setMode(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              mode === key ? 'bg-white shadow-sm text-brand-dark' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {/* Dla kogo analizujemy */}
      <div className="pv-card p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2.5">Dla kogo analizujemy?</p>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
          <button
            onClick={() => setSelectedPetId('')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              selectedPetId === '' ? 'bg-brand-dark text-white' : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            <PawPrint className="w-3.5 h-3.5" /> Ogólnie
          </button>
          {pets.map((pet) => (
            <button
              key={pet.id}
              onClick={() => setSelectedPetId(pet.id.toString())}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedPetId === pet.id.toString() ? 'bg-brand-dark text-white' : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              {pet.species === 'cat' ? '🐱' : '🐶'} {pet.name}
            </button>
          ))}
        </div>
        {selectedPetId === '' && (
          <div className="flex items-center gap-2 mt-3">
            <button
              type="button" onClick={() => setPetType('dog')}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${petType === 'dog' ? 'bg-brand-dark text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              🐶 Pies
            </button>
            <button
              type="button" onClick={() => setPetType('cat')}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${petType === 'cat' ? 'bg-brand-dark text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              🐱 Kot
            </button>
          </div>
        )}
      </div>

      {/* Historia skanów */}
      {history.length > 0 && !result && (
        <div>
          <div className="flex items-center justify-between px-1 mb-2">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400 flex items-center gap-1.5"><History className="w-3.5 h-3.5" /> Ostatnio sprawdzone</p>
            <button onClick={clearHistory} className="text-[11px] text-gray-400 flex items-center gap-1"><Trash2 className="w-3 h-3" /> Wyczyść</button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
            {history.map((h) => (
              <button
                key={h.id}
                onClick={() => loadFromHistory(h)}
                className="flex-shrink-0 w-36 pv-card p-3 text-left active:scale-[0.98] transition-all"
              >
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${h.score >= 70 ? 'bg-emerald-500' : h.score >= 50 ? 'bg-amber-500' : h.score >= 30 ? 'bg-orange-500' : 'bg-red-500'}`} />
                  <span className="text-[10px] font-bold text-gray-400">{h.score}/100</span>
                </div>
                <p className="text-xs font-semibold text-gray-800 line-clamp-2 leading-snug">{h.title}</p>
                {h.petName && <p className="text-[10px] text-gray-400 mt-1 truncate">{h.petName}</p>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tryb skanowania */}
      {mode === 'scan' && (
        <div className="pv-card overflow-hidden">
          {showTip && (
            <div className="bg-brand-mint/60 border-b border-emerald-100 p-3.5 flex items-start gap-2.5">
              <ListChecks className="w-4.5 h-4.5 text-brand-dark mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-bold text-brand-dark mb-1">Jak skanować?</p>
                <ul className="text-xs text-brand-dark/90 space-y-0.5 leading-relaxed">
                  <li>1. Wybierz pupila — analiza dopasuje się do gatunku i diety sportowej</li>
                  <li>2. Skieruj kamerę na kod kreskowy na opakowaniu</li>
                  <li>3. Składniki zostaną ocenione: bezpieczne, ostrożnie, unikaj</li>
                </ul>
              </div>
              <button onClick={dismissTip} className="w-7 h-7 rounded-lg bg-white/60 flex items-center justify-center flex-shrink-0">
                <X className="w-3.5 h-3.5 text-brand-dark" />
              </button>
            </div>
          )}
          <div className="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-gray-700 font-semibold text-sm">
              <Camera className="w-4.5 h-4.5 text-brand-dark" /> Skaner kodów kreskowych
            </div>
            {cameras.length > 1 && (
              <select
                value={selectedCameraId} onChange={handleCameraChange}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-dark/30 max-w-full"
              >
                {cameras.map((c, i) => <option key={c.id} value={c.id}>{c.label || `Kamera ${i + 1}`}</option>)}
              </select>
            )}
          </div>

          <div className="relative bg-gray-900 overflow-hidden">
            <div id="reader" ref={readerRef} className="w-full aspect-square max-w-[min(400px,60vh)] max-h-[min(400px,60vh)] mx-auto overflow-hidden" />
            {scanning && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative w-[65%] aspect-square max-w-[260px]">
                  <span className="absolute -top-1 -left-1 w-7 h-7 border-t-4 border-l-4 border-brand rounded-tl-xl" />
                  <span className="absolute -top-1 -right-1 w-7 h-7 border-t-4 border-r-4 border-brand rounded-tr-xl" />
                  <span className="absolute -bottom-1 -left-1 w-7 h-7 border-b-4 border-l-4 border-brand rounded-bl-xl" />
                  <span className="absolute -bottom-1 -right-1 w-7 h-7 border-b-4 border-r-4 border-brand rounded-br-xl" />
                  <div className="absolute left-0 right-0 h-0.5 bg-brand/90 shadow-[0_0_8px_2px_rgba(16,185,129,0.6)] animate-scanline" />
                </div>
              </div>
            )}
            {scanning && torchSupported && (
              <button
                onClick={toggleTorch}
                className="absolute bottom-3 right-3 w-11 h-11 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center border border-white/20"
                aria-label={torchOn ? 'Wyłącz latarkę' : 'Włącz latarkę'}
              >
                {torchOn ? <Zap className="w-5 h-5 text-amber-300" /> : <ZapOff className="w-5 h-5 text-white/80" />}
              </button>
            )}
            {!scanning && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6 text-center bg-gray-900/80">
                <Camera className="w-10 h-10 mb-3 opacity-50" />
                <p className="font-medium text-sm">{scanHint || 'Ładowanie kamery…'}</p>
                <button onClick={() => selectedCameraId && startScan(selectedCameraId)} className="mt-4 px-5 py-2 rounded-full pv-btn-primary text-sm">
                  Spróbuj ponownie
                </button>
              </div>
            )}
          </div>

          <div className="p-4 bg-gray-50 border-t border-gray-100">
            <label className="block text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">Lub wpisz kod ręcznie</label>
            <form onSubmit={(e) => { e.preventDefault(); if (barcode.trim()) handleBarcode(barcode.trim()); }} className="flex gap-2">
              <input
                type="text" inputMode="numeric" value={barcode} onChange={(e) => setBarcode(e.target.value)}
                placeholder="np. 5901234123457"
                className="flex-1 min-w-0 rounded-xl border border-gray-200 px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-4 focus:ring-brand/10 focus:border-brand"
              />
              <button type="submit" disabled={!barcode.trim() || loading} className="px-5 py-2.5 rounded-xl pv-btn-primary disabled:opacity-50">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Szukaj'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Tryb ręczny */}
      {mode === 'manual' && (
        <form onSubmit={handleManualAnalyze} className="pv-card p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">Skład karmy</label>
            <textarea
              value={ingredientsText} onChange={(e) => setIngredientsText(e.target.value)} rows={6}
              placeholder="Wklej skład z opakowania, np.: mięso z kurczaka, ryż, groch, sól, cukier..."
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-900 focus:outline-none focus:ring-4 focus:ring-brand/10 focus:border-brand resize-none"
            />
          </div>
          <button
            type="submit" disabled={loading || !ingredientsText.trim()}
            className="w-full bg-brand-dark hover:bg-brand text-white py-3.5 rounded-full font-bold shadow-md shadow-brand-dark/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Analizuj skład
          </button>
        </form>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" /> {error}
        </div>
      )}

      {/* Fallback: nie znaleziono kodu / brak składu — szukaj po nazwie */}
      {(notFound || partialInfo) && (
        <div className="pv-card p-5 space-y-4 border-amber-200 bg-amber-50/50">
          <div className="flex items-start gap-3 text-amber-700 text-sm">
            <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">
                {partialInfo ? 'Ten produkt ma znany kod, ale brak składu w bazie.' : `Kod ${barcode} nie istnieje w bazach produktów.`}
              </p>
              <p className="text-xs mt-0.5 opacity-80">Znajdź podobny produkt po nazwie lub wpisz skład ręcznie.</p>
            </div>
          </div>
          <form onSubmit={handleNameSearch} className="flex gap-2">
            <input
              type="text" value={nameQuery} onChange={(e) => setNameQuery(e.target.value)}
              placeholder="np. Sheba kurczak 85g"
              className="flex-1 min-w-0 rounded-xl border border-amber-200 bg-white px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-4 focus:ring-brand/10 focus:border-brand"
            />
            <button type="submit" disabled={nameLoading || nameQuery.trim().length < 3} className="px-5 py-2.5 rounded-xl pv-btn-primary disabled:opacity-50">
              {nameLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Szukaj'}
            </button>
          </form>
        </div>
      )}

      {/* Wyniki wyszukiwania po nazwie */}
      {nameResults.length > 0 && (
        <div className="pv-card divide-y divide-gray-100 overflow-hidden">
          <p className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-400 border-b border-gray-100">
            Wybierz produkt ({nameResults.length})
          </p>
          {nameResults.map((r) => (
            <button
              key={r.barcode}
              onClick={() => { setNameResults([]); handleBarcode(r.barcode); }}
              className="w-full flex items-center gap-3 p-3.5 text-left hover:bg-brand-mint/40 transition-colors"
            >
              {r.image ? (
                <img src={r.image} alt="" className="w-11 h-11 rounded-lg object-cover border border-gray-100 flex-shrink-0" />
              ) : (
                <div className="w-11 h-11 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <PawPrint className="w-5 h-5 text-gray-300" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-gray-900 truncate">{r.name}</p>
                {r.brands && <p className="text-xs text-gray-400 truncate">{r.brands}</p>}
              </div>
              {!r.hasIngredients && <span className="text-[10px] text-amber-600 font-semibold flex-shrink-0">bez składu</span>}
            </button>
          ))}
        </div>
      )}

      {/* Info o częściowym wyniku (nazwa znana, brak składu) */}
      {partialInfo && (
        <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 text-blue-700 text-sm flex items-start gap-3">
          <Info className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-semibold">{partialInfo}</p>
            <p className="text-xs mt-0.5 opacity-80">Przepisz skład z opakowania poniżej — analizator oceni każdy składnik.</p>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
          <Loader2 className="w-10 h-10 animate-spin text-brand-dark mb-3" />
          <p className="font-medium">Analizuję skład…</p>
        </div>
      )}

      {product && (
        <div className="pv-card p-5 flex gap-4 items-start">
          {product.image ? (
            <img src={product.image} alt={product.name} className="w-20 h-20 rounded-xl object-cover border border-gray-100 flex-shrink-0" />
          ) : (
            <div className="w-20 h-20 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 flex-shrink-0">
              <HelpCircle className="w-8 h-8" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 truncate">{product.name}</h3>
            {product.brands && <p className="text-sm text-gray-500 truncate">{product.brands}</p>}
            <p className="text-xs text-gray-400 mt-1">Kod: {product.barcode}</p>
          </div>
        </div>
      )}

      {/* Alergeny */}
      {product && product.allergens && product.allergens.length > 0 && (
        <div className="rounded-2xl bg-orange-50 border border-orange-200 p-4 flex items-start gap-2.5">
          <ShieldAlert className="w-4.5 h-4.5 text-orange-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-bold text-orange-800 uppercase tracking-wide mb-1">Zawiera alergeny</p>
            <div className="flex flex-wrap gap-1.5">
              {product.allergens.map((a, i) => (
                <span key={i} className="px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold">{a}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="pv-card p-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="relative w-32 h-32 flex-shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="52" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-gray-100" />
                  <circle
                    cx="60" cy="60" r="52" stroke="currentColor" strokeWidth="10" fill="transparent"
                    strokeDasharray={circumference} strokeDashoffset={dashOffset} strokeLinecap="round"
                    className={`${ringColor(score)} transition-all duration-700 ease-out`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-gray-900">{score}</span>
                  <span className="text-xs text-gray-500">/100</span>
                </div>
              </div>
              <div className="text-center sm:text-left flex-1">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-1">Ocena ogólna</p>
                <h3 className={`text-xl sm:text-2xl font-bold ${verdictColor(score)}`}>{result.verdict}</h3>
                <p className="text-gray-600 mt-2 text-sm">
                  {petType === 'cat' ? 'Analiza pod kątem kota.' : 'Analiza pod kątem psa.'}
                  {result.summary.avoid > 0 && ' Znaleziono składniki niepożądane – zalecamy weryfikację.'}
                  {result.summary.avoid === 0 && result.summary.caution === 0 && ' Skład wygląda bardzo dobrze.'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-6">
              <div className="p-3 rounded-xl bg-brand-mint text-center">
                <p className="text-xl font-bold text-brand-dark">{result.summary.good}</p>
                <p className="text-[11px] text-brand-dark">Dobre</p>
              </div>
              <div className="p-3 rounded-xl bg-amber-50 text-center">
                <p className="text-xl font-bold text-amber-700">{result.summary.caution}</p>
                <p className="text-[11px] text-amber-600">Ostrożnie</p>
              </div>
              <div className="p-3 rounded-xl bg-red-50 text-center">
                <p className="text-xl font-bold text-red-700">{result.summary.avoid}</p>
                <p className="text-[11px] text-red-600">Unikaj</p>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 text-center">
                <p className="text-xl font-bold text-gray-700">{result.summary.unknown}</p>
                <p className="text-[11px] text-gray-600">Nieznane</p>
              </div>
            </div>
          </div>

          {/* Wartości odżywcze */}
          {product?.nutrients && (
            <div className="pv-card p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-3">Wartości odżywcze (na 100 g)</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Energia', value: product.nutrients.energy, unit: 'kcal' },
                  { label: 'Białko', value: product.nutrients.proteins, unit: 'g' },
                  { label: 'Tłuszcz', value: product.nutrients.fat, unit: 'g' },
                  { label: 'Węglowodany', value: product.nutrients.carbs, unit: 'g' },
                  { label: 'Cukry', value: product.nutrients.sugars, unit: 'g' },
                  { label: 'Sól', value: product.nutrients.salt, unit: 'g' },
                ].map((n, i) => (
                  <div key={i} className="bg-gray-50 rounded-xl p-2.5 text-center">
                    <p className="text-sm font-bold text-gray-800">{n.value != null ? `${n.value}` : '—'}<span className="text-[10px] font-normal text-gray-400 ml-0.5">{n.value != null ? n.unit : ''}</span></p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{n.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.sportDiet && (
            <div className={`p-4 sm:p-5 rounded-2xl border ${result.sportDiet.conflicts.length > 0 ? 'bg-red-50 border-red-200' : 'bg-brand-mint border-emerald-200'}`}>
              <div className="flex items-start gap-3">
                <Dumbbell className={`w-5 h-5 flex-shrink-0 ${result.sportDiet.conflicts.length > 0 ? 'text-red-600' : 'text-brand-dark'}`} />
                <div>
                  <p className={`text-sm font-semibold ${result.sportDiet.conflicts.length > 0 ? 'text-red-700' : 'text-brand-dark'}`}>
                    Dieta sportowa: „{result.sportDiet.name}"
                  </p>
                  {result.sportDiet.conflicts.length > 0 ? (
                    <p className="text-sm text-red-600 mt-1">Niezalecane przy tej diecie: {result.sportDiet.conflicts.join(', ')}</p>
                  ) : result.sportDiet.recommended.length > 0 ? (
                    <p className="text-sm text-brand-dark mt-1">Zalecane składniki dla tej diety: {result.sportDiet.recommended.join(', ')}</p>
                  ) : (
                    <p className="text-sm text-brand-dark mt-1">Brak konfliktów z aktywną dietą sportową.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Konflikty z aktywnymi dietami specjalistycznymi pupila */}
          {result.dietConflicts && result.dietConflicts.length > 0 && (
            <div className="p-4 sm:p-5 rounded-2xl border-2 border-red-300 bg-red-50">
              <div className="flex items-start gap-3">
                <ShieldAlert className="w-5.5 h-5.5 flex-shrink-0 text-red-600" />
                <div>
                  <p className="text-sm font-bold text-red-700">Konflikt z aktywną dietą!</p>
                  {result.dietConflicts.map((c, i) => (
                    <p key={i} className="text-sm text-red-600 mt-1">
                      „{c.dietName}": znaleziono zakazane — <span className="font-semibold">{c.matchedFoods.join(', ')}</span>
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="pv-card p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Szczegółowa analiza składników</p>
              <p className="text-[10px] text-gray-400">Posortowano wg istotności</p>
            </div>
            <div className="space-y-2.5">
              {sortedIngredients.map((ing, idx) => {
                const style = statusStyle[ing.status];
                const Icon = style.icon;
                return (
                  <div key={idx} className={`flex items-start gap-3 p-3.5 rounded-xl border ${style.border} ${style.bg}`}>
                    <Icon className={`w-4.5 h-4.5 flex-shrink-0 ${style.text}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-gray-900 text-sm break-words max-w-full">{ing.name}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${style.badge}`}>{style.label}</span>
                        {ing.sportDietFlag === 'avoid' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-red-100 text-red-700 border-red-200 flex items-center gap-1">
                            <Dumbbell className="w-3 h-3" /> Konflikt z dietą
                          </span>
                        )}
                        {ing.sportDietFlag === 'recommended' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-brand-light text-brand-dark border-emerald-200 flex items-center gap-1">
                            <Dumbbell className="w-3 h-3" /> Zalecane
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mt-1 break-words">{ing.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
