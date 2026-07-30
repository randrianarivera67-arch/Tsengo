const fs = require('fs');
const done = [];

{
  const p = 'src/components/StoryStudio.jsx';
  let s = fs.readFileSync(p, 'utf8');
  if (s.includes('mediaTf')) { done.push('StoryStudio (deja)'); }
  else {
    const aState = "  const [captionPos, setCaptionPos] = useState({ x: 0.5, y: 0.8 });";
    if (s.split(aState).length - 1 !== 1) { console.log('ERR ancre captionPos'); process.exit(1); }
    s = s.replace(aState, aState + `
  const [mediaTf, setMediaTf] = useState({ s: 1, x: 0, y: 0 });
  const mediaElRef = useRef(null);
  const tfRef = useRef(null);`);

    const aFns = "  function capPointerUp() { capDragRef.current = false; }";
    if (s.split(aFns).length - 1 !== 1) { console.log('ERR ancre capPointerUp'); process.exit(1); }
    s = s.replace(aFns, aFns + `
  function tfStart(e) {
    const t = e.touches; if (!t) return;
    if (t.length === 2) {
      const d = Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
      tfRef.current = { kind: 'pinch', d0: d || 1, s0: mediaTf.s };
    } else if (t.length === 1) {
      tfRef.current = { kind: 'pan', x0: t[0].clientX, y0: t[0].clientY, sx: mediaTf.x, sy: mediaTf.y };
    }
  }
  function tfMove(e) {
    const st = tfRef.current, t = e.touches, el = mediaElRef.current;
    if (!st || !t || !el) return;
    const r = el.getBoundingClientRect();
    const cur = mediaTf.s || 1;
    const baseW = (r.width / cur) || 1, baseH = (r.height / cur) || 1;
    if (st.kind === 'pinch' && t.length === 2) {
      const d = Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
      const ns = Math.max(1, Math.min(4, st.s0 * (d / st.d0)));
      setMediaTf(v => ({ ...v, s: ns }));
    } else if (st.kind === 'pan' && t.length === 1) {
      const nx = Math.max(-1, Math.min(1, st.sx + (t[0].clientX - st.x0) / baseW));
      const ny = Math.max(-1, Math.min(1, st.sy + (t[0].clientY - st.y0) / baseH));
      setMediaTf(v => ({ ...v, x: nx, y: ny }));
    }
  }
  function tfEnd() { tfRef.current = null; }`);

    const aBake = `            const s = Math.min(W / img.width, H / img.height);
            const dw = img.width * s, dh = img.height * s;
            try { ctx.filter = cssFor(filterKey); } catch {}
            ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);`;
    if (s.split(aBake).length - 1 !== 1) { console.log('ERR ancre bake ('+(s.split(aBake).length-1)+')'); process.exit(1); }
    s = s.replace(aBake, `            const s = Math.min(W / img.width, H / img.height);
            const dw = img.width * s, dh = img.height * s;
            const tfS = mediaTf.s || 1;
            const fw = dw * tfS, fh = dh * tfS;
            const ccx = W / 2 + (mediaTf.x || 0) * dw;
            const ccy = H / 2 + (mediaTf.y || 0) * dh;
            try { ctx.filter = cssFor(filterKey); } catch {}
            ctx.drawImage(img, ccx - fw / 2, ccy - fh / 2, fw, fh);`);

    const aPub = `        const meta = {
          filter: cssFor(filterKey),
          caption: caption.trim().slice(0, 200),
          captionPos,
        };`;
    if (s.split(aPub).length - 1 !== 1) { console.log('ERR ancre meta video'); process.exit(1); }
    s = s.replace(aPub, `        const meta = {
          filter: cssFor(filterKey),
          caption: caption.trim().slice(0, 200),
          captionPos,
          mediaTransform: { s: mediaTf.s, x: mediaTf.x, y: mediaTf.y },
        };`);

    const aImg = `          <img src={previewURL} alt="" style={{ position: 'relative', maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', filter: previewFilter }} />`;
    if (s.split(aImg).length - 1 !== 1) { console.log('ERR ancre img apercu'); process.exit(1); }
    s = s.replace(aImg, `          <img ref={mediaElRef} src={previewURL} alt=""
            onTouchStart={tfStart} onTouchMove={tfMove} onTouchEnd={tfEnd} onTouchCancel={tfEnd}
            style={{ position: 'relative', maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', filter: previewFilter, transform: tfCss, touchAction: 'none', willChange: 'transform' }} />`);

    const aVid = `        <video ref={videoElRef} src={previewURL} autoPlay loop muted={sonMode !== 'original'} playsInline style={{ maxWidth: '100%', maxHeight: '100%', filter: previewFilter }} />`;
    if (s.split(aVid).length - 1 !== 1) { console.log('ERR ancre video apercu'); process.exit(1); }
    s = s.replace(aVid, `        <video ref={el => { videoElRef.current = el; mediaElRef.current = el; }} src={previewURL} autoPlay loop muted={sonMode !== 'original'} playsInline
          onTouchStart={tfStart} onTouchMove={tfMove} onTouchEnd={tfEnd} onTouchCancel={tfEnd}
          style={{ maxWidth: '100%', maxHeight: '100%', filter: previewFilter, transform: tfCss, touchAction: 'none', willChange: 'transform' }} />`);

    const aPrev = "  const preview = (";
    if (s.split(aPrev).length - 1 !== 1) { console.log('ERR ancre preview'); process.exit(1); }
    s = s.replace(aPrev, `  const tfCss = \`translate(\${(mediaTf.x * 100).toFixed(3)}%, \${(mediaTf.y * 100).toFixed(3)}%) scale(\${mediaTf.s})\`;
  const tfTouched = mediaTf.s !== 1 || mediaTf.x !== 0 || mediaTf.y !== 0;

${aPrev}`);

    const aBadge = "      {/* Badge musique */}";
    if (s.split(aBadge).length - 1 !== 1) { console.log('ERR ancre badge musique'); process.exit(1); }
    s = s.replace(aBadge, `      {(mode === 'photo' || mode === 'video') && tfTouched && (
        <button onClick={() => setMediaTf({ s: 1, x: 0, y: 0 })}
          style={{ position: 'absolute', top: 14, left: 14, zIndex: 4, background: 'rgba(0,0,0,.5)', border: '1px solid rgba(255,255,255,.3)', borderRadius: 18, padding: '6px 12px', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Poppins' }}>
          ↺ Recadrer
        </button>
      )}
${aBadge}`);

    fs.writeFileSync(p, s);
    done.push('StoryStudio');
  }
}

{
  const p = 'src/pages/Home.jsx';
  let s = fs.readFileSync(p, 'utf8');
  if (s.includes('cur.mediaTransform')) { done.push('Viewer (deja)'); }
  else {
    const a = "style={{ maxWidth:'100%', maxHeight:'100%', filter: cur.filter || 'none' }} />";
    if (s.split(a).length - 1 !== 1) { console.log('ERR ancre video visionneuse ('+(s.split(a).length-1)+')'); process.exit(1); }
    s = s.replace(a, "style={{ maxWidth:'100%', maxHeight:'100%', filter: cur.filter || 'none', transform: cur.mediaTransform ? `translate(${(cur.mediaTransform.x||0)*100}%, ${(cur.mediaTransform.y||0)*100}%) scale(${cur.mediaTransform.s||1})` : undefined }} />");
    fs.writeFileSync(p, s);
    done.push('Viewer');
  }
}

console.log('OK : ' + done.join(', '));
