'use client';

import { ScanLine, X, Check } from 'lucide-react';

type Props = { open: boolean; onClose: () => void };

export default function ComingSoonModal({ open, onClose }: Props) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[130] bg-gray-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-2xl bg-gray-100 flex items-center justify-center">
              <ScanLine className="w-5 h-5 text-gray-400" />
            </span>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Skaner karm</h3>
              <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full bg-gray-200 text-gray-500 text-[10px] font-bold uppercase tracking-wide">
                Wkrótce
              </span>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center" aria-label="Zamknij">
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-700 leading-relaxed">
            Zeskanuj kod kreskowy lub opakowanie karmy, a Petvio pomoże Ci ocenić jej skład i dopasowanie do Twojego pupila.
          </p>
          <div className="space-y-2.5">
            {[
              'Analiza składu i wartości odżywczych karmy',
              'Ocena dopasowania do pupila — wiek, gatunek, alergie',
              'Baza tysięcy karm dla psów i kotów',
              'Porównywanie karm i wykrywanie potencjalnych alergenów',
            ].map((f) => (
              <div key={f} className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-3 h-3 text-gray-500" />
                </span>
                <p className="text-sm text-gray-600">{f}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 bg-gray-50 rounded-xl p-3 leading-relaxed">
            Pracujemy nad integracją z bazą danych karm — funkcja wystartuje, gdy baza będzie gotowa.
          </p>
          <button
            onClick={onClose}
            className="w-full py-3.5 rounded-2xl bg-gray-200 text-gray-600 font-bold text-sm active:scale-[0.98] transition-all"
          >
            Rozumiem
          </button>
        </div>
      </div>
    </div>
  );
}
