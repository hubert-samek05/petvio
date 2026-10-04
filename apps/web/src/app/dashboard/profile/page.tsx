'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch {}
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const initials = user
    ? `${(user.firstName || 'U')[0]}${(user.lastName || '')[0] || ''}`.toUpperCase()
    : 'U';

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl lg:text-4xl font-semibold text-gray-900 mb-2">Profil</h1>
        <p className="text-gray-500">Twoje dane i ustawienia konta</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-8">
        <div className="flex items-center gap-5 mb-8">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-brand-dark to-brand flex items-center justify-center text-white font-semibold text-2xl">
            {initials}
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">
              {user ? `${user.firstName} ${user.lastName}` : '—'}
            </h2>
            <p className="text-gray-500">{user?.email || ''}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="p-5 rounded-xl bg-gray-50">
            <p className="text-sm text-gray-500 mb-1">Imię</p>
            <p className="font-medium text-gray-900">{user?.firstName || '—'}</p>
          </div>
          <div className="p-5 rounded-xl bg-gray-50">
            <p className="text-sm text-gray-500 mb-1">Nazwisko</p>
            <p className="font-medium text-gray-900">{user?.lastName || '—'}</p>
          </div>
          <div className="p-5 rounded-xl bg-gray-50 sm:col-span-2">
            <p className="text-sm text-gray-500 mb-1">Adres e-mail</p>
            <p className="font-medium text-gray-900">{user?.email || '—'}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Konto</h3>
        <p className="text-sm text-gray-500 mb-6">Zarządzanie sesją i bezpieczeństwem</p>
        <button
          onClick={handleLogout}
          className="px-6 py-3 rounded-full border border-red-200 text-red-600 font-medium hover:bg-red-50 transition-all"
        >
          Wyloguj się
        </button>
      </div>
    </div>
  );
}
