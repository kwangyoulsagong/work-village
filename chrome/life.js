// 작은 마을 — more life: traffic that changes with the era (runners, riders, carts, carriages, bikes, cars, buses,
// hover cars, drones), more animals, villagers who all look different (skin, hair, glasses, beards, grandparents),
// pay that depends on your job, your traits and the era, and a build menu to spend coins yourself.
// Loaded before game.js: nothing here touches game.js at load time, only when called.
'use strict';

// ── More animals ───────────────────────────────────────────────────────────────────────────────────────────────────

const HEDGEHOG = [
  ['..o.o.o...', '.okokoko..', 'okkkkkkoso', 'okkkkkksen', '.oooooooo.', '..oo..oo..'],
  ['..o.o.o...', '.okokoko..', 'okkkkkkoso', 'okkkkkksen', '.oooooooo.', '...oo..oo.'],
];
const HEDGEHOG_PAL = { o: '#4a3428', k: '#7a5a42', K: '#a88060', s: '#f0d0a8', e: '#111111', n: '#111111' };
const TURTLE = [
  ['..oooo....', '.oGgGgo...', 'oGgGgGgoso', 'ooooooooes', '.so..so...'],
  ['..oooo....', '.oGgGgo...', 'oGgGgGgoso', 'ooooooooes', '..so..so..'],
];
const TURTLE_PAL = { o: '#3a5a2a', g: '#6a9a4a', G: '#8ab85a', s: '#a8c878', e: '#222222' };
const SWAN = [
  ['.......ooo.', '......owwey', '......owoo.', '......owo..', 'o.....owo..', 'owoooowwo..', 'owwwwwwwwo.', '.owwwwwwo..', '..oooooo...'],
  ['.......ooo.', '......owwey', '......owoo.', '......owo..', '......owo..', 'owoooowwo..', 'owwwwwwwwo.', '.owwwwwwo..', '...oooooo..'],
];
const SWAN_PAL = { o: '#8a8a9a', w: '#ffffff', e: '#222222', y: '#f08a3a' };
const BOAR = [
  ['..........oo..', '.........obbo.', 'o.ooooooobbebo', 'obbbbbbbbbbbnn', 'obbbbbbbbbbbwo', 'oBBBBBBBBBBbo.', '.oBBBBBBBBBo..', '.ol.ol..ol.ol.', '.oo.oo..oo.oo.'],
  ['..........oo..', '.........obbo.', 'o.ooooooobbebo', 'obbbbbbbbbbbnn', 'obbbbbbbbbbbwo', 'oBBBBBBBBBBbo.', '.oBBBBBBBBBo..', '..ol.ol.ol.ol.', '..oo.oo.oo.oo.'],
];
const BOAR_PAL = { o: '#3a2a20', b: '#7a5a42', B: '#5a4232', e: '#111111', n: '#c08a7a', w: '#fff8e0', l: '#4a3428' };
const BEAR = [
  ['..........o..o..', '.........obbbbo.', '.........obbebbo', '..oooooooobbbbnn', '.obbbbbbbbbbbbo.', 'obbbbbbbbbbbbbo.', 'obbbbbbbbbbbbbo.', 'oBBBBBBBBBBBBBo.', '.obbo.....obbo..', '.oooo.....oooo..'],
  ['..........o..o..', '.........obbbbo.', '.........obbebbo', '..oooooooobbbbnn', '.obbbbbbbbbbbbo.', 'obbbbbbbbbbbbbo.', 'obbbbbbbbbbbbbo.', 'oBBBBBBBBBBBBBo.', '..obbo...obbo...', '..oooo...oooo...'],
];
const BEAR_PAL = { o: '#2a1e18', b: '#6a4a32', B: '#523a28', e: '#111111', n: '#c8a080' };
const OWL = [
  ['o.....o', 'obbbbbo', 'oyeoeyo', 'obbnbbo', 'obwbwbo', 'obwwwbo', '.obbbo.', '..n.n..'],
  ['o.....o', 'obbbbbo', 'oyyoyyo', 'obbnbbo', 'obwbwbo', 'obwwwbo', '.obbbo.', '..n.n..'],
];
const OWL_PAL = { o: '#3a2a20', b: '#8a6a48', w: '#e8d8b8', y: '#f5d060', e: '#111111', n: '#e0a030' };
const RACCOON = [
  ['.........o.o', '........oggo', 'kK......oKen', 'Kk..ooooggo.', '.kKogggggggo', '...oggggggo.', '...oo.oo.oo.'],
  ['.........o.o', '........oggo', 'kK......oKen', 'Kk..ooooggo.', '.kKogggggggo', '...oggggggo.', '....oo.o.oo.'],
];
const RACCOON_PAL = { o: '#2a2a30', g: '#8a8a90', K: '#2a2a30', k: '#c8c8cc', e: '#ffffff', n: '#111111' };
const TURKEY = [
  ['.rffr.....', 'rfFFfr..o.', 'fFbbFf.obe', 'fFbbbbobbn', '.obbbbbbro', '.obbbbbbo.', '..oBBBBo..', '...y..y...'],
  ['.rffr.....', 'rfFFfr..o.', 'fFbbFf.obe', 'fFbbbbobbn', '.obbbbbbro', '.obbbbbbo.', '..oBBBBo..', '...y.y....'],
];
const TURKEY_PAL = { o: '#3a2a20', b: '#6a4a32', B: '#4a3424', f: '#a8703a', F: '#d8a050', r: '#e05050', e: '#111111', n: '#f0c040', y: '#f0a030' };
const DONKEY_PAL = { o: '#4a4448', h: '#9a9298', M: '#3a3438', e: '#222222', N: '#ece6e6', l: '#7a7278' };

/** The new animals: true when `e` was one of them (drawn or, at the wrong hour, hidden). */
function drawMoreAnimal(g, e) {
  switch (e.kind) {
    case 'hedgehog': drawAnimal(g, e, HEDGEHOG, HEDGEHOG_PAL, 10, 6, 7); return true;
    case 'turtle': drawAnimal(g, e, TURTLE, TURTLE_PAL, 10, 5, 8); return true;
    case 'swan': drawAnimal(g, e, SWAN, SWAN_PAL, 11, 9, 0); return true;
    case 'boar': drawAnimal(g, e, BOAR, BOAR_PAL, 14, 9, 12); return true;
    case 'bear': drawAnimal(g, e, BEAR, BEAR_PAL, 16, 10, 15); return true;
    case 'turkey': drawAnimal(g, e, TURKEY, TURKEY_PAL, 10, 8, 8); return true;
    case 'donkey': drawAnimal(g, e, HORSE, DONKEY_PAL, 16, 11, 14); return true;
    case 'owl': {
      const blink = Math.floor(clockTick() / 20) % 9 === 0;
      if (isNight()) drawAnimal(g, { ...e, path: blink ? [1] : [], frame: 3 }, OWL, OWL_PAL, 7, 8, 0);
      return true;
    }
    case 'raccoon':
      if (isNight()) drawAnimal(g, e, RACCOON, RACCOON_PAL, 12, 7, 10);
      return true;
  }
  return false;
}

/** Wildlife wherever the map put woods and water. Called at the end of spawnAnimals. */
function spawnMoreAnimals(add) {
  for (let i = 0; i < 2; i++) add('swan', { x: LAKE.x + 1, y: LAKE.y, w: LAKE.w - 2, h: Math.max(1, LAKE.h - 1) }, 0.25);
  for (let i = 0; i < 2; i++) add('turtle', { x: POND.x, y: POND.y + POND.h, w: POND.w, h: 1 }, 0.15);
  const groves = GROVES.filter((g) => g.w >= 6);
  const biggest = groves.reduce((m, g) => (!m || g.w > m.w ? g : m), null);
  groves.forEach((g, gi) => {
    const zone = { x: g.x, y: ROAD_Y + 2, w: g.w, h: 3 };
    if (gi < 5) add('hedgehog', zone, 0.35);
    if (g.w >= 10 && gi % 2 === 0) add('boar', zone, S.era <= 2 ? 0.8 : 0.6);
    if (gi % 2 === 1) add('raccoon', zone, 0.6);
    if (gi < 6) add('owl', { x: g.x + Math.floor(g.w / 2), y: ROAD_Y + 3, w: 1, h: 1 }, 0);
  });
  // A bear in the deepest woods, while the town is still small enough to leave it alone.
  if (biggest && biggest.w >= 14 && S.era <= 3) add('bear', { x: biggest.x + 2, y: ROAD_Y + 2, w: biggest.w - 4, h: 3 }, 0.4);
  for (let i = 0; i < (S.donkeys ?? 0); i++) add('donkey', { x: PEN.x + 1, y: PEN.y, w: PEN.w - 2, h: PEN.h }, 0.45);
  for (let i = 0; i < (S.turkeys ?? 0); i++) add('turkey', { x: PEN.x + 1, y: PEN.y, w: PEN.w - 2, h: PEN.h }, 0.55);
  spawnWildMore(add); // otters, magpies, water deer, and the young behind their mothers (village.js)
}

// ── Villagers who all look different ───────────────────────────────────────────────────────────────────────────────

const SKINS = ['#ffe0c4', '#ffd2ae', '#f0bd92', '#d99a6c', '#b07448', '#8a5636'];
const MORE_HAIRS = ['#e8c468', '#c8642a', '#a83a2a', '#3a2418', '#1c1c28', '#6a4a2a'];
const DYED = ['#ff8ac0', '#6ab8ff', '#9a7aff', '#5ee0b0'];
const STYLES = { f: [null, null, 'bob', 'pony', 'bun', 'curly'], m: [null, null, 'spiky', 'curly', null, 'bald'] };

/** One person's look, fixed per person and map: skin, hair colour and style, glasses, a beard. */
function villagerLook(id, base, gender, opts = {}) {
  const r = rng((S.mapSeed ?? 0) + id * 977 + 5);
  const skin = SKINS[Math.floor(r() * SKINS.length)];
  let hair = r() < 0.45 ? MORE_HAIRS[Math.floor(r() * MORE_HAIRS.length)] : base.hair;
  if (S.era >= 4 && r() < 0.25) hair = DYED[Math.floor(r() * DYED.length)];
  if (opts.elder) hair = r() < 0.5 ? '#d8d4d0' : '#b8b4b0';
  const list = STYLES[gender] ?? STYLES.m;
  const style = list[Math.floor(r() * list.length)];
  return {
    ...base,
    skin,
    hair,
    style: opts.elder && gender === 'm' && r() < 0.5 ? 'bald' : style,
    glasses: r() < (opts.elder ? 0.6 : 0.18),
    beard: gender === 'm' && r() < (opts.elder ? 0.5 : 0.2),
    elder: !!opts.elder,
  };
}

/** Hair styles over the head: the shop's (for you) and the villagers' own. */
function hairOverlay(g, style, at) {
  const { x, y, side, flip, pal } = at;
  const P = (rows, dy, dx = 0) => spr(g, rows, pal, x + dx, y + dy, flip);
  if (style === 'bob') P(side === 'u' ? ['ohhhhhhhhhho', '.ohhhhhhhho.'] : ['oh........ho', 'oh........ho', '.o........o.'], 8);
  else if (style === 'pony') P(side === 'r' ? ['ohh.........', 'ohh.........', '.ohh........', '..oo........'] : ['.....oo.....', '....ohho....', '....ohho....', '.....oo.....'], side === 'r' ? 4 : -3, side === 'r' ? -2 : 0);
  else if (style === 'curly') P(['..o.o..o.o..', '.ohohhohoho.'], -2);
  else if (style === 'spiky') P(['..o..o..o...', '.oho.oho.oho'], -2);
  else if (style === 'bun') P(['....oooo....', '...ohhhho...', '...ohHhho...'], -3);
  else if (style === 'bald' && side !== 'u') P(side === 'd' ? ['...oooooo...', '..osssssso..', '.osssssssso.', '.ossssssssso'] : ['....ooooo...', '...osssssoo.', '..ossssssso.', '.ohssssssso.'], 0);
}

/** Glasses, a beard, a walking stick: drawn over a villager after the body. */
function lookExtras(g, c, at) {
  const { x, y, side, flip, pal } = at;
  const P = (rows, dy, p = pal) => spr(g, rows, p, x, y + dy, flip);
  if (c.style) hairOverlay(g, c.style, at);
  if (c.glasses && side !== 'u') P(side === 'd' ? ['.oooo..oooo.', '.o..oooo..o.'] : ['.......oooo.', '.......o..o.'], 6, { ...pal, o: '#2a2a35' });
  if (c.beard && side !== 'u') P(side === 'd' ? ['.ohh.oo.hho.', '..ohhhhhho..'] : ['........hhho', '.......ohho.'], 9);
  if (c.elder) {
    const cx = flip ? x + 1 : x + 10;
    R(g, cx, y + 9, 1, 7, '#8a5a3a');
    R(g, cx + (flip ? 0 : -1), y + 9, 2, 1, '#8a5a3a');
  }
}

/** Grandparents: one in about a third of the houses, slow on their feet. */
const hasElder = (i) => ((i * 7 + (S.mapSeed ?? 0)) >>> 0) % 3 === 0;

// ── Pay: your job × how well your traits fit it × the era ──────────────────────────────────────────────────────────

/** Base pay of an era's jobs, as a share of what you earn by working. Later eras pay more. */
const JOB_PAY = [0.05, 0.07, 0.09, 0.11, 0.13, 0.16];
/** Jobs that pay in hits and misses: sometimes a lot, sometimes little. */
const VOLATILE = new Set(['athlete', 'soccer', 'star', 'creator', 'gamer', 'bard', 'hunter', 'actor', 'wrestler', 'gladiator', 'jester', 'circus', 'baseball', 'basketball', 'volleyball', 'holoidol', 'zerog', 'storyteller', 'painter', 'photographer', 'webtoon', 'mecha', 'dancer', 'musician']);
/** How well traits fit a job: 0.2 (not at all) … 1 (perfectly). */
const jobFit = (j, t) => {
  const [a, b] = JOB_FIT[j.id];
  return ((t?.[a] ?? 3) * 2 + (t?.[b] ?? 3)) / 15;
};
/** A job's pay for someone: era base × (0.5 + fit), swinging for the volatile ones. */
function jobPay(j, traits, luck = 0.5) {
  if (!j) return 0;
  const je = j.until ? Math.min(S.era, j.until) : j.era; // a job that lasts many eras pays like its time
  const pay = JOB_PAY[je] * (0.5 + jobFit(j, traits)) * (1 + (S.era - je) * 0.15);
  return VOLATILE.has(j.id) ? pay * (0.3 + luck * 1.4) : pay;
}
const myPay = (luck = Math.random()) => jobPay(myJob(), S.traits, luck);
/** The neighbours' jobs pay the town a little tax, too. */
function townPay() {
  let s = 0;
  const n = S.houses - S.vacant;
  for (let i = 0; i < n; i++) if (i !== S.spouse) s += jobPay(jobFor(i), villagerTraits(i));
  for (let k = 0; k < (S.folk ?? 0); k++) s += jobPay(jobFor(100 + k), villagerTraits(100 + k));
  return s * 0.03 * govTax(); // a tax rise lasts a week (politics.js)
}
const pct = (v) => `${Math.round(v * 100)}%`;

// ── Traffic: what goes down the road changes with the era ──────────────────────────────────────────────────────

const TRAFFIC_BY_ERA = [
  ['runner', 'runner', 'runner'],
  ['runner', 'runner', 'horse', 'horse', 'ox', 'ox'],
  ['runner', 'runner', 'horse', 'horse', 'horse', 'carriage', 'carriage', 'ox'],
  ['runner', 'runner', 'bike', 'bike', 'bike', 'oldcar', 'oldcar', 'oldcar', 'carriage', 'carriage', 'horse'],
  ['runner', 'runner', 'bike', 'bike', 'moto', 'moto', 'car', 'car', 'car', 'car', 'car', 'taxi', 'police', 'bus', 'truck'],
  ['runner', 'runner', 'bike', 'bike', 'hovermoto', 'hover', 'hover', 'hover', 'hover', 'hover', 'hover', 'hoverbus', 'drone', 'drone', 'drone'],
];
const VEHICLE = {
  runner: { len: 8, v: 0.8, slow: true },
  bike: { len: 13, v: 1.2, slow: true },
  horse: { len: 16, v: 1.4 },
  ox: { len: 28, v: 0.45, slow: true },
  carriage: { len: 30, v: 1.0 },
  oldcar: { len: 15, v: 1.1 },
  car: { len: 16, v: 1.6 },
  taxi: { len: 16, v: 1.7 },
  police: { len: 16, v: 2.0 },
  bus: { len: 32, v: 1.0 },
  truck: { len: 29, v: 1.1 },
  moto: { len: 13, v: 2.1 },
  hover: { len: 17, v: 2.2 },
  hovermoto: { len: 13, v: 2.6 },
  hoverbus: { len: 34, v: 1.4 },
  drone: { len: 8, v: 1.0, sky: true },
};
const CAR_COLOURS = ['#e05a4a', '#4a7fd0', '#f0c040', '#5cb84e', '#e8e8ee', '#8a6cc9', '#f08a3a', '#3a4a66', '#2fb0a0', '#d0486a'];

/** Fill the road for this era: spread along the map, half each way. */
function spawnTraffic() {
  // Twice the era's list: about one thing on the road every 120 px.
  const kinds = [...(TRAFFIC_BY_ERA[S.era] ?? []), ...(TRAFFIC_BY_ERA[S.era] ?? [])];
  const r = rng((S.mapSeed ?? 1) + S.era * 31);
  const out = kinds.map((type, i) => {
    const d = VEHICLE[type];
    const right = i % 2 === 0;
    const gender = r() < 0.5 ? 'f' : 'm';
    const lo = d.sky ? 0 : Math.max(0, landMinX()); // on the road: only where there's land (sea.js)
    const hi = d.sky ? W : Math.min(W, landMaxX());
    return {
      type,
      x: lo + ((i + r() * 0.6) / kinds.length) * (hi - lo),
      right,
      v: d.v * (0.85 + r() * 0.3),
      c: CAR_COLOURS[Math.floor(r() * CAR_COLOURS.length)],
      look: villagerLook(500 + i, { hair: HAIRS[i % HAIRS.length], top: TOPS[(i * 3) % TOPS.length], legs: LEG_COLORS[i % LEG_COLORS.length] }, gender),
      gender,
      f: Math.floor(r() * 12),
      ofs: 0,
      sky: d.sky ? 14 + Math.floor(r() * 18) : 0,
    };
  });
  return out;
}

/** Each frame: move, wrap round the map, and pull out to overtake anything slower just ahead. */
function trafficTick(list, k) {
  for (const c of list) {
    if (c.pause > 0) {
      c.pause -= k; // stopped for a chat or to lend a hand (village.js travellersTick)
      c.f += k * 0.3;
      continue;
    }
    c.x += (c.right ? 1 : -1) * c.v * k;
    c.f += k;
    if (!c.sky && hasSea()) {
      // The road ends at the beach: turn round there (and change lanes).
      if (c.right && c.x > landMaxX() - 20) c.right = false;
      else if (!c.right && c.x < landMinX()) c.right = true;
      continue;
    }
    if (c.x > W + 40) c.x = -40;
    if (c.x < -40) c.x = W + 40;
  }
  for (const c of list) {
    if (c.sky) continue;
    const len = VEHICLE[c.type].len;
    const blocked = list.some(
      (o) => o !== c && !o.sky && o.right === c.right && o.v < c.v && (c.right ? o.x - c.x : c.x - o.x) > -len && (c.right ? o.x - c.x : c.x - o.x) < len + 10,
    );
    const want = blocked ? -4 : 0;
    c.ofs += Math.sign(want - c.ofs) * Math.min(Math.abs(want - c.ofs), 0.6 * k);
  }
}

/** A lane's bottom edge: rightward traffic in the upper lane, leftward in the lower. */
const laneBottom = (c) => ROAD_Y * T + (c.right ? 9 : 15) + Math.round(c.ofs);

function drawTraffic(g, list) {
  const sorted = list.filter((c) => c.x > viewX - 48 && c.x < viewX + VIEW_W + 48).sort((a, b) => laneBottom(a) - laneBottom(b));
  for (const c of sorted) drawVehicle(g, c);
}

const RING = ['.ooo.', 'o...o', 'o.o.o', 'o...o', '.ooo.'];
function wheel(g, x, b, spin) {
  spr(g, RING, { o: OL }, x, b - 5);
  if (spin % 2) R(g, x + 2, b - 4, 1, 3, '#9a9aa8');
  else R(g, x + 1, b - 3, 3, 1, '#9a9aa8');
}
/** Head and shirt of someone riding (the legs are hidden by what they ride). */
function rider(g, c, x, y, flip, helmet, pedal) {
  const look = helmet ? { ...c.look, hair: helmet } : c.look;
  const pal = PERSON_PAL(look);
  if (pedal != null) spr(g, LEGS.r[pedal % 4], pal, x, y + 14, flip);
  spr(g, BODY.r, pal, x, y + 11, flip);
  spr(g, HEAD.r, pal, x, y, flip);
}

function drawVehicle(g, c) {
  const x = Math.round(c.x);
  const r = c.right;
  const flip = !r;
  const b = c.b ?? (c.sky ? c.sky : laneBottom(c)); // c.b: drawn somewhere else (your ride, parked)
  const step = Math.floor(c.f / 3);
  const light = (dx, yy) => R(g, r ? x + dx : x, yy, 1, 1, '#fff3a0');
  switch (c.type) {
    case 'runner': {
      const e = { x: x + 4, y: b, dir: r ? 'r' : 'l', path: c.pause > 0 ? [] : [1], frame: Math.floor(c.f * 1.5), seed: 0, gender: c.look.style ? null : c.gender };
      const at = drawPerson(g, e, c.look, { hairStyle: c.look.style });
      lookExtras(g, { ...c.look, elder: false }, at);
      drawTraveller(g, c, x, b); // a chat, a helping hand (village.js)
      return;
    }
    case 'bike':
    case 'moto':
    case 'hovermoto': {
      shadow(g, x + 6, b, 12);
      if (c.type === 'hovermoto') {
        box(g, x, b - 6, 13, 3, c.c);
        R(g, x + 1, b - 2, 11, 1, '#5ad7e8');
      } else {
        wheel(g, x, b, step);
        wheel(g, x + 8, b, step);
        if (c.type === 'moto') box(g, x + 3, b - 7, 7, 3, c.c);
        else R(g, x + 2, b - 4, 9, 1, c.c);
      }
      rider(g, c, x + (r ? 0 : 1), b - 21, flip, c.type === 'bike' ? null : '#f2f4f6', c.type === 'bike' ? step : 0);
      return;
    }
    case 'horse': {
      shadow(g, x + 8, b, 14);
      spr(g, HORSE[step % 2], HORSE_PAL, x, b - 11, flip);
      rider(g, c, x + (r ? 2 : 2), b - 19, flip, S.era >= 2 && c.gender === 'm' ? '#9aa0aa' : null);
      return;
    }
    case 'ox':
    case 'carriage': {
      const animal = c.type === 'ox' ? { rows: COW, pal: { ...COW_PAL, w: '#b08a68', B: '#6a4a32' }, w: 16, h: 10 } : { rows: HORSE, pal: HORSE_PAL, w: 16, h: 11 };
      const ax = r ? x + 14 : x;
      const cx = r ? x : x + 16;
      shadow(g, x + 15, b, 30);
      if (c.type === 'ox') {
        box(g, cx, b - 9, 12, 5, '#8a5a3a');
        R(g, cx + 1, b - 12, 10, 3, '#e8c860');
        R(g, cx + 3, b - 13, 6, 1, '#f2d878');
        wheel(g, cx + 4, b, step);
      } else {
        box(g, cx, b - 15, 13, 10, c.c === '#e8e8ee' ? '#8a3a3a' : shadeOf(c.c, 0.8));
        R(g, cx + 3, b - 13, 7, 4, '#cfe8f5');
        R(g, cx - 1, b - 16, 15, 2, '#3a2a2a');
        wheel(g, cx, b, step);
        wheel(g, cx + 8, b, step);
      }
      R(g, r ? cx + 12 : ax + 14, b - 6, 3, 1, '#6a4a32'); // the shaft
      spr(g, animal.rows[step % animal.rows.length], animal.pal, ax, b - animal.h, flip);
      return;
    }
    case 'oldcar': {
      shadow(g, x + 7, b, 15);
      box(g, x, b - 8, 15, 5, '#2a2a33');
      box(g, x + (r ? 3 : 5), b - 13, 7, 6, '#2a2a33');
      R(g, x + (r ? 4 : 6), b - 12, 5, 3, '#cfe8f5');
      wheel(g, x, b, step);
      wheel(g, x + 10, b, step);
      light(14, b - 7);
      return;
    }
    case 'car':
    case 'taxi':
    case 'police': {
      const body = c.type === 'taxi' ? '#f5c518' : c.type === 'police' ? '#f2f4f6' : c.c;
      shadow(g, x + 8, b, 16);
      box(g, x, b - 7, 16, 5, body);
      box(g, x + (r ? 3 : 4), b - 11, 9, 5, body);
      R(g, x + (r ? 4 : 5), b - 10, 7, 3, '#cfe8f5');
      if (c.type === 'police') {
        R(g, x + 1, b - 5, 14, 1, '#2a4ab0');
        const blink = Math.floor(c.f / 4) % 2;
        R(g, x + 6, b - 12, 2, 1, blink ? '#ff4040' : '#4060ff');
        R(g, x + 8, b - 12, 2, 1, blink ? '#4060ff' : '#ff4040');
      }
      if (c.type === 'taxi') box(g, x + 6, b - 13, 4, 2, '#ffffff');
      R(g, x + 2, b - 2, 3, 2, OL);
      R(g, x + 11, b - 2, 3, 2, OL);
      light(15, b - 6);
      return;
    }
    case 'bus':
    case 'hoverbus': {
      const hover = c.type === 'hoverbus';
      const bob = hover ? Math.round(Math.sin(c.f / 6)) : 0;
      shadow(g, x + 16, b, 32);
      box(g, x, b - 13 + bob, 32, 10, hover ? '#e8eef4' : '#3a8a5a');
      R(g, x + 1, b - 6 + bob, 30, 1, hover ? '#5ad7e8' : '#f0c040');
      for (let i = 0; i < 5; i++) R(g, x + 3 + i * 6, b - 11 + bob, 4, 3, '#cfe8f5');
      if (hover) R(g, x + 3, b - 2 + bob, 26, 1, '#5ad7e8');
      else {
        R(g, x + 4, b - 3, 4, 3, OL);
        R(g, x + 24, b - 3, 4, 3, OL);
      }
      light(31, b - 8 + bob);
      return;
    }
    case 'truck': {
      shadow(g, x + 14, b, 28);
      const cab = r ? x + 20 : x;
      const box0 = r ? x : x + 9;
      box(g, box0, b - 12, 20, 9, '#e8e4dc');
      R(g, box0 + 3, b - 9, 14, 2, c.c);
      box(g, cab, b - 9, 9, 6, c.c);
      R(g, cab + (r ? 4 : 1), b - 8, 4, 2, '#cfe8f5');
      for (const wx of [box0 + 2, box0 + 13, cab + 3]) R(g, wx, b - 3, 3, 3, OL);
      light(28, b - 6);
      return;
    }
    case 'hover': {
      const bob = Math.round(Math.sin(c.f / 5 + c.x / 50));
      shadow(g, x + 8, b, 12);
      box(g, x, b - 9 + bob, 17, 5, c.c);
      box(g, x + 4, b - 12 + bob, 9, 4, '#bfe8ff');
      R(g, x + 2, b - 3 + bob, 13, 1, '#5ad7e8');
      light(16, b - 7 + bob);
      return;
    }
    case 'drone': {
      const bob = Math.round(Math.sin(c.f / 4));
      const y = b + bob;
      R(g, x, y, 8, 2, '#3a3f4a');
      R(g, x - 1, y - 1, 3, 1, c.f % 2 < 1 ? '#c8d0d8' : '#8a929a');
      R(g, x + 6, y - 1, 3, 1, c.f % 2 < 1 ? '#8a929a' : '#c8d0d8');
      box(g, x + 2, y + 3, 4, 3, '#c89a5a');
      if (Math.floor(c.f / 6) % 2) R(g, x + 3, y, 1, 1, '#ff4040');
      return;
    }
  }
  drawMoreVehicle(g, c, x, b, r, flip, step); // rides.js: the rest of each era's road and sky
}

// ── Build it yourself: spend coins on what you want ────────────────────────────────────────────────────────────────

/** Decorations you place on the map with a tap. */
const DECOR = [
  { id: 'flowers', name: '꽃밭', era: 0, cost: 15 },
  { id: 'tree', name: '나무', era: 0, cost: 10 },
  { id: 'rock', name: '돌무더기', era: 0, cost: 8 },
  { id: 'bench', name: '벤치', era: 1, cost: 25 },
  { id: 'well', name: '우물', era: 1, cost: 40 },
  { id: 'statue', name: '동상', era: 2, cost: 120 },
  { id: 'museum', name: '박물관', era: 1, cost: 250 },
  { id: 'lamp', name: '가로등', era: 3, cost: 30 },
  { id: 'fountain', name: '분수', era: 3, cost: 200 },
  { id: 'vending', name: '자판기', era: 4, cost: 60 },
  { id: 'busstop', name: '버스 정류장', era: 4, cost: 50 },
  { id: 'holo', name: '홀로그램 나무', era: 5, cost: 150 },
  { id: 'robot', name: '청소 로봇', era: 5, cost: 120 },
];
/** Animals you can buy, by era; the pen holds up to six of each. */
const SHOP_ANIMALS = [
  { key: 'chickens', name: '닭', era: 0, cost: 20 },
  { key: 'goats', name: '염소', era: 0, cost: 35 },
  { key: 'cows', name: '소', era: 1, cost: 70 },
  { key: 'sheep', name: '양', era: 1, cost: 45 },
  { key: 'horses', name: '말', era: 1, cost: 80 },
  { key: 'donkeys', name: '당나귀', era: 1, cost: 60 },
  { key: 'pigs', name: '돼지', era: 2, cost: 55 },
  { key: 'turkeys', name: '칠면조', era: 2, cost: 40 },
  { key: 'alpacas', name: '알파카', era: 4, cost: 120 },
];
const PEN_MAX = 6;
const CORE_NAMES = { farm: '농장', pond: '연못·상점', pen: '목장', plaza: '광장' };
const MOVE_COST = 20;
const FOLK_COST = () => 50 + 15 * (S.folk ?? 0);
const REMODEL_COST = 40;

let placing = null; // a DECOR item waiting for a tap on the map

function pick(d) {
  placing = d;
  document.body.dataset.placing = String(!!d);
  if (d) toast(`${josa(d.name, '을', '를')} 놓을 곳을 마을에서 눌러요`, 0);
  else toast('');
}

/** A house you build yourself: the usual price with materials, half again without. */
function myHouseCost() {
  const mats = haveMaterials(materialsFor('house', S.houses));
  return { coins: mats ? buildCost(S.houses) : Math.ceil(buildCost(S.houses) * 1.5), mats };
}

/** Every row of the build menu: what it is, what it costs, whether you can, and what to do. */
function buildRows() {
  const rows = [];
  const add = (group, name, note, cost, ok, act) => rows.push({ group, name, note, cost, ok: ok && S.coins >= cost, act });
  const free = lotCandidates().length > 0;
  // Town
  if (S.vacant > 0) add('마을', '빈집에 가족 맞이하기', `${FAMILIES[occupied()].family}`, Math.ceil(buildCost(occupied()) / 2), true, welcome);
  const hc = myHouseCost();
  add('마을', '집 한 채 더 짓기', S.houses >= LOTS ? '더 지을 땅이 없어요' : !free ? '숲을 먼저 개간해요' : hc.mats ? '재료 사용' : '재료가 없어 1.5배', hc.coins, S.houses < LOTS && free && S.vacant === 0, () => {
    // build() takes the usual price (and the materials, when asked); without materials you pay half again.
    if (!hc.mats) S.coins -= hc.coins - buildCost(S.houses);
    build(hc.mats);
  });
  add('마을', '주민 한 명 모시기', `지금 ${S.folk ?? 0}명 · 직업을 갖고 세금을 내요`, FOLK_COST(), (S.folk ?? 0) < Math.max(2, occupied()), addFolk);
  const c = clearable();
  add('마을', '숲 개간하기', c ? '새 동네 터 · 나무 +15' : '개간할 숲이 없어요', clearCost(), !!c, clearWoods);
  const lm = nextLandmark();
  if (lm) add('마을', `${lm.name} 짓기`, haveMaterials(materialsFor('landmark', lm)) ? lm.does : `재료 필요: ${materialsText(materialsFor('landmark', lm))}`, lm.cost, haveMaterials(materialsFor('landmark', lm)), () => raise(lm));
  const next = ERAS[S.era + 1];
  if (next && !lm) add('마을', `${next.name}로 발전하기`, haveMaterials(materialsFor('era')) ? '새 직업·탈것·건물' : `재료 필요: ${materialsText(materialsFor('era'))}`, next.cost, haveMaterials(materialsFor('era')), advance);
  // Home
  add('우리 집', '집 리모델링', '지붕과 벽 색이 바뀌어요', REMODEL_COST, true, () => {
    S.coins -= REMODEL_COST;
    S.homeLook = ((S.homeLook ?? 0) + 1) % HOUSE_LOOKS.length;
    story('🏠 우리 집을 새로 칠했어요.');
    cache.dirty = true;
  });
  if (!S.dog) add('우리 집', '강아지 입양', '어디든 따라와요', 30, true, () => ((S.coins -= 30), adoptDog()));
  if (!S.cat) add('우리 집', '고양이 입양', '집 근처를 어슬렁거려요', 30, true, () => {
    S.coins -= 30;
    S.cat = true;
    story('🐈 고양이를 입양했어요.');
    spawnFamily();
  });
  rideRows(add); // your own ride (rides.js)
  boatRows(add); // a boat, on a map with a sea (pastimes.js)
  // Farm
  const up = FARM_UPGRADES.find((u) => !S.farm.includes(u.id) && u.era <= S.era);
  if (up) add('농장', up.name, up.does, up.cost, true, () => farmBuy(up));
  for (const a of SHOP_ANIMALS) {
    if (a.era > S.era) continue;
    const n = S[a.key] ?? 0;
    add('농장', `${a.name} 들이기`, `${n}/${PEN_MAX}마리`, a.cost, n < PEN_MAX, () => {
      S[a.key] = n;
      buyAnimal(a.key, a.cost, a.name);
    });
  }
  // Decor
  for (const d of DECOR) if (d.era <= S.era) add('꾸미기', d.name, placing?.id === d.id ? '마을에서 놓을 곳을 눌러요' : '고른 뒤 마을을 눌러 놓아요', d.cost, true, () => pick(placing?.id === d.id ? null : d));
  return rows;
}

/** One more neighbour: lives with a family, has a job, pays a little tax. */
function addFolk() {
  S.coins -= FOLK_COST();
  S.folk = (S.folk ?? 0) + 1;
  story(`🧳 새 주민이 마을에 왔어요. ${josa(jobFor(100 + S.folk - 1).name, '으로', '로')} 일한대요.`);
  spawnFamily();
}
/** The extra neighbours, for spawnFamily. */
function folkPeople() {
  const out = [];
  const homes = Math.max(1, occupied());
  for (let k = 0; k < (S.folk ?? 0); k++) {
    const id = 100 + k;
    const gender = k % 2 ? 'm' : 'f';
    const job = jobFor(id);
    const base = { hair: HAIRS[(k * 3) % HAIRS.length], top: job.top, legs: LEG_COLORS[(k * 2) % LEG_COLORS.length] };
    out.push(
      make('villager', doorOf(k % homes), {
        who: `f${k}`,
        look: villagerLook(id, base, gender),
        home: k % homes,
        gender,
        role: ROLES[k % ROLES.length],
        job,
        speed: job.at === 'run' ? 2 : 1,
        needs: { energy: 60 + Math.random() * 40, hunger: 50 + Math.random() * 50, social: 40 + Math.random() * 60 },
      }),
    );
  }
  return out;
}

/** Can a decoration go on this tile? Grass only: not the road, water, pens, fields, houses or lots. */
function canPlace(tx, ty) {
  if (ty < 2 || ty >= ROWS || ty === ROAD_Y || !walkable(tx, ty)) return false;
  if (PLOT_AT.some(([px, py]) => px === tx && py === ty)) return false;
  if (inRect(PLAZA, tx, ty) || (S.decor ?? []).some((d) => d.x === tx && d.y === ty)) return false;
  if (ty >= 3 && ty <= 5 && (LOT_X.some((l) => tx === l || tx === l + 1) || (tx >= HOME.x - 1 && tx <= HOME.x + HOME.w))) return false;
  if (ty >= ROAD_Y + 2 && ty <= ROAD_Y + 4 && (S.cleared ?? []).some((c) => tx >= c.x && tx < c.x + c.w)) return false;
  if (tx >= FARM.x && tx < FARM.x + 12 && ty >= ROAD_Y + 1) return false;
  return true;
}
function placeDecor(wx, wy) {
  const tx = Math.floor(wx / T);
  const ty = Math.floor(wy / T);
  if (!placing || S.coins < placing.cost) return pick(null), paintUi();
  if (!canPlace(tx, ty)) return toast('여기엔 놓을 수 없어요. 풀밭을 골라 주세요');
  const d = placing;
  S.coins -= d.cost;
  (S.decor ??= []).push({ k: d.id, x: tx, y: ty });
  if (S.decor.length === 1) story(`🌼 마을에 처음으로 ${josa(d.name, '을', '를')} 놓았어요.`);
  pick(null);
  toast(`${josa(d.name, '을', '를')} 놓았어요`);
  wishDone('decor', d.id);
  cache.dirty = true;
  save();
  paintUi();
}
/** A short line over the town; `ms` 0 keeps it until the next one. */
function toast(text, ms = 1800) {
  const t = document.getElementById('toast');
  if (!t) return;
  clearTimeout(toast.t);
  t.textContent = text;
  t.hidden = !text;
  if (text && ms) toast.t = setTimeout(() => (t.hidden = true), ms);
}

/** Decorations, drawn into the still picture. */
function drawDecor(g) {
  for (const d of S.decor ?? []) {
    const x = d.x * T;
    const b = d.y * T + T - 2;
    switch (d.k) {
      case 'flowers':
        R(g, x + 2, b - 3, 12, 3, '#5a8a3a');
        for (const [fx, c] of [[3, '#ff6a8a'], [6, '#ffd23f'], [9, '#ffffff'], [12, '#b07aff']]) {
          R(g, x + fx, b - 5, 2, 2, c);
          R(g, x + fx, b - 3, 1, 1, '#3f7a3a');
        }
        break;
      case 'tree':
        drawTree(g, x + 8, b, S.season);
        break;
      case 'rock':
        box(g, x + 3, b - 5, 7, 5, '#a8a8b0');
        box(g, x + 8, b - 4, 5, 4, '#8a8a94');
        break;
      case 'bench':
        shadow(g, x + 8, b, 14);
        R(g, x + 2, b - 6, 12, 2, '#a8693a');
        R(g, x + 2, b - 9, 12, 2, '#8a5530');
        R(g, x + 3, b - 4, 1, 4, OL);
        R(g, x + 12, b - 4, 1, 4, OL);
        break;
      case 'well':
        shadow(g, x + 8, b, 14);
        box(g, x + 2, b - 7, 12, 7, '#9a9aa4');
        R(g, x + 4, b - 6, 8, 2, '#3a6a9a');
        R(g, x + 3, b - 14, 1, 7, '#7a4a2a');
        R(g, x + 12, b - 14, 1, 7, '#7a4a2a');
        box(g, x + 1, b - 16, 14, 3, '#b84a3a');
        break;
      case 'statue':
        shadow(g, x + 8, b, 12);
        box(g, x + 3, b - 5, 10, 5, '#c8c0b0');
        box(g, x + 6, b - 15, 4, 10, '#d8d4cc');
        box(g, x + 5, b - 19, 6, 5, '#e4e0d8');
        break;
      case 'museum':
        drawMuseum(g, x, b);
        break;
      case 'lamp':
        R(g, x + 7, b - 16, 2, 16, '#3a3f4a');
        box(g, x + 5, b - 19, 6, 4, isNight() ? '#ffe08a' : '#e8e4d8');
        break;
      case 'fountain':
        shadow(g, x + 8, b, 16);
        box(g, x, b - 6, 16, 6, '#b8b4ac');
        R(g, x + 2, b - 5, 12, 3, '#6ab8e8');
        box(g, x + 6, b - 12, 4, 7, '#c8c4bc');
        R(g, x + 7, b - 16, 2, 4, '#a8dcff');
        break;
      case 'vending':
        shadow(g, x + 8, b, 10);
        box(g, x + 3, b - 15, 10, 15, '#d8404a');
        R(g, x + 5, b - 13, 6, 6, '#cfe8f5');
        R(g, x + 5, b - 5, 6, 2, OL);
        break;
      case 'busstop':
        R(g, x + 2, b - 14, 1, 14, '#3a3f4a');
        box(g, x + 1, b - 16, 14, 3, '#3a8a5a');
        R(g, x + 4, b - 6, 10, 2, '#8a8a94');
        box(g, x + 11, b - 13, 3, 4, '#f2f4f6');
        break;
      case 'holo':
        R(g, x + 7, b - 8, 2, 8, '#5a6a7a');
        for (let i = 0; i < 3; i++) box(g, x + 3 + i, b - 18 + i * 4, 10 - i * 2, 4, ['#5ee0f0', '#9a7aff', '#5ee0b0'][i], '#3a8aa0');
        break;
      case 'robot':
        shadow(g, x + 8, b, 10);
        box(g, x + 4, b - 6, 8, 5, '#d8dee6');
        R(g, x + 6, b - 5, 1, 1, '#3ad0ff');
        R(g, x + 9, b - 5, 1, 1, '#3ad0ff');
        R(g, x + 4, b - 1, 8, 1, '#5a6a7a');
        break;
    }
  }
}

/** Moving a block of the town (farm, pond, pen, square) one place left or right of its neighbour. */
function moveBlock(id, dir) {
  const order = (S.coreOrder ??= coreOrderNow());
  const i = order.indexOf(id);
  const j = i + dir;
  if (j < 0 || j >= order.length || S.coins < MOVE_COST) return;
  [order[i], order[j]] = [order[j], order[i]];
  S.coins -= MOVE_COST;
  relayout();
  story(`🧭 ${CORE_NAMES[id]} 자리를 옮겼어요.`);
}
/** The blocks' order on the map now, left to right. */
function coreOrderNow() {
  return Object.entries({ farm: FARM.x, pond: POND.x, pen: PEN.x, plaza: PLAZA.x })
    .sort((a, b) => a[1] - b[1])
    .map(([k]) => k);
}
function relayout() {
  const keepCam = camX;
  applyLayout(S.mapSeed);
  carveGroves();
  ensurePlots();
  camX = keepCam;
  me.x = HOME_DOOR[0] * T + T / 2;
  me.y = HOME_DOOR[1] * T + T - 2;
  me.path = [];
  task = null;
  cache.dirty = true;
  ground.key = '';
  spawnAnimals();
  spawnFamily();
  save();
  paintUi();
}

/** The build tab: rows made once per kind of list, then only their texts and states change. */
function paintBuild() {
  const list = document.getElementById('buildList');
  if (!list || list.closest('.tab-body')?.hidden) return;
  const rows = buildRows();
  const sig =
    rows.map((r) => r.group + r.name).join('|') +
    (S.coreOrder ?? coreOrderNow()).join() +
    towerSig() +
    (S.wishes ?? []).map((w) => `${w.i}${w.id}${w.until - S.days}${S.coins >= ((w.kind === 'decor' ? DECOR.find((d) => d.id === w.id) : SHOP_ANIMALS.find((a) => a.key === w.id))?.cost ?? 0)}`).join();
  if (list.dataset.sig !== sig) {
    list.dataset.sig = sig;
    const items = [...wishRows(), ...towerRows(), ...tellerRows()]; // the old tower (tales.js)
    let group = '';
    for (const r of rows) {
      if (r.group !== group) {
        group = r.group;
        items.push(el('li', 'group', group));
        if (group === '꾸미기') items.push(...layoutRows());
      }
      const li = el('li', 'buy');
      const text = el('div', 'buy__text');
      const note = el('span', 'buy__note', '');
      text.append(el('b', '', r.name), note);
      const btn = el('button', 'btn buy__btn', '');
      li.note = note;
      li.btn = btn;
      btn.addEventListener('click', () => {
        const row = buildRows().find((x) => x.group === r.group && x.name === r.name);
        if (!row || !row.ok) return;
        row.act();
        save();
        paintUi();
      });
      li.append(text, btn);
      li.dataset.key = r.group + r.name;
      items.push(li);
    }
    list.replaceChildren(...items);
    paintBuild.byKey = new Map(items.filter((li) => li.dataset?.key).map((li) => [li.dataset.key, li]));
  }
  for (const r of rows) {
    const li = paintBuild.byKey?.get(r.group + r.name);
    if (!li) continue;
    li.note.textContent = r.note;
    const btn = li.btn;
    btn.textContent = `${fmt(r.cost)}코인`;
    btn.disabled = !r.ok;
    if (r.group === '꾸미기') btn.setAttribute('aria-pressed', String(placing?.name === r.name));
  }
  for (const b of list.querySelectorAll('[data-move]')) b.disabled = S.coins < MOVE_COST;
}
/** "Layout": the four blocks in their order, each with ◀ ▶. */
function layoutRows() {
  const out = [el('li', 'group', `배치 바꾸기 · 한 번에 ${MOVE_COST}코인`)];
  const order = S.coreOrder ?? coreOrderNow();
  order.forEach((id, i) => {
    const li = el('li', 'buy');
    const text = el('div', 'buy__text');
    text.append(el('b', '', `${i + 1}. ${CORE_NAMES[id]}`));
    li.append(text);
    const left = el('button', 'btn icon', '◀');
    const right = el('button', 'btn icon', '▶');
    left.dataset.move = right.dataset.move = id;
    left.disabled = i === 0;
    right.disabled = i === order.length - 1;
    left.setAttribute('aria-label', `${CORE_NAMES[id]} 왼쪽으로`);
    right.setAttribute('aria-label', `${CORE_NAMES[id]} 오른쪽으로`);
    left.addEventListener('click', () => moveBlock(id, -1));
    right.addEventListener('click', () => moveBlock(id, 1));
    const pair = el('div', 'buy__pair');
    pair.append(left, right);
    li.append(pair);
    out.push(li);
  });
  return out;
}

/** Taps on the town in life mode place what you picked. */
function wireBuild() {
  document.getElementById('buildTab')?.addEventListener('click', () => paintBuild());
  canvas.addEventListener('click', (ev) => {
    if (MODE !== 'life' || dragged) return;
    const [x, y] = worldAt(ev);
    if (tryGolden(x, y) || tryStopFight(x, y)) return;
    if (placing) placeDecor(x, y);
    else tryMe(x, y) || tryVillager(x, y) || tryPoke(x, y);
  });
}

// ── The day's timeline: which day, what season, where the sun is ───────────────────────────────────────────────────

function paintTimeline() {
  const bar = document.getElementById('dayFill');
  if (!bar) return;
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  bar.style.width = `${(mins / 1440) * 100}%`;
  document.getElementById('daySun').style.left = `${(mins / 1440) * 100}%`;
  document.getElementById('daySun').dataset.night = String(isNight());
  const h = now.getHours();
  const part = h < 6 ? '새벽' : h < 12 ? '아침' : h < 18 ? '낮' : h < 21 ? '저녁' : '밤';
  document.getElementById('dayLabel').textContent = `${S.days}일차 · ${SEASONS[Math.max(0, S.season)]} · ${part}${holiday ? ` · ${HOLIDAY_NAMES[holiday]}` : ''}`;
  document.getElementById('dayTime').textContent = now.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' });
  const eraDots = document.getElementById('dayEra');
  if (eraDots.dataset.era !== String(S.era)) {
    eraDots.dataset.era = String(S.era);
    eraDots.replaceChildren(
      ...ERAS.map((e, i) => {
        // "원시 시대" → "원시" on a narrow panel: the word 시대 hides first.
        const s = el('span', i < S.era ? 'done' : i === S.era ? 'now' : '', e.name.replace(/ 시대$/, ''));
        if (/ 시대$/.test(e.name)) s.append(el('span', 'full', ' 시대'));
        s.title = e.name;
        return s;
      }),
    );
  }
}
