// src/components/MediaViewer.jsx
// Viewer plein écran façon Facebook, appelé au clic sur une image d'une
// publication (fil d'actualités, profil, groupe, boutique...).
//   - Défilement horizontal (scroll-snap) si plusieurs images
//   - Télécharger, Réagir, Commenter, Partager (réutilise les handlers du parent
//     — aucune logique métier dupliquée, juste une présentation plein écran)
import { useState, useRef, useEffect, useCallback } from 'react';
import { HiX, HiDownload, HiChevronLeft, HiChevronRight } from 'react-icons/hi';
import { NeonLike, NeonComment, NeonShare } from './NeonIcons';
import { timeAgo } from '../utils/timeAgo';

const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '😡'];
const FB_REACTIONS = [
  { emoji: '👍', label: "J'aime" },
  { emoji: '❤️', label: "J'adore" },
  { emoji: '😂', label: 'Haha' },
  { emoji: '😮', label: 'Wouah' },
  { emoji: '😢', label: 'Triste' },
  { emoji: '😡', label: 'En colère' },
];

export default function MediaViewer({
  post, startIndex = 0, onClose,
  currentUser, userProfile, navigate,
  myR, rc, total, reactorNames,
  onReact, onOpenReactionModal, onDownload, onShare,
  reactToCmt, addComment, deleteCmt,
  cmtText, setCmtText, replyTo, setReplyTo,
  VIPBadge,
}) {
  const images = post.mediaURLs?.length ? post.mediaURLs : (post.mediaURL ? [post.mediaURL] : []);
  const multi = images.length > 1;

  const [index, setIndex] = useState(Math.min(startIndex, Math.max(images.length - 1, 0)));
  const [showPicker, setShowPicker] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [text, setText] = useState('');
  const scrollRef = useRef(null);
  const rafRef = useRef(null);

  // Ouvre au bon index (sans animation) au montage
  useEffect(() => {
    const el = scrollRef.current;
    if (el && multi) el.scrollLeft = index * el.clientWidth;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onScroll = useCallback(() => {
    if (!multi) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (!el || !el.clientWidth) return;
      const i = Math.round(el.scrollLeft / el.clientWidth);
      setIndex(Math.max(0, Math.min(i, images.length - 1)));
    });
  }, [multi, images.length]);

  const goTo = (i) => {
    const el = scrollRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(i, images.length - 1));
    el.scrollTo({ left: clamped * el.clientWidth, behavior: 'smooth' });
    setIndex(clamped);
  };

  function submitComment() {
    const v = text.trim();
    if (!v) return;
    const full = replyTo?.[post.id] ? `@${replyTo[post.id]} ${v}` : v;
    setCmtText((p) => ({ ...p, [post.id]: full }));
    setText('');
    setTimeout(() => addComment(post.id), 0);
  }

  const sortedEmojis = Object.entries(rc || {}).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([e]) => e);
  const myLabel = myR ? (FB_REACTIONS.find((r) => r.emoji === myR)?.label || "J'aime") : "J'aime";

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 700, display: 'flex', flexDirection: 'column' }}>
      {/* Barre haut */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', flexShrink: 0, background: 'rgba(0,0,0,.5)' }}>
        <img
          src={post.authorPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.authorName || 'U')}&background=1877F2&color=fff`}
          alt="" style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, cursor: 'pointer' }}
          onClick={() => { onClose(); navigate(`/profile/${post.uid}`); }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ color: 'white', fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {post.authorName}{post.authorIsVip && VIPBadge && <VIPBadge />}
          </p>
          {post.createdAt && <p style={{ color: '#B0B3B8', fontSize: 11 }}>{timeAgo(post.createdAt)}</p>}
        </div>
        <button onClick={() => onDownload(images[index])} aria-label="Télécharger"
          style={{ background: 'rgba(255,255,255,.15)', border: 'none', borderRadius: '50%', width: 38, height: 38, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <HiDownload size={19} />
        </button>
        <button onClick={onClose} aria-label="Fermer"
          style={{ background: 'rgba(255,255,255,.15)', border: 'none', borderRadius: '50%', width: 38, height: 38, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <HiX size={20} />
        </button>
      </div>

      {/* Image(s) — défilement horizontal si plusieurs */}
      <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
        <div ref={scrollRef} onScroll={onScroll}
          style={{ display: 'flex', overflowX: multi ? 'auto' : 'hidden', overflowY: 'hidden', height: '100%', scrollSnapType: multi ? 'x mandatory' : 'none', WebkitOverflowScrolling: 'touch' }}>
          {images.map((u, i) => (
            <div key={i} style={{ minWidth: '100%', height: '100%', scrollSnapAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src={u} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }} />
            </div>
          ))}
        </div>

        {multi && index > 0 && (
          <button onClick={() => goTo(index - 1)} aria-label="Précédent"
            style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,.4)', border: 'none', borderRadius: '50%', width: 36, height: 36, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <HiChevronLeft size={20} />
          </button>
        )}
        {multi && index < images.length - 1 && (
          <button onClick={() => goTo(index + 1)} aria-label="Suivant"
            style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,.4)', border: 'none', borderRadius: '50%', width: 36, height: 36, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <HiChevronRight size={20} />
          </button>
        )}
        {multi && (
          <div style={{ position: 'absolute', bottom: 10, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 5 }}>
            {images.map((_, i) => (
              <span key={i} style={{ width: i === index ? 16 : 6, height: 6, borderRadius: 3, background: i === index ? '#FF2D8D' : 'rgba(255,255,255,.5)', transition: 'width .15s' }} />
            ))}
          </div>
        )}
      </div>

      {/* Panneau bas : légende, réactions, actions, commentaires */}
      <div style={{ background: '#18191A', maxHeight: showComments ? '62vh' : 'auto', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        {post.content && (
          <p style={{ color: '#E4E6EB', fontSize: 14, padding: '10px 14px 0', wordBreak: 'break-word' }}>{post.content}</p>
        )}

        {total > 0 && (
          <div onClick={onOpenReactionModal} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px 0', cursor: 'pointer' }}>
            <div style={{ display: 'flex', gap: 3 }}>
              {sortedEmojis.map((e) => (
                <span key={e} style={{ fontSize: 14, background: '#18191A', borderRadius: '50%', boxShadow: '0 0 0 1.5px #18191A', lineHeight: 1 }}>{e}</span>
              ))}
            </div>
            <span style={{ fontSize: 12.5, color: '#B0B3B8' }}>{total}</span>
          </div>
        )}

        <div style={{ display: 'flex', borderTop: '1px solid #3A3B3C', borderBottom: '1px solid #3A3B3C', marginTop: 10, position: 'relative' }}>
          <button onClick={() => onReact(myR || '👍')}
            onContextMenu={(e) => { e.preventDefault(); setShowPicker((p) => !p); }}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 0', background: 'none', border: 'none', cursor: 'pointer', color: myR ? '#FF2D8D' : '#B0B3B8', fontWeight: 700, fontSize: 13, fontFamily: 'Poppins' }}>
            {myR ? <span style={{ fontSize: 17 }}>{myR}</span> : <NeonLike size={18} color="#B0B3B8" />} {myLabel}
          </button>
          {showPicker && (
            <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', bottom: '100%', left: 0, background: 'white', borderRadius: 20, padding: '8px 6px', display: 'flex', gap: 3, boxShadow: '0 4px 24px rgba(0,0,0,.4)', zIndex: 20 }}>
              {FB_REACTIONS.map((r) => (
                <button key={r.emoji} onClick={() => { onReact(r.emoji); setShowPicker(false); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 24, padding: '2px 4px' }}>{r.emoji}</button>
              ))}
            </div>
          )}
          <button onClick={() => setShowComments((p) => !p)}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 0', background: 'none', border: 'none', cursor: 'pointer', color: '#B0B3B8', fontWeight: 700, fontSize: 13, fontFamily: 'Poppins' }}>
            <NeonComment size={18} color="#B0B3B8" /> Commenter
          </button>
          <button onClick={onShare}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 0', background: 'none', border: 'none', cursor: 'pointer', color: '#B0B3B8', fontWeight: 700, fontSize: 13, fontFamily: 'Poppins' }}>
            <NeonShare size={18} color="#B0B3B8" /> Partager
          </button>
        </div>

        {showComments && (
          <div style={{ overflowY: 'auto', flex: 1, padding: '10px 14px' }}>
            {(post.comments || []).length === 0 && (
              <p style={{ color: '#65676B', fontSize: 13, textAlign: 'center', padding: '10px 0' }}>Aucun commentaire</p>
            )}
            {(post.comments || []).map((c) => {
              const myCR = c.reactions?.[currentUser.uid];
              const crCount = Object.keys(c.reactions || {}).length;
              return (
                <div key={c.id} style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <img src={c.authorPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.authorName || 'U')}&background=1877F2&color=fff`} alt=""
                    style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, cursor: 'pointer' }}
                    onClick={() => { onClose(); navigate(`/profile/${c.uid}`); }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ position: 'relative', display: 'inline-block', maxWidth: '100%', background: '#3A3B3C', borderRadius: 16, padding: '7px 12px' }}>
                      <p style={{ fontWeight: 700, fontSize: 12.5, color: '#E4E6EB' }}>{c.authorName}{c.authorIsVip && VIPBadge && <VIPBadge />}</p>
                      {c.text && <p style={{ fontSize: 13.5, color: '#E4E6EB', wordBreak: 'break-word' }}>{c.text}</p>}
                      {c.mediaURL && (
                        <div style={{ marginTop: 4 }}>
                          {c.mediaType === 'image'
                            ? <img src={c.mediaURL} alt="" style={{ maxWidth: 160, borderRadius: 8 }} />
                            : <video src={c.mediaURL} controls style={{ maxWidth: 160, borderRadius: 8 }} />}
                        </div>
                      )}
                      {crCount > 0 && (
                        <span style={{ position: 'absolute', bottom: -9, right: 4, background: '#242526', borderRadius: 12, padding: '1px 6px', fontSize: 11, display: 'flex', gap: 2 }}>
                          {[...new Set(Object.values(c.reactions))].slice(0, 3).join('')}
                          {crCount > 1 && <span style={{ fontSize: 10, color: '#B0B3B8' }}>{crCount}</span>}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 14, padding: '4px 12px 0', fontSize: 12, fontWeight: 700, color: '#B0B3B8' }}>
                      <span onClick={() => reactToCmt(post.id, c.id, '❤️')} style={{ cursor: 'pointer', color: myCR ? '#FF2D8D' : '#B0B3B8' }}>
                        {myCR && myCR !== '❤️' ? myCR + ' ' : ''}J'aime
                      </span>
                      <span onClick={() => setReplyTo((p) => ({ ...p, [post.id]: c.authorName }))} style={{ cursor: 'pointer' }}>Répondre</span>
                      {(c.uid === currentUser.uid || post.uid === currentUser.uid) && (
                        <span onClick={() => deleteCmt(post.id, c)} style={{ cursor: 'pointer', color: '#FF2D8D' }}>Supprimer</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {showComments && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 14px', borderTop: '1px solid #3A3B3C' }}>
            <img src={userProfile?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile?.fullName || 'U')}&background=1877F2&color=fff`} alt=""
              style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitComment()}
              placeholder={replyTo?.[post.id] ? `Répondre à ${replyTo[post.id]}...` : 'Écrire un commentaire...'}
              style={{ flex: 1, background: '#3A3B3C', border: 'none', borderRadius: 18, padding: '9px 14px', color: '#E4E6EB', fontSize: 13, fontFamily: 'Poppins', minWidth: 0 }}
            />
            <button onClick={submitComment} disabled={!text.trim()}
              style={{ background: 'none', border: 'none', color: text.trim() ? '#FF2D8D' : '#65676B', fontWeight: 700, fontSize: 13, cursor: text.trim() ? 'pointer' : 'default', flexShrink: 0 }}>
              Envoyer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export { REACTIONS as VIEWER_REACTIONS, FB_REACTIONS as VIEWER_FB_REACTIONS };
