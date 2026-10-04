import HotelsPetsittersSearch from '@/components/HotelsPetsittersSearch';
import PageHeader from '@/components/PageHeader';

export default function HotelsPetsittersPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Hotele i Petsitterzy" description="Znajdź najlepsze hotele dla zwierząt i opiekunów w Twojej okolicy." />
      <HotelsPetsittersSearch />
    </div>
  );
}
