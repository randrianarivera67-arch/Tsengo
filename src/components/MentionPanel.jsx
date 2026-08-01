// src/components/MentionPanel.jsx
// Panneau mention — endrika Facebook.
//
// ⚠️ PORTAL mankany amin'ny `document.body` : ny panneau dia mivoaka amin'ny
// ancêtre rehetra. Teo aloha dia `position:absolute` tao anatin'ny carte, ka
// voatapaky ny `overflow:hidden` na voafatotry ny `transform` — tsy niseho
// mihitsy. Ny portal no manafoana io sokajy olana io.
import { createPortal } from 'react-dom';
import useKeyboardInset from '../hooks/useKeyboardInset';

const SPECIALS = [
  { tag: 'followers', label: '@followers',    desc: 'Certains abonnés peuvent recevoir des notifications' },
  { tag: 'everyone',  label: '@Tout le monde', desc: 'Abonnés et amis peuvent recevoir des notifications' },
];

function GroupIcon() {
  return (
    <span style={{ width: 44, height: 44, borderRadius: '50%', flexShrink: 0, background: '#C7CDD4',
                   display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="white" aria-hidden="true">
        <circle cx="8" cy="9" r="3" /><circle cx="16" cy="9" r="3" />
        <path d="M2 19c0-3 2.7-5 6-5s6 2 6 5v1H2v-1Z" />
        <path d="M14.5 14.4c2.8.3 5.5 2.2 5.5 4.6v1h-4v-1c0-1.7-.6-3.2-1.5-4.6Z" />
      </svg>
    </span>
  );
}

/**
 * @param {boolean}  open
 * @param {string}   query          teny voasoratra aorian'ny '@'
 * @param {object[]} people         { uid, fullName, username, photo }
 * @param {boolean}  showSpecials   tompon'ny publication ihany
 * @param {(tag:string)=>void} onPick
 * @param {()=>void} onClose
 */
export default function MentionPanel({ open, query = '', people = [], showSpecials = false, onPick, onClose }) {
  const kb = useKeyboardInset();
  if (!open) return null;

  const q = String(query || '').toLowerCase();
  const specials = showSpecials
    ? SPECIALS.filter(s => s.tag.startsWith(q) || s.label.toLowerCase().includes(q))
    : [];
  const list = people.filter(p =>
    (p.fullName || '').toLowerCase().includes(q) || (p.username || '').toLowerCase().includes(q)
  ).slice(0, 30);

  if (!specials.length && !list.length) return null;

  const Row = ({ children, onClick, key }) => (
    <button key={key} onClick={onClick}
      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
               background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Poppins', textAlign: 'left' }}>
      {children}
    </button>
  );

  return createPortal(
    <>
      {/* Fanakatonana amin'ny fikasihana ivelany */}
      <div onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'transparent' }} />

      <div
        style={{
          position: 'fixed', left: 0, right: 0, bottom: kb, zIndex: 9001,
          background: 'white', borderTop: '1px solid #E4E6EB',
          boxShadow: '0 -6px 24px rgba(0,0,0,.12)',
          maxHeight: 'min(46vh, 420px)', overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}
        onClick={e => e.stopPropagation()}
      >
        {specials.map(s => (
          <Row key={s.tag} onClick={() => onPick(s.tag)}>
            <GroupIcon />
            <span style={{ minWidth: 0, flex: 1 }}>
              <span style={{ display: 'block', fontSize: 15, fontWeight: 600, color: '#050505' }}>{s.label}</span>
              <span style={{ display: 'block', fontSize: 12, color: '#65676B', overflow: 'hidden',
                             textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.desc}</span>
            </span>
          </Row>
        ))}

        {list.map(p => (
          <Row key={p.uid} onClick={() => onPick(p.username || (p.fullName || '').split(' ')[0])}>
            <img
              src={p.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.fullName || 'U')}&background=1877F2&color=fff`}
              alt="" loading="lazy"
              style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, background: '#F0F2F5' }} />
            <span style={{ minWidth: 0, flex: 1 }}>
              <span style={{ display: 'block', fontSize: 15, fontWeight: 600, color: '#050505',
                             overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.fullName}</span>
              {p.username && (
                <span style={{ display: 'block', fontSize: 12, color: '#65676B',
                               overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@{p.username}</span>
              )}
            </span>
          </Row>
        ))}
      </div>
    </>,
    document.body
  );
}
