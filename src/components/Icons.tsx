import type { Mode, Purpose } from '../lib/api';

const S = ({ children, size = 20 }: { children: React.ReactNode; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);

/** Travel mode icons */
export function ModeIcon({ mode, size }: { mode: Mode; size?: number }) {
  const body = {
    walk: <><circle cx="13" cy="4" r="2" /><path d="M10 21l2-6 3 3v3M9 12l2-4 4 3 3 1M11 8l-3 2-1 4" /></>,
    bike: <><circle cx="6" cy="17" r="3.5" /><circle cx="18" cy="17" r="3.5" /><path d="M6 17l4-8h5l3 8M10 9l4 8M13 5h3" /></>,
    car: <><path d="M3 16v-3l2-5h14l2 5v3z" /><circle cx="7.5" cy="16.5" r="1.8" /><circle cx="16.5" cy="16.5" r="1.8" /><path d="M3 13h18" /></>,
    flight: <path d="M21 15l-8-3V5.5a1.5 1.5 0 0 0-3 0V12l-8 3v2l8-1.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-3.5l8 1.5z" />,
    ship: <><path d="M3 17l2 4h14l2-4-9-3z" /><path d="M6 15V9h12v6M12 9V4M9 6h6" /></>,
  }[mode];
  return <S size={size}>{body}</S>;
}

/** Trip purpose icons */
export function PurposeIcon({ purpose, size }: { purpose: Purpose | string; size?: number }) {
  const body: Record<string, React.ReactNode> = {
    Pilgrimage: <><path d="M12 3l3 4H9z" /><path d="M7 21V11h10v10M5 21h14M10 21v-4h4v4M12 7v4" /></>,
    Vacation: <><path d="M3 20h18M7 20c0-6 5-10 10-11-3 2-5 6-5 11" /><circle cx="18" cy="5" r="2" /></>,
    Work: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V5h6v2M3 12h18" /></>,
    Family: <><circle cx="8" cy="7" r="2.5" /><circle cx="16" cy="7" r="2.5" /><circle cx="12" cy="13" r="2" /><path d="M4 20c0-3 2-5 4-5M20 20c0-3-2-5-4-5M9 20c0-2 1-3.5 3-3.5s3 1.5 3 3.5" /></>,
    Adventure: <><path d="M3 20l6-10 4 6 3-4 5 8z" /><path d="M14 6l1-3 1 3" /></>,
    Other: <><circle cx="12" cy="12" r="9" /><path d="M8 12h8M12 8v8" /></>,
  };
  return <S size={size}>{body[purpose] ?? body.Other}</S>;
}

export function PinIcon({ size }: { size?: number }) {
  return <S size={size}><path d="M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12z" /><circle cx="12" cy="9" r="2.5" /></S>;
}

export function LocateIcon({ size }: { size?: number }) {
  return <S size={size}><circle cx="12" cy="12" r="4" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></S>;
}
