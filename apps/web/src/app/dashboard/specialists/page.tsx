'use client';


import Specialists from '@/components/Specialists';
import PageHeader from '@/components/PageHeader';
import { HeartHandshake } from 'lucide-react';

export default function SpecialistsPage() {
  return (
    <div className="space-y-8">
      <PageHeader icon={HeartHandshake} title="Specjaliści" description="Behawiorysta, trener, zoopsycholog, dietetyk lub groomer blisko Ciebie" />

      <Specialists />
    </div>
  );
}
