// 작은 마을 — free time. When nothing needs doing, you pick something to do from a list that leans on your abilities
// and temperament (no two the same in a row): go home and rest (the view goes inside: a nap, a book, cooking,
// painting, music, games, knitting), fish, pick berries, sit on the square, walk the dog, play with the kids, pet
// the animals, chop wood, break stones, watch the sunset, see the museum. Neighbours read on a bench, fly kites,
// go jogging. Life mode only. Loaded before game.js: nothing here touches game.js at load time, only when called.
'use strict';

// ── Your free time ────────────────────────────────────────────────────────────────────────────────────────────────

const HOBBIES = [
  { id: 'nap', name: '낮잠', note: '푹 자고 일어났어요' },
  { id: 'read', name: '책 읽기', note: '책을 한 권 다 읽었어요' },
  { id: 'cook', name: '요리', note: '맛있는 냄새가 나요' },
  { id: 'paint', name: '그림 그리기', note: '그림이 한 장 완성됐어요' },
  { id: 'music', name: '악기 연주', note: '노래 한 곡을 연주했어요' },
  { id: 'game', name: '게임', note: '한 판 이겼어요', era: 4 },
  { id: 'knit', name: '뜨개질', note: '목도리가 조금 길어졌어요' },
];
let homeStay = null; // { hobby, t, n } while you're inside
let lastLeisure = '';

/** One free-time errand, picked with weights (your abilities and temperament), or null. */
function leisureTask() {
  if (MODE !== 'life' || !S.traits) return null;
  const t = (k) => trait(k);
  const tm = S.temper;
  const h = hour();
  const evening = h >= 17 && h < 19;
  const late = h >= 19 || h < 6;
  const penAnimals = S.chickens + S.cows + S.sheep + S.pigs + S.goats + S.horses;
  const pondSpot = () => (hasSea() && Math.random() < 0.35 ? [pierEnd(), ROAD_Y] : Math.random() < 0.4 ? [POND.x + rand(0, POND.w - 1), POND.y - 1] : [LAKE.x + rand(0, LAKE.w - 1), LAKE.y - 1]);
  const list = [
    { id: 'home', w: 3 + (100 - myHealth) / 20 + (tm === 'loner' ? 3 : 0) + (late ? 6 : 0), what: '집에 들어가 쉬기', to: HOME_DOOR, tool: 'heart', act: goInside },
    { id: 'fish', w: 2 + t('luck') * 0.6 + (tm === 'loner' ? 1 : 0), what: '낚시하러 가기', to: pondSpot(), tool: 'rod', act: () => {
      if (Math.random() > 0.3 + t('luck') * 0.08) return '오늘은 입질이 없네요';
      stock('fish', 1);
      if (Math.random() < 0.1) find(hasSea() && Math.random() < 0.5 ? 'sea' : 'fish');
      return '한 마리 낚았어요!';
    } },
    { id: 'forage', w: 2 + t('green') * 0.5, what: '숲에서 열매 따기', to: groveSpot(me), tool: 'pick', act: () => {
      stock('berries', 1 + (Math.random() < 0.4 ? 1 : 0));
      if (Math.random() < 0.08) find('forage');
      return '열매를 한 바구니 땄어요';
    } },
    { id: 'plaza', w: 2 + t('charm') * 0.4 + (tm === 'chatty' ? 2 : 0) + (tm === 'trader' ? 1 : 0), what: '광장에서 쉬기', to: [PLAZA.x + rand(0, 3), PLAZA.y + 1], tool: 'sit', act: () => {
      S.happy = Math.min(100, S.happy + 1);
      return '광장 구경은 언제나 재밌어요';
    } },
    S.dog && { id: 'dog', w: 2.5, what: `${dogBreed().name}이랑 산책`, to: [Math.max(0, Math.min(COLS - 1, HOME.x + rand(-12, 12))), ROAD_Y], tool: 'heart', act: () => {
      S.happy = Math.min(100, S.happy + 2);
      return '강아지가 신나서 꼬리를 흔들어요';
    } },
    S.kids > 0 && { id: 'kids', w: 3 + (tm === 'gentle' ? 1 : 0), what: '아이들이랑 놀기', to: [PLAZA.x + rand(-1, 4), ROAD_Y + 1], tool: 'dance', act: () => {
      S.happy = Math.min(100, S.happy + 3);
      return '아이들이 까르르 웃어요';
    } },
    penAnimals > 0 && { id: 'pet', w: 2, what: '동물 쓰다듬기', to: PEN_GATE, tool: 'heart', act: () => {
      S.happy = Math.min(100, S.happy + 1);
      return '동물들이 졸졸 따라와요';
    } },
    { id: 'chop', w: 1 + t('health') * 0.4 + (tm === 'hot' ? 2 : 0), what: '장작 패기', to: groveSpot(me), tool: 'axe', act: () => {
      stock('wood', 1);
      return '장작을 한 아름 팼어요';
    } },
    S.era >= 1 && { id: 'stone', w: 0.8 + t('health') * 0.3, what: '돌 캐기', to: [MINE.x + rand(1, MINE.w - 2), MINE.y + MINE.h], tool: 'pickaxe', act: () => {
      stock('stone', 1);
      if (Math.random() < 0.05) find('gem');
      return '쓸 만한 돌을 캤어요';
    } },
    evening && { id: 'sunset', w: 4 + (tm === 'romantic' ? 3 : 0), what: '노을 보러 가기', to: [LAKE.x + rand(0, LAKE.w - 1), LAKE.y - 1], tool: 'sit', act: () => {
      S.happy = Math.min(100, S.happy + 2);
      return '하늘이 참 예뻐요';
    } },
    hasMuseum() && { id: 'museum', w: 1.5, what: '박물관 구경', to: (() => { const m = S.decor.find((d) => d.k === 'museum'); return [m.x, m.y + 1]; })(), tool: 'sparkle', act: () => '유물이 늘었네요' },
  ].filter((x) => x && x.id !== lastLeisure);
  const total = list.reduce((a, x) => a + x.w, 0);
  let r = Math.random() * total;
  const pick = list.find((x) => (r -= x.w) < 0) ?? list[0];
  if (!pick) return null;
  return { to: pick.to, tool: pick.tool, what: pick.what, act: () => ((lastLeisure = pick.id), pick.act()), leisure: true };
}

/** Home: pick a pastime (your temperament leans), go in, and the view follows you inside. */
function goInside() {
  const open = HOBBIES.filter((h) => (h.era ?? 0) <= S.era);
  const lean = { loner: 'read', romantic: 'music', hot: 'game', gentle: 'knit', chatty: 'cook', trader: 'paint' }[S.temper];
  const want = myHealth < 40 ? 'nap' : lean && Math.random() < 0.4 && open.some((h) => h.id === lean) ? lean : open[Math.floor(Math.random() * open.length)].id;
  homeStay = { hobby: want, t: 96, n: 96 }; // 12 s
  me.hidden = true;
  return `${HOBBIES.find((h) => h.id === want).name} 시간이에요`;
}
/** Each tick while you're in: stay put; then out again, a little happier (and rested, after a nap). */
function homeTick() {
  if (!homeStay) return false;
  if (MODE !== 'life') return (homeStay = null), false;
  rest = Math.max(rest, 2);
  me.hidden = true;
  if (--homeStay.t > 0) return true;
  const h = HOBBIES.find((x) => x.id === homeStay.hobby);
  homeStay = null;
  me.hidden = false;
  S.happy = Math.min(100, S.happy + (h?.id === 'nap' ? 4 : 3));
  if (h && Math.random() < 0.2) story(`🏠 집에서 ${h.name}: ${h.note}.`);
  $('now').textContent = h?.note ?? '';
  return true;
}
/** Inside, and the view is following you (drag it and you see the town, your window lit). */
const insideView = () => MODE === 'life' && !!homeStay && !lifeCam;

// ── Inside your house, era by era ─────────────────────────────────────────────────────────────────────────────────

const ROOM = [
  { wall: '#b08a5e', wall2: '#9a7650', floor: '#7a5a3e', floor2: '#6a4c34', trim: '#5a3a26' }, // a hut: hides and poles
  { wall: '#e2b77e', wall2: '#cf9a62', floor: '#b88a5a', floor2: '#a8784a', trim: '#8a5a32' }, //  adobe
  { wall: '#efe2c4', wall2: '#6b4428', floor: '#a8743a', floor2: '#946430', trim: '#6b4428' }, //  timber and plaster
  { wall: '#e8d4b8', wall2: '#d8bfa0', floor: '#8a5a3a', floor2: '#7a4c30', trim: '#5a3a26' }, //  wallpaper
  { wall: '#eef0f2', wall2: '#dfe3e8', floor: '#c8a878', floor2: '#b8986a', trim: '#8a8e96' }, //  modern
  { wall: '#e4ecf4', wall2: '#cfdbe8', floor: '#cfd8e2', floor2: '#bcc7d3', trim: '#5ad7e8' }, //  future
];
/** The room, drawn at twice the town's pixel size (120 × 96 game pixels on the 240 × 192 view). */
function drawInterior(g) {
  const k = scale * 2;
  g.setTransform(k, 0, 0, k, 0, 0);
  g.imageSmoothingEnabled = false;
  const e = Math.max(0, Math.min(5, S.era));
  const c = ROOM[e];
  const t = clockTick();
  const FLOOR = 60;
  // Wall and floor.
  R(g, 0, 0, 120, FLOOR, c.wall);
  if (e === 0) for (let x = 6; x < 120; x += 18) R(g, x, 0, 3, FLOOR, c.wall2); // poles
  else if (e === 2) for (let x = 0; x < 120; x += 30) R(g, x, 0, 3, FLOOR, c.wall2); // timbers
  else if (e === 3) for (let x = 4; x < 120; x += 8) R(g, x, 0, 1, FLOOR, c.wall2); // stripes
  else if (e === 5) for (let x = 0; x < 120; x += 24) R(g, x, 0, 1, FLOOR, c.wall2);
  R(g, 0, FLOOR - 3, 120, 3, c.trim);
  R(g, 0, FLOOR, 120, 36, c.floor);
  for (let y = FLOOR + 4; y < 96; y += 6) R(g, 0, y, 120, 1, c.floor2);
  if (e >= 1) for (let y = FLOOR; y < 96; y += 6) for (let x = (y / 6) % 2 ? 0 : 12; x < 120; x += 24) R(g, x, y, 1, 6, c.floor2);
  // A rug.
  box(g, 30, 74, 60, 14, e === 5 ? '#9ab4ff' : '#c8503a', OL);
  R(g, 33, 77, 54, 8, e === 5 ? '#b8ccff' : '#e07a5a');
  // The window: the sky outside as it is now.
  const sky = night ? '#1c2448' : weather === 'rain' || weather === 'storm' ? '#8a9aa8' : '#8fd3f4';
  box(g, 44, 10, 26, 20, c.trim);
  R(g, 46, 12, 22, 16, sky);
  if (night) for (const [sx, sy] of [[49, 15], [60, 14], [55, 20], [64, 22]]) R(g, sx, sy, 1, 1, '#ffe9a8');
  else if (!raining()) disc(g, 63, 16, 2, '#ffd23f');
  R(g, 46, 24, 22, 4, '#6cbf4a');
  R(g, 56, 12, 1, 16, c.trim);
  R(g, 46, 19, 22, 1, c.trim);
  if (weather === 'rain' || weather === 'storm') for (let i = 0; i < 6; i++) R(g, 47 + ((i * 7 + t) % 20), 13 + ((i * 5 + t * 2) % 12), 1, 2, '#cfe8f5');
  // The bed, left.
  box(g, 4, 50, 30, 12, '#8a5a3a', OL);
  box(g, 5, 46, 10, 6, '#f4f4f8', OL);
  box(g, 14, 47, 19, 10, e === 0 ? '#a87a4a' : '#5a8ad0', OL);
  // A shelf with books.
  box(g, 80, 14, 30, 4, c.trim);
  for (let i = 0; i < 7; i++) R(g, 82 + i * 4, 6 + (i % 3), 3, 8 - (i % 3), ['#d8503a', '#3a7ad0', '#e8c050', '#5aa04a', '#8a6cc9'][i % 5]);
  // Warmth, by era: a fire pit, a hearth, a stove, a TV, a hologram.
  if (e === 0) {
    R(g, 96, 66, 16, 3, '#5a4a40');
    disc(g, 104, 63, 4, '#f08a2e');
    disc(g, 104 + ((t % 3) - 1), 61, 2, '#ffe066');
  } else if (e <= 2) {
    box(g, 90, 30, 26, 30, '#9a9aa4', OL);
    R(g, 95, 42, 16, 18, '#2a2028');
    disc(g, 103, 55, 4, '#f08a2e');
    disc(g, 103 + ((t % 3) - 1), 52, 2, '#ffe066');
  } else if (e === 3) {
    box(g, 94, 38, 18, 22, '#3a3a42', OL);
    R(g, 98, 46, 10, 6, t % 4 < 2 ? '#f08a2e' : '#e86a2a');
    R(g, 100, 24, 4, 14, '#3a3a42');
  } else if (e === 4) {
    box(g, 90, 32, 26, 18, '#2a2a33', OL);
    R(g, 92, 34, 22, 14, homeStay?.hobby === 'game' ? ['#5ad7e8', '#ff8ac0', '#ffd23f'][Math.floor(t / 4) % 3] : '#3a4a66');
    R(g, 100, 50, 6, 10, '#5a5e66');
  } else {
    for (let i = 0; i < 4; i++) R(g, 92 + i * 6, 30 + ((t + i * 3) % 8), 4, 1, '#5ad7e8');
    box(g, 96, 48, 14, 12, '#d7e3ee', '#3a4a66');
  }
  // A table and a chair, middle.
  box(g, 56, 52, 22, 4, c.trim);
  R(g, 58, 56, 2, 8, c.trim);
  R(g, 74, 56, 2, 8, c.trim);
  // Family about the house: your spouse at the table, the dog on the rug, the cat on the bed.
  if (S.spouse != null) person(g, { kind: 'spouse', x: 76, y: 66, dir: 'l', path: [], frame: 0, seed: 3, gender: FAMILIES[S.spouse].gender }, FAMILIES[S.spouse].look);
  if (S.dog) drawAnimal(g, { x: 44, y: 84, dir: 'r', path: [], frame: 0 }, DOG, dogBreed().pal, 12, 9, 10);
  if (S.cat) drawAnimal(g, { x: 26, y: 47, dir: 'l', path: [], frame: 0 }, CAT, { ...CAT_PAL, y: '#f4f1ea' }, 10, 7, 8);
  // You, at your pastime.
  drawHobby(g, homeStay?.hobby ?? 'read', t, e);
  // A label, top left.
  g.font = '5px sans-serif';
  g.fillStyle = 'rgba(25, 31, 40, 0.7)';
  g.fillRect(2, 2, 26, 8);
  g.fillStyle = '#ffffff';
  g.fillText('우리 집', 5, 8);
}
function drawHobby(g, hobby, t, e) {
  const look = OUTFIT[S.era];
  const you = (x, y, dir = 'd') => person(g, { kind: 'me', x, y, dir, path: [], frame: 0, seed: 1, gender: S.gender }, look);
  switch (hobby) {
    case 'nap': {
      // In bed: your head on the pillow, the blanket up to your chin, z's rising.
      R(g, 8, 44, 6, 5, S.style.hairColor ?? S.hair ?? look.hair);
      R(g, 9, 47, 4, 3, S.skin ?? SKIN);
      g.font = 'bold 5px sans-serif';
      g.fillStyle = '#5a6a8a';
      const z = t % 24;
      g.fillText('z', 16 + z / 6, 40 - z / 3);
      g.fillText('Z', 20 + ((z + 12) % 24) / 6, 38 - ((z + 12) % 24) / 3);
      return;
    }
    case 'read':
      you(52, 70, 'r');
      box(g, 56, 60, 5, 4, '#d8503a');
      R(g, 57, 61, 3, 2, '#f4efe6');
      return;
    case 'cook':
      you(86, 70, 'r');
      box(g, 92, 58, 8, 5, '#5a5e66');
      for (let i = 0; i < 3; i++) R(g, 94 + i * 2, 54 - ((t + i * 4) % 10), 1, 2, 'rgba(255,255,255,0.8)');
      return;
    case 'paint':
      R(g, 40, 50, 1, 20, '#8a5a3a');
      R(g, 48, 50, 1, 20, '#8a5a3a');
      box(g, 37, 44, 15, 12, '#ffffff', '#8a5a3a');
      for (let i = 0; i < 4; i++) R(g, 39 + i * 3, 46 + ((i * 3 + Math.floor(t / 8)) % 6), 2, 2, ['#ff7aa8', '#5ab4e0', '#ffd23f', '#5aa04a'][i]);
      you(58, 70, 'l');
      return;
    case 'music': {
      you(50, 70, 'r');
      const inst = ['#8a5a3a', '#c8a050', '#a8743a', '#c8843a', '#d8503a', '#5ad7e8'][e];
      box(g, 52, 60, 7, 5, inst);
      if (t % 8 < 4) {
        R(g, 60, 50, 2, 2, '#4a3a60');
        R(g, 61, 46, 1, 4, '#4a3a60');
      } else {
        R(g, 64, 48, 2, 2, '#4a3a60');
        R(g, 65, 44, 1, 4, '#4a3a60');
      }
      return;
    }
    case 'game':
      you(103, 74, 'u');
      box(g, 100, 66, 6, 3, '#2a2a33');
      return;
    case 'knit':
      you(52, 70, 'r');
      disc(g, 58, 66, 2, '#ff8ac0');
      R(g, 56, 62, 1, 4, '#c8c0b0');
      R(g, 60, 62, 1, 4, '#c8c0b0');
      return;
  }
}

// ── Neighbours' free time: a book on a bench, a kite, a jog ───────────────────────────────────────────────────────

function leisureOptions(e, add, night) {
  if (MODE !== 'life' || e.kind !== 'villager' || e.small || night) return;
  const t = npcTraits(e);
  add(14 + (t.charm <= 2 ? 10 : 0), 'read', [PLAZA.x + (Math.random() < 0.5 ? 0 : 3), PLAZA.y + 1], 'book', 90, () => (e.needs.energy = Math.min(100, e.needs.energy + 20)));
  if (S.era >= 1 && S.era <= 3 && weather === 'sun') add(16, 'kite', [Math.max(0, Math.min(COLS - 1, Math.round(e.x / T) + rand(-6, 6))), ROAD_Y + 2], 'kite', 110, () => (e.needs.social = Math.min(100, e.needs.social + 20)));
  if (S.era >= 3 && t.health >= 4) add(18, 'jog', [Math.max(0, Math.min(COLS - 1, Math.round(e.x / T) + rand(-20, 20))), ROAD_Y], null, 10, () => {}, () => {
    e.baseSpeed ??= e.speed;
    e.speed = 1.9; // back to their pace when the next thing begins (ai.js)
  });
}
/** The book and the kite (true when drawn). */
function drawLeisure(g, e) {
  const a = e.act;
  if (!a) return false;
  const x = Math.round(e.x);
  const y = Math.round(e.y);
  if (a.tool === 'book') {
    box(g, x + (e.dir === 'l' ? -6 : 2), y - 10, 5, 4, '#3a7ad0');
    R(g, x + (e.dir === 'l' ? -5 : 3), y - 9, 3, 2, '#f4efe6');
    return true;
  }
  if (a.tool === 'kite') {
    const kx = x + 18 + Math.round(Math.sin((a.n - a.t) / 6) * 4);
    const ky = y - 46 + Math.round(Math.cos((a.n - a.t) / 8) * 3);
    for (let i = 0; i < 8; i++) R(g, Math.round(x + 3 + ((kx - x - 3) * i) / 8), Math.round(y - 10 + ((ky - y + 10) * i) / 8), 1, 1, '#e8e0d0');
    spr(g, ['..o..', '.ooo.', 'ooooo', '.ooo.', '..o..'], { o: ['#ff5a7a', '#5ab4e0', '#ffd23f'][(e.seed ?? 0) % 3] }, kx - 2, ky - 2);
    for (let i = 0; i < 3; i++) R(g, kx + Math.round(Math.sin((a.n - a.t) / 4 + i)), ky + 3 + i * 2, 1, 1, '#e8505b');
    return true;
  }
  return false;
}
