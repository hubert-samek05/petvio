import { Suspense } from 'react';

import FoodScanner from '@/components/FoodScanner';
import PageHeader from '@/components/PageHeader';

export const metadata = {
  title: 'Skaner karm | Petvio',
};

export default function FoodScannerPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="Skaner karm" description="Skanuj karmy i sprawdzaj skład dla swojego pupila" />

      <Suspense fallback={<div className="text-center py-12 text-gray-500">Ładowanie skanera...</div>}>
        <FoodScanner />
      </Suspense>
    </div>
  );
}
