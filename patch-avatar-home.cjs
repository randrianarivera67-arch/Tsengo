// patch-avatar-home.cjs  (FRONTEND — src/pages/Home.jsx)
// 1. Import Avatar + useLocation
// 2. Effect : manokatra ny story rehefa tonga amin'ny navigation state.openStoryUid
//    (avy amin'ny "Voir la story" an'ny Avatar na aiza na aiza)
// 3. Avatar amin'ny post header (feed) : story ring + green dot + choix story/profil
// Idempotent + anchor unique guards.
const fs = require('fs');
const p = 'src/pages/Home.jsx';
let s = fs.readFileSync(p, 'utf8');
let changed = 0;

function rep(label, oldStr, newStr) {
  if (s.includes(newStr)) { console.log('  ⏭️  ' + label + ' — deja applique'); return; }
  const n = s.split(oldStr).length - 1;
  if (n !== 1) { console.log('  ❌ ' + label + ' — ancre introuvable/multiple (' + n + ')'); process.exit(1); }
  s = s.replace(oldStr, newStr); changed++; console.log('  ✅ ' + label);
}

// 1) Imports
rep('import useLocation',
  "import { useNavigate } from 'react-router-dom';",
  "import { useNavigate, useLocation } from 'react-router-dom';");
rep('import Avatar',
  "import SmartImage from '../components/SmartImage';",
  "import SmartImage from '../components/SmartImage';\nimport Avatar from '../components/Avatar';");

// 2) Effect openStoryUid (apetraka aorian'ny openStories)
rep('effect openStoryUid',
  "  function openStories(group) {\n    setStoryViewer({ group, index: 0 });\n  }",
  "  function openStories(group) {\n    setStoryViewer({ group, index: 0 });\n  }\n\n  // Manokatra story avy amin'ny navigation (\"Voir la story\" an'ny Avatar)\n  const _location = useLocation();\n  const _handledStory = useRef(null);\n  useEffect(() => {\n    const uid = _location.state?.openStoryUid;\n    if (!uid || !storyGroups.length) return;\n    if (_handledStory.current === uid) return;\n    const g = storyGroups.find(x => x.uid === uid);\n    if (g) { _handledStory.current = uid; setStoryViewer({ group: g, index: 0 }); }\n  }, [_location.state, storyGroups]);");

// 3) Avatar post header (post author)
rep('Avatar post header (feed)',
  '<img src={post.authorPhoto||`https://ui-avatars.com/api/?name=${encodeURIComponent(post.authorName||\'U\')}&background=1877F2&color=fff`} alt="" className="avatar" style={{ width:40, height:40, flexShrink:0 }}/>',
  '<Avatar uid={post.uid} src={post.authorPhoto} name={post.authorName} size={40} />');

if (changed) fs.writeFileSync(p, s);
console.log('✅ Avatar apetraka amin\'ny feed (story ring + green dot + choix).');
