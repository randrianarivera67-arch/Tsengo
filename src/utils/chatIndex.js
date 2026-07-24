// src/utils/chatIndex.js
// ─────────────────────────────────────────────────────────────────────────────
// INDEX AN'NY RESAKA ISAKY NY MPAMPIASA  —  userChats/{myUid}/{chatId}
//
// OLANA VAHANA : teo aloha, ny lisitry ny resaka dia naka ny node `conversations`
// MANONTOLO (ny an'ny olona rehetra amin'ny app) dia nanivana tao amin'ny JS.
// Nitombo miaraka amin'ny isan'ny mpampiasa REHETRA izany → miadana hatrany,
// ary lafo be amin'ny Firebase.
//
// VAHAOLANA : andalana kely iray isaky ny resaka, ao amin'ny lalana an'ny tompony.
// Ny lisitra dia mihaino `userChats/{myUid}` ihany → ~10 Ko, MITOETRA HO KELY
// na 100 na 100 000 ny mpampiasa.
//
// Endriky ny andalana (lakile fohy — mitsitsy data isaky ny fifandraisana) :
//   t  : 'direct' | 'shop' | 'page' | 'artist' | 'group'
//   o  : otherUid / shopId / pageId / artistId / groupId
//   lt : lahatsoratra farany (preview)   mt : mediaType farany
//   fn : anaran'ny nandefa farany        fu : uid nandefa farany
//   ts : fotoana farany (ms)             u  : hafatra tsy mbola novakiana
//   s  : 1 raha efa nandefa aho (ho an'ny "demande de message")
//   a  : 1 nekena     d : 1 nolavina
//   n  : anarana (boutique/page/artiste)  ph : sary (boutique/page/artiste)
//
// Ny fonction rehetra eto dia MADIO (tsy misy Firebase/React) → azo tsapaina 100 %.
// ─────────────────────────────────────────────────────────────────────────────

/** Nombre azo antoka (tsy NaN/Infinity mihitsy) */
const n0 = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const str = (v) => (typeof v === 'string' ? v : (v == null ? '' : String(v)));

/**
 * Mamaky ny chatId → karazana + ny "ilany iray".
 * Miverina { ok:false } raha tsy an'io mpampiasa io ilay resaka.
 */
export function parseChatId(chatId, myUid) {
  const id = str(chatId), me = str(myUid);
  if (!id || !me) return { ok: false };

  if (id.startsWith('group_')) {
    const gid = id.slice(6);
    return gid ? { ok: true, type: 'group', otherId: gid } : { ok: false };
  }

  for (const [prefix, type] of [['shop_', 'shop'], ['page_', 'page'], ['artist_', 'artist']]) {
    if (id.startsWith(prefix)) {
      const rest = id.slice(prefix.length);
      const sep = rest.lastIndexOf('_');
      if (sep <= 0) return { ok: false };
      const bizId = rest.slice(0, sep);
      const visitorUid = rest.slice(sep + 1);
      if (!bizId || visitorUid !== me) return { ok: false };   // tsy ahy ity resaka ity
      return { ok: true, type, otherId: bizId };
    }
  }

  // Resaka direct : uid roa alahatra mifamatotra amin'ny '_'
  const parts = id.split('_');
  if (parts.length !== 2) return { ok: false };
  if (parts[0] === me) return { ok: true, type: 'direct', otherId: parts[1] };
  if (parts[1] === me) return { ok: true, type: 'direct', otherId: parts[0] };
  return { ok: false };
}

/** Preview fohy ho an'ny lisitra (tsy mitondra ny lahatsoratra manontolo) */
export function previewOf(msg) {
  const m = (msg && typeof msg === 'object') ? msg : {};
  const t = str(m.text).trim();
  if (t) return t.slice(0, 120);
  if (m.mediaType === 'audio') return '🎤 Vocal';
  if (m.mediaURL) return '📎 Média';
  return '';
}

/** Andalana index avy amin'ny resaka iray (ampiasaina amin'ny migration) */
export function entryFromConversation(chatId, conv, myUid) {
  const p = parseChatId(chatId, myUid);
  if (!p.ok) return null;
  const c = (conv && typeof conv === 'object') ? conv : {};
  const meta = (c.meta && typeof c.meta === 'object') ? c.meta : {};
  const msgs = (c.messages && typeof c.messages === 'object') ? Object.values(c.messages) : [];
  const last = msgs.length ? msgs[msgs.length - 1] : null;

  let unread = 0, sent = 0;
  for (const m of msgs) {
    if (!m || typeof m !== 'object') continue;
    if (m.toUid === myUid && !m.read) unread++;
    if (m.fromUid === myUid) sent = 1;
  }

  const e = {
    t: p.type,
    o: p.otherId,
    lt: previewOf(last),
    mt: str(last && last.mediaType),
    fn: str(last && last.fromName),
    fu: str(last && last.fromUid),
    ts: n0(last && last.ts),
    u: unread,
    s: sent,
    a: meta.acceptedBy && meta.acceptedBy[myUid] ? 1 : 0,
    d: meta.declinedBy && meta.declinedBy[myUid] ? 1 : 0,
  };
  if (p.type === 'shop')   { e.n = str(meta.shopName)   || 'Boutique';     e.ph = str(meta.shopPhoto); }
  if (p.type === 'page')   { e.n = str(meta.pageName)   || 'Page Sera';    e.ph = str(meta.pagePhoto); }
  if (p.type === 'artist') { e.n = str(meta.artistName) || 'Page artiste'; e.ph = str(meta.artistPhoto); }
  return e;
}

/**
 * MIGRATION indray mandeha : `conversations` manontolo → index an'ity mpampiasa ity.
 * Ampiasaina AMIN'NY FISOKAFANA VOALOHANY ihany (rehefa mbola banga ny index).
 */
export function buildIndexFromConversations(data, myUid) {
  const out = {};
  if (!data || typeof data !== 'object' || !myUid) return out;
  for (const [chatId, conv] of Object.entries(data)) {
    // Ny groupe dia an'ny mpikambana rehetra : ny fiafarany no jerena aoriana
    const e = entryFromConversation(chatId, conv, myUid);
    if (e) out[chatId] = e;
  }
  return out;
}

/**
 * Lisitra vonona ho an'ny render, avy amin'ny index + profil efa nalaina.
 * profiles : { uid: userDoc }  |  missing : uid tsy mbola azo (mbola miandry)
 * Miverina amin'ny endrika MITOVY amin'ny teo aloha mba tsy hisy fanovana UI.
 */
export function listFromIndex(index, { profiles = {}, myUid, friends = [], archived = [] } = {}) {
  const list = [];
  const groupMetas = {};
  if (!index || typeof index !== 'object') return { list, groupMetas };

  const friendSet = new Set(Array.isArray(friends) ? friends : []);
  const archSet = new Set(Array.isArray(archived) ? archived : []);

  for (const [chatId, raw] of Object.entries(index)) {
    if (!raw || typeof raw !== 'object') continue;
    const e = raw;
    const lastMsg = e.ts ? { text: str(e.lt), mediaType: str(e.mt), fromName: str(e.fn), fromUid: str(e.fu), ts: n0(e.ts) } : null;
    const unread = Math.max(0, n0(e.u));

    if (e.t === 'group') {
      groupMetas[str(e.o)] = lastMsg ? { text: str(e.lt), from: str(e.fn), ts: n0(e.ts) } : null;
      continue;
    }

    if (e.t === 'shop' || e.t === 'page' || e.t === 'artist') {
      const row = {
        chatId, lastMsg, unread,
        user: { fullName: str(e.n) || 'Boutique', photoURL: str(e.ph) },
      };
      if (e.t === 'shop')   { row.shopId   = str(e.o); row.isShop = true; }
      if (e.t === 'page')   { row.pageId   = str(e.o); row.isPage = true; }
      if (e.t === 'artist') { row.artistId = str(e.o); row.isArtist = true; }
      list.push(row);
      continue;
    }

    // direct
    const otherUid = str(e.o);
    const prof = profiles[otherUid];
    if (prof === null) continue;                 // compte voafafa → esorina
    if (prof === undefined) continue;            // mbola tsy tonga ny profil
    const isPending = !friendSet.has(otherUid) && !e.s && !e.a && !e.d;
    list.push({
      chatId, otherUid, user: prof, lastMsg, unread,
      isPending, isArchived: archSet.has(chatId),
    });
  }

  list.sort((a, b) => n0(b.lastMsg && b.lastMsg.ts) - n0(a.lastMsg && a.lastMsg.ts));
  return { list, groupMetas };
}

/** Ny uid direct rehetra ilaina profil (mba haka azy indray mandeha ihany) */
export function directUids(index) {
  const out = [];
  if (!index || typeof index !== 'object') return out;
  for (const e of Object.values(index)) {
    if (e && e.t === 'direct' && e.o) out.push(str(e.o));
  }
  return [...new Set(out)];
}

/**
 * Fanavaozana ny index REHEFA MANDEFA hafatra (fan-out on write).
 * Miverina amin'ny objet lalana → sanda, ampiasaina amin'ny update() tokana.
 *   recipients : uid rehetra tokony hahazo "unread +1" (afa-tsy ny mpandefa)
 *   INCREMENT  : ny sanda increment(1) an'ny Firebase (ampidirina avy any ivelany
 *                mba ho madio tanteraka ity module ity ka azo tsapaina)
 */
export function sendUpdates({ chatId, myUid, recipients = [], msg = {}, meta = {}, INCREMENT = 1 }) {
  const updates = {};
  const cid = str(chatId), me = str(myUid);
  if (!cid || !me) return updates;

  const preview = previewOf(msg);
  const ts = n0(msg.ts) || Date.now();
  const mt = str(msg.mediaType);
  const fn = str(msg.fromName);

  const base = (uid, type, otherId) => {
    const pre = `userChats/${uid}/${cid}`;
    updates[`${pre}/t`] = type;
    updates[`${pre}/o`] = otherId;
    updates[`${pre}/lt`] = preview;
    updates[`${pre}/mt`] = mt;
    updates[`${pre}/fn`] = fn;
    updates[`${pre}/fu`] = me;
    updates[`${pre}/ts`] = ts;
    if (meta.n != null) updates[`${pre}/n`] = str(meta.n);
    if (meta.ph != null) updates[`${pre}/ph`] = str(meta.ph);
  };

  const p = parseChatId(cid, me);
  const type = p.ok ? p.type : 'direct';

  // ── Ny ahy : voavaky avokoa, ary voamarika fa efa nandefa aho ──
  const myOther = p.ok ? p.otherId : '';
  base(me, type, myOther);
  updates[`userChats/${me}/${cid}/u`] = 0;
  updates[`userChats/${me}/${cid}/s`] = 1;

  // ── Ny mpandray : otherId = izaho (direct) na ny id orinasa/groupe ──
  for (const r of (Array.isArray(recipients) ? recipients : [])) {
    const uid = str(r);
    if (!uid || uid === me) continue;
    const otherForThem = (type === 'direct') ? me : myOther;
    base(uid, type, otherForThem);
    updates[`userChats/${uid}/${cid}/u`] = INCREMENT;
  }
  return updates;
}

/**
 * Valin'ny ORINASA (boutique / page / artiste) → manavao ny index an'ny MPITSIDIKA.
 * Ny ilany orinasa dia manana listener manokana (ShopMessages/ArtistMessages),
 * ka ny mpitsidika ihany no mila index eto.
 */
export function bizReplyUpdates({ chatId, visitorUid, type, bizId, msg = {}, name, photo, INCREMENT = 1 }) {
  const updates = {};
  const cid = str(chatId), v = str(visitorUid);
  if (!cid || !v) return updates;
  const pre = `userChats/${v}/${cid}`;
  updates[`${pre}/t`] = str(type) || 'shop';
  updates[`${pre}/o`] = str(bizId);
  updates[`${pre}/lt`] = previewOf(msg);
  updates[`${pre}/mt`] = str(msg.mediaType);
  updates[`${pre}/fn`] = str(msg.fromName) || str(name);
  updates[`${pre}/fu`] = str(msg.fromUid);
  updates[`${pre}/ts`] = n0(msg.ts) || Date.now();
  updates[`${pre}/u`] = INCREMENT;
  if (name != null) updates[`${pre}/n`] = str(name);
  if (photo != null) updates[`${pre}/ph`] = str(photo);
  return updates;
}

/** Fanadiovana ny "tsy vaky" rehefa sokafana ny resaka */
export function readUpdates(chatId, myUid) {
  const cid = str(chatId), me = str(myUid);
  if (!cid || !me) return {};
  return { [`userChats/${me}/${cid}/u`]: 0 };
}

// ═══════════════════════════════════════════════════════════════════════════
//  ILANY ORINASA  —  bizChats/{type}_{bizId}/{visitorUid}
//  Ny lisitry ny mpitsidika ao amin'ny ShopMessages / ArtistMessages dia naka
//  ny `conversations` manontolo koa. Ity index ity no manafoana izany.
//    lt/mt/fn/fu/ts : hafatra farany   u : tsy vaky (an'ny ADMIN)
//    vn/vp          : anarana sy sarin'ny mpitsidika
// ═══════════════════════════════════════════════════════════════════════════

/** Lakilen'ny orinasa ao amin'ny bizChats */
export function bizChatKey(type, bizId) {
  const t = str(type) || 'shop', b = str(bizId);
  return b ? `${t}_${b}` : '';
}

/** Andalana index avy amin'ny resaka orinasa iray (migration) */
export function bizEntryFromConversation(conv, visitorUid) {
  const c = (conv && typeof conv === 'object') ? conv : {};
  const meta = (c.meta && typeof c.meta === 'object') ? c.meta : {};
  const msgs = (c.messages && typeof c.messages === 'object') ? Object.values(c.messages) : [];
  const last = msgs.length ? msgs[msgs.length - 1] : null;
  let unread = 0;
  for (const m of msgs) {
    if (!m || typeof m !== 'object') continue;
    if (!m.fromShop && !m.fromAdmin && !m.readByAdmin && str(m.fromUid) === str(visitorUid)) unread++;
  }
  return {
    lt: previewOf(last), mt: str(last && last.mediaType),
    fn: str(last && last.fromName), fu: str(last && last.fromUid),
    ts: n0(last && last.ts), u: unread,
    vn: str(meta.visitorName), vp: str(meta.visitorPhoto),
  };
}

/** MIGRATION indray mandeha : `conversations` → index an'ity orinasa ity */
export function buildBizIndexFromConversations(data, type, bizId) {
  const out = {};
  const prefix = `${str(type) || 'shop'}_${str(bizId)}_`;
  if (!data || typeof data !== 'object' || !str(bizId)) return out;
  for (const [chatId, conv] of Object.entries(data)) {
    if (!chatId.startsWith(prefix)) continue;
    const visitorUid = chatId.slice(prefix.length);
    if (!visitorUid) continue;
    out[visitorUid] = bizEntryFromConversation(conv, visitorUid);
  }
  return out;
}

/** Lisitra vonona ho an'ny ShopMessages/ArtistMessages (endrika mitovy amin'ny teo aloha) */
export function bizListFromIndex(index) {
  const list = [];
  if (!index || typeof index !== 'object') return list;
  for (const [uid, raw] of Object.entries(index)) {
    if (!uid || !raw || typeof raw !== 'object') continue;
    list.push({
      uid,
      last: raw.ts ? { text: str(raw.lt), mediaType: str(raw.mt), fromName: str(raw.fn), fromUid: str(raw.fu), ts: n0(raw.ts) } : undefined,
      unread: Math.max(0, n0(raw.u)),
      meta: { visitorName: str(raw.vn), visitorPhoto: str(raw.vp) },
    });
  }
  list.sort((a, b) => n0(b.last && b.last.ts) - n0(a.last && a.last.ts));
  return list;
}

/**
 * Fanavaozana ny index an'ny ORINASA rehefa misy hafatra.
 *   fromAdmin true  → valin'ny orinasa : voavaky (u = 0)
 *   fromAdmin false → hafatry ny mpitsidika : u + 1
 */
export function bizListUpdates({ type, bizId, visitorUid, msg = {}, visitorName, visitorPhoto, fromAdmin = false, INCREMENT = 1 }) {
  const updates = {};
  const key = bizChatKey(type, bizId), v = str(visitorUid);
  if (!key || !v) return updates;
  const pre = `bizChats/${key}/${v}`;
  updates[`${pre}/lt`] = previewOf(msg);
  updates[`${pre}/mt`] = str(msg.mediaType);
  updates[`${pre}/fn`] = str(msg.fromName);
  updates[`${pre}/fu`] = str(msg.fromUid);
  updates[`${pre}/ts`] = n0(msg.ts) || Date.now();
  updates[`${pre}/u`] = fromAdmin ? 0 : INCREMENT;
  if (visitorName != null)  updates[`${pre}/vn`] = str(visitorName);
  if (visitorPhoto != null) updates[`${pre}/vp`] = str(visitorPhoto);
  return updates;
}

/** Fanadiovana ny "tsy vaky" an'ny orinasa rehefa sokafana ny resaka */
export function bizReadUpdates(type, bizId, visitorUid) {
  const key = bizChatKey(type, bizId), v = str(visitorUid);
  if (!key || !v) return {};
  return { [`bizChats/${key}/${v}/u`]: 0 };
}

/**
 * Demandes de message (MessagesSettings) — avy amin'ny index an'ny mpampiasa,
 * fa tsy amin'ny `conversations` manontolo intsony.
 */
export function pendingFromIndex(index, { profiles = {}, friends = [] } = {}) {
  const out = [];
  if (!index || typeof index !== 'object') return out;
  const friendSet = new Set(Array.isArray(friends) ? friends : []);
  for (const [chatId, e] of Object.entries(index)) {
    if (!e || typeof e !== 'object' || e.t !== 'direct') continue;
    if (!n0(e.ts)) continue;                                  // tsy mbola misy hafatra
    const otherUid = str(e.o);
    if (!otherUid || friendSet.has(otherUid)) continue;
    if (e.s || e.a || e.d) continue;                           // efa namaly / nekena / nolavina
    const prof = profiles[otherUid];
    if (!prof) continue;                                      // voafafa na mbola tsy tonga
    out.push({ chatId, otherUid, user: prof, lastText: str(e.lt) });
  }
  out.sort((a, b) => (b.lastText ? 1 : 0) - (a.lastText ? 1 : 0));
  return out;
}

/** Fanesorana andalana (rehefa fafana ny resaka) */
export function removeUpdates(chatId, uids) {
  const updates = {};
  const cid = str(chatId);
  if (!cid) return updates;
  for (const u of (Array.isArray(uids) ? uids : [])) {
    const uid = str(u);
    if (uid) updates[`userChats/${uid}/${cid}`] = null;
  }
  return updates;
}
