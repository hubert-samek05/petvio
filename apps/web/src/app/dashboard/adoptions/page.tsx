import Adoptions from '@/components/Adoptions';
import PageHeader from '@/components/PageHeader';

export default function AdoptionsPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="Adopcje" description="Znajdź nowego przyjaciela lub pomóż znaleźć dom dla zwierzaka" />
      <Adoptions />
    </div>
  );
}
