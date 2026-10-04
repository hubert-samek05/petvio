'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Bell, Plus } from 'lucide-react';

export default function DashboardTopbar() {
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

  const initials = user
    ? `${(user.firstName || 'U')[0]}${(user.lastName || '')[0] || ''}`.toUpperCase()
    : 'U';

  return (
    <header className="sticky top-0 z-30 lg:pl-72 bg-brand-cream/80 backdrop-blur-md border-b border-gray-100">
      <div className="flex items-center gap-3 px-4 sm:px-6 lg:px-10 h-16 lg:h-20">
        <div className="hidden sm:flex flex-1 max-w-md items-center gap-2 bg-white border border-gray-200 rounded-full px-4 py-2.5 text-sm text-gray-400 focus-within:border-brand-dark transition-colors">
          <Search className="w-4 h-4 flex-shrink-0" />
          <input
            type="text"
            placeholder="Szukaj w Petvio..."
            className="w-full bg-transparent outline-none text-gray-700 placeholder:text-gray-400"
          />
        </div>

        <div className="flex-1 sm:hidden" />

        <div className="flex items-center gap-2 sm:gap-3 ml-auto">
          <Link
            href="/dashboard/pets/new"
            className="hidden md:inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-brand-dark text-white text-sm font-semibold hover:bg-brand transition-colors shadow-sm shadow-brand-dark/20"
          >
            <Plus className="w-4 h-4" />
            Dodaj zwierzę
          </Link>

          <button className="relative w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-brand-dark hover:border-brand-dark transition-colors">
            <Bell className="w-[18px] h-[18px]" />
            <span className="absolute top-2 right-2.5 w-1.5 h-1.5 rounded-full bg-brand-peach"></span>
          </button>

          <Link
            href="/dashboard/profile"
            className="w-10 h-10 rounded-full bg-brand-dark flex items-center justify-center text-white font-semibold text-sm flex-shrink-0"
          >
            {initials}
          </Link>
        </div>
      </div>
    </header>
  );
}
