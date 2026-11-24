// Offscreen: nothing ever shows on screen. The sea (sea.js): a new town may end in a beach and open water, east or
// west; nothing is built or walks on the water; the road ends at a pier; boats of each era; an older town without
// the key keeps its map. Usage: npx electron tools/sea-test.js [game dir] [out dir]
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
  const win = new BrowserWindow({ width: 380, height: 760, show: false, useContentSize: true,
    webPreferences: { offscreen: true, preload: path.join(__dirname, 'preload.js'), contextIsolation: false, sandbox: false } });
  win.webContents.setFrameRate(30);
  win.webContents.on('console-message', (e) => { if (e.level === 'error' || e.level >= 3) errors.push(e.message); });
  const js = (code) => win.webContents.executeJavaScript(`(() => { try { ${code} } catch (e) { console.error(e.stack); return 'ERR ' + e.message; } })()`);
  await win.loadFile(path.join(GAME, 'index.html'));
  await wait(800);
  const today = new Date().toLocaleDateString('sv');
  for (const [side, era] of [['e', 0], ['w', 2], ['e', 3], ['w', 4], ['e', 5]]) {
    const r = await js(`
      S = { ...fresh(), sea: '${side}', mapSeed: 4100 + ${era}, gender: 'm', traits: rollTraits(), era: ${era}, houses: 0, lastDay: '${today}', days: 5,
        landmarks: LANDMARKS.filter((l) => l.era <= ${era}).map((l) => l.id), chickens: 3 };
      applyLayout(S.mapSeed); carveGroves();
      for (let i = 0; i < 40; i++) { if (wantClearing()) { S.coins += clearCost(); clearWoods(); } ensureLots(i + 1); S.houses = i + 1; }
      S.houses = Math.min(S.houses, HOUSES_BY_ERA[${era}]);
      spawnFamily(); spawnAnimals(); spawnCars(); cache.dirty = true; $('mode').hidden = true; $('pick').hidden = true; paintUi();
      window.__camAt = (waterX0() + waterX1()) / 2 + (SEA.side === 'e' ? -4 : 4); wake();
      const lotsInSea = S.lots.slice(0, S.houses).filter((l) => inSeaTile(l.x) || inSeaTile(l.x + 1)).length;
      const blocks = [LAKE, MINE, PEN, POND, ...LANDMARKS].filter((b) => b.x < SEA.x + SEA.w && b.x + b.w > SEA.x).length;
      route(people[0], [waterX0() + 4, ROAD_Y + 3]);
      const end = people[0].path.at(-1);
      const wet = (people[0].path ?? []).filter(([x, y]) => seaBlocks(x, y)).length;
      return { lotsInSea, blocks, wet, end, boats: boats.length, wildOnWater: animals.filter((a) => isWater(Math.floor(a.x / T))).length,
        carsOnWater: cars.filter((c) => !VEHICLE[c.type].sky && (c.x > landMaxX() || c.x < landMinX() - 10)).length };`);
    ok(r.lotsInSea === 0 && r.blocks === 0, `nothing built in the sea (${side}/${era}): ` + JSON.stringify(r));
    ok(r.wet === 0, `nobody walks on water (${side}/${era}): ` + JSON.stringify(r));
    ok(r.boats >= 2 && r.wildOnWater === 0 && r.carsOnWater === 0, `boats, no wildlife or cars on the water (${side}/${era}): ` + JSON.stringify(r));
    await wait(1600);
    const url = await js(`return document.getElementById('world').toDataURL()`);
    fs.writeFileSync(path.join(OUT, `sea-${side}-${era}.png`), Buffer.from(url.split(',')[1], 'base64'));
  }
  // Cars turn round at the beach.
  const turn = await js(`const c = cars.find((x) => !VEHICLE[x.type].sky); c.right = SEA.side === 'e'; c.x = SEA.side === 'e' ? landMaxX() - 10 : landMinX() - 2; trafficTick(cars, 1); return c.right === (SEA.side !== 'e');`);
  ok(turn === true, 'traffic turns round at the beach');
  // An older save (no key) keeps a sea-less map.
  await js(`__store.save = { ...fresh(), v: 2, mapSeed: 99 }; delete __store.save; const s = { ...fresh(), mapSeed: 99 }; delete s.sea; __store.save = s; return 1;`);
  await win.loadFile(path.join(GAME, 'index.html'));
  await wait(1200);
  ok(await js(`return S.sea === null && !hasSea();`), 'an older town keeps its map without a sea');
  console.log(JSON.stringify({ errors, fails }, null, 1));
  app.exit(fails.length || errors.length ? 1 : 0);
});
