// Offscreen: nothing ever shows on screen.
// Usage: npx electron tools/maps.js [game dir] [out dir]   (offscreen: no window ever shows)
const GAME = process.argv[2] || require('path').join(__dirname, '..', 'aquila');
const OUT = process.argv[3] || require('path').join(__dirname, 'out');
require('fs').mkdirSync(OUT, { recursive: true });
const { app, BrowserWindow } = require('electron');
const path = require('path'), fs = require('fs');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
app.dock?.hide();
app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 420, height: 900, show: false, webPreferences: { offscreen: true, preload: path.join(__dirname, 'preload.js'), contextIsolation: false, sandbox: false } });
  const errors = [];
  win.webContents.on('console-message', (e) => { if (e.level === 'error') errors.push(e.message); });
  await win.loadFile(path.join(GAME, 'index.html'));
  await wait(1000);
  for (const [name, seed, era, houses, season] of [['50-map-a', 1234, 3, 24, 1], ['51-map-b', 98765, 4, 30, 2]]) {
    const url = await win.webContents.executeJavaScript(`(() => { try {
      S = { ...fresh(), mapSeed: ${seed}, gender: 'f', traits: rollTraits(), era: ${era}, houses: 0, season: ${season}, chickens: 6, cows: 3, sheep: 3, pigs: 2, goats: 2, horses: 2,
        landmarks: LANDMARKS.filter((l) => l.era <= ${era}).map((l) => l.id), farm: FARM_UPGRADES.filter((u) => u.era <= ${era}).map((u) => u.id), cleared: [], lots: [] };
      applyLayout(S.mapSeed); carveGroves();
      // Grow the town house by house, clearing woods every six like the game does.
      for (let i = 0; i < ${houses}; i++) { if (wantClearing()) { S.coins += clearCost(); clearWoods(); } ensureLots(i + 1); S.houses = i + 1; }
      S.plots = Array.from({ length: plotCount() }, (_, i) => ({ planted: i % 4 !== 3, g: [30, 20, 8][i % 3] }));
      ground.key = ''; paintCache(); return cache.canvas.toDataURL();
    } catch (e) { return 'ERR ' + e.stack; } })()`);
    if (url.startsWith('ERR')) console.log(url); else fs.writeFileSync(path.join(OUT, name + '.png'), Buffer.from(url.split(',')[1], 'base64'));
  }
  console.log(JSON.stringify({ errors }));
  app.exit(0);
});
