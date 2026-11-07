'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { AlertCircle, PawPrint, Mail, Lock, User } from 'lucide-react';
import { authApi } from '@/lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Hasła nie są identyczne');
      return;
    }

    if (formData.password.length < 8) {
      setError('Hasło musi mieć minimum 8 znaków');
      return;
    }

    setLoading(true);

    try {
      const response = await authApi.register({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
      });
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Wystąpił błąd podczas rejestracji');
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
          <div className="flex items-center justify-between mb-6">
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
              className="sm:hidden text-xs font-semibold text-brand-dark bg-white border border-gray-200 rounded-full px-3.5 py-2"
            >
              ← Wróć
            </Link>
          </div>

          <h1 className="font-serif text-3xl md:text-4xl font-normal text-gray-900 mb-2">Stwórz konto</h1>
          <p className="text-gray-500 mb-8">Zacznij lepiej dbać o swojego pupila 🐾</p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 animate-slide-down">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                  Imię
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                    className="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-brand/10 focus:border-brand transition-all shadow-sm"
                    placeholder="Jan"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                  Nazwisko
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3.5 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-brand/10 focus:border-brand transition-all shadow-sm"
                  placeholder="Kowalski"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Adres email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-brand/10 focus:border-brand transition-all shadow-sm"
                  placeholder="twoj@email.pl"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Hasło
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-brand/10 focus:border-brand transition-all shadow-sm"
                  placeholder="Min. 8 znaków"
                />
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Potwierdź hasło
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
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
                  Tworzenie konta...
                </>
              ) : (
                'Zarejestruj się'
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-gray-500">
              Masz już konto?{' '}
              <Link href="/login" className="text-brand-dark font-semibold hover:underline">
                Zaloguj się
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
          <div className="relative rounded-[2.5rem] overflow-hidden shadow-2xl aspect-[4/5] mb-8">
            <Image
              src="https://images.unsplash.com/photo-1587300003388-59208cc962cb?auto=format&fit=crop&w=800&q=80"
              alt="Zdrowy pupil"
              fill
              className="object-cover"
            />
          </div>
          <h2 className="font-serif text-2xl md:text-3xl font-normal text-white mb-4">
            Zacznij lepiej dbać o zdrowie swojego pupila
          </h2>
          <ul className="space-y-3">
            {['14 dni za darmo', 'Bez karty kredytowej', 'Anuluj w każdej chwili'].map((item, i) => (
              <li key={item} className={`flex items-center gap-3 text-white/85 animate-slide-up stagger-${i + 2}`}>
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-white/15 flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
