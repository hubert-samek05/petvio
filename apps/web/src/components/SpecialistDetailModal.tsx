'use client';

import { useEffect } from 'react';
import { X, Phone, Mail, Globe, MapPin, Navigation, Dog, Cat, Brain, GraduationCap, Heart, HeartHandshake, Apple, Hotel, UserCheck } from 'lucide-react';

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

interface SpecialistDetailModalProps {
  specialist: Specialist;
  onClose: () => void;
}

const typeLabels: Record<string, string> = {
  behaviorist: 'Behawiorysta',
  trainer: 'Trener',
  zoopsychologist: 'Zoopsycholog',
  dietitian: 'Dietetyk',
  hotel: 'Hotel',
  petsitter: 'Petsitter',
};

const typeIcons: Record<string, any> = {
  behaviorist: Brain,
  trainer: GraduationCap,
  zoopsychologist: Heart,
  dietitian: Apple,
  hotel: Hotel,
  petsitter: UserCheck,
};

const typeBadge = 'bg-brand-mint text-brand-dark border-emerald-200';

// Dozwolone tylko http(s) — zgłoszenia użytkowników nie mogą podawać javascript: itp.
const safeWebsiteUrl = (url: string | null) => {
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

export default function SpecialistDetailModal({ specialist, onClose }: SpecialistDetailModalProps) {
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

  const Icon = typeIcons[specialist.specialist_type] || HeartHandshake;

  const openNavigation = () => {
    if (specialist.latitude && specialist.longitude) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${specialist.latitude},${specialist.longitude}`;
      window.open(url, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm animate-fade-in p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <h3 className="font-semibold text-gray-900">Szczegóły specjalisty</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-brand-mint flex items-center justify-center text-brand-dark flex-shrink-0">
              <Icon className="w-8 h-8" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="pv-section-title">{specialist.name}</h4>
              <p className="text-sm text-gray-500">{typeLabels[specialist.specialist_type] || specialist.specialist_type}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center text-xs font-semibold px-3 py-1 rounded-full border ${typeBadge}`}>
              {typeLabels[specialist.specialist_type] || specialist.specialist_type}
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-gray-400">
              {specialist.species === 'dog' ? <Dog className="w-4 h-4" /> : specialist.species === 'cat' ? <Cat className="w-4 h-4" /> : <><Dog className="w-4 h-4" /><Cat className="w-4 h-4" /></>}
            </span>
            {specialist.distanceKm != null && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-dark bg-brand-dark/10 px-2 py-1 rounded-full">
                <MapPin className="w-3 h-3" /> {specialist.distanceKm} km
              </span>
            )}
          </div>

          {specialist.description && (
            <div>
              <h5 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Opis</h5>
              <p className="text-sm text-gray-700 leading-relaxed">{specialist.description}</p>
            </div>
          )}

          <div>
            <h5 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Lokalizacja</h5>
            <div className="flex items-start gap-2 text-sm text-gray-700">
              <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p>{specialist.address || '—'}</p>
                <p>{specialist.city || '—'}</p>
              </div>
            </div>
          </div>

          {specialist.price_info && (
            <div>
              <h5 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Cennik</h5>
              <p className="text-sm font-semibold text-brand-dark bg-brand-mint rounded-lg px-3 py-2 inline-block">
                {specialist.price_info}
              </p>
            </div>
          )}

          <div>
            <h5 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">Kontakt</h5>
            <div className="flex flex-wrap gap-2">
              {specialist.phone && (
                <a href={`tel:${specialist.phone}`} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-50 text-gray-700 hover:bg-brand-dark/10 hover:text-brand-dark transition-all text-sm font-medium">
                  <Phone className="w-4 h-4" /> Zadzwoń
                </a>
              )}
              {specialist.email && (
                <a href={`mailto:${specialist.email}`} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-50 text-gray-700 hover:bg-brand-dark/10 hover:text-brand-dark transition-all text-sm font-medium">
                  <Mail className="w-4 h-4" /> Email
                </a>
              )}
              {safeWebsiteUrl(specialist.website) && (
                <a href={safeWebsiteUrl(specialist.website)!} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-50 text-gray-700 hover:bg-brand-dark/10 hover:text-brand-dark transition-all text-sm font-medium">
                  <Globe className="w-4 h-4" /> Strona
                </a>
              )}
            </div>
          </div>

          {specialist.latitude && specialist.longitude && (
            <button
              onClick={openNavigation}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl pv-btn-primary"
            >
              <Navigation className="w-4 h-4" /> Nawiguj w Google Maps
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
