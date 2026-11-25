// 작은 마을 — 인성 파탄 모드: a separate sandbox. Pick an era, get a finished town, and break it.
// Your life-mode town is put aside untouched (and never saved over) while you play; leaving brings it back.
'use strict';

let MODE = 'life'; // 'life' | 'chaos'
let lifeState = null;
let chaosCam = 0;
let chaosTool = 'smash';
let fx = []; //       explosions, clouds, bolts, ghosts, fire…
let fires = []; //    burning spots that spread
let signAt = null;
let statsDirty = false; // something fell since the tally was drawn (delayed blasts, plague, zombies)

const CHAOS_TOOLS = [
  ['talk', '👆', '말 걸기·때리기'],
  ['smash', '🔨', '집 부수기'],
  ['fling', '👊', '날리기'],
  ['nuke', '☢️', '핵'],
  ['plague', '🦠', '전염병'],
  ['bolt', '⚡', '번개'],
  ['fire', '🔥', '불'],
  ['meteor', '☄️', '운석'],
  ['zombie', '🧟', '좀비'],
  ['tornado', '🌪', '토네이도'],
  ['ufo', '🛸', 'UFO'],
  ['cat', '🐾', '고양이 발'],
  ['banana', '🍌', '바나나'],
  ['sign', '✍️', '방명록'],
];

/** A finished town of an era: every house, the era's landmarks, a full farm and pen, villagers everywhere. */
function sandboxFor(era) {
  const s = fresh();
  return Object.assign(s, {
    gender: 'f',
    traits: { health: 5, green: 5, charm: 5, trade: 5, luck: 5 },
    era,
    houses: HOUSES_BY_ERA[era],
    landmarks: LANDMARKS.filter((l) => l.era <= era).map((l) => l.id),
    chickens: 6, cows: 3, sheep: 3, pigs: era >= 2 ? 2 : 0, goats: 3, horses: era >= 1 ? 2 : 0, alpacas: era >= 4 ? 2 : 0, donkeys: era >= 1 ? 1 : 0, turkeys: era >= 2 ? 2 : 0,
    farm: FARM_UPGRADES.filter((u) => u.era <= era).map((u) => u.id),
    plots: Array.from({ length: 24 }, (_, i) => ({ planted: true, g: (i * 7) % GROW })),
    season: Math.max(0, S.season),
    friends: Array.from({ length: HOUSES_BY_ERA[era] }, () => ({ f: 5, day: '' })),
    dog: true, dogAge: 9,
    wrecked: [], wreckedLm: [], scorch: [], signs: [], bananas: [],
    chaosStats: { houses: 0, people: 0, animals: 0 },
    story: [{ day: 1, text: `😈 ${ERAS[era].name} 마을이 다 지어져 있어요. 마음껏 부숴 보세요. (인생 모드 마을은 그대로 있어요)` }],
  });
}

function enterChaos(era) {
  if (MODE === 'life') lifeState = S;
  VISIT = null; // a new sandbox is your own
  endTalk();
  guests = [];
  MODE = 'chaos';
  S = sandboxFor(era);
  applyLayout(S.mapSeed); // a new map for every sandbox
  ensureLots(S.houses);
  fx = [];
  fires = [];
  juiceReset(); // a new round: score, combo, challenge (juice.js)
  task = null;
  me.path = [];
  me.act = null;
  me.hidden = true;
  chaosCam = (HOME.x + 1.5) * T - VIEW_W / 2;
  spawnFamily();
  spawnAnimals();
  spawnCars();
  sites = [];
  cache.dirty = true;
  document.body.dataset.mode = 'chaos';
  $('eraPick').hidden = true;
  $('mode').hidden = true;
  paintChaosUi();
  paintUi();
  wake();
}

function leaveChaos() {
  endTalk();
  MODE = 'life';
  VISIT = null;
  guests = [];
  S = lifeState ?? fresh();
  lifeState = null;
  fx = [];
  fires = [];
  juiceReset();
  me.hidden = false;
  applyLayout(S.mapSeed);
  carveGroves();
  // Back at your own door (you may have been walking in a friend's town).
  task = null;
  me.path = [];
  me.act = null;
  [me.x, me.y] = [HOME_DOOR[0] * T + T / 2, HOME_DOOR[1] * T + T - 2];
  me.px = me.x;
  me.py = me.y;
  ensureLots(S.houses + S.ruins);
  spawnFamily();
  spawnAnimals();
  spawnCars();
  cache.dirty = true;
  document.body.dataset.mode = 'life';
  $('signBox').hidden = true;
  $('visitCard').hidden = true;
  if (!S.gender) $('pick').hidden = false;
  paintUi();
  wake();
}

// ── Picking a spot ─────────────────────────────────────────────────────────────────────────────────────────────────

function worldAt(ev) {
  const r = canvas.getBoundingClientRect();
  return [((ev.clientX - r.left) / r.width) * VIEW_W + camX, ((ev.clientY - r.top) / r.height) * H];
}
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
function lotAt(x, y, reach = 20) {
  let best = -1;
  let bestD = Infinity;
  for (let i = 0; i < S.houses; i++) {
    if (S.wrecked.includes(i)) continue;
    const [cx, cy] = lotCenter(i);
    const d = dist(x, y, cx, cy);
    if (d < bestD && d < reach) [best, bestD] = [i, d];
  }
  return best;
}

/** Everyone nearby runs the other way, with a "!" over their head. */
function panic(x, y, radius) {
  for (const e of people) {
    if (e.hidden || e.zombie || e.burning > 0 || e.kind === 'guest' || dist(e.x, e.y, x, y) > radius) continue;
    e.act = null;
    e.goal = null;
    e.busy = false;
    e.scared = 50;
    const away = e.x < x ? -1 : 1;
    route(e, nearestWalkable(Math.max(0, Math.min(COLS - 1, Math.round(e.x / T) + away * 8)), ROAD_Y));
    e.speed = 2;
  }
  shoutNear(x, y); // "내 집!!" (juice.js)
}

function wreckLot(i) {
  if (i < 0 || S.wrecked.includes(i)) return false;
  collapseLot(i);
  S.wrecked.push(i);
  S.chaosStats.houses++;
  statsDirty = true;
  fx.push({ k: 'dust', x: lotCenter(i)[0], y: lotCenter(i)[1] + 8, t: 24 });
  burst(lotCenter(i)[0], lotCenter(i)[1] + 8);
  hit('house', lotCenter(i)[0], lotCenter(i)[1]);
  knockOn(i); // sometimes the next one goes too
  // Whoever lives there leaves as a ghost.
  for (const e of people.filter((p) => p.home === i)) ghost(e);
  cache.dirty = true;
  return true;
}
function wreckLandmarksNear(x, y, r) {
  for (const l of LANDMARKS)
    if (has(l.id) && !S.wreckedLm.includes(l.id) && dist(x, y, (l.x + l.w / 2) * T, (ROAD_Y + 3) * T) < r + l.w * 8) {
      collapseLandmark(l);
      S.wreckedLm.push(l.id);
      S.chaosStats.houses++;
      fx.push({ k: 'dust', x: (l.x + l.w / 2) * T, y: (ROAD_Y + 3) * T, t: 30 });
      landmarkDown(l);
      cache.dirty = true;
    }
}
const ZOMBIE_SPEED = 1.15; // a shade faster than a stroll (1): a fleeing villager gets away, for a while
const ZOMBIE_LOOK = { hair: '#3a4a2a', top: '#6a7a5a', legs: '#4a4a3a', skin: '#9ccf8a' };

/** Off they go, spinning; they land as a ghost. */
function launch(e) {
  if (e.kind === 'me') return;
  fx.push({ k: 'fly', x: e.x, y: e.y, y0: e.y, vx: (Math.random() < 0.5 ? -1 : 1) * 2.2, vy: -5, look: e.look, t: 40, animal: animals.includes(e) });
  people = people.filter((p) => p !== e);
  animals = animals.filter((a) => a !== e);
  if (e.look) S.chaosStats.people++;
  else S.chaosStats.animals++;
  hit(e.look ? 'person' : 'animal', e.x, e.y);
}

/** A zombie shuffles after the nearest living villager; a bite makes another zombie. */
function zombieThink(e) {
  e.frame++;
  e.speed = ZOMBIE_SPEED;
  let prey = null;
  let best = Infinity;
  for (const p of people) {
    if (p.zombie || p.hidden || p.kind === 'dog' || p.kind === 'petcat' || p.kind === 'guest') continue;
    const d = dist(p.x, p.y, e.x, e.y);
    if (d < best) [prey, best] = [p, d];
  }
  if (!prey) return e.path.length ? step(e) : false;
  // A bite whenever one is in reach (checked every step, not only when re-routing).
  if (best < 12) {
    prey.zombie = true;
    prey.look = { ...ZOMBIE_LOOK, top: prey.look?.top ?? ZOMBIE_LOOK.top };
    prey.speed = ZOMBIE_SPEED;
    prey.act = null;
    prey.goal = null;
    prey.path = [];
    S.chaosStats.people++;
    hit('zombie', prey.x, prey.y);
    story('🧟 물렸어요! 좀비가 하나 더 늘었어요.');
    paintChaosUi();
    return true;
  }
  if (e.path.length && e.frame % 8 !== 0) return step(e);
  route(e, tileOf(prey));
  if (!prey.scared && best < 60) {
    prey.scared = 24; // a burst of running, then tired: that's when they're caught
    const [tx] = tileOf(prey);
    const away = prey.x < e.x ? -1 : 1;
    route(prey, nearestWalkable(Math.max(0, Math.min(COLS - 1, tx + away * 6)), ROAD_Y));
    prey.speed = 1.4;
  }
  return step(e);
}

/** The pen's animals as the town counts them: one less of a kind when it falls in a chaos town. */
const PEN_COUNT = { chicken: 'chickens', cow: 'cows', sheep: 'sheep', pig: 'pigs', goat: 'goats', horse: 'horses', alpaca: 'alpacas', donkey: 'donkeys', turkey: 'turkeys' };
function ghost(e) {
  if (e.kind === 'me' || e.kind === 'guest') return;
  const isAnimal = animals.includes(e);
  // Remembered in the sandbox (never the life town: chaos S is never saved), so a code passed on keeps them gone.
  if (MODE === 'chaos') {
    if (e.who) (S.gone ??= []).push(e.who);
    const k = PEN_COUNT[e.kind];
    if (isAnimal && k && S[k] > 0) S[k]--;
  }
  people = people.filter((p) => p !== e);
  animals = animals.filter((a) => a !== e);
  if (isAnimal) S.chaosStats.animals++;
  else S.chaosStats.people++;
  statsDirty = true;
  hit(isAnimal ? 'animal' : 'person', e.x, e.y);
  fx.push({ k: 'ghost', x: e.x, y: e.y - 8, t: 60 });
  tomb(e.x, e.y);
}
function killWithin(x, y, r) {
  unseat(x, y, r);
  for (const e of [...people, ...animals]) if (!e.hidden && dist(e.x, e.y, x, y) < r) ghost(e);
}
function scorch(x, y, r) {
  S.scorch.push({ x: Math.round(x), y: Math.round(y), r: Math.round(r) });
  cache.dirty = true;
}

/** Where something on the road is (its middle, on its lane). */
const rideAt = (c) => [c.x + (VEHICLE[c.type]?.len ?? 16) / 2, laneBottom(c)];
/**
 * Whoever rides through the road (runners, bikes, carts, cars, buses…) within r of a spot gets off and is a villager
 * on foot from here on, so every tool reaches them like anyone else. Things in the sky fly on. Returns them.
 */
function unseat(x, y, r) {
  if (MODE !== 'chaos') return [];
  const out = [];
  cars = cars.filter((c) => {
    if (c.sky || c.b != null) return true;
    const [cx, cy] = rideAt(c);
    if (Math.abs(cx - x) > r + 4 || Math.abs(cy - y) > r + 8) return true;
    const p = make('villager', [Math.max(0, Math.min(COLS - 1, Math.round(cx / T))), ROAD_Y], {
      look: c.look,
      gender: c.gender,
      home: -1,
      speed: 1,
      needs: { energy: 80, hunger: 80, social: 50 },
    });
    p.x = p.px = cx;
    p.y = p.py = cy;
    people.push(p);
    out.push(p);
    if (c.type !== 'runner') fx.push({ k: 'dust', x: cx, y: cy, t: 18 }); // what they rode is left in a heap
    return false;
  });
  return out;
}

/** On fire: they run about, flames and all, for a couple of seconds, set others alight, then fall. */
function ignite(e) {
  if (e.burning || e.kind === 'me' || e.kind === 'guest' || e.dying) return;
  e.burning = 20;
  e.sick = 0;
  e.act = null;
  e.goal = null;
  e.speed = 2.2;
  const [tx, ty] = tileOf(e);
  route(e, nearestWalkable(Math.max(0, Math.min(COLS - 1, tx + rand(-6, 6))), ty + rand(-1, 1)));
  if (Math.random() < 0.3) story('🔥 불길에 휩쓸렸어요.');
}
/** Down they go (illness): a moment lying there, then the ghost. */
function collapse(e) {
  if (e.dying) return;
  e.dying = 14;
  e.path = [];
  e.act = null;
  e.goal = null;
}
function burnTick() {
  for (const e of [...people]) {
    if (e.burning > 0) {
      if (!e.path.length) {
        const [tx, ty] = tileOf(e);
        route(e, nearestWalkable(Math.max(0, Math.min(COLS - 1, tx + rand(-5, 5))), ty));
      }
      if (e.burning % 4 === 0) unseat(e.x, e.y, 12); // running into the road sets riders alight too
      for (const o of people) if (o !== e && !o.burning && !o.hidden && Math.random() < 0.04 && dist(o.x, o.y, e.x, e.y) < 12) ignite(o);
      if (--e.burning === 0) {
        scorch(e.x, e.y + 2, 5);
        ghost(e);
      }
    } else if (e.dying > 0 && --e.dying === 0) ghost(e);
  }
}
/** Someone lying where they fell (illness), green and still. */
function drawLying(g, e) {
  g.save();
  g.translate(Math.round(e.x) - 6, Math.round(e.y) - 2);
  g.rotate(-Math.PI / 2);
  drawPerson(g, { x: 6, y: 16, dir: 'd', path: [], frame: 0, seed: 0, gender: e.gender }, { ...(e.look ?? {}), skin: SICK_SKIN });
  g.restore();
}
function drawBurning(g) {
  const t = clockTick();
  for (const e of people) {
    if (!e.hidden && e.burning > 0 && onScreen(e.x)) {
      const x = Math.round(e.x);
      const y = Math.round(e.y);
      for (const [dx, dy, c] of [[-4, -14, '#ff6b2a'], [0, -19, '#ffb347'], [3, -13, '#ff6b2a'], [-1, -24, '#ffe066'], [2, -9, '#ffb347']])
        R(g, x + dx + ((t + dx) % 2), y + dy - (t % 3), 3, 5, c);
      if (t % 2) R(g, x - 1, y - 30 - (t % 4), 2, 2, 'rgba(120,120,130,0.7)');
    }
  }
}

// ── The tools ──────────────────────────────────────────────────────────────────────────────────────────────────────

function useTool(x, y) {
  const say = (t) => story(t);
  switch (chaosTool) {
    case 'smash': {
      const i = lotAt(x, y, 26);
      if (wreckLot(i)) say(`🔨 ${FAMILIES[i].family} 집을 부쉈어요.`);
      else wreckLandmarksNear(x, y, 10);
      for (const e of unseat(x, y, 16)) ghost(e); // run over by the hammer
      panic(x, y, 60);
      break;
    }
    case 'fling': {
      unseat(x, y, 20);
      const e = [...people, ...animals].filter((p) => !p.hidden).sort((a, b) => dist(a.x, a.y - 8, x, y) - dist(b.x, b.y - 8, x, y))[0];
      if (e && dist(e.x, e.y - 8, x, y) < 20) {
        launch(e);
        kick(1);
        say('👊 날려 버렸어요. 슝~');
        panic(x, y, 50);
      }
      break;
    }
    case 'nuke':
      fx.push({ k: 'flash', t: 10 }, { k: 'boom', x, y, t: 70, r: 0 });
      const round = chaosRound;
      setTimeout(() => {
        if (MODE !== 'chaos' || round !== chaosRound) return; // left, or started over, meanwhile
        for (let i = 0; i < S.houses; i++) if (dist(x, y, ...lotCenter(i)) < 110) wreckLot(i);
        wreckLandmarksNear(x, y, 110);
        killWithin(x, y, 110);
        scorch(x, y, 110);
        kick(6, 8);
        S.plots.forEach((p, i) => dist(x, y, PLOT_AT[i][0] * T, PLOT_AT[i][1] * T) < 110 && Object.assign(p, { planted: false, g: 0 }));
      }, 300);
      say('☢️ 핵이 떨어졌어요. 버섯구름이 피어올라요…');
      panic(x, y, 260);
      break;
    case 'plague':
      fx.push({ k: 'cloud', x, y, t: 90 });
      unseat(x, y, 50);
      for (const e of people) if (dist(e.x, e.y, x, y) < 50) e.sick = 1;
      say('🦠 전염병을 퍼뜨렸어요. 사람에서 사람으로 옮아가요.');
      break;
    case 'bolt': {
      fx.push({ k: 'bolt', x, y, t: 12 }, { k: 'flash', t: 4 });
      kick(2, 1);
      const i = lotAt(x, y, 22);
      if (i >= 0) fires.push({ x: lotCenter(i)[0], y: lotCenter(i)[1] + 4, t: 160, lot: i });
      else fires.push({ x, y, t: 120, lot: -1 });
      killWithin(x, y, 14);
      unseat(x, y, 34);
      for (const e of people) if (!e.hidden && !e.zombie && dist(e.x, e.y - 8, x, y) < 34) ignite(e); // the ones nearby catch fire
      say('⚡ 번개가 내리쳐 불이 붙었어요.');
      panic(x, y, 60);
      break;
    }
    case 'fire': {
      const i = lotAt(x, y, 26);
      const f = { x: i >= 0 ? lotCenter(i)[0] : x, y: i >= 0 ? lotCenter(i)[1] + 4 : y, t: 180, lot: i };
      fires.push(f);
      // The ones right there catch fire before they can run (riders too).
      unseat(x, y, 30);
      for (const e of people) if (!e.hidden && !e.zombie && (dist(e.x, e.y - 8, x, y) < 30 || dist(e.x, e.y, f.x, f.y) < 24)) ignite(e);
      say('🔥 불을 질렀어요. 옆집으로 번질지도 몰라요.');
      panic(x, y, 60);
      break;
    }
    case 'meteor':
      // It hits when the falling rock reaches the ground (chaosVisual), not on a separate timer.
      fx.push({ k: 'meteor', x, y, t: METEOR_FALL });
      say('☄️ 운석이 떨어졌어요!');
      panic(x, y, 120);
      break;
    case 'zombie': {
      const z = make('villager', [Math.round(x / T), ROAD_Y], { look: ZOMBIE_LOOK, zombie: true, speed: ZOMBIE_SPEED, home: -1, needs: { energy: 100, hunger: 0, social: 0 } });
      z.x = x;
      z.y = Math.max(ROAD_Y * T + 6, y);
      people.push(z);
      say('🧟 좀비를 풀었어요. 물리면 좀비가 돼요!');
      panic(x, y, 70);
      break;
    }
    case 'tornado':
      fx.push({ k: 'tornado', x, y: Math.max(ROAD_Y * T + 8, y), v: x < camX + VIEW_W / 2 ? 1.4 : -1.4, t: 150 });
      say('🌪 토네이도가 마을을 휩쓸어요.');
      panic(x, y, 90);
      break;
    case 'ufo':
      useUfo(x, y);
      break;
    case 'cat':
      useCat(x, y);
      break;
    case 'banana':
      S.bananas.push({ x: Math.round(x), y: Math.round(Math.min(Math.max(y, ROAD_Y * T + 4), ROAD_Y * T + 14)) });
      say('🍌 길에 바나나 껍질을 슬쩍 던져 놨어요.');
      break;
    case 'talk': {
      const e = villagerAt(x, y);
      if (e) openTalk(e);
      break;
    }
    case 'sign':
      signAt = [x, y];
      $('signBox').hidden = false;
      $('signText').value = '';
      $('signText').focus();
      break;
  }
  paintChaosUi();
  paintUi();
}

function placeSign() {
  if (MODE === 'visit') return void visitNote();
  if (!signAt) return;
  const text = ($('signText').value || '여기 왔다 감 ㅋ').slice(0, 24);
  S.signs.push({ x: Math.round(signAt[0]), y: Math.round(signAt[1]), text });
  story(`✍️ 방명록: "${text}"`);
  $('signBox').hidden = true;
  signAt = null;
  cache.dirty = true;
  paintChaosUi();
  paintUi();
}

// ── Every frame ────────────────────────────────────────────────────────────────────────────────────────────────────

function chaosTick() {
  if (MODE !== 'chaos') return false;
  burnTick();
  if (statsDirty) {
    statsDirty = false;
    paintChaosUi();
  }
  // Plague: the sick slow down, pass it on, and some don't make it.
  for (const e of people) {
    if (e.scared > 0 && --e.scared === 0) e.speed = 1;
    if (!e.sick) continue;
    e.sick++;
    e.speed = 0.5;
    for (const o of people) if (!o.sick && dist(e.x, e.y, o.x, o.y) < 14 && Math.random() < 0.05) o.sick = 1;
    if (e.sick > 100 && Math.random() < 0.05) collapse(e); // ~12 s in, a few seconds more, then down
  }
  // Bananas: whoever steps on one goes down, stars and all.
  for (const b of S.bananas.slice()) {
    unseat(b.x, b.y, 4);
    const e = people.find((p) => !p.hidden && !p.zombie && !p.slip && Math.abs(p.x - b.x) < 5 && Math.abs(p.y - b.y) < 6);
    if (!e) continue;
    e.slip = 50;
    e.path = [];
    e.act = null;
    e.goal = null;
    S.bananas.splice(S.bananas.indexOf(b), 1);
    S.chaosStats.slips = (S.chaosStats.slips ?? 0) + 1;
    hit('slip', b.x, b.y);
    story('🍌 꽈당! 주민이 바나나 껍질에 미끄러졌어요 ㅋㅋ');
    paintChaosUi();
    paintUi();
  }
  for (const e of people) if (e.slip > 0) e.slip--;
  // Tornado: flings people and flattens houses on its way.
  for (const f of fx)
    if (f.k === 'tornado') {
      unseat(f.x, f.y, 14);
      for (const e of [...people, ...animals]) if (!e.hidden && Math.abs(e.x - f.x) < 12 && Math.abs(e.y - f.y) < 20) launch(e);
      const i = lotAt(f.x, ROAD_Y * T - 16, 14);
      if (i >= 0) wreckLot(i);
    }
  // Zombies: a car that drives into one stops, and the driver is the next one bitten.
  for (const z of people) if (z.zombie && !z.hidden) unseat(z.x, z.y, 10);
  // Fire: burns down what it's on, may jump to the next house.
  fires = fires.filter((f) => {
    f.t--;
    unseat(f.x, f.y, 18);
    // Walking into the flames: people and animals on the spot go down (residents also go with the house).
    for (const e of [...people, ...animals])
      if (!e.hidden && e.kind !== 'guest' && Math.abs(e.x - f.x) < 16 && Math.abs(e.y - f.y) < 34) {
        if (animals.includes(e) || e.kind === 'dog' || e.kind === 'petcat') ghost(e);
        else ignite(e);
      }
    if (f.lot >= 0 && f.t === 60) {
      wreckLot(f.lot);
      scorch(f.x, f.y + 10, 18);
    }
    if (f.lot >= 0 && f.t % 40 === 0 && Math.random() < 0.45) {
      const next = f.lot + (Math.random() < 0.5 ? 2 : -2); // LOT_X alternates sides of home: ±2 is the next one along
      if (next >= 0 && next < S.houses && !S.wrecked.includes(next) && !fires.some((g) => g.lot === next))
        fires.push({ x: lotCenter(next)[0], y: lotCenter(next)[1] + 4, t: 180, lot: next });
    }
    return f.t > 0;
  });
  return true;
}

const METEOR_FALL = 8; // ticks (1 s) from the sky to the ground
function meteorImpact(x, y) {
  fx.push({ k: 'flash', t: 5 }, { k: 'dust', x, y, t: 30 });
  kick(4, 4);
  burst(x, y, 20, 1.3);
  for (let i = 0; i < S.houses; i++) if (dist(x, y, ...lotCenter(i)) < 40) wreckLot(i);
  wreckLandmarksNear(x, y, 36);
  killWithin(x, y, 40);
  scorch(x, y, 36);
}

/** Effects move every frame, scaled by the time since the last one (k: ticks' worth, 8 a second). */
function chaosVisual(k) {
  if (MODE !== 'chaos') return;
  const landed = [];
  fx = fx.filter((f) => {
    f.t -= k;
    if (f.k === 'meteor' && f.t <= 0) landed.push(f);
    if (f.k === 'fly') {
      f.x += f.vx * k;
      f.y += f.vy * k;
      f.vy += 0.35 * k;
    }
    if (f.k === 'boom') f.r = Math.min(110, f.r + 6 * k);
    if (f.k === 'tornado') f.x += (f.v + Math.sin(f.t / 6) * 0.8) * k;
    if (f.t <= 0 && f.k === 'fly') tomb(f.x, Math.max(f.y0, ROAD_Y * T + 12)); // where they came down
    return f.t > 0;
  });
  for (const m of landed) meteorImpact(m.x, m.y);
}

function drawChaos(g) {
  if (MODE !== 'chaos') return;
  for (const f of fires) {
    const flick = f.t % 6 < 3;
    for (const [dx, dy, c] of [[-6, 0, '#ff6b2a'], [0, -4, '#ffb347'], [6, 0, '#ff6b2a'], [-2, -8, '#ffe066'], [3, -10, '#ffb347']])
      R(g, Math.round(f.x + dx + (flick ? 1 : -1)), Math.round(f.y + dy - (flick ? 2 : 0)), 4, 6, c);
    R(g, Math.round(f.x) - 3, Math.round(f.y) - 20 - (f.t % 10), 3, 3, 'rgba(120,120,130,0.6)');
  }
  for (const f of fx) {
    const x = Math.round(f.x);
    const y = Math.round(f.y);
    if (drawTools(g, f)) continue; // UFO, beamed up, the paw (juice.js)
    if (f.k === 'dust')
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        const d = (30 - f.t) * 0.9;
        disc(g, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.5 - (30 - f.t) * 0.3, 3, `rgba(200, 185, 160, ${f.t / 30})`);
      }
    else if (f.k === 'ghost') {
      const gy = y - (60 - f.t) * 0.6;
      g.globalAlpha = Math.min(1, f.t / 30);
      spr(g, ['.oooo.', 'owwwwo', 'owewew', 'owwwwo', 'owwwwo', 'owowow'], { o: '#c8c8e0', w: '#ffffff', e: '#3a3a48' }, x - 3, gy - 6);
      g.globalAlpha = 1;
    } else if (f.k === 'fly') {
      if (f.animal) spr(g, ['.oo.', 'owwo', 'owwo', '.oo.'], { o: '#8a6a4a', w: '#fffaf0' }, x - 2, y - 4);
      else drawPerson(g, { x, y, dir: ['d', 'r', 'u', 'l'][Math.floor(f.t / 3) % 4], frame: 0, path: [], seed: 0 }, f.look ?? { hair: '#3a2418', top: '#888', legs: '#555' });
      if (f.t % 6 < 3) R(g, x + 6, y - 20, 2, 2, '#ffe066');
    } else if (f.k === 'boom') {
      const r = Math.round(f.r);
      disc(g, x, y, Math.max(1, r), `rgba(255, 140, 40, ${0.15 + f.t / 200})`);
      disc(g, x, y, Math.max(1, Math.round(r * 0.6)), `rgba(255, 220, 120, ${f.t / 120})`);
      // The mushroom cloud.
      const h = Math.min(60, (70 - f.t) * 2);
      R(g, x - 5, y - h, 10, h, `rgba(150, 120, 100, ${f.t / 80})`);
      disc(g, x, y - h, 18, `rgba(170, 140, 120, ${f.t / 70})`);
      disc(g, x - 6, y - h - 4, 10, `rgba(210, 180, 150, ${f.t / 70})`);
    } else if (f.k === 'cloud')
      for (let i = 0; i < 7; i++) disc(g, x + Math.cos(i + f.t / 9) * 22, y + Math.sin(i * 2 + f.t / 11) * 10, 9, `rgba(110, 200, 90, ${(f.t / 90) * 0.4})`);
    else if (f.k === 'bolt') {
      let bx = x;
      g.fillStyle = '#fff7a8';
      for (let by = 0; by < y; by += 6) {
        const nx = bx + (Math.random() < 0.5 ? -3 : 3);
        g.fillRect(Math.min(bx, nx), by, Math.abs(nx - bx) + 2, 6);
        bx = nx;
      }
    } else if (f.k === 'tornado') {
      for (let i = 0; i < 9; i++) {
        const w = 3 + i * 2;
        const sway = Math.sin(f.t / 4 + i / 2) * 3;
        g.fillStyle = `rgba(150, 150, 165, ${0.55 - i * 0.03})`;
        g.fillRect(Math.round(x - w / 2 + sway), y - 4 - i * 4, w, 3);
      }
      for (let i = 0; i < 4; i++) R(g, Math.round(x + Math.cos(f.t / 3 + i) * 12), y - 10 - i * 7, 2, 2, '#8a6a4a');
    } else if (f.k === 'meteor') {
      const p = Math.min(1, 1 - f.t / METEOR_FALL); // 0 high in the sky → 1 on the ground
      const mx = x - 60 + p * 60;
      const my = y - 120 + p * 120;
      for (let i = 0; i < 6; i++) disc(g, mx - i * 4, my - i * 8, 5 - Math.floor(i / 2), i ? `rgba(255, 160, 60, ${0.6 - i * 0.1})` : '#5a4a48');
    }
  }
  for (const b of S.bananas) {
    R(g, b.x - 2, b.y - 1, 5, 1, '#f2d23a');
    R(g, b.x - 3, b.y, 2, 1, '#f2d23a');
    R(g, b.x + 2, b.y, 2, 1, '#f2d23a');
    R(g, b.x, b.y - 2, 1, 1, '#6b5a2a');
  }
  drawBurning(g);
  // The sick cough a little green cloud.
  for (const e of people)
    if (e.sick > 20 && !e.hidden && !e.dying && onScreen(e.x) && (clockTick() + (e.seed ?? 0)) % 12 < 4) disc(g, Math.round(e.x) + (e.dir === 'l' ? -6 : 6), Math.round(e.y) - 14, 2, 'rgba(110, 200, 90, 0.55)');
  for (const e of people)
    if (e.slip > 0 && !e.hidden)
      for (let i = 0; i < 3; i++) {
        const a = e.slip / 4 + (i * Math.PI * 2) / 3;
        R(g, Math.round(e.x + Math.cos(a) * 7), Math.round(e.y - 22 + Math.sin(a) * 2), 2, 2, '#ffe066');
      }
  for (const e of people)
    if (e.scared > 0 && !e.hidden) {
      R(g, Math.round(e.x) - 1, Math.round(e.y) - 25, 2, 5, '#e8404b');
      R(g, Math.round(e.x) - 1, Math.round(e.y) - 19, 2, 2, '#e8404b');
    }
}
function drawChaosFlash(g) {
  const f = fx.find((x) => x.k === 'flash');
  if (MODE !== 'chaos' || !f) return;
  g.fillStyle = `rgba(255, 255, 240, ${f.t / 10})`;
  g.fillRect(0, 0, VIEW_W, H);
}

/** Into the still picture: rubble where things stood, scorched ground, the guestbook signs. */
function paintChaos(g) {
  if (MODE !== 'chaos') return;
  for (const s of S.scorch) {
    for (let dy = -s.r; dy <= s.r; dy += 2)
      for (let dx = -s.r; dx <= s.r; dx += 2) {
        if (dx * dx + dy * dy * 4 > s.r * s.r) continue;
        const n = (dx * 7 + dy * 13 + s.x) & 7;
        R(g, s.x + dx, s.y + dy / 2, 2, 2, n < 3 ? '#3a2e28' : n < 5 ? '#5a4a40' : '#7a6a5e');
      }
  }
  for (const id of S.wreckedLm) {
    const l = LANDMARKS.find((x) => x.id === id);
    for (let i = 0; i < l.w; i++) rubble(g, l.x + i);
  }
  for (const s of S.signs) {
    R(g, s.x, s.y - 10, 1, 10, '#6b4428');
    box(g, s.x - 8, s.y - 16, 17, 7, '#e9d9b0', '#8a5a32');
    g.fillStyle = '#ffffff';
    g.font = '6px sans-serif';
    const w = Math.min(90, g.measureText(s.text).width + 4);
    g.fillStyle = 'rgba(40, 30, 30, 0.75)';
    g.fillRect(s.x - w / 2, s.y - 26, w, 9);
    g.fillStyle = '#ffffff';
    g.fillText(s.text, s.x - w / 2 + 2, s.y - 19.5, 86);
  }
}

// ── The page ───────────────────────────────────────────────────────────────────────────────────────────────────────

function paintChaosUi() {
  const bar = $('chaosTools');
  if (!bar.childElementCount)
    for (const [id, icon, name] of CHAOS_TOOLS) {
      const b = document.createElement('button');
      b.className = 'btn';
      b.dataset.tool = id;
      b.textContent = `${icon} ${name}`;
      b.addEventListener('click', () => {
        chaosTool = id;
        paintChaosUi();
      });
      bar.append(b);
    }
  for (const b of bar.children) b.setAttribute('aria-pressed', String(b.dataset.tool === chaosTool));
  paintJuiceUi();
  if (MODE === 'chaos') {
    const st = S.chaosStats;
    const alive = people.filter((p) => !p.zombie).length;
    const zombies = people.filter((p) => p.zombie).length;
    $('chaosStats').textContent = `부순 건물 ${st.houses} · 쓰러진 주민 ${st.people} · 동물 ${st.animals} · 꽈당 ${st.slips ?? 0} · 남은 주민 ${alive}${zombies ? ` · 좀비 ${zombies}` : ''} · 방명록 ${S.signs.length}`;
  }
}

function wireChaos() {
  canvas.addEventListener('click', (ev) => {
    if (MODE !== 'chaos') return;
    if (dragged) return (dragged = false); // that was a drag, not a click
    const [x, y] = worldAt(ev);
    useTool(x, y);
  });
  wireJuice();
  $('signOk').addEventListener('click', placeSign);
  $('signText').addEventListener('keydown', (ev) => ev.key === 'Enter' && placeSign());
  $('chaosExit').addEventListener('click', leaveChaos);
  $('chaosReset').addEventListener('click', () => enterChaos(S.era));
  $('toChaos').addEventListener('click', () => {
    $('eraPick').hidden = false;
  });
  $('modeLife').addEventListener('click', () => {
    $('mode').hidden = true;
    if (!S.gender) $('pick').hidden = false;
  });
  $('modeChaos').addEventListener('click', () => {
    $('mode').hidden = true;
    $('eraPick').hidden = false;
  });
  $('eraBack').addEventListener('click', () => {
    $('eraPick').hidden = true;
    if (MODE === 'life' && !S.gender) $('mode').hidden = false;
  });
  const eras = $('eraButtons');
  ERAS.forEach((e, i) => {
    const b = document.createElement('button');
    b.textContent = e.name;
    b.addEventListener('click', () => enterChaos(i));
    eras.append(b);
  });
  paintChaosUi();
}
