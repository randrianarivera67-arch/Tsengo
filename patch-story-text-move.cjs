const fs = require('fs');
const done = [];

{
  const p = 'src/components/StoryStudio.jsx';
  let s = fs.readFileSync(p, 'utf8');
  if (s.includes('textMove')) { done.push('StoryStudio (deja)'); }
  else {
    const aState = "  const [mediaTf, setMediaTf] = useState({ s: 1, x: 0, y: 0 });";
    if (s.split(aState).length - 1 !== 1) { console.log('ERR ancre mediaTf'); process.exit(1); }
    s = s.replace(aState, aState + `
  const [textPos, setTextPos]   = useState({ x: 0.5, y: 0.5 });
  const [textMove, setTextMove] = useState(false);
  const txRef = useRef(null);`);

    const aFns = "  function tfEnd() { tfRef.current = null; }";
    if (s.split(aFns).length - 1 !== 1) { console.log('ERR ancre tfEnd'); process.exit(1); }
    s = s.replace(aFns, aFns + `
  function txStart(e) {
    const t = e.touches; if (!t) return;
    if (t.length === 2) {
      const d = Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
      txRef.current = { kind: 'pinch', d0: d || 1, f0: fontSize };
    } else if (t.length === 1 && textMove) {
      txRef.current = { kind: 'pan', x0: t[0].clientX, y0: t[0].clientY, sx: textPos.x, sy: textPos.y };
    }
  }
  function txMove(e) {
    const st = txRef.current, t = e.touches, el = previewRef.current;
    if (!st || !t || !el) return;
    const r = el.getBoundingClientRect();
    if (st.kind === 'pinch' && t.length === 2) {
      setFontSize(Math.round(Math.max(16, Math.min(72, st.f0 * (d2(t) / st.d0)))));
    } else if (st.kind === 'pan' && t.length === 1) {
      const nx = Math.max(0.12, Math.min(0.88, st.sx + (t[0].clientX - st.x0) / (r.width || 1)));
      const ny = Math.max(0.10, Math.min(0.90, st.sy + (t[0].clientY - st.y0) / (r.height || 1)));
      setTextPos({ x: nx, y: ny });
    }
  }
  function d2(t) { return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY); }
  function txEnd() { txRef.current = null; }`);

    const aPub = `          bgColor: BG[bgIdx],
          fontSize, align, textColor: txtColor,`;
    if (s.split(aPub).length - 1 !== 1) { console.log('ERR ancre publish texte'); process.exit(1); }
    s = s.replace(aPub, `          bgColor: BG[bgIdx],
          fontSize, align, textColor: txtColor,
          textPos,`);

    const aTa = `        <textarea
          autoFocus value={text} onChange={e => setText(e.target.value)} maxLength={280}
          placeholder="Écrivez quelque chose..."
          style={{ width: '86%', background: 'transparent', border: 'none', outline: 'none', resize: 'none', color: txtColor, fontFamily: 'Poppins', fontWeight: 800, fontSize, lineHeight: 1.28, textAlign: align, height: '60%', textShadow: txtColor === '#FFFFFF' ? '0 1px 8px rgba(0,0,0,.25)' : 'none' }}
        />`;
    if (s.split(aTa).length - 1 !== 1) { console.log('ERR ancre textarea ('+(s.split(aTa).length-1)+')'); process.exit(1); }
    s = s.replace(aTa, `        <div
          onTouchStart={txStart} onTouchMove={txMove} onTouchEnd={txEnd} onTouchCancel={txEnd}
          style={{ position: 'absolute', left: (textPos.x * 100) + '%', top: (textPos.y * 100) + '%', transform: 'translate(-50%,-50%)', width: '86%', height: '60%', touchAction: textMove ? 'none' : 'auto', border: textMove ? '1.5px dashed rgba(255,255,255,.55)' : '1.5px solid transparent', borderRadius: 12 }}>
          <textarea
            autoFocus value={text} onChange={e => setText(e.target.value)} maxLength={280}
            readOnly={textMove}
            placeholder="Écrivez quelque chose..."
            style={{ width: '100%', height: '100%', background: 'transparent', border: 'none', outline: 'none', resize: 'none', color: txtColor, fontFamily: 'Poppins', fontWeight: 800, fontSize, lineHeight: 1.28, textAlign: align, padding: 0, textShadow: txtColor === '#FFFFFF' ? '0 1px 8px rgba(0,0,0,.25)' : 'none', pointerEvents: textMove ? 'none' : 'auto' }}
          />
        </div>`);

    const aBtn = `            <button style={toolBtn(false)} onClick={() => setFontSize(fontSize >= 52 ? 22 : fontSize + 6)}>Aa {fontSize}</button>`;
    if (s.split(aBtn).length - 1 !== 1) { console.log('ERR ancre bouton Aa'); process.exit(1); }
    s = s.replace(aBtn, aBtn + `
            <button style={toolBtn(textMove)} onClick={() => setTextMove(v => !v)}>{textMove ? 'Écrire' : 'Placer'}</button>`);

    fs.writeFileSync(p, s);
    done.push('StoryStudio');
  }
}

{
  const p = 'src/pages/Home.jsx';
  let s = fs.readFileSync(p, 'utf8');
  if (s.includes('cur.textPos')) { done.push('Viewer (deja)'); }
  else {
    const a = "? <p style={{ color: cur.textColor || 'white', fontSize: cur.fontSize || 30, fontWeight:800, textAlign: cur.align || 'center', padding:'0 30px', wordBreak:'break-word', whiteSpace:'pre-wrap' }}>{cur.text}</p>";
    if (s.split(a).length - 1 !== 1) { console.log('ERR ancre texte visionneuse ('+(s.split(a).length-1)+')'); process.exit(1); }
    s = s.replace(a, "? <p style={{ color: cur.textColor || 'white', fontSize: cur.fontSize || 30, fontWeight:800, textAlign: cur.align || 'center', padding:'0 30px', wordBreak:'break-word', whiteSpace:'pre-wrap', ...(cur.textPos ? { position:'absolute', left:(cur.textPos.x*100)+'%', top:(cur.textPos.y*100)+'%', transform:'translate(-50%,-50%)', width:'86%', padding:0 } : null) }}>{cur.text}</p>");
    fs.writeFileSync(p, s);
    done.push('Viewer');
  }
}

console.log('OK : ' + done.join(', '));
