
import Barf from '@/components/Barf';
import PageHeader from '@/components/PageHeader';

export const metadata = {
  title: 'Baza BARF | Petvio',
};

export default function BarfPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="Baza BARF" description="Poznaj bezpieczne składniki surowej diety i wylicz dokładny dzienny plan BARF dla swojego pupila" />

      <Barf />
    </div>
  );
}
