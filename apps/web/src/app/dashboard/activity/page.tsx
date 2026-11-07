'use client';

import ActivityDashboard from '@/components/ActivityDashboard';
import PageHeader from '@/components/PageHeader';
import { Activity } from 'lucide-react';

export default function ActivityPage() {
  return (
    <div className="space-y-6">
      <PageHeader icon={Activity} title="Aktywność" description="Monitoruj aktywność fizyczną swojego zwierzęcia - cele, postępy i statystyki." />
      <ActivityDashboard />
    </div>
  );
}
