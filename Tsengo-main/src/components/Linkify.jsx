// src/components/Linkify.jsx
// Manova ny lien ao anaty lahatsoratra ho clicable.
// Ny lien Trengo (interne) dia mandeha amin'ny navigation anatiny (tsy misokatra onglet vaovao).
import { useNavigate } from 'react-router-dom';
import { splitLinks } from '../utils/appLink';

export default function Linkify({ text, color }) {
  const navigate = useNavigate();
  if (!text) return null;
  const parts = splitLinks(text);

  return (
    <>
      {parts.map((p, i) => {
        if (p.type === 'text') return <span key={i}>{p.value}</span>;
        const style = { color: color || '#1877F2', textDecoration: 'underline', wordBreak: 'break-all', cursor: 'pointer' };
        if (p.internal) {
          return (
            <a key={i} href={p.internal} style={style}
              onClick={e => { e.preventDefault(); e.stopPropagation(); navigate(p.internal); }}>
              {p.value}
            </a>
          );
        }
        const href = p.value.startsWith('http') ? p.value : `https://${p.value}`;
        return (
          <a key={i} href={href} target="_blank" rel="noreferrer" style={style} onClick={e => e.stopPropagation()}>
            {p.value}
          </a>
        );
      })}
    </>
  );
}
