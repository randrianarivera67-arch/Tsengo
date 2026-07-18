const fs = require('fs');
const p = 'src/pages/Home.jsx';
let s = fs.readFileSync(p, 'utf8');

const SKEL =
`      {postsLoading && posts.length === 0 && (
        <div style={{ padding: '0 0 8px' }}>
          <SkeletonPost />
          <SkeletonPost />
        </div>
      )}`;
const FEED = `      {/* Feed */}`;

if (s.includes(SKEL + '\n\n' + FEED)) { console.log('SKIP deja applique'); process.exit(0); }

const cSkel = s.split(SKEL).length - 1;
const cFeed = s.split(FEED).length - 1;
if (cSkel !== 1) { console.log('ERR skeleton ' + cSkel); process.exit(1); }
if (cFeed !== 1) { console.log('ERR feed ' + cFeed); process.exit(1); }

s = s.replace(SKEL + '\n\n', '');
s = s.replace(FEED, SKEL + '\n\n' + FEED);
if ((s.split(SKEL).length - 1) !== 1) { console.log('ERR final'); process.exit(1); }

fs.writeFileSync(p, s);
console.log('OK skeleton deplace au Feed');
