'use client';

import { useEffect, useState } from 'react';

/** Mini pierścień postępu kompletności profilu pupila */
export default function PetProgressRing({ percent, size = 44 }: { percent: number; size?: number }) {
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(percent), 120);
    return () => clearTimeout(t);
  }, [percent]);

  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(animated, 100) / 100) * c;
  const complete = percent >= 100;

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EEF2EF" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={complete ? '#1B6B4A' : '#0F3D2E'}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(0.22,1,0.36,1)' }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-brand-dark tabular-nums">
        {Math.round(percent)}%
      </span>
    </div>
  );
}
