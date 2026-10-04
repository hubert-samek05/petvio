'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';

export default function DashboardNav() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const navItems = [
    { href: '/dashboard', label: 'Panel główny' },
    { href: '/dashboard/pets', label: 'Moje zwierzęta' },
    { href: '/dashboard/health', label: 'Zdrowie' },
    { href: '/dashboard/calendar', label: 'Kalendarz' },
    { href: '/dashboard/profile', label: 'Profil' },
  ];

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/dashboard" className="flex items-center">
            <Image 
              src="/logo.png" 
              alt="Petvio" 
              width={120} 
              height={50}
              className="h-10 w-auto"
            />
          </Link>

          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  (item.href === '/dashboard' && pathname === '/dashboard') ||
                  (item.href === '/dashboard/health' && pathname.startsWith('/dashboard/health')) ||
                  (item.href === '/dashboard/pets' && pathname.startsWith('/dashboard/pets')) ||
                  (item.href !== '/dashboard' && item.href !== '/dashboard/health' && item.href !== '/dashboard/pets' && pathname === item.href)
                    ? 'bg-brand-dark text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <button
            onClick={handleLogout}
            className="text-gray-700 hover:text-brand-dark font-medium text-sm transition-colors"
          >
            Wyloguj
          </button>
        </div>
      </div>
    </nav>
  );
}
