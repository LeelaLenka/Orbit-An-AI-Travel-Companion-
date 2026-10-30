import type { Sky } from '../lib/weather';

/** Simple line icons for weather conditions */
export function WeatherIcon({ sky, size = 28, night = false }: { sky: Sky; size?: number; night?: boolean }) {
  const sun = night
    ? <path d="M15 6a7 7 0 1 0 7 9 6 6 0 0 1-7-9z" fill="#c4b5fd" />
    : <g stroke="#ffb547" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="4.5" fill="#ffb547" /><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" /></g>;
  const cloud = (dx = 0, dy = 0, fill = '#cbd5f5') => <path transform={`translate(${dx} ${dy})`} d="M7.5 19h9a4 4 0 0 0 .4-8 5.5 5.5 0 0 0-10.6 1.6A3.3 3.3 0 0 0 7.5 19z" fill={fill} />;
  const drops = (n: number, color: string) => <g stroke={color} strokeWidth="1.8" strokeLinecap="round">{Array.from({ length: n }, (_, i) => <path key={i} d={`M${8 + i * 4} 20.5l-1 2.3`} />)}</g>;
  const body = {
    clear: sun,
    partly: <g><g transform="translate(-3 -3) scale(.8)">{sun}</g>{cloud(2, 1)}</g>,
    cloud: cloud(0, -1),
    fog: <g stroke="#cbd5f5" strokeWidth="1.8" strokeLinecap="round"><path d="M4 9h16M3 13h18M5 17h14" /></g>,
    drizzle: <g>{cloud(0, -3)}{drops(3, '#7dd3fc')}</g>,
    rain: <g>{cloud(0, -3, '#94a3b8')}{drops(3, '#38bdf8')}</g>,
    snow: <g>{cloud(0, -3)}<g fill="#e0f2fe"><circle cx="8" cy="21" r="1.2" /><circle cx="12" cy="22" r="1.2" /><circle cx="16" cy="21" r="1.2" /></g></g>,
    storm: <g>{cloud(0, -3, '#64748b')}<path d="M12 16l-2 4h3l-1.5 3.5" stroke="#ffb547" strokeWidth="1.8" fill="none" strokeLinejoin="round" /></g>,
  }[sky];
  return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">{body}</svg>;
}
