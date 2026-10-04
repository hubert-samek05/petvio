'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Syringe, Pill, Shield, Stethoscope } from 'lucide-react';
import { petApi, healthRecordApi } from '@/lib/api';

const CATEGORIES = [
  {
    key: 'vaccination',
    href: 'vaccinations',
    title: 'Szczepienia',
    desc: 'Szczepienia obowiązkowe i dodatkowe',
    accent: '#1B6B4A',
    bg: 'from-[#0F3D2E] to-[#1B6B4A]',
    icon: Syringe,
  },
  {
    key: 'deworming',
    href: 'prevention',
    title: 'Profilaktyka przeciwpasożytnicza',
    desc: 'Odrobaczanie, kleszcze i pchły',
    accent: '#3D9A6A',
    bg: 'from-[#2A8A5C] to-[#3D9A6A]',
    icon: Shield,
  },
  {
    key: 'medication',
    href: 'medications',
    title: 'Leki',
    desc: 'Leki, suplementy i kuracje',
    accent: '#2A8A5C',
    bg: 'from-[#1B6B4A] to-[#2A8A5C]',
    icon: Pill,
  },
  {
    key: 'visit',
    href: 'visits',
    title: 'Wizyty',
    desc: 'Wizyty weterynaryjne i badania',
    accent: '#0F3D2E',
    bg: 'from-[#0F3D2E] to-[#1B6B4A]',
    icon: Stethoscope,
  },
];

export default function PetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const petId = Number(params.id);

  const [pet, setPet] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [petRes, recRes] = await Promise.all([
        petApi.getById(petId),
        healthRecordApi.getByPet(petId),
      ]);
      setPet(petRes.pet || petRes);
      setRecords(recRes.records || []);
    } catch {
      router.push('/dashboard/health');
    } finally {
      setLoading(false);
    }
  }, [petId, router]);

  useEffect(() => {
    if (petId) load();
  }, [petId, load]);

  const formatDate = (d: string) =>
    d ? new Date(d).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

  const age = (birthDate: string) => {
    if (!birthDate) return null;
    const diff = Date.now() - new Date(birthDate).getTime();
    const years = Math.floor(diff / (365.25 * 24 * 3600 * 1000));
    const months = Math.floor((diff / (30.44 * 24 * 3600 * 1000)) % 12);
    if (years === 0) return `${months} mies.`;
    return `${years} ${years === 1 ? 'rok' : years < 5 ? 'lata' : 'lat'}`;
  };

  const now = new Date();
  const countByType = (key: string) => records.filter((r) => r.record_type === key).length;

  const nextForType = (key: string) => {
    const upcoming = records
      .filter((r) => r.record_type === key && r.next_date && new Date(r.next_date) >= now)
      .sort((a, b) => new Date(a.next_date).getTime() - new Date(b.next_date).getTime());
    return upcoming[0] || null;
  };

  const overdueForType = (key: string) =>
    records.filter((r) => r.record_type === key && r.next_date && new Date(r.next_date) < now).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Ładowanie...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Pet header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-dark via-brand to-emerald-800 text-white p-6 sm:p-8 lg:p-10">
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-white/[0.07]"></div>
        <div className="absolute right-32 -bottom-20 w-48 h-48 rounded-full bg-white/[0.05]"></div>
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="w-20 h-20 rounded-3xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center text-3xl font-semibold">
            {pet?.name?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1">
            <h1 className="text-3xl lg:text-4xl font-semibold mb-1">{pet?.name}</h1>
            <p className="text-white/80">
              {pet?.species === 'dog' ? 'Pies' : pet?.species === 'cat' ? 'Kot' : 'Inne'}
              {pet?.breed ? ` · ${pet.breed}` : ''}
              {pet?.gender ? ` · ${pet.gender === 'male' ? 'Samiec' : 'Samica'}` : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {pet?.birth_date && (
              <div className="px-5 py-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 text-center">
                <p className="text-xs text-white/70">Wiek</p>
                <p className="font-semibold">{age(pet.birth_date)}</p>
              </div>
            )}
            {pet?.weight && (
              <div className="px-5 py-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 text-center">
                <p className="text-xs text-white/70">Waga</p>
                <p className="font-semibold">{parseFloat(pet.weight)} kg</p>
              </div>
            )}
            {pet?.microchip_number && (
              <div className="px-5 py-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 text-center">
                <p className="text-xs text-white/70">Mikroczip</p>
                <p className="font-semibold text-sm">{pet.microchip_number}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Health book categories */}
      <div>
        <div className="mb-5">
          <h2 className="text-xl font-semibold text-gray-900">Książeczka zdrowia</h2>
          <p className="text-sm text-gray-500">Wybierz kategorię, aby zobaczyć pełną historię i dodać wpisy</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {CATEGORIES.map((cat) => {
            const count = countByType(cat.key);
            const next = nextForType(cat.key);
            const overdue = overdueForType(cat.key);
            const Icon = cat.icon;
            return (
              <Link
                key={cat.key}
                href={`/dashboard/health/${petId}/${cat.href}`}
                className="group relative overflow-hidden bg-white rounded-3xl border border-gray-200/70 shadow-sm hover:shadow-lg hover:border-brand-dark/30 transition-all"
              >
                <div className={`h-2 bg-gradient-to-r ${cat.bg}`}></div>
                <div className="p-7">
                  <div className="flex items-start justify-between mb-5">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${cat.bg} flex items-center justify-center text-white`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex items-center gap-2">
                      {overdue > 0 && (
                        <span className="px-3 py-1 rounded-full bg-red-50 text-red-600 text-xs font-semibold">
                          {overdue} zaległe
                        </span>
                      )}
                      <span
                        className="px-3 py-1 rounded-full text-xs font-semibold"
                        style={{ backgroundColor: `${cat.accent}14`, color: cat.accent }}
                      >
                        {count} {count === 1 ? 'wpis' : 'wpisów'}
                      </span>
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-brand-dark transition-colors">
                    {cat.title}
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">{cat.desc}</p>
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    {next ? (
                      <p className="text-sm text-gray-600">
                        <span className="font-medium" style={{ color: cat.accent }}>Najbliższy termin:</span>{' '}
                        {formatDate(next.next_date)}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-400">Brak nadchodzących terminów</p>
                    )}
                    <span className="text-gray-300 group-hover:text-brand-dark group-hover:translate-x-1 transition-all">→</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

    </div>
  );
}
