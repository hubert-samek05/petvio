'use client';

import Forum from '@/components/Forum';
import PageHeader from '@/components/PageHeader';
import { MessageSquare } from 'lucide-react';

export default function ForumPage() {
  return (
    <div className="space-y-8">
      <PageHeader icon={MessageSquare} title="Forum" description="Społeczność miłośników zwierząt - dziel się doświadczeniem i zadawaj pytania" />
      <Forum />
    </div>
  );
}
