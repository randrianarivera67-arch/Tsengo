const fs = require("fs");
process.chdir(__dirname);
const done = [];

function edit(path, fn) {
  if (!fs.existsSync(path)) { console.log("⚠️ absent:", path); return; }
  let s = fs.readFileSync(path, "utf8");
  const out = fn(s);
  if (out) fs.writeFileSync(path, out);
}

// ═══ 1) ArtistMessages : stockage dans conversations/ ═══
edit("src/pages/ArtistMessages.jsx", s => {
  // liste admin : scanner conversations/ avec le préfixe artist_{artistId}_
  const oldList = `    return onValue(ref(rtdb, \`artistConversations/\${artistId}\`), snap => {
      const data = snap.val() || {};
      setConvs(Object.entries(data).map(([uid, c]) => {
        const m = c.messages ? Object.values(c.messages) : [];
        return { uid, last: m[m.length - 1], unread: m.filter(x => x.fromUid !== currentUser.uid && !x.readByAdmin).length, meta: c.meta || {} };
      }).sort((a, b) => (b.last?.ts || 0) - (a.last?.ts || 0)));
    });`;
  const newList = `    const prefix = \`artist_\${artistId}_\`;
    return onValue(ref(rtdb, 'conversations'), snap => {
      const data = snap.val() || {};
      setConvs(Object.entries(data)
        .filter(([k]) => k.startsWith(prefix))
        .map(([k, c]) => {
          const uid = k.slice(prefix.length);
          const m = c.messages ? Object.values(c.messages) : [];
          return { uid, last: m[m.length - 1], unread: m.filter(x => x.fromUid !== currentUser.uid && !x.readByAdmin).length, meta: c.meta || {} };
        })
        .sort((a, b) => (b.last?.ts || 0) - (a.last?.ts || 0)));
    });`;
  if (s.includes(oldList)) { s = s.replace(oldList, newList); done.push("ArtistMessages : liste admin via conversations/"); }

  // tous les autres chemins
  const before = (s.match(/artistConversations/g) || []).length;
  s = s.replace(/artistConversations\/\$\{artistId\}\/\$\{activeVisitor\}/g, "conversations/artist_${artistId}_${activeVisitor}");
  s = s.replace(/artistConversations\/\$\{artistId\}\/\$\{currentUser\.uid\}/g, "conversations/artist_${artistId}_${currentUser.uid}");
  const after = (s.match(/artistConversations/g) || []).length;
  if (after < before) done.push(`ArtistMessages : ${before - after} chemin(s) migré(s)`);

  // le message porte aussi toUid pour la compat (badge non lus)
  const oldPush = `      fromUid: currentUser.uid, fromArtist: isAdmin,`;
  const newPush = `      fromUid: currentUser.uid, fromArtist: isAdmin,
      toUid: isAdmin ? activeVisitor : '',`;
  if (s.includes(oldPush) && !s.includes("toUid: isAdmin")) { s = s.replace(oldPush, newPush); done.push("ArtistMessages : champ toUid"); }

  // meta : nom/photo de la page (pour l'affichage côté visiteur)
  const oldMeta = `    const meta = { lastMessage: label, lastTs: Date.now() };
    if (!isAdmin) { meta.visitorName = userProfile?.fullName || ''; meta.visitorPhoto = userProfile?.photoURL || ''; }`;
  const newMeta = `    const meta = { lastMessage: label, lastTs: Date.now(), artistId, artistName: artist.name, artistPhoto: artist.photoURL || '' };
    if (!isAdmin) { meta.visitorName = userProfile?.fullName || ''; meta.visitorPhoto = userProfile?.photoURL || ''; }`;
  if (s.includes(oldMeta)) { s = s.replace(oldMeta, newMeta); done.push("ArtistMessages : meta page artiste"); }
  return s;
});

// ═══ 2) Messages.jsx : afficher les conversations de page artiste ═══
edit("src/pages/Messages.jsx", s => {
  const old = `        if (!chatId.includes(currentUser.uid)) continue;
        const otherUid = getOtherUid(chatId, currentUser.uid);`;
  const neu = `        // ── Conversation avec une PAGE ARTISTE : artist_{artistId}_{visitorUid}
        if (chatId.startsWith('artist_')) {
          const rest = chatId.slice(7);
          const sep = rest.lastIndexOf('_');
          const aId = rest.slice(0, sep), vUid = rest.slice(sep + 1);
          if (vUid !== currentUser.uid) continue;
          const msgs2 = conv.messages ? Object.values(conv.messages) : [];
          const last2 = msgs2[msgs2.length - 1];
          const unread2 = msgs2.filter(m => m.fromArtist && !m.readByVisitor).length;
          list.push({
            chatId, artistId: aId, isArtist: true,
            user: { fullName: conv.meta?.artistName || 'Page artiste', photoURL: conv.meta?.artistPhoto || '' },
            lastMsg: last2, unread: unread2,
          });
          continue;
        }

        if (!chatId.includes(currentUser.uid)) continue;
        const otherUid = getOtherUid(chatId, currentUser.uid);`;
  if (s.includes(old)) { s = s.replace(old, neu); done.push("Messages : conversations de page artiste"); }

  // ── chat artiste ouvert DANS la boîte de messages (pas de redirection) ──
  if (!s.includes("isArtistChat")) {
    s = s.replace("  const isGroupChat = !!activeChatId?.startsWith('group_');",
                  "  const isGroupChat = !!activeChatId?.startsWith('group_');\n  const isArtistChat = !!activeChatId?.startsWith('artist_');");
    done.push("Messages : flag isArtistChat");
  }

  // envoi : pas de toUid, marquage lu visiteur, notification aux admins de la page
  const oldOther = "      const otherUid = isGroupChat ? null : activeChatId.split('_').find(p => p !== currentUser.uid);";
  const newOther = "      const otherUid = (isGroupChat || isArtistChat) ? null : activeChatId.split('_').find(p => p !== currentUser.uid);";
  if (s.includes(oldOther)) { s = s.replace(oldOther, newOther); done.push("Messages : otherUid ignore les chats artiste"); }

  const oldMsgData = `          ts: Date.now(),
          read: false,
          ...(replyTo ? { replyTo: { id: replyTo.id, text: replyTo.text, fromName: replyTo.fromName } } : {}),
        };`;
  const newMsgData = `          ts: Date.now(),
          read: false,
          ...(isArtistChat ? { fromArtist: false, readByVisitor: true, readByAdmin: false } : {}),
          ...(replyTo ? { replyTo: { id: replyTo.id, text: replyTo.text, fromName: replyTo.fromName } } : {}),
        };`;
  if (s.includes(oldMsgData)) { s = s.replace(oldMsgData, newMsgData); done.push("Messages : msgData chat artiste"); }
  return s;
});

console.log("\n✅ Patch vita! Nampiharina:");
done.forEach(d => console.log("   • " + d));

let ok = true;
const am = fs.readFileSync("src/pages/ArtistMessages.jsx", "utf8");
if (am.includes("artistConversations/${artistId}/${activeVisitor}")) { console.log("❌ chemins non migrés"); ok = false; }
if (done.length < 7) { console.log("❌ Seulement " + done.length + " appliquées"); ok = false; }
console.log(ok ? "\n✅ Verifications OK — tu peux builder." : "\n❌ ARRET : previens-moi.");
if (!ok) process.exit(1);
