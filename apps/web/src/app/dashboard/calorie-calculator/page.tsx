'use client';

import { Suspense } from 'react';

import CalorieCalculator from '@/components/CalorieCalculator';
import PageHeader from '@/components/PageHeader';
import { Calculator } from 'lucide-react';

export default function CalorieCalculatorPage() {
  return (
    <div className="space-y-8">
      <PageHeader icon={Calculator} title="Kalkulator kalorii" description="Oblicz zapotrzebowanie kaloryczne dopasowane do Twojego pupila" />

      <Suspense fallback={<div className="text-center py-12 text-gray-500">Ładowanie kalkulatora...</div>}>
        <CalorieCalculator />
      </Suspense>
    </div>
  );
}
