'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { usePathname, useRouter } from 'next/navigation';
import ComingSoonModal from '@/components/ComingSoonModal';
import { unregisterPush } from '@/lib/push';
import { usePlan } from '@/lib/plan';
import {
  LayoutDashboard,
  PawPrint,
  ShoppingBag,
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
  MessagesSquare,
  Newspaper,
  Baby,
  BarChart3,
  User,
  LogOut,
  Crown,
  Lock,
  type LucideIcon,
} from 'lucide-react';

type NavItem = { href: string; label: string; icon: LucideIcon; tint: string; soon?: boolean; premium?: string };

/* Miękkie, przyjazne tła ikon — wszystkie w rodzinie kolorystycznej marki */
const T = {
  forest: 'bg-brand-dark text-white',
  green: 'bg-brand text-white',
  mint: 'bg-brand-mint text-brand-dark',
  light: 'bg-brand-light text-brand-dark',
  peach: 'bg-brand-peach text-brand-dark',
};

export default function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [soonOpen, setSoonOpen] = useState(false);
  const { info, openUpgrade } = usePlan();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch {}
    }
  }, []);

  const handleLogout = async () => {
    await unregisterPush();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/welcome');
  };

  const navGroups: { label: string | null; items: NavItem[] }[] = [
    {
      label: null,
      items: [
        { href: '/dashboard', label: 'Panel główny', icon: LayoutDashboard, tint: T.forest },
        { href: '/dashboard/pets', label: 'Moje zwierzęta', icon: PawPrint, tint: T.peach },
        { href: '/dashboard/shop', label: 'Sklep', icon: ShoppingBag, tint: T.green },
        { href: '/dashboard/subscription', label: 'Subskrypcja', icon: Crown, tint: T.peach },
      ],
    },
    {
      label: 'Zdrowie',
      items: [
        { href: '/dashboard/health', label: 'Książeczka zdrowia', icon: Heart, tint: T.mint },
        { href: '/dashboard/calendar', label: 'Kalendarz', icon: Calendar, tint: T.light },
        { href: '/dashboard/blood-analysis', label: 'Analiza badań krwi', icon: Droplets, tint: T.mint, premium: 'blood' },
        { href: '/dashboard/first-aid', label: 'Pierwsza pomoc', icon: AlertTriangle, tint: T.peach },
        { href: '/dashboard/herbal-medicine', label: 'Ziołolecznictwo', icon: Leaf, tint: T.light },
      ],
    },
    {
      label: 'Dietetyka',
      items: [
        { href: '/dashboard/food-scanner', label: 'Skaner karm', icon: Scan, tint: T.light, soon: true },
        { href: '/dashboard/calorie-calculator', label: 'Kalkulator kalorii', icon: Flame, tint: T.peach },
        { href: '/dashboard/feeding-log', label: 'Dziennik karmienia', icon: Utensils, tint: T.mint },
        { href: '/dashboard/special-diets', label: 'Diety specjalistyczne', icon: Apple, tint: T.light },
        { href: '/dashboard/sport-diets', label: 'Dietetyka sportowa', icon: Dumbbell, tint: T.mint },
        { href: '/dashboard/recipes', label: 'Przepisy', icon: ChefHat, tint: T.peach },
        { href: '/dashboard/barf', label: 'Baza BARF', icon: Beef, tint: T.light, premium: 'barf' },
      ],
    },
    {
      label: 'Specjaliści',
      items: [
        { href: '/dashboard/specialists', label: 'Behawiorysta, trener', icon: HeartHandshake, tint: T.peach },
        { href: '/dashboard/vets', label: 'Weterynarz / dietetyk', icon: Stethoscope, tint: T.mint },
        { href: '/dashboard/hotels-petsitters', label: 'Hotel / petsitter', icon: Building2, tint: T.light },
      ],
    },
    {
      label: 'Aktywność',
      items: [
        { href: '/dashboard/walk-tracker', label: 'Spacer', icon: MapPin, tint: T.mint },
        { href: '/dashboard/activity', label: 'Aktywność', icon: Activity, tint: T.light },
        { href: '/dashboard/statistics', label: 'Statystyki', icon: BarChart3, tint: T.mint },
      ],
    },
    {
      label: 'Finanse',
      items: [
        { href: '/dashboard/budget', label: 'Budżet', icon: Wallet, tint: T.peach },
        { href: '/dashboard/inventory', label: 'Zapasy', icon: Package, tint: T.light },
        { href: '/dashboard/shopping-list', label: 'Lista zakupów', icon: ShoppingCart, tint: T.mint },
      ],
    },
    {
      label: 'Społeczność',
      items: [
        { href: '/dashboard/ai-assistant', label: 'AI Asystent', icon: Sparkles, tint: T.peach },
        { href: '/dashboard/lost-pets', label: 'Zaginione', icon: AlertTriangle, tint: T.light },
        { href: '/dashboard/adoptions', label: 'Adopcje', icon: Heart, tint: T.mint },
        { href: '/dashboard/sharing', label: 'Współdzielenie', icon: Users, tint: T.light },
        { href: '/dashboard/community', label: 'PetvioBook', icon: Newspaper, tint: T.light },
        { href: '/dashboard/messages', label: 'Messenger', icon: MessagesSquare, tint: T.mint },
        { href: '/dashboard/groups', label: 'Grupy', icon: Users, tint: T.peach },
        { href: '/dashboard/forum', label: 'Forum', icon: MessageSquare, tint: T.mint },
        { href: '/dashboard/breeding', label: 'Rozród', icon: Baby, tint: T.peach, premium: 'breeding' },
        { href: '/dashboard/profile', label: 'Profil', icon: User, tint: T.light },
      ],
    },
  ];

  const initials = user
    ? `${(user.firstName || 'U')[0]}${(user.lastName || '')[0] || ''}`.toUpperCase()
    : 'U';

  return (
    <>
    <aside className="hidden lg:flex fixed top-0 left-0 z-40 h-full w-72 bg-white/80 backdrop-blur-xl border-r border-gray-100/80 flex-col">
      {/* Logo */}
      <div className="flex items-center px-6 h-20 border-b border-gray-100/80">
        <Link href="/dashboard" className="inline-flex items-center gap-2.5">
          <Image src="/logo.png" alt="Petvio" width={80} height={80} className="object-contain" priority />
        </Link>
      </div>

      {/* Nawigacja */}
      <nav className="flex-1 px-4 py-5 space-y-6 overflow-y-auto">
        {navGroups.map((group, gi) => (
          <div key={gi} className="space-y-1">
            {group.label && (
              <p className="px-4 pb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-brand/60">
                {group.label}
              </p>
            )}
            {group.items.map((item) => {
              const active =
                item.href === '/dashboard'
                  ? pathname === '/dashboard'
                  : pathname.startsWith(item.href);
              const Icon = item.icon;
              if (item.soon) {
                return (
                  <button
                    key={item.href}
                    type="button"
                    onClick={() => setSoonOpen(true)}
                    className="group relative w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium text-gray-400 hover:bg-gray-50 transition-all duration-200 opacity-70"
                  >
                    <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-gray-100 text-gray-400">
                      <Icon className="w-[17px] h-[17px]" />
                    </span>
                    <span className="truncate">{item.label}</span>
                    <span className="ml-auto px-1.5 h-4.5 py-0.5 rounded-full bg-gray-200 text-gray-500 text-[9px] font-bold uppercase tracking-wide flex-shrink-0">
                      wkrótce
                    </span>
                  </button>
                );
              }
              if (item.premium && info && info.features?.[item.premium]?.unlocked === false) {
                return (
                  <button
                    key={item.href}
                    type="button"
                    onClick={() => openUpgrade({ code: 'PREMIUM_FEATURE', feature: item.premium })}
                    className="group relative w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium text-gray-500 hover:bg-brand-peach/40 hover:text-brand-dark transition-all duration-200"
                  >
                    <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-gray-100 text-gray-400 group-hover:bg-brand-peach group-hover:text-brand-dark transition-all">
                      <Icon className="w-[17px] h-[17px]" />
                    </span>
                    <span className="truncate">{item.label}</span>
                    <span className="ml-auto inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-brand-peach text-brand-dark text-[9px] font-bold uppercase tracking-wide flex-shrink-0">
                      <Lock className="w-2.5 h-2.5" />
                      Premium
                    </span>
                  </button>
                );
              }
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium transition-all duration-200 ${
                    active
                      ? 'bg-brand-mint text-brand-dark'
                      : 'text-gray-500 hover:bg-gray-50 hover:text-brand-dark'
                  }`}
                >
                  {/* Wskaźnik aktywnej pozycji */}
                  {active && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-gradient-to-b from-brand to-brand-dark animate-scale-in" />
                  )}
                  <span
                    className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                      active ? item.tint : 'bg-gray-100 text-gray-400 group-hover:bg-brand-mint group-hover:text-brand-dark'
                    }`}
                  >
                    <Icon className="w-[17px] h-[17px]" />
                  </span>
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Stopka z użytkownikiem */}
      <div className="px-4 py-5 border-t border-gray-100/80">
        {info && (
          <Link
            href="/dashboard/subscription"
            className="flex items-center gap-2.5 px-3 py-2.5 mb-3 rounded-2xl bg-brand-cream border border-brand-light/60 hover:border-brand-light transition-colors"
          >
            <span className="w-8 h-8 rounded-xl bg-brand-peach flex items-center justify-center flex-shrink-0">
              <Crown className="w-4 h-4 text-brand-dark" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-bold text-gray-800 truncate">{info.planName}</span>
              <span className="block text-[11px] text-gray-400 truncate">
                {info.isAdmin
                  ? 'Konto administratora'
                  : info.isTrial
                  ? 'Okres próbny'
                  : info.plan === 'mini'
                  ? 'Ulepsz plan'
                  : 'Aktywny plan'}
              </span>
            </span>
          </Link>
        )}
        <div className="flex items-center gap-3 px-2 py-2 mb-2">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 shadow-md"
            style={{ background: 'linear-gradient(135deg, #1B6B4A, #0F3D2E)' }}
          >
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
          className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 active:scale-[0.98] transition-all"
        >
          <LogOut className="w-4 h-4" />
          Wyloguj się
        </button>
      </div>
    </aside>
    {typeof window !== 'undefined' && soonOpen && createPortal(<ComingSoonModal open={soonOpen} onClose={() => setSoonOpen(false)} />, document.body)}
    </>
  );
}
