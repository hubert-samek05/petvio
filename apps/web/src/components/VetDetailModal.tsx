'use client';

import { useEffect } from 'react';
import { X, Phone, Mail, Globe, MapPin, Navigation, Stethoscope, Apple, Star, Clock, Image as ImageIcon } from 'lucide-react';

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
}

interface VetDetailModalProps {
  vet: VetLocation;
  onClose: () => void;
}

export default function VetDetailModal({ vet, onClose }: VetDetailModalProps) {
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
    const url = `https://www.google.com/maps/dir/?api=1&destination=${vet.lat},${vet.lng}`;
    window.open(url, '_blank');
  };

  const getPhotoUrl = (photoReference: string) => {
    return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photoReference}&key=AIzaSyAx_kQclM1Ax_VgtTR1ZlH76Z2pT8QB_6U`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <h3 className="font-semibold text-gray-900">Szczegóły placówki</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {vet.photos && vet.photos.length > 0 && (
            <div className="relative h-48 rounded-2xl overflow-hidden bg-gray-100">
              <img
                src={getPhotoUrl(vet.photos[0])}
                alt={vet.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              {vet.photos.length > 1 && (
                <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                  +{vet.photos.length - 1} zdjęć
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-dark to-brand flex items-center justify-center text-white flex-shrink-0">
              {vet.type === 'vet' ? <Stethoscope className="w-8 h-8" /> : <Apple className="w-8 h-8" />}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-lg font-semibold text-gray-900">{vet.name}</h4>
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
            {vet.isOpenNow !== null && (
              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
                vet.isOpenNow ? 'bg-brand-mint text-brand-dark' : 'bg-gray-100 text-gray-600'
              }`}>
                <Clock className="w-3 h-3" /> {vet.isOpenNow ? 'Otwarte' : 'Zamknięte'}
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

          {vet.hours && (
            <div>
              <h5 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Godziny otwarcia</h5>
              <div className="flex items-start gap-2 text-sm text-gray-700">
                <Clock className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <p>{vet.hours}</p>
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
              {vet.website && (
                <a href={vet.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-50 text-gray-700 hover:bg-brand-dark/10 hover:text-brand-dark transition-all text-sm font-medium">
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
