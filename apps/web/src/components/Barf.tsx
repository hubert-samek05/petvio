'use client';

import { useEffect, useState } from 'react';
import { Calculator, BookOpen, Beef, ClipboardList, ArrowLeft, ChevronRight, CheckCircle2, Dog, Cat, PawPrint } from 'lucide-react';
import { barfApi } from '@/lib/api';
import BarfDatabase from './BarfDatabase';
import BarfCalculator from './BarfCalculator';
import BarfGuides from './BarfGuides';
import BarfReadyPlans, { BarfPresetPayload } from './BarfReadyPlans';

type Section = 'menu' | 'calculator' | 'guides' | 'database' | 'ready-plans';

const sections: { id: Section; title: string; description: string; icon: any }[] = [
  {
    id: 'calculator',
    title: 'Kalkulator BARF',
    description: 'Oblicz dzienną dawkę pokarmu, proporcje i suplementację dla Twojego zwierzęcia.',
    icon: Calculator,
  },
  {
    id: 'guides',
    title: 'Przewodniki BARF',
    description: 'Jak bezpiecznie zacząć, proporcje, higiena, suplementacja i choroby przewlekłe.',
    icon: BookOpen,
  },
  {
    id: 'database',
    title: 'Rodzaje mięs i składników',
    description: 'Baza mięs, kości, narządów, warzyw, olejów i suplementów ze statusami bezpieczeństwa.',
    icon: Beef,
  },
  {
    id: 'ready-plans',
    title: 'Gotowe plany BARF',
    description: 'Szablony dopasowane do etapu życia i aktywności — zastosuj jednym kliknięciem.',
    icon: ClipboardList,
  },
];

interface ActivePlan {
  id: number;
  pet_id: number;
  pet_name: string;
  pet_species: string;
  daily_food_grams: number;
  meals_per_day: number;
}

export default function Barf() {
  const [section, setSection] = useState<Section>('menu');
  const [preset, setPreset] = useState<BarfPresetPayload | null>(null);
  const [activePlans, setActivePlans] = useState<ActivePlan[]>([]);

  useEffect(() => {
    barfApi.getPlans().then((data) => setActivePlans(data.plans || [])).catch(() => {});
  }, [section]); // odśwież przy powrocie do menu

  const handleApplyPreset = (p: BarfPresetPayload) => {
    setPreset(p);
    setSection('calculator');
  };

  const goCalculator = () => setSection('calculator');

  if (section === 'menu') {
    return (
      <div className="space-y-6">
        {activePlans.length > 0 && (
          <div className="pv-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-4 h-4 text-brand-dark" />
              <p className="text-sm font-semibold text-gray-900">Aktywne plany BARF</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {activePlans.map((p) => {
                const PetIcon = p.pet_species === 'cat' ? Cat : p.pet_species === 'dog' ? Dog : PawPrint;
                return (
                  <button
                    key={p.id}
                    onClick={goCalculator}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-brand-mint border border-brand-light/60 hover:border-brand-dark/40 transition-all text-left"
                  >
                    <PetIcon className="w-4 h-4 text-brand-dark" />
                    <div>
                      <p className="text-xs font-bold text-gray-900 leading-tight">{p.pet_name}</p>
                      <p className="text-[11px] text-gray-500 leading-tight">
                        {Number(p.daily_food_grams).toFixed(0)} g/dzień · {p.meals_per_day} posiłki
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {sections.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                onClick={() => setSection(s.id)}
                className="group text-left p-6 pv-card shadow-sm hover:shadow-md hover:border-brand-dark/30 transition-all"
              >
                <div className="w-12 h-12 rounded-2xl bg-brand-mint flex items-center justify-center text-brand-dark mb-4">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="pv-section-title mb-1">{s.title}</h3>
                <p className="text-sm text-gray-500 mb-3">{s.description}</p>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-brand-dark group-hover:gap-2 transition-all">
                  Otwórz <ChevronRight className="w-4 h-4" />
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const current = sections.find((s) => s.id === section);

  return (
    <div className="space-y-6">
      <button
        onClick={() => { setSection('menu'); setPreset(null); }}
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-brand-dark transition-all"
      >
        <ArrowLeft className="w-4 h-4" /> Wróć do kategorii BARF
      </button>

      <div>
        <h2 className="pv-section-title">{current?.title}</h2>
        <p className="text-sm text-gray-500">{current?.description}</p>
      </div>

      {section === 'calculator' && <BarfCalculator preset={preset} />}
      {section === 'guides' && <BarfGuides onGoCalculator={goCalculator} />}
      {section === 'database' && <BarfDatabase />}
      {section === 'ready-plans' && <BarfReadyPlans onApply={handleApplyPreset} />}
    </div>
  );
}
