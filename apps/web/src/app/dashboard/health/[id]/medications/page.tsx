'use client';

import { useParams } from 'next/navigation';
import HealthCategoryView from '@/components/HealthCategoryView';

export default function MedicationsPage() {
  const params = useParams();
  return (
    <HealthCategoryView
      petId={Number(params.id)}
      config={{
        key: 'medication',
        title: 'Leki',
        desc: 'Leki, suplementy i kuracje — dawkowanie oraz terminy podawania',
        accent: '#2A8A5C',
        bg: 'from-[#1B6B4A] via-[#2A8A5C] to-[#2A8A5C]',
        placeholder: 'np. Antybiotyk — Synulox 250mg',
        nextDateLabel: 'Kolejna dawka',
      }}
    />
  );
}
