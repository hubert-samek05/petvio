import { Suspense } from 'react';

import SpecialDiets from '@/components/SpecialDiets';
import PageHeader from '@/components/PageHeader';

export const metadata = {
  title: 'Diety specjalistyczne | Petvio',
};

export default function SpecialDietsPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="Diety specjalistyczne" description="Zarządzaj dietami, dozwolonymi i zakazanymi składnikami dla Twojego pupila" />

      <Suspense fallback={<div className="text-center py-12 text-gray-500">Ładowanie diet...</div>}>
        <SpecialDiets />
      </Suspense>
    </div>
  );
}
