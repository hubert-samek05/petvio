'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { PawPrint, Loader2 } from 'lucide-react';
import { isMobileContext } from '@/lib/platform';

// Ekran powitalny — natywna appka + mobile web.
// Na desktopie przekierowuje: zalogowany → /dashboard, niezalogowany → /login.
export default function WelcomePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      router.replace('/dashboard');
      return;
    }
    if (!isMobileContext()) {
      router.replace('/login');
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) {
    return (
      <div className="min-h-screen bg-brand-cream flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-cream flex flex-col relative overflow-hidden">
      {/* Dekoracyjne łapki */}
      <PawPrint className="absolute top-[8%] left-[6%] w-10 h-10 text-brand/15 rotate-12 z-10" />
      <PawPrint className="absolute top-[22%] right-[8%] w-8 h-8 text-brand-peach -rotate-12 z-10" />

      {/* Hero — zdjęcie pupili */}
      <div className="relative w-full h-[52vh] min-h-[340px]">
        <Image
          src="/hero-pets-razem.webp"
          alt="Pies i kot"
          fill
          priority
          className="object-cover object-top"
        />
        {/* Miękkie przejście w tło strony */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-brand-cream to-transparent" />
      </div>

      {/* Treść */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 -mt-10 relative z-10">
        <Image
          src="/logopetvio1.png"
          alt="Petvio"
          width={110}
          height={62}
          priority
          className="object-contain mb-2"
        />
        <h1 className="font-serif text-3xl font-normal text-gray-900 text-center">
          Witamy w Petvio!
        </h1>
        <p className="text-gray-500 text-center text-sm mt-3 max-w-xs leading-relaxed">
          Kompleksowa opieka nad Twoimi pupilami — zdrowie, karmienie i społeczność w jednym miejscu.
        </p>
      </div>

      {/* Przyciski */}
      <div className="px-8 pb-[max(2rem,env(safe-area-inset-bottom))] pt-2 space-y-3 w-full max-w-sm mx-auto">
        <button
          onClick={() => router.push('/login')}
          className="w-full py-4 rounded-full bg-brand-dark text-white font-semibold text-base shadow-lg shadow-brand-dark/20 active:scale-[0.98] transition-transform"
        >
          Zaloguj się
        </button>
        <button
          onClick={() => router.push('/register')}
          className="w-full py-4 rounded-full bg-white text-brand-dark font-semibold text-base border-2 border-brand-dark/15 active:scale-[0.98] transition-transform"
        >
          Zarejestruj się
        </button>
        <p className="text-center text-[11px] text-gray-400 pt-2">petvio.pl</p>
      </div>
    </div>
  );
}
