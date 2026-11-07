'use client';

import Adoptions from '@/components/Adoptions';
import PageHeader from '@/components/PageHeader';
import { Heart } from 'lucide-react';

export default function AdoptionsPage() {
  return (
    <div className="space-y-8">
      <PageHeader icon={Heart} title="Adopcje" description="Znajdź nowego przyjaciela lub pomóż znaleźć dom dla zwierzaka" />
      <Adoptions />
    </div>
  );
}
