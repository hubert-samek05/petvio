import HerbalMedicine from '@/components/HerbalMedicine';
import PageHeader from '@/components/PageHeader';

export default function HerbalMedicinePage() {
  return (
    <div className="space-y-8">
      <PageHeader title="Ziołolecznictwo" description="Naturalne wsparcie zdrowia Twojego pupila - zioła, porady, AI asystent" />
      <HerbalMedicine />
    </div>
  );
}
