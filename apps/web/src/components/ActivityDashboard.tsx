'use client';

import { petApi, walkApi, userPreferencesApi } from '@/lib/api';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Activity,
  Target,
  Calendar,
  Clock,
  MapPin,
  Flame,
  Award,
  ChevronDown,
  ChevronUp,
  PawPrint,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  Pencil,
} from 'lucide-react';

interface ActivityGoal {
  type: 'walks' | 'distance' | 'calories' | 'time';
  target: number;
  unit: string;
  icon: any;
}

interface ActivitySession {
  id: string;
  date: string;
  type: 'walk';
  duration: number; // minuty
  distance: number; // km
  calories: number;
  petId: string;
  petName?: string;
}

const PERIOD_DAYS = { week: 7, month: 30, year: 365 } as const;
const GOALS_KEY = 'activityGoalTargets_v1';

const DEFAULT_TARGETS: Record<ActivityGoal['type'], { target: number; unit: string }> = {
  walks: { target: 7, unit: 'spacerów' },
  distance: { target: 20, unit: 'km' },
  calories: { target: 2000, unit: 'kcal' },
  time: { target: 300, unit: 'min' },
};

// ~1.1 kcal na kg masy na km — przyblizenie dla psa; bez dystansu ~4 kcal/min
const estimateCalories = (distanceKm: number, durationMin: number, weightKg?: number) => {
  if (distanceKm > 0) return Math.round(distanceKm * (weightKg || 15) * 1.1);
  return Math.round(durationMin * 4);
};

export default function ActivityDashboard() {
  const [pets, setPets] = useState<any[]>([]);
  const [selectedPet, setSelectedPet] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('week');
  const [showGoals, setShowGoals] = useState(true);
  const [showHistory, setShowHistory] = useState(true);
  const [sessions, setSessions] = useState<ActivitySession[]>([]);
  const [targets, setTargets] = useState(DEFAULT_TARGETS);
  const [editingGoal, setEditingGoal] = useState<ActivityGoal['type'] | null>(null);
  const [editValue, setEditValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [goalsError, setGoalsError] = useState('');
  const [reloadTick, setReloadTick] = useState(0);

  // Cele: user_preferences (per-konto, synchronizacja) + migracja starego localStorage
  useEffect(() => {
    (async () => {
      let server: any = null;
      try {
        const res = await userPreferencesApi.get('activity_goals');
        server = res?.value ?? null;
      } catch {}
      let source = server;
      if (!source) {
        try {
          const legacy = JSON.parse(localStorage.getItem(GOALS_KEY) || 'null');
          if (legacy) {
            source = legacy;
            userPreferencesApi.set('activity_goals', legacy).catch(() => {});
          }
        } catch {}
      }
      try { localStorage.removeItem(GOALS_KEY); } catch {}
      if (source) {
        setTargets((t) => ({
          walks: { ...t.walks, ...(source.walks || {}) },
          distance: { ...t.distance, ...(source.distance || {}) },
          calories: { ...t.calories, ...(source.calories || {}) },
          time: { ...t.time, ...(source.time || {}) },
        }));
      }
    })();
  }, []);

  // Zwierzeta + spacery z API (+ fallback lokalny dla spacerow zapisanych offline)
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const petsRes = await petApi.getAll();
        const petList = (petsRes.pets || petsRes || []).map((p: any) => ({
          id: String(p.id),
          name: p.name,
          species: p.species,
          weight: Number(p.weight) || 0,
        }));
        setPets(petList);
        if (petList.length > 0) setSelectedPet(petList[0].id);

        const weightOf = (pid: string) => petList.find((p: any) => p.id === pid)?.weight;
        const all: ActivitySession[] = [];
        const seenKeys = new Set<string>();

        try {
          const res = await walkApi.getAll();
          (res.walks || []).forEach((w: any) => {
            const durMin = Math.round((w.duration_seconds || 0) / 60);
            const distKm = (w.distance_meters || 0) / 1000;
            const pid = String(w.pet_id);
            seenKeys.add(`${w.started_at}|${w.duration_seconds}`);
            all.push({
              id: `api_${w.id}`,
              date: w.started_at,
              type: 'walk',
              duration: durMin,
              distance: Math.round(distKm * 100) / 100,
              calories: estimateCalories(distKm, durMin, weightOf(pid)),
              petId: pid,
              petName: w.pet_name,
            });
          });
        } catch {
          setError('Nie udało się pobrać spacerów z serwera — pokazuję dane lokalne.');
        }

        // Spacery zapisane offline w localStorage (fallback WalkTrackera)
        try {
          const local = JSON.parse(localStorage.getItem('walkHistory') || '[]');
          local.forEach((w: any) => {
            const key = `${w.date}|${w.duration}`;
            if (seenKeys.has(key)) return;
            const durMin = Math.round((w.duration || 0) / 60);
            const distKm = (w.distance || 0) / 1000;
            all.push({
              id: `local_${w.id}`,
              date: w.date,
              type: 'walk',
              duration: durMin,
              distance: Math.round(distKm * 100) / 100,
              calories: estimateCalories(distKm, durMin),
              petId: 'unknown',
              petName: undefined,
            });
          });
        } catch {}

        all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setSessions(all);
      } catch {
        setError('Nie udało się załadować danych.');
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadTick]);

  const rangeStart = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - PERIOD_DAYS[selectedPeriod]);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [selectedPeriod]);

  const filtered = useMemo(
    () =>
      sessions.filter(
        (s) =>
          (!selectedPet || s.petId === selectedPet || s.petId === 'unknown') &&
          new Date(s.date) >= rangeStart
      ),
    [sessions, selectedPet, rangeStart]
  );

  const stats = useMemo(() => {
    const totalDuration = filtered.reduce((s, a) => s + a.duration, 0);
    const totalDistance = filtered.reduce((s, a) => s + a.distance, 0);
    const totalCalories = filtered.reduce((s, a) => s + a.calories, 0);
    return { totalDuration, totalDistance, totalCalories, totalSessions: filtered.length };
  }, [filtered]);

  const currentFor = (type: ActivityGoal['type']) => {
    switch (type) {
      case 'walks': return stats.totalSessions;
      case 'distance': return Math.round(stats.totalDistance * 10) / 10;
      case 'calories': return stats.totalCalories;
      case 'time': return stats.totalDuration;
    }
  };

  const goals: (ActivityGoal & { current: number })[] = useMemo(
    () =>
      (['walks', 'distance', 'calories', 'time'] as const).map((type) => ({
        type,
        target: targets[type].target,
        unit: targets[type].unit,
        icon: type === 'walks' ? PawPrint : type === 'distance' ? MapPin : type === 'calories' ? Flame : Clock,
        current: currentFor(type),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [targets, stats]
  );

  const saveTarget = (type: ActivityGoal['type'], val: number) => {
    const next = { ...targets, [type]: { ...targets[type], target: Math.max(1, val) } };
    setTargets(next);
    setEditingGoal(null);
    setGoalsError('');
    userPreferencesApi
      .set('activity_goals', Object.fromEntries(Object.entries(next).map(([k, v]) => [k, { target: v.target }])))
      .catch(() => setGoalsError('Nie udało się zapisać celu na serwerze — zmiana jest widoczna tylko na tym urządzeniu.'));
  };

  // Osiagniecia liczone z REALNYCH danych (calosc, nie tylko okres)
  const achievements = useMemo(() => {
    const totalKm = sessions.reduce((s, a) => s + a.distance, 0);
    const totalKcal = sessions.reduce((s, a) => s + a.calories, 0);
    const daysActive = new Set(sessions.map((s) => s.date.slice(0, 10))).size;
    const last7 = new Set(
      sessions.filter((s) => new Date(s.date) >= new Date(Date.now() - 7 * 864e5)).map((s) => s.date.slice(0, 10))
    ).size;
    return [
      { name: 'Pierwszy spacer', unlocked: sessions.length >= 1, icon: PawPrint },
      { name: '7 dni aktywności', unlocked: daysActive >= 7, icon: Calendar },
      { name: 'Aktywny tydzień', unlocked: last7 >= 5, icon: CheckCircle2 },
      { name: '10 km', unlocked: totalKm >= 10, icon: MapPin },
      { name: '50 km', unlocked: totalKm >= 50, icon: MapPin },
      { name: '1000 kcal', unlocked: totalKcal >= 1000, icon: Flame },
      { name: '20 spacerów', unlocked: sessions.length >= 20, icon: Award },
      { name: 'Maratończyk', unlocked: totalKm >= 42, icon: Award },
    ];
  }, [sessions]);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'short' });

  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}min` : `${m}min`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="w-8 h-8 text-brand-dark animate-spin" />
        <p className="text-sm text-gray-500">Pobieram aktywność...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-100 text-amber-700">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p className="text-sm font-medium flex-1">{error}</p>
          <button
            onClick={() => setReloadTick((t) => t + 1)}
            className="text-xs font-semibold underline hover:no-underline flex-shrink-0"
          >
            Spróbuj ponownie
          </button>
        </div>
      )}

      {goalsError && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 text-amber-700 text-xs">
          {goalsError}
        </div>
      )}

      {/* Wybor zwierzecia */}
      <div className="pv-card p-4 sm:p-6">
        <h3 className="pv-section-title mb-4">Wybierz zwierzę</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {pets.map((pet) => (
            <button
              key={pet.id}
              onClick={() => setSelectedPet(pet.id)}
              className={`p-4 rounded-xl border-2 transition-all ${
                selectedPet === pet.id ? 'border-brand-dark bg-brand-dark/5' : 'border-gray-200 hover:border-brand-dark/30'
              }`}
            >
              <div className="text-center">
                <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-brand-dark/10 flex items-center justify-center">
                  <PawPrint className="w-5 h-5 text-brand-dark" />
                </div>
                <div className="text-sm font-medium text-gray-700">{pet.name}</div>
                <div className="text-xs text-gray-500">{pet.weight} kg</div>
              </div>
            </button>
          ))}
          {pets.length === 0 && (
            <p className="col-span-4 text-sm text-gray-500 py-4 text-center">
              Brak zwierząt — dodaj pupila w zakładce Moje zwierzęta.
            </p>
          )}
        </div>
      </div>

      {/* Okres */}
      <div className="pv-card p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <h3 className="pv-section-title">Okres</h3>
          <div className="flex gap-2">
            {(['week', 'month', 'year'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedPeriod === period ? 'bg-brand-dark text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {period === 'week' ? 'Tydzień' : period === 'month' ? 'Miesiąc' : 'Rok'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Statystyki z realnych danych */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-gradient-to-br from-brand-dark to-brand p-4 sm:p-6 text-white">
          <Clock className="w-6 h-6 mb-2 opacity-80" />
          <div className="text-2xl sm:text-3xl font-bold">{formatDuration(stats.totalDuration)}</div>
          <div className="text-xs sm:text-sm opacity-80">Całkowity czas</div>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-brand-dark to-brand p-4 sm:p-6 text-white">
          <MapPin className="w-6 h-6 mb-2 opacity-80" />
          <div className="text-2xl sm:text-3xl font-bold">{stats.totalDistance.toFixed(1)} km</div>
          <div className="text-xs sm:text-sm opacity-80">Całkowity dystans</div>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-brand-dark to-brand p-4 sm:p-6 text-white">
          <Flame className="w-6 h-6 mb-2 opacity-80" />
          <div className="text-2xl sm:text-3xl font-bold">{stats.totalCalories}</div>
          <div className="text-xs sm:text-sm opacity-80">Kalorie (szac.)</div>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-brand-dark to-brand p-4 sm:p-6 text-white">
          <Activity className="w-6 h-6 mb-2 opacity-80" />
          <div className="text-2xl sm:text-3xl font-bold">{stats.totalSessions}</div>
          <div className="text-xs sm:text-sm opacity-80">Spacery</div>
        </div>
      </div>

      {/* Cele — targety edytowalne, postep z realnych danych */}
      <div className="pv-card overflow-hidden">
        <button
          onClick={() => setShowGoals(!showGoals)}
          className="w-full flex items-center justify-between p-4 sm:p-6 hover:bg-brand-mint/60 transition-all"
        >
          <div className="flex items-center gap-3">
            <Target className="w-5 h-5 text-brand-dark" />
            <h3 className="pv-section-title">Cele aktywności</h3>
            <span className="text-xs text-gray-400">
              ({selectedPeriod === 'week' ? 'tydzień' : selectedPeriod === 'month' ? 'miesiąc' : 'rok'})
            </span>
          </div>
          {showGoals ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </button>

        {showGoals && (
          <div className="border-t border-gray-200 p-4 sm:p-6 space-y-4">
            {goals.map((goal) => {
              const Icon = goal.icon;
              const progress = Math.min((goal.current / goal.target) * 100, 100);
              return (
                <div key={goal.type} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-dark/10 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-brand-dark" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {goal.type === 'walks' && 'Liczba spacerów'}
                          {goal.type === 'distance' && 'Dystans'}
                          {goal.type === 'calories' && 'Kalorie'}
                          {goal.type === 'time' && 'Czas'}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center gap-1">
                          {goal.current} /{' '}
                          {editingGoal === goal.type ? (
                            <input
                              type="number"
                              min="1"
                              autoFocus
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => saveTarget(goal.type, Number(editValue) || goal.target)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveTarget(goal.type, Number(editValue) || goal.target);
                                if (e.key === 'Escape') setEditingGoal(null);
                              }}
                              className="w-16 px-1 py-0 border border-brand rounded text-sm"
                            />
                          ) : (
                            <>
                              {goal.target}
                              <button
                                onClick={() => {
                                  setEditingGoal(goal.type);
                                  setEditValue(String(goal.target));
                                }}
                                className="text-gray-400 hover:text-brand-dark"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                            </>
                          )}{' '}
                          {goal.unit}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-brand-dark">{progress.toFixed(0)}%</div>
                      {progress >= 100 && <CheckCircle2 className="w-4 h-4 text-green-500 inline ml-1" />}
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-brand-dark to-brand rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Historia — realne spacery */}
      <div className="pv-card overflow-hidden">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="w-full flex items-center justify-between p-4 sm:p-6 hover:bg-brand-mint/60 transition-all"
        >
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-brand-dark" />
            <h3 className="pv-section-title">Historia spacerów</h3>
            <span className="text-sm text-gray-500">({filtered.length})</span>
          </div>
          {showHistory ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </button>

        {showHistory && (
          <div className="border-t border-gray-200 p-4 sm:p-6">
            {filtered.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-brand-mint flex items-center justify-center animate-float">
                  <PawPrint className="w-6 h-6 text-brand-dark" />
                </div>
                <p className="text-gray-700 font-medium">Brak zapisanej aktywności w tym okresie</p>
                <Link href="/dashboard/walk-tracker" className="text-sm text-brand-dark font-semibold hover:underline mt-1 inline-block">
                  Rozpocznij śledzenie spacerów →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.slice(0, 20).map((a) => (
                  <div key={a.id} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 hover:bg-brand-mint transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-brand-dark flex items-center justify-center">
                        <PawPrint className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          Spacer{a.petName ? ` — ${a.petName}` : ''}
                        </div>
                        <div className="text-sm text-gray-500">{formatDate(a.date)}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">{formatDuration(a.duration)}</div>
                      <div className="text-sm text-gray-500">
                        {a.distance > 0 && `${a.distance.toFixed(1)} km`}
                        {a.distance > 0 && a.calories > 0 && ' • '}
                        {a.calories > 0 && `${a.calories} kcal`}
                      </div>
                    </div>
                  </div>
                ))}
                {filtered.length > 20 && (
                  <p className="text-xs text-gray-400 text-center pt-2">+{filtered.length - 20} starszych spacerów</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Osiagniecia — liczone z danych */}
      <div className="pv-card p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-4">
          <Award className="w-5 h-5 text-brand-dark" />
          <h3 className="pv-section-title">Osiągnięcia</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {achievements.map((a, i) => {
            const Icon = a.icon;
            return (
              <div
                key={i}
                className={`p-4 rounded-xl border-2 text-center transition-all ${
                  a.unlocked ? 'border-brand-dark bg-brand-dark/5' : 'border-gray-200 bg-gray-50 opacity-50'
                }`}
              >
                <div
                  className={`w-10 h-10 mx-auto mb-2 rounded-full flex items-center justify-center ${
                    a.unlocked ? 'bg-brand-dark' : 'bg-gray-300'
                  }`}
                >
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="text-xs font-medium text-gray-700">{a.name}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
