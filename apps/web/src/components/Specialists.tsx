'use client';

import { useEffect, useState } from 'react';
import { Search, ClipboardCheck, ShieldCheck, ArrowLeft, ChevronRight } from 'lucide-react';
import FindSpecialist from './FindSpecialist';
import MySpecialistSubmissions from './MySpecialistSubmissions';
import AdminSpecialists from './AdminSpecialists';

type Section = 'menu' | 'find' | 'mine' | 'admin';

export default function Specialists() {
  const [section, setSection] = useState<Section>('menu');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setIsAdmin(user?.role === 'admin');
      } catch {}
    }
  }, []);

  const sections = [
    {
      id: 'find' as Section,
      title: 'Znajdź specjalistę',
      description: 'Behawiorysta, trener czy zoopsycholog blisko Ciebie — z mapą i lokalizacją.',
      icon: Search,
      color: 'from-[#1B6B4A] to-[#2A8A5C]',
    },
    {
      id: 'mine' as Section,
      title: 'Moje zgłoszenia',
      description: 'Sprawdź status specjalistów, których zgłosiłeś do bazy Petvio.',
      icon: ClipboardCheck,
      color: 'from-amber-500 to-orange-600',
    },
    ...(isAdmin
      ? [
          {
            id: 'admin' as Section,
            title: 'Panel weryfikacji',
            description: 'Zatwierdzaj lub odrzucaj zgłoszenia specjalistów (tylko administrator).',
            icon: ShieldCheck,
            color: 'from-emerald-500 to-teal-600',
          },
        ]
      : []),
  ];

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
        <ArrowLeft className="w-4 h-4" /> Wróć do kategorii Specjaliści
      </button>

      {section === 'find' && <FindSpecialist />}
      {section === 'mine' && <MySpecialistSubmissions />}
      {section === 'admin' && isAdmin && <AdminSpecialists />}
    </div>
  );
}
