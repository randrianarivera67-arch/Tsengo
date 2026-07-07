// src/pages/Pages.jsx — Sera (pages publiques, format Facebook Page)
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { HiIdentification, HiPlus, HiX, HiChevronRight } from 'react-icons/hi';

const CATEGORIES = ['Entreprise', 'Artiste/Créateur', 'Association', 'Commerce local', 'Service', 'Communauté', 'Autre'];

export default function Pages() {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  const [pages, setPages] = useState([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'pages')), snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (a.admins?.includes(currentUser?.uid) ? 0 : 1) - (b.admins?.includes(currentUser?.uid) ? 0 : 1));
      setPages(list);
    }, err => console.error('Pages:', err?.message || err));
    return () => unsub();
  }, [currentUser]);

  async function createPage() {
    if (!name.trim()) { alert('Donnez un nom à votre Sera'); return; }
    setCreating(true);
    try {
      const ref = await addDoc(collection(db, 'pages'), {
        name: name.trim(), category, description: '', photoURL: '', coverURL: '',
        website: '', phone: '', location: '',
        admins: [currentUser.uid], followers: [],
        createdBy: currentUser.uid, createdAt: serverTimestamp(),
      });
      setOpen(false); setName('');
      navigate(`/pages/${ref.id}`);
    } catch (err) { alert('Erreur : ' + (err?.message || err)); }
    setCreating(false);
  }

  return (
    <div style={{ padding: '14px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h2 style={{ fontWeight: 800, fontSize: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="icon-badge-3d" style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(145deg,#63A9FF,#1877F2)' }}>
            <HiIdentification size={18} color="white" />
          </span>
          Sera
        </h2>
        <button onClick={() => setOpen(true)} className="btn-blue" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', fontSize: 13, borderRadius: 20 }}>
          <HiPlus size={16} /> Créer
        </button>
      </div>
      <p style={{ fontSize: 12, color: '#65676B', marginBottom: 14 }}>Pages publiques pour entreprises, artistes, associations...</p>

      {pages.length === 0 && (
        <div className="card" style={{ padding: 30, textAlign: 'center' }}>
          <p style={{ fontWeight: 700, marginBottom: 4 }}>Aucune page pour le moment</p>
          <p style={{ fontSize: 13, color: '#65676B' }}>Créez la première Sera de la communauté !</p>
        </div>
      )}

      {pages.map(pg => (
        <div key={pg.id} onClick={() => navigate(`/pages/${pg.id}`)} className="card" style={{ padding: 14, marginBottom: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(145deg,#63A9FF,#1877F2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
            {pg.photoURL ? <img src={pg.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <HiIdentification size={24} color="white" />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontWeight: 800, fontSize: 15 }}>
              {pg.name}
              {pg.admins?.includes(currentUser.uid) && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: '#F2B300', background: '#FFF6DB', borderRadius: 8, padding: '2px 7px' }}>ADMIN</span>}
            </p>
            <p style={{ fontSize: 12, color: '#65676B' }}>{pg.category} · {(pg.followers || []).length} abonnés</p>
          </div>
          <HiChevronRight size={18} color="#65676B" />
        </div>
      ))}

      {open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 400, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '20px 20px 0 0', padding: 20, width: '100%', maxWidth: 480 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ fontWeight: 800, color: '#1877F2', fontSize: 16 }}>Créer une Sera</h3>
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#65676B' }}><HiX size={20} /></button>
            </div>
            <input className="input" placeholder="Nom de la page" value={name} onChange={e => setName(e.target.value)} maxLength={80} style={{ marginBottom: 10 }} />
            <select value={category} onChange={e => setCategory(e.target.value)} className="input" style={{ marginBottom: 14 }}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={createPage} disabled={creating} className="btn-primary" style={{ width: '100%', padding: '12px 0', fontSize: 15 }}>
              {creating ? 'Création...' : 'Créer ma Sera ✨'}
            </button>
            <p style={{ fontSize: 11, color: '#65676B', marginTop: 8, textAlign: 'center' }}>Vous serez administrateur de cette page.</p>
          </div>
        </div>
      )}
    </div>
  );
}
