// src/components/NeonIcons.jsx
// Icônes SVG "néon" (glow) — ampiasaina amin'ny informations profil ho solon'ny emoji.
const glow = color => ({ filter: `drop-shadow(0 0 3px ${color}) drop-shadow(0 0 7px ${color}88)` });

export function NeonBriefcase({ size = 16, color = '#1877F2' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={glow(color)}>
      <rect x="3" y="7.5" width="18" height="12" rx="2.2" stroke={color} strokeWidth="1.8" fill="none"/>
      <path d="M8.5 7.5V5.8A1.8 1.8 0 0 1 10.3 4h3.4a1.8 1.8 0 0 1 1.8 1.8V7.5" stroke={color} strokeWidth="1.8" fill="none"/>
      <path d="M3 12.5h18" stroke={color} strokeWidth="1.6"/>
      <rect x="10.3" y="11.3" width="3.4" height="2.6" rx="0.6" fill={color}/>
    </svg>
  );
}

export function NeonGraduation({ size = 16, color = '#8F6BFF' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={glow(color)}>
      <path d="M12 4 2 9l10 5 8.5-4.25V15" stroke={color} strokeWidth="1.8" strokeLinejoin="round" fill="none"/>
      <path d="M6 11.4V16c0 1.7 2.7 3 6 3s6-1.3 6-3v-4.6" stroke={color} strokeWidth="1.8" fill="none"/>
      <circle cx="21" cy="9.4" r="1.1" fill={color}/>
    </svg>
  );
}

export function NeonPhone({ size = 16, color = '#12A48D' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={glow(color)}>
      <path d="M6.6 3.5h3l1.2 4-2 1.5a10.5 10.5 0 0 0 5.2 5.2l1.5-2 4 1.2v3a1.6 1.6 0 0 1-1.75 1.6C11.6 17.4 6.6 12.4 5 6.25A1.6 1.6 0 0 1 6.6 3.5Z"
        stroke={color} strokeWidth="1.8" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}

export function NeonGlobe({ size = 16, color = '#1877F2' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={glow(color)}>
      <circle cx="12" cy="12" r="8.5" stroke={color} strokeWidth="1.8" fill="none"/>
      <ellipse cx="12" cy="12" rx="3.5" ry="8.5" stroke={color} strokeWidth="1.6" fill="none"/>
      <path d="M3.5 12h17" stroke={color} strokeWidth="1.6"/>
    </svg>
  );
}

export function NeonLocation({ size = 16, color = '#FF2D8D' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={glow(color)}>
      <path d="M12 21s-6.8-6.1-6.8-11A6.8 6.8 0 0 1 12 3.2a6.8 6.8 0 0 1 6.8 6.8c0 4.9-6.8 11-6.8 11Z" stroke={color} strokeWidth="1.8" strokeLinejoin="round" fill="none"/>
      <circle cx="12" cy="10" r="2.4" fill={color}/>
    </svg>
  );
}

export function NeonHome({ size = 16, color = '#F2B300' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={glow(color)}>
      <path d="M4 11 12 4l8 7" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <path d="M6 10v9h12v-9" stroke={color} strokeWidth="1.8" strokeLinejoin="round" fill="none"/>
      <rect x="10" y="13.5" width="4" height="5.5" fill={color}/>
    </svg>
  );
}

export function NeonMic({ size = 16, color = '#FF2D8D' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={glow(color)}>
      <rect x="9" y="3" width="6" height="11" rx="3" stroke={color} strokeWidth="1.8" fill="none"/>
      <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0" stroke={color} strokeWidth="1.8" strokeLinecap="round" fill="none"/>
      <path d="M12 18v3" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

export function NeonArchive({ size = 16, color = '#1877F2' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={glow(color)}>
      <rect x="3" y="4" width="18" height="4.5" rx="1.3" stroke={color} strokeWidth="1.8" fill="none"/>
      <path d="M4.5 8.5V18a1.6 1.6 0 0 0 1.6 1.6h11.8A1.6 1.6 0 0 0 19.5 18V8.5" stroke={color} strokeWidth="1.8" fill="none"/>
      <path d="M10 12.5h4" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

export function NeonClock({ size = 16, color = '#F2B300' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={glow(color)}>
      <circle cx="12" cy="12.5" r="8.3" stroke={color} strokeWidth="1.8" fill="none"/>
      <path d="M12 7.8v5l3.4 2" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <path d="M9 2.5h6" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

export function NeonPeople({ size = 16, color = '#1877F2' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={glow(color)}>
      <circle cx="9" cy="8" r="3" stroke={color} strokeWidth="1.7" fill="none"/>
      <circle cx="16.5" cy="9" r="2.4" stroke={color} strokeWidth="1.6" fill="none"/>
      <path d="M3.5 19.5c0-3 2.5-5.2 5.5-5.2s5.5 2.2 5.5 5.2" stroke={color} strokeWidth="1.7" strokeLinecap="round" fill="none"/>
      <path d="M15 14.8c2.4.2 4.3 2 4.3 4.4" stroke={color} strokeWidth="1.6" strokeLinecap="round" fill="none"/>
    </svg>
  );
}

export function NeonLock({ size = 16, color = '#65676B' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={glow(color)}>
      <rect x="5" y="10.5" width="14" height="9.5" rx="2" stroke={color} strokeWidth="1.8" fill="none"/>
      <path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7" stroke={color} strokeWidth="1.8" fill="none"/>
      <circle cx="12" cy="15" r="1.5" fill={color}/>
    </svg>
  );
}

// ── Icônes vaovao (flow pro) ──────────────────────────────────────────────

// Paper plane volamena — mitovy amin'ny icône Messages amin'ny navbar
export function NeonPlane({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64">
      <defs>
        <radialGradient id="npl_g" cx="35%" cy="28%" r="90%">
          <stop offset="0" stopColor="#FFE08A"/><stop offset="45%" stopColor="#F5C518"/><stop offset="100%" stopColor="#D69A00"/>
        </radialGradient>
      </defs>
      <path d="M52 14 C54 13.2 55.5 15 54.7 17 L44 48 C43.3 50 40.7 50.4 39.4 48.7 L32 39 L46 22 L26 35 L14.5 30.5 C12.6 29.7 12.5 27 14.4 26.2 Z" fill="url(#npl_g)"/>
      <path d="M32 39 L32 50 C32 51.6 34 52.3 35 51 L39.4 45.5 Z" fill="#D69A00" opacity="0.7"/>
      <ellipse cx="30" cy="24" rx="6" ry="2.4" fill="#fff" opacity="0.4" transform="rotate(-30 30 24)"/>
    </svg>
  );
}

// Paper plane fotsy (ho an'ny bokotra misy fond miloko)
export function NeonPlaneWhite({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64">
      <path d="M52 14 C54 13.2 55.5 15 54.7 17 L44 48 C43.3 50 40.7 50.4 39.4 48.7 L32 39 L46 22 L26 35 L14.5 30.5 C12.6 29.7 12.5 27 14.4 26.2 Z" fill="#fff"/>
      <path d="M32 39 L32 50 C32 51.6 34 52.3 35 51 L39.4 45.5 Z" fill="#fff" opacity="0.75"/>
    </svg>
  );
}

// Pouce "J'aime" (format Facebook)
export function NeonLike({ size = 18, color = '#65676B' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 11 L7 21 M7 11 L11.2 3.4 C11.6 2.6 12.6 2.3 13.4 2.8 C14.2 3.3 14.6 4.2 14.4 5.1 L13.4 9 L19.2 9 C20.4 9 21.3 10.1 21 11.3 L19.3 19.1 C19 20.2 18 21 16.8 21 L7 21 M7 11 L3.8 11 C3.3 11 3 11.3 3 11.8 L3 20.2 C3 20.7 3.3 21 3.8 21 L7 21"/>
    </svg>
  );
}

// Bulle commentaire (format Facebook)
export function NeonComment({ size = 18, color = '#65676B' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12 C21 16.4 17 20 12 20 C10.6 20 9.3 19.7 8.1 19.2 L3.5 20.4 L4.9 16.8 C3.7 15.5 3 13.8 3 12 C3 7.6 7 4 12 4 C17 4 21 7.6 21 12 Z"/>
    </svg>
  );
}

// Partage (format Facebook)
export function NeonShare({ size = 18, color = '#65676B' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13.5 5.5 L20.5 11.5 C20.9 11.8 20.9 12.3 20.5 12.6 L13.5 18.6 C13 19 12.2 18.7 12.2 18 L12.2 15 C7.5 15 4.8 16.6 3.2 19.4 C3.5 13.6 6.6 9.6 12.2 9 L12.2 6.1 C12.2 5.4 13 5.1 13.5 5.5 Z"/>
    </svg>
  );
}

// Étoile "Suivre" — hita maso tsara na amin'ny fond volamena aza
export function NeonStar({ size = 14, color = '#4A3400' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M12 2.5 L14.8 8.4 L21.2 9.2 L16.5 13.6 L17.7 20 L12 16.8 L6.3 20 L7.5 13.6 L2.8 9.2 L9.2 8.4 Z"/>
    </svg>
  );
}

// Statistiques (barres neon)
export function NeonChart({ size = 16, color = '#12A48D' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.1" strokeLinecap="round">
      <path d="M4 20 L20 20"/>
      <path d="M7 20 L7 13" stroke="#1877F2"/>
      <path d="M12 20 L12 7" stroke="#F2B300"/>
      <path d="M17 20 L17 10" stroke="#FF2D8D"/>
    </svg>
  );
}

// Maso (vues)
export function NeonEye({ size = 15, color = '#8A8D91' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 12 C4.5 7.5 8 5 12 5 C16 5 19.5 7.5 21.5 12 C19.5 16.5 16 19 12 19 C8 19 4.5 16.5 2.5 12 Z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}
