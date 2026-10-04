'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  PawPrint,
  Heart,
  Calendar,
  Droplets,
  AlertTriangle,
  Leaf,
  Scan,
  Flame,
  Utensils,
  Apple,
  Dumbbell,
  ChefHat,
  Beef,
  HeartHandshake,
  Stethoscope,
  Building2,
  MapPin,
  Activity,
  Wallet,
  Package,
  ShoppingCart,
  Sparkles,
  Users,
  MessageSquare,
  Baby,
  BarChart3,
  User,
  LogOut,
  type LucideIcon,
} from 'lucide-react';

type NavItem = { href: string; label: string; icon: LucideIcon };

export default function DashboardSidebar() {
  const pathname = usePathname();
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

  const navGroups: { label: string | null; items: NavItem[] }[] = [
    {
      label: null,
      items: [
        { href: '/dashboard', label: 'Panel główny', icon: LayoutDashboard },
        { href: '/dashboard/pets', label: 'Moje zwierzęta', icon: PawPrint },
      ],
    },
    {
      label: 'Zdrowie',
      items: [
        { href: '/dashboard/health', label: 'Książeczka zdrowia', icon: Heart },
        { href: '/dashboard/calendar', label: 'Kalendarz', icon: Calendar },
        { href: '/dashboard/blood-analysis', label: 'Analiza badań krwi', icon: Droplets },
        { href: '/dashboard/first-aid', label: 'Leczenie i pierwsza pomoc', icon: AlertTriangle },
        { href: '/dashboard/herbal-medicine', label: 'Ziołolecznictwo', icon: Leaf },
      ],
    },
    {
      label: 'Dietetyka',
      items: [
        { href: '/dashboard/food-scanner', label: 'Skaner karm', icon: Scan },
        { href: '/dashboard/calorie-calculator', label: 'Kalkulator kalorii', icon: Flame },
        { href: '/dashboard/feeding-log', label: 'Dziennik karmienia', icon: Utensils },
        { href: '/dashboard/special-diets', label: 'Diety specjalistyczne', icon: Apple },
        { href: '/dashboard/sport-diets', label: 'Dietetyka sportowa', icon: Dumbbell },
        { href: '/dashboard/recipes', label: 'Przepisy', icon: ChefHat },
        { href: '/dashboard/barf', label: 'Baza BARF', icon: Beef },
      ],
    },
    {
      label: 'Specjaliści',
      items: [
        { href: '/dashboard/specialists', label: 'Behawiorysta, trener', icon: HeartHandshake },
        { href: '/dashboard/vets', label: 'Weterynarz / dietetyk', icon: Stethoscope },
        { href: '/dashboard/hotels-petsitters', label: 'Hotel / petsitter', icon: Building2 },
      ],
    },
    {
      label: 'Trening i aktywność',
      items: [
        { href: '/dashboard/walk-tracker', label: 'Spacer', icon: MapPin },
        { href: '/dashboard/activity', label: 'Aktywność', icon: Activity },
      ],
    },
    {
      label: 'Finanse',
      items: [
        { href: '/dashboard/budget', label: 'Budżet', icon: Wallet },
        { href: '/dashboard/inventory', label: 'Zapasy', icon: Package },
        { href: '/dashboard/shopping-list', label: 'Lista zakupów', icon: ShoppingCart },
      ],
    },
    {
      label: null,
      items: [
        { href: '/dashboard/ai-assistant', label: 'AI Asystent', icon: Sparkles },
        { href: '/dashboard/lost-pets', label: 'Zaginione', icon: AlertTriangle },
        { href: '/dashboard/adoptions', label: 'Adopcje', icon: Heart },
        { href: '/dashboard/sharing', label: 'Współdzielenie', icon: Users },
        { href: '/dashboard/forum', label: 'Forum', icon: MessageSquare },
        { href: '/dashboard/breeding', label: 'Rozród', icon: Baby },
        { href: '/dashboard/statistics', label: 'Statystyki', icon: BarChart3 },
        { href: '/dashboard/profile', label: 'Profil', icon: User },
      ],
    },
  ];

  const initials = user
    ? `${(user.firstName || 'U')[0]}${(user.lastName || '')[0] || ''}`.toUpperCase()
    : 'U';

  return (
    <aside className="hidden lg:flex fixed top-0 left-0 z-40 h-full w-72 bg-white border-r border-gray-100 flex-col">
      <div className="flex items-center px-6 h-24 border-b border-gray-100">
        <Link href="/dashboard" className="inline-flex items-center">
          <Image src="/logo.png" alt="Petvio" width={88} height={88} className="object-contain" priority />
        </Link>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-6 overflow-y-auto">
        {navGroups.map((group, gi) => (
          <div key={gi} className="space-y-1">
            {group.label && (
              <p className="px-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">{group.label}</p>
            )}
            {group.items.map((item) => {
              const active =
                item.href === '/dashboard'
                  ? pathname === '/dashboard'
                  : item.href === '/dashboard/health'
                  ? pathname.startsWith('/dashboard/health')
                  : item.href === '/dashboard/pets'
                  ? pathname.startsWith('/dashboard/pets')
                  : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    active
                      ? 'bg-brand-dark text-white shadow-md shadow-brand-dark/20'
                      : 'text-gray-600 hover:bg-brand-mint hover:text-brand-dark'
                  }`}
                >
                  <Icon className={`w-[18px] h-[18px] flex-shrink-0 ${active ? 'text-white' : 'text-gray-400 group-hover:text-brand-dark'}`} />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="px-4 py-5 border-t border-gray-100">
        <div className="flex items-center gap-3 px-3 py-2 mb-3">
          <div className="w-10 h-10 rounded-full bg-brand-dark flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">
              {user ? `${user.firstName} ${user.lastName}` : 'Użytkownik'}
            </p>
            <p className="text-xs text-gray-400 truncate">{user?.email || ''}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all"
        >
          <LogOut className="w-4 h-4" />
          Wyloguj się
        </button>
      </div>
    </aside>
  );
}
