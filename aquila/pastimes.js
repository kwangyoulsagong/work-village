// 작은 마을 — pastimes and occasions: relics and fossils for a museum, rare visitors drawn by what you placed,
// home cooking from the store, a joust in the middle ages, rush hour and a strike in the industrial era, a
// choice for each week, news and a small gift in the codes friends swap (and a caravan that brings it), and the
// sea's work: a boat of your own and fish for the book. Life mode only. Loaded before game.js: nothing here
// touches game.js at load time, only when called.
'use strict';

// ── The museum: relics and fossils turn up when digging and clearing; a museum shows them and takes a fee ─────────

const relicCount = () => S.dex.filter((k) => k.startsWith('relic:')).length;
const hasMuseum = () => (S.decor ?? []).some((d) => d.k === 'museum');
function drawMuseum(g, x, b) {
  shadow(g, x + 8, b, 18);
  box(g, x - 2, b - 4, 20, 4, '#d8d4cc');
  for (const cx of [0, 5, 10, 14]) R(g, x + cx, b - 14, 2, 10, '#ece8e0');
  R(g, x - 2, b - 16, 20, 2, '#c8c4bc');
  for (let i = 0; i < 4; i++) R(g, x - 1 + i * 2, b - 17 - i, 18 - i * 4, 1, '#c8c4bc'); // the pediment
  R(g, x + 6, b - 9, 4, 5, '#6b4428');
}

// ── Rare visitors: what you placed brings them for a day ──────────────────────────────────────────────────────────

const VISITOR_RULES = [
  { name: '공작', kind: 'peacock', why: '꽃밭', ok: (n) => n.flowers >= 3, odds: 0.3 },
  { name: '두루미', kind: 'crane', why: '물가', ok: (n) => n.well + n.fountain >= 1, odds: 0.25 },
  { name: '레서판다', kind: 'redpanda', why: '나무', ok: (n) => n.tree >= 4, odds: 0.25 },
  { name: '흰 사슴', kind: 'whitedeer', why: '동상', ok: (n) => n.statue + n.holo >= 1, odds: 0.15 },
];
function visitorDay() {
  const n = { flowers: 0, well: 0, fountain: 0, tree: 0, statue: 0, holo: 0 };
  for (const d of S.decor ?? []) if (d.k in n) n[d.k]++;
  const can = VISITOR_RULES.filter((v) => v.ok(n) && Math.random() < v.odds);
  if (!can.length) return;
  const v = can[Math.floor(Math.random() * can.length)];
  S.visitor = { kind: v.kind, day: S.days };
  const key = `visitor:${v.name}`;
  const first = !S.dex.includes(key);
  if (first) S.dex.push(key);
  story(`✨ ${v.why}에 이끌려 ${josa(v.name, '이', '가')} 놀러 왔어요!${first ? ' 도감에 올렸어요.' : ''}`);
  spawnAnimals();
}
const PEACOCK = [['..g.g.g.....', '.gbgbgbg..o.', 'gbgbgbgbgoen', '.gbgbgbbbbo.', '...obbbbbo..', '....y..y....']];
const CRANE = [['......oo.', '.....owwer', '.....owo..', '.....owo..', '.ooooowwo.', 'okwwwwwwo.', '.oooooo...', '...y..y...']];
const REDPANDA = [['........o.o.', '.......orrro', 'kr.....orwew', 'rkrooooorrrn', '.krrrrrrrro.', '...oo.oo.oo.']];
function drawVisitorAnimal(g, e) {
  switch (e.kind) {
    case 'peacock': drawAnimal(g, e, PEACOCK, { o: '#2a3a5a', g: '#3aa07a', b: '#3a6ad0', e: '#111111', n: '#e0a030', y: '#c8843a' }, 12, 6, 9); return true;
    case 'crane': drawAnimal(g, e, CRANE, { o: '#5a5e66', w: '#ffffff', k: '#2a2a33', e: '#111111', r: '#e0403a', y: '#3a3a42' }, 9, 8, 7); return true;
    case 'redpanda': drawAnimal(g, e, REDPANDA, { o: '#3a1e14', r: '#c8522a', k: '#6a2a14', w: '#ffffff', e: '#111111', n: '#111111' }, 12, 6, 9); return true;
    case 'whitedeer': drawAnimal(g, e, DEER, { ...DEER_PAL, d: '#f4f2ec', l: '#d8d4cc', W: '#ffffff' }, 14, 11, 12); return true;
  }
  return false;
}
function spawnVisitor(add) {
  if (S.visitor?.day !== S.days || MODE !== 'life') return;
  const d = (S.decor ?? []).find((x) => ['flowers', 'well', 'fountain', 'tree', 'statue', 'holo'].includes(x.k)) ?? { x: PLAZA.x, y: PLAZA.y };
  add(S.visitor.kind, { x: Math.max(0, d.x - 2), y: Math.max(2, Math.min(ROWS - 2, d.y)), w: 5, h: 1 }, 0.4);
}

// ── Home cooking: once a day, from what's in the store ────────────────────────────────────────────────────────────

const RECIPES = [
  { id: 'jam', name: '산딸기잼', era: 0, need: { berries: 3 } },
  { id: 'grill', name: '생선구이', era: 0, need: { fish: 2 } },
  { id: 'skewer', name: '고기 꼬치', era: 0, need: { meat: 2 } },
  { id: 'bread', name: '밀빵', era: 1, need: { crop: 2 } },
  { id: 'stew', name: '생선 매운탕', era: 1, need: { fish: 2, berries: 1 } },
  { id: 'juice', name: '포도 주스', era: 2, need: { crop: 3 } },
  { id: 'hotpot', name: '고기 스튜', era: 2, need: { meat: 1, crop: 1, berries: 1 } },
  { id: 'soup', name: '옥수수 수프', era: 3, need: { crop: 2, fish: 1 } },
  { id: 'pasta', name: '토마토 파스타', era: 4, need: { crop: 3, meat: 1 } },
  { id: 'seafood', name: '해물탕', era: 1, need: { fish: 3 }, sea: true },
  { id: 'jelly', name: '빛열매 젤리', era: 5, need: { crop: 2, berries: 2 } },
];
const haveFor = (r) => Object.entries(r.need).every(([k, n]) => (k === 'crop' ? S.bag : S.stock[k] ?? 0) >= n);
function cookDay() {
  const open = RECIPES.filter((r) => r.era <= S.era && (!r.sea || hasSea()) && haveFor(r));
  if (!open.length) return;
  const fresh = open.filter((r) => !S.cooked?.includes(r.id));
  const r = (fresh.length ? fresh : open)[Math.floor(Math.random() * (fresh.length || open.length))];
  for (const [k, n] of Object.entries(r.need)) {
    if (k === 'crop') S.bag -= n;
    else S.stock[k] -= n;
  }
  S.happy = Math.min(100, S.happy + 4);
  if (!S.cooked?.includes(r.id)) {
    S.cooked = [...(S.cooked ?? []), r.id];
    story(`🍳 처음 만든 요리: ${r.name}. 온 가족이 맛있대요!`);
  } else if (Math.random() < 0.25) story(`🍳 오늘 저녁은 ${r.name}이에요.`);
}

// ── The middle ages: a joust on the square, once a week ───────────────────────────────────────────────────────────

const joustToday = () => MODE === 'life' && S.era === 2 && S.days % 7 === 3 && hour() >= 10 && hour() < 17;
function drawJoust(g) {
  if (!joustToday() || !onScreen(PLAZA.x * T)) return;
  const cx = (PLAZA.x + 2) * T;
  const y = (PLAZA.y + 1) * T + 4;
  // The lists: a low fence down the middle.
  R(g, cx - 34, y - 2, 68, 1, '#8a5a3a');
  for (let x = cx - 34; x <= cx + 34; x += 8) R(g, x, y - 5, 1, 4, '#6b4428');
  // Two riders charge, meet in the middle, and go back.
  const p = (clockTick() % 40) / 40; // a pass every 5 s
  const d = Math.round(Math.abs(Math.cos(p * Math.PI)) * 30);
  const hitNow = d < 4;
  for (const [side, top] of [[-1, '#3a5ab0'], [1, '#b03a3a']]) {
    const x = cx + side * d - 8;
    spr(g, HORSE[Math.floor(clockTick() / 2) % 2], HORSE_PAL, x, y - 12, side > 0);
    R(g, x + 4, y - 22, 6, 6, top);
    R(g, x + 5, y - 26, 4, 4, '#9aa0aa');
    R(g, x + (side < 0 ? 10 : -10), y - 19, 14, 1, '#d8c8a0');
  }
  if (hitNow) for (const [dx, dy] of [[-3, -24], [2, -27], [5, -22]]) R(g, cx + dx, y + dy, 2, 2, '#ffd23f');
}

// ── The industrial era: rush hour, and now and then a strike ──────────────────────────────────────────────────────

const strikeToday = () => S.strike === S.days && S.era === 3;
function strikeDay() {
  if (S.era !== 3 || !has('factory')) return;
  if (S.strike === S.days - 1) story('🤝 협상이 끝났어요. 노동자들이 다시 공장으로 돌아가요.');
  if (Math.random() < 0.04) {
    S.strike = S.days;
    story('✊ 공장 노동자들이 임금을 올려 달라며 파업했어요. 오늘은 공장 보너스가 멈춰요.');
  }
}
/** Hooks for ai.js options: the commute, the picket line, the joust crowd, the museum, a caravan. */
function pastimeOptions(e, add) {
  if (MODE !== 'life' || e.kind !== 'villager' || e.small) return;
  const h = hour();
  if (S.era >= 3 && e.job) {
    if (h === 8) add(88, 'commute', jobPlace(e, e.job), null, 10, () => {});
    if (h === 18) add(88, 'home', e.home >= 0 ? doorOf(e.home) : HOME_DOOR, null, 10, () => {});
  }
  if (strikeToday() && ['worker', 'robotics', 'miner'].includes(e.job?.id)) add(130, 'picket', landmarkSpot('factory'), 'picket', 90, () => {});
  if (joustToday()) add(70, 'watch', [PLAZA.x + rand(-2, 5), PLAZA.y + 2], 'dance', 80, () => (e.needs.social = 100));
  const museum = (S.decor ?? []).find((d) => d.k === 'museum');
  if (museum && Math.random() < 0.2) add(26, 'museum', [museum.x, museum.y + 1], 'sparkle', 40, () => {});
  if (S.caravan?.day === S.days) add(48, 'caravan', [PLAZA.x - 2, ROAD_Y + 1], 'talk', 40, () => (e.needs.social = 100));
}
function drawPicket(g, e) {
  if (e.act?.tool !== 'picket') return false;
  const x = Math.round(e.x);
  const y = Math.round(e.y) - 30 - (Math.floor(clockTick() / 4 + (e.seed ?? 0)) % 2);
  R(g, x, y + 6, 1, 8, '#6b4428');
  box(g, x - 5, y, 11, 7, '#f4efe6', '#8a5a3a');
  R(g, x - 3, y + 2, 7, 1, '#e0403a');
  R(g, x - 3, y + 4, 5, 1, '#e0403a');
  return true;
}

// ── A choice for each week ────────────────────────────────────────────────────────────────────────────────────────

const WEEK_CHOICES = [
  { id: 'harvest', name: '풍년 기원', note: '작물이 15% 빨리 자라요' },
  { id: 'guard', name: '경비 강화', note: '도둑과 전쟁이 절반이 돼요' },
  { id: 'feast', name: '마을 잔치', note: '지금 행복 +20, 이웃과 더 친해져요' },
  { id: 'market', name: '장날', note: '작물을 10% 비싸게 팔아요' },
];
const weekNow = () => Math.floor(S.days / 7);
const weekIs = (id) => MODE === 'life' && S.week?.n === weekNow() && S.week.id === id;
const weekGrow = () => (weekIs('harvest') ? 1.15 : 1);
const weekGuard = () => (weekIs('guard') ? 0.5 : 1);
const weekPrice = () => (weekIs('market') ? 1.1 : 1);
function pickWeek(id) {
  if (MODE !== 'life' || S.week?.n === weekNow()) return;
  S.week = { n: weekNow(), id };
  const c = WEEK_CHOICES.find((x) => x.id === id);
  if (id === 'feast') {
    S.happy = Math.min(100, S.happy + 20);
    for (const f of S.friends) if (f) f.f = Math.min(MAX_FRIEND, f.f + 1);
  }
  story(`🗓 이번 주는 ${c.name}! ${c.note}.`);
  save();
  paintUi();
}
function paintWeek() {
  const card = document.getElementById('weekCard');
  if (!card) return;
  const show = MODE === 'life' && !!S.gender && !S.over && S.days >= 2 && S.week?.n !== weekNow();
  card.hidden = !show;
  if (!show || card.dataset.built) return;
  card.dataset.built = '1';
  const auto = document.getElementById('weekAuto');
  if (auto && !auto.onclick)
    auto.onclick = () => {
      pickWeek(WEEK_CHOICES[Math.floor(Math.random() * WEEK_CHOICES.length)].id);
      card.dataset.built = '';
    };
  const list = document.getElementById('weekChoices');
  list.replaceChildren(
    ...WEEK_CHOICES.map((c) => {
      const b = el('button', 'choice');
      b.append(el('b', '', c.name), el('span', '', c.note));
      b.addEventListener('click', () => {
        pickWeek(c.id);
        card.dataset.built = '';
      });
      return b;
    }),
  );
}

// ── Codes between friends: news in an invite, a small gift with a guestbook note, and a caravan that brings it ─

/** A few lines of news for an invite code (only text; shown as text). */
function newsForCode() {
  const lines = [todayLine(), ...(S.chronicle ?? []).slice(0, 2).map((c) => storyKind(c.text).text)].filter(Boolean);
  return [...new Set(lines)].slice(0, 3).map((s) => String(s).slice(0, 60));
}
/** What a caravan from a town of that era brings (decided here, never read from the code). */
function caravanGift(era) {
  const e = Math.max(0, Math.min(5, Number(era) || 0));
  return [['berries', 5, '열매 다섯 바구니'], ['wood', 5, '통나무 다섯 개'], ['stone', 5, '돌 다섯 개'], ['coins', 20, '20코인'], ['coins', 30, '30코인'], ['coins', 40, '40코인']][e];
}
/** A friend's note arrived at home: their caravan comes for the day, with a gift (once per note). */
function caravanArrives(obj) {
  const name = String(obj.from?.name ?? '이웃').slice(0, 8);
  const id = `${name}|${String(obj.text ?? '').slice(0, 24)}|${Number(obj.x) || 0}`;
  S.notesTaken ??= [];
  if (S.notesTaken.includes(id)) return;
  S.notesTaken = [...S.notesTaken, id].slice(-30);
  const era = Math.max(0, Math.min(5, Number(obj.from?.era) || 0));
  const [kind, n, what] = caravanGift(era);
  if (kind === 'coins') S.coins += n;
  else stock(kind, n);
  S.caravan = { name, era, day: S.days };
  story(`🐪 ${name}님 마을에서 캐러밴이 왔어요. ${eul(what)} 선물로 두고 갔어요.`);
}
function drawCaravan(g) {
  const c = S.caravan;
  if (MODE !== 'life' || !c || c.day !== S.days) return;
  const x = (PLAZA.x - 3) * T;
  if (!onScreen(x)) return;
  const b = ROAD_Y * T - 1;
  const look = { type: ['ox', 'carriage', 'wagon', 'truck', 'truck', 'hoverbus'][c.era] ?? 'wagon', x, right: true, f: 0, c: '#8a6cc9', look: { hair: '#3a2418', top: '#8a6cc9', legs: '#4b4560' }, gender: 'f', ofs: 0, b };
  drawVehicle(g, look);
  // A pennant with the friend's name.
  R(g, x + 2, b - 30, 1, 14, '#6b4428');
  g.font = '6px sans-serif';
  const w = Math.min(60, Math.ceil(g.measureText(c.name).width) + 6);
  box(g, x + 3, b - 31, w, 8, '#fff6e0', '#8a5a3a');
  g.fillStyle = '#5a3a26';
  g.fillText(c.name, x + 6, b - 25);
}

// ── The sea's work: your own boat, and fish for the book ──────────────────────────────────────────────────────────

const MY_BOATS = [
  { id: 'raft', name: '뗏목', era: 0, cost: 60 },
  { id: 'sail', name: '돛단배', era: 1, cost: 150 },
  { id: 'fishing', name: '고기잡이배', era: 2, cost: 380 },
  { id: 'steam', name: '증기 어선', era: 3, cost: 620 },
  { id: 'yacht', name: '요트', era: 4, cost: 950 },
  { id: 'hydrofoil', name: '수중익선', era: 5, cost: 1400 },
];
const myBoat = () => MY_BOATS.find((b) => b.id === S.boat) ?? null;
function buyBoat(b) {
  S.coins -= b.cost;
  S.boat = b.id;
  story(`⛵ ${eul(b.name)} 샀어요. 이제 바다로 나가 낚시할 수 있어요.`);
  spawnBoats();
}
function boatRows(add) {
  if (!hasSea()) return;
  for (const b of MY_BOATS) {
    if (b.era > S.era) continue;
    if (S.boat === b.id) add('바다', b.name, '내 배예요', 0, false, () => {});
    else add('바다', b.name, '바다낚시를 다녀와요', b.cost, MY_BOATS.findIndex((x) => x.id === S.boat) < MY_BOATS.indexOf(b), () => buyBoat(b));
  }
}
/** Out to sea on your boat, now and then (game.js nextTask asks, before your job). */
let seaTrip = 0;
function boatTask() {
  if (!myBoat() || !hasSea() || !live() || seaTrip > 0 || Math.random() > 0.08) return null;
  return {
    to: [pierEnd(), ROAD_Y],
    tool: 'rod',
    what: '배 타고 바다낚시',
    act: () => {
      seaTrip = 64; // 8 s out on the water
      me.hidden = true;
      const mine = boats.find((b) => b.mine);
      if (mine) mine.v = (mine.v > 0 ? 1 : -1) * 0.9;
      return '바다로 나가요!';
    },
  };
}
function seaTripTick() {
  if (seaTrip <= 0) return;
  rest = Math.max(rest, 2);
  if (--seaTrip > 0) return;
  me.hidden = false;
  const mine = boats.find((b) => b.mine);
  if (mine) mine.v = Math.sign(mine.v) * 0.3;
  stock('fish', 2);
  if (Math.random() < 0.5) find('sea');
  else story('🎣 바다에서 물고기 두 마리를 잡아 왔어요.');
}

// ── Once a day, each tick, each frame ─────────────────────────────────────────────────────────────────────────────

function pastimesDay() {
  if (MODE !== 'life' || !S.gender || S.over) return;
  if (hasMuseum() && relicCount() > 0) {
    const fee = relicCount() * 2;
    S.coins += fee;
    if (!S.museumOpened) {
      S.museumOpened = true;
      story(`🏛 박물관 문을 열었어요. 유물 ${relicCount()}점을 보러 온 사람들이 입장료를 내요.`);
    }
  }
  visitorDay();
  cookDay();
  strikeDay();
  if (S.era === 2 && S.days % 7 === 3) {
    const champs = S.friends.map((_, i) => i).filter((i) => i < occupied() && i !== S.spouse);
    if (champs.length) story(`🐎 광장에서 마상 시합이 열려요! 우승 후보는 ${nameOf(champs[Math.floor(Math.random() * champs.length)])}예요.`);
  }
}
function pastimesTick() {
  if (MODE !== 'life') return false;
  seaTripTick();
  return seaTrip > 0 || joustToday();
}
function drawPastimes(g) {
  if (MODE !== 'life') return;
  drawJoust(g);
  drawCaravan(g);
}
