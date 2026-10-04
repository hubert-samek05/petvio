'use client';

import Link from 'next/link';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Footprints } from 'lucide-react';

const days = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd'];

export default function WeeklyActivityChart({ minutesByDay }: { minutesByDay?: number[] }) {
  const data = days.map((day, i) => ({
    day,
    minuty: minutesByDay?.[i] ?? 0,
  }));

  const total = data.reduce((sum, d) => sum + d.minuty, 0);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-serif text-lg font-normal text-gray-900">Aktywność tygodniowa</h3>
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">7 dni</span>
      </div>
      <p className="text-sm text-gray-500 mb-4">Minuty spacerów w ostatnim tygodniu</p>

      {total === 0 ? (
        <div className="h-[180px] flex flex-col items-center justify-center text-center rounded-xl bg-brand-mint/40 border border-dashed border-brand-light">
          <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center mb-3 shadow-sm">
            <Footprints className="w-5 h-5 text-brand-dark" />
          </div>
          <p className="text-sm text-gray-600 font-medium mb-1">Brak zarejestrowanych spacerów</p>
          <Link href="/dashboard/walk-tracker" className="text-sm font-semibold text-brand-dark hover:underline">
            Zacznij śledzić spacery →
          </Link>
        </div>
      ) : (
        <div className="h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="activityGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1B6B4A" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#1B6B4A" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#F1F5F1" />
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} width={30} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: '1px solid #DCEFE3', fontSize: 12 }}
                formatter={(value: number) => [`${value} min`, 'Spacer']}
              />
              <Area type="monotone" dataKey="minuty" stroke="#0F3D2E" strokeWidth={2.5} fill="url(#activityGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
