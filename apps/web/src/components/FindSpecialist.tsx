'use client';

import { useEffect, useState, useCallback } from 'react';
import { specialistApi } from '@/lib/api';
import {
  MapPin,
  Phone,
  Mail,
  Globe,
  Loader2,
  Navigation,
  PlusCircle,
  Dog,
  Cat,
  Brain,
  GraduationCap,
  Heart,
  HeartHandshake,
  ChevronDown,
  Search,
  Crosshair,
  Settings,
  MapPinned,
} from 'lucide-react';
import AddSpecialistModal from './AddSpecialistModal';
import SpecialistDetailModal from './SpecialistDetailModal';

const typeOptions = [
  { value: '', label: 'Wszyscy specjaliści', icon: HeartHandshake },
  { value: 'behaviorist', label: 'Behawiorysta', icon: Brain },
  { value: 'trainer', label: 'Trener', icon: GraduationCap },
  { value: 'zoopsychologist', label: 'Zoopsycholog', icon: Heart },
];

const typeLabels: Record<string, string> = {
  behaviorist: 'Behawiorysta',
  trainer: 'Trener',
  zoopsychologist: 'Zoopsycholog',
};

const typeColors: Record<string, string> = {
  behaviorist: 'bg-red-50 text-red-700 border-red-200',
  trainer: 'bg-brand-dark/10 text-brand-dark border-brand-dark/20',
  zoopsychologist: 'bg-brand-mint text-purple-700 border-purple-200',
};

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
  distanceKm?: number | null;
}

export default function FindSpecialist() {
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState('');
  const [species, setSpecies] = useState('');
  const [city, setCity] = useState('');
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationState, setLocationState] = useState<'idle' | 'denied' | 'granted' | 'unsupported'>('idle');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSpecialist, setSelectedSpecialist] = useState<Specialist | null>(null);

  const fetchSpecialists = useCallback(async () => {
    setLoading(true);
    try {
      const data = await specialistApi.getAll({
        type: type || undefined,
        species: species || undefined,
        city: city || undefined,
        lat: userLocation ? userLocation[0] : undefined,
        lng: userLocation ? userLocation[1] : undefined,
      });
      setSpecialists(data.specialists || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [type, species, city, userLocation]);

  useEffect(() => {
    const timeout = setTimeout(fetchSpecialists, 200);
    return () => clearTimeout(timeout);
  }, [fetchSpecialists]);

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
        setLocating(false);
        setLocationState('granted');
      },
      (error) => {
        setLocating(false);
        if (error.code === 1) {
          setLocationState('denied');
        } else if (error.code === 2) {
          setLocationState('unsupported');
        } else {
          setLocationState('denied');
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const clearLocation = () => {
    setUserLocation(null);
    setLocationState('idle');
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex flex-wrap gap-2">
          {typeOptions.map((opt) => {
            const Icon = opt.icon;
            const active = type === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setType(opt.value)}
                className={`inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium border transition-all ${
                  active
                    ? 'bg-brand-dark text-white border-brand-dark'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-brand-dark/40'
                }`}
              >
                <Icon className="w-3.5 h-3.5" /> {opt.label}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-dark/10 text-brand-dark font-medium text-xs sm:text-sm hover:bg-brand-dark/20 transition-all flex-shrink-0"
        >
          <PlusCircle className="w-4 h-4" /> Dodaj specjalistę
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Szukaj po mieście..."
            className="w-full bg-white border border-gray-200 rounded-2xl pl-10 pr-4 py-2.5 sm:py-3 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-dark/20 focus:border-brand-dark/50"
          />
        </div>

        <div className="relative">
          <select
            value={species}
            onChange={(e) => setSpecies(e.target.value)}
            className="appearance-none bg-white border border-gray-200 rounded-2xl pl-4 pr-10 py-2.5 sm:py-3 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-dark/20 focus:border-brand-dark/50"
          >
            <option value="">Pies i kot</option>
            <option value="dog">Pies</option>
            <option value="cat">Kot</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>

        <button
          onClick={handleLocate}
          disabled={locating}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:py-3 rounded-2xl bg-brand-dark text-white font-medium text-xs sm:text-sm hover:bg-[#173a4a] transition-all disabled:opacity-50 flex-shrink-0"
        >
          {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crosshair className="w-4 h-4" />}
          {userLocation ? 'Zaktualizuj lokalizację' : 'Znajdź blisko mnie'}
        </button>
      </div>


      {locationState === 'denied' && !userLocation && (
        <div className="rounded-2xl bg-amber-50 border border-amber-100 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center flex-shrink-0">
            <Settings className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">Brak dostępu do lokalizacji</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Aby wyszukać po okolicy, włącz lokalizację w ustawieniach przeglądarki, a następnie kliknij &quot;Spróbuj ponownie&quot;. Możesz też wpisać miasto ręcznie.
            </p>
          </div>
          <button
            onClick={handleLocate}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 transition-all flex-shrink-0"
          >
            <Crosshair className="w-4 h-4" /> Spróbuj ponownie
          </button>
        </div>
      )}

      {locationState === 'unsupported' && (
        <div className="rounded-2xl bg-gray-50 border border-gray-200 p-4 text-sm text-gray-600">
          Twoja przeglądarka nie obsługuje geolokalizacji. Wpisz miasto, aby wyszukać specjalistów.
        </div>
      )}

      {userLocation && !loading && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 rounded-2xl bg-brand-dark/10 px-4 py-3 text-sm text-brand-dark">
          <div className="flex items-center gap-2">
            <Navigation className="w-4 h-4" />
            <span className="font-medium">Lokalizacja włączona{specialists.length > 0 ? `: znaleziono ${specialists.length} specjalistów w okolicy` : ''}</span>
          </div>
          <button onClick={clearLocation} className="text-xs text-brand-dark underline hover:text-brand-dark sm:ml-auto">
            Wyłącz lokalizację
          </button>
        </div>
      )}

      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-16 text-gray-500">
            <div className="w-10 h-10 border-4 border-gray-200 border-t-[#1B6B4A] rounded-full animate-spin mx-auto mb-4" />
            Szukanie specjalistów...
          </div>
        ) : specialists.length === 0 ? (
          <div className="text-center py-16 px-4 rounded-2xl bg-gray-50 border border-gray-200 border-dashed">
            <p className="text-gray-500 text-sm">Brak specjalistów spełniających kryteria wyszukiwania.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            {specialists.map((s) => {
              const Icon = typeOptions.find((t) => t.value === s.specialist_type)?.icon || HeartHandshake;
              return (
                <div
                  key={s.id}
                  onClick={() => setSelectedSpecialist(s)}
                  className="flex flex-col rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden hover:shadow-md hover:border-brand-dark/30 cursor-pointer transition-all"
                >
                  <div className="h-28 sm:h-32 bg-gradient-to-br from-[#1B6B4A]/20 to-[#1B6B4A]/5 flex items-center justify-center">
                    <div className="w-14 h-14 rounded-2xl bg-white/80 flex items-center justify-center">
                      <Icon className="w-7 h-7 text-brand-dark" />
                    </div>
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
                      <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border ${typeColors[s.specialist_type]}`}>
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
                        <a href={`tel:${s.phone}`} className="p-2 rounded-xl bg-gray-50 text-gray-600 hover:bg-brand-dark/10 hover:text-brand-dark transition-colors">
                          <Phone className="w-4 h-4" />
                        </a>
                      )}
                      {s.email && (
                        <a href={`mailto:${s.email}`} className="p-2 rounded-xl bg-gray-50 text-gray-600 hover:bg-brand-dark/10 hover:text-brand-dark transition-colors">
                          <Mail className="w-4 h-4" />
                        </a>
                      )}
                      {s.website && (
                        <a href={s.website} target="_blank" rel="noreferrer" className="p-2 rounded-xl bg-gray-50 text-gray-600 hover:bg-brand-dark/10 hover:text-brand-dark transition-colors">
                          <Globe className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showAddModal && <AddSpecialistModal onClose={() => setShowAddModal(false)} />}
      {selectedSpecialist && <SpecialistDetailModal specialist={selectedSpecialist} onClose={() => setSelectedSpecialist(null)} />}
    </div>
  );
}
