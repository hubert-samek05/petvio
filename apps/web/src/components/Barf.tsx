'use client';

import { useState } from 'react';
import { Calculator, BookOpen, Beef, ClipboardList, ArrowLeft, ChevronRight } from 'lucide-react';
import BarfDatabase from './BarfDatabase';
import BarfCalculator from './BarfCalculator';
import BarfGuides from './BarfGuides';
import BarfReadyPlans, { BarfPresetPayload } from './BarfReadyPlans';

type Section = 'menu' | 'calculator' | 'guides' | 'database' | 'ready-plans';

const sections: { id: Section; title: string; description: string; icon: any; color: string }[] = [
  {
    id: 'calculator',
    title: 'Kalkulator BARF',
    description: 'Oblicz dzienną dawkę pokarmu, proporcje i suplementację dla Twojego zwierzęcia.',
    icon: Calculator,
    color: 'from-[#1B6B4A] to-[#2A8A5C]',
  },
  {
    id: 'guides',
    title: 'Przewodniki BARF',
    description: 'Jak bezpiecznie zacząć, proporcje, higiena, suplementacja i choroby przewlekłe.',
    icon: BookOpen,
    color: 'from-emerald-500 to-teal-600',
  },
  {
    id: 'database',
    title: 'Rodzaje mięs i składników',
    description: 'Baza mięs, kości, narządów, warzyw, olejów i suplementów ze statusami bezpieczeństwa.',
    icon: Beef,
    color: 'from-red-500 to-orange-500',
  },
  {
    id: 'ready-plans',
    title: 'Gotowe plany BARF',
    description: 'Szablony dopasowane do etapu życia i aktywności — zastosuj jednym kliknięciem.',
    icon: ClipboardList,
    color: 'from-amber-500 to-orange-600',
  },
];

export default function Barf() {
  const [section, setSection] = useState<Section>('menu');
  const [preset, setPreset] = useState<BarfPresetPayload | null>(null);

  const handleApplyPreset = (p: BarfPresetPayload) => {
    setPreset(p);
    setSection('calculator');
  };

  if (section === 'menu') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {sections.map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className="group text-left p-6 rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow-md hover:border-brand-dark/30 transition-all"
            >
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${s.color} flex items-center justify-center text-white mb-4`}>
                <Icon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">{s.title}</h3>
              <p className="text-sm text-gray-500 mb-3">{s.description}</p>
              <span className="inline-flex items-center gap-1 text-sm font-medium text-brand-dark group-hover:gap-2 transition-all">
                Otwórz <ChevronRight className="w-4 h-4" />
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  const current = sections.find((s) => s.id === section);

  return (
    <div className="space-y-6">
      <button
        onClick={() => setSection('menu')}
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-brand-dark transition-all"
      >
        <ArrowLeft className="w-4 h-4" /> Wróć do kategorii BARF
      </button>

      <div>
        <h2 className="text-xl font-semibold text-gray-900">{current?.title}</h2>
        <p className="text-sm text-gray-500">{current?.description}</p>
      </div>

      {section === 'calculator' && <BarfCalculator preset={preset} />}
      {section === 'guides' && <BarfGuides />}
      {section === 'database' && <BarfDatabase />}
      {section === 'ready-plans' && <BarfReadyPlans onApply={handleApplyPreset} />}
    </div>
  );
}
