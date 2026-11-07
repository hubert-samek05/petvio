'use client';

import LostPets from '@/components/LostPets';
import PageHeader from '@/components/PageHeader';
import { Search } from 'lucide-react';

export default function LostPetsPage() {
  return (
    <div className="space-y-8">
      <PageHeader icon={Search} title="Zaginione zwierzęta" description="Pomóż odnaleźć zagubione zwierzęta w Twojej okolicy" />
      <LostPets />
    </div>
  );
}
