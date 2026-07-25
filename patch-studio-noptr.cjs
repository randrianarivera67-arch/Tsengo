const fs = require('fs');
const done = [];

{
  const p = 'src/components/PullToRefresh.jsx';
  let s = fs.readFileSync(p, 'utf8');
  if (s.includes('ptrOff')) { done.push('PullToRefresh (deja)'); }
  else {
    const aStart = `    function onStart(e) {
      if (spinningRef.current) return;`;
    if (s.split(aStart).length - 1 !== 1) { console.log('ERR ancre onStart'); process.exit(1); }
    s = s.replace(aStart, `    function onStart(e) {
      if (spinningRef.current) return;
      if (document.body.dataset.ptrOff === '1') { dragging.current = false; return; }`);

    const aMove = `    function onMove(e) {
      if (!dragging.current || spinningRef.current) return;`;
    if (s.split(aMove).length - 1 !== 1) { console.log('ERR ancre onMove'); process.exit(1); }
    s = s.replace(aMove, `    function onMove(e) {
      if (!dragging.current || spinningRef.current) return;
      if (document.body.dataset.ptrOff === '1') { dragging.current = false; draggingUI.current = false; setPull(0); return; }`);

    fs.writeFileSync(p, s);
    done.push('PullToRefresh');
  }
}

{
  const p = 'src/components/StoryStudio.jsx';
  let s = fs.readFileSync(p, 'utf8');
  if (s.includes('askClose')) { done.push('StoryStudio (deja)'); }
  else {
    const aEff = "  useEffect(() => () => { try { previewAudioRef.current?.pause(); } catch {} }, []);";
    if (s.split(aEff).length - 1 !== 1) { console.log('ERR ancre effet pause ('+(s.split(aEff).length-1)+')'); process.exit(1); }
    s = s.replace(aEff, `  useEffect(() => () => { try { previewAudioRef.current?.pause(); } catch {} }, []);

  useEffect(() => {
    document.body.dataset.ptrOff = '1';
    return () => { try { delete document.body.dataset.ptrOff; } catch {} };
  }, []);

  function askClose() {
    const hasWork = (mode === 'text' && !!text.trim()) || ((mode === 'photo' || mode === 'video') && !!file);
    if (hasWork && !window.confirm('Voulez-vous vraiment quitter ? Votre story ne sera pas publiée.')) return;
    try { previewAudioRef.current?.pause(); } catch {}
    onClose && onClose();
  }`);

    const aBtn = "        <button style={topBtn} onClick={onClose}>{Ic.x(20)}</button>";
    if (s.split(aBtn).length - 1 !== 1) { console.log('ERR ancre bouton fermer ('+(s.split(aBtn).length-1)+')'); process.exit(1); }
    s = s.replace(aBtn, "        <button style={topBtn} onClick={askClose}>{Ic.x(20)}</button>");

    fs.writeFileSync(p, s);
    done.push('StoryStudio');
  }
}

console.log('OK : ' + done.join(', '));
