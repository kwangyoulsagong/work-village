// 작은 마을 — how everyone decides what to do and how they get there.
// Paths: A* over the tile grid (houses, water, fences, the hill and landmarks are in the way).
// Choices: utility AI, as life sims do it — each villager has needs (energy, hunger, social) that run down over time;
// every possible action gets a score from those needs, the time of day, what's happening in town (a festival, a
// building site) and a little chance; the best one wins, they walk there and play its motion until it's done.
'use strict';

// ── Where you can walk ─────────────────────────────────────────────────────────────────────────────────────────────

const inRect = (P, tx, ty) => tx >= P.x && tx < P.x + P.w && ty >= P.y && ty < P.y + P.h;

function walkable(tx, ty) {
  if (tx < 0 || ty < 2 || tx >= COLS || ty >= ROWS) return false;
  if (inRect(POND, tx, ty) || inRect(LAKE, tx, ty) || inRect(PEN, tx, ty) || inRect(MINE, tx, ty)) return false;
  if (seaBlocks(tx, ty)) return false; // the sea (the pier is fine)
  // Houses stand on rows 3–5, above the road.
  if (ty >= 3 && ty <= 5) {
    if (tx >= HOME.x && tx < HOME.x + HOME.w) return false;
    for (let i = 0; i < S.houses + S.ruins; i++) {
      const l = S.lots?.[i];
      if (l && !l.s && (tx === l.x || tx === l.x + 1)) return false;
    }
  }
  // Houses on cleared land, south of the road (rows 8–10).
  if (ty >= ROAD_Y + 2 && ty <= ROAD_Y + 4)
    for (let i = 0; i < S.houses + S.ruins; i++) {
      const l = S.lots?.[i];
      if (l && l.s && (tx === l.x || tx === l.x + 1)) return false;
    }
  for (const l of LANDMARKS) if (has(l.id) && ty >= ROAD_Y + 2 && ty <= ROAD_Y + 4 && tx >= l.x && tx < l.x + l.w) return false;
  return true;
}

/** The nearest walkable tile to (tx, ty) — destinations like "the tree" or "the lake" sit next to things. */
function nearestWalkable(tx, ty) {
  for (let r = 0; r < 6; r++)
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
        if (walkable(tx + dx, ty + dy)) return [tx + dx, ty + dy];
      }
  return [tx, ROAD_Y];
}

/** A* on the grid, 4 directions, Manhattan distance. Returns the tiles to walk through (without the start). */
function findPath(sx, sy, tx, ty) {
  if (sx === tx && sy === ty) return [];
  const key = (x, y) => y * COLS + x;
  const g = new Map([[key(sx, sy), 0]]);
  const from = new Map();
  const open = [[sx, sy, Math.abs(tx - sx) + Math.abs(ty - sy)]];
  const closed = new Set();
  let guard = 0;
  while (open.length && guard++ < 12000) {
    let best = 0;
    for (let i = 1; i < open.length; i++) if (open[i][2] < open[best][2]) best = i;
    const [x, y] = open.splice(best, 1)[0];
    const k = key(x, y);
    if (x === tx && y === ty) {
      const path = [];
      for (let c = k; c !== key(sx, sy); c = from.get(c)) path.unshift([c % COLS, Math.floor(c / COLS)]);
      return path;
    }
    if (closed.has(k)) continue;
    closed.add(k);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      const nk = key(nx, ny);
      const isGoal = nx === tx && ny === ty;
      if (closed.has(nk) || (!isGoal && !walkable(nx, ny))) continue;
      // The road is a little cheaper: people keep to it.
      const cost = (g.get(k) ?? 0) + (ny === ROAD_Y ? 0.8 : 1);
      if (cost < (g.get(nk) ?? Infinity)) {
        g.set(nk, cost);
        from.set(nk, k);
        open.push([nx, ny, cost + Math.abs(tx - nx) + Math.abs(ty - ny)]);
      }
    }
  }
  return [[tx, ty]]; // no way round: walk straight (rare)
}

const tileOf = (e) => [Math.round((e.x - T / 2) / T), Math.round((e.y - T + 2) / T)];

/** Sends someone to a tile along a real path. */
function route(e, [tx, ty]) {
  const [sx, sy] = tileOf(e);
  if (!isPier(tx, ty)) tx = shoreClamp(tx); // nobody walks out to sea, except along the pier (sea.js)
  e.path = findPath(sx, sy, Math.max(0, Math.min(COLS - 1, tx)), Math.max(0, Math.min(ROWS - 1, ty)));
}

// ── Villagers' minds ───────────────────────────────────────────────────────────────────────────────────────────────

const ROLES = ['farmer', 'forager', 'woodcutter', 'miner', 'fisher', 'builder'];
const hour = () => new Date().getHours();
const isMeal = () => [7, 8, 12, 13, 18].includes(hour());
const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

/** Building sites: scaffolding for a while after something is built; builders come to help. */
let sites = [];
function openSite(tx, w = 2) {
  sites.push({ tx, w, left: 140 });
}

/** Every action a villager could take now, each with a score, a place and a motion. */
function options(e) {
  const out = [];
  const night = isNight();
  const n = e.needs;
  const add = (score, what, to, tool, dur, done, start) => out.push({ score: score + Math.random() * 15, what, to, tool, dur, done, start });
  const home = e.home === -1 ? HOME_DOOR : doorOf(e.home);

  if (night) add(150 - n.energy * 0.5, 'sleep', home, 'sleep', 400, () => (n.energy = 100));
  // Weather: a storm sends everyone indoors; rain makes home a bit more tempting.
  if (weather === 'storm') add(140, 'shelter', home, 'sleep', 160, () => {});
  else if (weather === 'rain') add(45, 'shelter', home, 'sleep', 100, () => {});
  add((100 - n.energy) * 0.7, 'rest', [PLAZA.x + rand(0, 3), PLAZA.y + 1], 'sit', 80, () => (n.energy = Math.min(100, n.energy + 40)));
  add((100 - n.hunger) * (isMeal() ? 1.4 : 0.6), 'eat', home, 'bowl', 60, () => (n.hunger = 100));
  if (festivalToday()) add(120, 'dance', [PLAZA.x + rand(0, 3), PLAZA.y + rand(0, 1)], 'dance', 90, () => (n.social = 100));

  if (e.kind === 'kid' && !e.small) add(70, 'play', [PLAZA.x + rand(-2, 5), ROAD_Y + rand(1, 2)], 'dance', 50, () => (n.social = Math.min(100, n.social + 30)));
  if (e.kind === 'kid' || e.small) {
    add(40, 'run', [rand(HOME.x - 8, HOME.x + 8), ROAD_Y + rand(0, 1)], null, 10, () => {});
    return out;
  }

  // Someone to talk to: an idle neighbour not too far away.
  const friend = people.find((o) => o !== e && !o.small && !o.hidden && !o.busy && Math.abs(o.x - e.x) < 12 * T && o.kind !== 'dog' && !avoids(e, o));
  if (friend)
    add((100 - n.social) * 0.9, 'talk', tileOf(friend), 'talk', 60, () => {
      n.social = 100;
      chatted(e, friend); // village.js: closer, or a scuffle
    });

  if (sites.length && (e.role === 'builder' || Math.random() < 0.3)) {
    const s = sites[0];
    add(e.role === 'builder' ? 110 : 75, 'build', [s.tx + rand(0, s.w - 1), ROAD_Y], 'hammer', 70, () => {});
  }

  // Work by job (life mode: 24 jobs over the eras), in daylight.
  if (!night && e.job) {
    const j = e.job;
    const dur = j.at === 'lake' ? 140 : j.at === 'run' || j.at === 'patrol' ? 20 : 90;
    add(60, j.id, jobPlace(e, j), j.tool, dur, () => jobDone(j, e));
  }
  // Work by role, in daylight.
  if (!night && !e.job) {
    const w = 55;
    switch (e.role) {
      case 'farmer': {
        const [px, py] = PLOT_AT[rand(0, PLOT_AT.length - 1)];
        add(w, 'farm', [px, py - 1], 'hoe', 90, () => {});
        break;
      }
      case 'forager':
        add(w, 'forage', groveSpot(), 'pick', 80, () => {
          stock('berries', workYield(e));
          if (Math.random() < 0.15 * findMul(e)) find('forage');
        });
        break;
      case 'woodcutter':
        add(w, 'chop', groveSpot(), 'axe', 90, () => stock('wood', workYield(e)));
        break;
      case 'miner':
        add(w, 'mine', [MINE.x + rand(1, MINE.w - 2), MINE.y + MINE.h], 'pickaxe', 100, () => {
          stock('stone', workYield(e));
          if (Math.random() < 0.15 * findMul(e)) find('gem');
          if (Math.random() < 0.04 * findMul(e)) find('relic'); // something old in the rock
        });
        break;
      case 'fisher':
        add(w, 'fish', [LAKE.x + rand(0, LAKE.w - 1), LAKE.y - 1], 'rod', 140, () => {
          if (Math.random() < 0.6) stock('fish', workYield(e));
          if (Math.random() < 0.2 * findMul(e)) find('fish');
        });
        break;
      case 'builder':
        add(w - 10, 'tidy', [STORE.x + 1, STORE.y], 'hammer', 60, () => {});
        break;
    }
    if (S.chickens + S.cows + S.sheep + S.pigs > 0 && Math.random() < 0.3)
      add(45, 'feed', [PEN_GATE[0], PEN_GATE[1]], 'feed', 60, () => {});
  }
  villageOptions(e, add, night); // trade, hunt, make up, the bonfire (village.js)
  pastimeOptions(e, add); // the commute, a picket, the joust, the museum, a caravan (pastimes.js)
  add(20, 'stroll', [rand(0, COLS - 1), ROAD_Y], null, 10, () => {});
  return out;
}

function stock(kind, n) {
  S.stock[kind] = (S.stock[kind] ?? 0) + n;
  for (const [k, name, at] of [['wood', '나무', 100], ['stone', '돌', 100], ['fish', '물고기', 50], ['berries', '열매', 100]])
    if (kind === k && S.stock[k] === at) story(`마을 창고에 ${name}가 ${at}개 쌓였어요. 다들 부지런하네요.`);
  if (kind === 'wood' || kind === 'stone') cache.dirty = true;
}

/** One step of a villager's life: walk, act, or decide what's next. */
function think(e) {
  if (e.zombie) return zombieThink(e);
  if (e.kind === 'guest') return guestThink(e);
  if (e.slip > 0) return true; // on the ground, seeing stars
  // Needs run down slowly.
  const n = e.needs;
  // … faster for the frail (energy) and the sociable (company): abilities everyone has, shown or not (village.js).
  n.energy = Math.max(0, n.energy - 0.02 * needMul(e, 'energy'));
  n.hunger = Math.max(0, n.hunger - 0.03);
  n.social = Math.max(0, n.social - 0.025 * needMul(e, 'social'));

  if (e.path.length) return step(e);
  if (e.act) {
    e.act.t--;
    if (e.act.tool === 'dance' || (e.act.tool === 'run' && e.act.t % 4 === 0)) e.hop = e.act.t % 6 < 3 ? -2 : 0;
    if (e.act.t <= 0) {
      const a = e.act;
      a.done?.();
      if (e.act !== a) return true; // what finished started something new (a chat that became a scuffle)
      e.act = null;
      e.busy = false;
      e.hop = 0;
      if (e.hidden) {
        e.hidden = false; // out of the house again
        e.dir = 'd';
      }
      e.wait = rand(4, 20);
      if (e.then) {
        // Something follows (home from the hunt with the catch).
        e.goal = e.then;
        e.then = null;
        e.busy = true;
        e.wait = 0;
        route(e, nearestWalkable(e.goal.to[0], e.goal.to[1]));
      }
    }
    return true;
  }
  if (e.goal) {
    // Arrived: start the motion (sleeping and eating happen inside the house).
    const o = e.goal;
    e.goal = null;
    if (o.what === 'sleep' || o.what === 'eat' || o.what === 'shelter') e.hidden = true;
    if (o.what === 'talk') e.dir = Math.random() < 0.5 ? 'l' : 'r';
    else if (o.what === 'fish') e.dir = 'u';
    else if (o.tool) e.dir = Math.random() < 0.5 ? 'l' : 'r';
    if (o.tool) e.act = { tool: o.tool, n: o.dur, t: o.dur, done: o.done };
    else o.done();
    return true;
  }
  if (e.wait > 0) {
    e.wait--;
    lookAround(e); // motion.js
    return false;
  }
  const opts = options(e);
  const pick = opts.reduce((a, b) => (b.score > a.score ? b : a), opts[0]);
  e.busy = true;
  e.doing = pick.what;
  e.goal = pick;
  if (e.carry && !['trade', 'makeup'].includes(pick.what)) {
    // An errand cut short (a storm, a scuffle): whatever was carried goes home with them.
    e.carry = null;
    if (e.baseSpeed) e.speed = e.baseSpeed;
  }
  pick.start?.();
  route(e, nearestWalkable(pick.to[0], pick.to[1]));
  return true;
}

// ── Animals ────────────────────────────────────────────────────────────────────────────────────────────────────────

/** Animals graze, peck and wander inside where they live; the dog follows you; birds cross the sky. */
function animalThink(e) {
  if (e.mother) return followMother(e); // a chick behind its mother (village.js)
  if (e.path.length) return step(e);
  if (e.wait > 0) {
    e.wait--;
    // Grazing / pecking: a little bob now and then.
    e.frame += e.wait % 8 === 0 ? 1 : 0;
    return e.wait % 8 === 0;
  }
  e.wait = rand(20, 70);
  const zone = e.zone;
  const tx = rand(zone.x, zone.x + zone.w - 1);
  const ty = rand(zone.y, zone.y + zone.h - 1);
  e.path = [[tx, ty]]; // inside their own area: straight lines are fine
  return true;
}

function dogThink(e) {
  if (e.path.length) return step(e);
  const [mx, my] = tileOf(me);
  if (Math.abs(e.x - me.x) + Math.abs(e.y - me.y) > 22) route(e, nearestWalkable(mx + 1, my));
  return e.path.length > 0;
}

let birds = [];
function birdsThink(k = 1) {
  if (birds.length < 3 && Math.random() < 0.004 * k) {
    const right = Math.random() < 0.5;
    birds.push({ x: right ? camX - 10 : camX + VIEW_W + 10, y: rand(8, 30), v: right ? 0.9 : -0.9, f: 0 });
  }
  birds = birds.filter((b) => {
    b.x += b.v * k;
    b.f += k;
    return b.x > camX - 30 && b.x < camX + VIEW_W + 30;
  });
  return birds.length > 0;
}
