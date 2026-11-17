'use client';

import { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import { MAP_STYLE_URL, add3dBuildings } from '@/lib/map';

export type PickedLocation = { lat: number; lng: number };

type LocationPickerProps = {
  value: PickedLocation | null;
  onChange: (loc: PickedLocation) => void;
  /** Poczatkowy srodek mapy (np. pozycja GPS uzytkownika). */
  initialCenter?: PickedLocation | null;
  /** Readonly: bez klikania i drag (podglad w szczegolach). */
  readOnly?: boolean;
  className?: string;
};

const DEFAULT_CENTER: [number, number] = [19.0, 52.0]; // Polska (lng, lat)

function pinElement(color = '#d97706') {
  const el = document.createElement('div');
  el.style.width = '34px';
  el.style.height = '42px';
  el.innerHTML = `
    <svg width="34" height="42" viewBox="0 0 34 42" style="filter:drop-shadow(0 3px 6px rgba(0,0,0,.35))">
      <path d="M17 40C17 40 3.5 24.5 3.5 15.5a13.5 13.5 0 1 1 27 0C30.5 24.5 17 40 17 40z" fill="${color}" stroke="#fff" stroke-width="2.5"/>
      <circle cx="17" cy="15.5" r="5.5" fill="#fff"/>
    </svg>`;
  return el;
}

export default function LocationPicker({
  value,
  onChange,
  initialCenter,
  readOnly = false,
  className = '',
}: LocationPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const recentered = useRef(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Inicjalizacja mapy (raz)
  useEffect(() => {
    if (!containerRef.current) return;
    const center: [number, number] = value
      ? [value.lng, value.lat]
      : initialCenter
      ? [initialCenter.lng, initialCenter.lat]
      : DEFAULT_CENTER;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE_URL,
      center,
      zoom: value || initialCenter ? 15 : 5,
      maxPitch: 60,
      attributionControl: { compact: true },
    });
    if (readOnly) {
      map.scrollZoom.disable();
      map.doubleClickZoom.disable();
    }
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.on('load', () => add3dBuildings(map));
    if (!readOnly) {
      map.on('click', (e) => onChangeRef.current({ lat: e.lngLat.lat, lng: e.lngLat.lng }));
      map.getCanvas().style.cursor = 'crosshair';
    }
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pinezka — sync z value
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!value) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }
    if (!markerRef.current) {
      markerRef.current = new maplibregl.Marker({
        element: pinElement(),
        draggable: !readOnly,
        anchor: 'bottom',
      })
        .setLngLat([value.lng, value.lat])
        .addTo(map);
      if (!readOnly) {
        markerRef.current.on('dragend', () => {
          const p = markerRef.current!.getLngLat();
          onChangeRef.current({ lat: p.lat, lng: p.lng });
        });
      }
    } else {
      markerRef.current.setLngLat([value.lng, value.lat]);
    }
  }, [value, readOnly]);

  // Gdy przyjdzie GPS — wycentruj raz
  useEffect(() => {
    const map = mapRef.current;
    if (map && initialCenter && !recentered.current) {
      recentered.current = true;
      map.jumpTo({ center: [initialCenter.lng, initialCenter.lat], zoom: 15 });
    }
  }, [initialCenter]);

  return (
    <div className={`relative rounded-2xl overflow-hidden border border-gray-200 ${className}`}>
      <div ref={containerRef} className="w-full h-full" />
      {!readOnly && !value && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-white/95 shadow-md text-xs font-semibold text-gray-700 pointer-events-none z-10">
          📍 Kliknij, aby zaznaczyć miejsce
        </div>
      )}
    </div>
  );
}
