// src/components/PhotoCarousel.jsx
// Carrousel photo (2 à 10 images) — glisser horizontalement, points indicateurs
import { useState, useRef } from 'react';

export default function PhotoCarousel({ urls }) {
  const [idx, setIdx] = useState(0);
  const scRef = useRef();
  function onScroll(e) {
    const w = e.currentTarget.clientWidth;
    const i = Math.round(e.currentTarget.scrollLeft / w);
    if (i !== idx) setIdx(i);
  }
  return (
    <div style={{ position:'relative' }}>
      <div ref={scRef} onScroll={onScroll}
        style={{ display:'flex', overflowX:'auto', scrollSnapType:'x mandatory', WebkitOverflowScrolling:'touch', scrollbarWidth:'none' }}>
        {urls.map((u, i) => (
          <img key={i} src={u} alt="" style={{ width:'100%', flexShrink:0, scrollSnapAlign:'start', maxHeight:520, objectFit:'cover', display:'block' }} />
        ))}
      </div>
      <span style={{ position:'absolute', top:10, right:10, background:'rgba(0,0,0,.55)', color:'white', borderRadius:12, padding:'2px 9px', fontSize:12, fontWeight:700 }}>{idx+1}/{urls.length}</span>
      <div style={{ position:'absolute', bottom:8, left:0, right:0, display:'flex', justifyContent:'center', gap:5 }}>
        {urls.map((_, i) => <span key={i} style={{ width:6, height:6, borderRadius:'50%', background: i===idx ? 'white' : 'rgba(255,255,255,.45)' }} />)}
      </div>
    </div>
  );
}
