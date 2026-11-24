// Offscreen: the panel in each era at a few widths, to see crowding and broken chips.
// Usage: npx electron tools/eras.js [game dir] [out dir]   (offscreen: no window ever shows)
const GAME = process.argv[2] || require('path').join(__dirname, '..', 'aquila');
const OUT = process.argv[3] || require('path').join(__dirname, 'out');
require('fs').mkdirSync(OUT, { recursive: true });
const { app, BrowserWindow } = require('electron');
const path = require('path'), fs = require('fs');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
app.dock?.hide();
app.whenReady().then(async () => {
  const errors = [];
  const win = new BrowserWindow({ width: 360, height: 900, show: false, useContentSize: true,
    webPreferences: { offscreen: true, preload: path.join(__dirname, 'preload.js'), contextIsolation: false, sandbox: false } });
  win.webContents.on('console-message', (e) => { if (e.level >= 2 || e.level === 'error') errors.push(e.message); });
  const today = new Date().toLocaleDateString('sv');
  for (const [era, houses] of [[0, 4], [1, 9], [2, 16], [3, 22], [4, 30], [5, 40]]) for (const w of era === 3 || era === 0 ? [300, 360, 420] : [360]) {
    win.setContentSize(w, 900);
    await win.loadFile(path.join(GAME, 'index.html'));
    await wait(800);
    await win.webContents.executeJavaScript(`(() => { try {
      S = { ...fresh(), mapSeed: 4242, gender: 'm', traits: { health: 3, green: 4, charm: 5, trade: 3, luck: 2 }, era: ${era}, houses: 0, season: 1, chickens: 4, cows: 2, sheep: 2, dog: true, spouse: 1, kids: 2, kidAges: [9, 2],
        landmarks: LANDMARKS.filter((l) => l.era <= ${era}).map((l) => l.id), coins: 40, pocket: 1234, xp: 2400, days: 34, age: 34, lastDay: '${today}', stock: { wood: 1234, stone: 567, fish: 5, berries: 9 } };
      applyLayout(S.mapSeed); carveGroves();
      for (let i = 0; i < ${houses}; i++) { if (wantClearing()) { S.coins += clearCost(); clearWoods(); } ensureLots(i + 1); S.houses = i + 1; }
      S.friends = Array.from({ length: S.houses }, () => ({ f: 3, day: '' }));
      updateMyJob(true); spawnFamily(); spawnAnimals(); spawnCars(); cache.dirty = true; $('mode').hidden = true; $('pick').hidden = true; paintUi(); fitCanvas(); wake();
    } catch (e) { console.error(e.stack); } })()`);
    await wait(2500);
    fs.writeFileSync(path.join(OUT, `era${era}-${w}.png`), (await win.webContents.capturePage()).toPNG());
  }
  console.log(JSON.stringify({ errors }));
  app.exit(0);
});
