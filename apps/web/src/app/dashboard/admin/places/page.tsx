'use client';
import PageHeader from '@/components/PageHeader';

import { useEffect, useState } from 'react';
import { Building2, CheckCircle, XCircle, Clock, Search, Filter } from 'lucide-react';
import { api } from '@/lib/api';

export default function AdminPlacesPage() {
  const [places, setPlaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadPlaces();
  }, [filter]);

  const loadPlaces = async () => {
    try {
      const response = await api.get('/api/admin/places');
      const placesData = response.data?.places || [];
      setPlaces(Array.isArray(placesData) ? placesData : []);
    } catch (error) {
      console.error('Error loading places:', error);
      setPlaces([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: number) => {
    try {
      await api.put(`/api/places/${id}/approve`);
      loadPlaces();
    } catch (error) {
      console.error('Error approving place:', error);
    }
  };

  const handleReject = async (id: number) => {
    const notes = prompt('Podaj powód odrzucenia:');
    if (!notes) return;
    
    try {
      await api.put(`/api/places/${id}/reject`, { admin_notes: notes });
      loadPlaces();
    } catch (error) {
      console.error('Error rejecting place:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">Oczekuje</span>;
      case 'approved':
        return <span className="px-3 py-1 rounded-full bg-brand-light text-brand-dark text-xs font-medium">Zatwierdzony</span>;
      case 'rejected':
        return <span className="px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-medium">Odrzucony</span>;
      default:
        return <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">{status}</span>;
    }
  };

  const getTypeLabel = (type: string) => {
    return type === 'hotel' ? 'Hotel' : type === 'petsitter' ? 'Petsitter' : type;
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
            <PageHeader title="Hotele i Petsitterzy" description="Weryfikuj zgłoszenia hoteli i petsitterów" />
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Szukaj miejsca..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-dark"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === status
                  ? 'bg-brand-dark text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {status === 'all' && 'Wszystkie'}
              {status === 'pending' && 'Oczekujące'}
              {status === 'approved' && 'Zatwierdzone'}
              {status === 'rejected' && 'Odrzucone'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-2 text-center py-8 text-gray-500">Ładowanie...</div>
        ) : places.length === 0 ? (
          <div className="col-span-2 text-center py-12 bg-white rounded-xl border border-gray-200">
            <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-600 font-medium">Brak zgłoszeń</p>
            <p className="text-sm text-gray-500 mt-1">Nie ma żadnych zgłoszeń do weryfikacji</p>
          </div>
        ) : (
          places.map((place) => (
            <div key={place.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-gray-900">{place.name}</h3>
                    {getStatusBadge(place.status)}
                  </div>
                  <p className="text-sm text-gray-600">{getTypeLabel(place.type)}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-gray-300"></span>
                  {place.first_name} {place.last_name}
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-gray-300"></span>
                  {place.email}
                </span>
              </div>

              {place.status === 'pending' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(place.id)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-dark text-white hover:bg-brand transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Zatwierdź
                  </button>
                  <button
                    onClick={() => handleReject(place.id)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                    Odrzuć
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
