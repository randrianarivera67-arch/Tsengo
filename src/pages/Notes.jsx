// src/pages/Notes.jsx — Bloc-notes (texte tehirizina ho fichier ao amin'ny bot Telegram)
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { uploadToTelegram } from '../utils/telegram';
import { timeAgo } from '../utils/timeAgo';
import { NeonArchive } from '../components/NeonIcons';
import { HiPlus, HiX, HiTrash, HiPencil, HiArrowLeft } from 'react-icons/hi';

export default function Notes() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [notes, setNotes] = useState([]);
  const [editing, setEditing] = useState(null);   // null | {id?, title, body}
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // ✅ Pas d'orderBy → évite l'index composite Firestore (sinon la liste reste vide)
    const q = query(collection(db, 'notes'), where('uid', '==', currentUser.uid));
    const unsub = onSnapshot(q, snap => setNotes(
        snap.docs.map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0))
      ),
      err => console.error('Notes:', err?.message || err));
    return () => unsub();
  }, [currentUser]);

  function openNew() { setEditing({ title: '', body: '' }); }

  async function openExisting(note) {
    setEditing({ id: note.id, title: note.title, body: '...', loading: true });
    try {
      if (!note.fileURL) { setEditing({ id: note.id, title: note.title, body: note.preview || '', photoURL: note.photoURL || '', fileURL: '' }); return; }
      const r = await fetch(note.fileURL);
      const text = await r.text();
      setEditing({ id: note.id, title: note.title, body: text, photoURL: note.photoURL || '', fileURL: note.fileURL });
    } catch {
      setEditing({ id: note.id, title: note.title, body: note.preview || '', photoURL: note.photoURL || '', fileURL: note.fileURL || '' });
    }
  }

  async function saveNote() {
    if (!editing.title.trim() && !editing.body.trim()) { setEditing(null); return; }
    setSaving(true);
    try {
      // Le corps part sur Telegram en DOCUMENT (octet-stream), pas en texte brut
      const preview = (editing.body || '').trim().slice(0, 140);
      let fileURL = editing.fileURL || '';
      if ((editing.body || '').trim()) {
        const blob = new Blob([editing.body], { type: 'application/octet-stream' });
        const file = new File([blob], `note_${Date.now()}.txt`, { type: 'application/octet-stream' });
        try { const r = await uploadToTelegram(file); fileURL = r.url; }
        catch (up) { console.warn('Upload note:', up?.message); }
      }
      let photoURL = editing.photoURL || '';
      if (editing.photoFile) {
        try { const rp = await uploadToTelegram(editing.photoFile); photoURL = rp.url; }
        catch (up) { alert('Photo non envoyee : ' + (up?.message || up)); }
      }
      if (editing.id) {
        await updateDoc(doc(db, 'notes', editing.id), {
          title: editing.title.trim() || 'Sans titre', fileURL, preview, photoURL, updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, 'notes'), {
          uid: currentUser.uid, title: editing.title.trim() || 'Sans titre',
          fileURL, preview, photoURL, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
        });
      }
      setEditing(null);
    } catch (err) { alert('Erreur : ' + (err?.message || err)); }
    setSaving(false);
  }

  async function removeNote(id) {
    if (!window.confirm('Supprimer cette note ?')) return;
    try { await deleteDoc(doc(db, 'notes', id)); } catch (err) { alert('Erreur : ' + (err?.message || err)); }
  }

  return (
    <div style={{ padding: '14px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h2 style={{ fontWeight: 800, fontSize: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => navigate(-1)} style={{ background: '#F0F2F5', border: 'none', borderRadius: '50%', width: 34, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#050505' }}><HiArrowLeft size={18} /></button>
          <span className="icon-badge-3d" style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(145deg,#FFD84D,#F2B300)' }}>
            <NeonArchive size={17} color="white" />
          </span>
          Bloc-notes
        </h2>
        <button onClick={openNew} className="btn-gold" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', fontSize: 13, borderRadius: 20 }}>
          <HiPlus size={16} /> Nouvelle note
        </button>
      </div>

      {notes.length === 0 && (
        <div className="card" style={{ padding: 30, textAlign: 'center' }}>
          <p style={{ fontWeight: 700, marginBottom: 4 }}>Aucune note</p>
          <p style={{ fontSize: 13, color: '#65676B' }}>Vos notes sont privées, personne d'autre ne peut les voir.</p>
        </div>
      )}

      {notes.map(n => (
        <div key={n.id} className="card" style={{ padding: 14, marginBottom: 10, cursor: 'pointer' }} onClick={() => openExisting(n)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <p style={{ fontWeight: 800, fontSize: 15, flex: 1 }}>{n.title}</p>
            <button onClick={e => { e.stopPropagation(); removeNote(n.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#FF2D8D', padding: 4 }}><HiTrash size={15} /></button>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            {n.photoURL && <img src={n.photoURL} alt="" style={{ width: 56, height: 56, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />}
            <p style={{ flex: 1, minWidth: 0, fontSize: 13, color: '#65676B', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{n.preview || '(note vide)'}</p>
          </div>
          <p style={{ fontSize: 11, color: '#8A8D91', marginTop: 6 }}>{n.updatedAt ? timeAgo(n.updatedAt) : ''}</p>
        </div>
      ))}

      {editing && (
        <div style={{ position: 'fixed', inset: 0, background: 'white', zIndex: 400, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid #E4E6EB' }}>
            <button onClick={() => setEditing(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#65676B' }}><HiX size={22} /></button>
            <input className="input" placeholder="Titre" value={editing.title} onChange={e => setEditing(p => ({ ...p, title: e.target.value }))}
              style={{ flex: 1, fontWeight: 700, border: 'none', background: 'none' }} maxLength={100} />
            <button onClick={saveNote} disabled={saving} className="btn-gold" style={{ padding: '8px 16px', fontSize: 13, borderRadius: 16 }}>
              {saving ? '...' : 'Enregistrer'}
            </button>
          </div>
          <textarea value={editing.body} onChange={e => setEditing(p => ({ ...p, body: e.target.value }))}
            placeholder="Écrivez votre note..." style={{ flex: 1, border: 'none', outline: 'none', padding: 16, fontSize: 15, fontFamily: 'Poppins', resize: 'none' }} autoFocus />
        </div>
      )}
    </div>
  );
}
