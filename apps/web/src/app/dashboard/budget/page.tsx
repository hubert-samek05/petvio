'use client';

import PageHeader from '@/components/PageHeader';
import { Wallet } from 'lucide-react';
import Budget from '@/components/Budget';

export default function BudgetPage() {
  return (
    <div className="space-y-8">
      <PageHeader icon={Wallet} title="Budżet" description="Kontroluj wydatki na swojego pupila - budżet, kategorie, statystyki i historia płatności." />
      <Budget />
    </div>
  );
}
