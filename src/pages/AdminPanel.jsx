// src/pages/AdminPanel.jsx
// ✅ FIX BUG #2 & #3: Admin sécurisé via Firestore (isAdmin field) + route protégée
import { useState, useEffect } from 'react';
import {
  collection, query, getDocs, doc, updateDoc,
  orderBy, getDoc, addDoc, serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  HiShieldCheck, HiStar, HiSearch, HiSpeakerphone,
  HiLightningBolt, HiX, HiClock, HiUser,
  HiChevronDown, HiChevronUp
} from 'react-icons/hi';

export default function AdminPanel() {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();

  const [isAdmin, setIsAdmin] = useState(null);
  const [activeTab, setActiveTab] = useState('users');

  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [posts, setPosts] = useState([]);
  const [boostSearch, setBoostSearch] = useState('');
  const [boostDays, setBoostDays] = useState({});
  const [boostLoading, setBoostLoading] = useState({});
  const [expandedPost, setExpandedPost] = useState(null);

  // ✅ Vérification admin via Firestore — aucun mot de passe dans le code
  useEffect(() => {
    async function checkAdmin() {
      if (!currentUser) { setIsAdmin(false); return; }
      try {
        const snap = await getDoc(doc(db, 'users', currentUser.uid));
        if (snap.exists() && snap.data().isAdmin === true) {
          setIsAdmin(true);
          loadUsers();
          loadPosts();
        } else {
          setIsAdmin(false);
        }
      } catch { setIsAdmin(false); }
    }
    checkAdmin();
  }, [currentUser]);

  async function loadUsers() {
    setLoading(true);
    const snap = await getDocs(query(collection(db, 'users'), orderBy('fullName')));
    setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    setLoading(false);
  }

  async function loadPosts() {
    const snap = await getDocs(query(collection(db, 'posts'), orderBy('createdAt', 'desc')));
    setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }

  async function toggleVip(user) {
    const newVip = !user.isVip;
    await updateDoc(doc(db, 'users', user.id), { isVip: newVip });
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, isVip: newVip } : u));
    showMsg(`${user.fullName} → VIP ${newVip ? 'activé ✅' : 'désactivé ❌'}`);
  }

  async function activateBoost(post) {
    const days = parseInt(boostDays[post.id]);
    if (!days || days < 1 || days > 365) {
      showMsg('❌ Nombre de jours invalide (1–365)');
      return;
    }
    setBoostLoading(p => ({ ...p, [post.id]: true }));
    try {
      const boostUntil = new Date();
      boostUntil.setDate(boostUntil.getDate() + days);

      await updateDoc(doc(db, 'posts', post.id), {
        isBoosted: true,
        boostDays: days,
        boostUntil: boostUntil.toISOString(),
        boostedAt: new Date().toISOString(),
      });

      await addDoc(collection(db, 'notifications'), {
        toUid: post.uid,
        fromUid: currentUser.uid,
        fromName: 'Tsengo Admin',
        fromPhoto: '',
        type: 'boost',
        postId: post.id,
        message: `Votre publication a été boostée pendant ${days} jour${days > 1 ? 's' : ''} 🚀`,
        read: false,
        createdAt: serverTimestamp(),
      });

      setPosts(prev => prev.map(p => p.id === post.id
        ? { ...p, isBoosted: true, boostDays: days, boostUntil: boostUntil.toISOString() }
        : p
      ));
      showMsg(`🚀 Post de @${post.authorUsername} boosté ${days}j !`);
      setBoostDays(p => ({ ...p, [post.id]: '' }));
    } catch (err) {
      showMsg('❌ Erreur lors du boost');
    }
    setBoostLoading(p => ({ ...p, [post.id]: false }));
  }

  async function deactivateBoost(post) {
    setBoostLoading(p => ({ ...p, [post.id]: true }));
    await updateDoc(doc(db, 'posts', post.id), {
      isBoosted: false, boostDays: 0, boostUntil: null,
    });
    setPosts(prev => prev.map(p => p.id === post.id
      ? { ...p, isBoosted: false, boostDays: 0, boostUntil: null }
      : p
    ));
    showMsg(`⛔ Boost retiré du post de @${post.authorUsername}`);
    setBoostLoading(p => ({ ...p, [post.id]: false }));
  }

  function showMsg(txt) {
    setMessage(txt);
    setTimeout(() => setMessage(''), 4000);
  }

  function boostTimeLeft(post) {
    if (!post.boostUntil) return null;
    const diff = new Date(post.boostUntil) - new Date();
    if (diff <= 0) return 'Expiré';
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    if (days > 0) return `${days}j ${hours}h restants`;
    return `${hours}h restants`;
  }

  const filteredUsers = users.filter(u =>
    u.fullName?.toLowerCase().includes(search.toLowerCase()) ||
    u.username?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredPosts = posts.filter(p =>
    p.authorName?.toLowerCase().includes(boostSearch.toLowerCase()) ||
    p.authorUsername?.toLowerCase().includes(boostSearch.toLowerCase()) ||
    p.content?.toLowerCase().includes(boostSearch.toLowerCase())
  );

  if (isAdmin === null) {
    return (
      <div style={{ minHeight: '100vh', background: '#1A0A12', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#C4829F', fontFamily: 'Poppins' }}>Vérification des droits...</p>
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div style={{ minHeight: '100vh', background: '#1A0A12', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ background: '#2D1220', borderRadius: 20, padding: 32, maxWidth: 340, textAlign: 'center', border: '1px solid #4A2535', fontFamily: 'Poppins' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔒</div>
          <h2 style={{ color: '#FFE4F3', fontWeight: 800, fontSize: 20, marginBottom: 8 }}>Accès refusé</h2>
          <p style={{ color: '#C4829F', fontSize: 14, marginBottom: 24 }}>Vous n'avez pas les droits administrateur.</p>
          <button onClick={() => navigate('/')} style={{ background: 'linear-gradient(135deg,#E91E8C,#FF6BB5)', color: 'white', border: 'none', borderRadius: 25, padding: '12px 28px', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'Poppins' }}>
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#1A0A12', padding: '20px 16px', fontFamily: 'Poppins, sans-serif', color: '#FFE4F3' }}>
      <div style={{ maxWidth: 700, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#E91E8C,#FF6BB5)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <HiShieldCheck size={24} color="white" />
          </div>
          <div>
            <h2 style={{ fontWeight: 800, fontSize: 20, color: '#FFE4F3' }}>Panel Admin</h2>
            <p style={{ fontSize: 12, color: '#C4829F' }}>Connecté : {userProfile?.fullName}</p>
          </div>
          <button onClick={() => navigate('/')} style={{ marginLeft: 'auto', background: '#4A2535', border: 'none', borderRadius: 20, padding: '6px 14px', color: '#C4829F', cursor: 'pointer', fontSize: 13 }}>
            ← Retour
          </button>
        </div>

        {/* Flash message */}
        {message && (
          <div style={{ background: message.startsWith('❌') ? '#3b0000' : '#14532d', border: `1px solid ${message.startsWith('❌') ? '#ef4444' : '#16a34a'}`, borderRadius: 12, padding: '10px 16px', marginBottom: 14, fontSize: 14, color: message.startsWith('❌') ? '#fca5a5' : '#86efac' }}>
            {message}
          </div>
        )}

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 20 }}>
          {[
            { label: 'Utilisateurs', value: users.length, color: '#3b82f6' },
            { label: 'VIP', value: users.filter(u => u.isVip).length, color: '#E91E8C' },
            { label: 'Publications', value: posts.length, color: '#f59e0b' },
            { label: 'Boostés', value: posts.filter(p => p.isBoosted).length, color: '#a855f7' },
          ].map(s => (
            <div key={s.label} style={{ background: '#2D1220', borderRadius: 14, padding: '12px 8px', textAlign: 'center', border: '1px solid #4A2535' }}>
              <p style={{ fontWeight: 800, fontSize: 20, color: s.color }}>{s.value}</p>
              <p style={{ fontSize: 10, color: '#C4829F' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {[
            { key: 'users', label: '👥 Utilisateurs' },
            { key: 'boost', label: '🚀 Boost posts' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex: 1, padding: '10px', borderRadius: 14, border: activeTab === tab.key ? 'none' : '1px solid #4A2535',
                cursor: 'pointer', fontFamily: 'Poppins', fontWeight: 600, fontSize: 13,
                background: activeTab === tab.key ? 'linear-gradient(135deg,#E91E8C,#FF6BB5)' : '#2D1220',
                color: activeTab === tab.key ? 'white' : '#C4829F',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── TAB: USERS ── */}
        {activeTab === 'users' && (
          <>
            <div style={{ position: 'relative', marginBottom: 14 }}>
              <HiSearch style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#C4829F' }} size={17} />
              <input
                placeholder="Rechercher un utilisateur..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width: '100%', background: '#2D1220', border: '1px solid #4A2535', borderRadius: 12, padding: '10px 10px 10px 36px', color: '#FFE4F3', fontFamily: 'Poppins', fontSize: 14, boxSizing: 'border-box' }}
              />
            </div>
            {loading ? (
              <p style={{ textAlign: 'center', color: '#C4829F', padding: 30 }}>Chargement...</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filteredUsers.map(user => (
                  <div key={user.id} style={{ background: '#2D1220', borderRadius: 14, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, border: user.isVip ? '1px solid #E91E8C' : '1px solid #4A2535' }}>
                    <img src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName || 'U')}&background=E91E8C&color=fff`} alt="" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                        <p style={{ fontWeight: 600, fontSize: 14, color: '#FFE4F3' }}>{user.fullName}</p>
                        {user.isVip && <span style={{ background: 'linear-gradient(135deg,#E91E8C,#FF6BB5)', color: 'white', fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 6 }}>VIP</span>}
                        {user.isAdmin && <span style={{ background: '#1d4ed8', color: 'white', fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 6 }}>ADMIN</span>}
                      </div>
                      <p style={{ fontSize: 12, color: '#C4829F' }}>@{user.username}</p>
                      <p style={{ fontSize: 11, color: '#8B5A6F' }}>{user.email}</p>
                    </div>
                    <button
                      onClick={() => toggleVip(user)}
                      style={{ background: user.isVip ? '#4A2535' : 'linear-gradient(135deg,#E91E8C,#FF6BB5)', border: user.isVip ? '1px solid #E91E8C' : 'none', borderRadius: 20, padding: '7px 12px', color: user.isVip ? '#E91E8C' : 'white', cursor: 'pointer', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, fontFamily: 'Poppins' }}
                    >
                      <HiStar size={14} />
                      {user.isVip ? 'Retirer VIP' : 'VIP'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── TAB: BOOST ── */}
        {activeTab === 'boost' && (
          <>
            {/* Info card */}
            <div style={{ background: 'linear-gradient(135deg,#7c3aed22,#E91E8C11)', border: '1px solid #7c3aed44', borderRadius: 14, padding: '14px 16px', marginBottom: 16, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <HiLightningBolt size={22} color="#a855f7" style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <p style={{ fontWeight: 700, fontSize: 14, color: '#d8b4fe', marginBottom: 4 }}>Boost de publication</p>
                <p style={{ fontSize: 12, color: '#C4829F', lineHeight: 1.7 }}>
                  Saisissez le nombre de jours (ex: <strong style={{ color: '#FFE4F3' }}>7 j</strong>). Le post s'affichera en tête du fil avec le badge <strong style={{ color: '#a855f7' }}>Sponsorisé</strong>. L'auteur sera notifié automatiquement.
                </p>
              </div>
            </div>

            {/* Search */}
            <div style={{ position: 'relative', marginBottom: 14 }}>
              <HiSearch style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#C4829F' }} size={17} />
              <input
                placeholder="Rechercher une publication..."
                value={boostSearch}
                onChange={e => setBoostSearch(e.target.value)}
                style={{ width: '100%', background: '#2D1220', border: '1px solid #4A2535', borderRadius: 12, padding: '10px 10px 10px 36px', color: '#FFE4F3', fontFamily: 'Poppins', fontSize: 14, boxSizing: 'border-box' }}
              />
            </div>

            {/* Post cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filteredPosts.map(post => {
                const timeLeft = boostTimeLeft(post);
                const isExpanded = expandedPost === post.id;
                return (
                  <div key={post.id} style={{ background: '#2D1220', borderRadius: 16, border: post.isBoosted ? '1px solid #a855f7' : '1px solid #4A2535', overflow: 'hidden' }}>
                    {/* Row */}
                    <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => setExpandedPost(isExpanded ? null : post.id)}>
                      <img src={post.authorPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.authorName || 'U')}&background=E91E8C&color=fff`} alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <p style={{ fontWeight: 600, fontSize: 13, color: '#FFE4F3' }}>{post.authorName}</p>
                          {post.isBoosted && (
                            <span style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: 'white', fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 2 }}>
                              <HiLightningBolt size={9} /> Boosté
                            </span>
                          )}
                        </div>
                        <p style={{ fontSize: 11, color: '#C4829F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                          {post.content || (post.mediaURL ? '📎 Media' : '—')}
                        </p>
                        {post.isBoosted && timeLeft && (
                          <p style={{ fontSize: 10, color: '#a855f7', display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
                            <HiClock size={10} /> {timeLeft} · {post.boostDays}j total
                          </p>
                        )}
                      </div>
                      <span style={{ color: '#8B5A6F', flexShrink: 0 }}>
                        {isExpanded ? <HiChevronUp size={18} /> : <HiChevronDown size={18} />}
                      </span>
                    </div>

                    {/* Expanded controls */}
                    {isExpanded && (
                      <div style={{ borderTop: '1px solid #4A2535', padding: '14px' }}>
                        {post.content && (
                          <p style={{ fontSize: 13, color: '#FFE4F3', marginBottom: 10, lineHeight: 1.5, background: '#1A0A12', borderRadius: 10, padding: '10px 12px' }}>
                            {post.content.slice(0, 150)}{post.content.length > 150 ? '...' : ''}
                          </p>
                        )}
                        {post.mediaURL && post.mediaType === 'image' && (
                          <img src={post.mediaURL} alt="" style={{ width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 10, marginBottom: 10 }} />
                        )}

                        {/* Active boost status */}
                        {post.isBoosted && (
                          <div style={{ background: '#2e1065', borderRadius: 12, padding: '12px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                            <div>
                              <p style={{ color: '#d8b4fe', fontWeight: 600, fontSize: 13 }}>✅ Boost actif — {post.boostDays}j</p>
                              <p style={{ color: '#a855f7', fontSize: 12 }}>{timeLeft}</p>
                            </div>
                            <button
                              onClick={() => deactivateBoost(post)}
                              disabled={boostLoading[post.id]}
                              style={{ background: '#4A2535', border: '1px solid #E91E8C', borderRadius: 20, padding: '6px 14px', color: '#E91E8C', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'Poppins', display: 'flex', alignItems: 'center', gap: 4 }}
                            >
                              <HiX size={13} /> Retirer boost
                            </button>
                          </div>
                        )}

                        {/* Input boost jours */}
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <div style={{ position: 'relative', flex: 1 }}>
                            <HiClock style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#8B5A6F' }} size={16} />
                            <input
                              type="number"
                              min="1"
                              max="365"
                              placeholder="Nb. jours (ex: 7)"
                              value={boostDays[post.id] || ''}
                              onChange={e => setBoostDays(p => ({ ...p, [post.id]: e.target.value }))}
                              style={{ width: '100%', background: '#1A0A12', border: '1px solid #4A2535', borderRadius: 12, padding: '10px 14px 10px 40px', color: '#FFE4F3', fontFamily: 'Poppins', fontSize: 14, boxSizing: 'border-box' }}
                            />
                          </div>
                          <span style={{ color: '#8B5A6F', fontSize: 13, fontWeight: 600 }}>j</span>
                          <button
                            onClick={() => activateBoost(post)}
                            disabled={boostLoading[post.id] || !boostDays[post.id]}
                            style={{
                              background: (!boostDays[post.id] || boostLoading[post.id]) ? '#4A2535' : 'linear-gradient(135deg,#7c3aed,#a855f7)',
                              border: 'none', borderRadius: 20, padding: '10px 18px',
                              color: 'white', cursor: boostDays[post.id] ? 'pointer' : 'not-allowed',
                              fontSize: 13, fontWeight: 700, fontFamily: 'Poppins',
                              display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
                              opacity: boostLoading[post.id] ? 0.6 : 1,
                            }}
                          >
                            <HiLightningBolt size={14} />
                            {boostLoading[post.id] ? '...' : post.isBoosted ? 'Prolonger' : 'Booster'}
                          </button>
                        </div>
                        <p style={{ fontSize: 11, color: '#8B5A6F', marginTop: 6 }}>
                          Ex: 7 j = 7 jours · 30 j = 1 mois · Notif envoyée à l'auteur
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

      </div>
    </div>
  );
}
