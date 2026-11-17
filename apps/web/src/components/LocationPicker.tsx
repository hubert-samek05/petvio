'use client';

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

const DEFAULT_CENTER: [number, number] = [52.0, 19.0]; // Polska

function pawIcon(color = '#d97706') {
  return L.divIcon({
    className: '',
    html: `
      <div style="position:relative;width:34px;height:34px;transform:translateY(-4px)">
        <div style="position:absolute;inset:0;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35)"></div>
        <div style="position:absolute;left:50%;top:38%;width:10px;height:10px;margin-left:-5px;border-radius:50%;background:#fff"></div>
      </div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 30],
  });
}

function ClickHandler({ onPick, disabled }: { onPick: (l: PickedLocation) => void; disabled?: boolean }) {
  useMapEvents({
    click(e) {
      if (!disabled) onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

/** Dopasowuje widok gdy zmieni sie poczatkowy srodek (np. przyszedl GPS). */
function Recenter({ center }: { center?: PickedLocation | null }) {
  const map = useMap();
  const done = useRef(false);
  useEffect(() => {
    if (center && !done.current) {
      done.current = true;
      map.setView([center.lat, center.lng], 15);
    }
  }, [center, map]);
  return null;
}

export default function LocationPicker({
  value,
  onChange,
  initialCenter,
  readOnly = false,
  className = '',
}: LocationPickerProps) {
  const center: [number, number] = value
    ? [value.lat, value.lng]
    : initialCenter
    ? [initialCenter.lat, initialCenter.lng]
    : DEFAULT_CENTER;

  return (
    <div className={`relative rounded-2xl overflow-hidden border border-gray-200 ${className}`}>
      <MapContainer
        center={center}
        zoom={value || initialCenter ? 15 : 6}
        scrollWheelZoom
        className="w-full h-full z-0"
        style={{ minHeight: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Recenter center={initialCenter} />
        {!readOnly && <ClickHandler onPick={onChange} />}
        {value && (
          <Marker
            position={[value.lat, value.lng]}
            icon={pawIcon()}
            draggable={!readOnly}
            eventHandlers={
              readOnly
                ? undefined
                : {
                    dragend: (e) => {
                      const m = e.target.getLatLng();
                      onChange({ lat: m.lat, lng: m.lng });
                    },
                  }
            }
          />
        )}
      </MapContainer>
    </div>
  );
}
