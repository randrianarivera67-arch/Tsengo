// src/pages/ShopDetail.jsx — Page Boutique (firafitra mitovy amin'ny page Artiste)
// Real-time (onSnapshot), messagerie dédiée, menu ⋮ (admin/visiteur), publication
// page/groupes misy recherche, cards misy prix/vues/clics/réactions (sary 2).
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  doc, onSnapshot, updateDoc, deleteDoc, collection, query, where, getDocs,
  addDoc, serverTimestamp, arrayUnion, arrayRemove, writeBatch, increment, deleteField
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { uploadToTelegram } from '../utils/telegram';
import { timeAgo } from '../utils/timeAgo';
import { NeonPhone, NeonLocation, NeonPlaneWhite, NeonChart, NeonEye } from '../components/NeonIcons';
import FollowListModal from '../components/FollowListModal';
import ShareModal from '../components/ShareModal';
import { downloadMedia } from '../utils/download';
import { parseAppLink } from '../utils/appLink';
import { addToCart } from '../utils/cart';
import {
  HiCamera, HiArrowLeft, HiPencil, HiX, HiTrash, HiDotsVertical, HiPaperAirplane,
  HiShoppingBag, HiPhotograph, HiTag, HiCog, HiBan, HiFlag, HiShoppingCart,
  HiInformationCircle, HiDownload, HiLightningBolt, HiSearch, HiLink, HiShare,
  HiEye, HiCursorClick, HiHeart, HiOutlineHeart, HiChat
} from 'react-icons/hi';

const CATEGORIES = ['Vêtements', 'Robes', 'Hauts', 'Pantalons', 'Chaussures', 'Accessoires', 'Électronique', 'Déco & Maison', 'Véhicules', 'Alimentation', 'Beauté', 'Autre'];

// Vues : isaina indray mandeha isaky ny session (tsy mitombo tsy misy antony)
const viewedThisSession = new Set();

export default function ShopDetail() {
  const { shopId } = useParams();
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();

  const [shop, setShop] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [items, setItems] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name:'', description:'', address:'', team:'', contact:'', category:CATEGORIES[0] });
  const [followersOpen, setFollowersOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);

  // ── Ajouter un article ──
  const [content, setContent] = useState('');
  const [price, setPrice] = useState('');
  const [itemOldPrice, setItemOldPrice] = useState('');
  const [itemCategory, setItemCategory] = useState(CATEGORIES[0]);
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [posting, setPosting] = useState(false);
  const [itemFullOpen, setItemFullOpen] = useState(false);
  const [publishTarget, setPublishTarget] = useState('page');   // 'page' | 'groups'
  const [myGroups, setMyGroups] = useState([]);
  const [itemGroupSel, setItemGroupSel] = useState({});
  const [groupQ, setGroupQ] = useState('');

  // ── Lisitra articles ──
  const [shopFilter, setShopFilter] = useState('Tout');
  const [itemQ, setItemQ] = useState('');
  const [sortBy, setSortBy] = useState('recent');   // recent | priceAsc | priceDesc | views
  const [itemMenu, setItemMenu] = useState(null);   // article misokatra menu
  const [itemInfo, setItemInfo] = useState(null);   // fiche article
  const [sharePost, setSharePost] = useState(null);

  const photoInputRef = useRef(); const coverRef = useRef(); const logoRef = useRef();

  const isAdmin = !!shop?.admins?.includes(currentUser?.uid);
  const isFollowing = !!shop?.followers?.includes(currentUser?.uid);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'shops', shopId), snap => {
      if (!snap.exists()) { setNotFound(true); return; }
      setShop({ id: snap.id, ...snap.data() });
    }, err => console.error('Shop:', err?.message || err));
    return () => unsub();
  }, [shopId]);

  useEffect(() => {
    const q = query(collection(db, 'posts'), where('shopId', '==', shopId));
    const unsub = onSnapshot(q, snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => !p.groupId);
      list.sort((a,b) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0));
      setItems(list);
    }, err => console.error('Shop items:', err?.message || err));
    return () => unsub();
  }, [shopId]);

  // ── Compteur "vues" : mitombo indray mandeha isaky ny session ho an'ny article miseho ──
  useEffect(() => {
    if (!items.length || !currentUser) return;
    const fresh = items.filter(p => !viewedThisSession.has(p.id));
    if (!fresh.length) return;
    fresh.forEach(p => viewedThisSession.add(p.id));
    const batch = writeBatch(db);
    fresh.forEach(p => batch.update(doc(db, 'posts', p.id), { views: increment(1) }));
    batch.commit().catch(() => {});
  }, [items.length]); // eslint-disable-line

  useEffect(() => { const fn = () => setMenuOpen(false); document.addEventListener('click', fn); return () => document.removeEventListener('click', fn); }, []);

  async function changeImage(e, field) {
    const file = e.target.files[0]; if (!file) return;
    try { const r = await uploadToTelegram(file); await updateDoc(doc(db, 'shops', shopId), { [field]: r.url }); }
    catch (err) { alert('Erreur : ' + (err?.message || err)); }
    e.target.value = '';
  }

  async function toggleFollowShop() {
    try { await updateDoc(doc(db, 'shops', shopId), { followers: isFollowing ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid) }); }
    catch (err) { alert('Erreur : ' + (err?.message || err)); }
  }

  function openEdit() {
    setEditForm({ name: shop.name||'', description: shop.description||'', address: shop.address||'', team: shop.team||'', contact: shop.contact||'', category: shop.category||CATEGORIES[0] });
    setEditOpen(true);
  }
  async function saveEdit() {
    if (!editForm.name.trim()) return;
    try { await updateDoc(doc(db, 'shops', shopId), { ...editForm, name: editForm.name.trim() }); setEditOpen(false); }
    catch (err) { alert('Erreur : ' + (err?.message || err)); }
  }
  function copyPageLink() {
    setMenuOpen(false);
    const url = `${window.location.origin}/shop/${shopId}`;
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(url).then(() => alert('Lien copié !'), () => alert(url));
    else { const el = document.createElement('textarea'); el.value = url; document.body.appendChild(el); el.select(); document.execCommand('copy'); el.remove(); alert('Lien copié !'); }
  }

  async function reportShop() {
    setMenuOpen(false);
    if (!window.confirm('Signaler cette boutique aux administrateurs ?')) return;
    try {
      await addDoc(collection(db, 'reports'), {
        type: 'shop', targetId: shopId, targetUid: shop.createdBy || '', targetAuthor: shop.name,
        reportedBy: currentUser.uid, reportedByName: userProfile?.fullName || '',
        createdAt: serverTimestamp(), status: 'pending',
      });
      alert('Signalement envoyé. Merci.');
    } catch (err) { alert('Erreur : ' + (err?.message || err)); }
  }

  async function blockShop() {
    setMenuOpen(false);
    if (!window.confirm(`Bloquer la boutique "${shop.name}" ?`)) return;
    try { await updateDoc(doc(db, 'users', currentUser.uid), { blocked: arrayUnion(shopId) }); alert('Boutique bloquée.'); navigate('/shop'); }
    catch (err) { alert('Erreur : ' + (err?.message || err)); }
  }

  async function reportItem(p) {
    setItemMenu(null);
    if (!window.confirm('Signaler cet article aux administrateurs ?')) return;
    try {
      await addDoc(collection(db, 'reports'), {
        type: 'post', targetId: p.id, targetUid: p.uid || '', targetAuthor: shop.name,
        reportedBy: currentUser.uid, reportedByName: userProfile?.fullName || '',
        createdAt: serverTimestamp(), status: 'pending',
      });
      alert('Signalement envoyé. Merci.');
    } catch (err) { alert('Erreur : ' + (err?.message || err)); }
  }

  async function deleteItem(p) {
    setItemMenu(null);
    if (!window.confirm(`Supprimer "${(p.content||'cet article').slice(0,40)}" ?`)) return;
    try { await deleteDoc(doc(db, 'posts', p.id)); }
    catch (err) { alert('Erreur : ' + (err?.message || err)); }
  }

  async function deleteShop() {
    if (!window.confirm(`Supprimer définitivement la boutique "${shop.name}" ?`)) return;
    try { await deleteDoc(doc(db, 'shops', shopId)); navigate('/shop'); }
    catch (err) { alert('Erreur : ' + (err?.message || err)); }
  }

  // ── ❤️ réaction haingana amin'ny card ──
  async function toggleHeart(e, p) {
    e.stopPropagation();
    const mine = p.reactions?.[currentUser.uid];
    try {
      if (mine) await updateDoc(doc(db, 'posts', p.id), { [`reactions.${currentUser.uid}`]: deleteField() });
      else await updateDoc(doc(db, 'posts', p.id), { [`reactions.${currentUser.uid}`]: '❤️' });
    } catch (err) { console.warn('heart:', err?.message); }
  }

  // ── Clic amin'ny card → compteur + detail ──
  function openItem(p) {
    updateDoc(doc(db, 'posts', p.id), { clicks: increment(1) }).catch(() => {});
    navigate(`/post/${p.id}`);
  }

  function pickPhoto(e) { const f = e.target.files[0]; if (!f) return; setMediaFile(f); setMediaPreview(URL.createObjectURL(f)); }

  async function loadMyGroups() {
    try {
      const snap = await getDocs(query(collection(db, 'groups'), where('members', 'array-contains', currentUser.uid)));
      setMyGroups(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.warn('loadMyGroups:', e?.message); }
  }
  function chooseTarget(target) {
    setPublishTarget(target);
    if (target === 'groups' && myGroups.length === 0) loadMyGroups();
  }

  async function publishItem() {
    if (!mediaFile) { alert("Ajoutez une photo de l'article"); return; }
    if (!content.trim()) { alert("Ajoutez le nom / la description de l'article"); return; }
    setPosting(true);
    try {
      const r = await uploadToTelegram(mediaFile);
      const targetGroups = publishTarget === 'groups' ? Object.keys(itemGroupSel).filter(k => itemGroupSel[k]) : [];

      const baseData = {
        uid: currentUser.uid, authorName: shop.name, authorUsername: '', authorPhoto: shop.photoURL || '',
        content: content.trim().slice(0, 500), mediaURL: r.url, mediaType: 'image', thumbURL: '',
        isSale: true, price: parseFloat(price) || 0, oldPrice: parseFloat(itemOldPrice) || 0,
        contact: shop.contact || '', lieu: shop.address || '',
        saleCategory: itemCategory || shop.category || '',
        shopId: shop.id, shopName: shop.name, shopPhoto: shop.photoURL || '',
        views: 0, clicks: 0,
        reactions: {}, comments: [], createdAt: serverTimestamp(),
      };

      if (targetGroups.length > 0) {
        // Publier dans chaque groupe (la boutique publie directement dedans)
        const batch = writeBatch(db);
        targetGroups.forEach(gid => {
          const g = myGroups.find(x => x.id === gid);
          const ref = doc(collection(db, 'posts'));
          batch.set(ref, { ...baseData, groupId: gid, groupName: g?.name || '', postedByShop: true });
        });
        await batch.commit();
      } else {
        // Publier sur la page boutique (+ fil d'actualités)
        await addDoc(collection(db, 'posts'), baseData);
      }

      // ✅ L'article est publié — une notification qui échoue ne doit JAMAIS
      // déclencher un faux message "Erreur"
      try {
        const targets = targetGroups.length === 0 ? (shop.followers || []) : [];
        if (targets.length > 0) {
          const batch = writeBatch(db);
          targets.forEach(fUid => batch.set(doc(collection(db,'notifications')), {
            toUid: fUid, fromUid: currentUser.uid, fromName: shop.name, fromPhoto: shop.photoURL || '',
            type: 'post', message: `${shop.name} a ajouté un nouvel article : ${content.trim().slice(0,40)}`,
            read: false, createdAt: serverTimestamp(),
          }));
          await batch.commit();
        }
      } catch (notifErr) { console.warn('Notification abonnés échouée (article déjà publié) :', notifErr?.message || notifErr); }

      setContent(''); setPrice(''); setItemOldPrice(''); setItemCategory(CATEGORIES[0]);
      setMediaFile(null); setMediaPreview(null);
      setPublishTarget('page'); setItemGroupSel({}); setGroupQ(''); setItemFullOpen(false);
    } catch (err) { alert('Erreur : ' + (err?.message || err)); }
    setPosting(false);
  }

  if (notFound) return (
    <div style={{ padding:40, textAlign:'center' }}>
      <p style={{ fontWeight:700, marginBottom:10 }}>Cette boutique n'existe plus.</p>
      <button className="btn-primary" onClick={() => navigate('/shop')} style={{ padding:'10px 20px', borderRadius:20 }}>Voir les boutiques</button>
    </div>
  );
  if (!shop) return <div style={{ padding:40, textAlign:'center', color:'#65676B' }}>Chargement...</div>;

  return (
    <div style={{ paddingBottom:20 }}>
      {/* ── Couverture + logo (mitovy amin'ny artiste) ── */}
      <div style={{ position:'relative', height:170, background: shop.coverURL ? '#000' : 'linear-gradient(135deg,#FF2D8D,#FF9A5A,#F2B300)' }}>
        {shop.coverURL && <img src={shop.coverURL} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />}
        <button onClick={() => navigate('/shop')} style={{ position:'absolute', top:10, left:10, width:36, height:36, borderRadius:'50%', background:'rgba(0,0,0,.45)', border:'none', cursor:'pointer', color:'white', display:'flex', alignItems:'center', justifyContent:'center' }}><HiArrowLeft size={20}/></button>
        {isAdmin && (<>
          <input ref={coverRef} type="file" accept="image/*" style={{ display:'none' }} onChange={e => changeImage(e,'coverURL')} />
          <button onClick={() => coverRef.current?.click()} style={{ position:'absolute', bottom:10, right:10, background:'rgba(255,255,255,.92)', border:'none', borderRadius:18, padding:'7px 12px', cursor:'pointer', fontSize:12, fontWeight:700, display:'flex', alignItems:'center', gap:5 }}><HiCamera size={15}/> Couverture</button>
        </>)}
        <div style={{ position:'absolute', bottom:-32, left:16 }}>
          <div style={{ position:'relative' }}>
            <div style={{ width:74, height:74, borderRadius:'50%', background:'linear-gradient(145deg,#FF6FA5,#FF2D8D)', border:'4px solid white', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
              {shop.photoURL ? <img src={shop.photoURL} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : <HiShoppingBag size={30} color="white"/>}
            </div>
            {isAdmin && (<>
              <input ref={logoRef} type="file" accept="image/*" style={{ display:'none' }} onChange={e => changeImage(e,'photoURL')} />
              <button onClick={() => logoRef.current?.click()} style={{ position:'absolute', bottom:-4, right:-4, width:26, height:26, borderRadius:'50%', background:'#FF2D8D', border:'2.5px solid white', cursor:'pointer', color:'white', display:'flex', alignItems:'center', justifyContent:'center' }}><HiCamera size={12}/></button>
            </>)}
          </div>
        </div>
      </div>

      {/* ── Anarana, badge, abonnés, menu ⋮ (mitovi-drafitra amin'ny artiste) ── */}
      <div style={{ padding:'40px 16px 0' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div style={{ minWidth:0 }}>
            <h2 style={{ fontWeight:800, fontSize:19, display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
              {shop.name}
              {isAdmin && <span style={{ fontSize:10, fontWeight:800, color:'#F2B300', background:'#FFF6DB', borderRadius:8, padding:'2px 8px' }}>ADMIN</span>}
            </h2>
            <p style={{ fontSize:12, color:'#65676B' }}>
              🏪 {shop.category} · <span onClick={() => (shop.followers||[]).length>0 && setFollowersOpen(true)} style={{ cursor:(shop.followers||[]).length>0?'pointer':'default', textDecoration:(shop.followers||[]).length>0?'underline':'none' }}><b style={{ fontWeight:800 }}>{(shop.followers||[]).length}</b> abonnés</span>
            </p>
          </div>
          <div style={{ position:'relative' }} onClick={e => e.stopPropagation()}>
            <span style={{ display:'flex', alignItems:'center', gap:8 }}>
              {isAdmin && (
                <button onClick={() => setStatsOpen(true)} title="Statistiques" style={{ background:'linear-gradient(145deg,#3DD9C4,#12A48D)', border:'none', borderRadius:12, width:42, height:42, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 10px rgba(18,164,141,.35)' }}><NeonChart size={20} color="#fff"/></button>
              )}
              <button onClick={() => navigate(`/shop/${shopId}/messages`)} title="Messages" style={{ background:'linear-gradient(150deg,#FFD84D,#D69A00)', border:'none', borderRadius:12, width:42, height:42, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', boxShadow:'0 4px 10px rgba(214,154,0,.4)' }}><HiPaperAirplane size={22} style={{ transform:'rotate(90deg)' }}/></button>
              <button onClick={() => setMenuOpen(p=>!p)} title={isAdmin ? 'Paramètres' : 'Options'} style={{ background:'#F0F2F5', border:'none', borderRadius:'50%', width:42, height:42, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#050505' }}>{isAdmin ? <HiCog size={21}/> : <HiDotsVertical size={20}/>}</button>
            </span>
            {menuOpen && (
              <div style={{ position:'absolute', top:'100%', right:0, background:'white', border:'1px solid #E4E6EB', borderRadius:12, boxShadow:'0 4px 20px rgba(0,0,0,.14)', minWidth:180, zIndex:50, overflow:'hidden' }}>
                {isAdmin ? (<>
                  <button onClick={() => { setMenuOpen(false); openEdit(); }} style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'14px 18px', background:'none', border:'none', cursor:'pointer', fontSize:14.5, fontWeight:600, color:'#050505', borderBottom:'1px solid #F0F2F5' }}><HiPencil size={18} color="#1877F2"/> Modifier la boutique</button>
                  <button onClick={() => { setMenuOpen(false); deleteShop(); }} style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'14px 18px', background:'none', border:'none', cursor:'pointer', fontSize:14.5, fontWeight:600, color:'#FF2D8D' }}><HiTrash size={18}/> Supprimer la boutique</button>
                  <button onClick={copyPageLink} style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'14px 18px', background:'none', border:'none', cursor:'pointer', fontSize:14.5, fontWeight:600, color:'#050505', borderTop:'1px solid #F0F2F5' }}><HiLink size={18} color="#12A48D"/> Copier le lien</button>
                </>) : (<>
                  <button onClick={copyPageLink} style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'14px 18px', background:'none', border:'none', cursor:'pointer', fontSize:14.5, fontWeight:600, color:'#050505', borderBottom:'1px solid #F0F2F5' }}><HiLink size={18} color="#12A48D"/> Copier le lien</button>
                  <button onClick={reportShop} style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'14px 18px', background:'none', border:'none', cursor:'pointer', fontSize:14.5, fontWeight:600, color:'#050505', borderBottom:'1px solid #F0F2F5' }}><HiFlag size={18} color="#F2B300"/> Signaler aux admins</button>
                  <button onClick={blockShop} style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'14px 18px', background:'none', border:'none', cursor:'pointer', fontSize:14.5, fontWeight:600, color:'#FF2D8D' }}><HiBan size={18}/> Bloquer cette boutique</button>
                </>)}
              </div>
            )}
          </div>
        </div>

        {shop.description && <p style={{ fontSize:14, marginTop:8 }}>{shop.description}</p>}
        <div style={{ display:'flex', flexDirection:'column', gap:7, marginTop:10 }}>
          {shop.address && <p style={{ fontSize:13, display:'flex', alignItems:'center', gap:8 }}><NeonLocation size={15}/> {shop.address}</p>}
          {shop.contact && <p style={{ fontSize:13, display:'flex', alignItems:'center', gap:8 }}><NeonPhone size={15}/> {shop.contact}</p>}
          {shop.team && <p style={{ fontSize:13, color:'#65676B' }}>👥 Équipe : {shop.team}</p>}
        </div>

        {!isAdmin && (
          <button onClick={toggleFollowShop} className={isFollowing ? 'btn-secondary' : 'btn-gold'} style={{ width:'100%', marginTop:12, padding:'10px 0', fontSize:14, borderRadius:10 }}>
            {isFollowing ? '✓ Abonné' : '⭐ Suivre cette boutique'}
          </button>
        )}
      </div>

      {isAdmin && (
        <div className="card post-card" style={{ padding:12, marginTop:14, marginBottom:8 }}>
          <button onClick={() => setItemFullOpen(true)}
            style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:8, background:'linear-gradient(145deg,#FF6FA5,#FF2D8D)', border:'none', borderRadius:22, padding:'12px', color:'white', fontWeight:800, fontSize:15, fontFamily:'Poppins', cursor:'pointer' }}>
            <HiShoppingBag size={20}/> Ajouter un article
          </button>
        </div>
      )}

      {/* ── PAGE FENO : Ajouter un article (mitovy flow amin'ny artiste) ── */}
      {itemFullOpen && (
      <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.35)', zIndex:350, display:'flex', alignItems:'flex-start', justifyContent:'center', overflowY:'auto' }}>
      <div className="card post-card" style={{ padding:16, width:'100%', maxWidth:600, minHeight:'100vh', borderRadius:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14, paddingBottom:12, borderBottom:'1px solid #E4E6EB' }}>
          <button onClick={() => setItemFullOpen(false)} style={{ background:'none', border:'none', cursor:'pointer', padding:4 }}><HiX size={24} color="#050505"/></button>
          <h3 style={{ fontWeight:800, fontSize:18, flex:1 }}>Ajouter un article</h3>
          <button onClick={publishItem} disabled={posting || !mediaFile || !content.trim()} className="btn-gold" style={{ padding:'7px 20px', fontSize:14 }}>{posting ? '...' : 'Publier'}</button>
        </div>

        <input ref={photoInputRef} type="file" accept="image/*" style={{ display:'none' }} onChange={pickPhoto} />

        {/* Photo */}
        {mediaPreview ? (
          <div style={{ position:'relative', marginBottom:10 }}>
            <img src={mediaPreview} alt="" style={{ width:'100%', borderRadius:12, maxHeight:260, objectFit:'cover' }} />
            <button onClick={() => { setMediaFile(null); setMediaPreview(null); }} style={{ position:'absolute', top:6, right:6, background:'rgba(0,0,0,.55)', border:'none', borderRadius:'50%', width:28, height:28, cursor:'pointer', color:'white', display:'flex', alignItems:'center', justifyContent:'center' }}><HiX size={15}/></button>
          </div>
        ) : (
          <button onClick={() => photoInputRef.current?.click()} className="btn-blue" style={{ display:'flex', alignItems:'center', gap:6, padding:'12px', fontSize:14, borderRadius:12, width:'100%', justifyContent:'center', marginBottom:10 }}><HiPhotograph size={18}/> Photo de l'article *</button>
        )}

        {/* Champs mifanaraka amin'izay miseho amin'ny card */}
        <textarea className="input" placeholder="Nom / description de l'article *" value={content} onChange={e => setContent(e.target.value)} rows={3} style={{ resize:'none', marginBottom:8 }} maxLength={500} />
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
          <HiTag color="#FF2D8D" size={18}/>
          <input className="input" type="number" placeholder="Prix (Ar) *" value={price} onChange={e => setPrice(e.target.value)} style={{ flex:1 }} />
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
          <span style={{ fontSize:13, color:'#8A8D91', width:22, textAlign:'center' }}>≈</span>
          <input className="input" type="number" placeholder="Ancien prix (optionnel — pour afficher -%)" value={itemOldPrice} onChange={e => setItemOldPrice(e.target.value)} style={{ flex:1 }} />
        </div>
        <select value={itemCategory} onChange={e => setItemCategory(e.target.value)} className="input" style={{ marginBottom:12 }}>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        {/* Choix : publier dans ma boutique OU dans des groupes */}
        <div style={{ border:'1px solid #E4E6EB', borderRadius:12, overflow:'hidden', marginBottom:8 }}>
          <button onClick={() => chooseTarget('page')}
            style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'13px 16px', background: publishTarget==='page' ? '#E7F0FE' : 'none', border:'none', borderBottom:'1px solid #F0F2F5', cursor:'pointer', textAlign:'left', fontFamily:'Poppins', fontSize:14, fontWeight:700, color:'#050505' }}>
            <span style={{ width:18, height:18, borderRadius:'50%', border:'2px solid #1877F2', display:'inline-flex', alignItems:'center', justifyContent:'center' }}>{publishTarget==='page' && <span style={{ width:9, height:9, borderRadius:'50%', background:'#1877F2' }}/>}</span>
            Publier dans ma boutique
          </button>
          <button onClick={() => chooseTarget('groups')}
            style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'13px 16px', background: publishTarget==='groups' ? '#E7F0FE' : 'none', border:'none', cursor:'pointer', textAlign:'left', fontFamily:'Poppins', fontSize:14, fontWeight:700, color:'#050505' }}>
            <span style={{ width:18, height:18, borderRadius:'50%', border:'2px solid #1877F2', display:'inline-flex', alignItems:'center', justifyContent:'center' }}>{publishTarget==='groups' && <span style={{ width:9, height:9, borderRadius:'50%', background:'#1877F2' }}/>}</span>
            Publier dans des groupes
          </button>
        </div>

        {/* Liste des groupes — avec recherche (mitovy amin'ny artiste) */}
        {publishTarget === 'groups' && (() => {
          const lowG = groupQ.trim().toLowerCase();
          const shown = myGroups.filter(g => !lowG || (g.name || '').toLowerCase().includes(lowG));
          const nSel = Object.values(itemGroupSel).filter(Boolean).length;
          return (
          <div style={{ border:'1px solid #E4E6EB', borderRadius:12, overflow:'hidden', marginBottom:8 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px 6px', background:'#FAFBFC' }}>
              <span style={{ fontSize:12, fontWeight:800, color:'#65676B' }}>Groupes ({myGroups.length})</span>
              {nSel > 0 && <span style={{ fontSize:11, fontWeight:700, color:'#fff', background:'#1877F2', borderRadius:10, padding:'2px 8px' }}>{nSel} sélectionné{nSel > 1 ? 's' : ''}</span>}
            </div>

            <div style={{ padding:'0 12px 10px', background:'#FAFBFC' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, background:'#fff', border:'1px solid #E4E6EB', borderRadius:18, padding:'7px 12px' }}>
                <HiSearch size={15} color="#65676B"/>
                <input value={groupQ} onChange={e => setGroupQ(e.target.value)} placeholder="Rechercher un groupe…"
                  style={{ flex:1, border:'none', outline:'none', fontSize:13, background:'transparent', color:'#050505', minWidth:0, fontFamily:'Poppins' }} />
                {groupQ && <button onClick={() => setGroupQ('')} style={{ background:'#F0F2F5', border:'none', borderRadius:'50%', width:20, height:20, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#65676B', flexShrink:0 }}><HiX size={11}/></button>}
              </div>
            </div>

            <div style={{ maxHeight:230, overflowY:'auto' }}>
              {myGroups.length === 0 && <p style={{ padding:16, textAlign:'center', fontSize:13, color:'#65676B' }}>Aucun groupe accessible.</p>}
              {myGroups.length > 0 && shown.length === 0 && <p style={{ padding:16, textAlign:'center', fontSize:13, color:'#65676B' }}>Aucun groupe trouvé.</p>}
              {shown.map(g => (
                <button key={g.id} onClick={() => setItemGroupSel(p => ({ ...p, [g.id]: !p[g.id] }))}
                  style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'11px 16px', background: itemGroupSel[g.id] ? 'rgba(24,119,242,.06)' : 'none', border:'none', borderTop:'1px solid #F0F2F5', cursor:'pointer', textAlign:'left', fontFamily:'Poppins', fontSize:14, color:'#050505' }}>
                  <span style={{ width:20, height:20, borderRadius:5, border:'2px solid #1877F2', background: itemGroupSel[g.id] ? '#1877F2' : 'transparent', display:'inline-flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:13, flexShrink:0 }}>{itemGroupSel[g.id] && '✓'}</span>
                  <span style={{ flex:1, minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{g.name}</span>
                  {typeof g.members !== 'undefined' && <span style={{ fontSize:11, color:'#8A8D91', flexShrink:0 }}>{(g.members || []).length} membres</span>}
                </button>
              ))}
            </div>
          </div>
          );
        })()}
      </div>
      </div>
      )}

      {items.length === 0 && <p style={{ padding:30, textAlign:'center', color:'#65676B', fontSize:14 }}>Aucun article publié pour le moment.</p>}

      {/* ── Articles : filtres catégorie + recherche + tri (sary 2) ── */}
      {items.length > 0 && (() => {
        const lowQ = itemQ.trim().toLowerCase();
        const match = p => !lowQ || (p.content || '').toLowerCase().includes(lowQ) || (p.saleCategory || '').toLowerCase().includes(lowQ);
        let shown = items.filter(p => (shopFilter==='Tout' || p.saleCategory===shopFilter) && match(p));
        if (sortBy === 'priceAsc')  shown = [...shown].sort((a,b) => (Number(a.price)||0) - (Number(b.price)||0));
        if (sortBy === 'priceDesc') shown = [...shown].sort((a,b) => (Number(b.price)||0) - (Number(a.price)||0));
        if (sortBy === 'views')     shown = [...shown].sort((a,b) => (b.views||0) - (a.views||0));

        return (
        <>
          {/* Chips catégorie */}
          <div style={{ display:'flex', gap:8, overflowX:'auto', padding:'4px 12px 8px', scrollbarWidth:'none' }}>
            {['Tout', ...Array.from(new Set(items.map(p => p.saleCategory).filter(Boolean)))].map(cat => (
              <button key={cat} onClick={() => setShopFilter(cat)}
                style={{ flex:'0 0 auto', padding:'7px 16px', borderRadius:18, border:'none', cursor:'pointer', fontFamily:'Poppins', fontSize:13, fontWeight:700,
                  background: shopFilter===cat ? 'linear-gradient(145deg,#FF6FA5,#FF2D8D)' : '#F0F2F5',
                  color: shopFilter===cat ? 'white' : '#65676B', whiteSpace:'nowrap' }}>
                {cat}
              </button>
            ))}
          </div>

          {/* Recherche article */}
          <div style={{ padding:'0 12px 8px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, background:'#F0F2F5', borderRadius:20, padding:'8px 13px' }}>
              <HiSearch size={16} color="#65676B"/>
              <input value={itemQ} onChange={e => { const l = parseAppLink(e.target.value); if (l) { setItemQ(''); navigate(l); return; } setItemQ(e.target.value); }} placeholder="Rechercher un article… ou coller un lien"
                style={{ flex:1, border:'none', outline:'none', fontSize:13.5, background:'transparent', color:'#050505', minWidth:0 }} />
              {itemQ && <button onClick={() => setItemQ('')} style={{ background:'#fff', border:'none', borderRadius:'50%', width:21, height:21, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#65676B', flexShrink:0 }}><HiX size={12}/></button>}
            </div>
          </div>

          {/* En-tête "Articles" + Trier par (sary 2) */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'2px 12px 8px' }}>
            <span style={{ fontWeight:800, fontSize:16 }}>Articles <span style={{ fontSize:12, color:'#65676B', fontWeight:600 }}>{shown.length} article{shown.length>1?'s':''}</span></span>
            <span style={{ display:'flex', alignItems:'center', gap:6, fontSize:12.5, color:'#65676B' }}>
              Trier par :
              <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ border:'1px solid #E4E6EB', borderRadius:10, padding:'4px 8px', fontSize:12.5, fontFamily:'Poppins', background:'#fff', color:'#050505', outline:'none', cursor:'pointer' }}>
                <option value="recent">Plus récents</option>
                <option value="priceAsc">Prix croissant</option>
                <option value="priceDesc">Prix décroissant</option>
                <option value="views">Plus vus</option>
              </select>
            </span>
          </div>

          {shown.length === 0 && <p style={{ padding:24, textAlign:'center', color:'#65676B', fontSize:13 }}>Aucun article trouvé.</p>}

          {/* Grille articles (sary 2) : -%, ❤️, prix/ancien prix, ⭐ réactions, vues, clics, Message */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, padding:'0 12px 12px' }}>
            {shown.map(p => {
              const oldPrice = Number(p.oldPrice) || 0;
              const discount = p.price && oldPrice > Number(p.price) ? Math.round((1 - Number(p.price)/oldPrice) * 100) : 0;
              const nReact = Object.keys(p.reactions || {}).length;
              const myHeart = !!p.reactions?.[currentUser?.uid];
              const stars = Math.max(1, Math.min(5, Math.round(nReact > 0 ? 4 + Math.min(1, nReact / 20) : 4)));
              return (
                <div key={p.id} onClick={() => openItem(p)} className="card" style={{ overflow:'hidden', cursor:'pointer', borderRadius:12, boxShadow:'0 1px 4px rgba(0,0,0,.08)' }}>
                  <div style={{ position:'relative' }}>
                    {p.mediaURL
                      ? <img src={p.mediaURL} alt="" style={{ width:'100%', aspectRatio:'1', objectFit:'cover', display:'block' }} />
                      : <div style={{ width:'100%', aspectRatio:'1', background:'#F0F2F5', display:'flex', alignItems:'center', justifyContent:'center' }}><HiShoppingBag size={34} color="#CED0D4"/></div>}
                    {discount > 0 && <span style={{ position:'absolute', top:6, left:6, background:'#FF1744', color:'white', fontSize:11, fontWeight:800, padding:'2px 7px', borderRadius:6 }}>-{discount}%</span>}
                    <button onClick={e => toggleHeart(e, p)} style={{ position:'absolute', top:6, right:6, width:30, height:30, borderRadius:'50%', background:'rgba(255,255,255,.95)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 1px 4px rgba(0,0,0,.15)' }}>
                      {myHeart ? <HiHeart size={17} color="#FF2D8D"/> : <HiOutlineHeart size={17} color="#050505"/>}
                    </button>
                  </div>
                  <div style={{ padding:'8px 9px 10px' }}>
                    <p style={{ fontSize:12.5, fontWeight:700, lineHeight:1.35, overflow:'hidden', textOverflow:'ellipsis', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', minHeight:34 }}>{p.content}</p>
                    <div style={{ display:'flex', alignItems:'baseline', gap:6, marginTop:5, flexWrap:'wrap' }}>
                      <span style={{ fontWeight:800, fontSize:15.5, color:'#FF2D8D' }}>{p.price ? `${Number(p.price).toLocaleString()} Ar` : 'À discuter'}</span>
                      {discount > 0 && <span style={{ fontSize:11, color:'#8A8D91', textDecoration:'line-through' }}>{oldPrice.toLocaleString()} Ar</span>}
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:4, marginTop:4 }}>
                      <span style={{ fontSize:10, color:'#FF9500', letterSpacing:1 }}>{'★'.repeat(stars)}{'☆'.repeat(5-stars)}</span>
                      <span style={{ fontSize:10.5, color:'#8A8D91' }}>· {nReact} réaction{nReact>1?'s':''}</span>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:6 }}>
                      <span style={{ display:'flex', alignItems:'center', gap:3, fontSize:10.5, color:'#65676B' }}><HiEye size={12}/> {(p.views||0).toLocaleString()} vues</span>
                      <span style={{ display:'flex', alignItems:'center', gap:3, fontSize:10.5, color:'#65676B' }}><HiCursorClick size={12}/> {(p.clicks||0).toLocaleString()} clics</span>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:8 }}>
                      <button onClick={e => { e.stopPropagation(); navigate(`/shop/${shopId}/messages`); }}
                        style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:4, background:'#fff', border:'1.5px solid #FF2D8D', borderRadius:16, padding:'6px 0', fontSize:11.5, fontWeight:700, color:'#FF2D8D', cursor:'pointer' }}>
                        <NeonPlaneWhite size={13}/> Message
                      </button>
                      <button onClick={e => { e.stopPropagation(); const ok = addToCart(p); alert(ok ? 'Article ajouté au panier 🛒' : 'Cet article est déjà dans votre panier'); }}
                        title="Ajouter au panier"
                        style={{ width:32, height:30, display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(145deg,#FF6FA5,#FF2D8D)', border:'none', borderRadius:16, cursor:'pointer', color:'#fff', flexShrink:0 }}>
                        <HiShoppingCart size={15}/>
                      </button>
                      <button onClick={e => { e.stopPropagation(); setItemMenu(p); }} style={{ background:'none', border:'none', cursor:'pointer', color:'#65676B', padding:2, flexShrink:0 }}><HiDotsVertical size={16}/></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
        );
      })()}

      {/* ── Partager (mitovy amin'ny artiste) ── */}
      {sharePost && <ShareModal post={sharePost} asPage={shop} onClose={() => setSharePost(null)} />}

      {/* ── Menu article (⋮) — flow mitovy amin'ny artiste ── */}
      {itemMenu && (
        <div onClick={() => setItemMenu(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:300, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background:'#fff', borderRadius:'18px 18px 0 0', width:'100%', maxWidth:480, overflow:'hidden' }}>
            {isAdmin ? (<>
              <button onClick={() => { const p = itemMenu; setItemMenu(null); setItemInfo(p); }} style={{ width:'100%', display:'flex', alignItems:'center', gap:13, padding:'15px 20px', background:'none', border:'none', cursor:'pointer', fontSize:15, fontWeight:600, color:'#050505', borderBottom:'1px solid #F0F2F5' }}><HiInformationCircle size={19} color="#1877F2"/> Informations</button>
              <button onClick={() => { downloadMedia(itemMenu.mediaURL, itemMenu.mediaType || 'image', (itemMenu.content||'article').slice(0,30)); setItemMenu(null); }} style={{ width:'100%', display:'flex', alignItems:'center', gap:13, padding:'15px 20px', background:'none', border:'none', cursor:'pointer', fontSize:15, fontWeight:600, color:'#050505', borderBottom:'1px solid #F0F2F5' }}><HiDownload size={19} color="#12A48D"/> Télécharger</button>
              <button onClick={() => { setItemMenu(null); navigate('/boost'); }} style={{ width:'100%', display:'flex', alignItems:'center', gap:13, padding:'15px 20px', background:'none', border:'none', cursor:'pointer', fontSize:15, fontWeight:600, color:'#050505', borderBottom:'1px solid #F0F2F5' }}><HiLightningBolt size={19} color="#a855f7"/> Booster</button>
              <button onClick={() => { const p = itemMenu; setItemMenu(null); setSharePost(p); }} style={{ width:'100%', display:'flex', alignItems:'center', gap:13, padding:'15px 20px', background:'none', border:'none', cursor:'pointer', fontSize:15, fontWeight:600, color:'#050505', borderBottom:'1px solid #F0F2F5' }}><HiShare size={19} color="#7A2DFF"/> Partager</button>
              <button onClick={() => deleteItem(itemMenu)} style={{ width:'100%', display:'flex', alignItems:'center', gap:13, padding:'15px 20px', background:'none', border:'none', cursor:'pointer', fontSize:15, fontWeight:600, color:'#FF2D8D' }}><HiTrash size={19}/> Supprimer</button>
            </>) : (<>
              <button onClick={() => { const p = itemMenu; setItemMenu(null); setItemInfo(p); }} style={{ width:'100%', display:'flex', alignItems:'center', gap:13, padding:'15px 20px', background:'none', border:'none', cursor:'pointer', fontSize:15, fontWeight:600, color:'#050505', borderBottom:'1px solid #F0F2F5' }}><HiInformationCircle size={19} color="#1877F2"/> Informations</button>
              <button onClick={() => { downloadMedia(itemMenu.mediaURL, itemMenu.mediaType || 'image', (itemMenu.content||'article').slice(0,30)); setItemMenu(null); }} style={{ width:'100%', display:'flex', alignItems:'center', gap:13, padding:'15px 20px', background:'none', border:'none', cursor:'pointer', fontSize:15, fontWeight:600, color:'#050505', borderBottom:'1px solid #F0F2F5' }}><HiDownload size={19} color="#12A48D"/> Télécharger</button>
              <button onClick={() => { const p = itemMenu; setItemMenu(null); setSharePost(p); }} style={{ width:'100%', display:'flex', alignItems:'center', gap:13, padding:'15px 20px', background:'none', border:'none', cursor:'pointer', fontSize:15, fontWeight:600, color:'#050505', borderBottom:'1px solid #F0F2F5' }}><HiShare size={19} color="#7A2DFF"/> Partager</button>
              <button onClick={() => reportItem(itemMenu)} style={{ width:'100%', display:'flex', alignItems:'center', gap:13, padding:'15px 20px', background:'none', border:'none', cursor:'pointer', fontSize:15, fontWeight:600, color:'#FF2D8D' }}><HiFlag size={19}/> Signaler aux admins</button>
            </>)}
          </div>
        </div>
      )}

      {/* ── Fiche article (Informations — mitovy amin'ny trackInfo artiste) ── */}
      {itemInfo && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:400, display:'flex', alignItems:'flex-end', justifyContent:'center' }} onClick={() => setItemInfo(null)}>
          <div onClick={e=>e.stopPropagation()} style={{ background:'white', borderRadius:'20px 20px 0 0', padding:'10px 0 22px', width:'100%', maxWidth:480, maxHeight:'80vh', overflowY:'auto' }}>
            <div style={{ width:40, height:4, borderRadius:2, background:'#CED0D4', margin:'6px auto 14px' }} />
            <div style={{ display:'flex', gap:14, padding:'0 20px 14px' }}>
              <div style={{ width:80, height:80, borderRadius:12, background: itemInfo.mediaURL ? `url(${itemInfo.mediaURL}) center/cover` : 'linear-gradient(145deg,#FF6FA5,#FF2D8D)', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                {!itemInfo.mediaURL && <HiShoppingBag color="white" size={28}/>}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontWeight:800, fontSize:16, lineHeight:1.3 }}>{(itemInfo.content||'Article').slice(0,80)}</p>
                <p style={{ fontSize:14, fontWeight:800, color:'#FF2D8D', marginTop:2 }}>{itemInfo.price ? `${Number(itemInfo.price).toLocaleString()} Ar` : 'À discuter'}</p>
                {itemInfo.createdAt && <p style={{ fontSize:12, color:'#8A8D91', marginTop:2 }}>{timeAgo(itemInfo.createdAt)}</p>}
              </div>
            </div>
            <div style={{ padding:'0 20px' }}>
              {itemInfo.saleCategory && <InfoRow label="Catégorie" value={itemInfo.saleCategory} />}
              {Number(itemInfo.oldPrice) > 0 && <InfoRow label="Ancien prix" value={`${Number(itemInfo.oldPrice).toLocaleString()} Ar`} />}
              <InfoRow label="Vues" value={String(itemInfo.views || 0)} />
              <InfoRow label="Clics" value={String(itemInfo.clicks || 0)} />
              <InfoRow label="Réactions" value={String(Object.keys(itemInfo.reactions||{}).length)} />
              {itemInfo.lieu && <InfoRow label="Lieu" value={itemInfo.lieu} />}
              {itemInfo.contact && <InfoRow label="Contact" value={itemInfo.contact} />}
            </div>
            <div style={{ padding:'14px 20px 0' }}>
              <button onClick={() => { const p = itemInfo; setItemInfo(null); openItem(p); }} className="btn-gold" style={{ width:'100%', padding:'12px', fontSize:15 }}>Voir la publication</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modifier la boutique ── */}
      {editOpen && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:400, display:'flex', alignItems:'flex-end', justifyContent:'center' }} onClick={() => setEditOpen(false)}>
          <div onClick={e=>e.stopPropagation()} style={{ background:'white', borderRadius:'20px 20px 0 0', padding:20, width:'100%', maxWidth:480, maxHeight:'80vh', overflowY:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
              <h3 style={{ fontWeight:800, color:'#FF2D8D' }}>Modifier la boutique</h3>
              <button onClick={() => setEditOpen(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'#65676B' }}><HiX size={20}/></button>
            </div>
            <input className="input" value={editForm.name} onChange={e=>setEditForm(p=>({...p,name:e.target.value}))} placeholder="Nom de la boutique" style={{ marginBottom:10 }}/>
            <select value={editForm.category} onChange={e=>setEditForm(p=>({...p,category:e.target.value}))} className="input" style={{ marginBottom:10 }}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <textarea className="input" value={editForm.description} onChange={e=>setEditForm(p=>({...p,description:e.target.value}))} placeholder="Description" rows={3} style={{ resize:'none', marginBottom:10 }}/>
            <input className="input" value={editForm.address} onChange={e=>setEditForm(p=>({...p,address:e.target.value}))} placeholder="Adresse exacte" style={{ marginBottom:10 }}/>
            <input className="input" value={editForm.contact} onChange={e=>setEditForm(p=>({...p,contact:e.target.value}))} placeholder="Contact (téléphone)" style={{ marginBottom:10 }}/>
            <input className="input" value={editForm.team} onChange={e=>setEditForm(p=>({...p,team:e.target.value}))} placeholder="Équipe (personnes qui gèrent la boutique)" style={{ marginBottom:14 }}/>
            <button onClick={saveEdit} className="btn-primary" style={{ width:'100%', padding:'11px 0', fontSize:14 }}>Enregistrer</button>
          </div>
        </div>
      )}

      {followersOpen && <FollowListModal uids={shop.followers||[]} title="Abonnés" onClose={() => setFollowersOpen(false)} />}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', gap:12, padding:'8px 0', borderBottom:'1px solid #F0F2F5' }}>
      <span style={{ fontSize:13, color:'#65676B', flexShrink:0 }}>{label}</span>
      <span style={{ fontSize:13, fontWeight:600, textAlign:'right' }}>{value}</span>
      {/* ── Statistiques (admin) : mifanaraka amin'ny boutique ── */}
      {statsOpen && (() => {
        let reactions = 0, views = 0, clicks = 0, comments = 0;
        items.forEach(it => { reactions += Object.keys(it.reactions||{}).length; views += it.views || 0; clicks += it.clicks || 0; comments += (it.comments||[]).length; });
        const Row = ({ icon, label, value, c }) => (
          <div style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 4px', borderBottom:'1px solid #F0F2F5' }}>
            <span style={{ width:38, height:38, borderRadius:11, background:c, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{icon}</span>
            <span style={{ flex:1, fontSize:13.5, color:'#65676B' }}>{label}</span>
            <span style={{ fontWeight:800, fontSize:17 }}>{Number(value).toLocaleString()}</span>
          </div>
        );
        return (
          <div onClick={() => setStatsOpen(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', zIndex:400, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
            <div onClick={e => e.stopPropagation()} style={{ background:'#fff', borderRadius:'20px 20px 0 0', width:'100%', maxWidth:520, maxHeight:'80vh', overflowY:'auto', padding:'14px 16px 26px' }}>
              <div style={{ width:40, height:4, borderRadius:2, background:'#CED0D4', margin:'0 auto 12px' }} />
              <h3 style={{ fontWeight:800, fontSize:16, display:'flex', alignItems:'center', gap:8, marginBottom:6 }}><NeonChart size={18}/> Statistiques — {shop.name}</h3>
              <p style={{ fontSize:11.5, color:'#65676B', marginBottom:8 }}>Boutique : abonnés, articles et interactions</p>
              <Row icon={<span style={{ color:'#fff', fontSize:16 }}>👥</span>} label="Abonnés" value={(shop.followers||[]).length} c="linear-gradient(145deg,#63A9FF,#1877F2)" />
              <Row icon={<span style={{ color:'#fff', fontSize:15 }}>🛍️</span>} label="Articles publiés" value={items.length} c="linear-gradient(145deg,#FF6FA5,#FF2D8D)" />
              <Row icon={<span style={{ color:'#fff', fontSize:15 }}>❤</span>} label="Réactions reçues" value={reactions} c="linear-gradient(145deg,#FF9A5A,#FF7A00)" />
              <Row icon={<NeonEye size={16} color="#fff"/>} label="Vues des articles" value={views} c="linear-gradient(145deg,#8F7BFF,#5E4BDB)" />
              <Row icon={<span style={{ color:'#fff', fontSize:15 }}>👆</span>} label="Clics sur les articles" value={clicks} c="linear-gradient(145deg,#FFD84D,#F2B300)" />
              <Row icon={<span style={{ color:'#fff', fontSize:15 }}>💬</span>} label="Commentaires" value={comments} c="linear-gradient(145deg,#3DD9C4,#12A48D)" />
            </div>
          </div>
        );
      })()}
    </div>
  );
}
