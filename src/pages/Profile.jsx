// src/pages/Profile.jsx
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { uploadToCloudinary, optimizeImage } from '../utils/cloudinary';
import { HiCamera, HiPencil, HiTag, HiChat, HiPhotograph, HiPhone, HiLocationMarker } from 'react-icons/hi';

export default function Profile() {
  const { uid } = useParams();
  const { currentUser, userProfile, setUserProfile } = useAuth();
  const navigate = useNavigate();

  const isOwn = !uid || uid === currentUser?.uid;
  const targetUid = uid || currentUser?.uid;

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [activeTab, setActiveTab] = useState('posts');
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ fullName: '', bio: '' });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [coverProgress, setCoverProgress] = useState(0);

  const photoRef = useRef();
  const coverRef = useRef();

  useEffect(() => {
    if (!targetUid) return;
    getDoc(doc(db, 'users', targetUid)).then(snap => {
      if (snap.exists()) {
        setProfile(snap.data());
        setEditForm({ fullName: snap.data().fullName, bio: snap.data().bio || '' });
      }
    });
  }, [targetUid]);

  useEffect(() => {
    if (!targetUid) return;
    const q = query(collection(db, 'posts'), where('uid', '==', targetUid), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return unsub;
  }, [targetUid]);

  async function uploadProfilePhoto(e) {
    const file = e.target.files[0]; if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('Sary max 5MB'); return; }
    setUploadingPhoto(true); setUploadProgress(0);
    try {
      const result = await uploadToCloudinary(file, 'tsengo/avatars', p => setUploadProgress(p));
      await updateDoc(doc(db, 'users', currentUser.uid), { photoURL: result.url });
      setProfile(p => ({ ...p, photoURL: result.url }));
      setUserProfile(p => ({ ...p, photoURL: result.url }));
    } catch (err) { alert('Nisy olana: ' + err.message); }
    setUploadingPhoto(false); setUploadProgress(0);
  }

  async function uploadCoverPhoto(e) {
    const file = e.target.files[0]; if (!file) return;
    if (file.size > 10 * 1024 * 1024) { alert('Sary max 10MB'); return; }
    setUploadingCover(true); setCoverProgress(0);
    try {
      const result = await uploadToCloudinary(file, 'tsengo/covers', p => setCoverProgress(p));
      await updateDoc(doc(db, 'users', currentUser.uid), { coverURL: result.url });
      setProfile(p => ({ ...p, coverURL: result.url }));
      setUserProfile(p => ({ ...p, coverURL: result.url }));
    } catch (err) { alert('Nisy olana: ' + err.message); }
    setUploadingCover(false); setCoverProgress(0);
  }

  async function saveProfile() {
    await updateDoc(doc(db, 'users', currentUser.uid), { fullName: editForm.fullName, bio: editForm.bio });
    setProfile(p => ({ ...p, ...editForm }));
    setUserProfile(p => ({ ...p, ...editForm }));
    setEditing(false);
  }

  const salePosts = posts.filter(p => p.isSale);
  const normalPosts = posts.filter(p => !p.isSale);
  const photoPosts = posts.filter(p => p.mediaType === 'image' && p.mediaURL);
  const videoPosts = posts.filter(p => p.mediaType === 'video' && p.mediaURL);

  const displayPosts =
    activeTab === 'posts' ? normalPosts :
    activeTab === 'sales' ? salePosts :
    activeTab === 'photos' ? photoPosts :
    videoPosts;

  const av = (name, photo) => photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'U')}&background=E91E8C&color=fff&size=100`;

  if (!profile) return (
    <div style={{ padding: 60, textAlign: 'center', color: '#C4829F' }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>🌸</div>Chargement...
    </div>
  );

  return (
    <div>
      {/* Cover photo */}
      <div style={{ height: 140, position: 'relative', overflow: 'hidden' }}>
        {profile.coverURL
          ? <img src={profile.coverURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ height: '100%', background: 'linear-gradient(135deg, #E91E8C, #FF6BB5, #FFB3D9)' }} />
        }
        {/* Cover progress bar */}
        {uploadingCover && (
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, background: 'rgba(255,255,255,0.4)' }}>
            <div style={{ height: '100%', width: `${coverProgress}%`, background: 'white', transition: 'width 0.2s' }} />
          </div>
        )}
        {isOwn && (
          <>
            <button onClick={() => !uploadingCover && coverRef.current.click()} disabled={uploadingCover}
              style={{ position: 'absolute', bottom: 8, right: 10, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: 20, padding: '5px 12px', color: 'white', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              <HiPhotograph size={13} /> {uploadingCover ? `${coverProgress}%` : 'Changer la couverture'}
            </button>
            <input ref={coverRef} type="file" accept="image/*" onChange={uploadCoverPhoto} style={{ display: 'none' }} />
          </>
        )}
      </div>

      {/* Avatar */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: -55, position: 'relative', zIndex: 2 }}>
        <div style={{ position: 'relative' }}>
          <img src={av(profile.fullName, profile.photoURL)} alt="" className="avatar"
            style={{ width: 100, height: 100, border: '4px solid white', boxShadow: '0 4px 16px rgba(233,30,140,0.2)' }} />
          {isOwn && (
            <>
              <button onClick={() => !uploadingPhoto && photoRef.current.click()} disabled={uploadingPhoto}
                style={{ position: 'absolute', bottom: 2, right: 2, background: uploadingPhoto ? '#C4829F' : '#E91E8C', border: '2.5px solid white', borderRadius: '50%', width: 30, height: 30, cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>
                {uploadingPhoto ? `${uploadProgress}%` : <HiCamera size={14} />}
              </button>
              <input ref={photoRef} type="file" accept="image/*" onChange={uploadProfilePhoto} style={{ display: 'none' }} />
            </>
          )}
        </div>
      </div>

      {/* Avatar progress */}
      {uploadingPhoto && uploadProgress > 0 && (
        <div style={{ padding: '8px 30px 0' }}>
          <div style={{ height: 4, background: '#FFE4F3', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${uploadProgress}%`, background: 'linear-gradient(90deg, #E91E8C, #FF6BB5)', transition: 'width 0.2s' }} />
          </div>
        </div>
      )}

      {/* Info */}
      <div style={{ textAlign: 'center', padding: '14px 20px 16px' }}>
        {editing ? (
          <div style={{ maxWidth: 300, margin: '0 auto' }}>
            <input className="input" value={editForm.fullName} onChange={e => setEditForm(p => ({ ...p, fullName: e.target.value }))} style={{ marginBottom: 10 }} placeholder="Nom complet" />
            <textarea className="input" value={editForm.bio} onChange={e => setEditForm(p => ({ ...p, bio: e.target.value }))} placeholder="Bio" rows={2} style={{ resize: 'none', marginBottom: 10 }} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-secondary" onClick={() => setEditing(false)} style={{ flex: 1 }}>Annuler</button>
              <button className="btn-primary" onClick={saveProfile} style={{ flex: 1 }}>Enregistrer</button>
            </div>
          </div>
        ) : (
          <>
            <h2 style={{ fontWeight: 800, fontSize: 20, color: '#2D1220' }}>{profile.fullName}</h2>
            <p style={{ color: '#C4829F', fontSize: 13, marginTop: 2 }}>@{profile.username}</p>
            {profile.bio && <p style={{ marginTop: 8, fontSize: 13, color: '#8B5A6F', maxWidth: 280, margin: '8px auto 0', lineHeight: 1.5 }}>{profile.bio}</p>}

            {/* Stats cliquables */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 28, marginTop: 16 }}>
              <div style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => setActiveTab('posts')}>
                <p style={{ fontWeight: 800, fontSize: 22, color: '#E91E8C', lineHeight: 1 }}>{normalPosts.length}</p>
                <p style={{ fontSize: 11, color: activeTab === 'posts' ? '#E91E8C' : '#C4829F', marginTop: 2, fontWeight: activeTab === 'posts' ? 700 : 400 }}>Publications</p>
              </div>
              <div style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => setActiveTab('sales')}>
                <p style={{ fontWeight: 800, fontSize: 22, color: '#E91E8C', lineHeight: 1 }}>{salePosts.length}</p>
                <p style={{ fontSize: 11, color: activeTab === 'sales' ? '#E91E8C' : '#C4829F', marginTop: 2, fontWeight: activeTab === 'sales' ? 700 : 400 }}>Ventes</p>
              </div>
              <div style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => navigate('/friends')}>
                <p style={{ fontWeight: 800, fontSize: 22, color: '#E91E8C', lineHeight: 1 }}>{profile.friends?.length || 0}</p>
                <p style={{ fontSize: 11, color: '#C4829F', marginTop: 2 }}>Amis</p>
              </div>
            </div>

            {isOwn ? (
              <button onClick={() => setEditing(true)} style={{ marginTop: 14, display: 'inline-flex', alignItems: 'center', gap: 6, background: '#FFE4F3', border: 'none', borderRadius: 20, padding: '8px 20px', color: '#E91E8C', fontWeight: 600, cursor: 'pointer', fontSize: 13, fontFamily: 'Poppins' }}>
                <HiPencil size={14} /> Modifier le profil
              </button>
            ) : (
              <button onClick={() => navigate('/messages')} className="btn-primary" style={{ marginTop: 14, fontSize: 13, padding: '8px 20px', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <HiChat size={14} /> Message
              </button>
            )}
          </>
        )}
      </div>

      {/* Tabs — 4 onglets, soratra fotsiny */}
      <div style={{ display: 'flex', overflowX: 'auto', borderTop: '1px solid #FFE4F3', borderBottom: '1px solid #FFE4F3', background: 'white', scrollbarWidth: 'none' }}>
        {[
          { key: 'posts', label: 'Publications', count: normalPosts.length },
          { key: 'sales', label: 'Ventes', count: salePosts.length },
          { key: 'photos', label: 'Photos', count: photoPosts.length },
          { key: 'videos', label: 'Vidéos', count: videoPosts.length },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            style={{ flexShrink: 0, padding: '12px 16px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: activeTab === tab.key ? 700 : 400, color: activeTab === tab.key ? '#E91E8C' : '#C4829F', borderBottom: activeTab === tab.key ? '2.5px solid #E91E8C' : '2.5px solid transparent', fontSize: 13, fontFamily: 'Poppins', whiteSpace: 'nowrap' }}>
            {tab.label} {tab.count > 0 && <span style={{ fontSize: 11, background: activeTab === tab.key ? '#E91E8C' : '#FFE4F3', color: activeTab === tab.key ? 'white' : '#C4829F', borderRadius: 10, padding: '1px 6px', marginLeft: 3 }}>{tab.count}</span>}
          </button>
        ))}
      </div>

      {/* Media grid (photos or videos) */}
      {(activeTab === 'photos' || activeTab === 'videos') ? (
        <div style={{ padding: 8 }}>
          {displayPosts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#C4829F' }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>{activeTab === 'photos' ? '📷' : '🎬'}</div>
              Pas encore de contenu
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3 }}>
              {displayPosts.map(post => (
                <div key={post.id} style={{ position: 'relative', paddingBottom: '100%', overflow: 'hidden', borderRadius: 4, background: '#FFE4F3' }}>
                  {post.mediaType === 'image'
                    ? <img src={optimizeImage(post.mediaURL, { width: 300 })} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                    : (
                      <div style={{ position: 'absolute', inset: 0 }}>
                        <video src={post.mediaURL} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: 'rgba(233,30,140,0.8)', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ color: 'white', fontSize: 12 }}>▶</span>
                        </div>
                      </div>
                    )
                  }
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Posts / Sales list */
        <div style={{ padding: '12px' }}>
          {displayPosts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#C4829F' }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>🌸</div>
              Pas encore de contenu
            </div>
          ) : (
            displayPosts.map(post => (
              <div key={post.id} className="card" style={{ marginBottom: 12, padding: 14 }}>
                {post.isSale && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span className="sale-badge"><HiTag size={12} style={{ display: 'inline', marginRight: 3 }} />Vente</span>
                    <span className="price-tag">{Number(post.price).toLocaleString()} Ar</span>
                  </div>
                )}
                {post.content && <p style={{ fontSize: 14, color: '#2D1220', marginBottom: 8, lineHeight: 1.5 }}>{post.content}</p>}
                {post.mediaURL && (
                  post.mediaType === 'image'
                    ? <img src={optimizeImage(post.mediaURL, { width: 400 })} alt="" style={{ width: '100%', borderRadius: 10, maxHeight: 220, objectFit: 'cover' }} loading="lazy" />
                    : <video src={post.mediaURL} controls style={{ width: '100%', borderRadius: 10, maxHeight: 200 }} />
                )}
                {/* Contact vente */}
                {post.isSale && (post.phone || post.lieu) && (
                  <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {post.phone && (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <a href={`tel:${post.phone}`} style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#E91E8C', color: 'white', borderRadius: 20, padding: '5px 12px', textDecoration: 'none', fontSize: 12, fontWeight: 600 }}>
                          <HiPhone size={13} /> Appeler
                        </a>
                        <button onClick={() => navigate('/messages')}
                          style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#FFE4F3', color: '#E91E8C', borderRadius: 20, padding: '5px 12px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                          <HiChat size={13} /> Message
                        </button>
                      </div>
                    )}
                    {post.lieu && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#8B5A6F' }}>
                        <HiLocationMarker size={13} color="#E91E8C" /> {post.lieu}
                      </div>
                    )}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 12, color: '#C4829F' }}>
                  <span>❤️ {Object.keys(post.reactions || {}).length}</span>
                  <span>💬 {post.comments?.length || 0}</span>
                  <span style={{ marginLeft: 'auto' }}>{post.createdAt?.toDate ? new Date(post.createdAt.toDate()).toLocaleDateString('fr-FR') : ''}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
