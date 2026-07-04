// src/pages/GroupPage.jsx — Page d'un groupe public (format Facebook)
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  doc, onSnapshot, updateDoc, deleteDoc, collection, query, where,
  addDoc, serverTimestamp, arrayUnion, arrayRemove, getDoc, writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { uploadToTelegram } from '../utils/telegram';
import {
  HiUserGroup, HiCamera, HiArrowLeft, HiPlus, HiCheck, HiTrash,
  HiPhotograph, HiVideoCamera, HiChat, HiShare, HiX, HiUserAdd, HiDotsVertical
} from 'react-icons/hi';

const REACTIONS = ['❤️','😂','😮','😢','😡','👍'];

export default function GroupPage() {
  const { groupId } = useParams();
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();

  const [group,      setGroup]      = useState(null);
  const [notFound,   setNotFound]   = useState(false);
  const [members,    setMembers]    = useState([]);
  const [posts,      setPosts]      = useState([]);
  const [content,    setContent]    = useState('');
  const [mediaFile,  setMediaFile]  = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [mediaType,  setMediaType]  = useState('');
  const [posting,    setPosting]    = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showReact,  setShowReact]  = useState({});
  const [menuOpen,   setMenuOpen]   = useState(false);

  const coverRef = useRef(); const photoRef = useRef();
  const postPhotoRef = useRef(); const postVideoRef = useRef();

  const isMember = !!group?.members?.includes(currentUser?.uid);
  const isAdmin  = !!group?.admins?.includes(currentUser?.uid);

  // Groupe en temps réel
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'groups', groupId), snap => {
      if (!snap.exists()) { setNotFound(true); return; }
      setGroup({ id: snap.id, ...snap.data() });
    }, err => console.error('Lecture groupe refusée:', err?.message || err));
    return () => unsub();
  }, [groupId]);

  // Profils des premiers membres (avatars)
  useEffect(() => {
    if (!group?.members?.length) { setMembers([]); return; }
    Promise.all(group.members.slice(0, 8).map(uid =>
      getDoc(doc(db, 'users', uid)).then(s => s.exists() ? { uid, ...s.data() } : null).catch(() => null)
    )).then(list => setMembers(list.filter(Boolean)));
  }, [group?.members?.join?.(',')]);

  // Publications du groupe (tri côté client — pas d'index composite requis)
  useEffect(() => {
    const q = query(collection(db, 'posts'), where('groupId', '==', groupId));
    const unsub = onSnapshot(q, snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setPosts(list);
    }, err => console.error('Lecture posts groupe:', err?.message || err));
    return () => unsub();
  }, [groupId]);

  // Fermer le menu au clic extérieur
  useEffect(() => {
    const fn = () => setMenuOpen(false);
    document.addEventListener('click', fn);
    return () => document.removeEventListener('click', fn);
  }, []);

  async function changeImage(e, field) {
    const file = e.target.files[0]; if (!file) return;
    const setter = field === 'coverURL' ? setUploadingCover : setUploadingPhoto;
    setter(true);
    try {
      const r = await uploadToTelegram(file);
      await updateDoc(doc(db, 'groups', groupId), { [field]: r.url });
    } catch (err) { alert('Erreur : ' + (err?.message || err)); }
    setter(false);
    e.target.value = '';
  }

  async function joinGroup() {
    try { await updateDoc(doc(db, 'groups', groupId), { members: arrayUnion(currentUser.uid) }); }
    catch (err) { alert('Erreur : ' + (err?.message || err)); }
  }

  async function leaveGroup() {
    if (!window.confirm(`Quitter le groupe "${group.name}" ?`)) return;
    await updateDoc(doc(db, 'groups', groupId), {
      members: arrayRemove(currentUser.uid),
      admins: arrayRemove(currentUser.uid),
    });
  }

  async function deleteGroup() {
    if (!isAdmin) return;
    if (!window.confirm(`Supprimer définitivement "${group.name}" ?`)) return;
    await deleteDoc(doc(db, 'groups', groupId));
    navigate('/groups');
  }

  function inviteToGroup() {
    const url = `${window.location.origin}/groups/${groupId}`;
    if (navigator.share) { navigator.share({ title: group.name, text: `Rejoignez le groupe ${group.name} sur Traingo !`, url }).catch(() => {}); }
    else { navigator.clipboard?.writeText(url); alert('Lien du groupe copié !'); }
  }

  function handleMedia(e, type) {
    const file = e.target.files[0]; if (!file) return;
    setMediaFile(file); setMediaType(type); setMediaPreview(URL.createObjectURL(file));
  }

  async function publishInGroup() {
    if (!content.trim() && !mediaFile) return;
    setPosting(true);
    try {
      let mediaURL = '', finalMT = mediaType;
      if (mediaFile) {
        const r = await uploadToTelegram(mediaFile);
        mediaURL = r.url; finalMT = r.type === 'video' ? 'video' : 'image';
      }
      const postRef = await addDoc(collection(db, 'posts'), {
        uid: currentUser.uid, authorName: userProfile.fullName,
        authorUsername: userProfile.username, authorPhoto: userProfile.photoURL || '',
        authorIsVip: userProfile.isVip || false,
        content: content.trim().slice(0, 2000), mediaURL, mediaType: finalMT,
        isSale: false, price: '', contact: '', lieu: '',
        groupId: group.id, groupName: group.name, groupPhoto: group.photoURL || '',
        reactions: {}, comments: [], createdAt: serverTimestamp(),
      });
      const targets = (group.members || []).filter(m => m !== currentUser.uid);
      if (targets.length > 0) {
        const batch = writeBatch(db);
        targets.forEach(fUid => batch.set(doc(collection(db, 'notifications')), {
          toUid: fUid, fromUid: currentUser.uid,
          fromName: userProfile.fullName, fromPhoto: userProfile.photoURL || '',
          type: 'post', postId: postRef.id,
          message: `${userProfile.fullName} a publié dans le groupe ${group.name}`,
          read: false, createdAt: serverTimestamp(),
        }));
        await batch.commit();
      }
      setContent(''); setMediaFile(null); setMediaPreview(null); setMediaType('');
    } catch (err) { alert('Erreur lors de la publication : ' + (err?.message || err)); }
    setPosting(false);
  }

  async function reactToPost(postId, emoji) {
    if (!REACTIONS.includes(emoji)) return;
    const post = posts.find(p => p.id === postId); if (!post) return;
    const reactions = post.reactions || {};
    const my = reactions[currentUser.uid];
    if (my === emoji) {
      const u = { ...reactions }; delete u[currentUser.uid];
      await updateDoc(doc(db, 'posts', postId), { reactions: u });
    } else {
      await updateDoc(doc(db, 'posts', postId), { [`reactions.${currentUser.uid}`]: emoji });
    }
    setShowReact(p => ({ ...p, [postId]: false }));
  }

  function sharePost(post) {
    const url = `${window.location.origin}/post/${post.id}`;
    if (navigator.share) { navigator.share({ title: group?.name || 'Traingo', text: post.content, url }).catch(() => {}); }
    else { navigator.clipboard?.writeText(url); alert('Lien copié !'); }
  }

  if (notFound) return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <p style={{ fontWeight: 700, marginBottom: 10 }}>Ce groupe n'existe plus.</p>
      <button className="btn-blue" onClick={() => navigate('/groups')} style={{ padding: '10px 20px', borderRadius: 20 }}>Voir les groupes</button>
    </div>
  );
  if (!group) return <div style={{ padding: 40, textAlign: 'center', color: '#65676B' }}>Chargement...</div>;

  const av = u => u.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.fullName || 'U')}&background=1877F2&color=fff`;

  return (
    <div style={{ paddingBottom: 20 }}>

      {/* ── Photo de couverture ─────────────────────────────── */}
      <div style={{ position: 'relative', height: 180, background: group.coverURL ? '#000' : 'linear-gradient(135deg,#1877F2,#FF2D8D,#F2B300)' }}>
        {group.coverURL && <img src={group.coverURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
        <button onClick={() => navigate('/groups')}
          style={{ position: 'absolute', top: 10, left: 10, width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,0,0,.45)', border: 'none', cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <HiArrowLeft size={20} />
        </button>
        {isAdmin && (
          <>
            <input ref={coverRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => changeImage(e, 'coverURL')} />
            <button onClick={() => coverRef.current?.click()} disabled={uploadingCover}
              style={{ position: 'absolute', bottom: 10, right: 10, background: 'rgba(255,255,255,.92)', border: 'none', borderRadius: 18, padding: '7px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#050505', display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'Poppins' }}>
              <HiCamera size={15} /> {uploadingCover ? 'Envoi...' : 'Couverture'}
            </button>
          </>
        )}
        {/* Photo du groupe */}
        <div style={{ position: 'absolute', bottom: -34, left: 16 }}>
          <div style={{ position: 'relative' }}>
            <div style={{ width: 78, height: 78, borderRadius: 18, background: 'linear-gradient(135deg,#1B84FF,#1877F2)', border: '4px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(0,0,0,.2)', overflow: 'hidden' }}>
              {group.photoURL
                ? <img src={group.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <HiUserGroup size={34} color="white" />}
            </div>
            {isAdmin && (
              <>
                <input ref={photoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => changeImage(e, 'photoURL')} />
                <button onClick={() => photoRef.current?.click()} disabled={uploadingPhoto}
                  style={{ position: 'absolute', bottom: -4, right: -4, width: 28, height: 28, borderRadius: '50%', background: '#1877F2', border: '2.5px solid white', cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <HiCamera size={13} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Infos du groupe ─────────────────────────────────── */}
      <div style={{ padding: '42px 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ fontWeight: 800, fontSize: 20 }}>
              {group.name}
              {isAdmin && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: '#F2B300', background: '#FFF6DB', borderRadius: 8, padding: '2px 7px', verticalAlign: 'middle' }}>ADMIN</span>}
            </h2>
            <p style={{ fontSize: 13, color: '#65676B', marginTop: 2 }}>
              🌍 Groupe public · {group.members?.length || 0} membre{(group.members?.length || 0) > 1 ? 's' : ''}
            </p>
          </div>
          <div style={{ position: 'relative', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setMenuOpen(p => !p)} style={{ background: '#F0F2F5', border: 'none', borderRadius: '50%', width: 34, height: 34, cursor: 'pointer', color: '#050505', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <HiDotsVertical size={17} />
            </button>
            {menuOpen && (
              <div style={{ position: 'absolute', top: '100%', right: 0, background: 'white', border: '1px solid #E4E6EB', borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,.14)', minWidth: 190, zIndex: 50, overflow: 'hidden' }}>
                {isMember && <button onClick={() => { setMenuOpen(false); leaveGroup(); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Poppins', fontSize: 14, color: '#F2B300', borderBottom: '1px solid #F0F2F5' }}><HiArrowLeft size={16} /> Quitter le groupe</button>}
                {isAdmin && <button onClick={() => { setMenuOpen(false); deleteGroup(); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Poppins', fontSize: 14, color: '#FF2D8D' }}><HiTrash size={16} /> Supprimer le groupe</button>}
              </div>
            )}
          </div>
        </div>

        {group.description && <p style={{ fontSize: 14, marginTop: 8, color: '#050505' }}>{group.description}</p>}

        {/* Avatars membres + Inviter / Rejoindre */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
          <div style={{ display: 'flex' }}>
            {members.map((m, i) => (
              <img key={m.uid} src={av(m)} alt="" onClick={() => navigate(`/profile/${m.uid}`)}
                style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', border: '2.5px solid white', marginLeft: i ? -10 : 0, cursor: 'pointer' }} />
            ))}
          </div>
          {isMember
            ? <button onClick={inviteToGroup} className="btn-blue" style={{ flex: 1, padding: '10px 0', fontSize: 14, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <HiUserAdd size={16} /> Inviter
              </button>
            : <button onClick={joinGroup} className="btn-blue" style={{ flex: 1, padding: '10px 0', fontSize: 14, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <HiPlus size={16} /> Rejoindre le groupe
              </button>}
        </div>
      </div>

      {/* ── Composer (comme l'accueil) ──────────────────────── */}
      {isMember && (
        <div className="card post-card" style={{ padding: 14, marginTop: 14, marginBottom: 8 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <img src={userProfile?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile?.fullName || 'U')}&background=1877F2&color=fff`}
              alt="" className="avatar" style={{ width: 40, height: 40, flexShrink: 0 }} />
            <textarea className="input" placeholder="Exprimez-vous..." value={content} onChange={e => setContent(e.target.value)} rows={1}
              style={{ resize: 'none', borderRadius: 20 }} maxLength={2000} />
          </div>
          {mediaPreview && (
            <div style={{ position: 'relative', marginTop: 10 }}>
              {mediaType === 'image'
                ? <img src={mediaPreview} alt="" style={{ width: '100%', borderRadius: 10, maxHeight: 240, objectFit: 'cover' }} />
                : <video src={mediaPreview} controls style={{ width: '100%', borderRadius: 10, maxHeight: 240 }} />}
              <button onClick={() => { setMediaFile(null); setMediaPreview(null); setMediaType(''); }}
                style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,.55)', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><HiX size={15} /></button>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
            <input ref={postPhotoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleMedia(e, 'image')} />
            <input ref={postVideoRef} type="file" accept="video/mp4,video/webm,video/quicktime" style={{ display: 'none' }} onChange={e => handleMedia(e, 'video')} />
            <button onClick={() => postPhotoRef.current?.click()} className="btn-blue" style={{ display: 'flex', alignItems: 'center', gap: 5, borderRadius: 20, padding: '6px 12px', fontSize: 12 }}><HiPhotograph size={15} /> Photo</button>
            <button onClick={() => postVideoRef.current?.click()} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 5, borderRadius: 20, padding: '6px 12px', fontSize: 12 }}><HiVideoCamera size={15} /> Vidéo</button>
            <button onClick={publishInGroup} disabled={posting || (!content.trim() && !mediaFile)} className="btn-gold" style={{ marginLeft: 'auto', padding: '7px 18px', fontSize: 13 }}>
              {posting ? '...' : 'Publier'}
            </button>
          </div>
        </div>
      )}

      {/* ── Fil du groupe ───────────────────────────────────── */}
      {posts.length === 0 && (
        <div style={{ padding: 30, textAlign: 'center', color: '#65676B', fontSize: 14 }}>
          Aucune publication dans ce groupe pour le moment.
        </div>
      )}
      {posts.map(post => {
        const rc = {}; Object.values(post.reactions || {}).forEach(e => { rc[e] = (rc[e] || 0) + 1; });
        const total = Object.keys(post.reactions || {}).length;
        const myR = post.reactions?.[currentUser.uid];
        return (
          <div key={post.id} className="card post-card animate-fade" style={{ marginBottom: 8 }}>
            <div style={{ padding: '12px 16px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
              <img src={post.authorPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.authorName || 'U')}&background=1877F2&color=fff`}
                alt="" className="avatar" style={{ width: 40, height: 40, cursor: 'pointer' }} onClick={() => navigate(`/profile/${post.uid}`)} />
              <div>
                <p style={{ fontWeight: 700, fontSize: 14 }}>{post.authorName}</p>
                <p style={{ fontSize: 12, color: '#65676B' }}>{post.createdAt?.toDate ? new Date(post.createdAt.toDate()).toLocaleDateString('fr-FR') : 'Maintenant'}</p>
              </div>
            </div>
            <div style={{ padding: '8px 16px', cursor: 'pointer' }} onClick={() => navigate(`/post/${post.id}`)}>
              {post.content && <p style={{ fontSize: 15, lineHeight: 1.6, wordBreak: 'break-word' }}>{post.content}</p>}
              {post.mediaURL && (
                <div style={{ marginTop: 8, marginLeft: -16, marginRight: -16 }}>
                  {post.mediaType === 'image'
                    ? <img src={post.mediaURL} alt="" style={{ width: '100%', maxHeight: 520, objectFit: 'cover', display: 'block' }} />
                    : <video src={post.mediaURL} controls playsInline style={{ width: '100%', maxHeight: 520, display: 'block', background: '#000' }} />}
                </div>
              )}
            </div>
            {total > 0 && (
              <div style={{ padding: '4px 16px 6px', display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ display: 'flex' }}>{Object.keys(rc).slice(0, 3).map((e, i) => <span key={e} style={{ fontSize: 15, marginLeft: i ? -3 : 0 }}>{e}</span>)}</div>
                <span style={{ fontSize: 13, color: '#65676B' }}>{total}</span>
              </div>
            )}
            <div className='post-actions-row'>
              <div style={{ position: 'relative', flex: 1, display: 'flex' }}>
                <button onClick={() => reactToPost(post.id, myR || '👍')}
                  onContextMenu={e => { e.preventDefault(); setShowReact(p => ({ ...p, [post.id]: !p[post.id] })); }}
                  className={'post-action-btn' + (myR ? ' active' : '')}
                  style={myR ? { color: myR === '👍' ? '#1877F2' : '#FF2D8D', fontWeight: 700 } : {}}>
                  <span style={{ fontSize: 17 }}>{myR || '👍'}</span> J'aime
                </button>
                {showReact[post.id] && (
                  <div style={{ position: 'absolute', bottom: '110%', left: 8, background: 'white', borderRadius: 30, padding: '8px 12px', display: 'flex', gap: 6, boxShadow: '0 4px 20px rgba(0,0,0,.2)', zIndex: 10, border: '1px solid #E4E6EB' }}>
                    {REACTIONS.map(e => <button key={e} onClick={() => reactToPost(post.id, e)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 24 }}>{e}</button>)}
                  </div>
                )}
              </div>
              <button onClick={() => navigate(`/post/${post.id}`)} className='post-action-btn'>
                <HiChat size={18} /> Commenter{post.comments?.length > 0 ? ` (${post.comments.length})` : ''}
              </button>
              <button onClick={() => sharePost(post)} className='post-action-btn'>
                <HiShare size={18} /> Partager
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
