// Offscreen: nothing ever shows on screen. Free time (home.js): what you pick varies (never the same twice running),
// going home shows the inside of the house in every era and every pastime, coming out again, neighbours' books and
// kites, and none of it in chaos mode. Usage: npx electron tools/home-test.js [game dir] [out dir]
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
  const today = new Date().toLocaleDateString('sv');
  const town = (era) => `
    S = { ...fresh(), sea: null, mapSeed: 6060, gender: 'f', temper: 'loner', traits: { health: 3, green: 4, charm: 3, trade: 3, luck: 4 }, era: ${era}, houses: 0, coins: 50,
      xp: 900, days: 9, age: 9, lastDay: '${today}', dog: true, dogBreed: 'shiba', cat: true, spouse: 1, kids: 1, kidAges: [5], chickens: 3, skin: '#d99a6c', hair: '#c8642a' };
    applyLayout(S.mapSeed); carveGroves(); for (let i = 0; i < 6; i++) { ensureLots(i + 1); S.houses = i + 1; }
    S.friends = Array.from({ length: S.houses }, () => ({ f: 4, day: '${today}' }));
    updateMyJob(true); spawnFamily(); spawnAnimals(); spawnCars(); cache.dirty = true; $('mode').hidden = true; $('pick').hidden = true; paintUi(); fitCanvas(); wake(); window.scrollTo(0, 0);`;
  await win.loadFile(path.join(GAME, 'index.html'));
  await wait(800);
  // Variety: many picks, several kinds, never the same twice running.
  const v = await js(town(2) + `const seen = []; for (let i = 0; i < 60; i++) { const t = leisureTask(); seen.push(t.what); if (!/집에 들어가/.test(t.what)) t.act(); else lastLeisure = 'home'; }
    const kinds = new Set(seen).size; const repeats = seen.filter((w, i) => i && w === seen[i - 1]).length; return { kinds, repeats };`);
  ok(v.kinds >= 7 && v.repeats === 0, 'free time varies: ' + JSON.stringify(v));
  // Inside, every era.
  for (let era = 0; era <= 5; era++) {
    const r = await js(town(era) + `lifeCam = null; const said = goInside(); homeStay.hobby = HOBBIES[${era} % HOBBIES.length].id; if (homeStay.hobby === 'game' && S.era < 4) homeStay.hobby = 'nap'; return { said, inside: insideView(), hidden: me.hidden, hobby: homeStay.hobby };`);
    ok(r.inside && r.hidden, `inside in era ${era}: ` + JSON.stringify(r));
    await wait(500);
    const url = await js(`return document.getElementById('world').toDataURL()`);
    fs.writeFileSync(path.join(OUT, `home-${era}.png`), Buffer.from(url.split(',')[1], 'base64'));
  }
  // Dragging the view away shows the town; coming out again after the stay.
  const out = await js(`moveCam(0); const town = !insideView(); lifeCam = null; homeStay.t = 1; homeTick(); return { town, inside: insideView(), hidden: me.hidden };`);
  ok(out.town && !out.inside && !out.hidden, 'drag shows the town; out again after: ' + JSON.stringify(out));
  // Neighbours: a book and a kite.
  const nb = await js(town(2) + `weather = 'sun'; const p = people.find((x) => x.kind === 'villager' && !x.small); const opts = []; leisureOptions(p, (...a) => opts.push(a), false); return opts.map((o) => o[1]);`);
  ok(nb.includes('read') && nb.includes('kite'), 'neighbours read and fly kites: ' + nb.join());
  // None of it in chaos mode.
  const c = await js(`enterChaos(2); const t = leisureTask(); const r = { t, home: homeStay }; leaveChaos(); return r;`);
  ok(!c.t && !c.home, 'no free time in chaos mode');
  console.log(JSON.stringify({ errors, fails }, null, 1));
  app.exit(fails.length || errors.length ? 1 : 0);
});
