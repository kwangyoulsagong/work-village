// Offscreen: nothing ever shows on screen.
// Usage: npx electron tools/jobs-sheet.js [game dir] [out dir]   (offscreen: no window ever shows)
const GAME = process.argv[2] || require('path').join(__dirname, '..', 'aquila');
const OUT = process.argv[3] || require('path').join(__dirname, 'out');
require('fs').mkdirSync(OUT, { recursive: true });
const { app, BrowserWindow } = require('electron');
const path = require('path'), fs = require('fs');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
app.dock?.hide();
app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 560, height: 900, show: false,
    webPreferences: { offscreen: true, preload: path.join(__dirname, 'preload.js'), contextIsolation: false, sandbox: false } });
  const errors = [];
  win.webContents.on('console-message', (e) => { if (e.level === 'error') errors.push(e.message); });
  await win.loadFile(path.join(GAME, 'index.html'));
  await wait(1200);
  const url = await win.webContents.executeJavaScript(`(() => { try {
    const c = document.createElement('canvas'); c.width = 6 * 34 + 4; c.height = 4 * 44 + 4;
    const g = c.getContext('2d'); g.fillStyle = '#86c06a'; g.fillRect(0, 0, c.width, c.height);
    JOBS.forEach((j, i) => {
      const col = i % 6, row = Math.floor(i / 6);
      const looks = [{ hair: '#3a2418' }, { hair: '#7a4a2a' }, { hair: '#1f1b2b' }, { hair: '#5a3022' }];
      const e = { kind: 'villager', x: 16 + col * 34, y: 30 + row * 44, dir: j.tool === 'pray' ? 'd' : 'r', frame: 0, path: [], seed: 0, gender: i % 2 ? 'm' : 'f', job: j };
      const at = drawPerson(g, e, { ...looks[i % 4], top: j.top, legs: '#4b4560' });
      drawGear(g, j, at.x, at.y, at.side, at.flip);
      const act = { tool: j.tool, n: 12, t: 9 };
      if (j.tool && !drawJobTool(g, e, act) && !drawWork(g, e, act)) drawAction(g, e, act);
    });
    const big = document.createElement('canvas'); big.width = c.width * 4; big.height = c.height * 4;
    const bg = big.getContext('2d'); bg.imageSmoothingEnabled = false; bg.drawImage(c, 0, 0, big.width, big.height);
    return big.toDataURL();
  } catch (e) { return 'ERR ' + e.stack; } })()`);
  if (url.startsWith('ERR')) console.log(url);
  else fs.writeFileSync(path.join(OUT, '47-jobs.png'), Buffer.from(url.split(',')[1], 'base64'));
  console.log(JSON.stringify({ errors }));
  app.exit(0);
});
