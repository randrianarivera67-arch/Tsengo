// test-linkify.mjs — teste MADIO ho an'ny splitLinks / trimUrlTail / parseAppLink
// Fampandehanana :  node test-linkify.mjs
import { splitLinks, trimUrlTail, parseAppLink } from './src/utils/appLink.js';

let pass = 0, fail = 0;
const eq = (label, got, want) => {
  const a = JSON.stringify(got), b = JSON.stringify(want);
  if (a === b) { pass++; console.log('  ✔ ' + label); }
  else { fail++; console.log('  ✘ ' + label + '\n      got  ' + a + '\n      want ' + b); }
};
const links = (t) => splitLinks(t).filter(p => p.type === 'link').map(p => p.value);
const rebuilt = (t) => splitLinks(t).map(p => p.value).join('');

console.log('\n1) trimUrlTail — mari-piatoana farany esorina');
eq('teboka', trimUrlTail('https://a.com.'), 'https://a.com');
eq('teboka roa', trimUrlTail('https://a.com..'), 'https://a.com');
eq('virgule', trimUrlTail('https://a.com,'), 'https://a.com');
eq('point-virgule', trimUrlTail('https://a.com;'), 'https://a.com');
eq('!', trimUrlTail('https://a.com!'), 'https://a.com');
eq('?', trimUrlTail('https://a.com?'), 'https://a.com');
eq('guillemet', trimUrlTail('https://a.com"'), 'https://a.com');
eq('» francais', trimUrlTail('https://a.com\u00BB'), 'https://a.com');
eq('… points', trimUrlTail('https://a.com\u2026'), 'https://a.com');
eq('tsy misy → tsy miova', trimUrlTail('https://a.com/x'), 'https://a.com/x');
eq('null → ""', trimUrlTail(null), '');

console.log('\n2) trimUrlTail — fonosana MIFANDANJA tsy tapahina');
eq('wiki (bar) tazonina', trimUrlTail('https://w.org/Foo_(bar)'), 'https://w.org/Foo_(bar)');
eq('parenthèse fanampiny esorina', trimUrlTail('https://a.com)'), 'https://a.com');
eq('mifangaro', trimUrlTail('https://w.org/Foo_(bar))'), 'https://w.org/Foo_(bar)');
eq('crochet', trimUrlTail('https://a.com]'), 'https://a.com');
eq('crochet mifandanja', trimUrlTail('https://a.com/[x]'), 'https://a.com/[x]');
eq('accolade', trimUrlTail('https://a.com}'), 'https://a.com');

console.log('\n3) splitLinks — fehezanteny mahazatra amin\'ny publication');
eq('teny tsotra', links('Salama daholo e !'), []);
eq('lien tokana', links('Jereo https://trengo.mg ry zareo'), ['https://trengo.mg']);
eq('lien + teboka', links('Jereo ato https://trengo.mg.'), ['https://trengo.mg']);
eq('lien anaty parenthèse', links('Jereo (https://trengo.mg) ary'), ['https://trengo.mg']);
eq('www', links('www.trengo.mg no site'), ['www.trengo.mg']);
eq('lien roa', links('a https://x.com sy b http://y.org!'), ['https://x.com', 'http://y.org']);
eq('lien amin\'ny farany', links('Tongava ato https://x.com'), ['https://x.com']);
eq('lien amin\'ny fiandohana', links('https://x.com no adiresy'), ['https://x.com']);

console.log('\n4) splitLinks — TSY MISY LITERA VERY (reconstruction === texte d\'origine)');
const TXT = [
  'Salama e !',
  'Jereo https://trengo.mg.',
  '(https://trengo.mg)',
  'a https://x.com sy b http://y.org!',
  'www.trengo.mg no site, misaotra.',
  'https://w.org/Foo_(bar) tsara io',
  'Tsy misy lien mihitsy ato...',
  'Miaraka amin\'ny \u00AB https://x.com \u00BB',
  'ligne1\nligne2 https://x.com\nligne3',
];
TXT.forEach((t, i) => eq('reconstruction ' + i, rebuilt(t), t));

console.log('\n5) splitLinks — cas limites');
eq('vide → []', splitLinks(''), []);
eq('null → []', splitLinks(null), []);
eq('undefined → []', splitLinks(undefined), []);
eq('teny tsotra → 1 part text', splitLinks('abc'), [{ type: 'text', value: 'abc' }]);
eq('espace ihany', rebuilt('   '), '   ');
eq('"www." irery tsy lien', links('www.'), []);
eq('tsy lien : 3.5 kg', links('3.5 kg'), []);
eq('tsy lien : etc.', links('sns. etc.'), []);

console.log('\n6) Lien INTERNE Trengo → navigation anatiny');
eq('post interne', parseAppLink('https://trengo-mg.vercel.app/post/abc123'), '/post/abc123');
eq('profile interne', parseAppLink('https://trengo-mg.vercel.app/profile/u1'), '/profile/u1');
const pi = splitLinks('Jereo https://trengo-mg.vercel.app/post/abc123.')[1];
eq('splitLinks manome internal', pi.internal, '/post/abc123');
eq('splitLinks value voadio', pi.value, 'https://trengo-mg.vercel.app/post/abc123');
eq('lien ivelany internal = null', splitLinks('https://google.com')[0].internal, null);

console.log('\n7) Régression Messages (endrika efa nampiasaina)');
eq('chat lien tsotra', links('https://x.com'), ['https://x.com']);
eq('chat teny + lien', links('hey https://x.com'), ['https://x.com']);

console.log('\n─────────────────────────────');
console.log(pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
