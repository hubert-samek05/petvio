'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { petApi } from '@/lib/api';

export default function NewPetPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    species: 'dog',
    breed: '',
    birthDate: '',
    gender: 'male',
    weight: '',
    microchipNumber: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await petApi.create({
        ...formData,
        weight: formData.weight ? parseFloat(formData.weight) : null,
      });
      router.push('/dashboard/pets');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Wystąpił błąd podczas dodawania zwierzęcia');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/dashboard/pets" className="text-brand-dark hover:text-brand-dark font-medium">
          ← Powrót do listy
        </Link>
      </div>

      <div className="bg-white rounded-2xl p-8 border border-gray-200">
        <h1 className="text-3xl font-semibold text-gray-900 mb-2">Dodaj zwierzę</h1>
        <p className="text-gray-600 mb-8">Uzupełnij podstawowe informacje o swoim pupilu</p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Imię zwierzęcia
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-dark focus:border-transparent"
              placeholder="np. Burek"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gatunek
              </label>
              <select
                name="species"
                value={formData.species}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-dark focus:border-transparent"
              >
                <option value="dog">Pies</option>
                <option value="cat">Kot</option>
                <option value="other">Inne</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Płeć
              </label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-dark focus:border-transparent"
              >
                <option value="male">Samiec</option>
                <option value="female">Samica</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rasa
            </label>
            <input
              type="text"
              name="breed"
              value={formData.breed}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-dark focus:border-transparent"
              placeholder="np. Golden Retriever"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data urodzenia
              </label>
              <input
                type="date"
                name="birthDate"
                value={formData.birthDate}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-dark focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Waga (kg)
              </label>
              <input
                type="number"
                step="0.1"
                name="weight"
                value={formData.weight}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-dark focus:border-transparent"
                placeholder="np. 25.5"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Numer mikroczipu (opcjonalnie)
            </label>
            <input
              type="text"
              name="microchipNumber"
              value={formData.microchipNumber}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-dark focus:border-transparent"
              placeholder="np. 123456789012345"
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-brand-dark hover:bg-brand-dark text-white py-3 rounded-full font-medium transition-all disabled:opacity-50"
            >
              {loading ? 'Dodawanie...' : 'Dodaj zwierzę'}
            </button>
            <Link
              href="/dashboard/pets"
              className="px-8 py-3 border border-gray-300 text-gray-700 rounded-full font-medium hover:bg-gray-50 transition-all"
            >
              Anuluj
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
