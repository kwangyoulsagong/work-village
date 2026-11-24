// 작은 마을 — small motions that make the town feel alive: the light turns golden before dusk and pale at dawn
// instead of switching, smoke drifts from industrial chimneys, runners kick up dust, people standing about look
// around, and a little sparkle pops when you finish something. Drawn only for what's on screen.
// Loaded before game.js: nothing here touches game.js at load time, only when called.
'use strict';

/** The light over the town for the time of day: { a: alpha, c: 'r, g, b' } (night itself is game.js's). */
function skyShade() {
  if (typeof window.__night === 'boolean') return { a: 0, c: '' }; // tests pin day or night
  const d = new Date();
  const m = d.getHours() * 60 + d.getMinutes();
  if (m >= 17 * 60 && m < 19 * 60) {
    // Golden hour, then a purple dusk.
    const p = (m - 17 * 60) / 120;
    return p < 0.6 ? { a: 0.1 * (p / 0.6), c: '255, 150, 60' } : { a: 0.1 + ((p - 0.6) / 0.4) * 0.18, c: '110, 60, 110' };
  }
  if (m >= 6 * 60 && m < 7 * 60) return { a: (1 - (m - 6 * 60) / 60) * 0.2, c: '140, 130, 190' };
  return { a: 0, c: '' };
}
function drawSkyShade(g) {
  const s = skyShade();
  if (s.a <= 0.005) return;
  g.fillStyle = `rgba(${s.c}, ${s.a.toFixed(3)})`;
  g.fillRect(0, 0, VIEW_W, H);
}

/** Smoke curling up from the brick houses' chimneys in the industrial era. */
function drawChimneys(g) {
  if (S.era !== 3) return;
  const t = clockTick();
  for (let i = 0; i < occupied(); i++) {
    if (S.wrecked?.includes(i)) continue;
    const l = lotOf(i);
    if (!l || ((l.x * 5) % 3 !== 0 && i % 2)) continue; // not every house has the stove lit
    const cx = l.x * T + 1 + (2 * T - 2) - 7;
    if (!onScreen(cx)) continue;
    const top = lotBottom(i) - 38;
    for (let k = 0; k < 3; k++) {
      const age = (t + k * 7 + i * 3) % 21; // each puff rises and fades over ~2.6 s
      const a = 0.55 * (1 - age / 21);
      disc(g, cx + Math.round(Math.sin((age + i) / 4) * 2 + age * 0.3), top - Math.round(age * 0.9), 1 + Math.floor(age / 8), `rgba(228, 228, 234, ${a.toFixed(2)})`);
    }
  }
}

/** Dust at a runner's heels. */
function drawDust(g, e) {
  if (!e.path?.length || (e.speed ?? 1) < 1.8 || e.kind === 'me') return;
  const k = Math.floor((e.frame ?? 0) / 2) % 3;
  const back = e.dir === 'l' ? 1 : e.dir === 'r' ? -1 : 0;
  R(g, Math.round(e.x) + back * (5 + k * 2), Math.round(e.y) - 1 - k, 2, 2, `rgba(210, 195, 170, ${(0.7 - k * 0.2).toFixed(2)})`);
}

/** Someone waiting about now and then glances the other way. */
function lookAround(e) {
  if (e.path?.length || e.act || Math.random() > 0.03) return;
  e.dir = e.dir === 'l' ? 'r' : e.dir === 'r' ? 'l' : Math.random() < 0.5 ? 'l' : 'r';
}

let pops = [];
/** A sparkle when something's done (you finishing an errand). */
function popAt(x, y) {
  if (pops.length < 8) pops.push({ x, y, t: 8 });
}
function drawPops(g, k) {
  pops = pops.filter((p) => (p.t -= k) > 0);
  for (const p of pops) {
    const r = Math.round(9 - p.t);
    const c = p.t > 4 ? '#ffffff' : '#ffd23f';
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0], [0.7, 0.7], [-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7]])
      R(g, Math.round(p.x + dx * r), Math.round(p.y - 14 + dy * r), 1, 1, c);
  }
}
