'use client';

import ShoppingList from '@/components/ShoppingList';
import PageHeader from '@/components/PageHeader';
import { ShoppingCart } from 'lucide-react';

export default function ShoppingListPage() {
  return (
    <div className="space-y-8">
      <PageHeader icon={ShoppingCart} title="Lista zakupów" description="Planuj zakupy dla swojego pupila - twórz listy, oznaczaj jako kupione i śledź wydatki." />
      <ShoppingList />
    </div>
  );
}
