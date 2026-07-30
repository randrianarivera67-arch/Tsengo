const fs = require('fs');
const done = [];

{
  const p = 'src/pages/Home.jsx';
  let s = fs.readFileSync(p, 'utf8');
  if (s.includes('publicites desactivees')) { done.push('pubs (deja)'); }
  else {
    const aHook = "  const feedAds = useFeedAds();";
    if (s.split(aHook).length - 1 !== 1) { console.log('ERR ancre useFeedAds'); process.exit(1); }
    s = s.replace(aHook, "  const feedAds = [];   // publicites desactivees (etait : useFeedAds())");

    const aRender = `          {feedAds.length > 0 && pIdx > 0 && pIdx % 4 === 0 && (
            <SponsoredPost ad={feedAds[(Math.floor(pIdx / 4) - 1) % feedAds.length]} />`;
    if (s.split(aRender).length - 1 !== 1) { console.log('ERR ancre rendu SponsoredPost ('+(s.split(aRender).length-1)+')'); process.exit(1); }
    s = s.replace(aRender, `          {false && feedAds.length > 0 && pIdx > 0 && pIdx % 4 === 0 && (
            <SponsoredPost ad={feedAds[(Math.floor(pIdx / 4) - 1) % feedAds.length]} />`);

    fs.writeFileSync(p, s);
    done.push('pubs retirees');
  }
}

{
  const p = 'src/components/Layout.jsx';
  let s = fs.readFileSync(p, 'utf8');
  if (s.includes('UpdateBanner')) { done.push('banniere (deja)'); }
  else {
    const aImp = "import PullToRefresh from './PullToRefresh';";
    if (s.split(aImp).length - 1 !== 1) { console.log('ERR ancre import Layout'); process.exit(1); }
    s = s.replace(aImp, aImp + "\nimport UpdateBanner from './UpdateBanner';");

    const aRv = "      <ScrollReveal />";
    if (s.split(aRv).length - 1 !== 1) { console.log('ERR ancre ScrollReveal'); process.exit(1); }
    s = s.replace(aRv, aRv + "\n      <UpdateBanner />");

    fs.writeFileSync(p, s);
    done.push('banniere');
  }
}

{
  const p = 'src/pages/GroupPage.jsx';
  let s = fs.readFileSync(p, 'utf8');
  if (s.includes('askCloseGroupComposer')) { done.push('confirmation groupe (deja)'); }
  else {
    const aFn = "  const [gpTagList,  setGpTagList]  = useState([]);";
    if (s.split(aFn).length - 1 !== 1) { console.log('ERR ancre gpTagList ('+(s.split(aFn).length-1)+')'); process.exit(1); }
    s = s.replace(aFn, aFn + `

  // Confirmation avant de quitter le composer du groupe
  function askCloseGroupComposer() {
    const hasWork = !!content.trim() || !!mediaFile;
    if (hasWork && !window.confirm('Voulez-vous vraiment quitter ? Votre publication ne sera pas publiée.')) return;
    setGpFullOpen(false);
  }`);

    const aBtn = '<button onClick={() => setGpFullOpen(false)} style={{ background:\'none\', border:\'none\', cursor:\'pointer\', padding:4 }}><HiX size={24} color="#050505"/></button>';
    if (s.split(aBtn).length - 1 !== 1) { console.log('ERR ancre bouton fermer groupe ('+(s.split(aBtn).length-1)+')'); process.exit(1); }
    s = s.replace(aBtn, '<button onClick={askCloseGroupComposer} style={{ background:\'none\', border:\'none\', cursor:\'pointer\', padding:4 }}><HiX size={24} color="#050505"/></button>');

    fs.writeFileSync(p, s);
    done.push('confirmation groupe');
  }
}

console.log('OK : ' + done.join(', '));
