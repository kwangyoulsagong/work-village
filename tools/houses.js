// Offscreen: nothing ever shows on screen.
// Usage: npx electron tools/houses.js [game dir] [out dir]   (offscreen: no window ever shows)
const GAME = process.argv[2] || require('path').join(__dirname, '..', 'aquila');
const OUT = process.argv[3] || require('path').join(__dirname, 'out');
require('fs').mkdirSync(OUT, { recursive: true });
const { app, BrowserWindow } = require('electron');
const path = require('path'), fs = require('fs');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
app.dock?.hide();
app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 500, height: 900, show: false, webPreferences: { offscreen: true, preload: path.join(__dirname, 'preload.js'), contextIsolation: false, sandbox: false } });
  const errors = [];
  win.webContents.on('console-message', (e) => { if (e.level === 'error') errors.push(e.message); });
  await win.loadFile(path.join(GAME, 'index.html'));
  await wait(1000);
  const url = await win.webContents.executeJavaScript(`(() => { try {
    const rowH = 64, c = document.createElement('canvas'); c.width = 15 * T; c.height = 6 * rowH;
    const g = c.getContext('2d');
    const keep = S.era;
    for (let era = 0; era < 6; era++) {
      S.era = era;
      g.fillStyle = era % 2 ? '#79b85a' : '#82c062'; g.fillRect(0, era * rowH, c.width, rowH);
      g.fillStyle = '#a5a5ad'; g.fillRect(0, era * rowH + rowH - 6, c.width, 6);
      const bottom = era * rowH + rowH - 7;
      [0, 3, 6, 9].forEach((tx, i) => house(g, tx + (i === 0 ? 0 : 0), 2, false, bottom));
      house(g, 12, 3, true, bottom);
    }
    S.era = keep;
    const b = document.createElement('canvas'); b.width = c.width * 3; b.height = c.height * 3;
    const bg = b.getContext('2d'); bg.imageSmoothingEnabled = false; bg.drawImage(c, 0, 0, b.width, b.height);
    return b.toDataURL();
  } catch (e) { return 'ERR ' + e.stack; } })()`);
  if (url.startsWith('ERR')) console.log(url); else fs.writeFileSync(path.join(OUT, 'houses.png'), Buffer.from(url.split(',')[1], 'base64'));
  console.log(JSON.stringify({ errors }));
  app.exit(0);
});
