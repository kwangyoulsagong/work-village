// 작은 마을 — jobs: 24 of them, four an era. Villagers take one of the two latest eras' jobs, go to its workplace,
// wear its gear and play its motion. (Life mode; the protagonist keeps their own title.)
'use strict';

const JOBS = [
  { id: 'hunter', name: '사냥꾼', era: 0, at: 'woods', tool: 'bow', top: '#6b7a3a', gear: 'band' },
  { id: 'gatherer', name: '채집꾼', era: 0, at: 'woods', tool: 'pick', top: '#8a6a3a' },
  { id: 'fisher', name: '어부', era: 0, at: 'lake', tool: 'rod', top: '#4a7a9a', gear: 'straw' },
  { id: 'shaman', name: '주술사', era: 0, at: 'plaza', tool: 'staff', top: '#7a3a5a', gear: 'feather' },
  { id: 'farmer', name: '농부', era: 1, at: 'farm', tool: 'hoe', top: '#c9a24a', gear: 'straw' },
  { id: 'smith', name: '대장장이', era: 1, at: 'store', tool: 'hammer', top: '#5a4a42', gear: 'apron' },
  { id: 'athlete', name: '운동선수', era: 1, at: 'run', tool: null, top: '#e8505b', gear: 'band' },
  { id: 'merchant', name: '상인', era: 1, at: 'stall', tool: 'coin', top: '#2f7a6a', gear: 'turban' },
  { id: 'knight', name: '기사', era: 2, at: 'patrol', tool: 'sword', top: '#9aa0aa', gear: 'helm' },
  { id: 'bard', name: '음유시인', era: 2, at: 'plaza', tool: 'lute', top: '#8a4ab0', gear: 'feather' },
  { id: 'baker', name: '제빵사', era: 2, at: 'stall', tool: 'bread', top: '#f4efe6', gear: 'chef' },
  { id: 'monk', name: '수도사', era: 2, at: 'temple', tool: 'pray', top: '#7a5a3a', gear: 'hood' },
  { id: 'miner', name: '광부', era: 3, at: 'mine', tool: 'pickaxe', top: '#5a5a62', gear: 'lamp' },
  { id: 'worker', name: '공장 노동자', era: 3, at: 'factory', tool: 'wrench', top: '#3a5a8a', gear: 'cap' },
  { id: 'mail', name: '우체부', era: 3, at: 'doors', tool: 'mail', top: '#c0402e', gear: 'cap' },
  { id: 'police', name: '경찰', era: 3, at: 'patrol', tool: 'whistle', top: '#2a3a6a', gear: 'police' },
  { id: 'office', name: '회사원', era: 4, at: 'bench', tool: 'laptop', top: '#3a3f4a', gear: 'tie' },
  { id: 'nurse', name: '간호사', era: 4, at: 'hospital', tool: 'heart', top: '#f4f6f8', gear: 'nurse' },
  { id: 'soccer', name: '축구 선수', era: 4, at: 'plaza', tool: 'ball', top: '#2a8a4a', gear: 'number' },
  { id: 'star', name: '연예인', era: 4, at: 'plaza', tool: 'mic', top: '#e07aa0', gear: 'shades' },
  { id: 'robotics', name: '로봇 공학자', era: 5, at: 'factory', tool: 'wrench', top: '#d7e3ee', gear: 'goggles' },
  { id: 'astronaut', name: '우주비행사', era: 5, at: 'rocket', tool: 'sparkle', top: '#f2f4f6', gear: 'space' },
  { id: 'gamer', name: '프로게이머', era: 5, at: 'bench', tool: 'laptop', top: '#3a2a5a', gear: 'headset' },
  { id: 'creator', name: '크리에이터', era: 5, at: 'plaza', tool: 'phone', top: '#f2a65a', gear: 'cap' },
];

/** The jobs a villager can have now: those of the two latest eras reached. */
const jobPool = () => JOBS.filter((j) => j.era <= S.era && j.era >= S.era - 1);
/** A neighbour's job: the open job their traits fit best (see bestJob below). */
const jobFor = (i) => bestJob(villagerTraits(i), i);

/** Where a job is done (a tile), given what the town has. */
function jobPlace(e, j) {
  const plaza = [PLAZA.x + rand(0, 3), PLAZA.y + rand(0, 1)];
  switch (j.at) {
    case 'woods':
      return groveSpot(e);
    case 'lake':
      return [LAKE.x + rand(0, LAKE.w - 1), LAKE.y - 1];
    case 'farm': {
      const [px, py] = PLOT_AT[rand(0, plotCount() - 1)];
      return [px, py - 1];
    }
    case 'store':
      return [STORE.x, STORE.y - 1];
    case 'stall':
      return [STALL[0], ROAD_Y + 1];
    case 'run':
    case 'patrol':
      return [rand(Math.max(0, HOME.x - 30), Math.min(COLS - 1, HOME.x + 30)), ROAD_Y];
    case 'temple':
      return has('temple') ? landmarkSpot('temple') : plaza;
    case 'mine':
      return [MINE.x + rand(1, MINE.w - 2), MINE.y + MINE.h];
    case 'factory':
      return has('factory') ? landmarkSpot('factory') : [STORE.x, STORE.y - 1];
    case 'doors': {
      const i = rand(0, Math.max(0, S.houses - 1));
      return doorOf(i);
    }
    case 'hospital':
      return has('hospital') ? landmarkSpot('hospital') : plaza;
    case 'rocket':
      return has('rocket') ? landmarkSpot('rocket') : plaza;
    case 'bench':
      return [PLAZA.x + (Math.random() < 0.5 ? 0 : 3), PLAZA.y + 1];
    default:
      return plaza;
  }
}

/** What a job's work adds: the store, the collection book. */
function jobDone(j, e = null) {
  // Skilled hands bring back more, the lucky find more (village.js reads the worker's abilities).
  if (j.id === 'gatherer' || j.id === 'hunter') {
    stock('berries', workYield(e));
    if (Math.random() < 0.15 * findMul(e)) find('forage');
  } else if (j.id === 'fisher') {
    if (Math.random() < 0.6) stock('fish', workYield(e));
    if (Math.random() < 0.2 * findMul(e)) find('fish');
  } else if (j.id === 'miner') {
    stock('stone', workYield(e));
    if (Math.random() < 0.15 * findMul(e)) find('gem');
    if (Math.random() < 0.04 * findMul(e)) find('relic');
  } else if (j.id === 'smith' || j.id === 'worker') stock('wood', workYield(e));
}

// ── Gear and tools ─────────────────────────────────────────────────────────────────────────────────────────────────

/** A job's hat or badge over a villager drawn at (x, y) (the sprite's top-left). */
function drawGear(g, j, x, y, side, flip) {
  const P = (rows, pal, dy, dx = 0) => spr(g, rows, { o: OL, ...pal }, x + dx, y + dy, flip);
  switch (j.gear) {
    case 'straw':
      P(['...oooooo...', '..oyyyyyyo..', 'ooyyyyyyyyoo'], { y: '#f2d27a' }, -1);
      break;
    case 'band':
      P(['............', '.rrrrrrrrrr.'], { r: '#e8404b' }, 3);
      break;
    case 'feather':
      P(['.........r..', '........rr..', '........r...'], { r: '#e8404b' }, -3);
      break;
    case 'turban':
      P(['...oooooo...', '..owwwwwwo..', '.owwwrwwwwo.'], { w: '#f4efe6', r: '#e8404b' }, -2);
      break;
    case 'helm':
      P(['...oooooo...', '..ossssssoo.', '.osssssssso.', '.osooooooso.'], { s: '#b8bcc4' }, -1);
      break;
    case 'chef':
      P(['..owwwwwwo..', '..owwwwwwo..', '...owwwwo...', '..owwwwwwo..'], { w: '#ffffff' }, -4);
      break;
    case 'hood':
      P(['..oooooooo..', '.obbbbbbbbo.', 'obb......bbo'], { b: '#7a5a3a' }, -1);
      break;
    case 'lamp':
      P(['...oooooo...', '..oyyyyyyo..', '.oyyyyyyyyo.', '.....ww.....'], { y: '#f2c24a', w: '#ffffff' }, -2);
      break;
    case 'cap':
      P(['...oooooo...', '..obbbbbbo..', '.obbbbbbbboo'], { b: j.id === 'mail' ? '#c0402e' : j.id === 'creator' ? '#3a3a42' : '#3a5a8a' }, -1);
      break;
    case 'police':
      P(['...oooooo...', '..onnnnnno..', '.onnnyynnnoo'], { n: '#2a3a6a', y: '#f2c24a' }, -1);
      break;
    case 'nurse':
      P(['....owwo....', '...owrrwo...', '...owwwwo...'], { w: '#ffffff', r: '#e8404b' }, -2);
      break;
    case 'shades':
      if (side === 'd') P(['............', '.ooooo.ooooo'], {}, 6);
      break;
    case 'goggles':
      P(['............', '.oggooooggo.'], { g: '#5ad7e8' }, 5);
      break;
    case 'space':
      P(['..oooooooo..', '.owwwwwwwwo.', 'ow........wo', 'ow........wo', 'ow........wo', 'ow........wo', '.owwwwwwwwo.'], { w: '#e8eef4' }, -1);
      break;
    case 'headset':
      P(['..oooooooo..', '.o........o.', 'oo........oo', 'oo........oo'], {}, 1);
      break;
    case 'apron':
      P(['...aaaaaa...', '...aaaaaa...', '...aaaaaa...'], { a: '#8a6a4a' }, 11);
      break;
    case 'tie':
      if (side !== 'u') P(['.....rr.....', '.....r......'], { r: '#e8404b' }, 11);
      break;
    case 'number':
      if (side === 'u') P(['.....ww.....', '.....w......', '.....ww.....'], { w: '#ffffff' }, 11);
      break;
  }
}

/** Job tools while working; true when it drew one. */
function drawJobTool(g, e, act) {
  const k = act.n - act.t;
  const beat = Math.floor(k / 4) % 2 === 0;
  const flip = faceOf(e) === 'l';
  const hx = Math.round(e.x) + (flip ? -8 : 5);
  const hy = Math.round(e.y) - 8;
  const wood = '#8a5a3a';
  const note = (dx, dy) => {
    R(g, hx + dx, hy + dy, 2, 2, '#4a3a60');
    R(g, hx + dx + 1, hy + dy - 4, 1, 4, '#4a3a60');
  };
  switch (act.tool) {
    case 'bow':
      for (let i = 0; i < 7; i++) R(g, hx + (flip ? -Math.abs(3 - i) : Math.abs(3 - i)) - (flip ? 0 : 1), hy - 6 + i, 1, 1, wood);
      R(g, hx + (flip ? 1 : -1), hy - 6, 1, 7, '#e8e0d0');
      if (!beat) R(g, hx + (flip ? -10 : 4), hy - 3, 7, 1, '#6b4428');
      return true;
    case 'staff':
      R(g, hx, hy - 10, 1, 16, wood);
      if (beat) disc(g, hx, hy - 11, 2, '#b07aff');
      R(g, hx + (beat ? 3 : -3), hy - 14, 1, 1, '#ffe066');
      return true;
    case 'sword':
      R(g, hx, hy - (beat ? 8 : 4), 1, 8, '#d8dce4');
      R(g, hx - 1, hy - (beat ? 1 : -3), 3, 1, '#c9921a');
      return true;
    case 'lute':
      disc(g, hx, hy + 1, 2, '#c98d4b');
      R(g, hx + (flip ? -5 : 1), hy - 2, 5, 1, wood);
      note(beat ? 2 : -2, -10 - (k % 8));
      return true;
    case 'bread':
      R(g, hx - 2, hy, 6, 3, '#d9a05a');
      R(g, hx - 1, hy, 4, 1, '#f2c27a');
      if (beat) R(g, hx + 1, hy - 3, 1, 2, 'rgba(255,255,255,0.7)');
      return true;
    case 'pray':
      R(g, Math.round(e.x) - 1, hy - 1, 3, 2, '#ffd9b8');
      if (beat) R(g, Math.round(e.x), hy - 22, 1, 1, '#ffe066');
      return true;
    case 'wrench':
      R(g, hx, hy - (beat ? 5 : 2), 1, 5, '#8a8e96');
      R(g, hx - 1, hy - (beat ? 7 : 4), 3, 2, '#8a8e96');
      if (!beat) R(g, hx + (flip ? -3 : 3), hy + 2, 1, 1, '#ffe066');
      return true;
    case 'mail':
      box(g, hx - 1, hy - 1, 6, 4, '#ffffff', '#8a8e96');
      R(g, hx, hy, 4, 1, '#c0402e');
      return true;
    case 'whistle':
      R(g, hx, hy - 3, 2, 2, '#c9cdd4');
      if (beat) for (const [dx, dy] of [[4, -6], [6, -4], [5, -8]]) R(g, hx + dx * (flip ? -1 : 1), hy + dy, 1, 1, '#ffffff');
      return true;
    case 'laptop':
      box(g, hx - 3, hy - 1, 8, 4, '#3a3f4a', '#2a2e36');
      R(g, hx - 2, hy, 6, 2, beat ? '#8fd0f0' : '#5ad7e8');
      return true;
    case 'ball': {
      const by = Math.round(e.y) - 2 - (beat ? 4 : 0);
      disc(g, Math.round(e.x) + (flip ? -7 : 7), by, 2, '#ffffff');
      R(g, Math.round(e.x) + (flip ? -7 : 7), by, 1, 1, '#2a2a30');
      return true;
    }
    case 'mic':
      R(g, hx, hy - 4, 1, 4, '#3a3a42');
      R(g, hx - 1, hy - 6, 3, 2, '#8a8e96');
      note(beat ? 3 : 6, -12 - (k % 6));
      if (!beat) R(g, hx - 8, hy - 14, 1, 1, '#ffe066');
      return true;
    case 'phone':
      box(g, hx - 1, hy - 6, 4, 6, '#2a2a30', '#1a1a20');
      R(g, hx, hy - 5, 2, 3, '#8fd0f0');
      if (beat) R(g, hx + 4, hy - 8, 1, 1, '#ffffff');
      return true;
  }
  return false;
}

// ── Jobs follow abilities: each job leans on two traits; whoever is best at those does it ──────────────────────────

/** [main trait, second trait] per job; fit = main × 2 + second. */
const JOB_FIT = {
  hunter: ['health', 'luck'], gatherer: ['green', 'luck'], fisher: ['luck', 'green'], shaman: ['charm', 'luck'],
  farmer: ['green', 'health'], smith: ['health', 'green'], athlete: ['health', 'charm'], merchant: ['trade', 'charm'],
  knight: ['health', 'charm'], bard: ['charm', 'luck'], baker: ['green', 'trade'], monk: ['luck', 'charm'],
  miner: ['health', 'luck'], worker: ['green', 'health'], mail: ['health', 'trade'], police: ['health', 'charm'],
  office: ['trade', 'green'], nurse: ['charm', 'health'], soccer: ['health', 'luck'], star: ['charm', 'luck'],
  robotics: ['green', 'trade'], astronaut: ['health', 'luck'], gamer: ['luck', 'green'], creator: ['charm', 'trade'],
};
// Read when used: TRAITS lives in game.js, which loads after this file.
const traitName = (k) => Object.fromEntries(TRAITS)[k];

/** The job (of the open ones) that fits these traits best; `salt` breaks ties so neighbours differ. */
function bestJob(traits, salt = 0) {
  const pool = jobPool();
  let best = pool[0];
  let bestScore = -1;
  pool.forEach((j, i) => {
    const [a, b] = JOB_FIT[j.id];
    const score = traits[a] * 2 + traits[b] + (((i + salt) * 7) % 5) * 0.01;
    if (score > bestScore) [best, bestScore] = [j, score];
  });
  return best;
}
/** A neighbour's traits: fixed per family (the same every time you look). */
function villagerTraits(i) {
  const r = rng(i * 131 + 17 + (S.mapSeed ?? 0));
  return Object.fromEntries(TRAITS.map(([k]) => [k, 1 + Math.floor(r() * 5)]));
}

/** Your job: what your traits fit best now; a story when it changes. */
function updateMyJob(quiet = false) {
  if (!S.traits) return;
  const j = bestJob(S.traits);
  if (S.job === j.id) return;
  S.job = j.id;
  if (quiet) return;
  const [a] = JOB_FIT[j.id];
  story(`💼 ${traitName(a)}이(가) 좋아서 ${j.name}(이)가 됐어요. 직업 수입 +${pct(myPay(0.5))}.`);
}
const myJob = () => JOBS.find((j) => j.id === S.job) ?? null;
