// src/components/AdminIcons.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Icônes Admin — SVG madio, endrika "clay 3D" (badge misy dégradé + éclat) sy
// "neon" (trait mazava). TSY misy emoji na dependency ivelany.
// Ampiasaina: <NavIcon name="users" active /> sy <ClayIcon name="users" />
// ─────────────────────────────────────────────────────────────────────────────
import { useId } from 'react';

// ── Glyphes (trait) — viewBox 24×24, ampiasain'ny roa tonta ────────────────
function Glyph({ name, stroke = 'currentColor', width = 1.8 }) {
  const p = { fill: 'none', stroke, strokeWidth: width, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'dashboard': return (<g {...p}><rect x="3" y="3" width="7.5" height="8.5" rx="2"/><rect x="13.5" y="3" width="7.5" height="5.5" rx="2"/><rect x="3" y="14.5" width="7.5" height="6.5" rx="2"/><rect x="13.5" y="11.5" width="7.5" height="9.5" rx="2"/></g>);
    case 'users': return (<g {...p}><circle cx="9" cy="8" r="3.3"/><path d="M3.2 19.6c0-3.2 2.6-5.6 5.8-5.6s5.8 2.4 5.8 5.6"/><circle cx="17.2" cy="9.2" r="2.4"/><path d="M15.8 14.6c2.6.1 4.9 1.9 4.9 5"/></g>);
    case 'shop': return (<g {...p}><path d="M4.5 8.5h15l-1 11.2a1.8 1.8 0 0 1-1.8 1.6H7.3a1.8 1.8 0 0 1-1.8-1.6Z"/><path d="M8.6 8.5V6.4a3.4 3.4 0 0 1 6.8 0v2.1"/></g>);
    case 'artist': return (<g {...p}><path d="M9 18V6.2l10-2v11.4"/><circle cx="6.6" cy="18" r="2.6"/><circle cx="16.6" cy="15.6" r="2.6"/></g>);
    case 'boost': return (<g {...p}><path d="M13.2 2.5 5.4 13h5.1l-.7 8.5L18 11h-5.1Z"/></g>);
    case 'orders': return (<g {...p}><path d="M4 9.5h3.2L14 5.2v13.6L7.2 14.5H4a1.5 1.5 0 0 1-1.5-1.5v-2a1.5 1.5 0 0 1 1.5-1.5Z"/><path d="M17.6 9.2a4.5 4.5 0 0 1 0 5.6"/><path d="M19.8 6.8a8 8 0 0 1 0 10.4"/></g>);
    case 'report': return (<g {...p}><path d="M5.5 21V4"/><path d="M5.5 5h11.8l-2.1 4 2.1 4H5.5"/></g>);
    case 'message': return (<g {...p}><path d="M21 11.6c0 4.2-4 7.6-8.9 7.6a10 10 0 0 1-3.6-.66L3.6 20l1.3-3.4A7 7 0 0 1 3.2 11.6C3.2 7.4 7.2 4 12.1 4S21 7.4 21 11.6Z"/></g>);
    case 'stats': return (<g {...p}><path d="M4 20h16"/><path d="M7 20v-6.4"/><path d="M12 20V5.6"/><path d="M17 20v-9.4"/></g>);
    case 'signup': return (<g {...p}><circle cx="10" cy="8" r="3.4"/><path d="M3.6 20c0-3.4 2.9-5.9 6.4-5.9 1.2 0 2.3.3 3.2.8"/><path d="M17.6 14.2v6"/><path d="M14.6 17.2h6"/></g>);
    case 'live': return (<g {...p}><circle cx="12" cy="12" r="2.4"/><path d="M7.8 7.8a6 6 0 0 0 0 8.4"/><path d="M16.2 16.2a6 6 0 0 0 0-8.4"/><path d="M5 5a10 10 0 0 0 0 14"/><path d="M19 19a10 10 0 0 0 0-14"/></g>);
    case 'globe': return (<g {...p}><circle cx="12" cy="12" r="8.6"/><ellipse cx="12" cy="12" rx="3.6" ry="8.6"/><path d="M3.5 12h17"/></g>);
    case 'settings': return (<g {...p}><circle cx="12" cy="12" r="3.1"/><path d="M12 2.8v2.6M12 18.6v2.6M21.2 12h-2.6M5.4 12H2.8M18.5 5.5l-1.8 1.8M7.3 16.7l-1.8 1.8M18.5 18.5l-1.8-1.8M7.3 7.3 5.5 5.5"/></g>);
    case 'roles': return (<g {...p}><path d="M12 2.8 4.8 6v6c0 4.4 3 8.2 7.2 9.2 4.2-1 7.2-4.8 7.2-9.2V6Z"/><path d="m8.9 12.1 2.2 2.2 4-4.3"/></g>);
    case 'logs': return (<g {...p}><rect x="4" y="3.2" width="16" height="17.6" rx="2.4"/><path d="M8 8h8M8 12h8M8 16h5"/></g>);
    case 'backup': return (<g {...p}><ellipse cx="12" cy="6" rx="7.6" ry="3.1"/><path d="M4.4 6v6c0 1.7 3.4 3.1 7.6 3.1s7.6-1.4 7.6-3.1V6"/><path d="M4.4 12v6c0 1.7 3.4 3.1 7.6 3.1s7.6-1.4 7.6-3.1v-6"/></g>);
    case 'search': return (<g {...p}><circle cx="11" cy="11" r="6.6"/><path d="m16 16 4.2 4.2"/></g>);
    case 'eye': return (<g {...p}><path d="M2.6 12C4.7 7.6 8.2 5.2 12 5.2s7.3 2.4 9.4 6.8c-2.1 4.4-5.6 6.8-9.4 6.8S4.7 16.4 2.6 12Z"/><circle cx="12" cy="12" r="2.9"/></g>);
    case 'bell': return (<g {...p}><path d="M18 9.4a6 6 0 0 0-12 0c0 5.2-2 6.6-2 6.6h16s-2-1.4-2-6.6Z"/><path d="M10.4 19.4a2 2 0 0 0 3.2 0"/></g>);
    case 'menu': return (<g {...p}><path d="M4 7h16M4 12h16M4 17h16"/></g>);
    case 'chevron': return (<g {...p}><path d="m7 10 5 5 5-5"/></g>);
    case 'image': return (<g {...p}><rect x="3.2" y="4.6" width="17.6" height="14.8" rx="2.4"/><circle cx="8.6" cy="9.6" r="1.7"/><path d="m4.6 17.4 4.6-4.4 3.4 3 3-2.4 3.8 3.8"/></g>);
    case 'comment': return (<g {...p}><path d="M20.6 11.4c0 3.9-3.8 7.1-8.5 7.1-1.2 0-2.4-.2-3.4-.6l-4.3 1.3 1.3-3.3a6.6 6.6 0 0 1-2.1-4.5C3.6 7.5 7.4 4.3 12.1 4.3s8.5 3.2 8.5 7.1Z"/></g>);
    case 'follow': return (<g {...p}><circle cx="10" cy="8.2" r="3.4"/><path d="M3.6 20c0-3.4 2.9-6 6.4-6 1.5 0 2.9.5 4 1.3"/><path d="m15.6 18.4 1.9 1.9 3.6-4"/></g>);
    case 'check': return (<g {...p}><path d="m5 12.6 4.4 4.4L19 7.4"/></g>);
    case 'back': return (<g {...p}><path d="M20 12H4.6"/><path d="m10.4 5.8-6 6.2 6 6.2"/></g>);
    default: return (<g {...p}><circle cx="12" cy="12" r="8.5"/></g>);
  }
}

// ── Icône "neon" (sidebar, topbar) ─────────────────────────────────────────
export function NavIcon({ name, size = 20, color = '#65676B', glow = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"
      style={glow ? { filter: `drop-shadow(0 0 3px ${color}66) drop-shadow(0 0 7px ${color}33)` } : undefined}>
      <Glyph name={name} stroke={color} width={1.85} />
    </svg>
  );
}

// ── Badge "clay 3D" (cartes stats, activité) ───────────────────────────────
const CLAY = {
  blue:   ['#7EB6FF', '#2B6CF6'],
  green:  ['#7FE6B4', '#12A48D'],
  pink:   ['#FFA3CE', '#FF2D8D'],
  purple: ['#C9A6FF', '#7B3FE4'],
  amber:  ['#FFD98A', '#F2960B'],
  cyan:   ['#8DE7F2', '#0FA0BF'],
  slate:  ['#C7D0DD', '#6B7A90'],
};

export function ClayIcon({ name, tone = 'blue', size = 46, round = true }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [c1, c2] = CLAY[tone] || CLAY.blue;
  const r = round ? size / 2 : size * 0.3;
  const g = size * 0.55;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" style={{ flexShrink: 0, display: 'block' }}>
      <defs>
        <linearGradient id={`cg${uid}`} x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0" stopColor={c1} /><stop offset="1" stopColor={c2} />
        </linearGradient>
        <radialGradient id={`ch${uid}`} cx="0.32" cy="0.24" r="0.62">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="0" y="0" width={size} height={size} rx={r} fill={`url(#cg${uid})`} />
      <rect x="0" y="0" width={size} height={size} rx={r} fill={`url(#ch${uid})`} />
      <g transform={`translate(${(size - g) / 2} ${(size - g) / 2}) scale(${g / 24})`}>
        <Glyph name={name} stroke="#FFFFFF" width={2.05} />
      </g>
    </svg>
  );
}

// ── Point "en direct" (pulse) ──────────────────────────────────────────────
export function LivePulse({ size = 8, color = '#12A48D' }) {
  return (
    <span style={{ position: 'relative', display: 'inline-flex', width: size, height: size, flexShrink: 0 }}>
      <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: color, opacity: 0.35, animation: 'adminPulse 1.8s ease-out infinite' }} />
      <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: color }} />
    </span>
  );
}

export default NavIcon;
