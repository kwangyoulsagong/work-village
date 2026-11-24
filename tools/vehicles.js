// Offscreen: every vehicle type (and what flies) in one view, both directions, by era; plus woods at night.
// Usage: npx electron tools/vehicles.js [game dir] [out dir]   (offscreen: no window ever shows)
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
  const today = new Date().toLocaleDateString('sv');
  await js(`S = { ...fresh(), mapSeed: 777, gender: 'f', traits: { health: 3, green: 3, charm: 3, trade: 3, luck: 3 }, era: 4, houses: 10, lastDay: '${today}', days: 9 };
    applyLayout(S.mapSeed); carveGroves(); ensureLots(S.houses); spawnFamily(); spawnAnimals(); cache.dirty = true; $('mode').hidden = true; $('pick').hidden = true; paintUi(); fitCanvas(); wake(); return 1;`);
  await wait(800);
  const sets = { a: ['runner', 'bike', 'horse', 'ox', 'carriage', 'oldcar'], b: ['car', 'taxi', 'police', 'bus', 'truck', 'moto'], c: ['hover', 'hovermoto', 'hoverbus', 'drone', 'drone', 'runner'],
    d: ['sled', 'chariot', 'donkey', 'palanquin', 'wagon', 'rickshaw'], e: ['tram', 'firetruck', 'icecream', 'sports', 'ambulance', 'pod'], f: ['walker', 'hoverboard', 'eagle', 'kite', 'balloon', 'airship'],
    g: ['biplane', 'plane', 'heli', 'skycar', 'shuttle', 'eagle'] };
  for (const [name, list] of Object.entries(sets)) {
    await js(`people = []; me.hidden = true; const x0 = (HOME.x + 30) * T; lifeCam = { x: x0, until: Date.now() + 1e6 }; camX = x0;
      const L = ${JSON.stringify(list)}; cars = L.map((type, i) => ({ type, x: x0 + 4 + i * 39, right: i % 2 === 0, v: 0.0001, c: CAR_COLOURS[i * 3 % CAR_COLOURS.length], look: villagerLook(900 + i, { hair: HAIRS[i], top: TOPS[i], legs: LEG_COLORS[i] }, i % 2 ? 'm' : 'f'), gender: i % 2 ? 'm' : 'f', f: 0, ofs: 0, sky: VEHICLE[type].sky ? 30 + (i % 3) * 14 : 0 })); return cars.length;`);
    await wait(700);
    await shot('vehicles-' + name);
  }
  console.log(JSON.stringify({ errors: [...new Set(errors)] }));
  app.exit(0);
});
