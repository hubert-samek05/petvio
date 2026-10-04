import ActivityDashboard from '@/components/ActivityDashboard';
import PageHeader from '@/components/PageHeader';

export default function ActivityPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Aktywność" description="Monitoruj aktywność fizyczną swojego zwierzęcia - cele, postępy i statystyki." />
      <ActivityDashboard />
    </div>
  );
}
