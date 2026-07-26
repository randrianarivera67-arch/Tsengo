const fs = require('fs');
const done = [];

{
  const p = 'src/components/JejoStudio.jsx';
  let s = fs.readFileSync(p, 'utf8');
  if (s.includes('try { stopRecAudio(); } catch {}')) { done.push('audio (deja)'); }
  else {
    const OLD = "  useEffect(() => () => { stopStream(); clearInterval(recTimerRef.current); clearInterval(cdTimerRef.current); try { previewAudioRef.current?.pause(); } catch {} }, []);";
    if (s.split(OLD).length - 1 !== 1) { console.log('ERR ancre cleanup ('+(s.split(OLD).length-1)+')'); process.exit(1); }
    s = s.replace(OLD, "  // Fermeture du studio : on coupe TOUT le son (musique d'enregistrement incluse)\n  useEffect(() => () => { stopStream(); clearInterval(recTimerRef.current); clearInterval(cdTimerRef.current); try { stopRecAudio(); } catch {} try { previewAudioRef.current?.pause(); } catch {} }, []);");
    fs.writeFileSync(p, s);
    done.push('audio coupe a la fermeture');
  }
}

{
  const p = 'src/pages/Home.jsx';
  let s = fs.readFileSync(p, 'utf8');
  if (s.includes("from '../utils/feedPins'")) { done.push('fil (deja)'); }
  else {
    const aImp = "import { readCache, writeCache, SIX_HOURS } from '../utils/softCache';";
    if (s.split(aImp).length - 1 !== 1) { console.log('ERR ancre import Home'); process.exit(1); }
    s = s.replace(aImp, aImp + "\nimport { addPin, getPins, removePin, clearPins } from '../utils/feedPins';");

    const i0 = s.indexOf('let freshOwnPosts');
    if (i0 < 0) { console.log('ERR bloc freshOwnPosts introuvable'); process.exit(1); }
    const iFn = s.indexOf('function freshOwnIds()', i0);
    if (iFn < 0) { console.log('ERR freshOwnIds introuvable'); process.exit(1); }
    const iEnd = s.indexOf('\n}', iFn);
    if (iEnd < 0) { console.log('ERR fin freshOwnIds'); process.exit(1); }
    s = s.slice(0, i0) + "// (epinglage des publications recentes : voir utils/feedPins)" + s.slice(iEnd + 2);

    s = s.replace("          mine.forEach(m => { if (!freshOwnPosts.some(x => x.id === m.id)) freshOwnPosts.push({ id: m.id, t: Date.now() }); });",
                  "          mine.forEach(m => addPin(m.id));");
    s = s.replace("          const pinned = freshOwnIds().filter(id => !opt.includes(id));",
                  "          const pinned = getPins().filter(id => !opt.includes(id));");
    s = s.replace(/    freshOwnPosts = \[\];[^\n]*\n/, "    clearPins();                                    // tout refresh = reclassement complet\n");
    s = s.replace("    freshOwnPosts = freshOwnPosts.filter(x => x.id !== postId);", "    removePin(postId);");

    if (s.includes('freshOwnPosts') || s.includes('freshOwnIds')) { console.log('ERR references restantes'); process.exit(1); }
    fs.writeFileSync(p, s);
    done.push('fil partage');
  }
}

{
  const p = 'src/components/Layout.jsx';
  let s = fs.readFileSync(p, 'utf8');
  if (s.includes('clearPins')) { done.push('layout (deja)'); }
  else {
    const aImp = "import UpdateBanner from './UpdateBanner';";
    if (s.split(aImp).length - 1 !== 1) { console.log('ERR ancre import Layout'); process.exit(1); }
    s = s.replace(aImp, aImp + "\nimport { clearPins } from '../utils/feedPins';");
    const aFn = "  const doSoftRefresh = () => {\n    setRefreshing(true);";
    if (s.split(aFn).length - 1 !== 1) { console.log('ERR ancre doSoftRefresh ('+(s.split(aFn).length-1)+')'); process.exit(1); }
    s = s.replace(aFn, "  const doSoftRefresh = () => {\n    clearPins();                 // un refresh doit VRAIMENT reclasser le fil\n    setRefreshing(true);");
    fs.writeFileSync(p, s);
    done.push('layout');
  }
}

console.log('OK : ' + done.join(', '));
