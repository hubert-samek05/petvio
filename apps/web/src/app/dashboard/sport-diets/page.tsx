import { Suspense } from 'react';

import SportDiets from '@/components/SportDiets';
import PageHeader from '@/components/PageHeader';

export const metadata = {
  title: 'Dietetyka sportowa | Petvio',
};

export default function SportDietsPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="Dietetyka sportowa" description="Wybierz dietę sportową dla swojego pupila — wpłynie automatycznie na kalkulator kalorii, dziennik karmienia i skaner karm" />

      <Suspense fallback={<div className="text-center py-12 text-gray-500">Ładowanie diet sportowych...</div>}>
        <SportDiets />
      </Suspense>
    </div>
  );
}
