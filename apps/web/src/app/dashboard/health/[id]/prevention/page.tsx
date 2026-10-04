'use client';

import { useParams } from 'next/navigation';
import HealthCategoryView from '@/components/HealthCategoryView';

export default function PreventionPage() {
  const params = useParams();
  return (
    <HealthCategoryView
      petId={Number(params.id)}
      config={{
        key: 'deworming',
        title: 'Profilaktyka przeciwpasożytnicza',
        desc: 'Odrobaczanie oraz ochrona przed kleszczami i pchłami',
        accent: '#3D9A6A',
        bg: 'from-[#2A8A5C] via-[#3D9A6A] to-[#3D9A6A]',
        placeholder: 'np. Odrobaczenie — Drontal',
        nextDateLabel: 'Następna dawka',
      }}
    />
  );
}
