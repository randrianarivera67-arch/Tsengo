const fs = require('fs');
const p = 'src/components/JejoStudio.jsx';
let s = fs.readFileSync(p, 'utf8');

if (s.includes('addPin(')) { console.log('SKIP deja applique'); process.exit(0); }

const aImp = "import { startBackgroundUpload } from '../utils/uploadManager';";
if (s.split(aImp).length - 1 !== 1) { console.log('ERR ancre import ('+(s.split(aImp).length-1)+')'); process.exit(1); }
s = s.replace(aImp, aImp + "\nimport { addPin } from '../utils/feedPins';");

const OLD = `        await addDoc(collection(db, 'posts'), {
          ...snap,
          mediaURL: r.url,
          thumbURL,
          createdAt: serverTimestamp(),
        });`;
if (s.split(OLD).length - 1 !== 1) { console.log('ERR ancre addDoc ('+(s.split(OLD).length-1)+')'); process.exit(1); }
s = s.replace(OLD, `        const postRef = await addDoc(collection(db, 'posts'), {
          ...snap,
          mediaURL: r.url,
          thumbURL,
          createdAt: serverTimestamp(),
        });
        addPin(postRef.id);   // video-nao VAO NALEFA -> mipetaka ambony mandra-pahatongan'ny refresh`);

fs.writeFileSync(p, s);
console.log('OK : video Jejo epinglee a sa creation');
