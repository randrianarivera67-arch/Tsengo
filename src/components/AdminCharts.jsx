// src/components/AdminCharts.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Graphes Admin — SVG madio (courbe, donut, carte du monde).
// TSY misy library ivelany. Ny calcul rehetra dia avy amin'ny utils/chartMath.js
// izay voatsapa 100 % (58 teste).
// ─────────────────────────────────────────────────────────────────────────────
import { useRef, useState, useId } from 'react';
import { points, smoothPath, areaPath, donutSegments, mapColor, MAP_STEPS, niceMax, yTicks, nearestIndex } from '../utils/chartMath';
import { WORLD_VIEWBOX, WORLD_PATHS } from './worldMapData';
import { fmt } from '../utils/adminStats';

/* ══════════════════ 1. Courbe "Inscriptions par jour" ══════════════════════ */
export function SignupsChart({ data = [], color = '#C026D3', height = 230 }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const wrapRef = useRef(null);
  const [hover, setHover] = useState(-1);

  const VB_W = 620, VB_H = height;
  const PAD = { l: 38, r: 12, t: 14, b: 26 };
  const iw = VB_W - PAD.l - PAD.r;
  const ih = VB_H - PAD.t - PAD.b;

  const values = data.map(d => Number(d.count) || 0);
  const max = niceMax(Math.max(0, ...values));
  const pts = points(values, iw, ih, max);
  const ticks = yTicks(max, 4);

  const onMove = (e) => {
    const el = wrapRef.current; if (!el || pts.length === 0) return;
    const r = el.getBoundingClientRect(); if (!r.width) return;
    const cx = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    const x = (cx / r.width) * VB_W - PAD.l;
    setHover(nearestIndex(pts, x));
  };

  const hp = hover >= 0 && hover < pts.length ? pts[hover] : null;
  const tipW = 118, tipH = 40;
  const tipX = hp ? Math.max(0, Math.min(iw - tipW, hp.x - tipW / 2)) : 0;
  const tipUp = hp ? hp.y > tipH + 12 : true;

  return (
    <div ref={wrapRef} onMouseMove={onMove} onMouseLeave={() => setHover(-1)}
      onTouchStart={onMove} onTouchMove={onMove} onTouchEnd={() => setHover(-1)}
      style={{ width: '100%', touchAction: 'pan-y' }}>
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id={`sg${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity="0.34" />
            <stop offset="1" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <g transform={`translate(${PAD.l} ${PAD.t})`}>
          {ticks.map((t, i) => {
            const y = ih - (max > 0 ? (t / max) * ih : 0);
            return (
              <g key={i}>
                <line x1="0" y1={y} x2={iw} y2={y} stroke="#EEF0F4" strokeWidth="1" />
                <text x="-8" y={y + 3.5} textAnchor="end" fontSize="10" fill="#98A2B3" fontFamily="Poppins, sans-serif">{fmt(t)}</text>
              </g>
            );
          })}
          {pts.length > 0 && (<>
            <path d={areaPath(pts, ih)} fill={`url(#sg${uid})`} />
            <path d={smoothPath(pts)} fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </>)}
          {data.map((d, i) => (
            <text key={i} x={pts[i] ? pts[i].x : 0} y={ih + 17} textAnchor="middle" fontSize="10" fill="#98A2B3" fontFamily="Poppins, sans-serif">{d.label}</text>
          ))}
          {hp && (<>
            <line x1={hp.x} y1="0" x2={hp.x} y2={ih} stroke="#D0D5DD" strokeWidth="1" strokeDasharray="3 3" />
            <circle cx={hp.x} cy={hp.y} r="5" fill="#fff" stroke={color} strokeWidth="2.6" />
            <g transform={`translate(${tipX} ${tipUp ? hp.y - tipH - 10 : hp.y + 12})`}>
              <rect width={tipW} height={tipH} rx="9" fill="#101828" opacity="0.94" />
              <text x={tipW / 2} y="16" textAnchor="middle" fontSize="10.5" fill="#D0D5DD" fontFamily="Poppins, sans-serif">{data[hover] ? data[hover].label : ''}</text>
              <text x={tipW / 2} y="31" textAnchor="middle" fontSize="12.5" fontWeight="700" fill="#fff" fontFamily="Poppins, sans-serif">
                {fmt(hp.v)} inscription{hp.v > 1 ? 's' : ''}
              </text>
            </g>
          </>)}
        </g>
      </svg>
    </div>
  );
}

/* ══════════════════════════ 2. Donut "Genre" ══════════════════════════════ */
export function GenderDonut({ entries = [], total = 0, size = 190, thickness = 26 }) {
  const R = (size - thickness) / 2;
  const C = 2 * Math.PI * R;
  const segs = donutSegments(entries, C);
  const anyValue = entries.some(e => Number(e.value) > 0);
  return (
    <svg viewBox={`0 0 ${size} ${size}`} style={{ width: '100%', maxWidth: size, height: 'auto', display: 'block' }}>
      <g transform={`translate(${size / 2} ${size / 2}) rotate(-90)`}>
        <circle r={R} fill="none" stroke="#EEF0F4" strokeWidth={thickness} />
        {anyValue && segs.map((s, i) => (
          <circle key={s.key || i} r={R} fill="none" stroke={entries[i] && entries[i].color ? entries[i].color : '#1877F2'}
            strokeWidth={thickness} strokeDasharray={s.dash} strokeDashoffset={s.offset} strokeLinecap="butt" />
        ))}
      </g>
      <text x={size / 2} y={size / 2 - 2} textAnchor="middle" fontSize="23" fontWeight="800" fill="#101828" fontFamily="Poppins, sans-serif">{fmt(total)}</text>
      <text x={size / 2} y={size / 2 + 17} textAnchor="middle" fontSize="11" fill="#98A2B3" fontFamily="Poppins, sans-serif">Total</text>
    </svg>
  );
}

/* ═════════════════════ 3. Carte du monde (choroplèthe) ════════════════════ */
export function WorldMapChart({ counts = {}, onHover }) {
  const [hover, setHover] = useState(null);
  const get = (code) => Number(counts[code]) || 0;
  return (
    <div style={{ width: '100%' }}>
      <svg viewBox={WORLD_VIEWBOX} style={{ width: '100%', height: 'auto', display: 'block' }}>
        <g>
          {WORLD_PATHS.map(p => {
            const n = get(p.c);
            const active = hover === p.c;
            return (
              <path key={p.c} d={p.d} fill={mapColor(n)}
                stroke={active ? '#7B3FE4' : '#FFFFFF'} strokeWidth={active ? 0.9 : 0.4}
                onMouseEnter={() => { setHover(p.c); onHover && onHover({ code: p.c, name: p.n, count: n }); }}
                onMouseLeave={() => { setHover(null); onHover && onHover(null); }}
                style={{ cursor: n > 0 ? 'pointer' : 'default' }}>
                <title>{p.n + ' : ' + fmt(n)}</title>
              </path>
            );
          })}
        </g>
      </svg>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
        {[...MAP_STEPS].reverse().map(s => (
          <span key={s.min} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, color: '#667085' }}>
            <i style={{ width: 12, height: 12, borderRadius: 3, background: s.color, display: 'inline-block' }} />
            {s.min >= 1000 ? (s.min / 1000) + 'K+' : (s.min === 1 ? '< 100' : s.min + '+')}
          </span>
        ))}
      </div>
    </div>
  );
}

export default SignupsChart;
