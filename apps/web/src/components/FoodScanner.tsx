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
  CheckCircle,
  XCircle,
  Info,
  HelpCircle,
  ChevronDown,
  RefreshCw,
  Dumbbell,
} from 'lucide-react';

type AnalysisStatus = 'good' | 'caution' | 'avoid' | 'unknown';

type Analysis = {
  score: number;
  verdict: string;
  verdictClass: string;
  petType: string;
  ingredients: {
    name: string;
    status: AnalysisStatus;
    description: string;
    sportDietFlag?: 'avoid' | 'recommended';
  }[];
  summary: {
    good: number;
    caution: number;
    avoid: number;
    unknown: number;
  };
  sportDiet?: {
    name: string;
    key: string;
    conflicts: string[];
    recommended: string[];
  } | null;
};

const statusStyle: Record<AnalysisStatus, { bg: string; border: string; text: string; badge: string; label: string; icon: any }> = {
  good: { bg: 'bg-brand-mint', border: 'border-emerald-200', text: 'text-brand-dark', badge: 'bg-brand-light text-brand-dark border-emerald-200', label: 'Dobry', icon: CheckCircle },
  caution: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700 border-amber-200', label: 'Ostrożnie', icon: AlertCircle },
  avoid: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', badge: 'bg-red-100 text-red-700 border-red-200', label: 'Unikaj', icon: XCircle },
  unknown: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-600', badge: 'bg-gray-100 text-gray-600 border-gray-200', label: 'Nieznany', icon: HelpCircle },
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

export default function FoodScanner() {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<'scan' | 'manual'>('scan');
  const [petType, setPetType] = useState('dog');

  useEffect(() => {
    if (searchParams?.get('mode') === 'manual') {
      setMode('manual');
    }
  }, [searchParams]);
  const [pets, setPets] = useState<any[]>([]);
  const [selectedPetId, setSelectedPetId] = useState('');
  const [barcode, setBarcode] = useState('');
  const [ingredientsText, setIngredientsText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Analysis | null>(null);
  const [product, setProduct] = useState<any>(null);
  const [notFound, setNotFound] = useState(false);
  const [cameras, setCameras] = useState<any[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanHint, setScanHint] = useState('');
  const html5QrCode = useRef<any>(null);
  const readerRef = useRef<HTMLDivElement>(null);

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
  }, []);

  useEffect(() => {
    const pet = pets.find((p) => p.id.toString() === selectedPetId);
    if (pet) {
      setPetType(pet.species === 'cat' ? 'cat' : 'dog');
    }
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

        const cameras = await Html5Qrcode.getCameras();
        if (cameras && cameras.length > 0) {
          setCameras(cameras);
          const back = cameras.find((c: any) =>
            /back|tyl|rear|environment/i.test(c.label || '')
          );
          const selected = back ? back.id : cameras[0].id;
          setSelectedCameraId(selected);
          startScan(selected);
        } else {
          setScanHint('Nie znaleziono kamery. Spróbuj wpisać kod ręcznie.');
        }
      } catch (err: any) {
        setScanHint('Nie udało się uzyskać dostępu do kamery. Sprawdź uprawnienia.');
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
      } catch {
        // ignore
      }
    }
    setScanning(false);
  };

  const startScan = async (cameraId: string) => {
    if (!html5QrCode.current) return;
    try {
      setScanning(true);
      setScanHint('Ustaw kod kreskowy w ramce, aby go zeskanować');
      await html5QrCode.current.start(
        cameraId,
        { fps: 10, qrbox: (w: number, h: number) => { const dim = Math.max(120, Math.min(w, h) - 32); return { width: Math.min(250, dim), height: Math.min(250, dim) }; }, aspectRatio: 1.0 },
        (decodedText: string) => {
          handleBarcode(decodedText);
        },
        () => {
          // ignore frame errors
        }
      );
    } catch (err: any) {
      setScanning(false);
      setScanHint('Nie udało się uruchomić kamery. Spróbuj innej kamery.');
    }
  };

  const handleCameraChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedCameraId(id);
    if (scanning) await stopScan();
    startScan(id);
  };

  const handleBarcode = async (code: string) => {
    await stopScan();
    setBarcode(code);
    setLoading(true);
    setError('');
    setResult(null);
    setProduct(null);
    setNotFound(false);
    try {
      const data = await foodScannerApi.scan(code, petType, selectedPetId ? Number(selectedPetId) : undefined);
      if (!data.found) {
        setNotFound(true);
        setMode('manual');
        setError('Nie znaleziono produktu w bazie. Wpisz skład ręcznie.');
      } else {
        setProduct(data.product);
        setIngredientsText(data.product.ingredientsText || '');
        if (data.analysis) {
          setResult(data.analysis);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Błąd podczas skanowania');
    } finally {
      setLoading(false);
    }
  };

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
      const data = await foodScannerApi.analyze({ ingredients: ingredientsText, petType, petId: selectedPetId ? Number(selectedPetId) : undefined });
      setResult(data);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Błąd podczas analizy');
    } finally {
      setLoading(false);
    }
  };

  const score = result?.score ?? 0;
  const circumference = 2 * Math.PI * 52;
  const dashOffset = circumference - (score / 100) * circumference;

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="bg-white rounded-2xl p-1.5 border border-gray-200 shadow-sm flex">
        <button
          onClick={() => setMode('scan')}
          className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
            mode === 'scan'
              ? 'bg-brand-dark text-white shadow-md'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Scan className="w-4 h-4" /> Skanuj kod
        </button>
        <button
          onClick={() => setMode('manual')}
          className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
            mode === 'manual'
              ? 'bg-brand-dark text-white shadow-md'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <AlignLeft className="w-4 h-4" /> Wpisz skład
        </button>
      </div>

      {/* Settings */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-sm">
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
            Dla kogo analizujemy?
          </label>
          <div className="relative flex items-center w-full">
            <select
              value={selectedPetId}
              onChange={(e) => setSelectedPetId(e.target.value)}
              className="w-full appearance-none bg-transparent text-gray-900 font-medium focus:outline-none pr-8"
            >
              <option value="">Ogólnie (pies)</option>
              {pets.map((pet) => (
                <option key={pet.id} value={pet.id}>
                  {pet.name} ({pet.species === 'cat' ? 'kot' : 'pies'})
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-sm">
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
            Gatunek docelowy
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPetType('dog')}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                petType === 'dog' ? 'bg-brand-dark text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Pies
            </button>
            <button
              type="button"
              onClick={() => setPetType('cat')}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                petType === 'cat' ? 'bg-brand-dark text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Kot
            </button>
          </div>
        </div>
      </div>

      {/* Scan mode */}
      {mode === 'scan' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-gray-700 font-medium text-sm sm:text-base">
              <Camera className="w-5 h-5 text-brand-dark" />
              Skaner kodów kreskowych
            </div>
            {cameras.length > 1 && (
              <select
                value={selectedCameraId}
                onChange={handleCameraChange}
                className="text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-dark/30 max-w-full"
              >
                {cameras.map((c, i) => (
                  <option key={c.id} value={c.id}>
                    {c.label || `Kamera ${i + 1}`}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="relative bg-gray-900 overflow-hidden">
            <div id="reader" ref={readerRef} className="w-full aspect-square max-w-[min(400px,60vh)] max-h-[min(400px,60vh)] mx-auto overflow-hidden" />
            {!scanning && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6 text-center bg-gray-900/80">
                <Camera className="w-12 h-12 mb-3 opacity-50" />
                <p className="font-medium">{scanHint || 'Ładowanie kamery...'}</p>
                <button
                  onClick={() => selectedCameraId && startScan(selectedCameraId)}
                  className="mt-4 px-5 py-2 rounded-full bg-brand-dark text-white text-sm font-medium hover:bg-brand-dark transition-all"
                >
                  Spróbuj ponownie
                </button>
              </div>
            )}
          </div>

          <div className="p-4 bg-gray-50 border-t border-gray-100">
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
              Lub wpisz kod ręcznie
            </label>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (barcode.trim()) handleBarcode(barcode.trim());
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                inputMode="numeric"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="np. 5901234123457"
                className="flex-1 min-w-0 rounded-xl border border-gray-200 px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-dark/30 focus:border-brand-dark"
              />
              <button
                type="submit"
                disabled={!barcode.trim() || loading}
                className="px-5 py-2.5 rounded-xl bg-brand-dark text-white font-medium hover:bg-brand-dark transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Szukaj'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Manual mode */}
      {mode === 'manual' && (
        <form onSubmit={handleManualAnalyze} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
              Skład karmy
            </label>
            <textarea
              value={ingredientsText}
              onChange={(e) => setIngredientsText(e.target.value)}
              rows={6}
              placeholder="Wklej skład z opakowania, np.: mięso z kurczaka, ryż, groch, sól, cukier..."
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-dark/30 focus:border-brand-dark resize-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !ingredientsText.trim()}
            className="w-full bg-brand-dark hover:bg-brand-dark text-white py-3.5 rounded-full font-medium shadow-md shadow-brand-dark/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Analizuj skład
          </button>
        </form>
      )}

      {/* Error / not found */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {notFound && (
        <div className="p-5 rounded-2xl bg-amber-50 border border-amber-100 text-amber-700 text-sm font-medium flex items-start gap-3">
          <Info className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-semibold mb-1">Nie znaleziono produktu w bazie Open Food Facts.</p>
            <p>Wpisz skład ręcznie – analizator sprawdzi każdy składnik pod kątem bezpieczeństwa dla Twojego pupila.</p>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
          <Loader2 className="w-10 h-10 animate-spin text-brand-dark mb-3" />
          <p className="font-medium">Analizuję skład...</p>
        </div>
      )}

      {/* Product card */}
      {product && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex gap-4 items-start">
          {product.image ? (
            <img src={product.image} alt={product.name} className="w-20 h-20 rounded-xl object-cover border border-gray-100" />
          ) : (
            <div className="w-20 h-20 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400">
              <HelpCircle className="w-8 h-8" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">{product.name}</h3>
            {product.brands && <p className="text-sm text-gray-500">{product.brands}</p>}
            <p className="text-xs text-gray-400 mt-1">Kod: {product.barcode}</p>
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="relative w-32 h-32 flex-shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="52" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-gray-100" />
                  <circle
                    cx="60"
                    cy="60"
                    r="52"
                    stroke="currentColor"
                    strokeWidth="10"
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                    strokeLinecap="round"
                    className={ringColor(score)}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-gray-900">{score}</span>
                  <span className="text-xs text-gray-500">/100</span>
                </div>
              </div>
              <div className="text-center sm:text-left flex-1">
                <p className="text-sm text-gray-500 uppercase tracking-wide font-semibold mb-1">Ocena ogólna</p>
                <h3 className={`text-xl sm:text-2xl font-bold ${verdictColor(score)}`}>{result.verdict}</h3>
                <p className="text-gray-600 mt-2">
                  {petType === 'cat' ? 'Analiza pod kątem kota.' : 'Analiza pod kątem psa.'}
                  {result.summary.avoid > 0 && ' Znaleziono składniki niepożądane – zalecamy weryfikację.'}
                  {result.summary.avoid === 0 && result.summary.caution === 0 && ' Skład wygląda bardzo dobrze.'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
              <div className="p-3 rounded-xl bg-brand-mint text-center">
                <p className="text-2xl font-semibold text-brand-dark">{result.summary.good}</p>
                <p className="text-xs text-brand-dark">Dobre</p>
              </div>
              <div className="p-3 rounded-xl bg-amber-50 text-center">
                <p className="text-2xl font-semibold text-amber-700">{result.summary.caution}</p>
                <p className="text-xs text-amber-600">Ostrożnie</p>
              </div>
              <div className="p-3 rounded-xl bg-red-50 text-center">
                <p className="text-2xl font-semibold text-red-700">{result.summary.avoid}</p>
                <p className="text-xs text-red-600">Unikaj</p>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 text-center">
                <p className="text-2xl font-semibold text-gray-700">{result.summary.unknown}</p>
                <p className="text-xs text-gray-600">Nieznane</p>
              </div>
            </div>
          </div>

          {result.sportDiet && (
            <div className={`p-4 sm:p-5 rounded-2xl border ${result.sportDiet.conflicts.length > 0 ? 'bg-red-50 border-red-200' : 'bg-brand-mint border-emerald-200'}`}>
              <div className="flex items-start gap-3">
                <Dumbbell className={`w-5 h-5 flex-shrink-0 ${result.sportDiet.conflicts.length > 0 ? 'text-red-600' : 'text-brand-dark'}`} />
                <div>
                  <p className={`text-sm font-semibold ${result.sportDiet.conflicts.length > 0 ? 'text-red-700' : 'text-brand-dark'}`}>
                    Dieta sportowa: „{result.sportDiet.name}”
                  </p>
                  {result.sportDiet.conflicts.length > 0 ? (
                    <p className="text-sm text-red-600 mt-1">
                      Niezalecane przy tej diecie: {result.sportDiet.conflicts.join(', ')}
                    </p>
                  ) : result.sportDiet.recommended.length > 0 ? (
                    <p className="text-sm text-brand-dark mt-1">
                      Zalecane składniki dla tej diety: {result.sportDiet.recommended.join(', ')}
                    </p>
                  ) : (
                    <p className="text-sm text-brand-dark mt-1">Brak konfliktów z aktywną dietą sportową.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-4">Szczegółowa analiza składników</p>
            <div className="space-y-3">
              {result.ingredients.map((ing, idx) => {
                const style = statusStyle[ing.status];
                const Icon = style.icon;
                return (
                  <div
                    key={idx}
                    className={`flex items-start gap-3 p-4 rounded-xl border ${style.border} ${style.bg}`}
                  >
                    <Icon className={`w-5 h-5 flex-shrink-0 ${style.text}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-900 break-words max-w-full">{ing.name}</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${style.badge}`}>
                          {style.label}
                        </span>
                        {ing.sportDietFlag === 'avoid' && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full border bg-red-100 text-red-700 border-red-200 flex items-center gap-1">
                            <Dumbbell className="w-3 h-3" /> Konflikt z dietą sportową
                          </span>
                        )}
                        {ing.sportDietFlag === 'recommended' && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full border bg-brand-light text-brand-dark border-emerald-200 flex items-center gap-1">
                            <Dumbbell className="w-3 h-3" /> Zalecane w diecie sportowej
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1 break-words">{ing.description}</p>
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
