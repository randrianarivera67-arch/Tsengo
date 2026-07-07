// src/pages/GroupPage.jsx — Page d'un groupe public (format Facebook)
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  doc, onSnapshot, updateDoc, deleteDoc, collection, query, where,
  addDoc, serverTimestamp, arrayUnion, arrayRemove, getDoc, writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { timeAgo } from '../utils/timeAgo';
import { uploadToTelegram } from '../utils/telegram';
import { captureVideoThumb } from '../utils/videoThumb';
import { startBackgroundUpload } from '../utils/uploadManager';
import { isDataSaverOn, subscribeDataSaver } from '../utils/dataSaver';
import { downloadMedia } from '../utils/download';
import ShareModal from '../components/ShareModal';
import {
  HiUserGroup, HiCamera, HiArrowLeft, HiPlus, HiCheck, HiTrash,
  HiPhotograph, HiVideoCamera, HiChat, HiShare, HiX, HiUserAdd, HiDotsVertical,
  HiDownload, HiSearch
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
  const [gpLocation, setGpLocation] = useState('');
  const [gpMood,     setGpMood]     = useState('');
  const [gpAllowMessages, setGpAllowMessages] = useState(true);
  const [gpMoreOpen, setGpMoreOpen] = useState(false);
  const [gpLocationOpen, setGpLocationOpen] = useState(false);
  const [gpMoodOpen, setGpMoodOpen] = useState(false);
  const [gpTagOpen,  setGpTagOpen]  = useState(false);
  const [gpTagSel,   setGpTagSel]   = useState({});
  const [gpTagList,  setGpTagList]  = useState([]);
  const MOODS = ['😊 se sent heureux(se)', '😢 se sent triste', '🥳 fait la fête', '😴 fatigué(e)', '🙏 reconnaissant(e)', '💪 motivé(e)', '😍 amoureux(se)', '🤒 malade'];
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showReact,  setShowReact]  = useState({});
  const [postMenu,   setPostMenu]   = useState(null);
  const [dataSaver,  setDataSaverState] = useState(isDataSaverOn());
  useEffect(() => subscribeDataSaver(setDataSaverState), []);
  const [shareModalPost, setShareModalPost] = useState(null);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [friendsList, setFriendsList] = useState([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [menuOpen,   setMenuOpen]   = useState(false);

  // Modifier le groupe (admin uniquement)
  const [editOpen,   setEditOpen]   = useState(false);
  const [editName,   setEditName]   = useState('');
  const [editDesc,   setEditDesc]   = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [allMembers, setAllMembers] = useState([]);

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
    const fn = () => { setMenuOpen(false); setPostMenu(null); };
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

  async function openEdit() {
    setEditName(group.name || '');
    setEditDesc(group.description || '');
    setEditOpen(true);
    const list = await Promise.all((group.members || []).slice(0, 60).map(uid =>
      getDoc(doc(db, 'users', uid)).then(sn => sn.exists() ? { uid, ...sn.data() } : null).catch(() => null)
    ));
    setAllMembers(list.filter(Boolean));
  }

  async function saveEdit() {
    const n = editName.trim();
    if (!n) { alert('Le nom ne peut pas être vide'); return; }
    setSavingEdit(true);
    try {
      await updateDoc(doc(db, 'groups', groupId), { name: n, description: editDesc.trim().slice(0, 300) });
      setEditOpen(false);
    } catch (err) { alert('Erreur : ' + (err?.message || err)); }
    setSavingEdit(false);
  }

  async function toggleAdmin(uid) {
    const isA = group.admins?.includes(uid);
    if (isA && group.admins.length === 1) { alert('Le groupe doit garder au moins un admin.'); return; }
    try {
      await updateDoc(doc(db, 'groups', groupId), { admins: isA ? arrayRemove(uid) : arrayUnion(uid) });
    } catch (err) { alert('Erreur : ' + (err?.message || err)); }
  }

  function copyInviteLink() {
    const url = `${window.location.origin}/groups/${groupId}`;
    if (navigator.share) { navigator.share({ title: group.name, text: `Rejoignez le groupe ${group.name} sur Traingo !`, url }).catch(() => {}); }
    else { navigator.clipboard?.writeText(url); alert('Lien du groupe copié !'); }
  }

  const [selectedFriends, setSelectedFriends] = useState({});
  const [addingMembers, setAddingMembers] = useState(false);

  async function openAddMember() {
    setAddMemberOpen(true); setMemberSearch(''); setSelectedFriends({});
    const myFriends = userProfile?.friends || [];
    const notIn = myFriends.filter(uid => !group.members?.includes(uid));
    const list = await Promise.all(notIn.map(uid =>
      getDoc(doc(db, 'users', uid)).then(sn => sn.exists() ? { uid, ...sn.data() } : null).catch(() => null)
    ));
    setFriendsList(list.filter(Boolean));
  }

  async function addSelectedMembers() {
    const uids = Object.keys(selectedFriends).filter(k => selectedFriends[k]);
    if (uids.length === 0) return;
    setAddingMembers(true);
    try {
      await updateDoc(doc(db, 'groups', groupId), { members: arrayUnion(...uids) });
      const batch = writeBatch(db);
      uids.forEach(uid => batch.set(doc(collection(db, 'notifications')), {
        toUid: uid, fromUid: currentUser.uid,
        fromName: userProfile.fullName, fromPhoto: userProfile.photoURL || '',
        type: 'general', message: `${userProfile.fullName} vous a ajouté(e) au groupe ${group.name}`,
        read: false, createdAt: serverTimestamp(),
      }));
      await batch.commit();
      setAddMemberOpen(false);
    } catch (err) { alert('Erreur : ' + (err?.message || err)); }
    setAddingMembers(false);
  }

  function handleMedia(e, type) {
    const file = e.target.files[0]; if (!file) return;
    setMediaFile(file); setMediaType(type); setMediaPreview(URL.createObjectURL(file));
  }

  // Publie dans le groupe (caption capturée en paramètre — utilisable aussi
  // depuis le callback d'upload en arrière-plan)
  async function finalizePublish(caption, mediaURL, finalMT, thumbURL) {
    const postRef = await addDoc(collection(db, 'posts'), {
      uid: currentUser.uid, authorName: userProfile.fullName,
      authorUsername: userProfile.username, authorPhoto: userProfile.photoURL || '',
      authorIsVip: userProfile.isVip || false,
      content: (caption || '').trim().slice(0, 2000), mediaURL, mediaType: finalMT, thumbURL: thumbURL || '',
      isSale: false, price: '', contact: '', lieu: '',
      location: gpLocation.trim(), mood: gpMood, allowMessages: gpAllowMessages,
      taggedUids: Object.keys(gpTagSel).filter(k => gpTagSel[k]),
      taggedNames: gpTagList.filter(f => gpTagSel[f.uid]).map(f => f.fullName),
      groupId: group.id, groupName: group.name, groupPhoto: group.photoURL || '',
      reactions: {}, comments: [], createdAt: serverTimestamp(),
    });
    try {
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
    } catch (notifErr) { console.warn('Notification échouée (publication déjà faite) :', notifErr?.message || notifErr); }
    setGpLocation(''); setGpMood(''); setGpAllowMessages(true); setGpTagSel({});
  }

  async function openGpTagModal() {
    setGpTagOpen(true);
    const myFriends = userProfile?.friends || [];
    const list = await Promise.all(myFriends.map(uid =>
      getDoc(doc(db, 'users', uid)).then(sn => sn.exists() ? { uid, ...sn.data() } : null).catch(() => null)
    ));
    setGpTagList(list.filter(Boolean));
  }

  async function publishInGroup() {
    if (!content.trim() && !mediaFile) return;

    // Miniature (poster) — alaina alohan'ny upload
    let thumbFile = null;
    if (mediaFile && mediaFile.type.startsWith('video/')) {
      try { thumbFile = await captureVideoThumb(mediaFile); } catch {}
    }

    // Vidéo > 12 Mo : upload ARRIÈRE-PLAN (afaka mifindra page)
    if (mediaFile && mediaFile.type.startsWith('video/') && mediaFile.size > 12 * 1024 * 1024) {
      const cText = content;
      const started = startBackgroundUpload(mediaFile, 'Vidéo', async r => {
        let thumbURL = '';
        if (thumbFile) { try { const tr = await uploadToTelegram(thumbFile); thumbURL = tr.url || ''; } catch {} }
        await finalizePublish(cText, r.url, 'video', thumbURL);
      });
      if (started) { setContent(''); setMediaFile(null); setMediaPreview(null); setMediaType(''); }
      return;
    }

    setPosting(true);
    try {
      let mediaURL = '', finalMT = mediaType, thumbURL = '';
      if (mediaFile) {
        const r = await uploadToTelegram(mediaFile);
        mediaURL = r.url; finalMT = r.type === 'video' ? 'video' : 'image';
        if (thumbFile) { try { const tr = await uploadToTelegram(thumbFile); thumbURL = tr.url || ''; } catch {} }
      }
      await finalizePublish(content, mediaURL, finalMT, thumbURL);
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
    setShareModalPost(post);
  }

  async function deletePostInGroup(post) {
    if (!window.confirm('Supprimer cette publication ?')) return;
    try { await deleteDoc(doc(db, 'posts', post.id)); }
    catch (err) { alert('Erreur : ' + (err?.message || err)); }
    setPostMenu(null);
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
                {isAdmin && <button onClick={() => { setMenuOpen(false); openEdit(); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Poppins', fontSize: 14, color: '#1877F2', borderBottom: '1px solid #F0F2F5' }}><HiCamera size={16} /> Modifier le groupe</button>}
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
            ? <button onClick={openAddMember} className="btn-blue" style={{ flex: 1, padding: '10px 0', fontSize: 14, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <HiUserAdd size={16} /> Ajouter un membre
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
          {(gpLocation || gpMood || Object.values(gpTagSel).some(Boolean)) && (
            <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:8 }}>
              {gpLocation && <span style={{ display:'flex', alignItems:'center', gap:5, background:'#FFE9F2', color:'#FF2D8D', borderRadius:16, padding:'4px 10px', fontSize:12, fontWeight:700 }}>📍 {gpLocation} <span onClick={() => setGpLocation('')} style={{ cursor:'pointer' }}>✕</span></span>}
              {gpMood && <span style={{ display:'flex', alignItems:'center', gap:5, background:'#FFF6DB', color:'#B8860B', borderRadius:16, padding:'4px 10px', fontSize:12, fontWeight:700 }}>{gpMood} <span onClick={() => setGpMood('')} style={{ cursor:'pointer' }}>✕</span></span>}
              {Object.values(gpTagSel).some(Boolean) && <span style={{ display:'flex', alignItems:'center', gap:5, background:'#E7F0FE', color:'#1877F2', borderRadius:16, padding:'4px 10px', fontSize:12, fontWeight:700 }}>🏷️ avec {gpTagList.filter(f => gpTagSel[f.uid]).map(f => f.fullName).join(', ')} <span onClick={() => setGpTagSel({})} style={{ cursor:'pointer' }}>✕</span></span>}
            </div>
          )}
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
            <button onClick={() => setGpMoreOpen(true)} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 5, borderRadius: 20, padding: '6px 12px', fontSize: 12 }}>⋯ Plus</button>
            <button onClick={publishInGroup} disabled={posting || (!content.trim() && !mediaFile)} className="btn-gold" style={{ marginLeft: 'auto', padding: '7px 18px', fontSize: 13 }}>
              {posting ? '...' : 'Publier'}
            </button>
          </div>
        </div>
      )}

      {/* ── Modal : Ajouter un membre ────────────────────────── */}
      {addMemberOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 400, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setAddMemberOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '20px 20px 0 0', padding: 20, width: '100%', maxWidth: 480, maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ fontWeight: 800, color: '#1877F2', fontSize: 16 }}>Ajouter un membre</h3>
              <button onClick={() => setAddMemberOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#65676B' }}><HiX size={20} /></button>
            </div>

            <button onClick={copyInviteLink} className="btn-secondary" style={{ width: '100%', padding: '10px 0', fontSize: 13, borderRadius: 10, marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              🔗 Copier / envoyer le lien d'invitation
            </button>

            <div style={{ position: 'relative', marginBottom: 10 }}>
              <HiSearch style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#65676B' }} />
              <input className="input" placeholder="Rechercher un ami..." value={memberSearch} onChange={e => setMemberSearch(e.target.value)} style={{ paddingLeft: 34 }} />
            </div>

            {friendsList.length === 0 && (
              <p style={{ fontSize: 13, color: '#65676B', textAlign: 'center', padding: '16px 0' }}>
                Tous vos amis sont déjà membres, ou vous n'avez pas encore d'amis à inviter directement.
              </p>
            )}
            {friendsList
              .filter(f => !memberSearch.trim() || f.fullName?.toLowerCase().includes(memberSearch.trim().toLowerCase()))
              .map(f => (
                <label key={f.uid} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 4px', cursor: 'pointer', borderBottom: '1px solid #F0F2F5' }}>
                  <input type="checkbox" checked={!!selectedFriends[f.uid]} onChange={e => setSelectedFriends(p => ({ ...p, [f.uid]: e.target.checked }))}
                    style={{ width: 18, height: 18, accentColor: '#1877F2' }} />
                  <img src={f.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(f.fullName || 'U')}&background=1877F2&color=fff`} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 14 }}>{f.fullName}</p>
                    <p style={{ fontSize: 12, color: '#65676B' }}>@{f.username}</p>
                  </div>
                </label>
              ))}

            {friendsList.length > 0 && (
              <button onClick={addSelectedMembers} disabled={addingMembers || Object.values(selectedFriends).every(v => !v)} className="btn-primary"
                style={{ width: '100%', marginTop: 14, padding: '12px 0', fontSize: 15 }}>
                {addingMembers ? 'Ajout...' : 'Ajouter au groupe'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Modal : Modifier le groupe (admin) ─────────────── */}
      {editOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 400, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setEditOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '20px 20px 0 0', padding: 20, width: '100%', maxWidth: 480, maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ fontWeight: 800, color: '#1877F2' }}>Modifier le groupe</h3>
              <button onClick={() => setEditOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#65676B' }}><HiX size={20} /></button>
            </div>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#65676B', marginBottom: 6 }}>NOM DU GROUPE</p>
            <input className="input" value={editName} onChange={e => setEditName(e.target.value)} maxLength={60} style={{ marginBottom: 10 }} />
            <p style={{ fontSize: 12, fontWeight: 700, color: '#65676B', marginBottom: 6 }}>DESCRIPTION</p>
            <textarea className="input" value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={3} maxLength={300} style={{ resize: 'none', borderRadius: 14 }} />
            <button onClick={saveEdit} disabled={savingEdit} className="btn-blue" style={{ width: '100%', marginTop: 12, padding: '11px 0', fontSize: 14, borderRadius: 10 }}>
              {savingEdit ? 'Enregistrement...' : 'Enregistrer'}
            </button>
            <p style={{ fontSize: 11, color: '#65676B', marginTop: 6, textAlign: 'center' }}>La photo et la couverture se changent avec les boutons 📷 sur la page.</p>

            <p style={{ fontSize: 12, fontWeight: 700, color: '#65676B', margin: '16px 0 6px' }}>MEMBRES & ADMINS</p>
            {allMembers.length === 0 && <p style={{ fontSize: 13, color: '#65676B' }}>Chargement des membres...</p>}
            {allMembers.map(m => {
              const mAdmin = group.admins?.includes(m.uid);
              return (
                <div key={m.uid} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #F0F2F5' }}>
                  <img src={m.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.fullName || 'U')}&background=1877F2&color=fff`} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.fullName}{m.uid === currentUser.uid ? ' (vous)' : ''}
                    </p>
                    {mAdmin && <span style={{ fontSize: 10, fontWeight: 700, color: '#F2B300' }}>ADMIN</span>}
                  </div>
                  <button onClick={() => toggleAdmin(m.uid)}
                    className={mAdmin ? 'btn-secondary' : 'btn-gold'}
                    style={{ padding: '6px 12px', fontSize: 11, borderRadius: 10, flexShrink: 0 }}>
                    {mAdmin ? 'Retirer admin' : 'Nommer admin'}
                  </button>
                </div>
              );
            })}
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
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 700, fontSize: 14 }}>{post.authorName}</p>
                <p style={{ fontSize: 12, color: '#65676B' }}>{post.createdAt ? timeAgo(post.createdAt) : "À l'instant"}</p>
                {post.taggedNames?.length > 0 && <p style={{ fontSize:12, color:'#65676B' }}>avec {post.taggedNames.join(', ')}</p>}
                {(post.mood || post.location) && (
                  <p style={{ fontSize:12, color:'#65676B' }}>
                    {post.mood && <>{post.mood}</>}{post.mood && post.location ? ' à ' : ''}{post.location && <>📍 {post.location}</>}
                  </p>
                )}
              </div>
              {(post.uid === currentUser.uid || post.mediaURL) && (
                <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
                  <button onClick={() => setPostMenu(p => p === post.id ? null : post.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#65676B', padding: 4 }}>
                    <HiDotsVertical size={18} />
                  </button>
                  {postMenu === post.id && (
                    <div style={{ position: 'absolute', top: '100%', right: 0, background: 'white', border: '1px solid #E4E6EB', borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,.14)', minWidth: 170, zIndex: 20, overflow: 'hidden' }}>
                      {post.mediaURL && (
                        <button onClick={() => { downloadMedia(post.mediaURL, post.mediaType); setPostMenu(null); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', background: 'none', border: 'none', cursor: 'pointer', color: '#050505', fontSize: 14, fontFamily: 'Poppins', borderBottom: (post.uid === currentUser.uid || isAdmin) ? '1px solid #F0F2F5' : 'none' }}>
                          <HiDownload size={15} color="#1877F2" /> Télécharger
                        </button>
                      )}
                      {(post.uid === currentUser.uid || isAdmin) && (
                        <button onClick={() => deletePostInGroup(post)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', background: 'none', border: 'none', cursor: 'pointer', color: '#FF2D8D', fontSize: 14, fontFamily: 'Poppins' }}>
                          <HiTrash size={15} /> Supprimer
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div style={{ padding: '8px 16px', cursor: 'pointer' }} onClick={() => navigate(`/post/${post.id}`)}>
              {post.content && <p style={{ fontSize: 15, lineHeight: 1.6, wordBreak: 'break-word' }}>{post.content}</p>}
              {post.sharedFrom && (
                <div onClick={e => { e.stopPropagation(); navigate(`/post/${post.sharedFrom.id}`); }}
                  style={{ marginTop: 8, border: '1px solid #E4E6EB', borderRadius: 12, overflow: 'hidden', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px' }}>
                    <img src={post.sharedFrom.authorPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.sharedFrom.authorName || 'U')}&background=1877F2&color=fff`}
                      alt="" style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover' }} />
                    <p style={{ fontWeight: 700, fontSize: 13 }}>{post.sharedFrom.groupName ? `${post.sharedFrom.groupName} · ${post.sharedFrom.authorName}` : post.sharedFrom.authorName}</p>
                  </div>
                  {post.sharedFrom.content && <p style={{ padding: '0 12px 8px', fontSize: 13, color: '#050505' }}>{post.sharedFrom.content}</p>}
                  {post.sharedFrom.mediaURL && (
                    post.sharedFrom.mediaType === 'image'
                      ? <img src={post.sharedFrom.mediaURL} alt="" style={{ width: '100%', maxHeight: 320, objectFit: 'cover', display: 'block' }} />
                      : <video src={post.sharedFrom.mediaURL} muted playsInline style={{ width: '100%', maxHeight: 320, objectFit: 'cover', display: 'block', background: '#000' }} />
                  )}
                </div>
              )}
              {post.mediaURL && (
                <div style={{ marginTop: 8, marginLeft: -16, marginRight: -16 }}>
                  {post.mediaType === 'image'
                    ? <img src={post.mediaURL} alt="" style={{ width: '100%', maxHeight: 520, objectFit: 'cover', display: 'block' }} />
                    : <video src={post.mediaURL} controls playsInline poster={post.thumbURL || undefined} preload={dataSaver ? 'none' : 'metadata'} style={{ width: '100%', maxHeight: 520, display: 'block', background: '#000' }} />}
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

      {shareModalPost && <ShareModal post={shareModalPost} onClose={() => setShareModalPost(null)} />}

      {/* ── Bottom sheet : Plus d'options (groupe) ─────────────── */}
      {gpMoreOpen && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:420, display:'flex', alignItems:'flex-end', justifyContent:'center' }} onClick={() => setGpMoreOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background:'white', borderRadius:'20px 20px 0 0', padding:'8px 0 20px', width:'100%', maxWidth:480 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 20px 14px' }}>
              <h3 style={{ fontWeight:800, fontSize:16 }}>Plus d'options</h3>
              <button onClick={() => setGpMoreOpen(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'#65676B' }}><HiX size={20}/></button>
            </div>
            {[
              { icon:<HiUserAdd size={20} color="#1877F2"/>, label:'Identifier des personnes', action:() => { setGpMoreOpen(false); openGpTagModal(); } },
              { icon:<span style={{ fontSize:20 }}>📍</span>, label: gpLocation ? `Lieu : ${gpLocation}` : 'Ajouter un lieu', action:() => { setGpMoreOpen(false); setGpLocationOpen(true); } },
              { icon:<span style={{ fontSize:20 }}>😊</span>, label: gpMood || 'Humeur / Activité', action:() => { setGpMoreOpen(false); setGpMoodOpen(true); } },
              { icon:<HiChat size={20} color="#1877F2"/>, label: gpAllowMessages ? 'Recevoir des messages : Activé' : 'Recevoir des messages : Désactivé', action:() => setGpAllowMessages(p => !p) },
            ].map((item, i) => (
              <button key={i} onClick={item.action} style={{ width:'100%', display:'flex', alignItems:'center', gap:14, padding:'13px 20px', background:'none', border:'none', cursor:'pointer', fontFamily:'Poppins', fontSize:15, fontWeight:600, color:'#050505', textAlign:'left' }}>
                {item.icon} {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {gpLocationOpen && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:430, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={() => setGpLocationOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background:'white', borderRadius:18, padding:20, width:'100%', maxWidth:360 }}>
            <h3 style={{ fontWeight:800, fontSize:15, marginBottom:12 }}>📍 Ajouter un lieu</h3>
            <input className="input" autoFocus placeholder="Où êtes-vous ?" value={gpLocation} onChange={e => setGpLocation(e.target.value)} maxLength={100} style={{ marginBottom:14 }}/>
            <button onClick={() => setGpLocationOpen(false)} className="btn-primary" style={{ width:'100%', padding:'10px 0', fontSize:14 }}>OK</button>
          </div>
        </div>
      )}

      {gpMoodOpen && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:430, display:'flex', alignItems:'flex-end', justifyContent:'center' }} onClick={() => setGpMoodOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background:'white', borderRadius:'20px 20px 0 0', padding:20, width:'100%', maxWidth:480 }}>
            <h3 style={{ fontWeight:800, fontSize:15, marginBottom:12 }}>Comment vous sentez-vous ?</h3>
            {MOODS.map(m => (
              <button key={m} onClick={() => { setGpMood(m); setGpMoodOpen(false); }}
                style={{ width:'100%', textAlign:'left', padding:'11px 6px', background:'none', border:'none', borderBottom:'1px solid #F0F2F5', cursor:'pointer', fontSize:15, fontFamily:'Poppins' }}>
                {m}
              </button>
            ))}
          </div>
        </div>
      )}

      {gpTagOpen && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:430, display:'flex', alignItems:'flex-end', justifyContent:'center' }} onClick={() => setGpTagOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background:'white', borderRadius:'20px 20px 0 0', padding:20, width:'100%', maxWidth:480, maxHeight:'75vh', overflowY:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
              <h3 style={{ fontWeight:800, fontSize:16 }}>Identifier des amis</h3>
              <button onClick={() => setGpTagOpen(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'#65676B' }}><HiX size={20}/></button>
            </div>
            {gpTagList.length === 0 && <p style={{ fontSize:13, color:'#65676B', textAlign:'center', padding:'16px 0' }}>Vous n'avez pas encore d'amis à identifier.</p>}
            {gpTagList.map(f => (
              <label key={f.uid} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 4px', cursor:'pointer', borderBottom:'1px solid #F0F2F5' }}>
                <input type="checkbox" checked={!!gpTagSel[f.uid]} onChange={e => setGpTagSel(p => ({ ...p, [f.uid]: e.target.checked }))} style={{ width:18, height:18, accentColor:'#1877F2' }}/>
                <img src={f.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(f.fullName||'U')}&background=1877F2&color=fff`} alt="" style={{ width:36, height:36, borderRadius:'50%', objectFit:'cover' }}/>
                <p style={{ fontWeight:600, fontSize:14 }}>{f.fullName}</p>
              </label>
            ))}
            <button onClick={() => setGpTagOpen(false)} className="btn-primary" style={{ width:'100%', marginTop:14, padding:'11px 0', fontSize:14 }}>OK</button>
          </div>
        </div>
      )}
    </div>
  );
}
