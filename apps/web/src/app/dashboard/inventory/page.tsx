import Inventory from '@/components/Inventory';
import PageHeader from '@/components/PageHeader';

export default function InventoryPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="Zapasy" description="Zarządzaj zapasami karmy, leków i akcesoriów - kontroluj daty ważności i stany magazynowe." />
      <Inventory />
    </div>
  );
}
