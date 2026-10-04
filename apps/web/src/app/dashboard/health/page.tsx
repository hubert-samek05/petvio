'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PawPrint, Stethoscope, ArrowRight, Heart } from 'lucide-react';
import { petApi } from '@/lib/api';
import PageHeader from '@/components/PageHeader';

const speciesLabel = (s: string) =>
  s === 'dog' ? 'Pies' : s === 'cat' ? 'Kot' : 'Inne';

const age = (birthDate: string): string => {
  if (!birthDate) return '';
  const diff = Date.now() - new Date(birthDate).getTime();
  const years = Math.floor(diff / (365.25 * 24 * 3600 * 1000));
  const months = Math.floor((diff / (30.44 * 24 * 3600 * 1000)) % 12);
  if (years === 0) return `${months} mies.`;
  return `${years} ${years === 1 ? 'rok' : years < 5 ? 'lata' : 'lat'}`;
};

export default function HealthPage() {
  const [pets, setPets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    petApi
      .getAll()
      .then((res) => setPets(res.pets || res || []))
      .catch(() => setPets([]))
      .finally(() => setLoading(false));
  }, []);

  const Banner = () => (
    <PageHeader
      title="Książeczka zdrowia"
      description="Szczepienia, leki, odrobaczenia i wizyty weterynaryjne"
      icon={Heart}
    />
  );

  if (loading) {
    return (
      <div className="space-y-8">
        <Banner />
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="text-gray-600">Ładowanie...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Banner />

      {pets.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-[#1B6B4A]/10 to-[#2A8A5C]/10 flex items-center justify-center">
            <Stethoscope className="w-7 h-7 text-brand" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Najpierw dodaj zwierzę</h3>
          <p className="text-gray-500 mb-6">Książeczka zdrowia jest przypisana do profilu pupila</p>
          <Link
            href="/dashboard/pets/new"
            className="inline-flex items-center bg-brand-dark hover:bg-brand-dark text-white px-8 py-3 rounded-full font-medium transition-all"
          >
            Dodaj zwierzę
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {pets.map((pet) => (
            <Link
              key={pet.id}
              href={`/dashboard/health/${pet.id}`}
              className="group relative bg-white rounded-2xl border border-gray-200/70 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-brand-dark/30 transition-all duration-300 overflow-hidden"
            >
              <div className="h-1.5 bg-gradient-to-r from-brand-dark to-brand"></div>
              <div className="p-5">
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-dark to-brand overflow-hidden flex items-center justify-center text-white flex-shrink-0">
                    {pet.photo_url ? (
                      <img src={pet.photo_url} alt={pet.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl font-semibold">{pet.name?.[0]?.toUpperCase()}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">{pet.name}</h3>
                    <div className="flex items-center gap-1.5 text-sm text-gray-500">
                      <PawPrint className="w-3.5 h-3.5" />
                      <span className="truncate">
                        {speciesLabel(pet.species)}
                        {pet.breed ? ` · ${pet.breed}` : ''}
                      </span>
                    </div>
                    {pet.birth_date && (
                      <p className="text-xs text-gray-400 mt-1">{age(pet.birth_date)}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600 group-hover:text-brand-dark transition-colors">
                    Otwórz książeczkę
                  </span>
                  <span className="w-8 h-8 rounded-full bg-gray-50 group-hover:bg-brand-dark text-gray-400 group-hover:text-white flex items-center justify-center transition-all group-hover:translate-x-1">
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
