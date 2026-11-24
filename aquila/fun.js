// 작은 마을 — small things that make you look again: news of what happened while you were away, golden visitors
// you can tap, the town's chronicle, how dramatic the town's life is, and what a fallen town leaves the next one.
// Loaded before game.js: nothing here touches game.js at load time, only when called.
'use strict';

// ── How dramatic: calm / usual / drama (crime, war and plague happen less or more) ─────────────────────────────────

const TELLERS = [
  { id: 'calm', name: '평온', note: '사건이 드물어요', mul: 0.35 },
  { id: 'usual', name: '보통', note: '가끔 사건이 생겨요', mul: 1 },
  { id: 'drama', name: '드라마', note: '도둑·전쟁·역병이 자주 와요', mul: 1.8 },
];
const tellerMul = () => (TELLERS.find((t) => t.id === S.teller) ?? TELLERS[1]).mul;

// ── The chronicle: the big moments, kept longer than the story ─────────────────────────────────────────────────────

const BIG = /발전했어요|전쟁|역병|결혼|태어났|세상을 떠|지었어요|로켓|어른이 됐|개간|유산|황금|시상식|희귀한|설날|추석|크리스마스/;
function chronicle(text) {
  if (!BIG.test(text) || MODE !== 'life') return;
  S.chronicle ??= [];
  S.chronicle.unshift({ day: S.days, era: S.era, text });
  S.chronicle.length = Math.min(S.chronicle.length, 80);
}

// ── While you were away ────────────────────────────────────────────────────────────────────────────────────────────

const AWAY_MS = 10 * 60_000;
/** Mark that you're looking now. */
function seen() {
  if (MODE !== 'life') return;
  S.seenAt = Date.now();
  S.seenCoins = S.coins;
}
/** Coming back after a while: a small card with what happened (not a pop-up; close it or ignore it). */
function welcomeBack() {
  if (MODE !== 'life' || !S.gender || S.over) return;
  const since = S.seenAt ?? 0;
  if (!since || Date.now() - since < AWAY_MS) return seen();
  const news = S.story.filter((s) => (s.t ?? 0) > since).slice(0, 4);
  const earned = Math.max(0, S.coins - (S.seenCoins ?? S.coins));
  seen();
  if (!news.length && earned < 1) return;
  const card = document.getElementById('away');
  if (!card) return;
  const mins = Math.round((Date.now() - since) / 60_000);
  document.getElementById('awayTitle').textContent = `${mins >= 60 ? `${Math.floor(mins / 60)}시간` : `${mins}분`} 동안 이런 일이 있었어요`;
  document.getElementById('awayList').replaceChildren(
    ...(earned >= 1 ? [el('li', '', `코인 ${fmt(earned)} 모였어요`)] : []),
    ...news.map((s) => el('li', '', storyKind(s.text).text)),
  );
  card.hidden = false;
}

// ── Golden visitors: now and then something shiny crosses the town. Tap it, or it leaves a little behind ─────────

let golden = null;
let goldenNext = Date.now() + (3 + Math.random() * 5) * 60_000;
const GOLD_CHICKEN = { ...CHICKEN_PAL, o: '#a8741a', w: '#ffd84a', W: '#f0b82a', r: '#ff8a3a' };

function goldenTick(k) {
  if (MODE !== 'life' || !S.gender || S.over) return;
  if (!golden) {
    if (Date.now() < goldenNext) return;
    const night = isNight();
    const right = Math.random() < 0.5;
    golden = night
      ? { kind: 'star', x: right ? viewX - 10 : viewX + VIEW_W + 10, y: 14 + Math.random() * 20, v: right ? 2.2 : -2.2, f: 0 }
      : { kind: 'chicken', x: right ? viewX - 8 : viewX + VIEW_W + 8, y: ROAD_Y * T + 14, v: right ? 0.45 : -0.45, f: 0 };
    return;
  }
  golden.x += golden.v * k;
  golden.f += k;
  if (golden.kind === 'star') golden.y += 0.25 * k;
  // Out of sight without a tap: it still leaves a little behind.
  if (golden.x < viewX - 30 || golden.x > viewX + VIEW_W + 30) collectGolden(0.3);
}
function goldenPrize() {
  return Math.max(15, Math.round(S.coins * 0.03 + 10 * (1 + S.era))) * (0.8 + trait('luck') * 0.1);
}
function collectGolden(share) {
  if (!golden) return;
  const prize = Math.round(goldenPrize() * share);
  const what = golden.kind === 'star' ? '별똥별' : '황금 닭';
  S.coins += prize;
  if (share === 1) {
    story(`✨ ${what}을(를) 잡았어요! 🪙${fmt(prize)}을 얻었어요.`);
    toast(`${what}! +${fmt(prize)}코인`);
    S.golden = (S.golden ?? 0) + 1;
  } else story(`${what}이(가) 지나가며 🪙${fmt(prize)}을 떨어뜨렸어요.`);
  golden = null;
  goldenNext = Date.now() + (8 + Math.random() * 12) * 60_000;
  save();
  paintUi();
}
/** A tap near the golden visitor catches it. */
function tryGolden(wx, wy) {
  if (!golden) return false;
  const gy = golden.kind === 'star' ? golden.y : golden.y - 5;
  if (Math.abs(wx - golden.x) > 12 || Math.abs(wy - gy) > 12) return false;
  collectGolden(1);
  return true;
}
function drawGolden(g) {
  if (!golden) return;
  const x = Math.round(golden.x);
  const y = Math.round(golden.y);
  const twinkle = Math.floor(golden.f / 3) % 2;
  if (golden.kind === 'star') {
    for (let i = 1; i < 10; i++) R(g, x - Math.sign(golden.v) * i * 2, y - i * 0.25, 2, 1, `rgba(255,236,140,${(1 - i / 10).toFixed(2)})`);
    R(g, x - 1, y - 1, 3, 3, '#fff6c0');
    R(g, x, y - 2, 1, 5, '#ffe27a');
    R(g, x - 2, y, 5, 1, '#ffe27a');
    return;
  }
  drawAnimal(g, { ...golden, path: [1], frame: Math.floor(golden.f), dir: golden.v > 0 ? 'r' : 'l' }, CHICKEN, GOLD_CHICKEN, 10, 8, 8);
  R(g, x + (twinkle ? -7 : 6), y - 12, 1, 1, '#ffffff');
  R(g, x + (twinkle ? 5 : -6), y - 4, 1, 1, '#fff6c0');
}

// ── What a fallen town leaves the next one ─────────────────────────────────────────────────────────────────────────

function legacyOf(s) {
  return s.era * 3 + Math.floor(s.houses / 5) + Math.floor((s.dex?.length ?? 0) / 4) + s.kids + (s.launched ? 5 : 0);
}
/** The next town starts with coins from the last one, and remembers it in the hall of towns. */
function inherit(prev) {
  const points = legacyOf(prev);
  const hall = [{ era: ERAS[prev.era].name, days: prev.age, houses: prev.houses }, ...(prev.hall ?? [])].slice(0, 5);
  return { gift: points * 8, hall, runs: (prev.runs ?? 1) + 1 };
}

// ── Wiring ─────────────────────────────────────────────────────────────────────────────────────────────────────────

function wireFun() {
  document.getElementById('awayClose')?.addEventListener('click', () => (document.getElementById('away').hidden = true));
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && welcomeBack());
  window.addEventListener('focus', welcomeBack);
  for (const b of document.querySelectorAll('[data-story]'))
    b.addEventListener('click', () => {
      for (const o of document.querySelectorAll('[data-story]')) o.setAttribute('aria-pressed', String(o === b));
      storyView = b.dataset.story;
      paintUi();
    });
  setInterval(() => live() && seen(), 60_000);
}
let storyView = 'all';

/** The story tab: everything, or only the chronicle (grouped by era). */
function storyItems() {
  if (storyView !== 'big') return null;
  const list = S.chronicle ?? [];
  if (!list.length) return [el('li', '', '아직 큰 사건이 없어요')];
  const out = [];
  let era = -1;
  for (const c of list) {
    if (c.era !== era) {
      era = c.era;
      out.push(el('li', 'group', ERAS[era].name));
    }
    const li = el('li');
    li.append(el('span', 'day', `${c.day}일차`), el('span', `dot ${storyKind(c.text).kind}`), el('span', '', storyKind(c.text).text));
    out.push(li);
  }
  return out;
}

/** Rows for the build tab: how dramatic life is (free to change). */
function tellerRows() {
  const out = [el('li', 'group', '마을 분위기')];
  const li = el('li', 'buy');
  const pair = el('div', 'buy__pair grow');
  for (const t of TELLERS) {
    const b = el('button', 'btn', t.name);
    b.title = t.note;
    b.setAttribute('aria-pressed', String((S.teller ?? 'usual') === t.id));
    b.addEventListener('click', () => {
      S.teller = t.id;
      for (const o of pair.children) o.setAttribute('aria-pressed', String(o === b));
      toast(`${t.name}: ${t.note}`);
      save();
    });
    pair.append(b);
  }
  li.append(pair);
  out.push(li);
  return out;
}

// ── Collapses and graves: in both modes, a building sinks into its rubble and the dead leave a stone for a while ──

let collapses = []; // { img, x, y, w, h, t, T }
let tombs = []; //     { x, y, t }
const COLLAPSE_TICKS = 18; // about 2 seconds
const TOMB_TICKS = 56; //     about 7 seconds

/** The building as it stood, cut out on its own (no ground behind it), so it can sink. */
function cutOut(x0, w, bottom, draw) {
  const c = document.createElement('canvas');
  c.width = w + 24;
  c.height = bottom + 4;
  const g = c.getContext('2d');
  if (!g) return null;
  g.translate(-x0 + 12, 0);
  draw(g);
  return c;
}
/** Lot i is falling down (war, bombs, tornado …): it sinks, shakes and throws up dust and bits. */
function collapseLot(i) {
  const tx = lotX(i);
  const bottom = lotBottom(i);
  const img = cutOut(tx * T, 2 * T, bottom, (g) => house(g, tx, 2, false, bottom));
  if (img) collapses.push({ img, x: tx * T - 12, w: img.width, bottom, t: COLLAPSE_TICKS, bits: debris(tx * T + T, bottom) });
}
function collapseLandmark(l) {
  const base = (ROAD_Y + 4) * T + 8;
  const img = cutOut(l.x * T, l.w * T, base + 8, (g) => landmark(g, l));
  if (img) collapses.push({ img, x: l.x * T - 12, w: img.width, bottom: base + 8, t: COLLAPSE_TICKS + 6, bits: debris((l.x + l.w / 2) * T, base) });
}
function debris(cx, bottom) {
  return Array.from({ length: 10 }, () => ({ x: cx + (Math.random() - 0.5) * 20, y: bottom - 10 - Math.random() * 20, vx: (Math.random() - 0.5) * 3, vy: -2 - Math.random() * 3, c: Math.random() < 0.5 ? '#8a8a92' : '#a0603a' }));
}
/** A grave stone where someone (or some animal) died; it fades after a few seconds. */
function tomb(x, y) {
  if (tombs.length > 30) tombs.shift();
  tombs.push({ x: Math.round(x), y: Math.round(y), t: TOMB_TICKS });
}

function fxTick(k) {
  for (const c of collapses) {
    c.t -= k;
    for (const b of c.bits) {
      b.x += b.vx * k;
      b.y += b.vy * k;
      b.vy += 0.4 * k;
      if (b.y > c.bottom) (b.y = c.bottom), (b.vx = 0), (b.vy = 0);
    }
  }
  collapses = collapses.filter((c) => c.t > -8);
  for (const t of tombs) t.t -= k;
  tombs = tombs.filter((t) => t.t > 0);
}

const RIP = (() => {
  const L = { R: ['kk.', 'k.k', 'kk.', 'k.k', 'k.k'], I: ['k', 'k', 'k', 'k', 'k'], P: ['kk.', 'k.k', 'kk.', 'k..', 'k..'] };
  const row = (i) => `.o${`${L.R[i]}S${L.I[i]}S${L.P[i]}`.replace(/\./g, 'S')}o.`;
  return ['...ooooooo...', '..oSSSSSSSo..', '.oSSSSSSSSSo.', ...[0, 1, 2, 3, 4].map(row), '.oSSSSSSSSSo.', 'ooooooooooooo', '.ggggggggggg.'];
})();
const RIP_PAL = { o: '#5a5e6a', S: '#c4c8d2', k: '#4a4e5a', g: '#6cb04a' };

function drawFx(g) {
  for (const c of collapses) {
    const p = Math.max(0, Math.min(1, 1 - c.t / COLLAPSE_TICKS));
    const h = c.img.height;
    const sink = Math.round(p * p * h);
    const shake = c.t > 0 ? (Math.floor(c.t) % 2 ? 1 : -1) : 0;
    if (h - sink > 0) {
      g.globalAlpha = Math.max(0, 1 - p * 0.3);
      g.drawImage(c.img, 0, 0, c.w, h - sink, c.x + shake, sink, c.w, h - sink);
      g.globalAlpha = 1;
    }
    // Dust rising at the foot.
    for (let i = 0; i < 6; i++) {
      const d = p * 18 + i * 3;
      disc(g, c.x + 12 + (i / 5) * (c.w - 24), c.bottom - 2 - d * 0.4, 3 + p * 3, `rgba(200, 185, 160, ${(0.7 * (1 - p)).toFixed(2)})`);
    }
    for (const b of c.bits) R(g, Math.round(b.x), Math.round(b.y), 2, 2, b.c);
  }
  for (const t of tombs) {
    const rise = Math.min(1, (TOMB_TICKS - t.t) / 4); // pops up out of the ground
    g.globalAlpha = Math.min(1, t.t / 10);
    const rows = RIP.slice(0, Math.max(2, Math.round(RIP.length * rise)));
    spr(g, rows, RIP_PAL, t.x - 6, t.y - rows.length + 1);
    g.globalAlpha = 1;
  }
}

/** Sick people look it: a green face. */
const SICK_SKIN = '#a8d890';
