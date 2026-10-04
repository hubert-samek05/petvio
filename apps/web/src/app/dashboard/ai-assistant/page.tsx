import AiAssistant from '@/components/AiAssistant';
import PageHeader from '@/components/PageHeader';

export default function AiAssistantPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="AI Asystent" description="Twój osobisty doradca opieki nad zwierzętami" />
      <AiAssistant />
    </div>
  );
}
