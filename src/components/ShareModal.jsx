// src/components/ShareModal.jsx — Partager (format Facebook)
// Safidy: Partager sur mon profil / Partager dans un groupe / Copier le lien.
// Ny "partage" dia mamorona publication VAOVAO misy "sharedFrom" (snapshot an'ilay
// publication tany am-boalohany) — miseho amin'ny fil d'actualités toy ny an'ny Facebook.
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, doc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { HiX, HiUser, HiUserGroup, HiLink, HiChevronRight, HiSearch } from 'react-icons/hi';

export default function ShareModal({ post, onClose, asPage = null }) {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState('choice');   // choice | profile | groups
  const [caption, setCaption] = useState('');
  const [groups, setGroups] = useState([]);
  const [posting, setPosting] = useState(false);
  const [groupQ, setGroupQ] = useState('');
  const [done, setDone] = useState(null);        // { where: 'profile' | groupName }

  useEffect(() => {
    if (step !== 'groups' || !currentUser) return;
    const q = query(collection(db, 'groups'), where('members', 'array-contains', currentUser.uid), where('type', '==', 'page'));
    const unsub = onSnapshot(q, snap => setGroups(snap.docs.map(d => ({ id: d.id, ...d.data() }))), () => {});
    return () => unsub();
  }, [step, currentUser]);

  function buildSharedSnapshot() {
    return {
      id: post.id,
      uid: post.uid,
      authorName: post.authorName,
      authorPhoto: post.authorPhoto || '',
      content: post.content || '',
      mediaURL: post.mediaURL || '',
      mediaType: post.mediaType || '',
      thumbURL: post.thumbURL || '',
      groupName: post.groupName || '',
      isMusic: post.isMusic || false,
      artistId: post.artistId || '',
      artistName: post.artistName || '',
      artistPhoto: post.artistPhoto || '',
      songTitle: post.songTitle || '',
      genre: post.genre || '',
    };
  }

  async function shareTo(group) {
    setPosting(true);
    try {
      const postRef = await addDoc(collection(db, 'posts'), {
        uid: currentUser.uid,
        authorName: asPage ? asPage.name : userProfile.fullName,
        authorUsername: asPage ? '' : userProfile.username,
        authorPhoto: asPage ? (asPage.photoURL || '') : (userProfile.photoURL || ''),
        authorIsVip: asPage ? false : (userProfile.isVip || false),
        ...(asPage ? { artistId: asPage.id, artistName: asPage.name, artistPhoto: asPage.photoURL || '', postedByArtist: true } : {}),
        content: caption.trim().slice(0, 2000),
        mediaURL: '', mediaType: '',
        isSale: false, price: '', contact: '', lieu: '',
        sharedFrom: buildSharedSnapshot(),
        ...(group ? { groupId: group.id, groupName: group.name, groupPhoto: group.photoURL || '' } : {}),
        reactions: {}, comments: [], createdAt: serverTimestamp(),
      });

      // Notifier : membres du groupe si partage de groupe, sinon amis
      const targets = group ? (group.members || []).filter(m => m !== currentUser.uid) : (userProfile.friends || []);
      if (targets.length > 0) {
        const batch = writeBatch(db);
        targets.forEach(fUid => batch.set(doc(collection(db, 'notifications')), {
          toUid: fUid, fromUid: currentUser.uid,
          fromName: userProfile.fullName, fromPhoto: userProfile.photoURL || '',
          type: 'post', postId: postRef.id,
          message: group ? `${userProfile.fullName} a partagé une publication dans ${group.name}` : `${userProfile.fullName} a partagé une publication`,
          read: false, createdAt: serverTimestamp(),
        }));
        await batch.commit();
      }
      setDone({ where: group ? group.name : 'profile' });
    } catch (err) {
      alert('Erreur lors du partage : ' + (err?.message || err));
    }
    setPosting(false);
  }

  function copyLink() {
    const url = `${window.location.origin}/post/${post.id}`;
    if (navigator.share) { navigator.share({ title: 'Trengo', text: post.content || '', url }).catch(() => {}); }
    else { navigator.clipboard?.writeText(url); alert('Lien copié !'); }
    onClose();
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 800, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '20px 20px 0 0', padding: 20, width: '100%', maxWidth: 480, maxHeight: '80vh', overflowY: 'auto' }}>

        {done ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <p style={{ fontSize: 40, marginBottom: 8 }}>✅</p>
            <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Partagé !</p>
            <p style={{ fontSize: 13, color: '#65676B', marginBottom: 18 }}>
              {done.where === 'profile' ? 'Publié sur votre profil.' : `Publié dans le groupe « ${done.where} ».`}
            </p>
            <button onClick={onClose} className="btn-blue" style={{ padding: '10px 24px', fontSize: 14, borderRadius: 20 }}>Fermer</button>
          </div>
        ) : step === 'choice' ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ fontWeight: 800, fontSize: 16 }}>Partager</h3>
              <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#65676B' }}><HiX size={20} /></button>
            </div>
            <div onClick={() => setStep('profile')} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 6px', cursor: 'pointer', borderBottom: '1px solid #F0F2F5' }}>
              <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#E7F0FE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><HiUser size={20} color="#1877F2" /></div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 700, fontSize: 14 }}>Partager sur mon profil</p>
                <p style={{ fontSize: 12, color: '#65676B' }}>Visible dans votre fil et celui de vos amis</p>
              </div>
              <HiChevronRight size={18} color="#65676B" />
            </div>
            <div onClick={() => setStep('groups')} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 6px', cursor: 'pointer', borderBottom: '1px solid #F0F2F5' }}>
              <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#FFF6DB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><HiUserGroup size={20} color="#F2B300" /></div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 700, fontSize: 14 }}>Partager dans un groupe</p>
                <p style={{ fontSize: 12, color: '#65676B' }}>Choisissez un groupe public dont vous êtes membre</p>
              </div>
              <HiChevronRight size={18} color="#65676B" />
            </div>
            <div onClick={copyLink} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 6px', cursor: 'pointer' }}>
              <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#F0F2F5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><HiLink size={20} color="#65676B" /></div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 700, fontSize: 14 }}>Copier / envoyer le lien</p>
                <p style={{ fontSize: 12, color: '#65676B' }}>Partager en dehors de Trengo</p>
              </div>
              <HiChevronRight size={18} color="#65676B" />
            </div>
          </>
        ) : step === 'profile' ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <button onClick={() => setStep('choice')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#65676B', fontSize: 18 }}>‹</button>
              <h3 style={{ fontWeight: 800, fontSize: 16, flex: 1 }}>Partager sur mon profil</h3>
              <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#65676B' }}><HiX size={20} /></button>
            </div>
            <textarea className="input" placeholder="Ajouter une légende (optionnel)..." value={caption} onChange={e => setCaption(e.target.value)}
              rows={3} maxLength={2000} style={{ resize: 'none', marginBottom: 10 }} />
            {/* Aperçu de la publication d'origine */}
            <SharedPreview post={post} />
            <button onClick={() => shareTo(null)} disabled={posting} className="btn-primary" style={{ width: '100%', marginTop: 14, padding: '12px 0', fontSize: 15 }}>
              {posting ? 'Partage...' : 'Partager maintenant'}
            </button>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <button onClick={() => setStep('choice')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#65676B', fontSize: 18 }}>‹</button>
              <h3 style={{ fontWeight: 800, fontSize: 16, flex: 1 }}>Choisir un groupe</h3>
              <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#65676B' }}><HiX size={20} /></button>
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F0F2F5', borderRadius: 20, padding: '9px 13px' }}>
                <HiSearch size={16} color="#65676B" />
                <input value={groupQ} onChange={e => setGroupQ(e.target.value)} placeholder="Rechercher un groupe…"
                  style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13.5, background: 'transparent', color: '#050505', minWidth: 0 }} />
                {groupQ && <button onClick={() => setGroupQ('')} style={{ background: '#fff', border: 'none', borderRadius: '50%', width: 21, height: 21, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#65676B', flexShrink: 0 }}><HiX size={12} /></button>}
              </div>
            </div>
            {groups.length === 0 && (
              <p style={{ fontSize: 13, color: '#65676B', textAlign: 'center', padding: '20px 0' }}>
                Vous n'êtes membre d'aucun groupe public. Rejoignez-en un depuis « Groupes ».
              </p>
            )}
            {groups.filter(g => !groupQ.trim() || (g.name || '').toLowerCase().includes(groupQ.trim().toLowerCase())).map(g => (
              <div key={g.id} onClick={() => !posting && shareTo(g)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 6px', cursor: 'pointer', borderBottom: '1px solid #F0F2F5', opacity: posting ? .6 : 1 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg,#1B84FF,#1877F2)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                  {g.photoURL ? <img src={g.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <HiUserGroup size={20} color="white" />}
                </div>
                <p style={{ flex: 1, fontWeight: 700, fontSize: 14 }}>{g.name}</p>
                <HiChevronRight size={18} color="#65676B" />
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function SharedPreview({ post }) {
  return (
    <div style={{ border: '1px solid #E4E6EB', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px' }}>
        <img src={post.authorPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.authorName || 'U')}&background=1877F2&color=fff`}
          alt="" style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover' }} />
        <p style={{ fontWeight: 700, fontSize: 13 }}>{post.groupName ? `${post.groupName} · ${post.authorName}` : post.authorName}</p>
      </div>
      {post.content && <p style={{ padding: '0 12px 8px', fontSize: 13, color: '#050505' }}>{post.content}</p>}
      {post.mediaURL && (
        post.mediaType === 'image'
          ? <img src={post.mediaURL} alt="" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', display: 'block' }} />
          : <video src={post.mediaURL} poster={post.thumbURL || undefined} muted style={{ width: '100%', maxHeight: 200, objectFit: 'cover', display: 'block', background: '#000' }} />
      )}
    </div>
  );
}
