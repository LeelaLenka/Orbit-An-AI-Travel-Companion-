/** Orbit mark: a small planet with a tilted orbital ring and a satellite (amber) on it */
export function Logo({ size = 30, wordmark = true }: { size?: number; wordmark?: boolean }) {
  return (
    <span className="logo">
      <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
        <defs>
          <radialGradient id="orbit-planet" cx="38%" cy="32%" r="70%">
            <stop offset="0" stopColor="#5eead4" />
            <stop offset=".55" stopColor="#3b5bdb" />
            <stop offset="1" stopColor="#4c1d95" />
          </radialGradient>
        </defs>
        {/* back half of the ring, behind the planet */}
        <ellipse cx="32" cy="33" rx="26" ry="9" transform="rotate(-24 32 33)" fill="none" stroke="#8b5cf6" strokeOpacity=".45" strokeWidth="2.4" />
        <circle cx="32" cy="32" r="14" fill="url(#orbit-planet)" />
        {/* front half of the ring, crossing in front */}
        <path d="M8.8 43.6 A26 9 -24 0 0 55.2 22.4" fill="none" stroke="#c4b5fd" strokeWidth="2.6" strokeLinecap="round" />
        <circle cx="51" cy="20.5" r="4" fill="#ffb547" />
      </svg>
      {wordmark && <span className="logo__word">orbit</span>}
    </span>
  );
}
