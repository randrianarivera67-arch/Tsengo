const fs = require('fs');
const p = 'src/components/JejoStudio.jsx';
let s = fs.readFileSync(p, 'utf8');
const done = [];
const OLD_MUTE = 'muted={sonMode === \'music\'}';
if (s.includes(OLD_MUTE)) {
  if (s.split(OLD_MUTE).length - 1 !== 1) { console.log('ERR ancre muted'); process.exit(1); }
  s = s.replace(OLD_MUTE, "muted={sonMode === 'music' && !musicBakedRef.current}");
  done.push("son de l'apercu");
} else done.push('apercu (deja)');
const OLD_MIME = "  const cands = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=h264', 'video/webm;codecs=vp9', 'video/webm'];";
if (s.includes(OLD_MIME)) {
  s = s.replace(OLD_MIME, `  const cands = [
    'video/mp4;codecs=avc1,mp4a.40.2',
    'video/webm;codecs=h264,opus',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/mp4;codecs=avc1',
    'video/mp4',
    'video/webm',
  ];`);
  done.push('codecs audio');
} else done.push('codecs (deja)');
fs.writeFileSync(p, s);
console.log('OK : ' + done.join(', '));
