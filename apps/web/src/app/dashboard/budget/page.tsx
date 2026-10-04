import PageHeader from '@/components/PageHeader';
import Budget from '@/components/Budget';

export default function BudgetPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="Budżet" description="Kontroluj wydatki na swojego pupila - budżet, kategorie, statystyki i historia płatności." />
      <Budget />
    </div>
  );
}
