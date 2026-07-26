const fs = require('fs');
const p = 'src/firebase.js';
let s = fs.readFileSync(p, 'utf8');

if (s.includes('persistentLocalCache')) { console.log('SKIP deja applique'); process.exit(0); }

const OLD_IMP = "import { getFirestore } from 'firebase/firestore';";
if (s.split(OLD_IMP).length - 1 !== 1) { console.log('ERR ancre import ('+(s.split(OLD_IMP).length-1)+')'); process.exit(1); }
s = s.replace(OLD_IMP, "import {\n  getFirestore, initializeFirestore,\n  persistentLocalCache, persistentMultipleTabManager,\n} from 'firebase/firestore';");

const OLD_DB = "export const db = getFirestore(app);";
if (s.split(OLD_DB).length - 1 !== 1) { console.log('ERR ancre db ('+(s.split(OLD_DB).length-1)+')'); process.exit(1); }
s = s.replace(OLD_DB, `// Cache local persistant : relance instantanee + beaucoup moins de lectures.
let _db;
try {
  _db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
} catch (e) {
  _db = getFirestore(app);
}
export const db = _db;`);

fs.writeFileSync(p, s);
console.log('OK cache local persistant active');
