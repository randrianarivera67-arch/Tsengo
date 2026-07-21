// src/pages/ShopMessages.jsx — Messagerie dédiée à une page boutique
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ref, push, onValue, update, remove } from 'firebase/database';
import { doc, getDoc, addDoc, updateDoc, arrayUnion, collection, serverTimestamp } from 'firebase/firestore';
import { db, rtdb } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { sendPushNotification } from '../utils/onesignal';
import { uploadToTelegram } from '../utils/telegram';
import { HiShoppingBag, HiCheckCircle} from 'react-icons/hi';
import Linkify from '../components/Linkify';
import { HiArrowLeft, HiPaperAirplane, HiChevronRight, HiPhotograph, HiVideoCamera, HiPaperClip, HiMicrophone, HiDotsVertical, HiBan, HiTrash, HiCollection, HiX, HiSearch } from 'react-icons/hi';

const REACT_EMOJIS = ['❤️', '😂', '😮', '😢', '😡', '👍'];

const fmtTime = ts => ts ? new Date(ts).getHours() + ':' + String(new Date(ts).getMinutes()).padStart(2, '0') : '';

export default function ShopMessages() {
  const { shopId, visitorUid: paramVisitor } = useParams();
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();

  const [shop, setShop] = useState(null);
  const [convs, setConvs] = useState([]);
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [sending, setSending] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [online, setOnline] = useState(false);
  const [recording, setRecording] = useState(false);
  const [reactFor, setReactFor] = useState(null);
  const [convQ, setConvQ] = useState('');   // recherche de personnes   // msgId dont on choisit la réaction

  const bottomRef = useRef(null);
  const photoRef = useRef(null);
  const videoRef = useRef(null);
  const fileRef = useRef(null);
  const recRef = useRef(null);

  const isAdmin = !!shop?.admins?.includes(currentUser?.uid);
  const activeVisitor = isAdmin ? paramVisitor : currentUser?.uid;
  const conv = convs.find(c => c.uid === paramVisitor);

  useEffect(() => { getDoc(doc(db, 'shops', shopId)).then(s => s.exists() && setShop({ id: s.id, ...s.data() })); }, [shopId]);

  useEffect(() => {
    if (!shop || !isAdmin) return;
    const prefix = `shop_${shopId}_`;
    return onValue(ref(rtdb, 'conversations'), snap => {
      const data = snap.val() || {};
      setConvs(Object.entries(data)
        .filter(([k]) => k.startsWith(prefix))
        .map(([k, c]) => {
          const uid = k.slice(prefix.length);
          const m = c.messages ? Object.values(c.messages) : [];
          return { uid, last: m[m.length - 1], unread: m.filter(x => x.fromUid !== currentUser.uid && !x.readByAdmin).length, meta: c.meta || {} };
        })
        .sort((a, b) => (b.last?.ts || 0) - (a.last?.ts || 0)));
    });
  }, [shop, isAdmin, shopId, currentUser]);

  useEffect(() => {
    if (!isAdmin || !paramVisitor) return;
    return onValue(ref(rtdb, `online/${paramVisitor}`), s => setOnline(!!s.val()));
  }, [isAdmin, paramVisitor]);

  useEffect(() => {
    if (!activeVisitor || !shop) return;
    const r = ref(rtdb, `conversations/shop_${shopId}_${activeVisitor}/messages`);
    return onValue(r, snap => {
      const data = snap.val() || {};
      const list = Object.entries(data).map(([id, m]) => ({ id, ...m })).sort((a, b) => a.ts - b.ts);
      setMsgs(list);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
      const upd = {};
      list.forEach(m => {
        if (isAdmin && m.fromUid !== currentUser.uid && !m.readByAdmin) upd[`${m.id}/readByAdmin`] = true;
        if (!isAdmin && m.fromShop && !m.readByVisitor) { upd[`${m.id}/readByVisitor`] = true; upd[`${m.id}/read`] = true; }
      });
      if (Object.keys(upd).length) update(r, upd).catch(() => {});
    });
  }, [activeVisitor, shop, shopId, isAdmin, currentUser]);

  async function sendPayload(mediaURL = '', mediaType = '', body = '') {
    const base = `conversations/shop_${shopId}_${activeVisitor}`;
    await push(ref(rtdb, `${base}/messages`), {
      fromUid: currentUser.uid, fromShop: isAdmin,
      toUid: isAdmin ? activeVisitor : '',
      read: false,
      fromName: isAdmin ? shop.name : (userProfile?.fullName || 'Utilisateur'),
      fromPhoto: isAdmin ? (shop.photoURL || '') : (userProfile?.photoURL || ''),
      text: body, mediaURL, mediaType, ts: Date.now(),
      readByAdmin: isAdmin, readByVisitor: !isAdmin,
    });
    const label = body || (mediaType === 'video' ? '🎬 Vidéo' : mediaType === 'audio' ? '🎤 Vocal' : '📎 Média');
    const meta = { lastMessage: label, lastTs: Date.now(), shopId, shopName: shop.name, shopPhoto: shop.photoURL || '' };
    if (!isAdmin) { meta.visitorName = userProfile?.fullName || ''; meta.visitorPhoto = userProfile?.photoURL || ''; }
    await update(ref(rtdb, `${base}/meta`), meta);

    if (isAdmin && activeVisitor !== currentUser.uid) {
      addDoc(collection(db, 'notifications'), { toUid: activeVisitor, fromUid: currentUser.uid, fromName: shop.name, fromPhoto: shop.photoURL || '', type: 'shopMessage', shopId, visitorUid: activeVisitor, message: `${shop.name} vous a répondu : ${label.slice(0, 60)}`, read: false, createdAt: serverTimestamp() }).catch(() => {});
      sendPushNotification({ toExternalId: activeVisitor, title: `${shop.name} 📩`, message: label.slice(0, 80), fromPhoto: shop.photoURL || '', data: { type: 'shopMessage', shopId, visitorUid: activeVisitor } });
    } else {
      (shop.admins || []).filter(a => a !== currentUser.uid).forEach(a => {
        addDoc(collection(db, 'notifications'), { toUid: a, fromUid: currentUser.uid, fromName: userProfile?.fullName || 'Utilisateur', fromPhoto: userProfile?.photoURL || '', type: 'shopMessage', shopId, visitorUid: currentUser.uid, message: `${userProfile?.fullName || 'Quelqu\'un'} veut vous envoyer un message sur ${shop.name}`, read: false, createdAt: serverTimestamp() }).catch(() => {});
        sendPushNotification({ toExternalId: a, title: `${shop.name} 📩`, message: `${userProfile?.fullName || 'Quelqu\'un'} : ${label.slice(0, 60)}`, fromPhoto: userProfile?.photoURL || '', data: { type: 'shopMessage', shopId, visitorUid: currentUser.uid } });
      });
    }
  }

  async function toggleReaction(msgId, emoji) {
    setReactFor(null);
    if (!activeVisitor) return;
    const p = `conversations/shop_${shopId}_${activeVisitor}/messages/${msgId}/reactions/${currentUser.uid}`;
    const cur = msgs.find(m => m.id === msgId)?.reactions?.[currentUser.uid];
    try { await update(ref(rtdb, p.substring(0, p.lastIndexOf('/'))), { [currentUser.uid]: cur === emoji ? null : emoji }); } catch (e) { alert('Erreur : ' + (e?.message || e)); }
  }

  async function send() {
    if ((!text.trim() && !file) || !activeVisitor || sending) return;
    setSending(true);
    const body = text.trim().slice(0, 2000);
    const f = file;
    setText(''); setFile(null);
    try {
      let mediaURL = '', mediaType = '';
      if (f) { const r = await uploadToTelegram(f); mediaURL = r.url; mediaType = r.type; }
      await sendPayload(mediaURL, mediaType, body);
    } catch (e) { alert('Erreur : ' + (e?.message || e)); }
    setSending(false);
  }

  async function toggleRecord() {
    if (recording) { recRef.current?.stop(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      const chunks = [];
      mr.ondataavailable = e => chunks.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        setRecording(false);
        try {
          const blob = new Blob(chunks, { type: 'audio/webm' });
          const f = new File([blob], 'vocal.webm', { type: 'audio/webm' });
          const r = await uploadToTelegram(f);
          await sendPayload(r.url, 'audio', '');
        } catch (e) { alert('Erreur vocal : ' + (e?.message || e)); }
      };
      recRef.current = mr; mr.start(); setRecording(true);
    } catch { alert('Micro non autorisé'); }
  }

  async function blockOther() {
    setMenuOpen(false);
    const target = isAdmin ? paramVisitor : shopId;
    if (!confirm(isAdmin ? 'Bloquer cette personne ?' : 'Bloquer cette page ?')) return;
    try { await updateDoc(doc(db, 'users', currentUser.uid), { blocked: arrayUnion(target) }); alert('Bloqué'); } catch (e) { alert('Erreur : ' + (e?.message || e)); }
  }

  async function deleteConv() {
    setMenuOpen(false);
    if (!confirm('Supprimer cette conversation ?')) return;
    try { await remove(ref(rtdb, `conversations/shop_${shopId}_${activeVisitor}`)); navigate(isAdmin ? `/shop/${shopId}/messages` : `/shop/${shopId}`); } catch (e) { alert('Erreur : ' + (e?.message || e)); }
  }

  if (!shop) return <div style={{ padding: 30, textAlign: 'center', color: '#65676B' }}>Chargement…</div>;

  if (isAdmin && !paramVisitor) {
    return (
      <div style={{ minHeight: '100vh', background: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, borderBottom: '1px solid #E4E6EB', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
          <button onClick={() => navigate(`/shop/${shopId}`)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1877F2' }}><HiArrowLeft size={22} /></button>
          <div style={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(145deg,#FF6FA5,#FF2D8D)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {shop.photoURL ? <img src={shop.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <HiShoppingBag size={18} color="white" />}
          </div>
          <div><div style={{ fontWeight: 800, fontSize: 16, display:'flex', alignItems:'center', gap:5 }}>{shop.name} {shop.verified && <HiCheckCircle size={14} color="#1877F2" />}</div><div style={{ fontSize: 11.5, color: '#65676B' }}>Messages de la page</div></div>
        </div>
        <div style={{ padding: '10px 12px 6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F0F2F5', borderRadius: 22, padding: '9px 14px' }}>
            <HiSearch size={17} color="#65676B" />
            <input value={convQ} onChange={e => setConvQ(e.target.value)} placeholder="Rechercher une personne…"
              style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, background: 'transparent', color: '#050505', minWidth: 0 }} />
            {convQ && <button onClick={() => setConvQ('')} style={{ background: '#fff', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#65676B', flexShrink: 0 }}><HiX size={13} /></button>}
          </div>
        </div>
        {convs.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: '#65676B', fontSize: 14 }}>Aucun message pour le moment</div>}
        {convs.filter(c => !convQ.trim() || (c.meta.visitorName || '').toLowerCase().includes(convQ.trim().toLowerCase())).map(c => (
          <div key={c.uid} onClick={() => navigate(`/shop/${shopId}/messages/${c.uid}`)} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '12px 14px', borderBottom: '1px solid #F0F2F5', cursor: 'pointer' }}>
            <img src={c.meta.visitorPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.meta.visitorName || 'U')}&background=1877F2&color=fff`} alt="" style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: c.unread ? 800 : 600, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.meta.visitorName || 'Utilisateur'}</div>
              <div style={{ fontSize: 12.5, color: c.unread ? '#050505' : '#65676B', fontWeight: c.unread ? 700 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.meta.lastMessage || ''}</div>
            </div>
            {c.unread > 0 && <span style={{ background: '#FF2D8D', color: '#fff', fontSize: 11, fontWeight: 700, borderRadius: 10, minWidth: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px' }}>{c.unread > 9 ? '9+' : c.unread}</span>}
            <HiChevronRight size={17} color="#65676B" />
          </div>
        ))}
      </div>
    );
  }

  const otherName = isAdmin ? (conv?.meta.visitorName || 'Utilisateur') : shop.name;
  const otherPhoto = isAdmin ? conv?.meta.visitorPhoto : shop.photoURL;
  const otherSub = isAdmin ? (online ? 'En ligne' : 'Hors ligne') : 'Boutique';
  const onProfile = () => isAdmin ? navigate(`/profile/${paramVisitor}`) : navigate(`/shop/${shopId}`);
  const medias = msgs.filter(m => m.mediaURL);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderBottom: '1px solid #E4E6EB', background: '#fff', position: 'sticky', top: 0, zIndex: 20 }}>
        <button onClick={() => isAdmin ? navigate(`/shop/${shopId}/messages`) : navigate(`/shop/${shopId}`)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1877F2', display: 'flex' }}><HiArrowLeft size={24} /></button>
        <div onClick={onProfile} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', flex: 1, minWidth: 0 }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <img src={otherPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherName)}&background=1877F2&color=fff`} alt="" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }} />
            {isAdmin && <span style={{ position: 'absolute', bottom: 1, right: 1, width: 11, height: 11, borderRadius: '50%', background: online ? '#31A24C' : '#BCC0C4', border: '2px solid #fff' }} />}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 16.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{otherName}</div>
            <div style={{ fontSize: 12, color: '#65676B' }}>{otherSub}</div>
          </div>
        </div>
        <button onClick={() => setMenuOpen(o => !o)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#65676B', display: 'flex' }}><HiDotsVertical size={22} /></button>
        {menuOpen && (
          <>
            <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 25 }} />
            <div style={{ position: 'absolute', top: 56, right: 8, zIndex: 30, background: '#fff', borderRadius: 14, boxShadow: '0 8px 28px rgba(0,0,0,.2)', overflow: 'hidden', minWidth: 230 }}>
              <button onClick={() => { setMenuOpen(false); setMediaOpen(true); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 13, padding: '15px 18px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 600, borderBottom: '1px solid #F0F2F5' }}><HiCollection size={20} color="#1877F2" /> Médias partagés</button>
              <button onClick={blockOther} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 13, padding: '15px 18px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 600, color: '#FF2D8D', borderBottom: '1px solid #F0F2F5' }}><HiBan size={20} /> {isAdmin ? 'Bloquer cette personne' : 'Bloquer cette page'}</button>
              <button onClick={deleteConv} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 13, padding: '15px 18px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 600, color: '#E41E3F' }}><HiTrash size={20} /> Supprimer</button>
            </div>
          </>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 10px', background: '#fff' }}>
        {msgs.length === 0 && <div style={{ textAlign: 'center', color: '#65676B', fontSize: 13.5, marginTop: 30 }}>{isAdmin ? 'Aucun message' : `Envoyez un message à ${shop.name}`}</div>}
        {msgs.map(m => {
          const mine = m.fromUid === currentUser.uid;
          const seen = mine && (isAdmin ? m.readByVisitor : m.readByAdmin);
          return (
            <div key={m.id} style={{ display: 'flex', alignItems: 'flex-end', gap: 7, justifyContent: mine ? 'flex-end' : 'flex-start', marginBottom: 10 }}>
              {!mine && <img src={m.fromPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.fromName || 'U')}&background=1877F2&color=fff`} alt="" style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />}
              <div style={{ maxWidth: '74%' }}>
                {m.reactions && Object.keys(m.reactions).length > 0 && (
                  <div style={{ display: 'flex', marginBottom: 3, justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                    <span style={{ background: '#fff', border: '1px solid #E4E6EB', borderRadius: 12, padding: '2px 7px', fontSize: 13, boxShadow: '0 1px 4px rgba(0,0,0,.14)', lineHeight: 1.2 }}>
                      {[...new Set(Object.values(m.reactions))].join(' ')}
                      {Object.keys(m.reactions).length > 1 && <span style={{ fontSize: 10.5, color: '#65676B', marginLeft: 3, fontWeight: 700 }}>{Object.keys(m.reactions).length}</span>}
                    </span>
                  </div>
                )}
                <div
                  onDoubleClick={() => setReactFor(m.id)}
                  onContextMenu={e => { e.preventDefault(); setReactFor(m.id); }}
                  onTouchStart={e => { e.currentTarget._t = setTimeout(() => setReactFor(m.id), 450); }}
                  onTouchEnd={e => clearTimeout(e.currentTarget._t)}
                  onTouchMove={e => clearTimeout(e.currentTarget._t)}
                  style={{ position: 'relative', background: mine ? '#1877F2' : '#F0F2F5', color: mine ? '#fff' : '#050505', padding: m.mediaURL ? 4 : '10px 14px', borderRadius: 18, overflow: 'visible', cursor: 'pointer', userSelect: 'none' }}>
                  {m.mediaType === 'video' && <video src={m.mediaURL} controls style={{ width: 230, borderRadius: 14, display: 'block' }} />}
                  {m.mediaType === 'audio' && <audio src={m.mediaURL} controls style={{ width: 230, display: 'block' }} />}
                  {m.mediaURL && m.mediaType !== 'video' && m.mediaType !== 'audio' && <img src={m.mediaURL} alt="" style={{ width: 230, borderRadius: 14, display: 'block' }} />}
                  {m.text && <div style={{ fontSize: 15, lineHeight: 1.35, wordBreak: 'break-word', padding: m.mediaURL ? '7px 9px 3px' : 0 }}><Linkify text={m.text} color={mine ? '#DDEBFF' : '#1877F2'} /></div>}
                </div>
                <div style={{ fontSize: 10.5, color: '#65676B', marginTop: 3, textAlign: mine ? 'right' : 'left', paddingInline: 4 }}>
                  {fmtTime(m.ts)}{seen && <span style={{ color: '#1877F2', fontWeight: 700 }}> · ✓✓ Vu</span>}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {file && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#F0F2F5' }}>
          <span style={{ fontSize: 13, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📎 {file.name}</span>
          <button onClick={() => setFile(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#65676B' }}><HiX size={18} /></button>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '9px 10px', borderTop: '1px solid #E4E6EB', background: '#fff' }}>
        <input ref={photoRef} type="file" accept="image/*" onChange={e => e.target.files[0] && setFile(e.target.files[0])} style={{ display: 'none' }} />
        <input ref={videoRef} type="file" accept="video/*" onChange={e => e.target.files[0] && setFile(e.target.files[0])} style={{ display: 'none' }} />
        <input ref={fileRef} type="file" onChange={e => e.target.files[0] && setFile(e.target.files[0])} style={{ display: 'none' }} />
        <button onClick={() => photoRef.current?.click()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#050505', padding: 5, display: 'flex' }}><HiPhotograph size={23} /></button>
        <button onClick={() => videoRef.current?.click()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#050505', padding: 5, display: 'flex' }}><HiVideoCamera size={23} /></button>
        <button onClick={() => fileRef.current?.click()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#050505', padding: 5, display: 'flex' }}><HiPaperClip size={22} /></button>
        <button onClick={toggleRecord} style={{ background: recording ? '#FFE3EF' : 'none', border: 'none', borderRadius: '50%', cursor: 'pointer', color: recording ? '#FF2D8D' : '#050505', padding: 5, display: 'flex' }}><HiMicrophone size={22} /></button>
        <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()} placeholder="Écrivez un message…"
          style={{ flex: 1, border: 'none', background: '#F0F2F5', borderRadius: 22, padding: '11px 16px', fontSize: 15, outline: 'none', minWidth: 0 }} />
        <button onClick={send} disabled={(!text.trim() && !file) || sending}
          style={{ background: (text.trim() || file) ? '#FF2D8D' : '#F7C4DC', border: 'none', borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', flexShrink: 0 }}>
          <HiPaperAirplane size={20} style={{ transform: 'rotate(90deg)' }} />
        </button>
      </div>

      {reactFor && (
        <div onClick={() => setReactFor(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', zIndex: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 30, padding: '10px 14px', display: 'flex', gap: 6, boxShadow: '0 10px 34px rgba(0,0,0,.28)' }}>
            {REACT_EMOJIS.map(em => (
              <button key={em} onClick={() => toggleReaction(reactFor, em)}
                style={{ background: 'none', border: 'none', fontSize: 28, cursor: 'pointer', padding: 4, lineHeight: 1 }}>{em}</button>
            ))}
          </div>
        </div>
      )}

      {mediaOpen && (
        <div onClick={() => setMediaOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 300, display: 'flex', alignItems: 'flex-end' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '18px 18px 0 0', width: '100%', maxHeight: '75vh', overflowY: 'auto', padding: '16px 16px 26px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontWeight: 800, fontSize: 17 }}>Médias partagés</span>
              <button onClick={() => setMediaOpen(false)} style={{ background: '#F0F2F5', border: 'none', borderRadius: '50%', width: 34, height: 34, cursor: 'pointer' }}><HiX size={18} /></button>
            </div>
            {medias.length === 0 ? <p style={{ color: '#65676B', fontSize: 14, textAlign: 'center', padding: 20 }}>Aucun média</p>
              : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
                  {medias.map(m => <div key={m.id} style={{ aspectRatio: '1', borderRadius: 10, overflow: 'hidden', background: '#F0F2F5' }}>
                    {m.mediaType === 'video' ? <video src={m.mediaURL} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : m.mediaType === 'audio' ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}><HiMicrophone size={26} color="#FF2D8D" /></div>
                      : <img src={m.mediaURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                  </div>)}
                </div>}
          </div>
        </div>
      )}
    </div>
  );
}
