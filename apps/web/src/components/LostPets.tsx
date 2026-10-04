'use client';

import { useState, useEffect } from 'react';
import {
  AlertTriangle,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Search,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  PawPrint,
  FileText,
  Image as ImageIcon,
  Info,
  CheckCircle,
  Clock
} from 'lucide-react';

interface LostPet {
  id: string;
  petId?: string;
  ownerId: string;
  ownerName: string;
  ownerPhone?: string;
  ownerEmail: string;
  petName: string;
  species: 'dog' | 'cat' | 'other';
  breed?: string;
  color: string;
  age?: number;
  gender?: 'male' | 'female';
  description: string;
  lastSeenLocation: string;
  lastSeenCity: string;
  lastSeenLat?: number;
  lastSeenLng?: number;
  lastSeenDate: string;
  distinguishingFeatures?: string;
  reward?: string;
  images: string[];
  status: 'lost' | 'found';
  createdAt: string;
  foundAt?: string;
}

interface Pet {
  id: string;
  name: string;
  species: string;
  breed?: string;
  color?: string;
  birth_date?: string;
  gender?: string;
}

const cities = [
  'Warszawa', 'Kraków', 'Wrocław', 'Poznań', 'Gdańsk', 'Szczecin', 'Łódź', 'Katowice',
  'Lublin', 'Białystok', 'Gdynia', 'Częstochowa', 'Radom', 'Toruń', 'Kielce', 'Inne'
];

const cityCoordinates: Record<string, { lat: number; lng: number }> = {
  'Warszawa': { lat: 52.2297, lng: 21.0122 },
  'Kraków': { lat: 50.0647, lng: 19.9450 },
  'Wrocław': { lat: 51.1079, lng: 17.0385 },
  'Poznań': { lat: 52.4064, lng: 16.9252 },
  'Gdańsk': { lat: 54.3520, lng: 18.6466 },
  'Szczecin': { lat: 53.4285, lng: 14.5528 },
  'Łódź': { lat: 51.7592, lng: 19.4559 },
  'Katowice': { lat: 50.2649, lng: 19.0238 },
  'Lublin': { lat: 51.2465, lng: 22.5684 },
  'Białystok': { lat: 53.1325, lng: 23.1688 },
  'Gdynia': { lat: 54.5189, lng: 18.5305 },
  'Częstochowa': { lat: 50.8118, lng: 19.1203 },
  'Radom': { lat: 51.4027, lng: 21.1471 },
  'Toruń': { lat: 53.0138, lng: 18.5984 },
  'Kielce': { lat: 50.8661, lng: 20.6286 },
  'Inne': { lat: 52.0, lng: 19.0 },
};

function getDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function getNearestCity(lat: number, lng: number) {
  return Object.entries(cityCoordinates)
    .filter(([name]) => name !== 'Inne')
    .sort(([a], [b]) => getDistance(lat, lng, cityCoordinates[a].lat, cityCoordinates[a].lng) - getDistance(lat, lng, cityCoordinates[b].lat, cityCoordinates[b].lng))[0][0];
}

export default function LostPets() {
  const [lostPets, setLostPets] = useState<LostPet[]>([]);
  const [myPets, setMyPets] = useState<Pet[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userCity, setUserCity] = useState('Warszawa');
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedPet, setSelectedPet] = useState<LostPet | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('all');
  const [searchRadius, setSearchRadius] = useState(25);
  const [geoStatus, setGeoStatus] = useState<'idle' | 'loading' | 'done' | 'denied'>('idle');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [step, setStep] = useState(1);
  const [formError, setFormError] = useState('');

  const [formData, setFormData] = useState({
    petId: '',
    petName: '',
    species: 'dog' as 'dog' | 'cat' | 'other',
    breed: '',
    color: '',
    age: '',
    gender: 'male' as 'male' | 'female',
    description: '',
    lastSeenLocation: '',
    lastSeenCity: 'Warszawa',
    lastSeenDate: new Date().toISOString().slice(0, 10),
    distinguishingFeatures: '',
    reward: '',
    phone: '',
    image: '',
  });

  const enrichPosts = (pets: LostPet[]): LostPet[] =>
    pets.map(p => ({
      ...p,
      lastSeenLat: p.lastSeenLat ?? cityCoordinates[p.lastSeenCity]?.lat,
      lastSeenLng: p.lastSeenLng ?? cityCoordinates[p.lastSeenCity]?.lng,
    }));

  useEffect(() => {
    if (showReportModal || selectedPet) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      document.body.classList.add('modal-open');
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      document.body.classList.remove('modal-open');
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      document.body.classList.remove('modal-open');
    };
  }, [showReportModal, selectedPet]);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      setCurrentUser(user);

      // Load user's pets
      const mockPets: Pet[] = [
        { id: '1', name: 'Burek', species: 'dog', breed: 'Labrador', color: 'Złoty', gender: 'male' },
        { id: '2', name: 'Mia', species: 'cat', breed: 'Perski', color: 'Biały', gender: 'female' },
      ];
      setMyPets(mockPets);

      const savedLostPets = localStorage.getItem('lostPets');
      if (savedLostPets) {
        setLostPets(enrichPosts(JSON.parse(savedLostPets)));
      } else {
        const mockLostPets: LostPet[] = [
          {
            id: '1',
            ownerId: '2',
            ownerName: 'Anna Kowalska',
            ownerEmail: 'anna@example.com',
            ownerPhone: '+48 123 456 789',
            petName: 'Max',
            species: 'dog',
            breed: 'Golden Retriever',
            color: 'Złoty',
            age: 3,
            gender: 'male',
            description: 'Bardzo przyjazny pies, reaguje na imię Max. Nosi czerwoną obrożę z adresówką.',
            lastSeenLocation: 'Park Łazienkowski',
            lastSeenCity: 'Warszawa',
            lastSeenDate: new Date(Date.now() - 86400000).toISOString().slice(0, 10),
            distinguishingFeatures: 'Biała plama na klatce piersiowej',
            reward: '500 zł',
            images: [],
            status: 'lost',
            createdAt: new Date(Date.now() - 86400000).toISOString(),
          },
          {
            id: '2',
            ownerId: '3',
            ownerName: 'Jan Nowak',
            ownerEmail: 'jan@example.com',
            petName: 'Luna',
            species: 'cat',
            breed: 'Dachowiec',
            color: 'Czarno-biały',
            gender: 'female',
            description: 'Młoda kotka, bardzo nieśmiała. Zaginęła w okolicy bloku.',
            lastSeenLocation: 'Osiedle Kabaty',
            lastSeenCity: 'Warszawa',
            lastSeenDate: new Date(Date.now() - 172800000).toISOString().slice(0, 10),
            images: [],
            status: 'lost',
            createdAt: new Date(Date.now() - 172800000).toISOString(),
          },
          {
            id: '3',
            ownerId: '4',
            ownerName: 'Maria Wiśniewska',
            ownerEmail: 'maria@example.com',
            ownerPhone: '+48 987 654 321',
            petName: 'Reksio',
            species: 'dog',
            breed: 'Kundelek',
            color: 'Brązowy',
            age: 5,
            gender: 'male',
            description: 'Starszy pies, może być przestraszony. Kuleje na prawą tylną łapę.',
            lastSeenLocation: 'Stare Miasto',
            lastSeenCity: 'Kraków',
            lastSeenDate: new Date(Date.now() - 259200000).toISOString().slice(0, 10),
            reward: '300 zł',
            images: [],
            status: 'lost',
            createdAt: new Date(Date.now() - 259200000).toISOString(),
          }
        ];
        const withCoords = enrichPosts(mockLostPets);
        setLostPets(withCoords);
        localStorage.setItem('lostPets', JSON.stringify(withCoords));
      }
    }

    setGeoStatus('loading');
    if (!navigator.geolocation) {
      setGeoStatus('denied');
      setUserLocation(cityCoordinates['Warszawa']);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const nearest = getNearestCity(latitude, longitude);
        setUserLocation({ lat: latitude, lng: longitude });
        setUserCity(nearest);
        setGeoStatus('done');
      },
      () => {
        setGeoStatus('denied');
        setUserLocation(cityCoordinates['Warszawa']);
        setUserCity('Warszawa');
      },
      { timeout: 10000, enableHighAccuracy: false }
    );
  }, []);

  const filteredPets = lostPets.filter(pet => {
    if (pet.status !== 'lost') return false;

    const center = userLocation || cityCoordinates[userCity] || cityCoordinates['Warszawa'];
    const petLat = pet.lastSeenLat ?? cityCoordinates[pet.lastSeenCity]?.lat;
    const petLng = pet.lastSeenLng ?? cityCoordinates[pet.lastSeenCity]?.lng;
    if (petLat === undefined || petLng === undefined) return false;
    const distance = getDistance(center.lat, center.lng, petLat, petLng);
    if (distance > searchRadius) return false;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!pet.petName.toLowerCase().includes(query) &&
          !pet.description.toLowerCase().includes(query) &&
          !pet.breed?.toLowerCase().includes(query) &&
          !pet.lastSeenLocation.toLowerCase().includes(query)) {
        return false;
      }
    }
    return true;
  });

  const handleReportLost = () => {
    if (!currentUser || !formData.petName || !formData.description) return;

    const lostPet: LostPet = {
      id: Date.now().toString(),
      petId: formData.petId || undefined,
      ownerId: currentUser.id || '1',
      ownerName: `${currentUser.firstName || 'User'} ${currentUser.lastName || ''}`.trim(),
      ownerEmail: currentUser.email || 'user@example.com',
      ownerPhone: formData.phone || undefined,
      petName: formData.petName,
      species: formData.species,
      breed: formData.breed || undefined,
      color: formData.color,
      age: formData.age ? parseInt(formData.age) : undefined,
      gender: formData.gender,
      description: formData.description,
      lastSeenLocation: formData.lastSeenLocation,
      lastSeenCity: formData.lastSeenCity,
      lastSeenDate: formData.lastSeenDate,
      distinguishingFeatures: formData.distinguishingFeatures || undefined,
      reward: formData.reward || undefined,
      lastSeenLat: userLocation?.lat ?? cityCoordinates[formData.lastSeenCity]?.lat,
      lastSeenLng: userLocation?.lng ?? cityCoordinates[formData.lastSeenCity]?.lng,
      images: formData.image ? [formData.image] : [],
      status: 'lost',
      createdAt: new Date().toISOString(),
    };

    const updated = [lostPet, ...lostPets];
    setLostPets(updated);
    localStorage.setItem('lostPets', JSON.stringify(updated));

    setFormData({
      petId: '',
      petName: '',
      species: 'dog',
      breed: '',
      color: '',
      age: '',
      gender: 'male',
      description: '',
      lastSeenLocation: '',
      lastSeenCity: 'Warszawa',
      lastSeenDate: new Date().toISOString().slice(0, 10),
      distinguishingFeatures: '',
      reward: '',
      phone: '',
      image: '',
    });
    setStep(1);
    setFormError('');
    setShowReportModal(false);
  };

  const handleMarkAsFound = (petId: string) => {
    if (!confirm('Czy na pewno chcesz oznaczyć to zwierzę jako odnalezione?')) return;

    const updated = lostPets.map(p => p.id === petId ? {
      ...p,
      status: 'found' as const,
      foundAt: new Date().toISOString(),
    } : p);

    setLostPets(updated);
    localStorage.setItem('lostPets', JSON.stringify(updated));
    setSelectedPet(null);
  };

  const selectMyPet = (petId: string) => {
    const pet = myPets.find(p => p.id === petId);
    if (pet) {
      setFormData({
        ...formData,
        petId: pet.id,
        petName: pet.name,
        species: pet.species as any,
        breed: pet.breed || '',
        color: pet.color || '',
        gender: pet.gender as any || 'male',
      });
      setStep(2);
      setFormError('');
    }
  };

  const stepTitles = ['Wybierz zwierzę', 'Dane zwierzęcia', 'Opis i cechy', 'Miejsce i data', 'Kontakt i zdjęcie', 'Podsumowanie'];

  const stepValid = () => {
    if (step === 1) return true;
    if (step === 2) return formData.petName.trim().length > 0 && formData.color.trim().length > 0;
    if (step === 3) return formData.description.trim().length > 0;
    if (step === 4) return formData.lastSeenLocation.trim().length > 0;
    if (step === 5) return true;
    if (step === 6) return true;
    return true;
  };

  const nextStep = () => {
    if (!stepValid()) {
      const required: Record<number, string> = {
        1: 'Wybierz zwierzę z listy lub wybierz "Inne".',
        2: 'Podaj imię i kolor zwierzęcia.',
        3: 'Podaj opis zaginięcia.',
        4: 'Podaj miejsce, gdzie widziano zwierzę ostatnim razem.',
        5: 'Uzupełnij kontakt lub dodaj zdjęcie.',
        6: 'Sprawdź dane i opublikuj.',
      };
      setFormError(required[step] || 'Uzupełnij wymagane pole.');
      return;
    }
    setFormError('');
    setStep(s => Math.min(s + 1, 6));
  };

  const prevStep = () => {
    setFormError('');
    setStep(s => Math.max(s - 1, 1));
  };

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays === 0) return 'Dziś';
    if (diffDays === 1) return 'Wczoraj';
    if (diffDays < 7) return `${diffDays} dni temu`;
    return then.toLocaleDateString('pl-PL');
  };

  const getDaysSinceLost = (date: string) => {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    return Math.floor(diffMs / 86400000);
  };

  return (
    <div className="space-y-5">
      {/* Alert Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-amber-900 mb-1 flex items-center flex-wrap gap-2">
              Twoja lokalizacja: {userCity}
              {geoStatus === 'loading' && <span className="text-xs font-normal text-amber-600">(pobieranie...)</span>}
              {geoStatus === 'denied' && <span className="text-xs font-normal text-amber-600">(wymagana zgoda)</span>}
            </h3>
            <p className="text-sm text-amber-700 mb-3">
              Wyświetlamy zaginione zwierzęta w promieniu {searchRadius} km od Ciebie.
            </p>
            <div className="flex flex-wrap gap-2">
              {[5, 10, 25, 50, 100].map(r => (
                <button
                  key={r}
                  onClick={() => setSearchRadius(r)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    searchRadius === r
                      ? 'bg-amber-600 text-white border-amber-600'
                      : 'bg-white text-amber-700 border-amber-200 hover:border-amber-400'
                  }`}
                >
                  {r} km
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-4 text-center">
          <div className="text-2xl font-bold text-amber-600">{filteredPets.length}</div>
          <div className="text-xs text-gray-500 mt-1">W okolicy</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-4 text-center">
          <div className="text-2xl font-bold text-brand-dark">
            {lostPets.filter(p => p.status === 'found').length}
          </div>
          <div className="text-xs text-gray-500 mt-1">Odnalezione</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-4 text-center">
          <div className="text-2xl font-bold text-brand-dark">
            {lostPets.filter(p => p.ownerId === currentUser?.id && p.status === 'lost').length}
          </div>
          <div className="text-xs text-gray-500 mt-1">Moje zgłoszenia</div>
        </div>
      </div>

      {/* Search & City Filter */}
      <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-5 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Szukaj po imieniu, rasie, lokalizacji..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-11 pr-4 py-3 font-medium focus:outline-none focus:border-brand-dark focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Report Button */}
      <button
        onClick={() => {
          setFormData({
            petId: '',
            petName: '',
            species: 'dog' as any,
            breed: '',
            color: '',
            age: '',
            gender: 'male' as any,
            description: '',
            lastSeenLocation: '',
            lastSeenCity: userCity,
            lastSeenDate: new Date().toISOString().slice(0, 10),
            distinguishingFeatures: '',
            reward: '',
            phone: '',
            image: '',
          });
          setStep(1);
          setFormError('');
          setShowReportModal(true);
        }}
        className="w-full flex items-center justify-center gap-2 px-4 py-4 rounded-xl bg-amber-600 text-white font-semibold hover:bg-amber-700 transition-all"
      >
        <AlertTriangle className="w-6 h-6" />
        Zgłoś zaginięcie
      </button>

      {/* Lost Pets List */}
      {filteredPets.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 flex items-center justify-center">
            <CheckCircle className="w-7 h-7 text-brand-dark" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Brak zaginionych zwierząt</h3>
          <p className="text-gray-500">
            {searchQuery ? 'Spróbuj zmienić kryteria wyszukiwania' : 'W Twojej okolicy nie ma zgłoszeń zaginionych zwierząt'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPets.map((pet) => {
            const daysSince = getDaysSinceLost(pet.lastSeenDate);
            const isUrgent = daysSince === 0;
            const isOwner = currentUser && pet.ownerId === currentUser.id;

            return (
              <div
                key={pet.id}
                className={`bg-white rounded-2xl border shadow-sm hover:shadow-xl transition-all overflow-hidden cursor-pointer ${
                  isUrgent ? 'border-amber-300' : 'border-gray-200/70'
                }`}
                onClick={() => setSelectedPet(pet)}
              >
                <div className={`h-1.5 ${isUrgent ? 'bg-amber-500' : 'bg-gradient-to-r from-brand-dark to-brand'}`}></div>
                
                <div className="p-5">
                  <div className="flex gap-4">
                    {/* Image Placeholder */}
                    <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center flex-shrink-0">
                      <ImageIcon className="w-10 h-10 text-gray-300" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{pet.petName}</h3>
                          <p className="text-sm text-gray-500">
                            {pet.breed} • {pet.color} • {pet.gender === 'male' ? 'Samiec' : 'Samica'}
                          </p>
                        </div>
                        {isUrgent && (
                          <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold whitespace-nowrap">
                            Pilne!
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-gray-700 line-clamp-2 mb-3">{pet.description}</p>

                      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                        <div className="flex items-center gap-2 text-gray-600">
                          <MapPin className="w-4 h-4 text-brand-dark" />
                          <span className="truncate">{pet.lastSeenLocation}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Calendar className="w-4 h-4 text-brand-dark" />
                          <span>{getTimeAgo(pet.lastSeenDate)}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span className="text-xs text-gray-500">
                            {daysSince === 0 ? 'Zaginęło dziś' : `${daysSince} dni temu`}
                          </span>
                        </div>
                        {pet.reward && (
                          <span className="px-3 py-1 rounded-lg bg-brand-light text-brand-dark text-xs font-semibold">
                            Nagroda: {pet.reward}
                          </span>
                        )}
                        {isOwner && (
                          <span className="px-3 py-1 rounded-lg bg-brand-light text-brand-dark text-xs font-semibold">
                            Twoje zgłoszenie
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Report Lost Pet Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
              <h3 className="font-semibold text-gray-900">Zgłoś zaginięcie</h3>
              <button
                onClick={() => setShowReportModal(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Progress */}
              <div className="flex items-center gap-2 mb-2">
                {stepTitles.map((_, idx) => {
                  const n = idx + 1;
                  return (
                    <div key={n} className="flex-1">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          n === step ? 'bg-brand-dark' : n < step ? 'bg-emerald-400' : 'bg-gray-200'
                        }`}
                      />
                    </div>
                  );
                })}
              </div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-4">
                Krok {step} z 6 — {stepTitles[step - 1]}
              </p>

              {formError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm mb-4">
                  {formError}
                </div>
              )}

              {step === 1 && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">Wybierz zwierzę, które zaginęło:</p>
                  <div className="grid grid-cols-1 gap-3">
                    {myPets.length > 0 && myPets.map(pet => (
                      <button
                        key={pet.id}
                        onClick={() => selectMyPet(pet.id)}
                        className={`flex items-center gap-3 p-4 rounded-2xl border text-left transition-all ${
                          formData.petId === pet.id
                            ? 'bg-brand-dark/10 border-brand-dark text-brand-dark'
                            : 'bg-white border-gray-200 hover:border-brand-dark/40'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
                          <PawPrint className="w-5 h-5 text-brand-dark" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{pet.name}</p>
                          <p className="text-xs text-gray-500">{pet.breed || pet.species}</p>
                        </div>
                      </button>
                    ))}
                    <button
                      onClick={() => {
                        setFormData({
                          ...formData,
                          petId: '',
                          petName: '',
                          species: 'dog' as any,
                          breed: '',
                          color: '',
                          gender: 'male' as any,
                          age: '',
                        });
                        setStep(2);
                        setFormError('');
                      }}
                      className="flex items-center gap-3 p-4 rounded-2xl border text-left transition-all bg-white border-gray-200 hover:border-brand-dark/40"
                    >
                      <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
                        <PawPrint className="w-5 h-5 text-brand-dark" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Inne zwierzę</p>
                        <p className="text-xs text-gray-500">Wpisz dane ręcznie</p>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">Imię zwierzęcia</label>
                    <div className="relative">
                      <PawPrint className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={formData.petName}
                        onChange={(e) => setFormData({ ...formData, petName: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-3.5 py-2.5 text-sm focus:outline-none focus:border-brand-dark/50"
                        placeholder="np. Max"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">Gatunek</label>
                      <select
                        value={formData.species}
                        onChange={(e) => setFormData({ ...formData, species: e.target.value as any })}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-brand-dark/50"
                      >
                        <option value="dog">Pies</option>
                        <option value="cat">Kot</option>
                        <option value="other">Inne</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">Rasa</label>
                      <input
                        type="text"
                        value={formData.breed}
                        onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-brand-dark/50"
                        placeholder="np. Labrador"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">Kolor</label>
                      <input
                        type="text"
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-brand-dark/50"
                        placeholder="np. Złoty"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">Wiek (opcjonalnie)</label>
                      <input
                        type="number"
                        value={formData.age}
                        onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-brand-dark/50"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">Płeć</label>
                    <div className="flex gap-2">
                      {[
                        { value: 'male', label: 'Samiec' },
                        { value: 'female', label: 'Samica' },
                      ].map((g) => (
                        <button
                          key={g.value}
                          onClick={() => setFormData({ ...formData, gender: g.value as any })}
                          className={`flex-1 py-3 rounded-xl text-sm font-medium border transition-all ${
                            formData.gender === g.value
                              ? 'bg-brand-dark text-white border-brand-dark'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-brand-dark/40'
                          }`}
                        >
                          {g.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">Opis</label>
                    <div className="relative">
                      <FileText className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={4}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-3.5 py-2.5 text-sm focus:outline-none focus:border-brand-dark/50 resize-none"
                        placeholder="Opisz wygląd, charakter, szczególne cechy..."
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">Cechy szczególne</label>
                    <input
                      type="text"
                      value={formData.distinguishingFeatures}
                      onChange={(e) => setFormData({ ...formData, distinguishingFeatures: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-brand-dark/50"
                      placeholder="np. Biała plama na klatce piersiowej"
                    />
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">Data zaginięcia</label>
                      <input
                        type="date"
                        value={formData.lastSeenDate}
                        onChange={(e) => setFormData({ ...formData, lastSeenDate: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-brand-dark/50"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">Nagroda (opcjonalnie)</label>
                      <input
                        type="text"
                        value={formData.reward}
                        onChange={(e) => setFormData({ ...formData, reward: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-brand-dark/50"
                        placeholder="np. 500 zł"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">Miasto</label>
                    <select
                      value={formData.lastSeenCity}
                      onChange={(e) => setFormData({ ...formData, lastSeenCity: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-brand-dark/50"
                    >
                      {cities.map(city => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">Ostatnio widziane miejsce</label>
                    <div className="relative">
                      <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={formData.lastSeenLocation}
                        onChange={(e) => setFormData({ ...formData, lastSeenLocation: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-3.5 py-2.5 text-sm focus:outline-none focus:border-brand-dark/50"
                        placeholder="np. Park Łazienkowski"
                      />
                    </div>
                  </div>
                </div>
              )}

              {step === 5 && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">Telefon kontaktowy</label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-3.5 py-2.5 text-sm focus:outline-none focus:border-brand-dark/50"
                        placeholder="+48 123 456 789"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">Zdjęcie zwierzęcia (opcjonalnie)</label>
                    {!formData.image ? (
                      <label className="flex flex-col items-center justify-center gap-2 p-8 rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 text-gray-500 hover:border-brand-dark/50 hover:bg-brand-dark/5 transition-all cursor-pointer">
                        <ImageIcon className="w-8 h-8 text-gray-400" />
                        <span className="text-sm font-medium">Kliknij, aby dodać zdjęcie</span>
                        <span className="text-xs text-gray-400">PNG, JPG, WebP</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              setFormData({ ...formData, image: ev.target?.result as string });
                            };
                            reader.readAsDataURL(file);
                          }}
                        />
                      </label>
                    ) : (
                      <div className="relative rounded-2xl overflow-hidden border border-gray-200">
                        <img src={formData.image} alt="Podgląd" className="w-full h-48 object-cover" />
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, image: '' })}
                          className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/90 text-gray-500 hover:text-red-600 shadow-sm"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {step === 6 && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-2 text-sm">
                    <p><span className="text-gray-500">Imię:</span> <span className="font-medium text-gray-900">{formData.petName || '—'}</span></p>
                    <p><span className="text-gray-500">Gatunek:</span> <span className="font-medium text-gray-900">{formData.species === 'dog' ? 'Pies' : formData.species === 'cat' ? 'Kot' : 'Inne'}{formData.breed ? ` • ${formData.breed}` : ''}</span></p>
                    <p><span className="text-gray-500">Kolor:</span> <span className="font-medium text-gray-900">{formData.color || '—'}</span></p>
                    <p><span className="text-gray-500">Płeć:</span> <span className="font-medium text-gray-900">{formData.gender === 'male' ? 'Samiec' : 'Samica'}</span></p>
                    <p><span className="text-gray-500">Wiek:</span> <span className="font-medium text-gray-900">{formData.age ? `${formData.age} lat` : '—'}</span></p>
                    <p><span className="text-gray-500">Opis:</span> <span className="font-medium text-gray-900">{formData.description || '—'}</span></p>
                    <p><span className="text-gray-500">Ostatnio widziane:</span> <span className="font-medium text-gray-900">{formData.lastSeenLocation || '—'}{formData.lastSeenCity ? `, ${formData.lastSeenCity}` : ''}</span></p>
                    <p><span className="text-gray-500">Data:</span> <span className="font-medium text-gray-900">{formData.lastSeenDate}</span></p>
                    <p><span className="text-gray-500">Cechy:</span> <span className="font-medium text-gray-900">{formData.distinguishingFeatures || '—'}</span></p>
                    <p><span className="text-gray-500">Nagroda:</span> <span className="font-medium text-gray-900">{formData.reward || '—'}</span></p>
                    <p><span className="text-gray-500">Telefon:</span> <span className="font-medium text-gray-900">{formData.phone || '—'}</span></p>
                  </div>
                  {formData.image && (
                    <div className="rounded-2xl overflow-hidden border border-gray-200">
                      <img src={formData.image} alt="Zdjęcie" className="w-full h-48 object-cover" />
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between gap-3 mt-6 pt-4 border-t border-gray-100">
                <button
                  onClick={prevStep}
                  disabled={step === 1}
                  className="inline-flex items-center gap-1 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft className="w-4 h-4" /> Wstecz
                </button>

                {step < 6 ? (
                  <button
                    onClick={nextStep}
                    className="inline-flex items-center gap-1 px-5 py-2.5 rounded-xl text-sm font-medium bg-brand-dark text-white hover:bg-brand-dark transition-all"
                  >
                    Dalej <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleReportLost}
                    disabled={!formData.petName || !formData.description || !formData.color || !formData.lastSeenLocation}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-amber-600 text-white hover:bg-amber-700 transition-all disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" /> Zgłoś zaginięcie
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pet Details Modal */}
      {selectedPet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
              <h3 className="font-semibold text-gray-900">Szczegóły zaginięcia</h3>
              <button
                onClick={() => setSelectedPet(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="aspect-[16/9] bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
              <ImageIcon className="w-24 h-24 text-gray-300" />
            </div>

            <div className="p-6 space-y-5">
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-1">{selectedPet.petName}</h2>
                    <p className="text-gray-600">
                      {selectedPet.breed} • {selectedPet.color} • {selectedPet.gender === 'male' ? 'Samiec' : 'Samica'}
                    </p>
                  </div>
                  {selectedPet.reward && (
                    <div className="px-4 py-2 rounded-xl bg-brand-light text-brand-dark font-semibold">
                      Nagroda: {selectedPet.reward}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Opis</h4>
                <p className="text-gray-700 whitespace-pre-wrap">{selectedPet.description}</p>
              </div>

              {selectedPet.distinguishingFeatures && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Cechy szczególne</h4>
                  <p className="text-gray-700">{selectedPet.distinguishingFeatures}</p>
                </div>
              )}

              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Ostatnio widziane</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                    <MapPin className="w-5 h-5 text-brand-dark" />
                    <div>
                      <div className="font-medium text-gray-900">{selectedPet.lastSeenLocation}</div>
                      <div className="text-sm text-gray-500">{selectedPet.lastSeenCity}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                    <Calendar className="w-5 h-5 text-brand-dark" />
                    <div>
                      <div className="font-medium text-gray-900">{new Date(selectedPet.lastSeenDate).toLocaleDateString('pl-PL')}</div>
                      <div className="text-sm text-gray-500">{getTimeAgo(selectedPet.lastSeenDate)}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <h4 className="font-semibold text-gray-900 mb-3">Kontakt z właścicielem</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                    <Mail className="w-5 h-5 text-brand-dark" />
                    <a href={`mailto:${selectedPet.ownerEmail}`} className="text-gray-700 hover:text-brand-dark">
                      {selectedPet.ownerEmail}
                    </a>
                  </div>
                  {selectedPet.ownerPhone && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                      <Phone className="w-5 h-5 text-brand-dark" />
                      <a href={`tel:${selectedPet.ownerPhone}`} className="text-gray-700 hover:text-brand-dark">
                        {selectedPet.ownerPhone}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {currentUser && selectedPet.ownerId === currentUser.id && (
                <button
                  onClick={() => handleMarkAsFound(selectedPet.id)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-brand text-white font-semibold hover:bg-brand transition-all"
                >
                  <CheckCircle className="w-5 h-5" />
                  Oznacz jako odnalezione
                </button>
              )}

              <div className="text-sm text-gray-500 pt-4 border-t border-gray-100">
                Zgłoszono {getTimeAgo(selectedPet.createdAt)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
