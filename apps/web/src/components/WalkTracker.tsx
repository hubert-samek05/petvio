'use client';

import { useState, useEffect, useRef } from 'react';
import { MapPin, Play, Pause, Square, Clock, Route, Activity, History, Plus, ChevronDown, ChevronUp, PawPrint } from 'lucide-react';

interface WalkPoint {
  lat: number;
  lng: number;
  timestamp: number;
}

interface Walk {
  id: string;
  date: string;
  duration: number;
  distance: number;
  points: WalkPoint[];
}

export default function WalkTracker() {
  const [isTracking, setIsTracking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentWalk, setCurrentWalk] = useState<WalkPoint[]>([]);
  const [walkHistory, setWalkHistory] = useState<Walk[]>([]);
  const [duration, setDuration] = useState(0);
  const [distance, setDistance] = useState(0);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showHistory, setShowHistory] = useState(true);
  const [selectedPet, setSelectedPet] = useState<string | null>(null);
  const [pets, setPets] = useState<any[]>([]);

  const watchIdRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    // Load pets from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      // In a real app, you'd fetch pets from API
      setPets([
        { id: '1', name: 'Burek', species: 'dog' },
        { id: '2', name: 'Mia', species: 'cat' },
      ]);
    }

    // Load walk history from localStorage
    const savedHistory = localStorage.getItem('walkHistory');
    if (savedHistory) {
      setWalkHistory(JSON.parse(savedHistory));
    }

    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (isTracking && !isPaused) {
      timerRef.current = setInterval(() => {
        if (startTimeRef.current) {
          setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isTracking, isPaused]);

  const cleanup = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startWalk = () => {
    if (!selectedPet) {
      alert('Wybierz zwierzę przed rozpoczęciem spaceru');
      return;
    }

    setIsTracking(true);
    setIsPaused(false);
    setCurrentWalk([]);
    setDuration(0);
    setDistance(0);
    startTimeRef.current = Date.now();

    if ('geolocation' in navigator) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const newPoint: WalkPoint = {
            lat: latitude,
            lng: longitude,
            timestamp: Date.now(),
          };

          setCurrentLocation({ lat: latitude, lng: longitude });
          setCurrentWalk((prev) => {
            const updated = [...prev, newPoint];
            
            // Calculate distance
            if (prev.length > 0) {
              const lastPoint = prev[prev.length - 1];
              const dist = calculateDistance(
                lastPoint.lat,
                lastPoint.lng,
                latitude,
                longitude
              );
              setDistance((prevDist) => prevDist + dist);
            }
            
            return updated;
          });
        },
        (error) => {
          console.error('Geolocation error:', error);
          alert('Nie udało się pobrać lokalizacji. Sprawdź uprawnienia GPS.');
          stopWalk();
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    } else {
      alert('Geolokalizacja nie jest wspierana przez tę przeglądarkę');
    }
  };

  const pauseWalk = () => {
    setIsPaused(true);
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  };

  const resumeWalk = () => {
    setIsPaused(false);
    if ('geolocation' in navigator) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const newPoint: WalkPoint = {
            lat: latitude,
            lng: longitude,
            timestamp: Date.now(),
          };

          setCurrentLocation({ lat: latitude, lng: longitude });
          setCurrentWalk((prev) => {
            const updated = [...prev, newPoint];
            
            if (prev.length > 0) {
              const lastPoint = prev[prev.length - 1];
              const dist = calculateDistance(
                lastPoint.lat,
                lastPoint.lng,
                latitude,
                longitude
              );
              setDistance((prevDist) => prevDist + dist);
            }
            
            return updated;
          });
        },
        (error) => {
          console.error('Geolocation error:', error);
          alert('Nie udało się pobrać lokalizacji');
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    }
  };

  const stopWalk = () => {
    cleanup();
    setIsTracking(false);
    setIsPaused(false);
    startTimeRef.current = null;

    if (currentWalk.length > 0) {
      const newWalk: Walk = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        duration,
        distance,
        points: currentWalk,
      };

      const updatedHistory = [newWalk, ...walkHistory];
      setWalkHistory(updatedHistory);
      localStorage.setItem('walkHistory', JSON.stringify(updatedHistory));
    }

    setCurrentWalk([]);
    setDuration(0);
    setDistance(0);
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c * 1000; // Distance in meters
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDistance = (meters: number) => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(2)}km`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pl-PL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Pet Selection */}
      {!isTracking && (
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
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Current Walk Stats */}
      {isTracking && (
        <div className="rounded-2xl bg-gradient-to-br from-brand-dark to-brand p-4 sm:p-6 text-white">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="text-center">
              <Clock className="w-6 h-6 mx-auto mb-2 opacity-80" />
              <div className="text-2xl sm:text-3xl font-bold">{formatDuration(duration)}</div>
              <div className="text-xs sm:text-sm opacity-80">Czas</div>
            </div>
            <div className="text-center">
              <Route className="w-6 h-6 mx-auto mb-2 opacity-80" />
              <div className="text-2xl sm:text-3xl font-bold">{formatDistance(distance)}</div>
              <div className="text-xs sm:text-sm opacity-80">Dystans</div>
            </div>
            <div className="text-center col-span-2 sm:col-span-1">
              <Activity className="w-6 h-6 mx-auto mb-2 opacity-80" />
              <div className="text-2xl sm:text-3xl font-bold">{currentWalk.length}</div>
              <div className="text-xs sm:text-sm opacity-80">Punkty</div>
            </div>
          </div>
        </div>
      )}

      {/* Map Placeholder */}
      <div className="rounded-2xl bg-white border border-gray-200 overflow-hidden">
        <div className="aspect-video bg-gray-100 relative flex items-center justify-center">
          {currentLocation ? (
            <div className="text-center">
              <MapPin className="w-12 h-12 text-brand-dark mx-auto mb-2" />
              <div className="text-sm text-gray-600">
                {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {isTracking ? 'Śledzenie aktywne' : 'Lokalizacja dostępna'}
              </div>
            </div>
          ) : (
            <div className="text-center">
              <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <div className="text-sm text-gray-500">
                {isTracking ? 'Oczekiwanie na GPS...' : 'Rozpocznij spacer aby zobaczyć mapę'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="rounded-2xl bg-white border border-gray-200 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row gap-3">
          {!isTracking ? (
            <button
              onClick={startWalk}
              disabled={!selectedPet}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-brand-dark text-white font-semibold hover:bg-brand-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="w-5 h-5" />
              Rozpocznij spacer
            </button>
          ) : (
            <>
              {!isPaused ? (
                <button
                  onClick={pauseWalk}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-amber-500 text-white font-semibold hover:bg-amber-600 transition-all"
                >
                  <Pause className="w-5 h-5" />
                  Pauzuj
                </button>
              ) : (
                <button
                  onClick={resumeWalk}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-brand-dark text-white font-semibold hover:bg-brand-dark transition-all"
                >
                  <Play className="w-5 h-5" />
                  Wznów
                </button>
              )}
              <button
                onClick={stopWalk}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 transition-all"
              >
                <Square className="w-5 h-5" />
                Zakończ
              </button>
            </>
          )}
        </div>
      </div>

      {/* Walk History */}
      <div className="rounded-2xl bg-white border border-gray-200 overflow-hidden">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="w-full flex items-center justify-between p-4 sm:p-6 hover:bg-gray-50 transition-all"
        >
          <div className="flex items-center gap-3">
            <History className="w-5 h-5 text-brand-dark" />
            <h3 className="text-lg font-semibold text-gray-900">Historia spacerów</h3>
            <span className="text-sm text-gray-500">({walkHistory.length})</span>
          </div>
          {showHistory ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {showHistory && (
          <div className="border-t border-gray-200 p-4 sm:p-6">
            {walkHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Brak zapisanych spacerów</p>
                <p className="text-sm mt-1">Rozpocznij swój pierwszy spacer!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {walkHistory.map((walk) => (
                  <div
                    key={walk.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-brand-dark/10 flex items-center justify-center">
                        <Route className="w-5 h-5 text-brand-dark" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{formatDate(walk.date)}</div>
                        <div className="text-sm text-gray-500">
                          {walk.points.length} punktów GPS
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">{formatDistance(walk.distance)}</div>
                      <div className="text-sm text-gray-500">{formatDuration(walk.duration)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
