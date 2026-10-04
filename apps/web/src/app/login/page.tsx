'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { authApi } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
    <div className="min-h-screen flex bg-white">
      {/* Left - Form */}
      <div className="flex-1 flex items-center justify-center px-6 sm:px-10 py-12">
        <div className="max-w-md w-full">
          <Link href="/" className="inline-flex items-center mb-8">
            <Image
              src="/logo.png"
              alt="Petvio"
              width={100}
              height={100}
              className="object-contain"
            />
          </Link>

          <h1 className="font-serif text-3xl md:text-4xl font-normal text-gray-900 mb-2">Witaj ponownie!</h1>
          <p className="text-gray-500 mb-8">Zaloguj się do swojego konta</p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Adres email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-dark/30 focus:border-brand-dark transition-all"
                placeholder="twoj@email.pl"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Hasło
                </label>
                <a href="#" className="text-xs font-medium text-brand-dark hover:underline">
                  Zapomniałeś hasła?
                </a>
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-dark/30 focus:border-brand-dark transition-all"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-dark hover:bg-brand text-white py-3.5 rounded-full font-semibold shadow-lg shadow-brand-dark/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Logowanie...' : 'Zaloguj się'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-gray-500">
              Nie masz konta?{' '}
              <Link href="/register" className="text-brand-dark font-semibold hover:underline">
                Zarejestruj się
              </Link>
            </p>
          </div>

          <div className="mt-8 text-center">
            <Link href="/" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
              ← Powrót do strony głównej
            </Link>
          </div>
        </div>
      </div>

      {/* Right - Decorative panel */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden bg-gradient-to-br from-brand-dark via-[#123f30] to-brand-dark items-center justify-center p-16">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djZoLTJ2LTRoLTJ2NGgtMnYtNGgtMnY0aC0ydjZoMnYtNGgydjRoMnYtNGgydjZoLTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-brand/20 rounded-full blur-3xl"></div>
        <div className="relative z-10 max-w-md">
          <div className="relative rounded-[2.5rem] overflow-hidden shadow-2xl aspect-[4/5] mb-8">
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
          <p className="text-brand-light/80 leading-relaxed">
            Dołącz do tysięcy właścicieli zwierząt, którzy codziennie korzystają z Petvio.
          </p>
        </div>
      </div>
    </div>
  );
}
