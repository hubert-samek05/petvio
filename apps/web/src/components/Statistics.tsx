'use client';

import { useState, useEffect, useMemo } from 'react';
import { walkApi, bloodAnalysisApi, userPreferencesApi } from '@/lib/api';
import {
  DollarSign,
  Activity,
  Heart,
  Clock,
  Package
} from 'lucide-react';

interface Pet {
  id: string;
  name: string;
  species: string;
  birth_date?: string;
}

interface StatCard {
  title: string;
  value: string;
  change?: string;
  trend?: 'up' | 'down';
  period: string;
}

export default function Statistics() {
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');
  const [expenses, setExpenses] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [walks, setWalks] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [bloodAnalyses, setBloodAnalyses] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) setUser(JSON.parse(userData));

    const load = (key: string) => {
      try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
    };
    // Budżet: serwer (per-konto) → fallback na mirror lokalny
    setExpenses(load('petExpenses'));
    setBudgets(load('petBudgets'));
    userPreferencesApi
      .get('budget_data')
      .then((res: any) => {
        if (res?.value) {
          if (Array.isArray(res.value.expenses)) setExpenses(res.value.expenses);
          if (Array.isArray(res.value.budgets)) setBudgets(res.value.budgets);
        }
      })
      .catch(() => {});
    setInventory(load('inventoryItems'));
    userPreferencesApi
      .get('inventory_items')
      .then((res: any) => {
        if (Array.isArray(res?.value)) setInventory(res.value);
      })
      .catch(() => {});

    // Analizy krwi z API — localStorage był tylko do migracji i jest czyszczony
    bloodAnalysisApi
      .getAll({ silent: true })
      .then((res: any) => setBloodAnalyses(res.analyses || res.bloodAnalyses || []))
      .catch(() => setBloodAnalyses([]));

    // Spacery: API (zrodlo prawdy) + lokalne wpisy offline z WalkTrackera.
    // walkHistory zapisuje duration w SEKUNDACH i distance w METRACH -> normalizacja.
    const localWalks = load('walkHistory').map((w: any) => ({
      date: w.date,
      duration: (Number(w.duration) || 0) / 60, // s -> min
      distance: (Number(w.distance) || 0) / 1000, // m -> km
      _key: `${w.date}|${w.duration}`,
    }));
    walkApi
      .getAll()
      .then((res: any) => {
        const apiWalks = (res.walks || []).map((w: any) => ({
          date: w.started_at,
          duration: (w.duration_seconds || 0) / 60, // s -> min
          distance: (w.distance_meters || 0) / 1000, // m -> km
          _key: `${w.started_at}|${w.duration_seconds}`,
        }));
        const apiKeys = new Set(apiWalks.map((w: any) => w._key));
        setWalks([...apiWalks, ...localWalks.filter((w: any) => !apiKeys.has(w._key))]);
      })
      .catch(() => setWalks(localWalks));
    setActivities([]); // zrodlo fake — nic realnego nie zapisuje 'activityHistory'
  }, []);

  const rangeStart = useMemo(() => {
    const d = new Date();
    if (timeRange === 'week') d.setDate(d.getDate() - 7);
    else if (timeRange === 'month') d.setMonth(d.getMonth() - 1);
    else d.setFullYear(d.getFullYear() - 1);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [timeRange]);

  const inRange = (dateStr: string) => new Date(dateStr) >= rangeStart;

  const filteredExpenses = useMemo(() => expenses.filter((e: any) => inRange(e.date)), [expenses, rangeStart]);
  const filteredWalks = useMemo(
    () => walks.filter((w: any) => w.date && !Number.isNaN(new Date(w.date).getTime()) && inRange(w.date)),
    [walks, rangeStart]
  );
  const filteredActivities = useMemo(() => activities.filter((a: any) => inRange(a.date)), [activities, rangeStart]);

  const totalExpenses = filteredExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const totalDistance = filteredWalks.reduce((s, w) => s + (Number(w.distance) || 0), 0) + filteredActivities.reduce((s, a) => s + (Number(a.distance) || 0), 0);
  const totalDuration = filteredWalks.reduce((s, w) => s + (Number(w.duration) || 0), 0) + filteredActivities.reduce((s, a) => s + (Number(a.duration) || 0), 0);
  const inventoryCount = inventory.length;
  const budgetLimit = budgets.reduce((s, b) => s + (Number(b.monthlyLimit) || 0), 0);
  const expensesOverBudget = totalExpenses > budgetLimit ? totalExpenses - budgetLimit : 0;

  const expenseCategoryColors: Record<string, string> = {
    food: '#f97316',
    medical: '#ef4444',
    accessories: '#3b82f6',
    hygiene: '#a855f7',
    toys: '#ec4899',
    other: '#64748b'
  };
  const expenseCategoryNames: Record<string, string> = {
    food: 'Karma', medical: 'Leczenie', accessories: 'Akcesoria', hygiene: 'Higiena', toys: 'Zabawki', other: 'Inne'
  };
  const activityTypeNames: Record<string, string> = { walk: 'Spacer', play: 'Zabawa', training: 'Trening', other: 'Inne' };
  const activityTypeColors: Record<string, string> = { walk: '#3b82f6', play: '#22c55e', training: '#a855f7', other: '#64748b' };
  const inventoryCategoryNames: Record<string, string> = { food: 'Karma', medicine: 'Leki', accessories: 'Akcesoria', other: 'Inne' };
  const inventoryCategoryColors: Record<string, string> = { food: '#f97316', medicine: '#ef4444', accessories: '#3b82f6', other: '#64748b' };

  const expenseByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    filteredExpenses.forEach((e: any) => {
      const cat = e.category || 'other';
      map[cat] = (map[cat] || 0) + (Number(e.amount) || 0);
    });
    return Object.entries(map).map(([key, value]) => ({
      key,
      label: expenseCategoryNames[key] || key,
      value,
      color: expenseCategoryColors[key] || '#64748b'
    }));
  }, [filteredExpenses]);

  const expensesByPeriod = useMemo(() => {
    const map = new Map<string, { key: string; label: string; value: number }>();
    filteredExpenses.forEach((e: any) => {
      const d = new Date(e.date);
      const isYear = timeRange === 'year';
      const key = isYear ? e.date.slice(0, 7) : e.date;
      const label = isYear
        ? d.toLocaleDateString('pl-PL', { month: 'short', year: '2-digit' })
        : `${d.getDate()}.${d.getMonth() + 1}`;
      const existing = map.get(key);
      if (existing) existing.value += Number(e.amount) || 0;
      else map.set(key, { key, label, value: Number(e.amount) || 0 });
    });
    return Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key));
  }, [filteredExpenses, timeRange]);

  const walksByDay = useMemo(() => {
    const map = new Map<string, { key: string; label: string; value: number }>();
    const sorted = [...filteredWalks, ...filteredActivities].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    sorted.forEach((w: any) => {
      const d = new Date(w.date);
      const key = w.date;
      const label = `${d.getDate()}.${d.getMonth() + 1}`;
      const existing = map.get(key);
      if (existing) existing.value += Number(w.distance) || 0;
      else map.set(key, { key, label, value: Number(w.distance) || 0 });
    });
    return Array.from(map.values()).slice(-14);
  }, [filteredWalks, filteredActivities]);

  const activityByType = useMemo(() => {
    const map: Record<string, number> = {};
    [...filteredWalks.map((w: any) => ({ ...w, type: 'walk' })), ...filteredActivities].forEach((a: any) => {
      const type = a.type || 'other';
      map[type] = (map[type] || 0) + (Number(a.duration) || 0);
    });
    return Object.entries(map).map(([key, value]) => ({
      key,
      label: activityTypeNames[key] || key,
      value,
      color: activityTypeColors[key] || '#64748b'
    }));
  }, [filteredWalks, filteredActivities]);

  const inventoryByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    inventory.forEach((i: any) => {
      const cat = i.category || 'other';
      map[cat] = (map[cat] || 0) + 1;
    });
    return Object.entries(map).map(([key, value]) => ({
      key,
      label: inventoryCategoryNames[key] || key,
      value,
      color: inventoryCategoryColors[key] || '#64748b'
    }));
  }, [inventory]);

  const statCards = [
    { title: 'Wydatki', value: `${totalExpenses.toLocaleString('pl-PL')} zł`, icon: DollarSign, color: 'text-brand-dark' },
    { title: 'Dystans', value: `${totalDistance.toFixed(1)} km`, icon: Activity, color: 'text-brand-dark' },
    { title: 'Aktywność', value: `${Math.round(totalDuration / 60)} h`, icon: Clock, color: 'text-violet-600' },
    { title: 'Stan magazynu', value: `${inventoryCount} poz.`, icon: Package, color: 'text-amber-600' },
  ];

  const AreaChart = ({ data, color = '#1B6B4A' }: { data: { label: string; value: number }[]; color?: string }) => {
    if (!data.length) return <p className="text-sm text-gray-400 text-center py-8">Brak danych</p>;
    const max = Math.max(...data.map(d => d.value), 1);
    const points = data.map((d, i) => {
      const x = (i / (data.length - 1 || 1)) * 100;
      const y = 100 - (d.value / max) * 100;
      return `${x},${y}`;
    }).join(' ');
    const areaPoints = `0,100 ${points} 100,100`;
    const gradId = `grad${color.replace('#', '')}`;
    return (
      <div className="h-48">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.5" />
              <stop offset="100%" stopColor={color} stopOpacity="0.05" />
            </linearGradient>
          </defs>
          <polygon points={areaPoints} fill={`url(#${gradId})`} stroke="none" />
          <polyline fill="none" stroke={color} strokeWidth="1.5" points={points} />
        </svg>
        <div className="flex justify-between text-[10px] text-gray-500 mt-1 px-1">
          {data.map((d, i) => <span key={i} className="truncate max-w-[20%] text-center">{d.label}</span>)}
        </div>
      </div>
    );
  };

  const StepChart = ({ data, color = '#10b981' }: { data: { label: string; value: number }[]; color?: string }) => {
    if (!data.length) return <p className="text-sm text-gray-400 text-center py-8">Brak danych</p>;
    const max = Math.max(...data.map(d => d.value), 1);
    const n = data.length;
    const x = (i: number) => n === 1 ? 50 : (i / (n - 1)) * 100;
    const y = (i: number) => 100 - (data[i].value / max) * 100;
    let path = `M 0,${y(0)}`;
    for (let i = 0; i < n - 1; i++) {
      const mid = (x(i) + x(i + 1)) / 2;
      path += ` L ${mid},${y(i)} L ${mid},${y(i + 1)}`;
    }
    path += ` L 100,${y(n - 1)}`;
    return (
      <div className="h-48">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
          <path d={path} fill="none" stroke={color} strokeWidth="1.5" />
          {data.map((_, i) => <circle key={i} cx={x(i)} cy={y(i)} r="1.5" fill={color} />)}
        </svg>
        <div className="flex justify-between text-[10px] text-gray-500 mt-1 px-1">
          {data.map((d, i) => <span key={i} className="truncate max-w-[20%] text-center">{d.label}</span>)}
        </div>
      </div>
    );
  };

  const RadarChart = ({ data, color = '#1B6B4A' }: { data: { label: string; value: number }[]; color?: string }) => {
    if (!data.length) return <p className="text-sm text-gray-400 text-center py-8">Brak danych</p>;
    const max = Math.max(...data.map(d => d.value), 1);
    const n = data.length;
    const center = 100;
    const radius = 75;
    const angle = (i: number) => (i / n) * 2 * Math.PI - Math.PI / 2;
    const point = (i: number, r: number) => {
      const a = angle(i);
      return `${center + r * Math.cos(a)},${center + r * Math.sin(a)}`;
    };
    const points = data.map((d, i) => point(i, (d.value / max) * radius)).join(' ');
    return (
      <div className="h-64 flex items-center justify-center">
        <svg viewBox="0 0 200 200" className="w-full h-full max-h-64">
          {[0.2, 0.4, 0.6, 0.8, 1].map((l, i) => (
            <circle key={i} cx={center} cy={center} r={l * radius} fill="none" stroke="#e2e8f0" strokeWidth="1" />
          ))}
          {data.map((_, i) => {
            const [x, y] = point(i, radius).split(',').map(Number);
            return <line key={i} x1={center} y1={center} x2={x} y2={y} stroke="#e2e8f0" strokeWidth="1" />;
          })}
          <polygon points={points} fill={color} fillOpacity="0.2" stroke={color} strokeWidth="2" />
          {data.map((_, i) => {
            const [x, y] = point(i, (data[i].value / max) * radius).split(',').map(Number);
            return <circle key={i} cx={x} cy={y} r="3" fill={color} />;
          })}
          {data.map((d, i) => {
            const [x, y] = point(i, radius + 15).split(',').map(Number);
            return <text key={i} x={x} y={y + 3} textAnchor="middle" className="text-[9px] fill-gray-600">{d.label}</text>;
          })}
        </svg>
      </div>
    );
  };

  const WaffleChart = ({ data }: { data: { label: string; value: number; color: string }[] }) => {
    if (!data.length) return <p className="text-sm text-gray-400 text-center py-8">Brak danych</p>;
    const total = data.reduce((s, d) => s + d.value, 0);
    const cells: string[] = [];
    data.forEach(d => {
      const count = Math.round((d.value / total) * 100);
      for (let i = 0; i < count; i++) cells.push(d.color);
    });
    while (cells.length < 100) cells.push('#f1f5f9');
    return (
      <div>
        <div className="grid grid-cols-10 gap-1 w-max mx-auto">
          {cells.map((c, i) => <div key={i} className="w-3 h-3 rounded-sm" style={{ backgroundColor: c }} />)}
        </div>
        <div className="flex flex-wrap justify-center gap-3 mt-4">
          {data.map((d, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: d.color }} />
              <span className="text-gray-600">{d.label}</span>
              <span className="font-semibold text-gray-900">{d.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header & Time Range */}
      <div className="pv-card p-5">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <h2 className="pv-section-title flex items-center gap-2">
              <Activity className="w-5 h-5 text-brand-dark" />
              Statystyki
            </h2>
            <p className="text-sm text-gray-500">Podsumowanie aktywności, finansów i zdrowia</p>
          </div>
          <div className="flex gap-2">
            {(['week', 'month', 'year'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 rounded-xl border font-medium transition-all ${
                  timeRange === range
                    ? 'bg-brand-dark text-white border-brand-dark'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-brand-dark/40'
                }`}
              >
                {range === 'week' ? 'Tydzień' : range === 'month' ? 'Miesiąc' : 'Rok'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((stat, idx) => (
          <div key={idx} className="pv-card p-5 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center ${stat.color}`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="text-sm text-gray-500">{stat.title}</div>
              <div className="text-2xl font-bold text-gray-900 truncate">{stat.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="pv-card p-5">
          <h3 className="pv-section-title mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-brand-dark" />
            Wydatki w czasie
          </h3>
          <AreaChart data={expensesByPeriod} color="#1B6B4A" />
        </div>

        <div className="pv-card p-5">
          <h3 className="pv-section-title mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-brand-dark" />
            Podział wydatków
          </h3>
          <RadarChart data={expenseByCategory} color="#1B6B4A" />
        </div>

        <div className="pv-card p-5">
          <h3 className="pv-section-title mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-brand-dark" />
            Dystans w czasie
          </h3>
          <StepChart data={walksByDay} color="#10b981" />
        </div>

        <div className="pv-card p-5">
          <h3 className="pv-section-title mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-brand-dark" />
            Typy aktywności
          </h3>
          <RadarChart data={activityByType} color="#10b981" />
        </div>

        <div className="pv-card p-5">
          <h3 className="pv-section-title mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-brand-dark" />
            Stan magazynowy
          </h3>
          <WaffleChart data={inventoryByCategory} />
        </div>

        <div className="pv-card p-5">
          <h3 className="pv-section-title mb-4 flex items-center gap-2">
            <Heart className="w-5 h-5 text-brand-dark" />
            Zdrowie
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
              <span className="text-sm text-gray-600">Analizy krwi w okresie</span>
              <span className="font-semibold text-gray-900">
                {bloodAnalyses.filter((a: any) => a.created_at && inRange(a.created_at)).length}
                <span className="text-xs font-normal text-gray-400"> / {bloodAnalyses.length}</span>
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
              <span className="text-sm text-gray-600">Limity budżetu</span>
              <span className="font-semibold text-gray-900">{budgets.length}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
              <span className="text-sm text-gray-600">Przekroczenie budżetu</span>
              <span className={`font-semibold ${expensesOverBudget > 0 ? 'text-red-600' : 'text-brand-dark'}`}>
                {expensesOverBudget.toLocaleString('pl-PL')} zł
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
