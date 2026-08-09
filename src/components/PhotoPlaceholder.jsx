// src/components/PhotoPlaceholder.jsx
// Placeholder rehefa TSY MISY sary — fond fotsy + icône neon.
//   type="person" → manga malefaka (profil)
//   type="camera" → rose (couverture)

const BLUE = '#7CB8FF';
const ROSE = '#FF7DC0';

const glow = (c) => ({ filter: `drop-shadow(0 0 3px ${c}) drop-shadow(0 0 9px ${c}88)` });

export default function PhotoPlaceholder({ type = 'person', size = 100, round = true, style = {} }) {
  const person = type === 'person';
  const color = person ? BLUE : ROSE;
  const s = Math.round(size * (person ? 0.58 : 0.42));

  return (
    <div style={{
      width: size, height: round ? size : '100%',
      borderRadius: round ? '50%' : 0,
      background: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', flexShrink: 0, ...style,
    }}>
      <svg width={s} height={s} viewBox="0 0 64 64" fill={color} style={glow(color)} aria-hidden="true">
        {person ? (
          <>
            <circle cx="32" cy="22" r="11" />
            <path d="M12 52 C12 40 21 33 32 33 C43 33 52 40 52 52 C52 54.5 50 56 47.5 56 L16.5 56 C14 56 12 54.5 12 52 Z" />
          </>
        ) : (
          <>
            <path d="M8 20 h9 l4-6 h22 l4 6 h9 a4 4 0 0 1 4 4 v24 a4 4 0 0 1-4 4 H8 a4 4 0 0 1-4-4 V24 a4 4 0 0 1 4-4 Z" />
            <circle cx="32" cy="36" r="10" fill="#fff" />
            <circle cx="32" cy="36" r="6" fill={color} />
          </>
        )}
      </svg>
    </div>
  );
}
