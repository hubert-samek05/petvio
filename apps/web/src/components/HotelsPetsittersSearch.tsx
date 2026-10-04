'use client';

import { useEffect, useState } from 'react';
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
  ChevronRight,
  X,
  MapPinned,
  Settings,
  PawPrint,
  Calendar,
} from 'lucide-react';
import { placesApi } from '@/lib/api';
import HotelPetsitterDetailModal from './HotelPetsitterDetailModal';
import AddHotelPetsitterModal from './AddHotelPetsitterModal';

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
  hours?: string;
  isOpenNow?: boolean | null;
  photos?: string[];
  lat: number;
  lng: number;
  businessStatus?: string;
  description?: string;
  priceRange?: string;
}

export default function HotelsPetsittersSearch() {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationState, setLocationState] = useState<'idle' | 'denied' | 'granted' | 'unsupported'>('idle');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'hotel' | 'petsitter'>('all');
  const [locations, setLocations] = useState<HotelPetsitterLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingLocation, setEditingLocation] = useState(false);
  const [customLocation, setCustomLocation] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<HotelPetsitterLocation | null>(null);
  const [searchRadius, setSearchRadius] = useState(10);
  const [showAddModal, setShowAddModal] = useState(false);

  const handleLocate = () => {
    if (!navigator.geolocation) {
      setLocationState('unsupported');
      return;
    }
    
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      setLocationState('unsupported');
      alert('Geolokalizacja wymaga połączenia HTTPS. Wpisz lokalizację ręcznie.');
      return;
    }
    
    setLocating(true);
    setLocationState('idle');
    
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        if (result.state === 'denied') {
          setLocating(false);
          setLocationState('denied');
          alert('Dostęp do lokalizacji został wcześniej zablokowany.\n\nAby włączyć:\n1. Otwórz Ustawienia iOS\n2. Przejdź do Twojej przeglądarki > Lokalizacja\n3. Zmień na "Zapytaj" lub "Zezwól"\n\nLub wpisz lokalizację ręcznie.');
          return;
        }
      }).catch(() => {});
    }
    
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation([pos.coords.latitude, pos.coords.longitude]);
        setLocating(false);
        setLocationState('granted');
        fetchNearbyLocations(pos.coords.latitude, pos.coords.longitude);
      },
      (error) => {
        console.error('Geolocation error:', error);
        setLocating(false);
        setLocationState('denied');
        alert('Nie udało się pobrać lokalizacji. Wpisz lokalizację ręcznie.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const fetchNearbyLocations = async (lat: number, lng: number) => {
    setLoading(true);
    try {
      const response = await placesApi.nearbySearch({
        lat,
        lng,
        radius: searchRadius * 1000,
        type: selectedType === 'all' ? undefined : selectedType === 'hotel' ? 'lodging' : undefined,
      });
      
      const mappedLocations = response.data.map((place: any) => ({
        id: place.id,
        name: place.name,
        type: selectedType === 'hotel' ? 'hotel' : 'petsitter',
        address: place.address,
        distance: place.distance || 0,
        rating: place.rating,
        userRatingsTotal: place.userRatingsTotal,
        phone: place.phone,
        website: place.website,
        hours: place.openingHours?.join(', ') || '',
        isOpenNow: place.isOpenNow,
        photos: place.photos,
        lat: place.location.lat,
        lng: place.location.lng,
        businessStatus: place.businessStatus,
        description: place.description,
        priceRange: place.priceRange,
      }));
      
      setLocations(mappedLocations);
    } catch (error) {
      console.error('Error fetching locations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomLocationSubmit = async () => {
    if (!customLocation.trim()) return;
    
    setLoading(true);
    try {
      const response = await placesApi.autocomplete({ input: customLocation });
      if (response.data && response.data.length > 0) {
        const place = response.data[0];
        const details = await placesApi.getPlaceDetails(place.place_id);
        if (details.data && details.data.geometry) {
          const { lat, lng } = details.data.geometry.location;
          setUserLocation([lat, lng]);
          setLocationState('granted');
          fetchNearbyLocations(lat, lng);
          setEditingLocation(false);
        } else {
          alert('Nie udało się pobrać szczegółów lokalizacji.');
        }
      } else {
        alert('Nie znaleziono lokalizacji. Spróbuj inny opis.');
      }
    } catch (error) {
      console.error('Error geocoding:', error);
      alert('Nie udało się znaleźć lokalizacji.');
    } finally {
      setLoading(false);
    }
  };

  const openNavigation = (loc: HotelPetsitterLocation) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${loc.lat},${loc.lng}`;
    window.open(url, '_blank');
  };

  const filteredLocations = locations.filter((loc) => {
    if (selectedType !== 'all' && loc.type !== selectedType) return false;
    
    const searchLower = searchQuery.toLowerCase();
    if (searchQuery && !loc.name.toLowerCase().includes(searchLower) && !loc.address.toLowerCase().includes(searchLower)) {
      return false;
    }
    
    return true;
  });

  useEffect(() => {
    if (userLocation && selectedType !== 'all') {
      fetchNearbyLocations(userLocation[0], userLocation[1]);
    }
  }, [searchRadius, selectedType]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white border border-gray-200 p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Twoja lokalizacja</h3>
          {!userLocation && !editingLocation && (
            <button
              onClick={() => setEditingLocation(true)}
              className="text-xs text-brand-dark hover:underline"
            >
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
              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-brand-dark/50"
              onKeyPress={(e) => e.key === 'Enter' && handleCustomLocationSubmit()}
            />
            <button
              onClick={handleCustomLocationSubmit}
              disabled={loading || !customLocation.trim()}
              className="px-4 py-2.5 rounded-xl bg-brand-dark text-white text-sm font-medium hover:bg-brand-dark transition-all disabled:opacity-50"
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
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-dark text-white font-medium hover:bg-brand-dark transition-all disabled:opacity-50"
          >
            {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crosshair className="w-4 h-4" />}
            {locating ? 'Pobieranie lokalizacji...' : 'Użyj mojej lokalizacji'}
          </button>
        )}

        {locationState === 'denied' && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 text-amber-700 text-sm">
            Dostęp do lokalizacji został zablokowany. Wpisz lokalizację ręcznie.
          </div>
        )}

        {locationState === 'unsupported' && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 text-amber-700 text-sm">
            Geolokalizacja nie jest wspierana. Wpisz lokalizację ręcznie.
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-white border border-gray-200 p-4 sm:p-5 space-y-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Szukaj po nazwie lub adresie..."
            className="w-full bg-white border border-gray-200 rounded-2xl pl-10 pr-4 py-2.5 sm:py-3 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-dark/20 focus:border-brand-dark/50"
          />
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setSelectedType('all')}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                selectedType === 'all'
                  ? 'bg-brand-dark text-white border-brand-dark'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-brand-dark/40'
              }`}
            >
              Wszystkie
            </button>
            <button
              onClick={() => setSelectedType('hotel')}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                selectedType === 'hotel'
                  ? 'bg-brand-dark text-white border-brand-dark'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-brand-dark/40'
              }`}
            >
              Hotele
            </button>
            <button
              onClick={() => setSelectedType('petsitter')}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                selectedType === 'petsitter'
                  ? 'bg-brand-dark text-white border-brand-dark'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-brand-dark/40'
              }`}
            >
              Petsitterzy
            </button>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 rounded-xl text-sm font-medium bg-brand-dark text-white border border-brand-dark hover:bg-brand-dark/90 transition-all w-full sm:w-auto"
          >
            + Dodaj hotel / petsittera
          </button>
        </div>
      </div>

      {userLocation && (
        <div className="rounded-2xl bg-white border border-gray-200 p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-900">Ustawienia wyszukiwania</h4>
            <button
              onClick={() => {
                setSearchRadius(10);
                if (userLocation) {
                  fetchNearbyLocations(userLocation[0], userLocation[1]);
                }
              }}
              className="text-xs text-brand-dark hover:underline"
            >
              Resetuj filtry
            </button>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-gray-600">Promień wyszukiwania</label>
              <span className="text-xs font-medium text-gray-900">{searchRadius} km</span>
            </div>
            <input
              type="range"
              min="1"
              max="50"
              value={searchRadius}
              onChange={(e) => setSearchRadius(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#1B6B4A]"
            />
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-brand-dark animate-spin" />
        </div>
      )}

      {!loading && filteredLocations.length === 0 && userLocation && (
        <div className="rounded-2xl bg-white border border-gray-200 p-8 text-center">
          <MapPinned className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h4 className="font-semibold text-gray-900 mb-2">Brak wyników</h4>
          <p className="text-sm text-gray-500">
            {selectedType === 'all' 
              ? 'Nie znaleziono hoteli ani petsitterów w okolicy. Spróbuj zwiększyć promień wyszukiwania.'
              : `Nie znaleziono ${selectedType === 'hotel' ? 'hoteli' : 'petsitterów'} w okolicy. Spróbuj zwiększyć promień wyszukiwania.`
            }
          </p>
        </div>
      )}

      {!loading && filteredLocations.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredLocations.map((loc) => (
            <div
              key={loc.id}
              onClick={() => setSelectedLocation(loc)}
              className="bg-white rounded-2xl border border-gray-200 overflow-hidden cursor-pointer hover:border-brand-dark/40 hover:shadow-lg transition-all"
            >
              {loc.photos && loc.photos.length > 0 ? (
                <div className="relative h-40 bg-gray-100">
                  <img
                    src={`https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${loc.photos[0]}&key=${process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY}`}
                    alt={loc.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 right-3 flex gap-1.5">
                    {loc.type === 'hotel' && (
                      <div className="px-2 py-1 rounded-lg bg-brand-dark text-white text-xs font-medium">
                        Hotel
                      </div>
                    )}
                    {loc.type === 'petsitter' && (
                      <div className="px-2 py-1 rounded-lg bg-brand-dark text-white text-xs font-medium">
                        Petsitter
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="relative h-40 bg-gradient-to-br from-[#1B6B4A]/20 to-[#2A8A5C]/20 flex items-center justify-center">
                  {loc.type === 'hotel' ? (
                    <Building2 className="w-12 h-12 text-brand-dark/40" />
                  ) : (
                    <User className="w-12 h-12 text-brand-dark/40" />
                  )}
                  <div className="absolute top-3 right-3 flex gap-1.5">
                    {loc.type === 'hotel' && (
                      <div className="px-2 py-1 rounded-lg bg-brand-dark text-white text-xs font-medium">
                        Hotel
                      </div>
                    )}
                    {loc.type === 'petsitter' && (
                      <div className="px-2 py-1 rounded-lg bg-brand-dark text-white text-xs font-medium">
                        Petsitter
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="p-4 space-y-3">
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm leading-tight">{loc.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{loc.address}</p>
                </div>

                {loc.rating && (
                  <div className="flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    <span className="text-xs font-medium text-gray-900">{loc.rating.toFixed(1)}</span>
                    {loc.userRatingsTotal && (
                      <span className="text-xs text-gray-400">({loc.userRatingsTotal})</span>
                    )}
                  </div>
                )}

                {loc.distance > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{loc.distance.toFixed(1)} km</span>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-3 border-t border-gray-100 mt-auto">
                  {loc.phone && (
                    <a href={`tel:${loc.phone}`} className="p-2 rounded-xl bg-gray-50 text-gray-600 hover:bg-brand-dark/10 hover:text-brand-dark transition-colors">
                      <Phone className="w-4 h-4" />
                    </a>
                  )}
                  {loc.website && (
                    <a href={loc.website} target="_blank" rel="noreferrer" className="p-2 rounded-xl bg-gray-50 text-gray-600 hover:bg-brand-dark/10 hover:text-brand-dark transition-colors">
                      <Globe className="w-4 h-4" />
                    </a>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openNavigation(loc);
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-brand-dark text-white text-xs font-medium hover:bg-brand-dark transition-colors"
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
      {showAddModal && (
        <AddHotelPetsitterModal
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}
