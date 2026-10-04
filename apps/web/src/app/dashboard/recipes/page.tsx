
import Recipes from '@/components/Recipes';
import PageHeader from '@/components/PageHeader';

export const metadata = {
  title: 'Przepisy | Petvio',
};

export default function RecipesPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="Przepisy" description="Twórz własne przepisy dla pupila, przechowuj je prywatnie lub udostępnij społeczności Petvio" />

      <Recipes />
    </div>
  );
}
