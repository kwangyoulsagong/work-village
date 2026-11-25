// Offscreen: tap a villager in life mode (talk, sell, buy, ask out, propose), then 때리기 in chaos mode until K.O.
// Usage: npx electron tools/talk-test.js [out dir]
const OUT = process.argv[2] || require('path').join(__dirname, 'out');
const GAME = require('path').join(__dirname, '..', 'aquila');
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
  const shot = async (n) => fs.writeFileSync(path.join(OUT, n + '.png'), (await win.webContents.capturePage()).toPNG());
  const fails = [];
  const ok = (c, m) => c || fails.push(m);
  // A life town with neighbours and a harvest.
  await js(`document.getElementById('modeLife').click(); pickGender('f');`); await wait(300);
  await js(`S.coins = 500; S.bag = 5; S.houses = 4; S.era = 1; while (S.friends.length < 4) S.friends.push({ f: 0, day: '' }); ensureLots(4); spawnFamily(); cache.dirty = true;`); await wait(300);
  const life = await js(`(() => {
    const e = people.find((p) => p.who === 'h1a');
    e.hidden = false;
    openTalk(e);
    const card = !document.getElementById('talkCard').hidden;
    const names = [...document.querySelectorAll('#talkActions button')].map((b) => b.textContent);
    for (let i = 0; i < 5; i++) talk(e);
    const f1 = S.friends[1].f;
    const coins = S.coins; sellTo(e); const sold = S.coins - coins;
    const wood = S.stock.wood; buyFrom(e, 'wood'); const bought = S.stock.wood - wood;
    S.friends[1].f = 9; let tries = 0; while (S.myLover !== 1 && tries++ < 30) { S.friends[1].f = 9; askOut(e); }
    S.friends[1].f = 10; paintTalk();
    const names2 = [...document.querySelectorAll('#talkActions button')].map((b) => b.textContent);
    const held = e.held;
    propose(e);
    return { card, names, f1, sold, bought, lover: S.myLover, names2, held, spouse: S.spouse, open: !document.getElementById('talkCard').hidden };
  })()`);
  ok(life.card, 'card opens'); ok(life.f1 === 3, 'three talks a day count: ' + life.f1); ok(life.sold > 0, 'sell'); ok(life.bought === 3, 'buy');
  ok(!life.names.some((n) => n.includes('때리기')), 'no 때리기 in life mode'); ok(life.names2.some((n) => n.includes('청혼')), 'propose shows');
  ok(life.held, 'held while talking'); ok(life.spouse === 1, 'married'); ok(!life.open, 'card closes');
  // A tap on a villager on the canvas opens the card.
  const tap = await js(`(() => {
    const e = people.find((p) => p.kind === 'villager' && !p.hidden && p.x > camX + 10 && p.x < camX + VIEW_W - 10);
    if (!e) return 'none on screen';
    const r = canvas.getBoundingClientRect();
    canvas.dispatchEvent(new MouseEvent('click', { clientX: r.left + ((e.x - camX) / VIEW_W) * r.width, clientY: r.top + ((e.y - 8) / H) * r.height, bubbles: true }));
    const open = !document.getElementById('talkCard').hidden;
    return open;
  })()`);
  ok(tap === true || tap === 'none on screen', 'tap opens card: ' + tap);
  await shot('t1-life-card');
  await js('closeTalk()');
  // Chaos: 때리기 to K.O.
  await js(`document.getElementById('toChaos').click()`); await wait(200);
  await js(`[...document.querySelectorAll('#eraButtons button')][4].click()`); await wait(1500);
  const chaos = await js(`(() => {
    const e = people.find((p) => p.kind === 'villager' && !p.hidden && !p.zombie);
    chaosTool = 'talk'; useTool(e.x, e.y - 8);
    const names = [...document.querySelectorAll('#talkActions button')].map((b) => b.textContent);
    openFight(e);
    window.__e = e;
    return { names, open: !document.getElementById('fight').hidden, before: S.chaosStats.people };
  })()`);
  ok(chaos.names.some((n) => n.includes('때리기')), '때리기 in chaos'); ok(chaos.open, 'fight opens');
  const tapFace = (wx, wy) => js(`(() => { const c = document.getElementById('fightFace'); const r = c.getBoundingClientRect();
    c.dispatchEvent(new PointerEvent('pointerdown', { clientX: r.left + r.width * ${wx}, clientY: r.top + r.height * ${wy}, bubbles: true })); return __e.hp; })()`);
  for (let i = 0; i < 4; i++) await tapFace(0.4, 0.5);
  await wait(150); await shot('t2-fight-few');
  await js(`fight.weapon = 'pan'; paintFightUi()`);
  for (let i = 0; i < 4; i++) { await tapFace(0.6, 0.45); await wait(60); }
  await wait(100); await shot('t3-fight-hurt');
  let hp = 1; for (let i = 0; i < 20 && hp > 0; i++) hp = await tapFace(0.5, 0.55);
  await wait(300); await shot('t4-fight-ko');
  await wait(1500);
  const after = await js(`({ gone: !people.includes(__e), open: !document.getElementById('fight').hidden, fell: S.chaosStats.people })`);
  ok(after.gone && !after.open && after.fell > chaos.before, 'K.O. ghosts them: ' + JSON.stringify(after));
  // Leave chaos: the life town still married, nothing from chaos.
  await js(`document.getElementById('chaosExit').click()`); await wait(400);
  const back = await js(`({ mode: MODE, spouse: S.spouse, punches: S.chaosStats?.punches })`);
  ok(back.mode === 'life' && back.spouse === 1 && !back.punches, 'life untouched: ' + JSON.stringify(back));
  console.log(JSON.stringify({ errors, fails, life, chaos: chaos.names }, null, 1));
  app.exit(0);
});
