import ShoppingList from '@/components/ShoppingList';
import PageHeader from '@/components/PageHeader';

export default function ShoppingListPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="Lista zakupów" description="Planuj zakupy dla swojego pupila - twórz listy, oznaczaj jako kupione i śledź wydatki." />
      <ShoppingList />
    </div>
  );
}
