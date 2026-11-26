// Offscreen: nothing ever shows on screen. The family (family.js): the 같이 하기 row in the house card, each activity
// drawn inside, a child's ability growing from time together, the outing (everyone walks along, a picnic blanket),
// birthdays / anniversaries / first words / a wish, the family numbers in the 나 tab and on the person card, and none
// of it in chaos mode. Usage: npx electron tools/family-test.js [game dir] [out dir]
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
  const town = (era, kids = [1, 5, 9]) => `
    S = { ...fresh(), sea: null, mapSeed: 6060, gender: 'f', temper: 'gentle', traits: { health: 3, green: 4, charm: 3, trade: 3, luck: 4 }, era: ${era}, houses: 0, coins: 50,
      xp: 900, days: 20, age: 20, lastDay: '${today}', dog: true, dogBreed: 'shiba', spouse: 1, kids: ${kids.length}, kidAges: ${JSON.stringify(kids)},
      kidTraits: ${JSON.stringify(kids.map(() => ({ health: 2, green: 2, charm: 2, trade: 2, luck: 2 })))}, chickens: 3, skin: '#d99a6c', hair: '#c8642a' };
    applyLayout(S.mapSeed); carveGroves(); for (let i = 0; i < 6; i++) { ensureLots(i + 1); S.houses = i + 1; }
    S.friends = Array.from({ length: S.houses }, () => ({ f: 6, day: '${today}' }));
    updateMyJob(true); spawnFamily(); spawnAnimals(); spawnCars(); cache.dirty = true; $('mode').hidden = true; $('pick').hidden = true; paintUi(); fitCanvas(); wake(); window.scrollTo(0, 0);`;
  await win.loadFile(path.join(GAME, 'index.html'));
  await wait(800);

  // The row: shown when you have a family; kid-only things wait for a child of 3; the film waits for the modern era.
  const row = await js(town(1, [1]) + `lifeCam = null; houseView = true; paintHome();
    const opts = [...$('famPick').options].map((o) => [o.value, o.disabled]); return { shown: !$('famRow').hidden, opts, note: $('famNote').textContent };`);
  const dis = Object.fromEntries(row.opts);
  ok(row.shown && dis.dinner === false && dis.story === true && dis.movie === true && /3번 더/.test(row.note), 'the 같이 하기 row: ' + JSON.stringify(row));
  const none = await js(town(1, []) + `S.spouse = null; S.kids = 0; spawnFamily(); houseView = true; lifeCam = null; paintHome(); return $('famRow').hidden;`);
  ok(none, 'no row without a family');

  // Pressing it: you head home, then everyone's in the room; when it ends, happier, closer, and the count goes down.
  const go = await js(town(4) + `S.happy = 40; houseView = true; lifeCam = null; paintHome(); $('famPick').value = 'dinner'; $('famGo').click();
    const t = nextTask(); const what = t?.what; t.act(); const inRoom = homeStay?.fam === 'dinner' && insideView();
    const happy0 = S.happy; const f0 = S.friends[1].f; homeStay.t = 1; homeTick();
    return { what, inRoom, happy: S.happy - happy0, f: S.friends[1].f - f0, left: famLeft(), bond: S.fam.bond, mem: S.fam.mem.map((m) => m.text), now: $('now').textContent };`);
  ok(/가족과 다 같이 저녁/.test(go.what) && go.inRoom && go.happy >= 5 && go.f === 0.5 && go.left === 2 && go.bond.every((b) => b > 30) && go.mem.some((m) => /처음으로/.test(m)) && go.now, 'dinner together: ' + JSON.stringify(go));

  // Each activity inside, drawn (modern era: TV for the film).
  for (const id of ['dinner', 'story', 'game', 'craft', 'pillow', 'sing', 'movie', 'photo']) {
    const r = await js(town(4) + `lifeCam = null; houseView = true; S.fam = { want: { k: 1, id: 'game', day: S.days } }; startFamilyHome(famAct('${id}')); homeStay.t = 60; paintHome(); return insideView();`);
    ok(r === true, `inside for ${id}`);
    await wait(350);
    await shot(`family-${id}.png`);
  }
  // Older eras draw too (yut sticks, a hut).
  for (const era of [0, 2]) {
    await js(town(era) + `lifeCam = null; houseView = true; startFamilyHome(famAct('game')); homeStay.t = 60; return 1;`);
    await wait(350);
    await shot(`family-game-${era}.png`);
  }

  // Training: three story times make a child better at charm (a baby doesn't train), and the daily limit holds.
  const tr = await js(town(3) + `S.fam = {}; for (let i = 0; i < 3; i++) { S.fam.day = today(); S.fam.n = 0; familyDone('story'); }
    const after = S.kidTraits.map((t) => t.charm); S.fam.n = 3; S.fam.day = today(); const before = homeStay; requestFamily('dinner');
    return { after, blocked: !wantFamily && homeStay === before, story: S.story.slice(0, 3).map((s) => s.text) };`);
  ok(tr.after[0] === 2 && tr.after[1] === 3 && tr.after[2] === 3 && tr.blocked && tr.story.some((s) => /매력이 ★3/.test(s)), 'children grow from time together: ' + JSON.stringify(tr));

  // A wish granted: bigger bond, remembered.
  const wish = await js(town(3) + `S.fam = { want: { k: 2, id: 'sing', day: S.days }, bond: [30, 30, 30] }; familyDone('sing');
    return { bond: S.fam.bond, want: S.fam.want, mem: S.fam.mem.map((m) => m.text).join() };`);
  ok(wish.bond[2] === 45 && wish.bond[0] === 38 && !wish.want && /소원/.test(wish.mem ?? ''), 'a wish granted: ' + JSON.stringify(wish));

  // The outing: out to the lake, everyone comes along, a picnic blanket; done, it counts.
  const out = await js(town(3) + `requestFamily('picnic'); const t = nextTask(); const what = t.what; task = t; t.arrive(); const o = !!famOut;
    const along = people.filter((p) => (p.kind === 'spouse' || p.kind === 'kid') && p.goal?.what === 'play').length;
    me.x = t.to[0] * T + T / 2; me.y = t.to[1] * T + T / 2; famOut.x = me.x; famOut.y = me.y; moveCam(me.x - VIEW_W / 2);
    return { what, o, along };`);
  ok(/소풍/.test(out.what) && out.o && out.along === 3, 'a picnic: ' + JSON.stringify(out));
  await wait(400);
  await shot('family-picnic.png');
  const outDone = await js(`const said = task.act(); task = null; return { said, gone: !famOut, n: S.fam.n };`);
  ok(/돗자리/.test(outDone.said) && outDone.gone && outDone.n >= 1, 'picnic done: ' + JSON.stringify(outDone));
  const kite = await js(town(3) + `requestFamily('kite'); const t = nextTask(); task = t; t.arrive(); me.x = t.to[0] * T + T / 2; me.y = t.to[1] * T + T / 2; famOut.x = me.x; famOut.y = me.y; moveCam(me.x - VIEW_W / 2); return t.what;`);
  ok(/연날리기/.test(kite), 'kites: ' + kite);
  await wait(400);
  await shot('family-kite.png');
  const stars = await js(`return famWhy(famAct('stars'))`);
  ok(typeof stars === 'string', 'stars checked');

  // Days: a first word at 2, a 5-day party with a cake, the anniversary at 30 days, a wish now and then.
  const days = await js(town(3, [1, 4]) + `S.fam = { wed: S.days - 29 }; S.days++; liveADay();
    const texts = S.story.slice(0, 8).map((s) => s.text); return { texts, cake: S.fam.cake === S.days, mem: S.fam.mem.length };`);
  ok(days.texts.some((t) => /처음으로 "/.test(t)) && days.texts.some((t) => /태어난 지 5일/.test(t)) && days.texts.some((t) => /결혼한 지 30일/.test(t)) && days.cake && days.mem >= 3, 'family days: ' + JSON.stringify(days));
  await js(`lifeCam = null; houseView = true; homeStay = null; S.fam.draws = [{ k: 0, seed: 11 }, { k: 1, seed: 42 }]; paintHome(); return 1;`);
  await wait(350);
  await shot('family-wall-cake.png');

  // At home any other time: the baby in a cradle, the little ones on the rug.
  for (const kids of [[0], [1, 5], [2, 8, 15]]) {
    await js(town(3, kids) + `lifeCam = null; houseView = true; homeStay = null; paintHome(); return 1;`);
    await wait(300);
    await shot(`family-home-${kids.join('-')}.png`);
  }

  // Outside, the baby doesn't walk: it rides in a pram (industrial on) or a sling, with your spouse (or you).
  for (const era of [1, 4]) {
    const r = await js(town(era, [1, 6]) + `const babyWalks = people.some((p) => p.who === 'k0'); const sp = people.find((p) => p.kind === 'spouse'); sp.hidden = false; sp.path = []; sp.act = null; sp.held = true;
      sp.x = me.x + 20; sp.y = me.y; sp.dir = 'r'; moveCam(me.x - VIEW_W / 2); houseView = false; homeStay = null; return { babyWalks, kids: people.filter((p) => p.kind === 'kid').length };`);
    ok(!r.babyWalks && r.kids === 1, `no baby walking about (era ${era}): ` + JSON.stringify(r));
    await wait(350);
    await shot(`family-baby-out-${era}.png`);
  }

  // The 나 tab and the person card.
  const meTab = await js(town(4) + `S.fam = { mem: [{ day: 3, text: '테스트 추억' }] }; paintMe(); const t = $('meList').textContent;
    const kid = people.find((p) => p.kind === 'kid' && p.who === 'k2'); openTalk(kid); const stat = $('talkStats').textContent; const btn = [...$('talkActions').children].map((b) => b.textContent);
    talk(kid); const line = $('talkLine').textContent; closeTalk();
    return { fam: /가족/.test(t) && /배우자/.test(t) && /셋째/.test(t) && /꿈:/.test(t) && /가족 추억/.test(t), stat, btn, line };`);
  ok(meTab.fam && /체력 2/.test(meTab.stat) && meTab.btn.includes('📊 가족 능력치') && /유대 \+3/.test(meTab.line), 'family numbers: ' + JSON.stringify(meTab));

  // Your spouse's corner: by their best ability (picked by trying spouses until each kind shows), in two eras.
  const kinds = await js(town(4) + `const out = {}; for (let i = 0; i < 40; i++) { S.spouse = i; const k = spouseBest(); out[k] ??= i; } return out;`);
  ok(Object.keys(kinds).length === 5, 'spouse corners: ' + JSON.stringify(kinds));
  for (const [k, i] of Object.entries(kinds))
    for (const era of [0, 4]) {
      await js(town(era) + `S.spouse = ${i}; S.friends[${i}] ??= { f: 6, day: '' }; spawnFamily(); lifeCam = null; houseView = true; homeStay = null; return 1;`);
      await wait(250);
      await shot(`family-corner-${k}-${era}.png`);
    }
  const cn = await js(town(4) + `paintMe(); return { name: cornerName(), shown: $('meList').textContent.includes('집에 ' + cornerName()) };`);
  ok(cn.name && cn.shown, 'corner named in the 나 tab: ' + JSON.stringify(cn));

  // Grown up: at 20 a child moves out (starts the day across town, not drawn at home), and is home for a festival.
  const mv = await js(town(3, [19, 5]) + `S.fam = { bond: [60, 60] }; const r = Math.random; Math.random = () => 0.01; S.days++; liveADay(); Math.random = r;
    const kid = people.find((p) => p.who === 'k0'); const moved = movedOut(0); const story = S.story.slice(0, 6).map((s) => s.text).find((s) => /독립했어요/.test(s));
    const home = famPeople().filter((p) => p.kind === 'kid').length; const away = Math.abs(kid.x - (HOME_DOOR[0] * T + T / 2)) > 10 * T;
    openTalk(kid); const role = $('talkRole').textContent; closeTalk();
    S.festival = today(); famTicks = 119; familyTick(); const visit = S.fam.visit === today(); const homeNow = famPeople().filter((p) => p.kind === 'kid').length;
    return { moved, story, home, away, role, visit, homeNow, cake: S.fam.cake === S.days };`);
  ok(mv.moved && mv.story && mv.home === 1 && mv.away && mv.role === '독립한 내 아이' && mv.visit && mv.homeNow === 2 && mv.cake, 'moving out and coming home: ' + JSON.stringify(mv));

  // None of it in chaos mode.
  const c = await js(town(3) + `wantFamily = null; enterChaos(2); requestFamily('dinner'); const r = { want: wantFamily, home: homeStay, tick: familyTick() }; leaveChaos(); return r;`);
  ok(!c.want && !c.home && c.tick === false, 'no family time in chaos mode: ' + JSON.stringify(c));

  console.log(JSON.stringify({ errors, fails }, null, 1));
  app.exit(fails.length || errors.length ? 1 : 0);
});
