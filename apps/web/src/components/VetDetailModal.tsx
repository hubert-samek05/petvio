'use client';

import { useEffect } from 'react';
import { X, Phone, Globe, MapPin, Navigation, Stethoscope, Apple, Star, Clock } from 'lucide-react';

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
  hours?: string[] | null;
  todayHours?: string | null;
  isOpenNow?: boolean | null;
  photos?: string[];
  lat: number;
  lng: number;
  businessStatus?: string;
  is24h?: boolean;
}

interface VetDetailModalProps {
  vet: VetLocation;
  onClose: () => void;
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

export default function VetDetailModal({ vet, onClose }: VetDetailModalProps) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.body.classList.add('modal-open');
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      document.body.classList.remove('modal-open');
    };
  }, [onClose]);

  const openNavigation = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${vet.lat},${vet.lng}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm animate-fade-in p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <h3 className="font-semibold text-gray-900">Szczegóły placówki</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {vet.photos && vet.photos.length > 0 && (
          <div className="relative h-44 bg-gray-100">
            <img
              src={vet.photos[0]}
              alt={vet.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.parentElement?.remove();
              }}
            />
            {vet.is24h && (
              <div className="absolute top-3 right-3 bg-brand-dark text-white text-xs font-bold px-3 py-1.5 rounded-full">
                24/7
              </div>
            )}
          </div>
        )}

        <div className="p-5 space-y-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-brand-mint flex items-center justify-center text-brand-dark flex-shrink-0">
              {vet.type === 'vet' ? <Stethoscope className="w-8 h-8" /> : <Apple className="w-8 h-8" />}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="pv-section-title">{vet.name}</h4>
              <p className="text-sm text-gray-500">{vet.type === 'vet' ? 'Klinika weterynaryjna' : 'Gabinet dietetyczny'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {vet.rating && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                <Star className="w-3 h-3 fill-amber-600" /> {vet.rating}
                {vet.userRatingsTotal && <span className="text-amber-500">({vet.userRatingsTotal})</span>}
              </span>
            )}
            {vet.isOpenNow !== null && vet.isOpenNow !== undefined && (
              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
                vet.isOpenNow ? 'bg-brand-mint text-brand-dark' : 'bg-gray-100 text-gray-600'
              }`}>
                <Clock className="w-3 h-3" /> {vet.is24h ? 'Całodobowo' : vet.isOpenNow ? 'Otwarte teraz' : 'Zamknięte'}
              </span>
            )}
            {vet.is24h && !(vet.photos && vet.photos.length > 0) && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full bg-brand-dark text-white">
                24/7
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-dark bg-brand-dark/10 px-2 py-1 rounded-full">
              <MapPin className="w-3 h-3" /> {vet.distance} km
            </span>
          </div>

          <div>
            <h5 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Adres</h5>
            <div className="flex items-start gap-2 text-sm text-gray-700">
              <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <p>{vet.address}</p>
            </div>
          </div>

          {vet.hours && vet.hours.length > 0 && (
            <div>
              <h5 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                Godziny otwarcia
                {vet.todayHours && (
                  <span className="ml-2 normal-case text-brand-dark font-semibold">({vet.todayHours})</span>
                )}
              </h5>
              <div className="flex items-start gap-2 text-sm text-gray-700">
                <Clock className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <ul className="space-y-0.5">
                  {vet.hours.map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {vet.businessStatus && (
            <div>
              <h5 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Status</h5>
              <p className="text-sm text-gray-700">
                {vet.businessStatus === 'OPERATIONAL' ? 'Działa normalnie' : vet.businessStatus}
              </p>
            </div>
          )}

          <div>
            <h5 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">Kontakt</h5>
            <div className="flex flex-wrap gap-2">
              {vet.phone && (
                <a href={`tel:${vet.phone}`} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-50 text-gray-700 hover:bg-brand-dark/10 hover:text-brand-dark transition-all text-sm font-medium">
                  <Phone className="w-4 h-4" /> Zadzwoń
                </a>
              )}
              {safeWebsiteUrl(vet.website) && (
                <a href={safeWebsiteUrl(vet.website)!} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-50 text-gray-700 hover:bg-brand-dark/10 hover:text-brand-dark transition-all text-sm font-medium">
                  <Globe className="w-4 h-4" /> Strona
                </a>
              )}
            </div>
          </div>

          <button
            onClick={openNavigation}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl pv-btn-primary"
          >
            <Navigation className="w-4 h-4" /> Nawiguj w Google Maps
          </button>
        </div>
      </div>
    </div>
  );
}
