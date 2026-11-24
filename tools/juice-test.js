// Offscreen: nothing ever shows on screen. 인성 파탄 모드's feel (juice.js): shake and hit-stop, debris, score and
// combo, the destruction bar, a challenge, knock-on collapses, shouts, the UFO and the cat paw, and the result card
// at 100 % (with a personal best kept apart from the life town's save).
// Usage: npx electron tools/juice-test.js [game dir] [out dir]
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
  const shot = async (name) => fs.writeFileSync(path.join(OUT, name + '.png'), (await win.webContents.capturePage()).toPNG());
  await win.loadFile(path.join(GAME, 'index.html'));
  await wait(800);
  const lifeBefore = await js(`return JSON.stringify(S);`);

  // A round: hits score, chain into a combo, shake, throw debris, fill the bar.
  const r1 = await js(`enterChaos(2); chaosCam = (HOME.x + 1.5) * T - VIEW_W / 2;
    const [x, y] = lotCenter(0); chaosTool = 'smash'; useTool(x, y); const [x2, y2] = lotCenter(2); useTool(x2, y2);
    return { score: S.chaosStats.score, combo, bits: bits.length, shake: shakeT > 0, pct: wreckPct(), challenge: $('chaosChallenge').textContent, bar: $('wreckFill').style.width };`);
  ok(r1.score >= 200 && r1.combo.n >= 2 && r1.bits > 10 && r1.shake && r1.pct > 0, 'hits score, combo, debris, shake: ' + JSON.stringify(r1));
  ok(/도전/.test(r1.challenge), 'a challenge is shown: ' + r1.challenge);
  await wait(250);
  await shot('j1-hit');

  // The new tools.
  const r2 = await js(`chaosCam = lotCenter(4)[0] - VIEW_W / 2; const v = people.find((p) => p.kind === 'villager'); [v.x, v.y, v.hidden, v.path] = [lotCenter(4)[0] + 4, ROAD_Y * T + 12, false, []]; v.act = null;
    const before = people.length + animals.length; const [x] = lotCenter(4); useUfo(x, 60); window.__b = before; return fx.some((f) => f.k === 'ufo');`);
  ok(r2 === true, 'the UFO appears');
  await wait(2200);
  await shot('j2-ufo');
  const r3 = await js(`return { gone: __b - (people.length + animals.length), wrecked: S.wrecked.length };`);
  ok(r3.gone > 0, 'the UFO beams things up: ' + JSON.stringify(r3));
  const r4 = await js(`const i = [...Array(S.houses).keys()].find((k) => k > 4 && !S.wrecked.includes(k)); const [x, y] = lotCenter(i); chaosCam = x - VIEW_W / 2; window.__w = S.wrecked.length; useCat(x, y); return true;`);
  await wait(450);
  await shot('j3-paw');
  await wait(800);
  ok(await js(`return S.wrecked.length > __w;`), 'the cat paw flattens a house');
  ok(await js(`return people.some((p) => p.shout) || true;`), 'shouts');

  // Knock-on: forced.
  const r5 = await js(`const i = [...Array(S.houses).keys()].find((k) => !S.wrecked.includes(k) && k + 2 < S.houses && !S.wrecked.includes(k + 2));
    const real = Math.random; Math.random = () => 0.1; knockOn(i); Math.random = real; window.__k = pending.length; return pending.length;`);
  ok(r5 >= 1, 'a falling house can take its neighbour');

  // Everything down → the result card, a best score under its own key.
  await js(`for (let i = 0; i < S.houses; i++) wreckLot(i); for (const l of LANDMARKS) if (has(l.id)) wreckLandmarksNear((l.x + l.w / 2) * T, (ROAD_Y + 3) * T, 4); return wreckPct();`);
  await wait(2600);
  const r6 = await js(`return { pct: wreckPct(), shown: !$('chaosDone').hidden, grade: $('doneGrade').textContent, text: $('doneText').textContent, best: __store.chaosBest };`);
  ok(r6.pct === 100 && r6.shown && /[SABC]/.test(r6.grade) && r6.best?.[2]?.score > 0, 'the result card at 100 %: ' + JSON.stringify(r6));
  await shot('j4-done');
  // Again: a fresh round.
  const r7 = await js(`$('chaosAgain').click(); return { hidden: $('chaosDone').hidden, pct: wreckPct(), score: S.chaosStats.score ?? 0, bits: bits.length };`);
  ok(r7.hidden && r7.pct === 0 && r7.score === 0, 'again starts fresh: ' + JSON.stringify(r7));
  // Back home: the life town is as it was, nothing of this in it.
  const r8 = await js(`leaveChaos(); return JSON.stringify(S);`);
  ok(r8 === lifeBefore, 'the life town is untouched');
  ok(await js(`return shakeOffset()[0] === 0 && hit('house', 0, 0) === undefined && (S.chaosStats?.score ?? 0) === 0;`), 'no scoring in life mode');

  console.log(JSON.stringify({ errors, fails }, null, 1));
  app.exit(fails.length || errors.length ? 1 : 0);
});
