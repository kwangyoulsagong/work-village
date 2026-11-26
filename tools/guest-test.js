// Offscreen: nothing ever shows on screen. Calling on a neighbour (guest.js): the door opens only if someone of that
// family is home; asleep / ill / nobody / your ex get a word at the door; friendship tiers the things to do inside;
// the day's cap; the person card's button (the host goes home first); invitations; the room drawn; chaos mode never.
// Usage: npx electron tools/guest-test.js [game dir] [out dir]
const GAME = process.argv[2] || require('path').join(__dirname, '..', 'aquila');
const OUT = process.argv[3] || require('path').join(__dirname, 'out');
require('fs').mkdirSync(OUT, { recursive: true });
const { app, BrowserWindow } = require('electron');
const path = require('path'), fs = require('fs');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
app.dock?.hide();
app.whenReady().then(async () => {
  const errors = [];
  const fails = [];
  const ok = (cond, what) => { if (!cond) fails.push(what); };
  const win = new BrowserWindow({ width: 380, height: 900, show: false, useContentSize: true,
    webPreferences: { offscreen: true, preload: path.join(__dirname, 'preload.js'), contextIsolation: false, sandbox: false } });
  win.webContents.setFrameRate(30);
  win.webContents.on('console-message', (e) => { if (e.level === 'error' || e.level >= 3) errors.push(e.message); });
  const js = (code) => win.webContents.executeJavaScript(`(() => { try { ${code} } catch (e) { console.error(e.stack); return 'ERR ' + e.message; } })()`);
  const shot = async (name) => fs.writeFileSync(path.join(OUT, name), Buffer.from((await js(`return document.getElementById('world').toDataURL()`)).split(',')[1], 'base64'));
  const today = new Date().toLocaleDateString('sv');
  const town = (era, f = 7) => `window.__night = false;
    S = { ...fresh(), sea: null, mapSeed: 6060, gender: 'm', temper: 'chatty', traits: { health: 3, green: 3, charm: 3, trade: 3, luck: 3 }, era: ${era}, houses: 0, coins: 50, bag: 2,
      xp: 900, days: 20, age: 20, lastDay: '${today}', skin: '#d99a6c', hair: '#3a2a1a' };
    applyLayout(S.mapSeed); carveGroves(); for (let i = 0; i < 6; i++) { ensureLots(i + 1); S.houses = i + 1; }
    S.friends = Array.from({ length: S.houses }, () => ({ f: ${f}, day: '' }));
    wantCall = null; guestStay = null; homeStay = null; houseView = false; lifeCam = null;
    updateMyJob(true); spawnFamily(); spawnAnimals(); spawnCars(); cache.dirty = true; $('mode').hidden = true; $('pick').hidden = true; paintUi(); fitCanvas(); wake(); window.scrollTo(0, 0);`;
  // Put family i inside (or out) by hand.
  const setHome = (i, where) => `for (const p of familyOf(${i})) { p.path = []; p.goal = null; ${where === 'in' ? `p.hidden = true; p.act = { tool: 'bowl', n: 300, t: 300 };` : where === 'sleep' ? `p.hidden = true; p.act = { tool: 'sleep', n: 300, t: 300 };` : `p.hidden = false; p.act = null; p.x = (doorOf(${i})[0] + 20) * T;`} }`;
  await win.loadFile(path.join(GAME, 'index.html'));
  await wait(800);

  // Nobody home: a word at the door, not in; asleep at night; ill; your ex.
  const door = await js(town(3) + setHome(1, 'out') + `const out = knock(1); const a = !guestStay;
    ${setHome(1, 'sleep')} window.__night = true; const asleep = knock(1); const b = !guestStay; window.__night = false;
    ${setHome(1, 'in')} for (const p of familyOf(1)) p.sick = true; const sick = knock(1); const c = !guestStay; for (const p of familyOf(1)) p.sick = false;
    S.ex = 2; const ex = callWhy(2); S.ex = null; S.friends[3].f = 2; const low = callWhy(3);
    return { out, a, asleep, b, sick, c, ex, low };`);
  ok(/아무도 없/.test(door.out) && door.a && /자고 있/.test(door.asleep) && door.b && /몸이 안 좋/.test(door.sick) && door.c && /만나기 싫/.test(door.ex) && /호감 3부터/.test(door.low), 'at the door: ' + JSON.stringify(door));

  // Someone's home: in; the card lists what to do by friendship (7: dinner yes in the evening, listen no).
  const inn = await js(town(3, 7) + setHome(1, 'in') + `const said = knock(1); paintGuest();
    const btns = [...$('guestActs').children].map((b) => [b.textContent, b.disabled]); return { said, view: guestView(), hidden: me.hidden, card: !$('guestCard').hidden, btns, title: $('guestName').textContent };`);
  const dis = Object.fromEntries(inn.btns.map(([t, d]) => [t.split(' · ')[0], d]));
  ok(/들어왔어요/.test(inn.said) && inn.view && inn.hidden && inn.card && dis['차 마시며 얘기하기'] === false && dis['고민 들어주기'] === true && /네 집/.test(inn.title), 'inside: ' + JSON.stringify(inn));
  await wait(400);
  await shot('guest-room-3.png');

  // Tea: +1, then out; the day's visit is used up (no second call today), and the walk-up visit counts as done.
  const tea = await js(`const f0 = S.friends[1].f; guestDo('tea'); guestStay.t = 1; guestTick(); return { gain: S.friends[1].f - f0, out: !guestStay && !me.hidden, again: callWhy(1), day: S.friends[1].day === today(), now: $('now').textContent };`);
  ok(tea.gain === 1 && tea.out && /벌써/.test(tea.again) && tea.day && /호감 \+1/.test(tea.now), 'tea: ' + JSON.stringify(tea));

  // A gift costs a crop; invited: +1 on top; the cap holds at +3 a day.
  const gift = await js(town(3, 7) + setHome(2, 'in') + `S.invite = { i: 2, day: S.days }; const bag = S.bag; knock(2, true); guestDo('gift'); guestStay.t = 1; guestTick();
    return { gain: S.friends[2].f - 7, bag: bag - S.bag, invite: S.invite };`);
  ok(gift.gain === 3 && gift.bag === 1 && !gift.invite, 'gift when invited, capped: ' + JSON.stringify(gift));

  // The person card: 집에 놀러 가기 sends them home, you follow; arriving, they're in.
  const card = await js(town(4, 5) + `const p = familyOf(1).find((x) => x.who === 'h1a'); p.x = (doorOf(1)[0] + 6) * T; p.hidden = false; p.act = null; openTalk(p);
    const has = [...$('talkActions').children].some((b) => b.textContent === '🏠 집에 놀러 가기' && !b.disabled);
    [...$('talkActions').children].find((b) => b.textContent === '🏠 집에 놀러 가기').click();
    const goingHome = p.goal?.what === 'shelter'; const t = nextTask(); const what = t?.what;
    for (let k = 0; k < 400 && !p.hidden; k++) think(p);
    const said = t.act(); return { has, goingHome, what, said, view: guestView() };`);
  ok(card.has && card.goingHome && /놀러 가기/.test(card.what) && /들어왔어요/.test(card.said) && card.view, 'from the person card: ' + JSON.stringify(card));
  await js(`guestDo(familyOf(1).some((p) => p.small && p.hidden) ? 'tea' : 'tea'); return 1;`);
  await wait(400);
  await shot('guest-room-4-tea.png');
  const leave = await js(`$('guestLeave').click(); return { out: !guestStay && !me.hidden && $('guestCard').hidden };`);
  ok(leave.out, 'leaving by the button');

  // The host walks out mid-visit: you leave politely.
  const gone = await js(town(2, 6) + setHome(3, 'in') + `knock(3); for (const p of familyOf(3)) p.hidden = false; guestTick(); return { out: !guestStay, now: $('now').textContent };`);
  ok(gone.out && /나가 봐야/.test(gone.now), 'host leaves: ' + JSON.stringify(gone));

  // Each room by era, and a look round / dinner / play drawn.
  for (const [era, act] of [[0, 'look'], [2, 'dinner'], [5, 'kids']]) {
    await js(town(era, 9) + setHome(1, 'in') + `knock(1); guestStay.act = '${act}'; guestStay.t = guestStay.n = 60; return 1;`);
    await wait(400);
    await shot(`guest-room-${era}-${act}.png`);
  }

  // Invitations: a close neighbour asks; in the evening you go, the door opens.
  const inv = await js(town(3, 8) + `const r = Math.random; Math.random = () => 0.01; guestDay(); Math.random = r; const invite = S.invite; const story = S.story[0]?.text;
    window.__hour = 18; const t = nextTask(); window.__hour = undefined; return { invite, story, what: t?.what };`);
  ok(inv.invite && /놀러 오래요/.test(inv.story) && /초대/.test(inv.what ?? ''), 'invitation: ' + JSON.stringify(inv));

  // Neighbours calling on each other: in only if someone's home; a bubble over the door; nobody home, off again.
  const npc = await js(town(3) + setHome(2, 'in') + `npcCalls = []; const g = familyOf(1).find((p) => p.who === 'h1a'); g.hidden = false; g.act = null;
    const r0 = relOf(1, 2); npcKnock(g, 1, 2); const inside = g.hidden && familyOf(2).every((p) => p.hidden); const rel = relOf(1, 2) - r0;
    ${setHome(3, 'out')} const g2 = familyOf(4).find((p) => p.who === 'h4a'); g2.hidden = false; g2.act = null; npcKnock(g2, 4, 3);
    const opts = []; g.needs.social = 0; const rr = Math.random; Math.random = () => 0.1; npcCallOption(g, 1, (...a) => opts.push(a[1])); Math.random = rr;
    moveCam(doorOf(2)[0] * T - VIEW_W / 2); return { inside, rel, calls: npcCalls.length, away: !g2.hidden && g2.shout?.text, opts };`);
  ok(npc.inside && npc.rel === 2 && npc.calls === 1 && /아무도/.test(npc.away) && npc.opts.includes('call'), 'neighbours calling: ' + JSON.stringify(npc));
  await wait(400);
  await shot('guest-npc-bubble.png');

  // Chaos: none of it.
  const c = await js(town(3) + setHome(1, 'in') + `enterChaos(2); const why = callWhy(1); const t = callTask(); leaveChaos(); return { why, t };`);
  ok(c.why && !c.t, 'no calls in chaos mode: ' + JSON.stringify(c));

  console.log(JSON.stringify({ errors, fails }, null, 1));
  app.exit(fails.length || errors.length ? 1 : 0);
});
