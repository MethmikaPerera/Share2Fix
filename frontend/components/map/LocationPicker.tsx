'use client';

import 'leaflet/dist/leaflet.css';
import type { Map as LeafletMap, Marker } from 'leaflet';
import { useEffect, useRef } from 'react';
import { SRI_LANKA_CENTER } from '@/lib/constants';

interface Props {
  value: { lat: number; lng: number } | null;
  onChange: (lat: number, lng: number) => void;
  height?: string;
}

const OSM_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const PIN_SVG =
  '<svg width="34" height="42" viewBox="0 0 30 38" aria-hidden="true"><path d="M15 1C7.8 1 2 6.8 2 14c0 9.6 13 23 13 23s13-13.4 13-23C28 6.8 22.2 1 15 1Z" fill="#0b5d59" stroke="#fdfcf9" stroke-width="2"/><circle cx="15" cy="14" r="4.5" fill="#fdfcf9"/></svg>';

/** Click the map (or drag the pin) to choose the issue location. */
export function LocationPicker({ value, onChange, height = '320px' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import('leaflet')).default;
      if (cancelled || !containerRef.current || mapRef.current) return;
      const start = valueRef.current ?? null;
      const map = L.map(containerRef.current).setView(start ? [start.lat, start.lng] : SRI_LANKA_CENTER, start ? 16 : 7);
      L.tileLayer(OSM_TILES, { attribution: OSM_ATTRIBUTION, maxZoom: 19 }).addTo(map);

      const icon = L.divIcon({ className: 's2f-pin', html: PIN_SVG, iconSize: [34, 42], iconAnchor: [17, 41] });
      const place = (lat: number, lng: number) => {
        if (markerRef.current) markerRef.current.setLatLng([lat, lng]);
        else {
          const m = L.marker([lat, lng], { icon, draggable: true }).addTo(map);
          m.on('dragend', () => {
            const p = m.getLatLng();
            onChangeRef.current(p.lat, p.lng);
          });
          markerRef.current = m;
        }
      };
      if (start) place(start.lat, start.lng);
      map.on('click', (e) => {
        place(e.latlng.lat, e.latlng.lng);
        onChangeRef.current(e.latlng.lat, e.latlng.lng);
      });
      mapRef.current = map;
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  // Keep the marker in sync when the value changes from outside (e.g. GPS button).
  useEffect(() => {
    (async () => {
      const L = (await import('leaflet')).default;
      for (let i = 0; i < 40 && !mapRef.current; i++) await new Promise((r) => setTimeout(r, 50));
      const map = mapRef.current;
      if (!map || !value) return;
      if (markerRef.current) {
        const cur = markerRef.current.getLatLng();
        if (Math.abs(cur.lat - value.lat) < 1e-7 && Math.abs(cur.lng - value.lng) < 1e-7) return;
        markerRef.current.setLatLng([value.lat, value.lng]);
      } else {
        const icon = L.divIcon({ className: 's2f-pin', html: PIN_SVG, iconSize: [34, 42], iconAnchor: [17, 41] });
        const m = L.marker([value.lat, value.lng], { icon, draggable: true }).addTo(map);
        m.on('dragend', () => {
          const p = m.getLatLng();
          onChangeRef.current(p.lat, p.lng);
        });
        markerRef.current = m;
      }
      map.setView([value.lat, value.lng], Math.max(map.getZoom(), 16));
    })();
  }, [value]);

  return (
    <div
      ref={containerRef}
      style={{ height }}
      className="w-full overflow-hidden rounded-md border border-line-strong"
      role="application"
      aria-label="Choose the issue location on the map"
    />
  );
}
