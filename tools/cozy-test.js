// Offscreen: nothing ever shows on screen. Small joys (cozy.js): the town paper turns and fits the town, the work
// grove grows a tree per worked day (and keeps eight weeks), finds while you work (every 🪙50, odds shown), poking an
// animal or your pet, and none of it in chaos mode. Usage: npx electron tools/cozy-test.js [game dir] [out dir]
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
  const town = (era) => `window.__night = false;
    S = { ...fresh(), sea: null, mapSeed: 6060, gender: 'f', temper: 'gentle', traits: { health: 3, green: 3, charm: 3, trade: 3, luck: 3 }, era: ${era}, houses: 0, coins: 800,
      xp: 900, days: 20, age: 20, lastDay: '${today}', dog: true, dogBreed: 'shiba', cat: true, spouse: 1, kids: 1, kidAges: [8], kidTraits: [{ health: 3, green: 3, charm: 3, trade: 3, luck: 3 }],
      chickens: 3, skin: '#d99a6c', hair: '#3a2a1a', lovers: ['2|3'] };
    applyLayout(S.mapSeed); carveGroves(); for (let i = 0; i < 6; i++) { ensureLots(i + 1); S.houses = i + 1; }
    S.friends = Array.from({ length: S.houses }, () => ({ f: 4, day: '' }));
    updateMyJob(true); spawnFamily(); spawnAnimals(); spawnCars(); cache.dirty = true; $('mode').hidden = true; $('pick').hidden = true; paintUi(); fitCanvas(); wake(); window.scrollTo(0, 0);`;
  await win.loadFile(path.join(GAME, 'index.html'));
  await wait(800);

  // The paper: a masthead by era, lines that fit (lovers' rumour, money, the dog), and it turns.
  const paper = await js(town(3) + `const all = headlines(); const seen = new Set(); for (let i = 0; i < 30; i++) seen.add(tickerLine());
    paintMe(); return { all, kinds: seen.size, mast: [...seen].every((l) => l.startsWith('[마을 신문]')), shown: !$('dayNews').hidden && $('dayNews').textContent };`);
  ok(paper.all.some((l) => /소문:/.test(l)) && paper.all.some((l) => /금고/.test(l)) && paper.all.some((l) => /순찰/.test(l)) && paper.kinds >= 5 && paper.mast && paper.shown, 'the paper: ' + JSON.stringify(paper));

  // The grove: a tree for a worked day, bare for a day off; eight weeks kept; every 10th tree is news.
  const grove = await js(town(2) + `S.grove = ''; S.trees = 9; S.dayEarned = 5; groveDay(true); groveDay(false); for (let i = 0; i < 70; i++) groveDay(i % 2 === 0);
    paintMe(); const cells = $('meList').querySelectorAll('li.grove span').length; const trees = $('meList').querySelectorAll('li.grove span.on').length;
    return { len: S.grove.length, trees: S.trees, cells, shownTrees: trees, news: S.story.some((s) => /나무가 10그루/.test(s.text)) };`);
  ok(grove.len === 56 && grove.trees === 45 && grove.cells === 56 && grove.shownTrees === 28 && grove.news, 'the grove: ' + JSON.stringify(grove));
  const lived = await js(town(2) + `S.grove = ''; S.trees = 0; S.dayEarned = 12; liveADay(); S.dayEarned = 0; liveADay(); return { g: S.grove, t: S.trees };`);
  ok(lived.g === '10' && lived.t === 1, 'a day lived: ' + JSON.stringify(lived));

  // Finds: 🪙50 from usage → one find; listed with odds; many finds mostly common.
  const finds = await js(town(2) + `S.finds = {}; S.findAcc = 0; findTick(49); const none = Object.keys(S.finds).length; findTick(1); const one = Object.values(S.finds).reduce((a, b) => a + b, 0);
    for (let i = 0; i < 400; i++) findTick(50); const total = Object.values(S.finds).reduce((a, b) => a + b, 0);
    const common = FINDS[0][1].reduce((a, n) => a + (S.finds[n] ?? 0), 0);
    paintMe(); const note = [...$('meList').querySelectorAll('li.stat__note')].map((l) => l.textContent).find((t) => /확률/.test(t));
    return { none, one, total, commonShare: common / total, note };`);
  ok(finds.none === 0 && finds.one === 1 && finds.total === 401 && finds.commonShare > 0.8 && /흔함 90%/.test(finds.note ?? ''), 'finds: ' + JSON.stringify(finds));

  // Poke: a hen and the dog say something; a little cheer for the first three a day.
  const poke = await js(town(2) + `S.happy = 50; const hen = animals.find((a) => a.kind === 'chicken'); moveCam(hen.x - VIEW_W / 2); const a = tryPoke(hen.x, hen.y - 5); const said = pokes.at(-1)?.text;
    const dog = people.find((p) => p.kind === 'dog'); const b = tryPoke(dog.x, dog.y - 5); for (let i = 0; i < 5; i++) tryPoke(hen.x, hen.y - 5);
    const miss = tryPoke(-500, -500); return { a, said, b, happy: S.happy, miss };`);
  ok(poke.a && /꼬/.test(poke.said ?? '') && poke.b && poke.happy === 53 && !poke.miss, 'poke: ' + JSON.stringify(poke));
  await wait(200);
  fs.writeFileSync(path.join(OUT, 'cozy-poke.png'), Buffer.from((await js(`return document.getElementById('world').toDataURL()`)).split(',')[1], 'base64'));

  // Chaos: none of it.
  const c = await js(town(2) + `enterChaos(2); const r = { line: tickerLine(), poke: tryPoke(0, 0) }; const before = S.findAcc ?? 0; findTick(100); r.find = (S.findAcc ?? 0) === before; leaveChaos(); return r;`);
  ok(c.line === '' && !c.poke && c.find, 'none in chaos mode: ' + JSON.stringify(c));

  console.log(JSON.stringify({ errors, fails }, null, 1));
  app.exit(fails.length || errors.length ? 1 : 0);
});
