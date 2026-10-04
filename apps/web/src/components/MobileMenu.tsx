'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  PawPrint,
  Heart,
  Calendar,
  User,
  Syringe,
  Pill,
  Shield,
  Stethoscope,
  PlusCircle,
  LogOut,
  X,
  Menu,
  Settings,
  FileText,
  Bell,
  Scan,
  Flame,
  Utensils,
  Apple,
  Dumbbell,
  ChefHat,
  Beef,
  HeartHandshake,
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
  Users,
  Leaf,
  Sparkles,
} from 'lucide-react';

export type MenuItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  color?: string;
};

export default function MobileMenu({ onOpen }: { onOpen?: (open: boolean) => void }) {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch {}
    }
  }, []);

  const handleClose = () => {
    setOpen(false);
    onOpen?.(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const mainItems: MenuItem[] = [
    { href: '/dashboard', label: 'Panel główny', icon: LayoutDashboard, color: '#0F3D2E' },
    { href: '/dashboard/pets', label: 'Moje zwierzęta', icon: PawPrint, color: '#0F3D2E' },
  ];

  const healthItems: MenuItem[] = [
    { href: '/dashboard/health', label: 'Książeczka zdrowia', icon: Heart, color: '#0F3D2E' },
    { href: '/dashboard/calendar', label: 'Kalendarz', icon: Calendar, color: '#0F3D2E' },
    { href: '/dashboard/blood-analysis', label: 'Analiza badań krwi', icon: Droplets, color: '#0F3D2E' },
    { href: '/dashboard/first-aid', label: 'Leczenie i pierwsza pomoc', icon: AlertTriangle, color: '#0F3D2E' },
    { href: '/dashboard/herbal-medicine', label: 'Ziołolecznictwo', icon: Leaf, color: '#0F3D2E' },
  ];

  const dietItems: MenuItem[] = [
    { href: '/dashboard/food-scanner', label: 'Skaner karm', icon: Scan, color: '#0F3D2E' },
    { href: '/dashboard/calorie-calculator', label: 'Kalkulator kalorii', icon: Flame, color: '#0F3D2E' },
    { href: '/dashboard/feeding-log', label: 'Dziennik karmienia', icon: Utensils, color: '#0F3D2E' },
    { href: '/dashboard/special-diets', label: 'Diety specjalistyczne', icon: Apple, color: '#0F3D2E' },
    { href: '/dashboard/sport-diets', label: 'Dietetyka sportowa', icon: Dumbbell, color: '#0F3D2E' },
    { href: '/dashboard/recipes', label: 'Przepisy', icon: ChefHat, color: '#0F3D2E' },
    { href: '/dashboard/barf', label: 'Baza BARF', icon: Beef, color: '#0F3D2E' },
  ];

  const specialistItems: MenuItem[] = [
    { href: '/dashboard/specialists', label: 'Behawiorysta, trener', icon: HeartHandshake, color: '#0F3D2E' },
    { href: '/dashboard/vets', label: 'Weterynarz / dietetyk', icon: Stethoscope, color: '#0F3D2E' },
    { href: '/dashboard/hotels-petsitters', label: 'Hotel / petsitter', icon: Building2, color: '#0F3D2E' },
  ];

  const activityItems: MenuItem[] = [
    { href: '/dashboard/walk-tracker', label: 'Spacer', icon: MapPin, color: '#0F3D2E' },
    { href: '/dashboard/activity', label: 'Aktywność', icon: Activity, color: '#0F3D2E' },
  ];

  const financeItems: MenuItem[] = [
    { href: '/dashboard/budget', label: 'Budżet', icon: Wallet, color: '#0F3D2E' },
    { href: '/dashboard/inventory', label: 'Zapasy', icon: Package, color: '#0F3D2E' },
    { href: '/dashboard/shopping-list', label: 'Lista zakupów', icon: ShoppingCart, color: '#0F3D2E' },
  ];

  const otherItems: MenuItem[] = [
    { href: '/dashboard/ai-assistant', label: 'AI Asystent', icon: Sparkles, color: '#0F3D2E' },
    { href: '/dashboard/lost-pets', label: 'Zaginione', icon: AlertTriangle, color: '#0F3D2E' },
    { href: '/dashboard/adoptions', label: 'Adopcje', icon: Heart, color: '#0F3D2E' },
    { href: '/dashboard/sharing', label: 'Współdzielenie', icon: Users, color: '#0F3D2E' },
    { href: '/dashboard/forum', label: 'Forum', icon: MessageSquare, color: '#0F3D2E' },
    { href: '/dashboard/breeding', label: 'Rozród', icon: Baby, color: '#0F3D2E' },
    { href: '/dashboard/statistics', label: 'Statystyki', icon: BarChart3, color: '#0F3D2E' },
    { href: '/dashboard/pets/new', label: 'Dodaj zwierzę', icon: PlusCircle, color: '#0F3D2E' },
    { href: '/dashboard/profile', label: 'Profil', icon: User, color: '#0F3D2E' },
    { href: '/dashboard/profile', label: 'Ustawienia', icon: Settings, color: '#0F3D2E' },
  ];

  const modal = open && (
    <div className="fixed inset-0 z-[100] flex flex-col">
      <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={handleClose}></div>
      <div className="relative mt-auto w-full max-h-[90vh] bg-white rounded-t-3xl shadow-2xl overflow-y-auto animate-in slide-in-from-bottom duration-300">
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm px-5 pt-5 pb-3 rounded-t-3xl border-b border-gray-100 z-10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#1B6B4A]">Menu</p>
              <h2 className="text-xl font-semibold text-gray-900">Wszystkie funkcje</h2>
            </div>
            <button
              onClick={handleClose}
              className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-7">
          {/* Main */}
          <section>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Główne</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {mainItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={handleClose}
                    className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-gray-50 hover:bg-brand-mint hover:border-brand/30 border border-transparent transition-all text-center"
                  >
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-white"
                      style={{ backgroundColor: item.color }}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* Health */}
          <section>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Zdrowie</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {healthItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={handleClose}
                    className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-gray-50 hover:bg-brand-mint hover:border-brand/30 border border-transparent transition-all text-center"
                  >
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-white"
                      style={{ backgroundColor: item.color }}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* Diet */}
          <section>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Dietetyka</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {dietItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={handleClose}
                    className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-gray-50 hover:bg-brand-mint hover:border-brand/30 border border-transparent transition-all text-center"
                  >
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-white"
                      style={{ backgroundColor: item.color }}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* Specialists */}
          <section>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Specjaliści</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {specialistItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={handleClose}
                    className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-gray-50 hover:bg-brand-mint hover:border-brand/30 border border-transparent transition-all text-center"
                  >
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-white"
                      style={{ backgroundColor: item.color }}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* Activity */}
          <section>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Trening i aktywność</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {activityItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={handleClose}
                    className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-gray-50 hover:bg-brand-mint hover:border-brand/30 border border-transparent transition-all text-center"
                  >
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-white"
                      style={{ backgroundColor: item.color }}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* Finance */}
          <section>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Finanse</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {financeItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={handleClose}
                    className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-gray-50 hover:bg-brand-mint hover:border-brand/30 border border-transparent transition-all text-center"
                  >
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-white"
                      style={{ backgroundColor: item.color }}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* Other */}
          <section>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Inne</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {otherItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={handleClose}
                    className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-brand-mint hover:border-brand/30 border border-transparent transition-all"
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white shrink-0"
                      style={{ backgroundColor: item.color }}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* User + Logout */}
          <section className="pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#0F3D2E] to-[#1B6B4A] flex items-center justify-center text-white font-semibold text-sm">
                  {user ? `${(user.firstName || 'U')[0]}${(user.lastName || '')[0] || ''}`.toUpperCase() : 'U'}
                </div>
                <div>
                  <p className="font-medium text-gray-900 text-sm">
                    {user ? `${user.firstName} ${user.lastName}` : 'Użytkownik'}
                  </p>
                  <p className="text-xs text-gray-500">{user?.email || ''}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium text-red-600 hover:bg-red-50 transition-all"
              >
                <LogOut className="w-4 h-4" /> Wyloguj
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={() => {
          setOpen(true);
          onOpen?.(true);
        }}
        className={`flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-xl min-w-[56px] transition-all ${
          open ? 'text-[#0F3D2E] bg-[#0F3D2E]/10' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
        }`}
      >
        <Menu className="w-5 h-5" />
        <span className="text-[10px] font-medium leading-none">Menu</span>
      </button>

      {typeof window !== 'undefined' && modal && createPortal(modal, document.body)}
    </>
  );
}
