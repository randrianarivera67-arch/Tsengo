// src/pages/Groups.jsx — Groupes publics (format Facebook)
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp, arrayUnion, arrayRemove
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { HiUserGroup, HiPlus, HiX, HiTrash, HiCheck, HiPencil } from 'react-icons/hi';

export default function Groups() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [groups,   setGroups]   = useState([]);
  const [open,     setOpen]     = useState(false);
  const [name,     setName]     = useState('');
  const [desc,     setDesc]     = useState('');
  const [creating, setCreating] = useState(false);

  // Tous les groupes publics (pages)
  useEffect(() => {
    const q = query(collection(db, 'groups'), where('type', '==', 'page'));
    const unsub = onSnapshot(q, snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Mes groupes en premier
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
      await addDoc(collection(db, 'groups'), {
        name: n,
        description: desc.trim().slice(0, 300),
        type: 'page',
        photoURL: '',
        admins: [currentUser.uid],
        members: [currentUser.uid],
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
      });
      setOpen(false); setName(''); setDesc('');
    } catch (err) { alert('Erreur : ' + (err?.message || err)); }
    setCreating(false);
  }

  async function joinGroup(g) {
    try { await updateDoc(doc(db, 'groups', g.id), { members: arrayUnion(currentUser.uid) }); }
    catch (err) { alert('Erreur : ' + (err?.message || err)); }
  }

  async function leaveGroup(g) {
    if (!window.confirm(`Quitter le groupe "${g.name}" ?`)) return;
    try {
      await updateDoc(doc(db, 'groups', g.id), {
        members: arrayRemove(currentUser.uid),
        admins: arrayRemove(currentUser.uid),
      });
    } catch (err) { alert('Erreur : ' + (err?.message || err)); }
  }

  async function deleteGroup(g) {
    if (!g.admins?.includes(currentUser.uid)) return;
    if (!window.confirm(`Supprimer définitivement le groupe "${g.name}" ?`)) return;
    try { await deleteDoc(doc(db, 'groups', g.id)); }
    catch (err) { alert('Erreur : ' + (err?.message || err)); }
  }

  return (
    <div style={{ padding: '14px 12px' }}>
      {/* En-tête */}
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

      {/* Liste des groupes */}
      {groups.map(g => {
        const isMember = g.members?.includes(currentUser.uid);
        const isAdmin  = g.admins?.includes(currentUser.uid);
        return (
          <div key={g.id} className="card" style={{ padding: 14, marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg,#1B84FF,#1877F2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 10px rgba(24,119,242,.35)' }}>
                {g.photoURL
                  ? <img src={g.photoURL} alt="" style={{ width: '100%', height: '100%', borderRadius: 14, objectFit: 'cover' }} />
                  : <HiUserGroup size={26} color="white" />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 800, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {g.name}
                  {isAdmin && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: '#F2B300', background: '#FFF6DB', borderRadius: 8, padding: '2px 7px', verticalAlign: 'middle' }}>ADMIN</span>}
                </p>
                <p style={{ fontSize: 12, color: '#65676B' }}>
                  Groupe public · {g.members?.length || 0} membre{(g.members?.length || 0) > 1 ? 's' : ''}
                </p>
                {g.description && <p style={{ fontSize: 13, color: '#050505', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{g.description}</p>}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              {!isMember && (
                <button onClick={() => joinGroup(g)} className="btn-blue" style={{ flex: 1, padding: '9px 0', fontSize: 13, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <HiPlus size={15} /> Rejoindre
                </button>
              )}
              {isMember && (
                <>
                  <button onClick={() => navigate('/')} className="btn-primary" style={{ flex: 1, padding: '9px 0', fontSize: 13, borderRadius: 10 }}>
                    <HiPencil size={14} style={{ verticalAlign: '-2px', marginRight: 4 }} /> Publier
                  </button>
                  <button onClick={() => leaveGroup(g)} className="btn-secondary" style={{ flex: 1, padding: '9px 0', fontSize: 13, borderRadius: 10 }}>
                    <HiCheck size={14} style={{ verticalAlign: '-2px', marginRight: 4 }} /> Membre
                  </button>
                </>
              )}
              {isAdmin && (
                <button onClick={() => deleteGroup(g)} style={{ background: 'none', border: '1px solid #E4E6EB', borderRadius: 10, padding: '0 12px', cursor: 'pointer', color: '#FF2D8D' }}>
                  <HiTrash size={16} />
                </button>
              )}
            </div>
          </div>
        );
      })}

      <p style={{ fontSize: 12, color: '#65676B', textAlign: 'center', marginTop: 14, padding: '0 20px' }}>
        Les publications d'un groupe se font depuis l'accueil avec le sélecteur « Publier dans », et apparaissent dans le fil d'actualités de tous.
      </p>

      {/* Modal : Créer un groupe public */}
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
              Groupe public : tout le monde peut le rejoindre et voir ses publications. Vous serez administrateur.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
