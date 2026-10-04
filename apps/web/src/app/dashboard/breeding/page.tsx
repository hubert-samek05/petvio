import Breeding from '@/components/Breeding';
import PageHeader from '@/components/PageHeader';

export default function BreedingPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="Rozród" description="Zarządzaj cyklami, ciążami, miotami i rodowodami Twoich zwierząt" />
      <Breeding />
    </div>
  );
}
