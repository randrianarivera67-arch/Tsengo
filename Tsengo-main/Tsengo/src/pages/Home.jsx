// src/pages/Home.jsx
import { useState, useEffect, useRef } from 'react';
import {
  collection, addDoc, serverTimestamp, query, orderBy, onSnapshot,
  doc, updateDoc, arrayUnion, arrayRemove, deleteDoc, getDocs, where
} from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import { v4 as uuidv4 } from 'uuid';
import { HiPhotograph, HiVideoCamera, HiTag, HiHeart, HiOutlineHeart, HiChat, HiTrash, HiPencil, HiX } from 'react-icons/hi';

const REACTIONS = ['❤️', '😂', '😮', '😢', '😡', '👍'];

export default function Home() {
  const { currentUser, userProfile } = useAuth();
  const { t } = useLang();

  // Create post state
  const [content, setContent] = useState('');
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [mediaType, setMediaType] = useState('');
  const [isSale, setIsSale] = useState(false);
  const [price, setPrice] = useState('');
  const [posting, setPosting] = useState(false);

  // Posts
  const [posts, setPosts] = useState([]);
  const [openComments, setOpenComments] = useState({});
  const [commentText, setCommentText] = useState({});
  const [showReactions, setShowReactions] = useState({});
  const [editPost, setEditPost] = useState(null);
  const [editContent, setEditContent] = useState('');

  const photoRef = useRef();
  const videoRef = useRef();

  // Load posts real-time
  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  // Handle media select
  function handleMedia(e, type) {
    const file = e.target.files[0];
    if (!file) return;
    setMediaFile(file);
    setMediaType(type);
    setMediaPreview(URL.createObjectURL(file));
  }

  function removeMedia() {
    setMediaFile(null);
    setMediaPreview(null);
    setMediaType('');
  }

  // Create post
  async function createPost() {
    if (!content.trim() && !mediaFile) return;
    setPosting(true);
    try {
      let mediaURL = '';
      if (mediaFile) {
        const fileRef = storageRef(storage, `posts/${currentUser.uid}/${uuidv4()}`);
        await uploadBytes(fileRef, mediaFile);
        mediaURL = await getDownloadURL(fileRef);
      }
      await addDoc(collection(db, 'posts'), {
        uid: currentUser.uid,
        authorName: userProfile.fullName,
        authorUsername: userProfile.username,
        authorPhoto: userProfile.photoURL || '',
        content: content.trim(),
        mediaURL,
        mediaType,
        isSale,
        price: isSale ? price : '',
        reactions: {},
        comments: [],
        createdAt: serverTimestamp(),
      });
      setContent('');
      removeMedia();
      setIsSale(false);
      setPrice('');
    } catch (err) {
      console.error(err);
    }
    setPosting(false);
  }

  // React to post
  async function reactToPost(postId, emoji) {
    const postRef = doc(db, 'posts', postId);
    const post = posts.find(p => p.id === postId);
    const reactions = post.reactions || {};
    const myReaction = reactions[currentUser.uid];

    if (myReaction === emoji) {
      const updated = { ...reactions };
      delete updated[currentUser.uid];
      await updateDoc(postRef, { reactions: updated });
    } else {
      await updateDoc(postRef, { [`reactions.${currentUser.uid}`]: emoji });
    }
    setShowReactions(p => ({ ...p, [postId]: false }));
  }

  // Add comment
  async function addComment(postId) {
    const text = commentText[postId];
    if (!text?.trim()) return;
    const postRef = doc(db, 'posts', postId);
    const comment = {
      id: uuidv4(),
      uid: currentUser.uid,
      authorName: userProfile.fullName,
      authorPhoto: userProfile.photoURL || '',
      text: text.trim(),
      createdAt: new Date().toISOString(),
    };
    await updateDoc(postRef, { comments: arrayUnion(comment) });
    setCommentText(p => ({ ...p, [postId]: '' }));

    // Notify post owner
    const post = posts.find(p => p.id === postId);
    if (post.uid !== currentUser.uid) {
      await addDoc(collection(db, 'notifications'), {
        toUid: post.uid,
        fromUid: currentUser.uid,
        fromName: userProfile.fullName,
        fromPhoto: userProfile.photoURL || '',
        type: 'comment',
        postId,
        message: `${userProfile.fullName} dia nanatratra hevitra tamin'ny lahatsoratrao`,
        read: false,
        createdAt: serverTimestamp(),
      });
    }
  }

  // Delete post
  async function deletePost(postId) {
    if (!window.confirm('Fafao ilay publication?')) return;
    await deleteDoc(doc(db, 'posts', postId));
  }

  // Edit post
  async function saveEditPost() {
    if (!editContent.trim()) return;
    await updateDoc(doc(db, 'posts', editPost.id), { content: editContent });
    setEditPost(null);
  }

  // Count reactions
  function countReactions(reactions = {}) {
    const counts = {};
    Object.values(reactions).forEach(e => { counts[e] = (counts[e] || 0) + 1; });
    return counts;
  }

  return (
    <div style={{ padding: '16px 12px' }}>
      {/* Create Post */}
      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <img
            src={userProfile?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile?.fullName || 'U')}&background=E91E8C&color=fff`}
            alt="" className="avatar" style={{ width: 42, height: 42, flexShrink: 0 }}
          />
          <textarea
            className="input"
            placeholder={t('whatsOnMind')}
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={2}
            style={{ resize: 'none', flex: 1 }}
          />
        </div>

        {/* Media preview */}
        {mediaPreview && (
          <div style={{ position: 'relative', marginTop: 10 }}>
            {mediaType === 'image'
              ? <img src={mediaPreview} alt="" style={{ width: '100%', borderRadius: 10, maxHeight: 250, objectFit: 'cover' }} />
              : <video src={mediaPreview} controls style={{ width: '100%', borderRadius: 10, maxHeight: 250 }} />
            }
            <button onClick={removeMedia} style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <HiX size={16} />
            </button>
          </div>
        )}

        {/* Sale option */}
        {isSale && (
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
            <HiTag color="#E91E8C" size={18} />
            <input
              className="input"
              type="number"
              placeholder={`${t('price')} (Ar)`}
              value={price}
              onChange={e => setPrice(e.target.value)}
              style={{ width: 160 }}
            />
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          <input ref={photoRef} type="file" accept="image/*" onChange={e => handleMedia(e, 'image')} style={{ display: 'none' }} />
          <input ref={videoRef} type="file" accept="video/*" onChange={e => handleMedia(e, 'video')} style={{ display: 'none' }} />

          <button onClick={() => photoRef.current.click()} style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#FFE4F3', border: 'none', borderRadius: 20, padding: '6px 12px', cursor: 'pointer', color: '#E91E8C', fontSize: 13, fontWeight: 500 }}>
            <HiPhotograph size={16} /> {t('addPhoto')}
          </button>
          <button onClick={() => videoRef.current.click()} style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#FFE4F3', border: 'none', borderRadius: 20, padding: '6px 12px', cursor: 'pointer', color: '#E91E8C', fontSize: 13, fontWeight: 500 }}>
            <HiVideoCamera size={16} /> {t('addVideo')}
          </button>
          <button
            onClick={() => setIsSale(p => !p)}
            style={{ display: 'flex', alignItems: 'center', gap: 5, background: isSale ? '#E91E8C' : '#FFE4F3', border: 'none', borderRadius: 20, padding: '6px 12px', cursor: 'pointer', color: isSale ? 'white' : '#E91E8C', fontSize: 13, fontWeight: 500 }}
          >
            <HiTag size={16} /> {t('sell')}
          </button>
          <button className="btn-primary" onClick={createPost} disabled={posting || (!content.trim() && !mediaFile)} style={{ marginLeft: 'auto', padding: '6px 20px', fontSize: 13 }}>
            {posting ? '...' : t('publishPost')}
          </button>
        </div>
      </div>

      {/* Edit modal */}
      {editPost && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div className="card" style={{ width: '100%', maxWidth: 400, padding: 20 }}>
            <h3 style={{ marginBottom: 12, color: '#2D1220' }}>{t('editPost')}</h3>
            <textarea className="input" rows={4} value={editContent} onChange={e => setEditContent(e.target.value)} style={{ resize: 'none' }} />
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <button className="btn-secondary" onClick={() => setEditPost(null)} style={{ flex: 1 }}>{t('cancel')}</button>
              <button className="btn-primary" onClick={saveEditPost} style={{ flex: 1 }}>{t('save')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Posts feed */}
      {posts.map(post => {
        const reactionCounts = countReactions(post.reactions);
        const myReaction = post.reactions?.[currentUser.uid];
        const totalReactions = Object.keys(post.reactions || {}).length;

        return (
          <div key={post.id} className="card post-card animate-fade" style={{ marginBottom: 14 }}>
            {/* Post header */}
            <div style={{ padding: '14px 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <img
                  src={post.authorPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.authorName || 'U')}&background=E91E8C&color=fff`}
                  alt="" className="avatar" style={{ width: 40, height: 40 }}
                />
                <div>
                  <p style={{ fontWeight: 600, fontSize: 14, color: '#2D1220' }}>{post.authorName}</p>
                  <p style={{ fontSize: 12, color: '#C4829F' }}>@{post.authorUsername} · {post.createdAt?.toDate ? new Date(post.createdAt.toDate()).toLocaleDateString('fr-FR') : 'Maintenant'}</p>
                </div>
              </div>
              {post.isSale && (
                <div>
                  <span className="sale-badge">{t('sale')}</span>
                  <p className="price-tag" style={{ textAlign: 'right', marginTop: 2, fontSize: 15 }}>{post.price} Ar</p>
                </div>
              )}
              {post.uid === currentUser.uid && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => { setEditPost(post); setEditContent(post.content); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C4829F', padding: 4 }}>
                    <HiPencil size={16} />
                  </button>
                  <button onClick={() => deletePost(post.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#E91E8C', padding: 4 }}>
                    <HiTrash size={16} />
                  </button>
                </div>
              )}
            </div>

            {/* Content */}
            <div style={{ padding: '10px 16px' }}>
              {post.content && <p style={{ fontSize: 15, lineHeight: 1.5, color: '#2D1220' }}>{post.content}</p>}
              {post.mediaURL && (
                <div className="post-media">
                  {post.mediaType === 'image'
                    ? <img src={post.mediaURL} alt="" />
                    : <video src={post.mediaURL} controls />
                  }
                </div>
              )}
            </div>

            {/* Reaction count */}
            {totalReactions > 0 && (
              <div style={{ padding: '0 16px 8px', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {Object.entries(reactionCounts).map(([emoji, count]) => (
                  <span key={emoji} style={{ background: '#FFE4F3', borderRadius: 12, padding: '2px 8px', fontSize: 12 }}>
                    {emoji} {count}
                  </span>
                ))}
              </div>
            )}

            {/* Actions bar */}
            <div style={{ borderTop: '1px solid #FFE4F3', padding: '8px 16px', display: 'flex', gap: 6, alignItems: 'center' }}>
              {/* React button */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowReactions(p => ({ ...p, [post.id]: !p[post.id] }))}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: myReaction ? '#E91E8C' : '#C4829F', fontWeight: 500, fontSize: 13, padding: '6px 10px', borderRadius: 20 }}
                >
                  {myReaction ? <span style={{ fontSize: 16 }}>{myReaction}</span> : <HiOutlineHeart size={18} />}
                  {totalReactions > 0 && <span>{totalReactions}</span>}
                </button>
                {showReactions[post.id] && (
                  <div style={{ position: 'absolute', bottom: '110%', left: 0, background: 'white', borderRadius: 30, padding: '8px 12px', display: 'flex', gap: 6, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', zIndex: 10, border: '1px solid #FFE4F3' }}>
                    {REACTIONS.map(emoji => (
                      <button key={emoji} onClick={() => reactToPost(post.id, emoji)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, transition: 'transform 0.1s' }}
                        onMouseEnter={e => e.target.style.transform = 'scale(1.3)'}
                        onMouseLeave={e => e.target.style.transform = 'scale(1)'}
                      >{emoji}</button>
                    ))}
                  </div>
                )}
              </div>

              {/* Comment button */}
              <button
                onClick={() => setOpenComments(p => ({ ...p, [post.id]: !p[post.id] }))}
                style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#C4829F', fontWeight: 500, fontSize: 13, padding: '6px 10px', borderRadius: 20 }}
              >
                <HiChat size={18} />
                {post.comments?.length > 0 && <span>{post.comments.length}</span>}
              </button>
            </div>

            {/* Comments section */}
            {openComments[post.id] && (
              <div style={{ padding: '0 16px 14px', borderTop: '1px solid #FFE4F3' }}>
                {post.comments?.map(c => (
                  <div key={c.id} style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <img src={c.authorPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.authorName)}&background=E91E8C&color=fff`} alt="" className="avatar" style={{ width: 30, height: 30, flexShrink: 0 }} />
                    <div>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{c.authorName} </span>
                      <span style={{ fontSize: 13, color: '#4A2535' }}>{c.text}</span>
                    </div>
                  </div>
                ))}

                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <img src={userProfile?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile?.fullName || 'U')}&background=E91E8C&color=fff`} alt="" className="avatar" style={{ width: 30, height: 30, flexShrink: 0 }} />
                  <input
                    className="input"
                    placeholder={t('writeComment')}
                    value={commentText[post.id] || ''}
                    onChange={e => setCommentText(p => ({ ...p, [post.id]: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && addComment(post.id)}
                    style={{ flex: 1, padding: '7px 12px', fontSize: 13 }}
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
