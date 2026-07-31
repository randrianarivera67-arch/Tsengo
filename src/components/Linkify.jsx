// src/components/Linkify.jsx
// Manova ny lien ao anaty lahatsoratra ho clicable.
// Ny lien Trengo (interne) dia mandeha amin'ny navigation anatiny (tsy misokatra onglet vaovao).
import { useNavigate } from 'react-router-dom';
import { splitRich } from '../utils/appLink';

export default function Linkify({ text, color }) {
  const navigate = useNavigate();
  if (!text) return null;
  const parts = splitRich(text);

  return (
    <>
      {parts.map((p, i) => {
        if (p.type === 'text') return <span key={i}>{p.value}</span>;
        if (p.type === 'mention') {
          // Token manokana : tsy profil izy, ka aseho ho badge tsy clicable.
          // Raha tsy izao dia handeha ho /u/followers (tsy misy).
          const SPECIAL_TAGS = { followers: 'Abonnés', everyone: 'Tout le monde' };
          const sp = SPECIAL_TAGS[String(p.username).toLowerCase()];
          if (sp) {
            return (
              <span key={i} style={{ color: color || '#1877F2', fontWeight: 600 }}>@{sp}</span>
            );
          }
          // Mention → profil. Ny fanovana username → uid dia atao ao amin'ny
          // route /u/:username (requête `users`, index single-field automatique).
          return (
            <a key={i} href={`/u/${p.username}`}
              style={{ color: color || '#1877F2', fontWeight: 600, cursor: 'pointer', textDecoration: 'none' }}
              onClick={e => { e.preventDefault(); e.stopPropagation(); navigate(`/u/${p.username}`); }}>
              {p.value}
            </a>
          );
        }
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
