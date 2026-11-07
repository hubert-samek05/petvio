'use client';

import Sharing from '@/components/Sharing';
import PageHeader from '@/components/PageHeader';
import { Share2 } from 'lucide-react';

export default function SharingPage() {
  return (
    <div className="space-y-8">
      <PageHeader icon={Share2} title="Współdzielenie" description="Zarządzaj dostępem do danych Twojego pupila - rodzina, petsitterzy, opiekunowie" />
      <Sharing />
    </div>
  );
}
