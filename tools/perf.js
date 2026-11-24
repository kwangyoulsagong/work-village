// Offscreen: nothing ever shows on screen. Measures fps and frame cost.
// Usage: npx electron tools/perf.js [game dir] [out dir]   (offscreen: no window ever shows)
const GAME = process.argv[2] || require('path').join(__dirname, '..', 'aquila');
const OUT = process.argv[3] || require('path').join(__dirname, 'out');
require('fs').mkdirSync(OUT, { recursive: true });
const { app, BrowserWindow } = require('electron');
const path = require('path'), fs = require('fs');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
app.dock?.hide();
app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 560, height: 1000, show: false,
    webPreferences: { offscreen: true, preload: path.join(__dirname, 'preload.js'), contextIsolation: false, sandbox: false, backgroundThrottling: false } });
  win.webContents.setFrameRate(60);
  const errors = [];
  win.webContents.on('console-message', (e) => { if (e.level === 'error') errors.push(e.message); });
  await win.loadFile(path.join(GAME, 'index.html'));
  const js = (c) => win.webContents.executeJavaScript(c);
  await js('localStorage.clear()'); await win.webContents.reload(); await wait(1200);
  await js(`(() => {
    window.__frames = []; const orig = frame;
    window.frame = function () { const t = performance.now(); orig(); window.__frames.push(performance.now() - t); };
    window.__paint = []; const op = paintCache;
    window.paintCache = function () { const t = performance.now(); op(); window.__paint.push(performance.now() - t); };
  })()`);
  const measure = async (label, setup, ms = 5000) => {
    await js(setup);
    await wait(1500);
    await js(`window.__frames = []; window.__paint = []; window.__t0 = performance.now();`);
    await wait(ms);
    const r = await js(`(() => { const f = window.__frames, s = (performance.now() - window.__t0) / 1000;
      const sorted = [...f].sort((a, b) => a - b);
      return { fps: Math.round(f.length / s), avgMs: +(f.reduce((a, b) => a + b, 0) / f.length).toFixed(2), p95Ms: +sorted[Math.floor(f.length * 0.95)].toFixed(2), maxMs: +sorted[f.length - 1].toFixed(2),
        repaints: window.__paint.length, repaintMs: window.__paint.length ? +Math.max(...window.__paint).toFixed(1) : 0,
        people: people.length, animals: animals.length }; })()`);
    console.log(label, JSON.stringify(r));
  };
  const today = new Date().toLocaleDateString('sv');
  await measure('town   ', `(() => {
    S = { ...fresh(), gender: 'f', traits: rollTraits(), era: 3, houses: 26, chickens: 6, cows: 3, sheep: 3, pigs: 2, goats: 3, horses: 2, dog: true, cat: true, spouse: 1, kids: 3, kidAges: [16, 8, 2],
      landmarks: ['temple', 'castle', 'factory'], farm: ['scarecrow', 'field2', 'orchard', 'beehive', 'field3', 'sprinkler', 'field4'], season: 1, lastDay: '${today}', cleared: [] };
    applyLayout(S.mapSeed); carveGroves(); ensureLots(S.houses); S.friends = Array.from({ length: 26 }, () => ({ f: 3, day: '' }));
    spawnFamily(); spawnAnimals(); spawnCars(); weather = 'rain'; cache.dirty = true; $('pick').hidden = true; $('mode').hidden = true; paintUi(); wake(); })()`);
  // A full repaint (as after building something) every second, to see its cost.
  await measure('repaint', `window.__rp = setInterval(() => (cache.dirty = true), 1000)`);
  await js('clearInterval(window.__rp)');
  await measure('chaos  ', `(() => { enterChaos(5); weather = 'storm';
    const [x, y] = lotCenter(2); chaosTool = 'nuke'; useTool(x, y); chaosTool = 'tornado'; useTool(lotCenter(5)[0], 110); chaosTool = 'plague'; useTool(lotCenter(1)[0], 105); })()`);
  console.log(JSON.stringify({ errors }));
  app.exit(0);
});
