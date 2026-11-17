'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, PawPrint, Lock, CheckCircle } from 'lucide-react';
import { api } from '@/lib/api';

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) return setError('Hasła nie są identyczne');
    if (password.length < 8) return setError('Hasło musi mieć minimum 8 znaków');
    setLoading(true);
    try {
      await api.post('/api/auth/reset-password', { token, password });
      setDone(true);
      setTimeout(() => router.push('/login'), 2500);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Wystąpił błąd — spróbuj ponownie');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-brand-cream relative overflow-hidden">
      <PawPrint className="absolute -top-8 left-[8%] w-28 h-28 text-brand/10 rotate-12 animate-float" />
      <PawPrint className="absolute bottom-[15%] left-[3%] w-20 h-20 text-brand/10 -rotate-12 animate-float-x" />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-brand-light/50 blur-3xl" />

      <div className="flex-1 flex items-center justify-center px-6 sm:px-10 py-12 relative z-10">
        <div className="max-w-md w-full animate-slide-up">
          <div className="flex items-center justify-between mb-8">
            <Link href="/" className="inline-flex items-center">
              <Image src="/logo.png" alt="Petvio" width={100} height={100} className="object-contain" />
            </Link>
            <Link href="/login" className="text-xs font-semibold text-brand-dark bg-white border border-gray-200 rounded-full px-3.5 py-2">
              ← Logowanie
            </Link>
          </div>

          <h1 className="font-serif text-3xl md:text-4xl font-normal text-gray-900 mb-2">Nowe hasło</h1>
          <p className="text-gray-500 mb-8">Ustaw nowe hasło do swojego konta</p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 animate-slide-down">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {!token && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-100 rounded-2xl">
              <p className="text-sm text-amber-800">
                Brak tokenu w linku. Otwórz link z maila jeszcze raz lub{' '}
                <Link href="/forgot-password" className="font-semibold underline">poproś o nowy</Link>.
              </p>
            </div>
          )}

          {done ? (
            <div className="p-5 bg-green-50 border border-green-100 rounded-2xl flex items-start gap-3 animate-slide-down">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-800">Hasło zmienione!</p>
                <p className="text-sm text-green-700 mt-1">Przekierowuję do logowania...</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Nowe hasło
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={!token}
                    className="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-brand/10 focus:border-brand transition-all shadow-sm disabled:opacity-50"
                    placeholder="Min. 8 znaków"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 mb-2">
                  Powtórz hasło
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    id="confirm"
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    disabled={!token}
                    className="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-brand/10 focus:border-brand transition-all shadow-sm disabled:opacity-50"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !token}
                className="pv-btn-primary w-full py-4 text-base disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Zapisywanie...
                  </>
                ) : (
                  'Ustaw nowe hasło'
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
