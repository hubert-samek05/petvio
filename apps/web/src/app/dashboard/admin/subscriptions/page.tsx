'use client';
import PageHeader from '@/components/PageHeader';

import { useEffect, useState } from 'react';
import { CreditCard, Calendar, CheckCircle, XCircle, Clock } from 'lucide-react';
import { api } from '@/lib/api';

export default function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const loadSubscriptions = async () => {
    try {
      const response = await api.get('/api/admin/subscriptions');
      const subscriptionsData = response.data?.subscriptions || [];
      setSubscriptions(Array.isArray(subscriptionsData) ? subscriptionsData : []);
    } catch (error) {
      console.error('Error loading subscriptions:', error);
      setSubscriptions([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="px-3 py-1 rounded-full bg-brand-light text-brand-dark text-xs font-medium">Aktywna</span>;
      case 'cancelled':
        return <span className="px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-medium">Anulowana</span>;
      case 'expired':
        return <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">Wygasła</span>;
      case 'pending':
        return <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">Oczekuje</span>;
      default:
        return <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">{status}</span>;
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
            <PageHeader title="Subskrypcje" description="Zarządzaj subskrypcjami użytkowników" />
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Użytkownik</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Plan</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Data rozpoczęcia</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Data zakończenia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">Ładowanie...</td>
                </tr>
              ) : subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">Brak subskrypcji</td>
                </tr>
              ) : (
                subscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{sub.first_name} {sub.last_name}</p>
                        <p className="text-sm text-gray-500">{sub.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{sub.plan || '-'}</td>
                    <td className="px-6 py-4">{getStatusBadge(sub.status)}</td>
                    <td className="px-6 py-4 text-gray-600">
                      {sub.start_date ? new Date(sub.start_date).toLocaleDateString('pl-PL') : '-'}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {sub.end_date ? new Date(sub.end_date).toLocaleDateString('pl-PL') : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
