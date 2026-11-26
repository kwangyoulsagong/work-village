// 작은 마을 — free time. When nothing needs doing, you pick something to do from a list that leans on your abilities
// and temperament (no two the same in a row): go home and rest (the view goes inside: a nap, a book, cooking,
// painting, music, games, knitting), fish, pick berries, sit on the square, walk the dog, play with the kids, pet
// the animals, chop wood, break stones, watch the sunset, see the museum. Neighbours read on a bench, fly kites,
// go jogging. Life mode only. Loaded before game.js: nothing here touches game.js at load time, only when called.
'use strict';

// ── Your free time ────────────────────────────────────────────────────────────────────────────────────────────────

/** Pastimes at home, each in the eras it belongs to ([from, to]); the instrument changes with the era. */
const HOBBIES = [
  { id: 'nap', name: '낮잠', note: '푹 자고 일어났어요', eras: [0, 5] },
  { id: 'cook', name: '요리', note: '맛있는 냄새가 나요', eras: [0, 5] },
  { id: 'wallpaint', name: '벽화 그리기', note: '벽에 사냥 그림이 하나 늘었어요', eras: [0, 0] },
  { id: 'carve', name: '돌 다듬기', note: '반들반들한 돌칼이 됐어요', eras: [0, 0] },
  { id: 'music', name: '악기 연주', note: '노래 한 곡을 연주했어요', eras: [0, 5] },
  { id: 'knit', name: '뜨개질', note: '목도리가 조금 길어졌어요', eras: [1, 4] },
  { id: 'read', name: '책 읽기', note: '책을 한 권 다 읽었어요', eras: [1, 5] },
  { id: 'letter', name: '편지 쓰기', note: '멀리 사는 친구에게 편지를 썼어요', eras: [2, 3] },
  { id: 'paint', name: '그림 그리기', note: '그림이 한 장 완성됐어요', eras: [2, 5] },
  { id: 'news', name: '신문 읽기', note: '세상 소식을 다 읽었어요', eras: [3, 4] },
  { id: 'radio', name: '라디오 듣기', note: '좋아하는 노래가 나왔어요', eras: [3, 3] },
  { id: 'tv', name: 'TV 보기', note: '드라마가 재밌어요', eras: [4, 4] },
  { id: 'game', name: '게임', note: '한 판 이겼어요', eras: [4, 5] },
  { id: 'vr', name: 'VR 게임', note: '가상 세계를 한 바퀴 돌았어요', eras: [5, 5] },
  { id: 'holo', name: '홀로그램 영화', note: '눈앞에서 영화가 펼쳐졌어요', eras: [5, 5] },
];
const INSTRUMENTS = ['북', '피리', '류트', '피아노', '기타', '신시사이저'];
const hobbyOpen = (h) => S.era >= h.eras[0] && S.era <= h.eras[1];
const hobbyName = (h) => (h.id === 'music' ? `${INSTRUMENTS[S.era]} 연주` : h.name);
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
  // The nearest water: the pond by the shop, the lake, or the pier (whichever is closest to you).
  const pondSpot = () => {
    const spots = [[POND.x + rand(0, POND.w - 1), POND.y - 1], [LAKE.x + rand(1, LAKE.w - 2), LAKE.y - 1], ...(hasSea() ? [[pierEnd(), ROAD_Y]] : [])];
    return spots.reduce((a, b) => (Math.abs(b[0] * T - me.x) < Math.abs(a[0] * T - me.x) ? b : a));
  };
  // Each: where, how long (ticks, 8 a second), which way you face, and what starts when you get there.
  const lakeSpot = () => {
    // Somewhere to watch the sky: the nearer of the lake and the pond.
    const spots = [[LAKE.x + rand(1, LAKE.w - 2), LAKE.y - 1], [POND.x + rand(0, POND.w - 1), POND.y - 1]];
    return spots.reduce((a, b) => (Math.abs(b[0] * T - me.x) < Math.abs(a[0] * T - me.x) ? b : a));
  };
  const fishAt = pondSpot();
  const list = [
    { id: 'home', w: 3 + (100 - myHealth) / 20 + (tm === 'loner' ? 3 : 0) + (late ? 6 : 0), what: '집에 들어가 쉬기', to: HOME_DOOR, tool: 'heart', dur: 6, dir: 'u', act: goInside },
    { id: 'fish', w: 2 + t('luck') * 0.6 + (tm === 'loner' ? 1 : 0), what: '낚시하러 가기', to: fishAt, tool: 'rod', dur: 90, dir: fishAt[1] === ROAD_Y ? (SEA.side === 'e' ? 'r' : 'l') : 'd', act: () => {
      if (Math.random() > 0.3 + t('luck') * 0.08 + fishBonus()) return '오늘은 입질이 없네요'; // the old tower helps (tales.js)
      stock('fish', 1);
      leaps.push({ x: me.x + (me.dir === 'l' ? -8 : 8), y: me.y + 2, sx: me.x, t: 0, big: Math.random() < 0.15 });
      if (Math.random() < 0.1) find(hasSea() && fishAt[1] === ROAD_Y ? 'sea' : 'fish');
      return '한 마리 낚았어요!';
    } },
    { id: 'forage', w: 2 + t('green') * 0.5, what: '숲에서 열매 따기', to: groveSpot(me), tool: 'pick', dur: 48, act: () => {
      stock('berries', 1 + (Math.random() < 0.4 ? 1 : 0) + forageBonus());
      if (Math.random() < 0.08) find('forage');
      return '열매를 한 바구니 땄어요';
    } },
    { id: 'plaza', w: 2 + t('charm') * 0.4 + (tm === 'chatty' ? 2 : 0) + (tm === 'trader' ? 1 : 0), what: '광장에서 쉬기', to: [PLAZA.x + rand(0, 3), PLAZA.y + 1], tool: 'sit', dur: 64, act: () => {
      S.happy = Math.min(100, S.happy + 1);
      return '광장 구경은 언제나 재밌어요';
    } },
    S.dog && { id: 'dog', w: 2.5, what: `${josa(dogBreed().name, '이랑', '랑')} 산책`, to: [Math.max(0, Math.min(COLS - 1, HOME.x + rand(-12, 12))), ROAD_Y], tool: 'heart', dur: 24, act: () => {
      S.happy = Math.min(100, S.happy + 2);
      return '강아지가 신나서 꼬리를 흔들어요';
    } },
    S.kids > 0 && { id: 'kids', w: 3 + (tm === 'gentle' ? 1 : 0), what: '아이들이랑 놀기', to: [PLAZA.x + rand(-1, 4), ROAD_Y + 1], tool: 'dance', dur: 64, arrive: () => {
      // The kids run over and play around you.
      const [mx, my] = tileOf(me);
      people.filter((p) => p.kind === 'kid' && !p.baby).forEach((k, i) => {
        k.act = null;
        k.busy = true;
        k.goal = { what: 'play', to: [mx, my], tool: 'dance', dur: 50, done: () => {} };
        route(k, nearestWalkable(mx + (i % 2 ? 1 : -1) * (1 + (i >> 1)), my));
      });
    }, act: () => {
      S.happy = Math.min(100, S.happy + 3);
      return '아이들이 까르르 웃어요';
    } },
    penAnimals > 0 && { id: 'pet', w: 2, what: '동물 쓰다듬기', to: [PEN_GATE[0], PEN.y - 1], tool: 'heart', dur: 56, dir: 'd', arrive: () => {
      // A few of the animals come over to the fence to be patted.
      animals.filter((a) => a.zone && a.zone.y === PEN.y && !a.mother).slice(0, 3).forEach((a, i) => {
        a.path = [[PEN_GATE[0] - 1 + i, PEN.y]];
        a.wait = 60;
      });
    }, act: () => {
      S.happy = Math.min(100, S.happy + 1);
      return '동물들이 졸졸 따라와요';
    } },
    { id: 'chop', w: 1 + t('health') * 0.4 + (tm === 'hot' ? 2 : 0), what: '장작 패기', to: groveSpot(me), tool: 'axe', dur: 48, act: () => {
      stock('wood', 1);
      return '장작을 한 아름 팼어요';
    } },
    S.era >= 1 && { id: 'stone', w: 0.8 + t('health') * 0.3, what: '돌 캐기', to: [MINE.x + rand(1, MINE.w - 2), MINE.y + MINE.h], tool: 'pickaxe', dur: 48, dir: 'u', act: () => {
      stock('stone', 1);
      if (Math.random() < 0.05) find('gem');
      return '쓸 만한 돌을 캤어요';
    } },
    evening && { id: 'sunset', w: 4 + (tm === 'romantic' ? 3 : 0), what: '노을 보러 가기', to: lakeSpot(), tool: 'sunset', dur: 96, dir: 'd', act: () => {
      S.happy = Math.min(100, S.happy + 2);
      return '하늘이 참 예뻐요';
    } },
    hasMuseum() && { id: 'museum', w: 1.5, what: '박물관 구경', to: (() => { const m = S.decor.find((d) => d.k === 'museum'); return [m.x, m.y + 1]; })(), tool: 'sparkle', dur: 40, dir: 'u', act: () => '유물이 늘었네요' },
  ]
    .filter((x) => x && x.id !== lastLeisure)
    // Far is less tempting: a place 30 tiles off counts half as much (nobody crosses the map to sit down).
    .map((x) => ({ ...x, w: x.w / (1 + Math.abs(x.to[0] * T - me.x) / (30 * T)) }));
  const total = list.reduce((a, x) => a + x.w, 0);
  let r = Math.random() * total;
  const pick = list.find((x) => (r -= x.w) < 0) ?? list[0];
  if (!pick) return null;
  return { to: pick.to, tool: pick.tool, what: pick.what, dur: pick.dur, dir: pick.dir, arrive: pick.arrive, act: () => ((lastLeisure = pick.id), pick.act()), leisure: true };
}

/** Home: a pastime (the one you chose, or one your temperament leans to), go in, and the view follows you inside. */
function goInside(chosen = null) {
  const open = HOBBIES.filter(hobbyOpen);
  const lean = { loner: 'read', romantic: 'music', hot: S.era >= 4 ? 'game' : 'carve', gentle: 'knit', chatty: S.era >= 4 ? 'tv' : 'cook', trader: 'news' }[S.temper];
  const want =
    chosen && open.some((h) => h.id === chosen) ? chosen
    : myHealth < 40 ? 'nap'
    : lean && Math.random() < 0.4 && open.some((h) => h.id === lean) ? lean
    : open[Math.floor(Math.random() * open.length)].id;
  homeStay = { hobby: want, t: 96, n: 96 }; // 12 s
  me.hidden = true;
  paintHome();
  return `${hobbyName(HOBBIES.find((h) => h.id === want))} 시간이에요`;
}

// ── Looking inside yourself, choosing what to do there, and furniture to buy ──────────────────────────────────────

let houseView = false; // 집 안 pressed: the room shows even while you're out
let wantHobby = null; //  a pastime you picked: you head home for it first
/** Furniture: one bed, table, seat, light and rug at a time (a new one replaces the old), cheap or dear by era;
 *  decorations, as many as you like. */
const FURNITURE = [
  { id: 'bed_hammock', cat: 'bed', name: '해먹', era: 1, cost: 20 },
  { id: 'bed_wood', cat: 'bed', name: '나무 침대', era: 1, cost: 40 },
  { id: 'bed_canopy', cat: 'bed', name: '캐노피 침대', era: 2, cost: 220 },
  { id: 'bed_iron', cat: 'bed', name: '철제 침대', era: 3, cost: 90 },
  { id: 'bed_queen', cat: 'bed', name: '퀸 침대', era: 4, cost: 260 },
  { id: 'bed_capsule', cat: 'bed', name: '수면 캡슐', era: 5, cost: 400 },
  { id: 'table_log', cat: 'table', name: '통나무 탁자', era: 0, cost: 15 },
  { id: 'table_wood', cat: 'table', name: '원목 식탁', era: 1, cost: 50 },
  { id: 'table_marble', cat: 'table', name: '대리석 식탁', era: 3, cost: 180 },
  { id: 'table_glass', cat: 'table', name: '유리 식탁', era: 4, cost: 120 },
  { id: 'table_float', cat: 'table', name: '떠 있는 식탁', era: 5, cost: 260 },
  { id: 'seat_stump', cat: 'seat', name: '그루터기 의자', era: 0, cost: 10 },
  { id: 'seat_bench', cat: 'seat', name: '나무 벤치', era: 1, cost: 30 },
  { id: 'seat_arm', cat: 'seat', name: '안락의자', era: 3, cost: 120 },
  { id: 'seat_sofa', cat: 'seat', name: '소파', era: 4, cost: 150 },
  { id: 'seat_massage', cat: 'seat', name: '안마의자', era: 4, cost: 320 },
  { id: 'seat_float', cat: 'seat', name: '공중 의자', era: 5, cost: 280 },
  { id: 'light_torch', cat: 'light', name: '횃불', era: 0, cost: 10 },
  { id: 'light_candle', cat: 'light', name: '촛대', era: 2, cost: 30 },
  { id: 'light_oil', cat: 'light', name: '석유등', era: 3, cost: 50 },
  { id: 'light_lamp', cat: 'light', name: '스탠드', era: 4, cost: 60 },
  { id: 'light_neon', cat: 'light', name: '네온등', era: 5, cost: 90 },
  { id: 'rug_fur', cat: 'rug', name: '털가죽 깔개', era: 0, cost: 20 },
  { id: 'rug_woven', cat: 'rug', name: '짠 깔개', era: 1, cost: 35 },
  { id: 'rug_persian', cat: 'rug', name: '페르시아 양탄자', era: 2, cost: 200 },
  { id: 'rug_modern', cat: 'rug', name: '모던 러그', era: 4, cost: 80 },
  { id: 'pot', cat: 'deco', name: '토기 항아리', era: 0, cost: 15 },
  { id: 'loom', cat: 'deco', name: '베틀', era: 1, cost: 60 },
  { id: 'plant', cat: 'deco', name: '화분', era: 1, cost: 25 },
  { id: 'tapestry', cat: 'deco', name: '태피스트리', era: 2, cost: 70 },
  { id: 'chest', cat: 'deco', name: '보물 상자', era: 2, cost: 60 },
  { id: 'gramophone', cat: 'deco', name: '축음기', era: 3, cost: 110 },
  { id: 'clock', cat: 'deco', name: '괘종시계', era: 3, cost: 90 },
  { id: 'aquarium', cat: 'deco', name: '어항', era: 4, cost: 120 },
  { id: 'robotvac', cat: 'deco', name: '로봇 청소기', era: 5, cost: 140 },
  { id: 'holoframe', cat: 'deco', name: '홀로그램 액자', era: 5, cost: 160 },
];
const CAT_NAMES = { bed: '침대', table: '식탁', seat: '의자', light: '조명', rug: '깔개', deco: '장식' };
const inUse = (cat) => S.furn?.[cat] ?? null;
const hasFurniture = (id) => {
  const f = FURNITURE.find((x) => x.id === id);
  return f?.cat === 'deco' ? (S.furniture ?? []).includes(id) : inUse(f?.cat) === id;
};
const ownsFurniture = (id) => (S.furnOwned ?? []).includes(id) || (S.furniture ?? []).includes(id);
/** Buy (or, if you have it already, put back) a piece; a bed, table, seat, light or rug replaces the one in use. */
function buyFurniture(id) {
  const f = FURNITURE.find((x) => x.id === id);
  if (!f || MODE !== 'life' || f.era > S.era || hasFurniture(id)) return false;
  const owned = ownsFurniture(id);
  if (!owned && S.coins < f.cost) return false;
  if (!owned) {
    S.coins -= f.cost;
    S.furnOwned = [...(S.furnOwned ?? []), id];
    S.happy = Math.min(100, S.happy + 3);
  }
  if (f.cat === 'deco') S.furniture = [...(S.furniture ?? []), id];
  else S.furn = { ...(S.furn ?? {}), [f.cat]: id };
  story(owned ? `🛋 ${josa(f.name, '으로', '로')} 바꿨어요.` : `🛋 집에 ${josa(f.name, '을', '를')} 들였어요.`);
  save();
  paintUi();
  return true;
}

// ── Arranging the room: drag a piece; green where it fits, red where it doesn't ─────────────────────────────────────

/** Where each piece stands by default (room pixels, 120 × 96, the floor from y 60) and what it stands on. */
const SPOT = {
  bed: [3, 40, 34, 22, 'floor'], bed_canopy: [3, 28, 32, 34, 'floor'],
  table: [55, 48, 24, 16, 'floor'],
  seat: [42, 48, 13, 16, 'floor'], seat_sofa: [58, 79, 28, 11, 'floor'],
  light: [72, 12, 8, 14, 'stand'], // on the wall or on the floor (a lamp stands anywhere)
  rug: [30, 73, 60, 16, 'rug'], rug_fur: [42, 72, 36, 16, 'rug'], rug_persian: [28, 73, 64, 16, 'rug'],
  pot: [100, 82, 6, 8, 'floor'], loom: [36, 38, 9, 22, 'floor'], plant: [80, 45, 8, 15, 'floor'], chest: [8, 80, 14, 9, 'floor'],
  gramophone: [59, 37, 12, 14, 'any'], // it may stand on the table
  tapestry: [8, 12, 16, 22, 'wall'], clock: [80, 26, 7, 26, 'wall'], aquarium: [68, 43, 10, 8, 'wall'], holoframe: [26, 14, 14, 12, 'wall'],
};
/** What every house has, bought or not: the era's plain bed, table and rug, the hearth (fire, stove, TV…), the shelf. */
const BUILT = {
  bed: { names: ['짚 침대', '침대'], spot: (e) => (e === 0 ? [6, 50, 26, 12, 'floor'] : SPOT.bed) },
  table: { names: ['돌 식탁', '식탁'], spot: (e) => (e === 0 ? [58, 56, 18, 7, 'floor'] : SPOT.table) },
  rug: { names: ['가죽 깔개', '깔개'], spot: (e) => (e === 0 ? SPOT.rug_fur : SPOT.rug) },
  hearth: {
    names: ['모닥불', '벽난로', '벽난로', '난로', 'TV', '홀로그램 난로'],
    spot: (e) => [...[[96, 59, 16, 10], [90, 30, 26, 30], [90, 30, 26, 30], [94, 24, 18, 36], [90, 32, 26, 28], [92, 30, 24, 30]][e], 'floor', 'tall'],
  },
  shelf: { names: ['약초 걸이', '항아리 선반', '책장'], spot: (e) => (e === 0 ? [82, 12, 28, 17, 'wall'] : [80, 6, 30, 12, 'wall']) },
};
const FLOOR_Y = 60;
const WINDOW = [44, 9, 26, 21]; // a hole in the wall: nothing hangs over it
const era5 = () => Math.max(0, Math.min(5, S.era));
const offsetOf = (id) => S.furnPos?.[id] ?? [0, 0];
/** The key a category's piece moves by: the one you bought, or the house's own. */
const pieceKey = (cat) => inUse(cat) ?? cat;
/** Everything in the room you can move (the robot vacuum goes where it likes; the window is part of the wall). */
function movable() {
  const e = era5();
  const ids = [pieceKey('rug'), pieceKey('bed'), pieceKey('table'), inUse('seat'), inUse('light'), 'hearth', 'shelf', ...(S.furniture ?? [])];
  return ids.filter((id) => id && id !== 'robotvac').map((id) => {
    const built = BUILT[id];
    const f = built ? null : FURNITURE.find((x) => x.id === id);
    const [x, y, w, h, on, tall] = built ? built.spot(e) : SPOT[id] ?? SPOT[f.cat];
    const [dx, dy] = offsetOf(id);
    const name = built ? built.names[Math.min(e, built.names.length - 1)] : f.name;
    return { id, name, on, tall: !!tall, x: x + dx, y: y + dy, w, h, dx, dy };
  });
}
const overlaps = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
/** Two pieces in each other's way: on the same layer, or something hung on the wall behind a tall one (the hearth). */
const clash = (p, q) => q.on === p.on || q.on === 'stand' || (q.tall && p.on === 'wall') || (p.tall && q.on === 'wall');
/** Why a piece can't stay where it is ('' when it can): the room's edge, its zone, the window, another piece. */
function why(p, all) {
  if (p.on === 'stand') {
    const asWall = why({ ...p, on: 'wall' }, all);
    const asFloor = why({ ...p, on: 'floor' }, all);
    return !asWall || !asFloor ? '' : p.y + p.h > FLOOR_Y - 3 ? asFloor : asWall;
  }
  if (p.x < 0 || p.x + p.w > 120 || p.y < 0 || p.y + p.h > 96) return '방 밖으로 나가요';
  const bottom = p.y + p.h;
  if (p.on === 'wall' && bottom > FLOOR_Y - 3) return '벽에만 걸 수 있어요';
  if (p.on === 'floor' && bottom < FLOOR_Y - 2) return '바닥에 놓아야 해요';
  if (p.on === 'rug' && p.y < FLOOR_Y) return '깔개는 바닥에만 깔 수 있어요';
  if (p.on === 'rug' || p.on === 'any') return '';
  if ((p.on === 'wall' || p.tall) && overlaps(p, { x: WINDOW[0], y: WINDOW[1], w: WINDOW[2], h: WINDOW[3] })) return '창문을 가려요';
  const q = all.find((q) => q.id !== p.id && clash(p, q) && overlaps(p, q));
  return q ? `${josa(q.name, '과', '와')} 겹쳐요` : '';
}
/** Where a piece of this layer may go at all: the faint green range shown while you drag. */
function zoneOf(on) {
  return on === 'wall' ? [0, 0, 120, FLOOR_Y - 3] : on === 'any' || on === 'stand' ? [0, 0, 120, 96] : [0, on === 'rug' ? FLOOR_Y : FLOOR_Y - 26, 120, on === 'rug' ? 36 : 62];
}
let arranging = false;
let drag = null; // { id, grab: [x, y], from: [dx, dy], at: [dx, dy] }
/** Draw something moved by its piece's offset (a piece being dragged: where it is now). */
function shifted(g, id, draw) {
  const [dx, dy] = drag?.id === id ? drag.at : id ? offsetOf(id) : [0, 0];
  if (!dx && !dy) return draw();
  g.save();
  g.translate(dx, dy);
  draw();
  g.restore();
}
/** Over the room while arranging: every piece outlined; the one in your hand green or red, and its range. */
function drawArrange(g) {
  const all = movable();
  for (const p of all) {
    if (drag?.id === p.id) continue;
    g.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    g.lineWidth = 0.5;
    g.setLineDash([1.5, 1]);
    g.strokeRect(p.x + 0.25, p.y + 0.25, p.w - 0.5, p.h - 0.5);
  }
  g.setLineDash([]);
  if (!drag) return;
  const base = all.find((p) => p.id === drag.id);
  const [x, y, w, h, on] = [base.x - base.dx + drag.at[0], base.y - base.dy + drag.at[1], base.w, base.h, base.on];
  const z = zoneOf(on);
  g.fillStyle = 'rgba(80, 200, 120, 0.16)';
  g.fillRect(z[0], z[1], z[2], z[3]);
  g.strokeStyle = 'rgba(47, 184, 106, 0.9)';
  g.lineWidth = 0.5;
  g.setLineDash([2, 1.5]);
  g.strokeRect(z[0] + 0.5, z[1] + 0.5, z[2] - 1, z[3] - 1);
  g.setLineDash([]);
  const ok = !why({ ...base, x, y }, all);
  g.fillStyle = ok ? 'rgba(60, 200, 110, 0.35)' : 'rgba(240, 70, 70, 0.4)';
  g.fillRect(x, y, w, h);
  g.strokeStyle = ok ? '#2fb86a' : '#e84a4a';
  g.lineWidth = 1;
  g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}
/** The piece in your hand where it is now, and why it can't stay there ('' when it can). */
function dragCheck() {
  const all = movable();
  const base = all.find((p) => p.id === drag.id);
  const piece = { ...base, x: base.x - base.dx + drag.at[0], y: base.y - base.dy + drag.at[1] };
  return { piece, reason: why(piece, all) };
}
const ARRANGE_HELP = '집 안의 가구를 끌어서 옮겨요. 초록이면 놓을 수 있고, 빨강이면 못 놓아요.';
/** The line under 내 가구 while arranging: the help, or what the piece in your hand is doing. */
function arrangeSay(text = ARRANGE_HELP, ok = null) {
  const note = document.getElementById('arrangeNote');
  if (!note) return;
  note.textContent = text;
  note.style.color = ok === true ? '#2fb86a' : ok === false ? '#e84a4a' : '';
}
/** A point on the canvas, in room pixels. */
function roomAt(ev) {
  const r = canvas.getBoundingClientRect();
  const k = scale * 2;
  return [((ev.clientX - r.left) / r.width) * (canvas.width / k), ((ev.clientY - r.top) / r.height) * (canvas.height / k)];
}
function wireArrange() {
  const btn = document.getElementById('arrangeBtn');
  btn?.addEventListener('click', () => {
    arranging = !arranging && insideView();
    if (arranging) houseView = true; // the room stays while you arrange, even when your pastime is over
    drag = null;
    arrangeSay();
    paintHome();
    frame();
  });
  // Before the camera's own drag: while arranging, a press on the room picks a piece up instead.
  canvas.addEventListener('pointerdown', (ev) => {
    if (!arranging || !insideView()) return;
    ev.stopImmediatePropagation();
    ev.preventDefault();
    const [x, y] = roomAt(ev);
    const order = { wall: 0, any: 0, stand: 0, floor: 1, rug: 2 }; // what's in front is picked first
    const hit = movable()
      .filter((p) => x >= p.x - 1 && x <= p.x + p.w + 1 && y >= p.y - 1 && y <= p.y + p.h + 1)
      .sort((a, b) => order[a.on] - order[b.on] || a.w * a.h - b.w * b.h)[0];
    if (!hit) return;
    drag = { id: hit.id, grab: [x, y], from: [hit.dx, hit.dy], at: [hit.dx, hit.dy] };
    try {
      canvas.setPointerCapture(ev.pointerId); // keep the piece while the pointer leaves the picture
    } catch {
      /* a pointer that isn't down any more */
    }
    frame();
  }, { capture: true });
  canvas.addEventListener('pointermove', (ev) => {
    if (!drag) return;
    const [x, y] = roomAt(ev);
    drag.at = [drag.from[0] + Math.round(x - drag.grab[0]), drag.from[1] + Math.round(y - drag.grab[1])];
    const { piece, reason } = dragCheck();
    arrangeSay(reason ? `${piece.name}: ${reason}` : `${piece.name}: 여기에 놓을 수 있어요`, !reason);
    frame();
  });
  const drop = () => {
    if (!drag) return;
    const { piece, reason } = dragCheck();
    const moved = drag.at[0] !== drag.from[0] || drag.at[1] !== drag.from[1];
    if (!reason) {
      S.furnPos = { ...(S.furnPos ?? {}), [drag.id]: drag.at };
      save();
    } else if (moved) toast(`${josa(piece.name, '을', '를')} 못 놓아요. ${reason}`, 2400);
    drag = null;
    arrangeSay();
    frame();
  };
  canvas.addEventListener('pointerup', drop);
  canvas.addEventListener('pointercancel', drop);
  canvas.addEventListener('click', (ev) => arranging && insideView() && ev.stopImmediatePropagation(), { capture: true });
}
/** Your errand when you picked a pastime (game.js nextTask asks first). */
function hobbyTask() {
  if (!wantHobby || MODE !== 'life') return null;
  const h = HOBBIES.find((x) => x.id === wantHobby);
  return { to: HOME_DOOR, tool: 'heart', what: `집에서 ${h ? hobbyName(h) : '쉬기'}`, dur: 6, dir: 'u', act: () => {
    const id = wantHobby;
    wantHobby = null;
    return goInside(id);
  } };
}
function requestHobby(id) {
  if (MODE !== 'life' || !S.gender || S.over) return;
  wantFamily = null; // family.js
  wantCall = null; // guest.js
  if (homeStay) {
    // Already in: switch to it now.
    homeStay = { hobby: id, t: 96, n: 96 };
    paintHome();
    return;
  }
  wantHobby = id;
  task = null; // drop whatever you were on the way to
  me.path = [];
  me.act = null;
  rest = 0;
  houseView = true;
  lifeCam = null;
  paintCamMe();
  paintHome();
}
/** The bed (left), the table and seat (middle), the light, the rug: what's in use, or the era's plain one. */
function drawBed(g, e) {
  const id = inUse('bed');
  const trim = ROOM[e].trim;
  switch (id) {
    case 'bed_hammock':
      for (let x = 6; x < 32; x++) R(g, x, 48 + Math.round(Math.sin(((x - 6) / 26) * Math.PI) * 5), 1, 2, '#c8a060');
      R(g, 5, 40, 1, 22, trim);
      R(g, 32, 40, 1, 22, trim);
      return;
    case 'bed_canopy':
      R(g, 4, 30, 2, 32, '#6b4428');
      R(g, 32, 30, 2, 32, '#6b4428');
      box(g, 3, 28, 32, 4, '#8a2a3a');
      R(g, 6, 32, 3, 14, '#a83a4a');
      R(g, 29, 32, 3, 14, '#a83a4a');
      box(g, 4, 50, 30, 12, '#6b4428', OL);
      box(g, 5, 46, 10, 6, '#fff6e0', OL);
      box(g, 14, 47, 19, 10, '#c8503a', OL);
      R(g, 14, 50, 19, 1, '#e8c050');
      return;
    case 'bed_iron':
      R(g, 4, 42, 1, 20, '#3a3a42');
      R(g, 33, 46, 1, 16, '#3a3a42');
      for (let x = 4; x < 12; x += 3) R(g, x, 42, 1, 8, '#3a3a42');
      box(g, 4, 52, 30, 8, '#f4f4f8', OL);
      box(g, 14, 49, 19, 8, '#5a6a8a', OL);
      return;
    case 'bed_queen':
      box(g, 2, 40, 6, 22, '#8a6a4a', OL);
      box(g, 2, 50, 36, 12, '#f4f4f8', OL);
      box(g, 8, 46, 10, 5, '#ffffff', OL);
      box(g, 18, 47, 19, 10, '#e8b0c0', OL);
      return;
    case 'bed_capsule':
      box(g, 3, 40, 34, 22, '#d7e3ee', '#3a4a66');
      R(g, 6, 44, 28, 8, '#9fd6f0');
      R(g, 6, 58, 28, 1, '#5ad7e8');
      return;
    case 'bed_wood':
      box(g, 4, 50, 30, 12, '#a8743a', OL);
      box(g, 5, 46, 10, 6, '#f4f4f8', OL);
      box(g, 14, 47, 19, 10, '#5a8ad0', OL);
      return;
  }
  if (e === 0) {
    // A pile of straw with a hide over it.
    R(g, 6, 54, 26, 8, '#d4ad5b');
    R(g, 8, 51, 22, 3, '#d4ad5b');
    for (let x = 7; x < 31; x += 3) R(g, x, 52 + (x % 2), 1, 9, '#b8943e');
    box(g, 12, 50, 16, 5, '#8a5a32', OL);
    return;
  }
  box(g, 4, 50, 30, 12, '#8a5a3a', OL);
  box(g, 5, 46, 10, 6, '#f4f4f8', OL);
  box(g, 14, 47, 19, 10, '#5a8ad0', OL);
}
function drawTable(g, e) {
  const id = inUse('table');
  const trim = ROOM[e].trim;
  switch (id) {
    case 'table_log':
      box(g, 58, 54, 18, 8, '#8a5a32', OL);
      disc(g, 67, 54, 2, '#c89a5a');
      return;
    case 'table_marble':
      box(g, 55, 51, 24, 4, '#f0eee8', '#9a9aa4');
      R(g, 58, 55, 3, 9, '#d8d4cc');
      R(g, 73, 55, 3, 9, '#d8d4cc');
      return;
    case 'table_glass':
      R(g, 55, 52, 24, 2, 'rgba(160, 220, 240, 0.8)');
      R(g, 57, 54, 1, 10, '#8a8e96');
      R(g, 76, 54, 1, 10, '#8a8e96');
      return;
    case 'table_float':
      box(g, 55, 48 + (Math.floor(clockTick() / 8) % 2), 24, 3, '#e4ecf4', '#3a4a66');
      R(g, 57, 60, 20, 1, 'rgba(90, 215, 232, 0.6)');
      return;
    case 'table_wood':
      box(g, 55, 51, 24, 4, '#a8743a', OL);
      R(g, 57, 55, 2, 9, '#8a5a32');
      R(g, 75, 55, 2, 9, '#8a5a32');
      return;
  }
  if (e === 0) {
    // A flat stone to eat at.
    box(g, 58, 56, 18, 7, '#9a9aa4', OL);
    R(g, 60, 57, 12, 1, '#b8bcc4');
    return;
  }
  box(g, 56, 52, 22, 4, trim);
  R(g, 58, 56, 2, 8, trim);
  R(g, 74, 56, 2, 8, trim);
}
function drawSeat(g) {
  switch (inUse('seat')) {
    case 'seat_stump': box(g, 47, 58, 7, 6, '#8a5a32', OL); disc(g, 50, 58, 2, '#c89a5a'); return;
    case 'seat_bench': box(g, 44, 58, 11, 2, '#a8743a', OL); R(g, 45, 60, 1, 4, '#8a5a32'); R(g, 53, 60, 1, 4, '#8a5a32'); return;
    case 'seat_arm': box(g, 44, 52, 11, 12, '#8a3a4a', OL); R(g, 46, 58, 7, 4, '#a84a5a'); return;
    case 'seat_sofa': box(g, 58, 82, 28, 8, '#3a7ad0', OL); R(g, 58, 79, 28, 4, '#2a5aa8'); return;
    case 'seat_massage': box(g, 42, 48, 13, 16, '#2a2a33', OL); R(g, 44, 52, 9, 6, '#5a5e66'); R(g, 46, 50, 5, 1, (clockTick() % 4 < 2) ? '#5ad7e8' : '#2a2a33'); return;
    case 'seat_float': box(g, 46, 54 + (Math.floor(clockTick() / 6) % 2), 9, 5, '#e4ecf4', '#3a4a66'); R(g, 47, 63, 7, 1, 'rgba(90, 215, 232, 0.6)'); return;
  }
}
function drawLight(g) {
  const t = clockTick();
  switch (inUse('light')) {
    case 'light_torch': R(g, 76, 18, 1, 8, '#6b4428'); disc(g, 76, 16, 2, t % 3 ? '#f08a2e' : '#ffd23f'); return;
    case 'light_candle': R(g, 75, 20, 3, 6, '#c8a050'); R(g, 76, 16, 1, 4, '#f4efe6'); R(g, 76, 14, 1, 2, '#ffd23f'); return;
    case 'light_oil': box(g, 74, 16, 5, 7, '#8a8e96', OL); R(g, 75, 18, 3, 3, '#ffe08a'); return;
    case 'light_lamp': R(g, 76, 16, 1, 10, '#5a5e66'); box(g, 73, 12, 7, 4, '#f4efe6', OL); return;
    case 'light_neon': R(g, 72, 14, 8, 1, ['#ff5a9a', '#5ad7e8', '#9a7aff'][Math.floor(t / 6) % 3]); R(g, 72, 22, 8, 1, ['#5ad7e8', '#9a7aff', '#ff5a9a'][Math.floor(t / 6) % 3]); return;
  }
}
function drawRug(g, e) {
  switch (inUse('rug')) {
    case 'rug_fur': disc(g, 60, 81, 9, '#8a5a32'); R(g, 42, 76, 36, 10, '#a8743a'); for (let x = 44; x < 76; x += 4) R(g, x, 78 + (x % 8 ? 0 : 3), 2, 1, '#c89a5a'); return;
    case 'rug_woven': box(g, 30, 74, 60, 14, '#c8a050', OL); for (let x = 33; x < 87; x += 6) R(g, x, 76, 3, 10, '#a8743a'); return;
    case 'rug_persian': box(g, 28, 73, 64, 16, '#8a2a3a', OL); box(g, 32, 76, 56, 10, '#c8503a', '#e8c050'); disc(g, 60, 81, 3, '#3a5aa8'); return;
    case 'rug_modern': box(g, 30, 74, 60, 14, '#d8dde4', OL); R(g, 33, 80, 54, 2, '#8a9aa8'); return;
  }
  if (e === 0) {
    // A hide on the dirt floor.
    disc(g, 60, 81, 8, '#a8743a');
    R(g, 44, 77, 32, 9, '#a8743a');
    R(g, 42, 79, 2, 4, '#a8743a');
    R(g, 76, 79, 2, 4, '#a8743a');
    return;
  }
  box(g, 30, 74, 60, 14, e === 5 ? '#9ab4ff' : '#c8503a', OL);
  R(g, 33, 77, 54, 8, e === 5 ? '#b8ccff' : '#e07a5a');
}
/** Decorations you bought, as many as you like, each where you put it. */
const DECO_ART = {
  pot(g, t) {
    box(g, 100, 82, 6, 8, '#b8643a', OL);
    R(g, 101, 84, 4, 1, '#e8a060');
  },
  loom(g, t) {
    R(g, 36, 38, 1, 22, '#8a5a3a');
    R(g, 44, 38, 1, 22, '#8a5a3a');
    R(g, 36, 38, 9, 2, '#8a5a3a');
    for (let x = 38; x < 44; x += 2) R(g, x, 41, 1, 12, x % 4 ? '#e8c050' : '#d8503a');
  },
  plant(g, t) {
    box(g, 81, 54, 6, 6, '#b8643a', OL);
    disc(g, 84, 49, 4, '#4fa43e');
    disc(g, 82, 46, 2, '#6cc85a');
  },
  tapestry(g, t) {
    box(g, 8, 12, 16, 22, '#8a2a3a', OL);
    R(g, 10, 15, 12, 2, '#e8c050');
    R(g, 13, 20, 6, 6, '#e8c050');
    R(g, 10, 29, 12, 2, '#e8c050');
  },
  chest(g, t) {
    box(g, 8, 80, 14, 9, '#8a5a32', OL);
    R(g, 8, 83, 14, 1, '#e8c050');
    R(g, 14, 84, 2, 2, '#e8c050');
  },
  gramophone(g, t) {
    box(g, 60, 46, 7, 5, '#6b4428', OL);
    R(g, 63, 41, 1, 5, '#c8a050');
    disc(g, 66, 40, 3, '#e8c050');
    if (t % 8 < 4) R(g, 69, 36, 2, 2, '#4a3a60');
  },
  clock(g, t) {
    box(g, 80, 26, 7, 26, '#6b4428', OL);
    disc(g, 83, 31, 2, '#f4efe6');
    R(g, 83, 39 + (Math.floor(t / 4) % 2 ? 1 : -1), 1, 8, '#e8c050');
  },
  aquarium(g, t) {
    box(g, 68, 43, 10, 8, '#8fd0f0', OL);
    R(g, 69 + (Math.floor(t / 3) % 6), 46, 2, 1, '#f08a3a');
    R(g, 69, 50, 8, 1, '#c8b070');
  },
  robotvac(g, t) {
    const x = 34 + Math.round((Math.sin(t / 20) + 1) * 26);
    disc(g, x, 90, 4, '#d7e3ee');
    R(g, x - 1, 88, 2, 1, '#5ad7e8');
  },
  holoframe(g, t) {
    box(g, 26, 14, 14, 12, '#3a4a66', OL);
    R(g, 28, 16, 10, 8, ['#5ad7e8', '#9a7aff', '#5ee0b0'][Math.floor(t / 8) % 3]);
  },
};
function drawFurniture(g, t) {
  for (const id of S.furniture ?? []) if (DECO_ART[id]) shifted(g, id, () => DECO_ART[id](g, t));
}
/** The home card under the town and the 집 안 button: shown while you look inside. */
function paintHome() {
  const btn = document.getElementById('homeView');
  const card = document.getElementById('homeCard');
  if (!btn || !card) return;
  const inside = insideView();
  btn.setAttribute('aria-pressed', String(inside));
  btn.textContent = inside ? '밖으로' : '집 안';
  card.hidden = !inside;
  if (!inside) return;
  const hobbies = HOBBIES.filter(hobbyOpen);
  const hp = document.getElementById('hobbyPick');
  const hsig = S.era + hobbies.map((h) => h.id).join();
  if (hp.dataset.sig !== hsig) {
    hp.dataset.sig = hsig;
    hp.replaceChildren(...hobbies.map((h) => Object.assign(document.createElement('option'), { value: h.id, textContent: hobbyName(h) })));
  }
  const fp = document.getElementById('furniturePick');
  const open = FURNITURE.filter((f) => f.era <= S.era);
  const fsig = open.map((f) => `${f.id}${hasFurniture(f.id) ? 'u' : ownsFurniture(f.id) ? 'o' : ''}`).join();
  if (fp.dataset.sig !== fsig) {
    fp.dataset.sig = fsig;
    const keep = fp.value;
    fp.replaceChildren(
      ...Object.keys(CAT_NAMES).map((cat) => {
        const group = Object.assign(document.createElement('optgroup'), { label: CAT_NAMES[cat] });
        group.append(
          ...open.filter((f) => f.cat === cat).map((f) => Object.assign(document.createElement('option'), {
            value: f.id,
            textContent: `${f.name} · ${hasFurniture(f.id) ? '쓰는 중' : ownsFurniture(f.id) ? '갖고 있어요' : `${fmt(f.cost)}코인`}`,
          })),
        );
        return group;
      }).filter((g) => g.children.length),
    );
    if (keep && [...fp.options].some((o) => o.value === keep)) fp.value = keep;
  }
  const pick = FURNITURE.find((f) => f.id === fp.value);
  const btnBuy = document.getElementById('furnitureBuy');
  btnBuy.disabled = !pick || hasFurniture(pick.id) || (!ownsFurniture(pick.id) && S.coins < pick.cost);
  btnBuy.textContent = pick && ownsFurniture(pick.id) && !hasFurniture(pick.id) ? '놓기' : '사기';
  const owned = (S.furnOwned ?? []).length + (S.furniture ?? []).filter((id) => !(S.furnOwned ?? []).includes(id)).length;
  document.getElementById('homeNote').textContent = homeStay?.fam
    ? `가구 ${owned}개`
    : homeStay
    ? `${hobbyName(HOBBIES.find((h) => h.id === homeStay.hobby) ?? HOBBIES[0])} 하는 중이에요 · 가구 ${owned}개`
    : wantHobby
      ? '집으로 가는 중이에요'
      : `지금은 밖에 있어요. 할 일을 고르면 집으로 와요 · 가구 ${owned}개`;
  paintFamilyRow(); // family.js
  paintMine();
}
/** 내 가구: everything you've bought, in the room or put away (tap one that's put away to bring it back). */
function paintMine() {
  const list = document.getElementById('furnMine');
  if (!list) return;
  const mine = FURNITURE.filter((f) => ownsFurniture(f.id));
  const sig = mine.map((f) => f.id + (hasFurniture(f.id) ? 'u' : '')).join() + arranging;
  if (list.dataset.sig !== sig) {
    list.dataset.sig = sig;
    list.replaceChildren(
      ...(mine.length
        ? mine.map((f) => {
            const using = hasFurniture(f.id);
            const b = Object.assign(document.createElement('button'), { className: 'btn', textContent: using ? f.name : `${f.name} · 넣어 둠` });
            b.setAttribute('aria-pressed', String(using));
            b.title = using ? '집에 놓여 있어요' : '누르면 다시 놓아요';
            b.addEventListener('click', () => {
              if (!using && buyFurniture(f.id)) toast(`${josa(f.name, '을', '를')} 다시 놓았어요`);
            });
            return b;
          })
        : [Object.assign(document.createElement('span'), { className: 'hint', textContent: '아직 산 가구가 없어요' })]),
    );
  }
  if (!insideView()) arranging = false;
  const btn = document.getElementById('arrangeBtn');
  btn.textContent = arranging ? '다 했어요' : '배치 바꾸기';
  btn.setAttribute('aria-pressed', String(arranging));
  document.getElementById('arrangeNote').hidden = !arranging;
}
function wireHome() {
  wireArrange();
  document.getElementById('homeView')?.addEventListener('click', () => {
    leaveGuest(); // from a neighbour's straight home (guest.js)
    if (insideView()) {
      houseView = false;
      if (homeStay) homeStay.t = 1; // out you come
    } else {
      houseView = true;
      lifeCam = null;
      paintCamMe();
    }
    paintHome();
    frame();
  });
  document.getElementById('hobbyGo')?.addEventListener('click', () => requestHobby(document.getElementById('hobbyPick').value));
  document.getElementById('furniturePick')?.addEventListener('change', () => paintHome());
  document.getElementById('furnitureBuy')?.addEventListener('click', () => {
    if (buyFurniture(document.getElementById('furniturePick').value)) toast('가구를 들였어요');
    paintHome();
  });
}
/** Each tick while you're in: stay put; then out again, a little happier (and rested, after a nap). */
function homeTick() {
  if (!homeStay) return false;
  if (MODE !== 'life') return (homeStay = null), false;
  rest = Math.max(rest, 2);
  me.hidden = true;
  if (--homeStay.t > 0) return true;
  if (homeStay.fam) {
    // Time together (family.js) is over.
    const id = homeStay.fam;
    homeStay = null;
    me.hidden = false;
    $('now').textContent = familyDone(id);
    paintHome();
    return true;
  }
  const h = HOBBIES.find((x) => x.id === homeStay.hobby);
  homeStay = null;
  me.hidden = false;
  paintHome();
  S.happy = Math.min(100, S.happy + (h?.id === 'nap' ? 4 : 3));
  if (h && Math.random() < 0.2) story(`🏠 집에서 ${hobbyName(h)}: ${h.note}.`);
  $('now').textContent = h?.note ?? '';
  return true;
}
/** Inside, and the view is following you (drag it and you see the town, your window lit). */
const insideView = () => MODE === 'life' && !lifeCam && (!!homeStay || houseView);

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
  shifted(g, pieceKey('rug'), () => drawRug(g, e));
  // The window: the sky outside as it is now (in a hut, just a hole in the wall with a hide rolled up over it).
  const sky = night ? '#1c2448' : weather === 'rain' || weather === 'storm' ? '#8a9aa8' : '#8fd3f4';
  if (e === 0) {
    R(g, 46, 12, 22, 16, sky);
    R(g, 46, 24, 22, 4, '#6cbf4a');
    R(g, 44, 9, 26, 4, '#8a5a32');
    R(g, 45, 12, 1, 16, '#6b4428');
    R(g, 68, 12, 1, 16, '#6b4428');
    if (night) for (const [sx, sy] of [[49, 15], [60, 14], [55, 20]]) R(g, sx, sy, 1, 1, '#ffe9a8');
    else if (!raining()) disc(g, 63, 17, 2, '#ffd23f');
  } else {
  box(g, 44, 10, 26, 20, c.trim);
  R(g, 46, 12, 22, 16, sky);
  if (night) for (const [sx, sy] of [[49, 15], [60, 14], [55, 20], [64, 22]]) R(g, sx, sy, 1, 1, '#ffe9a8');
  else if (!raining()) disc(g, 63, 16, 2, '#ffd23f');
  R(g, 46, 24, 22, 4, '#6cbf4a');
  R(g, 56, 12, 1, 16, c.trim);
  R(g, 46, 19, 22, 1, c.trim);
  }
  drawFamilyWall(g); // height marks and the children's drawings (family.js)
  drawSpouseCorner(g, e);
  if (weather === 'rain' || weather === 'storm') for (let i = 0; i < 6; i++) R(g, 47 + ((i * 7 + t) % 20), 13 + ((i * 5 + t * 2) % 12), 1, 2, '#cfe8f5');
  shifted(g, pieceKey('bed'), () => drawBed(g, e));
  // On the wall: herbs drying and a spear (a hut), clay pots on a plank (ancient), then a shelf of books.
  shifted(g, 'shelf', () => {
    if (e === 0) {
      R(g, 82, 12, 26, 1, '#6b4428');
      for (let i = 0; i < 5; i++) R(g, 84 + i * 5, 13, 2, 6 + (i % 2) * 2, ['#7a9a4a', '#a8a04a', '#6a8a3a'][i % 3]);
      R(g, 84, 26, 24, 1, '#8a5a3a');
      R(g, 107, 25, 3, 3, '#b8bcc4');
    } else if (e === 1) {
      box(g, 80, 14, 30, 4, c.trim);
      for (let i = 0; i < 4; i++) box(g, 82 + i * 7, 6 + (i % 2), 6, 8 - (i % 2), ['#b8643a', '#c8844a', '#a85a32'][i % 3], OL);
    } else {
      box(g, 80, 14, 30, 4, c.trim);
      for (let i = 0; i < 7; i++) R(g, 82 + i * 4, 6 + (i % 3), 3, 8 - (i % 3), ['#d8503a', '#3a7ad0', '#e8c050', '#5aa04a', '#8a6cc9'][i % 5]);
    }
  });
  // Warmth, by era: a fire pit, a hearth, a stove, a TV, a hologram.
  shifted(g, 'hearth', () => {
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
  });
  shifted(g, pieceKey('table'), () => drawTable(g, e));
  shifted(g, inUse('seat'), () => drawSeat(g));
  shifted(g, inUse('light'), () => drawLight(g));
  // Family about the house: your spouse at the table, the dog on the rug, the cat on the bed.
  drawFamilyTable(g);
  if (S.spouse != null && !homeStay?.fam) shifted(g, pieceKey('table'), () => person(g, { kind: 'spouse', x: 76, y: 66, dir: 'l', path: [], frame: 0, seed: 3, gender: FAMILIES[S.spouse].gender }, FAMILIES[S.spouse].look));
  drawFamilyHome(g, clockTick()); // the children about the house (family.js)
  if (S.dog) shifted(g, pieceKey('rug'), () => drawAnimal(g, { x: 44, y: 84, dir: 'r', path: [], frame: 0 }, DOG, dogBreed().pal, 12, 9, 10));
  if (S.cat) shifted(g, pieceKey('bed'), () => drawAnimal(g, { x: 26, y: 47, dir: 'l', path: [], frame: 0 }, CAT, { ...CAT_PAL, y: '#f4f1ea' }, 10, 7, 8));
  drawFurniture(g, t);
  // You, at your pastime (or nobody home yet): a nap is taken wherever the bed is.
  if (homeStay?.fam) drawFamilyAct(g, t, e);
  else if (homeStay) shifted(g, { nap: pieceKey('bed'), cook: 'hearth', game: 'hearth' }[homeStay.hobby] ?? null, () => drawHobby(g, homeStay.hobby, t, e));
  if (arranging) drawArrange(g);
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
    case 'wallpaint': {
      // Handprints and a deer on the wall, one more each pass.
      const n = 1 + (Math.floor(t / 16) % 4);
      for (let i = 0; i < n; i++) spr(g, ['o.o.o', 'ooooo', '.ooo.'], { o: '#a8402a' }, 66 + i * 7, 34 + (i % 2) * 4);
      spr(g, ['o...o.', '.ooooo', '.o..o.'], { o: '#6b3a2a' }, 72, 24);
      you(72, 66, 'u');
      return;
    }
    case 'carve':
      you(52, 70, 'r');
      box(g, 57, 64, 6, 4, '#9a9aa4');
      if (t % 4 < 2) R(g, 60, 61, 1, 1, '#ffffff');
      return;
    case 'letter':
      you(66, 70, 'u');
      R(g, 62, 50, 7, 3, '#f4efe6');
      R(g, 68, 46, 1, 5, '#e8e0d0');
      return;
    case 'news':
      you(52, 70, 'r');
      box(g, 55, 56, 10, 8, '#f4f4f0', '#8a8e96');
      for (let i = 0; i < 3; i++) R(g, 57, 58 + i * 2, 6, 1, '#8a8e96');
      return;
    case 'radio':
      box(g, 60, 46, 8, 6, '#8a5a3a', OL);
      disc(g, 64, 49, 1, '#2a2028');
      for (const [dx, dy] of [[11, -2], [14, -6]]) if ((t + dx) % 8 < 4) R(g, 60 + dx, 44 + dy, 2, 2, '#4a3a60');
      you(52, 70, 'r');
      return;
    case 'tv':
      you(103, 76, 'u');
      return;
    case 'vr':
      you(60, 78, 'd');
      R(g, 56, 64, 8, 3, '#2a2a33');
      R(g, 57, 65, 6, 1, '#5ad7e8');
      if (t % 6 < 3) R(g, 52, 70, 2, 2, '#ffd9b8');
      return;
    case 'holo':
      for (let i = 0; i < 5; i++) R(g, 50 + i * 4, 40 + ((t + i * 3) % 10), 3, 2, ['#5ad7e8', '#9a7aff', '#ff8ac0'][i % 3]);
      you(60, 78, 'u');
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
  if (a.tool === 'sunset') {
    // Sitting by the water, a little setting sun in a thought bubble.
    const by = y - 30 - ((a.n - a.t) % 16 < 8 ? 0 : 1);
    R(g, x - 5, by, 11, 8, '#ffffff');
    R(g, x - 6, by + 1, 13, 6, '#ffffff');
    R(g, x - 1, by + 8, 2, 2, '#ffffff');
    disc(g, x, by + 5, 2, '#ff8a3a');
    R(g, x - 4, by + 6, 9, 1, '#5ab4e0');
    return true;
  }
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
