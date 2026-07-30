const fs = require('fs');
const p = 'src/components/JejoStudio.jsx';
let s = fs.readFileSync(p, 'utf8');
const done = [];

const OLD_M = "    try { v.muted = !!music; } catch {}";
if (s.includes(OLD_M)) {
  if (s.split(OLD_M).length - 1 !== 1) { console.log('ERR ancre mute ('+(s.split(OLD_M).length-1)+')'); process.exit(1); }
  s = s.replace(OLD_M, "    // mangina IHANY raha tsy tafiditra ao anaty video ny hira\n    try { v.muted = !!music && !musicBakedRef.current; } catch {}");
  done.push('mute imperatif');
} else done.push('mute (deja)');

if (!s.includes('startBackgroundUpload')) {
  const aImp = "import { uploadToTelegram } from '../utils/telegram';";
  if (s.split(aImp).length - 1 !== 1) { console.log('ERR ancre import ('+(s.split(aImp).length-1)+')'); process.exit(1); }
  s = s.replace(aImp, aImp + "\nimport { startBackgroundUpload } from '../utils/uploadManager';");
  done.push('import');
}

if (!s.includes("startBackgroundUpload(out")) {
  const START = "  // ── Publier ──\n  async function publish() {";
  const END = "\n  // ── styles ──";
  const i0 = s.indexOf(START);
  if (i0 < 0) { console.log('ERR ancre publish'); process.exit(1); }
  const i1 = s.indexOf(END, i0);
  if (i1 < 0) { console.log('ERR fin publish'); process.exit(1); }

  const NEW = `  // ── Publier (envoi en arriere-plan) ──
  async function publish() {
    if (busy || !clipFile) return;
    setBusy(true); setProgress(0);
    try {
      const needProc = filterKey !== 'none' || speed !== 1 || trim.start > 0.1 || (clipDur && trim.end < clipDur - 0.1);
      let out = clipFile, baked = false;
      if (needProc) {
        const p = await processClip(clipFile, { startSec: trim.start, endSec: trim.end, speed, filterCss: cssFor(filterKey) });
        if (p) { out = p; baked = true; }
      }

      const snap = {
        uid: currentUser.uid,
        authorName: userProfile?.fullName || userProfile?.name || 'Utilisateur',
        authorUsername: userProfile?.username || '',
        authorPhoto: userProfile?.photoURL || '',
        content: caption.trim().slice(0, 500),
        mediaType: 'video',
        isReel: true,
        filter: baked ? 'none' : cssFor(filterKey),
        speed: baked ? 1 : speed,
        caption: caption.trim().slice(0, 200),
        music: (sonMode === 'music' && music && !musicBakedRef.current)
          ? { url: music.url, title: music.title || '', artist: music.artist || '', start: music.start || 0 }
          : null,
        audience: 'public',
        reactions: {}, comments: [],
      };

      const started = startBackgroundUpload(out, 'Vidéo Jejo', async r => {
        let thumbURL = '';
        try {
          const th = await captureVideoThumb(out, 0.3);
          if (th) { const tr = await uploadToTelegram(th); thumbURL = tr.url || ''; }
        } catch {}
        await addDoc(collection(db, 'posts'), {
          ...snap,
          mediaURL: r.url,
          thumbURL,
          createdAt: serverTimestamp(),
        });
      });

      if (started) {
        try { previewAudioRef.current?.pause(); } catch {}
        onPublished && onPublished();
      } else {
        alert("Un envoi est déjà en cours. Réessayez dans un instant.");
        setBusy(false);
      }
    } catch (e) {
      alert('Erreur publication : ' + (e?.message || e));
      setBusy(false);
    }
  }
`;
  s = s.slice(0, i0) + NEW + s.slice(i1);
  done.push('publication en arriere-plan');
}

fs.writeFileSync(p, s);
console.log('OK : ' + done.join(', '));
