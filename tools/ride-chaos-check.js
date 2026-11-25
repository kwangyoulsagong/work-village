// Offscreen: chaos tools reach people on foot near a fire and everyone riding on the road.
const GAME = require('path').join(__dirname, '..', 'aquila');
const { app, BrowserWindow } = require('electron');
const path = require('path');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
app.dock?.hide();
app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 560, height: 1000, show: false,
    webPreferences: { offscreen: true, preload: path.join(__dirname, 'preload.js'), contextIsolation: false, sandbox: false } });
  const errors = [];
  win.webContents.on('console-message', (e) => { if (e.level === 'error') errors.push(e.message); });
  await win.loadFile(path.join(GAME, 'index.html'));
  const js = (c) => win.webContents.executeJavaScript(c);
  await js('localStorage.clear()'); await win.webContents.reload(); await wait(1200);
  await js(`document.getElementById('modeChaos').click()`); await wait(300);
  await js(`[...document.querySelectorAll('#eraButtons button')][3].click()`); await wait(2000);
  const res = {};
  // Fire on a walker: they burn.
  res.fire = await js(`(() => {
    const e = people.find((p) => p.kind === 'villager' && !p.hidden && !p.zombie);
    chaosTool = 'fire'; useTool(e.x, e.y - 8);
    return { burning: people.filter((p) => p.burning > 0).length };
  })()`);
  for (const tool of ['fire', 'smash', 'fling', 'plague', 'zombie', 'bolt', 'tornado', 'banana']) {
    res[tool + 'Ride'] = await js(`(() => {
      const c = cars.find((c) => !c.sky && c.type !== 'runner');
      if (!c) return 'no ride';
      const [x, y] = rideAt(c);
      const before = cars.length, folk = people.length, gone = S.chaosStats.people;
      chaosTool = '${tool}'; useTool(x, y);
      return { type: c.type, unseated: before - cars.length, stillThere: cars.includes(c), burning: people.filter((p) => p.burning > 0).length, sick: people.filter((p) => p.sick).length, fell: S.chaosStats.people - gone };
    })()`);
    await wait(tool === 'zombie' || tool === 'tornado' ? 1500 : 200);
  }
  await wait(2500);
  res.after = await js('({ ...S.chaosStats, people: people.length, cars: cars.length, zombies: people.filter((p) => p.zombie).length })');
  console.log(JSON.stringify({ errors, res }, null, 1));
  app.exit(0);
});
