'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import ComingSoonModal from '@/components/ComingSoonModal';
import { usePlan } from '@/lib/plan';
import { unregisterPush } from '@/lib/push';
import {
  LayoutDashboard,
  PawPrint,
  ShoppingBag,
  Heart,
  Calendar,
  User,
  LogOut,
  X,
  Menu,
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
  Droplets,
  AlertTriangle,
  Wallet,
  Package,
  ShoppingCart,
  BarChart3,
  Baby,
  MessageSquare,
  MessagesSquare,
  Newspaper,
  Users,
  Leaf,
  Sparkles,
  PlusCircle,
  Search,
  Crown,
  Lock,
} from 'lucide-react';

export type MenuItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  color?: string;
  soon?: boolean;
  premium?: string;
};

type Group = { label: string; items: MenuItem[] };

const GROUPS: Group[] = [
  {
    label: 'Główne',
    items: [
      { href: '/dashboard', label: 'Panel główny', icon: LayoutDashboard },
      { href: '/dashboard/pets', label: 'Moje zwierzęta', icon: PawPrint },
      { href: '/dashboard/shop', label: 'Sklep', icon: ShoppingBag },
      { href: '/dashboard/calendar', label: 'Kalendarz', icon: Calendar },
      { href: '/dashboard/pets/new', label: 'Dodaj zwierzę', icon: PlusCircle },
      { href: '/dashboard/subscription', label: 'Subskrypcja', icon: Crown },
    ],
  },
  {
    label: 'Zdrowie',
    items: [
      { href: '/dashboard/health', label: 'Książeczka zdrowia', icon: Heart },
      { href: '/dashboard/blood-analysis', label: 'Analiza krwi', icon: Droplets, premium: 'blood' },
      { href: '/dashboard/first-aid', label: 'Pierwsza pomoc', icon: AlertTriangle },
      { href: '/dashboard/herbal-medicine', label: 'Zioła', icon: Leaf },
    ],
  },
  {
    label: 'Dietetyka',
    items: [
      { href: '/dashboard/food-scanner', label: 'Skaner karm', icon: Scan, soon: true },
      { href: '/dashboard/calorie-calculator', label: 'Kalorie', icon: Flame },
      { href: '/dashboard/feeding-log', label: 'Karmienie', icon: Utensils },
      { href: '/dashboard/special-diets', label: 'Diety specjalne', icon: Apple },
      { href: '/dashboard/sport-diets', label: 'Diety sportowe', icon: Dumbbell },
      { href: '/dashboard/recipes', label: 'Przepisy', icon: ChefHat },
      { href: '/dashboard/barf', label: 'BARF', icon: Beef, premium: 'barf' },
    ],
  },
  {
    label: 'Specjaliści',
    items: [
      { href: '/dashboard/specialists', label: 'Behawiorysta', icon: HeartHandshake },
      { href: '/dashboard/vets', label: 'Weterynarz', icon: Stethoscope },
      { href: '/dashboard/hotels-petsitters', label: 'Hotel / petsitter', icon: Building2 },
    ],
  },
  {
    label: 'Aktywność',
    items: [
      { href: '/dashboard/walk-tracker', label: 'Spacer', icon: MapPin },
      { href: '/dashboard/activity', label: 'Aktywność', icon: Activity },
      { href: '/dashboard/statistics', label: 'Statystyki', icon: BarChart3 },
    ],
  },
  {
    label: 'Finanse',
    items: [
      { href: '/dashboard/budget', label: 'Budżet', icon: Wallet },
      { href: '/dashboard/inventory', label: 'Zapasy', icon: Package },
      { href: '/dashboard/shopping-list', label: 'Zakupy', icon: ShoppingCart },
    ],
  },
  {
    label: 'Społeczność i inne',
    items: [
      { href: '/dashboard/ai-assistant', label: 'AI Asystent', icon: Sparkles },
      { href: '/dashboard/lost-pets', label: 'Zaginione', icon: AlertTriangle },
      { href: '/dashboard/adoptions', label: 'Adopcje', icon: Heart },
      { href: '/dashboard/sharing', label: 'Współdzielenie', icon: Users },
      { href: '/dashboard/community', label: 'PetvioBook', icon: Newspaper },
      { href: '/dashboard/messages', label: 'Messenger', icon: MessagesSquare },
      { href: '/dashboard/groups', label: 'Grupy', icon: Users },
      { href: '/dashboard/forum', label: 'Forum', icon: MessageSquare },
      { href: '/dashboard/breeding', label: 'Rozród', icon: Baby, premium: 'breeding' },
      { href: '/dashboard/profile', label: 'Profil', icon: User },
    ],
  },
];

export default function MobileMenu({ onOpen }: { onOpen?: (open: boolean) => void }) {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [query, setQuery] = useState('');
  const [soonOpen, setSoonOpen] = useState(false);
  const { info, openUpgrade } = usePlan();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (open) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => document.body.classList.remove('modal-open');
  }, [open]);

  const handleClose = () => {
    setOpen(false);
    setQuery('');
    onOpen?.(false);
  };

  const handleLogout = async () => {
    await unregisterPush();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/welcome');
  };

  const q = query.trim().toLowerCase();
  const filtered = q
    ? GROUPS.map((g) => ({
        ...g,
        items: g.items.filter((i) => i.label.toLowerCase().includes(q)),
      })).filter((g) => g.items.length > 0)
    : GROUPS;

  let tileIndex = 0;

  const modal = open && (
    <div className="fixed inset-0 z-[100] flex flex-col justify-end">
      <div className="absolute inset-0 bg-brand-dark/50 backdrop-blur-sm animate-backdrop-in" onClick={handleClose} />

      <div className="relative w-full max-h-[92dvh] bg-brand-cream rounded-t-[32px] shadow-2xl overflow-y-auto animate-sheet-up">
        {/* Uchwyt */}
        <div className="sticky top-0 z-20 bg-brand-cream/95 backdrop-blur-md pt-3 pb-4 px-5 border-b border-gray-200/60 rounded-t-[32px]">
          <div className="w-10 h-1.5 rounded-full bg-gray-300 mx-auto mb-4" />
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-serif text-xl font-normal text-gray-900">Wszystkie funkcje</h2>
              <p className="text-xs text-gray-500 mt-0.5">Przesuń lub wyszukaj</p>
            </div>
            <button
              onClick={handleClose}
              aria-label="Zamknij menu"
              className="w-10 h-10 rounded-full bg-white border border-gray-200 text-gray-500 flex items-center justify-center active:scale-90 transition-transform"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Wyszukiwarka */}
          <div className="mt-4 flex items-center gap-2 bg-white border border-gray-200 rounded-2xl px-4 py-3">
            <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Szukaj funkcji..."
              className="w-full bg-transparent outline-none text-sm text-gray-700 placeholder:text-gray-400"
            />
            {query && (
              <button onClick={() => setQuery('')} className="text-gray-400">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="p-5 pb-10 space-y-7">
          {filtered.length === 0 && (
            <div className="text-center py-10 text-gray-400 text-sm">Brak wyników dla „{query}”</div>
          )}

          {filtered.map((group) => (
            <section key={group.label}>
              <p className="text-[11px] font-bold uppercase tracking-widest text-brand mb-3 px-1">
                {group.label}
              </p>
              <div className="grid grid-cols-3 gap-2.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active =
                    item.href === '/dashboard'
                      ? pathname === '/dashboard'
                      : pathname.startsWith(item.href);
                  const delay = `stagger-${Math.min(++tileIndex % 12 || 12, 12)}`;
                  if (item.soon) {
                    return (
                      <button
                        key={item.label + item.href}
                        type="button"
                        onClick={() => setSoonOpen(true)}
                        className={`pv-tile animate-scale-in ${delay} !min-h-[92px] opacity-60`}
                      >
                        <span className="absolute top-2 right-2 px-1.5 h-4 rounded-full bg-gray-200 text-gray-500 text-[8px] font-bold uppercase tracking-wide flex items-center justify-center">
                          wkrótce
                        </span>
                        <div className="pv-tile-icon !w-10 !h-10 bg-gray-100 text-gray-400">
                          <Icon className="w-[18px] h-[18px]" />
                        </div>
                        <span className="pv-tile-label !text-[11px] !text-gray-400">{item.label}</span>
                      </button>
                    );
                  }
                  if (item.premium && info && info.features?.[item.premium]?.unlocked === false) {
                    return (
                      <button
                        key={item.label + item.href}
                        type="button"
                        onClick={() => {
                          handleClose();
                          openUpgrade({ code: 'PREMIUM_FEATURE', feature: item.premium });
                        }}
                        className={`pv-tile animate-scale-in ${delay} !min-h-[92px]`}
                      >
                        <span className="absolute top-2 right-2 inline-flex items-center gap-0.5 px-1.5 h-4 rounded-full bg-brand-peach text-brand-dark text-[8px] font-bold uppercase tracking-wide">
                          <Lock className="w-2 h-2" />
                          PRO
                        </span>
                        <div className="pv-tile-icon !w-10 !h-10 bg-gray-100 text-gray-400">
                          <Icon className="w-[18px] h-[18px]" />
                        </div>
                        <span className="pv-tile-label !text-[11px]">{item.label}</span>
                      </button>
                    );
                  }
                  return (
                    <Link
                      key={item.label + item.href}
                      href={item.href}
                      onClick={handleClose}
                      className={`pv-tile animate-scale-in ${delay} !min-h-[92px] ${
                        active ? '!border-brand !bg-brand-mint' : ''
                      }`}
                    >
                      <div
                        className={`pv-tile-icon !w-10 !h-10 ${
                          active ? 'bg-brand text-white' : 'bg-brand-mint text-brand-dark'
                        }`}
                      >
                        <Icon className="w-[18px] h-[18px]" />
                      </div>
                      <span className="pv-tile-label !text-[11px]">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}

          {/* Użytkownik + wylogowanie */}
          <section className="pt-4 border-t border-gray-200/70">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                  style={{ background: 'linear-gradient(135deg, #1B6B4A, #0F3D2E)' }}
                >
                  {user ? `${(user.firstName || 'U')[0]}${(user.lastName || '')[0] || ''}`.toUpperCase() : 'U'}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">
                    {user ? `${user.firstName} ${user.lastName}` : 'Użytkownik'}
                  </p>
                  <p className="text-xs text-gray-500">{user?.email || ''}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 active:scale-95 transition-all"
              >
                <LogOut className="w-4 h-4" /> Wyloguj
              </button>
            </div>
          </section>
        </div>
      </div>
      {soonOpen && <ComingSoonModal open={soonOpen} onClose={() => setSoonOpen(false)} />}
    </div>
  );

  return (
    <>
      <button
        onClick={() => {
          setOpen(true);
          onOpen?.(true);
        }}
        aria-label="Otwórz menu"
        className={`flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-2xl min-w-[58px] transition-all duration-300 ${
          open ? 'text-brand-dark' : 'text-gray-400 hover:text-gray-600'
        }`}
      >
        <span className={`flex items-center justify-center w-9 h-9 rounded-xl transition-all ${open ? 'bg-brand-mint' : ''}`}>
          <Menu className="w-5 h-5" />
        </span>
        <span className={`text-[10px] leading-none ${open ? 'font-bold' : 'font-medium'}`}>Menu</span>
      </button>

      {typeof window !== 'undefined' && modal && createPortal(modal, document.body)}
    </>
  );
}
