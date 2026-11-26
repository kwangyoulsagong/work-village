// Offscreen: tap a villager in life mode (talk, sell, buy, ask out, propose), then 때리기 in chaos mode until K.O.
// Usage: npx electron tools/talk-test.js [out dir]
const OUT = process.argv[2] || require('path').join(__dirname, 'out');
const GAME = require('path').join(__dirname, '..', 'aquila');
require('fs').mkdirSync(OUT, { recursive: true });
const { app, BrowserWindow } = require('electron');
const path = require('path'), fs = require('fs');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
app.dock?.hide();
process.on('unhandledRejection', (e) => { console.log('REJECT', String(e?.message ?? e)); app.exit(1); });
app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 560, height: 1000, show: false,
    webPreferences: { offscreen: true, preload: path.join(__dirname, 'preload.js'), contextIsolation: false, sandbox: false } });
  win.webContents.setFrameRate(30);
  const errors = [];
  win.webContents.on('console-message', (e) => { if (e.level === 'error') { errors.push(e.message); console.log('ERR', e.message); } });
  await win.loadFile(path.join(GAME, 'index.html'));
  const js = (c) => win.webContents.executeJavaScript(c);
  await js('localStorage.clear()'); await win.webContents.reload(); await wait(1200);
  const shot = async (n) => fs.writeFileSync(path.join(OUT, n + '.png'), (await win.webContents.capturePage()).toPNG());
  const fails = [];
  const ok = (c, m) => c || fails.push(m);
  // A brand-new town (no houses yet): only travellers on the road. A tap on one stops them for a chat.
  const road = await js(`(() => {
    const c = cars.find((c) => !c.sky && c.x > camX + 20 && c.x < camX + VIEW_W - 20) ?? cars.find((c) => !c.sky);
    if (!c) return 'no traveller';
    camX = Math.max(0, c.x - VIEW_W / 2);
    const [x, y] = rideAt(c);
    const r = canvas.getBoundingClientRect();
    canvas.dispatchEvent(new MouseEvent('click', { clientX: r.left + ((x - camX) / VIEW_W) * r.width, clientY: r.top + ((y - 8) / H) * r.height, bubbles: true }));
    const open = !document.getElementById('talkCard').hidden;
    const name = document.getElementById('talkName').textContent;
    const cr = document.getElementById('talkCard').getBoundingClientRect(), sr = canvas.parentElement.getBoundingClientRect();
    const px = r.left + ((x - camX) / VIEW_W) * r.width;
    const beside = cr.top >= sr.top && cr.bottom <= sr.bottom + 1 && (cr.left > px || cr.right < px);
    const stopped = c.pause === Infinity;
    talk(talkWith);
    window.__car = c;
    return { open, name, stopped, beside };
  })()`);
  await shot('t0-traveller-popover');
  road.going = await js('closeTalk(), __car.pause === 0');
  ok(road.open && road.stopped && road.going && road.beside, 'a traveller stops to talk: ' + JSON.stringify(road));
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
  ok(life.card, 'card opens'); ok(life.f1 >= 3 && life.f1 <= 4.5, 'three talks a day count: ' + life.f1); ok(life.sold > 0, 'sell'); ok(life.bought === 3, 'buy');
  ok(!life.names.some((n) => n.includes('때리기')), 'no 때리기 in life mode'); ok(life.names2.some((n) => n.includes('청혼')), 'propose shows');
  ok(life.held, 'held while talking'); ok(life.spouse === 1, 'married'); ok(!life.open, 'card closes');
  // Divorce by hand: 헤어지기 asks once more, then the spouse goes home and the children stay.
  const split = await js(`(() => {
    S.kids = 1; S.kidAges = [3]; S.kidTraits = [rollTraits()]; spawnFamily();
    const sp = people.find((p) => p.kind === 'spouse'); sp.hidden = false; openTalk(sp);
    const btn = () => [...document.querySelectorAll('#talkActions button')].find((b) => b.textContent.includes('헤어지기'));
    const first = btn()?.textContent; btn().click();
    const asked = document.getElementById('talkLine').textContent, still = S.spouse, second = btn()?.textContent; btn().click();
    return { first, asked, still, second, spouse: S.spouse, ex: S.ex, kids: S.kids, back: people.some((p) => p.who === 'h1a'), f: S.friends[1].f, story: S.story.slice(0, 3).map((x) => x.text).join(' | ') };
  })()`);
  ok(split.first === '💔 헤어지기' && split.still === 1 && split.asked.includes('한 번 더') && split.second === '💔 정말 헤어지기', 'divorce asks once more: ' + JSON.stringify(split));
  ok(split.spouse == null && split.ex === 1 && split.kids === 1 && split.back && split.f === 2 && split.story.includes('이혼'), 'divorced: spouse home, kids stay: ' + JSON.stringify(split));
  // A proposal below full friendship: a chance (charm, coins, furniture), and a no costs a point.
  const odds = await js(`(() => {
    S.myLover = 2; S.friends[2] = { f: 7, day: '' }; if (S.traits) S.traits.charm = 3; // odds don't hang on a random charm
    const e = people.find((p) => p.who === 'h2a'); e.hidden = false; openTalk(e);
    const btn = () => [...document.querySelectorAll('#talkActions button')].find((b) => b.textContent.includes('청혼'));
    const at7 = btn().disabled;
    S.friends[2].f = 8; paintTalk();
    const label = btn().textContent, enabled = !btn().disabled;
    const poor = (S.coins = 0, proposeOdds(8)), rich = (S.coins = 5000, proposeOdds(8));
    const r = Math.random; Math.random = () => 0.99; propose(e); Math.random = r;
    const no = { spouse: S.spouse, f: S.friends[2].f, line: document.getElementById('talkLine').textContent };
    S.friends[2].f = 9; Math.random = () => 0.5; propose(e); Math.random = r;
    return { at7, label, enabled, poor, rich, no, yes: S.spouse };
  })()`);
  ok(odds.at7 && odds.enabled && /청혼하기 \(\d+%\)/.test(odds.label), 'propose from 8 with odds shown: ' + JSON.stringify(odds));
  ok(odds.rich > odds.poor, 'savings help a proposal: ' + odds.poor + ' → ' + odds.rich);
  ok(odds.no.spouse == null && odds.no.f === 7 && odds.no.line.includes('생각해'), 'a no costs a point: ' + JSON.stringify(odds.no));
  ok(odds.yes === 2, 'a yes at 9 marries');
  // On its own: a long lonely stretch ends a marriage; a lover left alone ends it too.
  const drift = await js(`(() => {
    const r = Math.random; Math.random = () => 0;
    S.happy = 10; S.friends[2].f = 4; let days = 0; while (S.spouse != null && days++ < 99) marriageDay();
    const divorced = S.spouse == null && S.ex === 2;
    S.myLover = 3; S.friends[3] = { f: 7, day: '' }; S.loverQuiet = 0; days = 0; while (S.myLover != null && days++ < 10) loveDay();
    Math.random = r;
    S.happy = 80; S.spouse = 1; S.friends[1].f = 6; marriageDay(); const closer = S.friends[1].f;
    return { divorced, broke: S.myLover == null, days, closer };
  })()`);
  ok(drift.divorced && drift.broke && drift.days > 3 && drift.closer === 6.5, 'apart on their own, closer when happy: ' + JSON.stringify(drift));
  await js(`S.spouse = 1; S.ex = null; spawnFamily();`);
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
  // Visiting a friend: their town stays as it is; what you pick, earn and learn goes home.
  await js(`closeTalk(); S.spouse = null; spawnFamily();`);
  const abroad = await js(`(() => {
    const mine = S;
    const town = JSON.parse(JSON.stringify({ ...S, mapSeed: 4242, story: [] }));
    town.plots = town.plots.map(() => ({ planted: true, g: GROW }));
    enterVisit({ k: 'town', from: { name: '지현', gender: 'f' }, town, news: [] });
    const home = homeState();
    const [bag, coins, xp] = [home.bag, home.coins, home.xp];
    const [px, py] = PLOT_AT[0];
    const picked = tryPickAbroad(px * T + 8, py * T + 8);
    const e = people.find((p) => p.kind === 'villager' && !p.hidden);
    openTalk(e);
    const names = [...document.querySelectorAll('#talkActions button')].map((b) => b.textContent);
    talk(e);
    sellTo(e);
    closeTalk();
    const tags = people.filter((p) => !p.hidden).slice(0, 4).map((p) => tagOf(p)[0]).concat(tagOf(me)[0]);
    const out = { picked, bagDelta: home.bag - bag, coinsUp: home.coins > coins, xpUp: home.xp > xp, names, theirPlot: S.plots[0].planted, mineIsHome: home === mine, tags };
    leaveVisit();
    out.back = S === mine && MODE === 'life';
    return out;
  })()`);
  ok(abroad.picked && abroad.coinsUp && abroad.xpUp && abroad.mineIsHome && abroad.back, 'abroad: pick, sell, learn for home: ' + JSON.stringify(abroad));
  ok(!abroad.names.some((n) => n.includes('고백') || n.includes('때리기')), 'no romance or 때리기 abroad');
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
  ok(back.mode === 'life' && !back.punches, 'life untouched: ' + JSON.stringify(back));
  console.log(JSON.stringify({ errors, fails, life, chaos: chaos.names }, null, 1));
  app.exit(0);
});
