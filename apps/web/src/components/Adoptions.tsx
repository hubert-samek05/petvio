'use client';

import { useState, useEffect, type ReactNode } from 'react';
import {
  Plus,
  Heart,
  Phone,
  Mail,
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
  Info,
  Share2,
  Flag
} from 'lucide-react';

interface AdoptionPost {
  id: string;
  authorId: string;
  authorName: string;
  authorPhone?: string;
  authorEmail: string;
  petName: string;
  species: 'dog' | 'cat' | 'other';
  breed?: string;
  age: number;
  ageUnit: 'months' | 'years';
  gender: 'male' | 'female';
  size: 'small' | 'medium' | 'large';
  description: string;
  location: string;
  city: string;
  vaccinated: boolean;
  sterilized: boolean;
  images: string[];
  likes: string[];
  createdAt: string;
  status: 'available' | 'reserved' | 'adopted';
}

const cities = [
  'Warszawa', 'Kraków', 'Wrocław', 'Poznań', 'Gdańsk', 'Szczecin', 'Łódź', 'Katowice',
  'Lublin', 'Białystok', 'Gdynia', 'Częstochowa', 'Radom', 'Toruń', 'Kielce', 'Inne'
];

const breeds = {
  dog: ['Labrador', 'Owczarek niemiecki', 'Golden retriever', 'Buldog francuski', 'Beagle', 'Kundelek', 'Inne'],
  cat: ['Perski', 'Brytyjski', 'Maine Coon', 'Syberyjski', 'Dachowiec', 'Inne'],
  other: ['Inne']
};

function WizardField({
  label,
  optional,
  children,
  full,
}: {
  label: string;
  optional?: boolean;
  children: ReactNode;
  full?: boolean;
}) {
  return (
    <div
      className={`p-5 rounded-2xl bg-white border border-gray-200 shadow-sm focus-within:border-brand-dark/50 focus-within:ring-2 focus-within:ring-[#1B6B4A]/10 transition-all ${
        full ? 'sm:col-span-2' : ''
      }`}
    >
      <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
        {label}
        {optional && <span className="normal-case font-normal text-gray-400"> (opcjonalnie)</span>}
      </label>
      {children}
    </div>
  );
}

export default function Adoptions() {
  const [posts, setPosts] = useState<AdoptionPost[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedPost, setSelectedPost] = useState<AdoptionPost | null>(null);

  const [filters, setFilters] = useState({
    species: 'all' as 'all' | 'dog' | 'cat' | 'other',
    city: 'all',
    size: 'all' as 'all' | 'small' | 'medium' | 'large',
    gender: 'all' as 'all' | 'male' | 'female',
    vaccinated: false,
    sterilized: false,
    searchQuery: '',
  });

  const [formData, setFormData] = useState({
    petName: '',
    species: 'dog' as 'dog' | 'cat' | 'other',
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
  });

  const [step, setStep] = useState(1);
  const [formError, setFormError] = useState('');

  const stepTitles = ['Gatunek', 'Imię i rasa', 'Wiek i zdrowie', 'Lokalizacja', 'Opis', 'Zdjęcie i podsumowanie'];

  const stepValid = () => {
    if (step === 1) return true;
    if (step === 2) return formData.petName.trim().length > 0;
    if (step === 3) return formData.age.trim().length > 0;
    if (step === 4) return true;
    if (step === 5) return formData.description.trim().length > 0;
    if (step === 6) return true;
    return true;
  };

  const nextStep = () => {
    if (!stepValid()) {
      const required: Record<number, string> = {
        1: 'Wybierz gatunek.',
        2: 'Podaj imię zwierzęcia.',
        3: 'Podaj wiek zwierzęcia.',
        4: 'Uzupełnij lokalizację.',
        5: 'Dodaj krótki opis, aby opublikować ogłoszenie.',
        6: 'Dodaj zdjęcie lub przejdź do podsumowania.',
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

  useEffect(() => {
    if (showAddModal || selectedPost) {
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
  }, [showAddModal, selectedPost]);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      setCurrentUser(user);

      const savedPosts = localStorage.getItem('adoptionPosts');
      if (savedPosts) {
        setPosts(JSON.parse(savedPosts));
      } else {
        const mockPosts: AdoptionPost[] = [
          {
            id: '1',
            authorId: '1',
            authorName: 'Anna Kowalska',
            authorEmail: 'anna@example.com',
            authorPhone: '+48 123 456 789',
            petName: 'Max',
            species: 'dog',
            breed: 'Labrador',
            age: 2,
            ageUnit: 'years',
            gender: 'male',
            size: 'large',
            description: 'Max to wspaniały, energiczny labrador szukający kochającego domu. Jest bardzo przyjazny dla dzieci i innych zwierząt. Uwielbia spacery i zabawę.',
            location: 'Mokotów',
            city: 'Warszawa',
            vaccinated: true,
            sterilized: true,
            images: [],
            likes: ['2', '3'],
            createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
            status: 'available',
          },
          {
            id: '2',
            authorId: '2',
            authorName: 'Jan Nowak',
            authorEmail: 'jan@example.com',
            petName: 'Luna',
            species: 'cat',
            breed: 'Dachowiec',
            age: 6,
            ageUnit: 'months',
            gender: 'female',
            size: 'small',
            description: 'Luna to młoda kotka znaleziona na ulicy. Jest bardzo łagodna i przytulna. Szuka ciepłego domu.',
            location: 'Stare Miasto',
            city: 'Kraków',
            vaccinated: true,
            sterilized: false,
            images: [],
            likes: ['1'],
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            status: 'available',
          }
        ];
        setPosts(mockPosts);
        localStorage.setItem('adoptionPosts', JSON.stringify(mockPosts));
      }
    }
  }, []);

  const filteredPosts = posts.filter(post => {
    if (filters.species !== 'all' && post.species !== filters.species) return false;
    if (filters.city !== 'all' && post.city !== filters.city) return false;
    if (filters.size !== 'all' && post.size !== filters.size) return false;
    if (filters.gender !== 'all' && post.gender !== filters.gender) return false;
    if (filters.vaccinated && !post.vaccinated) return false;
    if (filters.sterilized && !post.sterilized) return false;
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      if (!post.petName.toLowerCase().includes(query) &&
          !post.description.toLowerCase().includes(query) &&
          !post.breed?.toLowerCase().includes(query)) {
        return false;
      }
    }
    return post.status === 'available';
  });

  const handleAddPost = () => {
    if (!currentUser || !formData.petName || !formData.description) return;

    const post: AdoptionPost = {
      id: Date.now().toString(),
      authorId: currentUser.id || '1',
      authorName: `${currentUser.firstName || 'User'} ${currentUser.lastName || ''}`.trim(),
      authorEmail: currentUser.email || 'user@example.com',
      authorPhone: formData.phone || undefined,
      petName: formData.petName,
      species: formData.species,
      breed: formData.breed || undefined,
      age: parseInt(formData.age),
      ageUnit: formData.ageUnit,
      gender: formData.gender,
      size: formData.size,
      description: formData.description,
      location: formData.location,
      city: formData.city,
      vaccinated: formData.vaccinated,
      sterilized: formData.sterilized,
      images: formData.image ? [formData.image] : [],
      likes: [],
      createdAt: new Date().toISOString(),
      status: 'available',
    };

    const updated = [post, ...posts];
    setPosts(updated);
    localStorage.setItem('adoptionPosts', JSON.stringify(updated));

    setFormData({
      petName: '',
      species: 'dog',
      breed: '',
      age: '',
      ageUnit: 'months',
      gender: 'male',
      size: 'medium',
      description: '',
      location: '',
      city: 'Warszawa',
      vaccinated: false,
      sterilized: false,
      phone: '',
      image: '',
    });
    setShowAddModal(false);
  };

  const handleLike = (postId: string) => {
    if (!currentUser) return;

    const updated = posts.map(p => {
      if (p.id === postId) {
        const likes = p.likes.includes(currentUser.id)
          ? p.likes.filter(id => id !== currentUser.id)
          : [...p.likes, currentUser.id];
        return { ...p, likes };
      }
      return p;
    });

    setPosts(updated);
    localStorage.setItem('adoptionPosts', JSON.stringify(updated));
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

  const activeFiltersCount = Object.entries(filters).filter(([key, value]) => {
    if (key === 'searchQuery') return false;
    if (typeof value === 'boolean') return value;
    return value !== 'all';
  }).length;

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-4 text-center">
          <div className="text-2xl font-bold text-brand-dark">{filteredPosts.length}</div>
          <div className="text-xs text-gray-500 mt-1">Dostępne</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-4 text-center">
          <div className="text-2xl font-bold text-brand-dark">
            {posts.filter(p => p.status === 'adopted').length}
          </div>
          <div className="text-xs text-gray-500 mt-1">Adoptowane</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{posts.length}</div>
          <div className="text-xs text-gray-500 mt-1">Wszystkie</div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-5 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Szukaj po imieniu, rasie, opisie..."
            value={filters.searchQuery}
            onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-11 pr-4 py-3 font-medium focus:outline-none focus:border-brand-dark focus:bg-white transition-all"
          />
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-all"
        >
          <Filter className="w-5 h-5" />
          Filtry {activeFiltersCount > 0 && `(${activeFiltersCount})`}
        </button>

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
                {cities.map(city => (
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
          setFormData({
            petName: '',
            species: 'dog',
            breed: '',
            age: '',
            ageUnit: 'months',
            gender: 'male',
            size: 'medium',
            description: '',
            location: '',
            city: 'Warszawa',
            vaccinated: false,
            sterilized: false,
            phone: '',
            image: '',
          });
          setStep(1);
          setFormError('');
          setShowAddModal(true);
        }}
        className="w-full flex items-center justify-center gap-2 px-4 py-4 rounded-xl bg-brand-dark text-white font-semibold hover:bg-brand-dark transition-all"
      >
        <Plus className="w-6 h-6" />
        Dodaj ogłoszenie
      </button>

      {/* Posts Grid */}
      {filteredPosts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-[#1B6B4A]/10 to-[#2A8A5C]/10 flex items-center justify-center">
            <Heart className="w-7 h-7 text-brand" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Brak ogłoszeń</h3>
          <p className="text-gray-500">
            {activeFiltersCount > 0 ? 'Spróbuj zmienić filtry' : 'Dodaj pierwsze ogłoszenie adopcyjne'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPosts.map((post) => {
            const isLiked = currentUser && post.likes.includes(currentUser.id);

            return (
              <div
                key={post.id}
                className="bg-white rounded-2xl border border-gray-200/70 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-brand-dark/30 transition-all duration-300 overflow-hidden cursor-pointer"
                onClick={() => setSelectedPost(post)}
              >
                <div className="h-1.5 bg-gradient-to-r from-brand-dark to-brand"></div>
                
                {/* Image Placeholder */}
                <div className="aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                  <ImageIcon className="w-16 h-16 text-gray-300" />
                </div>

                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{post.petName}</h3>
                      <p className="text-sm text-gray-500">
                        {post.breed} • {post.age} {post.ageUnit === 'months' ? 'mies.' : 'lat'}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLike(post.id);
                      }}
                      className={`p-2 rounded-lg transition-all ${
                        isLiked ? 'bg-red-50 text-red-600' : 'text-gray-400 hover:bg-gray-100'
                      }`}
                    >
                      <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
                    </button>
                  </div>

                  <p className="text-sm text-gray-600 line-clamp-2 mb-3">{post.description}</p>

                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                    <MapPin className="w-4 h-4" />
                    {post.city}
                  </div>

                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className="px-2 py-1 rounded-lg bg-gray-100 text-gray-700 text-xs font-medium">
                      {post.gender === 'male' ? 'Samiec' : 'Samica'}
                    </span>
                    <span className="px-2 py-1 rounded-lg bg-gray-100 text-gray-700 text-xs font-medium">
                      {post.size === 'small' ? 'Mały' : post.size === 'medium' ? 'Średni' : 'Duży'}
                    </span>
                    {post.vaccinated && (
                      <span className="px-2 py-1 rounded-lg bg-brand-light text-brand-dark text-xs font-medium">
                        Zaszczepiony
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <span className="text-xs text-gray-400">{getTimeAgo(post.createdAt)}</span>
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Heart className="w-3 h-3" />
                      {post.likes.length}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Post Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
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
                  <p className="text-sm text-gray-600">Wybierz gatunek zwierzęcia, które chcesz oddać do adopcji:</p>
                  <div className="grid grid-cols-1 gap-3">
                    {[
                      { value: 'dog', label: 'Pies' },
                      { value: 'cat', label: 'Kot' },
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
                          <p className="text-xs text-gray-500">Szukam domu dla {opt.label.toLowerCase()}a</p>
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
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-3.5 py-2.5 text-sm focus:outline-none focus:border-brand-dark/50"
                        placeholder="np. Max"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">Rasa</label>
                    <select
                      value={formData.breed}
                      onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-brand-dark/50"
                    >
                      <option value="">Wybierz rasę</option>
                      {breeds[formData.species].map(breed => (
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
                        value={formData.age}
                        onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                        className="flex-1 w-full bg-gray-50 border border-gray-200 rounded-l-xl pl-10 pr-3.5 py-2.5 text-sm focus:outline-none focus:border-brand-dark/50"
                        placeholder="0"
                      />
                      <select
                        value={formData.ageUnit}
                        onChange={(e) => setFormData({ ...formData, ageUnit: e.target.value as any })}
                        className="bg-gray-50 border border-l-0 border-gray-200 rounded-r-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-brand-dark/50"
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
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-brand-dark/50"
                    >
                      {cities.map(city => (
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
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-brand-dark/50"
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
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-3.5 py-2.5 text-sm focus:outline-none focus:border-brand-dark/50"
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
                        rows={3}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-3.5 py-2.5 text-sm focus:outline-none focus:border-brand-dark/50 resize-none"
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

                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-2 text-sm">
                    <p><span className="text-gray-500">Imię:</span> <span className="font-medium text-gray-900">{formData.petName || '—'}</span></p>
                    <p><span className="text-gray-500">Gatunek / Rasa:</span> <span className="font-medium text-gray-900">{formData.species === 'dog' ? 'Pies' : formData.species === 'cat' ? 'Kot' : 'Inne'}{formData.breed ? ` • ${formData.breed}` : ''}</span></p>
                    <p><span className="text-gray-500">Płeć / Rozmiar:</span> <span className="font-medium text-gray-900">{formData.gender === 'male' ? 'Samiec' : 'Samica'} • {formData.size === 'small' ? 'Mały' : formData.size === 'medium' ? 'Średni' : 'Duży'}</span></p>
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
                  <button
                    onClick={nextStep}
                    className="inline-flex items-center gap-1 px-5 py-2.5 rounded-xl text-sm font-medium bg-brand-dark text-white hover:bg-brand-dark transition-all"
                  >
                    Dalej <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleAddPost}
                    disabled={!formData.petName || !formData.description || !formData.age}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-brand text-white hover:bg-brand transition-all disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" /> Opublikuj
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Post Details Modal */}
      {selectedPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
              <h3 className="font-semibold text-gray-900">{selectedPost.petName}</h3>
              <button
                onClick={() => setSelectedPost(null)}
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
                    <h2 className="text-2xl font-bold text-gray-900 mb-1">{selectedPost.petName}</h2>
                    <p className="text-gray-600">
                      {selectedPost.breed} • {selectedPost.age} {selectedPost.ageUnit === 'months' ? 'miesięcy' : 'lat'}
                    </p>
                  </div>
                  <button
                    onClick={() => handleLike(selectedPost.id)}
                    className={`p-3 rounded-xl transition-all ${
                      currentUser && selectedPost.likes.includes(currentUser.id)
                        ? 'bg-red-50 text-red-600'
                        : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                    }`}
                  >
                    <Heart className={`w-6 h-6 ${currentUser && selectedPost.likes.includes(currentUser.id) ? 'fill-current' : ''}`} />
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium">
                    {selectedPost.gender === 'male' ? 'Samiec' : 'Samica'}
                  </span>
                  <span className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium">
                    {selectedPost.size === 'small' ? 'Mały' : selectedPost.size === 'medium' ? 'Średni' : 'Duży'}
                  </span>
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
                  {selectedPost.city}{selectedPost.location && `, ${selectedPost.location}`}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <h4 className="font-semibold text-gray-900 mb-3">Kontakt</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                    <Mail className="w-5 h-5 text-brand-dark" />
                    <a href={`mailto:${selectedPost.authorEmail}`} className="text-gray-700 hover:text-brand-dark">
                      {selectedPost.authorEmail}
                    </a>
                  </div>
                  {selectedPost.authorPhone && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                      <Phone className="w-5 h-5 text-brand-dark" />
                      <a href={`tel:${selectedPost.authorPhone}`} className="text-gray-700 hover:text-brand-dark">
                        {selectedPost.authorPhone}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-sm text-gray-500 flex items-center justify-between pt-4 border-t border-gray-100">
                <span>Opublikowano {getTimeAgo(selectedPost.createdAt)}</span>
                <span className="flex items-center gap-1">
                  <Heart className="w-4 h-4" />
                  {selectedPost.likes.length} polubień
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
