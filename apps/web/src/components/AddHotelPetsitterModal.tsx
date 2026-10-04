'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, MapPin, CheckCircle2, ChevronRight, ChevronLeft, User, Phone, Globe, FileText, Building2, PawPrint, Calendar, Home } from 'lucide-react';
import { specialistApi } from '@/lib/api';

const typeOptions = [
  { value: 'hotel', label: 'Hotel dla zwierząt', icon: Building2 },
  { value: 'petsitter', label: 'Petsitter', icon: User },
];

const stepLabels = ['Typ', 'Gatunek', 'Dane', 'Kontakt', 'Podsumowanie'];

export default function AddHotelPetsitterModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: '',
    specialistType: 'hotel',
    species: 'both',
    description: '',
    phone: '',
    email: '',
    website: '',
    city: '',
    address: '',
    priceInfo: '',
    latitude: null as number | null,
    longitude: null as number | null,
  });
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.body.classList.add('modal-open');
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      document.body.classList.remove('modal-open');
    };
  }, []);

  const update = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleUseLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({ ...f, latitude: pos.coords.latitude, longitude: pos.coords.longitude }));
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const validateStep = () => {
    if (step === 1) return true;
    if (step === 2) return true;
    if (step === 3) {
      if (!form.name.trim() || !form.city.trim()) {
        setError('Podaj nazwę oraz miasto');
        return false;
      }
      return true;
    }
    if (step === 4) return true;
    return true;
  };

  const nextStep = () => {
    setError('');
    if (validateStep() && step < 5) setStep((s) => s + 1);
  };

  const prevStep = () => {
    setError('');
    if (step > 1) setStep((s) => s - 1);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      await specialistApi.create({
        name: form.name.trim(),
        specialistType: form.specialistType,
        species: form.species,
        description: form.description.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        website: form.website.trim() || undefined,
        city: form.city.trim(),
        address: form.address.trim() || undefined,
        latitude: form.latitude,
        longitude: form.longitude,
        priceInfo: form.priceInfo.trim() || undefined,
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Nie udało się wysłać zgłoszenia');
    } finally {
      setSubmitting(false);
    }
  };

  const StepIndicator = () => (
    <div className="flex items-center gap-2 mb-6">
      {stepLabels.map((label, idx) => {
        const n = idx + 1;
        const active = n === step;
        const done = n < step;
        return (
          <div key={n} className="flex-1">
            <div
              className={`h-2 rounded-full transition-all ${active ? 'bg-brand-dark' : done ? 'bg-brand-dark/60' : 'bg-gray-200'}`}
            />
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-dark/10 flex items-center justify-center">
              {form.specialistType === 'hotel' ? <Building2 className="w-4 h-4 text-brand-dark" /> : <User className="w-4 h-4 text-brand-dark" />}
            </div>
            <h3 className="font-semibold text-gray-900">
              Dodaj {form.specialistType === 'hotel' ? 'hotel' : 'petsittera'} do weryfikacji
            </h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5">
          {success ? (
            <div className="text-center py-8">
              <CheckCircle2 className="w-12 h-12 text-brand-dark mx-auto mb-4" />
              <h4 className="font-semibold text-gray-900 mb-1">Zgłoszenie wysłane</h4>
              <p className="text-sm text-gray-500 mb-6">
                {form.specialistType === 'hotel' ? 'Hotel' : 'Petsitter'} zostanie opublikowany po weryfikacji przez administratora.
              </p>
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-brand-dark text-white font-medium hover:bg-brand-dark transition-all"
              >
                Zamknij
              </button>
            </div>
          ) : (
            <>
              <StepIndicator />
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-4">
                Krok {step} z 5 — {stepLabels[step - 1]}
              </p>

              {error && <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm mb-4">{error}</div>}

              {step === 1 && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">Wybierz typ usługi:</p>
                  <div className="grid grid-cols-1 gap-3">
                    {typeOptions.map((opt) => {
                      const Icon = opt.icon;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => update('specialistType', opt.value)}
                          className={`flex items-center gap-3 p-4 rounded-2xl border text-left transition-all ${
                            form.specialistType === opt.value
                              ? 'bg-brand-dark/10 border-brand-dark text-brand-dark'
                              : 'bg-white border-gray-200 hover:border-brand-dark/40'
                          }`}
                        >
                          <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
                            <Icon className="w-5 h-5 text-brand-dark" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{opt.label}</p>
                            <p className="text-xs text-gray-500">Wybierz tę opcję, aby zgłosić {opt.label.toLowerCase()}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">Dla jakiego gatunku jest ta usługa?</p>
                  <div className="flex gap-2">
                    {['both', 'dog', 'cat'].map((s) => (
                      <button
                        key={s}
                        onClick={() => update('species', s)}
                        className={`flex-1 py-3 rounded-xl text-sm font-medium border transition-all ${
                          form.species === s ? 'bg-brand-dark text-white border-brand-dark' : 'bg-white text-gray-600 border-gray-200 hover:border-brand-dark/40'
                        }`}
                      >
                        {s === 'both' ? 'Pies i kot' : s === 'dog' ? 'Pies' : 'Kot'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">Nazwa</label>
                    <div className="relative">
                      <Home className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={form.name}
                        onChange={(e) => update('name', e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-3.5 py-2.5 text-sm focus:outline-none focus:border-brand-dark/50"
                        placeholder="np. Hotel dla Zwierząt Pupilek"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">Miasto</label>
                      <input
                        type="text"
                        value={form.city}
                        onChange={(e) => update('city', e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none"
                        placeholder="Warszawa"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">Adres</label>
                      <input
                        type="text"
                        value={form.address}
                        onChange={(e) => update('address', e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none"
                        placeholder="ul. Przykładowa 1"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">Cennik (opcjonalnie)</label>
                    <input
                      type="text"
                      value={form.priceInfo}
                      onChange={(e) => update('priceInfo', e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none"
                      placeholder="np. od 80 zł/doba"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">Opis / usługi</label>
                    <div className="relative">
                      <FileText className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                      <textarea
                        value={form.description}
                        onChange={(e) => update('description', e.target.value)}
                        rows={3}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-3.5 py-2.5 text-sm focus:outline-none focus:border-brand-dark/50 resize-none"
                        placeholder="Krótki opis usług i warunków"
                      />
                    </div>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">Telefon</label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={form.phone}
                        onChange={(e) => update('phone', e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-3.5 py-2.5 text-sm focus:outline-none"
                        placeholder="+48 600 000 000"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">Email</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => update('email', e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none"
                      placeholder="kontakt@przykład.pl"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">Strona www</label>
                    <div className="relative">
                      <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={form.website}
                        onChange={(e) => update('website', e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-3.5 py-2.5 text-sm focus:outline-none"
                        placeholder="https://..."
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleUseLocation}
                    disabled={locating}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-sm transition-all disabled:opacity-50 ${
                      form.latitude != null ? 'bg-brand-dark/10 text-brand-dark' : 'bg-brand-dark/10 text-brand-dark hover:bg-brand-dark/20'
                    }`}
                  >
                    {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                    {form.latitude != null ? 'Lokalizacja ustawiona' : 'Ustaw dokładną lokalizację (opcjonalnie)'}
                  </button>
                </div>
              )}

              {step === 5 && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">Sprawdź dane przed wysłaniem zgłoszenia do weryfikacji:</p>
                  <div className="p-4 rounded-2xl bg-brand-dark/10 border border-brand-dark/20 space-y-2 text-sm">
                    <p><span className="text-gray-500">Nazwa:</span> <span className="font-medium text-gray-900">{form.name || '—'}</span></p>
                    <p><span className="text-gray-500">Typ:</span> <span className="font-medium text-gray-900">{typeOptions.find((t) => t.value === form.specialistType)?.label}</span></p>
                    <p><span className="text-gray-500">Gatunek:</span> <span className="font-medium text-gray-900">{form.species === 'both' ? 'Pies i kot' : form.species === 'dog' ? 'Pies' : 'Kot'}</span></p>
                    <p><span className="text-gray-500">Lokalizacja:</span> <span className="font-medium text-gray-900">{form.city}{form.address ? `, ${form.address}` : ''}</span></p>
                    <p><span className="text-gray-500">Cennik:</span> <span className="font-medium text-gray-900">{form.priceInfo || '—'}</span></p>
                    <p><span className="text-gray-500">Telefon:</span> <span className="font-medium text-gray-900">{form.phone || '—'}</span></p>
                    <p><span className="text-gray-500">Email:</span> <span className="font-medium text-gray-900">{form.email || '—'}</span></p>
                    <p><span className="text-gray-500">WWW:</span> <span className="font-medium text-gray-900">{form.website || '—'}</span></p>
                    <p><span className="text-gray-500">Lokalizacja GPS:</span> <span className="font-medium text-gray-900">{form.latitude != null ? `${form.latitude.toFixed(4)}, ${form.longitude?.toFixed(4)}` : 'nieustawiona'}</span></p>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between gap-3 mt-6 pt-4 border-t border-gray-100">
                <button
                  onClick={prevStep}
                  disabled={step === 1}
                  className="inline-flex items-center gap-1 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft className="w-4 h-4" /> Wstecz
                </button>

                {step < 5 ? (
                  <button
                    onClick={nextStep}
                    className="inline-flex items-center gap-1 px-5 py-2.5 rounded-xl text-sm font-medium bg-brand-dark text-white hover:bg-brand-dark transition-all"
                  >
                    Dalej <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-brand-dark text-white hover:bg-brand-dark transition-all disabled:opacity-50"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Wyślij do weryfikacji
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
