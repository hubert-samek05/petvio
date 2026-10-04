'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
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
    <div className="min-h-screen flex bg-white">
      {/* Left - Form */}
      <div className="flex-1 flex items-center justify-center px-6 sm:px-10 py-12">
        <div className="max-w-md w-full">
          <Link href="/" className="inline-flex items-center mb-6">
            <Image
              src="/logo.png"
              alt="Petvio"
              width={100}
              height={100}
              className="object-contain"
            />
          </Link>

          <h1 className="font-serif text-3xl md:text-4xl font-normal text-gray-900 mb-2">Stwórz konto</h1>
          <p className="text-gray-500 mb-8">Zacznij lepiej dbać o swojego pupila</p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
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
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-dark/30 focus:border-brand-dark transition-all"
                  placeholder="Jan"
                />
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
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-dark/30 focus:border-brand-dark transition-all"
                  placeholder="Kowalski"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Adres email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-dark/30 focus:border-brand-dark transition-all"
                placeholder="twoj@email.pl"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Hasło
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-dark/30 focus:border-brand-dark transition-all"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Potwierdź hasło
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
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
              {loading ? 'Tworzenie konta...' : 'Zarejestruj się'}
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
      <div className="hidden lg:flex flex-1 relative overflow-hidden bg-gradient-to-br from-brand-dark via-[#123f30] to-brand-dark items-center justify-center p-16">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djZoLTJ2LTRoLTJ2NGgtMnYtNGgtMnY0aC0ydjZoMnYtNGgydjRoMnYtNGgydjZoLTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-brand/20 rounded-full blur-3xl"></div>
        <div className="relative z-10 max-w-md">
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
            {['14 dni za darmo', 'Bez karty kredytowej', 'Anuluj w każdej chwili'].map((item) => (
              <li key={item} className="flex items-center gap-3 text-brand-light/90">
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
