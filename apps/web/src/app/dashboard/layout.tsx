'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import DashboardSidebar from '@/components/DashboardSidebar';
import DashboardTopbar from '@/components/DashboardTopbar';
import BottomNav from '@/components/BottomNav';
import { initPush } from '@/lib/push';
import { api } from '@/lib/api';
import { PlanProvider } from '@/lib/plan';

// Cicha synchronizacja last-known location — potrzebna do alertow promieniowych
// (np. zaginione zwierzeta w okolicy). Raz na sesje, bez interakcji.
function syncLocation() {
  try {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    if (sessionStorage.getItem('pv_loc_synced')) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        sessionStorage.setItem('pv_loc_synced', '1');
        api
          .patch('/api/auth/me', { lat: pos.coords.latitude, lng: pos.coords.longitude })
          .catch(() => {});
      },
      () => {},
      { timeout: 8000, enableHighAccuracy: false, maximumAge: 10 * 60 * 1000 }
    );
  } catch {}
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith('/dashboard/admin');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      // Niezalogowany → ekran powitalny (wszędzie: appka, mobile web, desktop)
      router.push('/welcome');
      return;
    }
    initPush((path) => router.push(path));
    syncLocation();
  }, [router]);

  return (
    <PlanProvider>
    <div className="min-h-screen bg-brand-cream">
      {/* Dekoracyjne, subtelne plamy koloru w tle */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-brand-light/40 blur-3xl" />
        <div className="absolute top-1/3 -left-40 w-80 h-80 rounded-full bg-brand-peach/50 blur-3xl" />
        <div className="absolute -bottom-40 right-1/4 w-96 h-96 rounded-full bg-brand-mint/60 blur-3xl" />
      </div>

      <DashboardSidebar />
      <DashboardTopbar />
      <main className={`relative ${isAdminRoute ? '' : 'lg:pl-72'} pb-32 lg:pb-0`}>
        {isAdminRoute ? (
          children
        ) : (
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 pt-5 lg:pt-8 pb-8 lg:pb-10">
            {children}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
    </PlanProvider>
  );
}
