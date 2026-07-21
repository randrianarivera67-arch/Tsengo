// src/pages/Events.jsx — Événements (créer, participer, lié au fil d'actualités)
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, updateDoc,
  arrayUnion, arrayRemove, serverTimestamp, writeBatch, limit
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { uploadToTelegram } from '../utils/telegram';
import { timeAgo } from '../utils/timeAgo';
import { HiCalendar, HiPlus, HiX, HiTrash, HiLocationMarker, HiUserGroup, HiPhotograph, HiCheck, HiArrowLeft } from 'react-icons/hi';

export default function Events() {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [date, setDate] = useState('');
  const [lieu, setLieu] = useState('');
  const [cover, setCover] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'events'), orderBy('date', 'asc'), limit(100));
    const unsub = onSnapshot(q, snap => {
      const now = Date.now();
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Ny ho avy voalohany, avy eo ny efa lasa (ambany)
      list.sort((a, b) => {
        const aPast = new Date(a.date).getTime() < now, bPast = new Date(b.date).getTime() < now;
        if (aPast !== bPast) return aPast ? 1 : -1;
        return new Date(a.date) - new Date(b.date);
      });
      setEvents(list);
    }, err => console.error('Events:', err?.message || err));
    return () => unsub();
  }, []);

  function pickCover(e) {
    const f = e.target.files[0]; if (!f) return;
    setCover(f); setCoverPreview(URL.createObjectURL(f));
  }

  async function createEvent() {
    if (!title.trim() || !date) { alert('Titre et date requis'); return; }
    setPosting(true);
    try {
      let coverURL = '';
      if (cover) { const r = await uploadToTelegram(cover); coverURL = r.url; }

      const evRef = await addDoc(collection(db, 'events'), {
        title: title.trim().slice(0, 120), description: desc.trim().slice(0, 1000),
        date, lieu: lieu.trim(), coverURL,
        createdBy: currentUser.uid, createdByName: userProfile.fullName, createdByPhoto: userProfile.photoURL || '',
        attendees: [currentUser.uid], interested: [],
        createdAt: serverTimestamp(),
      });

      // ✅ Mifandray amin'ny fil d'actualités : publication miaraka amin'ilay événement
      const postRef = await addDoc(collection(db, 'posts'), {
        uid: currentUser.uid, authorName: userProfile.fullName, authorUsername: userProfile.username,
        authorPhoto: userProfile.photoURL || '', authorIsVip: userProfile.isVip || false,
        content: desc.trim().slice(0, 2000), mediaURL: '', mediaType: '',
        isSale: false, price: '', contact: '', lieu: '',
        eventFrom: { id: evRef.id, title: title.trim(), date, lieu: lieu.trim(), coverURL },
        reactions: {}, comments: [], createdAt: serverTimestamp(),
      });

      const targets = userProfile.friends || [];
      if (targets.length > 0) {
        const batch = writeBatch(db);
        targets.forEach(fUid => batch.set(doc(collection(db, 'notifications')), {
          toUid: fUid, fromUid: currentUser.uid, fromName: userProfile.fullName, fromPhoto: userProfile.photoURL || '',
          type: 'post', postId: postRef.id, message: `${userProfile.fullName} a créé un événement : ${title.trim()}`,
          read: false, createdAt: serverTimestamp(),
        }));
        await batch.commit();
      }

      setOpen(false); setTitle(''); setDesc(''); setDate(''); setLieu(''); setCover(null); setCoverPreview(null);
    } catch (err) { alert('Erreur : ' + (err?.message || err)); }
    setPosting(false);
  }

  async function toggleAttend(ev, field) {
    const list = ev[field] || [];
    const inIt = list.includes(currentUser.uid);
    try { await updateDoc(doc(db, 'events', ev.id), { [field]: inIt ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid) }); }
    catch (err) { alert('Erreur : ' + (err?.message || err)); }
  }

  async function removeEvent(id) {
    if (!window.confirm('Supprimer cet événement ?')) return;
    try { await deleteDoc(doc(db, 'events', id)); } catch (err) { alert('Erreur : ' + (err?.message || err)); }
  }

  return (
    <div style={{ padding: '14px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h2 style={{ fontWeight: 800, fontSize: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => navigate(-1)} style={{ background: '#F0F2F5', border: 'none', borderRadius: '50%', width: 34, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#050505' }}><HiArrowLeft size={18} /></button>
          <span className="icon-badge-3d" style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(145deg,#3DD9C4,#12A48D)' }}>
            <HiCalendar size={18} color="white" />
          </span>
          Événements
        </h2>
        <button onClick={() => setOpen(true)} className="btn-blue" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', fontSize: 13, borderRadius: 20, background: 'linear-gradient(145deg,#3DD9C4,#12A48D)' }}>
          <HiPlus size={16} /> Créer
        </button>
      </div>

      {events.length === 0 && (
        <div className="card" style={{ padding: 30, textAlign: 'center' }}>
          <p style={{ fontWeight: 700, marginBottom: 4 }}>Aucun événement pour le moment</p>
          <p style={{ fontSize: 13, color: '#65676B' }}>Créez le premier — il apparaîtra aussi dans le fil d'actualités.</p>
        </div>
      )}

      {events.map(ev => {
        const isPast = new Date(ev.date).getTime() < Date.now();
        const going = (ev.attendees || []).includes(currentUser.uid);
        const interested = (ev.interested || []).includes(currentUser.uid);
        return (
          <div key={ev.id} className="card" style={{ marginBottom: 12, overflow: 'hidden', opacity: isPast ? .65 : 1 }}>
            {ev.coverURL && <img src={ev.coverURL} alt="" style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }} />}
            <div style={{ padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#12A48D' }}>
                    {new Date(ev.date).toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    {isPast ? ' · Terminé' : ''}
                  </p>
                  <p style={{ fontWeight: 800, fontSize: 16, marginTop: 2 }}>{ev.title}</p>
                </div>
                {ev.createdBy === currentUser.uid && (
                  <button onClick={() => removeEvent(ev.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#FF2D8D', padding: 4 }}><HiTrash size={16} /></button>
                )}
              </div>
              {ev.description && <p style={{ fontSize: 13, marginTop: 6, color: '#050505' }}>{ev.description}</p>}
              {ev.lieu && <p style={{ fontSize: 12, color: '#65676B', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}><HiLocationMarker size={13} color="#12A48D" />{ev.lieu}</p>}
              <p style={{ fontSize: 12, color: '#65676B', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                <HiUserGroup size={13} /> {(ev.attendees || []).length} participant{(ev.attendees || []).length > 1 ? 's' : ''} · {(ev.interested || []).length} intéressé{(ev.interested || []).length > 1 ? 's' : ''}
              </p>
              {!isPast && (
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button onClick={() => toggleAttend(ev, 'attendees')} className={going ? 'btn-primary' : 'btn-blue'}
                    style={{ flex: 1, padding: '9px 0', fontSize: 13, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                    {going && <HiCheck size={14} />} {going ? 'Je participe' : 'Participer'}
                  </button>
                  <button onClick={() => toggleAttend(ev, 'interested')} className="btn-secondary"
                    style={{ flex: 1, padding: '9px 0', fontSize: 13, borderRadius: 10, color: interested ? '#F2B300' : undefined, fontWeight: interested ? 800 : 600 }}>
                    ⭐ Intéressé{interested ? ' ✓' : ''}
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 400, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '20px 20px 0 0', padding: 20, width: '100%', maxWidth: 480, maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ fontWeight: 800, color: '#12A48D', fontSize: 16 }}>Créer un événement</h3>
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#65676B' }}><HiX size={20} /></button>
            </div>

            <input type="file" accept="image/*" id="ev-cover" style={{ display: 'none' }} onChange={pickCover} />
            <label htmlFor="ev-cover" style={{ height: 110, borderRadius: 12, background: coverPreview ? `url(${coverPreview}) center/cover` : '#F0F2F5', marginBottom: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#65676B' }}>
              {!coverPreview && <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}><HiPhotograph size={18} /> Ajouter une couverture</span>}
            </label>

            <input className="input" placeholder="Titre de l'événement" value={title} onChange={e => setTitle(e.target.value)} maxLength={120} style={{ marginBottom: 10 }} />
            <input type="datetime-local" className="input" value={date} onChange={e => setDate(e.target.value)} style={{ marginBottom: 10 }} />
            <input className="input" placeholder="Lieu" value={lieu} onChange={e => setLieu(e.target.value)} style={{ marginBottom: 10 }} />
            <textarea className="input" placeholder="Description" value={desc} onChange={e => setDesc(e.target.value)} rows={3} maxLength={1000} style={{ resize: 'none', marginBottom: 14 }} />

            <button onClick={createEvent} disabled={posting} className="btn-blue" style={{ width: '100%', padding: '12px 0', fontSize: 15, background: 'linear-gradient(145deg,#3DD9C4,#12A48D)' }}>
              {posting ? 'Création...' : "Créer l'événement"}
            </button>
            <p style={{ fontSize: 11, color: '#65676B', marginTop: 8, textAlign: 'center' }}>Il apparaîtra aussi dans le fil d'actualités de vos amis.</p>
          </div>
        </div>
      )}
    </div>
  );
}
