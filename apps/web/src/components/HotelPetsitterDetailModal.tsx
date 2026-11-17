'use client';

import { useEffect } from 'react';
import { X, Phone, Mail, Globe, MapPin, Navigation, Building2, User, Star, Clock, Image as ImageIcon, PawPrint, Calendar } from 'lucide-react';

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

interface HotelPetsitterDetailModalProps {
  location: HotelPetsitterLocation;
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

export default function HotelPetsitterDetailModal({ location, onClose }: HotelPetsitterDetailModalProps) {
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
    const url = `https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm animate-fade-in p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <h3 className="font-semibold text-gray-900">Szczegóły</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {location.photos && location.photos.length > 0 && (
            <div className="relative h-48 rounded-2xl overflow-hidden bg-gray-100">
              <img
                src={location.photos[0]}
                alt={location.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.parentElement?.remove();
                }}
              />
              {location.is24h && (
                <div className="absolute top-3 right-3 bg-brand-dark text-white text-xs font-bold px-3 py-1.5 rounded-full">
                  24/7
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-dark to-brand flex items-center justify-center text-white flex-shrink-0">
              {location.type === 'hotel' ? <Building2 className="w-8 h-8" /> : <User className="w-8 h-8" />}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="pv-section-title">{location.name}</h4>
              <p className="text-sm text-gray-500">{location.type === 'hotel' ? 'Hotel dla zwierząt' : 'Petsitter'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {location.rating && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                <Star className="w-3 h-3 fill-amber-600" /> {location.rating}
                {location.userRatingsTotal && <span className="text-amber-500">({location.userRatingsTotal})</span>}
              </span>
            )}
            {location.isOpenNow !== null && location.isOpenNow !== undefined && (
              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
                location.isOpenNow ? 'bg-brand-mint text-brand-dark' : 'bg-gray-100 text-gray-600'
              }`}>
                <Clock className="w-3 h-3" /> {location.is24h ? 'Całodobowo' : location.isOpenNow ? 'Otwarte teraz' : 'Zamknięte'}
              </span>
            )}
            {location.is24h && !(location.photos && location.photos.length > 0) && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full bg-brand-dark text-white">
                24/7
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-dark bg-brand-dark/10 px-2 py-1 rounded-full">
              <MapPin className="w-3 h-3" /> {location.distance} km
            </span>
          </div>

          <div>
            <h5 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Adres</h5>
            <div className="flex items-start gap-2 text-sm text-gray-700">
              <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <p>{location.address}</p>
            </div>
          </div>

          {location.hours && location.hours.length > 0 && (
            <div>
              <h5 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                Godziny otwarcia
                {location.todayHours && (
                  <span className="ml-2 normal-case text-brand-dark font-semibold">({location.todayHours})</span>
                )}
              </h5>
              <div className="flex items-start gap-2 text-sm text-gray-700">
                <Clock className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <ul className="space-y-0.5">
                  {location.hours.map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {location.description && (
            <div>
              <h5 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Opis</h5>
              <p className="text-sm text-gray-700">{location.description}</p>
            </div>
          )}

          {location.priceRange && (
            <div>
              <h5 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Cennik</h5>
              <p className="text-sm text-gray-700">{location.priceRange}</p>
            </div>
          )}

          {location.businessStatus && (
            <div>
              <h5 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Status</h5>
              <p className="text-sm text-gray-700">
                {location.businessStatus === 'OPERATIONAL' ? 'Działa normalnie' : location.businessStatus}
              </p>
            </div>
          )}

          <div>
            <h5 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">Kontakt</h5>
            <div className="flex flex-wrap gap-2">
              {location.phone && (
                <a href={`tel:${location.phone}`} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-50 text-gray-700 hover:bg-brand-dark/10 hover:text-brand-dark transition-all text-sm font-medium">
                  <Phone className="w-4 h-4" /> Zadzwoń
                </a>
              )}
              {safeWebsiteUrl(location.website) && (
                <a href={safeWebsiteUrl(location.website)!} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-50 text-gray-700 hover:bg-brand-dark/10 hover:text-brand-dark transition-all text-sm font-medium">
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

          {/* Panel firmowy — wkrótce */}
          <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-violet-50 border border-violet-100">
            <Building2 className="w-5 h-5 text-violet-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-800">To Twoja firma?</p>
              <p className="text-[11px] text-gray-500">
                Przejmij profil i przyjmuj rezerwacje — panel firmowy
              </p>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wide text-violet-600 bg-violet-100 px-2 py-0.5 rounded-full whitespace-nowrap">
              Wkrótce
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
