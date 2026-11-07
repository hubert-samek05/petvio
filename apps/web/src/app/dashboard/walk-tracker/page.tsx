'use client';

import WalkTracker from '@/components/WalkTracker';
import PageHeader from '@/components/PageHeader';
import { MapPin } from 'lucide-react';

export default function WalkTrackerPage() {
  return (
    <div className="space-y-6">
      <PageHeader icon={MapPin} title="Spacer" description="Śledź swoje spacery z psem - zapisuj trasę, dystans i czas." />
      <WalkTracker />
    </div>
  );
}
