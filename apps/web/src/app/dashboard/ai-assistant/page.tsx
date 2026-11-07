'use client';

import AiAssistant from '@/components/AiAssistant';
import PageHeader from '@/components/PageHeader';
import { Sparkles } from 'lucide-react';

export default function AiAssistantPage() {
  return (
    <div className="space-y-8">
      <PageHeader icon={Sparkles} title="AI Asystent" description="Twój osobisty doradca opieki nad zwierzętami" />
      <AiAssistant />
    </div>
  );
}
