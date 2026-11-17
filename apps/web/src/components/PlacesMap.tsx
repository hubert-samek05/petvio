'use client';

import { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { Feature } from 'geojson';
import { MAP_STYLE_URL, add3dBuildings } from '@/lib/map';

export type MapPlace = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: 'hotel' | 'petsitter' | 'vet' | 'dietitian';
  community?: boolean;
  urgent?: boolean;
};

export type MapLegendItem = { color: string; label: string };

type PlacesMapProps = {
  center: { lat: number; lng: number } | null;
  radiusKm?: number | null;
  places: MapPlace[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  className?: string;
  colors?: Partial<Record<string, string>>;
  legend?: MapLegendItem[];
};

const COLORS: Record<string, string> = {
  hotel: '#065f46',
  petsitter: '#b45309',
  vet: '#dc2626',
  dietitian: '#0891b2',
  community: '#7c3aed',
};

const DEFAULT_LEGEND: MapLegendItem[] = [
  { color: COLORS.hotel, label: 'Hotel dla zwierząt' },
  { color: COLORS.petsitter, label: 'Petsitter / opieka' },
  { color: COLORS.community, label: 'Od społeczności' },
];

function circleGeoJSON(lng: number, lat: number, radiusKm: number): Feature {
  const pts = 64;
  const coords: [number, number][] = [];
  const dLat = radiusKm / 111.32;
  const dLng = radiusKm / (111.32 * Math.max(Math.cos((lat * Math.PI) / 180), 0.05));
  for (let i = 0; i <= pts; i++) {
    const a = (i / pts) * 2 * Math.PI;
    coords.push([lng + dLng * Math.sin(a), lat + dLat * Math.cos(a)]);
  }
  return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [coords] }, properties: {} };
}

function pinElement(color: string, icon: MapPlace['type'] | 'petsitter') {
  const el = document.createElement('div');
  el.style.width = '32px';
  el.style.height = '40px';
  const inner =
    icon === 'hotel'
      ? '<rect x="11" y="9.5" width="10" height="9" rx="1.2" fill="none" stroke="#fff" stroke-width="1.6"/><rect x="13" y="15.5" width="2.6" height="3" fill="#fff"/><rect x="13" y="11.4" width="2.4" height="2.2" fill="#fff"/><rect x="16.6" y="11.4" width="2.4" height="2.2" fill="#fff"/>'
      : icon === 'vet'
        ? '<g fill="#fff"><rect x="14.2" y="9.5" width="3.6" height="13" rx="1"/><rect x="9.5" y="14.2" width="13" height="3.6" rx="1"/></g>'
        : icon === 'dietitian'
          ? '<g fill="#fff"><circle cx="16" cy="15.5" r="6.5"/><path d="M16 9c2 1.5 2 4.5 0 6.5s-2 4.5 0 6.5" stroke="#0891b2" stroke-width="1.4" fill="none"/></g>'
          : '<g fill="#fff"><ellipse cx="16" cy="17.5" rx="4.4" ry="3.4"/><circle cx="11" cy="13.4" r="1.8"/><circle cx="14.2" cy="11" r="1.8"/><circle cx="17.8" cy="11" r="1.8"/><circle cx="21" cy="13.4" r="1.8"/></g>';
  el.innerHTML = `
    <svg width="32" height="40" viewBox="0 0 32 40" style="filter:drop-shadow(0 3px 6px rgba(0,0,0,.35))">
      <path d="M16 38C16 38 3.4 23.4 3.4 14.7a12.6 12.6 0 1 1 25.2 0C28.6 23.4 16 38 16 38z" fill="${color}" stroke="#fff" stroke-width="2.4"/>
      ${inner}
    </svg>`;
  return el;
}

function userDotElement() {
  const el = document.createElement('div');
  el.style.width = '20px';
  el.style.height = '20px';
  el.innerHTML = `
    <div style="position:absolute;inset:0;border-radius:50%;background:rgba(37,99,235,.25);animation:pv-pulse 2s ease-out infinite"></div>
    <div style="position:absolute;inset:4px;border-radius:50%;background:#2563eb;border:2.5px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`;
  el.style.position = 'relative';
  return el;
}

export default function PlacesMap({
  center,
  radiusKm,
  places,
  selectedId,
  onSelect,
  className = '',
  colors,
  legend,
}: PlacesMapProps) {
  const colorOf = (p: MapPlace) =>
    (p.community ? colors?.community ?? COLORS.community : colors?.[p.type] ?? COLORS[p.type]) || COLORS.community;
  const legendItems = legend ?? DEFAULT_LEGEND;
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const centeredRef = useRef(false);

  // Inicjalizacja mapy (raz)
  useEffect(() => {
    if (!containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE_URL,
      center: center ? [center.lng, center.lat] : [19.4, 52.1],
      zoom: center ? 12 : 5.5,
      maxPitch: 60,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.on('load', () => {
      add3dBuildings(map);
      // warstwa promienia wyszukiwania
      map.addSource('pv-radius', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({
        id: 'pv-radius-fill',
        type: 'fill',
        source: 'pv-radius',
        paint: { 'fill-color': '#065f46', 'fill-opacity': 0.07 },
      });
      map.addLayer({
        id: 'pv-radius-line',
        type: 'line',
        source: 'pv-radius',
        paint: { 'line-color': '#065f46', 'line-width': 1.6, 'line-dasharray': [3, 2], 'line-opacity': 0.55 },
      });
    });
    mapRef.current = map;
    const ro = new ResizeObserver(() => map.resize());
    ro.observe(containerRef.current);
    return () => {
      ro.disconnect();
      markersRef.current.forEach((m) => m.remove());
      markersRef.current.clear();
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Srodek + promien + centrowanie gdy przyjdzie lokalizacja
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !center) return;
    if (!centeredRef.current) {
      centeredRef.current = true;
      map.jumpTo({ center: [center.lng, center.lat], zoom: 12 });
    }
    if (!userMarkerRef.current) {
      userMarkerRef.current = new maplibregl.Marker({ element: userDotElement() })
        .setLngLat([center.lng, center.lat])
        .addTo(map);
    } else {
      userMarkerRef.current.setLngLat([center.lng, center.lat]);
    }
  }, [center]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !center || !radiusKm) return;
    const apply = () => {
      const src = map.getSource('pv-radius') as maplibregl.GeoJSONSource | undefined;
      src?.setData({
        type: 'FeatureCollection',
        features: [circleGeoJSON(center.lng, center.lat, radiusKm)],
      });
    };
    if (map.isStyleLoaded()) apply();
    else map.once('styledata', apply);
  }, [center, radiusKm]);

  // Markery wynikow
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const seen = new Set<string>();
    places.forEach((p) => {
      seen.add(p.id);
      const existing = markersRef.current.get(p.id);
      if (existing) {
        existing.setLngLat([p.lng, p.lat]);
        return;
      }
      const color = colorOf(p);
      const el = pinElement(color, p.type);
      el.style.cursor = 'pointer';
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        onSelectRef.current?.(p.id);
      });
      const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([p.lng, p.lat]);
      marker.addTo(map);
      markersRef.current.set(p.id, marker);
    });
    markersRef.current.forEach((m, id) => {
      if (!seen.has(id)) {
        m.remove();
        markersRef.current.delete(id);
      }
    });
  }, [places]);

  // Wybrany marker — powieksz + lec do niego
  useEffect(() => {
    markersRef.current.forEach((m, id) => {
      const el = m.getElement();
      const sel = id === selectedId;
      el.style.transform = sel ? 'scale(1.35)' : '';
      el.style.zIndex = sel ? '5' : '1';
      el.style.transition = 'transform 150ms ease';
    });
    if (selectedId && mapRef.current) {
      const p = places.find((x) => x.id === selectedId);
      if (p) mapRef.current.easeTo({ center: [p.lng, p.lat], duration: 450 });
    }
  }, [selectedId, places]);

  return (
    <div className={`relative rounded-2xl overflow-hidden border border-gray-200 shadow-sm ${className}`}>
      <div ref={containerRef} className="w-full h-full" />
      {/* legenda */}
      <div className="absolute bottom-3 left-3 flex flex-col gap-1 px-3 py-2 rounded-xl bg-white/95 shadow-md text-[11px] font-medium text-gray-700 z-10 pointer-events-none">
        {legendItems.map((item) => (
          <span key={item.label} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} /> {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}
