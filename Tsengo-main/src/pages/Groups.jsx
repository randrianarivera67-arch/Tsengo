// src/pages/Groups.jsx — Liste des groupes publics (clic = ouvrir la page du groupe)
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { HiUserGroup, HiPlus, HiX, HiChevronRight } from 'react-icons/hi';

export default function Groups() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [groups,   setGroups]   = useState([]);
  const [open,     setOpen]     = useState(false);
  const [name,     setName]     = useState('');
  const [desc,     setDesc]     = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'groups'), where('type', '==', 'page'));
    const unsub = onSnapshot(q, snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => {
        const am = a.members?.includes(currentUser?.uid) ? 0 : 1;
        const bm = b.members?.includes(currentUser?.uid) ? 0 : 1;
        return am - bm;
      });
      setGroups(list);
    }, err => console.error('Lecture groupes refusée:', err?.message || err));
    return () => unsub();
  }, [currentUser]);

  async function createPage() {
    const n = name.trim();
    if (!n) { alert('Donnez un nom au groupe'); return; }
    setCreating(true);
    try {
      const refDoc = await addDoc(collection(db, 'groups'), {
        name: n,
        description: desc.trim().slice(0, 300),
        type: 'page',
        photoURL: '',
        coverURL: '',
        admins: [currentUser.uid],
        members: [currentUser.uid],
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
      });
      setOpen(false); setName(''); setDesc('');
      navigate(`/groups/${refDoc.id}`);
    } catch (err) { alert('Erreur : ' + (err?.message || err)); }
    setCreating(false);
  }

  return (
    <div style={{ padding: '14px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h2 style={{ fontWeight: 800, fontSize: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <HiUserGroup size={24} color="#1877F2" /> Groupes
        </h2>
        <button onClick={() => setOpen(true)} className="btn-blue"
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', fontSize: 13, borderRadius: 20 }}>
          <HiPlus size={16} /> Créer
        </button>
      </div>

      {groups.length === 0 && (
        <div className="card" style={{ padding: 30, textAlign: 'center' }}>
          <HiUserGroup size={40} color="#1877F2" style={{ marginBottom: 8 }} />
          <p style={{ fontWeight: 700, marginBottom: 4 }}>Aucun groupe public pour le moment</p>
          <p style={{ fontSize: 13, color: '#65676B' }}>Créez le premier groupe de la communauté !</p>
        </div>
      )}

      {groups.map(g => {
        const isMember = g.members?.includes(currentUser.uid);
        const isAdmin  = g.admins?.includes(currentUser.uid);
        return (
          <div key={g.id} className="card" style={{ padding: 14, marginBottom: 10, cursor: 'pointer' }}
            onClick={() => navigate(`/groups/${g.id}`)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg,#1B84FF,#1877F2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 10px rgba(24,119,242,.35)', overflow: 'hidden' }}>
                {g.photoURL
                  ? <img src={g.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <HiUserGroup size={26} color="white" />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 800, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {g.name}
                  {isAdmin && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: '#F2B300', background: '#FFF6DB', borderRadius: 8, padding: '2px 7px', verticalAlign: 'middle' }}>ADMIN</span>}
                </p>
                <p style={{ fontSize: 12, color: '#65676B' }}>
                  Groupe public · {g.members?.length || 0} membre{(g.members?.length || 0) > 1 ? 's' : ''}{isMember && !isAdmin ? ' · Membre ✓' : ''}
                </p>
                {g.description && <p style={{ fontSize: 13, color: '#050505', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{g.description}</p>}
              </div>
              <HiChevronRight size={22} color="#65676B" style={{ flexShrink: 0 }} />
            </div>
          </div>
        );
      })}

      <p style={{ fontSize: 12, color: '#65676B', textAlign: 'center', marginTop: 14, padding: '0 20px' }}>
        Touchez un groupe pour ouvrir sa page.
      </p>

      {open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 400, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '20px 20px 0 0', padding: 20, width: '100%', maxWidth: 480 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ fontWeight: 800, color: '#1877F2', display: 'flex', alignItems: 'center', gap: 8 }}>
                <HiUserGroup size={20} /> Créer un groupe public
              </h3>
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#65676B' }}><HiX size={20} /></button>
            </div>
            <input className="input" placeholder="Nom du groupe" value={name} onChange={e => setName(e.target.value)} maxLength={60} style={{ marginBottom: 10 }} />
            <textarea className="input" placeholder="Description (optionnel)" value={desc} onChange={e => setDesc(e.target.value)} rows={3} maxLength={300} style={{ resize: 'none', borderRadius: 14 }} />
            <button onClick={createPage} disabled={creating} className="btn-primary" style={{ width: '100%', marginTop: 14, padding: '12px 0', fontSize: 15 }}>
              {creating ? 'Création...' : 'Créer le groupe ✨'}
            </button>
            <p style={{ fontSize: 11, color: '#65676B', marginTop: 8, textAlign: 'center' }}>
              Groupe public : tout le monde peut le rejoindre. Vous serez administrateur.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
