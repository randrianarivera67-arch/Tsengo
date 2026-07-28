// test-online-users.mjs — teste MADIO (tsy misy Firebase / React)
// Fampandehanana :  node test-online-users.mjs
import { onlineUids, onlineUsers, countOnline } from './src/utils/adminStats.js';

let pass = 0, fail = 0;
const eq = (label, got, want) => {
  const a = JSON.stringify(got), b = JSON.stringify(want);
  if (a === b) { pass++; console.log('  ✔ ' + label); }
  else { fail++; console.log('  ✘ ' + label + '\n      got  ' + a + '\n      want ' + b); }
};

const USERS = [
  { id: 'u1', fullName: 'Rakoto Jean', username: 'rakoto', photoURL: 'p1.jpg', isVip: true },
  { id: 'u2', fullName: 'Bema Soa', username: 'bema' },
  { id: 'u3', username: 'anonyme3' },
  { id: 'u4', fullName: 'Zoe', isBanned: true },
];

console.log('\n1) onlineUids — "true" ihany no isaina');
eq('null → []', onlineUids(null), []);
eq('undefined → []', onlineUids(undefined), []);
eq('tsy objet → []', onlineUids('abc'), []);
eq('objet foana → []', onlineUids({}), []);
eq('true ihany', onlineUids({ u1: true, u2: false, u3: true }), ['u1', 'u3']);
eq('sanda maloto lavina', onlineUids({ a: 1, b: 'true', c: {}, d: null, e: true }), ['e']);

console.log('\n2) countOnline vs onlineUids — TSY MAINTSY mitovy foana');
const CASES = [
  {}, { u1: true }, { u1: true, u2: true, u3: true },
  { u1: false }, { u1: true, u2: false, zz: true },
  { a: 1, b: 'true', c: true }, null,
];
CASES.forEach((m, i) => eq('cas ' + i + ' : count === list.length', countOnline(m), onlineUids(m).length));

console.log('\n3) onlineUsers — enrichissement');
const r1 = onlineUsers({ u1: true, u2: false, u3: true }, USERS);
eq('isa = 2', r1.length, 2);
eq('anarana u1', r1.find(x => x.uid === 'u1').name, 'Rakoto Jean');
eq('u3 tsy misy fullName → username', r1.find(x => x.uid === 'u3').name, 'anonyme3');
eq('vip u1', r1.find(x => x.uid === 'u1').isVip, true);
eq('username @', r1.find(x => x.uid === 'u1').username, 'rakoto');

console.log('\n4) uid tsy hita ao amin\'ny users — TSY very (isa mitovy)');
const r2 = onlineUsers({ u1: true, GHOST: true }, USERS);
eq('isa = 2 (tsy 1)', r2.length, 2);
eq('isa = countOnline', r2.length, countOnline({ u1: true, GHOST: true }));
const ghost = r2.find(x => x.uid === 'GHOST');
eq('ghost.known = false', ghost.known, false);
eq('ghost.name', ghost.name, 'Utilisateur inconnu');
eq('ghost.username vide', ghost.username, '');

console.log('\n5) Cas limites — tsy crash mihitsy');
eq('users = null', onlineUsers({ u1: true }, null).length, 1);
eq('users = undefined', onlineUsers({ u1: true }, undefined).length, 1);
eq('users misy null anaty', onlineUsers({ u1: true }, [null, undefined, { id: 'u1', fullName: 'X' }])[0].name, 'X');
eq('users tsy misy id', onlineUsers({ u1: true }, [{ fullName: 'NoId' }])[0].name, 'Utilisateur inconnu');
eq('onlineMap null → []', onlineUsers(null, USERS), []);
eq('onlineMap foana → []', onlineUsers({}, USERS), []);
eq('photoURL tsy misy → ""', onlineUsers({ u2: true }, USERS)[0].photoURL, '');
eq('isBanned voatazona', onlineUsers({ u4: true }, USERS)[0].isBanned, true);

console.log('\n6) Alahatra — voafantatra aloha, avy eo alphabétique');
const r3 = onlineUsers({ GHOST: true, u2: true, u1: true }, USERS);
eq('alahatra', r3.map(x => x.name), ['Bema Soa', 'Rakoto Jean', 'Utilisateur inconnu']);

console.log('\n7) Tsy misy doublon na dia averimberina aza');
eq('idempotent', onlineUsers({ u1: true }, USERS).length, onlineUsers({ u1: true }, USERS).length);

console.log('\n─────────────────────────────');
console.log(pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
