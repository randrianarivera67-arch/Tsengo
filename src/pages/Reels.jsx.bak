// src/pages/Reels.jsx — TikTok style vertical scroll
import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import { v4 as uuidv4 } from 'uuid';
import {
  HiHeart, HiOutlineHeart, HiChat, HiShare, HiArrowLeft,
  HiDownload, HiSpeakerphone
} from 'react-icons/hi';

const REACTIONS = ['❤️', '😂', '😮', '😢', '😡', '👍'];

export default function Reels() {
  const { currentUser, userProfile } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const location = useLocation();

  const [posts, setPosts] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showReactions, setShowReactions] = useState(false);
  const [openComments, setOpenComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const videoRefs = useRef({});
  const containerRef = useRef();

  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => p.mediaType === 'video' && p.mediaURL);
      setPosts(all);
      if (location.state?.startId) {
        const idx = all.findIndex(p => p.id === location.state.startId);
        if (idx >= 0) setActiveIndex(idx);
      }
    });
    return unsub;
  }, []);

  // Pause all except active
  useEffect(() => {
    Object.entries(videoRefs.current).forEach(([idx, video]) => {
      if (!video) return;
      if (parseInt(idx) === activeIndex) {
        video.play().catch(() => {});
      } else {
        video.pause();
        video.currentTime = 0;
      }
    });
  }, [activeIndex, posts.length]);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const { scrollTop, clientHeight } = containerRef.current;
    const newIndex = Math.round(scrollTop / clientHeight);
    setActiveIndex(newIndex);
  }, []);

  async function reactToPost(postId, emoji) {
    const postRef = doc(db, 'posts', postId);
    const post = posts.find(p => p.id === postId);
    const reactions = post.reactions || {};
    const myReaction = reactions[currentUser.uid];
    if (myReaction === emoji) {
      const updated = { ...reactions }; delete updated[currentUser.uid];
      await updateDoc(postRef, { reactions: updated });
    } else {
      await updateDoc(postRef, { [`reactions.${currentUser.uid}`]: emoji });
    }
    setShowReactions(false);
  }

  async function addComment(postId) {
    if (!commentText.trim()) return;
    const postRef = doc(db, 'posts', postId);
    const comment = {
      id: uuidv4(), uid: currentUser.uid,
      authorName: userProfile.fullName,
      authorPhoto: userProfile.photoURL || '',
      authorIsVip: userProfile.isVip || false,
      text: commentText.trim(),
      createdAt: new Date().toISOString(),
    };
    await updateDoc(postRef, { comments: arrayUnion(comment) });
    setCommentText('');
  }

  async function sharePost(post) {
    const url = `${window.location.origin}/post/${post.id}`;
    if (navigator.share) {
      try { await navigator.share({ title: 'Tsengo Reel', text: post.content, url }); } catch {}
    } else {
      navigator.clipboard?.writeText(url);
    }
  }

  async function downloadVideo(post) {
    const a = document.createElement('a');
    a.href = post.mediaURL;
    a.download = `tsengo_reel_${post.id}.mp4`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  if (posts.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 130px)', color: '#C4829F', gap: 16 }}>
        <span style={{ fontSize: 48 }}>🎬</span>
        <p style={{ fontSize: 15 }}>Tsy misy reels mbola</p>
        <button onClick={() => navigate('/')} className="btn-primary" style={{ fontSize: 13 }}>Miverina</button>
      </div>
    );
  }

  const activePost = posts[activeIndex];
  const myReaction = activePost?.reactions?.[currentUser.uid];
  const totalReactions = Object.keys(activePost?.reactions || {}).length;

  return (
    <div style={{ position: 'relative', height: 'calc(100vh - 130px)', overflow: 'hidden', background: '#000' }}>
      {/* Back button */}
      <button
        onClick={() => navigate('/')}
        style={{ position: 'absolute', top: 14, left: 14, zIndex: 50, background: 'rgba(0,0,0,0.4)', border: 'none', borderRadius: '50%', width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}
      >
        <HiArrowLeft size={20} />
      </button>

      {/* Video feed */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        style={{ height: '100%', overflowY: 'scroll', scrollSnapType: 'y mandatory', scrollbarWidth: 'none' }}
      >
        {posts.map((post, idx) => {
          const postMyReaction = post.reactions?.[currentUser.uid];
          const postTotalReactions = Object.keys(post.reactions || {}).length;
          return (
            <div
              key={post.id}
              style={{ height: '100%', scrollSnapAlign: 'start', position: 'relative', flexShrink: 0 }}
            >
              <video
                ref={el => videoRefs.current[idx] = el}
                src={post.mediaURL}
                loop
                playsInline
                muted={false}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onClick={() => {
                  const v = videoRefs.current[idx];
                  if (v) v.paused ? v.play() : v.pause();
                }}
              />

              {/* Gradient overlay */}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)', pointerEvents: 'none' }} />

              {/* Author info bottom left */}
              <div style={{ position: 'absolute', bottom: 80, left: 14, right: 80 }}>
                <div
                  onClick={() => navigate(`/profile/${post.uid}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 8 }}
                >
                  <img
                    src={post.authorPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.authorName||'U')}&background=E91E8C&color=fff`}
                    alt="" style={{ width: 36, height: 36, borderRadius: '50%', border: '2px solid white', flexShrink: 0 }}
                  />
                  <p style={{ color: 'white', fontWeight: 700, fontSize: 14 }}>
                    {post.authorName}
                    {post.authorIsVip && <span style={{ background: '#E91E8C', color: 'white', fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 6, marginLeft: 5 }}>VIP</span>}
                  </p>
                </div>
                {post.content && (
                  <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {post.content}
                  </p>
                )}
              </div>

              {/* Right actions */}
              <div style={{ position: 'absolute', right: 14, bottom: 80, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
                {/* React */}
                <div style={{ position: 'relative' }}>
                  {idx === activeIndex && showReactions && (
                    <div style={{ position: 'absolute', right: 50, bottom: 0, background: 'rgba(0,0,0,0.7)', borderRadius: 30, padding: '8px 10px', display: 'flex', gap: 8 }}>
                      {REACTIONS.map(emoji => (
                        <button key={emoji} onClick={() => reactToPost(post.id, emoji)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 24 }}>{emoji}</button>
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                    <button
                      onClick={() => idx === activeIndex && setShowReactions(p => !p)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: postMyReaction ? '#FF6BB5' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      {postMyReaction ? <HiHeart size={28} color="#FF6BB5" /> : <HiOutlineHeart size={28} />}
                    </button>
                    <span style={{ color: 'white', fontSize: 12 }}>{postTotalReactions}</span>
                  </div>
                </div>

                {/* Comment */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                  <button
                    onClick={() => idx === activeIndex && setOpenComments(p => !p)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'white' }}
                  >
                    <HiChat size={28} />
                  </button>
                  <span style={{ color: 'white', fontSize: 12 }}>{post.comments?.length || 0}</span>
                </div>

                {/* Share */}
                <button onClick={() => sharePost(post)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'white' }}>
                  <HiShare size={26} />
                </button>

                {/* Download */}
                <button onClick={() => downloadVideo(post)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'white' }}>
                  <HiDownload size={26} />
                </button>

                {/* Boost */}
                <button onClick={() => navigate('/boost')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'white' }}>
                  <HiSpeakerphone size={24} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Comments panel */}
      {openComments && activePost && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.9)', borderRadius: '20px 20px 0 0', padding: '16px 16px 20px', maxHeight: '60%', display: 'flex', flexDirection: 'column', zIndex: 100 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <p style={{ color: 'white', fontWeight: 700 }}>Commentaires ({activePost.comments?.length || 0})</p>
            <button onClick={() => setOpenComments(false)} style={{ background: 'none', border: 'none', color: '#C4829F', cursor: 'pointer' }}>✕</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', marginBottom: 10 }}>
            {activePost.comments?.map(c => (
              <div key={c.id} style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <img src={c.authorPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.authorName)}&background=E91E8C&color=fff`} alt="" style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0 }} />
                <div>
                  <span style={{ color: '#FF6BB5', fontWeight: 700, fontSize: 13 }}>{c.authorName} </span>
                  <span style={{ color: 'white', fontSize: 13 }}>{c.text}</span>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              placeholder="Écrire un commentaire..."
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addComment(activePost.id)}
              style={{ flex: 1, background: '#2D1220', border: '1px solid #4A2535', borderRadius: 25, padding: '9px 14px', color: 'white', fontFamily: 'Poppins', fontSize: 13 }}
            />
            <button
              onClick={() => addComment(activePost.id)}
              style={{ background: '#E91E8C', border: 'none', borderRadius: '50%', width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
            >
              <span style={{ color: 'white', fontSize: 16 }}>➤</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
