// src/pages/Profile.jsx
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import { HiCamera, HiPencil, HiHeart, HiTag, HiChat } from 'react-icons/hi';

export default function Profile() {
  const { uid } = useParams();
  const { currentUser, userProfile, setUserProfile } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();

  const isOwn = !uid || uid === currentUser?.uid;
  const targetUid = uid || currentUser?.uid;

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [activeTab, setActiveTab] = useState('posts');
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ fullName: '', bio: '' });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const photoRef = useRef();

  useEffect(() => {
    async function load() {
      const snap = await getDoc(doc(db, 'users', targetUid));
      if (snap.exists()) {
        setProfile(snap.data());
        setEditForm({ fullName: snap.data().fullName, bio: snap.data().bio || '' });
      }
    }
    if (targetUid) load();
  }, [targetUid]);

  useEffect(() => {
    if (!targetUid) return;
    const q = query(collection(db, 'posts'), where('uid', '==', targetUid), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [targetUid]);

  async function uploadProfilePhoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const fileRef = storageRef(storage, `avatars/${currentUser.uid}`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);
      await updateDoc(doc(db, 'users', currentUser.uid), { photoURL: url });
      setProfile(p => ({ ...p, photoURL: url }));
      setUserProfile(p => ({ ...p, photoURL: url }));
    } catch (err) { console.error(err); }
    setUploadingPhoto(false);
  }

  async function saveProfile() {
    await updateDoc(doc(db, 'users', currentUser.uid), {
      fullName: editForm.fullName,
      bio: editForm.bio,
    });
    setProfile(p => ({ ...p, ...editForm }));
    setUserProfile(p => ({ ...p, ...editForm }));
    setEditing(false);
  }

  const salePosts = posts.filter(p => p.isSale);
  const displayPosts = activeTab === 'posts' ? posts.filter(p => !p.isSale) : salePosts;

  if (!profile) return <div style={{ padding: 40, textAlign: 'center', color: '#C4829F' }}>{t('loading')}</div>;

  const friendCount = profile.friends?.length || 0;

  return (
    <div>
      {/* Cover */}
      <div style={{ height: 140, background: 'linear-gradient(135deg, #E91E8C, #FF6BB5, #FFB3D9)', position: 'relative' }}>
        <div style={{ position: 'absolute', bottom: -50, left: '50%', transform: 'translateX(-50%)' }}>
          <div style={{ position: 'relative' }}>
            <img
              src={profile.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.fullName)}&background=E91E8C&color=fff&size=100`}
              alt="" className="avatar avatar-ring"
              style={{ width: 100, height: 100, border: '4px solid white' }}
            />
            {isOwn && (
              <>
                <button
                  onClick={() => photoRef.current.click()}
                  disabled={uploadingPhoto}
                  style={{ position: 'absolute', bottom: 2, right: 2, background: '#E91E8C', border: '2px solid white', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  {uploadingPhoto ? '...' : <HiCamera size={14} />}
                </button>
                <input ref={photoRef} type="file" accept="image/*" onChange={uploadProfilePhoto} style={{ display: 'none' }} />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Info */}
      <div style={{ paddingTop: 60, textAlign: 'center', padding: '60px 20px 16px' }}>
        {editing ? (
          <div style={{ maxWidth: 300, margin: '0 auto' }}>
            <input className="input" value={editForm.fullName} onChange={e => setEditForm(p => ({ ...p, fullName: e.target.value }))} style={{ marginBottom: 10 }} placeholder={t('fullName')} />
            <textarea className="input" value={editForm.bio} onChange={e => setEditForm(p => ({ ...p, bio: e.target.value }))} placeholder={t('bio')} rows={2} style={{ resize: 'none', marginBottom: 10 }} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-secondary" onClick={() => setEditing(false)} style={{ flex: 1 }}>{t('cancel')}</button>
              <button className="btn-primary" onClick={saveProfile} style={{ flex: 1 }}>{t('save')}</button>
            </div>
          </div>
        ) : (
          <>
            <h2 style={{ fontWeight: 700, fontSize: 20, color: '#2D1220' }}>{profile.fullName}</h2>
            <p style={{ color: '#C4829F', fontSize: 14 }}>@{profile.username}</p>
            {profile.bio && <p style={{ marginTop: 8, fontSize: 14, color: '#8B5A6F', maxWidth: 280, margin: '8px auto 0' }}>{profile.bio}</p>}

            {/* Stats */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 32, marginTop: 16 }}>
              {[
                { label: t('myPosts'), value: posts.filter(p => !p.isSale).length },
                { label: t('mySales'), value: salePosts.length },
                { label: t('myFriends'), value: friendCount },
              ].map(({ label, value }) => (
                <div key={label} style={{ textAlign: 'center' }}>
                  <p style={{ fontWeight: 700, fontSize: 20, color: '#E91E8C' }}>{value}</p>
                  <p style={{ fontSize: 11, color: '#C4829F' }}>{label}</p>
                </div>
              ))}
            </div>

            {isOwn ? (
              <button onClick={() => setEditing(true)} style={{ marginTop: 14, display: 'inline-flex', alignItems: 'center', gap: 6, background: '#FFE4F3', border: 'none', borderRadius: 20, padding: '8px 18px', color: '#E91E8C', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                <HiPencil size={14} /> {t('editProfile')}
              </button>
            ) : (
              <button
                onClick={() => navigate('/messages')}
                className="btn-primary"
                style={{ marginTop: 14, fontSize: 13, padding: '8px 20px' }}
              >
                <HiChat size={14} style={{ display: 'inline', marginRight: 4 }} />
                {t('message')}
              </button>
            )}
          </>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderTop: '1px solid #FFE4F3', borderBottom: '1px solid #FFE4F3', background: 'white' }}>
        {['posts', 'sales'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1, padding: '12px', border: 'none', background: 'none', cursor: 'pointer',
              fontWeight: activeTab === tab ? 700 : 400,
              color: activeTab === tab ? '#E91E8C' : '#C4829F',
              borderBottom: activeTab === tab ? '2px solid #E91E8C' : '2px solid transparent',
              fontSize: 14, fontFamily: 'Poppins',
            }}
          >
            {tab === 'posts' ? t('myPosts') : t('mySales')}
          </button>
        ))}
      </div>

      {/* Posts */}
      <div style={{ padding: '12px' }}>
        {displayPosts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#C4829F' }}>Tsy misy mbola</div>
        ) : (
          displayPosts.map(post => (
            <div key={post.id} className="card" style={{ marginBottom: 12, padding: 14 }}>
              {post.isSale && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span className="sale-badge"><HiTag size={12} style={{ display: 'inline' }} /> {t('sale')}</span>
                  <span className="price-tag">{post.price} Ar</span>
                </div>
              )}
              {post.content && <p style={{ fontSize: 14, color: '#2D1220', marginBottom: 8 }}>{post.content}</p>}
              {post.mediaURL && (
                post.mediaType === 'image'
                  ? <img src={post.mediaURL} alt="" style={{ width: '100%', borderRadius: 10, maxHeight: 220, objectFit: 'cover' }} />
                  : <video src={post.mediaURL} controls style={{ width: '100%', borderRadius: 10 }} />
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
    </div>
  );
}
