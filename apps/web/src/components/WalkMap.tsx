'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export type MapPoint = { lat: number; lng: number; timestamp?: number };

type WalkMapProps = {
  /** Punkty trasy (polilinia). */
  points: MapPoint[];
  /** Aktualna pozycja użytkownika (pulsująca kropka). */
  current?: { lat: number; lng: number } | null;
  /** Czy śledzenie jest aktywne (mapa podąża za punktem). */
  following?: boolean;
  /** Klasa wysokości kontenera. */
  className?: string;
};

const DEFAULT_CENTER: [number, number] = [52.2297, 21.0122]; // Warszawa

function startIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="width:16px;height:16px;border-radius:50%;background:#1B6B4A;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

function endIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="width:16px;height:16px;border-radius:4px;background:#0F3D2E;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);transform:rotate(45deg)"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

function currentIcon() {
  return L.divIcon({
    className: '',
    html: `
      <div style="position:relative;width:22px;height:22px">
        <div style="position:absolute;inset:0;border-radius:50%;background:rgba(27,107,74,.25);animation:pv-walk-ping 1.6s ease-out infinite"></div>
        <div style="position:absolute;inset:5px;border-radius:50%;background:#1B6B4A;border:3px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.4)"></div>
        <style>@keyframes pv-walk-ping{0%{transform:scale(.6);opacity:.9}100%{transform:scale(1.8);opacity:0}}</style>
      </div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

/** Dopasowuje widok mapy do trasy / pozycji. */
function FitBounds({ points, current, following }: { points: MapPoint[]; current?: { lat: number; lng: number } | null; following?: boolean }) {
  const map = useMap();

  useEffect(() => {
    if (points.length >= 2) {
      const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]));
      map.fitBounds(bounds, { padding: [40, 40], animate: !following, maxZoom: 17 });
      return;
    }
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 16);
      return;
    }
    if (current) {
      if (following) map.setView([current.lat, current.lng]);
      else map.setView([current.lat, current.lng], 16);
    }
  }, [points, current, following, map]);

  return null;
}

export default function WalkMap({ points, current, following = false, className = '' }: WalkMapProps) {
  const route = points.map((p) => [p.lat, p.lng] as [number, number]);
  const center: [number, number] = current
    ? [current.lat, current.lng]
    : points.length > 0
    ? [points[0].lat, points[0].lng]
    : DEFAULT_CENTER;

  return (
    <div className={`relative ${className}`}>
      <MapContainer
        center={center}
        zoom={points.length > 0 || current ? 16 : 12}
        scrollWheelZoom={false}
        className="w-full h-full z-0"
        style={{ minHeight: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={points} current={current} following={following} />
        {route.length >= 2 && (
          <Polyline positions={route} pathOptions={{ color: '#1B6B4A', weight: 5, opacity: 0.85, lineCap: 'round' }} />
        )}
        {route.length >= 1 && <Marker position={route[0]} icon={startIcon()} />}
        {route.length >= 2 && <Marker position={route[route.length - 1]} icon={endIcon()} />}
        {current && <Marker position={[current.lat, current.lng]} icon={currentIcon()} />}
        {current && (
          <CircleMarker
            center={[current.lat, current.lng]}
            radius={8}
            pathOptions={{ color: '#1B6B4A', weight: 0, fillOpacity: 0 }}
          />
        )}
      </MapContainer>
    </div>
  );
}
