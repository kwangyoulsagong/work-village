// Offscreen: album, awards, wishes, holidays, rare colours.
// Usage: npx electron tools/more-test.js [game dir] [out dir]   (offscreen: no window ever shows)
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
  await wait(1200);
  const today = new Date().toLocaleDateString('sv');
  console.log(await js(`S = { ...fresh(), mapSeed: 31337, gender: 'f', traits: { health: 3, green: 4, charm: 5, trade: 3, luck: 2 }, era: 4, houses: 18, coins: 3000, chickens: 6, cows: 3, sheep: 3, goats: 3, pigs: 2, horses: 2, donkeys: 2, turkeys: 3, alpacas: 2, spouse: 2, kids: 1, kidAges: [4], lastDay: '${today}', days: 55, stock: { wood: 50, stone: 30, fish: 0, berries: 0 } };
    applyLayout(S.mapSeed); carveGroves(); ensureLots(S.houses); updateMyJob(true); S.friends = Array.from({ length: 18 }, (_, i) => ({ f: i % 5, day: '' }));
    spawnFamily(); spawnAnimals(); spawnCars(); cache.dirty = true; $('mode').hidden = true; $('pick').hidden = true; paintUi(); wake(); return animals.filter(a => a.variant).map(a => a.kind + ':' + a.variant).join(' ') + ' | found ' + (S.variants||[]).length;`));
  await wait(800);
  // Rare colours in the pen: force a few for the picture.
  console.log(await js(`const pen = animals.filter(a => ['chicken','cow','sheep','pig','goat','horse','alpaca','donkey','turkey'].includes(a.kind)); ['golden','black','white','pink'].forEach((v, i) => { if (pen[i * 3]) pen[i * 3].variant = v; }); lifeCam = { x: Math.max(0, PEN.x * T - 40), until: Date.now() + 1e6 }; camX = lifeCam.x; return pen.length;`));
  await wait(600); await shot('more-variants');
  // Wishes.
  console.log('wish', await js(`const r = Math.random; Math.random = () => 0.1; try { wishDaily(); } finally { Math.random = r; } wishDaily(); return JSON.stringify(S.wishes);`));
  console.log('grant', await js(`const w = S.wishes[0]; const c = S.coins; if (w.kind === 'animal') buyAnimal(w.id, 10, w.name); else { pick(DECOR.find(d => d.id === w.id)); for (let x = HOME.x - 6; x < HOME.x + 10; x++) if (canPlace(x, 7)) { placeDecor(x * T + 4, 7 * T + 4); break; } } return S.wishes.length + ' left; story: ' + S.story[0].text;`));
  await js(`const w = S.wishes[0]; if (w) { const p = people.find(e => e.home === w.i && e.kind === 'villager' && !e.small); if (p) { lifeCam = { x: Math.max(0, p.x - 120), until: Date.now() + 1e6 }; camX = lifeCam.x; } } return 1`);
  await wait(500); await shot('more-wish');
  // Awards.
  console.log('awards', await js(`S.days = 56; awards(); return S.story[0].text`));
  // Holidays: force each one and take a picture of the square.
  for (const [h, night] of [['xmas', true], ['chuseok', true], ['halloween', true], ['cherry', false], ['children', false], ['seol', false]]) {
    await js(`holiday = '${h}'; petals = []; window.__night = ${night}; cache.dirty = true; lifeCam = { x: Math.max(0, (PLAZA.x - 6) * T), until: Date.now() + 1e6 }; camX = lifeCam.x; if ('${h}' === 'halloween') { lifeCam.x = Math.max(0, lotX(0) * T - 60); camX = lifeCam.x; } return 1`);
    await wait(1500); await shot('more-holiday-' + h);
  }
  await js(`holiday = null; window.__night = false; cache.dirty = true; return 1`);
  console.log('holidayOn', await js(`return [holidayOn(new Date(2026, 8, 25)), holidayOn(new Date(2026, 1, 16)), holidayOn(new Date(2026, 3, 2)), holidayOn(new Date(2026, 10, 24))].join()`));
  // Album: take two photos, open the tab.
  await js(`snapshot('테스트 1'); return 1`);
  await wait(200);
  await js(`snapshot('테스트 2'); document.getElementById('albumTab').click(); return 1`);
  await wait(500);
  console.log('album', await js(`const a = await aquila.storage.get('album'); return a.length + ' photos, ' + JSON.stringify(a).length + ' bytes'`));
  await js(`document.querySelector('.tab-body[data-body=album]').scrollIntoView(); return 1`);
  await page('more-album');
  await js(`document.querySelector('[data-tab=build]').click(); document.querySelector('.tab-body[data-body=build]').scrollIntoView(); return 1`);
  await wait(300); await page('more-build');
  await js(`document.querySelector('[data-tab=dex]').click(); return 1`);
  console.log('dex', await js(`return document.getElementById('dexCount').textContent`));
  console.log(JSON.stringify({ errors: [...new Set(errors)] }));
  app.exit(0);
});
