'use client';
import PageHeader from '@/components/PageHeader';

import { useEffect, useState } from 'react';
import { Shield, Users, Dog, AlertCircle, CheckCircle, Clock, TrendingUp, Activity, Eye } from 'lucide-react';
import { api } from '@/lib/api';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    users: 0,
    pets: 0,
    pendingSpecialists: 0,
    approvedSpecialists: 0,
    totalSpecialists: 0,
    todayRegistrations: 0,
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [usersRes, petsRes, specialistsRes] = await Promise.all([
        api.get('/api/users/count'),
        api.get('/api/users/pets/count'),
        api.get('/api/specialists/admin/pending'),
      ]);

      const specialistsData = specialistsRes.data?.specialists || [];

      setStats({
        users: usersRes.data?.count || 0,
        pets: petsRes.data?.count || 0,
        pendingSpecialists: specialistsData.length || 0,
        approvedSpecialists: 0,
        totalSpecialists: specialistsData.length || 0,
        todayRegistrations: 0,
      });

      setRecentActivity(specialistsData.slice(0, 5) || []);
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Użytkownicy',
      value: stats.users,
      icon: Users,
      color: 'bg-brand-dark',
    },
    {
      title: 'Zwierzęta',
      value: stats.pets,
      icon: Dog,
      color: 'bg-brand-dark',
    },
    {
      title: 'Oczekujące zgłoszenia',
      value: stats.pendingSpecialists,
      icon: Clock,
      color: 'bg-amber-500',
    },
    {
      title: 'Specjaliści',
      value: stats.totalSpecialists,
      icon: Shield,
      color: 'bg-brand-dark',
    },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
            <PageHeader title="Panel Administratora" description="Przegląd systemu i zarządzanie" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-lg ${stat.color} flex items-center justify-center`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900">{loading ? '—' : stat.value}</p>
              <p className="text-sm text-gray-500 mt-1">{stat.title}</p>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Szybkie akcje</h2>
          </div>
          <div className="p-6 grid grid-cols-2 gap-4">
            <a href="/dashboard/admin/users" className="p-4 rounded-lg border border-gray-200 hover:border-brand-dark hover:bg-brand-mint transition-all group">
              <Users className="w-6 h-6 text-brand-dark mb-2" />
              <p className="font-medium text-gray-900">Zarządzaj użytkownikami</p>
              <p className="text-sm text-gray-500 mt-1">Przeglądaj i edytuj konta</p>
            </a>
            <a href="/dashboard/admin/specialists" className="p-4 rounded-lg border border-gray-200 hover:border-purple-500 hover:bg-brand-mint transition-all group">
              <Shield className="w-6 h-6 text-brand-dark mb-2" />
              <p className="font-medium text-gray-900">Weryfikuj specjalistów</p>
              <p className="text-sm text-gray-500 mt-1">Zatwierdzaj zgłoszenia</p>
            </a>
            <a href="/dashboard/admin/pets" className="p-4 rounded-lg border border-gray-200 hover:border-emerald-500 hover:bg-brand-mint transition-all group">
              <Dog className="w-6 h-6 text-brand-dark mb-2" />
              <p className="font-medium text-gray-900">Przeglądaj zwierzęta</p>
              <p className="text-sm text-gray-500 mt-1">Baza zwierząt</p>
            </a>
            <a href="/dashboard/admin/reports" className="p-4 rounded-lg border border-gray-200 hover:border-amber-500 hover:bg-amber-50 transition-all group">
              <Activity className="w-6 h-6 text-amber-500 mb-2" />
              <p className="font-medium text-gray-900">Raporty</p>
              <p className="text-sm text-gray-500 mt-1">Analiza danych</p>
            </a>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Status systemu</h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">API</span>
              <span className="flex items-center gap-2 text-sm font-medium text-brand-dark">
                <span className="w-2 h-2 rounded-full bg-brand-dark"></span>
                Online
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Baza danych</span>
              <span className="flex items-center gap-2 text-sm font-medium text-brand-dark">
                <span className="w-2 h-2 rounded-full bg-brand-dark"></span>
                Połączona
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Serwer</span>
              <span className="flex items-center gap-2 text-sm font-medium text-brand-dark">
                <span className="w-2 h-2 rounded-full bg-brand-dark"></span>
                Aktywny
              </span>
            </div>
            <div className="pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500">Ostatnia aktualizacja: {new Date().toLocaleString('pl-PL')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Specialists Alert */}
      {stats.pendingSpecialists > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-6 h-6 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900 mb-1">
                {stats.pendingSpecialists} oczekujących zgłoszeń specjalistów
              </h3>
              <p className="text-sm text-amber-700 mb-3">
                Wymagają weryfikacji przed publikacją w systemie.
              </p>
              <a
                href="/dashboard/admin/specialists"
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors"
              >
                <Eye className="w-4 h-4" />
                Przeglądaj zgłoszenia
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
