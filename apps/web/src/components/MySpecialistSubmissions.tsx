'use client';

import { useEffect, useState } from 'react';
import { specialistApi } from '@/lib/api';
import { Clock, CheckCircle2, XCircle, MapPin, PlusCircle } from 'lucide-react';
import AddSpecialistModal from './AddSpecialistModal';

const typeLabels: Record<string, string> = {
  behaviorist: 'Behawiorysta',
  trainer: 'Trener',
  zoopsychologist: 'Zoopsycholog',
};

const statusStyle: Record<string, { bg: string; text: string; label: string; icon: any }> = {
  pending: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', label: 'Czeka na weryfikację', icon: Clock },
  approved: { bg: 'bg-brand-mint border-emerald-200', text: 'text-brand-dark', label: 'Zatwierdzony', icon: CheckCircle2 },
  rejected: { bg: 'bg-red-50 border-red-200', text: 'text-red-700', label: 'Odrzucony', icon: XCircle },
};

export default function MySpecialistSubmissions() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const load = () => {
    setLoading(true);
    specialistApi
      .getMine()
      .then((data) => setSubmissions(data.specialists || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-4">
      <button
        onClick={() => setShowAddModal(true)}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-dark/10 text-brand-dark font-medium text-sm hover:bg-brand-dark/20 transition-all"
      >
        <PlusCircle className="w-4 h-4" /> Dodaj nowego specjalistę
      </button>

      {loading ? (
        <div className="text-center py-16 text-gray-500">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-[#1B6B4A] rounded-full animate-spin mx-auto mb-4" />
          Ładowanie zgłoszeń...
        </div>
      ) : submissions.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-2xl bg-gray-50 border border-gray-200 border-dashed">
          <p className="text-gray-500 text-sm">Nie zgłosiłeś jeszcze żadnego specjalisty.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {submissions.map((s) => {
            const style = statusStyle[s.status] || statusStyle.pending;
            const StatusIcon = style.icon;
            return (
              <div key={s.id} className={`p-5 rounded-2xl border ${style.bg} space-y-2`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{s.name}</h3>
                    <p className="text-xs text-gray-500">{typeLabels[s.specialist_type] || s.specialist_type}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full border ${style.bg} ${style.text} flex-shrink-0`}>
                    <StatusIcon className="w-3 h-3" /> {style.label}
                  </span>
                </div>
                {s.city && (
                  <p className="text-xs text-gray-600 inline-flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" /> {s.city}
                  </p>
                )}
                {s.status === 'rejected' && s.admin_notes && (
                  <p className="text-xs text-red-600 border-l-2 border-red-300 pl-2">{s.admin_notes}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showAddModal && (
        <AddSpecialistModal
          onClose={() => {
            setShowAddModal(false);
            load();
          }}
        />
      )}
    </div>
  );
}
