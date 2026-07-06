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
