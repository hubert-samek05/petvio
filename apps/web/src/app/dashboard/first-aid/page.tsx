'use client';

import FirstAid from '@/components/FirstAid';
import PageHeader from '@/components/PageHeader';
import { HeartPulse } from 'lucide-react';

export default function FirstAidPage() {
  return (
    <div className="space-y-6">
      <PageHeader icon={HeartPulse} title="Leczenie i pierwsza pomoc" description="Przewodnik ratunkowy w sytuacjach zagrożenia życia - procedury, lokalizacja lecznic 24/7 i szybka pomoc." />
      <FirstAid />
    </div>
  );
}
