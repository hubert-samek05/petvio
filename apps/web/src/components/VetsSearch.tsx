'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  MapPin,
  Navigation,
  Loader2,
  Search,
  Crosshair,
  Stethoscope,
  Apple,
  Phone,
  Globe,
  Star,
  X,
  MapPinned,
  Settings,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { placesApi, specialistApi } from '@/lib/api';
import VetDetailModal from './VetDetailModal';
import AddDietitianModal from './AddDietitianModal';

export interface VetLocation {
  id: string;
  name: string;
  type: 'vet' | 'dietitian';
  address: string;
  distance: number;
  rating?: number;
  userRatingsTotal?: number;
  phone?: string;
  website?: string;
  hours?: string[];
  todayHours?: string | null;
  isOpenNow?: boolean | null;
  photos?: string[];
  lat: number;
  lng: number;
  businessStatus?: string;
  is24h?: boolean;
}

// Dozwolone tylko http(s) — dane z OSM/zgłoszeń nie mogą podawać javascript: itp.
const safeWebsiteUrl = (url?: string | null) => {
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

const is24hHours = (hours: string[] | null | undefined, apiFlag?: boolean) => {
  if (apiFlag) return true;
  if (!hours) return false;
  const text = hours.join(' ').toLowerCase();
  return (
    text.includes('24/7') ||
    text.includes('24 h') ||
    text.includes('24h') ||
    /24\s*godz/.test(text) ||
    /całodob/.test(text) ||
    /czynne całą dobę/.test(text) ||
    /open 24 hours/i.test(text) ||
    /(0?0:00|12:00 am)\s*[-–—]\s*(0?0:00|24:00|12:00 am)/i.test(text)
  );
};

export default function VetsSearch() {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationState, setLocationState] = useState<'idle' | 'denied' | 'granted' | 'unsupported' | 'error'>('idle');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'vet' | 'dietitian'>('all');
  const [locations, setLocations] = useState<VetLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [usingMockData, setUsingMockData] = useState(false);
  const [editingLocation, setEditingLocation] = useState(false);
  const [customLocation, setCustomLocation] = useState('');
  const [selectedVet, setSelectedVet] = useState<VetLocation | null>(null);
  const [searchRadius, setSearchRadius] = useState(10);
  const [show24hOnly, setShow24hOnly] = useState(false);
  const [showAddDietitianModal, setShowAddDietitianModal] = useState(false);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const fetchNearbyLocations = useCallback(
    async (lat: number, lng: number, typeFilter: 'all' | 'vet' | 'dietitian', radiusKm: number) => {
      setLoading(true);
      setError('');
      try {
        const radius = radiusKm * 1000;
        // Jedno zapytanie 'all' = weterynarze + dietetycy (mniej obciazenia Overpass)
        const apiType = typeFilter === 'vet' ? 'veterinary_care' : typeFilter === 'dietitian' ? 'dietitian' : 'all';
        let responses: any[] = [];
        let osmFailed = false;
        try {
          responses = [await placesApi.nearbySearch({ lat, lng, radius, type: apiType })];
        } catch {
          osmFailed = true;
        }

        const seen = new Set<string>();
        const transformed: VetLocation[] = [];
        let anyMock = false;

        responses.forEach((response) => {
          if (response.usingMockData) anyMock = true;

          (response.places || []).forEach((place: any) => {
            if (seen.has(place.id)) return;
            seen.add(place.id);
            const isVet = place.types?.includes('veterinary_care');
            const distance = calculateDistance(lat, lng, place.location.lat, place.location.lng);
            transformed.push({
              id: place.id,
              name: place.name,
              type: isVet ? 'vet' : 'dietitian',
              address: place.address,
              distance: Math.round(distance * 10) / 10,
              rating: place.rating,
              userRatingsTotal: place.userRatingsTotal,
              phone: place.phone,
              website: place.website,
              hours: place.openingHours || null,
              todayHours: place.todayHours || null,
              isOpenNow: place.isOpenNow,
              photos: place.photos || [],
              lat: place.location.lat,
              lng: place.location.lng,
              businessStatus: place.businessStatus,
              is24h: is24hHours(place.openingHours, place.is24h),
            });
          });
        });

        // Dietetycy z wlasnej bazy Petvio (zgłoszenia zweryfikowane)
        if (typeFilter === 'dietitian' || typeFilter === 'all') {
          try {
            const dietitians = await specialistApi.getAll({ type: 'dietitian' });
            (dietitians.specialists || []).forEach((s: any) => {
              const sLat = s.latitude != null ? parseFloat(s.latitude) : null;
              const sLng = s.longitude != null ? parseFloat(s.longitude) : null;
              if (sLat == null || sLng == null) return;
              const distance = calculateDistance(lat, lng, sLat, sLng);
              if (distance > radiusKm) return;
              const key = `db_${s.id}`;
              if (seen.has(key)) return;
              seen.add(key);
              transformed.push({
                id: key,
                name: s.name,
                type: 'dietitian',
                address: [s.address, s.city].filter(Boolean).join(', '),
                distance: Math.round(distance * 10) / 10,
                phone: s.phone,
                website: s.website,
                isOpenNow: null,
                photos: [],
                lat: sLat,
                lng: sLng,
                is24h: false,
              });
            });
          } catch (e) {
            console.warn('Nie udało się pobrać dietetyków z bazy Petvio', e);
          }
        }

        transformed.sort((a, b) => a.distance - b.distance);
        setLocations(transformed);
        setUsingMockData(anyMock);
        if (osmFailed && transformed.length === 0) {
          setError('Nie udało się pobrać placówek. Spróbuj ponownie.');
        } else if (osmFailed) {
          setError('Mapa OSM chwilowo niedostępna — pokazuję wyniki z bazy Petvio.');
        }
      } catch {
        setLocations([]);
        setError('Nie udało się pobrać placówek. Spróbuj ponownie.');
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Debounced refetch przy zmianie promienia lub typu
  useEffect(() => {
    if (!userLocation) return;
    const t = setTimeout(() => {
      fetchNearbyLocations(userLocation[0], userLocation[1], selectedType, searchRadius);
    }, 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchRadius, selectedType]);

  const handleLocate = () => {
    if (!navigator.geolocation) {
      setLocationState('unsupported');
      return;
    }
    setLocating(true);
    setError('');
    setLocationState('idle');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation([pos.coords.latitude, pos.coords.longitude]);
        setLocating(false);
        setLocationState('granted');
        fetchNearbyLocations(pos.coords.latitude, pos.coords.longitude, selectedType, searchRadius);
      },
      (geoError) => {
        setLocating(false);
        if (geoError.code === 1) {
          setLocationState('denied');
        } else {
          // 2 = pozycja niedostępna, 3 = timeout — to nie brak obsługi geolokalizacji.
          setLocationState('error');
        }
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  };

  const handleSearch = async () => {
    if (!customLocation.trim()) return;
    setEditingLocation(false);
    setLoading(true);
    setError('');
    try {
      const data = await placesApi.geocode(customLocation.trim());
      setUserLocation([data.lat, data.lng]);
      setLocationState('granted');
      await fetchNearbyLocations(data.lat, data.lng, selectedType, searchRadius);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Nie znaleziono lokalizacji. Spróbuj wpisać dokładniejszy adres.');
      setLoading(false);
    }
  };

  const openNavigation = (location: VetLocation) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}`;
    window.open(url, '_blank');
  };

  const query = searchQuery.trim().toLowerCase();
  const filteredLocations = locations.filter((loc) => {
    if (selectedType !== 'all' && loc.type !== selectedType) return false;
    if (show24hOnly && !loc.is24h) return false;
    if (query && !loc.name.toLowerCase().includes(query) && !loc.address.toLowerCase().includes(query)) return false;
    return true;
  });

  const typeFilters: { value: 'all' | 'vet' | 'dietitian'; label: string; Icon: any }[] = [
    { value: 'all', label: 'Wszystkie', Icon: MapPin },
    { value: 'vet', label: 'Weterynarze', Icon: Stethoscope },
    { value: 'dietitian', label: 'Dietetycy', Icon: Apple },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Filtry i szukajka */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filtruj wyniki po nazwie lub adresie..."
            className="w-full bg-white border border-gray-200 rounded-2xl pl-10 pr-4 py-2.5 sm:py-3 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        {typeFilters.map((f) => (
          <button
            key={f.value}
            onClick={() => setSelectedType(f.value)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-semibold border transition-all ${
              selectedType === f.value
                ? 'bg-brand-dark text-white border-transparent shadow-md shadow-brand-dark/20'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}
          >
            <f.Icon className="w-3.5 h-3.5" /> {f.label}
          </button>
        ))}
        {selectedType === 'dietitian' && (
          <button
            onClick={() => setShowAddDietitianModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 pv-btn-primary text-sm rounded-full ml-auto"
          >
            + Dodaj dietetyka
          </button>
        )}
      </div>

      {/* Ustawienia wyszukiwania */}
      {userLocation && (
        <div className="pv-card p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-900">Ustawienia wyszukiwania</h4>
            <button
              onClick={() => {
                setSearchRadius(10);
                setShow24hOnly(false);
              }}
              className="text-xs text-brand-dark hover:underline"
            >
              Resetuj filtry
            </button>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-gray-600">Promień wyszukiwania</label>
              <span className="text-xs font-semibold text-brand-dark">{searchRadius} km</span>
            </div>
            <input
              type="range"
              min="1"
              max="50"
              value={searchRadius}
              onChange={(e) => setSearchRadius(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#1B6B4A]"
            />
            <div className="flex justify-between text-[10px] text-gray-400 mt-1">
              <span>1 km</span>
              <span>50 km</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-xs text-gray-600">Tylko całodobowe (24/7)</label>
            <button
              onClick={() => setShow24hOnly(!show24hOnly)}
              className={`w-12 h-6 rounded-full transition-colors ${show24hOnly ? 'bg-brand-dark' : 'bg-gray-200'}`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                  show24hOnly ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}

      {/* Startowa sekcja lokalizacji */}
      {locationState === 'idle' && !userLocation && !editingLocation && (
        <div className="rounded-2xl bg-brand-mint/60 border border-brand-light/50 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-brand-mint flex items-center justify-center flex-shrink-0">
            <MapPinned className="w-5 h-5 text-brand-dark" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900">Pokaż kliniki w okolicy</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Włącz lokalizację, aby zobaczyć najbliższe kliniki weterynaryjne i gabinety dietetyczne.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleLocate}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl pv-btn-primary text-sm flex-shrink-0"
            >
              <Crosshair className="w-4 h-4" /> Włącz lokalizację
            </button>
            <button
              onClick={() => setEditingLocation(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 pv-card text-gray-600 text-sm font-medium hover:bg-brand-mint/60 transition-all flex-shrink-0"
            >
              <Search className="w-4 h-4" /> Wpisz lokalizację
            </button>
          </div>
        </div>
      )}

      {/* Ręczne wpisywanie lokalizacji */}
      {editingLocation && (
        <div className="pv-card p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900">Wpisz lokalizację</p>
            <button onClick={() => setEditingLocation(false)} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={customLocation}
              onChange={(e) => setCustomLocation(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="np. Warszawa, ul. Marszałkowska 1"
              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10"
            />
            <button onClick={handleSearch} className="px-4 py-2.5 rounded-xl pv-btn-primary text-sm">
              Szukaj
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-100 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {locationState === 'denied' && !userLocation && (
        <div className="rounded-2xl bg-amber-50 border border-amber-100 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center flex-shrink-0">
            <Settings className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">Brak dostępu do lokalizacji</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Aby wyszukać po okolicy, włącz lokalizację w ustawieniach przeglądarki, a następnie kliknij
              &quot;Spróbuj ponownie&quot;. Możesz też wpisać lokalizację ręcznie.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleLocate}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 transition-all flex-shrink-0"
            >
              <Crosshair className="w-4 h-4" /> Spróbuj ponownie
            </button>
            <button
              onClick={() => setEditingLocation(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 pv-card text-gray-600 text-sm font-medium hover:bg-brand-mint/60 transition-all flex-shrink-0"
            >
              <Search className="w-4 h-4" /> Wpisz lokalizację
            </button>
          </div>
        </div>
      )}

      {locationState === 'unsupported' && (
        <div className="rounded-2xl bg-gray-50 border border-gray-200 p-4 text-sm text-gray-600">
          Twoja przeglądarka nie obsługuje geolokalizacji lub wymaga połączenia HTTPS. Wpisz lokalizację, aby
          wyszukać kliniki.
        </div>
      )}

      {locationState === 'error' && !userLocation && (
        <div className="rounded-2xl bg-amber-50 border border-amber-100 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <p className="text-sm text-amber-800 flex-1">
            Nie udało się ustalić Twojej pozycji. Sprawdź sygnał GPS i spróbuj ponownie, albo wpisz lokalizację ręcznie.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleLocate}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 transition-all flex-shrink-0"
            >
              <Crosshair className="w-4 h-4" /> Spróbuj ponownie
            </button>
            <button
              onClick={() => setEditingLocation(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 pv-card text-gray-600 text-sm font-medium hover:bg-brand-mint/60 transition-all flex-shrink-0"
            >
              <Search className="w-4 h-4" /> Wpisz lokalizację
            </button>
          </div>
        </div>
      )}

      {userLocation && !loading && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 rounded-2xl bg-brand-dark/10 px-4 py-3 text-sm text-brand-dark">
          <div className="flex items-center gap-2">
            <Navigation className="w-4 h-4" />
            <span className="font-medium">
              Lokalizacja włączona{locations.length > 0 ? `: znaleziono ${locations.length} placówek w okolicy` : ''}
            </span>
          </div>
          <button onClick={() => setEditingLocation(true)} className="text-xs text-brand-dark underline sm:ml-auto">
            Zmień lokalizację
          </button>
        </div>
      )}

      {usingMockData && (
        <div className="p-3 rounded-2xl bg-amber-50 border border-amber-100 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            Dane testowe — brak lub błąd klucza Google Places API. Wyniki mogą nie być prawdziwe.
          </p>
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
        ) : locations.length === 0 && userLocation && !error ? (
          <div className="pv-card p-14 text-center">
            <p className="text-gray-500 text-sm">Brak placówek w tej okolicy. Spróbuj zwiększyć promień lub zmienić lokalizację.</p>
          </div>
        ) : filteredLocations.length === 0 && locations.length > 0 ? (
          <div className="pv-card p-14 text-center">
            <p className="text-gray-500 text-sm">Brak placówek spełniających wybrane filtry.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {filteredLocations.map((loc) => (
              <div
                key={loc.id}
                onClick={() => setSelectedVet(loc)}
                className="flex flex-col pv-card shadow-sm overflow-hidden hover:shadow-md hover:border-brand-dark/30 cursor-pointer transition-all"
              >
                <div className="h-28 sm:h-32 bg-brand-mint flex items-center justify-center relative overflow-hidden">
                  {loc.photos && loc.photos.length > 0 ? (
                    <img
                      src={loc.photos[0]}
                      alt={loc.name}
                      className="absolute inset-0 w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-white/70 flex items-center justify-center">
                      {loc.type === 'vet' ? (
                        <Stethoscope className="w-7 h-7 text-brand-dark" />
                      ) : (
                        <Apple className="w-7 h-7 text-brand-dark" />
                      )}
                    </div>
                  )}
                  {loc.is24h && (
                    <div className="absolute top-2 right-2 bg-brand-dark text-white text-[10px] font-bold px-2 py-1 rounded-full z-10">
                      24/7
                    </div>
                  )}
                </div>

                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm leading-tight">{loc.name}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">{loc.address}</p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-brand-dark bg-brand-dark/10 px-2 py-1 rounded-full flex-shrink-0">
                      <MapPin className="w-3 h-3" /> {loc.distance} km
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-brand-mint text-brand-dark border-emerald-200">
                      {loc.type === 'vet' ? 'Weterynarz' : 'Dietetyk'}
                    </span>
                    {loc.rating && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                        <Star className="w-3 h-3 fill-amber-600" /> {loc.rating}
                        {loc.userRatingsTotal ? ` (${loc.userRatingsTotal})` : ''}
                      </span>
                    )}
                    {loc.isOpenNow !== null && loc.isOpenNow !== undefined && (
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          loc.isOpenNow ? 'bg-brand-mint text-brand-dark' : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {loc.isOpenNow ? 'Otwarte teraz' : 'Zamknięte'}
                      </span>
                    )}
                    {loc.todayHours && !loc.is24h && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-gray-500">
                        <Clock className="w-3 h-3" /> {loc.todayHours}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-gray-100 mt-auto">
                    {loc.phone && (
                      <a
                        href={`tel:${loc.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 rounded-xl bg-gray-50 text-gray-600 hover:bg-brand-dark/10 hover:text-brand-dark transition-colors"
                      >
                        <Phone className="w-4 h-4" />
                      </a>
                    )}
                    {safeWebsiteUrl(loc.website) && (
                      <a
                        href={safeWebsiteUrl(loc.website)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 rounded-xl bg-gray-50 text-gray-600 hover:bg-brand-dark/10 hover:text-brand-dark transition-colors"
                      >
                        <Globe className="w-4 h-4" />
                      </a>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openNavigation(loc);
                      }}
                      className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl pv-btn-primary text-xs"
                    >
                      <Navigation className="w-3.5 h-3.5" /> Nawiguj
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedVet && <VetDetailModal vet={selectedVet} onClose={() => setSelectedVet(null)} />}
      {showAddDietitianModal && <AddDietitianModal onClose={() => setShowAddDietitianModal(false)} />}
    </div>
  );
}
