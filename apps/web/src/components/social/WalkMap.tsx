'use client';

import { Footprints, Clock, Route, Flag } from 'lucide-react';
import { WalkShare } from './shared';

const formatDuration = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}min` : `${m} min`;
};

const paceMinPerKm = (distanceM: number, seconds: number) => {
  if (distanceM < 50 || seconds < 30) return null;
  const p = seconds / 60 / (distanceM / 1000);
  return `${Math.floor(p)}:${String(Math.round((p % 1) * 60)).padStart(2, '0')} min/km`;
};

export function WalkRouteMap({ points, height = 180 }: { points: { lat: number; lng: number }[]; height?: number }) {
  const W = 400;
  const H = 240;
  if (!points || points.length < 2) {
    return (
      <div
        className="w-full flex items-center justify-center bg-brand-mint/40"
        style={{ height }}
      >
        <Footprints className="w-8 h-8 text-brand-dark/40" />
      </div>
    );
  }
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const pad = 24;
  const dLat = Math.max(maxLat - minLat, 0.0001);
  const dLng = Math.max(maxLng - minLng, 0.0001);
  const scale = Math.min((W - pad * 2) / dLng, (H - pad * 2) / dLat);
  const cx = (minLng + maxLng) / 2, cy = (minLat + maxLat) / 2;
  const toXY = (p: { lat: number; lng: number }) => ({
    x: W / 2 + (p.lng - cx) * scale,
    y: H / 2 - (p.lat - cy) * scale,
  });
  const pts = points.map(toXY);
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const start = pts[0];
  const end = pts[pts.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full block" style={{ height }} preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="wmk-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#E8F5EE" />
          <stop offset="100%" stopColor="#D3EBDF" />
        </linearGradient>
        <pattern id="wmk-grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#BFE0D0" strokeWidth="0.6" />
        </pattern>
      </defs>
      <rect width={W} height={H} fill="url(#wmk-bg)" />
      <rect width={W} height={H} fill="url(#wmk-grid)" />
      <path d={d} fill="none" stroke="#0F3D2E" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.18" />
      <path d={d} fill="none" stroke="#1B6B4A" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={start.x} cy={start.y} r="6" fill="#2E8B62" stroke="#fff" strokeWidth="2.5" />
      <circle cx={end.x} cy={end.y} r="7" fill="#E4574C" stroke="#fff" strokeWidth="2.5" />
      <rect x={end.x - 1.4} y={end.y - 15} width="2.8" height="9" rx="1.4" fill="#E4574C" />
    </svg>
  );
}

export default function WalkMap({ walk, compact = false }: { walk: WalkShare; compact?: boolean }) {
  const pace = paceMinPerKm(walk.distanceMeters, walk.durationSeconds);
  return (
    <div className="rounded-2xl border border-brand/20 overflow-hidden bg-white">
      <WalkRouteMap points={walk.points} height={compact ? 140 : 190} />
      <div className={`px-4 ${compact ? 'py-3' : 'py-4'}`}>
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-2.5">
          <span className="w-7 h-7 rounded-lg bg-brand-mint flex items-center justify-center flex-shrink-0">
            <Footprints className="w-4 h-4 text-brand-dark" />
          </span>
          <span className="truncate">
            Spacer{walk.petName ? ` z ${walk.petName}` : ''}
          </span>
          <span className="ml-auto text-xs font-normal text-gray-400 flex-shrink-0">
            {new Date(walk.startedAt).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })}
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-600 flex-wrap">
          <span className="inline-flex items-center gap-1.5 font-semibold text-brand-dark">
            <Route className="w-3.5 h-3.5" />
            {(walk.distanceMeters / 1000).toFixed(2)} km
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {formatDuration(walk.durationSeconds)}
          </span>
          {pace && (
            <span className="inline-flex items-center gap-1.5">
              <Flag className="w-3.5 h-3.5" />
              {pace}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
