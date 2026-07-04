// src/pages/Search.jsx — Recherche plein écran (format Facebook)
// Résultats par catégorie : Comptes · Groupes · Publications
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { HiArrowLeft, HiSearch, HiUserGroup, HiX, HiChevronRight } from 'react-icons/hi';

export default function Search() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [term,   setTerm]   = useState('');
  const [users,  setUsers]  = useState([]);
  const [groups, setGroups] = useState([]);
  const [posts,  setPosts]  = useState([]);
  const [loaded, setLoaded] = useState(false);
  const inputRef = useRef();

  // Charger les données une fois (filtrage côté client, comme la recherche existante)
  useEffect(() => {
    let alive = true;
    Promise.all([
      getDocs(collection(db, 'users')).catch(() => null),
      getDocs(query(collection(db, 'groups'), where('type', '==', 'page'))).catch(() => null),
      getDocs(query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(200))).catch(() => null),
    ]).then(([uSnap, gSnap, pSnap]) => {
      if (!alive) return;
      if (uSnap) setUsers(uSnap.docs.map(d => ({ uid: d.id, ...d.data() })).filter(u => u.fullName));
      if (gSnap) setGroups(gSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      if (pSnap) setPosts(pSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoaded(true);
    });
    inputRef.current?.focus();
    return () => { alive = false; };
  }, []);

  const q = term.trim().toLowerCase();
  const match = txt => (txt || '').toLowerCase().includes(q);

  const uRes = q ? users.filter(u => match(u.fullName) || match(u.username)).slice(0, 8)
                 : users.filter(u => u.uid !== currentUser?.uid).slice(0, 5);
  const gRes = q ? groups.filter(g => match(g.name) || match(g.description)).slice(0, 6)
                 : groups.slice(0, 4);
  const pRes = q ? posts.filter(p => match(p.content) || match(p.authorName) || match(p.groupName)).slice(0, 10)
                 : [];

  const av = (photo, name) => photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'U')}&background=1877F2&color=fff`;

  const SectionTitle = ({ children }) => (
    <p style={{ padding: '14px 16px 8px', fontSize: 15, fontWeight: 800 }}>{children}</p>
  );

  return (
    <div style={{ minHeight: '60vh' }}>
      {/* Barre de recherche plein écran (format Facebook) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderBottom: '1px solid #E4E6EB', position: 'sticky', top: 0, background: 'white', zIndex: 20 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#050505', padding: 4 }}>
          <HiArrowLeft size={22} />
        </button>
        <div style={{ position: 'relative', flex: 1 }}>
          <HiSearch style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#65676B' }} />
          <input ref={inputRef} className="input" placeholder="Rechercher sur Traingo" value={term}
            onChange={e => setTerm(e.target.value)}
            style={{ paddingLeft: 36, paddingRight: 34, borderRadius: 30, fontSize: 14 }} />
          {term && (
            <button onClick={() => { setTerm(''); inputRef.current?.focus(); }}
              style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: '#E4E6EB', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', color: '#050505', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <HiX size={13} />
            </button>
          )}
        </div>
      </div>

      {!loaded && <p style={{ padding: 30, textAlign: 'center', color: '#65676B', fontSize: 14 }}>Chargement...</p>}

      {loaded && !q && (
        <p style={{ padding: '12px 16px 0', fontSize: 13, color: '#65676B' }}>Suggestions</p>
      )}

      {/* ── Comptes ── */}
      {uRes.length > 0 && (
        <>
          <SectionTitle>Comptes</SectionTitle>
          {uRes.map(u => (
            <div key={u.uid} onClick={() => navigate(`/profile/${u.uid}`)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 16px', cursor: 'pointer' }}>
              <img src={av(u.photoURL, u.fullName)} alt="" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.fullName}</p>
                <p style={{ fontSize: 12, color: '#65676B' }}>@{u.username}</p>
              </div>
              <HiChevronRight size={18} color="#65676B" />
            </div>
          ))}
        </>
      )}

      {/* ── Groupes ── */}
      {gRes.length > 0 && (
        <>
          <SectionTitle>Groupes</SectionTitle>
          {gRes.map(g => (
            <div key={g.id} onClick={() => navigate(`/groups/${g.id}`)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 16px', cursor: 'pointer' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#1B84FF,#1877F2)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                {g.photoURL ? <img src={g.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <HiUserGroup size={22} color="white" />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</p>
                <p style={{ fontSize: 12, color: '#65676B' }}>Groupe public · {g.members?.length || 0} membre{(g.members?.length || 0) > 1 ? 's' : ''}</p>
              </div>
              <HiChevronRight size={18} color="#65676B" />
            </div>
          ))}
        </>
      )}

      {/* ── Publications ── */}
      {pRes.length > 0 && (
        <>
          <SectionTitle>Publications</SectionTitle>
          {pRes.map(p => (
            <div key={p.id} onClick={() => navigate(`/post/${p.id}`)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 16px', cursor: 'pointer' }}>
              <img src={av(p.authorPhoto, p.authorName)} alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 700, fontSize: 13 }}>
                  {p.authorName}{p.groupName ? <span style={{ color: '#65676B', fontWeight: 500 }}> · dans {p.groupName}</span> : ''}
                </p>
                <p style={{ fontSize: 13, color: '#050505', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.content || (p.mediaType === 'video' ? '🎬 Vidéo' : '📷 Photo')}
                </p>
              </div>
              {p.mediaURL && p.mediaType === 'image' && (
                <img src={p.mediaURL} alt="" style={{ width: 46, height: 46, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
              )}
            </div>
          ))}
        </>
      )}

      {loaded && q && uRes.length === 0 && gRes.length === 0 && pRes.length === 0 && (
        <p style={{ padding: 40, textAlign: 'center', color: '#65676B', fontSize: 14 }}>
          Aucun résultat pour « {term} »
        </p>
      )}
    </div>
  );
}
