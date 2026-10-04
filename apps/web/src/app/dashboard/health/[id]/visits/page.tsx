'use client';

import { useParams } from 'next/navigation';
import HealthCategoryView from '@/components/HealthCategoryView';

export default function VisitsPage() {
  const params = useParams();
  return (
    <HealthCategoryView
      petId={Number(params.id)}
      config={{
        key: 'visit',
        title: 'Wizyty weterynaryjne',
        desc: 'Historia wizyt, badań kontrolnych i zabiegów',
        accent: '#0F3D2E',
        bg: 'from-[#0F3D2E] via-[#0F3D2E] to-[#1B6B4A]',
        placeholder: 'np. Wizyta kontrolna / badanie krwi',
        nextDateLabel: 'Następna wizyta',
      }}
    />
  );
}
