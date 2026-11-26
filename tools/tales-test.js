// Offscreen: nothing ever shows on screen. Stories that last (tales.js): a trip (the traveller is gone from town,
// postcards on the way, home with a souvenir), postcards drawn in the album, life stories on the person card,
// those who left remembered, the old tower's bundles and perks, and none of it in chaos mode.
// Usage: npx electron tools/tales-test.js [game dir] [out dir]
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
    S = { ...fresh(), sea: null, mapSeed: 6060, gender: 'f', temper: 'gentle', traits: { health: 3, green: 3, charm: 3, trade: 3, luck: 3 }, era: ${era}, houses: 0, coins: 500,
      xp: 900, days: 20, age: 20, lastDay: '${today}', dog: true, dogBreed: 'shiba', skin: '#d99a6c', hair: '#3a2a1a' };
    applyLayout(S.mapSeed); carveGroves(); for (let i = 0; i < 6; i++) { ensureLots(i + 1); S.houses = i + 1; }
    S.friends = Array.from({ length: S.houses }, () => ({ f: 5, day: '' }));
    updateMyJob(true); spawnFamily(); spawnAnimals(); spawnCars(); cache.dirty = true; $('mode').hidden = true; $('pick').hidden = true; paintUi(); fitCanvas(); wake(); window.scrollTo(0, 0);`;
  await win.loadFile(path.join(GAME, 'index.html'));
  await wait(800);

  // A trip: gone from town, two postcards on the way, home with a souvenir and +1 friendship.
  const trip = await js(town(4) + `const r = Math.random; Math.random = () => 0.1; S.dog = false; tripDay(); Math.random = r; const t = S.trip; const who = t.who;
    const gone = !people.some((p) => p.who === 'h' + who + 'a'); t.start = Date.now() - 1000; t.back = Date.now() + 1000; t.start = Date.now() - 3 * 3600_000; t.back = Date.now() + 1;
    tripTick(true); const cards = S.cards.length; const f0 = S.friends[who].f; t.back = Date.now() - 1; tripTick(true);
    return { who, gone, cards, back: !S.trip && people.some((p) => p.who === 'h' + who + 'a'), souvenir: S.souvenirs?.length, f: S.friends[who].f - f0, story: S.story.slice(0, 4).map((s) => s.text) };`);
  ok(trip.who >= 0 && trip.gone && trip.cards === 2 && trip.back && trip.souvenir === 1 && trip.f === 1 && trip.story.some((s) => /돌아왔어요/.test(s)) && trip.story.some((s) => /엽서가 왔어요/.test(s)), 'a trip: ' + JSON.stringify(trip));
  // Postcards in the album, drawn.
  const album = await js(`document.querySelector('[data-tab="album"]').click(); paintAlbum(); const imgs = [...$('albumList').querySelectorAll('img')].map((i) => i.src.slice(0, 22)); const text = $('albumList').textContent;
    return { imgs, text, tab: $('albumTab').textContent };`);
  ok(album.imgs.length >= 2 && album.imgs.every((s) => s.startsWith('data:image/png')) && /엽서/.test(album.text) && /받은 선물/.test(album.text) && /앨범 2/.test(album.tab), 'postcards in the album: ' + JSON.stringify(album));
  const png = await js(`return postcardSrc(S.cards[0])`);
  fs.writeFileSync(path.join(OUT, 'tales-postcard.png'), Buffer.from(png.split(',')[1], 'base64'));
  const dogTrip = await js(town(4) + `S.trip = { who: 'dog', start: Date.now(), back: Date.now() + 3600_000, sent: 0, era: 4 }; spawnFamily(); return !people.some((p) => p.kind === 'dog');`);
  ok(dogTrip, 'the dog away on a trip');

  // Life stories: lines naming a neighbour go into their story; the card shows them.
  const bio = await js(town(3) + `const n = FAMILIES[2].single; story('테스트: ' + n + '가 광장에서 춤췄어요.'); story(n + '와 차를 마셨어요.');
    const p = people.find((x) => x.who === 'h2a'); openTalk(p); [...$('talkActions').children].find((b) => b.textContent === '📖 지나온 이야기').click();
    const line = $('talkLine').textContent; closeTalk(); return { n, len: S.bio[2].length, line };`);
  ok(bio.len === 2 && bio.line.includes(bio.n) && /차를 마셨어요/.test(bio.line), 'life story: ' + JSON.stringify(bio));
  // Those who left: an epidemic's families are remembered in the 나 tab.
  const mem = await js(town(3) + `S.houses = 6; const r = Math.random; Math.random = () => 0.001; epidemic(); Math.random = r; paintMe(); return { list: S.memorial?.length ?? 0, shown: /기억할 이웃/.test($('meList').textContent) };`);
  ok(mem.list >= 1 && mem.shown, 'remembered: ' + JSON.stringify(mem));

  // The old tower: not enough → refused; enough → done, perk on; all three → a festival.
  const tower = await js(town(2) + `document.querySelector('[data-tab="build"]').click(); paintBuild(); const shown = /옛 탑 복원 0\\/3/.test($('buildList').textContent);
    S.stock = { wood: 0, stone: 0, fish: 3, berries: 0 }; donateBundle('fish'); const early = restored('fish');
    S.stock = { wood: 30, stone: 30, fish: 8, berries: 20 }; donateBundle('fish'); donateBundle('forest'); donateBundle('stone');
    return { shown, early, all: S.tower.length, left: S.stock, perks: [fishBonus(), forageBonus(), towerCrime()], fest: festivalToday(), story: S.story[0]?.text };`);
  ok(tower.shown && !tower.early && tower.all === 3 && tower.left.fish === 0 && tower.left.wood === 5 && tower.perks.join() === '0.15,1,0.8' && tower.fest && /옛 탑을 다시/.test(tower.story ?? ''), 'the old tower: ' + JSON.stringify(tower));

  // Chaos: none of it.
  const c = await js(town(3) + `enterChaos(2); S.trip = null; tripDay(); const r = { trip: S.trip, tick: tripTick(true) }; leaveChaos(); return r;`);
  ok(!c.trip && c.tick === false, 'no trips in chaos mode: ' + JSON.stringify(c));

  console.log(JSON.stringify({ errors, fails }, null, 1));
  app.exit(fails.length || errors.length ? 1 : 0);
});
