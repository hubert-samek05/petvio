'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardSidebar from '@/components/DashboardSidebar';
import DashboardTopbar from '@/components/DashboardTopbar';
import BottomNav from '@/components/BottomNav';
import { initPush } from '@/lib/push';
import { isMobileContext } from '@/lib/platform';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      // Na mobile (appka lub wąski ekran) → ekran powitalny; na desktopie → logowanie
      router.push(isMobileContext() ? '/welcome' : '/login');
      return;
    }
    initPush((path) => router.push(path));
  }, [router]);

  return (
    <div className="min-h-screen bg-brand-cream">
      {/* Dekoracyjne, subtelne plamy koloru w tle */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-brand-light/40 blur-3xl" />
        <div className="absolute top-1/3 -left-40 w-80 h-80 rounded-full bg-brand-peach/50 blur-3xl" />
        <div className="absolute -bottom-40 right-1/4 w-96 h-96 rounded-full bg-brand-mint/60 blur-3xl" />
      </div>

      <DashboardSidebar />
      <DashboardTopbar />
      <main className="relative lg:pl-72 pb-32 lg:pb-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 pt-5 lg:pt-8 pb-8 lg:pb-10">
          {children}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
