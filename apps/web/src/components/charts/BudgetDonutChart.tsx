'use client';

import Link from 'next/link';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Wallet } from 'lucide-react';

type Category = { name: string; value: number; color: string };

const COLORS = ['#0F3D2E', '#1B6B4A', '#7FB69A', '#FCEADB'];

export default function BudgetDonutChart({ categories }: { categories?: Category[] }) {
  const data =
    categories && categories.some((c) => c.value > 0)
      ? categories
      : [];
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="pv-card p-6 h-full">
      <div className="flex items-center justify-between mb-1">
        <h3 className="pv-section-title">Wydatki w tym miesiącu</h3>
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Budżet</span>
      </div>
      <p className="text-sm text-gray-500 mb-4">Podział kosztów opieki nad pupilem</p>

      {total === 0 ? (
        <div className="h-[180px] flex flex-col items-center justify-center text-center rounded-2xl bg-brand-mint/40 border border-dashed border-brand-light">
          <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center mb-3 shadow-sm animate-float">
            <Wallet className="w-5 h-5 text-brand-dark" />
          </div>
          <p className="text-sm text-gray-600 font-medium mb-1">Brak zarejestrowanych wydatków</p>
          <Link href="/dashboard/budget" className="text-sm font-semibold text-brand-dark hover:underline">
            Otwórz budżet →
          </Link>
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <div className="w-[140px] h-[140px] flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" innerRadius={40} outerRadius={65} paddingAngle={3} isAnimationActive animationDuration={900} cornerRadius={4}>
                  {data.map((entry, i) => (
                    <Cell key={entry.name} fill={entry.color || COLORS[i % COLORS.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #DCEFE3', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-2.5">
            {data.map((entry, i) => (
              <div key={entry.name} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-gray-600">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: entry.color || COLORS[i % COLORS.length] }}
                  ></span>
                  {entry.name}
                </span>
                <span className="font-semibold text-gray-800">{entry.value} zł</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
