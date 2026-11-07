'use client';

import Statistics from '@/components/Statistics';
import PageHeader from '@/components/PageHeader';
import { BarChart3 } from 'lucide-react';

export default function StatisticsPage() {
  return (
    <div className="space-y-8">
      <PageHeader icon={BarChart3} title="Statystyki" description="Kompleksowa analiza zdrowia, aktywności i wydatków Twojego pupila" />
      <Statistics />
    </div>
  );
}
