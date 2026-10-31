import { useEffect, useRef, useState } from 'react';
import Globe, { type GlobeInstance } from 'globe.gl';

export interface Marker { id: string; lat: number; lon: number; label: string; kind: 'selected' | 'saved' | 'suggestion' }

const FALLBACK_TEXTURE = 'https://unpkg.com/three-globe@2.45.0/example/img/earth-blue-marble.jpg';
const COLORS = { selected: '#ffb547', saved: '#a78bfa', suggestion: '#2dd4bf' };

/**
 * The 3D Earth: textured with yesterday's NASA satellite imagery, slowly rotating until you pick a place,
 * then flying the camera to it.
 */
export function GlobeView({ markers, focus, onImageryDate }: {
  markers: Marker[];
  focus: { lat: number; lon: number } | null;
  onImageryDate?: (date: string | null) => void;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const globe = useRef<GlobeInstance | null>(null);
  const [failed, setFailed] = useState(false);

  // Create once
  useEffect(() => {
    const el = holder.current;
    if (!el) return;
    let g: GlobeInstance;
    try {
      g = new Globe(el, { animateIn: true })
        .backgroundColor('rgba(0,0,0,0)')
        .showAtmosphere(true)
        .atmosphereColor('#7dd3fc')
        .atmosphereAltitude(0.18)
        .pointAltitude(0.02)
        .pointRadius((d: object) => ((d as Marker).kind === 'selected' ? 0.55 : 0.38))
        .pointColor((d: object) => COLORS[(d as Marker).kind])
        .pointLat((d: object) => (d as Marker).lat)
        .pointLng((d: object) => (d as Marker).lon)
        .pointLabel((d: object) => (d as Marker).label)
        .ringColor(() => (t: number) => `rgba(255,181,71,${1 - t})`)
        .ringMaxRadius(4)
        .ringPropagationSpeed(2.5)
        .ringRepeatPeriod(900)
        .ringLat((d: object) => (d as Marker).lat)
        .ringLng((d: object) => (d as Marker).lon);
    } catch {
      setFailed(true); // no WebGL on this device
      return;
    }
    globe.current = g;
    const controls = g.controls();
    controls.autoRotate = document.documentElement.dataset.motion !== 'reduce';
    controls.autoRotateSpeed = 0.45;
    controls.enableDamping = true;
    g.pointOfView({ lat: 18, lng: 78, altitude: 2.3 }, 0);

    // Use NASA imagery if it loads; otherwise the static Blue Marble
    fetch('/api/satellite')
      .then((r) => {
        if (!r.ok) throw new Error('imagery');
        onImageryDate?.(r.headers.get('X-Imagery-Date'));
        return r.blob();
      })
      .then((b) => g.globeImageUrl(URL.createObjectURL(b)))
      .catch(() => {
        onImageryDate?.(null);
        g.globeImageUrl(FALLBACK_TEXTURE);
      });

    const fit = () => g.width(el.clientWidth).height(el.clientHeight);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => {
      ro.disconnect();
      g._destructor();
      el.innerHTML = '';
      globe.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    globe.current?.pointsData(markers).ringsData(markers.filter((m) => m.kind === 'selected'));
  }, [markers]);

  useEffect(() => {
    const g = globe.current;
    if (!g) return;
    g.controls().autoRotate = !focus && document.documentElement.dataset.motion !== 'reduce';
    if (focus) g.pointOfView({ lat: focus.lat, lng: focus.lon, altitude: 1.35 }, 1600);
  }, [focus]);

  if (failed) {
    return <div className="globe globe--fallback"><p>Your browser can’t show the 3D globe (WebGL is off). Everything else still works.</p></div>;
  }
  return <div ref={holder} className="globe" />;
}
