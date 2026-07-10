// src/pages/Shop.jsx — Boutique (lisitra : suggestions de boutiques + articles par catégorie)
// Endrika araka ny maquette (sary 1) — lojika mitovy amin'ny Artists.jsx :
// recherche live, follow/abonné, message dédié, Voir tout, ary fanampiny :
// panier (localStorage) misy Appel/Message/Supprimer, avatar boutique eo anoloan'ny prix.
import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  collection, query, onSnapshot, addDoc, serverTimestamp, orderBy, limit,
  doc, updateDoc, arrayUnion, arrayRemove, writeBatch, increment, deleteField, deleteDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { parseAppLink } from '../utils/appLink';
import { NeonLocation, NeonPlane, NeonPlaneWhite } from '../components/NeonIcons';
import ShareModal from '../components/ShareModal';
import { downloadMedia } from '../utils/download';
import { getCart, addToCart, removeFromCart, subscribeCart, firstPhone } from '../utils/cart';
import {
  HiShoppingBag, HiShoppingCart, HiPlus, HiX, HiChevronRight, HiArrowLeft, HiSearch,
  HiCheck, HiCheckCircle, HiHeart, HiOutlineHeart, HiChat, HiPhone, HiTrash,
  HiDotsVertical, HiInformationCircle, HiDownload, HiShare, HiFlag
} from 'react-icons/hi';

const CATEGORIES = ['Vêtements', 'Robes', 'Hauts', 'Pantalons', 'Chaussures', 'Accessoires', 'Électronique', 'Déco & Maison', 'Véhicules', 'Alimentation', 'Beauté', 'Autre'];

// Vues : isaina indray mandeha isaky ny session (zaraina amin'ny ShopDetail koa
// satria module-level, fa samy manana ny Set-ny ny fichier tsirairay — tsy olana,
// ny tanjona dia tsy hampitombo imbetsaka ao anatin'ny session iray)
const viewedThisSession = new Set();

export default function Shop() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Sokafana ho azy ny panier raha avy amin'ny icône topbar
  useEffect(() => {
    if (location.state?.openCart) setCartOpen(true);
  }, [location.state]);
  const [shops, setShops] = useState([]);
  const [saleItems, setSaleItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [creating, setCreating] = useState(false);
  const [q, setQ] = useState('');
  const [catFilter, setCatFilter] = useState('Tout');
  const [showAllShops, setShowAllShops] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [cardMenu, setCardMenu] = useState(null);
  const [shareItem, setShareItem] = useState(null);

  // Menus mikatona rehefa scroll na clic ivelany
  useEffect(() => {
    const close = () => setCardMenu(null);
    window.addEventListener('scroll', close, true);
    document.addEventListener('click', close);
    return () => { window.removeEventListener('scroll', close, true); document.removeEventListener('click', close); };
  }, []);
  const [cart, setCart] = useState(getCart());

  useEffect(() => subscribeCart(setCart), []);

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'shops')), snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.followers?.length || 0) - (a.followers?.length || 0));
      setShops(list);
    }, err => console.error('Shops:', err?.message || err));
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(150)), snap => {
      setSaleItems(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => p.isSale && p.shopId && !p.groupId));
    }, err => console.error('Shop items:', err?.message || err));
    return () => unsub();
  }, []);

  // ── Compteur "vues" : mitombo indray mandeha isaky ny session ──
  useEffect(() => {
    if (!saleItems.length || !currentUser) return;
    const fresh = saleItems.filter(p => !viewedThisSession.has(p.id));
    if (!fresh.length) return;
    fresh.forEach(p => viewedThisSession.add(p.id));
    const batch = writeBatch(db);
    fresh.forEach(p => batch.update(doc(db, 'posts', p.id), { views: increment(1) }));
    batch.commit().catch(() => {});
  }, [saleItems.length]); // eslint-disable-line

  const myShops = shops.filter(s => s.admins?.includes(currentUser?.uid));
  const low = q.trim().toLowerCase();

  const fShops = useMemo(() => !low ? shops : shops.filter(s => (s.name || '').toLowerCase().includes(low)), [shops, low]);
  const fItems = useMemo(() => {
    let list = saleItems;
    if (catFilter !== 'Tout') list = list.filter(p => p.saleCategory === catFilter);
    if (low) list = list.filter(p => (p.content || '').toLowerCase().includes(low) || (p.shopName || '').toLowerCase().includes(low) || (p.saleCategory || '').toLowerCase().includes(low));
    return list;
  }, [saleItems, catFilter, low]);

  const itemCats = useMemo(() => ['Tout', ...Array.from(new Set(saleItems.map(p => p.saleCategory).filter(Boolean)))], [saleItems]);

  async function toggleFollowShop(shopId) {
    if (!shopId || !currentUser) return;
    const s = shops.find(x => x.id === shopId);
    const on = (s?.followers || []).includes(currentUser.uid);
    try { await updateDoc(doc(db, 'shops', shopId), { followers: on ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid) }); } catch (e) { alert('Erreur : ' + (e?.message || e)); }
  }

  async function toggleHeart(e, p) {
    e.stopPropagation();
    if (!currentUser) return;
    const mine = p.reactions?.[currentUser.uid];
    try {
      if (mine) await updateDoc(doc(db, 'posts', p.id), { [`reactions.${currentUser.uid}`]: deleteField() });
      else await updateDoc(doc(db, 'posts', p.id), { [`reactions.${currentUser.uid}`]: '❤️' });
    } catch (err) { console.warn('heart:', err?.message); }
  }

  // Clic amin'ny card → compteur clics + detail (endrika sary 3)
  function openItem(p) {
    updateDoc(doc(db, 'posts', p.id), { clicks: increment(1) }).catch(() => {});
    navigate(`/post/${p.id}`);
  }

  async function createShop() {
    if (!name.trim()) { alert('Donnez un nom à votre boutique'); return; }
    setCreating(true);
    try {
      const ref = await addDoc(collection(db, 'shops'), {
        name: name.trim(), category, description: '', address: '', team: '', contact: '',
        photoURL: '', coverURL: '', admins: [currentUser.uid], followers: [],
        createdBy: currentUser.uid, createdAt: serverTimestamp(),
      });
      setOpen(false); setName('');
      navigate(`/shop/${ref.id}`);
    } catch (err) { alert('Erreur : ' + (err?.message || err)); }
    setCreating(false);
  }

  const rowStyle = { display: 'flex', gap: 10, overflowX: 'auto', padding: '2px 0 10px', WebkitOverflowScrolling: 'touch' };

  // ── Card boutique (suggestions — sary 1) ──
  const ShopCard = s => {
    const on = (s.followers || []).includes(currentUser?.uid);
    const admin = s.admins?.includes(currentUser?.uid);
    return (
      <div key={s.id} className="card" style={{ flex: '0 0 160px', borderRadius: 14, padding: 12, textAlign: 'center' }}>
        <div onClick={() => navigate(`/shop/${s.id}`)} style={{ width: 74, height: 74, borderRadius: '50%', overflow: 'hidden', margin: '0 auto 8px', background: 'linear-gradient(145deg,#FF6FA5,#FF2D8D)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          {s.photoURL ? <img src={s.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <HiShoppingBag size={26} color="white" />}
        </div>
        <div style={{ fontWeight: 800, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</span>
          {admin
            ? <span style={{ fontSize: 9, fontWeight: 800, color: '#F2B300', background: '#FFF6DB', borderRadius: 7, padding: '1px 6px', flexShrink: 0 }}>ADMIN</span>
            : <HiCheckCircle size={14} color="#1877F2" style={{ flexShrink: 0 }} />}
        </div>
        <div style={{ fontSize: 11, color: '#65676B', margin: '1px 0 9px' }}>{(s.followers || []).length} abonnés</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => toggleFollowShop(s.id)} className={on ? '' : 'btn-primary'}
            style={{ flex: 1, borderRadius: 16, padding: '6px 0', fontSize: 12, fontWeight: 700, cursor: 'pointer', border: on ? '1.5px solid #FF2D8D' : 'none',
              ...(on ? { background: '#fff', color: '#FF2D8D', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 } : {}) }}>
            {on ? <><HiCheck size={13} /> Abonné</> : 'Suivre'}
          </button>
          <button onClick={() => navigate(`/shop/${s.id}/messages`)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, background: '#F0F2F5', color: '#050505', border: 'none', borderRadius: 16, padding: '6px 0', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}><NeonPlane size={14} /> Message</button>
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: '14px 12px' }}>
      {/* ── En-tête : Boutique + panier + Créer (sary 1) ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <h2 style={{ fontWeight: 800, fontSize: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => navigate(-1)} style={{ background: '#F0F2F5', border: 'none', borderRadius: '50%', width: 34, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#050505' }}><HiArrowLeft size={18} /></button>
          <span className="icon-badge-3d" style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(145deg,#FF6FA5,#FF2D8D)' }}>
            <HiShoppingBag size={17} color="white" />
          </span>
          Boutique
          <button onClick={() => setCartOpen(true)} title="Panier" style={{ position: 'relative', background: '#F0F2F5', border: 'none', borderRadius: 12, width: 40, height: 40, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#050505' }}>
            <HiShoppingCart size={21} />
            {cart.length > 0 && <span style={{ position: 'absolute', top: -5, right: -5, background: '#FF2D8D', color: '#fff', fontSize: 10.5, fontWeight: 800, borderRadius: 10, minWidth: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', border: '2px solid #fff' }}>{cart.length > 9 ? '9+' : cart.length}</span>}
          </button>
        </h2>
        <button onClick={() => setOpen(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', fontSize: 13, borderRadius: 20 }}>
          <HiPlus size={16} /> Créer
        </button>
      </div>
      <p style={{ fontSize: 12, color: '#65676B', margin: '10px 0 12px' }}>Achetez des produits uniques proposés par les boutiques de la communauté Trengo</p>

      {/* ── Recherche live ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid #E4E6EB', borderRadius: 22, padding: '10px 14px', marginBottom: 12 }}>
        <HiSearch size={18} color="#65676B" />
        <input value={q} onChange={e => { const l = parseAppLink(e.target.value); if (l) { setQ(''); navigate(l); return; } setQ(e.target.value); }} placeholder="Rechercher un article, une boutique… ou coller un lien"
          style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, background: 'transparent', color: '#050505' }} />
        {q && <button onClick={() => setQ('')} style={{ background: '#F0F2F5', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#65676B' }}><HiX size={14} /></button>}
      </div>

      {/* ── Mes pages boutique (mitovy amin'ny "Mes pages artiste") ── */}
      {myShops.length > 0 && !low && (
        <div style={{ background: 'linear-gradient(135deg,#FFF0F7,#FFF6E8)', borderRadius: 14, padding: '12px 14px', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontWeight: 800, fontSize: 15, color: '#050505', display: 'flex', alignItems: 'center', gap: 7 }}>
              <HiShoppingBag size={16} color="#FF2D8D" /> Mes pages boutique
            </span>
          </div>
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto' }}>
            {myShops.map(s => (
              <div key={s.id} onClick={() => navigate(`/shop/${s.id}`)} style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 9, background: '#fff', borderRadius: 12, padding: '8px 12px', boxShadow: '0 1px 3px rgba(0,0,0,.07)', cursor: 'pointer' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(145deg,#FF6FA5,#FF2D8D)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {s.photoURL ? <img src={s.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <HiShoppingBag size={18} color="white" />}
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 13, whiteSpace: 'nowrap' }}>{s.name}
                    <span style={{ marginLeft: 5, fontSize: 9, fontWeight: 700, color: '#F2B300', background: '#FFF6DB', borderRadius: 7, padding: '1px 6px' }}>ADMIN</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#65676B' }}>{(s.followers || []).length} abonnés</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Suggestions de boutiques + Voir tout (sary 1) ── */}
      {fShops.length > 0 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0 8px' }}>
            <span style={{ fontWeight: 800, fontSize: 17, color: '#050505' }}>{low ? 'Boutiques' : 'Suggestions de boutiques'}</span>
            <button onClick={() => setShowAllShops(v => !v)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#FF2D8D', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', padding: 0 }}>
              {showAllShops ? 'Réduire' : 'Voir tout'} <HiChevronRight size={15} style={{ transform: showAllShops ? 'rotate(90deg)' : 'none' }} />
            </button>
          </div>
          {showAllShops
            ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10, paddingBottom: 10 }}>{fShops.map(s => ShopCard(s))}</div>
            : <div style={rowStyle}>{fShops.map(s => ShopCard(s))}</div>}
        </>
      )}

      {/* ── Articles par catégorie (sary 1) ── */}
      {saleItems.length > 0 && (
        <>
          <div style={{ padding: '8px 0 8px' }}>
            <span style={{ fontWeight: 800, fontSize: 17, color: '#050505' }}>Articles par catégorie</span>
          </div>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '0 0 10px', scrollbarWidth: 'none' }}>
            {itemCats.map(cat => (
              <button key={cat} onClick={() => setCatFilter(cat)}
                style={{ flex: '0 0 auto', padding: '8px 18px', borderRadius: 20, border: 'none', cursor: 'pointer', fontFamily: 'Poppins', fontSize: 13, fontWeight: 700,
                  background: catFilter === cat ? 'linear-gradient(145deg,#FF6FA5,#FF2D8D)' : '#fff',
                  boxShadow: catFilter === cat ? 'none' : '0 1px 3px rgba(0,0,0,.08)',
                  color: catFilter === cat ? 'white' : '#65676B', whiteSpace: 'nowrap' }}>
                {cat}
              </button>
            ))}
          </div>

          {fItems.length === 0 && <p style={{ padding: 24, textAlign: 'center', color: '#65676B', fontSize: 13 }}>Aucun article dans cette catégorie.</p>}

          {/* Grille produits (sary 1) : sary + ❤️, anarana, prix + avatar boutique, lieu, Message + panier */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10, paddingBottom: 14 }}>
            {fItems.map(p => {
              const myHeart = !!p.reactions?.[currentUser?.uid];
              return (
                <div key={p.id} onClick={() => openItem(p)} className="card" style={{ overflow: 'hidden', cursor: 'pointer', borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,.08)', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ position: 'relative' }}>
                    {p.mediaURL
                      ? <img src={p.mediaURL} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
                      : <div style={{ width: '100%', aspectRatio: '1', background: '#F0F2F5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><HiShoppingBag size={34} color="#CED0D4" /></div>}
                    <button onClick={e => toggleHeart(e, p)} style={{ position: 'absolute', top: 8, right: 8, width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,.95)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 5px rgba(0,0,0,.15)' }}>
                      {myHeart ? <HiHeart size={18} color="#FF2D8D" /> : <HiOutlineHeart size={18} color="#050505" />}
                    </button>
                    <div style={{ position: 'absolute', top: 8, left: 8 }} onClick={e => e.stopPropagation()}>
                      <button onClick={() => setCardMenu(cardMenu === p.id ? null : p.id)}
                        style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,.95)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 5px rgba(0,0,0,.15)', color: '#050505' }}>
                        <HiDotsVertical size={16} />
                      </button>
                      {cardMenu === p.id && (
                        <div style={{ position: 'absolute', top: '110%', left: 0, background: 'white', border: '1px solid #E4E6EB', borderRadius: 12, boxShadow: '0 6px 22px rgba(0,0,0,.16)', minWidth: 165, zIndex: 60, overflow: 'hidden' }}>
                          <button onClick={() => { setCardMenu(null); navigate(`/post/${p.id}`); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Poppins', fontSize: 13.5, fontWeight: 400, color: '#050505', borderBottom: '1px solid #F0F2F5' }}><HiInformationCircle size={16} color="#1877F2" /> Informations</button>
                          {p.mediaURL && <button onClick={() => { setCardMenu(null); downloadMedia(p.mediaURL, p.mediaType || 'image', p.content || 'article'); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Poppins', fontSize: 13.5, fontWeight: 400, color: '#050505', borderBottom: '1px solid #F0F2F5' }}><HiDownload size={16} color="#12A48D" /> Télécharger</button>}
                          <button onClick={() => { setCardMenu(null); setShareItem(p); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Poppins', fontSize: 13.5, fontWeight: 400, color: '#050505', borderBottom: '1px solid #F0F2F5' }}><HiShare size={16} color="#7A2DFF" /> Partager</button>
                          {p.uid === currentUser?.uid
                            ? <button onClick={async () => { setCardMenu(null); if (window.confirm('Supprimer cet article ?')) { try { await deleteDoc(doc(db, 'posts', p.id)); } catch (e) { alert('Erreur : ' + (e?.message || e)); } } }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Poppins', fontSize: 13.5, fontWeight: 400, color: '#FF2D8D' }}><HiTrash size={16} /> Supprimer</button>
                            : <button onClick={async () => { setCardMenu(null); if (!window.confirm('Signaler cet article aux administrateurs ?')) return; try { await addDoc(collection(db, 'reports'), { type: 'post', targetId: p.id, targetUid: p.uid, targetAuthor: p.shopName || p.authorName || '', reportedBy: currentUser.uid, createdAt: serverTimestamp(), status: 'pending' }); alert('Signalement envoyé. Merci.'); } catch (e) { alert('Erreur : ' + (e?.message || e)); } }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Poppins', fontSize: 13.5, fontWeight: 400, color: '#050505' }}><HiFlag size={16} color="#F2B300" /> Signaler</button>}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ padding: '9px 10px 11px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{p.content}</p>
                    {/* Prix + profil boutique en face (sary 1) */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginTop: 5 }}>
                      <span style={{ fontWeight: 800, fontSize: 15, color: '#FF2D8D' }}>{p.price ? `${Number(p.price).toLocaleString()} Ar` : 'À discuter'}</span>
                      <div onClick={e => { e.stopPropagation(); navigate(`/shop/${p.shopId}`); }} title={p.shopName}
                        style={{ width: 28, height: 28, borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(145deg,#FF6FA5,#FF2D8D)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer', border: '2px solid #FFE3EF' }}>
                        {p.shopPhoto ? <img src={p.shopPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <HiShoppingBag size={13} color="white" />}
                      </div>
                    </div>
                    {p.lieu && <p style={{ fontSize: 11.5, color: '#65676B', display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}><NeonLocation size={12} /> <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.lieu}</span></p>}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 'auto', paddingTop: 8 }}>
                      <button onClick={e => { e.stopPropagation(); navigate(`/shop/${p.shopId}/messages`); }}
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, background: 'linear-gradient(145deg,#FF6FA5,#FF2D8D)', border: 'none', borderRadius: 18, padding: '8px 0', fontSize: 12.5, fontWeight: 700, color: '#fff', cursor: 'pointer' }}>
                        <NeonPlaneWhite size={14} /> Message
                      </button>
                      <button onClick={e => { e.stopPropagation(); const ok = addToCart(p); alert(ok ? 'Article ajouté au panier 🛒' : 'Cet article est déjà dans votre panier'); }}
                        title="Ajouter au panier"
                        style={{ width: 36, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', border: '1.5px solid #FF2D8D', borderRadius: 18, cursor: 'pointer', color: '#FF2D8D', flexShrink: 0 }}>
                        <HiShoppingCart size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── Vide ── */}
      {fShops.length === 0 && fItems.length === 0 && (
        <div className="card" style={{ padding: 30, textAlign: 'center' }}>
          <p style={{ fontWeight: 700, marginBottom: 4 }}>{low ? 'Aucun résultat' : 'Aucune boutique pour le moment'}</p>
          <p style={{ fontSize: 13, color: '#65676B' }}>{low ? 'Essayez un autre mot-clé' : 'Créez la première boutique de la communauté !'}</p>
        </div>
      )}

      {/* ── PANIER (localStorage) : Supprimer / Appel / Message ── */}
      {cartOpen && (
        <div onClick={() => setCartOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 400, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 520, maxHeight: '82vh', overflowY: 'auto', padding: '14px 14px 26px' }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: '#CED0D4', margin: '0 auto 12px' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontWeight: 800, fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
                <HiShoppingCart size={20} color="#FF2D8D" /> Mon panier
                <span style={{ fontSize: 12, color: '#65676B', fontWeight: 600 }}>{cart.length} article{cart.length > 1 ? 's' : ''}</span>
              </span>
              <button onClick={() => setCartOpen(false)} style={{ background: '#F0F2F5', border: 'none', borderRadius: '50%', width: 34, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#65676B' }}><HiX size={18} /></button>
            </div>

            {cart.length === 0 && (
              <div style={{ padding: 34, textAlign: 'center' }}>
                <HiShoppingCart size={40} color="#CED0D4" style={{ marginBottom: 8 }} />
                <p style={{ fontWeight: 700, marginBottom: 4 }}>Votre panier est vide</p>
                <p style={{ fontSize: 13, color: '#65676B' }}>Ajoutez des articles pour contacter les boutiques facilement.</p>
              </div>
            )}

            {cart.map(item => (
              <div key={item.id} className="card" style={{ display: 'flex', gap: 10, padding: 10, marginBottom: 10, borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,.07)' }}>
                <div onClick={() => { setCartOpen(false); navigate(`/post/${item.id}`); }} style={{ width: 72, height: 72, borderRadius: 12, overflow: 'hidden', background: '#F0F2F5', flexShrink: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {item.mediaURL ? <img src={item.mediaURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <HiShoppingBag size={24} color="#CED0D4" />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{item.name}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <span style={{ fontWeight: 800, fontSize: 14, color: '#FF2D8D' }}>{item.price ? `${Number(item.price).toLocaleString()} Ar` : 'À discuter'}</span>
                    <span onClick={() => { setCartOpen(false); navigate(`/shop/${item.shopId}`); }} style={{ fontSize: 11, color: '#65676B', cursor: 'pointer', textDecoration: 'underline', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.shopName}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                    {firstPhone(item.contact) && (
                      <a href={`tel:${firstPhone(item.contact)}`} onClick={e => e.stopPropagation()}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'linear-gradient(145deg,#3DD9C4,#12A48D)', borderRadius: 16, padding: '6px 12px', color: '#fff', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
                        <HiPhone size={13} /> Appel
                      </a>
                    )}
                    <button onClick={() => { setCartOpen(false); navigate(`/shop/${item.shopId}/messages`); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'linear-gradient(145deg,#FF6FA5,#FF2D8D)', border: 'none', borderRadius: 16, padding: '6px 12px', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                      <HiChat size={13} /> Message
                    </button>
                    <button onClick={() => removeFromCart(item.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#F0F2F5', border: 'none', borderRadius: 16, padding: '6px 12px', color: '#FF2D8D', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                      <HiTrash size={13} /> Supprimer
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Modale création ── */}
      {open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 400, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '20px 20px 0 0', padding: 20, width: '100%', maxWidth: 480 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ fontWeight: 800, color: '#FF2D8D', fontSize: 16 }}>Créer une boutique</h3>
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#65676B' }}><HiX size={20} /></button>
            </div>
            <input className="input" placeholder="Nom de la boutique" value={name} onChange={e => setName(e.target.value)} maxLength={80} style={{ marginBottom: 10 }} />
            <select value={category} onChange={e => setCategory(e.target.value)} className="input" style={{ marginBottom: 14 }}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={createShop} disabled={creating} className="btn-primary" style={{ width: '100%', padding: '12px 0', fontSize: 15 }}>
              {creating ? 'Création...' : 'Créer ma boutique ✨'}
            </button>
            <p style={{ fontSize: 11, color: '#65676B', marginTop: 8, textAlign: 'center' }}>Vous serez administrateur de cette boutique.</p>
          </div>
        </div>
      )}
      {shareItem && <ShareModal post={shareItem} onClose={() => setShareItem(null)} />}
    </div>
  );
}
