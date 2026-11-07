'use client';

import PageHeader from '@/components/PageHeader';
import { ScanLine, Check } from 'lucide-react';

export default function FoodScannerPage() {
  return (
    <div className="space-y-8">
      <PageHeader icon={ScanLine} title="Skaner karm" description="Skanuj karmy i sprawdzaj skład dla swojego pupila" />

      <div className="pv-card p-8 sm:p-10 text-center">
        <span className="w-16 h-16 mx-auto mb-4 rounded-3xl bg-gray-100 flex items-center justify-center">
          <ScanLine className="w-8 h-8 text-gray-400" />
        </span>
        <span className="inline-block px-3 py-1 rounded-full bg-gray-200 text-gray-500 text-xs font-bold uppercase tracking-wide mb-3">
          Wkrótce
        </span>
        <h2 className="font-bold text-gray-900 text-lg">Ta funkcja jest w przygotowaniu</h2>
        <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto leading-relaxed">
          Zeskanujesz kod kreskowy lub opakowanie karmy, a Petvio oceni jej skład i dopasowanie do Twojego pupila.
        </p>
        <div className="max-w-sm mx-auto mt-6 space-y-2.5 text-left">
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
        <p className="text-xs text-gray-400 bg-gray-50 rounded-xl p-3 mt-6 max-w-md mx-auto leading-relaxed">
          Pracujemy nad integracją z bazą danych karm — funkcja wystartuje, gdy baza będzie gotowa.
        </p>
      </div>
    </div>
  );
}
