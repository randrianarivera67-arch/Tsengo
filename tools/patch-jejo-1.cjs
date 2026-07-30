const fs = require('fs');
const p = 'src/components/JejoStudio.jsx';
let s = fs.readFileSync(p, 'utf8');
const done = [];

const OLD_ORI = "  const [orient, setOrient]     = useState('portrait');   // 'portrait' | 'landscape'";
if (s.includes(OLD_ORI)) {
  s = s.replace(OLD_ORI, "  const [orient, setOrient]     = useState('landscape');  // 'portrait' | 'landscape' — paysage par defaut");
  done.push('paysage par defaut');
} else done.push('orientation (deja)');

if (!s.includes('jejo-music-cam')) {
  const aCam = "          {/* Barre haut */}";
  if (s.split(aCam).length - 1 !== 1) { console.log('ERR ancre barre haut ('+(s.split(aCam).length-1)+')'); process.exit(1); }
  s = s.replace(aCam, `          {/* Musique en cours — haut centre (style TikTok) */}
          {music && sonMode === 'music' && (
            <div data-x="jejo-music-cam" style={{
              position: 'absolute', top: 'calc(70px + env(safe-area-inset-top))', left: '50%',
              transform: 'translateX(-50%)', zIndex: 4, maxWidth: '80%',
              display: 'flex', alignItems: 'center', gap: 7,
              background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
              borderRadius: 20, padding: '6px 12px', color: '#fff', fontSize: 12.5, fontWeight: 700,
              pointerEvents: 'none',
            }}>
              <span style={{ color: '#FF7AB8' }}>{Ic.music(15)}</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {music.title}{music.artist ? ' · ' + music.artist : ''}
              </span>
            </div>
          )}

${aCam}`);
  done.push('musique ecran camera');
}

const OLD_PREV = "          <div style={{ position: 'absolute', left: 14, bottom: 14, display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(0,0,0,.5)', borderRadius: 20, padding: '6px 12px', color: '#fff', fontSize: 12.5, fontWeight: 700, maxWidth: '70%' }}>";
if (s.includes(OLD_PREV)) {
  s = s.replace(OLD_PREV, "          <div style={{ position: 'absolute', top: 'calc(14px + env(safe-area-inset-top))', left: '50%', transform: 'translateX(-50%)', zIndex: 4, display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', borderRadius: 20, padding: '6px 12px', color: '#fff', fontSize: 12.5, fontWeight: 700, maxWidth: '80%' }}>");
  done.push('musique apercu');
} else done.push('apercu (deja)');

fs.writeFileSync(p, s);
console.log('OK : ' + done.join(', '));
