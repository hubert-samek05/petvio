'use client';

import Inventory from '@/components/Inventory';
import PageHeader from '@/components/PageHeader';
import { Package } from 'lucide-react';

export default function InventoryPage() {
  return (
    <div className="space-y-8">
      <PageHeader icon={Package} title="Zapasy" description="Zarządzaj zapasami karmy, leków i akcesoriów - kontroluj daty ważności i stany magazynowe." />
      <Inventory />
    </div>
  );
}
