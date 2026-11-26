// 작은 마을 — stories that last, from outside research (sources in TODO.md):
//  • travel postcards (Travel Frog): now and then a neighbour (or your dog) goes on a trip for a few real hours; a
//    postcard of somewhere far comes to the album on the way, and they come home with a souvenir;
//  • life stories (Dwarf Fortress legends): each neighbour keeps the lines of the chronicle that were about them;
//    their card shows 📖 지나온 이야기, and those who left (illness, war, moving away) are remembered in the 나 tab;
//  • the old tower (Stardew's bundles): three bundles of what the town gathers (fish, berries and wood, stone) bring
//    it back stage by stage, each with a small lasting perk (better fishing, better foraging, fewer thieves).
// Life mode only. No coins move here. Loaded before game.js: game.js names are used only inside functions.
'use strict';

// ── Travel postcards ──────────────────────────────────────────────────────────────────────────────────────────────

const PLACES = [
  ['큰 폭포', '눈 덮인 산', '바닷가 동굴', '붉은 사막'],
  ['돌 피라미드', '강가 신전', '소금 호수', '거대한 석상'],
  ['성채 도시', '포도밭 언덕', '수도원', '안개 낀 숲'],
  ['증기 기관차 역', '항구 도시', '시계탑 광장', '탄광 마을'],
  ['놀이공원', '야경 도시', '스키장', '열대 해변'],
  ['달 기지', '화성 돔', '해저 도시', '구름 정원'],
];
const SOUVENIRS = ['스노볼', '조개 목걸이', '작은 석상', '엽서 묶음', '말린 꽃', '열쇠고리', '모래 병', '털모자'];
const TRIP_HOURS = [2, 6];
const onTrip = (p) => {
  const t = S.trip;
  if (!t || MODE !== 'life') return false;
  return t.who === 'dog' ? p.kind === 'dog' : p.kind === 'villager' && p.who === `h${t.who}a`;
};
const tripName = (t) => (t.who === 'dog' ? (S.dog ? dogBreed().name : '강아지') : FAMILIES[t.who]?.single ?? '이웃');
/** Once a day: maybe someone sets off. */
function tripDay() {
  if (MODE !== 'life' || S.trip || Math.random() > 0.2) return;
  const can = Array.from({ length: occupied() }, (_, i) => i).filter((i) => i !== S.spouse && (S.friends[i]?.f ?? 0) >= 3);
  const who = S.dog && Math.random() < 0.25 ? 'dog' : can.length ? can[rand(0, can.length - 1)] : null;
  if (who == null) return;
  const hours = TRIP_HOURS[0] + Math.random() * (TRIP_HOURS[1] - TRIP_HOURS[0]);
  S.trip = { who, start: Date.now(), back: Date.now() + hours * 3600_000, sent: 0, era: S.era };
  story(`🧳 ${josa(tripName(S.trip), '이', '가')} 여행을 떠났어요. 엽서를 보내 준대요.`);
  if (typeof people !== 'undefined') people = people.filter((p) => !onTrip(p));
}
/** Now and then (and on opening the panel): a postcard on the way, home again at the end. */
let tripTicks = 0;
function tripTick(force = false) {
  const t = S.trip;
  if (MODE !== 'life' || !t || (!force && ++tripTicks % 480)) return false;
  const now = Date.now();
  const part = (now - t.start) / (t.back - t.start);
  while (t.sent < 2 && part >= (t.sent + 1) / 3) {
    t.sent++;
    const places = PLACES[Math.max(0, Math.min(5, t.era))];
    S.cards = [{ who: t.who === 'dog' ? 'dog' : t.who, name: tripName(t), place: places[rand(0, places.length - 1)], day: S.days, seed: (Math.random() * 1e6) | 0, era: t.era }, ...(S.cards ?? [])].slice(0, 48);
    story(`💌 ${tripName(t)}에게서 엽서가 왔어요: "${S.cards[0].place}에 왔어요!"`);
  }
  if (now >= t.back) {
    const gift = SOUVENIRS[rand(0, SOUVENIRS.length - 1)];
    S.souvenirs = [...new Set([gift, ...(S.souvenirs ?? [])])].slice(0, SOUVENIRS.length);
    if (t.who !== 'dog' && S.friends[t.who]) S.friends[t.who].f = Math.min(MAX_FRIEND, S.friends[t.who].f + 1);
    story(`🧳 ${josa(tripName(t), '이', '가')} 여행에서 돌아왔어요. 선물로 ${eul(gift)} 가져왔어요.`);
    S.trip = null;
    if (typeof spawnFamily === 'function' && typeof people !== 'undefined' && people.length) spawnFamily();
  }
  return false;
}
/** A postcard, drawn from its seed (sky, ground, the place's shape, a stamp), cached as an image. */
const cardCache = new Map();
function postcardSrc(c) {
  const key = `${c.seed}`;
  if (cardCache.has(key)) return cardCache.get(key);
  const cv = document.createElement('canvas');
  cv.width = 96;
  cv.height = 64;
  const g = cv.getContext('2d');
  const r = rng(c.seed);
  const night = c.era === 5 || r() < 0.2;
  g.fillStyle = night ? '#1c2448' : ['#8fd3f4', '#ffd2a8', '#c8e0f8'][Math.floor(r() * 3)];
  g.fillRect(0, 0, 96, 64);
  g.fillStyle = night ? '#ffe9a8' : '#ffd23f';
  g.beginPath();
  g.arc(70 + r() * 16, 14, night ? 4 : 6, 0, Math.PI * 2);
  g.fill();
  const p = c.place;
  const ground = /사막|피라미드|모래/.test(p) ? '#e8c070' : /바다|해변|항구|호수|해저|폭포/.test(p) ? '#3a8ad0' : /눈|스키/.test(p) ? '#f4f6f8' : /달|화성/.test(p) ? (p.includes('화성') ? '#c8603a' : '#9a9aa4') : '#6cbf4a';
  g.fillStyle = ground;
  g.fillRect(0, 44, 96, 20);
  g.fillStyle = '#5a5a6a';
  if (/산|스키|폭포/.test(p)) {
    g.beginPath();
    g.moveTo(10, 46);
    g.lineTo(38, 12);
    g.lineTo(66, 46);
    g.fill();
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.moveTo(31, 21);
    g.lineTo(38, 12);
    g.lineTo(45, 21);
    g.fill();
  } else if (/피라미드/.test(p)) {
    g.fillStyle = '#c8a050';
    g.beginPath();
    g.moveTo(20, 46);
    g.lineTo(44, 16);
    g.lineTo(68, 46);
    g.fill();
  } else if (/돔|기지|해저/.test(p)) {
    g.fillStyle = 'rgba(200, 240, 255, 0.7)';
    g.beginPath();
    g.arc(44, 46, 20, Math.PI, 0);
    g.fill();
  } else {
    // A town skyline / a tower / a temple: a few blocks.
    for (let i = 0; i < 5; i++) {
      const h = 10 + r() * 26;
      g.fillStyle = ['#8a5a3a', '#9a9aa4', '#c8503a', '#e8d4b8'][Math.floor(r() * 4)];
      g.fillRect(12 + i * 14, 46 - h, 11, h);
    }
  }
  g.fillStyle = '#ffffff';
  g.fillRect(78, 46, 14, 14); // the stamp
  g.fillStyle = ['#e0475f', '#3182f6', '#2f9e5a'][c.seed % 3];
  g.fillRect(80, 48, 10, 10);
  g.strokeStyle = '#ffffff';
  g.lineWidth = 3;
  g.strokeRect(1.5, 1.5, 93, 61);
  const src = cv.toDataURL();
  cardCache.set(key, src);
  return src;
}
function postcardRows() {
  const out = [];
  if (S.trip) out.push(el('li', 'empty', `🧳 ${tripName(S.trip)} 여행 중 · ${Math.max(0, Math.ceil((S.trip.back - Date.now()) / 3600_000))}시간쯤 뒤에 와요`));
  for (const c of S.cards ?? []) {
    const li = el('li', 'photo');
    const img = el('img');
    img.src = postcardSrc(c);
    img.alt = `${c.place} 엽서`;
    li.append(img, el('span', '', `${c.day}일차 · ${c.name}의 엽서 · ${c.place}`));
    out.push(li);
  }
  if (S.souvenirs?.length) out.push(el('li', 'empty', `받은 선물: ${S.souvenirs.join(', ')}`));
  return out;
}

// ── Life stories, and those who left ─────────────────────────────────────────────────────────────────────────────

/** Called by story(): the line goes into the life story of every neighbour it names. */
function taleOf(text) {
  if (MODE !== 'life' || typeof FAMILIES === 'undefined') return;
  const n = Math.min(occupied(), FAMILIES.length);
  for (let i = 0; i < n; i++) {
    const f = FAMILIES[i];
    if (!f?.single || !text.includes(f.single)) continue;
    S.bio ??= {};
    const list = (S.bio[i] ??= []);
    if (list[0]?.text === text) continue;
    list.unshift({ day: S.days, text: text.replace(/^[^\p{L}\p{N}]+/u, '') });
    list.length = Math.min(list.length, 12);
  }
}
function bioLine(i) {
  const list = S.bio?.[i] ?? [];
  if (!list.length) return '아직 함께한 이야기가 없어요.';
  return list.slice(0, 3).map((b) => `${b.day}일 · ${b.text}`).join('\n');
}
/** A family that leaves (illness, war, moving away): remembered. */
function memorialize(i, why) {
  if (MODE !== 'life' || !FAMILIES[i]) return;
  S.memorial = [{ name: FAMILIES[i].single, family: FAMILIES[i].family, day: S.days, why, years: (S.bio?.[i] ?? []).length }, ...(S.memorial ?? [])].slice(0, 40);
  if (S.bio) delete S.bio[i]; // a new family may move in there
}
function memorialRows() {
  if (!S.memorial?.length) return [];
  const out = [el('li', 'group', '기억할 이웃')];
  for (const m of S.memorial.slice(0, 6)) out.push(el('li', 'stat__note', `🪦 ${m.family} · ${m.day}일에 ${m.why}`));
  return out;
}

// ── The old tower: three bundles ─────────────────────────────────────────────────────────────────────────────────

const BUNDLES = [
  { id: 'fish', name: '물고기 꾸러미', need: { fish: 8 }, perk: '낚시 입질이 잘 와요' },
  { id: 'forest', name: '숲 꾸러미', need: { berries: 15, wood: 15 }, perk: '열매를 한 개 더 따요' },
  { id: 'stone', name: '돌 꾸러미', need: { stone: 20, wood: 10 }, perk: '도둑이 덜 들어요' },
];
const STOCK_NAMES = { fish: '물고기', berries: '열매', wood: '나무', stone: '돌' };
const restored = (id) => !!S.tower?.includes(id);
const fishBonus = () => (restored('fish') ? 0.15 : 0);
const forageBonus = () => (restored('forest') ? 1 : 0);
const towerCrime = () => (restored('stone') ? 0.8 : 1);
function donateBundle(id) {
  const b = BUNDLES.find((x) => x.id === id);
  if (!b || restored(id) || MODE !== 'life') return;
  if (Object.entries(b.need).some(([k, n]) => (S.stock[k] ?? 0) < n)) return toast('창고에 아직 모자라요');
  for (const [k, n] of Object.entries(b.need)) S.stock[k] -= n;
  S.tower = [...(S.tower ?? []), id];
  if (S.tower.length === BUNDLES.length) {
    story('🗼 옛 탑을 다시 세웠어요! 마을 사람들이 모두 모여 축하해요.');
    S.festival = today();
    photoSoon('옛 탑을 다시 세운 날');
  } else story(`🗼 ${eul(b.name)} 옛 탑에 바쳤어요. ${b.perk}.`);
  cache.dirty = true;
  saveSoon();
  paintUi();
}
const towerSig = () => `${(S.tower ?? []).join()}|${BUNDLES.map((b) => Object.keys(b.need).map((k) => Math.min(S.stock[k] ?? 0, b.need[k])).join()).join()}`;
function towerRows() {
  if (MODE !== 'life' || S.era < 1) return [];
  const done = S.tower?.length ?? 0;
  const out = [el('li', 'group', `옛 탑 복원 ${done}/${BUNDLES.length}`)];
  for (const b of BUNDLES) {
    const li = el('li', 'buy');
    const text = el('div', 'buy__text');
    const need = Object.entries(b.need).map(([k, n]) => `${STOCK_NAMES[k]} ${Math.min(S.stock[k] ?? 0, n)}/${n}`).join(' · ');
    text.append(el('b', '', b.name), el('span', 'buy__note', restored(b.id) ? `다 모았어요 · ${b.perk}` : `${need} · ${b.perk}`));
    const ready = !restored(b.id) && Object.entries(b.need).every(([k, n]) => (S.stock[k] ?? 0) >= n);
    const btn = el('button', `btn${ready ? ' primary' : ''} buy__btn`, restored(b.id) ? '완료' : '바치기');
    btn.disabled = !ready;
    btn.addEventListener('click', () => donateBundle(b.id));
    li.append(text, btn);
    out.push(li);
  }
  return out;
}
