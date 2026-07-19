import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useActiveStoryUids } from '../hooks/useActiveStoryUids';
import { useOnline } from '../hooks/useOnline';
import { NeonEye, NeonPeople } from './NeonIcons';

export default function Avatar({ uid, src, name = 'U', size = 40, showStory = true, showOnline = true, style = {} }) {
  const navigate = useNavigate();
  const storyUids = useActiveStoryUids();
  const online = useOnline();
  const [menu, setMenu] = useState(false);

  const hasStory = !!(showStory && uid && storyUids.has(uid));
  const isOnline = !!(showOnline && uid && online[uid] === true);
  const photo = src || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1877F2&color=fff`;
  const dot = Math.max(10, Math.round(size * 0.26));

  const handleClick = (e) => {
    e.stopPropagation();
    if (hasStory) setMenu(m => !m);
    else if (uid) navigate(`/profile/${uid}`);
  };

  const btnStyle = {
    display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left',
    padding: '15px 18px', background: 'none', border: 'none', borderBottom: '1px solid #eef0f2',
    fontSize: 15, fontWeight: 600, fontFamily: 'Poppins', color: '#050505', cursor: 'pointer', whiteSpace: 'nowrap',
  };

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0, ...style }}>
      <div
        onClick={handleClick}
        style={{
          width: size, height: size, borderRadius: '50%', cursor: 'pointer', boxSizing: 'border-box',
          padding: hasStory ? 2.5 : 0,
          background: hasStory ? 'linear-gradient(135deg,#1B84FF,#1877F2)' : 'transparent',
        }}
      >
        <div style={{
          width: '100%', height: '100%', borderRadius: '50%', boxSizing: 'border-box',
          padding: hasStory ? 2 : 0, background: '#fff',
        }}>
          <img src={photo} alt="" loading="lazy"
            style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', display: 'block' }} />
        </div>
      </div>

      {isOnline && (
        <span style={{
          position: 'absolute', bottom: 0, right: 0, width: dot, height: dot,
          borderRadius: '50%', background: '#22c55e', border: '2px solid white',
        }} />
      )}

      {menu && (
        <>
          <div onClick={(e) => { e.stopPropagation(); setMenu(false); }}
               style={{ position: 'fixed', inset: 0, zIndex: 998 }} />
          <div style={{
            position: 'absolute', top: size + 8, left: 0, zIndex: 999, background: 'white',
            borderRadius: 14, boxShadow: '0 8px 28px rgba(0,0,0,.22)', overflow: 'hidden', minWidth: 200,
          }}>
            <button style={btnStyle}
              onClick={(e) => { e.stopPropagation(); setMenu(false); navigate('/', { state: { openStoryUid: uid } }); }}>
              <NeonEye size={20} color="#1877F2" /> Voir la story
            </button>
            <button style={{ ...btnStyle, borderBottom: 'none' }}
              onClick={(e) => { e.stopPropagation(); setMenu(false); navigate(`/profile/${uid}`); }}>
              <NeonPeople size={20} color="#1877F2" /> Voir le profil
            </button>
          </div>
        </>
      )}
    </div>
  );
}
