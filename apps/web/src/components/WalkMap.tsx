'use client';

import { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MAP_STYLE_URL, add3dBuildings } from '@/lib/map';

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

const DEFAULT_CENTER: [number, number] = [19.0, 52.0]; // Polska

const el = (html: string) => {
  const d = document.createElement('div');
  d.innerHTML = html;
  return d;
};

const startHtml = `<div style="width:16px;height:16px;border-radius:50%;background:#1B6B4A;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`;
const endHtml = `<div style="width:16px;height:16px;border-radius:4px;background:#0F3D2E;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);transform:rotate(45deg)"></div>`;
const currentHtml = `
  <div style="position:relative;width:22px;height:22px">
    <div style="position:absolute;inset:0;border-radius:50%;background:rgba(27,107,74,.25);animation:pv-walk-ping 1.6s ease-out infinite"></div>
    <div style="position:absolute;inset:5px;border-radius:50%;background:#1B6B4A;border:3px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.4)"></div>
    <style>@keyframes pv-walk-ping{0%{transform:scale(.6);opacity:.9}100%{transform:scale(1.8);opacity:0}}</style>
  </div>`;

const EMPTY_LINE: GeoJSON.Feature = {
  type: 'Feature',
  properties: {},
  geometry: { type: 'LineString', coordinates: [] },
};

export default function WalkMap({ points, current, following = false, className = '' }: WalkMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const loaded = useRef(false);
  const startRef = useRef<maplibregl.Marker | null>(null);
  const endRef = useRef<maplibregl.Marker | null>(null);
  const curRef = useRef<maplibregl.Marker | null>(null);
  const pointsRef = useRef(points);
  pointsRef.current = points;
  const currentRef = useRef(current);
  currentRef.current = current;
  const followingRef = useRef(following);
  followingRef.current = following;

  const syncRoute = () => {
    const map = mapRef.current;
    if (!map || !loaded.current) return;
    const p = pointsRef.current;
    const src = map.getSource('route') as maplibregl.GeoJSONSource | undefined;
    src?.setData({
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: p.map((x) => [x.lng, x.lat]) },
    });
    if (p.length >= 1) {
      if (!startRef.current)
        startRef.current = new maplibregl.Marker({ element: el(startHtml) }).addTo(map);
      startRef.current.setLngLat([p[0].lng, p[0].lat]);
    } else {
      startRef.current?.remove();
      startRef.current = null;
    }
    if (p.length >= 2) {
      if (!endRef.current)
        endRef.current = new maplibregl.Marker({ element: el(endHtml) }).addTo(map);
      endRef.current.setLngLat([p[p.length - 1].lng, p[p.length - 1].lat]);
    } else {
      endRef.current?.remove();
      endRef.current = null;
    }
  };

  // Inicjalizacja mapy (raz)
  useEffect(() => {
    if (!containerRef.current) return;
    const p0 = pointsRef.current;
    const c0 = currentRef.current;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE_URL,
      center: c0 ? [c0.lng, c0.lat] : p0.length ? [p0[0].lng, p0[0].lat] : DEFAULT_CENTER,
      zoom: p0.length || c0 ? 16 : 12,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.on('load', () => {
      loaded.current = true;
      add3dBuildings(map);
      map.addSource('route', { type: 'geojson', data: EMPTY_LINE });
      map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#1B6B4A', 'line-width': 5, 'line-opacity': 0.85 },
      });
      syncRoute();
    });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      loaded.current = false;
      startRef.current = endRef.current = curRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Trasa — sync przy zmianie punktow
  useEffect(syncRoute, [points]);

  // Kropka aktualnej pozycji
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!current) {
      curRef.current?.remove();
      curRef.current = null;
      return;
    }
    if (!curRef.current) {
      curRef.current = new maplibregl.Marker({ element: el(currentHtml) })
        .setLngLat([current.lng, current.lat])
        .addTo(map);
    } else {
      curRef.current.setLngLat([current.lng, current.lat]);
    }
  }, [current]);

  // Widok: dopasowanie do trasy / podazanie za pozycja
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded.current) return;
    if (points.length >= 2) {
      const lngs = points.map((p) => p.lng);
      const lats = points.map((p) => p.lat);
      map.fitBounds(
        [
          [Math.min(...lngs), Math.min(...lats)],
          [Math.max(...lngs), Math.max(...lats)],
        ],
        { padding: 40, duration: following ? 0 : 600, maxZoom: 17 }
      );
      return;
    }
    if (points.length === 1) {
      map.jumpTo({ center: [points[0].lng, points[0].lat], zoom: 16 });
      return;
    }
    if (current) {
      if (following) map.easeTo({ center: [current.lng, current.lat] });
      else map.jumpTo({ center: [current.lng, current.lat], zoom: 16 });
    }
  }, [points, current, following]);

  return (
    <div className={`relative ${className}`}>
      <div ref={containerRef} className="w-full h-full rounded-2xl overflow-hidden" />
    </div>
  );
}
