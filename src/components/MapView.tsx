import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Marker } from './GlobeView';
import { usePrefs } from '../lib/prefs';

const LAYERS = {
  // OpenStreetMap's own tiles: no key needed; darkened with a CSS filter to match the app
  map: {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Imagery &copy; Esri, Maxar, Earthstar Geographics',
    maxZoom: 19,
  },
} as const;

const COLORS = { selected: '#ffb547', saved: '#a78bfa', suggestion: '#2dd4bf' };

/** Street-level map (OpenStreetMap or satellite photos) for exact addresses and nearby places */
export function MapView({ markers, focus, zoom, onMarkerClick, path }: {
  markers: Marker[];
  /** A route to draw, in visiting order */
  path?: { lat: number; lon: number }[];
  focus: { lat: number; lon: number } | null;
  zoom: number;
  onMarkerClick?: (m: Marker) => void;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const tiles = useRef<L.TileLayer | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const { prefs } = usePrefs();
  const [style, setStyle] = useState<keyof typeof LAYERS>(prefs.mapStyle);

  useEffect(() => {
    if (!holder.current) return;
    const m = L.map(holder.current, { zoomControl: false, worldCopyJump: true }).setView([20, 78], 4);
    L.control.zoom({ position: 'bottomleft' }).addTo(m);
    L.control.scale({ position: 'bottomleft', imperial: prefs.distance === 'mi', metric: prefs.distance === 'km' }).addTo(m);
    layer.current = L.layerGroup().addTo(m);
    map.current = m;
    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(holder.current);
    return () => {
      ro.disconnect();
      m.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    tiles.current?.remove();
    const cfg = LAYERS[style];
    tiles.current = L.tileLayer(cfg.url, { attribution: cfg.attribution, maxZoom: cfg.maxZoom, className: `tiles tiles--${style}` }).addTo(m);
  }, [style]);

  useEffect(() => {
    const g = layer.current;
    if (!g) return;
    g.clearLayers();
    // Selected place last, so it's drawn on top
    for (const mk of [...markers.filter((m) => m.kind !== 'selected'), ...markers.filter((m) => m.kind === 'selected')]) {
      const sel = mk.kind === 'selected';
      const c = L.circleMarker([mk.lat, mk.lon], {
        radius: sel ? 10 : 7, color: '#070b1a', weight: 2, fillColor: COLORS[mk.kind], fillOpacity: 1,
      }).bindTooltip(mk.label, { direction: 'top', offset: [0, -8] });
      if (onMarkerClick) c.on('click', () => onMarkerClick(mk));
      c.addTo(g);
      if (sel) L.circleMarker([mk.lat, mk.lon], { radius: 22, color: COLORS.selected, weight: 2, fill: false, opacity: 0.6, interactive: false }).addTo(g);
    }
  }, [markers, onMarkerClick]);

  const line = useRef<L.Polyline | null>(null);
  useEffect(() => {
    line.current?.remove();
    line.current = null;
    if (map.current && path && path.length > 1) {
      line.current = L.polyline(path.map((p) => [p.lat, p.lon] as [number, number]), { color: '#2dd4bf', weight: 4, opacity: 0.9, dashArray: '8 8' }).addTo(map.current);
      map.current.fitBounds(line.current.getBounds(), { padding: [60, 60], maxZoom: 16 });
    }
  }, [path]);

  useEffect(() => {
    if (focus) map.current?.flyTo([focus.lat, focus.lon], zoom, { duration: 1.2 });
  }, [focus, zoom]);

  return (
    <div className="mapview">
      <div ref={holder} className="mapview__map" />
      <div className="seg seg--map" role="group" aria-label="Map style">
        <button aria-pressed={style === 'map'} onClick={() => setStyle('map')}>Map</button>
        <button aria-pressed={style === 'satellite'} onClick={() => setStyle('satellite')}>Satellite</button>
      </div>
    </div>
  );
}
