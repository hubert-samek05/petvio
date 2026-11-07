'use client';

import { useEffect, useState } from 'react';
import { Footprints, Loader2, X } from 'lucide-react';
import { walkApi } from '@/lib/api';
import { WalkRouteMap } from './WalkMap';
import { WalkShare } from './shared';

export default function WalkPicker({
  onPick,
  onClose,
}: {
  onPick: (walk: WalkShare) => void;
  onClose: () => void;
}) {
  const [walks, setWalks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.body.classList.add('modal-open');
    (async () => {
      try {
        const res = await walkApi.getAll();
        setWalks((res.walks || []).filter((w: any) => Array.isArray(w.points) && w.points.length >= 2).slice(0, 20));
      } catch {
        setWalks([]);
      } finally {
        setLoading(false);
      }
    })();
    return () => document.body.classList.remove('modal-open');
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm animate-fade-in p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Footprints className="w-5 h-5 text-brand-dark" /> Udostępnij spacer
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Zamknij"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="py-10 text-center">
              <Loader2 className="w-7 h-7 mx-auto text-brand animate-spin" />
            </div>
          ) : walks.length === 0 ? (
            <div className="py-10 text-center">
              <Footprints className="w-8 h-8 mx-auto text-gray-300 mb-3" />
              <p className="text-sm text-gray-500">
                Brak spacerów z zapisaną trasą GPS.
                <br />
                Nagramy trasę w zakładce „Spacer"!
              </p>
            </div>
          ) : (
            walks.map((w) => (
              <button
                key={w.id}
                onClick={() =>
                  onPick({
                    id: String(w.id),
                    petName: w.pet_name,
                    startedAt: w.started_at,
                    durationSeconds: w.duration_seconds,
                    distanceMeters: Number(w.distance_meters),
                    points: w.points,
                  })
                }
                className="w-full text-left rounded-2xl border-2 border-gray-100 hover:border-brand-dark/50 overflow-hidden transition-all group"
              >
                <WalkRouteMap points={w.points} height={110} />
                <div className="px-4 py-3 flex items-center justify-between text-sm">
                  <span className="font-semibold text-gray-900 truncate">
                    {w.pet_name || 'Spacer'} · {(Number(w.distance_meters) / 1000).toFixed(2)} km
                  </span>
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {new Date(w.started_at).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
