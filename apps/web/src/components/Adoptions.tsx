'use client';

import { useState, useEffect } from 'react';
import { adoptionsApi } from '@/lib/api';
import ConfirmModal from '@/components/ui/ConfirmModal';
import {
  Plus,
  Heart,
  Phone,
  MapPin,
  Search,
  Filter,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  PawPrint,
  FileText,
  Image as ImageIcon,
  Calendar,
  Trash2,
  Loader2,
  RefreshCcw,
  Eye,
  AlertTriangle,
  CheckCircle,
  Bookmark,
} from 'lucide-react';

interface AdoptionPost {
  id: string;
  authorId: string;
  authorName: string;
  authorPhone?: string;
  petName: string;
  species: 'dog' | 'cat' | 'rabbit' | 'bird' | 'hamster' | 'other';
  breed?: string;
  age: number;
  ageUnit: 'months' | 'years';
  gender?: 'male' | 'female';
  size?: 'small' | 'medium' | 'large';
  description: string;
  location?: string;
  city?: string;
  lat?: number;
  lng?: number;
  vaccinated: boolean;
  sterilized: boolean;
  photo?: string;
  likeCount: number;
  liked: boolean;
  createdAt: string;
  status: 'available' | 'reserved' | 'adopted';
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
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const breeds: Record<string, string[]> = {
  dog: ['Labrador', 'Owczarek niemiecki', 'Golden retriever', 'Buldog francuski', 'Beagle', 'Kundelek', 'Inne'],
  cat: ['Perski', 'Brytyjski', 'Maine Coon', 'Syberyjski', 'Dachowiec', 'Inne'],
  other: ['Inne'],
};

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

const mapRow = (r: any): AdoptionPost => ({
  id: String(r.id),
  authorId: String(r.user_id),
  authorName: `${r.author_first_name || ''} ${r.author_last_name || ''}`.trim() || 'Użytkownik',
  authorPhone: r.owner_phone || undefined,
  petName: r.pet_name,
  species: r.species,
  breed: r.breed || undefined,
  age: r.age_value ?? 0,
  ageUnit: r.age_unit === 'months' ? 'months' : 'years',
  gender: r.gender || undefined,
  size: r.size || undefined,
  description: r.description,
  location: r.location || undefined,
  city: r.city || undefined,
  lat: r.lat != null ? Number(r.lat) : undefined,
  lng: r.lng != null ? Number(r.lng) : undefined,
  vaccinated: !!r.vaccinated,
  sterilized: !!r.sterilized,
  photo: r.photo || undefined,
  likeCount: r.like_count ?? 0,
  liked: !!r.liked,
  createdAt: r.created_at,
  status: r.status,
});

const EMPTY_FORM = {
  petName: '',
  species: 'dog' as 'dog' | 'cat' | 'rabbit' | 'bird' | 'hamster' | 'other',
  breed: '',
  age: '',
  ageUnit: 'months' as 'months' | 'years',
  gender: 'male' as 'male' | 'female',
  size: 'medium' as 'small' | 'medium' | 'large',
  description: '',
  location: '',
  city: 'Warszawa',
  vaccinated: false,
  sterilized: false,
  phone: '',
  image: '',
};

const statusConfig = {
  available: { label: 'Dostępne', chip: 'bg-brand-light text-brand-dark', accent: 'from-brand-dark to-brand' },
  reserved: { label: 'Zarezerwowane', chip: 'bg-amber-100 text-amber-700', accent: 'bg-amber-500' },
  adopted: { label: 'Adoptowane', chip: 'bg-emerald-100 text-emerald-700', accent: 'bg-emerald-500' },
} as const;

export default function Adoptions() {
  const [posts, setPosts] = useState<AdoptionPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedPost, setSelectedPost] = useState<AdoptionPost | null>(null);
  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null);
  const [statusTab, setStatusTab] = useState<'available' | 'reserved' | 'adopted'>('available');
  const [submitting, setSubmitting] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [geoStatus, setGeoStatus] = useState<'idle' | 'loading' | 'done' | 'denied'>('idle');
  const [searchRadius, setSearchRadius] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AdoptionPost | null>(null);
  const [actionError, setActionError] = useState('');

  // ESC zamyka modale
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setViewingPhoto(null);
      setSelectedPost(null);
      setShowAddModal(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const [filters, setFilters] = useState({
    species: 'all' as 'all' | 'dog' | 'cat' | 'other',
    city: 'all',
    size: 'all' as 'all' | 'small' | 'medium' | 'large',
    gender: 'all' as 'all' | 'male' | 'female',
    vaccinated: false,
    sterilized: false,
    searchQuery: '',
  });

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [step, setStep] = useState(1);
  const [formError, setFormError] = useState('');

  const stepTitles = ['Gatunek', 'Imię i rasa', 'Wiek i zdrowie', 'Lokalizacja', 'Opis', 'Zdjęcie i podsumowanie'];

  const loadPosts = async () => {
    try {
      const res = await adoptionsApi.getAll();
      setPosts((res.posts || []).map(mapRow));
      setLoadError('');
    } catch (e) {
      console.error('Adoptions load error:', e);
      setLoadError('Nie udało się pobrać ogłoszeń. Sprawdź połączenie.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (showAddModal || selectedPost || viewingPhoto) {
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
  }, [showAddModal, selectedPost, viewingPhoto]);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try { setCurrentUser(JSON.parse(userData)); } catch {}
    }
    loadPosts();

    // Geolokalizacja — filtr promienia jak w zakladce Zaginione
    setGeoStatus('loading');
    if (!navigator.geolocation) {
      setGeoStatus('denied');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoStatus('done');
      },
      () => setGeoStatus('denied'),
      { timeout: 10000, enableHighAccuracy: false }
    );
  }, []);

  const stepValid = () => {
    if (step === 2) return formData.petName.trim().length > 0;
    if (step === 3) return formData.age.trim().length > 0 && parseInt(formData.age) >= 0;
    if (step === 5) return formData.description.trim().length > 0;
    return true;
  };

  const nextStep = () => {
    if (!stepValid()) {
      const required: Record<number, string> = {
        2: 'Podaj imię zwierzęcia.',
        3: 'Podaj wiek zwierzęcia.',
        5: 'Dodaj krótki opis, aby opublikować ogłoszenie.',
      };
      setFormError(required[step] || 'Uzupełnij wymagane pole.');
      return;
    }
    setFormError('');
    setStep((s) => Math.min(s + 1, 6));
  };

  const prevStep = () => {
    setFormError('');
    setStep((s) => Math.max(s - 1, 1));
  };

  const postDistance = (post: AdoptionPost): number | null => {
    if (!userLocation) return null;
    const lat = post.lat ?? cityCoordinates[post.city || '']?.lat;
    const lng = post.lng ?? cityCoordinates[post.city || '']?.lng;
    if (lat == null || lng == null) return null;
    return getDistance(userLocation.lat, userLocation.lng, lat, lng);
  };

  const filteredPosts = posts.filter((post) => {
    if (post.status !== statusTab) return false;
    if (searchRadius !== null) {
      const d = postDistance(post);
      if (d !== null && d > searchRadius) return false;
    }
    if (filters.species !== 'all' && post.species !== filters.species) return false;
    if (filters.city !== 'all' && post.city !== filters.city) return false;
    if (filters.size !== 'all' && post.size !== filters.size) return false;
    if (filters.gender !== 'all' && post.gender !== filters.gender) return false;
    if (filters.vaccinated && !post.vaccinated) return false;
    if (filters.sterilized && !post.sterilized) return false;
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      if (
        !post.petName.toLowerCase().includes(query) &&
        !post.description.toLowerCase().includes(query) &&
        !(post.breed || '').toLowerCase().includes(query)
      ) {
        return false;
      }
    }
    return true;
  });

  const isOwner = (post: AdoptionPost) => currentUser && String(currentUser.id ?? '') === post.authorId;

  const handleAddPost = async () => {
    if (!currentUser || !formData.petName.trim() || !formData.description.trim() || !formData.age) return;
    setSubmitting(true);
    setFormError('');
    try {
      await adoptionsApi.create({
        petName: formData.petName.trim(),
        species: formData.species,
        breed: formData.breed || undefined,
        age: formData.age,
        ageUnit: formData.ageUnit,
        gender: formData.gender,
        size: formData.size,
        description: formData.description.trim(),
        location: formData.location || undefined,
        city: formData.city,
        // Punkty na mapie: GPS użytkownika gdy ogłoszenie z jego miasta,
        // inaczej środek wybranego miasta (przybliżenie — zawsze lepsze niż brak punktu)
        ...(() => {
          const userCity = Object.entries(cityCoordinates).find(([city, c]) => {
            if (city === 'Inne' || !userLocation) return false;
            return getDistance(userLocation.lat, userLocation.lng, c.lat, c.lng) < 30;
          });
          if (userLocation && userCity && userCity[0] === formData.city) {
            return { lat: userLocation.lat, lng: userLocation.lng };
          }
          const cc = cityCoordinates[formData.city];
          return cc ? { lat: cc.lat, lng: cc.lng } : {};
        })(),
        vaccinated: formData.vaccinated,
        sterilized: formData.sterilized,
        phone: formData.phone || undefined,
        photo: formData.image || undefined,
      });
      setFormData(EMPTY_FORM);
      setStep(1);
      setShowAddModal(false);
      setStatusTab('available');
      await loadPosts();
    } catch (e: any) {
      setFormError(e?.response?.data?.error?.message || 'Nie udało się opublikować ogłoszenia. Spróbuj ponownie.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = async (post: AdoptionPost) => {
    if (!currentUser) return;
    // Optymistycznie
    setPosts((list) =>
      list.map((p) =>
        p.id === post.id
          ? { ...p, liked: !p.liked, likeCount: p.likeCount + (p.liked ? -1 : 1) }
          : p
      )
    );
    try {
      const res = await adoptionsApi.toggleLike(post.id);
      setPosts((list) =>
        list.map((p) => (p.id === post.id ? { ...p, liked: res.liked, likeCount: res.likeCount } : p))
      );
      if (selectedPost?.id === post.id) {
        setSelectedPost({ ...selectedPost, liked: res.liked, likeCount: res.likeCount });
      }
    } catch {
      // rollback
      setPosts((list) =>
        list.map((p) =>
          p.id === post.id
            ? { ...p, liked: post.liked, likeCount: post.likeCount }
            : p
        )
      );
    }
  };

  const handleStatus = async (post: AdoptionPost, status: 'available' | 'reserved' | 'adopted') => {
    if (actionBusy) return;
    setActionBusy(true);
    try {
      await adoptionsApi.updateStatus(post.id, status);
      setPosts((list) => list.map((p) => (p.id === post.id ? { ...p, status } : p)));
      setSelectedPost(null);
      setStatusTab(status);
    } catch (e: any) {
      setActionError(e?.response?.data?.error?.message || 'Nie udało się zmienić statusu.');
    } finally {
      setActionBusy(false);
    }
  };

  const handleDelete = async (post: AdoptionPost) => {
    setActionBusy(true);
    try {
      await adoptionsApi.delete(post.id);
      setPosts((list) => list.filter((p) => p.id !== post.id));
      setConfirmDelete(null);
      setSelectedPost(null);
    } catch (e: any) {
      setActionError(e?.response?.data?.error?.message || 'Nie udało się usunąć ogłoszenia.');
      setConfirmDelete(null);
    } finally {
      setActionBusy(false);
    }
  };

  const getTimeAgo = (date: string) => {
    const diffDays = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
    if (diffDays === 0) return 'Dziś';
    if (diffDays === 1) return 'Wczoraj';
    if (diffDays < 7) return `${diffDays} dni temu`;
    return new Date(date).toLocaleDateString('pl-PL');
  };

  const activeFiltersCount = Object.entries(filters).filter(([key, value]) => {
    if (key === 'searchQuery') return false;
    if (typeof value === 'boolean') return value;
    return value !== 'all';
  }).length;

  const speciesLabel = (s?: string) =>
    ({ dog: 'Pies', cat: 'Kot', rabbit: 'Królik', bird: 'Ptak', hamster: 'Chomik' } as Record<string, string>)[s || ''] || 'Inne';
  const sizeLabel = (s?: string) => (s === 'small' ? 'Mały' : s === 'medium' ? 'Średni' : 'Duży');

  return (
    <div className="space-y-5">
      {/* Tabs statusów */}
      <div className="flex gap-2">
        {(Object.keys(statusConfig) as (keyof typeof statusConfig)[]).map((s) => (
          <button
            key={s}
            onClick={() => setStatusTab(s)}
            className={`flex-1 px-3 py-3 rounded-xl font-semibold text-sm transition-all border ${
              statusTab === s
                ? s === 'available'
                  ? 'bg-brand-dark text-white border-brand-dark'
                  : s === 'reserved'
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-brand-dark/40'
            }`}
          >
            {statusConfig[s].label} ({posts.filter((p) => p.status === s).length})
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="pv-card p-4 text-center">
          <div className="text-2xl font-bold text-brand-dark">
            {posts.filter((p) => p.status === 'available').length}
          </div>
          <div className="text-xs text-gray-500 mt-1">Dostępne</div>
        </div>
        <div className="pv-card p-4 text-center">
          <div className="text-2xl font-bold text-emerald-600">
            {posts.filter((p) => p.status === 'adopted').length}
          </div>
          <div className="text-xs text-gray-500 mt-1">Adoptowane</div>
        </div>
        <div className="pv-card p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">
            {posts.filter((p) => isOwner(p)).length}
          </div>
          <div className="text-xs text-gray-500 mt-1">Moje ogłoszenia</div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="pv-card p-5 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Szukaj po imieniu, rasie, opisie..."
            value={filters.searchQuery}
            onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
            className="w-full bg-white border border-gray-200 rounded-2xl shadow-sm pl-11 pr-4 py-3 font-medium focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all"
          />
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-all"
        >
          <Filter className="w-5 h-5" />
          Filtry {activeFiltersCount > 0 && `(${activeFiltersCount})`}
        </button>

        {/* Promień od Twojej lokalizacji */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" /> Promień:
          </span>
          {[{ v: null, l: 'Wszystkie' }, { v: 10, l: '10 km' }, { v: 25, l: '25 km' }, { v: 50, l: '50 km' }, { v: 100, l: '100 km' }].map((r) => (
            <button
              key={r.l}
              onClick={() => setSearchRadius(r.v)}
              disabled={r.v !== null && !userLocation}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                searchRadius === r.v
                  ? 'bg-brand-dark text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-40'
              }`}
            >
              {r.l}
            </button>
          ))}
          {geoStatus === 'loading' && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />}
          {geoStatus === 'denied' && <span className="text-xs text-amber-600">Lokalizacja niedostępna</span>}
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-2">
            <div>
              <label className="block text-xs font-semibold text-gray-900 mb-2">Gatunek</label>
              <select
                value={filters.species}
                onChange={(e) => setFilters({ ...filters, species: e.target.value as any })}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-dark"
              >
                <option value="all">Wszystkie</option>
                <option value="dog">Pies</option>
                <option value="cat">Kot</option>
                <option value="rabbit">Królik</option>
                <option value="bird">Ptak</option>
                <option value="hamster">Chomik</option>
                <option value="other">Inne</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-900 mb-2">Miasto</label>
              <select
                value={filters.city}
                onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-dark"
              >
                <option value="all">Wszystkie</option>
                {cities.map((city) => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-900 mb-2">Rozmiar</label>
              <select
                value={filters.size}
                onChange={(e) => setFilters({ ...filters, size: e.target.value as any })}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-dark"
              >
                <option value="all">Wszystkie</option>
                <option value="small">Mały</option>
                <option value="medium">Średni</option>
                <option value="large">Duży</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-900 mb-2">Płeć</label>
              <select
                value={filters.gender}
                onChange={(e) => setFilters({ ...filters, gender: e.target.value as any })}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-dark"
              >
                <option value="all">Wszystkie</option>
                <option value="male">Samiec</option>
                <option value="female">Samica</option>
              </select>
            </div>

            <label className="flex items-center gap-2 p-3 rounded-xl border border-gray-200 cursor-pointer hover:border-brand-dark/40">
              <input
                type="checkbox"
                checked={filters.vaccinated}
                onChange={(e) => setFilters({ ...filters, vaccinated: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-brand-dark focus:ring-brand-dark"
              />
              <span className="text-sm font-medium text-gray-900">Zaszczepione</span>
            </label>

            <label className="flex items-center gap-2 p-3 rounded-xl border border-gray-200 cursor-pointer hover:border-brand-dark/40">
              <input
                type="checkbox"
                checked={filters.sterilized}
                onChange={(e) => setFilters({ ...filters, sterilized: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-brand-dark focus:ring-brand-dark"
              />
              <span className="text-sm font-medium text-gray-900">Wysterylizowane</span>
            </label>
          </div>
        )}
      </div>

      {/* Add Button */}
      <button
        onClick={() => {
          setFormData(EMPTY_FORM);
          setStep(1);
          setFormError('');
          setShowAddModal(true);
        }}
        className="w-full flex items-center justify-center gap-2 px-4 py-4 rounded-xl pv-btn-primary"
      >
        <Plus className="w-6 h-6" />
        Dodaj ogłoszenie
      </button>

      {/* Posts Grid */}
      {loading ? (
        <div className="pv-card p-12 text-center">
          <Loader2 className="w-8 h-8 mx-auto text-brand animate-spin" />
          <p className="text-sm text-gray-500 mt-3">Ładowanie ogłoszeń...</p>
        </div>
      ) : loadError ? (
        <div className="pv-card p-8 text-center">
          <AlertTriangle className="w-8 h-8 mx-auto text-amber-500 mb-3" />
          <p className="text-gray-700 mb-4">{loadError}</p>
          <button
            onClick={() => {
              setLoading(true);
              loadPosts();
            }}
            className="pv-btn-primary px-5 py-2.5 text-sm inline-flex items-center gap-2"
          >
            <RefreshCcw className="w-4 h-4" /> Spróbuj ponownie
          </button>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="pv-card p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-[#1B6B4A]/10 to-[#2A8A5C]/10 flex items-center justify-center">
            <Heart className="w-7 h-7 text-brand" />
          </div>
          <h3 className="pv-section-title mb-2">Brak ogłoszeń</h3>
          <p className="text-gray-500">
            {activeFiltersCount > 0 || filters.searchQuery
              ? 'Spróbuj zmienić filtry'
              : statusTab === 'available'
                ? 'Dodaj pierwsze ogłoszenie adopcyjne'
                : `Brak ogłoszeń o statusie „${statusConfig[statusTab].label.toLowerCase()}"`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPosts.map((post) => (
            <div
              key={post.id}
              className="pv-card-hover overflow-hidden cursor-pointer"
              onClick={() => setSelectedPost(post)}
            >
              <div
                className={`h-1.5 ${
                  post.status === 'available' ? 'bg-gradient-to-r from-brand-dark to-brand' : statusConfig[post.status].accent
                }`}
              ></div>

              {post.photo ? (
                <div className="aspect-[4/3] overflow-hidden relative">
                  <img src={post.photo} alt={post.petName} className="w-full h-full object-cover" />
                  {post.status !== 'available' && (
                    <span className={`absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-semibold ${statusConfig[post.status].chip} bg-white/95`}>
                      {statusConfig[post.status].label}
                    </span>
                  )}
                </div>
              ) : (
                <div className="aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center relative">
                  <PawPrint className="w-16 h-16 text-gray-300" />
                  {post.status !== 'available' && (
                    <span className={`absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-semibold ${statusConfig[post.status].chip}`}>
                      {statusConfig[post.status].label}
                    </span>
                  )}
                </div>
              )}

              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0">
                    <h3 className="text-xl font-bold text-gray-900">{post.petName}</h3>
                    <p className="text-sm text-gray-500">
                      {post.breed ? `${post.breed} • ` : ''}{post.age} {post.ageUnit === 'months' ? 'mies.' : 'lat'}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLike(post);
                    }}
                    className={`p-2 rounded-lg transition-all ${
                      post.liked ? 'bg-red-50 text-red-600' : 'text-gray-400 hover:bg-gray-100'
                    }`}
                    aria-label="Polub ogłoszenie"
                  >
                    <Heart className={`w-5 h-5 ${post.liked ? 'fill-current' : ''}`} />
                  </button>
                </div>

                <p className="text-sm text-gray-600 line-clamp-2 mb-3">{post.description}</p>

                <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                  <MapPin className="w-4 h-4" />
                  {post.city || '—'}
                  {post.location ? `, ${post.location}` : ''}
                  {(() => {
                    const d = postDistance(post);
                    return d !== null && d >= 1 ? (
                      <span className="text-xs font-semibold text-brand-dark">• {Math.round(d)} km stąd</span>
                    ) : null;
                  })()}
                </div>

                <div className="flex flex-wrap gap-2 mb-3">
                  {post.gender && (
                    <span className="px-2 py-1 rounded-lg bg-gray-100 text-gray-700 text-xs font-medium">
                      {post.gender === 'male' ? 'Samiec' : 'Samica'}
                    </span>
                  )}
                  {post.size && (
                    <span className="px-2 py-1 rounded-lg bg-gray-100 text-gray-700 text-xs font-medium">
                      {sizeLabel(post.size)}
                    </span>
                  )}
                  {post.vaccinated && (
                    <span className="px-2 py-1 rounded-lg bg-brand-light text-brand-dark text-xs font-medium">
                      Zaszczepiony
                    </span>
                  )}
                  {post.sterilized && (
                    <span className="px-2 py-1 rounded-lg bg-brand-light text-brand-dark text-xs font-medium">
                      Wysterylizowany
                    </span>
                  )}
                  {isOwner(post) && (
                    <span className="px-2 py-1 rounded-lg bg-amber-100 text-amber-700 text-xs font-medium">
                      Twoje ogłoszenie
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <span className="text-xs text-gray-400">{getTimeAgo(post.createdAt)}</span>
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Heart className="w-3 h-3" />
                    {post.likeCount}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Post Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm animate-fade-in p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !submitting) setShowAddModal(false);
          }}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
              <h3 className="font-semibold text-gray-900">Dodaj ogłoszenie adopcyjne</h3>
              <button
                onClick={() => setShowAddModal(false)}
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
                  <p className="text-sm text-gray-600">Wybierz gatunek zwierzęcia, które chcesz oddać do adopcji:</p>
                  <div className="grid grid-cols-1 gap-3">
                    {[
                      { value: 'dog', label: 'Pies' },
                      { value: 'cat', label: 'Kot' },
                      { value: 'rabbit', label: 'Królik' },
                      { value: 'bird', label: 'Ptak' },
                      { value: 'hamster', label: 'Chomik' },
                      { value: 'other', label: 'Inne' },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setFormData({ ...formData, species: opt.value as any, breed: '' })}
                        className={`flex items-center gap-3 p-4 rounded-2xl border text-left transition-all ${
                          formData.species === opt.value
                            ? 'bg-brand-dark/10 border-brand-dark text-brand-dark'
                            : 'bg-white border-gray-200 hover:border-brand-dark/40'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
                          <PawPrint className="w-5 h-5 text-brand-dark" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{opt.label}</p>
                          <p className="text-xs text-gray-500">Szukam domu dla: {opt.label.toLowerCase()}</p>
                        </div>
                      </button>
                    ))}
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
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">Rasa</label>
                    <select
                      value={formData.breed}
                      onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
                      className="w-full bg-white border border-gray-200 rounded-2xl shadow-sm px-3.5 py-2.5 text-sm focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10"
                    >
                      <option value="">Wybierz rasę</option>
                      {(breeds[formData.species] || []).map((breed) => (
                        <option key={breed} value={breed}>{breed}</option>
                      ))}
                    </select>
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
                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">Wiek</label>
                    <div className="relative flex items-center">
                      <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="number"
                        min={0}
                        value={formData.age}
                        onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                        className="flex-1 w-full bg-gray-50 border border-gray-200 rounded-l-xl pl-10 pr-3.5 py-2.5 text-sm focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10"
                        placeholder="0"
                      />
                      <select
                        value={formData.ageUnit}
                        onChange={(e) => setFormData({ ...formData, ageUnit: e.target.value as any })}
                        className="bg-gray-50 border border-l-0 border-gray-200 rounded-r-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10"
                      >
                        <option value="months">mies.</option>
                        <option value="years">lat</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">Rozmiar</label>
                    <div className="flex gap-2">
                      {[
                        { value: 'small', label: 'Mały' },
                        { value: 'medium', label: 'Średni' },
                        { value: 'large', label: 'Duży' },
                      ].map((sz) => (
                        <button
                          key={sz.value}
                          onClick={() => setFormData({ ...formData, size: sz.value as any })}
                          className={`flex-1 py-3 rounded-xl text-sm font-medium border transition-all ${
                            formData.size === sz.value
                              ? 'bg-brand-dark text-white border-brand-dark'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-brand-dark/40'
                          }`}
                        >
                          {sz.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, vaccinated: !formData.vaccinated })}
                      className={`flex items-center justify-between p-3 rounded-xl border text-sm font-medium transition-all ${
                        formData.vaccinated
                          ? 'bg-brand-dark/10 border-brand-dark text-brand-dark'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-brand-dark/40'
                      }`}
                    >
                      <span>Zaszczepiony</span>
                      <span
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          formData.vaccinated ? 'bg-brand-dark' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                            formData.vaccinated ? 'translate-x-5' : 'translate-x-1'
                          }`}
                        />
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, sterilized: !formData.sterilized })}
                      className={`flex items-center justify-between p-3 rounded-xl border text-sm font-medium transition-all ${
                        formData.sterilized
                          ? 'bg-brand-dark/10 border-brand-dark text-brand-dark'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-brand-dark/40'
                      }`}
                    >
                      <span>Wysterylizowany</span>
                      <span
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          formData.sterilized ? 'bg-brand-dark' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                            formData.sterilized ? 'translate-x-5' : 'translate-x-1'
                          }`}
                        />
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">Miasto</label>
                    <select
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full bg-white border border-gray-200 rounded-2xl shadow-sm px-3.5 py-2.5 text-sm focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10"
                    >
                      {cities.map((city) => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">Dzielnica / Okolica</label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full bg-white border border-gray-200 rounded-2xl shadow-sm px-3.5 py-2.5 text-sm focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10"
                      placeholder="np. Mokotów"
                    />
                  </div>
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
                </div>
              )}

              {step === 5 && (
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
                        placeholder="Opisz charakter, przyzwyczajenia, wymagania..."
                      />
                    </div>
                  </div>
                </div>
              )}

              {step === 6 && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">Zdjęcie</label>
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

                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-2 text-sm">
                    <p><span className="text-gray-500">Imię:</span> <span className="font-medium text-gray-900">{formData.petName || '—'}</span></p>
                    <p><span className="text-gray-500">Gatunek / Rasa:</span> <span className="font-medium text-gray-900">{speciesLabel(formData.species)}{formData.breed ? ` • ${formData.breed}` : ''}</span></p>
                    <p><span className="text-gray-500">Płeć / Rozmiar:</span> <span className="font-medium text-gray-900">{formData.gender === 'male' ? 'Samiec' : 'Samica'} • {sizeLabel(formData.size)}</span></p>
                    <p><span className="text-gray-500">Wiek:</span> <span className="font-medium text-gray-900">{formData.age ? `${formData.age} ${formData.ageUnit === 'months' ? 'mies.' : 'lat'}` : '—'}</span></p>
                    <p><span className="text-gray-500">Zdrowie:</span> <span className="font-medium text-gray-900">{formData.vaccinated ? 'Zaszczepiony' : 'Nie zaszczepiony'}{formData.sterilized ? ' • Wysterylizowany' : ''}</span></p>
                    <p><span className="text-gray-500">Lokalizacja:</span> <span className="font-medium text-gray-900">{formData.city}{formData.location ? `, ${formData.location}` : ''}</span></p>
                    <p><span className="text-gray-500">Telefon:</span> <span className="font-medium text-gray-900">{formData.phone || '—'}</span></p>
                  </div>
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
                    onClick={handleAddPost}
                    disabled={submitting || !formData.petName || !formData.description || !formData.age}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium pv-btn-primary disabled:opacity-50"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    {submitting ? 'Publikuję...' : 'Opublikuj'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Post Details Modal */}
      {selectedPost && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm animate-fade-in p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedPost(null);
              setActionError('');
            }
          }}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
              <h3 className="font-semibold text-gray-900">{selectedPost.petName}</h3>
              <button
                onClick={() => {
                  setSelectedPost(null);
                  setActionError('');
                }}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedPost.photo ? (
              <button onClick={() => setViewingPhoto(selectedPost.photo!)} className="block w-full aspect-[16/9] overflow-hidden relative group">
                <img src={selectedPost.photo} alt={selectedPost.petName} className="w-full h-full object-cover" />
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
              <div>
                <div className="flex items-start justify-between mb-3 gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h2 className="text-2xl font-bold text-gray-900">{selectedPost.petName}</h2>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusConfig[selectedPost.status].chip}`}>
                        {statusConfig[selectedPost.status].label}
                      </span>
                    </div>
                    <p className="text-gray-600">
                      {speciesLabel(selectedPost.species)}
                      {selectedPost.breed ? ` • ${selectedPost.breed}` : ''} • {selectedPost.age} {selectedPost.ageUnit === 'months' ? 'miesięcy' : 'lat'}
                    </p>
                    <p className="text-sm text-gray-500 mt-0.5">Dodał(a): {selectedPost.authorName}</p>
                  </div>
                  <button
                    onClick={() => handleLike(selectedPost)}
                    className={`p-3 rounded-xl transition-all flex-shrink-0 ${
                      selectedPost.liked ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                    }`}
                    aria-label="Polub ogłoszenie"
                  >
                    <Heart className={`w-6 h-6 ${selectedPost.liked ? 'fill-current' : ''}`} />
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {selectedPost.gender && (
                    <span className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium">
                      {selectedPost.gender === 'male' ? 'Samiec' : 'Samica'}
                    </span>
                  )}
                  {selectedPost.size && (
                    <span className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium">
                      {sizeLabel(selectedPost.size)}
                    </span>
                  )}
                  {selectedPost.vaccinated && (
                    <span className="px-3 py-1.5 rounded-lg bg-brand-light text-brand-dark text-sm font-medium">
                      Zaszczepiony
                    </span>
                  )}
                  {selectedPost.sterilized && (
                    <span className="px-3 py-1.5 rounded-lg bg-brand-light text-brand-dark text-sm font-medium">
                      Wysterylizowany
                    </span>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Opis</h4>
                <p className="text-gray-700 whitespace-pre-wrap">{selectedPost.description}</p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Lokalizacja</h4>
                <div className="flex items-center gap-2 text-gray-700">
                  <MapPin className="w-5 h-5 text-brand-dark" />
                  {selectedPost.city || '—'}{selectedPost.location ? `, ${selectedPost.location}` : ''}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <h4 className="font-semibold text-gray-900 mb-3">Kontakt z {selectedPost.authorName}</h4>
                {selectedPost.authorPhone ? (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                    <Phone className="w-5 h-5 text-brand-dark" />
                    <a href={`tel:${selectedPost.authorPhone}`} className="text-gray-700 hover:text-brand-dark">
                      {selectedPost.authorPhone}
                    </a>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Autor nie podał telefonu — skontaktuj się przez wiadomości w aplikacji.</p>
                )}
              </div>

              {actionError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">
                  {actionError}
                </div>
              )}

              {isOwner(selectedPost) && (
                <div className="space-y-3 pt-2">
                  <h4 className="font-semibold text-gray-900">Zarządzaj ogłoszeniem</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {selectedPost.status !== 'reserved' && (
                      <button
                        onClick={() => handleStatus(selectedPost, 'reserved')}
                        disabled={actionBusy}
                        className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-50 text-amber-700 font-semibold hover:bg-amber-100 transition-all disabled:opacity-50 text-sm"
                      >
                        <Bookmark className="w-4 h-4" />
                        Zarezerwowane
                      </button>
                    )}
                    {selectedPost.status !== 'adopted' && (
                      <button
                        onClick={() => handleStatus(selectedPost, 'adopted')}
                        disabled={actionBusy}
                        className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-all disabled:opacity-50 text-sm"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Adoptowane
                      </button>
                    )}
                    {selectedPost.status !== 'available' && (
                      <button
                        onClick={() => handleStatus(selectedPost, 'available')}
                        disabled={actionBusy}
                        className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-brand-light text-brand-dark font-semibold hover:bg-brand-light/70 transition-all disabled:opacity-50 text-sm"
                      >
                        <RefreshCcw className="w-4 h-4" />
                        Znów dostępne
                      </button>
                    )}
                    <button
                      onClick={() => setConfirmDelete(selectedPost)}
                      disabled={actionBusy}
                      className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-50 text-red-600 font-semibold hover:bg-red-100 transition-all disabled:opacity-50 text-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                      Usuń
                    </button>
                  </div>
                </div>
              )}

              <div className="text-sm text-gray-500 flex items-center justify-between pt-4 border-t border-gray-100">
                <span>Opublikowano {getTimeAgo(selectedPost.createdAt)}</span>
                <span className="flex items-center gap-1">
                  <Heart className="w-4 h-4" />
                  {selectedPost.likeCount} polubień
                </span>
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
        isOpen={!!confirmDelete}
        title="Usunąć ogłoszenie?"
        description={confirmDelete ? `Ogłoszenie „${confirmDelete.petName}" zostanie trwale usunięte.` : ''}
        confirmLabel="Usuń"
        cancelLabel="Anuluj"
        loading={actionBusy}
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
