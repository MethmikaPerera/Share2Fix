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
          html: `<svg width="30" height="38" viewBox="0 0 30 38" aria-hidden="true" style="filter:drop-shadow(0 2px 3px rgba(18,32,31,.28))"><path d="M15 1C7.8 1 2 6.8 2 14c0 9.6 13 23 13 23s13-13.4 13-23C28 6.8 22.2 1 15 1Z" fill="${color}" stroke="#fdfcf9" stroke-width="2"/><circle cx="15" cy="14" r="4.5" fill="#fdfcf9"/></svg>`,
          iconSize: [30, 38],
          iconAnchor: [15, 37],
          popupAnchor: [0, -32],
        });
        const marker = L.marker([pin.latitude, pin.longitude], { icon, title: pin.title, keyboard: true });

        // Build the popup with DOM nodes + textContent so user-provided titles can never inject HTML.
        const box = document.createElement('div');
        box.style.minWidth = '190px';
        const kicker = document.createElement('div');
        kicker.textContent = labelOf(CATEGORIES, pin.category).toUpperCase();
        kicker.style.cssText = 'font-size:10px;font-weight:600;letter-spacing:.12em;color:#667371;margin-bottom:5px';
        const h = document.createElement('strong');
        h.textContent = pin.title;
        h.style.cssText = "display:block;color:#12201f;font-family:var(--font-serif),Georgia,serif;font-weight:500;font-size:16px;line-height:1.25";
        const meta = document.createElement('div');
        meta.style.cssText = 'display:flex;align-items:center;gap:6px;font-size:12px;color:#4a5857;margin:8px 0 12px';
        const dot = document.createElement('span');
        dot.style.cssText = `width:7px;height:7px;border-radius:50%;background:${color};display:inline-block`;
        const statusText = document.createElement('span');
        statusText.textContent = labelOf(STATUSES, pin.status);
        meta.append(dot, statusText);
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = 'View details';
        btn.style.cssText = 'background:#0b5d59;color:#fff;border:0;border-radius:6px;padding:7px 14px;font-weight:500;font-size:13px;cursor:pointer;width:100%';
        btn.addEventListener('click', () => onSelectRef.current?.(pin.id));
        box.append(kicker, h, meta, btn);
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
          color: '#fdfcf9',
          weight: 3,
          fillColor: '#b08430',
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
      className="w-full overflow-hidden rounded-card border border-line-strong"
      role="application"
      aria-label="Map of reported community issues"
    />
  );
}
