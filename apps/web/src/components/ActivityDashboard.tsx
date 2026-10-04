'use client';

import { useState, useEffect } from 'react';
import { 
  Activity, 
  Target, 
  TrendingUp, 
  Calendar, 
  Clock, 
  MapPin, 
  Flame, 
  Award,
  BarChart3,
  ChevronDown,
  ChevronUp,
  PawPrint,
  CheckCircle2
} from 'lucide-react';

interface ActivityGoal {
  id: string;
  type: 'walks' | 'distance' | 'calories' | 'time';
  target: number;
  current: number;
  unit: string;
  icon: any;
}

interface ActivitySession {
  id: string;
  date: string;
  type: 'walk' | 'play' | 'training';
  duration: number;
  distance: number;
  calories: number;
  petId: string;
}

export default function ActivityDashboard() {
  const [selectedPet, setSelectedPet] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('week');
  const [showGoals, setShowGoals] = useState(true);
  const [showHistory, setShowHistory] = useState(true);
  const [pets, setPets] = useState<any[]>([]);
  const [goals, setGoals] = useState<ActivityGoal[]>([]);
  const [activityHistory, setActivityHistory] = useState<ActivitySession[]>([]);

  useEffect(() => {
    // Load pets
    const userData = localStorage.getItem('user');
    if (userData) {
      setPets([
        { id: '1', name: 'Burek', species: 'dog', weight: 25 },
        { id: '2', name: 'Mia', species: 'cat', weight: 5 },
      ]);
      setSelectedPet('1');
    }

    // Load goals from localStorage
    const savedGoals = localStorage.getItem('activityGoals');
    if (savedGoals) {
      setGoals(JSON.parse(savedGoals));
    } else {
      // Default goals
      setGoals([
        { id: '1', type: 'walks', target: 7, current: 5, unit: 'spacerów', icon: PawPrint },
        { id: '2', type: 'distance', target: 20, current: 12.5, unit: 'km', icon: MapPin },
        { id: '3', type: 'calories', target: 2000, current: 1450, unit: 'kcal', icon: Flame },
        { id: '4', type: 'time', target: 300, current: 180, unit: 'min', icon: Clock },
      ]);
    }

    // Load activity history
    const savedHistory = localStorage.getItem('activityHistory');
    if (savedHistory) {
      setActivityHistory(JSON.parse(savedHistory));
    } else {
      // Sample data
      setActivityHistory([
        { id: '1', date: '2026-07-16', type: 'walk', duration: 45, distance: 3.2, calories: 180, petId: '1' },
        { id: '2', date: '2026-07-15', type: 'walk', duration: 30, distance: 2.1, calories: 120, petId: '1' },
        { id: '3', date: '2026-07-15', type: 'play', duration: 20, distance: 0, calories: 80, petId: '1' },
        { id: '4', date: '2026-07-14', type: 'walk', duration: 50, distance: 4.5, calories: 220, petId: '1' },
        { id: '5', date: '2026-07-13', type: 'training', duration: 25, distance: 0, calories: 100, petId: '1' },
      ]);
    }
  }, []);

  const calculateProgress = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  const getActivityTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      walk: 'Spacer',
      play: 'Zabawa',
      training: 'Trening',
    };
    return labels[type] || type;
  };

  const getActivityTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      walk: 'bg-brand-dark',
      play: 'bg-green-500',
      training: 'bg-purple-500',
    };
    return colors[type] || 'bg-gray-500';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pl-PL', {
      day: 'numeric',
      month: 'short',
    });
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}min`;
    }
    return `${mins}min`;
  };

  const getTotalStats = () => {
    const totalDuration = activityHistory.reduce((sum, a) => sum + a.duration, 0);
    const totalDistance = activityHistory.reduce((sum, a) => sum + a.distance, 0);
    const totalCalories = activityHistory.reduce((sum, a) => sum + a.calories, 0);
    const totalSessions = activityHistory.length;

    return { totalDuration, totalDistance, totalCalories, totalSessions };
  };

  const stats = getTotalStats();

  return (
    <div className="space-y-6">
      {/* Pet Selection */}
      <div className="rounded-2xl bg-white border border-gray-200 p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Wybierz zwierzę</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {pets.map((pet) => (
            <button
              key={pet.id}
              onClick={() => setSelectedPet(pet.id)}
              className={`p-4 rounded-xl border-2 transition-all ${
                selectedPet === pet.id
                  ? 'border-brand-dark bg-brand-dark/5'
                  : 'border-gray-200 hover:border-brand-dark/30'
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
        </div>
      </div>

      {/* Period Selector */}
      <div className="rounded-2xl bg-white border border-gray-200 p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Okres</h3>
          <div className="flex gap-2">
            {(['week', 'month', 'year'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedPeriod === period
                    ? 'bg-brand-dark text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {period === 'week' ? 'Tydzień' : period === 'month' ? 'Miesiąc' : 'Rok'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Overall Stats */}
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
          <div className="text-xs sm:text-sm opacity-80">Spalone kalorie</div>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-brand-dark to-brand p-4 sm:p-6 text-white">
          <Activity className="w-6 h-6 mb-2 opacity-80" />
          <div className="text-2xl sm:text-3xl font-bold">{stats.totalSessions}</div>
          <div className="text-xs sm:text-sm opacity-80">Sesje treningowe</div>
        </div>
      </div>

      {/* Goals Section */}
      <div className="rounded-2xl bg-white border border-gray-200 overflow-hidden">
        <button
          onClick={() => setShowGoals(!showGoals)}
          className="w-full flex items-center justify-between p-4 sm:p-6 hover:bg-gray-50 transition-all"
        >
          <div className="flex items-center gap-3">
            <Target className="w-5 h-5 text-brand-dark" />
            <h3 className="text-lg font-semibold text-gray-900">Cele aktywności</h3>
          </div>
          {showGoals ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {showGoals && (
          <div className="border-t border-gray-200 p-4 sm:p-6 space-y-4">
            {goals.map((goal) => {
              const Icon = goal.icon;
              const progress = calculateProgress(goal.current, goal.target);
              return (
                <div key={goal.id} className="space-y-2">
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
                        <div className="text-sm text-gray-500">
                          {goal.current} / {goal.target} {goal.unit}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-brand-dark">{progress.toFixed(0)}%</div>
                      {progress >= 100 && (
                        <CheckCircle2 className="w-4 h-4 text-green-500 inline ml-1" />
                      )}
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

      {/* Activity History */}
      <div className="rounded-2xl bg-white border border-gray-200 overflow-hidden">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="w-full flex items-center justify-between p-4 sm:p-6 hover:bg-gray-50 transition-all"
        >
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-brand-dark" />
            <h3 className="text-lg font-semibold text-gray-900">Historia aktywności</h3>
            <span className="text-sm text-gray-500">({activityHistory.length})</span>
          </div>
          {showHistory ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {showHistory && (
          <div className="border-t border-gray-200 p-4 sm:p-6">
            {activityHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Brak zapisanej aktywności</p>
                <p className="text-sm mt-1">Rozpocznij aktywność aby zobaczyć historię</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activityHistory.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full ${getActivityTypeColor(activity.type)} flex items-center justify-center`}>
                        <Activity className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {getActivityTypeLabel(activity.type)}
                        </div>
                        <div className="text-sm text-gray-500">{formatDate(activity.date)}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">{formatDuration(activity.duration)}</div>
                      <div className="text-sm text-gray-500">
                        {activity.distance > 0 && `${activity.distance.toFixed(1)} km`}
                        {activity.distance > 0 && activity.calories > 0 && ' • '}
                        {activity.calories > 0 && `${activity.calories} kcal`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Achievements */}
      <div className="rounded-2xl bg-white border border-gray-200 p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-4">
          <Award className="w-5 h-5 text-brand-dark" />
          <h3 className="text-lg font-semibold text-gray-900">Osiągnięcia</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { name: 'Pierwszy spacer', unlocked: true, icon: PawPrint },
            { name: 'Tydzień aktywności', unlocked: true, icon: Calendar },
            { name: '10 km', unlocked: false, icon: MapPin },
            { name: '1000 kcal', unlocked: false, icon: Flame },
          ].map((achievement, index) => {
            const Icon = achievement.icon;
            return (
              <div
                key={index}
                className={`p-4 rounded-xl border-2 text-center transition-all ${
                  achievement.unlocked
                    ? 'border-brand-dark bg-brand-dark/5'
                    : 'border-gray-200 bg-gray-50 opacity-50'
                }`}
              >
                <div className={`w-10 h-10 mx-auto mb-2 rounded-full flex items-center justify-center ${
                  achievement.unlocked ? 'bg-brand-dark' : 'bg-gray-300'
                }`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="text-xs font-medium text-gray-700">{achievement.name}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
