'use client';

import { useState, useEffect, useRef } from 'react';
import { petApi, userPreferencesApi } from '@/lib/api';
import {
  Phone, MapPin, ChevronRight, Navigation, BookOpen,
  CheckCircle2, XCircle, Info, Search, Crosshair, Loader2, Settings,
  Siren, Play, Pause, RotateCcw, Volume2, VolumeX, X, Shield, Clock, AlertTriangle,
} from 'lucide-react';
import {
  PROCEDURES, CATEGORIES, URGENCY_CFG, KIT_ITEMS, VET_CONTACTS,
  SPECIES_EMOJI, EmergencyProcedure, EmergencyClinic,
} from './firstAidData';

type Tab = 'sos' | 'procedures' | 'clinics' | 'kit';

export default function FirstAid() {
  const [tab, setTab] = useState<Tab>('sos');
  const [pets, setPets] = useState<any[]>([]);
  const [selectedPet, setSelectedPet] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  // Tryb kroków
  const [activeProcedure, setActiveProcedure] = useState<EmergencyProcedure | null>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [doneSteps, setDoneSteps] = useState<number[]>([]);
  const [showDonts, setShowDonts] = useState(false);
  // Stoper
  const [timerSec, setTimerSec] = useState(0);
  const [timerOn, setTimerOn] = useState(false);
  // Metronom RKO (~110 BPM)
  const [metroOn, setMetroOn] = useState(false);
  const [metroSound, setMetroSound] = useState(true);
  const [metroTick, setMetroTick] = useState(false);
  const audioRef = useRef<AudioContext | null>(null);
  // Lecznice
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [nearbyClinics, setNearbyClinics] = useState<EmergencyClinic[]>([]);
  const [locating, setLocating] = useState(false);
  const [locationState, setLocationState] = useState<'idle' | 'denied' | 'granted' | 'unsupported' | 'unavailable'>('idle');
  const [clinicsLoading, setClinicsLoading] = useState(false);
  const [clinicsError, setClinicsError] = useState('');
  // Apteczka
  const [kitDone, setKitDone] = useState<string[]>([]);
  const [kitError, setKitError] = useState('');
  const [petsError, setPetsError] = useState('');

  useEffect(() => {
    loadPets();
    // Checklista apteczki — z serwera; migracja starego klucza localStorage
    (async () => {
      const legacy = localStorage.getItem('firstAidKit');
      try {
        const res = await userPreferencesApi.get('first_aid_kit');
        if (Array.isArray(res.value)) {
          setKitDone(res.value.filter((x: any) => typeof x === 'string'));
        } else if (legacy) {
          try {
            const arr = JSON.parse(legacy);
            if (Array.isArray(arr) && arr.length > 0) {
              setKitDone(arr.filter((x: any) => typeof x === 'string'));
              await userPreferencesApi.set('first_aid_kit', arr.filter((x: any) => typeof x === 'string'));
            }
          } catch {}
        }
        if (legacy) localStorage.removeItem('firstAidKit');
      } catch {
        // API niedostępne — pokaż lokalną kopię, zapis zsynchronizuje się przy kolejnym odhaczaniu
        if (legacy) {
          try {
            const arr = JSON.parse(legacy);
            if (Array.isArray(arr)) setKitDone(arr.filter((x: any) => typeof x === 'string'));
          } catch {}
        }
        setKitError('Checklista nie zsynchronizowała się z serwerem — zmiany mogą nie być widoczne na innych urządzeniach.');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Gdyby użytkownik wyszedł ze strony z otwartym trybem kroków — zawsze przywróć scroll
  useEffect(() => () => { document.body.style.overflow = ''; }, []);

  const loadPets = () => {
    setPetsError('');
    petApi.getAll().then((res) => {
      const list = res.pets || res || [];
      setPets(list);
      if (list.length > 0) setSelectedPet(String(list[0].id));
    }).catch(() => setPetsError('Nie udało się pobrać listy zwierząt.'));
  };

  useEffect(() => {
    if (!timerOn) return;
    const t = setInterval(() => setTimerSec((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [timerOn]);

  useEffect(() => {
    if (!metroOn) return;
    const interval = setInterval(() => {
      setMetroTick((v) => !v);
      if (metroSound && audioRef.current) {
        try {
          const ctx = audioRef.current;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = 880;
          gain.gain.setValueAtTime(0.12, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
          osc.start();
          osc.stop(ctx.currentTime + 0.08);
        } catch {}
      }
    }, 545);
    return () => clearInterval(interval);
  }, [metroOn, metroSound]);

  const openProcedure = (p: EmergencyProcedure) => {
    setActiveProcedure(p);
    setStepIdx(0);
    setDoneSteps([]);
    setShowDonts(false);
    setTimerSec(0);
    setTimerOn(false);
    setMetroOn(false);
    document.body.style.overflow = 'hidden';
  };

  const closeProcedure = () => {
    setActiveProcedure(null);
    setMetroOn(false);
    setTimerOn(false);
    document.body.style.overflow = '';
  };

  const toggleStep = (i: number) => {
    const wasDone = doneSteps.includes(i);
    setDoneSteps((d) => (wasDone ? d.filter((x) => x !== i) : [...d, i]));
    if (wasDone) {
      // Odchaczenie — wróć do tego kroku
      setStepIdx(i);
    } else if (i === stepIdx && stepIdx < (activeProcedure?.steps.length || 0) - 1) {
      // Odhaczono bieżący krok — przejdź do następnego
      setStepIdx(stepIdx + 1);
    }
  };

  const startMetronome = () => {
    if (!audioRef.current) {
      try { audioRef.current = new (window.AudioContext || (window as any).webkitAudioContext)(); } catch {}
    }
    if (audioRef.current?.state === 'suspended') audioRef.current.resume();
    setMetroOn(true);
  };

  const currentPet = pets.find((p) => String(p.id) === selectedPet);
  const petWeight = currentPet ? parseFloat(currentPet.weight) : NaN;
  const isSmallPet = !isNaN(petWeight) && petWeight < 10;

  const toggleKit = (id: string) => {
    const next = kitDone.includes(id) ? kitDone.filter((k) => k !== id) : [...kitDone, id];
    setKitDone(next);
    setKitError('');
    userPreferencesApi.set('first_aid_kit', next).catch(() => {
      setKitError('Nie udało się zapisać checklisty na serwerze. Spróbuj ponownie.');
    });
  };

  const distKm = (a: number, b: number, c: number, d: number) => {
    const R = 6371, dLat = ((c - a) * Math.PI) / 180, dLng = ((d - b) * Math.PI) / 180;
    const s = Math.sin(dLat / 2) ** 2 + Math.cos((a * Math.PI) / 180) * Math.cos((c * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
  };

  const OSM_DAY: Record<string, number> = { Su: 0, Mo: 1, Tu: 2, We: 3, Th: 4, Fr: 5, Sa: 6 };
  const DAY_PL: Record<string, string> = { Mo: 'Pn', Tu: 'Wt', We: 'Śr', Th: 'Cz', Fr: 'Pt', Sa: 'Sb', Su: 'Nd' };

  // Czy lecznica jest teraz otwarta (parser formatu opening_hours z OSM)
  const isOpenNow = (hours: string): boolean | null => {
    if (!hours) return null;
    if (/24\/7/.test(hours)) return true;
    const now = new Date();
    const day = now.getDay();
    const mins = now.getHours() * 60 + now.getMinutes();
    for (const seg of hours.split(';')) {
      const m = seg.trim().match(/^([A-Za-z,\s-]+?)\s+(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})/);
      if (!m) continue;
      const open = +m[2] * 60 + +m[3];
      const close = +m[4] * 60 + +m[5];
      for (const part of m[1].split(',')) {
        const p = part.trim();
        let dayMatch = false;
        if (p.includes('-')) {
          const [a, b] = p.split('-').map((x) => OSM_DAY[x.trim()]);
          if (a != null && b != null) dayMatch = a <= b ? day >= a && day <= b : day >= a || day <= b;
        } else if (OSM_DAY[p] != null) {
          dayMatch = OSM_DAY[p] === day;
        }
        if (dayMatch && (close >= open ? mins >= open && mins < close : mins >= open || mins < close)) return true;
      }
    }
    return false;
  };

  // Godziny po polsku: "Mo-Fr 09:00-21:00; Sa 10:00-16:00" → "Pn–Pt 09:00–21:00 • Sb 10:00–16:00"
  const fmtHoursPl = (hours: string): string => {
    if (/24\/7/.test(hours)) return 'Otwarte 24/7';
    return hours
      .split(';')
      .map((s) => s.trim().replace(/\b(Mo|Tu|We|Th|Fr|Sa|Su)\b/g, (d) => DAY_PL[d] || d).replace(/(\w)-(\w)/, '$1–$2'))
      .join(' • ');
  };

  const clinicRank = (c: EmergencyClinic) => {
    if (c.is24h) return 0;
    const o = isOpenNow(c.hours);
    return o === true ? 1 : o === null ? 2 : 3;
  };

  const OVERPASS_MIRRORS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass.private.coffee/api/interpreter',
  ];

  // Jeden zapytanie Overpass: wszystkie amenity=veterinary w promieniu 15 km
  // z pełnymi tagami (telefon, godziny) — bez dodatkowych requestów.
  // Mirrory są odpytywane RÓWNOLEGLE — wygrywa najszybszy, reszta jest przerywana.
  const queryOverpass = async (lat: number, lng: number): Promise<any[]> => {
    const q = `[out:json][timeout:20];
      (
        node["amenity"="veterinary"](around:15000,${lat},${lng});
        way["amenity"="veterinary"](around:15000,${lat},${lng});
      );
      out center tags 40;`;
    const attempt = (base: string): Promise<any[]> => {
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort(), 20000);
      return fetch(base, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(q)}`,
        signal: ctrl.signal,
      })
        .then(async (res) => {
          if (!res.ok) throw new Error(String(res.status));
          const json = await res.json();
          return json.elements || [];
        })
        .finally(() => clearTimeout(to));
    };
    // Ręczny „any": sukces pierwszego mirrora, błąd dopiero gdy wszystkie zawiodą
    return new Promise((resolve, reject) => {
      let failures = 0;
      let settled = false;
      OVERPASS_MIRRORS.forEach((base) => {
        attempt(base).then(
          (els) => { if (!settled) { settled = true; resolve(els); } },
          () => { if (!settled && ++failures === OVERPASS_MIRRORS.length) { settled = true; reject(new Error('all mirrors failed')); } }
        );
      });
    });
  };

  const findNearbyClinics = async (lat: number, lng: number) => {
    setClinicsLoading(true);
    setClinicsError('');
    setNearbyClinics([]);
    try {
      const elements = await queryOverpass(lat, lng);
      const seen = new Map<string, EmergencyClinic>();
      for (const el of elements) {
        const t = el.tags || {};
        const cLat = el.lat ?? el.center?.lat;
        const cLng = el.lon ?? el.center?.lon;
        if (typeof cLat !== 'number' || typeof cLng !== 'number') continue;
        const name = t.name || 'Lecznica weterynaryjna';
        // Deduplikacja node+way tej samej placówki (po nazwie i ~150 m)
        const key = `${name.toLowerCase()}|${Math.round(cLat * 500)}|${Math.round(cLng * 500)}`;
        if (seen.has(key)) continue;
        const street = t['addr:street'] ? `${t['addr:street']} ${t['addr:housenumber'] || ''}`.trim() : '';
        const city = t['addr:city'] || t['addr:town'] || t['addr:village'] || '';
        const hours = t.opening_hours || t['opening_hours:emergency'] || '';
        const nameSuggests24h = /24\s*h|24\/7|całodob|nonstop|non-stop/i.test(`${name} ${t.description || ''}`);
        seen.set(key, {
          id: `${el.type}/${el.id}`,
          name,
          address: [street, city].filter(Boolean).join(', '),
          phone: t.phone || t['contact:phone'] || t['contact:mobile'] || '',
          distance: Math.round(distKm(lat, lng, cLat, cLng) * 10) / 10,
          is24h: /24\/7|00:00-24:00/i.test(hours) || nameSuggests24h,
          hours: hours || (nameSuggests24h ? '24/7' : ''),
          coordinates: { lat: cLat, lng: cLng },
          services: [],
          osmType: el.type,
          osmId: String(el.id),
          emergency: t.emergency === 'yes',
        });
      }
      const clinics: EmergencyClinic[] = [];
      seen.forEach((c) => clinics.push(c));
      clinics.sort((a, b) => a.distance - b.distance);
      const top = clinics.slice(0, 25);
      top.sort((a, b) => clinicRank(a) - clinicRank(b) || a.distance - b.distance);
      setNearbyClinics(top);
      if (top.length === 0) setClinicsError('Nie znaleziono lecznic w promieniu 15 km.');
    } catch {
      setClinicsError('Nie udało się pobrać lecznic (serwer map nie odpowiada). Spróbuj ponownie za chwilę.');
    }
    setClinicsLoading(false);
  };

  const handleLocate = () => {
    if (!navigator.geolocation) { setLocationState('unsupported'); return; }
    setLocating(true);
    setLocationState('idle');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        findNearbyClinics(pos.coords.latitude, pos.coords.longitude);
        setLocating(false);
        setLocationState('granted');
      },
      (err) => {
        setLocating(false);
        // code 1 = odmowa zgody, 2 = pozycja niedostępna, 3 = timeout
        setLocationState(err.code === 1 ? 'denied' : 'unavailable');
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const filteredProcedures = PROCEDURES.filter((p) => {
    const catOk = selectedCategory === 'all' || p.category === selectedCategory;
    const q = searchQuery.toLowerCase();
    const qOk = !q || p.title.toLowerCase().includes(q) || p.symptoms.some((s) => s.toLowerCase().includes(q));
    return catOk && qOk;
  });

  const criticalProcedures = PROCEDURES.filter((p) => p.urgency === 'critical');
  const fmtTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const kitTotal = KIT_ITEMS.reduce((n, g) => n + g.items.length, 0);
  const kitPct = Math.round((kitDone.length / kitTotal) * 100);

  return (
    <div className="space-y-5">
      {/* ====== Taby ====== */}
      <div className="flex gap-1 p-1 rounded-2xl bg-gray-100/80 animate-slide-up">
        {([
          { key: 'sos', label: 'SOS', Icon: Siren },
          { key: 'procedures', label: 'Procedury', Icon: BookOpen },
          { key: 'clinics', label: 'Lecznice', Icon: MapPin },
          { key: 'kit', label: 'Apteczka', Icon: Shield },
        ] as { key: Tab; label: string; Icon: any }[]).map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 px-1 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              tab === key ? 'bg-white shadow-sm ' + (key === 'sos' ? 'text-red-600' : 'text-brand-dark') : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* ====== TAB: SOS ====== */}
      {tab === 'sos' && (
        <div className="space-y-5 animate-fade-in">
          {/* Kompaktowy pasek SOS — bez podwójnego banera pod PageHeader */}
          <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-red-600 text-white shadow-lg shadow-red-600/20">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
              <Siren className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold leading-tight">Nagły wypadek? Wybierz sytuację i postępuj krok po kroku</p>
              <p className="text-[11px] opacity-85 mt-0.5">Tryb prowadzenia ze stoperem, metronomem RKO i przyciskami alarmowymi</p>
            </div>
          </div>

          {petsError && (
            <div className="rounded-2xl bg-red-50 border border-red-100 p-4 flex items-center justify-between gap-3">
              <p className="text-xs text-red-700 font-medium">{petsError}</p>
              <button onClick={loadPets} className="px-3 py-1.5 rounded-xl bg-red-600 text-white text-xs font-bold flex-shrink-0">Ponów</button>
            </div>
          )}

          {pets.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2 px-1">Dla kogo pomoc?</p>
              <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
                {pets.map((pet) => {
                  const sel = selectedPet === String(pet.id);
                  return (
                    <button key={pet.id} onClick={() => setSelectedPet(String(pet.id))} className="flex flex-col items-center flex-shrink-0 active:scale-95 transition-all">
                      <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl overflow-hidden transition-all ${sel ? 'ring-[3px] ring-red-400 ring-offset-2 bg-red-50' : 'bg-gray-100'}`}>
                        {pet.photo_url ? <img src={pet.photo_url} alt={pet.name} className="w-full h-full object-cover" /> : SPECIES_EMOJI[pet.species] || '🐾'}
                      </div>
                      <span className={`mt-1.5 text-[11px] font-semibold max-w-[64px] truncate ${sel ? 'text-red-600' : 'text-gray-500'}`}>{pet.name}</span>
                    </button>
                  );
                })}
              </div>
              {currentPet && !isNaN(petWeight) && (
                <p className="text-xs text-gray-500 mt-1 px-1">
                  {currentPet.name} · {petWeight} kg → wskazówki dla <b>{isSmallPet ? 'małego zwierzęcia' : 'większego zwierzęcia'}</b>
                </p>
              )}
            </div>
          )}

          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2 px-1">Sytuacje krytyczne</p>
            <div className="grid grid-cols-2 gap-2.5">
              {criticalProcedures.map((p) => (
                <button
                  key={p.id}
                  onClick={() => openProcedure(p)}
                  className="flex items-center gap-3 p-3.5 rounded-2xl bg-white border-2 border-red-100 hover:border-red-300 active:scale-[0.98] transition-all text-left"
                >
                  <span className="w-11 h-11 rounded-xl bg-red-500 flex items-center justify-center flex-shrink-0">
                    <p.icon className="w-5 h-5 text-white" />
                  </span>
                  <span className="text-sm font-bold text-gray-900 leading-tight">{p.title}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <a href="tel:112" className="flex items-center justify-center gap-2 p-4 rounded-2xl bg-red-600 text-white font-bold text-sm active:scale-[0.98] transition-all">
              <Phone className="w-4 h-4" /> Zadzwoń 112
            </a>
            <button onClick={() => setTab('clinics')} className="flex items-center justify-center gap-2 p-4 rounded-2xl bg-gray-900 text-white font-bold text-sm active:scale-[0.98] transition-all">
              <MapPin className="w-4 h-4" /> Najbliższa lecznica
            </button>
          </div>

          <div className="rounded-2xl bg-amber-50 border-2 border-amber-200 p-4 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-800 leading-relaxed">
              Przewodnik ma charakter informacyjny i nie zastępuje pomocy weterynaryjnej. W zagrożeniu życia zawsze jedź do najbliższej lecznicy — szybkość jest kluczowa.
            </p>
          </div>
        </div>
      )}

      {/* ====== TAB: PROCEDURY ====== */}
      {tab === 'procedures' && (
        <div className="space-y-4 animate-fade-in">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Szukaj: czekolada, krwawienie, drgawki…"
              className="w-full bg-white border border-gray-200 rounded-2xl pl-11 pr-4 py-3.5 text-sm shadow-sm focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedCategory === cat.id ? 'bg-brand-dark text-white' : 'bg-white text-gray-600 border border-gray-200'
                }`}
              >
                <cat.icon className="w-3.5 h-3.5" /> {cat.name}
              </button>
            ))}
          </div>

          <div className="pv-card overflow-hidden divide-y divide-gray-100">
            {filteredProcedures.map((p) => {
              const urg = URGENCY_CFG[p.urgency];
              return (
                <button key={p.id} onClick={() => openProcedure(p)} className="w-full flex items-center gap-3.5 px-4 py-3.5 text-left hover:bg-gray-50/60 active:bg-gray-50 transition-all">
                  <span className={`w-11 h-11 rounded-xl ${urg.iconBg} flex items-center justify-center flex-shrink-0`}>
                    <p.icon className="w-5 h-5 text-white" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">{p.title}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{p.duration} · {p.steps.length} kroków</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${urg.badge}`}>{urg.label}</span>
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  </div>
                </button>
              );
            })}
            {filteredProcedures.length === 0 && (
              <div className="p-8 text-center text-sm text-gray-400">Brak procedur pasujących do wyszukiwania</div>
            )}
          </div>
        </div>
      )}
      {/* ====== TAB: LECZNICE ====== */}
      {tab === 'clinics' && (
        <div className="space-y-4 animate-fade-in">
          <button
            onClick={handleLocate}
            disabled={locating}
            className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-brand-dark text-white font-bold text-sm active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crosshair className="w-4 h-4" />}
            {userLocation ? 'Zaktualizuj lokalizację' : 'Znajdź lecznice w pobliżu'}
          </button>

          {locationState === 'denied' && (
            <div className="rounded-2xl bg-amber-50 border border-amber-100 p-4 flex items-start gap-3">
              <Settings className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-amber-800">Brak dostępu do lokalizacji</p>
                <p className="text-xs text-amber-700 mt-0.5">Włącz lokalizację w ustawieniach przeglądarki i spróbuj ponownie.</p>
              </div>
              <button onClick={handleLocate} className="px-3 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold flex-shrink-0">Ponów</button>
            </div>
          )}
          {locationState === 'unsupported' && (
            <div className="rounded-2xl bg-gray-50 border border-gray-200 p-3 text-xs text-gray-600">Przeglądarka nie obsługuje geolokalizacji.</div>
          )}
          {locationState === 'unavailable' && (
            <div className="rounded-2xl bg-amber-50 border border-amber-100 p-4 flex items-center justify-between gap-3">
              <p className="text-xs text-amber-800 font-medium">Nie udało się ustalić pozycji (brak sygnału GPS lub timeout). Spróbuj ponownie na zewnątrz.</p>
              <button onClick={handleLocate} className="px-3 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold flex-shrink-0">Ponów</button>
            </div>
          )}
          {userLocation && (
            <div className="flex items-center gap-2 rounded-2xl bg-brand-mint px-4 py-2.5 text-xs text-brand-dark">
              <Navigation className="w-4 h-4" />
              <span className="font-semibold">Lokalizacja aktywna — {nearbyClinics.length} lecznice w okolicy</span>
            </div>
          )}

          {/* Numery alarmowe */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2 px-1">Kontakty alarmowe</p>
            <div className="pv-card overflow-hidden divide-y divide-gray-100">
              {VET_CONTACTS.map((c, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3.5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900 text-sm truncate">{c.name}</p>
                      {c.is24h && <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full flex-shrink-0">24/7</span>}
                    </div>
                    <p className="text-[11px] text-gray-400">{c.note}</p>
                  </div>
                  <a href={`tel:${c.phone}`} className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center flex-shrink-0 active:scale-95 transition-all" aria-label={`Zadzwoń: ${c.name}`}>
                    <Phone className="w-4 h-4 text-white" />
                  </a>
                </div>
              ))}
            </div>
          </div>
          {/* Lecznice — prawdziwe dane z OpenStreetMap */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2 px-1">Lecznice w pobliżu</p>
            {(locating || clinicsLoading) && (
              <div className="pv-card p-10 text-center">
                <Loader2 className="w-6 h-6 text-brand-dark animate-spin mx-auto mb-3" />
                <p className="text-sm text-gray-500">{locating ? 'Pobieranie lokalizacji…' : 'Szukam lecznic w okolicy…'}</p>
              </div>
            )}
            {!locating && !clinicsLoading && clinicsError && (
              <div className="pv-card p-8 text-center">
                <AlertTriangle className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                <p className="text-sm text-gray-600">{clinicsError}</p>
              </div>
            )}
            {!locating && !clinicsLoading && !clinicsError && nearbyClinics.length === 0 && (
              <div className="pv-card p-10 text-center">
                <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-brand-mint flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-brand-dark" />
                </div>
                <p className="text-sm font-semibold text-gray-700">Włącz lokalizację</p>
                <p className="text-xs text-gray-400 mt-1">Pokażemy prawdziwe lecznice weterynaryjne w promieniu 15 km — na podstawie OpenStreetMap.</p>
              </div>
            )}
            <div className="space-y-2.5">
              {nearbyClinics.map((clinic) => {
                const openNow = isOpenNow(clinic.hours);
                return (
                <div key={clinic.id} className={`pv-card p-4 ${clinic.is24h ? 'ring-1 ring-emerald-200' : ''}`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <h4 className="font-semibold text-gray-900 text-sm truncate">{clinic.name}</h4>
                        {clinic.is24h ? (
                          <span className="text-[10px] font-bold bg-emerald-500 text-white px-2 py-0.5 rounded-full flex-shrink-0 uppercase tracking-wide">Całodobowa</span>
                        ) : openNow === true ? (
                          <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full flex-shrink-0">Otwarte teraz</span>
                        ) : openNow === false ? (
                          <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full flex-shrink-0">Zamknięte</span>
                        ) : null}
                        {clinic.emergency && !clinic.is24h && (
                          <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex-shrink-0">Nagłe przypadki</span>
                        )}
                      </div>
                      {clinic.address ? (
                        <p className="text-xs text-gray-500 truncate">{clinic.address}</p>
                      ) : (
                        <p className="text-xs text-gray-400">Adres w mapach po nawigacji</p>
                      )}
                      <p className={`text-[11px] mt-1.5 flex items-start gap-1.5 ${openNow === false ? 'text-red-500' : 'text-gray-500'}`}>
                        <Clock className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
                        {clinic.hours ? fmtHoursPl(clinic.hours) : 'Brak godzin — zadzwoń przed wyjazdem'}
                      </p>
                    </div>
                    <p className="font-bold text-brand-dark text-sm flex-shrink-0">{clinic.distance} km</p>
                  </div>
                  <div className="flex gap-2">
                    {clinic.phone ? (
                      <a href={`tel:${clinic.phone.replace(/\s/g, '')}`} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-red-500 text-white text-xs font-bold active:scale-[0.98] transition-all">
                        <Phone className="w-3.5 h-3.5" /> Zadzwoń
                      </a>
                    ) : null}
                    <button
                      onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${clinic.coordinates.lat},${clinic.coordinates.lng}`, '_blank')}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-xs font-bold active:scale-[0.98] transition-all"
                    >
                      <Navigation className="w-3.5 h-3.5" /> Nawiguj
                    </button>
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ====== TAB: APTECZKA ====== */}
      {tab === 'kit' && (
        <div className="space-y-4 animate-fade-in">
          <div className="pv-card p-5">
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 flex-shrink-0">
                <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r="28" fill="none" stroke="#e5e7eb" strokeWidth="7" />
                  <circle cx="32" cy="32" r="28" fill="none" stroke={kitPct === 100 ? '#10B981' : '#2E8B62'} strokeWidth="7" strokeLinecap="round" strokeDasharray={`${(kitPct / 100) * 176} 176`} className="transition-all duration-500" />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-800">{kitPct}%</span>
              </div>
              <div className="flex-1">
                <h3 className="pv-section-title">Apteczka pierwszej pomocy</h3>
                <p className="text-xs text-gray-500 mt-0.5">{kitDone.length}/{kitTotal} rzeczy gotowych — odhaczaj, co masz w domu</p>
              </div>
            </div>
            {kitPct === 100 && (
              <div className="mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center gap-2 text-xs font-semibold text-emerald-700">
                <CheckCircle2 className="w-4 h-4" /> Apteczka kompletna — jesteś przygotowany!
              </div>
            )}
          </div>

          {KIT_ITEMS.map((group) => (
            <div key={group.group}>
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2 px-1">{group.group}</p>
              <div className="pv-card overflow-hidden divide-y divide-gray-100">
                {group.items.map((item) => {
                  const done = kitDone.includes(item.id);
                  return (
                    <button key={item.id} onClick={() => toggleKit(item.id)} className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50/60 active:bg-gray-50 transition-all">
                      <span className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${done ? 'bg-brand border-brand' : 'border-gray-300 bg-white'}`}>
                        {done && <CheckCircle2 className="w-4 h-4 text-white" />}
                      </span>
                      <span className={`text-sm ${done ? 'text-gray-400 line-through' : 'text-gray-800 font-medium'}`}>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {kitError && (
            <div className="rounded-2xl bg-amber-50 border border-amber-100 p-3.5 text-xs text-amber-800 font-medium flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" /> {kitError}
            </div>
          )}

          {kitDone.length > 0 && (
            <button
              onClick={() => { setKitDone([]); setKitError(''); userPreferencesApi.set('first_aid_kit', []).catch(() => setKitError('Nie udało się wyczyścić checklisty na serwerze.')); }}
              className="w-full py-3 rounded-2xl bg-gray-100 text-gray-500 text-xs font-bold"
            >
              <RotateCcw className="w-3.5 h-3.5 inline mr-1.5" />Wyczyść checklistę
            </button>
          )}
        </div>
      )}

      {/* ====== TRYB KROKÓW (pełny ekran) ====== */}
      {activeProcedure && (
        <div className="fixed inset-0 z-[70] bg-white flex flex-col" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 flex-shrink-0">
            <button onClick={closeProcedure} className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0" aria-label="Zamknij">
              <X className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 text-sm truncate">{activeProcedure.title}</p>
              <p className="text-[11px] text-gray-400">{currentPet ? `dla ${currentPet.name}` : activeProcedure.duration}</p>
            </div>
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${URGENCY_CFG[activeProcedure.urgency].badge}`}>
              {URGENCY_CFG[activeProcedure.urgency].label}
            </span>
          </div>

          {/* Postęp */}
          <div className="px-4 py-3 flex-shrink-0">
            <div className="flex items-center justify-between text-[11px] font-bold text-gray-400 mb-1.5">
              <span>Krok {Math.min(stepIdx + 1, activeProcedure.steps.length)} z {activeProcedure.steps.length}</span>
              <span>{doneSteps.length}/{activeProcedure.steps.length} wykonanych</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-brand rounded-full transition-all duration-300" style={{ width: `${(doneSteps.length / activeProcedure.steps.length) * 100}%` }} />
            </div>
          </div>

          {/* Objawy */}
          <div className="px-4 pb-3 flex-shrink-0">
            <div className="flex flex-wrap gap-1.5">
              {activeProcedure.symptoms.map((s, i) => (
                <span key={i} className="text-[11px] bg-red-50 text-red-700 px-2.5 py-1 rounded-full font-medium">{s}</span>
              ))}
            </div>
          </div>

          {/* Kroki — scrollable */}
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            {activeProcedure.sizeHint && currentPet && !isNaN(petWeight) && (
              <div className="mb-3 p-3 rounded-2xl bg-indigo-50 border border-indigo-100 text-xs text-indigo-700 flex items-start gap-2">
                <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span><b>{currentPet.name}</b> waży {petWeight} kg → stosuj wariant dla <b>{isSmallPet ? 'małego zwierzęcia' : 'większego zwierzęcia'}</b>.</span>
              </div>
            )}

            {/* Metronom RKO */}
            {activeProcedure.metronome && (
              <div className="mb-4 p-4 rounded-2xl bg-red-50 border-2 border-red-200 text-center">
                <p className="text-xs font-bold text-red-700 uppercase tracking-wide mb-3">Metronom uciśnięć — 110 BPM</p>
                <div className="flex items-center justify-center gap-4">
                  <div className={`w-16 h-16 rounded-full bg-red-500 flex items-center justify-center transition-transform duration-100 ${metroOn && metroTick ? 'scale-110' : 'scale-90'}`}>
                    <span className="text-white font-bold text-xs">{metroOn ? 'UCIŚNIJ' : '110'}</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {!metroOn ? (
                      <button onClick={startMetronome} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-600 text-white text-xs font-bold">
                        <Play className="w-3.5 h-3.5" /> Start rytmu
                      </button>
                    ) : (
                      <button onClick={() => setMetroOn(false)} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gray-800 text-white text-xs font-bold">
                        <Pause className="w-3.5 h-3.5" /> Stop
                      </button>
                    )}
                    <button onClick={() => setMetroSound(!metroSound)} className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-white border border-red-200 text-red-700 text-[11px] font-bold">
                      {metroSound ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />} {metroSound ? 'Dźwięk wł.' : 'Dźwięk wył.'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Stoper */}
            {activeProcedure.timer && (
              <div className="mb-4 p-4 rounded-2xl bg-gray-900 text-white flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Stoper</p>
                  <p className="text-3xl font-bold tabular-nums">{fmtTime(timerSec)}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setTimerOn(!timerOn)} className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center" aria-label={timerOn ? 'Pauza' : 'Start'}>
                    {timerOn ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  </button>
                  <button onClick={() => { setTimerOn(false); setTimerSec(0); }} className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center" aria-label="Reset">
                    <RotateCcw className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {/* Lista kroków — odhaczalna */}
            <div className="space-y-2">
              {activeProcedure.steps.map((step, i) => {
                const done = doneSteps.includes(i);
                const current = i === stepIdx;
                return (
                  <button
                    key={i}
                    onClick={() => toggleStep(i)}
                    className={`w-full flex items-start gap-3 p-3.5 rounded-2xl border-2 text-left transition-all ${
                      done ? 'bg-emerald-50 border-emerald-200' : current ? 'bg-brand-mint/40 border-brand/40' : 'bg-white border-gray-100'
                    }`}
                  >
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${
                      done ? 'bg-emerald-500 text-white' : current ? 'bg-brand text-white' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {done ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                    </span>
                    <span className={`text-sm leading-relaxed ${done ? 'text-emerald-700 line-through' : 'text-gray-800 font-medium'}`}>{step}</span>
                  </button>
                );
              })}
            </div>

            {/* Czego nie robić */}
            <button onClick={() => setShowDonts(!showDonts)} className="w-full mt-3 flex items-center justify-between p-3.5 rounded-2xl bg-red-50 border border-red-100">
              <span className="text-xs font-bold text-red-700 flex items-center gap-2"><XCircle className="w-4 h-4" /> Czego NIE robić</span>
              <ChevronRight className={`w-4 h-4 text-red-400 transition-transform ${showDonts ? 'rotate-90' : ''}`} />
            </button>
            {showDonts && (
              <div className="mt-2 p-4 rounded-2xl bg-red-50/60 border border-red-100 animate-fade-in">
                <ul className="space-y-2">
                  {activeProcedure.donts.map((d, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-red-700">
                      <XCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />{d}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Stopka akcji */}
          <div className="px-4 pb-4 pt-2 border-t border-gray-100 flex gap-2 flex-shrink-0 bg-white">
            <a href="tel:112" className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-red-600 text-white font-bold text-sm">
              <Phone className="w-4 h-4" /> 112
            </a>
            <button onClick={() => { closeProcedure(); setTab('clinics'); }} className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gray-900 text-white font-bold text-sm">
              <MapPin className="w-4 h-4" /> Lecznica
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
