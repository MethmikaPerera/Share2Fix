'use client';

import 'leaflet/dist/leaflet.css';
import type { Map as LeafletMap, LayerGroup } from 'leaflet';
import { useEffect, useRef } from 'react';
import { CATEGORIES, STATUSES, STATUS_PIN_COLOR, SRI_LANKA_CENTER, labelOf } from '@/lib/constants';
import type { MapPin } from '@/types';

interface Props {
  pins: MapPin[];
  onSelect?: (id: string) => void;
  userLocation?: { lat: number; lng: number } | null;
  height?: string;
  /** Fit the map to the pins whenever the pin set changes. */
  fit?: boolean;
}

const OSM_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/** Public marker map. Only minimal, non-personal data (title, category, status, coordinates) is ever shown. */
export function IssueMap({ pins, onSelect, userLocation, height = '70vh', fit = true }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<LayerGroup | null>(null);
  const userLayerRef = useRef<LayerGroup | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  // Create the map once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import('leaflet')).default;
      if (cancelled || !containerRef.current || mapRef.current) return;
      const map = L.map(containerRef.current, { scrollWheelZoom: true }).setView(SRI_LANKA_CENTER, 7);
      L.tileLayer(OSM_TILES, { attribution: OSM_ATTRIBUTION, maxZoom: 19 }).addTo(map);
      layerRef.current = L.layerGroup().addTo(map);
      userLayerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      map.fire('s2f-ready');
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Render markers whenever pins change.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import('leaflet')).default;
      // wait for the map if it is still initialising
      for (let i = 0; i < 40 && !mapRef.current && !cancelled; i++) await new Promise((r) => setTimeout(r, 50));
      const map = mapRef.current;
      const layer = layerRef.current;
      if (cancelled || !map || !layer) return;

      layer.clearLayers();
      for (const pin of pins) {
        const color = STATUS_PIN_COLOR[pin.status];
        const icon = L.divIcon({
          className: 's2f-pin',
          html: `<svg width="30" height="38" viewBox="0 0 30 38" aria-hidden="true"><path d="M15 1C7.8 1 2 6.8 2 14c0 9.6 13 23 13 23s13-13.4 13-23C28 6.8 22.2 1 15 1Z" fill="${color}" stroke="#fff" stroke-width="2"/><circle cx="15" cy="14" r="5" fill="#fff"/></svg>`,
          iconSize: [30, 38],
          iconAnchor: [15, 37],
          popupAnchor: [0, -32],
        });
        const marker = L.marker([pin.latitude, pin.longitude], { icon, title: pin.title, keyboard: true });

        // Build the popup with DOM nodes + textContent so user-provided titles can never inject HTML.
        const box = document.createElement('div');
        box.style.minWidth = '170px';
        const h = document.createElement('strong');
        h.textContent = pin.title;
        h.style.display = 'block';
        h.style.color = '#173B3A';
        const meta = document.createElement('div');
        meta.style.cssText = 'font-size:12px;color:#4A6664;margin:4px 0 8px';
        meta.textContent = `${labelOf(CATEGORIES, pin.category)} - ${labelOf(STATUSES, pin.status)}`;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = 'View details';
        btn.style.cssText = 'background:#087F78;color:#fff;border:0;border-radius:8px;padding:6px 12px;font-weight:600;cursor:pointer';
        btn.addEventListener('click', () => onSelectRef.current?.(pin.id));
        box.append(h, meta, btn);
        marker.bindPopup(box);
        marker.addTo(layer);
      }

      if (fit && pins.length > 0) {
        const bounds = L.latLngBounds(pins.map((p) => [p.latitude, p.longitude] as [number, number]));
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pins, fit]);

  // "You are here" marker.
  useEffect(() => {
    (async () => {
      const L = (await import('leaflet')).default;
      for (let i = 0; i < 40 && !mapRef.current; i++) await new Promise((r) => setTimeout(r, 50));
      const layer = userLayerRef.current;
      if (!layer || !mapRef.current) return;
      layer.clearLayers();
      if (userLocation) {
        L.circleMarker([userLocation.lat, userLocation.lng], {
          radius: 8,
          color: '#fff',
          weight: 3,
          fillColor: '#25BDB5',
          fillOpacity: 1,
        })
          .bindTooltip('You are here')
          .addTo(layer);
        mapRef.current.setView([userLocation.lat, userLocation.lng], Math.max(mapRef.current.getZoom(), 13));
      }
    })();
  }, [userLocation]);

  return (
    <div
      ref={containerRef}
      style={{ height }}
      className="w-full overflow-hidden rounded-card border border-line"
      role="application"
      aria-label="Map of reported community issues"
    />
  );
}
