const fs = require('fs');
const p = 'src/pages/Home.jsx';
let s = fs.readFileSync(p, 'utf8');

if (s.includes('visibleStories')) { console.log('SKIP deja applique'); process.exit(0); }

const aState = "  const allStories = useActiveStories();   // listener partage (aucune lecture en plus)";
const aState2 = "  const allStories = useActiveStories();";
const anchor = s.includes(aState) ? aState : aState2;
if (s.split(anchor).length - 1 !== 1) { console.log('ERR ancre allStories ('+(s.split(anchor).length-1)+')'); process.exit(1); }
s = s.replace(anchor, anchor + "\n  const [visibleStories, setVisibleStories] = useState(5);");

const aEff = "    setStoryGroups(list);\n  }, [allStories, currentUser, userProfile?.friends?.length]);";
if (s.split(aEff).length - 1 !== 1) { console.log('ERR ancre setStoryGroups'); process.exit(1); }
s = s.replace(aEff, "    setStoryGroups(list);\n    setVisibleStories(v => Math.max(5, Math.min(v, list.length || 5)));\n  }, [allStories, currentUser, userProfile?.friends?.length]);");

const aStrip = '      <div className="stories-strip">';
if (s.split(aStrip).length - 1 !== 1) { console.log('ERR ancre stories-strip ('+(s.split(aStrip).length-1)+')'); process.exit(1); }
s = s.replace(aStrip, `      <div className="stories-strip"
        onScroll={e => {
          const el = e.currentTarget;
          if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 90) {
            setVisibleStories(v => (v < storyGroups.length ? v + 5 : v));
          }
        }}>`);

const aMap = "        {storyGroups.map(g => {";
if (s.split(aMap).length - 1 !== 1) { console.log('ERR ancre storyGroups.map ('+(s.split(aMap).length-1)+')'); process.exit(1); }
s = s.replace(aMap, "        {storyGroups.slice(0, visibleStories).map(g => {");

fs.writeFileSync(p, s);
console.log('OK barre story : 5 puis +5 au defilement');
