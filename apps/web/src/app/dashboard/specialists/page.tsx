
import Specialists from '@/components/Specialists';
import PageHeader from '@/components/PageHeader';

export const metadata = {
  title: 'Specjaliści | Petvio',
};

export default function SpecialistsPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="Specjaliści" description="Znajdź behawiorystę, trenera lub zoopsychologa blisko Ciebie" />

      <Specialists />
    </div>
  );
}
