'use client';

import { petApi, lostPetsApi } from '@/lib/api';
import ConfirmModal from '@/components/ui/ConfirmModal';
import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';

const LocationPicker = dynamic(() => import('@/components/LocationPicker'), { ssr: false });
import {
  AlertTriangle,
  MapPin,
  Navigation,
  Phone,
  Calendar,
  Search,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  PawPrint,
  FileText,
  Image as ImageIcon,
  CheckCircle,
  Clock,
  Trash2,
  Loader2,
  RefreshCcw,
  Eye,
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
  color?: string;
  age?: number;
  gender?: 'male' | 'female';
  description: string;
  lastSeenLocation: string;
  lastSeenCity?: string;
  lastSeenLat?: number;
  lastSeenLng?: number;
  lastSeenDate: string;
  distinguishingFeatures?: string;
  reward?: string;
  photo?: string;
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
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getNearestCity(lat: number, lng: number) {
  return Object.entries(cityCoordinates)
    .filter(([name]) => name !== 'Inne')
    .sort(
      ([a], [b]) =>
        getDistance(lat, lng, cityCoordinates[a].lat, cityCoordinates[a].lng) -
        getDistance(lat, lng, cityCoordinates[b].lat, cityCoordinates[b].lng)
    )[0][0];
}

// Zmniejsza zdjecie (max 900px, JPEG 0.8) — data URL miesci sie w kolumnie TEXT
const downscaleImage = (file: File, maxW = 900): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const mapRow = (r: any): LostPet => ({
  id: String(r.id),
  petId: r.pet_id ? String(r.pet_id) : undefined,
  ownerId: String(r.user_id),
  ownerName: `${r.owner_first_name || ''} ${r.owner_last_name || ''}`.trim() || 'Użytkownik',
  ownerEmail: r.owner_email,
  ownerPhone: r.owner_phone || undefined,
  petName: r.pet_name,
  species: r.species,
  breed: r.breed || undefined,
  color: r.color || undefined,
  age: r.age ?? undefined,
  gender: r.gender || undefined,
  description: r.description,
  lastSeenLocation: r.last_seen_location,
  lastSeenCity: r.last_seen_city || undefined,
  lastSeenLat: r.last_seen_lat != null ? Number(r.last_seen_lat) : undefined,
  lastSeenLng: r.last_seen_lng != null ? Number(r.last_seen_lng) : undefined,
  lastSeenDate: r.last_seen_date,
  distinguishingFeatures: r.distinguishing_features || undefined,
  reward: r.reward || undefined,
  photo: r.photo || undefined,
  status: r.status,
  createdAt: r.created_at,
  foundAt: r.found_at || undefined,
});

const EMPTY_FORM = {
  petId: '',
  petName: '',
  species: 'dog' as 'dog' | 'cat' | 'rabbit' | 'bird' | 'hamster' | 'other',
  breed: '',
  color: '',
  age: '',
  gender: 'male' as 'male' | 'female',
  description: '',
  lastSeenLocation: '',
  lastSeenCity: '',
  lastSeenLat: null as number | null,
  lastSeenLng: null as number | null,
  lastSeenDate: new Date().toISOString().slice(0, 10),
  distinguishingFeatures: '',
  reward: '',
  phone: '',
  image: '',
};

export default function LostPets() {
  const [lostPets, setLostPets] = useState<LostPet[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [myPets, setMyPets] = useState<Pet[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userCity, setUserCity] = useState('Warszawa');
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedPet, setSelectedPet] = useState<LostPet | null>(null);
  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null);
  const [tab, setTab] = useState<'lost' | 'found'>('lost');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchRadius, setSearchRadius] = useState(25);
  const [geoStatus, setGeoStatus] = useState<'idle' | 'loading' | 'done' | 'denied'>('idle');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [step, setStep] = useState(1);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: 'found' | 'delete'; pet: LostPet } | null>(null);
  const [actionError, setActionError] = useState('');

  const [formData, setFormData] = useState(EMPTY_FORM);

  // Serwerowe filtrowanie promienia — gdy znamy pozycje, API zwraca tylko okolice
  // (ten sam endpoint wykorzysta pozniej system powiadomien push).
  const loadLostPets = async (center?: { lat: number; lng: number } | null, radius?: number) => {
    try {
      const res = await lostPetsApi.getAll(
        center ? { lat: center.lat, lng: center.lng, radius: radius ?? 100 } : undefined
      );
      setLostPets((res.lostPets || []).map(mapRow));
      setLoadError('');
    } catch (e) {
      console.error('Lost pets load error:', e);
      setLoadError('Nie udało się pobrać zgłoszeń. Sprawdź połączenie.');
    } finally {
      setLoading(false);
    }
  };

  // ESC zamyka modale
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setViewingPhoto(null);
      setSelectedPet(null);
      setShowReportModal(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (showReportModal || selectedPet || viewingPhoto) {
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
  }, [showReportModal, selectedPet, viewingPhoto]);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try { setCurrentUser(JSON.parse(userData)); } catch {}
    }

    loadLostPets();

    petApi
      .getAll()
      .then((res) => {
        const list = (res.pets || res || []).map((p: any) => ({
          id: String(p.id),
          name: p.name,
          species: p.species,
          breed: p.breed,
          color: p.color,
          gender: p.gender,
        }));
        setMyPets(list);
      })
      .catch(() => setMyPets([]));

    setGeoStatus('loading');
    if (!navigator.geolocation) {
      setGeoStatus('denied');
      setUserLocation(cityCoordinates['Warszawa']);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        setUserCity(getNearestCity(latitude, longitude));
        setGeoStatus('done');
        loadLostPets({ lat: latitude, lng: longitude }, searchRadius);
      },
      () => {
        setGeoStatus('denied');
        setUserLocation(cityCoordinates['Warszawa']);
        setUserCity('Warszawa');
      },
      { timeout: 10000, enableHighAccuracy: false }
    );
  }, []);

  const petDistance = (pet: LostPet) => {
    const center = userLocation || cityCoordinates[userCity] || cityCoordinates['Warszawa'];
    const lat = pet.lastSeenLat ?? cityCoordinates[pet.lastSeenCity || '']?.lat;
    const lng = pet.lastSeenLng ?? cityCoordinates[pet.lastSeenCity || '']?.lng;
    if (lat === undefined || lng === undefined) return null;
    return getDistance(center.lat, center.lng, lat, lng);
  };

  const filteredPets = lostPets.filter((pet) => {
    if (pet.status !== tab) return false;
    const d = petDistance(pet);
    if (d !== null && d > searchRadius) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (
        !pet.petName.toLowerCase().includes(q) &&
        !pet.description.toLowerCase().includes(q) &&
        !(pet.breed || '').toLowerCase().includes(q) &&
        !pet.lastSeenLocation.toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    return true;
  }).sort((a, b) => {
    const da = petDistance(a) ?? Infinity;
    const db = petDistance(b) ?? Infinity;
    return da - db;
  });

  // Przeladowanie gdy zmieni sie promien — serwer odfiltruje dalsze zgloszenia
  useEffect(() => {
    if (userLocation) loadLostPets(userLocation, searchRadius);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchRadius]);

  const isOwner = (pet: LostPet) =>
    currentUser && String(currentUser.id ?? '') === pet.ownerId;

  // Geokodowanie wsteczne (OpenStreetMap Nominatim) — wypelnia miejsce/miasto z pinezki
  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=pl&zoom=16`
      );
      const j = await r.json();
      const a = j.address || {};
      const city = a.city || a.town || a.village || a.municipality || a.county || '';
      const place =
        (j.name && j.name !== city ? j.name : '') ||
        [a.road, a.neighbourhood || a.suburb].filter(Boolean).join(', ') ||
        (j.display_name || '').split(',')[0] ||
        '';
      return { city: String(city).slice(0, 100), place: String(place).slice(0, 255) };
    } catch {
      return null;
    }
  };

  const pickLocation = async (loc: { lat: number; lng: number }) => {
    setFormData((f) => ({ ...f, lastSeenLat: loc.lat, lastSeenLng: loc.lng }));
    const g = await reverseGeocode(loc.lat, loc.lng);
    if (g) {
      setFormData((f) => ({
        ...f,
        lastSeenLat: loc.lat,
        lastSeenLng: loc.lng,
        lastSeenCity: g.city || f.lastSeenCity,
        lastSeenLocation: g.place || f.lastSeenLocation,
      }));
    }
  };

  const handleReportLost = async () => {
    if (!currentUser || !formData.petName.trim() || !formData.description.trim()) return;
    setSubmitting(true);
    setFormError('');
    try {
      const ageNum = parseInt(formData.age);
      const res = await lostPetsApi.create({
        petId: formData.petId || undefined,
        petName: formData.petName.trim(),
        species: formData.species,
        breed: formData.breed || undefined,
        color: formData.color || undefined,
        age: Number.isInteger(ageNum) && ageNum >= 0 && ageNum <= 50 ? ageNum : undefined,
        gender: formData.gender,
        description: formData.description.trim(),
        distinguishingFeatures: formData.distinguishingFeatures || undefined,
        lastSeenLocation: formData.lastSeenLocation.trim(),
        lastSeenCity: formData.lastSeenCity || undefined,
        lastSeenLat: formData.lastSeenLat ?? undefined,
        lastSeenLng: formData.lastSeenLng ?? undefined,
        lastSeenDate: formData.lastSeenDate,
        reward: formData.reward || undefined,
        ownerPhone: formData.phone || undefined,
        photo: formData.image || undefined,
      });
      setLostPets((p) => [mapRow(res.lostPet), ...p]);
      setFormData(EMPTY_FORM);
      setStep(1);
      setShowReportModal(false);
      setTab('lost');
    } catch (e: any) {
      setFormError(e?.response?.data?.error?.message || 'Nie udało się opublikować zgłoszenia. Spróbuj ponownie.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkStatus = async (pet: LostPet, status: 'found' | 'lost') => {
    if (actionBusy) return;
    setActionBusy(true);
    setActionError('');
    try {
      if (status === 'found') await lostPetsApi.markFound(pet.id);
      else await lostPetsApi.markLost(pet.id);
      setLostPets((list) =>
        list.map((p) =>
          p.id === pet.id
            ? { ...p, status, foundAt: status === 'found' ? new Date().toISOString() : undefined }
            : p
        )
      );
      setSelectedPet(null);
    } catch (e: any) {
      setActionError(e?.response?.data?.error?.message || 'Nie udało się zaktualizować zgłoszenia.');
    } finally {
      setActionBusy(false);
      setConfirmAction(null);
    }
  };

  const handleDelete = async (pet: LostPet) => {
    setActionBusy(true);
    setActionError('');
    try {
      await lostPetsApi.delete(pet.id);
      setLostPets((list) => list.filter((p) => p.id !== pet.id));
      setSelectedPet(null);
    } catch (e: any) {
      setActionError(e?.response?.data?.error?.message || 'Nie udało się usunąć zgłoszenia.');
    } finally {
      setActionBusy(false);
      setConfirmAction(null);
    }
  };

  const selectMyPet = (petId: string) => {
    const pet = myPets.find((p) => p.id === petId);
    if (pet) {
      setFormData({
        ...formData,
        petId: pet.id,
        petName: pet.name,
        species: pet.species as any,
        breed: pet.breed || '',
        color: pet.color || '',
        gender: (pet.gender as any) || 'male',
      });
      setStep(2);
      setFormError('');
    }
  };

  const stepTitles = ['Wybierz zwierzę', 'Dane zwierzęcia', 'Opis i cechy', 'Miejsce i data', 'Kontakt i zdjęcie', 'Podsumowanie'];

  const stepValid = () => {
    if (step === 2) return formData.petName.trim().length > 0 && formData.color.trim().length > 0;
    if (step === 3) return formData.description.trim().length > 0;
    if (step === 4) return formData.lastSeenLocation.trim().length > 0 && formData.lastSeenLat != null;
    return true;
  };

  const nextStep = () => {
    if (!stepValid()) {
      const required: Record<number, string> = {
        2: 'Podaj imię i kolor zwierzęcia.',
        3: 'Podaj opis zaginięcia.',
        4: 'Podaj miejsce, gdzie widziano zwierzę ostatnim razem.',
      };
      setFormError(required[step] || 'Uzupełnij wymagane pole.');
      return;
    }
    if (step === 4 && formData.lastSeenLat == null) {
      setFormError('Zaznacz na mapie miejsce zaginięcia — dzięki temu powiadomimy osoby w okolicy.');
      return;
    }
    setFormError('');
    setStep((s) => Math.min(s + 1, 6));
  };

  const prevStep = () => {
    setFormError('');
    setStep((s) => Math.max(s - 1, 1));
  };

  const getTimeAgo = (date: string) => {
    const diffDays = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
    if (diffDays === 0) return 'Dziś';
    if (diffDays === 1) return 'Wczoraj';
    if (diffDays < 7) return `${diffDays} dni temu`;
    return new Date(date).toLocaleDateString('pl-PL');
  };

  const getDaysSinceLost = (date: string) =>
    Math.floor((Date.now() - new Date(date).getTime()) / 86400000);

  const speciesLabel = (s?: string) =>
    ({ dog: 'Pies', cat: 'Kot', rabbit: 'Królik', bird: 'Ptak', hamster: 'Chomik' } as Record<string, string>)[s || ''] || 'Inne';

  return (
    <div className="space-y-5">
      {/* Pasek lokalizacji + promień */}
      <div className="pv-card px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-9 h-9 rounded-full bg-brand-light flex items-center justify-center flex-shrink-0">
            <MapPin className="w-[18px] h-[18px] text-brand-dark" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {geoStatus === 'loading' ? 'Ustalam lokalizację…' : userCity}
            </p>
            <p className="text-xs text-gray-500">
              {geoStatus === 'denied'
                ? 'Brak zgody na lokalizację — pokazuję okolice Warszawy'
                : `Zaginione w promieniu ${searchRadius} km`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 ml-auto bg-gray-100 rounded-full p-1">
          {[5, 10, 25, 50, 100].map((r) => (
            <button
              key={r}
              onClick={() => setSearchRadius(r)}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                searchRadius === r
                  ? 'bg-white text-brand-dark shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs: Zaginione / Odnalezione */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab('lost')}
          className={`flex-1 px-4 py-3 rounded-xl font-semibold text-sm transition-all border ${
            tab === 'lost'
              ? 'bg-amber-600 text-white border-amber-600'
              : 'bg-white text-gray-600 border-gray-200 hover:border-amber-400'
          }`}
        >
          Zaginione ({lostPets.filter((p) => p.status === 'lost').length})
        </button>
        <button
          onClick={() => setTab('found')}
          className={`flex-1 px-4 py-3 rounded-xl font-semibold text-sm transition-all border ${
            tab === 'found'
              ? 'bg-emerald-600 text-white border-emerald-600'
              : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-400'
          }`}
        >
          Odnalezione ({lostPets.filter((p) => p.status === 'found').length})
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="pv-card p-4 text-center">
          <div className="text-2xl font-bold text-amber-600">{filteredPets.length}</div>
          <div className="text-xs text-gray-500 mt-1">W okolicy</div>
        </div>
        <div className="pv-card p-4 text-center">
          <div className="text-2xl font-bold text-brand-dark">
            {lostPets.filter((p) => p.status === 'found').length}
          </div>
          <div className="text-xs text-gray-500 mt-1">Odnalezione</div>
        </div>
        <div className="pv-card p-4 text-center">
          <div className="text-2xl font-bold text-brand-dark">
            {lostPets.filter((p) => isOwner(p) && p.status === 'lost').length}
          </div>
          <div className="text-xs text-gray-500 mt-1">Moje zgłoszenia</div>
        </div>
      </div>

      {/* Search */}
      <div className="pv-card p-5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Szukaj po imieniu, rasie, lokalizacji..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-2xl shadow-sm pl-11 pr-4 py-3 font-medium focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all"
          />
        </div>
      </div>

      {/* Report Button */}
      <button
        onClick={() => {
          // Punkt startowy pinezki = aktualny GPS uzytkownika (mozna poprawic na mapie)
          setFormData({
            ...EMPTY_FORM,
            lastSeenCity: userLocation ? '' : userCity,
            lastSeenLat: userLocation?.lat ?? null,
            lastSeenLng: userLocation?.lng ?? null,
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

      {/* List */}
      {loading ? (
        <div className="pv-card p-12 text-center">
          <Loader2 className="w-8 h-8 mx-auto text-brand animate-spin" />
          <p className="text-sm text-gray-500 mt-3">Ładowanie zgłoszeń...</p>
        </div>
      ) : loadError ? (
        <div className="pv-card p-8 text-center">
          <AlertTriangle className="w-8 h-8 mx-auto text-amber-500 mb-3" />
          <p className="text-gray-700 mb-4">{loadError}</p>
          <button
            onClick={() => {
              setLoading(true);
              loadLostPets();
            }}
            className="pv-btn-primary px-5 py-2.5 text-sm inline-flex items-center gap-2"
          >
            <RefreshCcw className="w-4 h-4" /> Spróbuj ponownie
          </button>
        </div>
      ) : filteredPets.length === 0 ? (
        <div className="pv-card p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 flex items-center justify-center">
            <CheckCircle className="w-7 h-7 text-brand-dark" />
          </div>
          <h3 className="pv-section-title mb-2">
            {tab === 'lost' ? 'Brak zaginionych zwierząt' : 'Brak odnalezionych zwierząt'}
          </h3>
          <p className="text-gray-500">
            {searchQuery
              ? 'Spróbuj zmienić kryteria wyszukiwania'
              : tab === 'lost'
                ? 'W Twojej okolicy nie ma aktywnych zgłoszeń'
                : 'Brak oznaczonych jako odnalezione'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredPets.map((pet) => {
            const daysSince = getDaysSinceLost(pet.lastSeenDate);
            const isUrgent = pet.status === 'lost' && daysSince === 0;
            const dist = petDistance(pet);
            const owner = isOwner(pet);

            return (
              <div
                key={pet.id}
                className="group bg-white rounded-2xl border border-gray-200/70 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all overflow-hidden cursor-pointer"
                onClick={() => setSelectedPet(pet)}
              >
                {/* Zdjęcie na całą szerokość z nakładkami */}
                <div className="relative aspect-[16/10] bg-gradient-to-br from-gray-100 to-gray-200">
                  {pet.photo ? (
                    <img src={pet.photo} alt={pet.petName} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <PawPrint className="w-16 h-16 text-gray-300" />
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/50 to-transparent" />
                  <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                    {isUrgent && (
                      <span className="px-2.5 py-1 rounded-full bg-amber-500 text-white text-xs font-bold shadow-lg animate-pulse">
                        🚨 Pilne!
                      </span>
                    )}
                    {pet.status === 'found' && (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500 text-white text-xs font-bold shadow-lg">
                        ✓ Odnalezione
                      </span>
                    )}
                    {pet.status === 'lost' && !isUrgent && (
                      <span className="px-2.5 py-1 rounded-full bg-red-500/90 text-white text-xs font-bold shadow-lg">
                        Zaginione
                      </span>
                    )}
                  </div>
                  {dist !== null && (
                    <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-white/90 backdrop-blur text-gray-800 text-xs font-bold shadow-lg">
                      {dist < 1 ? `${Math.round(dist * 1000)} m` : `${dist.toFixed(0)} km`} stąd
                    </span>
                  )}
                  <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-xl font-bold text-white drop-shadow truncate">{pet.petName}</h3>
                      <p className="text-xs text-white/90 drop-shadow">
                        {speciesLabel(pet.species)}{pet.breed ? ` • ${pet.breed}` : ''}{pet.color ? ` • ${pet.color}` : ''}
                      </p>
                    </div>
                    {pet.reward && (
                      <span className="px-2.5 py-1 rounded-lg bg-brand-light/95 text-brand-dark text-xs font-bold shadow-lg whitespace-nowrap">
                        💰 {pet.reward}
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-1.5">
                    <MapPin className="w-4 h-4 text-brand-dark flex-shrink-0" />
                    <span className="truncate font-medium">{pet.lastSeenLocation}{pet.lastSeenCity ? `, ${pet.lastSeenCity}` : ''}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>
                      {pet.status === 'lost'
                        ? daysSince === 0 ? 'Zaginęło dziś' : `Zaginęło ${daysSince} dni temu`
                        : pet.foundAt ? `Odnaleziono ${getTimeAgo(pet.foundAt)}` : 'Odnalezione'}
                    </span>
                    {owner && (
                      <span className="ml-auto px-2 py-0.5 rounded-full bg-brand-light text-brand-dark font-semibold">
                        Twoje zgłoszenie
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Report Lost Pet Modal */}
      {showReportModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm animate-fade-in p-4"
          onClick={() => !submitting && setShowReportModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
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
                    {myPets.length > 0 &&
                      myPets.map((pet) => (
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
                            <p className="text-xs text-gray-500">{pet.breed || speciesLabel(pet.species)}</p>
                          </div>
                        </button>
                      ))}
                    <button
                      onClick={() => {
                        setFormData({ ...formData, petId: '', petName: '', species: 'dog', breed: '', color: '', gender: 'male', age: '' });
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
                        className="w-full bg-white border border-gray-200 rounded-2xl shadow-sm pl-10 pr-3.5 py-2.5 text-sm focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10"
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
                        className="w-full bg-white border border-gray-200 rounded-2xl shadow-sm px-3.5 py-2.5 text-sm focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10"
                      >
                        <option value="dog">Pies</option>
                        <option value="cat">Kot</option>
                        <option value="rabbit">Królik</option>
                        <option value="bird">Ptak</option>
                        <option value="hamster">Chomik</option>
                        <option value="other">Inne</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">Rasa</label>
                      <input
                        type="text"
                        value={formData.breed}
                        onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
                        className="w-full bg-white border border-gray-200 rounded-2xl shadow-sm px-3.5 py-2.5 text-sm focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10"
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
                        className="w-full bg-white border border-gray-200 rounded-2xl shadow-sm px-3.5 py-2.5 text-sm focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10"
                        placeholder="np. Złoty"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">Wiek (opcjonalnie)</label>
                      <input
                        type="number"
                        value={formData.age}
                        onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                        className="w-full bg-white border border-gray-200 rounded-2xl shadow-sm px-3.5 py-2.5 text-sm focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10"
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
                        className="w-full bg-white border border-gray-200 rounded-2xl shadow-sm pl-10 pr-3.5 py-2.5 text-sm focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 resize-none"
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
                      className="w-full bg-white border border-gray-200 rounded-2xl shadow-sm px-3.5 py-2.5 text-sm focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10"
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
                        className="w-full bg-white border border-gray-200 rounded-2xl shadow-sm px-3.5 py-2.5 text-sm focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">Nagroda (opcjonalnie)</label>
                      <input
                        type="text"
                        value={formData.reward}
                        onChange={(e) => setFormData({ ...formData, reward: e.target.value })}
                        className="w-full bg-white border border-gray-200 rounded-2xl shadow-sm px-3.5 py-2.5 text-sm focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10"
                        placeholder="np. 500 zł"
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Miejsce zaginięcia na mapie</label>
                      {userLocation && (
                        <button
                          type="button"
                          onClick={() => pickLocation(userLocation)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-light text-brand-dark text-xs font-semibold hover:bg-brand/20 transition-all"
                        >
                          <Navigation className="w-3.5 h-3.5" /> Moja lokalizacja
                        </button>
                      )}
                    </div>
                    <LocationPicker
                      value={formData.lastSeenLat != null ? { lat: formData.lastSeenLat, lng: formData.lastSeenLng! } : null}
                      initialCenter={userLocation}
                      onChange={pickLocation}
                      className="h-56"
                    />
                    <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-brand-dark flex-shrink-0" />
                      Kliknij na mapie lub przeciągnij pinezkę — adres uzupełni się sam. Alert trafi do użytkowników w promieniu 30 km od tego punktu.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">Miejscowość</label>
                      <input
                        type="text"
                        value={formData.lastSeenCity}
                        onChange={(e) => setFormData({ ...formData, lastSeenCity: e.target.value })}
                        className="w-full bg-white border border-gray-200 rounded-2xl shadow-sm px-3.5 py-2.5 text-sm focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10"
                        placeholder="np. Warszawa"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">Dokładne miejsce</label>
                      <input
                        type="text"
                        value={formData.lastSeenLocation}
                        onChange={(e) => setFormData({ ...formData, lastSeenLocation: e.target.value })}
                        className="w-full bg-white border border-gray-200 rounded-2xl shadow-sm px-3.5 py-2.5 text-sm focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10"
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
                        className="w-full bg-white border border-gray-200 rounded-2xl shadow-sm pl-10 pr-3.5 py-2.5 text-sm focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10"
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
                        <span className="text-xs text-gray-400">PNG, JPG, WebP — zostanie zmniejszone</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            try {
                              setFormData({ ...formData, image: await downscaleImage(file) });
                            } catch {
                              setFormError('Nie udało się wczytać zdjęcia.');
                            }
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
                    <p><span className="text-gray-500">Gatunek:</span> <span className="font-medium text-gray-900">{speciesLabel(formData.species)}{formData.breed ? ` • ${formData.breed}` : ''}</span></p>
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
                  <button onClick={nextStep} className="inline-flex items-center gap-1 px-5 py-2.5 rounded-xl text-sm font-medium pv-btn-primary">
                    Dalej <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleReportLost}
                    disabled={submitting || !formData.petName || !formData.description || !formData.color || !formData.lastSeenLocation || formData.lastSeenLat == null}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-amber-600 text-white hover:bg-amber-700 transition-all disabled:opacity-50"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    {submitting ? 'Publikuję...' : 'Zgłoś zaginięcie'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pet Details Modal */}
      {selectedPet && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm animate-fade-in p-4"
          onClick={() => setSelectedPet(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
              <h3 className="font-semibold text-gray-900">Szczegóły zgłoszenia</h3>
              <button
                onClick={() => setSelectedPet(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedPet.photo ? (
              <button onClick={() => setViewingPhoto(selectedPet.photo!)} className="block w-full aspect-[16/9] overflow-hidden relative group">
                <img src={selectedPet.photo} alt={selectedPet.petName} className="w-full h-full object-cover" />
                <span className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Eye className="w-8 h-8 text-white" />
                </span>
              </button>
            ) : (
              <div className="aspect-[16/9] bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                <PawPrint className="w-24 h-24 text-gray-300" />
              </div>
            )}

            <div className="p-6 space-y-5">
              <div className="flex items-start justify-between mb-1 gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-2xl font-bold text-gray-900">{selectedPet.petName}</h2>
                    {selectedPet.status === 'found' && (
                      <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">Odnalezione</span>
                    )}
                  </div>
                  <p className="text-gray-600">
                    {speciesLabel(selectedPet.species)}
                    {selectedPet.breed ? ` • ${selectedPet.breed}` : ''}
                    {selectedPet.color ? ` • ${selectedPet.color}` : ''}
                    {selectedPet.gender ? ` • ${selectedPet.gender === 'male' ? 'Samiec' : 'Samica'}` : ''}
                    {selectedPet.age ? ` • ${selectedPet.age} lat` : ''}
                  </p>
                </div>
                {selectedPet.reward && (
                  <div className="px-4 py-2 rounded-xl bg-brand-light text-brand-dark font-semibold whitespace-nowrap">
                    Nagroda: {selectedPet.reward}
                  </div>
                )}
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
                      <div className="text-sm text-gray-500">{selectedPet.lastSeenCity || '—'}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                    <Calendar className="w-5 h-5 text-brand-dark" />
                    <div>
                      <div className="font-medium text-gray-900">{new Date(selectedPet.lastSeenDate).toLocaleDateString('pl-PL')}</div>
                      <div className="text-sm text-gray-500">{getTimeAgo(selectedPet.lastSeenDate)}</div>
                    </div>
                  </div>
                  {selectedPet.lastSeenLat != null && selectedPet.lastSeenLng != null && (
                    <LocationPicker
                      value={{ lat: selectedPet.lastSeenLat, lng: selectedPet.lastSeenLng }}
                      onChange={() => {}}
                      readOnly
                      className="h-44"
                    />
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <h4 className="font-semibold text-gray-900 mb-3">Kontakt z właścicielem ({selectedPet.ownerName})</h4>
                <div className="space-y-2">
                  {selectedPet.ownerPhone ? (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                      <Phone className="w-5 h-5 text-brand-dark" />
                      <a href={`tel:${selectedPet.ownerPhone}`} className="text-gray-700 hover:text-brand-dark">
                        {selectedPet.ownerPhone}
                      </a>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">
                      Właściciel nie podał telefonu — skontaktuj się przez wiadomości w aplikacji.
                    </p>
                  )}
                </div>
              </div>

              {actionError && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{actionError}</span>
                </div>
              )}

              {isOwner(selectedPet) && (
                <div className="flex gap-3 pt-2">
                  {selectedPet.status === 'lost' ? (
                    <button
                      onClick={() => setConfirmAction({ type: 'found', pet: selectedPet })}
                      disabled={actionBusy}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-all disabled:opacity-50"
                    >
                      <CheckCircle className="w-5 h-5" />
                      Oznacz jako odnalezione
                    </button>
                  ) : (
                    <button
                      onClick={() => handleMarkStatus(selectedPet, 'lost')}
                      disabled={actionBusy}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-600 text-white font-semibold hover:bg-amber-700 transition-all disabled:opacity-50"
                    >
                      <AlertTriangle className="w-5 h-5" />
                      Przywróć jako zaginione
                    </button>
                  )}
                  <button
                    onClick={() => setConfirmAction({ type: 'delete', pet: selectedPet })}
                    disabled={actionBusy}
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-50 text-red-600 font-semibold hover:bg-red-100 transition-all disabled:opacity-50"
                  >
                    <Trash2 className="w-5 h-5" />
                    Usuń
                  </button>
                </div>
              )}

              <div className="text-sm text-gray-500 pt-4 border-t border-gray-100">
                Zgłoszono {getTimeAgo(selectedPet.createdAt)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Podgląd zdjęcia */}
      {viewingPhoto && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/80 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setViewingPhoto(null)}
        >
          <div className="relative max-w-3xl max-h-[85vh]">
            <button
              onClick={() => setViewingPhoto(null)}
              className="absolute -top-2 -right-2 p-2 rounded-full bg-white text-gray-700 shadow-lg hover:bg-gray-100 z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img src={viewingPhoto} alt="Zdjęcie zwierzęcia" className="max-w-full max-h-[85vh] rounded-2xl object-contain" />
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!confirmAction}
        title={confirmAction?.type === 'found' ? 'Oznaczyć jako odnalezione?' : 'Usunąć zgłoszenie?'}
        description={
          confirmAction?.type === 'found'
            ? `Zwierzę „${confirmAction?.pet.petName || ''}" zniknie z listy zaginionych i trafi do odnalezionych.`
            : `Zgłoszenie „${confirmAction?.pet.petName || ''}" zostanie trwale usunięte.`
        }
        confirmLabel={confirmAction?.type === 'found' ? 'Tak, odnalezione' : 'Usuń'}
        loading={actionBusy}
        onConfirm={() => {
          if (!confirmAction) return;
          if (confirmAction.type === 'found') handleMarkStatus(confirmAction.pet, 'found');
          else handleDelete(confirmAction.pet);
        }}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}
