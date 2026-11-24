// Offscreen: collapse motion, graves, green faces; chaos nuke and tornado, life war and plague.
// Usage: npx electron tools/fx-test.js [game dir] [out dir]   (offscreen: no window ever shows)
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
  const js = (code) => win.webContents.executeJavaScript(`(() => { try { ${code} } catch (e) { console.error(e.stack); return 'ERR ' + e.message; } })()`);
  const shot = async (name) => {
    const url = await js(`return document.getElementById('world').toDataURL()`);
    fs.writeFileSync(path.join(OUT, name + '.png'), Buffer.from(url.split(',')[1], 'base64'));
  };
  await win.loadFile(path.join(GAME, 'index.html'));
  await wait(1200);
  // Chaos: a modern town, smash one apartment block and nuke another.
  console.log(await js(`$('mode').hidden = true; enterChaos(4); const i = 3; const [x, y] = lotCenter(i); chaosCam = x - VIEW_W / 2; camX = chaosCam; window.__lot = i; return x + ',' + y;`));
  await wait(800);
  await js(`chaosTool = 'smash'; const [x, y] = lotCenter(__lot); useTool(x, y); return 1`);
  await wait(450); await shot('fx-smash-1');
  await wait(600); await shot('fx-smash-2');
  await wait(1500); await shot('fx-smash-3');
  await js(`chaosTool = 'nuke'; const [x, y] = lotCenter(__lot + 2); useTool(x, y + 30); return 1`);
  await wait(700); await shot('fx-nuke-1');
  await wait(2500); await shot('fx-nuke-2');
  await js(`chaosTool = 'plague'; const [x, y] = lotCenter(__lot + 6); useTool(x, y + 30); chaosCam = x - VIEW_W / 2; camX = chaosCam; return 1`);
  await wait(1500); await shot('fx-plague');
  // Life: lose a war in view, then a plague.
  const today = new Date().toLocaleDateString('sv');
  console.log(await js(`leaveChaos(); S = { ...fresh(), mapSeed: 99, gender: 'f', traits: { health: 3, green: 3, charm: 3, trade: 3, luck: 3 }, era: 4, houses: 16, coins: 900, lastDay: '${today}', days: 30 };
    applyLayout(S.mapSeed); carveGroves(); ensureLots(S.houses); S.friends = Array.from({ length: 16 }, () => ({ f: 1, day: '' })); spawnFamily(); spawnAnimals(); spawnCars(); cache.dirty = true; $('mode').hidden = true; $('pick').hidden = true; paintUi(); wake();
    const last = lotX(S.houses - 1); lifeCam = { x: Math.max(0, last * T - 140), until: Date.now() + 1e6 }; camX = lifeCam.x; return S.houses;`));
  await wait(800);
  console.log('war', await js(`const r = Math.random; const seq = [0.001, 0.999, 0.3]; let q = 0; Math.random = () => (q < seq.length ? seq[q++] : r()); try { war(); } finally { Math.random = r; } return S.houses + ' ruins ' + S.ruins + ' collapses ' + collapses.length;`));
  await wait(500); await shot('fx-war-1');
  await wait(2200); await shot('fx-war-2');
  console.log('plague', await js(`const r = Math.random; let n = 0; Math.random = () => (n++ < 3 ? 0.0001 : r()); try { epidemic(); } finally { Math.random = r; } return tombs.length + ' tombs, green ' + people.filter(p => p.plague).length;`));
  await js(`const p = people.find(e => e.plague); if (p) { lifeCam = { x: Math.max(0, p.x - 120), until: Date.now() + 1e6 }; camX = lifeCam.x; } return 1`);
  await wait(700); await shot('fx-life-plague');
  console.log(JSON.stringify({ errors: [...new Set(errors)] }));
  app.exit(0);
});
