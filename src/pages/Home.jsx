// src/pages/Home.jsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection, addDoc, serverTimestamp, query, orderBy, onSnapshot,
  doc, updateDoc, arrayUnion, deleteDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { uploadToCloudinary, optimizeImage, videoThumbnail } from '../utils/cloudinary';
import { sendNotification } from '../utils/notify';
import { v4 as uuidv4 } from 'uuid';
import {
  HiPhotograph, HiVideoCamera, HiTag, HiOutlineHeart, HiChat,
  HiTrash, HiPencil, HiX, HiDotsVertical, HiDownload, HiPlay,
  HiShare, HiPhone, HiLocationMarker,
} from 'react-icons/hi';

const REACTIONS = ['❤️', '😂', '😮', '😢', '😡', '👍'];
const COMMENT_REACTIONS = ['❤️', '😂', '👍'];

export default function Home() {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();

  const [content, setContent] = useState('');
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [mediaType, setMediaType] = useState('');
  const [isSale, setIsSale] = useState(false);
  const [price, setPrice] = useState('');
  const [phone, setPhone] = useState('');
  const [lieu, setLieu] = useState('');
  const [posting, setPosting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [posts, setPosts] = useState([]);
  const [videoPosts, setVideoPosts] = useState([]);
  const [openComments, setOpenComments] = useState({});
  const [commentText, setCommentText] = useState({});
  const [replyTo, setReplyTo] = useState({});
  const [showReactions, setShowReactions] = useState({});
  const [showCommentReactions, setShowCommentReactions] = useState({});
  const [editPost, setEditPost] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [openMenu, setOpenMenu] = useState(null);
  const [toast, setToast] = useState('');
  const [showBoost, setShowBoost] = useState(null);

  const photoRef = useRef();
  const videoRef = useRef();

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 2500); }

  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Boosted posts first
      const boosted = all.filter(p => p.boosted);
      const normal = all.filter(p => !p.boosted);
      const sorted = [...boosted, ...normal];
      setPosts(sorted);
      setVideoPosts(all.filter(p => p.mediaType === 'video' && p.mediaURL));
    });
    return unsub;
  }, []);

  useEffect(() => {
    const handler = () => { setOpenMenu(null); setShowReactions({}); setShowCommentReactions({}); };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  function handleMedia(e, type) {
    const file = e.target.files[0]; if (!file) return;
    const maxSize = type === 'video' ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) { alert(type === 'video' ? 'Video max 100MB' : 'Sary max 10MB'); return; }
    setMediaFile(file); setMediaType(type); setMediaPreview(URL.createObjectURL(file));
  }

  function removeMedia() { setMediaFile(null); setMediaPreview(null); setMediaType(''); setUploadProgress(0); }

  async function createPost() {
    if (!content.trim() && !mediaFile) return;
    if (isSale && !price) { alert('Asio ny vidiny'); return; }
    setPosting(true); setUploadProgress(0);
    try {
      let mediaURL = ''; let finalMediaType = mediaType;
      if (mediaFile) {
        const result = await uploadToCloudinary(mediaFile, `tsengo/posts/${currentUser.uid}`, p => setUploadProgress(p));
        mediaURL = result.url; finalMediaType = result.type;
      }
      await addDoc(collection(db, 'posts'), {
        uid: currentUser.uid, authorName: userProfile.fullName,
        authorUsername: userProfile.username, authorPhoto: userProfile.photoURL || '',
        content: content.trim(), mediaURL, mediaType: finalMediaType,
        isSale, price: isSale ? price : '',
        phone: isSale ? phone : '',
        lieu: isSale ? lieu : '',
        reactions: {}, comments: [],
        boosted: false, boostedUntil: null,
        createdAt: serverTimestamp(),
      });
      setContent(''); removeMedia(); setIsSale(false); setPrice(''); setPhone(''); setLieu('');
    } catch (err) { alert('Nisy olana: ' + err.message); }
    setPosting(false); setUploadProgress(0);
  }

  async function reactToPost(postId, emoji) {
    const post = posts.find(p => p.id === postId);
    const reactions = { ...(post.reactions || {}) };
    if (reactions[currentUser.uid] === emoji) { delete reactions[currentUser.uid]; }
    else {
      reactions[currentUser.uid] = emoji;
      if (post.uid !== currentUser.uid) {
        await sendNotification({ toUid: post.uid, fromUid: currentUser.uid, fromName: userProfile.fullName, fromPhoto: userProfile.photoURL || '', type: 'reaction', postId, message: `${userProfile.fullName} a réagi à votre publication ${emoji}` });
      }
    }
    await updateDoc(doc(db, 'posts', postId), { reactions });
  }

  async function reactToComment(postId, commentId, emoji) {
    const post = posts.find(p => p.id === postId);
    const comments = (post.comments || []).map(c => {
      if (c.id !== commentId) return c;
      const cr = { ...(c.reactions || {}) };
      if (cr[currentUser.uid] === emoji) delete cr[currentUser.uid];
      else cr[currentUser.uid] = emoji;
      return { ...c, reactions: cr };
    });
    await updateDoc(doc(db, 'posts', postId), { comments });
  }

  async function addComment(postId) {
    const text = commentText[postId]; if (!text?.trim()) return;
    const reply = replyTo[postId];
    const comment = {
      id: uuidv4(), uid: currentUser.uid,
      authorName: userProfile.fullName, authorPhoto: userProfile.photoURL || '',
      text: text.trim(),
      replyTo: reply ? { commentId: reply.commentId, authorName: reply.authorName } : null,
      reactions: {}, createdAt: new Date().toISOString(),
    };
    await updateDoc(doc(db, 'posts', postId), { comments: arrayUnion(comment) });
    setCommentText(p => ({ ...p, [postId]: '' }));
    setReplyTo(p => ({ ...p, [postId]: null }));
    const post = posts.find(p => p.id === postId);
    if (post.uid !== currentUser.uid) {
      await sendNotification({ toUid: post.uid, fromUid: currentUser.uid, fromName: userProfile.fullName, fromPhoto: userProfile.photoURL || '', type: 'comment', postId, message: `${userProfile.fullName} a commenté votre publication` });
    }
  }

  async function deletePost(postId) {
    if (!window.confirm('Supprimer cette publication ?')) return;
    await deleteDoc(doc(db, 'posts', postId));
  }

  async function saveEditPost() {
    if (!editContent.trim()) return;
    await updateDoc(doc(db, 'posts', editPost.id), { content: editContent });
    setEditPost(null);
  }

  function downloadMedia(url, type) {
    const a = document.createElement('a');
    a.href = url; a.download = `tsengo-${Date.now()}.${type === 'video' ? 'mp4' : 'jpg'}`;
    a.target = '_blank'; a.click();
  }

  function sharePost(post) {
    const url = `${window.location.origin}/?post=${post.id}`;
    if (navigator.share) {
      navigator.share({ title: `Tsengo — ${post.authorName}`, text: post.content || '', url });
    } else {
      navigator.clipboard.writeText(url).then(() => showToast('Lien copié !'));
    }
  }

  function countReactions(r = {}) {
    const c = {}; Object.values(r).forEach(e => { c[e] = (c[e] || 0) + 1; }); return c;
  }

  function timeAgo(ts) {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    const s = (Date.now() - d.getTime()) / 1000;
    if (s < 60) return "À l'instant";
    if (s < 3600) return `${Math.floor(s / 60)} min`;
    if (s < 86400) return `${Math.floor(s / 3600)}h`;
    return d.toLocaleDateString('fr-FR');
  }

  const av = (name, photo) => photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'U')}&background=E91E8C&color=fff`;

  const BOOST_OPTIONS = [
    { label: '1 jour', days: 1, price: '5 000 Ar' },
    { label: '3 jours', days: 3, price: '10 000 Ar' },
    { label: '7 jours', days: 7, price: '20 000 Ar' },
  ];

  return (
    <div style={{ padding: '14px 10px' }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 70, left: '50%', transform: 'translateX(-50%)', background: '#2D1220', color: 'white', padding: '10px 20px', borderRadius: 20, zIndex: 1000, fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>
          {toast}
        </div>
      )}

      {/* Boost modal */}
      {showBoost && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => setShowBoost(null)}>
          <div className="card" style={{ width: '100%', maxWidth: 340, padding: 20 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontWeight: 700, fontSize: 16, color: '#E91E8C', marginBottom: 6 }}>🚀 Booster la publication</h3>
            <p style={{ fontSize: 12, color: '#8B5A6F', marginBottom: 16 }}>
              Envoyez votre paiement via WhatsApp au <strong>+261 32 206 45 74</strong>, puis nous activerons votre boost.
            </p>
            {BOOST_OPTIONS.map(opt => (
              <a key={opt.days}
                href={`https://wa.me/261322064574?text=Bonjour%2C%20je%20veux%20booster%20ma%20publication%20pendant%20${opt.days}%20jour(s)%20-%20${opt.price}%20-%20ID%3A%20${showBoost}`}
                target="_blank" rel="noreferrer"
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderRadius: 12, border: '1.5px solid #FFE4F3', marginBottom: 8, textDecoration: 'none', background: '#FDF4F8' }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#2D1220' }}>{opt.label}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#E91E8C' }}>{opt.price}</span>
              </a>
            ))}
            <button onClick={() => setShowBoost(null)}
              style={{ width: '100%', padding: '10px', borderRadius: 12, border: 'none', background: '#FFE4F3', color: '#E91E8C', fontWeight: 600, cursor: 'pointer', marginTop: 4 }}>
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* REELS */}
      {videoPosts.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#E91E8C', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
            <HiPlay size={15} /> Vidéos courtes
          </p>
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 6, scrollbarWidth: 'none' }}>
            {videoPosts.map(post => (
              <div key={post.id} style={{ flexShrink: 0, width: 100, position: 'relative', borderRadius: 12, overflow: 'hidden', cursor: 'pointer', background: '#000' }}
                onClick={() => navigate(`/profile/${post.uid}`)}>
                <video src={post.mediaURL} style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }} muted playsInline />
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.7))', padding: '20px 6px 6px' }}>
                  <img src={av(post.authorName, post.authorPhoto)} alt="" style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid #E91E8C', display: 'block', margin: '0 auto' }} />
                </div>
                <div style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(233,30,140,0.85)', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <HiPlay size={12} color="white" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CREATE POST */}
      <div className="card" style={{ padding: 14, marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <img src={av(userProfile?.fullName, userProfile?.photoURL)} alt="" className="avatar"
            style={{ width: 40, height: 40, flexShrink: 0, cursor: 'pointer' }}
            onClick={() => navigate(`/profile/${currentUser.uid}`)} />
          <textarea className="input" placeholder="Quoi de neuf ?" value={content}
            onChange={e => setContent(e.target.value)} rows={2} style={{ resize: 'none', flex: 1, fontSize: 14 }} />
        </div>

        {mediaPreview && (
          <div style={{ position: 'relative', marginTop: 10 }}>
            {mediaType === 'image'
              ? <img src={mediaPreview} alt="" style={{ width: '100%', borderRadius: 10, maxHeight: 240, objectFit: 'cover' }} />
              : <video src={mediaPreview} controls style={{ width: '100%', borderRadius: 10, maxHeight: 240 }} />
            }
            <button onClick={removeMedia} style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <HiX size={15} />
            </button>
          </div>
        )}

        {posting && uploadProgress > 0 && uploadProgress < 100 && (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 11, color: '#C4829F', marginBottom: 4 }}>⬆️ {uploadProgress}%</div>
            <div style={{ height: 5, background: '#FFE4F3', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${uploadProgress}%`, background: 'linear-gradient(90deg, #E91E8C, #FF6BB5)', borderRadius: 10, transition: 'width 0.2s' }} />
            </div>
          </div>
        )}

        {/* Vente fields */}
        {isSale && (
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <HiTag color="#E91E8C" size={18} />
              <input className="input" type="number" placeholder="Prix (Ar)" value={price}
                onChange={e => setPrice(e.target.value)} style={{ flex: 1, fontSize: 13 }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <HiPhone color="#E91E8C" size={18} />
              <input className="input" type="tel" placeholder="Numéro de téléphone" value={phone}
                onChange={e => setPhone(e.target.value)} style={{ flex: 1, fontSize: 13 }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <HiLocationMarker color="#E91E8C" size={18} />
              <input className="input" placeholder="Lieu de vente" value={lieu}
                onChange={e => setLieu(e.target.value)} style={{ flex: 1, fontSize: 13 }} />
            </div>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
          <input ref={photoRef} type="file" accept="image/*" onChange={e => handleMedia(e, 'image')} style={{ display: 'none' }} />
          <input ref={videoRef} type="file" accept="video/*" onChange={e => handleMedia(e, 'video')} style={{ display: 'none' }} />
          <button onClick={() => photoRef.current.click()}
            style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#FFE4F3', border: 'none', borderRadius: 20, padding: '6px 12px', cursor: 'pointer', color: '#E91E8C', fontSize: 12, fontWeight: 500, fontFamily: 'Poppins' }}>
            <HiPhotograph size={15} /> Photo
          </button>
          <button onClick={() => videoRef.current.click()}
            style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#FFE4F3', border: 'none', borderRadius: 20, padding: '6px 12px', cursor: 'pointer', color: '#E91E8C', fontSize: 12, fontWeight: 500, fontFamily: 'Poppins' }}>
            <HiVideoCamera size={15} /> Vidéo
          </button>
          <button onClick={() => setIsSale(p => !p)}
            style={{ display: 'flex', alignItems: 'center', gap: 4, background: isSale ? '#E91E8C' : '#FFE4F3', border: 'none', borderRadius: 20, padding: '6px 12px', cursor: 'pointer', color: isSale ? 'white' : '#E91E8C', fontSize: 12, fontWeight: 500, fontFamily: 'Poppins' }}>
            <HiTag size={15} /> Vendre
          </button>
          <button className="btn-primary" onClick={createPost} disabled={posting || (!content.trim() && !mediaFile)}
            style={{ marginLeft: 'auto', padding: '6px 18px', fontSize: 12, opacity: posting ? 0.7 : 1 }}>
            {posting ? (uploadProgress > 0 ? `${uploadProgress}%` : '...') : 'Publier'}
          </button>
        </div>
      </div>

      {/* EDIT MODAL */}
      {editPost && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => setEditPost(null)}>
          <div className="card" style={{ width: '100%', maxWidth: 400, padding: 20 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: 12, color: '#2D1220', fontWeight: 700 }}>Modifier</h3>
            <textarea className="input" rows={4} value={editContent} onChange={e => setEditContent(e.target.value)} style={{ resize: 'none' }} />
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <button className="btn-secondary" onClick={() => setEditPost(null)} style={{ flex: 1 }}>Annuler</button>
              <button className="btn-primary" onClick={saveEditPost} style={{ flex: 1 }}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {/* FEED */}
      {posts.map(post => {
        const rc = countReactions(post.reactions);
        const myR = post.reactions?.[currentUser.uid];
        const total = Object.keys(post.reactions || {}).length;
        const isOwn = post.uid === currentUser.uid;

        return (
          <div key={post.id} className="card post-card animate-fade">
            {/* Boost badge */}
            {post.boosted && (
              <div style={{ background: 'linear-gradient(90deg, #E91E8C, #FF6BB5)', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 6, borderRadius: '12px 12px 0 0' }}>
                <span style={{ fontSize: 12, color: 'white', fontWeight: 600 }}>🚀 Publication boostée</span>
              </div>
            )}

            {/* Header */}
            <div style={{ padding: '13px 14px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
              <img src={av(post.authorName, post.authorPhoto)} alt="" className="avatar"
                style={{ width: 40, height: 40, cursor: 'pointer' }}
                onClick={() => navigate(`/profile/${post.uid}`)} />
              <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => navigate(`/profile/${post.uid}`)}>
                <p style={{ fontWeight: 700, fontSize: 14, color: '#2D1220' }}>{post.authorName}</p>
                <p style={{ fontSize: 11, color: '#C4829F' }}>@{post.authorUsername} · {timeAgo(post.createdAt)}</p>
              </div>
              {post.isSale && (
                <div style={{ textAlign: 'right' }}>
                  <span className="sale-badge">Vente</span>
                  <p className="price-tag" style={{ marginTop: 2, fontSize: 14 }}>{Number(post.price).toLocaleString()} Ar</p>
                </div>
              )}
              {/* Menu 3 points */}
              <div style={{ position: 'relative' }}>
                <button onClick={e => { e.stopPropagation(); setOpenMenu(openMenu === post.id ? null : post.id); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C4829F', padding: 4 }}>
                  <HiDotsVertical size={18} />
                </button>
                {openMenu === post.id && (
                  <div style={{ position: 'absolute', right: 0, top: '110%', background: 'white', borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.12)', border: '1px solid #FFE4F3', zIndex: 50, minWidth: 170, overflow: 'hidden' }}
                    onClick={e => e.stopPropagation()}>
                    {post.mediaURL && (
                      <button onClick={() => { downloadMedia(post.mediaURL, post.mediaType); setOpenMenu(null); }}
                        style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#2D1220', fontFamily: 'Poppins' }}>
                        <HiDownload size={15} color="#E91E8C" /> Télécharger
                      </button>
                    )}
                    {isOwn && post.isSale && (
                      <button onClick={() => { setShowBoost(post.id); setOpenMenu(null); }}
                        style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#2D1220', fontFamily: 'Poppins' }}>
                        🚀 Booster
                      </button>
                    )}
                    {isOwn && (
                      <>
                        <button onClick={() => { setEditPost(post); setEditContent(post.content); setOpenMenu(null); }}
                          style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#2D1220', fontFamily: 'Poppins' }}>
                          <HiPencil size={15} color="#E91E8C" /> Modifier
                        </button>
                        <button onClick={() => { deletePost(post.id); setOpenMenu(null); }}
                          style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#E91E8C', fontFamily: 'Poppins' }}>
                          <HiTrash size={15} /> Supprimer
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: '10px 14px' }}>
              {post.content && <p style={{ fontSize: 14, lineHeight: 1.55, color: '#2D1220' }}>{post.content}</p>}
              {post.mediaURL && (
                <div style={{ marginTop: post.content ? 10 : 0 }}>
                  {post.mediaType === 'image'
                    ? <img src={optimizeImage(post.mediaURL, { width: 680 })} alt="" style={{ width: '100%', maxHeight: 480, objectFit: 'cover', borderRadius: 12 }} loading="lazy" />
                    : <video src={post.mediaURL} controls poster={videoThumbnail(post.mediaURL)} style={{ width: '100%', borderRadius: 12, maxHeight: 400 }} />
                  }
                </div>
              )}
              {/* Contact vente */}
              {post.isSale && (post.phone || post.lieu) && (
                <div style={{ marginTop: 10, background: '#FDF4F8', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {post.phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <a href={`tel:${post.phone}`} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#E91E8C', color: 'white', borderRadius: 20, padding: '5px 12px', textDecoration: 'none', fontSize: 12, fontWeight: 600 }}>
                        <HiPhone size={13} /> Appeler
                      </a>
                      <button onClick={() => navigate('/messages')}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#FFE4F3', color: '#E91E8C', borderRadius: 20, padding: '5px 12px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                        <HiChat size={13} /> Message
                      </button>
                    </div>
                  )}
                  {post.lieu && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#8B5A6F' }}>
                      <HiLocationMarker size={13} color="#E91E8C" /> {post.lieu}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Reaction summary */}
            {total > 0 && (
              <div style={{ padding: '0 14px 8px', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {Object.entries(rc).map(([emoji, count]) => (
                  <span key={emoji} onClick={() => reactToPost(post.id, emoji)}
                    style={{ background: '#FFE4F3', borderRadius: 12, padding: '2px 8px', fontSize: 12, cursor: 'pointer' }}>
                    {emoji} {count}
                  </span>
                ))}
              </div>
            )}

            {/* Actions */}
            <div style={{ borderTop: '1px solid #FFE4F3', padding: '6px 10px', display: 'flex', gap: 4 }}>
              {/* Reaction */}
              <div style={{ position: 'relative' }}>
                <button onClick={e => { e.stopPropagation(); setShowReactions(p => ({ ...p, [post.id]: !p[post.id] })); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, background: myR ? '#FFE4F3' : 'none', border: 'none', cursor: 'pointer', color: myR ? '#E91E8C' : '#C4829F', fontSize: 13, padding: '6px 10px', borderRadius: 20, fontFamily: 'Poppins' }}>
                  {myR ? <span style={{ fontSize: 17 }}>{myR}</span> : <HiOutlineHeart size={19} />}
                  {total > 0 && <span style={{ fontSize: 12 }}>{total}</span>}
                </button>
                {showReactions[post.id] && (
                  <div style={{ position: 'absolute', bottom: '110%', left: 0, background: 'white', borderRadius: 30, padding: '8px 10px', display: 'flex', gap: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', zIndex: 10, border: '1px solid #FFE4F3' }}
                    onClick={e => e.stopPropagation()}>
                    {REACTIONS.map(emoji => (
                      <button key={emoji} onClick={() => { reactToPost(post.id, emoji); setShowReactions({}); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, padding: 2, transition: 'transform 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.35)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                      >{emoji}</button>
                    ))}
                  </div>
                )}
              </div>
              {/* Comment */}
              <button onClick={() => setOpenComments(p => ({ ...p, [post.id]: !p[post.id] }))}
                style={{ display: 'flex', alignItems: 'center', gap: 4, background: openComments[post.id] ? '#FFE4F3' : 'none', border: 'none', cursor: 'pointer', color: '#C4829F', fontSize: 13, padding: '6px 10px', borderRadius: 20, fontFamily: 'Poppins' }}>
                <HiChat size={19} />
                {post.comments?.length > 0 && <span style={{ fontSize: 12 }}>{post.comments.length}</span>}
              </button>
              {/* Share */}
              <button onClick={() => sharePost(post)}
                style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#C4829F', fontSize: 13, padding: '6px 10px', borderRadius: 20, fontFamily: 'Poppins', marginLeft: 'auto' }}>
                <HiShare size={19} />
              </button>
            </div>

            {/* Comments */}
            {openComments[post.id] && (
              <div style={{ padding: '8px 14px 14px', borderTop: '1px solid #FFE4F3' }}>
                {post.comments?.map(c => {
                  const cReactions = countReactions(c.reactions || {});
                  const myCR = (c.reactions || {})[currentUser.uid];
                  const cTotal = Object.keys(c.reactions || {}).length;
                  return (
                    <div key={c.id} style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <img src={av(c.authorName, c.authorPhoto)} alt="" className="avatar"
                          style={{ width: 28, height: 28, flexShrink: 0, cursor: 'pointer' }}
                          onClick={() => navigate(`/profile/${c.uid}`)} />
                        <div style={{ flex: 1 }}>
                          {c.replyTo && <p style={{ fontSize: 11, color: '#C4829F', marginBottom: 2 }}>↩ {c.replyTo.authorName}</p>}
                          <div style={{ background: '#FDF4F8', borderRadius: '0 12px 12px 12px', padding: '6px 10px' }}>
                            <span style={{ fontWeight: 700, fontSize: 12, color: '#E91E8C' }}>{c.authorName} </span>
                            <span style={{ fontSize: 13, color: '#2D1220' }}>{c.text}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                            <div style={{ position: 'relative' }}>
                              <button onClick={e => { e.stopPropagation(); setShowCommentReactions(p => ({ ...p, [`${post.id}-${c.id}`]: !p[`${post.id}-${c.id}`] })); }}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: myCR ? '#E91E8C' : '#C4829F', padding: '2px 4px' }}>
                                {myCR || '❤️'} {cTotal > 0 ? cTotal : ''}
                              </button>
                              {showCommentReactions[`${post.id}-${c.id}`] && (
                                <div style={{ position: 'absolute', bottom: '110%', left: 0, background: 'white', borderRadius: 20, padding: '5px 8px', display: 'flex', gap: 3, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', zIndex: 20, border: '1px solid #FFE4F3' }}
                                  onClick={e => e.stopPropagation()}>
                                  {COMMENT_REACTIONS.map(emoji => (
                                    <button key={emoji} onClick={() => { reactToComment(post.id, c.id, emoji); setShowCommentReactions({}); }}
                                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, padding: 2 }}>{emoji}</button>
                                  ))}
                                </div>
                              )}
                            </div>
                            <button onClick={() => setReplyTo(p => ({ ...p, [post.id]: { commentId: c.id, authorName: c.authorName } }))}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: '#C4829F', padding: '2px 4px' }}>
                              Répondre
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {replyTo[post.id] && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#FFE4F3', borderRadius: 8, padding: '5px 10px', marginBottom: 6, fontSize: 12, color: '#E91E8C' }}>
                    ↩ Répondre à <strong>{replyTo[post.id].authorName}</strong>
                    <button onClick={() => setReplyTo(p => ({ ...p, [post.id]: null }))}
                      style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#C4829F' }}>
                      <HiX size={12} />
                    </button>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <img src={av(userProfile?.fullName, userProfile?.photoURL)} alt="" className="avatar" style={{ width: 28, height: 28, flexShrink: 0 }} />
                  <input className="input" placeholder="Écrire un commentaire..." value={commentText[post.id] || ''}
                    onChange={e => setCommentText(p => ({ ...p, [post.id]: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && addComment(post.id)}
                    style={{ flex: 1, padding: '7px 12px', fontSize: 13 }} />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
