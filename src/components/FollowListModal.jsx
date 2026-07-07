// src/components/FollowListModal.jsx
// Lisitry ny olona (abonnés / suivi) — clic = mankany amin'ny profil-ny
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { HiX } from 'react-icons/hi';

export default function FollowListModal({ uids = [], title, onClose }) {
  const navigate = useNavigate();
  const [list, setList] = useState(null);

  useEffect(() => {
    let alive = true;
    Promise.all(uids.slice(0, 200).map(uid =>
      getDoc(doc(db, 'users', uid)).then(sn => sn.exists() ? { uid, ...sn.data() } : null).catch(() => null)
    )).then(res => { if (alive) setList(res.filter(Boolean)); });
    return () => { alive = false; };
  }, [uids.join(',')]);

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:450, display:'flex', alignItems:'flex-end', justifyContent:'center' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background:'white', borderRadius:'20px 20px 0 0', padding:20, width:'100%', maxWidth:480, maxHeight:'75vh', overflowY:'auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
          <h3 style={{ fontWeight:800, fontSize:16 }}>{title} ({uids.length})</h3>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'#65676B' }}><HiX size={20}/></button>
        </div>
        {list === null && <p style={{ fontSize:13, color:'#65676B', textAlign:'center', padding:'20px 0' }}>Chargement...</p>}
        {list?.length === 0 && <p style={{ fontSize:13, color:'#65676B', textAlign:'center', padding:'20px 0' }}>Personne pour le moment.</p>}
        {list?.map(u => (
          <div key={u.uid} onClick={() => { onClose(); navigate(`/profile/${u.uid}`); }}
            style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 2px', cursor:'pointer', borderBottom:'1px solid #F0F2F5' }}>
            <img src={u.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.fullName||'U')}&background=1877F2&color=fff`}
              alt="" style={{ width:42, height:42, borderRadius:'50%', objectFit:'cover' }} />
            <div style={{ flex:1, minWidth:0 }}>
              <p style={{ fontWeight:700, fontSize:14 }}>{u.fullName}</p>
              <p style={{ fontSize:12, color:'#65676B' }}>@{u.username}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
