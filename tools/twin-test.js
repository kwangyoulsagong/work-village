// Offscreen: nothing ever shows on screen. The same town open twice (Aquila's panel and its float window, or two Chrome
// windows): a purchase in one survives the other copy saving later; that copy takes the newer town up instead.
// Usage: npx electron tools/twin-test.js [game dir]
const GAME = process.argv[2] || require('path').join(__dirname, '..', 'aquila');
const { app, BrowserWindow } = require('electron');
const path = require('path');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
app.dock?.hide();
app.whenReady().then(async () => {
  const fails = [];
  const errors = [];
  const ok = (cond, what) => { if (!cond) fails.push(what); };
  // Both windows share one session, so the stand-in's saves (localStorage) are shared like Aquila's storage.
  const open = async () => {
    const win = new BrowserWindow({ width: 380, height: 900, show: false,
      webPreferences: { offscreen: true, preload: path.join(__dirname, 'preload.js'), contextIsolation: false, sandbox: false } });
    win.webContents.setFrameRate(10);
    win.webContents.on('console-message', (e) => { if (e.level === 'error' || e.level >= 3) errors.push(e.message); });
    await win.loadFile(path.join(GAME, 'index.html'));
    await wait(1200);
    return (code) => win.webContents.executeJavaScript(`(async () => { try { ${code} } catch (e) { return 'ERR ' + e.message; } })()`);
  };
  const a = await open();
  await a(`localStorage.clear(); S = fresh(); S.coins = 100; S.era = 1; save(); await new Promise((r) => setTimeout(r, 1200)); return true`);
  // Two Chrome windows: B opened before A, both from the same save. A, opened last, leads.
  const b = await open();
  const a2 = await open();
  ok((await a2(`return S.coins`)) === 100 && (await b(`return S.coins`)) === 100, 'both copies load the town');
  ok(await a2(`return buyFurniture('rug_fur')`), 'A buys the rug');
  await wait(1500);
  ok((await a2(`return (await aquila.storage.get('save')).furnOwned?.join()`)) === 'rug_fur', 'the rug is on disk');
  // B, opened before, saves later: it must not write the rug away; it stops and says another window has the town.
  await b(`S.coins += 5; save(); return true`);
  await wait(1500);
  const disk = await a2(`return await aquila.storage.get('save')`);
  ok(disk.furnOwned?.includes('rug_fur') && disk.coins !== 105, 'the rug survives the other copy: ' + JSON.stringify([disk.furnOwned, disk.coins]));
  const st = await b(`return [follower, !!document.getElementById('elsewhere'), raf, await aquila.storage.get('lead'), COPY]`); ok(st[0] && st[1] && !st[2], 'the other copy stands still under a cover ' + JSON.stringify(st));
  // Clicked into, an older copy notices at once.
  const c = await open();
  await wait(300);
  await a2(`document.dispatchEvent(new PointerEvent('pointerdown')); await new Promise((r) => setTimeout(r, 300)); return true`);
  ok(await a2(`return follower`), 'clicking into a copy that no longer leads stops it');
  // 여기서 하기 on B: B reloads with the rug and leads; C stops.
  await b(`document.querySelector('#elsewhere button').click(); return true`).catch(() => {});
  await wait(2500);
  ok((await b(`return !follower && S.furnOwned?.join()`)) === 'rug_fur', 'B takes over with the rug');
  await c(`save(); await new Promise((r) => setTimeout(r, 1200)); return true`);
  ok(await c(`return follower`), 'C, no longer leading, stops');
  await b(`S.coins = 77; save(); await new Promise((r) => setTimeout(r, 1200)); return true`);
  ok((await b(`return (await aquila.storage.get('save')).coins`)) === 77, 'the leading copy saves');
  if (errors.length) fails.push('console errors: ' + errors.slice(0, 3).join(' | '));
  console.log(fails.length ? 'FAIL\n- ' + fails.join('\n- ') : 'twin ok');
  app.exit(fails.length ? 1 : 0);
});
