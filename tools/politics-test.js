// Offscreen: nothing ever shows on screen. Politics (politics.js): factions by era and their mood, influence, being
// asked to lead in a monarchy, running for office and the vote in a democracy, the weekly card and its law, an
// ultimatum refused (ousted, not game over; the calm storyteller only grumbles), the crown drawn, the 정치 tab, and none
// of it in chaos mode. Usage: npx electron tools/politics-test.js [game dir] [out dir]
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
  const town = (era, f = 8, charm = 4) => `window.__night = false;
    S = { ...fresh(), sea: null, mapSeed: 6060, gender: 'f', temper: 'chatty', traits: { health: 3, green: 3, charm: ${charm}, trade: 3, luck: 3 }, era: ${era}, houses: 0, coins: 1000,
      xp: 3000, days: 30, age: 30, lastDay: '${today}', skin: '#d99a6c', hair: '#3a2a1a' };
    applyLayout(S.mapSeed); carveGroves(); for (let i = 0; i < 8; i++) { ensureLots(i + 1); S.houses = i + 1; }
    S.friends = Array.from({ length: S.houses }, () => ({ f: ${f}, day: '' }));
    updateMyJob(true); spawnFamily(); spawnAnimals(); spawnCars(); cache.dirty = true; $('mode').hidden = true; $('pick').hidden = true; paintUi(); fitCanvas(); wake(); window.scrollTo(0, 0);`;
  await win.loadFile(path.join(GAME, 'index.html'));
  await wait(800);

  // Factions by era; every family belongs to one; moods follow friendship.
  const fac = await js(town(1) + `const names = factions().map((f) => f.name); const all = families().every((i) => factions().some((f) => f.id === factionOf(i).id));
    const warm = factions().map((f) => moodOf(f.id)); S.friends.forEach((x) => (x.f = 0)); const cold = factions().map((f) => moodOf(f.id));
    return { names, all, warm, cold, modern: factions(4).map((f) => f.name), future: factions(5).map((f) => f.name) };`);
  ok(fac.names.join() === '농민,상인,병사,사제' && fac.all && fac.warm.every((m) => m >= 1) && fac.cold.every((m) => m <= -1) && fac.modern.includes('녹색당') && fac.future.includes('기술파'), 'factions: ' + JSON.stringify(fac));

  // A monarchy: influence high enough, the town asks you to be king.
  const king = await js(town(1, 8, 5) + `const inf = influence(); govDay(); return { inf, you: youRule(), story: S.story[0]?.text, card: !!S.gov.card };`);
  ok(king.inf >= 55 && king.you && /왕으로 모시기로/.test(king.story ?? '') && king.card, 'asked to be king: ' + JSON.stringify(king));
  const low = await js(town(1, 1, 1) + `govDay(); return { you: youRule(), ruler: S.gov.ruler };`);
  ok(!low.you && low.ruler >= 0, 'low influence: a neighbour rules: ' + JSON.stringify(low));

  // The weekly card: guard → a law for a week that halves crime; feast costs coins and cheers.
  const card = await js(town(2, 8, 5) + `govDay(); S.gov.card = { id: 'guard', day: S.days }; decide('a'); const law = S.gov.law?.id; const mul = govMul('crime');
    S.gov.card = { id: 'feast', day: S.days }; const c0 = S.coins; S.happy = 50; decide('a'); const cost = c0 - S.coins;
    S.days += 8; const after = govMul('crime'); return { law, mul, cost, happy: S.happy, after, next: S.gov.next };`);
  ok(card.law === 'guard' && card.mul === 0.5 && card.cost === 40 && card.happy === 58 && card.after === 1, 'cards and laws: ' + JSON.stringify(card));
  // Unanswered three days: things stay as they are.
  const auto = await js(town(1, 8, 5) + `govDay(); S.gov.card = { id: 'tax', day: S.days - 3 }; govDay(); return { card: S.gov.card?.id ?? null, law: S.gov.law?.id ?? null, story: S.story.slice(0, 3).map((s) => s.text) };`);
  ok(auto.law === null && auto.story.some((s) => /일주일이 지나/.test(s)), 'unanswered card: ' + JSON.stringify(auto));

  // An ultimatum refused: ousted (a neighbour takes over, you can't rise for a week); calm: only grumbling.
  const ult = await js(town(1, 8, 5) + `govDay(); S.gov.mood.farm = -5; S.friends.forEach((x, i) => { if (factionOf(i).id === 'farm') x.f = 0; }); S.gov.card = null; S.gov.next = 0; drawCard();
    const asked = S.gov.card?.id; const said = decide('b'); const you = youRule(); const canAgain = canRise();
    return { asked, said, you, canAgain, story: S.story[0]?.text };`);
  ok(ult.asked === 'ultimatum' && !ult.you && !ult.canAgain && /반란/.test(ult.story ?? ''), 'ousted: ' + JSON.stringify(ult));
  const calm = await js(town(1, 8, 5) + `S.teller = 'calm'; govDay(); S.gov.card = { id: 'ultimatum', f: 'farm', day: S.days }; decide('b'); return youRule();`);
  ok(calm === true, 'calm storyteller: no coup');

  // A democracy: the first vote after the monarchy; running, the campaign, winning; the crown becomes a badge.
  const dem = await js(town(2, 8, 5) + `govDay(); const wasKing = youRule(); S.era = 3; govDay(); const firstVote = S.gov.vote - S.days; const story = S.story[0]?.text;
    return { wasKing, firstVote, story };`);
  ok(dem.wasKing && dem.firstVote === 7 && /첫 시장 선거/.test(dem.story ?? ''), 'monarchy to democracy: ' + JSON.stringify(dem));
  const vote = await js(town(4, 9, 5) + `govDay(); S.gov.ruler = 0; S.gov.run = false; S.gov.vote = S.days + 10; runForOffice(); const ran = S.gov.run; S.days = S.gov.vote; govDay();
    return { ran, you: youRule(), share: S.gov.lastVote?.share, story: S.story.slice(0, 3).map((s) => s.text) };`);
  ok(vote.ran && vote.you && vote.share > 50 && vote.story.some((s) => /대통령 선거에서/.test(s)), 'election won: ' + JSON.stringify(vote));
  const lose = await js(town(4, 0, 1) + `govDay(); S.gov.ruler = -1; S.gov.vote = S.days; S.gov.mood = { labor: -5, biz: -5, green: -5, order: -5 }; govDay();
    return { you: youRule(), story: S.story[0]?.text };`);
  ok(!lose.you && /떨어졌어요/.test(lose.story ?? ''), 'election lost: ' + JSON.stringify(lose));
  const cantRun = await js(town(4, 0, 1) + `govDay(); S.gov.ruler = 0; runForOffice(); return S.gov.run;`);
  ok(cantRun === false, 'low influence cannot run');

  // The 정치 tab and the badge over your head.
  const tab = await js(town(4, 9, 5) + `govDay(); S.gov.ruler = -1; S.gov.card = { id: 'wage', day: S.days }; document.querySelector('[data-tab="gov"]').click();
    const text = $('govList').textContent; const btns = [...$('govList').querySelectorAll('.gov-card .btn')].map((b) => b.textContent);
    moveCam(me.x - VIEW_W / 2); return { text, btns };`);
  ok(/내가 대통령이에요/.test(tab.text) && /세력/.test(tab.text) && /노동자/.test(tab.text) && tab.btns.length === 2 && /파업 없음/.test(tab.btns[0]), 'the 정치 tab: ' + JSON.stringify(tab));
  await wait(400);
  fs.writeFileSync(path.join(OUT, 'politics-badge.png'), Buffer.from((await js(`return document.getElementById('world').toDataURL()`)).split(',')[1], 'base64'));
  const click = await js(`[...$('govList').querySelectorAll('.gov-card .btn')][0].click(); return { law: S.gov.law?.id, strike: govNoStrike() };`);
  ok(click.law === 'wage' && click.strike, 'deciding from the tab: ' + JSON.stringify(click));

  // Chaos: none of it.
  const c = await js(town(2, 8, 5) + `enterChaos(2); govDay(); const r = { gov: S.gov ?? null }; leaveChaos(); return r;`);
  ok(!c.gov, 'no politics in chaos mode: ' + JSON.stringify(c));

  console.log(JSON.stringify({ errors, fails }, null, 1));
  app.exit(fails.length || errors.length ? 1 : 0);
});
