import VetsSearch from '@/components/VetsSearch';
import PageHeader from '@/components/PageHeader';

export default function VetsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Weterynarze i dietetycy" description="Znajdź najbliższe kliniki weterynaryjne i gabinety dietetyczne w Twojej okolicy." />
      <VetsSearch />
    </div>
  );
}
