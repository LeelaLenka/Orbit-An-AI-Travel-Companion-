import { useEffect, useRef, useState } from 'react';
import { api, type Place } from '../lib/api';

const KIND_LABEL: Record<string, string> = {
  house: 'Address', street: 'Street', landmark: 'Place', locality: 'Area', city: 'City', region: 'Region', country: 'Country',
};

/** Search addresses, streets, villages, landmarks and cities anywhere (with a short debounce) */
export function PlaceSearch({ onPick, placeholder = 'Search an address, landmark or city…' }: { onPick: (p: Place) => void; placeholder?: string }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [error, setError] = useState('');
  const seq = useRef(0);
  const justPicked = useRef(false);

  useEffect(() => {
    const term = q.trim();
    if (justPicked.current) {
      justPicked.current = false; // the box now shows the chosen place; don't search for it again
      return;
    }
    if (term.length < 2) {
      setResults([]);
      return;
    }
    const id = ++seq.current;
    const t = setTimeout(() => {
      api<{ places: Place[] }>(`places?q=${encodeURIComponent(term)}`)
        .then((r) => {
          if (id !== seq.current) return; // a newer search started
          setResults(r.places);
          setActive(0);
          setOpen(true);
          setError('');
        })
        .catch((e: Error) => setError(e.message));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const pick = (p: Place) => {
    onPick(p);
    justPicked.current = true;
    setQ(`${p.name}, ${p.country}`);
    setResults([]);
    setOpen(false);
  };

  return (
    <div className="search" role="combobox" aria-expanded={open} aria-haspopup="listbox">
      <svg className="search__icon" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" /><path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => results.length && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
          if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
          if (e.key === 'Enter' && results[active]) { e.preventDefault(); pick(results[active]); }
          if (e.key === 'Escape') setOpen(false);
        }}
        placeholder={placeholder}
        aria-label="Search for a place"
        aria-autocomplete="list"
      />
      {open && results.length > 0 && (
        <ul className="search__list" role="listbox">
          {results.map((p, i) => (
            <li key={p.id} role="option" aria-selected={i === active} className={i === active ? 'active' : ''}
                onMouseDown={(e) => { e.preventDefault(); pick(p); }} onMouseEnter={() => setActive(i)}>
              <span className="search__name">{p.name}</span>
              <span className="search__meta"><span className={`kind kind--${p.kind}`}>{KIND_LABEL[p.kind] ?? p.kind}</span>{p.detail}</span>
            </li>
          ))}
        </ul>
      )}
      {open && q.trim().length >= 2 && results.length === 0 && !error && <p className="search__empty">No places found.</p>}
      {error && <p className="search__empty">{error}</p>}
    </div>
  );
}
