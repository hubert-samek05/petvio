import Sharing from '@/components/Sharing';
import PageHeader from '@/components/PageHeader';

export default function SharingPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="Współdzielenie" description="Zarządzaj dostępem do danych Twojego pupila - rodzina, petsitterzy, opiekunowie" />
      <Sharing />
    </div>
  );
}
