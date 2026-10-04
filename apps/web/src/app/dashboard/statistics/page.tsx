import Statistics from '@/components/Statistics';
import PageHeader from '@/components/PageHeader';

export default function StatisticsPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="Statystyki" description="Kompleksowa analiza zdrowia, aktywności i wydatków Twojego pupila" />
      <Statistics />
    </div>
  );
}
