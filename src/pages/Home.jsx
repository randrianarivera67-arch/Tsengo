// src/pages/Home.jsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, limit,
  doc, updateDoc, arrayUnion, arrayRemove, deleteDoc, writeBatch, getDoc, getDocs, where
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import { uploadToTelegram } from '../utils/telegram';
import { startBackgroundUpload } from '../utils/uploadManager';
import { captureVideoThumb } from '../utils/videoThumb';
import { trimVideoTo30s } from '../utils/trimVideo';
import { timeAgo } from '../utils/timeAgo';
import { isDataSaverOn, subscribeDataSaver } from '../utils/dataSaver';
import { downloadMedia } from '../utils/download';
import ShareModal from '../components/ShareModal';
import MusicPostCard from '../components/MusicPostCard';
import PhotoCarousel from '../components/PhotoCarousel';
import StoryRing from '../components/StoryRing';
import { useActiveStoryUids } from '../hooks/useActiveStoryUids';
import { NeonGlobe, NeonPeople, NeonLock, NeonMic, NeonLocation } from '../components/NeonIcons';
import { getChatId } from '../utils/chat';
import { ref as dbRef, push as dbPush, update as dbUpdate } from 'firebase/database';
import { rtdb } from '../firebase';
import { sendPushNotification } from '../utils/onesignal';
import { v4 as uuidv4 } from 'uuid';
import {
  HiPhotograph, HiVideoCamera, HiTag, HiOutlineHeart, HiChat,
  HiTrash, HiPencil, HiX, HiShare, HiFilm, HiOutlineChat,
  HiDotsVertical, HiDownload, HiLightningBolt, HiPhone, HiLocationMarker,
  HiReply, HiUserAdd, HiUserGroup, HiBookmark, HiFlag, HiBan, HiPaperAirplane, HiIdentification, HiShoppingBag, HiCalendar, HiClipboardCopy, HiInformationCircle, HiCheck
} from 'react-icons/hi';

const MAX_POST    = 2000;
const MAX_COMMENT = 500;
const MAX_PRICE   = 999_999_999;
const REACTIONS   = ['❤️','😂','😮','😢','😡','👍'];
const SALE_CATEGORIES = ['Vêtements', 'Électronique', 'Déco & Maison', 'Véhicules', 'Alimentation', 'Beauté', 'Autre'];

function VIPBadge() {
  return <img src='/vip-badge.png' style={{ width:32, height:32, marginLeft:5, verticalAlign:'middle', display:'inline-block', flexShrink:0, objectFit:'contain' }} alt='VIP'/>;
}

// Video ao amin'ny fil d'actualités — milalao ho azy rehefa hita ~60% amin'ny écran
// (raha tsy activé ny "Économiser données"), ary mijanona rehefa scroll mivoaka.
function FeedVideo({ src, poster, dataSaver, style, onOpenReels }) {
  const vidRef = useRef(null);
  const wrapRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    if (dataSaver) { setPlaying(false); return; }
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
          vidRef.current?.play?.().catch(() => {});
          setPlaying(true);
        } else {
          vidRef.current?.pause?.();
          setPlaying(false);
        }
      },
      { threshold: [0, 0.6, 1] }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [dataSaver]);

  return (
    <div ref={wrapRef} style={{ position: 'relative', cursor: 'pointer' }} onClick={() => {
      onOpenReels?.();
    }}>
      <video
        ref={vidRef}
        src={src}
        poster={poster || undefined}
        preload={(dataSaver || poster) ? 'none' : 'metadata'}
        style={style}
        muted={muted}
        loop
        playsInline
      />
      {!playing && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 50, height: 50, background: 'rgba(0,0,0,0.5)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: 'white', fontSize: 20 }}>▶</span>
          </div>
        </div>
      )}
      {playing && (
        <div style={{ position: 'absolute', bottom: 10, right: 10, width: 30, height: 30, background: 'rgba(0,0,0,0.5)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: 'white', fontSize: 14 }}>{muted ? '🔇' : '🔊'}</span>
        </div>
      )}
    </div>
  );
}

// ── Barres d'onde déterministes (stables par piste) ──
function waveBars(seed, n = 56) {
  let s = 0; for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) % 100000;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  return Array.from({ length: n }, (_, i) => 9 + Math.abs(Math.sin(i * 0.4 + s)) * 44 + rnd() * 16);
}

const MUSIC_GRADS = [['#FF6FA5', '#FF2D8D'], ['#A66BFF', '#7A2DFF'], ['#3DBEFF', '#1877F2']];

function MusicCard({ track, index, playing, onToggle, onArtist, onSave, onBlock, isSaved, isBlocked, onFollow, onMessage, isFollowing, onShare }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [dur, setDur] = useState('');
  const bars = useRef(waveBars(track.id || String(index)));
  const grad = MUSIC_GRADS[index % 3];
  useEffect(() => {
    if (!track.mediaURL) return;
    const a = new Audio(); a.preload = 'metadata'; a.src = track.mediaURL;
    const on = () => { const d = a.duration; if (d && isFinite(d)) { const m = Math.floor(d/60), s = Math.floor(d%60); setDur(m + ':' + String(s).padStart(2,'0')); } };
    a.addEventListener('loadedmetadata', on);
    return () => { a.removeEventListener('loadedmetadata', on); a.src = ''; };
  }, [track.mediaURL]);
  const infoRows = [['Titre', track.songTitle],['Artiste', track.artistName],['Genre', track.genre],['Auteur / Compositeur', track.songAuthorComposer],['Label', track.songLabel],['Studio', track.songStudio],['Equipe', track.songTeam],['Direction artistique', track.songArt],['Description', track.content]].filter(([,v]) => v);
  const Item = ({ icon, label, color, danger, onClick }) => (
    <button onClick={onClick} style={{ width:'100%', display:'flex', alignItems:'center', gap:13, padding:'15px 20px', background:'none', border:'none', cursor:'pointer', color: danger ? '#FF2D8D' : '#050505', fontSize:15, fontWeight:600, borderBottom:'1px solid #F0F2F5', fontFamily:'Poppins' }}>{icon} {label}</button>
  );
  return (
    <div style={{ flex: '0 0 180px', background: '#0c0c12', borderRadius: 16, overflow: 'hidden', position: 'relative' }}>
      <div style={{ position: 'relative', height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <div onClick={() => onArtist?.(track.artistId)} style={{ position: 'absolute', top: 8, left: 8, width: 34, height: 34, borderRadius: '50%', overflow: 'hidden', border: '2px solid rgba(255,255,255,.85)', zIndex: 3, cursor: 'pointer', background: 'linear-gradient(145deg,#FF6FA5,#FF2D8D)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {track.artistPhoto ? <img src={track.artistPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ color: '#fff', fontWeight: 800, fontSize: 14 }}>{(track.artistName || '?')[0]}</span>}
        </div>
        <button onClick={() => setMenuOpen(true)} style={{ position: 'absolute', top: 8, right: 8, zIndex: 4, background: 'rgba(0,0,0,.35)', border: 'none', borderRadius: '50%', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' }}><HiDotsVertical size={16} /></button>
        {track.thumbURL && <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url(' + track.thumbURL + ')', backgroundSize: 'cover', backgroundPosition: 'center', filter: 'brightness(.45)', zIndex: 0 }} />}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, padding: '0 10px', zIndex: 1 }}>
          {bars.current.map((h, i) => (<div key={i} style={{ width: 3, height: h, borderRadius: 3, background: i / bars.current.length < 0.5 ? grad[0] : grad[1], opacity: playing ? 0.95 : 0.7 }} />))}
        </div>
        <div onClick={() => onToggle?.(track)} style={{ position: 'relative', zIndex: 2, width: 42, height: 42, borderRadius: '50%', background: 'rgba(0,0,0,.5)', border: '2px solid rgba(255,255,255,.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 14px rgba(0,0,0,.4)' }}>
          {playing ? <svg width="16" height="18" viewBox="0 0 24 24" fill="#fff"><rect x="6" y="4" width="4" height="16" rx="1.5" /><rect x="14" y="4" width="4" height="16" rx="1.5" /></svg> : <svg width="16" height="18" viewBox="0 0 24 24" fill="#fff" style={{ marginLeft: 3 }}><path d="M6 4l14 8-14 8z" /></svg>}
        </div>
      </div>
      <div style={{ padding: '8px 10px 10px', background: '#0c0c12' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.songTitle || track.content || 'Sans titre'}</div>
            <div style={{ fontSize: 11, color: '#b9b9c2', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.artistName}</div>
          </div>
          {dur && <div style={{ fontSize: 11, color: '#e6e6ea', fontWeight: 600, flexShrink: 0, marginLeft: 6 }}>{dur}</div>}
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          <button onClick={() => onFollow?.(track.artistId)} style={{ flex: 1, background: isFollowing ? 'rgba(255,255,255,.14)' : 'linear-gradient(145deg,#FF6FA5,#FF2D8D)', color: '#fff', border: 'none', borderRadius: 14, padding: '5px 0', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
            {isFollowing ? <><HiCheck size={12} /> Abonné</> : 'Suivre'}
          </button>
          <button onClick={() => onMessage?.(track.artistId)} style={{ flex: 1, background: 'rgba(255,255,255,.14)', color: '#fff', border: 'none', borderRadius: 14, padding: '5px 0', fontSize: 11.5, fontWeight: 600, cursor: 'pointer' }}>Message</button>
        </div>
      </div>
      {menuOpen && (
        <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '18px 18px 0 0', width: '100%', maxWidth: 480, overflow: 'hidden', fontFamily: 'Poppins' }}>
            <Item icon={<HiInformationCircle size={20} color="#1877F2" />} label="Informations" onClick={() => { setMenuOpen(false); setInfoOpen(true); }} />
            <Item icon={<HiDownload size={20} color="#12A48D" />} label="Télécharger" onClick={() => { setMenuOpen(false); downloadMedia(track.mediaURL, 'audio', track.songTitle || 'audio'); }} />
            <Item icon={<HiShare size={20} color="#7A2DFF" />} label="Partager" onClick={() => { setMenuOpen(false); onShare?.(track); }} />
            <Item icon={<HiBookmark size={20} color="#F2B300" />} label={isSaved ? 'Retirer des enregistrements' : 'Enregistrer'} onClick={() => { setMenuOpen(false); onSave?.(track.id); }} />
            <Item icon={<HiBan size={20} color="#FF2D8D" />} label={isBlocked ? 'Débloquer' : 'Bloquer'} danger onClick={() => { setMenuOpen(false); onBlock?.(track); }} />
          </div>
        </div>
      )}
      {infoOpen && (
        <div onClick={() => setInfoOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '18px 18px 0 0', width: '100%', maxWidth: 480, maxHeight: '80vh', overflowY: 'auto', padding: '18px 20px 26px', fontFamily: 'Poppins' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{ width: 46, height: 46, borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(145deg,#FF6FA5,#FF2D8D)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {track.artistPhoto ? <img src={track.artistPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ color: '#fff', fontWeight: 800 }}>{(track.artistName || '?')[0]}</span>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 17 }}>{track.songTitle || 'Sans titre'}</div>
                <div style={{ fontSize: 13, color: '#65676B' }}>{track.artistName}</div>
              </div>
              <button onClick={() => setInfoOpen(false)} style={{ background: '#F0F2F5', border: 'none', borderRadius: '50%', width: 34, height: 34, cursor: 'pointer', color: '#65676B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><HiX size={18} /></button>
            </div>
            {infoRows.map(([k, v]) => (
              <div key={k} style={{ display: 'flex', gap: 10, padding: '9px 0', borderTop: '1px solid #F0F2F5' }}>
                <span style={{ fontSize: 12.5, color: '#65676B', fontWeight: 700, width: 130, flexShrink: 0 }}>{k}</span>
                <span style={{ fontSize: 13.5, color: '#050505' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MusicRow({ tracks, playingId, onToggle, onArtist, onSave, onBlock, savedIds = [], blockedIds = [], onFollow, onMessage, followedArtists = [], onShare }) {
  if (!tracks || tracks.length === 0) return null;
  return (
    <div className="card" style={{ marginBottom: 14, padding: '12px 0 6px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px 10px' }}>
        <span style={{ fontWeight: 800, fontSize: 17, color: '#050505' }}>Suggestions musicales pour vous</span>
      </div>
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', padding: '2px 14px 8px', WebkitOverflowScrolling: 'touch' }}>
        {tracks.map((t, i) => (
          <MusicCard key={t.id} track={t} index={i} playing={playingId === t.id} onToggle={onToggle} onArtist={onArtist} onSave={onSave} onBlock={onBlock} isSaved={savedIds.includes(t.id)} isBlocked={blockedIds.includes(t.uid)} onFollow={onFollow} onMessage={onMessage} isFollowing={followedArtists.includes(t.artistId)} onShare={onShare} />
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const { currentUser, userProfile, setUserProfile } = useAuth();
  const activeStoryUids = useActiveStoryUids();
  const { t } = useLang();
  const navigate = useNavigate();

  const [content, setContent]   = useState('');
  const [mediaFile, setMF]      = useState(null);
  const [mediaPreview, setMP]   = useState(null);
  const [mediaType, setMT]      = useState('');
  const [isSale, setIsSale]     = useState(false);
  const [price, setPrice]       = useState('');
  const [contact, setContact]   = useState('');
  const [lieu, setLieu]         = useState('');
  const [saleCategory, setSaleCategory] = useState(SALE_CATEGORIES[0]);
  const [posting, setPosting]   = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [pageGroups, setPageGroups] = useState([]);   // groupes publics (suggestions)

  // ── Stories (format Facebook) ──
  const [storyGroups, setStoryGroups] = useState([]);       // [{uid, name, photo, items:[...]}]
  const [storyViewer, setStoryViewer] = useState(null);     // {group, index}
  const [addingStory, setAddingStory] = useState(false);
  const [createStoryMenuOpen, setCreateStoryMenuOpen] = useState(false);
  const [storyPaused, setStoryPaused] = useState(false);
  const storyPressTimer = useRef(null);
  const storyPressedRef = useRef(false);
  const storyVideoRef = useRef(null);
  const [dataSaver, setDataSaverState] = useState(isDataSaverOn());
  useEffect(() => subscribeDataSaver(setDataSaverState), []);
  const [shareModalPost, setShareModalPost] = useState(null);
  const [audience, setAudience] = useState('public');   // 'public' | 'friends' | 'me'
  const [audienceMenuOpen, setAudienceMenuOpen] = useState(false);
  const [composerMoreOpen, setComposerMoreOpen] = useState(false);
  const [publishFullOpen, setPublishFullOpen] = useState(false);
  const [isDecree, setIsDecree] = useState(false);
  const [postLocation, setPostLocation] = useState('');
  const [postMood, setPostMood] = useState('');
  const [allowMessages, setAllowMessages] = useState(true);
  const [locationPromptOpen, setLocationPromptOpen] = useState(false);
  const [moodPickerOpen, setMoodPickerOpen] = useState(false);
  const [composerTagOpen, setComposerTagOpen] = useState(false);
  const [composerTagSel, setComposerTagSel] = useState({});
  const [composerTagList, setComposerTagList] = useState([]);
  const MOODS = ['😊 se sent heureux(se)', '😢 se sent triste', '🥳 fait la fête', '😴 fatigué(e)', '🙏 reconnaissant(e)', '💪 motivé(e)', '😍 amoureux(se)', '🤒 malade'];
  const [storyReactors, setStoryReactors] = useState(null);   // null | [{uid,name,photo,emoji}]
  const storyFileRef = useRef();

  // ── Suggestions d'amis ──
  const [suggestions, setSuggestions] = useState([]);

  const lpTimer = useRef(null);
  const lpFired = useRef(false);

  const [posts, setPosts]           = useState([]);
  // ── Lecture audio du fil (une seule piste à la fois) ──
  const [followedArtists, setFollowedArtists] = useState([]);
  useEffect(() => {
    if (!currentUser) return;
    const unsub = onSnapshot(collection(db, 'artists'), snap => {
      setFollowedArtists(snap.docs.filter(d => (d.data().followers || []).includes(currentUser.uid)).map(d => d.id));
    }, () => {});
    return () => unsub();
  }, [currentUser]);
  async function toggleFollowArtist(artistId) {
    if (!artistId || !currentUser) return;
    const on = followedArtists.includes(artistId);
    try { await updateDoc(doc(db, 'artists', artistId), { followers: on ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid) }); } catch {}
  }
  const musicAudioRef = useRef(null);
  const [playingTrackId, setPlayingTrackId] = useState(null);
  function toggleMusic(track) {
    if (!track?.mediaURL) return;
    if (!musicAudioRef.current) musicAudioRef.current = new Audio();
    const a = musicAudioRef.current;
    if (playingTrackId === track.id) { a.pause(); setPlayingTrackId(null); return; }
    a.src = track.mediaURL;
    a.onended = () => setPlayingTrackId(null);
    a.play().catch(() => {});
    setPlayingTrackId(track.id);
  }
  const [reelPosts, setReelPosts]   = useState([]);
  const [openCmt, setOpenCmt]       = useState({});
  const [cmtText, setCmtText]       = useState({});
  const [cmtMedia, setCmtMedia]     = useState({});
  const [showReact, setShowReact]   = useState({});
  const [reactionModal, setRM] = useState(null);
  const [cmtReactionPicker, setCmtReactionPicker] = useState(null);
  const [cmtReactions, setCmtReactions] = useState({});
  const [editPost, setEditPost]     = useState(null);
  const [editContent, setEditContent] = useState('');
  const [textCopyMenu, setTextCopyMenu] = useState(null);   // {id, content}
  const [copyToast, setCopyToast]   = useState(false);
  const textPressTimer = useRef(null);
  const textPressedRef = useRef(false);
  const [postMenu, setPostMenu]     = useState(null);
  const [editCmt, setEditCmt]       = useState(null);
  const [replyTo, setReplyTo]       = useState({});

  const photoRef = useRef(); const videoRef = useRef();
  const cPhotoRef = useRef({}); const cVideoRef = useRef({});

  // Close menus on outside click
  useEffect(() => {
    const fn = () => setPostMenu(null);
    document.addEventListener('click', fn);
    return () => document.removeEventListener('click', fn);
  }, []);

  // Groupes publics (pour les suggestions du fil)
  useEffect(() => {
    const q = query(collection(db, 'groups'), where('type', '==', 'page'));
    return onSnapshot(q, snap => setPageGroups(snap.docs.map(d => ({ id: d.id, ...d.data() }))), () => {});
  }, []);

  // Stories des dernières 24h, groupées par utilisateur
  useEffect(() => {
    const q = query(collection(db, 'stories'), orderBy('ts', 'desc'), limit(150));
    return onSnapshot(q, snap => {
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      const fresh = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(st => (st.ts || 0) > cutoff);
      const byUser = {};
      fresh.forEach(st => {
        if (!byUser[st.uid]) byUser[st.uid] = { uid: st.uid, name: st.authorName, photo: st.authorPhoto || '', items: [] };
        byUser[st.uid].items.push(st);
      });
      Object.values(byUser).forEach(g => g.items.sort((a, b) => (a.ts || 0) - (b.ts || 0)));
      // Ma story en premier
      const list = Object.values(byUser).sort((a, b) => (a.uid === currentUser?.uid ? -1 : b.uid === currentUser?.uid ? 1 : 0));
      setStoryGroups(list);
    }, () => {});
  }, [currentUser]);

  // Suggestions d'amis (personnes non amies)
  useEffect(() => {
    if (!currentUser || !userProfile) return;
    let alive = true;
    getDocs(collection(db, 'users')).then(snap => {
      if (!alive) return;
      const friends = userProfile.friends || [];
      const sent = userProfile.sentRequests || [];
      const list = snap.docs
        .map(d => ({ uid: d.id, ...d.data() }))
        .filter(u => u.uid !== currentUser.uid && u.fullName && !friends.includes(u.uid) && !sent.includes(u.uid));
      // Mélange léger
      for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
      setSuggestions(list.slice(0, 20));
    }).catch(() => {});
    return () => { alive = false; };
  }, [currentUser, userProfile?.friends?.length]);

  // Load posts
  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(20));
    return onSnapshot(q, snap => {
      const blocked = userProfile?.blocked || [];
      const myFriends = userProfile?.friends || [];
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .filter(p => !blocked.includes(p.uid))
        // 🔒 Audience "Amis" : hita amin'ny tompony sy ny namany ihany
        .filter(p => p.uid === currentUser?.uid || (p.audience === 'friends' ? myFriends.includes(p.uid) : p.audience !== 'me'));
      const now = new Date();
      const sorted = [...all].sort((a, b) => {
        const aB = a.isBoosted && a.boostUntil && new Date(a.boostUntil) > now;
        const bB = b.isBoosted && b.boostUntil && new Date(b.boostUntil) > now;
        return (aB && !bB) ? -1 : (!aB && bB) ? 1 : 0;
      });
      setPosts(sorted);
      setReelPosts(all.filter(p => p.mediaType === 'video' && p.mediaURL));
    });
  }, []);

  const [multiPhotos, setMultiPhotos] = useState([]);   // File[] — mode "plusieurs photos" (2 à 10)
  function handleMedia(e, type) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const allowed = type === 'image'
      ? ['image/jpeg','image/png','image/gif','image/webp']
      : ['video/mp4','video/webm','video/quicktime'];

    if (type === 'image' && files.length > 1) {
      const valid = files.filter(f => allowed.includes(f.type)).slice(0, 10);
      setMultiPhotos(valid);
      setMF(null); setMP(null); setMT('');
      e.target.value = '';
      return;
    }

    const file = files[0];
    if (!allowed.includes(file.type)) { alert('Type non accepté'); return; }
    setMultiPhotos([]);
    // no size limit
    setMF(file); setMT(type); setMP(URL.createObjectURL(file));
  }
  function removeMedia() { setMF(null); setMP(null); setMT(''); setMultiPhotos([]); }
  function removeOnePhoto(idx) { setMultiPhotos(p => p.filter((_, i) => i !== idx)); }

  async function createPost() {
    if (!content.trim() && !mediaFile && multiPhotos.length === 0) return;
    if (content.length > MAX_POST) return;
    if (isSale) {
      const p = parseFloat(price);
      if (isNaN(p) || p <= 0 || p > MAX_PRICE) { alert('Prix invalide'); return; }
    }
    setPosting(true); setUploadPct(0);

    // Sary raikitra ny votoaty (snapshot) — ilaina amin'ny arrière-plan
    const fields = {
      uid: currentUser.uid, authorName: userProfile.fullName,
      authorUsername: userProfile.username, authorPhoto: userProfile.photoURL || '',
      authorIsVip: userProfile.isVip || false,
      content: content.trim().slice(0, MAX_POST),
      isSale, price: isSale ? parseFloat(price) : '',
      contact: isSale ? contact.trim() : '', lieu: isSale ? lieu.trim() : '', saleCategory: isSale ? saleCategory : '',
      audience,
      location: postLocation.trim(), mood: postMood, allowMessages,
      isDecree,
      taggedUids: Object.keys(composerTagSel).filter(k => composerTagSel[k]),
      taggedNames: composerTagList.filter(f => composerTagSel[f.uid]).map(f => f.fullName),
    };
    // Miniature an'ny vidéo (poster) — alaina eto an-toerana, haingana
    let thumbFile = null;
    if (mediaFile && mediaFile.type.startsWith('video/')) {
      try { thumbFile = await captureVideoThumb(mediaFile); } catch {}
    }
    const friendTargets = userProfile.friends || [];
    const authorName = userProfile.fullName;
    const authorPhoto = userProfile.photoURL || '';
    const myUid = currentUser.uid;

    async function publishPost(mediaURL, finalMT) {
      let thumbURL = '';
      if (thumbFile && finalMT === 'video') {
        try { const tr = await uploadToTelegram(thumbFile); thumbURL = tr.url || ''; } catch {}
      }
      const postRef = await addDoc(collection(db, 'posts'), {
        ...fields, mediaURL, mediaType: finalMT, thumbURL,
        reactions: {}, comments: [], createdAt: serverTimestamp(),
      });
      if (friendTargets.length > 0) {
        const batch = writeBatch(db);
        friendTargets.forEach(fUid => batch.set(doc(collection(db,'notifications')), {
          toUid: fUid, fromUid: myUid,
          fromName: authorName, fromPhoto: authorPhoto,
          type: 'post', postId: postRef.id,
          message: `${authorName} a publié un nouveau post`,
          read: false, createdAt: serverTimestamp(),
        }));
        await batch.commit();
      }
    }

    // ── Plusieurs photos (2 à 10) : upload séquentiel, mediaURLs[] ──
    if (multiPhotos.length > 0) {
      try {
        const urls = [];
        for (let i = 0; i < multiPhotos.length; i++) {
          const r = await uploadToTelegram(multiPhotos[i], pct => setUploadPct(Math.round(((i + pct / 100) / multiPhotos.length) * 100)));
          urls.push(r.url);
        }
        const postRef = await addDoc(collection(db, 'posts'), {
          ...fields, mediaURL: urls[0], mediaType: 'image', mediaURLs: urls, thumbURL: '',
          reactions: {}, comments: [], createdAt: serverTimestamp(),
        });
        if (friendTargets.length > 0) {
          const batch = writeBatch(db);
          friendTargets.forEach(fUid => batch.set(doc(collection(db,'notifications')), {
            toUid: fUid, fromUid: myUid, fromName: authorName, fromPhoto: authorPhoto,
            type: 'post', postId: postRef.id, message: `${authorName} a publié un nouveau post`,
            read: false, createdAt: serverTimestamp(),
          }));
          await batch.commit();
        }
        setContent(''); removeMedia(); setIsSale(false); setPrice(''); setContact(''); setLieu(''); setAudience('public'); setPostLocation(''); setPostMood(''); setAllowMessages(true); setComposerTagSel({}); setPublishFullOpen(false); setIsDecree(false);
      } catch (err) { console.error(err); alert('Erreur lors de la publication'); }
      setPosting(false); setUploadPct(0);
      return;
    }

    // ── Vidéo > 12 Mo : upload ARRIÈRE-PLAN (afaka mifindra page) ──
    if (mediaFile && mediaFile.type.startsWith('video/') && mediaFile.size > 12 * 1024 * 1024) {
      const started = startBackgroundUpload(mediaFile, 'Vidéo', async r => {
        await publishPost(r.url, 'video');
      });
      setPosting(false); setUploadPct(0);
      if (started) {
        setContent(''); removeMedia(); setIsSale(false); setPrice(''); setContact(''); setLieu(''); setAudience('public'); setPostLocation(''); setPostMood(''); setAllowMessages(true); setComposerTagSel({}); setPublishFullOpen(false); setIsDecree(false);
      }
      return;
    }

    try {
      let mediaURL = '', finalMT = mediaType;
      if (mediaFile) {
        const r = await uploadToTelegram(mediaFile, pct => setUploadPct(pct));
        mediaURL = r.url; finalMT = r.type === 'video' ? 'video' : 'image';
      }
      await publishPost(mediaURL, finalMT);
      setContent(''); removeMedia(); setIsSale(false); setPrice(''); setContact(''); setLieu(''); setAudience('public'); setPostLocation(''); setPostMood(''); setAllowMessages(true); setComposerTagSel({}); setPublishFullOpen(false); setIsDecree(false);
    } catch (err) { console.error(err); alert('Erreur lors de la publication'); }
    setPosting(false); setUploadPct(0);
  }

  async function reactToCmt(postId, cmtId, emoji) {
    if (!REACTIONS.includes(emoji)) return;
    const post = posts.find(p => p.id === postId); if (!post) return;
    const updated = post.comments.map(c => {
      if (c.id !== cmtId) return c;
      const reactions = c.reactions || {};
      const my = reactions[currentUser.uid];
      if (my === emoji) { const u = {...reactions}; delete u[currentUser.uid]; return {...c, reactions: u}; }
      return {...c, reactions: {...reactions, [currentUser.uid]: emoji}};
    });
    await updateDoc(doc(db,"posts",postId), { comments: updated });
    setCmtReactionPicker(null);
  }

  async function reactToPost(postId, emoji) {
    if (!REACTIONS.includes(emoji)) return;
    const post = posts.find(p => p.id === postId); if (!post) return;
    const reactions = post.reactions || {};
    const my = reactions[currentUser.uid];
    if (my === emoji) {
      const u = { ...reactions }; delete u[currentUser.uid];
      await updateDoc(doc(db,'posts',postId), { reactions: u });
    } else {
      await updateDoc(doc(db,'posts',postId), { [`reactions.${currentUser.uid}`]: emoji });
      if (post.uid !== currentUser.uid) {
        await addDoc(collection(db,'notifications'), {
          toUid: post.uid, fromUid: currentUser.uid,
          fromName: userProfile.fullName, fromPhoto: userProfile.photoURL || '',
          type: 'reaction', postId, emoji,
          message: `${userProfile.fullName} a réagi ${emoji} à votre publication`,
          read: false, createdAt: serverTimestamp(),
        });
        sendPushNotification({ toExternalId: post.uid, title: userProfile.fullName, message: `a réagi ${emoji}`, data: { type:'reaction', postId } });
      }
    }
    setShowReact(p => ({ ...p, [postId]: false }));
  }

  async function openReactionModal(post) {
    const reactions = post.reactions || {};
    if (!Object.keys(reactions).length) return;
    const userData = {};
    await Promise.all(Object.keys(reactions).map(async uid => {
      try {
        const s = await getDoc(doc(db,'users',uid));
        userData[uid] = s.exists() ? { name: s.data().fullName, photo: s.data().photoURL } : { name: uid, photo: '' };
      } catch { userData[uid] = { name: uid, photo: '' }; }
    }));
    setRM({ reactions, userData });
  }

  async function addComment(postId) {
    const rt = replyTo[postId];
    const raw = rt ? `@${rt} ${cmtText[postId]||''}` : (cmtText[postId]||'');
    const text = raw.trim(); const media = cmtMedia[postId];
    if (!text && !media) return;
    if (text.length > MAX_COMMENT) return;
    let mediaURL = '', cMT = '';
    if (media) { try { const r = await uploadToTelegram(media.file); mediaURL = r.url; cMT = r.type; } catch {} }
    const post = posts.find(p => p.id === postId);
    const cmt = {
      id: uuidv4(), uid: currentUser.uid,
      authorName: userProfile.fullName, authorPhoto: userProfile.photoURL || '',
      authorIsVip: userProfile.isVip || false,
      text: text.slice(0, MAX_COMMENT), mediaURL, mediaType: cMT,
      createdAt: new Date().toISOString(),
    };
    await updateDoc(doc(db,'posts',postId), { comments: arrayUnion(cmt) });
    setCmtText(p => ({ ...p, [postId]: '' }));
    setCmtMedia(p => ({ ...p, [postId]: null }));
    setReplyTo(p => ({ ...p, [postId]: null }));
    if (post && post.uid !== currentUser.uid) {
      await addDoc(collection(db,'notifications'), {
        toUid: post.uid, fromUid: currentUser.uid,
        fromName: userProfile.fullName, fromPhoto: userProfile.photoURL || '',
        type: 'comment', postId,
        message: `${userProfile.fullName} a commenté votre publication`,
        read: false, createdAt: serverTimestamp(),
      });
      sendPushNotification({ toExternalId: post.uid, title: userProfile.fullName, message: text?`a commenté : "${text.slice(0,50)}"`:' a commenté', data: { type:'comment', postId } });
    }
  }

  async function deleteCmt(postId, cmt) {
    const post = posts.find(p => p.id === postId);
    if (cmt.uid !== currentUser.uid && post?.uid !== currentUser.uid) return;
    if (!window.confirm('Supprimer ce commentaire ?')) return;
    await updateDoc(doc(db,'posts',postId), { comments: arrayRemove(cmt) });
  }

  async function saveEditCmt(postId, oldCmt, newText) {
    if (!newText.trim()) return;
    const post = posts.find(p => p.id === postId); if (!post) return;
    const updated = post.comments.map(c => c.id === oldCmt.id ? { ...c, text: newText.trim() } : c);
    await updateDoc(doc(db,'posts',postId), { comments: updated });
    setEditCmt(null);
  }

  async function deletePost(postId) {
    const post = posts.find(p => p.id === postId);
    if (!post || post.uid !== currentUser.uid) return;
    if (!window.confirm('Supprimer cette publication ?')) return;
    await deleteDoc(doc(db,'posts',postId));
  }

  function isFollowingUid(uid) { return (userProfile?.following || []).includes(uid); }
  async function toggleFollowAuthor(uid, name) {
    const already = isFollowingUid(uid);
    try {
      await updateDoc(doc(db, 'users', uid), { followers: already ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid) });
      await updateDoc(doc(db, 'users', currentUser.uid), { following: already ? arrayRemove(uid) : arrayUnion(uid) });
      setUserProfile(p => ({ ...p, following: already ? (p.following||[]).filter(u=>u!==uid) : [...(p.following||[]), uid] }));
      if (!already) {
        await addDoc(collection(db, 'notifications'), {
          toUid: uid, fromUid: currentUser.uid, fromName: userProfile.fullName, fromPhoto: userProfile.photoURL || '',
          type: 'general', message: `${userProfile.fullName} s'est abonné(e) à votre profil`, read: false, createdAt: serverTimestamp(),
        });
      }
    } catch (err) { alert('Erreur : ' + (err?.message || err)); }
  }

  async function reportPost(post) {
    if (!window.confirm('Signaler cette publication aux administrateurs ?')) return;
    try {
      await addDoc(collection(db, 'reports'), {
        type: 'post', targetId: post.id, targetUid: post.uid, targetAuthor: post.authorName,
        reportedBy: currentUser.uid, reportedByName: userProfile.fullName,
        createdAt: serverTimestamp(), status: 'pending',
      });
      alert('Signalement envoyé. Merci.');
    } catch (err) { alert('Erreur : ' + (err?.message || err)); }
  }

  async function toggleBlockAuthor(post) {
    const already = (userProfile?.blocked || []).includes(post.uid);
    const msg = already ? `Débloquer ${post.authorName} ?` : `Bloquer ${post.authorName} ? Vous ne verrez plus ses publications.`;
    if (!window.confirm(msg)) return;
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        blocked: already ? arrayRemove(post.uid) : arrayUnion(post.uid),
      });
      setUserProfile(p => ({ ...p, blocked: already ? (p.blocked||[]).filter(u=>u!==post.uid) : [...(p.blocked||[]), post.uid] }));
    } catch (err) { alert('Erreur : ' + (err?.message || err)); }
  }

  function showAudienceInfo(post) {
    alert(post.audience === 'friends' ? "Cette publication est visible par ses amis uniquement." : "Cette publication est publique.");
  }

  const [tagModalPost, setTagModalPost] = useState(null);
  const [tagSelected, setTagSelected] = useState({});
  const [tagFriendsList, setTagFriendsList] = useState([]);
  async function openComposerTagModal() {
    setComposerTagOpen(true);
    const myFriends = userProfile?.friends || [];
    const list = await Promise.all(myFriends.map(uid =>
      getDoc(doc(db, 'users', uid)).then(sn => sn.exists() ? { uid, ...sn.data() } : null).catch(() => null)
    ));
    setComposerTagList(list.filter(Boolean));
  }

  async function openTagModal(post) {
    setTagModalPost(post);
    const init = {}; (post.taggedUids || []).forEach(u => { init[u] = true; });
    setTagSelected(init);
    const myFriends = userProfile?.friends || [];
    const list = await Promise.all(myFriends.map(uid =>
      getDoc(doc(db, 'users', uid)).then(sn => sn.exists() ? { uid, ...sn.data() } : null).catch(() => null)
    ));
    setTagFriendsList(list.filter(Boolean));
  }
  async function saveTags() {
    if (!tagModalPost) return;
    const uids = Object.keys(tagSelected).filter(k => tagSelected[k]);
    const names = tagFriendsList.filter(f => uids.includes(f.uid)).map(f => f.fullName);
    try { await updateDoc(doc(db, 'posts', tagModalPost.id), { taggedUids: uids, taggedNames: names }); setTagModalPost(null); }
    catch (err) { alert('Erreur : ' + (err?.message || err)); }
  }

  async function saveEditPost() {
    if (!editContent.trim() || !editPost || editPost.uid !== currentUser.uid) return;
    await updateDoc(doc(db,'posts',editPost.id), { content: editContent.trim().slice(0,MAX_POST) });
    setEditPost(null);
  }

  function sharePost(post) {
    setShareModalPost(post);
  }

  function countReactions(r = {}) {
    const c = {}; Object.values(r).forEach(e => { c[e] = (c[e]||0)+1; }); return c;
  }

  function isFriend(uid) { return (userProfile?.friends||[]).includes(uid); }
  function hasSentReq(uid) { return (userProfile?.sentRequests||[]).includes(uid); }

  async function sendFriendReq(toUid, toName) {
    if (isFriend(toUid) || hasSentReq(toUid)) return;
    await addDoc(collection(db,'friendRequests'), {
      fromUid: currentUser.uid, toUid,
      fromName: userProfile.fullName, fromPhoto: userProfile.photoURL||'',
      status: 'pending', createdAt: serverTimestamp(),
    });
    await updateDoc(doc(db,'users',currentUser.uid), { sentRequests: arrayUnion(toUid) });
    setUserProfile(p=>({...p, sentRequests:[...(p.sentRequests||[]),toUid]}));
    await addDoc(collection(db,'notifications'), {
      toUid, fromUid: currentUser.uid,
      fromName: userProfile.fullName, fromPhoto: userProfile.photoURL||'',
      type: 'friendRequest',
      message: `${userProfile.fullName} vous a envoyé une demande d'ami`,
      read: false, createdAt: serverTimestamp(),
    });
    sendPushNotification({ toExternalId: toUid, title: userProfile.fullName, message:"vous a envoyé une demande d'ami 👥", data:{ type:'friendRequest' } });
  }

  // ── Enregistrer / retirer publication ──
  async function toggleSave(postId) {
    const saved = userProfile?.saved || [];
    const isSaved = saved.includes(postId);
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), { saved: isSaved ? arrayRemove(postId) : arrayUnion(postId) });
      setUserProfile(p => ({ ...p, saved: isSaved ? (p.saved||[]).filter(id => id !== postId) : [...(p.saved||[]), postId] }));
    } catch (err) { alert('Erreur : ' + (err?.message || err)); }
  }

  // ── Stories ──
  async function addStory(e) {
    const file = e.target.files[0]; if (!file) return;
    const okTypes = ['image/jpeg','image/png','image/gif','image/webp','video/mp4','video/webm','video/quicktime'];
    if (!okTypes.includes(file.type)) { alert('Type non accepté'); return; }
    setAddingStory(true);
    try {
      let finalFile = file;
      if (file.type.startsWith('video/')) {
        // Vidéo story : 30 segondra farafahabetsany — raccourci ho azy raha mihoatra
        const trimmed = await trimVideoTo30s(file);
        if (trimmed) finalFile = trimmed;
      }
      const r = await uploadToTelegram(finalFile);
      await addDoc(collection(db, 'stories'), {
        uid: currentUser.uid,
        authorName: userProfile.fullName,
        authorPhoto: userProfile.photoURL || '',
        mediaURL: r.url,
        mediaType: r.type === 'video' ? 'video' : 'image',
        ts: Date.now(),
        createdAt: serverTimestamp(),
      });
    } catch (err) { alert('Erreur story : ' + (err?.message || err)); }
    setAddingStory(false);
    if (e.target) e.target.value = '';
    e.target.value = '';
  }

  // ── Story texte (fond en couleur, format Facebook) ──
  const STORY_BG_COLORS = [
    'linear-gradient(135deg,#1877F2,#63A9FF)',
    'linear-gradient(135deg,#FF2D8D,#FF7AB8)',
    'linear-gradient(135deg,#F2B300,#FFE066)',
    'linear-gradient(135deg,#8F6BFF,#B49BFF)',
    'linear-gradient(135deg,#12A48D,#3DD9C4)',
    'linear-gradient(135deg,#FF7A00,#FF9A3D)',
    '#050505',
  ];
  const [textStoryOpen,  setTextStoryOpen]  = useState(false);
  const [textStoryValue, setTextStoryValue] = useState('');
  const [textStoryBg,    setTextStoryBg]    = useState(STORY_BG_COLORS[0]);
  const [postingTextStory, setPostingTextStory] = useState(false);

  async function publishTextStory() {
    if (!textStoryValue.trim()) return;
    setPostingTextStory(true);
    try {
      await addDoc(collection(db, 'stories'), {
        uid: currentUser.uid,
        authorName: userProfile.fullName,
        authorPhoto: userProfile.photoURL || '',
        mediaType: 'text',
        text: textStoryValue.trim().slice(0, 280),
        bgColor: textStoryBg,
        ts: Date.now(),
        createdAt: serverTimestamp(),
      });
      setTextStoryOpen(false); setTextStoryValue(''); setTextStoryBg(STORY_BG_COLORS[0]);
    } catch (err) { alert('Erreur story : ' + (err?.message || err)); }
    setPostingTextStory(false);
  }

  async function deleteStory(st) {
    if (st.uid !== currentUser.uid) return;
    if (!window.confirm('Supprimer cette story ?')) return;
    await deleteDoc(doc(db, 'stories', st.id));
    setStoryViewer(null);
  }

  // ── Répondre à une story = hafatra mivantana any amin'ny DM an'ilay tompony ──
  const [storyReply, setStoryReply] = useState('');
  const [sendingStoryReply, setSendingStoryReply] = useState(false);
  async function sendStoryReply(st) {
    if (!storyReply.trim() || st.uid === currentUser.uid) return;
    setSendingStoryReply(true);
    try {
      const chatId = getChatId(currentUser.uid, st.uid);
      const preview = st.mediaType === 'text' ? (st.text || '').slice(0, 40) : (st.mediaType === 'video' ? '🎬 Vidéo' : '📷 Photo');
      await dbPush(dbRef(rtdb, `conversations/${chatId}/messages`), {
        fromUid: currentUser.uid, toUid: st.uid,
        fromName: userProfile.fullName, fromPhoto: userProfile.photoURL || '',
        text: `↪️ En réponse à votre story (${preview}) : ${storyReply.trim()}`,
        ts: Date.now(), read: false,
      });
      await dbUpdate(dbRef(rtdb, `conversations/${chatId}/meta`), {
        lastMessage: storyReply.trim(), lastTs: Date.now(),
      }).catch(() => {});
      setStoryReply('');
    } catch (err) { alert('Erreur : ' + (err?.message || err)); }
    setSendingStoryReply(false);
  }

  function openStories(group) {
    setStoryViewer({ group, index: 0 });
  }

  // ── Fanamarihana fa hitan'ilay olona ny story (Vu) ──
  async function markStoryViewed(st) {
    if (!st || st.uid === currentUser.uid) return;
    if ((st.viewers || []).includes(currentUser.uid)) return;
    try { await updateDoc(doc(db, 'stories', st.id), { viewers: arrayUnion(currentUser.uid) }); } catch {}
  }

  // ── Réactions amin'ny story : AFAKA maro (toy Facebook) — array isaky ny olona ──
  const [flyingEmojis, setFlyingEmojis] = useState([]);
  async function reactToStory(st, emoji, evt) {
    const mine = st.reactions?.[currentUser.uid] || [];
    const already = mine.includes(emoji);
    try {
      await updateDoc(doc(db, 'stories', st.id), {
        [`reactions.${currentUser.uid}`]: already ? mine.filter(e => e !== emoji) : [...mine, emoji],
      });
      if (!already) {
        // ── Animation : emoji miakatra sy manjavona (format story Facebook) ──
        const fid = Date.now() + Math.random();
        const x = evt?.clientX ?? window.innerWidth / 2;
        setFlyingEmojis(p => [...p, { id: fid, emoji, x }]);
        setTimeout(() => setFlyingEmojis(p => p.filter(f => f.id !== fid)), 1200);
      }
    } catch (err) { console.error('story react:', err?.message || err); }
  }

  // ── Lisitry ny "Vu" + réactions (mitambatra, ho an'ny tompony) ──
  async function openStoryReactors(st) {
    const uids = [...new Set([...(st.viewers || []), ...Object.keys(st.reactions || {})])];
    setStoryReactors([]);
    const list = await Promise.all(uids.slice(0, 80).map(uid =>
      getDoc(doc(db, 'users', uid)).then(sn => sn.exists()
        ? { uid, emojis: st.reactions?.[uid] || [], name: sn.data().fullName, photo: sn.data().photoURL || '' }
        : null).catch(() => null)
    ));
    // Ny nanao réaction voalohany, avy eo ny nijery fotsiny
    list.sort((a, b) => (b?.emojis.length || 0) - (a?.emojis.length || 0));
    setStoryReactors(list.filter(Boolean));
  }
  function nextStory() {
    setStoryViewer(v => {
      if (!v) return null;
      if (v.index + 1 < v.group.items.length) return { ...v, index: v.index + 1 };
      const gi = storyGroups.findIndex(g => g.uid === v.group.uid);
      if (gi >= 0 && gi + 1 < storyGroups.length) return { group: storyGroups[gi + 1], index: 0 };
      return null;
    });
  }
  function prevStory() {
    setStoryViewer(v => {
      if (!v) return null;
      if (v.index > 0) return { ...v, index: v.index - 1 };
      return v;
    });
  }

  // Appui long sur le texte d'une publication = menu "Copier le texte"
  function startTextPress(e, post) {
    textPressedRef.current = false;
    clearTimeout(textPressTimer.current);
    textPressTimer.current = setTimeout(() => {
      textPressedRef.current = true;
      setTextCopyMenu({ id: post.id, content: post.content });
    }, 500);
  }
  function endTextPress() {
    clearTimeout(textPressTimer.current);
  }
  async function copyPostText(txt) {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(txt);
      else {
        const ta = document.createElement('textarea');
        ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        document.execCommand('copy'); document.body.removeChild(ta);
      }
      setTextCopyMenu(null);
      setCopyToast(true);
      setTimeout(() => setCopyToast(false), 1600);
    } catch { setTextCopyMenu(null); }
  }

  // Appui long = pause (tsy manao next). Tap fohy (<250ms) = navigate (prev/next).
  function startStoryPress() {
    storyPressedRef.current = false;
    clearTimeout(storyPressTimer.current);
    storyPressTimer.current = setTimeout(() => {
      storyPressedRef.current = true;      // appui long détecté -> pause
      setStoryPaused(true);
      try { storyVideoRef.current?.pause(); } catch {}
    }, 250);
  }
  function endStoryPress(navFn) {
    clearTimeout(storyPressTimer.current);
    if (storyPressedRef.current) {
      // C'était un appui long -> on relâche : reprendre la lecture, PAS de navigation
      setStoryPaused(false);
      try { storyVideoRef.current?.play(); } catch {}
    } else {
      // Tap court -> navigation (prev/next)
      if (navFn) navFn();
    }
    storyPressedRef.current = false;
  }

  // Avance automatique des images (5s) — mijanona raha appui long (pause)
  useEffect(() => {
    if (!storyViewer || storyPaused) return;
    const cur = storyViewer.group.items[storyViewer.index];
    if (!cur || cur.mediaType === 'video') return;
    const tm = setTimeout(nextStory, 5000);
    return () => clearTimeout(tm);
  }, [storyViewer, storyPaused]);

  // ✅ Marquer "Vu" rehefa miseho ny story (raha tsy anao)
  useEffect(() => {
    if (!storyViewer) return;
    setStoryPaused(false);   // reset pause rehefa miova story
    const cur = storyViewer.group.items[storyViewer.index];
    if (cur) markStoryViewed(cur);
  }, [storyViewer]);

  // ── J'aime rapide (clic) + appui long = choix de réaction (format Facebook) ──
  function quickLike(post) {
    if (lpFired.current) { lpFired.current = false; return; }
    const myR = post.reactions?.[currentUser.uid];
    reactToPost(post.id, myR || '👍');
  }
  function startLongPress(postId) {
    lpFired.current = false;
    lpTimer.current = setTimeout(() => { lpFired.current = true; setShowReact(p => ({ ...p, [postId]: true })); }, 450);
  }
  function endLongPress() { clearTimeout(lpTimer.current); }

  const rem = MAX_POST - content.length;
  const charColor = rem < 50 ? '#ef4444' : rem < 200 ? '#f97316' : '#65676B';

  return (
    <div style={{ padding:0 }}>

      {/* ── Stories (format Facebook) ─────────────────────────── */}
      <div className="stories-strip">
        {/* Carte : Créer une story (menu unifié : texte / photo / vidéo) */}
        <input ref={storyFileRef} type="file" accept="image/*,video/mp4,video/webm,video/quicktime" style={{ display:'none' }} onChange={addStory} />
        <div className="story-card" onClick={() => !addingStory && setCreateStoryMenuOpen(true)} style={{ background:'white', border:'1px solid #E4E6EB' }}>
          <div style={{ height:'62%', overflow:'hidden' }}>
            <img src={userProfile?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile?.fullName||'U')}&background=1877F2&color=fff`}
              alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
          </div>
          <div style={{ position:'absolute', top:'62%', left:'50%', transform:'translate(-50%,-50%)', width:34, height:34, borderRadius:'50%', background:'#1877F2', border:'3.5px solid white', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:20, fontWeight:700 }}>+</div>
          <p style={{ position:'absolute', bottom:8, left:0, right:0, textAlign:'center', fontSize:11, fontWeight:600, color:'#050505' }}>
            {addingStory ? 'Envoi...' : 'Créer une story'}
          </p>
        </div>

        {/* Stories des utilisateurs */}
        {storyGroups.map(g => {
          const last = g.items[g.items.length - 1];
          return (
            <div key={g.uid} className="story-card" onClick={() => openStories(g)} style={last.mediaType === 'text' ? { background: last.bgColor || '#1877F2' } : undefined}>
              {last.mediaType === 'video'
                ? <video src={last.mediaURL} muted playsInline preload="metadata" />
                : last.mediaType === 'text'
                ? <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', padding:10 }}>
                    <p style={{ color:'white', fontSize:13, fontWeight:700, textAlign:'center', overflow:'hidden', display:'-webkit-box', WebkitLineClamp:5, WebkitBoxOrient:'vertical' }}>{last.text}</p>
                  </div>
                : <img src={last.mediaURL} alt="" />}
              <div className="story-gradient" />
              <img className="story-avatar"
                src={g.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(g.name||'U')}&background=1877F2&color=fff`} alt="" />
              <span className="story-name">{g.uid === currentUser.uid ? 'Votre story' : g.name?.split(' ')[0]}</span>
            </div>
          );
        })}
      </div>

      {/* ── Bottom sheet : Créer une story (choix texte / photo / vidéo) ── */}
      {createStoryMenuOpen && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:400, display:'flex', alignItems:'flex-end', justifyContent:'center' }} onClick={() => setCreateStoryMenuOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background:'white', borderRadius:'20px 20px 0 0', width:'100%', maxWidth:520, padding:'10px 0 22px' }}>
            <div style={{ width:40, height:4, borderRadius:2, background:'#CED0D4', margin:'6px auto 12px' }} />
            <p style={{ fontWeight:800, fontSize:17, textAlign:'center', marginBottom:14, color:'#050505' }}>Créer une story</p>
            <button onClick={() => { setCreateStoryMenuOpen(false); setTextStoryOpen(true); }}
              style={{ width:'100%', display:'flex', alignItems:'center', gap:14, padding:'14px 22px', background:'none', border:'none', cursor:'pointer', textAlign:'left' }}>
              <span className="icon-badge-3d" style={{ width:44, height:44, borderRadius:13, background:'linear-gradient(145deg,#8F7BFF,#5E4BDB)', flexShrink:0 }}>
                <span style={{ color:'white', fontSize:22, fontWeight:800 }}>Aa</span>
              </span>
              <span><span style={{ display:'block', fontWeight:700, fontSize:15, color:'#050505' }}>Texte</span><span style={{ display:'block', fontSize:12, color:'#65676B' }}>Fond en couleur</span></span>
            </button>
            <button onClick={() => { setCreateStoryMenuOpen(false); storyFileRef.current.accept='image/*'; storyFileRef.current.click(); }}
              style={{ width:'100%', display:'flex', alignItems:'center', gap:14, padding:'14px 22px', background:'none', border:'none', cursor:'pointer', textAlign:'left' }}>
              <span className="icon-badge-3d" style={{ width:44, height:44, borderRadius:13, background:'linear-gradient(145deg,#3DD9C4,#12A48D)', flexShrink:0 }}>
                <HiPhotograph size={22} color="white" />
              </span>
              <span><span style={{ display:'block', fontWeight:700, fontSize:15, color:'#050505' }}>Photo</span><span style={{ display:'block', fontSize:12, color:'#65676B' }}>Depuis votre galerie</span></span>
            </button>
            <button onClick={() => { setCreateStoryMenuOpen(false); storyFileRef.current.accept='video/mp4,video/webm,video/quicktime'; storyFileRef.current.click(); }}
              style={{ width:'100%', display:'flex', alignItems:'center', gap:14, padding:'14px 22px', background:'none', border:'none', cursor:'pointer', textAlign:'left' }}>
              <span className="icon-badge-3d" style={{ width:44, height:44, borderRadius:13, background:'linear-gradient(145deg,#FF6FA5,#FF2D8D)', flexShrink:0 }}>
                <HiVideoCamera size={22} color="white" />
              </span>
              <span><span style={{ display:'block', fontWeight:700, fontSize:15, color:'#050505' }}>Vidéo</span><span style={{ display:'block', fontSize:12, color:'#65676B' }}>30 secondes max</span></span>
            </button>
          </div>
        </div>
      )}

      {/* ── Modal : Créer une story texte ──────────────────────── */}
      {textStoryOpen && (
        <div style={{ position:'fixed', inset:0, background: textStoryBg, zIndex:350, display:'flex', flexDirection:'column' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 16px' }}>
            <button onClick={() => setTextStoryOpen(false)} style={{ background:'rgba(255,255,255,.2)', border:'none', borderRadius:'50%', width:36, height:36, cursor:'pointer', color:'white', display:'flex', alignItems:'center', justifyContent:'center' }}><HiX size={20}/></button>
            <button onClick={publishTextStory} disabled={postingTextStory || !textStoryValue.trim()} className="btn-gold" style={{ padding:'9px 22px', fontSize:14 }}>
              {postingTextStory ? '...' : 'Publier'}
            </button>
          </div>
          <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
            <textarea autoFocus value={textStoryValue} onChange={e => setTextStoryValue(e.target.value)} placeholder="Écrivez quelque chose..." maxLength={280}
              style={{ width:'100%', background:'none', border:'none', outline:'none', color:'white', fontSize:28, fontWeight:800, textAlign:'center', resize:'none', height:200, fontFamily:'Poppins' }} />
          </div>
          <div style={{ display:'flex', gap:10, padding:'16px 20px 28px', overflowX:'auto', justifyContent:'center' }}>
            {STORY_BG_COLORS.map((bg, i) => (
              <button key={i} onClick={() => setTextStoryBg(bg)}
                style={{ width:36, height:36, borderRadius:'50%', background:bg, border: textStoryBg===bg ? '3px solid white' : '2px solid rgba(255,255,255,.4)', cursor:'pointer', flexShrink:0 }} />
            ))}
          </div>
        </div>
      )}

      {/* ── Visionneuse de story (plein écran) ─────────────────── */}
      {storyViewer && (() => {
        const raw = storyViewer.group.items[storyViewer.index];
        // Version "fraîche" (mivantana avy amin'ny snapshot) mba hita avy hatrany ny réactions
        const cur = storyGroups.find(g => g.uid === storyViewer.group.uid)?.items.find(i => i.id === raw.id) || raw;
        const isMyStory = cur.uid === currentUser.uid;
        const myStoryR = cur.reactions?.[currentUser.uid] || [];
        const rCount = Object.keys(cur.reactions || {}).length;
        const vCount = new Set([...(cur.viewers||[]), ...Object.keys(cur.reactions||{})]).size;
        const allEmojis = Object.values(cur.reactions || {}).flat();
        return (
          <div style={{ position:'fixed', inset:0, background:'#000', zIndex:300, display:'flex', flexDirection:'column' }}>
            {/* Barres de progression */}
            <div style={{ display:'flex', gap:4, padding:'10px 10px 6px' }}>
              {storyViewer.group.items.map((it, i) => (
                <div key={it.id} style={{ flex:1, height:3, borderRadius:2, background: i <= storyViewer.index ? 'white' : 'rgba(255,255,255,.35)' }} />
              ))}
            </div>
            {/* En-tête */}
            <div style={{ display:'flex', alignItems:'center', gap:10, padding:'6px 12px' }}>
              <img src={storyViewer.group.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(storyViewer.group.name||'U')}&background=1877F2&color=fff`}
                alt="" style={{ width:36, height:36, borderRadius:'50%', objectFit:'cover', border:'2px solid #1877F2' }} />
              <p style={{ color:'white', fontWeight:700, fontSize:14, flex:1 }}>{storyViewer.group.name}</p>
              {cur.uid === currentUser.uid && (
                <button onClick={() => deleteStory(cur)} style={{ background:'none', border:'none', cursor:'pointer', color:'white', padding:6 }}><HiTrash size={20} /></button>
              )}
              <button onClick={() => setStoryViewer(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'white', fontSize:24, padding:'0 6px' }}>✕</button>
            </div>
            {/* Média + zones tactiles gauche/droite */}
            <div style={{ flex:1, position:'relative', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', background: cur.mediaType === 'text' ? (cur.bgColor || '#1877F2') : 'transparent' }}>
              {cur.mediaType === 'video'
                ? <video ref={storyVideoRef} key={cur.id} src={cur.mediaURL} autoPlay={!dataSaver} controls={dataSaver} playsInline onEnded={nextStory} style={{ maxWidth:'100%', maxHeight:'100%' }} />
                : cur.mediaType === 'text'
                ? <p style={{ color:'white', fontSize:30, fontWeight:800, textAlign:'center', padding:'0 30px', wordBreak:'break-word' }}>{cur.text}</p>
                : <img key={cur.id} src={cur.mediaURL} alt="" style={{ maxWidth:'100%', maxHeight:'100%', objectFit:'contain' }} />}
              {/* Zone gauche : appui long = pause, tap = précédent */}
              <div
                onPointerDown={() => startStoryPress()}
                onPointerUp={() => endStoryPress(prevStory)}
                onPointerLeave={() => endStoryPress(null)}
                style={{ position:'absolute', left:0, top:0, bottom:0, width:'35%', touchAction:'none' }} />
              {/* Zone droite : appui long = pause, tap = suivant */}
              <div
                onPointerDown={() => startStoryPress()}
                onPointerUp={() => endStoryPress(nextStory)}
                onPointerLeave={() => endStoryPress(null)}
                style={{ position:'absolute', right:0, top:0, bottom:0, width:'65%', touchAction:'none' }} />
            </div>

            {/* ── Répondre (envoie un message direct au propriétaire) ── */}
            {!isMyStory && (
              <div style={{ padding:'0 14px 8px', display:'flex', alignItems:'center', gap:8 }} onClick={e => e.stopPropagation()}>
                <input value={storyReply} onChange={e => setStoryReply(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') sendStoryReply(cur); }}
                  placeholder="Répondre..." maxLength={500}
                  style={{ flex:1, background:'rgba(255,255,255,.15)', border:'1.5px solid rgba(255,255,255,.35)', borderRadius:22, padding:'10px 16px', color:'white', fontSize:14, fontFamily:'Poppins', outline:'none' }} />
                {storyReply.trim() && (
                  <button onClick={() => sendStoryReply(cur)} disabled={sendingStoryReply}
                    style={{ background:'#1877F2', border:'none', borderRadius:'50%', width:40, height:40, cursor:'pointer', color:'white', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <HiPaperAirplane size={18} />
                  </button>
                )}
              </div>
            )}

            {/* ── Réactions (format Facebook, plusieurs possibles) ── */}
            <div style={{ padding:'10px 14px 18px', display:'flex', alignItems:'center', justifyContent:'center', gap:10 }} onClick={e => e.stopPropagation()}>
              {isMyStory ? (
                <button onClick={() => openStoryReactors(cur)}
                  style={{ background:'rgba(255,255,255,.14)', border:'1px solid rgba(255,255,255,.3)', borderRadius:22, padding:'9px 18px', cursor:'pointer', color:'white', fontFamily:'Poppins', fontSize:13, fontWeight:700, display:'flex', alignItems:'center', gap:8 }}>
                  👁 {vCount} vue{vCount>1?'s':''}{rCount > 0 ? ` · ${[...new Set(allEmojis)].slice(0,3).join('')} ${rCount}` : ''} — voir
                </button>
              ) : (
                REACTIONS.map(em => (
                  <button key={em} onClick={e => reactToStory(cur, em, e)}
                    style={{ background: myStoryR.includes(em) ? 'rgba(255,255,255,.32)' : 'rgba(255,255,255,.12)', border: myStoryR.includes(em) ? '1.5px solid white' : '1px solid rgba(255,255,255,.25)', borderRadius:'50%', width:44, height:44, cursor:'pointer', fontSize:22, display:'flex', alignItems:'center', justifyContent:'center', transform: myStoryR.includes(em) ? 'scale(1.15)' : 'none', transition:'all .15s' }}>
                    {em}
                  </button>
                ))
              )}
            </div>

            {/* Animation : emoji miakatra sy manjavona rehefa misy réaction (format story Facebook) */}
            {flyingEmojis.map(f => (
              <span key={f.id} className="story-emoji-fly" style={{ left: f.x - 16 }}>{f.emoji}</span>
            ))}

            {/* Lisitry ny "Vu" + réactions (tompony ihany) */}
            {storyReactors !== null && (
              <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,.6)', display:'flex', alignItems:'flex-end', justifyContent:'center', zIndex:10 }} onClick={() => setStoryReactors(null)}>
                <div onClick={e => e.stopPropagation()} style={{ background:'white', borderRadius:'20px 20px 0 0', padding:18, width:'100%', maxWidth:480, maxHeight:'60vh', overflowY:'auto' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                    <h3 style={{ fontWeight:800, color:'#1877F2', fontSize:16 }}>Vues et réactions</h3>
                    <button onClick={() => setStoryReactors(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'#65676B', fontSize:20 }}>✕</button>
                  </div>
                  {storyReactors.length === 0 && <p style={{ fontSize:13, color:'#65676B', textAlign:'center', padding:'14px 0' }}>Chargement...</p>}
                  {storyReactors.map(r => (
                    <div key={r.uid} onClick={() => { setStoryReactors(null); setStoryViewer(null); navigate(`/profile/${r.uid}`); }}
                      style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 2px', cursor:'pointer', borderBottom:'1px solid #F0F2F5' }}>
                      <img src={r.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(r.name||'U')}&background=1877F2&color=fff`} alt="" style={{ width:38, height:38, borderRadius:'50%', objectFit:'cover' }} />
                      <p style={{ flex:1, fontWeight:600, fontSize:14 }}>{r.name}</p>
                      {r.emojis.length > 0
                        ? <span style={{ fontSize:18 }}>{r.emojis.join(' ')}</span>
                        : <span style={{ fontSize:11, color:'#65676B' }}>👁 Vu</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Create post — barre kely (icône fotsiny, clic = page feno) */}
      <div className="card post-card" style={{ padding:12, marginBottom:8 }}>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <img src={userProfile?.photoURL||`https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile?.fullName||'U')}&background=1877F2&color=fff`} alt="" className="avatar" style={{ width:40, height:40, flexShrink:0 }}/>
          <button onClick={() => setPublishFullOpen(true)}
            style={{ flex:1, textAlign:'left', background:'#F0F2F5', border:'none', borderRadius:22, padding:'10px 16px', color:'#65676B', fontSize:14.5, fontFamily:'Poppins', cursor:'pointer' }}>
            {t('whatsOnMind')}
          </button>
        </div>
        <div style={{ display:'flex', alignItems:'center', marginTop:10, paddingTop:8, borderTop:'1px solid #E4E6EB' }}>
          {/* Icônes fotsiny (tsy labelle) — Photo, Vidéo, Vente + "Plus" */}
          <button onClick={() => { setPublishFullOpen(true); setTimeout(() => photoRef.current?.click(), 60); }} title="Photo"
            style={{ flex:1, display:'flex', justifyContent:'center', alignItems:'center', gap:6, background:'none', border:'none', cursor:'pointer', padding:'6px 0' }}>
            <HiPhotograph size={22} color="#45BD62" />
          </button>
          <button onClick={() => { setPublishFullOpen(true); setTimeout(() => videoRef.current?.click(), 60); }} title="Vidéo"
            style={{ flex:1, display:'flex', justifyContent:'center', alignItems:'center', gap:6, background:'none', border:'none', cursor:'pointer', padding:'6px 0', borderLeft:'1px solid #E4E6EB' }}>
            <HiVideoCamera size={22} color="#F3425F" />
          </button>
          <button onClick={() => { setPublishFullOpen(true); setIsSale(true); }} title="Vente"
            style={{ flex:1, display:'flex', justifyContent:'center', alignItems:'center', gap:6, background:'none', border:'none', cursor:'pointer', padding:'6px 0', borderLeft:'1px solid #E4E6EB' }}>
            <HiTag size={22} color="#F5C518" />
          </button>
          <button onClick={() => setPublishFullOpen(true)} title="Plus"
            style={{ flex:1, display:'flex', justifyContent:'center', alignItems:'center', gap:5, background:'none', border:'none', cursor:'pointer', padding:'6px 0', borderLeft:'1px solid #E4E6EB', color:'#1877F2', fontWeight:700, fontSize:13, fontFamily:'Poppins' }}>
            <span style={{ fontSize:18 }}>＋</span> Publié
          </button>
        </div>
      </div>

      {/* ── PAGE FENO : Créer une publication (accueil, format Facebook) ── */}
      {publishFullOpen && (
      <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.35)', zIndex:350, display:'flex', alignItems:'flex-start', justifyContent:'center', overflowY:'auto' }}>
      <div className="card post-card" style={{ padding:16, marginBottom:8, width:'100%', maxWidth:600, minHeight:'100vh', borderRadius:0 }}>
        {/* Header page */}
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14, paddingBottom:12, borderBottom:'1px solid #E4E6EB' }}>
          <button onClick={() => setPublishFullOpen(false)} style={{ background:'none', border:'none', cursor:'pointer', padding:4 }}><HiX size={24} color="#050505"/></button>
          <h3 style={{ fontWeight:800, fontSize:18, flex:1 }}>Créer une publication</h3>
          <button className="btn-primary" onClick={() => { createPost(); }} disabled={posting||(!content.trim()&&!mediaFile&&multiPhotos.length===0)||content.length>MAX_POST} style={{ padding:'7px 20px', fontSize:14 }}>
            {posting?'...':t('publishPost')}
          </button>
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
          <img src={userProfile?.photoURL||`https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile?.fullName||'U')}&background=1877F2&color=fff`} alt="" className="avatar" style={{ width:42, height:42, flexShrink:0 }}/>
          <div style={{ flex:1 }}>
            <textarea className="input" placeholder={t('whatsOnMind')} value={content} onChange={e => setContent(e.target.value)} rows={3} style={{ resize:'none', width:'100%', border:'none', fontSize:17 }} maxLength={MAX_POST} autoFocus/>
            {content.length > 0 && <p style={{ fontSize:11, color:charColor, textAlign:'right', marginTop:2 }}>{rem} restants</p>}
          </div>
        </div>

        {/* Audience — Public / Amis / Moi uniquement (icônes néon, format Facebook) */}
        <div style={{ display:'flex', justifyContent:'flex-end', marginTop:4, position:'relative' }} onClick={e => e.stopPropagation()}>
          <button onClick={() => setAudienceMenuOpen(p => !p)}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 12px', borderRadius:14, border:'1.5px solid #E4E6EB', background:'#F0F2F5', fontFamily:'Poppins', fontSize:12, fontWeight:700, color:'#65676B', cursor:'pointer' }}>
            {audience==='public' && <><NeonGlobe size={14}/> Public</>}
            {audience==='friends' && <><NeonPeople size={14}/> Amis</>}
            {audience==='me' && <><NeonLock size={14}/> Moi uniquement</>}
          </button>
          {audienceMenuOpen && (
            <div style={{ position:'absolute', top:'110%', right:0, background:'white', border:'1px solid #E4E6EB', borderRadius:12, boxShadow:'0 4px 20px rgba(0,0,0,.14)', minWidth:190, zIndex:20, overflow:'hidden' }}>
              {[['public','Public',<NeonGlobe key="g" size={15}/>],['friends','Amis',<NeonPeople key="p" size={15}/>],['me','Moi uniquement',<NeonLock key="l" size={15}/>]].map(([val,label,icon]) => (
                <button key={val} onClick={() => { setAudience(val); setAudienceMenuOpen(false); }}
                  style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'11px 14px', background: audience===val ? '#E7F0FE' : 'none', border:'none', cursor:'pointer', fontFamily:'Poppins', fontSize:13, fontWeight:600, color:'#050505' }}>
                  {icon} {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Pastilles : lieu / humeur / amis identifiés (format Facebook) */}
        {(postLocation || postMood || Object.values(composerTagSel).some(Boolean)) && (
          <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:8 }}>
            {postLocation && (
              <span style={{ display:'flex', alignItems:'center', gap:5, background:'#FFE9F2', color:'#FF2D8D', borderRadius:16, padding:'4px 10px', fontSize:12, fontWeight:700 }}>
                📍 {postLocation} <span onClick={() => setPostLocation('')} style={{ cursor:'pointer' }}>✕</span>
              </span>
            )}
            {postMood && (
              <span style={{ display:'flex', alignItems:'center', gap:5, background:'#FFF6DB', color:'#B8860B', borderRadius:16, padding:'4px 10px', fontSize:12, fontWeight:700 }}>
                {postMood} <span onClick={() => setPostMood('')} style={{ cursor:'pointer' }}>✕</span>
              </span>
            )}
            {Object.values(composerTagSel).some(Boolean) && (
              <span style={{ display:'flex', alignItems:'center', gap:5, background:'#E7F0FE', color:'#1877F2', borderRadius:16, padding:'4px 10px', fontSize:12, fontWeight:700 }}>
                🏷️ avec {composerTagList.filter(f => composerTagSel[f.uid]).map(f => f.fullName).join(', ')} <span onClick={() => setComposerTagSel({})} style={{ cursor:'pointer' }}>✕</span>
              </span>
            )}
          </div>
        )}

        {mediaPreview && (
          <div style={{ position:'relative', marginTop:10 }}>
            {mediaType==='image'
              ? <img src={mediaPreview} alt="" style={{ width:'100%', borderRadius:10, maxHeight:250, objectFit:'cover' }}/>
              : <video src={mediaPreview} controls style={{ width:'100%', borderRadius:10, maxHeight:250 }}/>}
            <button onClick={removeMedia} style={{ position:'absolute', top:6, right:6, background:'rgba(0,0,0,.5)', border:'none', borderRadius:'50%', width:28, height:28, cursor:'pointer', color:'white', display:'flex', alignItems:'center', justifyContent:'center' }}><HiX size={16}/></button>
          </div>
        )}

        {multiPhotos.length > 0 && (
          <div style={{ marginTop:10 }}>
            <div style={{ display:'flex', gap:8, overflowX:'auto', paddingBottom:4 }}>
              {multiPhotos.map((f, i) => (
                <div key={i} style={{ position:'relative', flexShrink:0, width:84, height:84 }}>
                  <img src={URL.createObjectURL(f)} alt="" style={{ width:'100%', height:'100%', borderRadius:10, objectFit:'cover' }}/>
                  <button onClick={() => removeOnePhoto(i)} style={{ position:'absolute', top:3, right:3, background:'rgba(0,0,0,.55)', border:'none', borderRadius:'50%', width:20, height:20, cursor:'pointer', color:'white', display:'flex', alignItems:'center', justifyContent:'center' }}><HiX size={11}/></button>
                </div>
              ))}
            </div>
            <p style={{ fontSize:11, color:'#65676B', marginTop:4 }}>{multiPhotos.length}/10 photos</p>
          </div>
        )}

        {isSale && (
          <div style={{ marginTop:10, display:'flex', flexDirection:'column', gap:8 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <HiTag color="#1877F2" size={18}/>
              <select className="input" value={saleCategory} onChange={e => setSaleCategory(e.target.value)} style={{ flex:1 }}>
                {SALE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <HiTag color="#1877F2" size={18}/>
              <input className="input" type="number" placeholder={`${t('price')} (Ar)`} value={price} onChange={e => setPrice(e.target.value)} style={{ flex:1 }} min="1" max={MAX_PRICE}/>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <HiPhone color="#1877F2" size={18}/>
              <input className="input" type="tel" placeholder="Numéro de contact" value={contact} onChange={e => setContact(e.target.value)} style={{ flex:1 }} maxLength={20}/>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <HiLocationMarker color="#1877F2" size={18}/>
              <input className="input" type="text" placeholder="Lieu précis de vente (point exact)" value={lieu} onChange={e => setLieu(e.target.value)} style={{ flex:1 }} maxLength={100}/>
            </div>
          </div>
        )}

        {posting && uploadPct > 0 && (
          <div style={{ marginTop:8 }}>
            <div style={{ height:4, background:'#E4E6EB', borderRadius:2 }}>
              <div style={{ height:'100%', width:`${uploadPct}%`, background:'linear-gradient(135deg,#FF2D8D,#FF7AB8)', borderRadius:2, transition:'width .3s' }}/>
            </div>
            <p style={{ fontSize:11, color:'#65676B', marginTop:3 }}>Upload en cours...</p>
          </div>
        )}

        {/* Options importation — icône + labelle (format Facebook, page feno) */}
        <div style={{ marginTop:16, border:'1px solid #E4E6EB', borderRadius:12, overflow:'hidden' }}>
          <input ref={photoRef} type="file" multiple accept="image/jpeg,image/png,image/gif,image/webp" onChange={e => handleMedia(e,'image')} style={{ display:'none' }}/>
          <input ref={videoRef} type="file" accept="video/mp4,video/webm,video/quicktime"       onChange={e => handleMedia(e,'video')} style={{ display:'none' }}/>
          {[
            { icon:<HiPhotograph size={22} color="#45BD62"/>, label:'Photo / Vidéo', action:() => photoRef.current?.click() },
            { icon:<HiVideoCamera size={22} color="#F3425F"/>, label:'Vidéo',        action:() => videoRef.current?.click() },
            { icon:<HiTag size={22} color="#F5C518"/>,         label:'Vente',        action:() => setIsSale(p=>!p), active:isSale },
            { icon:<HiUserAdd size={22} color="#1877F2"/>,     label:'Identifier des personnes', action:() => openComposerTagModal() },
            { icon:<NeonLocation size={22}/>,                  label: postLocation ? `Lieu : ${postLocation}` : 'Ajouter un lieu', action:() => setLocationPromptOpen(true) },
            { icon:<span style={{ fontSize:22 }}>😊</span>,     label: postMood || 'Humeur / Activité', action:() => setMoodPickerOpen(true) },
            { icon:<HiPaperAirplane size={22} color="#1877F2"/>, label: allowMessages ? 'Recevoir des messages : Activé' : 'Recevoir des messages : Désactivé', action:() => setAllowMessages(p=>!p) },
            { icon:<HiCalendar size={22} color="#3DD9C4"/>,    label:'Créer un événement', action:() => navigate('/events') },
            { icon:<HiLightningBolt size={22} color="#FF7A00"/>, label:'Lancer un décret', action:() => setIsDecree(p=>!p), active:isDecree },
          ].map((opt, i) => (
            <button key={i} onClick={opt.action}
              style={{ width:'100%', display:'flex', alignItems:'center', gap:14, padding:'13px 16px', background: opt.active ? '#E7F0FE' : 'none', border:'none', borderTop: i>0?'1px solid #F0F2F5':'none', cursor:'pointer', textAlign:'left', fontFamily:'Poppins', fontSize:15, fontWeight:600, color:'#050505' }}>
              {opt.icon} {opt.label}
            </button>
          ))}
        </div>
      </div>
      </div>
      )}

      {/* Edit post modal */}
      {/* ── Menu : Copier le texte (appui long sur une publication) ── */}
      {textCopyMenu && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:400, display:'flex', alignItems:'flex-end', justifyContent:'center' }} onClick={() => setTextCopyMenu(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background:'white', borderRadius:'20px 20px 0 0', width:'100%', maxWidth:520, padding:'10px 0 22px' }}>
            <div style={{ width:40, height:4, borderRadius:2, background:'#CED0D4', margin:'6px auto 12px' }} />
            <button onClick={() => copyPostText(textCopyMenu.content)}
              style={{ width:'100%', display:'flex', alignItems:'center', gap:14, padding:'15px 22px', background:'none', border:'none', cursor:'pointer', textAlign:'left', fontSize:15, fontWeight:600, color:'#050505', fontFamily:'Poppins' }}>
              <HiClipboardCopy size={22} color="#1877F2" /> Copier le texte
            </button>
            <button onClick={() => setTextCopyMenu(null)}
              style={{ width:'100%', display:'flex', alignItems:'center', gap:14, padding:'15px 22px', background:'none', border:'none', cursor:'pointer', textAlign:'left', fontSize:15, fontWeight:600, color:'#65676B', fontFamily:'Poppins' }}>
              <HiX size={22} color="#65676B" /> Annuler
            </button>
          </div>
        </div>
      )}

      {/* Toast : Texte copié */}
      {copyToast && (
        <div style={{ position:'fixed', bottom:104, left:'50%', transform:'translateX(-50%)', zIndex:450, background:'#050505', color:'white', padding:'10px 20px', borderRadius:22, fontSize:14, fontWeight:600, fontFamily:'Poppins', boxShadow:'0 6px 20px rgba(0,0,0,.3)' }}>
          ✓ Texte copié
        </div>
      )}

      {editPost && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div className="card" style={{ width:'100%', maxWidth:400, padding:20 }}>
            <h3 style={{ marginBottom:12 }}>Modifier la publication</h3>
            <textarea className="input" rows={4} value={editContent} onChange={e => setEditContent(e.target.value)} style={{ resize:'none' }} maxLength={MAX_POST}/>
            <div style={{ display:'flex', gap:10, marginTop:12 }}>
              <button className="btn-secondary" onClick={() => setEditPost(null)} style={{ flex:1 }}>{t('cancel')}</button>
              <button className="btn-primary"   onClick={saveEditPost}            style={{ flex:1 }}>{t('save')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit comment modal */}
      {editCmt && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div className="card" style={{ width:'100%', maxWidth:400, padding:20 }}>
            <h3 style={{ marginBottom:12 }}>Modifier le commentaire</h3>
            <textarea className="input" rows={3} value={editCmt.text} onChange={e => setEditCmt(p=>({...p,text:e.target.value}))} style={{ resize:'none' }} maxLength={MAX_COMMENT}/>
            <div style={{ display:'flex', gap:10, marginTop:12 }}>
              <button className="btn-secondary" onClick={() => setEditCmt(null)} style={{ flex:1 }}>{t('cancel')}</button>
              <button className="btn-primary" onClick={() => saveEditCmt(editCmt.postId, editCmt.cmt, editCmt.text)} style={{ flex:1 }}>{t('save')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Reaction users modal */}
      {reactionModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div className="card" style={{ width:'100%', maxWidth:360, padding:20, maxHeight:'70vh', overflowY:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
              <h3 style={{ color:'#1877F2', fontWeight:700 }}>Réactions</h3>
              <button onClick={() => setRM(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'#65676B' }}><HiX size={20}/></button>
            </div>
            {Object.entries(reactionModal.reactions).map(([uid, emoji]) => {
              const info = reactionModal.userData?.[uid]||{};
              return (
                <div key={uid} onClick={() => { setRM(null); navigate(`/profile/${uid}`); }}
                  style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'1px solid #E4E6EB', cursor:'pointer' }}>
                  <img src={info.photo||`https://ui-avatars.com/api/?name=${encodeURIComponent(info.name||'U')}&background=1877F2&color=fff`} alt="" style={{ width:36, height:36, borderRadius:'50%', objectFit:'cover' }}/>
                  <p style={{ fontSize:14, fontWeight:600, flex:1 }}>{uid===currentUser.uid?'Vous':(info.name||uid)}</p>
                  <span style={{ fontSize:20 }}>{emoji}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Feed */}
      {posts.filter(p => !(p.mediaType === 'audio' && p.isMusic)).map((post, pIdx) => {
        const rc     = countReactions(post.reactions);
        const myR    = post.reactions?.[currentUser.uid];
        const total  = Object.keys(post.reactions||{}).length;
        const isOwn  = post.uid === currentUser.uid;
        const boosted = post.isBoosted && post.boostUntil && new Date(post.boostUntil)>new Date();
        const isMyFriend = isFriend(post.uid);
        const sentReq    = hasSentReq(post.uid);

        return (
          <div key={post.id}>
          {pIdx > 0 && pIdx % 5 === 0 && (
            <MusicRow
              tracks={posts.filter(p => p.mediaType === 'audio' && p.isMusic)}
              playingId={playingTrackId}
              onToggle={toggleMusic}
              onArtist={aid => aid && navigate(`/artists/${aid}`)}
              onShare={setShareModalPost}
              onFollow={toggleFollowArtist}
              onMessage={aid => aid && navigate(`/artists/${aid}/messages`)}
              followedArtists={followedArtists}
              onSave={toggleSave}
              onBlock={toggleBlockAuthor}
              savedIds={userProfile?.saved || []}
              blockedIds={userProfile?.blocked || []}
            />
          )}
          <div className="card post-card animate-fade" style={{ marginBottom:14, border:boosted?'1px solid #a855f755':undefined }}>
            {boosted && (
              <div style={{ background:'linear-gradient(135deg,#7c3aed18,#a855f718)', borderBottom:'1px solid #a855f733', padding:'5px 14px' }}>
                <span style={{ fontSize:10, color:'#a855f7', fontWeight:600 }}>⚡ Sponsorisé</span>
              </div>
            )}

            {/* Header */}
            <div style={{ padding:'14px 16px 0', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              {post.groupName ? (
                /* Pub de groupe : photo + nom du groupe (→ groupe), auteur dessous (→ profil) */
                <div style={{ display:'flex', alignItems:'center', gap:10, flex:1, minWidth:0 }}>
                  <div style={{ position:'relative', flexShrink:0, width:44, height:44 }}>
                    <div onClick={() => navigate(`/groups/${post.groupId}`)} style={{ width:44, height:44, borderRadius:10, background:'linear-gradient(135deg,#1B84FF,#1877F2)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', overflow:'hidden', boxShadow:'0 2px 8px rgba(24,119,242,.3)' }}>
                      {post.groupPhoto
                        ? <img src={post.groupPhoto} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                        : <HiUserGroup size={22} color="white"/>}
                    </div>
                    {/* Avatar an'ilay olona superposé (format Facebook) */}
                    <img onClick={() => navigate(`/profile/${post.uid}`)}
                      src={post.authorPhoto||`https://ui-avatars.com/api/?name=${encodeURIComponent(post.authorName||'U')}&background=1877F2&color=fff`}
                      alt="" style={{ position:'absolute', bottom:-4, right:-4, width:22, height:22, borderRadius:'50%', objectFit:'cover', border:'2.5px solid white', cursor:'pointer', boxShadow:'0 1px 4px rgba(0,0,0,.25)' }}/>
                  </div>
                  <div style={{ minWidth:0 }}>
                    <p onClick={() => navigate(`/groups/${post.groupId}`)} style={{ fontWeight:700, fontSize:14, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', cursor:'pointer' }}>{post.groupName}</p>
                    <p style={{ fontSize:12, color:'#65676B' }}>
                      <span onClick={() => navigate(`/profile/${post.uid}`)} style={{ cursor:'pointer', fontWeight:600, color:'#050505' }}>{post.authorName}</span>
                      {post.authorIsVip&&<VIPBadge/>} · {post.createdAt?timeAgo(post.createdAt):"À l'instant"}
                    </p>
                  </div>
                </div>
              ) : post.pageId ? (
                /* Pub de Sera (page) : photo + nom de la page, clic → page */
                <div onClick={() => navigate(`/pages/${post.pageId}`)} style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', flex:1, minWidth:0 }}>
                  <div style={{ width:44, height:44, borderRadius:10, background:'linear-gradient(145deg,#63A9FF,#1877F2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, overflow:'hidden' }}>
                    {post.pagePhoto ? <img src={post.pagePhoto} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : <HiIdentification size={22} color="white"/>}
                  </div>
                  <div style={{ minWidth:0 }}>
                    <p style={{ fontWeight:700, fontSize:14, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{post.pageName}</p>
                    <p style={{ fontSize:12, color:'#65676B' }}>Sera · {post.createdAt?timeAgo(post.createdAt):"À l'instant"}</p>
                  </div>
                </div>
              ) : post.artistId ? (
                /* Pub de canal Artiste : photo + nom, clic → page artiste */
                <div onClick={() => navigate(`/artists/${post.artistId}`)} style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', flex:1, minWidth:0 }}>
                  <div style={{ width:44, height:44, borderRadius:'50%', background:'linear-gradient(145deg,#FF6FA5,#FF2D8D)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, overflow:'hidden' }}>
                    {post.artistPhoto ? <img src={post.artistPhoto} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : <NeonMic size={20} color="white"/>}
                  </div>
                  <div style={{ minWidth:0 }}>
                    <p style={{ fontWeight:700, fontSize:14, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{post.artistName} <span style={{ fontSize:10, fontWeight:800, color:'#FF2D8D' }}>🎤</span></p>
                    <p style={{ fontSize:12, color:'#65676B' }}>{post.genre} · {post.createdAt?timeAgo(post.createdAt):"À l'instant"}</p>
                  </div>
                </div>
              ) : post.shopId ? (
                /* Pub de Boutique : photo + nom, clic → page boutique */
                <div onClick={() => navigate(`/shop/${post.shopId}`)} style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', flex:1, minWidth:0 }}>
                  <div style={{ width:44, height:44, borderRadius:10, background:'linear-gradient(145deg,#FF6FA5,#FF2D8D)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, overflow:'hidden' }}>
                    {post.shopPhoto ? <img src={post.shopPhoto} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : <HiShoppingBag size={22} color="white"/>}
                  </div>
                  <div style={{ minWidth:0 }}>
                    <p style={{ fontWeight:700, fontSize:14, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{post.shopName} <span style={{ fontSize:10, fontWeight:800, color:'#FF2D8D' }}>🏪</span></p>
                    <p style={{ fontSize:12, color:'#65676B' }}>Boutique · {post.createdAt?timeAgo(post.createdAt):"À l'instant"}</p>
                  </div>
                </div>
              ) : (
                <div style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', flex:1, minWidth:0 }} onClick={() => navigate(`/profile/${post.uid}`)}>
                  <StoryRing active={activeStoryUids.has(post.uid)}>
                    <img src={post.authorPhoto||`https://ui-avatars.com/api/?name=${encodeURIComponent(post.authorName||'U')}&background=1877F2&color=fff`} alt="" className="avatar" style={{ width:40, height:40, flexShrink:0 }}/>
                  </StoryRing>
                  <div style={{ minWidth:0 }}>
                    <p style={{ fontWeight:600, fontSize:14, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{post.authorName}{post.authorIsVip&&<VIPBadge/>}</p>
                    <p style={{ fontSize:12, color:'#65676B' }}>@{post.authorUsername} · {post.createdAt?timeAgo(post.createdAt):"À l'instant"}</p>
                    {post.taggedNames?.length > 0 && <p style={{ fontSize:12, color:'#65676B' }}>avec {post.taggedNames.join(', ')}</p>}
                    {(post.mood || post.location) && (
                      <p style={{ fontSize:12, color:'#65676B' }}>
                        {post.mood && <>{post.mood}</>}{post.mood && post.location ? ' à ' : ''}{post.location && <>📍 {post.location}</>}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
                {post.isSale && <div style={{ textAlign:'right' }}><span className="sale-badge">{t('sale')}</span><p className="price-tag" style={{ marginTop:2, fontSize:13 }}>{post.price} Ar</p></div>}
                {!isOwn && (
                  <button onClick={() => toggleFollowAuthor(post.uid, post.authorName)}
                    style={{ background: isFollowingUid(post.uid) ? '#F0F2F5' : 'linear-gradient(135deg,#FFE066,#F2B300)', border:'none', borderRadius:20, padding:'5px 12px', cursor:'pointer', color: isFollowingUid(post.uid) ? '#65676B' : '#4A3400', fontSize:12, fontWeight:700, display:'flex', alignItems:'center', gap:4 }}>
                    {isFollowingUid(post.uid) ? '✓ Suivi' : '⭐ Suivre'}
                  </button>
                )}
                {!isOwn && !isMyFriend && !sentReq && (
                  <button onClick={() => sendFriendReq(post.uid, post.authorName)}
                    style={{ background:'none', border:'1px solid #E4E6EB', borderRadius:20, padding:'5px 10px', cursor:'pointer', color:'#65676B', fontSize:12, display:'flex', alignItems:'center', gap:4 }}>
                    <HiUserAdd size={13}/> Ajouter
                  </button>
                )}

                {/* 3-dot menu */}
                <div style={{ position:'relative' }} onClick={e => e.stopPropagation()}>
                  <button onClick={() => setPostMenu(postMenu===post.id?null:post.id)}
                    style={{ background:'none', border:'none', cursor:'pointer', color:'#65676B', padding:4, display:'flex', alignItems:'center' }}><HiDotsVertical size={18}/></button>
                  {postMenu === post.id && (
                    <div style={{ position:'absolute', top:'100%', right:0, background:'white', border:'1px solid #E4E6EB', borderRadius:14, boxShadow:'0 6px 24px rgba(0,0,0,.16)', minWidth:220, zIndex:50, overflow:'hidden' }}>
                      {isOwn && <>
                        <button onClick={() => { setEditPost(post); setEditContent(post.content); setPostMenu(null); }} style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'13px 18px', background:'none', border:'none', cursor:'pointer', color:'#050505', fontSize:15, fontWeight:600, borderBottom:'1px solid #F0F2F5', fontFamily:'Poppins' }}><HiPencil size={17} color="#1877F2"/> Modifier</button>
                        {!post.groupId && !post.sharedFrom && <button onClick={() => { navigate('/boost'); setPostMenu(null); }} style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'13px 18px', background:'none', border:'none', cursor:'pointer', color:'#050505', fontSize:15, fontWeight:600, borderBottom:'1px solid #F0F2F5', fontFamily:'Poppins' }}><HiLightningBolt size={17} color="#a855f7"/> Booster</button>}
                      </>}
                      <button onClick={() => { toggleSave(post.id); setPostMenu(null); }} style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'13px 18px', background:'none', border:'none', cursor:'pointer', color:'#050505', fontSize:15, fontWeight:600, borderBottom:'1px solid #F0F2F5', fontFamily:'Poppins' }}>
                        <HiBookmark size={17} color="#F2B300"/> {(userProfile?.saved||[]).includes(post.id) ? 'Retirer des enregistrements' : 'Enregistrer'}
                      </button>
                      <button onClick={() => { showAudienceInfo(post); setPostMenu(null); }} style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'13px 18px', background:'none', border:'none', cursor:'pointer', color:'#050505', fontSize:15, fontWeight:600, borderBottom:'1px solid #F0F2F5', fontFamily:'Poppins' }}>
                        {post.audience === 'friends' ? <NeonPeople size={17}/> : <NeonGlobe size={17}/>} Audience : {post.audience === 'friends' ? 'Amis' : 'Public'}
                      </button>
                      {isOwn && (
                        <button onClick={() => { openTagModal(post); setPostMenu(null); }} style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'13px 18px', background:'none', border:'none', cursor:'pointer', color:'#050505', fontSize:15, fontWeight:600, fontFamily:'Poppins' }}>
                          <HiUserAdd size={17} color="#1877F2"/> Identifier des amis
                        </button>
                      )}
                      {isOwn && (
                        <button onClick={() => { deletePost(post.id); setPostMenu(null); }} style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'13px 18px', background:'none', border:'none', cursor:'pointer', color:'#FF2D8D', fontSize:15, fontWeight:600, borderTop:'1px solid #F0F2F5', fontFamily:'Poppins' }}>
                          <HiTrash size={17}/> Supprimer
                        </button>
                      )}
                      {!isOwn && (
                        <>
                          <button onClick={() => { reportPost(post); setPostMenu(null); }} style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'13px 18px', background:'none', border:'none', cursor:'pointer', color:'#050505', fontSize:15, fontWeight:600, borderBottom:'1px solid #F0F2F5', fontFamily:'Poppins' }}>
                            <HiFlag size={17} color="#F2B300"/> Signaler à l'admin
                          </button>
                          <button onClick={() => { toggleBlockAuthor(post); setPostMenu(null); }} style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'13px 18px', background:'none', border:'none', cursor:'pointer', color:'#FF2D8D', fontSize:15, fontWeight:600, fontFamily:'Poppins' }}>
                            <HiBan size={17}/> {(userProfile?.blocked||[]).includes(post.uid) ? 'Débloquer' : 'Bloquer'} cette personne
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Content */}
            <div style={{ padding:'10px 16px', cursor:'pointer' }} onClick={() => navigate(`/post/${post.id}`)}>
              {post.content && (
                <p
                  onClick={e => {
                    // Raha nisy sélection texte (copie), tsy mandeha amin'ny post
                    if (window.getSelection && window.getSelection().toString().length > 0) { e.stopPropagation(); return; }
                  }}
                  onContextMenu={e => { e.stopPropagation(); }}
                  onPointerDown={e => startTextPress(e, post)}
                  onPointerUp={endTextPress}
                  onPointerLeave={endTextPress}
                  style={{ fontSize:15, lineHeight:1.6, wordBreak:'break-word', whiteSpace:'pre-wrap', userSelect:'text', WebkitUserSelect:'text', cursor:'text' }}
                >{post.content}</p>
              )}
              {post.isSale && (post.contact||post.lieu) && (
                <div style={{ marginTop:8, display:'flex', flexWrap:'wrap', gap:8 }}>
                  {post.contact && <a href={`tel:${post.contact}`} onClick={e=>e.stopPropagation()} style={{ display:'flex', alignItems:'center', gap:5, background:'#E4E6EB', borderRadius:20, padding:'5px 12px', color:'#1877F2', fontSize:13, fontWeight:600, textDecoration:'none' }}><HiPhone size={13}/>{post.contact}</a>}
                  {post.lieu   && <span style={{ display:'flex', alignItems:'center', gap:5, background:'#F0F2F5', borderRadius:20, padding:'5px 12px', color:'#65676B', fontSize:13 }}><HiLocationMarker size={13} color="#1877F2"/>{post.lieu}</span>}
                </div>
              )}
              {/* Publication partagée (format Facebook) */}
              {post.sharedFrom && (
                <div onClick={e => { e.stopPropagation(); navigate(`/post/${post.sharedFrom.id}`); }}
                  style={{ marginTop:8, border:'1px solid #E4E6EB', borderRadius:12, overflow:'hidden', cursor:'pointer' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 12px' }}>
                    <img src={post.sharedFrom.authorPhoto||`https://ui-avatars.com/api/?name=${encodeURIComponent(post.sharedFrom.authorName||'U')}&background=1877F2&color=fff`}
                      alt="" style={{ width:30, height:30, borderRadius:'50%', objectFit:'cover' }}/>
                    <p style={{ fontWeight:700, fontSize:13 }}>{post.sharedFrom.groupName ? `${post.sharedFrom.groupName} · ${post.sharedFrom.authorName}` : post.sharedFrom.authorName}</p>
                  </div>
                  {post.sharedFrom.content && <p style={{ padding:'0 12px 8px', fontSize:13, color:'#050505' }}>{post.sharedFrom.content}</p>}
                  {post.sharedFrom.mediaURL && (
                    post.sharedFrom.isMusic
                      ? <div style={{ padding:'0 10px 10px' }}><MusicPostCard post={post.sharedFrom} height={115}/></div>
                      : post.sharedFrom.mediaType === 'image'
                        ? <img src={post.sharedFrom.mediaURL} alt="" style={{ width:'100%', maxHeight:320, objectFit:'cover', display:'block' }}/>
                        : <video src={post.sharedFrom.mediaURL} muted playsInline style={{ width:'100%', maxHeight:320, objectFit:'cover', display:'block', background:'#000' }}/>
                  )}
                </div>
              )}
              {post.eventFrom && (
                <div onClick={e => { e.stopPropagation(); navigate('/events'); }}
                  style={{ marginTop:8, border:'1.5px solid #12A48D', borderRadius:12, overflow:'hidden', cursor:'pointer' }}>
                  {post.eventFrom.coverURL && <img src={post.eventFrom.coverURL} alt="" style={{ width:'100%', height:140, objectFit:'cover', display:'block' }}/>}
                  <div style={{ padding:'10px 12px', background:'#EAFBF8' }}>
                    <p style={{ fontSize:11, fontWeight:800, color:'#12A48D', display:'flex', alignItems:'center', gap:5 }}>📅 ÉVÉNEMENT</p>
                    <p style={{ fontWeight:800, fontSize:15, marginTop:2 }}>{post.eventFrom.title}</p>
                    <p style={{ fontSize:12, color:'#65676B', marginTop:2 }}>
                      {new Date(post.eventFrom.date).toLocaleString('fr-FR', { weekday:'short', day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}
                      {post.eventFrom.lieu ? ` · ${post.eventFrom.lieu}` : ''}
                    </p>
                  </div>
                </div>
              )}
              {post.mediaURLs?.length > 1 ? (
                <div style={{ marginTop:8, marginLeft:-16, marginRight:-16 }}>
                  <PhotoCarousel urls={post.mediaURLs} />
                </div>
              ) : post.mediaURL && (
                <div style={{ marginTop:8, marginLeft:-16, marginRight:-16 }}>
                  {post.isMusic ? <MusicPostCard post={post} height={140}/> : post.mediaType==='image' ? <img src={post.mediaURL} alt="" style={{ width:'100%', borderRadius:0, maxHeight:520, objectFit:'cover', display:'block' }}/> : <FeedVideo src={post.mediaURL} poster={post.thumbURL} dataSaver={dataSaver} onOpenReels={()=>navigate('/reels',{state:{startId:post.id}})} style={{ width:'100%', borderRadius:0, maxHeight:520, objectFit:'cover', display:'block', background:'#000' }} />}
                </div>
              )}
            </div>

            {/* Résumé réactions · commentaires (format Facebook) */}
            {(total > 0 || post.comments?.length > 0) && (
              <div style={{ padding:'8px 16px 6px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div onClick={() => openReactionModal(post)} style={{ display:'flex', alignItems:'center', gap:4, cursor:'pointer', minHeight:18 }}>
                  {total > 0 && <>
                    <div style={{ display:'flex', gap:3 }}>
                      {Object.entries(rc).slice(0,3).map(([e]) =>
                        <span key={e} style={{ fontSize:14, background:'white', borderRadius:'50%', boxShadow:'0 0 0 1.5px white', lineHeight:1 }}>{e}</span>)}
                    </div>
                    <span style={{ fontSize:13, color:'#65676B' }}>{total}</span>
                  </>}
                </div>
                {post.comments?.length > 0 && (
                  <span onClick={() => setOpenCmt(p=>({...p,[post.id]:!p[post.id]}))} style={{ fontSize:13, color:'#65676B', cursor:'pointer' }}>
                    {post.comments.length} commentaire{post.comments.length>1?'s':''}
                  </span>
                )}
              </div>
            )}

            {/* Actions : J'aime · Commenter · Partager (format Facebook) */}
            <div className='post-actions-row'>
              <div style={{ position:'relative', flex:1, display:'flex' }}>
                <button
                  onClick={() => quickLike(post)}
                  onTouchStart={() => startLongPress(post.id)} onTouchEnd={endLongPress}
                  onMouseDown={() => startLongPress(post.id)} onMouseUp={endLongPress} onMouseLeave={endLongPress}
                  className={'post-action-btn'+(myR?' active':'')}
                  style={myR ? { color: myR === '👍' ? '#1877F2' : '#FF2D8D', fontWeight:700 } : {}}>
                  <span style={{ fontSize:17 }}>{myR || '👍'}</span> J'aime
                </button>
                {showReact[post.id] && (
                  <div style={{ position:'absolute', bottom:'110%', left:8, background:'white', borderRadius:30, padding:'8px 12px', display:'flex', gap:6, boxShadow:'0 4px 20px rgba(0,0,0,.2)', zIndex:10, border:'1px solid #E4E6EB' }}>
                    {REACTIONS.map(e => <button key={e} onClick={() => reactToPost(post.id,e)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:24, transition:'transform .15s' }}
                      onMouseEnter={ev => ev.currentTarget.style.transform='scale(1.3)'} onMouseLeave={ev => ev.currentTarget.style.transform='scale(1)'}>{e}</button>)}
                  </div>
                )}
              </div>
              <button onClick={() => setOpenCmt(p=>({...p,[post.id]:!p[post.id]}))} className='post-action-btn'>
                <HiChat size={18}/> Commenter
              </button>
              <button onClick={() => sharePost(post)} className='post-action-btn'>
                <HiShare size={18}/> Partager
              </button>
            </div>

            {/* Comments */}
            {openCmt[post.id] && (
              <div style={{ padding:'0 16px 14px', borderTop:'1px solid #E4E6EB' }}>
                {post.comments?.map(c => {
                  const myCR = c.reactions?.[currentUser.uid];
                  const crCount = Object.keys(c.reactions||{}).length;
                  return (
                  <div key={c.id} style={{ display:'flex', gap:8, marginTop:10 }}>
                    <img src={c.authorPhoto||`https://ui-avatars.com/api/?name=${encodeURIComponent(c.authorName||'U')}&background=1877F2&color=fff`} alt="" className="avatar" style={{ width:32, height:32, flexShrink:0, cursor:'pointer' }} onClick={() => navigate(`/profile/${c.uid}`)}/>
                    <div style={{ flex:1, minWidth:0 }}>
                      {/* Bulle (format Facebook) */}
                      <div style={{ position:'relative', display:'inline-block', maxWidth:'100%', background:'#F0F2F5', borderRadius:16, padding:'8px 12px' }}>
                        <p style={{ fontWeight:700, fontSize:13 }}>{c.authorName}{c.authorIsVip&&<VIPBadge/>}</p>
                        {c.text&&<p style={{ fontSize:14, wordBreak:'break-word' }}>{c.text}</p>}
                        {c.mediaURL&&<div style={{ marginTop:4 }}>{c.mediaType==='image'?<img src={c.mediaURL} alt="" style={{ maxWidth:200, borderRadius:8 }}/>:<video src={c.mediaURL} controls style={{ maxWidth:200, borderRadius:8 }}/>}</div>}
                        {crCount > 0 && (
                          <span style={{ position:'absolute', bottom:-10, right:4, background:'white', borderRadius:12, padding:'1px 6px', fontSize:12, boxShadow:'0 1px 4px rgba(0,0,0,.25)', display:'flex', alignItems:'center', gap:2 }}>
                            {[...new Set(Object.values(c.reactions))].slice(0,3).join('')}
                            {crCount > 1 && <span style={{ fontSize:10, color:'#65676B' }}>{crCount}</span>}
                          </span>
                        )}
                      </div>
                      {/* Liens sous la bulle (format Facebook) */}
                      <div style={{ display:'flex', gap:14, padding:'4px 12px 0', fontSize:12, fontWeight:700, color:'#65676B', position:'relative', alignItems:'center' }}>
                        <span onClick={() => reactToCmt(post.id, c.id, '👍')}
                          style={{ cursor:'pointer', color: myCR ? (myCR === '👍' ? '#1877F2' : '#FF2D8D') : '#65676B' }}>
                          {myCR && myCR !== '👍' ? myCR + ' ' : ''}J'aime
                        </span>
                        <span onClick={() => setCmtReactionPicker(p => p===c.id?null:c.id)} style={{ cursor:'pointer' }}>😊</span>
                        <span onClick={() => setReplyTo(p=>({...p,[post.id]:c.authorName}))} style={{ cursor:'pointer' }}>Répondre</span>
                        {c.uid===currentUser.uid && (
                          <span onClick={() => setEditCmt({ postId:post.id, cmt:c, text:c.text })} style={{ cursor:'pointer' }}>Modifier</span>
                        )}
                        {(c.uid===currentUser.uid||post.uid===currentUser.uid) && (
                          <span onClick={() => deleteCmt(post.id,c)} style={{ cursor:'pointer', color:'#FF2D8D' }}>Supprimer</span>
                        )}
                        {cmtReactionPicker===c.id && (
                          <div style={{ display:'flex', gap:6, background:'white', borderRadius:20, padding:'6px 10px', boxShadow:'0 2px 12px rgba(0,0,0,.2)', position:'absolute', bottom:'110%', left:0, zIndex:10, border:'1px solid #E4E6EB' }}>
                            {REACTIONS.map(em=><span key={em} onClick={()=>reactToCmt(post.id,c.id,em)} style={{ fontSize:20, cursor:'pointer' }}>{em}</span>)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  );
                })}

                {replyTo[post.id] && (
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:8, background:'#F0F2F5', padding:'6px 10px', borderRadius:10 }}>
                    <HiReply size={14} color="#1877F2"/>
                    <span style={{ fontSize:12, color:'#65676B' }}>Répondre à <strong>{replyTo[post.id]}</strong></span>
                    <button onClick={() => setReplyTo(p=>({...p,[post.id]:null}))} style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', color:'#65676B' }}><HiX size={14}/></button>
                  </div>
                )}

                {cmtMedia[post.id] && (
                  <div style={{ position:'relative', marginTop:8, display:'inline-block' }}>
                    {cmtMedia[post.id].type==='image'?<img src={cmtMedia[post.id].preview} alt="" style={{ maxWidth:150, borderRadius:8 }}/>:<video src={cmtMedia[post.id].preview} style={{ maxWidth:150, borderRadius:8 }}/>}
                    <button onClick={() => setCmtMedia(p=>({...p,[post.id]:null}))} style={{ position:'absolute', top:2, right:2, background:'rgba(0,0,0,.5)', border:'none', borderRadius:'50%', width:20, height:20, cursor:'pointer', color:'white', fontSize:10 }}>✕</button>
                  </div>
                )}

                <div style={{ display:'flex', gap:6, marginTop:10, alignItems:'center' }}>
                  <img src={userProfile?.photoURL||`https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile?.fullName||'U')}&background=1877F2&color=fff`} alt="" className="avatar" style={{ width:30, height:30, flexShrink:0 }}/>
                  <input ref={el=>cPhotoRef.current[post.id]=el} type="file" accept="image/jpeg,image/png,image/gif,image/webp" style={{ display:'none' }} onChange={e=>{const f=e.target.files[0];if(f)setCmtMedia(p=>({...p,[post.id]:{file:f,type:'image',preview:URL.createObjectURL(f)}}));}}/>
                  <input ref={el=>cVideoRef.current[post.id]=el} type="file" accept="video/mp4,video/webm,video/quicktime" style={{ display:'none' }} onChange={e=>{const f=e.target.files[0];if(f)setCmtMedia(p=>({...p,[post.id]:{file:f,type:'video',preview:URL.createObjectURL(f)}}));}}/>
                  <input className="input" placeholder={replyTo[post.id]?`Répondre à ${replyTo[post.id]}...`:t('writeComment')} value={cmtText[post.id]||''} onChange={e=>setCmtText(p=>({...p,[post.id]:e.target.value}))} onKeyDown={e=>e.key==='Enter'&&addComment(post.id)} style={{ flex:1, padding:'7px 12px', fontSize:13 }} maxLength={MAX_COMMENT}/>
                  <button onClick={() => cPhotoRef.current[post.id]?.click()} style={{ background:'none', border:'none', cursor:'pointer', color:'#65676B', padding:4 }}><HiPhotograph size={18}/></button>
                  <button onClick={() => cVideoRef.current[post.id]?.click()} style={{ background:'none', border:'none', cursor:'pointer', color:'#65676B', padding:4 }}><HiVideoCamera size={18}/></button>
                  <button onClick={() => addComment(post.id)} style={{ background:'linear-gradient(135deg,#FF2D8D,#FF7AB8)', border:'none', borderRadius:'50%', width:32, height:32, cursor:'pointer', color:'white', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>➤</button>
                </div>
              </div>
            )}
          </div>

          {/* Suggestions en rotation toutes les 10 publications : amis → groupes → stories */}
          {(pIdx + 1) % 10 === 0 && (() => {
            const slot = Math.floor((pIdx + 1) / 10) - 1;
            const grpSugg = pageGroups.filter(g => !g.members?.includes(currentUser.uid));
            let kind = ['amis', 'groupes', 'stories'][slot % 3];
            if (kind === 'groupes' && grpSugg.length === 0) kind = 'amis';
            if (kind === 'stories' && storyGroups.length === 0) kind = 'amis';
            if (kind === 'amis' && suggestions.length === 0) return null;

            if (kind === 'groupes') {
              return (
                <div className="card post-card" style={{ marginBottom:14, padding:'12px 0' }}>
                  <p style={{ padding:'0 16px 10px', fontWeight:700, fontSize:15 }}>Groupes que vous pourriez rejoindre</p>
                  <div style={{ display:'flex', gap:10, overflowX:'auto', padding:'0 16px 4px', scrollbarWidth:'none' }}>
                    {grpSugg.slice(0, 8).map(g => (
                      <div key={g.id} onClick={() => navigate(`/groups/${g.id}`)} style={{ flexShrink:0, width:150, border:'1px solid #E4E6EB', borderRadius:12, overflow:'hidden', background:'white', cursor:'pointer' }}>
                        <div style={{ width:'100%', height:82, background:'linear-gradient(135deg,#1B84FF,#1877F2)', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
                          {g.photoURL
                            ? <img src={g.photoURL} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                            : <HiUserGroup size={30} color="white"/>}
                        </div>
                        <div style={{ padding:'8px 8px 10px' }}>
                          <p style={{ fontWeight:700, fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{g.name}</p>
                          <p style={{ fontSize:11, color:'#65676B' }}>{g.members?.length || 0} membre{(g.members?.length||0)>1?'s':''}</p>
                          <button className="btn-blue" style={{ width:'100%', marginTop:6, padding:'7px 0', fontSize:12, borderRadius:8 }}>Voir le groupe</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }

            if (kind === 'stories') {
              return (
                <div className="card post-card" style={{ marginBottom:14, padding:'12px 0' }}>
                  <p style={{ padding:'0 16px 10px', fontWeight:700, fontSize:15 }}>Stories</p>
                  <div style={{ display:'flex', gap:8, overflowX:'auto', padding:'0 16px 4px', scrollbarWidth:'none' }}>
                    {storyGroups.slice(0, 10).map(g => {
                      const last = g.items[g.items.length - 1];
                      return (
                        <div key={g.uid} className="story-card" onClick={() => openStories(g)} style={{ width:92, height:150 }}>
                          {last.mediaType === 'video'
                            ? <video src={last.mediaURL} muted playsInline preload="metadata" />
                            : <img src={last.mediaURL} alt="" />}
                          <div className="story-gradient" />
                          <img className="story-avatar" src={g.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(g.name||'U')}&background=1877F2&color=fff`} alt="" />
                          <span className="story-name">{g.uid === currentUser.uid ? 'Votre story' : g.name?.split(' ')[0]}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }

            const off = (slot * 6) % suggestions.length;
            const chunk = [...suggestions.slice(off), ...suggestions.slice(0, off)].slice(0, 8);
            return (
              <div className="card post-card" style={{ marginBottom:14, padding:'12px 0' }}>
                <p style={{ padding:'0 16px 10px', fontWeight:700, fontSize:15 }}>Personnes que vous connaissez peut-être</p>
                <div style={{ display:'flex', gap:10, overflowX:'auto', padding:'0 16px 4px', scrollbarWidth:'none' }}>
                  {chunk.map(u => (
                    <div key={u.uid} style={{ flexShrink:0, width:136, border:'1px solid #E4E6EB', borderRadius:12, overflow:'hidden', background:'white' }}>
                      <img src={u.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.fullName)}&background=1877F2&color=fff`}
                        alt="" onClick={() => navigate(`/profile/${u.uid}`)}
                        style={{ width:'100%', height:110, objectFit:'cover', cursor:'pointer', display:'block' }} />
                      <div style={{ padding:'8px 8px 10px' }}>
                        <p onClick={() => navigate(`/profile/${u.uid}`)} style={{ fontWeight:700, fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', cursor:'pointer' }}>{u.fullName}</p>
                        {hasSentReq(u.uid)
                          ? <button disabled className="btn-secondary" style={{ width:'100%', marginTop:6, padding:'7px 0', fontSize:12, borderRadius:8 }}>Demande envoyée</button>
                          : <button onClick={() => sendFriendReq(u.uid, u.fullName)} className="btn-blue" style={{ width:'100%', marginTop:6, padding:'7px 0', fontSize:12, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
                              <HiUserAdd size={14}/> Ajouter
                            </button>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
          </div>
        );
      })}

      {shareModalPost && <ShareModal post={shareModalPost} onClose={() => setShareModalPost(null)} />}

      {/* ── Bottom sheet : Plus d'options (format "Créer une publication" Facebook) ── */}
      {composerMoreOpen && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:400, display:'flex', alignItems:'flex-end', justifyContent:'center' }} onClick={() => setComposerMoreOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background:'white', borderRadius:'20px 20px 0 0', padding:'8px 0 20px', width:'100%', maxWidth:480 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 20px 14px' }}>
              <h3 style={{ fontWeight:800, fontSize:16 }}>Plus d'options</h3>
              <button onClick={() => setComposerMoreOpen(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'#65676B' }}><HiX size={20}/></button>
            </div>
            {[
              { icon:<HiUserAdd size={20} color="#1877F2"/>, label:'Identifier des personnes', action:() => { setComposerMoreOpen(false); openComposerTagModal(); } },
              { icon:<NeonLocation size={20}/>, label: postLocation ? `Lieu : ${postLocation}` : 'Ajouter un lieu', action:() => { setComposerMoreOpen(false); setLocationPromptOpen(true); } },
              { icon:<span style={{ fontSize:20 }}>😊</span>, label: postMood || 'Humeur / Activité', action:() => { setComposerMoreOpen(false); setMoodPickerOpen(true); } },
              { icon:<HiPaperAirplane size={20} color="#1877F2"/>, label: allowMessages ? 'Recevoir des messages : Activé' : 'Recevoir des messages : Désactivé', action:() => setAllowMessages(p => !p) },
              { icon:<span className="icon-badge-3d" style={{ width:26, height:26, borderRadius:8, background:'linear-gradient(145deg,#3DD9C4,#12A48D)', display:'inline-flex' }}><HiCalendar size={14} color="white"/></span>, label:'Créer un événement', action:() => { setComposerMoreOpen(false); navigate('/events'); } },
              { icon:<span className="icon-badge-3d" style={{ width:26, height:26, borderRadius:8, background:'linear-gradient(145deg,#FF6B6B,#E0242D)', display:'inline-flex' }}><HiVideoCamera size={14} color="white"/></span>, label:'Lancer un direct', action:() => { setComposerMoreOpen(false); alert("Le Live arrive bientôt sur Trengo — une infrastructure vidéo dédiée est en préparation. En attendant, essayez une Story ou un Reel !"); } },
            ].map((item, i) => (
              <button key={i} onClick={item.action} style={{ width:'100%', display:'flex', alignItems:'center', gap:14, padding:'13px 20px', background:'none', border:'none', cursor:'pointer', fontFamily:'Poppins', fontSize:15, fontWeight:600, color:'#050505', textAlign:'left' }}>
                {item.icon} {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Prompt : Ajouter un lieu ─────────────────────────── */}
      {locationPromptOpen && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:410, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={() => setLocationPromptOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background:'white', borderRadius:18, padding:20, width:'100%', maxWidth:360 }}>
            <h3 style={{ fontWeight:800, fontSize:15, marginBottom:12 }}>📍 Ajouter un lieu</h3>
            <input className="input" autoFocus placeholder="Où êtes-vous ?" value={postLocation} onChange={e => setPostLocation(e.target.value)} maxLength={100} style={{ marginBottom:14 }}/>
            <button onClick={() => setLocationPromptOpen(false)} className="btn-primary" style={{ width:'100%', padding:'10px 0', fontSize:14 }}>OK</button>
          </div>
        </div>
      )}

      {/* ── Sélecteur : Humeur / Activité ────────────────────── */}
      {moodPickerOpen && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:410, display:'flex', alignItems:'flex-end', justifyContent:'center' }} onClick={() => setMoodPickerOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background:'white', borderRadius:'20px 20px 0 0', padding:20, width:'100%', maxWidth:480 }}>
            <h3 style={{ fontWeight:800, fontSize:15, marginBottom:12 }}>Comment vous sentez-vous ?</h3>
            {MOODS.map(m => (
              <button key={m} onClick={() => { setPostMood(m); setMoodPickerOpen(false); }}
                style={{ width:'100%', textAlign:'left', padding:'11px 6px', background:'none', border:'none', borderBottom:'1px solid #F0F2F5', cursor:'pointer', fontSize:15, fontFamily:'Poppins' }}>
                {m}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Modal : Identifier des amis (avant publication) ──── */}
      {composerTagOpen && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:410, display:'flex', alignItems:'flex-end', justifyContent:'center' }} onClick={() => setComposerTagOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background:'white', borderRadius:'20px 20px 0 0', padding:20, width:'100%', maxWidth:480, maxHeight:'75vh', overflowY:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
              <h3 style={{ fontWeight:800, fontSize:16 }}>Identifier des amis</h3>
              <button onClick={() => setComposerTagOpen(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'#65676B' }}><HiX size={20}/></button>
            </div>
            {composerTagList.length === 0 && <p style={{ fontSize:13, color:'#65676B', textAlign:'center', padding:'16px 0' }}>Vous n'avez pas encore d'amis à identifier.</p>}
            {composerTagList.map(f => (
              <label key={f.uid} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 4px', cursor:'pointer', borderBottom:'1px solid #F0F2F5' }}>
                <input type="checkbox" checked={!!composerTagSel[f.uid]} onChange={e => setComposerTagSel(p => ({ ...p, [f.uid]: e.target.checked }))} style={{ width:18, height:18, accentColor:'#1877F2' }}/>
                <img src={f.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(f.fullName||'U')}&background=1877F2&color=fff`} alt="" style={{ width:36, height:36, borderRadius:'50%', objectFit:'cover' }}/>
                <p style={{ fontWeight:600, fontSize:14 }}>{f.fullName}</p>
              </label>
            ))}
            <button onClick={() => setComposerTagOpen(false)} className="btn-primary" style={{ width:'100%', marginTop:14, padding:'11px 0', fontSize:14 }}>OK</button>
          </div>
        </div>
      )}

      {/* ── Modal : Identifier des amis ─────────────────────── */}
      {tagModalPost && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:400, display:'flex', alignItems:'flex-end', justifyContent:'center' }} onClick={() => setTagModalPost(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background:'white', borderRadius:'20px 20px 0 0', padding:20, width:'100%', maxWidth:480, maxHeight:'75vh', overflowY:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
              <h3 style={{ fontWeight:800, fontSize:16 }}>Identifier des amis</h3>
              <button onClick={() => setTagModalPost(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'#65676B' }}><HiX size={20}/></button>
            </div>
            {tagFriendsList.length === 0 && <p style={{ fontSize:13, color:'#65676B', textAlign:'center', padding:'16px 0' }}>Vous n'avez pas encore d'amis à identifier.</p>}
            {tagFriendsList.map(f => (
              <label key={f.uid} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 4px', cursor:'pointer', borderBottom:'1px solid #F0F2F5' }}>
                <input type="checkbox" checked={!!tagSelected[f.uid]} onChange={e => setTagSelected(p => ({ ...p, [f.uid]: e.target.checked }))} style={{ width:18, height:18, accentColor:'#1877F2' }}/>
                <img src={f.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(f.fullName||'U')}&background=1877F2&color=fff`} alt="" style={{ width:36, height:36, borderRadius:'50%', objectFit:'cover' }}/>
                <p style={{ fontWeight:600, fontSize:14 }}>{f.fullName}</p>
              </label>
            ))}
            <button onClick={saveTags} className="btn-primary" style={{ width:'100%', marginTop:14, padding:'11px 0', fontSize:14 }}>Enregistrer</button>
          </div>
        </div>
      )}
    </div>
  );
}