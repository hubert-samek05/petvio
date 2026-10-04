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
  hours?: string;
  isOpenNow?: boolean | null;
  photos?: string[];
  lat: number;
  lng: number;
  businessStatus?: string;
  description?: string;
  priceRange?: string;
}

interface HotelPetsitterDetailModalProps {
  location: HotelPetsitterLocation;
  onClose: () => void;
}

export default function HotelPetsitterDetailModal({ location, onClose }: HotelPetsitterDetailModalProps) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.body.classList.add('modal-open');
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      document.body.classList.remove('modal-open');
    };
  }, []);

  const openNavigation = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}`;
    window.open(url, '_blank');
  };

  const getPhotoUrl = (photoReference: string) => {
    return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photoReference}&key=${process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
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
                src={getPhotoUrl(location.photos[0])}
                alt={location.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              {location.photos.length > 1 && (
                <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                  +{location.photos.length - 1} zdjęć
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-dark to-brand flex items-center justify-center text-white flex-shrink-0">
              {location.type === 'hotel' ? <Building2 className="w-8 h-8" /> : <User className="w-8 h-8" />}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-lg font-semibold text-gray-900">{location.name}</h4>
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
            {location.isOpenNow !== null && (
              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
                location.isOpenNow ? 'bg-brand-mint text-brand-dark' : 'bg-gray-100 text-gray-600'
              }`}>
                <Clock className="w-3 h-3" /> {location.isOpenNow ? 'Otwarte' : 'Zamknięte'}
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

          {location.hours && (
            <div>
              <h5 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Godziny otwarcia</h5>
              <div className="flex items-start gap-2 text-sm text-gray-700">
                <Clock className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <p>{location.hours}</p>
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
              {location.website && (
                <a href={location.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-50 text-gray-700 hover:bg-brand-dark/10 hover:text-brand-dark transition-all text-sm font-medium">
                  <Globe className="w-4 h-4" /> Strona
                </a>
              )}
            </div>
          </div>

          <button
            onClick={openNavigation}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-brand-dark text-white font-medium hover:bg-brand-dark transition-all"
          >
            <Navigation className="w-4 h-4" /> Nawiguj w Google Maps
          </button>
        </div>
      </div>
    </div>
  );
}
