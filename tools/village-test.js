// Offscreen: nothing ever shows on screen. The neighbours' lives (village.js): a scuffle and tapping it apart, lovers
// and rivals with their head icons, making up over meat, trade in every era (swap, market, cart, bike, scooter,
// drone), a hunt with spear / bow / falcon, eggs hatching into chicks behind their mother, dog breeds, new wildlife,
// a neighbour about to leave, today's line and the 나 tab (status, abilities, temperament, the grain of a life).
// Usage: npx electron tools/village-test.js [game dir] [out dir]
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
  const shot = async (name) => fs.writeFileSync(path.join(OUT, name + '.png'), (await win.webContents.capturePage()).toPNG());
  const today = new Date().toLocaleDateString('sv');
  const town = (era, houses) => `
    localStorage.clear();
    S = { ...fresh(), mapSeed: 777, gender: 'f', temper: 'chatty', traits: { health: 4, green: 3, charm: 5, trade: 2, luck: 3 }, era: ${era}, houses: 0, season: 1,
      chickens: 4, dog: true, dogBreed: 'shiba', coins: 5, xp: 900, days: 12, age: 12, lastDay: '${today}', life: { worked: 9, visits: 6, spent: 300 } };
    applyLayout(S.mapSeed); carveGroves();
    for (let i = 0; i < ${houses}; i++) { ensureLots(i + 1); S.houses = i + 1; }
    S.friends = Array.from({ length: S.houses }, () => ({ f: 4, day: '${today}' }));
    updateMyJob(true); spawnFamily(); spawnAnimals(); spawnCars(); cache.dirty = true; $('mode').hidden = true; $('pick').hidden = true; paintUi(); fitCanvas(); wake();
    window.__camAt = HOME.x + 1; window.scrollTo(0, 0);`;

  await win.loadFile(path.join(GAME, 'index.html'));
  await wait(800);

  // 1. A scuffle between two residents, then tapped apart.
  await js(town(0, 8) + `
    const [a, b] = people.filter((p) => resident(p) >= 0);
    a.x = b.x = (HOME.x + 3) * T; a.y = b.y = ROAD_Y * T + T - 2;
    startFight(a, b); window.__ab = [a, b];`);
  await wait(900);
  await shot('v1-fight');
  ok(await js(`return fights.length === 1 && __ab.every((p) => p.hidden);`), 'a fight hides both in a cloud');
  const stopped = await js(`const f = fights[0]; return tryStopFight(f.x, f.y - 8) && fights.length === 0 && __ab.every((p) => !p.hidden);`);
  ok(stopped, 'tapping the cloud stops the fight');

  // 2. Rivals (story), lovers (story), icons when near.
  const rel = await js(`
    const [a, b] = [0, 2]; addRel(a, b, -6);
    const feud = S.story[0].text;
    S.rel[pairKey(1, 4)] = 6; addRel(1, 4, 1);
    const after = S.story[0].text;
    const pa = people.find((p) => resident(p) === 0), pb = people.find((p) => resident(p) === 2);
    pa.x = (HOME.x - 1) * T; pb.x = (HOME.x - 0) * T; pa.y = pb.y = ROAD_Y * T + T - 2; pa.path = pb.path = []; pa.hidden = pb.hidden = false; // out, whatever the weather
    markPairs();
    return { feud, after, icon: pa.pairIcon, rivals: isRivals(0, 2) };`);
  ok(/앙숙/.test(rel.feud) && rel.rivals, 'rivals: ' + JSON.stringify(rel));
  ok(/💕|💔/.test(rel.after), 'a confession at 7: ' + rel.after);
  ok(rel.icon === 'feud', 'a rival icon when they meet');
  await wait(400);
  await shot('v2-rivals');
  // Making up over meat.
  const made = await js(`S.stock.meat = 2; const p = people.find((x) => resident(x) === 0); const opts = []; makeUpOption(p, 0, (...a) => opts.push(a));
    opts[0][6](); const carry = p.carry?.how; opts[0][5](); return { n: opts.length, carry, story: S.story[0].text, still: isRivals(0, 2) };`);
  ok(made.n === 1 && made.carry === 'meat' && !made.still && /화해/.test(made.story), 'making up over meat: ' + JSON.stringify(made));

  // 3. Trade in every era.
  for (let era = 0; era <= 5; era++) {
    const r = await js(town(era, 8) + `
      const p = people.find((x) => resident(x) === 1);
      const opts = []; tradeOption(p, 1, (...a) => opts.push(a));
      if (!opts.length) return 'none';
      const [score, what, to, tool, dur, done, start] = opts[0];
      start(); p.x = (HOME.x + 4) * T; p.y = ROAD_Y * T + T - 2; p.path = [[HOME.x + 9, ROAD_Y]]; p.goal = null;
      return { tool, how: p.carry?.how, drones: drones.length };`);
    ok(r !== 'none' && (era === 5 ? r.drones >= 1 : r.how === era), `trade look in era ${era}: ${JSON.stringify(r)}`);
    await wait(700);
    await shot(`v3-trade-${era}`);
  }
  // 4. Hunting: spear, bow, falcon.
  for (let era = 0; era <= 2; era++) {
    const r = await js(town(era, 8) + `
      const p = people.find((x) => resident(x) >= 0);
      p.job = JOBS[0];
      const opts = []; huntOption(p, (...a) => opts.push(a));
      if (!opts.length) return 'none';
      const prey = animals.find((a) => PREY.has(a.kind) && !a.variant);
      p.x = (HOME.x + 2) * T; p.y = ROAD_Y * T + T - 2; p.path = []; p.goal = null; p.dir = 'r';
      p.act = { tool: opts[0][3], n: 48, t: 48, done: () => {} };
      return { tool: opts[0][3] };`);
    ok(r !== 'none' && r.tool === ['spear', 'bow', 'falcon'][era], `hunt tool era ${era}: ${JSON.stringify(r)}`);
    await wait(500);
    await shot(`v4-hunt-${era}`);
  }
  const hunt = await js(`const p = people.find((x) => resident(x) >= 0); const prey = animals.find((a) => PREY.has(a.kind) && !a.variant);
    let n = 0; for (let i = 0; i < 30 && !p.carry; i++) { prey.hidden = false; huntDone(p, prey); n++; }
    return { carry: p.carry?.how, then: !!p.then, hidden: prey.hidden || prey.down > 0 };`);
  ok(hunt.carry === 'meat' && hunt.then && hunt.hidden, 'a hunt brings meat home: ' + JSON.stringify(hunt));

  // 5. Eggs → chicks behind their mother; a breed; new wildlife.
  const eggs = await js(town(2, 8) + `
    const hen = animals.find((a) => a.kind === 'chicken');
    S.eggs = [{ k: 'chicken', v: 'golden', x: Math.round(hen.x), y: Math.round(hen.y), at: Date.now() - HATCH_MS - 1 }];
    eggTick();
    const chick = animals.find((a) => a.kind === 'chick');
    window.__camAt = PEN.x + 3;
    return { young: S.young.length, chick: !!chick, mom: chick?.mother?.kind, kinds: [...new Set(animals.map((a) => a.kind))] };`);
  ok(eggs.young === 1 && eggs.chick && eggs.mom === 'chicken', 'an egg hatches into a chick: ' + JSON.stringify(eggs));
  ok(['otter', 'magpie', 'gorani'].every((k) => eggs.kinds.includes(k)), 'new wildlife spawns: ' + eggs.kinds.join(','));
  await wait(1200);
  await shot('v5-chicks');
  const grow = await js(`S.young[0].day = S.days - 3; const c = S.chickens; growYoung(); return S.chickens - c;`);
  ok(grow === 1, 'a chick grows into a hen');

  // 6. Leaving neighbour: your errand.
  const keep = await js(town(1, 8) + `S.leaving = { i: occupied() - 1, day: S.days }; const t = nextTask(); return t?.what;`);
  ok(/붙잡으러/.test(keep ?? ''), 'an errand to keep a neighbour: ' + keep);

  // 7. Today's line and the 나 tab.
  const me = await js(`story('💕 테스트 연인'); paintUi(); document.querySelector('[data-tab="me"]').click();
    return { news: $('dayNews').textContent, rows: $('meList').children.length, hidden: $('dayNews').hidden };`);
  ok(/오늘의 한 줄/.test(me.news) && !me.hidden && me.rows >= 12, 'today line and the 나 tab: ' + JSON.stringify(me));
  await js(`document.querySelector('[data-body="me"]').scrollIntoView();`);
  await wait(300);
  await shot('v6-me');
  // Tapping yourself opens the tab.
  await js(`document.querySelector('[data-tab="story"]').click(); return tryMe(me.x, me.y - 6);`);
  ok(await js(`return !document.querySelector('[data-body="me"]').hidden;`), 'tapping yourself opens 나');

  // 8. Your own ride: bought, parked by the door, ridden on a long trip (faster).
  const ride = await js(town(4, 8) + `S.coins = 5000; const t = rideTask(); if (!t) return 'no task'; t.act();
    const parked = S.ride; me.path = []; route(me, [HOME.x + 20, ROAD_Y]); startTrip(); window.__camAt = HOME.x + 6;
    const x0 = me.x; return { ride: S.ride, riding: me.riding, rows: buildRows().filter((r) => r.group === '탈것').length, parked };`);
  ok(ride.ride && ride.riding === ride.ride && ride.rows >= 3, 'a ride bought and ridden: ' + JSON.stringify(ride));
  await wait(700);
  await shot('v7-ride');
  const fast = await js(`return me.x;`);
  ok(fast > 0, 'riding moves');
  await js(`me.path = []; me.riding = null; window.__camAt = HOME.x + 2; return 1;`);
  await wait(500);
  await shot('v8-parked');

  // 9. Fishing for fun: the option, and a catch leaping out.
  const fish = await js(town(3, 8) + `const p = people.find((x) => resident(x) >= 0); const opts = []; fishOption(p, (...a) => opts.push(a));
    const real = Math.random; Math.random = () => 0.01; opts[0][5](); Math.random = real; return { n: opts.length, tool: opts[0][3], leaps: leaps.length, fish: S.stock.fish };`);
  ok(fish.n === 1 && fish.tool === 'rod' && fish.leaps === 1 && fish.fish >= 1, 'fishing for fun: ' + JSON.stringify(fish));

  // 10. Not in chaos mode: no fights, no trade.
  const chaos = await js(`enterChaos(0); const p = people.find((x) => resident(x) >= 0); const opts = []; villageOptions(p, (...a) => opts.push(a), false); chatted(p, people[3]); const r = { opts: opts.length, fights: fights.length }; leaveChaos(); return r;`);
  ok(chaos.opts === 0 && chaos.fights === 0, 'chaos mode has none of it: ' + JSON.stringify(chaos));

  console.log(JSON.stringify({ errors, fails }, null, 1));
  app.exit(fails.length || errors.length ? 1 : 0);
});
