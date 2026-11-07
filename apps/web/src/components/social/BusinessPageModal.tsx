'use client';

import { useEffect, useState } from 'react';
import { Loader2, X, ImagePlus, Clock } from 'lucide-react';
import { businessPagesApi } from '@/lib/api';
import { downscaleImage } from './shared';

export const PAGE_CATEGORIES = [
  { id: 'vet', label: 'Weterynarz' },
  { id: 'groomer', label: 'Groomer' },
  { id: 'hotel', label: 'Hotel dla zwierząt' },
  { id: 'petsitter', label: 'Petsitter' },
  { id: 'shop', label: 'Sklep zoologiczny' },
  { id: 'trainer', label: 'Trener / Behawiorysta' },
  { id: 'shelter', label: 'Schronisko / Fundacja' },
  { id: 'breeder', label: 'Hodowla' },
  { id: 'cafe', label: 'Kawiarnia przyjazna zwierzętom' },
  { id: 'other', label: 'Inne' },
];

export const DAY_LABELS: Record<string, string> = {
  mon: 'Poniedziałek', tue: 'Wtorek', wed: 'Środa', thu: 'Czwartek',
  fri: 'Piątek', sat: 'Sobota', sun: 'Niedziela',
};
const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export interface BusinessPageData {
  id?: string;
  name: string;
  category: string;
  description?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  address?: string | null;
  city?: string | null;
  openingHours?: Record<string, { open?: string; close?: string; closed?: boolean }>;
  avatarUrl?: string | null;
}

export default function BusinessPageModal({
  initial,
  onClose,
  onSaved,
}: {
  initial?: BusinessPageData | null;
  onClose: () => void;
  onSaved: (page: any) => void;
}) {
  const [form, setForm] = useState({
    name: initial?.name || '',
    category: initial?.category || 'other',
    description: initial?.description || '',
    email: initial?.email || '',
    phone: initial?.phone || '',
    website: initial?.website || '',
    address: initial?.address || '',
    city: initial?.city || '',
    avatarUrl: initial?.avatarUrl || '',
  });
  const [hours, setHours] = useState<Record<string, { open: string; close: string; closed: boolean }>>(() => {
    const base: any = {};
    for (const d of DAYS) {
      const src = initial?.openingHours?.[d];
      base[d] = src?.closed
        ? { open: '', close: '', closed: true }
        : { open: src?.open || '', close: src?.close || '', closed: false };
    }
    return base;
  });
  const [hoursOpen, setHoursOpen] = useState(Object.keys(initial?.openingHours || {}).length > 0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    document.body.classList.add('modal-open');
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.classList.remove('modal-open');
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const valid = form.name.trim().length > 0;

  const save = async () => {
    if (!valid || busy) return;
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError('Podaj prawidłowy adres email.');
      return;
    }
    if (form.website && !/^https?:\/\//i.test(form.website.trim())) {
      setError('Strona www musi zaczynać się od http:// lub https://');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const openingHours: any = {};
      for (const d of DAYS) {
        const h = hours[d];
        if (h.closed) openingHours[d] = { closed: true };
        else if (h.open && h.close) openingHours[d] = { open: h.open, close: h.close };
      }
      const payload = {
        name: form.name.trim(),
        category: form.category,
        description: form.description.trim() || undefined,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        website: form.website.trim() || undefined,
        address: form.address.trim() || undefined,
        city: form.city.trim() || undefined,
        openingHours,
        avatarUrl: form.avatarUrl || undefined,
      };
      const res = initial?.id
        ? await businessPagesApi.update(initial.id, payload)
        : await businessPagesApi.create(payload);
      onSaved(res.page);
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.error?.message || 'Nie udało się zapisać strony.');
    } finally {
      setBusy(false);
    }
  };

  const inputCls = 'w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-dark focus:ring-4 focus:ring-brand/10';
  const labelCls = 'block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5';

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-gray-900/60 backdrop-blur-sm animate-fade-in p-0 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-xl w-full max-w-xl max-h-[92vh] sm:max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-3xl sm:rounded-t-2xl z-10">
          <h3 className="font-semibold text-gray-900">{initial ? 'Edytuj stronę firmową' : 'Nowa strona firmowa'}</h3>
          <button onClick={onClose} disabled={busy} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">{error}</div>}

          {/* Avatar */}
          <div className="flex items-center gap-4">
            {form.avatarUrl ? (
              <div className="relative">
                <img src={form.avatarUrl} alt="" className="w-16 h-16 rounded-2xl object-cover border border-gray-200" />
                <button
                  onClick={() => setForm({ ...form, avatarUrl: '' })}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gray-900/80 text-white flex items-center justify-center"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <label className="w-16 h-16 rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:border-brand-dark/50 hover:text-brand-dark transition-all">
                <ImagePlus className="w-5 h-5" />
                <span className="text-[9px] font-medium mt-0.5">Logo</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    try {
                      setForm({ ...form, avatarUrl: await downscaleImage(f, 400) });
                    } catch {
                      setError('Nie udało się wczytać zdjęcia.');
                    }
                    e.target.value = '';
                  }}
                />
              </label>
            )}
            <div className="flex-1">
              <label className={labelCls}>Nazwa strony *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                maxLength={120}
                placeholder="np. Gabinet Weterynaryjny Azorek"
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Kategoria</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className={inputCls}
            >
              {PAGE_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Opis</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              maxLength={2000}
              rows={3}
              placeholder="Czym zajmuje się Twoja firma? Usługi, specjalizacja..."
              className={`${inputCls} resize-none`}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Email kontaktowy</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} maxLength={254} placeholder="kontakt@firma.pl" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Telefon</label>
              <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} maxLength={30} placeholder="+48 123 456 789" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Strona www</label>
              <input type="url" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} maxLength={255} placeholder="https://..." className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Miasto</label>
              <input type="text" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} maxLength={100} placeholder="np. Warszawa" className={inputCls} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Adres</label>
            <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} maxLength={255} placeholder="ul. Przykładowa 12" className={inputCls} />
          </div>

          {/* Godziny otwarcia */}
          <div className="rounded-2xl border border-gray-200 overflow-hidden">
            <button
              onClick={() => setHoursOpen((v) => !v)}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50 transition-all"
            >
              <Clock className="w-4 h-4 text-brand-dark" />
              Godziny otwarcia
              <span className="ml-auto text-xs text-gray-400">{hoursOpen ? 'zwiń' : 'rozwiń'}</span>
            </button>
            {hoursOpen && (
              <div className="border-t border-gray-100 divide-y divide-gray-50">
                {DAYS.map((d) => (
                  <div key={d} className="flex items-center gap-2 px-4 py-2">
                    <span className="w-24 text-xs font-medium text-gray-700">{DAY_LABELS[d]}</span>
                    <label className="flex items-center gap-1.5 text-xs text-gray-500">
                      <input
                        type="checkbox"
                        checked={hours[d].closed}
                        onChange={(e) => setHours({ ...hours, [d]: { ...hours[d], closed: e.target.checked } })}
                        className="w-3.5 h-3.5 rounded border-gray-300 text-brand-dark"
                      />
                      zamknięte
                    </label>
                    {!hours[d].closed && (
                      <div className="ml-auto flex items-center gap-1.5">
                        <input
                          type="time"
                          value={hours[d].open}
                          onChange={(e) => setHours({ ...hours, [d]: { ...hours[d], open: e.target.value } })}
                          className="px-2 py-1 rounded-lg border border-gray-200 text-xs"
                        />
                        <span className="text-gray-400 text-xs">–</span>
                        <input
                          type="time"
                          value={hours[d].close}
                          onChange={(e) => setHours({ ...hours, [d]: { ...hours[d], close: e.target.value } })}
                          className="px-2 py-1 rounded-lg border border-gray-200 text-xs"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} disabled={busy} className="flex-1 px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition-all">
              Anuluj
            </button>
            <button
              onClick={save}
              disabled={!valid || busy}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl pv-btn-primary disabled:opacity-50"
            >
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              {initial ? 'Zapisz zmiany' : 'Utwórz stronę'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
