'use client';

import { useParams } from 'next/navigation';
import HealthCategoryView from '@/components/HealthCategoryView';

export default function VaccinationsPage() {
  const params = useParams();
  return (
    <HealthCategoryView
      petId={Number(params.id)}
      config={{
        key: 'vaccination',
        title: 'Szczepienia',
        desc: 'Szczepienia obowiązkowe i dodatkowe — pełna historia oraz nadchodzące terminy',
        accent: '#1B6B4A',
        bg: 'from-[#0F3D2E] via-[#1B6B4A] to-[#1B6B4A]',
        placeholder: 'np. Szczepienie przeciwko wściekliźnie',
        nextDateLabel: 'Następne szczepienie',
      }}
    />
  );
}
