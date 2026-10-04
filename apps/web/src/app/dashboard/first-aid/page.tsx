import FirstAid from '@/components/FirstAid';
import PageHeader from '@/components/PageHeader';

export default function FirstAidPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Leczenie i pierwsza pomoc" description="Przewodnik ratunkowy w sytuacjach zagrożenia życia - procedury, lokalizacja lecznic 24/7 i szybka pomoc." />
      <FirstAid />
    </div>
  );
}
