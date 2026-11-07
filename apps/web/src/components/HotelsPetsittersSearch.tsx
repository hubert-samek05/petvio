'use client';

import { useEffect, useState, useCallback } from 'react';
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
  X,
  MapPinned,
  PawPrint,
  AlertTriangle,
} from 'lucide-react';
import { placesApi, specialistApi } from '@/lib/api';
import HotelPetsitterDetailModal from './HotelPetsitterDetailModal';
import AddHotelPetsitterModal from './AddHotelPetsitterModal';

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
}

export default function HotelsPetsittersSearch() {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationState, setLocationState] = useState<'idle' | 'denied' | 'granted' | 'unsupported' | 'error'>('idle');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'hotel' | 'petsitter'>('all');
  const [locations, setLocations] = useState<HotelPetsitterLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingLocation, setEditingLocation] = useState(false);
  const [customLocation, setCustomLocation] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<HotelPetsitterLocation | null>(null);
  const [searchRadius, setSearchRadius] = useState(10);
  const [showAddModal, setShowAddModal] = useState(false);

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
          });
        });

        // Własna baza Petvio — hotele i petsitterzy dodani przez użytkowników
        const dbTypes = typeFilter === 'all' ? ['hotel', 'petsitter'] : [typeFilter];
        for (const dbType of dbTypes) {
          try {
            const res = await specialistApi.getAll({ type: dbType });
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

  const handleCustomLocationSubmit = async () => {
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

  const typeFilters: { value: 'all' | 'hotel' | 'petsitter'; label: string; Icon: any }[] = [
    { value: 'all', label: 'Wszystkie', Icon: MapPin },
    { value: 'hotel', label: 'Hotele', Icon: Building2 },
    { value: 'petsitter', label: 'Petsitterzy', Icon: User },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Szukajka */}
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
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 sm:py-3 pv-btn-primary text-sm rounded-2xl whitespace-nowrap"
        >
          + Dodaj hotel / petsittera
        </button>
      </div>

      {/* Filtry typu + promień */}
      <div className="pv-card p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {typeFilters.map(({ value, label, Icon }) => (
            <button
              key={value}
              onClick={() => setSelectedType(value)}
              className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                selectedType === value
                  ? 'bg-brand-dark text-white border-brand-dark'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-brand-dark/40'
              }`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {userLocation && (
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
              onChange={(e) => setSearchRadius(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-dark"
            />
          </div>
        )}
      </div>

      {/* Lokalizacja */}
      <div className="pv-card p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Twoja lokalizacja</h3>
          {!userLocation && !editingLocation && (
            <button onClick={() => setEditingLocation(true)} className="text-xs text-brand-dark hover:underline">
              Wpisz ręcznie
            </button>
          )}
        </div>

        {editingLocation ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={customLocation}
              onChange={(e) => setCustomLocation(e.target.value)}
              placeholder="np. Warszawa, ul. Marszałkowska 1"
              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10"
              onKeyDown={(e) => e.key === 'Enter' && handleCustomLocationSubmit()}
            />
            <button
              onClick={handleCustomLocationSubmit}
              disabled={loading || !customLocation.trim()}
              className="px-4 py-2.5 rounded-xl pv-btn-primary text-sm disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Szukaj'}
            </button>
            <button
              onClick={() => {
                setEditingLocation(false);
                setCustomLocation('');
              }}
              className="px-4 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200 transition-all"
            >
              Anuluj
            </button>
          </div>
        ) : userLocation ? (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-brand-dark/10">
            <MapPin className="w-4 h-4 text-brand-dark" />
            <span className="text-sm text-gray-700">Lokalizacja ustawiona</span>
            <button
              onClick={() => {
                setUserLocation(null);
                setLocationState('idle');
                setLocations([]);
              }}
              className="ml-auto text-xs text-gray-500 hover:text-gray-700"
            >
              Zmień
            </button>
          </div>
        ) : (
          <button
            onClick={handleLocate}
            disabled={locating}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl pv-btn-primary disabled:opacity-50"
          >
            {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crosshair className="w-4 h-4" />}
            {locating ? 'Pobieranie lokalizacji...' : 'Użyj mojej lokalizacji'}
          </button>
        )}

        {(locationState === 'denied' || locationState === 'unsupported' || locationState === 'error') && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 text-amber-700 text-sm">
            {locationState === 'denied'
              ? 'Dostęp do lokalizacji został zablokowany. Wpisz lokalizację ręcznie.'
              : locationState === 'unsupported'
                ? 'Geolokalizacja nie jest wspierana. Wpisz lokalizację ręcznie.'
                : 'Nie udało się ustalić Twojej pozycji. Sprawdź sygnał GPS i spróbuj ponownie, albo wpisz lokalizację ręcznie.'}
          </div>
        )}
      </div>

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
              ? 'Nie znaleziono hoteli dla zwierząt ani petsitterów w okolicy. Spróbuj zwiększyć promień.'
              : `Nie znaleziono ${selectedType === 'hotel' ? 'hoteli dla zwierząt' : 'petsitterów'} w okolicy. Spróbuj zwiększyć promień.`}
          </p>
        </div>
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
