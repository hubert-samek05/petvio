'use client';


import Barf from '@/components/Barf';
import PageHeader from '@/components/PageHeader';
import { Bone } from 'lucide-react';

export default function BarfPage() {
  return (
    <div className="space-y-8">
      <PageHeader icon={Bone} title="Baza BARF" description="Poznaj bezpieczne składniki surowej diety i wylicz dokładny dzienny plan BARF dla swojego pupila" />

      <Barf />
    </div>
  );
}
