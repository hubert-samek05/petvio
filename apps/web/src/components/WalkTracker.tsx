'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  MapPin, Play, Pause, Square, Clock, Route, Footprints, Plus,
  ChevronDown, ChevronUp, Trash2, AlertTriangle,
  Share2, Loader2, Check,
} from 'lucide-react';
import { petApi, walkApi, postsApi } from '@/lib/api';
import StatCard from '@/components/StatCard';
import { StatCardSkeleton, ListRowSkeleton } from '@/components/ui/Skeleton';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { speciesInfo } from '@/components/PetForm';

const WalkMap = dynamic(() => import('@/components/WalkMap'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-brand-mint/50 flex items-center justify-center"><MapPin className="w-8 h-8 text-brand-dark/40 animate-pulse-soft" /></div>,
});

interface WalkPoint {
  lat: number;
  lng: number;
  timestamp: number;
}

interface Walk {
  id: number | string;
  pet_id?: number;
  started_at: string;
  duration_seconds: number;
  distance_meters: number;
  points: WalkPoint[];
  pet_name?: string;
  pet_species?: string;
  pet_photo_url?: string | null;
  /** stare wpisy z localStorage */
  local?: boolean;
}

// Filtrowanie szumu GPS
const MAX_ACCURACY_M = 45; // ignoruj punkty z dokładnością gorszą niż 45 m
const MIN_STEP_M = 4;      // ignoruj kroki mniejsze niż 4 m (drgania na miejscu)
const MAX_STEP_M = 500;    // ignoruj skoki > 500 m między fixami (błędy GPS)

const WALK_DRAFT_KEY = 'walkDraft';
const SHARED_WALKS_KEY = 'sharedWalkIds';

interface WalkDraft {
  petId: string;
  startMs: number;
  elapsedMs: number;
  distance: number;
  points: WalkPoint[];
  savedAt: number;
}

/** Geolokalizacja — natywna wtyczka w aplikacji Capacitor, navigator w przeglądarce. */
const capGeo = (): any => (window as any).Capacitor?.Plugins?.Geolocation;

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const formatDuration = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`;
};

const formatDistance = (m: number) => (m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(2)} km`);

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

const paceMinPerKm = (distanceM: number, seconds: number) => {
  if (distanceM < 50 || seconds < 30) return null;
  const minPerKm = seconds / 60 / (distanceM / 1000);
  return `${Math.floor(minPerKm)}:${String(Math.round((minPerKm % 1) * 60)).padStart(2, '0')} /km`;
};

export default function WalkTracker() {
  const [pets, setPets] = useState<any[]>([]);
  const [selectedPet, setSelectedPet] = useState<string | null>(null);
  const [walks, setWalks] = useState<Walk[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError] = useState('');

  const [isTracking, setIsTracking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);   // sekundy aktywnego spaceru
  const [distance, setDistance] = useState(0);   // metry
  const [points, setPoints] = useState<WalkPoint[]>([]);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsError, setGpsError] = useState('');
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<WalkDraft | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Walk | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [uploadingLocal, setUploadingLocal] = useState<number | string | null>(null);

  const [expandedWalk, setExpandedWalk] = useState<number | string | null>(null);
  const [showHistory, setShowHistory] = useState(true);

  const watchIdRef = useRef<number | string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const draftRef = useRef<NodeJS.Timeout | null>(null);
  const walkStartMsRef = useRef<number>(0);    // moment STARTU spaceru (niezmienny)
  const startMsRef = useRef<number>(0);        // moment wznowienia timera
  const elapsedRef = useRef<number>(0);        // ms zgromadzone przed pauzą
  const distanceRef = useRef<number>(0);       // metry (bez podwójnego liczenia przez state)
  const lastPointRef = useRef<WalkPoint | null>(null); // ostatni zaakceptowany punkt trasy
  const pointsRef = useRef<WalkPoint[]>([]);   // kopia punktów dla zapisu szkicu
  const pausedRef = useRef(false);             // stan pauzy dla zapisu szkicu (interwał nie widzi state)

  /* ---------- Wczytanie pupili + historii ---------- */
  const loadData = async () => {
    setLoadingData(true);
    setDataError('');
    let failed = false;

    try {
      const res = await petApi.getAll();
      const list = res.pets || res || [];
      setPets(list);
      if (list.length === 1) setSelectedPet((cur) => cur || String(list[0].id));
    } catch {
      failed = true;
    }

    let serverWalks: Walk[] = [];
    try {
      const res = await walkApi.getAll();
      serverWalks = res.walks || [];
    } catch {
      failed = true;
    }

    // Starsze spacery zapisane lokalnie — wyświetlamy z oznaczeniem „lokalny"
    let localWalks: Walk[] = [];
    try {
      const saved = JSON.parse(localStorage.getItem('walkHistory') || '[]');
      localWalks = (Array.isArray(saved) ? saved : []).map((w: any) => ({
        id: `local-${w.id}`,
        started_at: w.date,
        duration_seconds: w.duration,
        distance_meters: w.distance,
        points: w.points || [],
        local: true,
      }));
    } catch {}

    setWalks([...serverWalks, ...localWalks]);
    if (failed) setDataError('Nie udało się pobrać wszystkich danych');
    setLoadingData(false);
  };

  useEffect(() => {
    loadData();

    // Niedokończony szkic spaceru (np. po zamknięciu aplikacji)
    try {
      const saved = JSON.parse(localStorage.getItem(WALK_DRAFT_KEY) || 'null');
      if (saved && saved.savedAt && Date.now() - saved.savedAt < 24 * 3600 * 1000) {
        setDraft(saved);
      } else if (saved) {
        localStorage.removeItem(WALK_DRAFT_KEY);
      }
    } catch {}

    try {
      setSharedIds(new Set(JSON.parse(localStorage.getItem(SHARED_WALKS_KEY) || '[]')));
    } catch {}

    return () => cleanupTracking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- Ostrzeżenie przy zamykaniu podczas spaceru ---------- */
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isTracking) e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isTracking]);

  /* ---------- Timer — liczy tylko aktywny czas (bez pauz) ---------- */
  useEffect(() => {
    if (isTracking && !isPaused) {
      timerRef.current = setInterval(() => {
        setDuration(Math.floor((elapsedRef.current + Date.now() - startMsRef.current) / 1000));
      }, 1000);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isTracking, isPaused]);

  /* ---------- Obsługa pozycji GPS (wspólna dla start i resume) ---------- */
  const onPosition = useCallback((position: GeolocationPosition) => {
    const { latitude, longitude, accuracy } = position.coords;
    setGpsError('');
    setCurrentLocation({ lat: latitude, lng: longitude });

    if (accuracy && accuracy > MAX_ACCURACY_M) return; // za słaby sygnał — ignoruj

    const point: WalkPoint = { lat: latitude, lng: longitude, timestamp: Date.now() };
    const prev = lastPointRef.current;

    if (prev) {
      const step = haversineMeters(prev.lat, prev.lng, latitude, longitude);
      if (step < MIN_STEP_M) return;   // szum / stanięcie w miejscu
      if (step > MAX_STEP_M) return;   // skok GPS — ignoruj
      distanceRef.current += step;
      setDistance(distanceRef.current);
    }

    lastPointRef.current = point;
    pointsRef.current = [...pointsRef.current, point];
    setPoints(pointsRef.current);
  }, []);

  const onPositionError = useCallback((error: GeolocationPositionError) => {
    const msg =
      error.code === 1
        ? 'Brak zgody na lokalizację — włącz GPS w ustawieniach przeglądarki.'
        : error.code === 2
        ? 'Nie można ustalić pozycji — sprawdź sygnał GPS.'
        : 'Przekroczono czas oczekiwania na GPS.';
    setGpsError(msg);
  }, []);

  const startWatching = useCallback(() => {
    const geo = capGeo();
    if (geo?.watchPosition) {
      // Aplikacja mobilna — wtyczka sama poprosi o zgodę, ale wywołujemy jawnie dla pewności
      geo.requestPermissions?.().catch(() => {});
      Promise.resolve(geo.watchPosition({ enableHighAccuracy: true }, onPosition, onPositionError))
        .then((id: string) => { watchIdRef.current = id; })
        .catch(() => setGpsError('Brak zgody na lokalizację — włącz GPS w ustawieniach aplikacji.'));
      return;
    }
    if (!('geolocation' in navigator)) {
      setGpsError('Ta przeglądarka nie obsługuje geolokalizacji.');
      return;
    }
    watchIdRef.current = navigator.geolocation.watchPosition(onPosition, onPositionError, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 2000,
    });
  }, [onPosition, onPositionError]);

  const stopWatching = useCallback(() => {
    if (watchIdRef.current === null) return;
    const geo = capGeo();
    if (geo?.clearWatch && typeof watchIdRef.current === 'string') {
      geo.clearWatch({ id: watchIdRef.current }).catch?.(() => {});
    } else if ('geolocation' in navigator && typeof watchIdRef.current === 'number') {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    watchIdRef.current = null;
  }, []);

  function cleanupTracking() {
    stopWatching();
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (draftRef.current) {
      clearInterval(draftRef.current);
      draftRef.current = null;
    }
  }

  /* ---------- Szkic spaceru (przetrwa zamknięcie aplikacji) ---------- */
  const saveDraft = useCallback(() => {
    if (!selectedPet) return;
    try {
      localStorage.setItem(WALK_DRAFT_KEY, JSON.stringify({
        petId: selectedPet,
        startMs: walkStartMsRef.current,
        elapsedMs: elapsedRef.current + (pausedRef.current ? 0 : Date.now() - startMsRef.current),
        distance: distanceRef.current,
        points: pointsRef.current,
        savedAt: Date.now(),
      } satisfies WalkDraft));
    } catch {}
  }, [selectedPet]);

  const startDraftSaver = () => {
    if (draftRef.current) clearInterval(draftRef.current);
    draftRef.current = setInterval(saveDraft, 10000);
  };

  const clearDraft = () => {
    try { localStorage.removeItem(WALK_DRAFT_KEY); } catch {}
    setDraft(null);
  };

  const resumeDraft = () => {
    if (!draft) return;
    elapsedRef.current = draft.elapsedMs;
    distanceRef.current = draft.distance;
    lastPointRef.current = null;
    pointsRef.current = draft.points;
    setPoints(draft.points);
    setDistance(draft.distance);
    setDuration(Math.floor(draft.elapsedMs / 1000));
    setGpsError('');
    setSelectedPet(draft.petId);
    walkStartMsRef.current = draft.startMs;
    startMsRef.current = Date.now();
    pausedRef.current = false;
    setIsTracking(true);
    setIsPaused(false);
    setDraft(null);
    startWatching();
    startDraftSaver();
  };

  /* ---------- Sterowanie spacerem ---------- */
  const startWalk = () => {
    if (!selectedPet) return;
    elapsedRef.current = 0;
    distanceRef.current = 0;
    lastPointRef.current = null;
    pointsRef.current = [];
    setPoints([]);
    setDistance(0);
    setDuration(0);
    setGpsError('');
    setCurrentLocation(null);
    setIsTracking(true);
    setIsPaused(false);
    walkStartMsRef.current = Date.now();
    startMsRef.current = Date.now();
    pausedRef.current = false;
    startWatching();
    startDraftSaver();
  };

  const pauseWalk = () => {
    elapsedRef.current += Date.now() - startMsRef.current;
    pausedRef.current = true;
    setIsPaused(true);
    stopWatching();
    saveDraft();
  };

  const resumeWalk = () => {
    lastPointRef.current = null; // nie licz przemieszczenia podczas pauzy
    startMsRef.current = Date.now();
    pausedRef.current = false;
    setIsPaused(false);
    startWatching();
  };

  const stopWalk = async () => {
    cleanupTracking();
    const wasPaused = isPaused;
    setIsTracking(false);
    setIsPaused(false);

    const totalElapsed = elapsedRef.current + (wasPaused ? 0 : Date.now() - startMsRef.current);
    const finalDuration = Math.floor(totalElapsed / 1000);
    const finalDistance = distanceRef.current;
    const finalPoints = points;

    if (finalDuration < 5 && finalDistance < 10) {
      // za krótki spacer — nic nie zapisuj
      clearDraft();
      resetTrackingState();
      return;
    }

    const startedAtIso = new Date(walkStartMsRef.current || Date.now() - totalElapsed).toISOString();

    setSaving(true);
    try {
      const res = await walkApi.create({
        petId: Number(selectedPet),
        startedAt: startedAtIso,
        durationSeconds: finalDuration,
        distanceMeters: Math.round(finalDistance * 100) / 100,
        points: finalPoints,
      });
      const pet = petOf(selectedPet);
      setWalks((w) => [{ ...res.walk, pet_name: pet?.name, pet_species: pet?.species, pet_photo_url: pet?.photo_url }, ...w]);
    } catch {
      // Fallback lokalny gdy API nie odpowiada
      const localWalk: Walk = {
        id: `local-${Date.now()}`,
        started_at: startedAtIso,
        duration_seconds: finalDuration,
        distance_meters: finalDistance,
        points: finalPoints,
        local: true,
      };
      setWalks((w) => [localWalk, ...w]);
      try {
        const saved = JSON.parse(localStorage.getItem('walkHistory') || '[]');
        saved.unshift({
          id: String(localWalk.id).replace('local-', ''),
          date: localWalk.started_at,
          duration: localWalk.duration_seconds,
          distance: localWalk.distance_meters,
          points: localWalk.points,
        });
        localStorage.setItem('walkHistory', JSON.stringify(saved));
      } catch {}
      setGpsError('Spacer zapisano lokalnie — brak połączenia z serwerem.');
    } finally {
      setSaving(false);
      clearDraft();
      resetTrackingState();
    }
  };

  const resetTrackingState = () => {
    pointsRef.current = [];
    setPoints([]);
    setDistance(0);
    setDuration(0);
    setCurrentLocation(null);
    elapsedRef.current = 0;
    distanceRef.current = 0;
    lastPointRef.current = null;
  };

  const [sharingWalk, setSharingWalk] = useState<number | string | null>(null);
  const [sharedIds, setSharedIds] = useState<Set<number | string>>(new Set());

  const shareWalk = async (walk: Walk) => {
    if (sharingWalk) return;
    setHistoryError('');
    setSharingWalk(walk.id);
    try {
      await postsApi.createPost({ content: '', images: [], walkId: Number(walk.id) });
      setSharedIds((s) => {
        const next = new Set(s).add(walk.id);
        try { localStorage.setItem(SHARED_WALKS_KEY, JSON.stringify(Array.from(next))); } catch {}
        return next;
      });
    } catch {
      setHistoryError('Nie udało się udostępnić spaceru na Tablicy.');
    } finally {
      setSharingWalk(null);
    }
  };

  const deleteWalk = async () => {
    const walk = deleteTarget;
    if (!walk) return;
    setDeleting(true);
    setHistoryError('');
    try {
      if (walk.local) {
        const updated = walks.filter((w) => w.id !== walk.id);
        setWalks(updated);
        localStorage.setItem('walkHistory', JSON.stringify(
          updated.filter((w) => w.local).map((w) => ({
            id: String(w.id).replace('local-', ''),
            date: w.started_at,
            duration: w.duration_seconds,
            distance: w.distance_meters,
            points: w.points,
          }))
        ));
      } else {
        await walkApi.delete(Number(walk.id));
        setWalks((w) => w.filter((x) => x.id !== walk.id));
      }
      setDeleteTarget(null);
    } catch {
      setHistoryError('Nie udało się usunąć spaceru.');
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  /** Wpis lokalny (zapisany bez sieci) — wyślij na serwer. */
  const uploadLocalWalk = async (walk: Walk) => {
    if (!walk.local || uploadingLocal) return;
    setUploadingLocal(walk.id);
    setHistoryError('');
    const petForWalk = pets.find((p) => String(p.id) === selectedPet) || pets[0];
    try {
      const res = await walkApi.create({
        petId: Number(walk.pet_id ?? petForWalk?.id),
        startedAt: walk.started_at,
        durationSeconds: Number(walk.duration_seconds),
        distanceMeters: Number(walk.distance_meters),
        points: walk.points || [],
      });
      const updated = walks.filter((w) => w.id !== walk.id);
      setWalks([{ ...res.walk }, ...updated]);
      localStorage.setItem('walkHistory', JSON.stringify(
        updated.filter((w) => w.local).map((w) => ({
          id: String(w.id).replace('local-', ''),
          date: w.started_at,
          duration: w.duration_seconds,
          distance: w.distance_meters,
          points: w.points,
        }))
      ));
    } catch {
      setHistoryError('Nie udało się wysłać spaceru na serwer.');
    } finally {
      setUploadingLocal(null);
    }
  };

  /* ---------- Statystyki ---------- */
  const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
  const thisWeek = walks.filter((w) => new Date(w.started_at).getTime() >= weekAgo);
  const weekDistance = thisWeek.reduce((s, w) => s + Number(w.distance_meters || 0), 0);
  const totalDistance = walks.reduce((s, w) => s + Number(w.distance_meters || 0), 0);
  const totalSeconds = walks.reduce((s, w) => s + Number(w.duration_seconds || 0), 0);

  const petOf = (id: string | null) => pets.find((p) => String(p.id) === id);
  const pace = paceMinPerKm(distance, duration);

  return (
    <div className="space-y-7">
      {/* ====== STATYSTYKI ====== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {loadingData ? (
          <><StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton /></>
        ) : (
          <>
            <StatCard icon={Footprints} label="Spacery w tym tygodniu" value={thisWeek.length} iconBg="bg-brand-mint" iconColor="text-brand-dark" stagger="stagger-1" />
            <StatCard icon={Route} label="Km w tym tygodniu" value={(weekDistance / 1000).toFixed(1)} animate={false} iconBg="bg-brand-peach" iconColor="text-brand-dark" stagger="stagger-2" />
            <StatCard icon={MapPin} label="Łączny dystans" value={`${(totalDistance / 1000).toFixed(1)} km`} animate={false} iconBg="bg-brand-light" iconColor="text-brand-dark" stagger="stagger-3" />
            <StatCard icon={Clock} label="Łączny czas" value={`${Math.floor(totalSeconds / 3600)}h ${Math.floor((totalSeconds % 3600) / 60)}min`} animate={false} iconBg="bg-brand-mint" iconColor="text-brand-dark" stagger="stagger-4" />
          </>
        )}
      </div>

      {/* ====== BŁĄD POBIERANIA ====== */}
      {dataError && (
        <div className="pv-card p-5 flex flex-col sm:flex-row items-center gap-4 animate-slide-down">
          <p className="flex-1 text-sm text-red-500 font-medium">{dataError}</p>
          <button onClick={loadData} className="pv-btn-ghost px-5 py-2.5 text-sm">
            Spróbuj ponownie
          </button>
        </div>
      )}

      {/* ====== NIEDOKOŃCZONY SPACER (szkic) ====== */}
      {draft && !isTracking && (
        <div className="pv-card p-5 flex flex-col sm:flex-row items-center gap-4 border-brand-light animate-slide-down">
          <div className="w-11 h-11 rounded-2xl bg-amber-100 flex items-center justify-center flex-shrink-0">
            <Footprints className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <p className="font-semibold text-gray-900 text-sm">Niedokończony spacer</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {formatDistance(draft.distance)} · {formatDuration(Math.floor(draft.elapsedMs / 1000))} ·{' '}
              {new Date(draft.savedAt).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={resumeDraft} className="pv-btn-primary px-5 py-2.5 text-sm">
              <Play className="w-4 h-4" /> Wznów
            </button>
            <button onClick={clearDraft} className="pv-btn-ghost px-4 py-2.5 text-sm">
              Odrzuć
            </button>
          </div>
        </div>
      )}

      {/* ====== WYBÓR PUPILA ====== */}
      {!isTracking && (
        <div className="pv-card p-5 sm:p-6 animate-slide-up stagger-5">
          <h3 className="pv-section-title mb-4">Z kim idziesz na spacer?</h3>
          {pets.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-gray-500 mb-4">Najpierw dodaj zwierzę, aby śledzić spacery.</p>
              <Link href="/dashboard/pets/new" className="pv-btn-primary px-5 py-2.5 text-sm inline-flex">
                <Plus className="w-4 h-4" /> Dodaj zwierzę
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {pets.map((pet) => {
                const sel = selectedPet === String(pet.id);
                return (
                  <button
                    key={pet.id}
                    onClick={() => setSelectedPet(String(pet.id))}
                    className={`pv-card-hover p-4 rounded-2xl border-2 transition-all active:scale-95 ${
                      sel ? 'border-brand bg-brand-mint shadow-md' : 'border-gray-100'
                    }`}
                  >
                    <div className="text-center">
                      <div className={`w-12 h-12 mx-auto mb-2 rounded-2xl flex items-center justify-center text-2xl overflow-hidden transition-transform ${sel ? 'bg-white shadow-sm scale-105' : 'bg-brand-mint'}`}>
                        {pet.photo_url ? (
                          <img src={pet.photo_url} alt={pet.name} className="w-full h-full object-cover" />
                        ) : (
                          speciesInfo(pet.species).emoji
                        )}
                      </div>
                      <div className={`text-sm font-semibold ${sel ? 'text-brand-dark' : 'text-gray-700'}`}>{pet.name}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ====== MAPA Z KONTROLKAMI (Strava-style) ====== */}
      <div className="pv-card overflow-hidden animate-slide-up stagger-6">
        <div className="h-80 sm:h-[26rem] relative bg-brand-mint/40">
          <WalkMap points={points} current={currentLocation} following={isTracking && !isPaused} className="h-full" />

          {/* Statystyki na żywo — nakładka na mapę */}
          {isTracking && (
            <div className="absolute top-3 left-3 right-3 sm:right-auto sm:min-w-[300px] z-[500] rounded-2xl px-4 py-3 backdrop-blur-md bg-[#0F3D2E]/85 text-white shadow-xl animate-slide-down">
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`w-2 h-2 rounded-full ${isPaused ? 'bg-amber-300' : 'bg-[#8FE3B4] animate-pulse'}`} />
                <span className="text-[11px] font-semibold uppercase tracking-wide text-white/80">
                  {isPaused ? 'Wstrzymany' : 'W trakcie'} · {petOf(selectedPet)?.name}
                </span>
              </div>
              <div className="flex items-center gap-5">
                <div>
                  <p className="text-[10px] text-white/60 uppercase tracking-wide">Czas</p>
                  <p className="text-lg font-bold tabular-nums leading-tight">{formatDuration(duration)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-white/60 uppercase tracking-wide">Dystans</p>
                  <p className="text-lg font-bold tabular-nums leading-tight">{formatDistance(distance)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-white/60 uppercase tracking-wide">Tempo</p>
                  <p className="text-lg font-bold tabular-nums leading-tight">{pace || '—'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Podpowiedź przed startem */}
          {!isTracking && !currentLocation && points.length === 0 && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[500] px-4 py-2 rounded-full bg-white/90 backdrop-blur shadow-md text-xs font-semibold text-gray-600 whitespace-nowrap">
              🐾 Trasa narysuje się na żywo podczas spaceru
            </div>
          )}

          {/* Błąd GPS */}
          {gpsError && isTracking && (
            <div className="absolute top-20 left-3 right-3 sm:left-1/2 sm:-translate-x-1/2 sm:right-auto z-[500] flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-red-500 text-white text-xs font-semibold shadow-lg animate-slide-up">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {gpsError}
            </div>
          )}

          {/* Kontrolki — nakładka na dole mapy */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[500] w-[calc(100%-2rem)] max-w-sm">
            {!isTracking ? (
              <button
                onClick={startWalk}
                disabled={!selectedPet || pets.length === 0}
                className="w-full flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl bg-brand-dark text-white font-bold text-base shadow-2xl hover:bg-brand transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Play className="w-5 h-5" /> Rozpocznij spacer
              </button>
            ) : (
              <div className="flex gap-2.5">
                {!isPaused ? (
                  <button
                    onClick={pauseWalk}
                    className="flex-1 flex items-center justify-center gap-2 px-5 py-4 rounded-2xl bg-amber-500 text-white font-bold shadow-2xl hover:bg-amber-600 transition-all active:scale-95"
                  >
                    <Pause className="w-5 h-5" /> Pauza
                  </button>
                ) : (
                  <button
                    onClick={resumeWalk}
                    className="flex-1 flex items-center justify-center gap-2 px-5 py-4 rounded-2xl bg-brand-dark text-white font-bold shadow-2xl hover:bg-brand transition-all active:scale-95"
                  >
                    <Play className="w-5 h-5" /> Wznów
                  </button>
                )}
                <button
                  onClick={stopWalk}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-5 py-4 rounded-2xl bg-red-500 text-white font-bold shadow-2xl hover:bg-red-600 transition-all active:scale-95 disabled:opacity-60"
                >
                  <Square className="w-5 h-5" /> {saving ? 'Zapis…' : 'Zakończ'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ====== HISTORIA ====== */}
      <div className="pv-card overflow-hidden animate-slide-up stagger-7">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="w-full flex items-center justify-between px-6 py-5 hover:bg-brand-mint/40 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-mint flex items-center justify-center">
              <Footprints className="w-5 h-5 text-brand-dark" />
            </div>
            <h3 className="pv-section-title">Historia spacerów</h3>
            <span className="text-sm text-gray-400">({walks.length})</span>
          </div>
          {showHistory ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </button>

        {showHistory && (
          <div className="border-t border-gray-100/80 p-4 sm:p-6">
            {historyError && (
              <div className="mb-4 p-3.5 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium">
                {historyError}
              </div>
            )}
            {loadingData ? (
              <div className="space-y-2"><ListRowSkeleton /><ListRowSkeleton /></div>
            ) : walks.length === 0 ? (
              <div className="text-center py-8 animate-fade-in">
                <div className="w-16 h-16 mx-auto mb-4 rounded-3xl bg-brand-mint flex items-center justify-center animate-float">
                  <Footprints className="w-7 h-7 text-brand-dark" />
                </div>
                <p className="font-semibold text-gray-700">Brak zapisanych spacerów</p>
                <p className="text-sm text-gray-400 mt-1">Wybierz pupila i rozpocznij pierwszy spacer.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {walks.map((walk, i) => {
                  const expanded = expandedWalk === walk.id;
                  const hasRoute = (walk.points?.length || 0) >= 2;
                  return (
                    <div
                      key={walk.id}
                      className={`rounded-2xl border border-transparent hover:border-brand-light transition-all animate-slide-up stagger-${Math.min(i + 1, 8)} ${expanded ? 'bg-brand-mint/50 border-brand-light' : 'bg-gray-50/70'}`}
                    >
                      <div
                        className={`flex items-center gap-4 p-3.5 ${hasRoute ? 'cursor-pointer' : ''}`}
                        onClick={() => hasRoute && setExpandedWalk(expanded ? null : walk.id)}
                      >
                        <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center shadow-sm flex-shrink-0 text-xl overflow-hidden">
                          {walk.pet_photo_url ? (
                            <img src={walk.pet_photo_url} alt="" className="w-full h-full object-cover" />
                          ) : walk.pet_species ? (
                            speciesInfo(walk.pet_species).emoji
                          ) : (
                            <Footprints className="w-5 h-5 text-brand-dark" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-gray-900 text-sm">{formatDate(walk.started_at)}</p>
                            {walk.pet_name && <span className="text-xs text-brand font-semibold">· {walk.pet_name}</span>}
                            {walk.local && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold uppercase">lokalny</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">
                            {hasRoute ? `${walk.points.length} pkt GPS` : 'bez trasy GPS'}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-bold text-gray-900 text-sm tabular-nums">{formatDistance(Number(walk.distance_meters))}</p>
                          <p className="text-xs text-gray-500 tabular-nums">{formatDuration(Number(walk.duration_seconds))}</p>
                        </div>
                        {walk.local && (
                          <button
                            onClick={(e) => { e.stopPropagation(); uploadLocalWalk(walk); }}
                            disabled={uploadingLocal === walk.id}
                            className="w-8 h-8 rounded-xl text-gray-400 hover:bg-brand-mint hover:text-brand-dark transition-all flex items-center justify-center flex-shrink-0 disabled:opacity-50"
                            aria-label="Wyślij spacer na serwer"
                            title="Wyślij spacer na serwer"
                          >
                            {uploadingLocal === walk.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4 rotate-90" />}
                          </button>
                        )}
                        {!walk.local && hasRoute && (
                          sharedIds.has(walk.id) ? (
                            <Link
                              href="/dashboard/community"
                              onClick={(e) => e.stopPropagation()}
                              className="w-8 h-8 rounded-xl bg-brand-mint text-brand-dark transition-all flex items-center justify-center flex-shrink-0"
                              aria-label="Udostępniono — zobacz na Tablicy"
                              title="Udostępniono — zobacz na Tablicy"
                            >
                              <Check className="w-4 h-4" />
                            </Link>
                          ) : (
                            <button
                              onClick={(e) => { e.stopPropagation(); shareWalk(walk); }}
                              className="w-8 h-8 rounded-xl text-gray-400 hover:bg-brand-mint hover:text-brand-dark transition-all flex items-center justify-center flex-shrink-0"
                              aria-label="Udostępnij spacer na Tablicy"
                              title="Udostępnij spacer na Tablicy"
                            >
                              {sharingWalk === walk.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                            </button>
                          )
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteTarget(walk); }}
                          className="w-8 h-8 rounded-xl text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all flex items-center justify-center flex-shrink-0"
                          aria-label="Usuń spacer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      {expanded && hasRoute && (
                        <div className="px-3.5 pb-3.5">
                          <div className="rounded-2xl overflow-hidden border border-brand-light h-56">
                            <WalkMap points={walk.points} className="h-full" />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Usunąć ten spacer?"
        description={`${deleteTarget ? formatDistance(Number(deleteTarget.distance_meters)) : ''} · ${deleteTarget ? formatDuration(Number(deleteTarget.duration_seconds)) : ''}. Ta operacja jest nieodwracalna.`}
        loading={deleting}
        onConfirm={deleteWalk}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
