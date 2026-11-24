// Offscreen: nothing ever shows on screen. Plays the chaos mode by clicking.
// Usage: npx electron tools/chaos-test.js [game dir] [out dir]   (offscreen: no window ever shows)
const GAME = process.argv[2] || require('path').join(__dirname, '..', 'aquila');
const OUT = process.argv[3] || require('path').join(__dirname, 'out');
require('fs').mkdirSync(OUT, { recursive: true });
const { app, BrowserWindow } = require('electron');
const path = require('path'), fs = require('fs');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
app.dock?.hide();
app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 560, height: 1000, show: false,
    webPreferences: { offscreen: true, preload: path.join(__dirname, 'preload.js'), contextIsolation: false, sandbox: false } });
  win.webContents.setFrameRate(30);
  const errors = [];
  win.webContents.on('console-message', (e) => { if (e.level === 'error') errors.push(e.message); });
  await win.loadFile(path.join(GAME, 'index.html'));
  const js = (c) => win.webContents.executeJavaScript(c);
  await js('localStorage.clear()'); await win.webContents.reload(); await wait(1200);
  const out = OUT;
  const page = async (n) => fs.writeFileSync(path.join(out, n + '.png'), (await win.webContents.capturePage()).toPNG());
  const view = async (name) => {
    const url = await js(`(() => { const c = document.createElement('canvas'); c.width = VIEW_W; c.height = H; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(canvas, 0, 0, VIEW_W, H); return c.toDataURL(); })()`);
    fs.writeFileSync(path.join(out, name + '.png'), Buffer.from(url.split(',')[1], 'base64'));
  };
  await page('c0-mode');
  await js(`document.getElementById('modeChaos').click()`); await wait(300);
  await page('c1-era');
  await js(`[...document.querySelectorAll('#eraButtons button')][3].click()`); await wait(3000);
  await page('c2-town');
  // Click on the map: (wx, wy) world px → client coords.
  const click = (tool, wx, wy) => js(`(() => {
    chaosTool = '${tool}';
    const r = canvas.getBoundingClientRect();
    const x = r.left + ((${wx} - camX) / VIEW_W) * r.width, y = r.top + (${wy} / H) * r.height;
    canvas.dispatchEvent(new MouseEvent('click', { clientX: x, clientY: y, bubbles: true }));
  })()`);
  const lot = (i) => js(`[LOT_X[${i}] * T + T, ROAD_Y * T - 16]`);
  let [x, y] = await lot(0); await click('smash', x, y); await wait(600); await view('c3-smash');
  await click('fire', ...(await lot(2))); await wait(700); await view('c4-fire');
  await click('banana', (await lot(1))[0], 6 * 16 + 10); await click('banana', (await lot(3))[0], 6 * 16 + 10);
  await click('zombie', (await lot(4))[0], 6 * 16 + 12); await wait(3500); await view('c5-zombie');
  await click('plague', (await lot(5))[0] + 30, 6 * 16 + 10); await wait(1200); await view('c6-plague');
  await click('tornado', (await lot(6))[0], 6 * 16 + 12); await wait(1500); await view('c7-tornado');
  await click('bolt', ...(await lot(7))); await wait(300); await view('c8-bolt');
  await click('meteor', (await lot(8))[0], 7 * 16); await wait(1100); await view('c9-meteor');
  await click('sign', (await lot(9))[0], 6 * 16 + 14); await wait(200);
  await js(`document.getElementById('signText').value = '사공 다녀감 ㅋㅋ'; document.getElementById('signOk').click()`); await wait(400);
  await click('nuke', (await lot(10))[0], 6 * 16); await wait(900); await view('c10-nuke');
  await wait(3500); await view('c11-after');
  await page('c12-panel');
  const st = await js('({ ...S.chaosStats, signs: S.signs.length, wrecked: S.wrecked.length, people: people.length })');
  // Back to life: the life town is untouched.
  await js(`document.getElementById('chaosExit').click()`); await wait(800);
  const life = await js('({ mode: MODE, wrecked: S.wrecked, houses: S.houses })');
  console.log(JSON.stringify({ errors, st, life }));
  app.exit(0);
});
