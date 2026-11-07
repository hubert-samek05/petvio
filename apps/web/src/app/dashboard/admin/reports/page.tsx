'use client';
import PageHeader from '@/components/PageHeader';

import { useEffect, useState } from 'react';
import { BarChart3, Download, Calendar } from 'lucide-react';

export default function AdminReportsPage() {
  const [dateRange, setDateRange] = useState('30');

  return (
    <div className="p-6 lg:p-8 space-y-6">
            <PageHeader title="Raporty" description="Analiza danych i statystyki systemu" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="pv-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-brand-light flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-brand-dark" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Nowi użytkownicy</p>
              <p className="text-2xl font-bold text-gray-900">156</p>
            </div>
          </div>
          <p className="text-sm text-brand-dark">+12% vs poprzedni okres</p>
        </div>

        <div className="pv-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-brand-light flex items-center justify-center">
              <Calendar className="w-6 h-6 text-brand-dark" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Aktywne sesje</p>
              <p className="text-2xl font-bold text-gray-900">1,234</p>
            </div>
          </div>
          <p className="text-sm text-brand-dark">+8% vs poprzedni okres</p>
        </div>

        <div className="pv-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-brand-light flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-brand-dark" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Przychód</p>
              <p className="text-2xl font-bold text-gray-900">12,450 zł</p>
            </div>
          </div>
          <p className="text-sm text-brand-dark">+15% vs poprzedni okres</p>
        </div>
      </div>

      <div className="pv-card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Aktywność użytkowników</h2>
        <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
          <p className="text-gray-500">Wykres aktywności użytkowników</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="pv-card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Najpopularniejsze funkcje</h2>
          <div className="space-y-4">
            {[
              { name: 'Książeczka zdrowia', usage: 85 },
              { name: 'Kalendarz', usage: 72 },
              { name: 'Dziennik karmienia', usage: 65 },
              { name: 'Statystyki', usage: 58 },
              { name: 'AI Asystent', usage: 45 },
            ].map((item, index) => (
              <div key={index}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700">{item.name}</span>
                  <span className="text-gray-500">{item.usage}%</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-brand-dark rounded-full" style={{ width: `${item.usage}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pv-card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Geografia użytkowników</h2>
          <div className="space-y-4">
            {[
              { city: 'Warszawa', users: 450 },
              { city: 'Kraków', users: 320 },
              { city: 'Wrocław', users: 280 },
              { city: 'Poznań', users: 250 },
              { city: 'Gdańsk', users: 180 },
            ].map((item, index) => (
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
