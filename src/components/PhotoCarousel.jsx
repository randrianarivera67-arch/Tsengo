// src/components/PhotoCarousel.jsx
// Grille photo façon Facebook : 1 à 4 visibles, "+N" sur la 4e si plus.
// Clic sur une image => onOpen(url) (ouvre le plein écran/zoom du parent).
export default function PhotoCarousel({ urls = [], onOpen }) {
  const list = Array.isArray(urls) ? urls.filter(Boolean) : [];
  const n = list.length;
  if (!n) return null;
  const open = (u) => (e) => { e.stopPropagation(); onOpen && onOpen(u); };
  const GAP = 2;

  const Cell = ({ u, style, badge }) => (
    <div onClick={open(u)} style={{ position: 'relative', overflow: 'hidden', cursor: 'pointer', background: '#111', ...style }}>
      <img src={u} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      {badge != null && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 30, fontWeight: 800 }}>+{badge}</div>
      )}
    </div>
  );

  if (n === 1) {
    return (
      <div onClick={open(list[0])} style={{ cursor: 'pointer' }}>
        <img src={list[0]} alt="" loading="lazy" decoding="async" style={{ width: '100%', maxHeight: 520, objectFit: 'cover', display: 'block' }} />
      </div>
    );
  }
  if (n === 2) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: GAP, aspectRatio: '2 / 1' }}>
        <Cell u={list[0]} /><Cell u={list[1]} />
      </div>
    );
  }
  if (n === 3) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: GAP, aspectRatio: '1 / 1' }}>
        <Cell u={list[0]} style={{ gridColumn: '1 / span 2' }} />
        <Cell u={list[1]} /><Cell u={list[2]} />
      </div>
    );
  }
  // n >= 4
  const shown = list.slice(0, 4);
  const rest = n - 4;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: GAP, aspectRatio: '1 / 1' }}>
      {shown.map((u, i) => (
        <Cell key={i} u={u} badge={i === 3 && rest > 0 ? rest : null} />
      ))}
    </div>
  );
}
