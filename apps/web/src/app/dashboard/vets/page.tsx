'use client';

import VetsSearch from '@/components/VetsSearch';
import PageHeader from '@/components/PageHeader';
import { Cross } from 'lucide-react';

export default function VetsPage() {
  return (
    <div className="space-y-6">
      <PageHeader icon={Cross} title="Weterynarze i dietetycy" description="Znajdź najbliższe kliniki weterynaryjne i gabinety dietetyczne w Twojej okolicy." />
      <VetsSearch />
    </div>
  );
}
