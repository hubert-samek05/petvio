'use client';

import Breeding from '@/components/Breeding';
import PageHeader from '@/components/PageHeader';
import { Baby } from 'lucide-react';

export default function BreedingPage() {
  return (
    <div className="space-y-8">
      <PageHeader icon={Baby} title="Rozród" description="Zarządzaj cyklami, ciążami, miotami i rodowodami Twoich zwierząt" />
      <Breeding />
    </div>
  );
}
