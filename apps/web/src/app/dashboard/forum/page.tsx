import Forum from '@/components/Forum';
import PageHeader from '@/components/PageHeader';

export default function ForumPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="Forum" description="Społeczność miłośników zwierząt - dziel się doświadczeniem i zadawaj pytania" />
      <Forum />
    </div>
  );
}
