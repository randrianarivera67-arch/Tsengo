const fs = require('fs');
const p = 'src/pages/Settings.jsx';
let s = fs.readFileSync(p, 'utf8');
if (s.includes('badge VIP a cote du nom')) { console.log('SKIP deja'); process.exit(0); }
const OLD_AVATAR = `          {userProfile?.isVip && (
            <img src='/vip-badge.png' style={{ width:32, height:32, marginLeft:5, verticalAlign:'middle', display:'inline-block', flexShrink:0, objectFit:'contain' }} alt='VIP'/>
          )}
        </div>`;
if (s.split(OLD_AVATAR).length - 1 !== 1) { console.log('ERR ancre avatar ('+(s.split(OLD_AVATAR).length-1)+')'); process.exit(1); }
s = s.replace(OLD_AVATAR, `        </div>`);
const OLD_NAME = `          <p style={{ fontWeight: 700, fontSize: 16 }}>{userProfile?.fullName}</p>`;
if (s.split(OLD_NAME).length - 1 !== 1) { console.log('ERR ancre nom ('+(s.split(OLD_NAME).length-1)+')'); process.exit(1); }
s = s.replace(OLD_NAME, `          {/* badge VIP a cote du nom (aligne, comme dans le fil et le profil) */}
          <p style={{ fontWeight: 700, fontSize: 16, display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userProfile?.fullName}</span>
            {userProfile?.isVip && (
              <img src='/vip-badge.png' style={{ width:22, height:22, flexShrink:0, objectFit:'contain' }} alt='VIP'/>
            )}
          </p>`);
fs.writeFileSync(p, s);
console.log('OK badge VIP aligne');
