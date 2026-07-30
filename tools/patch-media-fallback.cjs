const fs = require('fs');
const done = [];

{
  const p = 'src/utils/telegram.js';
  let s = fs.readFileSync(p, 'utf8');
  if (s.includes('fallbackMediaURL')) { done.push('helper (deja)'); }
  else {
    const a = "const sleep = ms => new Promise(r => setTimeout(r, ms));";
    if (s.split(a).length - 1 !== 1) { console.log('ERR ancre sleep'); process.exit(1); }
    s = s.replace(a, a + `

// Adresse de SECOURS (Render) pour une URL de media du Worker.
export function fallbackMediaURL(url) {
  if (!url || typeof url !== 'string') return null;
  if (url.indexOf(MEDIA_URL) !== 0) return null;
  return BACKEND_URL + url.slice(MEDIA_URL.length);
}`);
    fs.writeFileSync(p, s);
    done.push('helper');
  }
}

{
  const p = 'src/components/SmartImage.jsx';
  let s = fs.readFileSync(p, 'utf8');
  if (s.includes('fallbackMediaURL')) { done.push('SmartImage (deja)'); }
  else {
    const aImp = "import { useState, useRef } from 'react';";
    if (s.split(aImp).length - 1 !== 1) { console.log('ERR ancre import SmartImage'); process.exit(1); }
    s = s.replace(aImp, aImp + "\nimport { fallbackMediaURL } from '../utils/telegram';");

    const aErr = "          onError={() => { setFailed(true); setLoaded(true); }}";
    if (s.split(aErr).length - 1 !== 1) { console.log('ERR ancre onError SmartImage ('+(s.split(aErr).length-1)+')'); process.exit(1); }
    s = s.replace(aErr, `          onError={(e) => {
            const fb = fallbackMediaURL(e.currentTarget.src);
            if (fb) { e.currentTarget.src = fb; return; }
            setFailed(true); setLoaded(true);
          }}`);
    fs.writeFileSync(p, s);
    done.push('SmartImage');
  }
}

{
  const p = 'src/components/FeedVideo.jsx';
  let s = fs.readFileSync(p, 'utf8');
  if (s.includes('fallbackMediaURL')) { done.push('FeedVideo (deja)'); }
  else {
    const aImp = "import { claimPlayback } from '../utils/mediaBus';";
    if (s.split(aImp).length - 1 !== 1) { console.log('ERR ancre import FeedVideo'); process.exit(1); }
    s = s.replace(aImp, aImp + "\nimport { fallbackMediaURL } from '../utils/telegram';");

    const aVid = `      <video ref={vidRef} src={src}
        onPlay={() => { setStarted(true); claimPlayback(() => { vidRef.current?.pause?.(); setPlaying(false); }); }}`;
    if (s.split(aVid).length - 1 !== 1) { console.log('ERR ancre video FeedVideo ('+(s.split(aVid).length-1)+')'); process.exit(1); }
    s = s.replace(aVid, `      <video ref={vidRef} src={src}
        onError={(e) => {
          const fb = fallbackMediaURL(e.currentTarget.src);
          if (fb) { e.currentTarget.src = fb; try { e.currentTarget.load(); } catch {} }
        }}
        onPlay={() => { setStarted(true); claimPlayback(() => { vidRef.current?.pause?.(); setPlaying(false); }); }}`);
    fs.writeFileSync(p, s);
    done.push('FeedVideo');
  }
}

console.log('OK : ' + done.join(', '));
