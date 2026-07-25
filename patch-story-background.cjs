const fs = require('fs');
const p = 'src/components/StoryStudio.jsx';
let s = fs.readFileSync(p, 'utf8');
if (s.includes('startBackgroundUpload')) { console.log('SKIP deja applique'); process.exit(0); }

const impA = "import { captureVideoThumb } from '../utils/videoThumb';";
if (s.split(impA).length - 1 !== 1) { console.log('ERR ancre import ('+(s.split(impA).length-1)+')'); process.exit(1); }
s = s.replace(impA, impA + "\nimport { startBackgroundUpload } from '../utils/uploadManager';");

const START = "  async function publish() {";
const END   = "\n  const canPublish =";
const i0 = s.indexOf(START);
const i1 = s.indexOf(END, i0);
if (i0 < 0 || i1 < 0) { console.log('ERR ancres publish'); process.exit(1); }

const NEW = `  async function publish() {
    if (busy) return;
    setBusy(true); setProgress(0);

    const closeStudio = () => {
      try { previewAudioRef.current?.pause(); } catch {}
      onPublished && onPublished();
    };

    try {
      if (mode === 'text') {
        if (!text.trim()) { setBusy(false); return; }
        await addDoc(collection(db, 'stories'), {
          ...baseDoc(),
          mediaType: 'text',
          text: text.trim().slice(0, 280),
          bgColor: BG[bgIdx],
          fontSize, align, textColor: txtColor,
        });
        closeStudio();
        return;
      }

      if (mode === 'photo') {
        if (!file) { setBusy(false); return; }
        const baked = await bakePhoto().catch(() => file);
        const snap = baseDoc();
        const started = startBackgroundUpload(baked, 'Story photo', async r => {
          await addDoc(collection(db, 'stories'), {
            ...snap,
            mediaType: 'image',
            mediaURL: r.url,
          });
        });
        if (started) closeStudio(); else setBusy(false);
        return;
      }

      if (mode === 'video') {
        if (!file) { setBusy(false); return; }
        let f = file;
        const trimmed = await trimVideoTo30s(file).catch(() => null);
        if (trimmed) f = trimmed;
        const snap = baseDoc();
        const meta = {
          filter: cssFor(filterKey),
          caption: caption.trim().slice(0, 200),
          captionPos,
        };
        const started = startBackgroundUpload(f, 'Story vidéo', async r => {
          let _thumbURL = '';
          try {
            const tf = await captureVideoThumb(f);
            if (tf) { const tr = await uploadToTelegram(tf); _thumbURL = tr.url || ''; }
          } catch {}
          await addDoc(collection(db, 'stories'), {
            ...snap,
            ...meta,
            mediaType: 'video',
            mediaURL: r.url,
            thumbURL: _thumbURL,
          });
        });
        if (started) closeStudio(); else setBusy(false);
        return;
      }

      setBusy(false);
    } catch (err) {
      alert('Erreur story : ' + (err?.message || err));
      setBusy(false);
    }
  }
`;

s = s.slice(0, i0) + NEW + s.slice(i1);
fs.writeFileSync(p, s);
console.log('OK story : envoi en arriere-plan');
