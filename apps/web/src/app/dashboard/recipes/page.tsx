'use client';


import Recipes from '@/components/Recipes';
import PageHeader from '@/components/PageHeader';
import { ChefHat } from 'lucide-react';

export default function RecipesPage() {
  return (
    <div className="space-y-8">
      <PageHeader icon={ChefHat} title="Przepisy" description="Twórz własne przepisy dla pupila, przechowuj je prywatnie lub udostępnij społeczności Petvio" />

      <Recipes />
    </div>
  );
}
