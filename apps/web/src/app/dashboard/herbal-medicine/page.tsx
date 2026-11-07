'use client';

import HerbalMedicine from '@/components/HerbalMedicine';
import PageHeader from '@/components/PageHeader';
import { Leaf } from 'lucide-react';

export default function HerbalMedicinePage() {
  return (
    <div className="space-y-8">
      <PageHeader icon={Leaf} title="Ziołolecznictwo" description="Naturalne wsparcie zdrowia Twojego pupila - zioła, porady, AI asystent" />
      <HerbalMedicine />
    </div>
  );
}
