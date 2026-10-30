/** WMO weather codes (used by Open-Meteo) to a label and icon kind */
export type Sky = 'clear' | 'partly' | 'cloud' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'storm';

export function describe(code: number): { label: string; sky: Sky } {
  if (code === 0) return { label: 'Clear sky', sky: 'clear' };
  if (code <= 2) return { label: code === 1 ? 'Mainly clear' : 'Partly cloudy', sky: 'partly' };
  if (code === 3) return { label: 'Overcast', sky: 'cloud' };
  if (code === 45 || code === 48) return { label: 'Fog', sky: 'fog' };
  if (code >= 51 && code <= 57) return { label: 'Drizzle', sky: 'drizzle' };
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return { label: code >= 80 ? 'Rain showers' : 'Rain', sky: 'rain' };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { label: 'Snow', sky: 'snow' };
  if (code >= 95) return { label: 'Thunderstorm', sky: 'storm' };
  return { label: 'Unsettled', sky: 'cloud' };
}

export const dayName = (iso: string, i: number) =>
  i === 0 ? 'Today' : new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short' });

export const clock = (iso: string) => (iso ? iso.slice(11, 16) : '');
