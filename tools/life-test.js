// Offscreen only. Traffic per era, new animals, varied villagers, build menu, jobs tab, timeline.
// Usage: npx electron tools/life-test.js [game dir] [out dir]   (offscreen: no window ever shows)
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
  win.webContents.setFrameRate(30);
  win.webContents.on('console-message', (e) => { if (e.level === 'error' || e.level === 3) errors.push(e.message); });
  const js = (code) => win.webContents.executeJavaScript(`(() => { try { ${code} } catch (e) { console.error(e.stack); return 'ERR ' + e.message; } })()`);
  const canvasShot = async (name) => {
    const url = await js(`return document.getElementById('world').toDataURL()`);
    fs.writeFileSync(path.join(OUT, name + '.png'), Buffer.from(url.split(',')[1], 'base64'));
  };
  const pageShot = async (name) => fs.writeFileSync(path.join(OUT, name + '.png'), (await win.webContents.capturePage()).toPNG());
  await win.loadFile(path.join(GAME, 'index.html'));
  await wait(1200);
  const today = new Date().toLocaleDateString('sv');
  const town = (era, houses) => `
    S = { ...fresh(), mapSeed: 4242, gender: 'm', traits: { health: 2, green: 4, charm: 5, trade: 3, luck: 1 }, era: ${era}, houses: ${houses}, chickens: 4, cows: 2, sheep: 2, goats: 2, horses: 1, donkeys: 1, turkeys: 2, dog: true, cat: true,
      landmarks: [], farm: ['scarecrow', 'field2', 'orchard'], season: 0, coins: 2500, pocket: 48, xp: 2400, days: 41, age: 30, lastDay: '${today}', stock: { wood: 42, stone: 17, fish: 5, berries: 9 } };
    applyLayout(S.mapSeed); carveGroves(); ensureLots(S.houses); updateMyJob(true); S.friends = Array.from({ length: ${houses} }, () => ({ f: 3, day: '' }));
    spawnFamily(); spawnAnimals(); spawnCars(); cache.dirty = true; $('mode').hidden = true; $('pick').hidden = true; paintUi(); fitCanvas(); wake(); return 'ok';`;
  console.log(await js(town(4, 20)));
  await wait(1500);
  // Traffic, era by era: point the camera at the busiest stretch of road.
  for (let era = 0; era <= 5; era++) {
    await js(`S.era = ${era}; spawnCars(); spawnFamily(); cache.dirty = true; lifeCam = { x: HOME.x * T - 60, until: Date.now() + 60000 }; camX = lifeCam.x; return 1;`);
    // Find the view with most vehicles in it.
    await js(`let best = 0, bx = 0; for (let x = 0; x < W - VIEW_W; x += 40) { const n = cars.filter((c) => !c.sky && c.x > x && c.x < x + VIEW_W).length; if (n > best) { best = n; bx = x; } } lifeCam = { x: bx, until: Date.now() + 60000 }; camX = bx; return best;`);
    await wait(700);
    await canvasShot(`traffic-${era}`);
  }
  // People variety: crowd at the plaza.
  await js(`S.era = 4; spawnCars(); spawnFamily(); for (const [i, p] of people.entries()) { p.x = (PLAZA.x - 4 + (i % 14)) * T + 8; p.y = (ROAD_Y + 1 + Math.floor(i / 14) % 4) * T + 14; p.path = []; p.wait = 999; } lifeCam = { x: (PLAZA.x - 5) * T, until: Date.now() + 60000 }; camX = lifeCam.x; return people.length;`);
  await wait(500);
  await canvasShot('people');
  // Wildlife: woods by day and by night.
  const woods = `const g = [...GROVES].sort((a, b) => b.w - a.w)[0]; lifeCam = { x: Math.max(0, g.x * T - 20), until: Date.now() + 60000 }; camX = lifeCam.x; return g.x + ':' + g.w + ' ' + animals.filter(a => ['bear','boar','hedgehog','owl','raccoon'].includes(a.kind)).map(a=>a.kind).join(',');`;
  await js(`S.era = 1; spawnAnimals(); return 1`);
  console.log('woods', await js(woods));
  await wait(600);
  await canvasShot('woods-day');
  await js(`window.__night = true; cache.dirty = true; return 1`);
  await wait(600);
  await canvasShot('woods-night');
  await js(`window.__night = false; cache.dirty = true; lifeCam = { x: Math.max(0, LAKE.x * T - 40), until: Date.now() + 60000 }; camX = lifeCam.x; return 1`);
  await wait(600);
  await canvasShot('lake');
  await js(`lifeCam = { x: Math.max(0, PEN.x * T - 40), until: Date.now() + 60000 }; camX = lifeCam.x; return 1`);
  await wait(600);
  await canvasShot('pen');
  // Build menu: open the tab, buy a chicken by clicking, place decorations, move the farm.
  console.log(await js(town(4, 20)));
  await wait(800);
  await js(`document.getElementById('buildTab').click(); return 1`);
  await wait(300);
  const before = await js(`return JSON.stringify({ c: S.chickens, coins: Math.round(S.coins) })`);
  await js(`[...document.querySelectorAll('#buildList .buy')].find((li) => li.textContent.includes('닭 들이기')).querySelector('button').click(); return 1`);
  const after = await js(`return JSON.stringify({ c: S.chickens, coins: Math.round(S.coins) })`);
  console.log('buy chicken', before, '->', after);
  console.log('folk', await js(`[...document.querySelectorAll('#buildList .buy')].find((li) => li.textContent.includes('주민 한 명')).querySelector('button').click(); return S.folk + ' people ' + people.length`));
  console.log('house', await js(`const h = S.houses; [...document.querySelectorAll('#buildList .buy')].find((li) => li.textContent.includes('집 한 채')).querySelector('button').click(); return h + '->' + S.houses`));
  // Decorations: place several around home with the real placement path.
  console.log('decor', await js(`const out = []; const ids = ['flowers','tree','bench','well','statue','lamp','fountain','vending','busstop','rock']; let k = 0;
    for (let dx = -8; dx < 14 && k < ids.length; dx++) for (const y of [7, 8, 2]) { const tx = HOME.x + dx; if (k < ids.length && canPlace(tx, y)) { pick(DECOR.find(d => d.id === ids[k])); placeDecor(tx * T + 4, y * T + 4); out.push(ids[k] + '@' + tx + ',' + y); k++; } }
    return out.join(' ') + ' | ' + S.decor.length;`));
  console.log('reject road', await js(`pick(DECOR[0]); const n = S.decor.length; placeDecor(HOME.x * T, ROAD_Y * T + 4); const m = S.decor.length; pick(null); return n + '=' + m;`));
  await js(`lifeCam = { x: (HOME.x - 8) * T, until: Date.now() + 60000 }; camX = lifeCam.x; return 1`);
  await wait(600);
  await canvasShot('decor');
  console.log('move', await js(`const a = coreOrderNow().join(); const f = FARM.x; moveBlock(coreOrderNow()[0], 1); return a + ' -> ' + S.coreOrder.join() + ' farm ' + f + '->' + FARM.x;`));
  await wait(400);
  await js(`document.querySelector('[data-body=build]').scrollTop = 0; return 1`);
  await pageShot('panel-build');
  await js(`document.querySelector('[data-tab=job]').click(); return 1`);
  await wait(300);
  await pageShot('panel-jobs');
  console.log('pay', await js(`return JSON.stringify({ me: myJob()?.name, my: myPay(0.5).toFixed(3), town: townPay().toFixed(3) })`));
  // Save / reload keeps the new things.
  console.log('save', await js(`save(); return JSON.stringify({ folk: S.folk, decor: S.decor.length, order: S.coreOrder })`));
  console.log(JSON.stringify({ errors: [...new Set(errors)].slice(0, 10) }));
  app.exit(0);
});
