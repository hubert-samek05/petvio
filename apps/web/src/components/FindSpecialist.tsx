'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { specialistApi, placesApi } from '@/lib/api';
import {
  MapPin,
  Phone,
  Mail,
  Globe,
  Loader2,
  Navigation,
  Dog,
  Cat,
  Brain,
  GraduationCap,
  Heart,
  HeartHandshake,
  ChevronDown,
  Search,
  Crosshair,
  MapPinned,
  Apple,
  Scissors,
  Briefcase,
  Users,
  AlertTriangle,
} from 'lucide-react';
import AddSpecialistModal from './AddSpecialistModal';
import SpecialistDetailModal from './SpecialistDetailModal';
import type { MapPlace, MapLegendItem } from './PlacesMap';

const PlacesMap = dynamic(() => import('@/components/PlacesMap'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-gray-100 animate-pulse" />,
});

const typeOptions = [
  { value: '', label: 'Wszyscy', icon: HeartHandshake, color: '#0f766e' },
  { value: 'behaviorist', label: 'Behawiorysta', icon: Brain, color: '#7c3aed' },
  { value: 'trainer', label: 'Trener', icon: GraduationCap, color: '#ea580c' },
  { value: 'zoopsychologist', label: 'Zoopsycholog', icon: Heart, color: '#db2777' },
  { value: 'dietitian', label: 'Dietetyk', icon: Apple, color: '#0891b2' },
  { value: 'groomer', label: 'Groomer', icon: Scissors, color: '#0284c7' },
];

const typeLabels: Record<string, string> = {
  behaviorist: 'Behawiorysta',
  trainer: 'Trener',
  zoopsychologist: 'Zoopsycholog',
  dietitian: 'Dietetyk',
  groomer: 'Groomer',
};

const COMMUNITY_COLOR = '#7c3aed';

// Dozwolone tylko http(s) — zgłoszenia użytkowników nie mogą podawać javascript: itp.
const safeWebsiteUrl = (url: string | null) => {
  if (!url) return null;
  const u = url.trim();
  const withProto = /^https?:\/\//i.test(u) ? u : `https://${u}`;
  try {
    const parsed = new URL(withProto);
    return ['http:', 'https:'].includes(parsed.protocol) ? withProto : null;
  } catch {
    return null;
  }
};

// jednolity, miętowy wygląd badge'a typu
const typeBadge = 'bg-brand-mint text-brand-dark border-emerald-200';

interface Specialist {
  id: number;
  name: string;
  specialist_type: string;
  species: string;
  description: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  city: string | null;
  address: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  price_info: string | null;
  submitted_by?: number | null;
  distanceKm?: number | null;
}

type AddressSuggestion = { placeId: string; description: string; lat: number; lng: number };

export default function FindSpecialist() {
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState('');
  const [species, setSpecies] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [userLocationLabel, setUserLocationLabel] = useState('');
  const [searchRadius, setSearchRadius] = useState(20);
  const [locating, setLocating] = useState(false);
  const [locationState, setLocationState] = useState<'idle' | 'denied' | 'granted' | 'unsupported' | 'error'>('idle');
  const [loadError, setLoadError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSpecialist, setSelectedSpecialist] = useState<Specialist | null>(null);

  // wyszukiwarka adresu z podpowiedziami
  const [addressInput, setAddressInput] = useState('');
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const suggestDebounce = useRef<NodeJS.Timeout | null>(null);
  const suggestBoxRef = useRef<HTMLDivElement>(null);

  const fetchSpecialists = useCallback(async () => {
    setLoading(true);
    try {
      const data = await specialistApi.getAll({
        type: type || undefined,
        species: species || undefined,
        search: searchQuery.trim() || undefined,
        lat: userLocation ? userLocation[0] : undefined,
        lng: userLocation ? userLocation[1] : undefined,
        radius: userLocation ? searchRadius : undefined,
      });
      setSpecialists(data.specialists || []);
      setLoadError('');
    } catch {
      setLoadError('Nie udało się pobrać specjalistów');
    } finally {
      setLoading(false);
    }
  }, [type, species, searchQuery, userLocation, searchRadius]);

  useEffect(() => {
    const timeout = setTimeout(fetchSpecialists, 300);
    return () => clearTimeout(timeout);
  }, [fetchSpecialists]);

  // Podpowiedzi adresu — debounce na /api/places/autocomplete
  useEffect(() => {
    if (suggestDebounce.current) clearTimeout(suggestDebounce.current);
    const q = addressInput.trim();
    if (q.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    suggestDebounce.current = setTimeout(async () => {
      setSuggestLoading(true);
      try {
        const res = await placesApi.autocomplete({ input: q });
        setSuggestions(res.predictions || []);
        setShowSuggestions(true);
      } catch {
        setSuggestions([]);
      } finally {
        setSuggestLoading(false);
      }
    }, 350);
    return () => {
      if (suggestDebounce.current) clearTimeout(suggestDebounce.current);
    };
  }, [addressInput]);

  // Zamknij podpowiedzi przy kliku poza
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (suggestBoxRef.current && !suggestBoxRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const pickSuggestion = (s: AddressSuggestion) => {
    setShowSuggestions(false);
    setAddressInput('');
    setUserLocation([s.lat, s.lng]);
    setUserLocationLabel(s.description.split(',').slice(0, 2).join(','));
    setLocationState('granted');
  };

  const handleLocate = () => {
    if (!navigator.geolocation) {
      setLocationState('unsupported');
      return;
    }
    setLocating(true);
    setLocationState('idle');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation([pos.coords.latitude, pos.coords.longitude]);
        setUserLocationLabel('Twoja aktualna pozycja');
        setLocating(false);
        setLocationState('granted');
      },
      (error) => {
        setLocating(false);
        if (error.code === 1) {
          setLocationState('denied');
        } else {
          // 2 = pozycja niedostępna, 3 = timeout — to nie brak obsługi ani odmowa zgody.
          setLocationState('error');
        }
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  };

  const clearLocation = () => {
    setUserLocation(null);
    setUserLocationLabel('');
    setLocationState('idle');
  };

  // Markery mapy — tylko rekordy ze współrzędnymi
  const withCoords = specialists.filter((s) => s.latitude != null && s.longitude != null);
  const mapPlaces: MapPlace[] = withCoords.map((s) => ({
    id: String(s.id),
    name: s.name,
    lat: typeof s.latitude === 'string' ? parseFloat(s.latitude) : (s.latitude as number),
    lng: typeof s.longitude === 'string' ? parseFloat(s.longitude) : (s.longitude as number),
    type: s.specialist_type,
    community: s.submitted_by != null,
  }));

  // Legenda — tylko typy obecne w wynikach
  const presentTypes = Array.from(new Set(withCoords.map((s) => s.specialist_type)));
  const legend: MapLegendItem[] = [
    ...presentTypes.map((t) => ({
      color: typeOptions.find((o) => o.value === t)?.color || COMMUNITY_COLOR,
      label: typeLabels[t] || t,
    })),
    ...(mapPlaces.some((p) => p.community) ? [{ color: COMMUNITY_COLOR, label: 'Dodane przez społeczność' }] : []),
  ];

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Pasek lokalizacji — adres z podpowiedziami + GPS + dodaj */}
      <div className="flex gap-2">
        <div ref={suggestBoxRef} className="relative flex-1">
          <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-dark z-10" />
          <input
            type="text"
            value={addressInput}
            onChange={(e) => setAddressInput(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            placeholder={userLocationLabel || 'Wpisz adres lub miasto, np. Kraków, ul. Floriańska…'}
            className="w-full bg-white border border-gray-200 rounded-2xl pl-10 pr-10 py-3 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 shadow-sm"
          />
          {suggestLoading && (
            <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
          )}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full mt-2 left-0 right-0 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden z-30 max-h-64 overflow-y-auto">
              {suggestions.map((s) => (
                <button
                  key={s.placeId}
                  onClick={() => pickSuggestion(s)}
                  className="w-full flex items-start gap-2.5 px-4 py-3 text-left hover:bg-brand-mint/60 transition-colors border-b border-gray-50 last:border-0"
                >
                  <MapPin className="w-4 h-4 text-brand-dark flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700 leading-snug">{s.description}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={handleLocate}
          disabled={locating}
          title="Użyj mojej lokalizacji"
          className="px-3.5 py-3 rounded-2xl bg-white border border-gray-200 text-brand-dark hover:bg-brand-mint transition-colors shadow-sm disabled:opacity-50"
        >
          {locating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Crosshair className="w-5 h-5" />}
        </button>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-3 pv-btn-primary text-sm rounded-2xl whitespace-nowrap shadow-sm"
        >
          + Dodaj
        </button>
      </div>

      {(locationState === 'denied' || locationState === 'unsupported' || locationState === 'error') && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 text-amber-700 text-sm">
          {locationState === 'denied'
            ? 'Dostęp do lokalizacji zablokowany — wpisz adres powyżej.'
            : locationState === 'unsupported'
              ? 'Geolokalizacja nie jest wspierana — wpisz adres powyżej.'
              : 'Nie udało się ustalić pozycji — wpisz adres powyżej.'}
        </div>
      )}

      {/* Filtry typu + gatunek + nazwa + promień */}
      <div className="pv-card p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {typeOptions.map((opt) => {
            const Icon = opt.icon;
            const active = type === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setType(opt.value)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium border transition-all ${
                  active
                    ? 'bg-brand-dark text-white border-brand-dark'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-brand-dark/40'
                }`}
              >
                <Icon className="w-4 h-4" /> {opt.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Szukaj po nazwie..."
              className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10"
            />
          </div>
          <div className="relative">
            <select
              value={species}
              onChange={(e) => setSpecies(e.target.value)}
              className="appearance-none bg-gray-50 border border-gray-200 rounded-xl pl-4 pr-9 py-2 text-sm font-medium text-gray-900 focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10"
            >
              <option value="">Pies i kot</option>
              <option value="dog">Pies</option>
              <option value="cat">Kot</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {userLocation && (
          <div className="flex items-center gap-3">
            <label className="text-xs text-gray-600 whitespace-nowrap">Promień</label>
            <input
              type="range"
              min="1"
              max="100"
              value={searchRadius}
              onChange={(e) => setSearchRadius(Number(e.target.value))}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-dark"
            />
            <span className="text-xs font-semibold text-brand-dark whitespace-nowrap w-14 text-right">
              {searchRadius} km
            </span>
          </div>
        )}
      </div>

      {/* Panel firmowy — wkrótce */}
      <div className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-violet-50 to-brand-mint/40 border border-violet-100">
        <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center flex-shrink-0">
          <Briefcase className="w-5 h-5 text-violet-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">
            Jesteś behawiorystą, trenerem, groomerem lub innym specjalistą?
          </p>
          <p className="text-xs text-gray-500">
            Panel firmowy, przejmowanie profilu, umawianie wizyt i weryfikacja — już wkrótce
          </p>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wide text-violet-600 bg-violet-100 px-2.5 py-1 rounded-full whitespace-nowrap">
          Wkrótce
        </span>
      </div>

      {/* Aktywna lokalizacja */}
      {userLocation && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 rounded-2xl bg-brand-dark/10 px-4 py-3 text-sm text-brand-dark">
          <div className="flex items-center gap-2">
            <Navigation className="w-4 h-4" />
            <span className="font-medium">
              {userLocationLabel || 'Lokalizacja włączona'}
              {!loading && ` — znaleziono ${specialists.length} ${specialists.length === 1 ? 'specjalistę' : 'specjalistów'}`}
            </span>
          </div>
          <button onClick={clearLocation} className="text-xs text-brand-dark underline hover:text-brand-dark sm:ml-auto">
            Wyłącz lokalizację
          </button>
        </div>
      )}

      {/* Mapa z wynikami */}
      {(userLocation || mapPlaces.length > 0) && (
        <PlacesMap
          center={userLocation ? { lat: userLocation[0], lng: userLocation[1] } : null}
          radiusKm={userLocation ? searchRadius : null}
          places={mapPlaces}
          selectedId={selectedSpecialist ? String(selectedSpecialist.id) : null}
          onSelect={(id) => {
            const s = specialists.find((x) => String(x.id) === id);
            if (s) setSelectedSpecialist(s);
          }}
          legend={legend}
          className="h-[340px] sm:h-[420px]"
        />
      )}

      {/* Blad */}
      {loadError && !loading && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-700">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium">{loadError}</p>
            <button onClick={fetchSpecialists} className="mt-1 text-xs font-semibold underline hover:no-underline">
              Spróbuj ponownie
            </button>
          </div>
        </div>
      )}

      {/* Wyniki */}
      <div className="space-y-4">
        {loading ? (
          <div className="space-y-4 animate-fade-in">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="pv-skeleton h-24 rounded-3xl" />
            ))}
          </div>
        ) : loadError ? null : specialists.length === 0 ? (
          <div className="pv-card p-10 sm:p-14 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-3xl bg-brand-mint flex items-center justify-center animate-float">
              <MapPinned className="w-7 h-7 text-brand-dark" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">Brak specjalistów w okolicy</h4>
            <p className="text-sm text-gray-500">
              Nie znaleziono specjalistów spełniających kryteria. Spróbuj zwiększyć promień albo dodaj pierwszego specjalistę!
            </p>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-500 px-1">
              Znaleziono <span className="font-semibold text-gray-700">{specialists.length}</span>{' '}
              {specialists.length === 1 ? 'specjalistę' : 'specjalistów'}
              {userLocation ? ` w promieniu ${searchRadius} km` : ''}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
              {specialists.map((s) => {
                const Icon = typeOptions.find((t) => t.value === s.specialist_type)?.icon || HeartHandshake;
                const community = s.submitted_by != null;
                return (
                  <div
                    key={s.id}
                    onClick={() => setSelectedSpecialist(s)}
                    className="flex flex-col pv-card shadow-sm overflow-hidden hover:shadow-md hover:border-brand-dark/30 cursor-pointer transition-all"
                  >
                    <div className="h-28 sm:h-32 bg-brand-mint flex items-center justify-center relative">
                      <div className="w-14 h-14 rounded-2xl bg-white/70 flex items-center justify-center">
                        <Icon className="w-7 h-7 text-brand-dark" />
                      </div>
                      {community && (
                        <div className="absolute top-2 left-2 inline-flex items-center gap-1 bg-violet-600 text-white text-[10px] font-bold px-2 py-1 rounded-full z-10">
                          <Users className="w-3 h-3" /> Od społeczności
                        </div>
                      )}
                    </div>

                    <div className="p-4 flex-1 flex flex-col">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <h3 className="font-semibold text-gray-900 text-sm leading-tight">{s.name}</h3>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {s.address ? `${s.address}, ` : ''}{s.city || '—'}
                          </p>
                        </div>
                        {s.distanceKm != null && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-brand-dark bg-brand-dark/10 px-2 py-1 rounded-full flex-shrink-0">
                            <MapPin className="w-3 h-3" /> {s.distanceKm} km
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mb-3">
                        <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border ${typeBadge}`}>
                          {typeLabels[s.specialist_type] || s.specialist_type}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] text-gray-400">
                          {s.species === 'dog' ? <Dog className="w-3 h-3" /> : s.species === 'cat' ? <Cat className="w-3 h-3" /> : <><Dog className="w-3 h-3" /><Cat className="w-3 h-3" /></>}
                        </span>
                      </div>

                      {s.description && (
                        <p className="text-xs text-gray-600 line-clamp-3 mb-3 flex-1">{s.description}</p>
                      )}

                      {s.price_info && (
                        <p className="text-xs font-semibold text-brand-dark bg-brand-mint rounded-lg px-3 py-1.5 mb-3 inline-block w-fit">
                          {s.price_info}
                        </p>
                      )}

                      <div className="flex items-center gap-2 pt-3 border-t border-gray-100 mt-auto">
                        {s.phone && (
                          <a href={`tel:${s.phone}`} onClick={(e) => e.stopPropagation()} className="p-2 rounded-xl bg-gray-50 text-gray-600 hover:bg-brand-dark/10 hover:text-brand-dark transition-colors">
                            <Phone className="w-4 h-4" />
                          </a>
                        )}
                        {s.email && (
                          <a href={`mailto:${s.email}`} onClick={(e) => e.stopPropagation()} className="p-2 rounded-xl bg-gray-50 text-gray-600 hover:bg-brand-dark/10 hover:text-brand-dark transition-colors">
                            <Mail className="w-4 h-4" />
                          </a>
                        )}
                        {safeWebsiteUrl(s.website) && (
                          <a href={safeWebsiteUrl(s.website)!} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="p-2 rounded-xl bg-gray-50 text-gray-600 hover:bg-brand-dark/10 hover:text-brand-dark transition-colors">
                            <Globe className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {showAddModal && <AddSpecialistModal onClose={() => setShowAddModal(false)} />}
      {selectedSpecialist && <SpecialistDetailModal specialist={selectedSpecialist} onClose={() => setSelectedSpecialist(null)} />}
    </div>
  );
}
