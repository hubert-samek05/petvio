'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { AlertCircle, PawPrint, Mail, Lock } from 'lucide-react';
import { authApi } from '@/lib/api';
import SocialAuthButtons from '@/components/SocialAuthButtons';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Zalogowany → od razu do dashboardu
    if (localStorage.getItem('token')) {
      router.replace('/dashboard');
      return;
    }
    // Pierwsze wejście w tej sesji → najpierw ekran powitalny
    if (!sessionStorage.getItem('pv_welcome_seen')) {
      router.replace('/welcome');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authApi.login({ email, password });
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      // Redirect admin to admin dashboard
      if (response.user.role === 'admin') {
        router.push('/dashboard/admin');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Wystąpił błąd podczas logowania');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-brand-cream relative overflow-hidden">
      {/* Dekoracyjne pływające łapki w tle */}
      <PawPrint className="absolute -top-8 left-[8%] w-28 h-28 text-brand/10 rotate-12 animate-float" />
      <PawPrint className="absolute bottom-[15%] left-[3%] w-20 h-20 text-brand/10 -rotate-12 animate-float-x" />
      <PawPrint className="absolute top-[40%] right-[6%] w-24 h-24 text-brand-peach -rotate-45 animate-float lg:right-[52%]" />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-brand-light/50 blur-3xl" />

      {/* Left - Form */}
      <div className="flex-1 flex items-center justify-center px-6 sm:px-10 py-12 relative z-10">
        <div className="max-w-md w-full animate-slide-up">
          <div className="flex items-center justify-between mb-8">
            <Link href="/" className="inline-flex items-center">
              <Image
                src="/logo.png"
                alt="Petvio"
                width={100}
                height={100}
                className="object-contain"
              />
            </Link>
            <Link
              href="/welcome"
              className="text-xs font-semibold text-brand-dark bg-white border border-gray-200 rounded-full px-3.5 py-2"
            >
              ← Wróć
            </Link>
          </div>

          <h1 className="font-serif text-3xl md:text-4xl font-normal text-gray-900 mb-2">
            Witaj ponownie! <span className="inline-block animate-bounce-soft">👋</span>
          </h1>
          <p className="text-gray-500 mb-8">Twój pupil już na Ciebie czeka</p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 animate-slide-down">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Adres email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-brand/10 focus:border-brand transition-all shadow-sm"
                  placeholder="twoj@email.pl"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Hasło
                </label>
                <Link href="/forgot-password" className="text-xs font-medium text-brand-dark hover:underline">
                  Zapomniałeś hasła?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-brand/10 focus:border-brand transition-all shadow-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="pv-btn-primary w-full py-4 text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Logowanie...
                </>
              ) : (
                'Zaloguj się'
              )}
            </button>
          </form>

          <SocialAuthButtons
            onSuccess={(role) => router.push(role === 'admin' ? '/dashboard/admin' : '/dashboard')}
            onError={setError}
          />

          <div className="mt-8 text-center">
            <p className="text-gray-500">
              Nie masz konta?{' '}
              <Link href="/register" className="text-brand-dark font-semibold hover:underline">
                Zarejestruj się
              </Link>
            </p>
          </div>

          <div className="mt-8 text-center space-y-3">
            <Link href="/" className="block text-sm text-gray-400 hover:text-gray-600 transition-colors">
              ← Powrót do strony głównej
            </Link>
            <Link href="/polityka-prywatnosci" className="block text-xs text-gray-400 hover:text-gray-600 transition-colors">
              Polityka prywatności
            </Link>
          </div>
        </div>
      </div>

      {/* Right - Decorative panel */}
      <div
        className="hidden lg:flex flex-1 relative overflow-hidden items-center justify-center p-16"
        style={{
          background: 'linear-gradient(135deg, #0F3D2E 0%, #1B6B4A 60%, #2E8B62 100%)',
          backgroundSize: '200% 200%',
          animation: 'gradient-shift 14s ease infinite',
        }}
      >
        <PawPrint className="absolute top-16 right-16 w-32 h-32 text-white/[0.06] rotate-12 animate-float" />
        <PawPrint className="absolute bottom-20 left-16 w-24 h-24 text-white/[0.05] -rotate-12 animate-float-x" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
        <div className="relative z-10 max-w-md animate-slide-left">
          <div className="relative rounded-[2.5rem] overflow-hidden shadow-2xl aspect-[4/5] mb-8 animate-float">
            <Image
              src="https://images.unsplash.com/photo-1544568100-847a948585b9?auto=format&fit=crop&w=800&q=80"
              alt="Właściciel ze zwierzęciem"
              fill
              className="object-cover"
            />
          </div>
          <h2 className="font-serif text-2xl md:text-3xl font-normal text-white mb-4">
            Zdrowie i opieka nad Twoim pupilem w jednym miejscu
          </h2>
          <p className="text-white/75 leading-relaxed">
            Dołącz do tysięcy właścicieli zwierząt, którzy codziennie korzystają z Petvio.
          </p>
        </div>
      </div>
    </div>
  );
}
