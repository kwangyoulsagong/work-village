// 작은 마을 — the neighbours' own lives: who likes whom (pairs of residents), quarrels in a cloud of dust and making up
// over shared meat, lovers and rivals (with an icon over their heads when they meet), rumours, a confession that
// fails, trade between houses that looks different in each era (swap → market → cart → bike → scooter → drone),
// hunting in the first three eras (spear, bow, falcon), a neighbour who wants to move away, gifts at your door,
// a bonfire in the first era, robot pets in the last, "today's line", and your own numbers: status, abilities,
// temperament and the grain of your life.
// Life mode only (a chaos sandbox or a friend's town just strolls). Loaded before game.js: nothing here touches
// game.js at load time, only when called.
'use strict';

// ── Korean particles: 도윤이 / 하나가, 도윤과 / 하나와 ───────────────────────────────────────────────────────────────

const hasBatchim = (w) => {
  const c = String(w).charCodeAt(String(w).length - 1);
  return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0;
};
const josa = (w, withB, without) => {
  const c = String(w).charCodeAt(String(w).length - 1);
  const rieul = c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 === 8; // ㄹ takes 로, not 으로
  return `${w}${hasBatchim(w) && !(withB === '으로' && rieul) ? withB : without}`;
};
const ga = (w) => josa(w, '이', '가');
const wa = (w) => josa(w, '과', '와');
const eul = (w) => josa(w, '을', '를');

// ── Temperaments: every resident is born with one; it colours what they do ─────────────────────────────────────────

const TEMPERS = [
  { id: 'hot', name: '다혈질', note: '잘 싸우고 금방 풀려요' },
  { id: 'gentle', name: '온순함', note: '싸움을 피하고 잘 화해해요' },
  { id: 'chatty', name: '수다쟁이', note: '소문을 잘 퍼뜨려요' },
  { id: 'romantic', name: '낭만파', note: '사랑에 잘 빠져요' },
  { id: 'trader', name: '장사꾼', note: '물물교환을 좋아해요' },
  { id: 'loner', name: '외톨이', note: '혼자가 편해요' },
];
const temperOf = (i) => TEMPERS[(((i + 3) * 2654435761 + (S.mapSeed ?? 0)) >>> 0) % TEMPERS.length];
const myTemper = () => TEMPERS.find((t) => t.id === S.temper) ?? null;

// ── Everyone's abilities: the same five as yours, hidden for neighbours, and they change what each one does ──────

/** A villager's abilities (1–5 each): a resident's are their family's (jobs.js), others' from who they are. */
const npcTraits = (e) => {
  if (!e) return S.traits ?? { health: 3, green: 3, charm: 3, trade: 3, luck: 3 };
  if (e.kind === 'me') return S.traits ?? { health: 3, green: 3, charm: 3, trade: 3, luck: 3 };
  if (!e.tr) {
    const i = resident(e);
    e.tr = i >= 0 ? villagerTraits(i) : villagerTraits(1000 + (e.home ?? 0) * 7 + String(e.who ?? '').length * 31);
  }
  return e.tr;
};
/** How fast a need runs down: the frail tire sooner, the charming want company sooner. */
const needMul = (e, k) => {
  const t = npcTraits(e);
  return k === 'energy' ? 1.3 - t.health * 0.1 : k === 'social' ? 0.7 + t.charm * 0.1 : 1;
};
/** What a day's work brings: 1, sometimes 2 for skilful hands (손재주 4: 20 %, 5: 40 %). */
const workYield = (e) => 1 + (Math.random() < (npcTraits(e).green - 3) * 0.2 ? 1 : 0);
/** Finds for the collection book: luck 1 finds 0.8×, luck 5 1.6×. */
const findMul = (e) => 0.6 + npcTraits(e).luck * 0.2;
/** After the town is peopled: walking speed by health; the hardy shake off a plague. */
function villageSpawn() {
  fights = fights.filter((f) => people.includes(f.a) && people.includes(f.b));
  for (const p of people) {
    if (p.kind !== 'villager' && p.kind !== 'spouse') continue;
    const t = npcTraits(p);
    p.speed = (p.speed ?? 1) * (0.86 + t.health * 0.05);
    p.baseSpeed = p.speed;
    if (p.plague && t.health >= 4 && Math.random() < 0.5) p.plague = false;
  }
}

// ── Pairs: one number per pair of residents (−10 … 10) ────────────────────────────────────────────────────────────

/** The house index of a resident who keeps relations (the main adult of each house), or −1. */
const resident = (e) => (e && e.kind === 'villager' && /^h\d+a$/.test(e.who ?? '') ? +e.who.slice(1, -1) : -1);
const pairKey = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
const relOf = (a, b) => S.rel?.[pairKey(a, b)] ?? 0;
const nameOf = (i) => FAMILIES[i]?.single ?? '이웃';
const isRivals = (a, b) => relOf(a, b) <= -5;
const isLovers = (a, b) => !!S.lovers?.includes(pairKey(a, b));
const loverOf = (i) => {
  const k = (S.lovers ?? []).find((p) => p.split('|').map(Number).includes(i));
  return k ? k.split('|').map(Number).find((x) => x !== i) : -1;
};
const lives = (i) => i >= 0 && i < occupied() && i !== S.spouse;
/** Two people the town shouldn't put together: rivals avoid each other (ai.js asks). */
const avoids = (e, o) => {
  const a = resident(e);
  const b = resident(o);
  return a >= 0 && b >= 0 && isRivals(a, b);
};

function addRel(a, b, d, why = '') {
  if (MODE !== 'life' || a === b || !lives(a) || !lives(b)) return;
  S.rel ??= {};
  const k = pairKey(a, b);
  const before = S.rel[k] ?? 0;
  const v = Math.max(-10, Math.min(10, before + d));
  S.rel[k] = v;
  const A = nameOf(a);
  const B = nameOf(b);
  if (before > -5 && v <= -5) {
    S.lovers = (S.lovers ?? []).filter((p) => p !== k);
    story(`⚡ ${wa(A)} ${ga(B)} 앙숙이 됐어요. 마주치면 고개를 홱 돌려요.`);
  } else if (before <= -5 && v > -5) story(`🤝 ${wa(A)} ${ga(B)} ${why || '오랜만에 웃으며'} 화해했어요.`);
  else if (before < 7 && v >= 7 && FAMILIES[a].gender !== FAMILIES[b].gender && !isLovers(a, b) && loverOf(a) < 0 && loverOf(b) < 0) confess(a, b);
  else if (before < 6 && v >= 6 && !isLovers(a, b)) story(`🧺 ${nameOf(a)}네와 ${nameOf(b)}네는 이제 단골이에요.`);
}

/** Someone works up the courage. A romantic is braver and luckier. */
function confess(a, b) {
  const [from, to] = Math.random() < 0.5 ? [a, b] : [b, a];
  const charm = villagerTraits(from).charm;
  const odds = 0.4 + charm * 0.05 + (temperOf(to).id === 'romantic' ? 0.2 : 0) - (temperOf(to).id === 'loner' ? 0.25 : 0);
  if (Math.random() < odds) {
    S.lovers = [...(S.lovers ?? []), pairKey(a, b)];
    S.rel[pairKey(a, b)] = 9;
    story(`💕 ${ga(nameOf(from))} ${nameOf(to)}에게 고백했어요. ${wa(nameOf(a))} ${ga(nameOf(b))} 연인이 됐어요!`);
  } else {
    S.rel[pairKey(a, b)] = 3;
    story(`💔 ${ga(nameOf(from))} ${nameOf(to)}에게 고백했다가 거절당했어요. 오늘은 혼자 강가를 걸어요.`);
  }
}

// ── Talking: most chats bring two closer; some end in a scuffle (more in the first era, more for the hot-tempered) ──

/** Called by ai.js when `e` has finished talking to `o`. */
function chatted(e, o) {
  if (MODE !== 'life' || !o) return;
  const a = resident(e);
  const b = resident(o);
  if (a < 0 || b < 0 || a === b) return;
  const hot = [temperOf(a), temperOf(b)].filter((t) => t.id === 'hot').length;
  const gentle = [temperOf(a), temperOf(b)].filter((t) => t.id === 'gentle').length;
  const rel = relOf(a, b);
  const charm = (npcTraits(e).charm + npcTraits(o).charm) / 2; // charming people talk their way out of it
  const chance = [0.14, 0.07, 0.06, 0.05, 0.04, 0.03][S.era] + hot * 0.06 - gentle * 0.04 + (rel < 0 ? 0.08 : 0) - (rel >= 6 ? 0.05 : 0) - (charm - 3) * 0.015;
  if (Math.random() < Math.max(0.005, chance) && !o.hidden && !e.hidden) {
    startFight(e, o);
    addRel(a, b, -3);
    return;
  }
  addRel(a, b, 1 + (temperOf(a).id === 'chatty' ? 1 : 0));
  // Gossip: chatterboxes pass on who's sweet on whom and who's not speaking.
  if (Math.random() < (temperOf(a).id === 'chatty' || temperOf(b).id === 'chatty' ? 0.5 : 0.15)) rumour(a, b);
}

function rumour(a, b) {
  S.rumours ??= [];
  const pairs = [...(S.lovers ?? []).map((k) => [k, 'love']), ...Object.entries(S.rel ?? {}).filter(([, v]) => v <= -5).map(([k]) => [k, 'feud'])];
  const fresh = pairs.find(([k]) => !S.rumours.includes(k) && !k.split('|').map(Number).some((x) => x === a || x === b || !lives(x)));
  if (!fresh) return;
  const [k, kind] = fresh;
  const [x, y] = k.split('|').map(Number);
  S.rumours.push(k);
  S.rumours = S.rumours.slice(-30);
  story(
    kind === 'love'
      ? `🗣 소문이 돌아요: "${wa(nameOf(x))} ${nameOf(y)}, 어제 광장에서 손 잡고 있었대요."`
      : `🗣 소문이 돌아요: "${wa(nameOf(x))} ${nameOf(y)}, 아직도 말 안 한대요."`,
  );
}

// ── Scuffles: a cloud of dust, stars and a flailing arm. Nobody gets hurt; tap the cloud to break it up ──────────

let fights = [];
function startFight(e, o) {
  const x = (e.x + o.x) / 2;
  const y = Math.max(e.y, o.y);
  for (const p of [e, o]) {
    p.path = [];
    p.goal = null;
    p.busy = true;
    p.hidden = true; // inside the cloud
    p.carry = null; // whatever they were taking somewhere is forgotten
    p.then = null;
    if (p.baseSpeed) p.speed = p.baseSpeed;
    p.act = { tool: 'fight', n: 32, t: 32, done: () => {} };
  }
  e.x = o.x = x;
  fights.push({ x, y, t: 32, a: e, b: o });
}
function endFight(f, broken) {
  fights = fights.filter((x) => x !== f);
  for (const [p, dx] of [[f.a, -8], [f.b, 8]]) {
    p.hidden = false;
    p.act = null;
    p.busy = false;
    p.x += dx;
    p.dir = dx < 0 ? 'l' : 'r';
    p.wait = 12;
    p.sulk = 24;
  }
  if (broken) {
    addRel(resident(f.a), resident(f.b), 2);
    toast(`${wa(nameOf(resident(f.a)))} ${nameOf(resident(f.b))} 싸움을 말렸어요`);
  }
}
/** A tap in life mode: on a scuffle, it's over. */
function tryStopFight(wx, wy) {
  const f = fights.find((x) => Math.abs(x.x - wx) < 14 && Math.abs(x.y - 8 - wy) < 14);
  if (!f) return false;
  endFight(f, true);
  return true;
}

function drawFights(g) {
  for (const f of fights) {
    if (!onScreen(f.x)) continue;
    const t = clockTick();
    const x = Math.round(f.x);
    const y = Math.round(f.y) - 8;
    shadow(g, x, f.y, 20);
    // A tumbling ball of dust …
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + t * 0.7;
      disc(g, x + Math.round(Math.cos(a) * 6), y + Math.round(Math.sin(a) * 4), 4 + ((i + t) % 2), i % 2 ? '#e8dcc4' : '#d6c6a6');
    }
    disc(g, x, y, 5, '#f2ead8');
    // … with an arm, a leg and stars flying out.
    const k = t % 4;
    R(g, x + (k < 2 ? 7 : -10), y - 3 + k, 4, 2, f.a.look?.top ?? '#d8644f');
    R(g, x + (k < 2 ? -9 : 6), y + 3 - k, 3, 2, f.b.look?.legs ?? '#4b4560');
    for (const [dx, dy] of [[-8, -9], [7, -10], [0, -13]]) if ((t + dx) % 3) R(g, x + dx, y + dy + (k % 2), 1, 1, '#ffd23f');
    R(g, x - 1, y - 15, 3, 1, '#ffffff');
  }
}

// ── Head icons: lovers ♥ and rivals ⚡ when they're near each other ──────────────────────────────────────────────

function markPairs() {
  const near = new Map();
  const byHouse = new Map();
  for (const p of people) {
    p.pairIcon = null;
    const i = resident(p);
    if (i >= 0) byHouse.set(i, p);
  }
  const mark = (k, icon) => {
    const [a, b] = k.split('|').map(Number);
    const pa = byHouse.get(a);
    const pb = byHouse.get(b);
    if (!pa || !pb || pa.hidden || pb.hidden || Math.abs(pa.x - pb.x) > 3 * T || Math.abs(pa.y - pb.y) > 2 * T) return;
    pa.pairIcon = pb.pairIcon = icon;
  };
  for (const k of S.lovers ?? []) mark(k, 'love');
  for (const [k, v] of Object.entries(S.rel ?? {})) if (v <= -5) mark(k, 'feud');
  return near;
}
const HEART_PX = ['.rr.rr.', 'rrrrrrr', 'rrrrrrr', '.rrrrr.', '..rrr..', '...r...'];
const BOLT_PX = ['...yy', '..yy.', '.yyyy', '...y.', '..y..', '.y...'];
function drawPairIcon(g, e) {
  if (!e.pairIcon || e.act?.tool === 'talk') return;
  const x = Math.round(e.x) - 3;
  const y = Math.round(e.y) - 27 - (Math.floor((clockTick() + (e.seed ?? 0)) / 6) % 2);
  if (e.pairIcon === 'love') spr(g, HEART_PX, { r: '#ff5a7a' }, x, y);
  else spr(g, BOLT_PX, { y: '#ffcf3a' }, x + 1, y);
}

// ── Trade between houses: what a job has too much of, carried to a neighbour (a regular, if they have one) ─────────

const GOODS = {
  hunter: '#b8503a', gatherer: '#e8505b', fisher: '#5a9ad0', shaman: '#9a6ad0', farmer: '#e8c050', smith: '#8a8e96',
  athlete: '#f2a65a', merchant: '#f5c542', knight: '#c0c6d0', bard: '#8a4ab0', baker: '#d8a060', monk: '#a07850',
  miner: '#7a7e88', worker: '#5a7aa8', mail: '#f4efe6', police: '#3a5a9a', office: '#e8e8ee', nurse: '#ff8a9a',
  soccer: '#ffffff', star: '#ff9ec2', robotics: '#5ad7e8', astronaut: '#f2f4f6', gamer: '#8a6cc9', creator: '#f2a65a',
};
const TRADE_LOOK = ['맞교환', '장터', '수레', '배달 자전거', '배달 오토바이', '드론 배송'];
/** Who to trade with: a regular if there is one, otherwise anyone not a rival. */
function tradePartner(i) {
  const n = occupied();
  let best = -1;
  let score = -99;
  for (let j = 0; j < n; j++) {
    if (j === i || !lives(j) || isRivals(i, j)) continue;
    const s = relOf(i, j) + Math.random() * 4;
    if (s > score) [best, score] = [j, s];
  }
  return best;
}

let drones = [];
function tradeOption(e, i, add) {
  if ((e.tradeCool ?? 0) > 0) return;
  const j = tradePartner(i);
  if (j < 0) return;
  const want = (temperOf(i).id === 'trader' ? 55 : temperOf(i).id === 'loner' ? 18 : 34) + (npcTraits(e).trade - 3) * 6;
  const goods = GOODS[e.job?.id] ?? '#c98d4b';
  const finish = () => {
    e.carry = null;
    e.speed = e.baseSpeed ?? e.speed;
    e.tradeCool = 400 + rand(0, 400);
    addRel(i, j, 1 + (temperOf(i).id === 'trader' || npcTraits(e).trade >= 5 ? 1 : 0));
    S.trades = (S.trades ?? 0) + 1;
    if (S.trades % 25 === 0) story(`🧺 마을에서 물물교환이 ${S.trades}번 오갔어요. 서로 필요한 걸 나눠요.`);
  };
  if (S.era === 5) {
    // The future: a drone flies it over; the sender just taps a phone at home.
    add(want, 'trade', doorOf(i), 'phone', 30, () => {}, () => {
      const [fx] = doorOf(i);
      const [tx] = doorOf(j);
      drones.push({ x: fx * T + 8, y: ROAD_Y * T - 30, tx: tx * T + 8, ty: ROAD_Y * T - 30, c: goods, done: finish, drop: 0 });
      e.tradeCool = 300;
    });
    return;
  }
  const to = S.era === 1 ? [PLAZA.x - 1 + rand(0, 5), PLAZA.y - 1] : doorOf(j);
  add(want, 'trade', to, 'swap', 36, finish, () => {
    e.carry = { c: goods, how: S.era };
    e.baseSpeed ??= e.speed;
    if (S.era === 3) e.speed = 1.8;
    if (S.era === 4) e.speed = 2.3;
  });
}

function droneTick(k) {
  drones = drones.filter((d) => {
    const dx = d.tx - d.x;
    if (Math.abs(dx) < 2) {
      d.drop += k;
      if (d.drop > 16) {
        d.done();
        return false;
      }
      return true;
    }
    d.x += Math.sign(dx) * Math.min(Math.abs(dx), 2.2 * k);
    return true;
  });
}
function drawDrones(g) {
  for (const d of drones) {
    if (!onScreen(d.x)) continue;
    const x = Math.round(d.x);
    const y = Math.round(d.y + Math.min(d.drop, 8) + Math.sin(clockTick() * 0.8) * 1);
    const spin = clockTick() % 2;
    R(g, x - 6, y - 2, 4 + spin, 1, '#d8e0e8');
    R(g, x + 2, y - 2, 4 + spin, 1, '#d8e0e8');
    box(g, x - 3, y - 1, 7, 3, '#3a4a66');
    R(g, x - 1, y, 3, 1, '#5ad7e8');
    if (d.drop < 12) box(g, x - 2, y + 3, 5, 4, d.c);
  }
}

/** What someone carries: a bundle on the head, a basket, a cart, a bike, a scooter. */
function drawCarry(g, e) {
  const c = e.carry;
  if (!c) return;
  const x = Math.round(e.x);
  const y = Math.round(e.y);
  const back = e.dir === 'l' ? 1 : -1; // the cart trails behind
  const walking = e.path?.length > 0;
  const spin = Math.floor((e.frame ?? 0) / 2) % 2;
  switch (c.how) {
    case 0: // a bundle on the head
      box(g, x - 3, y - 21, 7, 4, c.c);
      R(g, x - 1, y - 22, 3, 1, '#8a5a3a');
      break;
    case 1: // a basket on the arm
      box(g, x + (e.dir === 'l' ? -8 : 3), y - 8, 6, 4, '#c98d4b');
      R(g, x + (e.dir === 'l' ? -7 : 4), y - 10, 4, 2, c.c);
      break;
    case 2: {
      // a hand cart behind
      const cx = x + back * 12;
      box(g, cx - 5, y - 8, 11, 5, '#a8743a');
      R(g, cx - 4, y - 10, 9, 2, c.c);
      R(g, x + back * 6, y - 6, 3, 1, '#6b4428');
      disc(g, cx, y - 2, 2, '#4a3a30');
      if (walking && spin) R(g, cx, y - 3, 1, 1, '#c8b090');
      break;
    }
    case 3:
    case 4: {
      // a delivery bike (3) or scooter (4): wheels under, a box on the back
      const scooter = c.how === 4;
      for (const dx of [-5, 5]) {
        disc(g, x + dx, y - 2, 2, '#2a2a30');
        if (spin) R(g, x + dx, y - 3, 1, 1, '#c8c8d0');
      }
      R(g, x - 5, y - 5, 11, 1, scooter ? '#e05a4a' : '#4a7fd0');
      if (scooter) box(g, x - 3, y - 7, 6, 2, '#e05a4a');
      box(g, x + back * 6 - 3, y - 12, 7, 6, scooter ? '#f4efe6' : '#f2a65a');
      R(g, x + back * 6 - 2, y - 10, 5, 1, c.c);
      break;
    }
    case 'meat':
      box(g, x + (e.dir === 'l' ? -8 : 3), y - 9, 6, 4, '#c98d4b');
      R(g, x + (e.dir === 'l' ? -7 : 4), y - 11, 3, 2, '#d0604a');
      R(g, x + (e.dir === 'l' ? -5 : 6), y - 12, 2, 1, '#f4efe6');
      break;
    case 'gift':
      box(g, x + (e.dir === 'l' ? -8 : 3), y - 10, 5, 5, '#ff8ac0');
      R(g, x + (e.dir === 'l' ? -6 : 5), y - 10, 1, 5, '#ffd23f');
      break;
  }
}

/** Market stalls on the square in the ancient era, while the sun is up. */
function drawMarket(g) {
  if (S.era !== 1 || isNight() || !onScreen(PLAZA.x * T)) return;
  for (const [dx, c] of [[-1, '#d8644f'], [4, '#3f8fb0']]) {
    const x = (PLAZA.x + dx) * T;
    const y = (PLAZA.y - 1) * T;
    R(g, x + 1, y - 2, 1, 12, '#6b4428');
    R(g, x + 14, y - 2, 1, 12, '#6b4428');
    for (let i = 0; i < 16; i += 4) R(g, x + i, y - 5, 4, 3, i % 8 ? '#f4efe6' : c);
    box(g, x + 1, y + 6, 14, 4, '#a8743a');
    R(g, x + 3, y + 5, 3, 1, '#e8505b');
    R(g, x + 8, y + 5, 3, 1, '#e8c050');
  }
}

// ── Hunting: spear (primitive), bow (ancient), falcon (medieval). Wild kinds only, never a rare colour ────────────

const PREY = new Set(['rabbit', 'deer', 'boar', 'gorani', 'turkeyWild']);
const HUNT_TOOL = ['spear', 'bow', 'falcon'];
function huntOption(e, add) {
  if (S.era > 2 || (e.huntCool ?? 0) > 0) return;
  const hunter = e.job?.id === 'hunter' || (S.era === 2 && e.job?.id === 'knight');
  if (!hunter && resident(e) % 4 !== 1) return;
  if (people.filter((p) => p.doing === 'hunt').length >= 2) return;
  const wild = animals.filter((a) => PREY.has(a.kind) && !a.variant && !a.hidden);
  if (!wild.length) return;
  const prey = wild[rand(0, wild.length - 1)];
  const [px, py] = tileOf(prey);
  const tool = HUNT_TOOL[S.era];
  add(hunter ? 70 : 32, 'hunt', [px + (Math.random() < 0.5 ? -2 : 2), py], tool, 48, () => huntDone(e, prey), () => (e.prey = prey));
}
function huntDone(e, prey) {
  e.huntCool = 500 + rand(0, 300);
  e.prey = null;
  const t = npcTraits(e);
  const ok = !prey.hidden && Math.random() < [0.45, 0.55, 0.65][S.era] + (e.job?.id === 'hunter' ? 0.1 : 0) + (t.health + t.luck - 6) * 0.03;
  const home = e.home >= 0 ? doorOf(e.home) : HOME_DOOR;
  if (ok) {
    downPrey(prey);
    e.carry = { how: 'meat' };
    S.hunts = (S.hunts ?? 0) + 1;
    if (S.hunts === 1) story(`🏹 ${ga(nameOf(resident(e)) || '사냥꾼')} 처음으로 사냥에 성공했어요. 오늘 저녁은 고기예요!`);
  } else e.sulk = 30; // empty-handed: a little "…" on the way home
  e.then = {
    what: 'home', to: home, tool: ok ? 'basket' : null, dur: 16, done: () => {
      if (!ok) return;
      e.carry = null;
      stock('meat', 1);
      stock('hide', 1);
      if (S.stock.hide % 5 === 0) {
        S.happy = Math.min(100, S.happy + 5);
        story(`🧥 가죽 ${S.stock.hide}장이 모였어요. 따뜻한 옷을 지어 나눠 입었어요.`);
      }
    },
  };
}
/** You, as the town's hunter: off to the nearest wild animal with the era's weapon; meat and a hide, or it got away. */
function myHuntTask(job) {
  if (MODE !== 'life') return null;
  const wild = animals.filter((a) => PREY.has(a.kind) && !a.variant && !a.hidden);
  if (!wild.length) return null;
  const prey = wild.reduce((a, b) => (Math.abs(b.x - me.x) < Math.abs(a.x - me.x) ? b : a));
  const [px, py] = tileOf(prey);
  const tool = HUNT_TOOL[Math.min(2, S.era)];
  return {
    to: [px + (prey.x < me.x ? 2 : -2), py],
    tool,
    what: `${josa(job.name, '으로', '로')} 사냥하기`,
    job: true,
    dur: 40,
    dir: prey.x < me.x ? 'l' : 'r', // set again on arrival, towards where the animal is now
    arrive: () => {
      me.prey = prey; // aimed at (drawHunt), and it holds still
      me.dir = prey.x < me.x ? 'l' : 'r';
    },
    act: () => {
      me.prey = null;
      const name = ANIMAL_NAMES[prey.kind] ?? '짐승';
      if (prey.hidden || Math.random() > 0.45 + (trait('health') + trait('luck') - 6) * 0.04) return `${josa(name, '을', '를')} 놓쳤어요…`;
      downPrey(prey);
      stock('meat', 1);
      stock('hide', 1);
      S.hunts = (S.hunts ?? 0) + 1;
      if (S.hunts === 1) story(`🏹 처음으로 사냥에 성공했어요. ${josa(name, '을', '를')} 잡았어요!`);
      return `${josa(name, '을', '를')} 잡았어요!`;
    },
  };
}
/** A hit: the animal keels over (stars round it) for a few seconds, then it's taken away. */
function downPrey(prey) {
  prey.down = 28;
  prey.path = [];
  prey.caughtUntil = Date.now() + 8 * 60_000;
}
function preyTick() {
  for (const a of animals)
    if (a.down > 0 && --a.down === 0) a.hidden = true;
}
function drawDownPrey(g) {
  const t = clockTick();
  for (const a of animals) {
    if (!(a.down > 0) || a.hidden || !onScreen(a.x)) continue;
    for (let i = 0; i < 3; i++) {
      const ang = t / 3 + (i * Math.PI * 2) / 3;
      R(g, Math.round(a.x + Math.cos(ang) * 6), Math.round(a.y - 12 + Math.sin(ang) * 2), 2, 2, '#ffe066');
    }
    R(g, Math.round(a.x) - 1, Math.round(a.y) - 18, 2, 1, '#e8404b');
  }
}
/** The weapon while the hunt plays: a thrust spear, an arrow in flight, a falcon swooping. */
function drawHunt(g, e) {
  const a = e.act;
  if (!a || !HUNT_TOOL.includes(a.tool)) return false;
  const k = a.n - a.t;
  // Aim at the animal being hunted (who holds still meanwhile); without one, straight ahead.
  const prey = e.prey ?? (e.kind === 'me' ? me.prey : null);
  if (prey && !prey.hidden && !(prey.down > 0)) {
    prey.path = [];
    prey.wait = Math.max(prey.wait ?? 0, 6);
  }
  const live = prey && !prey.hidden;
  const tx = live ? Math.round(prey.x) : Math.round(e.x) + (e.dir === 'l' ? -40 : 40);
  const ty = live ? Math.round(prey.y) - 5 : Math.round(e.y) - 9;
  const flip = tx < e.x;
  const s = flip ? -1 : 1;
  const x = Math.round(e.x);
  const y = Math.round(e.y) - 9;
  if (a.tool === 'spear') {
    // Thrown: from the hand to the animal, then it's there.
    const p = Math.min(1, (k % 20) / 10);
    const sx = Math.round(x + (tx - x) * p);
    const sy = Math.round(y + (ty - y) * p - Math.sin(p * Math.PI) * 6);
    R(g, sx - s * 10, sy, 11, 1, '#8a5a3a');
    R(g, flip ? sx - 12 : sx + 1, sy - 1, 2, 3, '#b8bcc4');
  } else if (a.tool === 'bow') {
    for (let i = 0; i < 7; i++) R(g, x + s * (4 + Math.abs(3 - i)), y - 4 + i, 1, 1, '#8a5a3a');
    const p = Math.min(1, (k % 16) / 8); // the arrow flies to the animal and sticks
    if (k % 16 > 1) R(g, Math.round(x + s * 6 + (tx - x - s * 6) * p) - (flip ? 0 : 4), Math.round(y - 1 + (ty - y + 1) * p), 5, 1, '#6b4428');
  } else {
    // A falcon: up from the glove, over, and down on the animal.
    const p = (k % 24) / 24;
    const fx = Math.round(x + (tx - x) * p);
    const fy = Math.round(y - 6 + (ty - y + 6) * p - Math.sin(p * Math.PI) * 18);
    R(g, x + s * 4, y, 2, 2, '#8a6a48');
    spr(g, BIRD[Math.floor(k / 3) % 2], { o: '#7a5a3a' }, fx - 3, fy, flip);
  }
  return true;
}

// ── Making up: meat shared (the first era) or a little gift (later) to someone you're not speaking to ────────────

function makeUpOption(e, i, add) {
  const rival = Object.entries(S.rel ?? {})
    .filter(([k, v]) => v <= -5 && k.split('|').map(Number).includes(i))
    .map(([k]) => k.split('|').map(Number).find((x) => x !== i))
    .find(lives);
  if (rival == null) return;
  const meat = S.era === 0 && (S.stock.meat ?? 0) > 0;
  const kind = temperOf(i).id === 'gentle' ? 2 : temperOf(i).id === 'hot' ? 0.6 : 1;
  add((meat ? 60 : 22) * kind, 'makeup', doorOf(rival), 'heart', 40, () => {
    e.carry = null;
    if (meat) S.stock.meat--;
    addRel(i, rival, meat ? 8 : 4, meat ? '고기를 나눠 먹으며' : '작은 선물을 주고받으며');
  }, () => (e.carry = { how: meat ? 'meat' : 'gift' }));
}

// ── A bonfire on the square in the first era's evenings; robot pets in the future ─────────────────────────────────

const bonfireOn = () => S.era === 0 && MODE === 'life' && (hour() >= 18 || hour() < 1);
function drawBonfire(g) {
  if (!bonfireOn() || !onScreen(PLAZA.x * T)) return;
  const x = (PLAZA.x + 2) * T;
  const y = (PLAZA.y + 1) * T;
  const t = clockTick();
  R(g, x - 6, y + 2, 12, 2, '#6b4428');
  R(g, x - 4, y, 8, 2, '#8a5a3a');
  disc(g, x, y - 2, 4, '#f08a2e');
  disc(g, x + ((t % 3) - 1), y - 4, 3, '#f5b041');
  R(g, x - 1 + (t % 2), y - 8 - (t % 3), 2, 2, '#ffe066');
  if (t % 4 < 2) R(g, x + 3, y - 12 - (t % 5), 1, 1, '#ffd23f');
}
const ROBOT_PX = ['..o..', '.ooo.', 'ocwco', 'ogggo', '.o.o.'];
function drawRobotPet(g, e) {
  if (S.era !== 5 || e.small || e.hidden || resident(e) < 0 || resident(e) % 3 !== 0) return;
  const side = e.dir === 'l' ? 9 : -9;
  const hop = Math.floor((clockTick() + (e.seed ?? 0)) / 3) % 2;
  spr(g, ROBOT_PX, { o: '#3a4a66', c: '#5ad7e8', w: '#ffffff', g: '#c8d4e0' }, Math.round(e.x) + side - 2, Math.round(e.y) - 5 - hop);
}

// ── Fishing for fun: anyone, any era, at the lake or the pond. A catch leaps out of the water ─────────────────────

let leaps = [];
function fishOption(e, add) {
  if ((e.fishCool ?? 0) > 0 || people.filter((p) => p.doing === 'fish').length >= 3) return;
  const t = npcTraits(e);
  const keen = (temperOf(resident(e)).id === 'loner' ? 25 : 0) + (t.luck - 3) * 5 + (e.job?.id === 'fisher' ? 30 : 0);
  const pond = Math.random() < 0.3;
  const sea = hasSea() && Math.random() < 0.45; // off the end of the pier (sea.js)
  const spot = sea ? [pierEnd(), ROAD_Y] : pond ? [POND.x + rand(0, POND.w - 1), POND.y - 1] : [LAKE.x + rand(0, LAKE.w - 1), LAKE.y - 1];
  add(22 + keen, 'fish', spot, 'rod', 110, () => {
    e.fishCool = 300 + rand(0, 400);
    if (Math.random() > 0.35 + t.luck * 0.08) return; // the one that got away
    stock('fish', 1);
    if (Math.random() < 0.12 * findMul(e)) find(sea ? 'sea' : 'fish');
    leaps.push({ x: e.x + (e.dir === 'l' ? -6 : 6), y: e.y - 2, sx: e.x, t: 0, big: Math.random() < 0.15 });
    S.fishCaught = (S.fishCaught ?? 0) + 1;
    if (sea && Math.random() < 0.05) story(`🦈 ${ga(nameOf(resident(e)))} 상어를 낚을 뻔했어요! 줄이 끊어져서 다행이에요.`);
    if (S.fishCaught === 1) story(`🎣 ${ga(nameOf(resident(e)))} 호숫가에서 첫 물고기를 낚았어요.`);
  });
}
function leapTick(k) {
  for (const l of leaps) l.t += k;
  leaps = leaps.filter((l) => l.t < 10);
}
function drawLeaps(g) {
  for (const l of leaps) {
    if (!onScreen(l.x)) continue;
    // Up out of the water on the line, wriggling, into the basket.
    const p = l.t / 10;
    const x = Math.round(l.x + (l.sx - l.x) * p);
    const y = Math.round(l.y - 14 - Math.sin(p * Math.PI) * 10 + 14 * p);
    const wig = Math.floor(l.t) % 2;
    spr(g, l.big ? ['.oooo.o', 'owwwwoo', 'oweww.o', '.oooo..'] : ['.ooo.o', 'owwwoo', '.ooo.o'], { o: '#3a5a7a', w: wig ? '#9fd6f0' : '#c8ecff', e: '#222222' }, x - 3, y);
    if (l.t < 3) for (const dx of [-3, 0, 3]) R(g, Math.round(l.x) + dx, Math.round(l.y) - 2 - Math.round(l.t), 1, 1, '#ffffff');
  }
}

// ── Hooks for ai.js: what a resident might do besides their job, and what follows ───────────────────────────────

function villageOptions(e, add, night) {
  if (MODE !== 'life' || e.kind !== 'villager' || e.small) return;
  if (bonfireOn()) add(72, 'bonfire', [PLAZA.x + rand(0, 3), PLAZA.y + rand(0, 1)], 'sit', 120, () => (e.needs.social = 100));
  if (night) return;
  const i = resident(e);
  huntOption(e, add);
  fishOption(e, add);
  if (i < 0) return;
  tradeOption(e, i, add);
  makeUpOption(e, i, add);
  npcCallOption(e, i, add); // drop in on another family, if someone's home (guest.js)
}

// ── Travellers on foot: a word with whoever they pass, a hand at a building site ──────────────────────────────────

const ON_FOOT = new Set(['runner', 'walker']);
function travellersTick() {
  if (MODE !== 'life' || !cars.length) return;
  for (const c of cars) {
    if (!ON_FOOT.has(c.type) || c.pause > 0 || c.x < viewX - 40 || c.x > viewX + VIEW_W + 40) continue;
    c.cool = (c.cool ?? 0) - 1;
    if (c.cool > 0) continue;
    // A building site on their way: they stop and help for a while (cooperation; the work goes quicker).
    const s = sites.find((x) => Math.abs(x.tx * T + x.w * 8 - c.x) < 20);
    if (s) {
      c.pause = 40;
      c.help = 40;
      c.cool = 200;
      s.left = Math.max(1, s.left - 30);
      if (Math.random() < 0.3) story('🔨 지나가던 여행자가 잠깐 멈춰서 집 짓기를 도왔어요.');
      continue;
    }
    // Someone on the road near them: a hello, a few words.
    const near = [me, ...people].find((p) => !p.hidden && !p.small && (p.kind === 'villager' || p.kind === 'me') && Math.abs(p.x - c.x) < 14 && Math.abs(p.y - (ROAD_Y * T + 14)) < 12);
    if (near && Math.random() < 0.5) {
      c.pause = 24;
      c.chat = 24;
      c.cool = 160;
      if (near.kind === 'me') {
        bubble = { x: me.x, y: me.y, heart: false };
        talkFrames = 16;
        $('now').textContent = ['여행자와 인사를 나눴어요', '여행자에게 길을 알려 줬어요', '먼 마을 소식을 들었어요'][rand(0, 2)];
        S.happy = Math.min(100, S.happy + 1);
      } else near.dir = near.x < c.x ? 'r' : 'l';
    } else c.cool = 12;
  }
  for (const c of cars) {
    if (c.chat > 0) c.chat--;
    if (c.help > 0) c.help--;
  }
}
/** Over a traveller: "…" while talking, a hammer while helping. */
function drawTraveller(g, c, x, b) {
  if (c.chat > 0) {
    const by = b - 34;
    R(g, x - 1, by, 11, 7, '#ffffff');
    R(g, x + 3, by + 7, 2, 2, '#ffffff');
    for (const dx of [1, 4, 7]) R(g, x + dx, by + 3, 1, 1, '#6b5a6a');
  } else if (c.help > 0) {
    const up = Math.floor(c.help / 3) % 2;
    R(g, x + 10, b - 14 - up * 3, 1, 6, '#8a5a3a');
    R(g, x + 9, b - 16 - up * 3, 4, 3, '#7a7e88');
  }
}

// ── Each tick (8 a second) and each frame ─────────────────────────────────────────────────────────────────────────

let pairTick = 0;
function villageTick() {
  if (MODE !== 'life') return fights.length > 0;
  for (const f of fights) if (--f.t <= 0) endFight(f, false);
  for (const p of people) {
    if (p.tradeCool > 0) p.tradeCool--;
    if (p.huntCool > 0) p.huntCool--;
    if (p.fishCool > 0) p.fishCool--;
    if (p.sulk > 0) p.sulk--;
  }
  const now = Date.now();
  for (const a of animals) if (a.caughtUntil && now > a.caughtUntil) [a.hidden, a.caughtUntil] = [false, 0];
  if (++pairTick % 4 === 0) markPairs();
  travellersTick();
  preyTick();
  eggTick();
  return fights.length > 0 || drones.length > 0 || leaps.length > 0;
}
function villageVisual(k) {
  droneTick(k);
  leapTick(k);
}
function drawVillageUnder(g) {
  drawMarket(g);
  drawBonfire(g);
  drawEggs(g);
}
function drawVillageOver(g) {
  drawFights(g);
  drawDownPrey(g);
  drawDrones(g);
  drawLeaps(g);
}
/** Over a person, after they're drawn: what they carry, their hunt, a pair icon, a sulk, a robot pet. */
function drawVillager(g, e) {
  drawCarry(g, e);
  drawRobotPet(g, e);
  drawPairIcon(g, e);
  if (e.sulk > 0 && !e.pairIcon) for (const dx of [-2, 0, 2]) R(g, Math.round(e.x) + dx, Math.round(e.y) - 22, 1, 1, '#6b5a6a');
}

// ── Once a day: someone wants to leave, a gift at your door, the young grow up ────────────────────────────────────

function villageDay() {
  if (MODE !== 'life' || !S.gender || S.over) return;
  // Pairs whose houses fell or emptied are forgotten.
  for (const k of Object.keys(S.rel ?? {})) if (!k.split('|').map(Number).every(lives)) delete S.rel[k];
  S.lovers = (S.lovers ?? []).filter((k) => k.split('|').map(Number).every(lives));
  // The newest family isn't settling in: unless you go and talk, they'll go in two days.
  if (S.leaving && S.days - S.leaving.day >= 2) {
    const i = S.leaving.i;
    S.leaving = null;
    if (i === occupied() - 1 && lives(i)) {
      S.vacant++;
      story(`🧳 ${nameOf(i)}네가 결국 마을을 떠났어요. 빈집에 언젠가 새 가족이 오겠죠.`);
      spawnFamily();
    }
  } else if (!S.leaving && occupied() >= 5) {
    const i = occupied() - 1;
    const feuds = Object.entries(S.rel ?? {}).filter(([k, v]) => v <= -5 && k.split('|').map(Number).includes(i)).length;
    const lonely = (S.friends[i]?.f ?? 0) < 3;
    const charm = villagerTraits(i).charm; // the charming make friends and stay
    if (lives(i) && Math.random() < 0.02 + feuds * 0.06 + (lonely ? 0.02 : 0) + (temperOf(i).id === 'loner' ? 0.02 : 0) - (charm - 3) * 0.005) {
      S.leaving = { i, day: S.days };
      story(`🧳 ${nameOf(i)}네가 이사를 고민해요. 찾아가서 붙잡아 볼까요?`);
    }
  }
  // A friend leaves a little something at your door.
  const friends = S.friends.map((f, i) => [f?.f ?? 0, i]).filter(([f, i]) => f >= 7 && lives(i));
  if (friends.length && Math.random() < 0.25) {
    const [, i] = friends[rand(0, friends.length - 1)];
    const gifts = [
      ['wood', 3, '장작 세 단'],
      ['berries', 4, '열매 한 바구니'],
      ['fish', 2, '물고기 두 마리'],
      ['stone', 3, '반듯한 돌 세 개'],
    ];
    const [kind, n, what] = gifts[rand(0, gifts.length - 1)];
    stock(kind, n);
    story(`🎁 ${nameOf(i)}네가 ${eul(what)} 문 앞에 두고 갔어요.`);
  }
  growYoung();
}

/** Your errand when a neighbour is about to leave (game.js nextTask asks, before the everyday chores). */
function keepTask() {
  if (MODE !== 'life' || !S.leaving || !lives(S.leaving.i)) return null;
  const i = S.leaving.i;
  return {
    to: doorOf(i),
    tool: 'talk',
    what: `${nameOf(i)}네 붙잡으러 가기`,
    dur: 36,
    dir: 'u',
    act: () => {
      S.leaving = null;
      const odds = 0.45 + trait('charm') * 0.1 + Math.min(0.2, (S.friends[i]?.f ?? 0) * 0.03);
      if (Math.random() < odds) {
        if (S.friends[i]) S.friends[i].f = Math.min(MAX_FRIEND, S.friends[i].f + 2);
        story(`🏡 ${nameOf(i)}네를 붙잡았어요. "조금 더 살아 볼게요."`);
        return `${nameOf(i)}: "덕분에 마음이 바뀌었어요."`;
      }
      if (i === occupied() - 1) {
        S.vacant++;
        spawnFamily();
        story(`🧳 붙잡아 봤지만 ${nameOf(i)}네는 결국 떠났어요.`);
      } else story(`🧳 ${nameOf(i)}네는 아직 마음을 못 정했대요. 조금 더 지내 보기로 했어요.`);
      return `${nameOf(i)}: "그동안 고마웠어요."`;
    },
  };
}

// ── Eggs and the young: hens and ducks lay; chicks follow their mother; a rare colour can pass down ──────────────

const YOUNG_MAX = 4;
const HATCH_MS = 6 * 60_000;
function eggTick() {
  if (!S.gender || S.over) return;
  S.eggs ??= [];
  S.young ??= [];
  const now = Date.now();
  // Hatching.
  for (const egg of [...S.eggs])
    if (now - egg.at > HATCH_MS) {
      S.eggs = S.eggs.filter((x) => x !== egg);
      if (S.young.length >= YOUNG_MAX) continue;
      const v = egg.v && Math.random() < 0.6 ? egg.v : Math.random() < 0.04 ? VARIANTS[rand(0, VARIANTS.length - 1)].id : null;
      S.young.push({ k: egg.k, v, day: S.days });
      const baby = egg.k === 'duck' ? '새끼 오리' : '병아리';
      if (v) {
        const key = `${egg.k}:${v}`;
        S.variants ??= [];
        if (!S.variants.includes(key)) S.variants.push(key);
        story(`✨ ${VARIANTS.find((x) => x.id === v).name} ${baby}가 알을 깨고 나왔어요!`);
      } else if ((S.hatched = (S.hatched ?? 0) + 1) === 1) story(`🐣 알에서 ${baby}가 나왔어요. 엄마 뒤를 졸졸 따라다녀요.`);
      // Just the new one, next to its mother (a full respawn would bring hunted animals back early).
      const m = animals.find((a) => a.kind === egg.k);
      if (m) {
        const kid = make(egg.k === 'duck' ? 'duckling' : 'chick', tileOf(m), { zone: m.zone, speed: 0.7, mother: m, babyVariant: v });
        [kid.x, kid.y] = [m.x - 6, m.y];
        animals.push(kid);
      }
    }
  // Laying: now and then, while there's room for more young.
  if (S.eggs.length >= 2 || S.young.length + S.eggs.length >= YOUNG_MAX || Math.random() > 0.0015) return;
  const moms = animals.filter((a) => (a.kind === 'chicken' && S.chickens >= 2) || a.kind === 'duck');
  if (!moms.length) return;
  const m = moms[rand(0, moms.length - 1)];
  S.eggs.push({ k: m.kind, v: m.variant ?? null, x: Math.round(m.x), y: Math.round(m.y), at: now });
}
function drawEggs(g) {
  for (const egg of S.eggs ?? []) {
    if (!onScreen(egg.x)) continue;
    const near = Date.now() - egg.at > HATCH_MS - 30_000; // wobbles before it hatches
    const dx = near && clockTick() % 4 < 2 ? 1 : 0;
    box(g, egg.x - 2 + dx, egg.y - 4, 4, 5, egg.k === 'duck' ? '#dfe8d8' : '#fff6e6', '#8a7a68');
    if (near) R(g, egg.x - 1 + dx, egg.y - 2, 2, 1, '#8a7a68');
  }
}
function growYoung() {
  const grown = (S.young ?? []).filter((y) => S.days - y.day >= 3);
  if (!grown.length) return;
  S.young = S.young.filter((y) => !grown.includes(y));
  for (const y of grown) {
    if (y.k === 'chicken' && S.chickens < MAX_CHICKENS) {
      S.chickens++;
      story('🐔 병아리가 쑥 자라 어엿한 닭이 됐어요.');
    } else if (y.k === 'chicken') story('🐔 다 자란 닭을 이웃집에 분양했어요.');
    else story('🦆 새끼 오리가 다 자라 호숫가 친구들 곁으로 갔어요.');
  }
  spawnAnimals();
}
/** Chicks and ducklings, each behind a mother of its kind (called from spawnMoreAnimals). */
function spawnYoung(add) {
  for (const y of S.young ?? []) {
    const moms = animals.filter((a) => a.kind === y.k);
    if (!moms.length) continue;
    const m = moms[rand(0, moms.length - 1)];
    add(y.k === 'duck' ? 'duckling' : 'chick', m.zone, 0.7);
    const kid = animals[animals.length - 1];
    kid.mother = m;
    kid.babyVariant = y.v;
    kid.x = m.x - 6;
    kid.y = m.y;
  }
}
/** A chick keeps a step behind its mother. */
function followMother(e) {
  const m = e.mother;
  const want = m.x + (m.dir === 'l' ? 7 : -7);
  const dx = want - e.x;
  const dy = m.y - e.y;
  if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return false;
  e.x += Math.sign(dx) * Math.min(Math.abs(dx), 0.8);
  e.y += Math.sign(dy) * Math.min(Math.abs(dy), 0.6);
  e.dir = dx < 0 ? 'l' : 'r';
  e.frame++;
  e.path = Math.abs(dx) > 1 ? [1] : [];
  return true;
}
const CHICK = [['.oo..', 'oyeyo', 'oyyyn', '.oyo.', '..o..'], ['.oo..', 'oyeyo', 'oyyyn', '.oyo.', '.o...']];
const CHICK_PAL = { o: '#b88a2a', y: '#ffe066', e: '#3a2a3a', n: '#f08a3a' };
const DUCKLING_PAL = { o: '#a89030', y: '#f5e07a', e: '#3a2a3a', n: '#f0a030' };
function drawYoung(g, e) {
  if (e.kind !== 'chick' && e.kind !== 'duckling') return false;
  const pal = e.kind === 'duckling' ? DUCKLING_PAL : CHICK_PAL;
  drawAnimal(g, { ...e, variant: e.babyVariant }, CHICK, pal, 5, 5, 4);
  return true;
}

// ── Dog breeds ─────────────────────────────────────────────────────────────────────────────────────────────────────

const DOG_BREEDS = [
  { id: 'jindo', name: '진돗개', pal: { o: '#8a7a6a', y: '#f4ead8', W: '#ffffff', e: '#3a2a3a', n: '#3a2a3a' } },
  { id: 'shiba', name: '시바견', pal: { o: '#8a4a22', y: '#e8903e', W: '#fff3e0', e: '#3a2a3a', n: '#3a2a3a' } },
  { id: 'beagle', name: '비글', pal: { o: '#5a3a22', y: '#c8843a', W: '#ffffff', e: '#3a2a3a', n: '#3a2a3a' } },
  { id: 'poodle', name: '푸들', pal: { o: '#6a3a22', y: '#a8643a', W: '#c8845a', e: '#2a1a1a', n: '#2a1a1a' } },
  { id: 'retriever', name: '리트리버', pal: { o: '#9a6a2a', y: '#f0c470', W: '#fbe6b0', e: '#3a2a3a', n: '#3a2a3a' } },
  { id: 'corgi', name: '웰시코기', pal: { o: '#8a4a22', y: '#f0a050', W: '#ffffff', e: '#3a2a3a', n: '#3a2a3a' } },
  { id: 'black', name: '까만 믹스견', pal: { o: '#1a1a20', y: '#3a3a44', W: '#e8e0d8', e: '#ffffff', n: '#111111' } },
];
const dogBreed = () => DOG_BREEDS.find((b) => b.id === S.dogBreed) ?? DOG_BREEDS[(S.mapSeed ?? 0) % DOG_BREEDS.length];
const pickBreed = () => DOG_BREEDS[rand(0, DOG_BREEDS.length - 1)].id;

// ── More wildlife: an otter in the lake, magpies about town, a water deer in the woods ───────────────────────────

const OTTER = [
  ['.........oo.', '..ooooooobbo', '.obbbbbbbben', 'obbbbbbbbbo.', '.oo......oo.'],
  ['.........oo.', '..ooooooobbo', '.obbbbbbbben', 'obbbbbbbbbo.', '..oo....oo..'],
];
const OTTER_PAL = { o: '#3a2418', b: '#7a5232', e: '#111111', n: '#111111' };
const MAGPIE = [['..oo..', '.oeoy.', 'owwoo.', 'oooooo', '.o.o..'], ['..oo..', '.oeoy.', 'owwoo.', 'oooooo', '..o.o.']];
const MAGPIE_PAL = { o: '#1e2230', w: '#f4f4f8', e: '#ffffff', y: '#2a2a30' };
const GORANI = [
  ['.........oo.', '........oddo', 'o.oooooooden', 'oddddddddwo.', '.oddddddddo.', '.ol.ol.ol.o.', '.oo.oo.oo.o.'],
  ['.........oo.', '........oddo', 'o.oooooooden', 'oddddddddwo.', '.oddddddddo.', '..ol.olol.o.', '..oo.oooo.o.'],
];
const GORANI_PAL = { o: '#5a4028', d: '#b0885a', e: '#111111', n: '#111111', w: '#ffffff', l: '#8a6a44' };
function drawWildMore(g, e) {
  switch (e.kind) {
    case 'otter': drawAnimal(g, e, OTTER, OTTER_PAL, 12, 5, 9); return true;
    case 'magpie': drawAnimal(g, e, MAGPIE, MAGPIE_PAL, 6, 5, 4); return true;
    case 'gorani': drawAnimal(g, e, GORANI, GORANI_PAL, 12, 7, 10); return true;
  }
  return drawYoung(g, e);
}
function spawnWildMore(add) {
  // Nothing grazes on the waves: drop whatever was put in, or would wander into, the sea.
  if (hasSea()) animals = animals.filter((a) => !inSeaTile(Math.floor(a.x / T)) && !(a.zone && (isWater(a.zone.x) || isWater(a.zone.x + a.zone.w - 1))));
  add('otter', { x: LAKE.x + 1, y: LAKE.y, w: LAKE.w - 2, h: Math.max(1, LAKE.h - 1) }, 0.5);
  for (let i = 0; i < 3; i++) add('magpie', { x: HOME.x - 20 + i * 14, y: ROAD_Y + 1, w: 8, h: 2 }, 0.8);
  GROVES.filter((g) => g.w >= 9).slice(0, 3).forEach((g) => add('gorani', { x: g.x, y: ROAD_Y + 2, w: g.w, h: 3 }, 0.7));
  spawnYoung(add);
  spawnVisitor(add); // a rare visitor your decorations drew (pastimes.js)
}

// ── Today's line: the one thing worth knowing about today ─────────────────────────────────────────────────────────

const NEWS_RANK = [/세상을 떠|전쟁|역병|발전했어요|결혼|태어났|로켓/, /💕|💔|화해|앙숙|떠났|붙잡/, /🗣|🎁|✨|🐣|🏹|황금|희귀/, /지었어요|이사 왔|개간/];
function todayLine() {
  const list = S.story.filter((s) => s.day === S.days);
  for (const re of NEWS_RANK) {
    const hit = list.find((s) => re.test(s.text));
    if (hit) return storyKind(hit.text).text;
  }
  return list[0] ? storyKind(list[0].text).text : '';
}

// ── Your numbers: status 0–100, abilities with what they do, temperament and the grain of your life ─────────────

const clamp100 = (v) => Math.max(0, Math.min(100, Math.round(v)));
function myStatus() {
  const lv = levelOf(S.xp);
  const friends = S.friends.slice(0, occupied()).filter(Boolean);
  const avg = friends.length ? friends.reduce((a, f) => a + (f.f ?? 0), 0) / friends.length : 0;
  return [
    { k: '건강', v: clamp100(35 + trait('health') * 13 - Math.max(0, S.age - 40) * 0.8 - (S.sickDays > 0 ? 35 : 0)), note: '타고난 체력이 받쳐 주고, 나이가 들거나 앓으면 떨어져요' },
    { k: '행복', v: clamp100(S.happy), note: '함께 일한 날이 많을수록 가족이 행복해요' },
    { k: '지식', v: clamp100(8 + S.era * 11 + lv * 1.2 + (S.dex?.length ?? 0) * 0.6), note: '시대가 바뀌고 레벨이 오르고 도감이 찰수록 늘어요' },
    { k: '관계', v: clamp100(avg * 7 + (S.spouse != null ? 15 : 0) + S.kids * 5), note: '이웃과 친해지고 가족이 생기면 올라요' },
  ];
}
function myAbilities() {
  const ill = [0, 0.22, 0.14, 0.08, 0.04, 0.02][trait('health')] * (has('hospital') ? 0.5 : 1);
  return [
    ['health', `하루에 병에 걸릴 확률 ${Math.round(ill * 100)}%`],
    ['green', `작물이 ${growMul().toFixed(2)}배 빨리 자라요`],
    ['charm', `방문 한 번에 친해지는 만큼 +${1 + (trait('charm') >= 4 ? 1 : 0)}${trait('charm') >= 4 ? ', 붙잡기도 잘해요' : ''}`],
    ['trade', `작물을 ${priceMul().toFixed(2)}배 값에 팔아요`],
    ['luck', `황금 작물 ${Math.round(goldenChance() * 100)}% · 도둑이 덜 들어요`],
  ];
}
/** The grain of a life (read from how you've lived, not rolled): four pairs, 0–100 towards the left word. */
function myGrain() {
  const L = S.life ?? {};
  const days = Math.max(1, S.age);
  return [
    ['부지런함', '느긋함', clamp100(((L.worked ?? 0) / days) * 100)],
    ['다정함', '무뚝뚝함', clamp100(((L.visits ?? 0) / days) * 60)],
    ['통 큼', '알뜰함', clamp100(((L.spent ?? 0) / Math.max(1, (L.spent ?? 0) + S.coins)) * 100)],
    ['모험', '안정', clamp100(S.era * 14 + (S.cleared?.length ?? 0) * 8 + (S.wars ?? 0) * 6)],
  ];
}
/** Counting the life as it's lived (game.js calls these). */
function lifeCount(kind, n = 1) {
  if (MODE !== 'life') return;
  S.life ??= { worked: 0, visits: 0, spent: 0 };
  S.life[kind] = (S.life[kind] ?? 0) + n;
}

function meRows() {
  if (!S.traits) return [el('li', 'empty', '캐릭터를 고르면 능력치가 보여요')];
  const out = [];
  const head = el('li', 'me-head');
  const job = myJob();
  head.append(
    el('b', '', `${S.gender === 'f' ? '여성' : '남성'} · ${S.age}일째 · Lv.${levelOf(S.xp)}`),
    el('span', '', `${era().title}${job ? ` · ${job.name} (수입 +${pct(myPay(0.5))})` : ''}${myTemper() ? ` · ${myTemper().name}` : ''}`),
  );
  out.push(head, el('li', 'group', '상태'));
  for (const s of myStatus()) {
    const li = el('li', 'stat');
    const bar = el('div', 'progress');
    const fill = el('i');
    fill.style.width = `${s.v}%`;
    bar.append(fill);
    const top = el('div', 'stat__top');
    top.append(el('span', '', s.k), el('b', '', String(s.v)));
    li.append(top, bar, el('div', 'stat__note', s.note));
    out.push(li);
  }
  out.push(el('li', 'group', '능력'));
  for (const [k, note] of myAbilities()) {
    const li = el('li', 'stat');
    const top = el('div', 'stat__top');
    top.append(el('span', '', traitName(k)), el('b', 'stars', '★'.repeat(S.traits[k]) + '☆'.repeat(5 - S.traits[k])));
    li.append(top, el('div', 'stat__note', note));
    out.push(li);
  }
  out.push(el('li', 'group', '성격'));
  if (myTemper()) {
    const li = el('li', 'stat');
    const top = el('div', 'stat__top');
    top.append(el('span', '', '타고난 기질'), el('b', '', myTemper().name));
    li.append(top, el('div', 'stat__note', myTemper().note));
    out.push(li);
  }
  for (const [a, b, v] of myGrain()) {
    const li = el('li', 'stat');
    const top = el('div', 'stat__top');
    top.append(el('span', '', a), el('span', '', b));
    const bar = el('div', 'grain');
    const dot = el('i');
    dot.style.left = `calc(6px + (100% - 12px) * ${((100 - v) / 100).toFixed(2)})`; // the dot stays inside the bar
    bar.append(dot);
    li.append(top, bar);
    out.push(li);
  }
  out.push(el('li', 'stat__note', '성격은 정해진 게 아니라 살아온 모습에서 읽어요. 사는 대로 조금씩 바뀌어요.'));
  out.push(...groveRows(), ...findRows()); // the work grove and finds (cozy.js)
  out.push(...familyRows()); // your spouse's and children's numbers, family memories (family.js)
  // The recipe book (pastimes.js): what the family has cooked so far.
  out.push(el('li', 'group', `요리 수첩 ${S.cooked?.length ?? 0}/${RECIPES.length}`));
  const book = el('li', 'chips');
  for (const r of RECIPES) {
    if (r.era > S.era + 1) continue;
    const got = S.cooked?.includes(r.id);
    const c = el('span', 'chip', got ? r.name : '???');
    c.title = got ? r.name : `${ERAS[r.era].name} · ${Object.keys(r.need).map((k) => ({ berries: '열매', fish: '물고기', meat: '고기', crop: '작물' })[k]).join(' + ')}`;
    if (!got) c.style.opacity = '0.5';
    book.append(c);
  }
  out.push(book);
  return out;
}
function paintMe() {
  const list = document.getElementById('meList');
  if (list) list.replaceChildren(...meRows());
  paintTicker(); // the town paper, today's big news first (cozy.js)
}
/** Tapping yourself opens your numbers. */
function tryMe(wx, wy) {
  if (!S.gender || Math.abs(me.x - wx) > 8 || wy < me.y - 20 || wy > me.y + 2) return false;
  document.querySelector('[data-tab="me"]')?.click();
  document.querySelector('[data-tab="me"]')?.scrollIntoView?.({ block: 'nearest' });
  return true;
}

// ── You: how you're doing changes how you go about it ─────────────────────────────────────────────────────────────

let myHealth = 70;
/** Called from paintUi: your walk by your health; a sigh now and then when you're unhappy. */
function meFeel() {
  if (!S.traits || MODE !== 'life') return;
  myHealth = myStatus()[0].v;
  me.speed = 1.6 + myHealth * 0.006; // 1.6 … 2.2: you go about your day a little briskly
  if (S.happy < 30 && Math.random() < 0.3) me.sulk = 30;
}
/** The pause after an errand: longer when you're unwell; the hot-tempered rush on. */
const restAfter = () => Math.round((10 + (100 - myHealth) / 8) * (S.temper === 'hot' ? 0.6 : 1));
/** XP: what you know helps you learn (knowledge 100 → 25 % more). */
const learnMul = () => (S.traits ? 1 + (myStatus()[2].v / 100) * 0.25 : 1);
