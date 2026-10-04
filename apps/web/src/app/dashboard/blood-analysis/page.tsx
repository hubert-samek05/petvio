import BloodAnalysis from '@/components/BloodAnalysis';
import PageHeader from '@/components/PageHeader';

export default function BloodAnalysisPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Analiza badań krwi" description="Profesjonalna analiza morfologii i biochemii krwi z interpretacją kliniczną i zaleceniami dietetycznymi." />
      <BloodAnalysis />
    </div>
  );
}
