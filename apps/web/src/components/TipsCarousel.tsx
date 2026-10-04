'use client';

import { useEffect, useState, useCallback } from 'react';

const tips = [
  {
    category: 'Zdrowie',
    title: 'Regularne szczepienia to podstawa',
    text: 'Pamiętaj o corocznych szczepieniach przypominających. Wścieklizna jest obowiązkowa dla psów, a szczepienia dodatkowe chronią przed groźnymi chorobami.',
  },
  {
    category: 'Pielęgnacja',
    title: 'Kontroluj wagę swojego pupila',
    text: 'Nadwaga skraca życie zwierząt nawet o 2 lata. Regularne ważenie i odpowiednia dieta pomagają utrzymać zdrową sylwetkę przez całe życie.',
  },
  {
    category: 'Profilaktyka',
    title: 'Odrobaczanie co 3 miesiące',
    text: 'Regularne odrobaczanie chroni nie tylko zwierzę, ale całą rodzinę. Zapisuj terminy w kalendarzu Petvio, aby niczego nie przegapić.',
  },
  {
    category: 'Codzienna opieka',
    title: 'Higiena zębów ma znaczenie',
    text: 'Choroby przyzębia dotykają 80% psów po 3. roku życia. Regularne czyszczenie zębów i przekąski dentystyczne to prosta profilaktyka.',
  },
  {
    category: 'Sezon',
    title: 'Ochrona przed kleszczami',
    text: 'Od wiosny do jesieni kleszcze są szczególnie aktywne. Stosuj regularną ochronę i sprawdzaj sierść pupila po każdym spacerze.',
  },
];

export default function TipsCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const next = useCallback(() => setIndex((i) => (i + 1) % tips.length), []);
  const prev = () => setIndex((i) => (i - 1 + tips.length) % tips.length);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(next, 6000);
    return () => clearInterval(t);
  }, [next, paused]);

  const tip = tips[index];

  return (
    <div
      className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-serif text-lg font-normal text-gray-900">Porady dla opiekunów</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={prev}
            className="w-8 h-8 rounded-full border border-gray-200 text-gray-500 hover:border-brand-dark hover:text-brand-dark transition-all flex items-center justify-center"
            aria-label="Poprzednia porada"
          >
            ←
          </button>
          <button
            onClick={next}
            className="w-8 h-8 rounded-full border border-gray-200 text-gray-500 hover:border-brand-dark hover:text-brand-dark transition-all flex items-center justify-center"
            aria-label="Następna porada"
          >
            →
          </button>
        </div>
      </div>
      <div className="p-6 min-h-[180px]">
        <span className="inline-block px-3 py-1 rounded-full bg-brand-mint text-brand-dark text-xs font-semibold uppercase tracking-wide mb-3">
          {tip.category}
        </span>
        <h4 className="font-serif text-xl font-normal text-gray-900 mb-2">{tip.title}</h4>
        <p className="text-gray-600 leading-relaxed">{tip.text}</p>
      </div>
      <div className="px-6 pb-5 flex items-center gap-1.5">
        {tips.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            className={`h-1.5 rounded-full transition-all ${
              i === index ? 'w-6 bg-brand-dark' : 'w-1.5 bg-gray-200 hover:bg-gray-300'
            }`}
            aria-label={`Porada ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
