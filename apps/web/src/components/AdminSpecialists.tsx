'use client';

import { useEffect, useState } from 'react';
import { specialistApi } from '@/lib/api';
import { CheckCircle2, XCircle, MapPin, Mail, Phone, Loader2, ShieldCheck } from 'lucide-react';

const typeLabels: Record<string, string> = {
  behaviorist: 'Behawiorysta',
  trainer: 'Trener',
  zoopsychologist: 'Zoopsycholog',
  dietitian: 'Dietetyk',
};

export default function AdminSpecialists() {
  const [pending, setPending] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    specialistApi
      .getPending()
      .then((data) => setPending(data.specialists || []))
      .catch(() => setError('Nie udało się pobrać zgłoszeń do weryfikacji'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleApprove = async (id: number) => {
    setProcessingId(id);
    try {
      await specialistApi.approve(id);
      setPending((prev) => prev.filter((p) => p.id !== id));
    } catch {
      setError('Nie udało się zatwierdzić specjalisty');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: number) => {
    setProcessingId(id);
    try {
      await specialistApi.reject(id, rejectReason || undefined);
      setPending((prev) => prev.filter((p) => p.id !== id));
      setRejectingId(null);
      setRejectReason('');
    } catch {
      setError('Nie udało się odrzucić zgłoszenia');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="pv-skeleton h-28 rounded-3xl" />
          ))}
        </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-gray-500 text-sm">
        <ShieldCheck className="w-4 h-4" /> {pending.length} zgłoszeń czeka na weryfikację
      </div>

      {error && <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm">{error}</div>}

      {pending.length === 0 ? (
        <div className="pv-card p-14 text-center">
          <p className="text-gray-500 text-sm">Brak zgłoszeń czekających na weryfikację.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pending.map((s) => (
            <div key={s.id} className="p-5 pv-card shadow-sm space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{s.name}</h3>
                  <p className="text-xs text-gray-500">
                    {typeLabels[s.specialist_type] || s.specialist_type} · zgłoszone przez {s.submitted_by_first_name} {s.submitted_by_last_name} ({s.submitted_by_email})
                  </p>
                </div>
              </div>

              {s.description && <p className="text-sm text-gray-600">{s.description}</p>}

              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 pt-1 border-t border-gray-100">
                {s.city && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" /> {s.address ? `${s.address}, ` : ''}{s.city}
                  </span>
                )}
                {s.phone && (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" /> {s.phone}
                  </span>
                )}
                {s.email && (
                  <span className="inline-flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5" /> {s.email}
                  </span>
                )}
              </div>

              {s.price_info && (
                <p className="text-xs font-medium text-gray-700 bg-gray-50 rounded-lg px-3 py-1.5 inline-block">{s.price_info}</p>
              )}

              {rejectingId === s.id ? (
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <input
                    type="text"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Powód odrzucenia (opcjonalnie)"
                    className="w-full bg-white border border-gray-200 rounded-2xl shadow-sm px-3.5 py-2 text-sm focus:outline-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleReject(s.id)}
                      disabled={processingId === s.id}
                      className="flex-1 inline-flex items-center justify-center gap-2 py-2 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-all disabled:opacity-50"
                    >
                      {processingId === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                      Potwierdź odrzucenie
                    </button>
                    <button
                      onClick={() => { setRejectingId(null); setRejectReason(''); }}
                      className="px-4 py-2 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-50"
                    >
                      Anuluj
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2 pt-2 border-t border-gray-100">
                  <button
                    onClick={() => handleApprove(s.id)}
                    disabled={processingId === s.id}
                    className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand text-white text-sm font-medium hover:bg-brand transition-all disabled:opacity-50"
                  >
                    {processingId === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Zatwierdź
                  </button>
                  <button
                    onClick={() => setRejectingId(s.id)}
                    className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 transition-all"
                  >
                    <XCircle className="w-4 h-4" /> Odrzuć
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
