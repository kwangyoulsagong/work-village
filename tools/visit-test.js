// Offscreen: 놀러가기. Two towns (A and B) in one page, swapped by hand:
// B visits A's life town (walks, leaves a note) → A takes the note; A sends a chaos town → B wrecks it and sends it
// back → A sees both rounds. Neither life town changes while visiting, and nothing is saved during a visit.
// Usage: npx electron tools/visit-test.js [game dir] [out dir]   (offscreen: no window ever shows)
const GAME = process.argv[2] || require('path').join(__dirname, '..', 'aquila');
const OUT = process.argv[3] || require('path').join(__dirname, 'out');
require('fs').mkdirSync(OUT, { recursive: true });
const { app, BrowserWindow } = require('electron');
const path = require('path'), fs = require('fs');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
app.dock?.hide();
app.whenReady().then(async () => {
  const errors = [];
  const win = new BrowserWindow({ width: 420, height: 1100, show: false, useContentSize: true,
    webPreferences: { offscreen: true, preload: path.join(__dirname, 'preload.js'), contextIsolation: false, sandbox: false } });
  win.webContents.on('console-message', (e) => { if (e.level === 'error' || e.level === 3) errors.push(e.message); });
  const js = (code) => win.webContents.executeJavaScript(`(async () => { try { ${code} } catch (e) { console.error(e.stack); return 'ERR ' + e.message; } })()`);
  const shot = async (name) => {
    const url = await js(`return document.getElementById('world').toDataURL()`);
    fs.writeFileSync(path.join(OUT, name + '.png'), Buffer.from(url.split(',')[1], 'base64'));
  };
  const page = async (name) => fs.writeFileSync(path.join(OUT, name + '.png'), (await win.webContents.capturePage()).toPNG());
  await win.loadFile(path.join(GAME, 'index.html'));
  await js('localStorage.clear()'); await win.webContents.reload(); await wait(1200);
  const today = new Date().toLocaleDateString('sv');
  const check = [];
  const ok = (name, cond) => { check.push((cond ? 'ok   ' : 'FAIL ') + name); if (process.env.V) console.log(check.at(-1)); };

  // Two life towns, kept in window.__A / window.__B; `be(X)` makes X the town on screen.
  await js(`
    const town = (seed, era, houses, gender, style) => ({ ...fresh(), mapSeed: seed, gender, style, traits: { health: 4, green: 4, charm: 4, trade: 4, luck: 4 }, era, houses, coins: 999, chickens: 4, cows: 2, lastDay: '${today}', days: 30, friends: Array.from({ length: houses }, () => ({ f: 1, day: '' })) });
    window.__A = town(1111, 4, 14, 'f', { hair: 'pony', hairColor: '#e8c26a', top: { c: '#d8473a' }, hat: null });
    window.__B = town(2222, 2, 8, 'm', { hair: 'spiky', hairColor: null, top: null, hat: null });
    window.be = (t) => { MODE = 'life'; VISIT = null; lifeState = null; guests = []; S = t; applyLayout(S.mapSeed); carveGroves(); ensureLots(S.houses); spawnFamily(); spawnAnimals(); spawnCars(); cache.dirty = true; document.body.dataset.mode = 'life'; for (const id of ['mode', 'pick', 'eraPick']) $(id).hidden = true; paintUi(); wake(); };
    be(__A); nick = '사공'; return 1`);
  await wait(400);

  // A's invite code.
  const codeA = await js(`return await myCode()`);
  ok(`invite code made (${codeA.length} chars)`, codeA.startsWith('작은마을1:') && codeA.length < 12000);
  const aBefore = await js(`return JSON.stringify(__A)`);

  // B opens it (pasted with line breaks and chatter around it, as a messenger might).
  await js(`be(__B); nick = '민준'; $('theirCode').value = '이거 내 마을이야\\n' + ${JSON.stringify(codeA)}.replace(/(.{60})/g, '$1\\n') + '\\n놀러와'; $('openCode').click(); return 1`);
  await wait(1500);
  const v = await js(`return { mode: MODE, seed: S.mapSeed, era: S.era, guests: guests.map(g => g.name), meHidden: me.hidden, gender: S.gender, host: $('visitHost').textContent, saveKey: (await aquila.storage.get('save')) }`);
  ok('B is in A\'s town, visiting', v.mode === 'visit' && v.seed === 1111 && v.era === 4);
  ok('A walks around as a guest, B\'s own character is out', v.guests.join() === '사공' && !v.meHidden && v.gender === 'm');
  ok('visit header names the host', v.host.includes('사공'));
  // Walk a while, then a note.
  await wait(2500);
  await js(`lifeCam = null; camX = Math.max(0, Math.min(W - VIEW_W, me.x - VIEW_W / 2)); return 1`); await wait(300);
  await shot('visit-1-walk');
  await js(`$('visitWrite').click(); $('signText').value = '마을 예쁘다!'; $('signOk').click(); return 1`);
  await wait(800);
  const reply = await js(`return $('myCode').value`);
  ok(`note reply code made (${reply.length} chars)`, reply.startsWith('작은마을1:') && reply.length < 600);
  ok('visit card shows the reply', await js(`return !$('visitCard').hidden && $('myCodeTitle').textContent === '방명록 코드'`));
  await page('visit-2-panel');
  ok('the visit is never saved', await js(`save(); await new Promise(r => setTimeout(r, 1000)); const s = await aquila.storage.get('save'); return !s || s.mapSeed !== 1111`));
  await js(`$('visitExit').click(); return 1`); await wait(500);
  const back = await js(`return { mode: MODE, seed: S.mapSeed, same: S === __B, guests: guests.length, visit: VISIT }`);
  ok('B is back home, untouched', back.mode === 'life' && back.seed === 2222 && back.same && back.guests === 0 && back.visit === null);

  // A takes B's note.
  await js(`be(__A); nick = '사공'; $('theirCode').value = ${JSON.stringify(reply)}; $('openCode').click(); return 1`); await wait(600);
  const note = await js(`return { book: S.guestbook, guests: guests.map(g => g.name), story: S.story[0].text }`);
  ok('note lands in A\'s guestbook, B drops by', note.book?.length === 1 && note.book[0].name === '민준' && note.guests.join() === '민준');
  await js(`const s = S.guestbook[0]; lifeCam = { x: Math.max(0, s.x - VIEW_W / 2), until: Date.now() + 1e6 }; camX = lifeCam.x; return 1`); await wait(500);
  await shot('visit-3-guestbook');
  ok('A\'s life town unchanged apart from the note', await js(`const a = JSON.parse(${JSON.stringify(aBefore)}); return a.houses === S.houses && a.coins === S.coins && a.era === S.era`));
  ok('a note for another town is refused', await js(`be(__B); $('theirCode').value = ${JSON.stringify(reply)}; $('openCode').click(); await new Promise(r => setTimeout(r, 300)); return !(S.guestbook?.length)`));
  ok('own invite is refused', await js(`be(__A); const n = S.guestbook.length; $('theirCode').value = ${JSON.stringify(codeA)}; $('openCode').click(); await new Promise(r => setTimeout(r, 300)); return MODE === 'life' && S === __A`));
  ok('junk is refused', await js(`$('theirCode').value = '작은마을1:abc'; $('openCode').click(); await new Promise(r => setTimeout(r, 300)); return MODE === 'life' && S === __A`));

  // Chaos, round 1: A wrecks a town and sends it.
  const click = (tool, wx, wy) => js(`chaosTool = '${tool}'; useTool(${wx}, ${wy}); return 1`);
  const lot = (i) => js(`return [LOT_X[${i}] * T + T, ROAD_Y * T - 16]`);
  await js(`enterChaos(3); return 1`); await wait(800);
  await click('smash', ...(await lot(0))); await click('smash', ...(await lot(1)));
  await click('sign', (await lot(2))[0], 6 * 16 + 14); await js(`$('signText').value = '사공 왔다감'; $('signOk').click(); return 1`);
  await wait(500);
  const chaosA = await js(`return await myCode()`);
  const r1 = await js(`return { wrecked: S.wrecked.length, seed: S.mapSeed }`);
  await js(`leaveChaos(); return 1`);
  // B opens it: chaos tools on A's wreck, both characters around.
  await js(`be(__B); nick = '민준'; $('theirCode').value = ${JSON.stringify(chaosA)}; $('openCode').click(); return 1`); await wait(1200);
  const c = await js(`return { mode: MODE, visit: !!VISIT, seed: S.mapSeed, wrecked: S.wrecked.length, signs: S.signs.length, guests: guests.map(g => g.name), meHidden: me.hidden }`);
  ok('B gets A\'s chaos town as it was', c.mode === 'chaos' && c.visit && c.seed === r1.seed && c.wrecked === r1.wrecked && c.signs === 1);
  ok('both characters in the chaos town', c.guests.join() === '사공' && !c.meHidden);
  await click('smash', ...(await lot(3))); await click('fire', ...(await lot(5))); await wait(900);
  await js(`chaosCam = Math.max(0, LOT_X[2] * T - 80); return 1`); await wait(400);
  await shot('visit-4-chaos');
  await js(`$('toVisit').click(); return 1`); await wait(500);
  const chaosB = await js(`return $('myCode').value`);
  ok('chaos reply code says "send back"', await js(`return $('myCodeTitle').textContent === '돌려보낼 코드'`));
  await page('visit-5-chaos-panel');
  await js(`$('chaosExit').click(); return 1`); await wait(400);
  ok('B back home in life mode', await js(`return MODE === 'life' && S === __B && !VISIT`));
  // A gets it back: both rounds of damage.
  await js(`be(__A); $('theirCode').value = ${JSON.stringify(chaosB)}; $('openCode').click(); return 1`); await wait(800);
  const r2 = await js(`return { wrecked: S.wrecked.length, guests: guests.map(g => g.name) }`);
  ok(`A sees both rounds (${r1.wrecked} → ${r2.wrecked} wrecked), B walks around`, r2.wrecked > r1.wrecked && r2.guests.join() === '민준');
  await js(`$('chaosExit').click(); return 1`); await wait(300);
  ok('A back to its untouched life town', await js(`return MODE === 'life' && S === __A && S.houses === 14 && !(S.wrecked?.length)`));
  ok('no zombies outside chaos', await js(`return !people.some(p => p.zombie)`));

  // Review findings, each pinned.
  // A save scheduled just before opening a friend's code writes your own town, not theirs.
  ok('a pending save never writes a friend\'s town', await js(`be(__B); save(); $('theirCode').value = ${JSON.stringify(codeA)}; $('openCode').click(); await new Promise(r => setTimeout(r, 1300)); const s = await aquila.storage.get('save'); const okay = MODE === 'visit' && s && s.mapSeed === 2222; $('visitExit').click(); return okay`));
  // You start at the friend's door, and come home to yours.
  ok('visiting starts at their door, home at yours', await js(`be(__B); $('theirCode').value = ${JSON.stringify(codeA)}; $('openCode').click(); await new Promise(r => setTimeout(r, 300)); const there = Math.abs(me.x - (HOME_DOOR[0] * T + T / 2)) < 40; $('visitExit').click(); await new Promise(r => setTimeout(r, 300)); return there && S.mapSeed === 2222 && Math.abs(me.x - (HOME_DOOR[0] * T + T / 2)) < 40`));
  // Chat after a code: Latin letters and digits too.
  for (const chat of ['\nok see you 123', ' ok', '\nabc=']) {
    const opened = await js(`be(__B); $('theirCode').value = ${JSON.stringify(codeA)} + ${JSON.stringify(chat)}; $('openCode').click(); await new Promise(r => setTimeout(r, 300)); const v = MODE === 'visit'; if (v) $('visitExit').click(); return v`);
    ok(`a code with ${JSON.stringify(chat)} after it opens`, opened);
  }
  const oldStyle = codeA.replace(/\.$/, '');
  ok('an older code without the end dot opens, chat after it too', await js(`be(__B); $('theirCode').value = ${JSON.stringify(oldStyle)} + '\\nok 12'; $('openCode').click(); await new Promise(r => setTimeout(r, 300)); const v = MODE === 'visit'; if (v) $('visitExit').click(); return v`));
  // A chaos town passed on keeps its dead dead.
  await js(`be(__A); nick = '사공'; enterChaos(3); return 1`); await wait(600);
  for (const i of [0, 1, 2, 3]) await click('smash', ...(await lot(i)));
  await click('nuke', (await lot(6))[0], 7 * 16); await wait(1200);
  const sent = await js(`return { villagers: people.filter(p => ['villager', 'kid', 'spouse'].includes(p.kind)).length, chickens: S.chickens, code: await myCode() }`);
  await js(`leaveChaos(); be(__B); nick = '민준'; return 1`);
  const passed = await js(`$('theirCode').value = ${JSON.stringify(sent.code)}; $('openCode').click(); await new Promise(r => setTimeout(r, 600)); const r = { villagers: people.filter(p => ['villager', 'kid', 'spouse'].includes(p.kind)).length, chickens: S.chickens }; $('chaosExit').click(); return r`);
  ok(`the fallen stay gone in a chaos town passed on (${sent.villagers} → ${passed.villagers} villagers, ${sent.chickens} → ${passed.chickens} chickens)`, passed.villagers === sent.villagers && passed.chickens === sent.chickens);
  // A friend's life-town code, opened to wreck (the dropdown): their town as it is, no era to pick.
  const wreck = await js(`be(__B); $('visitHow').value = 'chaos'; $('theirCode').value = ${JSON.stringify(codeA)}; $('openCode').click(); await new Promise(r => setTimeout(r, 600));
    const r = { mode: MODE, chaos: !!VISIT?.chaos, seed: S.mapSeed, era: S.era, houses: S.houses, eraPick: !$('eraPick').hidden };
    chaosTool = 'smash'; useTool(...lotCenter(0)); const wrecked = S.wrecked.length; $('chaosExit').click(); $('visitHow').value = 'life'; return { ...r, wrecked, home: S.mapSeed }`);
  ok(`a friend's town opened to wreck (${JSON.stringify(wreck)})`, wreck.mode === 'chaos' && wreck.chaos && wreck.seed === 1111 && wreck.era === 4 && wreck.houses === 14 && !wreck.eraPick && wreck.wrecked >= 1 && wreck.home === 2222);
  ok('both life towns still untouched after all that', await js(`return __A.houses === 14 && !(__A.wrecked?.length) && __B.houses === 8 && !(__B.gone)`));

  console.log(check.join('\n'));
  console.log(JSON.stringify({ errors, failed: check.filter((x) => x.startsWith('FAIL')).length }));
  app.exit(0);
});
