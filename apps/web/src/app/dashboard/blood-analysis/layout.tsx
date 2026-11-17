import { PremiumGate } from '@/components/PlanGates';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <PremiumGate feature="blood">{children}</PremiumGate>;
}
