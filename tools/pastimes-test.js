// Offscreen: nothing ever shows on screen. Pastimes (pastimes.js): relics and the museum, rare visitors drawn by
// decorations, home cooking, a strike, the week's choice, news in an invite code, a guestbook note's caravan and
// gift (once), a boat of your own and a trip out to sea. Usage: npx electron tools/pastimes-test.js [game dir] [out dir]
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
  const js = (code) => win.webContents.executeJavaScript(`(async () => { try { ${code} } catch (e) { console.error(e.stack); return 'ERR ' + e.message; } })()`);
  const shot = async (name) => fs.writeFileSync(path.join(OUT, name + '.png'), (await win.webContents.capturePage()).toPNG());
  const today = new Date().toLocaleDateString('sv');
  const town = (era, sea = 'null') => `
    S = { ...fresh(), sea: ${sea}, mapSeed: 5150, gender: 'f', traits: { health: 3, green: 3, charm: 3, trade: 3, luck: 3 }, era: ${era}, houses: 0, coins: 2000,
      xp: 900, days: 9, age: 9, lastDay: '${today}', landmarks: LANDMARKS.filter((l) => l.era <= ${era}).map((l) => l.id), chickens: 3 };
    applyLayout(S.mapSeed); carveGroves(); for (let i = 0; i < 8; i++) { ensureLots(i + 1); S.houses = i + 1; }
    S.friends = Array.from({ length: S.houses }, () => ({ f: 4, day: '' }));
    updateMyJob(true); spawnFamily(); spawnAnimals(); spawnCars(); cache.dirty = true; $('mode').hidden = true; $('pick').hidden = true; paintUi(); fitCanvas(); wake(); window.scrollTo(0, 0);`;
  await win.loadFile(path.join(GAME, 'index.html'));
  await wait(800);

  // Relics and the museum's fee.
  const m = await js(town(2) + `S.dex.push('relic:토기 조각', 'relic:돌도끼'); S.decor = [{ k: 'museum', x: PLAZA.x - 2, y: ROAD_Y + 2 }]; const c = S.coins; pastimesDay(); return { fee: S.coins - c, opened: S.museumOpened, total: DEX_TOTAL };`);
  ok(m.fee >= 4 && m.opened, 'the museum takes a fee: ' + JSON.stringify(m));
  // A rare visitor.
  const v = await js(`const real = Math.random; Math.random = () => 0.01; S.decor.push(...[0, 1, 2].map((i) => ({ k: 'flowers', x: PLAZA.x - 6 + i, y: ROAD_Y + 3 }))); visitorDay(); Math.random = real;
    return { visitor: S.visitor, dex: S.dex.filter((k) => k.startsWith('visitor:')), spawned: animals.some((a) => a.kind === S.visitor?.kind) };`);
  ok(v.visitor && v.dex.length === 1 && v.spawned, 'decorations draw a rare visitor: ' + JSON.stringify(v));
  await js(`window.__camAt = PLAZA.x - 3; return 1;`);
  await wait(900);
  await shot('p1-museum');
  // Cooking.
  const cook = await js(`S.stock.fish = 5; S.bag = 0; const before = S.cooked?.length ?? 0; cookDay(); return { learned: (S.cooked?.length ?? 0) - before, fish: S.stock.fish };`);
  ok(cook.learned === 1 && cook.fish === 3, 'a recipe cooked from the store: ' + JSON.stringify(cook));
  // A strike stops the factory's bonus.
  const strike = await js(town(3) + `const real = Math.random; Math.random = () => 0.01; strikeDay(); Math.random = real; return { strike: strikeToday(), story: S.story[0].text };`);
  ok(strike.strike && /파업/.test(strike.story), 'a strike: ' + JSON.stringify(strike));
  // The week's choice.
  const week = await js(`S.week = null; paintUi(); const shown = !$('weekCard').hidden; const n = $('weekChoices').children.length; $('weekChoices').children[0].click();
    return { shown, n, picked: S.week?.id, grow: weekGrow(), hidden: $('weekCard').hidden };`);
  ok(week.shown && week.n === 4 && week.picked === 'harvest' && week.grow > 1 && week.hidden, 'the week card: ' + JSON.stringify(week));
  // News in an invite; a note's caravan and gift, once.
  const code = await js(`story('💕 테스트 소식'); const c = await myCode(); const o = await unpackCode(c); return { news: o.news };`);
  ok(Array.isArray(code.news) && code.news.length >= 1, 'news in an invite code: ' + JSON.stringify(code));
  const car = await js(`const note = { k: 'note', from: { name: '친구', era: 4 }, seed: S.mapSeed, text: '안녕', x: PLAZA.x * T, y: 120 };
    const c0 = S.coins; takeNote(note); const c1 = S.coins; takeNote({ ...note, x: 99, from: { name: '친구', era: 2.5 } }); return { gift: c1 - c0, again: S.coins - c1, caravan: S.caravan };`);
  ok(car.gift === 30 && car.again === 0 && car.caravan?.name === '친구', 'a caravan with a gift, once per note: ' + JSON.stringify(car));
  await js(`window.__camAt = PLAZA.x - 2; return 1;`);
  await wait(700);
  await shot('p2-caravan');
  // A boat and a trip out to sea.
  const boat = await js(town(3, "'e'") + `buyBoat(MY_BOATS[3]); const mine = boats.find((b) => b.mine);
    let t = null; const real = Math.random; Math.random = () => 0.01; t = boatTask(); Math.random = real;
    const said = t?.act(); return { boat: S.boat, mine: !!mine, task: t?.what, said, trip: seaTrip, hidden: me.hidden, rows: buildRows().filter((r) => r.group === '바다').length };`);
  ok(boat.boat === 'steam' && boat.mine && boat.trip > 0 && boat.hidden && boat.rows >= 3, 'a boat and a trip: ' + JSON.stringify(boat));
  await js(`window.__camAt = waterX0() + 6; return 1;`);
  await wait(900);
  await shot('p3-boat');
  const back = await js(`const f = S.stock.fish; for (let i = 0; i < 80; i++) seaTripTick(); return { hidden: me.hidden, fish: S.stock.fish - f };`);
  ok(!back.hidden && back.fish === 2, 'back from sea with fish: ' + JSON.stringify(back));
  // None of it in chaos mode.
  const chaos = await js(`enterChaos(2); const p = people.find((x) => x.kind === 'villager'); const opts = []; pastimeOptions(p, (...a) => opts.push(a)); const r = { opts: opts.length, week: $('weekCard').hidden }; leaveChaos(); return r;`);
  ok(chaos.opts === 0 && chaos.week, 'nothing of it in chaos mode: ' + JSON.stringify(chaos));
  console.log(JSON.stringify({ errors, fails }, null, 1));
  app.exit(fails.length || errors.length ? 1 : 0);
});
