'use client';
import PageHeader from '@/components/PageHeader';

import { useEffect, useState } from 'react';
import { BarChart3, Users, Dog, MessageSquare, Banknote } from 'lucide-react';
import { api } from '@/lib/api';

export default function AdminReportsPage() {
  const [dateRange, setDateRange] = useState('30');
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReport();
  }, [dateRange]);

  const loadReport = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/admin/reports?days=${dateRange}`);
      setReport(response.data);
    } catch (error) {
      console.error('Error loading report:', error);
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  const fmtPln = (grosz: number) => `${((grosz || 0) / 100).toLocaleString('pl-PL')} zł`;
  const pctLabel = (p: number) => `${p >= 0 ? '+' : ''}${p}% vs poprzedni okres`;
  const usage = report?.usage || [];
  const maxUsage = Math.max(1, ...usage.map((u: any) => u.c));

  return (
    <div className="p-6 lg:p-8 space-y-6">
            <PageHeader title="Raporty" description="Analiza danych i statystyki systemu" />
      <div className="flex items-center gap-2">
        {(['7', '30', '90'] as const).map((d) => (
          <button
            key={d}
            onClick={() => setDateRange(d)}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              dateRange === d
                ? 'bg-brand-dark text-white'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {d} dni
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="pv-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-brand-light flex items-center justify-center">
              <Users className="w-6 h-6 text-brand-dark" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Nowi użytkownicy</p>
              <p className="text-2xl font-bold text-gray-900">{loading ? '—' : report?.users?.new ?? 0}</p>
            </div>
          </div>
          <p className="text-sm text-brand-dark">{pctLabel(report?.users?.pctChange ?? 0)}</p>
        </div>

        <div className="pv-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-brand-light flex items-center justify-center">
              <Dog className="w-6 h-6 text-brand-dark" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Nowe zwierzęta</p>
              <p className="text-2xl font-bold text-gray-900">{loading ? '—' : report?.pets?.new ?? 0}</p>
            </div>
          </div>
        </div>

        <div className="pv-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-brand-light flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-brand-dark" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Nowe posty forum</p>
              <p className="text-2xl font-bold text-gray-900">{loading ? '—' : report?.forumPosts?.new ?? 0}</p>
            </div>
          </div>
        </div>

        <div className="pv-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-brand-light flex items-center justify-center">
              <Banknote className="w-6 h-6 text-brand-dark" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Przychód</p>
              <p className="text-2xl font-bold text-gray-900">{loading ? '—' : fmtPln(report?.revenueGrosz ?? 0)}</p>
            </div>
          </div>
          <p className="text-sm text-brand-dark">{pctLabel(report?.revenuePctChange ?? 0)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="pv-card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Najpopularniejsze funkcje</h2>
          <div className="space-y-4">
            {usage.map((item: any, index: number) => (
              <div key={index}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700">{item.feature}</span>
                  <span className="text-gray-500">{item.c}</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-brand-dark rounded-full" style={{ width: `${Math.round((item.c / maxUsage) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pv-card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Geografia użytkowników</h2>
          <div className="space-y-4">
            {(report?.topCities || []).map((item: any, index: number) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-gray-700">{item.city}</span>
                <span className="text-gray-500 font-medium">{item.users} użytkowników</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
