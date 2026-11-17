'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  Dog, 
  Shield, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  LogOut,
  Menu,
  X,
  Settings,
  FileText,
  CreditCard,
  MessageSquare,
  Building2,
  BarChart3
} from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        if (parsedUser.role !== 'admin') {
          router.push('/dashboard');
        }
      } catch {}
    } else {
      router.push('/welcome');
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/welcome');
  };

  const navItems = [
    { href: '/dashboard/admin', label: 'Panel główny', icon: LayoutDashboard },
    { href: '/dashboard/admin/users', label: 'Użytkownicy', icon: Users },
    { href: '/dashboard/admin/pets', label: 'Zwierzęta', icon: Dog },
    { href: '/dashboard/admin/specialists', label: 'Specjaliści', icon: Shield },
    { href: '/dashboard/admin/subscriptions', label: 'Subskrypcje', icon: CreditCard },
    { href: '/dashboard/admin/forum', label: 'Forum', icon: MessageSquare },
    { href: '/dashboard/admin/places', label: 'Hotele/Petsitterzy', icon: Building2 },
    { href: '/dashboard/admin/blog', label: 'Blog', icon: FileText },
    { href: '/dashboard/admin/reports', label: 'Raporty', icon: BarChart3 },
    { href: '/dashboard/admin/settings', label: 'Ustawienia', icon: Settings },
  ];

  const isActive = (href: string) => {
    if (href === '/dashboard/admin') {
      return pathname === '/dashboard/admin';
    }
    return pathname.startsWith(href);
  };

  const initials = user
    ? `${(user.firstName || 'A')[0]}${(user.lastName || '')[0] || ''}`.toUpperCase()
    : 'A';

  return (
    <div className="min-h-screen bg-brand-cream">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed top-0 left-0 z-40 h-full w-64 bg-brand-dark flex-col">
        <div className="flex items-center px-6 h-16 border-b border-white/10">
          <Link href="/dashboard/admin" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Petvio</p>
              <p className="text-white/60 text-xs">Admin Panel</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive(item.href)
                    ? 'bg-brand text-white'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-3 py-2 mb-3">
            <div className="w-10 h-10 rounded-full bg-brand flex items-center justify-center text-white font-semibold text-sm">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {user ? `${user.firstName} ${user.lastName}` : 'Administrator'}
              </p>
              <p className="text-xs text-white/60 truncate">{user?.email || ''}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white transition-all"
          >
            <LogOut className="w-5 h-5" />
            Wyloguj się
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-brand-dark border-b border-white/10">
        <div className="flex items-center justify-between px-4 h-16">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 rounded-lg text-white/80 hover:bg-white/10 hover:text-white"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Petvio</p>
              <p className="text-white/60 text-xs">Admin</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg text-white/80 hover:bg-white/10 hover:text-white"
          >
            <LogOut className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-brand-dark p-4">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <span className="text-white font-semibold">Admin Panel</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-lg text-white/80 hover:bg-white/10 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      isActive(item.href)
                        ? 'bg-brand text-white'
                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="lg:ml-64 pt-16 lg:pt-0">
        {children}
      </main>
    </div>
  );
}
