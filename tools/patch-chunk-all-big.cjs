const fs = require('fs');
const p = 'src/utils/telegram.js';
let s = fs.readFileSync(p, 'utf8');

if (s.includes('quel que soit son type')) { console.log('SKIP deja applique'); process.exit(0); }

const OLD_RET = `  report(100);
  return { url, type: 'video', chunks: ids.length };`;
if (s.split(OLD_RET).length - 1 !== 1) { console.log('ERR ancre retour ('+(s.split(OLD_RET).length-1)+')'); process.exit(1); }
s = s.replace(OLD_RET, `  report(100);
  const type = mime.startsWith('audio') ? 'audio' : mime.startsWith('image') ? 'image' : 'video';
  return { url, type, chunks: ids.length };`);

const OLD_IF = `  if (file.type.startsWith('video/') && file.size > CHUNK_THRESHOLD) {
    return uploadVideoInChunks(file, onProgress);
  }`;
if (s.split(OLD_IF).length - 1 !== 1) { console.log('ERR ancre condition ('+(s.split(OLD_IF).length-1)+')'); process.exit(1); }
s = s.replace(OLD_IF, `  // Tout fichier volumineux est decoupe, quel que soit son type : Telegram
  // accepte 50 Mo a l'envoi mais ne permet de relire que 20 Mo.
  if (file.size > CHUNK_THRESHOLD) {
    return uploadVideoInChunks(file, onProgress);
  }`);

fs.writeFileSync(p, s);
console.log('OK : tout fichier > 12 Mo est decoupe + type correct');
