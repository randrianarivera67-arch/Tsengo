const fs=require('fs');let OK=0,SKIP=0;
(function(){const p='.github/workflows/build-native.yml';let s=fs.readFileSync(p,'utf8');
if(s.includes('branches: [main]')){console.log('⏭️  build-native déjà fait');SKIP++;return;}
s=s.replace('on:\n  workflow_dispatch:','on:\n  push:\n    branches: [main]\n  workflow_dispatch:');
fs.writeFileSync(p,s);console.log('✅ build-native : auto sur push');OK++;})();
(function(){const p='.github/workflows/build-apk.yml';let s=fs.readFileSync(p,'utf8');
const w='on:\n  push:\n    branches: [main]\n  workflow_dispatch:';
if(!s.includes(w)){console.log('⏭️  build-apk déjà en manuel');SKIP++;return;}
s=s.replace(w,'on:\n  workflow_dispatch:');fs.writeFileSync(p,s);console.log('✅ build-apk (TWA) : manuel');OK++;})();
console.log(`\n✅ ${OK}   ⏭️  ${SKIP}`);
