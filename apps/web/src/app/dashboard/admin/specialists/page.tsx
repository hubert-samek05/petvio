'use client';
import PageHeader from '@/components/PageHeader';

import { useEffect, useState } from 'react';
import { Shield, CheckCircle, XCircle, Clock, Search, Filter } from 'lucide-react';
import { api } from '@/lib/api';

export default function AdminSpecialistsPage() {
  const [specialists, setSpecialists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadSpecialists();
  }, [filter]);

  const loadSpecialists = async () => {
    try {
      const response = await api.get('/api/specialists/admin/pending');
      const specialistsData = response.data?.specialists || [];
      setSpecialists(Array.isArray(specialistsData) ? specialistsData : []);
    } catch (error) {
      console.error('Error loading specialists:', error);
      setSpecialists([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: number) => {
    try {
      await api.put(`/api/specialists/${id}/approve`);
      loadSpecialists();
    } catch (error) {
      console.error('Error approving specialist:', error);
    }
  };

  const handleReject = async (id: number) => {
    const notes = prompt('Podaj powód odrzucenia:');
    if (!notes) return;
    
    try {
      await api.put(`/api/specialists/${id}/reject`, { admin_notes: notes });
      loadSpecialists();
    } catch (error) {
      console.error('Error rejecting specialist:', error);
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
    const labels: Record<string, string> = {
      behaviorist: 'Behawiorysta',
      trainer: 'Trener',
      zoopsychologist: 'Zoopsycholog',
      dietitian: 'Dietetyk',
      hotel: 'Hotel',
      petsitter: 'Petsitter',
    };
    return labels[type] || type;
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
            <PageHeader title="Weryfikacja specjalistów" description="Zatwierdzaj lub odrzucaj zgłoszenia specjalistów" />
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Szukaj specjalisty..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === status
                  ? 'bg-purple-600 text-white'
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
        ) : specialists.length === 0 ? (
          <div className="col-span-2 text-center py-12 bg-white rounded-xl border border-gray-200">
            <Shield className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-600 font-medium">Brak zgłoszeń</p>
            <p className="text-sm text-gray-500 mt-1">Nie ma żadnych zgłoszeń do weryfikacji</p>
          </div>
        ) : (
          specialists.map((specialist) => (
            <div key={specialist.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-gray-900">{specialist.name}</h3>
                    {getStatusBadge(specialist.status)}
                  </div>
                  <p className="text-sm text-gray-600">
                    {getTypeLabel(specialist.specialist_type)}
                    {specialist.species === 'dog' && ' - Pies'}
                    {specialist.species === 'cat' && ' - Kot'}
                    {specialist.species === 'both' && ' - Psy i Koty'}
                  </p>
                </div>
              </div>

              {specialist.description && (
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{specialist.description}</p>
              )}

              <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-4">
                {specialist.city && (
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-gray-300"></span>
                    {specialist.city}
                  </span>
                )}
                {specialist.phone && (
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-gray-300"></span>
                    {specialist.phone}
                  </span>
                )}
                {specialist.email && (
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-gray-300"></span>
                    {specialist.email}
                  </span>
                )}
              </div>

              {specialist.status === 'pending' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(specialist.id)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-dark text-white hover:bg-brand transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Zatwierdź
                  </button>
                  <button
                    onClick={() => handleReject(specialist.id)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                    Odrzuć
                  </button>
                </div>
              )}

              {specialist.admin_notes && (
                <div className="mt-4 p-3 bg-red-50 rounded-lg">
                  <p className="text-sm text-red-700">
                    <strong>Notatka admina:</strong> {specialist.admin_notes}
                  </p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
