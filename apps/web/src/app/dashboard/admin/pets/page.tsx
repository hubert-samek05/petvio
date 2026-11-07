'use client';
import PageHeader from '@/components/PageHeader';

import { useEffect, useState } from 'react';
import { Dog, Search, User } from 'lucide-react';
import { api } from '@/lib/api';

export default function AdminPetsPage() {
  const [pets, setPets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadPets();
  }, [page, search]);

  const loadPets = async () => {
    try {
      const response = await api.get(`/api/pets/admin/all?page=${page}&limit=20&search=${search}`);
      const petsData = response.data?.pets || [];
      setPets(Array.isArray(petsData) ? petsData : []);
      setTotal(response.data?.total || 0);
    } catch (error) {
      console.error('Error loading pets:', error);
      setPets([]);
    } finally {
      setLoading(false);
    }
  };

  const getSpeciesLabel = (species: string) => {
    return species === 'dog' ? 'Pies' : species === 'cat' ? 'Kot' : species;
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
            <PageHeader title="Zarządzanie zwierzętami" description="Przeglądaj wszystkie zwierzęta w systemie" />
      <div className="pv-card">
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Szukaj zwierzęcia..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Zwierzę</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Gatunek</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Rasa</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Właściciel</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Data dodania</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">Ładowanie...</td>
                </tr>
              ) : pets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">Brak zwierząt</td>
                </tr>
              ) : (
                pets.map((pet) => (
                  <tr key={pet.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-brand-light flex items-center justify-center">
                          <Dog className="w-5 h-5 text-brand-dark" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{pet.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{getSpeciesLabel(pet.species)}</td>
                    <td className="px-6 py-4 text-gray-600">{pet.breed || '-'}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">{pet.first_name} {pet.last_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {new Date(pet.created_at).toLocaleDateString('pl-PL')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {total > 20 && (
          <div className="p-4 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Pokazano {(page - 1) * 20 + 1}-{Math.min(page * 20, total)} z {total}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
              >
                Poprzednia
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page * 20 >= total}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
              >
                Następna
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
