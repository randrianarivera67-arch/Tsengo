// src/pages/ArtistMessages.jsx — Messagerie dédiée à une page artiste
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ref, push, onValue, update, serverTimestamp as rtdbTs } from 'firebase/database';
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, rtdb } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { sendPushNotification } from '../utils/onesignal';
import { NeonMic } from '../components/NeonIcons';
import { HiArrowLeft, HiPaperAirplane, HiChevronRight } from 'react-icons/hi';

function fmtTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0');
}

export default function ArtistMessages() {
  const { artistId, visitorUid: paramVisitor } = useParams();
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();

  const [artist, setArtist] = useState(null);
  const [convs, setConvs] = useState([]);      // admin : liste des conversations
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const isAdmin = !!artist?.admins?.includes(currentUser?.uid);
  // Le visiteur discute avec sa propre conv ; l'admin ouvre celle d'un visiteur
  const activeVisitor = isAdmin ? paramVisitor : currentUser?.uid;

  useEffect(() => {
    getDoc(doc(db, 'artists', artistId)).then(s => s.exists() && setArtist({ id: s.id, ...s.data() }));
  }, [artistId]);

  // Admin : toutes les conversations de la page
  useEffect(() => {
    if (!artist || !isAdmin) return;
    const r = ref(rtdb, `artistConversations/${artistId}`);
    return onValue(r, snap => {
      const data = snap.val() || {};
      const list = Object.entries(data).map(([uid, c]) => {
        const m = c.messages ? Object.values(c.messages) : [];
        const last = m[m.length - 1];
        const unread = m.filter(x => x.fromUid !== currentUser.uid && !x.readByAdmin).length;
        return { uid, last, unread, meta: c.meta || {} };
      }).sort((a, b) => (b.last?.ts || 0) - (a.last?.ts || 0));
      setConvs(list);
    });
  }, [artist, isAdmin, artistId, currentUser]);

  // Messages de la conversation active
  useEffect(() => {
    if (!activeVisitor || !artist) return;
    const r = ref(rtdb, `artistConversations/${artistId}/${activeVisitor}/messages`);
    return onValue(r, snap => {
      const data = snap.val() || {};
      const list = Object.entries(data).map(([id, m]) => ({ id, ...m })).sort((a, b) => a.ts - b.ts);
      setMsgs(list);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
      // marquer lu
      const upd = {};
      list.forEach(m => {
        if (isAdmin && m.fromUid !== currentUser.uid && !m.readByAdmin) upd[`${m.id}/readByAdmin`] = true;
        if (!isAdmin && m.fromArtist && !m.readByVisitor) upd[`${m.id}/readByVisitor`] = true;
      });
      if (Object.keys(upd).length) update(r, upd).catch(() => {});
    });
  }, [activeVisitor, artist, artistId, isAdmin, currentUser]);

  async function send() {
    if (!text.trim() || !activeVisitor || sending) return;
    setSending(true);
    const body = text.trim().slice(0, 2000);
    setText('');
    try {
      const base = `artistConversations/${artistId}/${activeVisitor}`;
      await push(ref(rtdb, `${base}/messages`), {
        fromUid: currentUser.uid,
        fromArtist: isAdmin,
        fromName: isAdmin ? artist.name : (userProfile?.fullName || 'Utilisateur'),
        fromPhoto: isAdmin ? (artist.photoURL || '') : (userProfile?.photoURL || ''),
        text: body, ts: Date.now(),
        readByAdmin: isAdmin, readByVisitor: !isAdmin,
      });
      await update(ref(rtdb, `${base}/meta`), {
        visitorName: isAdmin ? undefined : (userProfile?.fullName || ''),
        visitorPhoto: isAdmin ? undefined : (userProfile?.photoURL || ''),
        lastMessage: body, lastTs: Date.now(),
      });

      // ── Notification + push ──
      if (isAdmin) {
        // artiste → visiteur
        await addDoc(collection(db, 'notifications'), {
          toUid: activeVisitor, fromUid: currentUser.uid,
          fromName: artist.name, fromPhoto: artist.photoURL || '',
          type: 'artistMessage', artistId, visitorUid: activeVisitor,
          message: `${artist.name} vous a répondu : ${body.slice(0, 60)}`,
          read: false, createdAt: serverTimestamp(),
        });
        sendPushNotification({
          toExternalId: activeVisitor, title: `${artist.name} 📩`, message: body.slice(0, 80),
          fromPhoto: artist.photoURL || '', data: { type: 'artistMessage', artistId, visitorUid: activeVisitor },
        });
      } else {
        // visiteur → tous les admins de la page
        (artist.admins || []).forEach(adminUid => {
          addDoc(collection(db, 'notifications'), {
            toUid: adminUid, fromUid: currentUser.uid,
            fromName: userProfile?.fullName || 'Utilisateur', fromPhoto: userProfile?.photoURL || '',
            type: 'artistMessage', artistId, visitorUid: currentUser.uid,
            message: `${userProfile?.fullName || 'Quelqu\'un'} veut vous envoyer un message sur ${artist.name}`,
            read: false, createdAt: serverTimestamp(),
          }).catch(() => {});
          sendPushNotification({
            toExternalId: adminUid, title: `${artist.name} 📩`,
            message: `${userProfile?.fullName || 'Quelqu\'un'} : ${body.slice(0, 60)}`,
            fromPhoto: userProfile?.photoURL || '',
            data: { type: 'artistMessage', artistId, visitorUid: currentUser.uid },
          });
        });
      }
    } catch (e) { alert('Erreur : ' + (e?.message || e)); }
    setSending(false);
  }

  if (!artist) return <div style={{ padding: 30, textAlign: 'center', color: '#65676B' }}>Chargement…</div>;

  const headerBar = (title, sub, onBack) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 12px', borderBottom: '1px solid #E4E6EB', background: '#fff', position: 'sticky', top: 0, zIndex: 10 }}>
      <button onClick={onBack} style={{ background: '#F0F2F5', border: 'none', borderRadius: '50%', width: 34, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><HiArrowLeft size={18} /></button>
      <div style={{ width: 38, height: 38, borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(145deg,#FF6FA5,#FF2D8D)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {artist.photoURL ? <img src={artist.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <NeonMic size={17} color="white" />}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
        <div style={{ fontSize: 11.5, color: '#65676B' }}>{sub}</div>
      </div>
    </div>
  );

  // ── ADMIN : liste des conversations ──
  if (isAdmin && !paramVisitor) {
    return (
      <div style={{ minHeight: '100vh', background: '#fff' }}>
        {headerBar(artist.name, 'Messages de la page', () => navigate(`/artists/${artistId}`))}
        {convs.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: '#65676B', fontSize: 14 }}>Aucun message pour le moment</div>}
        {convs.map(c => (
          <div key={c.uid} onClick={() => navigate(`/artists/${artistId}/messages/${c.uid}`)}
            style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '12px 14px', borderBottom: '1px solid #F0F2F5', cursor: 'pointer' }}>
            <img src={c.meta.visitorPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.meta.visitorName || 'U')}&background=1877F2&color=fff`}
              alt="" style={{ width: 46, height: 46, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: c.unread ? 800 : 600, fontSize: 14.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.meta.visitorName || 'Utilisateur'}</div>
              <div style={{ fontSize: 12.5, color: c.unread ? '#050505' : '#65676B', fontWeight: c.unread ? 700 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.meta.lastMessage || ''}</div>
            </div>
            {c.unread > 0 && <span style={{ background: '#FF2D8D', color: '#fff', fontSize: 11, fontWeight: 700, borderRadius: 10, minWidth: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px' }}>{c.unread > 9 ? '9+' : c.unread}</span>}
            <HiChevronRight size={17} color="#65676B" />
          </div>
        ))}
      </div>
    );
  }

  // ── Conversation (visiteur, ou admin ayant ouvert une conv) ──
  const convTitle = isAdmin ? (convs.find(c => c.uid === paramVisitor)?.meta.visitorName || 'Utilisateur') : artist.name;
  const convSub = isAdmin ? `via ${artist.name}` : 'Page artiste';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#fff' }}>
      {headerBar(convTitle, convSub, () => isAdmin ? navigate(`/artists/${artistId}/messages`) : navigate(`/artists/${artistId}`))}

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 12px', background: '#F7F8FA' }}>
        {msgs.length === 0 && (
          <div style={{ textAlign: 'center', color: '#65676B', fontSize: 13.5, marginTop: 30 }}>
            {isAdmin ? 'Aucun message' : `Envoyez un message à ${artist.name}`}
          </div>
        )}
        {msgs.map(m => {
          const mine = m.fromUid === currentUser.uid;
          return (
            <div key={m.id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
              <div style={{ maxWidth: '76%', background: mine ? 'linear-gradient(145deg,#FF6FA5,#FF2D8D)' : '#fff', color: mine ? '#fff' : '#050505', padding: '9px 13px', borderRadius: mine ? '16px 16px 4px 16px' : '16px 16px 16px 4px', boxShadow: '0 1px 2px rgba(0,0,0,.08)' }}>
                {!mine && <div style={{ fontSize: 11, fontWeight: 700, color: '#FF2D8D', marginBottom: 2 }}>{m.fromName}</div>}
                <div style={{ fontSize: 14.5, lineHeight: 1.35, wordBreak: 'break-word' }}>{m.text}</div>
                <div style={{ fontSize: 10, opacity: .7, textAlign: 'right', marginTop: 3 }}>{fmtTime(m.ts)}</div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderTop: '1px solid #E4E6EB', background: '#fff' }}>
        <input value={text} onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="Écrire un message…"
          style={{ flex: 1, border: '1px solid #E4E6EB', borderRadius: 22, padding: '11px 16px', fontSize: 14.5, outline: 'none' }} />
        <button onClick={send} disabled={!text.trim() || sending}
          style={{ background: text.trim() ? 'linear-gradient(145deg,#FF6FA5,#FF2D8D)' : '#E4E6EB', border: 'none', borderRadius: '50%', width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: text.trim() ? 'pointer' : 'default', color: '#fff', flexShrink: 0 }}>
          <HiPaperAirplane size={19} style={{ transform: 'rotate(90deg)' }} />
        </button>
      </div>
    </div>
  );
}
