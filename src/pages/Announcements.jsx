// src/pages/Announcements.jsx — Petites annonces (format classifieds)
import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { timeAgo } from '../utils/timeAgo';
import { HiSpeakerphone, HiPlus, HiX, HiTrash, HiPhone, HiLocationMarker } from 'react-icons/hi';

const CATEGORIES = ['Emploi', 'Immobilier', 'Objet perdu/trouvé', 'Service', 'Covoiturage', 'Autre'];

export default function Announcements() {
  const { currentUser, userProfile } = useAuth();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [contact, setContact] = useState('');
  const [lieu, setLieu] = useState('');
  const [posting, setPosting] = useState(false);
  const [filter, setFilter] = useState('Tout');

  useEffect(() => {
    const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'), limit(100));
    const unsub = onSnapshot(q, snap => setItems(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      err => console.error('Annonces:', err?.message || err));
    return () => unsub();
  }, []);

  async function publish() {
    if (!title.trim()) { alert('Donnez un titre à votre annonce'); return; }
    setPosting(true);
    try {
      await addDoc(collection(db, 'announcements'), {
        uid: currentUser.uid, authorName: userProfile.fullName, authorPhoto: userProfile.photoURL || '',
        title: title.trim().slice(0, 120), description: desc.trim().slice(0, 1000),
        category, contact: contact.trim(), lieu: lieu.trim(),
        createdAt: serverTimestamp(),
      });
      setOpen(false); setTitle(''); setDesc(''); setContact(''); setLieu(''); setCategory(CATEGORIES[0]);
    } catch (err) { alert('Erreur : ' + (err?.message || err)); }
    setPosting(false);
  }

  async function remove(id) {
    if (!window.confirm('Supprimer cette annonce ?')) return;
    try { await deleteDoc(doc(db, 'announcements', id)); } catch (err) { alert('Erreur : ' + (err?.message || err)); }
  }

  const filtered = filter === 'Tout' ? items : items.filter(i => i.category === filter);

  return (
    <div style={{ padding: '14px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <h2 style={{ fontWeight: 800, fontSize: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="icon-badge-3d" style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(145deg,#FF9A5A,#FF7A00)' }}>
            <HiSpeakerphone size={18} color="white" />
          </span>
          Annonces
        </h2>
        <button onClick={() => setOpen(true)} className="btn-orange" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', fontSize: 13, borderRadius: 20 }}>
          <HiPlus size={16} /> Publier
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '10px 0 14px', scrollbarWidth: 'none' }}>
        {['Tout', ...CATEGORIES].map(c => (
          <button key={c} onClick={() => setFilter(c)}
            style={{ flexShrink: 0, padding: '7px 14px', borderRadius: 18, border: 'none', cursor: 'pointer', fontFamily: 'Poppins', fontSize: 12, fontWeight: 700,
              background: filter === c ? '#FF7A00' : '#F0F2F5', color: filter === c ? 'white' : '#050505' }}>
            {c}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="card" style={{ padding: 30, textAlign: 'center' }}>
          <p style={{ fontWeight: 700, marginBottom: 4 }}>Aucune annonce{filter !== 'Tout' ? ` en « ${filter} »` : ''}</p>
          <p style={{ fontSize: 13, color: '#65676B' }}>Soyez le premier à publier !</p>
        </div>
      )}

      {filtered.map(a => (
        <div key={a.id} className="card" style={{ padding: 14, marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#FF7A00', background: '#FFF1E4', borderRadius: 10, padding: '2px 9px' }}>{a.category}</span>
              <p style={{ fontWeight: 800, fontSize: 15, marginTop: 6 }}>{a.title}</p>
            </div>
            {a.uid === currentUser.uid && (
              <button onClick={() => remove(a.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#FF2D8D', padding: 4, flexShrink: 0 }}><HiTrash size={16} /></button>
            )}
          </div>
          {a.description && <p style={{ fontSize: 13, marginTop: 6, color: '#050505' }}>{a.description}</p>}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
            {a.contact && <a href={`tel:${a.contact}`} style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#E4E6EB', borderRadius: 20, padding: '5px 12px', color: '#1877F2', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}><HiPhone size={12} />{a.contact}</a>}
            {a.lieu && <span style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#F0F2F5', borderRadius: 20, padding: '5px 12px', color: '#65676B', fontSize: 12 }}><HiLocationMarker size={12} color="#FF7A00" />{a.lieu}</span>}
          </div>
          <p style={{ fontSize: 11, color: '#65676B', marginTop: 8 }}>{a.authorName} · {a.createdAt ? timeAgo(a.createdAt) : ''}</p>
        </div>
      ))}

      {open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 400, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '20px 20px 0 0', padding: 20, width: '100%', maxWidth: 480, maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ fontWeight: 800, color: '#FF7A00', fontSize: 16 }}>Publier une annonce</h3>
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#65676B' }}><HiX size={20} /></button>
            </div>
            <select value={category} onChange={e => setCategory(e.target.value)} className="input" style={{ marginBottom: 10 }}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input className="input" placeholder="Titre de l'annonce" value={title} onChange={e => setTitle(e.target.value)} maxLength={120} style={{ marginBottom: 10 }} />
            <textarea className="input" placeholder="Description" value={desc} onChange={e => setDesc(e.target.value)} rows={3} maxLength={1000} style={{ resize: 'none', marginBottom: 10 }} />
            <input className="input" placeholder="Contact (téléphone)" value={contact} onChange={e => setContact(e.target.value)} style={{ marginBottom: 10 }} />
            <input className="input" placeholder="Lieu" value={lieu} onChange={e => setLieu(e.target.value)} style={{ marginBottom: 14 }} />
            <button onClick={publish} disabled={posting} className="btn-orange" style={{ width: '100%', padding: '12px 0', fontSize: 15 }}>
              {posting ? 'Publication...' : 'Publier l\\'annonce'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
