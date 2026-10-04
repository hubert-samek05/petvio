import LostPets from '@/components/LostPets';
import PageHeader from '@/components/PageHeader';

export default function LostPetsPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="Zaginione zwierzęta" description="Pomóż odnaleźć zagubione zwierzęta w Twojej okolicy" />
      <LostPets />
    </div>
  );
}
