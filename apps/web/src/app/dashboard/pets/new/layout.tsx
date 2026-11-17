import { PetLimitGate } from '@/components/PlanGates';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <PetLimitGate>{children}</PetLimitGate>;
}
