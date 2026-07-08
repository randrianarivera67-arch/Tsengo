// src/pages/ShopDetail.jsx — Page Boutique (format pro, comme Sera)
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  doc, onSnapshot, updateDoc, deleteDoc, collection, query, where, getDocs,
  addDoc, serverTimestamp, arrayUnion, arrayRemove, writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { uploadToTelegram } from '../utils/telegram';
import { NeonLocation, NeonPhone } from '../components/NeonIcons';
import FollowListModal from '../components/FollowListModal';
import {
  HiCamera, HiArrowLeft, HiPencil, HiX, HiTrash, HiDotsVertical,
  HiShoppingBag, HiPhotograph, HiTag
} from 'react-icons/hi';

const CATEGORIES = ['Vêtements', 'Électronique', 'Déco & Maison', 'Véhicules', 'Alimentation', 'Beauté', 'Autre'];

export default function ShopDetail() {
  const { shopId } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [shop, setShop] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [items, setItems] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name:'', description:'', address:'', team:'', contact:'', category:CATEGORIES[0] });
  const [followersOpen, setFollowersOpen] = useState(false);

  const [content, setContent] = useState('');
  const [price, setPrice] = useState('');
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [posting, setPosting] = useState(false);
  const [shopFullOpen, setShopFullOpen] = useState(false);
  const [itemCategory, setItemCategory] = useState('');
  const [itemOldPrice, setItemOldPrice] = useState('');
  const [shopFilter, setShopFilter] = useState('Tout');
  const [publishTarget, setPublishTarget] = useState('page');
  const [myGroups, setMyGroups] = useState([]);
  const [itemGroupSel, setItemGroupSel] = useState({});
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
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a,b) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0));
      setItems(list);
    }, err => console.error('Shop items:', err?.message || err));
    return () => unsub();
  }, [shopId]);

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
  async function deleteShop() {
    if (!window.confirm(`Supprimer définitivement la boutique "${shop.name}" ?`)) return;
    try { await deleteDoc(doc(db, 'shops', shopId)); navigate('/shop'); }
    catch (err) { alert('Erreur : ' + (err?.message || err)); }
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
    if (!content.trim() && !mediaFile) return;
    setPosting(true);
    try {
      let mediaURL = '';
      if (mediaFile) { const r = await uploadToTelegram(mediaFile); mediaURL = r.url; }
      const targetGroups = publishTarget === 'groups' ? Object.keys(itemGroupSel).filter(k => itemGroupSel[k]) : [];
      const baseData = {
        uid: currentUser.uid, authorName: shop.name, authorPhoto: shop.photoURL || '',
        content: content.trim().slice(0, 500), mediaURL, mediaType: mediaURL ? 'image' : '',
        isSale: true, price: parseFloat(price) || 0, oldPrice: parseFloat(itemOldPrice) || 0, contact: shop.contact || '', lieu: shop.address || '',
        saleCategory: itemCategory || shop.category || '',
        shopId: shop.id, shopName: shop.name, shopPhoto: shop.photoURL || '',
        reactions: {}, comments: [], createdAt: serverTimestamp(),
      };
      if (targetGroups.length > 0) {
        const batch = writeBatch(db);
        targetGroups.forEach(gid => {
          const g = myGroups.find(x => x.id === gid);
          batch.set(doc(collection(db, 'posts')), { ...baseData, groupId: gid, groupName: g?.name || '', postedByShop: true });
        });
        await batch.commit();
      } else {
        await addDoc(collection(db, 'posts'), baseData);
      }
      const targets = (targetGroups.length === 0) ? (shop.followers || []) : [];
      if (targets.length > 0) {
        const batch = writeBatch(db);
        targets.forEach(fUid => batch.set(doc(collection(db,'notifications')), {
          toUid: fUid, fromUid: currentUser.uid, fromName: shop.name, fromPhoto: shop.photoURL || '',
          type: 'post', message: `${shop.name} a ajouté un nouvel article : ${content.trim().slice(0,40)}`,
          read: false, createdAt: serverTimestamp(),
        }));
        await batch.commit();
      }
      setContent(''); setPrice(''); setMediaFile(null); setMediaPreview(null);
      setItemCategory(''); setItemOldPrice(''); setPublishTarget('page'); setItemGroupSel({}); setShopFullOpen(false);
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
      <div style={{ position:'relative', height:170, background: shop.coverURL ? '#000' : 'linear-gradient(135deg,#FF2D8D,#FF9A5A,#F2B300)' }}>
        {shop.coverURL && <img src={shop.coverURL} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />}
        <button onClick={() => navigate('/shop')} style={{ position:'absolute', top:10, left:10, width:36, height:36, borderRadius:'50%', background:'rgba(0,0,0,.45)', border:'none', cursor:'pointer', color:'white', display:'flex', alignItems:'center', justifyContent:'center' }}><HiArrowLeft size={20}/></button>
        {isAdmin && (<>
          <input ref={coverRef} type="file" accept="image/*" style={{ display:'none' }} onChange={e => changeImage(e,'coverURL')} />
          <button onClick={() => coverRef.current?.click()} style={{ position:'absolute', bottom:10, right:10, background:'rgba(255,255,255,.92)', border:'none', borderRadius:18, padding:'7px 12px', cursor:'pointer', fontSize:12, fontWeight:700, display:'flex', alignItems:'center', gap:5 }}><HiCamera size={15}/> Couverture</button>
        </>)}
        <div style={{ position:'absolute', bottom:-32, left:16 }}>
          <div style={{ position:'relative' }}>
            <div style={{ width:74, height:74, borderRadius:16, background:'linear-gradient(145deg,#FF6FA5,#FF2D8D)', border:'4px solid white', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
              {shop.photoURL ? <img src={shop.photoURL} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : <HiShoppingBag size={32} color="white"/>}
            </div>
            {isAdmin && (<>
              <input ref={logoRef} type="file" accept="image/*" style={{ display:'none' }} onChange={e => changeImage(e,'photoURL')} />
              <button onClick={() => logoRef.current?.click()} style={{ position:'absolute', bottom:-4, right:-4, width:26, height:26, borderRadius:'50%', background:'#FF2D8D', border:'2.5px solid white', cursor:'pointer', color:'white', display:'flex', alignItems:'center', justifyContent:'center' }}><HiCamera size={12}/></button>
            </>)}
          </div>
        </div>
      </div>

      <div style={{ padding:'40px 16px 0' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div style={{ minWidth:0 }}>
            <h2 style={{ fontWeight:800, fontSize:19 }}>{shop.name}</h2>
            <p style={{ fontSize:12, color:'#65676B' }}>
              🏪 {shop.category} · <span onClick={() => (shop.followers||[]).length>0 && setFollowersOpen(true)} style={{ cursor:(shop.followers||[]).length>0?'pointer':'default', textDecoration:(shop.followers||[]).length>0?'underline':'none' }}>{(shop.followers||[]).length} abonnés</span>
            </p>
          </div>
          <div style={{ position:'relative' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setMenuOpen(p=>!p)} style={{ background:'#F0F2F5', border:'none', borderRadius:'50%', width:34, height:34, cursor:'pointer' }}><HiDotsVertical size={17}/></button>
            {menuOpen && (
              <div style={{ position:'absolute', top:'100%', right:0, background:'white', border:'1px solid #E4E6EB', borderRadius:12, boxShadow:'0 4px 20px rgba(0,0,0,.14)', minWidth:180, zIndex:50, overflow:'hidden' }}>
                {isAdmin && <button onClick={() => { setMenuOpen(false); openEdit(); }} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'12px 16px', background:'none', border:'none', cursor:'pointer', fontSize:14, color:'#1877F2', borderBottom:'1px solid #F0F2F5' }}><HiPencil size={16}/> Modifier la boutique</button>}
                {isAdmin && <button onClick={() => { setMenuOpen(false); deleteShop(); }} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'12px 16px', background:'none', border:'none', cursor:'pointer', fontSize:14, color:'#FF2D8D' }}><HiTrash size={16}/> Supprimer la boutique</button>}
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
          <button onClick={() => setShopFullOpen(true)}
            style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:8, background:'linear-gradient(145deg,#FF6FA5,#FF2D8D)', border:'none', borderRadius:22, padding:'12px', color:'white', fontWeight:800, fontSize:15, fontFamily:'Poppins', cursor:'pointer' }}>
            <HiShoppingBag size={20}/> Ajouter un article
          </button>
        </div>
      )}

      {/* ── PAGE FENO : Ajouter un article (boutique) ── */}
      {shopFullOpen && (
      <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.35)', zIndex:350, display:'flex', alignItems:'flex-start', justifyContent:'center', overflowY:'auto' }}>
      <div className="card post-card" style={{ padding:16, width:'100%', maxWidth:600, minHeight:'100vh', borderRadius:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14, paddingBottom:12, borderBottom:'1px solid #E4E6EB' }}>
          <button onClick={() => setShopFullOpen(false)} style={{ background:'none', border:'none', cursor:'pointer', padding:4 }}><HiX size={24} color="#050505"/></button>
          <h3 style={{ fontWeight:800, fontSize:18, flex:1 }}>Ajouter un article</h3>
          <button onClick={publishItem} disabled={posting || (!content.trim() && !mediaFile)} className="btn-gold" style={{ padding:'7px 20px', fontSize:14 }}>{posting ? '...' : 'Publier'}</button>
        </div>

        <textarea className="input" placeholder="Nom / description de l'article..." value={content} onChange={e => setContent(e.target.value)} rows={3} style={{ resize:'none', marginBottom:8, border:'none', fontSize:16 }} maxLength={500} autoFocus/>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
          <HiTag color="#FF2D8D" size={18}/>
          <input className="input" type="number" placeholder="Prix (Ar)" value={price} onChange={e => setPrice(e.target.value)} style={{ flex:1 }} />
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
          <span style={{ fontSize:13, color:'#8A8D91', width:22, textAlign:'center' }}>≈</span>
          <input className="input" type="number" placeholder="Ancien prix (optionnel — pour afficher -%)" value={itemOldPrice} onChange={e => setItemOldPrice(e.target.value)} style={{ flex:1 }} />
        </div>
        <select value={itemCategory || shop.category || CATEGORIES[0]} onChange={e => setItemCategory(e.target.value)} className="input" style={{ marginBottom:8 }}>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input ref={photoInputRef} type="file" accept="image/*" style={{ display:'none' }} onChange={pickPhoto} />
        {mediaPreview && (
          <div style={{ position:'relative', marginBottom:8 }}>
            <img src={mediaPreview} alt="" style={{ width:'100%', borderRadius:10, maxHeight:240, objectFit:'cover' }} />
            <button onClick={() => { setMediaFile(null); setMediaPreview(null); }} style={{ position:'absolute', top:6, right:6, background:'rgba(0,0,0,.55)', border:'none', borderRadius:'50%', width:28, height:28, cursor:'pointer', color:'white' }}><HiX size={15}/></button>
          </div>
        )}
        <button onClick={() => photoInputRef.current.click()} className="btn-blue" style={{ display:'flex', alignItems:'center', gap:6, padding:'12px', fontSize:14, borderRadius:12, width:'100%', justifyContent:'center', marginBottom:12 }}><HiPhotograph size={18}/> Photo de l'article</button>

        {/* Choix : ma page boutique OU groupes */}
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
        {publishTarget === 'groups' && (
          <div style={{ border:'1px solid #E4E6EB', borderRadius:12, overflow:'hidden', marginBottom:8 }}>
            {myGroups.length === 0 && <p style={{ padding:16, textAlign:'center', fontSize:13, color:'#65676B' }}>Aucun groupe accessible.</p>}
            {myGroups.map(g => (
              <button key={g.id} onClick={() => setItemGroupSel(p => ({ ...p, [g.id]: !p[g.id] }))}
                style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'11px 16px', background:'none', border:'none', borderTop:'1px solid #F0F2F5', cursor:'pointer', textAlign:'left', fontFamily:'Poppins', fontSize:14, color:'#050505' }}>
                <span style={{ width:20, height:20, borderRadius:5, border:'2px solid #1877F2', background: itemGroupSel[g.id] ? '#1877F2' : 'transparent', display:'inline-flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:13 }}>{itemGroupSel[g.id] && '✓'}</span>
                {g.name}
              </button>
            ))}
          </div>
        )}
      </div>
      </div>
      )}

      {items.length === 0 && <p style={{ padding:30, textAlign:'center', color:'#65676B', fontSize:14 }}>Aucun article publié pour le moment.</p>}

      {/* Filtres catégorie (chips) — style AliExpress */}
      {items.length > 0 && (
        <div style={{ display:'flex', gap:8, overflowX:'auto', padding:'4px 12px 10px', scrollbarWidth:'none' }}>
          {['Tout', ...Array.from(new Set(items.map(p => p.saleCategory).filter(Boolean)))].map(cat => (
            <button key={cat} onClick={() => setShopFilter(cat)}
              style={{ flex:'0 0 auto', padding:'7px 16px', borderRadius:18, border:'none', cursor:'pointer', fontFamily:'Poppins', fontSize:13, fontWeight:700,
                background: shopFilter===cat ? 'linear-gradient(145deg,#FF6FA5,#FF2D8D)' : '#F0F2F5',
                color: shopFilter===cat ? 'white' : '#65676B', whiteSpace:'nowrap' }}>
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Grille articles — style AliExpress (2 colonnes) */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, padding:'0 12px 12px' }}>
        {items.filter(p => shopFilter==='Tout' || p.saleCategory===shopFilter).map(p => {
          const oldPrice = p.oldPrice || (p.price ? Math.round(Number(p.price) * 1.6) : 0);
          const discount = p.price && oldPrice > p.price ? Math.round((1 - p.price/oldPrice) * 100) : 0;
          return (
            <div key={p.id} onClick={() => navigate(`/post/${p.id}`)} className="card" style={{ overflow:'hidden', cursor:'pointer', borderRadius:12, boxShadow:'0 1px 4px rgba(0,0,0,.08)' }}>
              <div style={{ position:'relative' }}>
                {p.mediaURL
                  ? <img src={p.mediaURL} alt="" style={{ width:'100%', aspectRatio:'1', objectFit:'cover', display:'block' }} />
                  : <div style={{ width:'100%', aspectRatio:'1', background:'#F0F2F5', display:'flex', alignItems:'center', justifyContent:'center', fontSize:36 }}>🏷️</div>}
                {discount > 0 && <span style={{ position:'absolute', top:6, left:6, background:'#FF1744', color:'white', fontSize:11, fontWeight:800, padding:'2px 7px', borderRadius:6 }}>-{discount}%</span>}
              </div>
              <div style={{ padding:'8px 9px 10px' }}>
                <p style={{ fontSize:12.5, lineHeight:1.35, overflow:'hidden', textOverflow:'ellipsis', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', minHeight:34 }}>{p.content}</p>
                <div style={{ display:'flex', alignItems:'baseline', gap:5, marginTop:5 }}>
                  <span style={{ fontWeight:800, fontSize:16, color:'#FF2D8D' }}>{p.price ? `${Number(p.price).toLocaleString()} Ar` : 'À discuter'}</span>
                </div>
                {discount > 0 && <span style={{ fontSize:11, color:'#8A8D91', textDecoration:'line-through' }}>{oldPrice.toLocaleString()} Ar</span>}
                <div style={{ display:'flex', alignItems:'center', gap:4, marginTop:4 }}>
                  <span style={{ fontSize:10, color:'#FF9500' }}>★★★★★</span>
                  <span style={{ fontSize:10, color:'#8A8D91' }}>· Vendu</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

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
            <input className="input" value={editForm.contact} onChange={e=>setEditForm(p=>({...p,contact:e.target.value}))} placeholder="Contact" style={{ marginBottom:10 }}/>
            <input className="input" value={editForm.team} onChange={e=>setEditForm(p=>({...p,team:e.target.value}))} placeholder="Équipe (personnes qui gèrent la boutique)" style={{ marginBottom:14 }}/>
            <button onClick={saveEdit} className="btn-primary" style={{ width:'100%', padding:'11px 0', fontSize:14 }}>Enregistrer</button>
          </div>
        </div>
      )}

      {followersOpen && <FollowListModal uids={shop.followers||[]} title="Abonnés" onClose={() => setFollowersOpen(false)} />}
    </div>
  );
}
