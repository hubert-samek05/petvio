import { Suspense } from 'react';

import FeedingLog from '@/components/FeedingLog';
import PageHeader from '@/components/PageHeader';

export const metadata = {
  title: 'Dziennik karmienia | Petvio',
};

export default function FeedingLogPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="Dziennik karmienia" description="Planuj posiłki i zapisuj codzienne karmienia dla swojego pupila" />

      <Suspense fallback={<div className="text-center py-12 text-gray-500">Ładowanie dziennika karmienia...</div>}>
        <FeedingLog />
      </Suspense>
    </div>
  );
}
