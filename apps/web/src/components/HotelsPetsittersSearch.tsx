'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import {
  MapPin,
  Navigation,
  Loader2,
  Search,
  Crosshair,
  Building2,
  User,
  Phone,
  Globe,
  Star,
  Clock,
  MapPinned,
  PawPrint,
  AlertTriangle,
  Users,
} from 'lucide-react';
import { placesApi, specialistApi } from '@/lib/api';
import HotelPetsitterDetailModal from './HotelPetsitterDetailModal';
import AddHotelPetsitterModal from './AddHotelPetsitterModal';
import type { MapPlace } from './PlacesMap';

const PlacesMap = dynamic(() => import('@/components/PlacesMap'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-gray-100 animate-pulse" />,
});

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

interface HotelPetsitterLocation {
  id: string;
  name: string;
  type: 'hotel' | 'petsitter';
  address: string;
  distance: number;
  rating?: number;
  userRatingsTotal?: number;
  phone?: string;
  website?: string;
  hours?: string[] | null;
  todayHours?: string | null;
  isOpenNow?: boolean | null;
  photos?: string[];
  lat: number;
  lng: number;
  businessStatus?: string;
  description?: string;
  priceRange?: string;
  is24h?: boolean;
  community?: boolean;
}

type AddressSuggestion = { placeId: string; description: string; lat: number; lng: number };

export default function HotelsPetsittersSearch() {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [userLocationLabel, setUserLocationLabel] = useState('');
  const [locating, setLocating] = useState(false);
  const [locationState, setLocationState] = useState<'idle' | 'denied' | 'granted' | 'unsupported' | 'error'>('idle');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'hotel' | 'petsitter'>('all');
  const [locations, setLocations] = useState<HotelPetsitterLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<HotelPetsitterLocation | null>(null);
  const [searchRadius, setSearchRadius] = useState(10);
  const [showAddModal, setShowAddModal] = useState(false);

  // wyszukiwarka adresu z podpowiedziami
  const [addressInput, setAddressInput] = useState('');
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const suggestDebounce = useRef<NodeJS.Timeout | null>(null);
  const suggestBoxRef = useRef<HTMLDivElement>(null);

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const fetchNearbyLocations = useCallback(
    async (lat: number, lng: number, typeFilter: 'all' | 'hotel' | 'petsitter', radiusKm: number) => {
      setLoading(true);
      setError('');
      try {
        const radius = radiusKm * 1000;
        // Jedno zapytanie 'stays' = hotele + petsitterzy (polowa obciazenia Overpass)
        const apiType = typeFilter === 'hotel' ? 'lodging' : typeFilter === 'petsitter' ? 'petsitter' : 'stays';

        let osmPlaces: any[] = [];
        let osmFailed = false;
        try {
          const response = await placesApi.nearbySearch({ lat, lng, radius, type: apiType });
          osmPlaces = response.places || [];
        } catch {
          osmFailed = true;
        }

        const seen = new Set<string>();
        const transformed: HotelPetsitterLocation[] = [];

        osmPlaces.forEach((place: any) => {
          if (seen.has(place.id)) return;
          seen.add(place.id);
          const t: string[] = place.types || [];
          const isHotel = t.some((x) => ['lodging', 'hotel', 'guest_house', 'hostel', 'motel'].includes(x));
          const isPetsitter = t.some((x) => ['petsitter', 'animal_boarding', 'animal_shelter'].includes(x));
          if (!isHotel && !isPetsitter) return;
          const distance = calculateDistance(lat, lng, place.location.lat, place.location.lng);
          transformed.push({
            id: place.id,
            name: place.name,
            type: isHotel ? 'hotel' : 'petsitter',
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
            is24h: place.is24h || false,
            community: false,
          });
        });

        // Własna baza Petvio — hotele i petsitterzy dodani przez użytkowników
        const dbTypes = typeFilter === 'all' ? ['hotel', 'petsitter'] : [typeFilter];
        for (const dbType of dbTypes) {
          try {
            const res = await specialistApi.getAll({ type: dbType, lat, lng, radius: radiusKm });
            (res.specialists || []).forEach((s: any) => {
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
                type: dbType as 'hotel' | 'petsitter',
                address: [s.address, s.city].filter(Boolean).join(', '),
                distance: Math.round(distance * 10) / 10,
                phone: s.phone,
                website: s.website,
                isOpenNow: null,
                photos: s.photo_url ? [s.photo_url] : [],
                lat: sLat,
                lng: sLng,
                description: s.description,
                priceRange: s.price_info,
                is24h: false,
                community: true,
              });
            });
          } catch (e) {
            console.warn('Nie udało się pobrać wyników z bazy Petvio', e);
          }
        }

        transformed.sort((a, b) => a.distance - b.distance);
        setLocations(transformed);
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

  // Automatyczna lokalizacja przy wejściu na zakładkę
  useEffect(() => {
    handleLocate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced refetch przy zmianie promienia lub typu
  useEffect(() => {
    if (!userLocation) return;
    const t = setTimeout(() => {
      fetchNearbyLocations(userLocation[0], userLocation[1], selectedType, searchRadius);
    }, 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchRadius, selectedType]);

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
    fetchNearbyLocations(s.lat, s.lng, selectedType, searchRadius);
  };

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
        setUserLocationLabel('Twoja aktualna pozycja');
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

  const openNavigation = (loc: HotelPetsitterLocation) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${loc.lat},${loc.lng}`;
    window.open(url, '_blank');
  };

  const query = searchQuery.trim().toLowerCase();
  const filteredLocations = locations.filter((loc) => {
    if (selectedType !== 'all' && loc.type !== selectedType) return false;
    if (loc.distance > searchRadius) return false;
    if (query && !loc.name.toLowerCase().includes(query) && !loc.address.toLowerCase().includes(query)) return false;
    return true;
  });

  const mapPlaces: MapPlace[] = filteredLocations.map((l) => ({
    id: l.id,
    name: l.name,
    lat: l.lat,
    lng: l.lng,
    type: l.type,
    community: l.community,
  }));

  const typeFilters: { value: 'all' | 'hotel' | 'petsitter'; label: string; Icon: any }[] = [
    { value: 'all', label: 'Wszystkie', Icon: MapPin },
    { value: 'hotel', label: 'Hotele', Icon: Building2 },
    { value: 'petsitter', label: 'Petsitterzy', Icon: User },
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

      {/* Filtry typu + promień */}
      <div className="pv-card p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {typeFilters.map(({ value, label, Icon }) => (
            <button
              key={value}
              onClick={() => setSelectedType(value)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                selectedType === value
                  ? 'bg-brand-dark text-white border-brand-dark'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-brand-dark/40'
              }`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
          <div className="relative flex-1 min-w-[140px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filtruj po nazwie..."
              className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10"
            />
          </div>
        </div>

        {userLocation && (
          <div className="flex items-center gap-3">
            <label className="text-xs text-gray-600 whitespace-nowrap">Promień</label>
            <input
              type="range"
              min="1"
              max="50"
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
          <Building2 className="w-5 h-5 text-violet-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">
            Prowadzisz hotel dla zwierząt lub petsitting?
          </p>
          <p className="text-xs text-gray-500">
            Panel firmowy, przejmowanie profilu i rezerwacje online
          </p>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wide text-violet-600 bg-violet-100 px-2.5 py-1 rounded-full whitespace-nowrap">
          Wkrótce
        </span>
      </div>

      {/* Mapa z wynikami */}
      {userLocation && (
        <PlacesMap
          center={{ lat: userLocation[0], lng: userLocation[1] }}
          radiusKm={searchRadius}
          places={mapPlaces}
          selectedId={selectedLocation?.id}
          onSelect={(id) => {
            const loc = filteredLocations.find((l) => l.id === id);
            if (loc) setSelectedLocation(loc);
          }}
          className="h-[340px] sm:h-[420px]"
        />
      )}

      {/* Blad */}
      {error && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-700">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium">{error}</p>
            {userLocation && (
              <button
                onClick={() => fetchNearbyLocations(userLocation[0], userLocation[1], selectedType, searchRadius)}
                className="mt-1 text-xs font-semibold underline hover:no-underline"
              >
                Spróbuj ponownie
              </button>
            )}
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Loader2 className="w-8 h-8 text-brand-dark animate-spin" />
          <p className="text-sm text-gray-500">Szukam placówek w okolicy...</p>
        </div>
      )}

      {/* Pusto */}
      {!loading && !error && filteredLocations.length === 0 && userLocation && (
        <div className="pv-card p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-3xl bg-brand-mint flex items-center justify-center animate-float">
            <MapPinned className="w-7 h-7 text-brand-dark" />
          </div>
          <h4 className="font-semibold text-gray-900 mb-2">Brak wyników</h4>
          <p className="text-sm text-gray-500">
            {selectedType === 'all'
              ? 'Nie znaleziono hoteli dla zwierząt ani petsitterów w okolicy. Spróbuj zwiększyć promień albo dodaj pierwsze miejsce!'
              : `Nie znaleziono ${selectedType === 'hotel' ? 'hoteli dla zwierząt' : 'petsitterów'} w okolicy. Spróbuj zwiększyć promień albo dodaj pierwsze miejsce!`}
          </p>
        </div>
      )}

      {/* Licznik wyników */}
      {!loading && filteredLocations.length > 0 && (
        <p className="text-xs text-gray-500 px-1">
          Znaleziono <span className="font-semibold text-gray-700">{filteredLocations.length}</span>{' '}
          {filteredLocations.length === 1 ? 'miejsce' : filteredLocations.length < 5 ? 'miejsca' : 'miejsc'} w promieniu{' '}
          {searchRadius} km
        </p>
      )}

      {/* Wyniki */}
      {!loading && filteredLocations.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredLocations.map((loc) => (
            <div
              key={loc.id}
              onClick={() => setSelectedLocation(loc)}
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
                    {loc.type === 'hotel' ? (
                      <Building2 className="w-7 h-7 text-brand-dark" />
                    ) : (
                      <PawPrint className="w-7 h-7 text-brand-dark" />
                    )}
                  </div>
                )}
                {loc.is24h && (
                  <div className="absolute top-2 right-2 bg-brand-dark text-white text-[10px] font-bold px-2 py-1 rounded-full z-10">
                    24/7
                  </div>
                )}
                {loc.community && (
                  <div className="absolute top-2 left-2 inline-flex items-center gap-1 bg-violet-600 text-white text-[10px] font-bold px-2 py-1 rounded-full z-10">
                    <Users className="w-3 h-3" /> Od społeczności
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
                    {loc.type === 'hotel' ? 'Hotel dla zwierząt' : 'Petsitter'}
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

      {selectedLocation && <HotelPetsitterDetailModal location={selectedLocation} onClose={() => setSelectedLocation(null)} />}
      {showAddModal && <AddHotelPetsitterModal onClose={() => setShowAddModal(false)} />}
    </div>
  );
}
