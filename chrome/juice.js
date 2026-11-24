// 작은 마을 — what makes breaking things feel good in 인성 파탄 모드: the view shakes and freezes for a beat on a
// big hit, houses burst into pieces that bounce and settle, every hit scores and quick hits chain into a combo,
// a destruction bar fills to 100 % and ends the round with a result card (grade, best combo, personal best, one
// tap to go again), one small challenge a round, houses that knock their neighbours down, villagers who shout
// something silly as they run, two new tools (a UFO and a giant cat paw). No sound: people play this at work. Chaos mode
// only. Loaded after chaos.js and before game.js: nothing here touches
// game.js at load time, only when called.
'use strict';

// ── Shake and hit-stop ────────────────────────────────────────────────────────────────────────────────────────────

let shakeT = 0;
let shakePow = 0;
let hitStop = 0; // frames to hold still
function kick(power, stop = 0) {
  if (MODE !== 'chaos') return;
  shakePow = Math.max(shakePow * (shakeT > 0 ? 1 : 0), power);
  shakeT = 9;
  hitStop = Math.max(hitStop, stop);
}
/** This frame's offset in game pixels (decays over ~200 ms). */
function shakeOffset() {
  if (shakeT <= 0) return [0, 0];
  const p = shakePow * (shakeT / 9);
  return [Math.round((Math.random() * 2 - 1) * p), Math.round((Math.random() * 2 - 1) * p * 0.6)];
}

// ── Debris: chunks that fly, bounce once and settle, then fade ────────────────────────────────────────────────────

let bits = [];
const BIT_COLOURS = [
  ['#d4ad5b', '#a8843a', '#6b4428'],
  ['#d9a86c', '#b88a5a', '#8a5a32'],
  ['#efe2c4', '#b84a3a', '#6b4428'],
  ['#a54b3c', '#5f6670', '#e8e0d0'],
  ['#e8ecef', '#3b5b8c', '#8fd0f0'],
  ['#dfe8f0', '#5ad7e8', '#3a4a66'],
];
function burst(x, y, n = 16, big = 1) {
  const cols = BIT_COLOURS[S.era] ?? BIT_COLOURS[0];
  for (let i = 0; i < n && bits.length < 240; i++)
    bits.push({
      x: x + (Math.random() * 2 - 1) * 10 * big,
      y: y - Math.random() * 14 * big,
      vx: (Math.random() * 2 - 1) * 2.4 * big,
      vy: -1.5 - Math.random() * 3.5 * big,
      floor: y + 4 + Math.random() * 10,
      c: cols[i % cols.length],
      s: Math.random() < 0.3 ? 3 : 2,
      bounced: false,
      life: 90 + Math.random() * 60, // ticks' worth (8 a second): settled pieces fade after ~12–18 s
    });
}
function bitsTick(k) {
  bits = bits.filter((b) => {
    b.life -= k;
    if (b.vy === 0 && b.vx === 0) return b.life > 0;
    b.x += b.vx * k;
    b.y += b.vy * k;
    b.vy += 0.45 * k;
    if (b.y >= b.floor) {
      b.y = b.floor;
      if (!b.bounced && Math.abs(b.vy) > 1.2) {
        b.bounced = true;
        b.vy *= -0.35;
        b.vx *= 0.5;
      } else [b.vx, b.vy] = [0, 0];
    }
    return b.life > 0;
  });
}
function drawBits(g) {
  for (const b of bits) {
    if (!onScreen(b.x)) continue;
    if (b.life < 20) g.globalAlpha = b.life / 20;
    R(g, Math.round(b.x), Math.round(b.y), b.s, b.s, b.c);
  }
  g.globalAlpha = 1;
}

// ── Score, combo, floating numbers ────────────────────────────────────────────────────────────────────────────────

const POINTS = { house: 100, landmark: 500, person: 30, animal: 20, slip: 60, zombie: 40 };
let combo = { n: 0, until: 0 };
let floats = [];
let comboShow = 0;
/** Every bit of destruction lands here (chaos.js calls it). */
function hit(kind, x, y) {
  if (MODE !== 'chaos') return;
  const st = S.chaosStats;
  const now = Date.now();
  st.startedAt ??= now;
  combo.n = now < combo.until ? combo.n + 1 : 1;
  combo.until = now + 1500;
  st.bestCombo = Math.max(st.bestCombo ?? 0, combo.n);
  const pts = Math.round((POINTS[kind] ?? 10) * Math.min(10, 1 + (combo.n - 1) * 0.5));
  st.score = (st.score ?? 0) + pts;
  if (x != null) floats.push({ x, y: y - 18, text: `+${pts}`, t: 16, big: kind === 'landmark' || kind === 'house' });
  if (floats.length > 24) floats.shift();
  if (combo.n >= 2) comboShow = 14;
  if (kind === 'house') kick(2, 2);
  else if (kind === 'landmark') kick(4, 4);
  else if (kind === 'slip') kick(1);
  challengeHit(kind);
  checkFinale();
  statsDirty = true;
}
function floatsTick(k) {
  for (const f of floats) {
    f.t -= k;
    f.y -= 0.6 * k;
  }
  floats = floats.filter((f) => f.t > 0);
  if (comboShow > 0) comboShow -= k;
  if (shakeT > 0) shakeT -= k;
}
function drawFloats(g) {
  g.font = 'bold 7px sans-serif';
  g.textAlign = 'center';
  for (const f of floats) {
    if (!onScreen(f.x)) continue;
    g.globalAlpha = Math.min(1, f.t / 6);
    g.fillStyle = '#3a2a30';
    g.fillText(f.text, Math.round(f.x) + 1, Math.round(f.y) + 1);
    g.fillStyle = f.big ? '#ffd23f' : '#ffffff';
    g.fillText(f.text, Math.round(f.x), Math.round(f.y));
  }
  g.globalAlpha = 1;
  g.textAlign = 'left';
}
/** The combo over the whole view (screen space). */
function drawComboHud(g) {
  if (MODE !== 'chaos' || comboShow <= 0 || combo.n < 2) return;
  const size = Math.min(16, 9 + combo.n);
  g.font = `bold ${size}px sans-serif`;
  g.textAlign = 'center';
  const y = 30 + (comboShow > 11 ? -2 : 0);
  g.globalAlpha = Math.min(1, comboShow / 5);
  g.fillStyle = '#3a2a30';
  g.fillText(`${combo.n} 콤보!`, VIEW_W / 2 + 1, y + 1);
  g.fillStyle = combo.n >= 8 ? '#ff5a7a' : combo.n >= 5 ? '#ff9a3a' : '#ffd23f';
  g.fillText(`${combo.n} 콤보!`, VIEW_W / 2, y);
  g.globalAlpha = 1;
  g.textAlign = 'left';
}

// ── How much is down: the bar, and the end of a round ─────────────────────────────────────────────────────────────

const buildingsTotal = () => S.houses + S.landmarks.length;
const buildingsDown = () => (S.wrecked?.length ?? 0) + (S.wreckedLm?.length ?? 0);
const wreckPct = () => Math.round((buildingsDown() / Math.max(1, buildingsTotal())) * 100);
let chaosBest = null; // { [era]: { score, secs } } — its own small key, never the life town's save
async function loadChaosBest() {
  try {
    chaosBest = (await aquila.storage.get('chaosBest')) ?? {};
  } catch {
    chaosBest = {};
  }
}
function saveChaosBest() {
  void aquila.storage.set('chaosBest', chaosBest).catch(() => {});
}
function checkFinale() {
  const st = S.chaosStats;
  if (st.done || buildingsDown() < buildingsTotal()) return;
  st.done = true;
  st.secs = Math.max(1, Math.round((Date.now() - (st.startedAt ?? Date.now())) / 1000));
  // The last one falls slowly: a long hold, a big shake, then the card.
  kick(5, 14);
  burst(camX + VIEW_W / 2, ROAD_Y * T, 30, 1.6);
  const round = chaosRound;
  setTimeout(() => round === chaosRound && showFinale(), 1400);
}
const gradeOf = (secs, total) => {
  const per = secs / Math.max(1, total); // seconds a building
  return per < 1.2 ? 'S' : per < 2.5 ? 'A' : per < 5 ? 'B' : 'C';
};
function showFinale() {
  if (MODE !== 'chaos') return;
  const st = S.chaosStats;
  const grade = gradeOf(st.secs, buildingsTotal());
  chaosBest ??= {};
  const prev = chaosBest[S.era];
  const record = !prev || st.score > prev.score;
  if (record) chaosBest[S.era] = { score: st.score, secs: st.secs, grade };
  saveChaosBest();
  $('doneGrade').textContent = grade;
  $('doneGrade').dataset.grade = grade;
  $('doneTitle').textContent = record ? '새 기록이에요!' : '마을을 다 부쉈어요';
  $('doneText').textContent =
    `${ERAS[S.era].name} 마을을 ${st.secs}초 만에 다 부쉈어요. 점수 ${fmt(st.score)} · 최고 콤보 ${st.bestCombo ?? 1} · 쓰러진 주민 ${st.people}` +
    (prev && !record ? ` · 최고 기록 ${fmt(prev.score)}` : '');
  $('chaosDone').hidden = false;
}

// ── One small challenge a round ───────────────────────────────────────────────────────────────────────────────────

const CHALLENGES = [
  { id: 'bolt5', text: '번개만으로 집 5채', kind: 'house', tool: 'bolt', n: 5 },
  { id: 'slip3', text: '바나나로 3명 꽈당', kind: 'slip', n: 3 },
  { id: 'combo6', text: '6 콤보 만들기', combo: 6 },
  { id: 'cat4', text: '고양이 발로 4채', kind: 'house', tool: 'cat', n: 4 },
  { id: 'ufo6', text: 'UFO로 6명 데려가기', kind: 'person', tool: 'ufo', n: 6 },
  { id: 'zombie8', text: '좀비 8명 만들기', kind: 'zombie', n: 8 },
  { id: 'half30', text: '30초 안에 파괴율 50%', pct: 50, secs: 30 },
  { id: 'smash10', text: '망치로 집 10채', kind: 'house', tool: 'smash', n: 10 },
];
function newChallenge() {
  const c = CHALLENGES[Math.floor(Math.random() * CHALLENGES.length)];
  S.challenge = { id: c.id, got: 0, done: false };
}
const challengeOf = () => CHALLENGES.find((c) => c.id === S.challenge?.id) ?? null;
function challengeHit(kind) {
  const c = challengeOf();
  const ch = S.challenge;
  if (!c || ch.done) return;
  if (c.kind === kind && (!c.tool || c.tool === chaosTool)) ch.got++;
  const secs = (Date.now() - (S.chaosStats.startedAt ?? Date.now())) / 1000;
  const won =
    (c.n && ch.got >= c.n) || (c.combo && combo.n >= c.combo) || (c.pct && wreckPct() >= c.pct && secs <= c.secs);
  if (!won) return;
  ch.done = true;
  S.chaosStats.score = (S.chaosStats.score ?? 0) + 1000;
  confetti();
  toast(`도전 성공! ${c.text} · 보너스 1,000점`, 2600);
}
function challengeText() {
  const c = challengeOf();
  if (!c) return '';
  const ch = S.challenge;
  const progress = c.n ? ` (${Math.min(ch.got, c.n)}/${c.n})` : c.pct ? ` (${wreckPct()}%)` : '';
  return ch.done ? `✓ 도전 성공: ${c.text}` : `오늘의 도전: ${c.text}${progress}`;
}
function confetti() {
  const cols = ['#ff5a7a', '#ffd23f', '#5ad7e8', '#7ad06a', '#a07aff'];
  for (let i = 0; i < 40; i++)
    bits.push({ x: camX + Math.random() * VIEW_W, y: -4 - Math.random() * 30, vx: (Math.random() - 0.5) * 0.8, vy: 0.5 + Math.random(), floor: H - 4 - Math.random() * 60, c: cols[i % 5], s: 2, bounced: true, life: 50 + Math.random() * 30 });
}

// ── Knock-on: a falling house can take its neighbour; a factory or a rocket goes up ───────────────────────────────

let pending = [];
function knockOn(i) {
  if (MODE !== 'chaos' || Math.random() > 0.22) return;
  const next = i + (Math.random() < 0.5 ? 2 : -2);
  if (next >= 0 && next < S.houses && !S.wrecked.includes(next)) pending.push({ lot: next, at: Date.now() + 550 });
}
const EXPLODES = new Set(['factory', 'rocket', 'hospital']);
function landmarkDown(l) {
  hit('landmark', (l.x + l.w / 2) * T, (ROAD_Y + 3) * T);
  burst((l.x + l.w / 2) * T, (ROAD_Y + 3) * T, 26, 1.4);
  if (!EXPLODES.has(l.id)) return;
  // Something in there goes up too.
  const x = (l.x + l.w / 2) * T;
  const y = (ROAD_Y + 3) * T;
  pending.push({ boom: [x, y], at: Date.now() + 400 });
  story(`💥 ${l.name}이(가) 연쇄 폭발했어요!`);
}
function pendingTick() {
  const now = Date.now();
  const due = pending.filter((p) => p.at <= now);
  if (!due.length) return;
  pending = pending.filter((p) => p.at > now);
  for (const p of due) {
    if (MODE !== 'chaos') continue;
    if (p.boom) {
      const [x, y] = p.boom;
      fx.push({ k: 'flash', t: 4 }, { k: 'dust', x, y, t: 30 });
      for (let i = 0; i < S.houses; i++) if (dist(x, y, ...lotCenter(i)) < 50) wreckLot(i);
      killWithin(x, y, 46);
      scorch(x, y, 40);
      kick(4, 3);
    } else if (!S.wrecked.includes(p.lot)) {
      wreckLot(p.lot);
      knockOn(p.lot);
    }
  }
  paintChaosUi();
}

// ── Something silly to shout while running ────────────────────────────────────────────────────────────────────────

const SHOUTS = ['내 집!!', '보험 들걸…', '오늘 월요일인데', '엄마!!', '퇴근하고 싶다', '이게 무슨 일이야', '커피 쏟았잖아', '대출 아직 남았는데', '살려줘요~', '왜 하필 오늘', '택배 오는 날인데', '꺄아악', '어어어?', '집에 가스 껐나'];
function shoutNear(x, y) {
  const near = people.filter((e) => !e.hidden && !e.zombie && !e.shout && e.kind !== 'dog' && e.kind !== 'petcat' && dist(e.x, e.y, x, y) < 90);
  for (let i = 0; i < Math.min(2, near.length); i++) {
    const e = near[Math.floor(Math.random() * near.length)];
    e.shout = { text: SHOUTS[Math.floor(Math.random() * SHOUTS.length)], t: 18 };
  }
}
function drawShouts(g) {
  g.font = '6px sans-serif';
  for (const e of people) {
    if (!e.shout || e.hidden || !onScreen(e.x)) continue;
    const w = Math.ceil(g.measureText(e.shout.text).width) + 6;
    const x = Math.round(e.x - w / 2);
    const y = Math.round(e.y) - 38;
    g.fillStyle = '#ffffff';
    g.fillRect(x, y, w, 9);
    g.fillRect(x + 1, y - 1, w - 2, 11);
    R(g, Math.round(e.x) - 1, y + 10, 2, 2, '#ffffff');
    g.fillStyle = '#3a2a30';
    g.fillText(e.shout.text, x + 3, y + 7);
  }
}
function shoutTick() {
  for (const e of people) if (e.shout && --e.shout.t <= 0) e.shout = null;
}

// ── Two more tools: a UFO that beams things up, a giant cat paw that swats ────────────────────────────────────────

function useUfo(x, y) {
  fx.push({ k: 'ufo', x, y: 22, t: 40, tx: x });
  story('🛸 UFO가 나타났어요. 다 빨아들여요!');
  panic(x, y, 80);
  shoutNear(x, y);
}
function useCat(x, y) {
  fx.push({ k: 'paw', x, y: Math.max(ROAD_Y * T - 10, y), t: 12 });
  story('🐾 거대한 고양이 발이 내려왔어요. 냥!');
  shoutNear(x, y);
}
/** Each tick for the new tools' effects: the beam lifts whatever's under it; the paw lands on the 6th tick. */
function toolsTick() {
  for (const f of fx) {
    if (f.k === 'ufo') f.n = (f.n ?? 0) + 1; // ticks since it came
    if (f.k === 'ufo' && f.t > 6 && f.n % 3 === 0) {
      for (const e of [...people, ...animals])
        if (!e.hidden && e.kind !== 'guest' && Math.abs(e.x - f.x) < 14) {
          fx.push({ k: 'beamed', x: e.x, y: e.y, look: e.look, animal: animals.includes(e), t: 20 });
          people = people.filter((p) => p !== e);
          animals = animals.filter((a) => a !== e);
          if (MODE === 'chaos' && e.who) (S.gone ??= []).push(e.who);
          if (e.look) S.chaosStats.people++;
          else S.chaosStats.animals++;
          hit(e.look ? 'person' : 'animal', e.x, e.y);
        }
      const i = lotAt(f.x, ROAD_Y * T - 16, 18);
      if (i >= 0 && f.n >= 12) wreckLot(i); // after a second and a half, the house goes up too
    }
    if (f.k === 'paw' && !f.landed && f.t <= 6) {
      f.landed = true;
      const i = lotAt(f.x, f.y, 26);
      if (i >= 0) wreckLot(i);
      wreckLandmarksNear(f.x, f.y, 6);
      for (const e of [...people, ...animals]) if (!e.hidden && dist(e.x, e.y, f.x, f.y) < 30) launch(e);
      kick(3, 3);
      panic(f.x, f.y, 70);
    }
  }
}
function drawTools(g, f) {
  const x = Math.round(f.x);
  if (f.k === 'ufo') {
    const y = Math.round(f.y + Math.sin(f.t / 3) * 2);
    // The beam.
    g.fillStyle = `rgba(160, 255, 200, ${0.18 + (f.t % 4) * 0.04})`;
    g.beginPath();
    g.moveTo(x - 5, y + 4);
    g.lineTo(x + 5, y + 4);
    g.lineTo(x + 16, ROAD_Y * T + 12);
    g.lineTo(x - 16, ROAD_Y * T + 12);
    g.fill();
    disc(g, x, y, 5, '#a8e8ff');
    box(g, x - 12, y + 1, 25, 5, '#9aa4b8', '#4a5468');
    for (let i = 0; i < 5; i++) R(g, x - 9 + i * 5, y + 3, 2, 1, (f.t + i) % 3 ? '#ffd23f' : '#ff6b6b');
    return true;
  }
  if (f.k === 'beamed') {
    const p = 1 - f.t / 20;
    const y = Math.round(f.y - p * (f.y - 30));
    g.globalAlpha = 1 - p * 0.6;
    if (f.animal) spr(g, ['.oo.', 'owwo', 'owwo', '.oo.'], { o: '#8a6a4a', w: '#fffaf0' }, x - 2, y - 4);
    else drawPerson(g, { x, y, dir: ['d', 'r', 'u', 'l'][Math.floor(f.t / 2) % 4], frame: 0, path: [], seed: 0 }, f.look ?? { hair: '#3a2418', top: '#888', legs: '#555' });
    g.globalAlpha = 1;
    return true;
  }
  if (f.k === 'paw') {
    // Down from the top of the view, a beat on the ground, back up.
    const down = f.t > 6 ? (12 - f.t) / 6 : f.t / 6;
    const y = Math.round(-30 + down * (f.y + 30));
    const fur = '#f0a050';
    R(g, x - 9, -40, 18, y + 30, fur);
    R(g, x - 9, -40, 2, y + 30, '#c87830');
    disc(g, x, y, 11, fur);
    disc(g, x, y + 2, 5, '#ff9ec2');
    for (const dx of [-7, -2, 3, 8]) disc(g, x + dx - 1, y - 6, 2, '#ff9ec2');
    return true;
  }
  return false;
}

// ── Wiring and the frame ──────────────────────────────────────────────────────────────────────────────────────────

/** A fresh round: no leftovers from the last one, a new challenge. */
let chaosRound = 0; // a new round, a new number: timers from an old round see it and do nothing
function juiceReset() {
  chaosRound++;
  seaTrip = 0; //   a trip out to sea doesn't carry on in another town (pastimes.js)
  drones = []; //  village.js / motion.js effects don't follow you into another town
  leaps = [];
  pops = [];
  bits = [];
  floats = [];
  pending = [];
  combo = { n: 0, until: 0 };
  comboShow = 0;
  shakeT = 0;
  hitStop = 0;
  if (MODE === 'chaos') newChallenge();
  const done = document.getElementById('chaosDone');
  if (done) done.hidden = true;
}
function juiceTick() {
  if (MODE !== 'chaos') return false;
  pendingTick();
  shoutTick();
  toolsTick();
  return bits.length > 0 || floats.length > 0 || pending.length > 0;
}
function juiceVisual(k) {
  if (MODE !== 'chaos' && !bits.length) return;
  bitsTick(k);
  floatsTick(k);
}
function drawJuice(g) {
  if (MODE !== 'chaos') return;
  drawBits(g);
  drawShouts(g);
  drawFloats(g);
}
function paintJuiceUi() {
  const bar = document.getElementById('wreckFill');
  if (!bar || MODE !== 'chaos') return;
  const pct = wreckPct();
  bar.style.width = `${pct}%`;
  $('wreckPct').textContent = `${pct}%`;
  $('chaosScore').textContent = `점수 ${fmt(S.chaosStats.score ?? 0)}${chaosBest?.[S.era] ? ` · 최고 ${fmt(chaosBest[S.era].score)}` : ''}`;
  $('chaosChallenge').textContent = challengeText();
}
function wireJuice() {
  void loadChaosBest();
  $('chaosAgain')?.addEventListener('click', () => enterChaos(S.era));
  $('chaosOther')?.addEventListener('click', () => {
    $('chaosDone').hidden = true;
    $('eraPick').hidden = false;
  });
}
