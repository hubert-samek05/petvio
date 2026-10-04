import WalkTracker from '@/components/WalkTracker';
import PageHeader from '@/components/PageHeader';

export default function WalkTrackerPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Spacer" description="Śledź swoje spacery z psem - zapisuj trasę, dystans i czas." />
      <WalkTracker />
    </div>
  );
}
