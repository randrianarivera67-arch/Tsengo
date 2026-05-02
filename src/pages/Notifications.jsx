// src/pages/Notifications.jsx
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../hooks/useNotifications';
import { useLang } from '../context/LanguageContext';
import { getChatId } from '../utils/chat';
import { useAuth } from '../context/AuthContext';
import { HiHeart, HiChat, HiUserAdd, HiCheck, HiBell, HiNewspaper, HiLightningBolt, HiX } from 'react-icons/hi';

const ICONS = {
  comment:        { icon: HiChat,          color: '#3b82f6' },
  reaction:       { icon: HiHeart,         color: '#E91E8C' },
  friendRequest:  { icon: HiUserAdd,       color: '#8b5cf6' },
  friendAccepted: { icon: HiCheck,         color: '#22c55e' },
  post:           { icon: HiNewspaper,     color: '#f59e0b' },
  message:        { icon: HiChat,          color: '#06b6d4' },
  boost:          { icon: HiLightningBolt, color: '#a855f7' },
};

function playNotifSound() {
  try {
    const ctx = new (window.AudioContext||window.webkitAudioContext)();
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(880,ctx.currentTime); osc.frequency.setValueAtTime(1100,ctx.currentTime+.1);
    gain.gain.setValueAtTime(.3,ctx.currentTime); gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.3);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime+.3);
  } catch {}
}

export default function Notifications() {
  const { notifications, unreadCount, markAllRead, deleteNotification } = useNotifications();
  const { t }           = useLang();
  const { currentUser } = useAuth();
  const navigate        = useNavigate();
  const prevCount       = useRef(0);

  useEffect(() => { if (unreadCount>prevCount.current) playNotifSound(); prevCount.current=unreadCount; }, [unreadCount]);
  useEffect(() => { const timer=setTimeout(()=>markAllRead(),1500); return()=>clearTimeout(timer); }, []);

  function handleClick(notif) {
    switch (notif.type) {
      case 'message':
        navigate(notif.conversationId?`/messages/${notif.conversationId}`:notif.fromUid?`/messages/${getChatId(currentUser.uid,notif.fromUid)}`:'/messages');
        break;
      case 'comment': case 'reaction': case 'post': case 'boost':
        navigate(notif.postId?`/post/${notif.postId}`:'/');
        break;
      case 'friendRequest': case 'friendAccepted':
        navigate(`/profile/${notif.fromUid}`);
        break;
      default: navigate('/');
    }
  }

  function timeSince(ts) {
    if (!ts) return '';
    const d = ts.toDate?ts.toDate():new Date(ts);
    const s = (Date.now()-d.getTime())/1000;
    if (s<60) return 'À l\'instant';
    if (s<3600) return `${Math.floor(s/60)} min`;
    if (s<86400) return `${Math.floor(s/3600)}h`;
    return `${Math.floor(s/86400)}j`;
  }

  return (
    <div style={{ padding:'16px 12px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <h2 style={{ fontWeight:700, fontSize:20, color:'#E91E8C' }}>{t('notifications')}</h2>
        {unreadCount>0&&<span style={{ background:'#E91E8C', color:'white', borderRadius:12, padding:'2px 10px', fontSize:12, fontWeight:700 }}>{unreadCount} nouveau{unreadCount>1?'x':''}</span>}
      </div>

      {notifications.length===0
        ? <div style={{ textAlign:'center', padding:60 }}><HiBell size={52} color="#E8C5D8" style={{ margin:'0 auto 12px', display:'block' }}/><p style={{ color:'#C4829F' }}>{t('noNotifications')}</p></div>
        : notifications.map(notif => {
          const cfg = ICONS[notif.type]||{icon:HiBell,color:'#E91E8C'};
          const Icon = cfg.icon;
          return (
            <div key={notif.id} className="card animate-fade"
              style={{ padding:'12px 14px', marginBottom:10, display:'flex', alignItems:'center', gap:12,
                background:notif.read?'white':'#FFF0F8', borderLeft:notif.read?'none':'3px solid #E91E8C', cursor:'pointer' }}>
              <div style={{ display:'flex', alignItems:'center', flex:1, gap:12 }} onClick={() => handleClick(notif)}>
                <div style={{ position:'relative', flexShrink:0 }}>
                  <img src={notif.fromPhoto||`https://ui-avatars.com/api/?name=${encodeURIComponent(notif.fromName||'U')}&background=E91E8C&color=fff`} alt="" className="avatar" style={{ width:44, height:44 }}/>
                  <div style={{ position:'absolute', bottom:-2, right:-2, background:cfg.color, borderRadius:'50%', width:20, height:20, display:'flex', alignItems:'center', justifyContent:'center', border:'2px solid white' }}>
                    <Icon size={11} color="white"/>
                  </div>
                </div>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:14, lineHeight:1.4 }}><strong>{notif.fromName}</strong> {notif.message?.replace(notif.fromName,'').trim()}</p>
                  <p style={{ fontSize:11, color:'#C4829F', marginTop:3 }}>{timeSince(notif.createdAt)}</p>
                </div>
                {!notif.read&&<div style={{ width:9, height:9, background:'#E91E8C', borderRadius:'50%', flexShrink:0 }}/>}
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:6, flexShrink:0, alignItems:'flex-end' }}>
                <button onClick={e=>{ e.stopPropagation(); handleClick(notif); }} style={{ background:'#E91E8C', border:'none', borderRadius:20, padding:'5px 14px', color:'white', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'Poppins' }}>Voir</button>
                <button onClick={e=>{ e.stopPropagation(); deleteNotification(notif.id); }} style={{ background:'none', border:'none', cursor:'pointer', color:'#E91E8C', fontSize:11, fontWeight:600, fontFamily:'Poppins' }}>Fermer</button>
              </div>
            </div>
          );
        })
      }
    </div>
  );
}
