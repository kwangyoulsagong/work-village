// Offscreen: nothing ever shows on screen. Work scenes (work.js): every job has a scene in every era it lasts, each
// scene drawn for great / ok / oops at its moment (a contact sheet per era), the result moves XP / happiness / fame and
// never coins, a tap can do one better, lines never repeat back to back, a servant is freed after eight days, a ruler
// works at the throne, their children are princes and princesses, nothing of it in chaos mode, and the frame time.
// Usage: npx electron tools/work-test.js [game dir] [out dir]
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
  const town = (era, job = null) => `window.__night = false; window.__rnd ??= Math.random; Math.random = window.__rnd;
    S = { ...fresh(), sea: null, mapSeed: 7070, gender: 'f', temper: 'chatty', traits: { health: 3, green: 3, charm: 4, trade: 3, luck: 3 }, era: ${era}, houses: 0, coins: 1000,
      xp: 3000, days: 30, age: 30, lastDay: '${today}', skin: '#d99a6c', hair: '#3a2a1a', happy: 50 };
    applyLayout(S.mapSeed); carveGroves(); for (let i = 0; i < 6; i++) { ensureLots(i + 1); S.houses = i + 1; }
    S.friends = Array.from({ length: S.houses }, () => ({ f: 3, day: '' }));
    updateMyJob(true); ${job ? `S.job = '${job}';` : ''} spawnFamily(); spawnAnimals(); spawnCars(); cache.dirty = true; $('mode').hidden = true; $('pick').hidden = true; paintUi(); fitCanvas(); wake(); window.scrollTo(0, 0);`;
  await win.loadFile(path.join(GAME, 'index.html'));
  await wait(800);

  // Every job, in every era it's open, has a scene; every scene has words for all three results.
  const cover = await js(`const miss = []; for (let e = 0; e <= 5; e++) { S.era = e; for (const j of jobPool()) if (!SCENES[sceneOf(j)] || !WORK_TEXT[sceneOf(j)]) miss.push(e + ':' + j.id); }
    const thin = Object.entries(WORK_TEXT).filter(([k, t]) => !SCENES[k] || t.b.length !== 3 || ['great', 'ok', 'oops'].some((o) => (t[o]?.length ?? 0) < 2)).map(([k]) => k);
    return { miss, thin, kinds: Object.keys(SCENES).length };`);
  ok(cover.miss.length === 0 && cover.thin.length === 0 && cover.kinds >= 30, 'coverage: ' + JSON.stringify(cover));

  // Contact sheets: one per era, every scene that era's jobs use (plus the throne), great / ok / oops at the banner.
  for (const era of [0, 1, 2, 3, 4, 5]) {
    const url = await js(town(era) + `
      const kinds = [...new Set(jobPool().map(sceneOf)), 'throne'];
      const W = 240, H = 192, cols = 3;
      const sheet = document.createElement('canvas'); sheet.width = W * cols; sheet.height = H * kinds.length;
      const sg = sheet.getContext('2d'); sg.imageSmoothingEnabled = false;
      const job = (k) => jobPool().find((j) => sceneOf(j) === k) ?? myJob();
      const world = document.getElementById('world');
      kinds.forEach((k, row) => ['great', 'ok', 'oops'].forEach((out, col) => {
        const j = job(k);
        workStay = { id: j.id, name: j.name, kind: k, out, t: Math.round(WORK_N * 0.22), n: WORK_N, tapped: true, rule: k === 'throne' };
        workStay.banner = workBanner(j.id, k, out);
        drawWorkScene(ctx);
        sg.drawImage(world, 0, 0, world.width, world.height, col * W, row * H, W, H);
      }));
      workStay = null; me.hidden = false;
      return sheet.toDataURL();`);
    if (url.startsWith('ERR')) fails.push(`sheet era ${era}: ${url}`);
    else fs.writeFileSync(path.join(OUT, `60-work-era${era}.png`), Buffer.from(url.split(',')[1], 'base64'));
  }
  // The build-up (before the moment) of a few, with the tap hint.
  const before = await js(town(3, 'soccer') + `startWork(myJob()); workStay.t = Math.round(WORK_N * 0.6); drawWorkScene(ctx); return document.getElementById('world').toDataURL();`);
  if (!before.startsWith('ERR')) fs.writeFileSync(path.join(OUT, '61-work-before.png'), Buffer.from(before.split(',')[1], 'base64'));
  await js(`workStay = null; me.hidden = false;`);

  // A whole day at work through the tick: the scene shows, then the result; XP and fame up, coins untouched.
  const day = await js(town(4, 'doctor') + `Math.random = () => 0.5; task = null; me.act = null; startWork(myJob());
    const shown = workView(); const c0 = S.coins, x0 = S.xp; let n = 0; while (workStay && n < 200) { workTick(); n++; }
    return { shown, n, coins: S.coins - c0, xp: S.xp - x0, fame: S.fame?.doctor ?? 0, hidden: me.hidden, now: $('now').textContent };`);
  ok(day.shown && day.n === 96 && day.coins === 0 && day.xp > 0 && day.fame === 1 && !day.hidden && day.now.length > 4, 'a day at work: ' + JSON.stringify(day));

  // A tap before the moment lifts an oops to ok (with luck); after the moment it does nothing.
  const tap = await js(town(3, 'baseball') + `startWork(myJob()); workStay.out = 'oops'; Math.random = () => 0.1; workTap(); const a = workStay.out;
    workStay.tapped = false; workStay.out = 'ok'; workStay.t = 10; workTap(); const late = workStay.out; workStay = null; me.hidden = false; return { a, late };`);
  ok(tap.a === 'ok' && tap.late === 'ok', 'tap: ' + JSON.stringify(tap));

  // Lines never repeat back to back; fame tiers.
  const lines = await js(town(3) + `const seen = []; for (let i = 0; i < 30; i++) seen.push(workLine('soccer', 'great'));
    const twice = seen.some((l, i) => i && l === seen[i - 1]); S.fame = { soccer: 31 }; return { twice, tier: FAME_NAMES[fameTier('soccer')], kinds: new Set(seen).size };`);
  ok(!lines.twice && lines.tier === '스타' && lines.kinds >= 2, 'lines and fame: ' + JSON.stringify(lines));

  // The odds: about 20 / 65 / 15 for a middling fit.
  const odds = await js(town(4, 'office') + `S.traits = { health: 3, green: 3, charm: 3, trade: 3, luck: 3 }; const n = { great: 0, ok: 0, oops: 0 };
    for (let i = 0; i < 4000; i++) n[workRoll(myJob())]++; return n;`);
  ok(odds.great > 500 && odds.great < 1100 && odds.oops > 300 && odds.oops < 900, 'odds: ' + JSON.stringify(odds));

  // A servant: freed after eight days of work, never a servant again.
  const free = await js(town(1, 'servant') + `S.traits = { health: 1, green: 5, charm: 1, trade: 1, luck: 1 }; S.job = 'servant';
    for (let d = 0; d < 8; d++) { startWork(JOBS.find((j) => j.id === 'servant')); while (workStay) workTick(); }
    return { freed: S.freed, job: S.job, story: S.story.slice(0, 4).map((s) => s.text).join(' | ') };`);
  ok(free.freed === true && free.job !== 'servant' && /자유/.test(free.story), 'freed: ' + JSON.stringify(free));

  // Ruling: some work days at the throne; your children are princes and princesses (in a kingdom only).
  const rule = await js(town(1, 'farmer') + `S.gov = { ruler: -1, mood: {}, last: [], era: S.era }; Math.random = () => 0.1; startWork(myJob());
    const kind = workStay.kind, name = workStay.name; workStay = null; me.hidden = false;
    const kid = { kind: 'kid', who: 'k0', gender: 'f', small: true }; let role = ''; try { role = whoIs(kid).role; } catch (e) { role = 'ERR ' + e.message; }
    S.era = 4; let later = ''; try { later = whoIs(kid).role; } catch (e) { later = 'ERR'; }
    return { kind, name, role, later };`);
  ok(rule.kind === 'throne' && rule.name === '왕' && rule.role === '공주' && rule.later !== '공주', 'ruling: ' + JSON.stringify(rule));

  // Watching a neighbour at work: their scene, nothing changes for you; a button on their card.
  const watch = await js(town(3) + `const v = people.find((p) => p.kind === 'villager' && p.job && !p.small && p.who?.endsWith('a'));
    const f0 = JSON.stringify(S.fame ?? {}), x0 = S.xp; openTalk?.(v); const btn = [...document.querySelectorAll('#talkActions button')].some((b) => b.textContent.includes('일하는 모습'));
    closeTalk?.(); watchWork(v, whoIs(v).name, null); const kind = workStay?.kind, view = workView(), hidden = me.hidden;
    const url = (() => { workStay.t = 20; workStay.banner = 'X'; drawWorkScene(ctx); return document.getElementById('world').toDataURL(); })(); workStay.t = WORK_N;
    let n = 0; while (workStay && n < 200) { workTick(); n++; }
    return { btn, kind, view, hidden, same: JSON.stringify(S.fame ?? {}) === f0 && S.xp === x0, now: $('now').textContent, url };`);
  ok(watch.btn && watch.kind && watch.view && !watch.hidden && watch.same && watch.now.includes(':'), 'watching: ' + JSON.stringify({ ...watch, url: undefined }));
  if (watch.url?.startsWith('data:')) fs.writeFileSync(path.join(OUT, '62-work-watch.png'), Buffer.from(watch.url.split(',')[1], 'base64'));

  // Fame pays: a star +3 %, a legend +6 % and a trophy at home.
  const fame = await js(town(4, 'doctor') + `const base = myPay(0.5); S.fame = { doctor: 30 }; const star = myPay(0.5) / base; S.fame = { doctor: 80 }; const legend = myPay(0.5) / base;
    return { star: +star.toFixed(3), legend: +legend.toFixed(3), trophies: legends() };`);
  ok(fame.star === 1.03 && fame.legend === 1.06 && fame.trophies.join() === 'doctor', 'fame pay: ' + JSON.stringify(fame));

  // Not in chaos mode.
  const chaos = await js(town(3, 'soccer') + `const m = MODE; MODE = 'chaos'; startWork(myJob()); const any = !!workStay; MODE = m; return any;`);
  ok(chaos === false, 'no work scenes in chaos mode');

  // Frame time of the heaviest scenes.
  const perf = await js(town(5) + `const out = {}; for (const k of ['stage', 'soccer', 'fire', 'booth', 'throne']) {
      workStay = { id: 'star', name: '가수', kind: k, out: 'great', t: 20, n: WORK_N, tapped: true, banner: '앙코르!!' };
      const t0 = performance.now(); for (let i = 0; i < 200; i++) drawWorkScene(ctx); out[k] = +((performance.now() - t0) / 200).toFixed(3); }
    workStay = null; me.hidden = false; return out;`);
  ok(Object.values(perf).every((ms) => ms < 3), 'frame time: ' + JSON.stringify(perf));

  console.log('perf ms/frame', JSON.stringify(perf));
  console.log(JSON.stringify({ errors, fails }, null, 1));
  app.exit(fails.length || errors.length ? 1 : 0);
});
