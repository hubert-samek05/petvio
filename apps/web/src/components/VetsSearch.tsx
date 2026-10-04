'use client';

import { useEffect, useState } from 'react';
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
  Clock,
  ChevronRight,
  X,
  MapPinned,
  Settings,
} from 'lucide-react';
import { placesApi } from '@/lib/api';
import VetDetailModal from './VetDetailModal';
import AddSpecialistModal from './AddSpecialistModal';
import AddDietitianModal from './AddDietitianModal';

interface VetLocation {
  id: string;
  name: string;
  type: 'vet' | 'dietitian';
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
  is24h?: boolean;
}

export default function VetsSearch() {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationState, setLocationState] = useState<'idle' | 'denied' | 'granted' | 'unsupported'>('idle');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'vet' | 'dietitian'>('all');
  const [locations, setLocations] = useState<VetLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingLocation, setEditingLocation] = useState(false);
  const [customLocation, setCustomLocation] = useState('');
  const [selectedVet, setSelectedVet] = useState<VetLocation | null>(null);
  const [searchRadius, setSearchRadius] = useState(10);
  const [show24hOnly, setShow24hOnly] = useState(false);
  const [showAddDietitianModal, setShowAddDietitianModal] = useState(false);

  const handleLocate = () => {
    if (!navigator.geolocation) {
      setLocationState('unsupported');
      return;
    }
    
    // Check if HTTPS (required for iOS geolocation)
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      setLocationState('unsupported');
      alert('Geolokalizacja wymaga połączenia HTTPS. Wpisz lokalizację ręcznie.');
      return;
    }
    
    setLocating(true);
    setLocationState('idle');
    
    console.log('Requesting geolocation...');
    
    // Try to check permission state first (if supported)
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        console.log('Geolocation permission state:', result.state);
        if (result.state === 'denied') {
          setLocating(false);
          setLocationState('denied');
          alert('Dostęp do lokalizacji został wcześniej zablokowany.\n\nAby włączyć:\n1. Otwórz Ustawienia iOS\n2. Przejdź do Twojej przeglądarki > Lokalizacja\n3. Zmień na "Zapytaj" lub "Zezwól"\n\nLub wpisz lokalizację ręcznie.');
          return;
        }
      }).catch(() => {
        // Permission API not supported, continue with normal flow
      });
    }
    
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        console.log('Geolocation success:', pos.coords);
        setUserLocation([pos.coords.latitude, pos.coords.longitude]);
        setLocating(false);
        setLocationState('granted');
        fetchNearbyLocations(pos.coords.latitude, pos.coords.longitude);
      },
      (error) => {
        console.error('Geolocation error:', error.code, error.message);
        setLocating(false);
        
        // iOS-specific handling
        if (error.code === 1) {
          setLocationState('denied');
          alert('Dostęp do lokalizacji został zablokowany.\n\nAby włączyć:\n1. Otwórz Ustawienia iOS\n2. Przejdź do Twojej przeglądarki > Lokalizacja\n3. Zmień na "Zapytaj" lub "Zezwól"\n\nLub wpisz lokalizację ręcznie.');
        } else if (error.code === 2) {
          setLocationState('unsupported');
          alert('Nie można ustalić lokalizacji. Wpisz ją ręcznie.');
        } else if (error.code === 3) {
          setLocationState('unsupported');
          alert('Przekroczono czas oczekiwania na lokalizację. Spróbuj ponownie lub wpisz lokalizację ręcznie.');
        } else {
          setLocationState('denied');
          alert('Błąd lokalizacji. Wpisz lokalizację ręcznie.');
        }
      },
      { enableHighAccuracy: false, timeout: 30000, maximumAge: 0 }
    );
  };

  const fetchNearbyLocations = async (lat: number, lng: number) => {
    setLoading(true);
    try {
      const type = selectedType === 'vet' ? 'veterinary_care' : selectedType === 'dietitian' ? 'health' : 'veterinary_care';
      const response = await placesApi.nearbySearch({
        lat,
        lng,
        radius: searchRadius * 1000,
        type,
      });

      const transformedLocations: VetLocation[] = response.places.map((place: any) => {
        const distance = calculateDistance(lat, lng, place.location.lat, place.location.lng);
        const isVet = place.types?.includes('veterinary_care') || place.types?.includes('veterinary');
        return {
          id: place.id,
          name: place.name,
          type: isVet ? 'vet' : 'dietitian',
          address: place.address,
          distance: Math.round(distance * 10) / 10,
          rating: place.rating,
          userRatingsTotal: place.userRatingsTotal,
          phone: place.phone,
          website: place.website,
          hours: place.openingHours?.join(', ') || null,
          isOpenNow: place.isOpenNow,
          photos: place.photos || [],
          lat: place.location.lat,
          lng: place.location.lng,
          businessStatus: place.businessStatus,
          is24h: place.is24h || false,
        };
      });

      setLocations(transformedLocations);
    } catch (error) {
      console.error('Error fetching nearby locations:', error);
      // Fallback to mock data on error
      const mockLocations: VetLocation[] = [
        {
          id: 'mock_1',
          name: 'Klinika Weterynaryjna "Paw"',
          type: 'vet',
          address: 'ul. Kowalska 15, Warszawa',
          distance: 1.2,
          rating: 4.8,
          phone: '+48 123 456 789',
          website: 'https://klinikapaw.pl',
          hours: '8:00-20:00',
          lat: lat + 0.01,
          lng: lng + 0.01,
        },
        {
          id: 'mock_2',
          name: 'Gabinet Dietetyczny Zwierząt',
          type: 'dietitian',
          address: 'ul. Nowicka 8, Warszawa',
          distance: 2.5,
          rating: 4.5,
          phone: '+48 987 654 321',
          hours: '9:00-18:00',
          lat: lat - 0.01,
          lng: lng + 0.02,
        },
        {
          id: 'mock_3',
          name: 'VetCenter 24h',
          type: 'vet',
          address: 'ul. Marszałkowska 42, Warszawa',
          distance: 3.1,
          rating: 4.2,
          phone: '+48 555 123 456',
          website: 'https://vetcenter24.pl',
          hours: '24/7',
          lat: lat + 0.02,
          lng: lng - 0.01,
        },
      ];
      setLocations(mockLocations);
    } finally {
      setLoading(false);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handleSearch = async () => {
    if (customLocation) {
      setEditingLocation(false);
      setLoading(true);
      
      try {
        // Use Google Geocoding API to convert address to coordinates
        const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(customLocation)}&key=AIzaSyAx_kQclM1Ax_VgtTR1ZlH76Z2pT8QB_6U`;
        const response = await fetch(geocodeUrl);
        const data = await response.json();
        
        if (data.status === 'OK' && data.results.length > 0) {
          const { lat, lng } = data.results[0].geometry.location;
          setUserLocation([lat, lng]);
          setLocationState('granted');
          await fetchNearbyLocations(lat, lng);
        } else {
          alert('Nie znaleziono lokalizacji. Spróbuj wpisać dokładniejszy adres.');
          setLoading(false);
        }
      } catch (error) {
        console.error('Geocoding error:', error);
        alert('Błąd wyszukiwania lokalizacji. Spróbuj ponownie.');
        setLoading(false);
      }
    }
  };

  const openNavigation = (location: VetLocation) => {
    // Open in Google Maps
    const url = `https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}`;
    window.open(url, '_blank');
  };

  const clearLocation = () => {
    setUserLocation(null);
    setLocationState('idle');
    setLocations([]);
  };

  const filteredLocations = locations.filter((loc) => {
    // First filter by type
    if (selectedType !== 'all' && loc.type !== selectedType) return false;

    // Check if location is 24/7 (for display purposes)
    const hoursString = loc.hours || '';
    const is24h = loc.is24h || 
                 hoursString.toLowerCase().includes('24/7') ||
                 hoursString.toLowerCase().includes('24 godziny') ||
                 hoursString.toLowerCase().includes('całodobowa') ||
                 hoursString.toLowerCase().includes('open 24 hours') ||
                 hoursString.toLowerCase().includes('12:00 am – 12:00 am') ||
                 hoursString.toLowerCase().includes('12:00 am-12:00 am') ||
                 hoursString.toLowerCase().includes('0:00 – 0:00') ||
                 hoursString.toLowerCase().includes('0:00-0:00') ||
                 hoursString.toLowerCase().includes('00:00 – 00:00') ||
                 hoursString.toLowerCase().includes('00:00-00:00') ||
                 hoursString.toLowerCase().includes('00:00-24:00') ||
                 hoursString.toLowerCase().includes('0:00-24:00') ||
                 hoursString.toLowerCase().includes('24:00-24:00') ||
                 hoursString.toLowerCase().includes('całodobowe') ||
                 hoursString.toLowerCase().includes('24h') ||
                 hoursString.toLowerCase().includes('24 h') ||
                 hoursString.toLowerCase().includes('czynne całą dobę');
    
    // Add is24h property to location for display
    (loc as any).is24hDisplay = is24h;

    // Then filter by 24/7 if enabled
    if (show24hOnly && !is24h) return false;

    return true;
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
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
              onClick={() => setSelectedType('vet')}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                selectedType === 'vet'
                  ? 'bg-brand-dark text-white border-brand-dark'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-brand-dark/40'
              }`}
            >
              Weterynarze
            </button>
            <button
              onClick={() => setSelectedType('dietitian')}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                selectedType === 'dietitian'
                  ? 'bg-brand-dark text-white border-brand-dark'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-brand-dark/40'
              }`}
            >
              Dietetycy
            </button>
          </div>
          {selectedType === 'dietitian' && (
            <button
              onClick={() => setShowAddDietitianModal(true)}
              className="px-4 py-2.5 rounded-xl text-sm font-medium bg-brand-dark text-white border border-brand-dark hover:bg-brand-dark/90 transition-all w-full sm:w-auto"
            >
              + Dodaj dietetyka
            </button>
          )}
        </div>
      </div>

      {userLocation && (
        <div className="rounded-2xl bg-white border border-gray-200 p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-900">Ustawienia wyszukiwania</h4>
            <button
              onClick={() => {
                setSearchRadius(10);
                setShow24hOnly(false);
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
              <span className="text-xs font-semibold text-brand-dark">{searchRadius} km</span>
            </div>
            <input
              type="range"
              min="1"
              max="50"
              value={searchRadius}
              onChange={(e) => {
                setSearchRadius(parseInt(e.target.value));
                if (userLocation) {
                  fetchNearbyLocations(userLocation[0], userLocation[1]);
                }
              }}
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
              className={`w-12 h-6 rounded-full transition-colors ${
                show24hOnly ? 'bg-brand-dark' : 'bg-gray-200'
              }`}
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

      {locationState === 'idle' && !userLocation && !editingLocation && (
        <div className="rounded-2xl bg-brand-dark/5 border border-brand-dark/10 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center flex-shrink-0">
            <MapPinned className="w-5 h-5 text-brand-dark" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900">Pokaż kliniki w okolicy</p>
            <p className="text-xs text-gray-500 mt-0.5">Włącz lokalizację, aby zobaczyć najbliższe kliniki weterynaryjne i gabinety dietetyczne.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleLocate}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-dark text-white text-sm font-medium hover:bg-brand-dark transition-all flex-shrink-0"
            >
              <Crosshair className="w-4 h-4" /> Włącz lokalizację
            </button>
            <button
              onClick={() => setEditingLocation(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-all flex-shrink-0"
            >
              <Search className="w-4 h-4" /> Wpisz lokalizację
            </button>
          </div>
        </div>
      )}

      {editingLocation && (
        <div className="rounded-2xl bg-white border border-gray-200 p-4 sm:p-5 space-y-4">
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
              placeholder="np. Warszawa, ul. Marszałkowska 1"
              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-dark/50"
            />
            <button
              onClick={handleSearch}
              className="px-4 py-2.5 rounded-xl bg-brand-dark text-white text-sm font-medium hover:bg-brand-dark transition-all"
            >
              Szukaj
            </button>
          </div>
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
              Aby wyszukać po okolicy, włącz lokalizację w ustawieniach przeglądarki, a następnie kliknij &quot;Spróbuj ponownie&quot;. Możesz też wpisać lokalizację ręcznie.
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
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-all flex-shrink-0"
            >
              <Search className="w-4 h-4" /> Wpisz lokalizację
            </button>
          </div>
        </div>
      )}

      {locationState === 'unsupported' && (
        <div className="rounded-2xl bg-gray-50 border border-gray-200 p-4 text-sm text-gray-600">
          Twoja przeglądarka nie obsługuje geolokalizacji. Wpisz lokalizację, aby wyszukać kliniki.
        </div>
      )}

      {userLocation && !loading && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 rounded-2xl bg-brand-dark/10 px-4 py-3 text-sm text-brand-dark">
          <div className="flex items-center gap-2">
            <Navigation className="w-4 h-4" />
            <span className="font-medium">Lokalizacja włączona{locations.length > 0 ? `: znaleziono ${locations.length} placówek w okolicy` : ''}</span>
          </div>
          <button onClick={clearLocation} className="text-xs text-brand-dark underline hover:text-brand-dark sm:ml-auto">
            Zmień lokalizację
          </button>
        </div>
      )}

      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-16 text-gray-500">
            <div className="w-10 h-10 border-4 border-gray-200 border-t-[#1B6B4A] rounded-full animate-spin mx-auto mb-4" />
            Szukanie placówek...
          </div>
        ) : locations.length === 0 && userLocation ? (
          <div className="text-center py-16 px-4 rounded-2xl bg-gray-50 border border-gray-200 border-dashed">
            <p className="text-gray-500 text-sm">Brak placówek w tej okolicy. Spróbuj zmienić lokalizację.</p>
          </div>
        ) : filteredLocations.length === 0 && locations.length > 0 ? (
          <div className="text-center py-16 px-4 rounded-2xl bg-gray-50 border border-gray-200 border-dashed">
            <p className="text-gray-500 text-sm">Brak placówek tego typu w wybranym filtrze.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {filteredLocations.map((loc) => (
              <div
                key={loc.id}
                onClick={() => setSelectedVet(loc)}
                className="flex flex-col rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden hover:shadow-md hover:border-brand-dark/30 cursor-pointer transition-all"
              >
                <div className="h-28 sm:h-32 bg-gradient-to-br from-[#1B6B4A]/20 to-[#1B6B4A]/5 flex items-center justify-center relative overflow-hidden">
                  {(loc as any).is24hDisplay && (
                    <div className="absolute top-2 right-2 bg-brand-dark text-white text-[10px] font-bold px-2 py-1 rounded-full z-10">
                      24/7
                    </div>
                  )}
                  {loc.photos && loc.photos.length > 0 ? (
                    <img
                      src={`https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${loc.photos[0]}&key=AIzaSyAx_kQclM1Ax_VgtTR1ZlH76Z2pT8QB_6U`}
                      alt={loc.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        // Fallback to icon
                        e.currentTarget.parentElement!.innerHTML = `
                          <div class="w-14 h-14 rounded-2xl bg-white/80 flex items-center justify-center">
                            ${loc.type === 'vet' ? '<svg class="w-7 h-7 text-brand-dark" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>' : '<svg class="w-7 h-7 text-brand-dark" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>'}
                          </div>
                        `;
                      }}
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-white/80 flex items-center justify-center">
                      {loc.type === 'vet' ? <Stethoscope className="w-7 h-7 text-brand-dark" /> : <Apple className="w-7 h-7 text-brand-dark" />}
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

                  <div className="flex items-center gap-2 mb-3">
                    {loc.rating && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                        <Star className="w-3 h-3 fill-amber-600" /> {loc.rating}
                      </span>
                    )}
                    {loc.hours && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-gray-500">
                        <Clock className="w-3 h-3" /> {loc.hours}
                      </span>
                    )}
                  </div>

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
                      onClick={() => openNavigation(loc)}
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
      </div>

      {selectedVet && <VetDetailModal vet={selectedVet} onClose={() => setSelectedVet(null)} />}
      {showAddDietitianModal && (
        <AddDietitianModal
          onClose={() => setShowAddDietitianModal(false)}
        />
      )}
    </div>
  );
}
