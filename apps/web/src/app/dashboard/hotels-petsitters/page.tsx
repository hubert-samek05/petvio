'use client';

import HotelsPetsittersSearch from '@/components/HotelsPetsittersSearch';
import PageHeader from '@/components/PageHeader';
import { Hotel } from 'lucide-react';

export default function HotelsPetsittersPage() {
  return (
    <div className="space-y-6">
      <PageHeader icon={Hotel} title="Hotele i Petsitterzy" description="Znajdź najlepsze hotele dla zwierząt i opiekunów w Twojej okolicy." />
      <HotelsPetsittersSearch />
    </div>
  );
}
