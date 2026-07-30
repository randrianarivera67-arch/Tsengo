const fs = require('fs');
const done = [];

{
  const p = 'src/components/Layout.jsx';
  let s = fs.readFileSync(p, 'utf8');
  if (s.includes('requestFeedReset')) { done.push('layout (deja)'); }
  else {
    const aImp = "import { clearPins } from '../utils/feedPins';";
    if (s.split(aImp).length - 1 !== 1) { console.log('ERR ancre import Layout'); process.exit(1); }
    s = s.replace(aImp, "import { clearPins, requestFeedReset } from '../utils/feedPins';");
    const aFn = "    clearPins();                 // un refresh doit VRAIMENT reclasser le fil";
    if (s.split(aFn).length - 1 !== 1) { console.log('ERR ancre doSoftRefresh ('+(s.split(aFn).length-1)+')'); process.exit(1); }
    s = s.replace(aFn, aFn + "\n    requestFeedReset();          // ignorer l'instantane -> nouveau classement");
    fs.writeFileSync(p, s);
    done.push('layout');
  }
}

{
  const p = 'src/pages/Home.jsx';
  let s = fs.readFileSync(p, 'utf8');
  if (s.includes('consumeFeedReset')) { done.push('home (deja)'); }
  else {
    const aImp = "import { addPin, getPins, removePin, clearPins } from '../utils/feedPins';";
    if (s.split(aImp).length - 1 !== 1) { console.log('ERR ancre import Home'); process.exit(1); }
    s = s.replace(aImp, "import { addPin, getPins, removePin, clearPins, consumeFeedReset } from '../utils/feedPins';");

    const OLD = `  const [shuffleSeed, setShuffleSeed] = useState(() =>
    (willRestoreFeed.current && feedSnapshot) ? feedSnapshot.seed : Date.now());`;
    if (s.split(OLD).length - 1 !== 1) { console.log('ERR ancre shuffleSeed ('+(s.split(OLD).length-1)+')'); process.exit(1); }
    s = s.replace(OLD, `  const [shuffleSeed, setShuffleSeed] = useState(() => {
    // Rafraichissement demande -> on ignore l'instantane et on repart a neuf
    if (consumeFeedReset()) { feedSnapshot = null; willRestoreFeed.current = false; return Date.now(); }
    return (willRestoreFeed.current && feedSnapshot) ? feedSnapshot.seed : Date.now();
  });`);
    fs.writeFileSync(p, s);
    done.push('home');
  }
}

console.log('OK : ' + done.join(', '));
