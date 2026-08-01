// src/components/CommentSheet.jsx
// Panneau commentaire — fomba Facebook, endrika Trengo.
//
// ⚠️ COMPOSANT TSY MBOLA VOAROHY : tsy misy pejy mampiasa azy amin'ity dingana
// ity. Azo alefa amin'ny production tsy misy fiantraikany mihitsy.
//
// Fitsipika :
//  • Presentational : tsy mikasika Firestore. Ny ray aman-dreny no manao
//    ny fanoratana (addComment, reactToCmt, sns.) — mitovy amin'ny efa misy.
//  • Ny tokens dia NALAINA tao amin'ny app : Poppins, bulle #F0F2F5,
//    gris #65676B, texte #050505, magenta #FF2D8D, réaction 👍❤️😂😮😢😡.
//  • Modifier / Supprimer : APPUI LONG amin'ny bulle (toy ny Facebook),
//    fa tsy bokotra ao anaty andalana.
import { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Linkify from './Linkify';
import MentionPanel from './MentionPanel';
import useKeyboardInset from '../hooks/useKeyboardInset';
import { buildThread, reactCount, canEdit, canDelete } from '../utils/commentThread';
import { timeAgo } from '../utils/timeAgo';

const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '😡'];
const SORTS = [
  { key: 'top',    label: 'Plus pertinents' },
  { key: 'recent', label: 'Plus récents' },
  { key: 'old',    label: 'Plus anciens' },
];
const C = {
  txt: '#050505', gris: '#65676B', gris2: '#8A8D91',
  bulle: '#F0F2F5', bord: '#E4E6EB', bleu: '#1877F2', rose: '#FF2D8D',
};
const ava = (url, name) => url ||
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'U')}&background=1877F2&color=fff`;

/* ── Commentaire iray ────────────────────────────────────────────────── */
function Comment({ c, isReply, meUid, postUid, onReply, onReact, onEdit, onDelete }) {
  const [picker, setPicker] = useState(false);
  const [menu, setMenu] = useState(false);
  const pressRef = useRef(null);
  const movedRef = useRef(false);

  const mine = reactCount(c) ? (c.reactions || {})[meUid] : null;
  const n = reactCount(c);
  const sz = isReply ? 26 : 32;

  // Appui long → menu Modifier / Supprimer
  const down = () => {
    movedRef.current = false;
    pressRef.current = setTimeout(() => {
      if (!movedRef.current && (canEdit(c, meUid) || canDelete(c, meUid, postUid))) setMenu(true);
    }, 480);
  };
  const up = () => clearTimeout(pressRef.current);
  const move = () => { movedRef.current = true; clearTimeout(pressRef.current); };

  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 13, marginLeft: isReply ? 40 : 0 }}>
      <img src={ava(c.authorPhoto, c.authorName)} alt="" loading="lazy"
        style={{ width: sz, height: sz, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, background: C.bulle }} />

      <div style={{ minWidth: 0, flex: 1, position: 'relative' }}>
        <div
          onPointerDown={down} onPointerUp={up} onPointerLeave={up} onPointerMove={move}
          style={{ background: C.bulle, borderRadius: 16, padding: '8px 12px',
                   display: 'inline-block', maxWidth: '100%', WebkitUserSelect: 'none', userSelect: 'none' }}>
          <p style={{ fontWeight: 700, fontSize: 13, lineHeight: 1.35 }}>
            {c.authorName}{c.authorIsVip && <span style={{ color: '#F2B300', fontSize: 11 }}> ★</span>}
          </p>
          {c.text && (
            <p style={{ fontSize: 13.5, lineHeight: 1.45, marginTop: 1, wordBreak: 'break-word' }}>
              <Linkify text={c.text} />
            </p>
          )}
          {c.mediaURL && (
            <div style={{ marginTop: 6 }}>
              {c.mediaType === 'image'
                ? <img src={c.mediaURL} alt="" style={{ maxWidth: 190, borderRadius: 12, display: 'block' }} />
                : <video src={c.mediaURL} controls style={{ maxWidth: 190, borderRadius: 12, display: 'block' }} />}
            </div>
          )}
        </div>

        {/* Ligne actions — toy ny Facebook : 55 min · J'aime · Répondre */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '5px 12px 0',
                      fontSize: 11.5, color: C.gris, fontWeight: 600 }}>
          <span style={{ fontWeight: 400, color: C.gris2 }}>{c.createdAt ? timeAgo(c.createdAt) : ''}</span>
          <span onClick={() => onReact && onReact(c, '👍')}
            style={{ cursor: 'pointer', color: mine ? C.bleu : C.gris }}>J'aime</span>
          <span onClick={() => onReply && onReply(c)} style={{ cursor: 'pointer' }}>Répondre</span>

          {n > 0 && (
            <span onClick={() => setPicker(p => !p)}
              style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 2, background: 'white',
                       border: '1px solid ' + C.bord, borderRadius: 100, padding: '1px 6px 1px 3px',
                       fontSize: 11, color: C.gris, boxShadow: '0 1px 2px rgba(0,0,0,.07)', cursor: 'pointer' }}>
              <span style={{ fontSize: 12 }}>{mine || '👍'}</span>{n}
            </span>
          )}
        </div>

        {picker && (
          <div onClick={e => e.stopPropagation()}
            style={{ position: 'absolute', bottom: '100%', left: 0, marginBottom: 5, display: 'flex', gap: 5,
                     background: 'white', borderRadius: 22, padding: '5px 9px', zIndex: 5,
                     boxShadow: '0 3px 14px rgba(0,0,0,.2)', border: '1px solid ' + C.bord }}>
            {REACTIONS.map(e => (
              <span key={e} onClick={() => { onReact && onReact(c, e); setPicker(false); }}
                style={{ fontSize: 21, cursor: 'pointer' }}>{e}</span>
            ))}
          </div>
        )}

        {menu && createPortal(
          <div onClick={() => setMenu(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 9500, background: 'rgba(0,0,0,.4)',
                     display: 'flex', alignItems: 'flex-end' }}>
            <div onClick={e => e.stopPropagation()}
              style={{ background: 'white', width: '100%', borderRadius: '16px 16px 0 0', padding: '8px 0 14px' }}>
              <div style={{ width: 38, height: 4, background: '#CFD2D6', borderRadius: 2, margin: '0 auto 8px' }} />
              {canEdit(c, meUid) && (
                <button onClick={() => { setMenu(false); onEdit && onEdit(c); }}
                  style={{ width: '100%', padding: '13px 20px', border: 'none', background: 'none', textAlign: 'left',
                           fontFamily: 'Poppins', fontSize: 14.5, color: C.txt, cursor: 'pointer' }}>Modifier</button>
              )}
              {canDelete(c, meUid, postUid) && (
                <button onClick={() => { setMenu(false); onDelete && onDelete(c); }}
                  style={{ width: '100%', padding: '13px 20px', border: 'none', background: 'none', textAlign: 'left',
                           fontFamily: 'Poppins', fontSize: 14.5, color: C.rose, cursor: 'pointer' }}>Supprimer</button>
              )}
            </div>
          </div>, document.body)}
      </div>
    </div>
  );
}

/* ── Panneau ─────────────────────────────────────────────────────────── */
export default function CommentSheet({
  open, onClose, post, comments = [], meUid, userProfile,
  value = '', onChange, onSend, replyTo, onCancelReply, onReply,
  onReact, onEdit, onDelete, onPickMedia,
  mentions,                       // hook useMentions (facultatif)
}) {
  const kb = useKeyboardInset();
  const [mode, setMode] = useState('top');
  const [sortOpen, setSortOpen] = useState(false);
  const [expanded, setExpanded] = useState({});
  const inputRef = useRef(null);

  const { roots, repliesOf, total } = useMemo(() => buildThread(comments, mode), [comments, mode]);

  useEffect(() => { if (replyTo && inputRef.current) inputRef.current.focus(); }, [replyTo]);

  if (!open) return null;
  const sortLabel = (SORTS.find(s => s.key === mode) || SORTS[0]).label;

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 8000, background: 'rgba(0,0,0,.45)',
                  display: 'flex', alignItems: 'flex-end' }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: 'white', width: '100%', height: '88vh', borderRadius: '16px 16px 0 0',
                 display: 'flex', flexDirection: 'column', boxShadow: '0 -8px 30px rgba(0,0,0,.25)' }}>

        <div style={{ width: 38, height: 4, background: '#CFD2D6', borderRadius: 2, margin: '9px auto 4px', flexShrink: 0 }} />

        {/* En-tête : réactions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '9px 16px 11px', borderBottom: '1px solid ' + C.bord, flexShrink: 0 }}>
          <span style={{ fontSize: 13, color: C.gris }}>
            {total} commentaire{total > 1 ? 's' : ''}
          </span>
          <button onClick={onClose}
            style={{ border: 'none', background: C.bulle, width: 30, height: 30, borderRadius: '50%',
                     cursor: 'pointer', color: C.gris, fontSize: 15, fontFamily: 'Poppins' }}>✕</button>
        </div>

        {/* Tri */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div onClick={() => setSortOpen(o => !o)}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '11px 16px 6px',
                     fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            {sortLabel}
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.4" strokeLinecap="round" style={{ opacity: .6 }}><path d="M6 9l6 6 6-6" /></svg>
          </div>
          {sortOpen && (
            <div style={{ position: 'absolute', top: '100%', left: 12, background: 'white', zIndex: 10,
                          border: '1px solid ' + C.bord, borderRadius: 12, overflow: 'hidden',
                          boxShadow: '0 4px 18px rgba(0,0,0,.15)' }}>
              {SORTS.map(s => (
                <button key={s.key} onClick={() => { setMode(s.key); setSortOpen(false); }}
                  style={{ display: 'block', width: 170, padding: '11px 15px', border: 'none', textAlign: 'left',
                           background: mode === s.key ? C.bulle : 'white', fontFamily: 'Poppins',
                           fontSize: 13.5, color: C.txt, cursor: 'pointer' }}>{s.label}</button>
              ))}
            </div>
          )}
        </div>

        {/* Liste */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '2px 16px 8px', WebkitOverflowScrolling: 'touch' }}>
          {roots.length === 0 && (
            <p style={{ textAlign: 'center', color: C.gris, fontSize: 13.5, padding: '34px 0' }}>
              Aucun commentaire pour le moment.
            </p>
          )}
          {roots.map(c => {
            const reps = repliesOf.get(c.id) || [];
            const show = expanded[c.id] ? reps : reps.slice(0, 1);
            const rest = reps.length - show.length;
            return (
              <div key={c.id}>
                {/* ⚠️ Ny valiny dia mipetaka amin'ny commentaire FOTOTRA foana
                    (`parentId = c.id`) — toy ny Facebook : tsy misy fil lalina
                    noho ny 2. Ka na dia valiny no valiana aza, dia ao amin'ny
                    fil mitovy ihany no ipetrahany. */}
                <Comment c={c} meUid={meUid} postUid={post?.uid}
                  onReply={() => onReply && onReply(c, c)}
                  onReact={onReact} onEdit={onEdit} onDelete={onDelete} />
                {show.map(r => (
                  <Comment key={r.id} c={r} isReply meUid={meUid} postUid={post?.uid}
                    onReply={() => onReply && onReply(c, r)}
                    onReact={onReact} onEdit={onEdit} onDelete={onDelete} />
                ))}
                {rest > 0 && (
                  <div onClick={() => setExpanded(e => ({ ...e, [c.id]: true }))}
                    style={{ marginLeft: 40, fontSize: 12.5, color: C.gris, fontWeight: 600,
                             padding: '2px 0 11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 18, height: 1.5, background: '#CFD2D6', display: 'block' }} />
                    Voir {rest} autre{rest > 1 ? 's' : ''} réponse{rest > 1 ? 's' : ''}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Répondre à */}
        {replyTo && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '0 16px 6px',
                        background: C.bulle, padding: '6px 10px', borderRadius: 10, fontSize: 12, color: C.gris }}>
            <span>Répondre à <b style={{ color: C.txt }}>{replyTo.authorName}</b></span>
            <button onClick={onCancelReply}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', color: C.gris, cursor: 'pointer' }}>✕</button>
          </div>
        )}

        {/* Champ */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '9px 12px',
                      borderTop: '1px solid ' + C.bord, background: 'white', flexShrink: 0,
                      marginBottom: kb > 0 ? 0 : 'env(safe-area-inset-bottom)' }}>
          <img src={ava(userProfile?.photoThumb || userProfile?.photoURL, userProfile?.fullName)} alt=""
            style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 7, background: C.bulle,
                        borderRadius: 100, padding: '7px 13px', minWidth: 0 }}>
            <input ref={inputRef} value={value}
              onChange={e => {
                onChange && onChange(e.target.value);
                mentions && mentions.onType(e.target.value, post?.id || 'sheet');
              }}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onSend && onSend(); } }}
              placeholder={replyTo ? `Répondre à ${replyTo.authorName}…` : 'Écrire un commentaire…'}
              maxLength={500}
              style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none',
                       fontFamily: 'Poppins', fontSize: 13.5, color: C.txt, minWidth: 0 }} />
            {onPickMedia && (
              <span onClick={onPickMedia} style={{ color: C.gris, display: 'flex', cursor: 'pointer' }}>
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="3" y="4" width="18" height="16" rx="2.5" /><circle cx="8.5" cy="9.5" r="1.8" />
                  <path d="m4 17 5-4.5 4 3.5 3-2.5 4 3.5" />
                </svg>
              </span>
            )}
          </div>
          <button onClick={onSend} disabled={!value.trim()}
            style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', flexShrink: 0,
                     cursor: value.trim() ? 'pointer' : 'default', opacity: value.trim() ? 1 : .45,
                     background: 'linear-gradient(135deg,#FF6FA5,' + C.rose + ')',
                     display: 'flex', alignItems: 'center', justifyContent: 'center',
                     boxShadow: '0 2px 8px rgba(255,45,141,.35)' }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="white">
              <path d="M3.4 20.4 21 12 3.4 3.6 3.4 10l12.6 2-12.6 2z" />
            </svg>
          </button>
        </div>

        {mentions && (
          <MentionPanel open={mentions.isOpen(post?.id || 'sheet')} query={mentions.query}
            people={mentions.people} showSpecials={post?.uid === meUid}
            onPick={tag => onChange && onChange(mentions.insert(value, tag))}
            onClose={mentions.close} />
        )}
      </div>
    </div>,
    document.body
  );
}
