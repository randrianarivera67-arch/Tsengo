// src/pages/Notifications.jsx
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../hooks/useNotifications';
import { useLang } from '../context/LanguageContext';
import { getChatId } from '../utils/chat';
import { useAuth } from '../context/AuthContext';
import { timeAgo } from '../utils/timeAgo';
import { HiHeart, HiChat, HiPaperAirplane, HiUserAdd, HiCheck, HiBell, HiNewspaper, HiLightningBolt, HiX } from 'react-icons/hi';

const ICONS = {
  comment:        { icon: HiChat,          color: '#3b82f6' },
  reaction:       { icon: HiHeart,         color: '#1877F2' },
  friendRequest:  { icon: HiUserAdd,       color: '#8b5cf6' },
  friendAccepted: { icon: HiCheck,         color: '#22c55e' },
  post:           { icon: HiNewspaper,     color: '#f59e0b' },
  message:        { icon: HiPaperAirplane, color: '#06b6d4' },
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
  useEffect(() => { if (unreadCount === 0) return; const timer=setTimeout(()=>markAllRead(),800); return()=>clearTimeout(timer); }, [unreadCount]);

  function handleClick(notif) {
    switch (notif.type) {
      case 'message':
        navigate(notif.conversationId?`/messages/${notif.conversationId}`:notif.fromUid?`/messages/${getChatId(currentUser.uid,notif.fromUid)}`:'/messages');
        break;
      case 'artistMessage':
        navigate(notif.artistId ? `/artists/${notif.artistId}/messages` + (notif.visitorUid && notif.fromUid !== currentUser.uid ? `/${notif.visitorUid}` : '') : '/');
        break;
      case 'shopMessage':
        navigate(notif.shopId ? `/shop/${notif.shopId}/messages` + (notif.visitorUid && notif.fromUid !== currentUser.uid ? `/${notif.visitorUid}` : '') : '/');
        break;
      case 'pageMessage':
        navigate(notif.pageId ? `/pages/${notif.pageId}/messages` + (notif.visitorUid && notif.fromUid !== currentUser.uid ? `/${notif.visitorUid}` : '') : '/');
        break;
      case 'mention': case 'share':
        navigate(notif.postId ? `/post/${notif.postId}` : '/');
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
    return timeAgo(ts);
  }

  return (
    <div style={{ padding:'16px 12px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <h2 style={{ fontWeight:700, fontSize:20, color:'#1877F2' }}>{t('notifications')}</h2>
        {unreadCount>0&&<span style={{ background:'#1877F2', color:'white', borderRadius:12, padding:'2px 10px', fontSize:12, fontWeight:700 }}>{unreadCount} nouveau{unreadCount>1?'x':''}</span>}
      </div>

      {notifications.length===0
        ? <div style={{ textAlign:'center', padding:60 }}><HiBell size={52} color="#E4E6EB" style={{ margin:'0 auto 12px', display:'block' }}/><p style={{ color:'#65676B' }}>{t('noNotifications')}</p></div>
        : (() => {
          // ── Regroupement (format Facebook) : réactions/commentaires mitovy post ──
          const grouped = [];
          const byKey = {};
          for (const n of notifications) {
            const groupable = (n.type === 'reaction' || n.type === 'comment') && n.postId;
            const key = groupable ? `${n.type}_${n.postId}` : null;
            if (key && byKey[key]) {
              const g = byKey[key];
              if (!g.others.some(o => o.fromUid === n.fromUid) && n.fromUid !== g.fromUid) g.others.push({ fromUid: n.fromUid, fromName: n.fromName });
              g.read = g.read && n.read;
              g.ids.push(n.id);
              continue;
            }
            const item = { ...n, others: [], ids: [n.id] };
            if (key) byKey[key] = item;
            grouped.push(item);
          }
          return grouped.map(notif => {
            const nOthers = notif.others.length;
            const detail = nOthers > 0
              ? (notif.type === 'reaction'
                  ? `et ${nOthers} autre${nOthers>1?'s':''} personne${nOthers>1?'s':''} ont réagi à votre publication`
                  : `et ${nOthers} autre${nOthers>1?'s':''} personne${nOthers>1?'s':''} ont commenté votre publication`)
              : (notif.message?.replace(notif.fromName,'').trim());
            notif._detail = detail;
            return notif;
          }).map(notif => {
          const cfg = ICONS[notif.type]||{icon:HiBell,color:'#1877F2'};
          const Icon = cfg.icon;
          return (
            <div key={notif.id} className="card animate-fade"
              style={{ padding:'12px 14px', marginBottom:10, display:'flex', alignItems:'center', gap:12,
                background:notif.read?'white':'#F0F2F5', borderLeft:notif.read?'none':'3px solid #1877F2', cursor:'pointer' }}>
              <div style={{ display:'flex', alignItems:'center', flex:1, gap:12 }} onClick={() => handleClick(notif)}>
                <div style={{ position:'relative', flexShrink:0 }}>
                  <img src={notif.fromPhoto||`https://ui-avatars.com/api/?name=${encodeURIComponent(notif.fromName||'U')}&background=1877F2&color=fff`} alt="" className="avatar" style={{ width:44, height:44 }}/>
                  <div style={{ position:'absolute', bottom:-2, right:-2, background:cfg.color, borderRadius:'50%', width:20, height:20, display:'flex', alignItems:'center', justifyContent:'center', border:'2px solid white' }}>
                    <Icon size={11} color="white"/>
                  </div>
                </div>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:14, lineHeight:1.4 }}><strong>{notif.fromName}</strong> {notif._detail || notif.message?.replace(notif.fromName,'').trim()}{notif.others?.length > 0 && <span style={{ color:'#1877F2', fontWeight:600 }}> · détails</span>}</p>
                  <p style={{ fontSize:11, color:'#65676B', marginTop:3 }}>{timeSince(notif.createdAt)}</p>
                </div>
                {!notif.read&&<div style={{ width:9, height:9, background:'#1877F2', borderRadius:'50%', flexShrink:0 }}/>}
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:6, flexShrink:0, alignItems:'flex-end' }}>
                <button onClick={e=>{ e.stopPropagation(); handleClick(notif); }} style={{ background:'#1877F2', border:'none', borderRadius:20, padding:'5px 14px', color:'white', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'Poppins' }}>Voir</button>
                <button onClick={e=>{ e.stopPropagation(); (notif.ids || [notif.id]).forEach(id => deleteNotification(id)); }} style={{ background:'none', border:'none', cursor:'pointer', color:'#1877F2', fontSize:11, fontWeight:600, fontFamily:'Poppins' }}>Fermer</button>
              </div>
            </div>
          );
        });
        })()
      }
    </div>
  );
}
