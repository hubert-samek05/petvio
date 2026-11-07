'use client';

import { useEffect, useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { GROUPS_CHANGELOG, LATEST_GROUPS_VERSION } from '@/lib/groups-changelog';

const SEEN_KEY = 'pv_groups_whatsnew_seen';

export default function GroupWhatsNew() {
  const [open, setOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    try {
      setHasUnread(localStorage.getItem(SEEN_KEY) !== LATEST_GROUPS_VERSION);
    } catch {}
  }, []);

  const openModal = () => {
    setOpen(true);
    try {
      localStorage.setItem(SEEN_KEY, LATEST_GROUPS_VERSION);
      setHasUnread(false);
    } catch {}
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    document.body.classList.add('modal-open');
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.classList.remove('modal-open');
    };
  }, [open]);

  return (
    <>
      <button
        onClick={openModal}
        className="relative px-5 py-3 rounded-2xl text-sm flex items-center justify-center gap-2 whitespace-nowrap bg-white border border-gray-200 text-gray-700 font-semibold hover:border-brand-dark/40 hover:text-brand-dark transition-all"
      >
        <Sparkles className="w-5 h-5 text-amber-500" /> Co nowego?
        {hasUnread && (
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 border-2 border-white" aria-label="Nowe aktualizacje" />
        )}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-gray-900/60 backdrop-blur-sm animate-fade-in px-3 pt-[5vh] sm:pt-4 pb-20 sm:pb-4 overflow-y-auto"
          onClick={() => setOpen(false)}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" /> Co nowego w Grupach?
              </h3>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100" aria-label="Zamknij">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-5 max-h-[60vh] overflow-y-auto">
              {GROUPS_CHANGELOG.map((rel, i) => (
                <div key={rel.version}>
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold text-gray-900 text-sm">{rel.title}</h4>
                    {i === 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-brand-mint/60 text-brand-dark text-[10px] font-bold uppercase">Najnowsze</span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-400 mb-2">{rel.date}</p>
                  <ul className="space-y-1.5">
                    {rel.items.map((it, j) => (
                      <li key={j} className="text-sm text-gray-600 flex gap-2">
                        <span className="text-brand-dark flex-shrink-0">•</span> {it}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              <p className="text-xs text-gray-400 pt-2 border-t border-gray-100">
                Zakładka Grupy będzie się dalej rozwijać — kolejne aktualizacje pojawią się tutaj.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
