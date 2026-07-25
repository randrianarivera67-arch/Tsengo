const fs = require('fs');
const done = [];

for (const p of ['src/pages/Home.jsx', 'src/pages/GroupPage.jsx']) {
  let s = fs.readFileSync(p, 'utf8');
  const OLD = "label:'Photo / Vidéo'";
  if (!s.includes(OLD)) { done.push(p.split('/').pop() + ' libelle (deja)'); continue; }
  if (s.split(OLD).length - 1 !== 1) { console.log('ERR libelle multiple dans ' + p); process.exit(1); }
  s = s.replace(OLD, "label:'Photo'");
  fs.writeFileSync(p, s);
  done.push(p.split('/').pop() + ' libelle');
}

{
  const p = 'src/pages/Home.jsx';
  let s = fs.readFileSync(p, 'utf8');
  if (s.includes('askCloseComposer')) { done.push('confirmation (deja)'); }
  else {
    const aFn = "  const [multiPhotos, setMultiPhotos] = useState([]);   // File[] — mode \"plusieurs photos\" (2 à 10)";
    if (s.split(aFn).length - 1 !== 1) { console.log('ERR ancre multiPhotos ('+(s.split(aFn).length-1)+')'); process.exit(1); }
    s = s.replace(aFn, aFn + `

  // Confirmation avant de quitter la page "Créer une publication"
  function askCloseComposer() {
    const hasWork = !!content.trim() || !!mediaFile || (multiPhotos && multiPhotos.length > 0);
    if (hasWork && !window.confirm('Voulez-vous vraiment quitter ? Votre publication ne sera pas publiée.')) return;
    setPublishFullOpen(false);
  }`);

    const aBtn = '<button onClick={() => setPublishFullOpen(false)} style={{ background:\'none\', border:\'none\', cursor:\'pointer\', padding:4 }}><HiX size={24} color="#050505"/></button>';
    if (s.split(aBtn).length - 1 !== 1) { console.log('ERR ancre bouton fermer ('+(s.split(aBtn).length-1)+')'); process.exit(1); }
    s = s.replace(aBtn, '<button onClick={askCloseComposer} style={{ background:\'none\', border:\'none\', cursor:\'pointer\', padding:4 }}><HiX size={24} color="#050505"/></button>');

    fs.writeFileSync(p, s);
    done.push('confirmation');
  }
}

console.log('OK : ' + done.join(', '));
