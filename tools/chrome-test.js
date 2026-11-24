// Usage: npx electron tools/chrome-test.js [game dir] [out dir]   (offscreen: no window ever shows)
const GAME = process.argv[2] || require('path').join(__dirname, '..', 'chrome');
const OUT = process.argv[3] || require('path').join(__dirname, 'out');
require('fs').mkdirSync(OUT, { recursive: true });
const { app, BrowserWindow } = require('electron');
const path = require('path');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
app.dock?.hide();
app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 400, height: 900, show: false,
    webPreferences: { offscreen: true, preload: path.join(__dirname, 'chrome-preload.js'), contextIsolation: false, sandbox: false } });
  const errors = [];
  win.webContents.on('console-message', (e) => { if (e.level === 'error') errors.push(e.message); });
  await win.loadFile(path.join(GAME, 'sidepanel.html'));
  await wait(1000);
  const js = (c) => win.webContents.executeJavaScript(c);
  await js(`document.querySelector('#pick button[data-gender=m]').click()`);
  await wait(500);
  const before = await js('S.coins');
  await js(`chrome.storage.local.set({ minutes: 0 })`); await wait(200);
  await js(`chrome.storage.local.set({ minutes: 120 })`); await wait(1500);
  const after = await js('S.coins');
  const saved = await js(`!!window.__chromeData['game:save']`);
  // With the local helper's usage: the town grows with Claude / Codex instead.
  await js(`chrome.storage.local.set({ live: { host: true, claude: { weekly: 5, fiveHour: 15, at: Date.now() } } })`); await wait(500);
  const base = await js('S.coins');
  await js(`chrome.storage.local.set({ live: { host: true, claude: { weekly: 8, fiveHour: 20, at: Date.now() } } })`); await wait(1500);
  const live = await js('S.coins');
  console.log(JSON.stringify({ claudeUp3pct: Math.round(live - base), source: await js('window.VILLAGE_SOURCE') }));
  console.log(JSON.stringify({ errors, before, after: Math.round(after), saved, badge: await js('window.__badge'), hint: await js(`document.getElementById('hint').textContent.slice(0, 20)`) }));
  app.exit(0);
});
