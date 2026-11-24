// Usage: node tools/sim.js [aquila dir]
// 200 lives with random traits: usage 7 %/day (50 %/week), daily events (illness, crime, war, epidemic).
const fs = require('fs'), vm = require('vm');
const noop = () => {};
const ResizeObserver = class { observe() {} };
const ctx2d = new Proxy({}, { get: (t, k) => (k in t ? t[k] : noop), set: (t, k, v) => ((t[k] = v), true) });
const el = () => ({ closest: () => null, querySelectorAll: () => [], querySelector: () => null, replaceChildren() {}, children: [], childElementCount: 1, setAttribute() {}, parentElement: { clientWidth: 240 }, getContext: () => ctx2d, style: {}, addEventListener: noop, replaceChildren: noop, append: noop, set textContent(v) {}, hidden: true, dataset: {} });
const dir = process.argv[2] || require('path').join(__dirname, '..', 'aquila'); const src = ['art.js', 'ai.js', 'extras.js', 'chaos.js', 'jobs.js', 'layout.js', 'life.js', 'fun.js', 'more.js', 'visit.js', 'game.js'].map((f) => fs.readFileSync(dir + '/' + f, 'utf8')).join('\n') + '\n;globalThis.__api = { get S() { return S; }, set S(v) { S = v; }, fresh, absorb, catchUp, rollTraits, liveADay, crime, war, epidemic, ERAS };';
const results = [];
for (let t = 0; t < 200; t++) {
  const sb = { ResizeObserver, IntersectionObserver: class { observe() {} }, requestAnimationFrame: () => 0, cancelAnimationFrame: () => {}, window: { addEventListener() {}, devicePixelRatio: 1, innerHeight: 900 }, console, Math, Date, JSON, Object, Array, Number, String, Promise, parseInt, setTimeout: noop, clearTimeout: noop, setInterval: () => 0, clearInterval: noop,
    document: { addEventListener() {}, visibilityState: 'visible', getElementById: el, createElement: el, querySelectorAll: () => [], createTextNode: () => ({}) },
    aquila: { storage: { get: async () => null, set: async () => true }, power: async () => ({ saver: true }), usage: async () => [], on: noop, chip: async () => true } };
  vm.createContext(sb);
  vm.runInContext(src, sb);
  const api = sb.__api;
  const S = api.S;
  S.gender = 'f'; S.traits = api.rollTraits(); S.usage = { 'a:claude': { w: 0, h: null } };
  let w = 0, day = 0, future = null;
  const h = S.traits.health;
  while (day < 120 && !S.over) {
    day++;
    for (let k = 0; k < 14; k++) { w += 0.5; api.absorb([{ account: 'a', kind: 'claude', weekly: w, fiveHour: null }]); api.catchUp(); }
    S.dayEarned = 10; api.liveADay(); if (!S.over) { api.crime(); api.war(); api.epidemic(); }
    if (S.era === 5 && future == null) future = day;
  }
  results.push({ h, died: !!S.over, day, future, wars: S.wars });
}
const pct = (f) => Math.round((results.filter(f).length / results.length) * 100) + '%';
const byH = [1, 2, 3, 4, 5].map((h) => {
  const r = results.filter((x) => x.h === h);
  const fut = r.filter((x) => x.future).map((x) => x.future);
  return `체력${h}: ${r.length}판, 죽음 ${Math.round((r.filter((x) => x.died).length / Math.max(1, r.length)) * 100)}%, 미래 도달 ${fut.length}판 (평균 ${fut.length ? Math.round(fut.reduce((a, b) => a + b, 0) / fut.length) : '-'}일)`;
});
console.log(byH.join('\n'));
console.log('전체 미래 도달', pct((x) => x.future), '· 평균 전쟁', (results.reduce((a, x) => a + x.wars, 0) / results.length).toFixed(1));
