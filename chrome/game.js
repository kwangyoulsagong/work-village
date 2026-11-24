// 작은 마을 — a town that grows with your Claude / Codex usage, from a tent in a field to a future city.
// Nobody plays it: you farm, build, keep animals, make friends, marry and raise kids on your own while you work.
//
// Battery: the economy moves only when Aquila reports a usage change (no polling). The still parts of the picture are
// drawn once into a cache; people, animals and cars move at 8 frames a second only while the panel is on screen and
// not in power saver. Otherwise nothing is drawn and pending work is done at once (it shows in the story).
'use strict';

// ── Rules ──────────────────────────────────────────────────────────────────────────────────────────────────────────

const COINS_PER_WEEKLY_PCT = 10; // 1 % of a weekly limit used = 🪙10
const COINS_PER_5H_PCT = 2; //      accounts that only report the 5-hour window
const GROW = 30; //                 coins earned for a crop to ripen
const SEED = 3;
const KID_EVERY = 150;
const MAX_KIDS = 3;
const MAX_FRIEND = 10;
const LOTS = 50;
/** Houses the town has room for in each era: it grows with the era, not ahead of it. */
const HOUSES_BY_ERA = [4, 9, 16, 26, 38, 50];
const houseCap = () => HOUSES_BY_ERA[S.era];
const MAX_CHICKENS = 6;
const MAX_COWS = 3;

const ERAS = [
  { name: '원시 시대', cost: 0, crop: '산딸기', price: 5, title: '채집꾼' },
  { name: '고대', cost: 100, crop: '밀', price: 7, title: '마을 농부' },
  { name: '중세', cost: 400, crop: '포도', price: 10, title: '마을 대표' },
  { name: '산업 시대', cost: 950, crop: '옥수수', price: 14, title: '공장 주인' },
  { name: '현대', cost: 1800, crop: '토마토', price: 18, title: '시장' },
  { name: '미래', cost: 3000, crop: '빛열매', price: 25, title: '도시 설계자' },
];
const buildCost = (n) => 40 + 17 * n;
const NAMES = [
  '하나', '도윤', '서아', '지호', '민준', '유나', '태오', '소율',
  '하준', '지안', '시우', '채원', '은우', '다인', '준서', '아린',
  '이안', '나은', '로운', '세아', '건우', '하린', '주원', '예나',
  '선우', '수아', '도하', '라온', '윤호', '가온', '시아', '현우',
  '서준', '하윤', '예준', '지우', '주안', '서윤', '우진', '채아',
  '연우', '다은', '이준', '소이', '한결', '유주', '시온', '나윤',
  '태윤', '봄이', '하람', '새봄',
];
const HAIRS = ['#3a2418', '#5a3a22', '#1f1b2b', '#7a4a2a', '#2a1d16', '#8a4a2a', '#1c1c28', '#5a3022'];
const TOPS = ['#d8644f', '#4f8f5b', '#8a6cc9', '#e0a23a', '#3f8fb0', '#e07aa0', '#c9a23a', '#6cbf8a'];
const LEG_COLORS = ['#4b4560', '#3d4a66', '#4a3b35', '#35506b', '#4a4a4a', '#5a3d2b'];
const FAMILIES = NAMES.map((single, i) => ({
  family: `${single}네`,
  single,
  gender: i % 2 ? 'm' : 'f',
  look: { hair: HAIRS[i % HAIRS.length], top: TOPS[(i * 3) % TOPS.length], legs: LEG_COLORS[(i * 5) % LEG_COLORS.length] },
}));
const LINES = {
  low: ['안녕하세요! 이사 온 지 얼마 안 됐어요.', '이 마을 공기가 좋네요.', '밭은 잘 돼 가요?'],
  mid: ['오늘도 열심이네요!', '작물이 잘 자라던데요.', '마을이 점점 커지네요.'],
  high: ['당신이랑 얘기하면 하루가 즐거워요.', '같이 산책할래요?', '이 마을에 와 줘서 고마워요.'],
};

// ── State (saved) ──────────────────────────────────────────────────────────────────────────────────────────────────

const fresh = () => ({
  v: 2,
  coins: 15,
  bag: 0,
  era: 0,
  houses: 0,
  chickens: 0,
  cows: 0,
  plots: Array.from({ length: 6 }, () => ({ planted: false, g: 0 })),
  farm: [], //         farm upgrades owned (see extras.js)
  friends: [],
  spouse: null,
  kids: 0,
  sinceKid: 0,
  usage: {},
  days: 0,
  lastDay: '',
  harvested: 0,
  xp: 0,
  story: [],
  gender: null, //     'f' | 'm', picked once
  traits: null, //     { health, green, charm, trade, luck }: 1–5 each, rolled at the start
  over: null, //       set when the protagonist dies: the game is over
  mapSeed: Math.floor(Math.random() * 1e9), // the map's layout (layout.js): new game, new map
  lots: [], //         built house lots in order: { x, s } (s: south of the road, on cleared land)
  cleared: [], //      stretches of woods cleared for new streets: { x, w }
  age: 0, //           days lived by the current protagonist
  sickDays: 0,
  kidAges: [], //      days each child has lived
  dog: false,
  season: -1,
  festival: '',
  dayEarned: 0,
  golden: 0,
  happy: 60, //        family happiness 0–100: your work keeps them happy
  kidTraits: [], //    each child's traits, a blend of yours and luck
  dogAge: 0,
  landmarks: [], //    built: 'temple', 'castle', 'factory', 'hospital', 'rocket'
  ach: [], //          achievements unlocked
  launched: false,
  dex: [], //          the collection book: 'fish:송어', 'gem:금', …
  merchant: null, //   { day, sold } when the travelling merchant is in town
  cat: false,
  ruins: 0, //         lots with rubble after a war (rebuilt first)
  wars: 0,
  vacant: 0, //        houses standing empty after an epidemic (a new family moves in for half)
  sheep: 0,
  pigs: 0,
  goats: 0,
  horses: 0,
  alpacas: 0,
  donkeys: 0,
  turkeys: 0,
  folk: 0, //          extra neighbours you invited (build menu)
  decor: [], //        things you placed: { k, x, y }
  homeLook: null, //   your house's colours (build menu)
  coreOrder: null, //  farm / pond / pen / square, left to right, once you've moved them
  jobToday: 0, //      what jobs paid today, on top of what you earned by working
  stock: { wood: 0, stone: 0, fish: 0, berries: 0 }, // what villagers brought to the store
  pocket: 0, //        15 % of what you earn: spent at the clothes shop
  owned: [],
  style: { hair: null, hairColor: null, top: null, hat: null },
});

// ── The clothes shop: what the pocket money buys ───────────────────────────────────────────────────────────────────

const POCKET_SHARE = 0.15;
const CATALOG = [
  { id: 'hair-bob', kind: 'hair', value: 'bob', name: '단발머리', price: 30 },
  { id: 'hair-pony', kind: 'hair', value: 'pony', name: '포니테일', price: 40 },
  { id: 'hair-curly', kind: 'hair', value: 'curly', name: '곱슬머리', price: 40 },
  { id: 'hair-spiky', kind: 'hair', value: 'spiky', name: '뾰족 머리', price: 35 },
  { id: 'hair-bun', kind: 'hair', value: 'bun', name: '올림머리', price: 45 },
  { id: 'dye-blonde', kind: 'hairColor', value: '#e8c26a', name: '금발 염색', price: 50 },
  { id: 'dye-red', kind: 'hairColor', value: '#b8442e', name: '빨간 염색', price: 50 },
  { id: 'dye-pink', kind: 'hairColor', value: '#f29bc0', name: '분홍 염색', price: 60 },
  { id: 'dye-blue', kind: 'hairColor', value: '#5ab4e0', name: '파란 염색', price: 60 },
  { id: 'top-stripe', kind: 'top', value: { c: '#f2f2f2', stripe: '#3567c9' }, name: '줄무늬 티', price: 45 },
  { id: 'top-overalls', kind: 'top', value: { c: '#f2e2b6', over: '#4a6fa8' }, name: '멜빵바지', price: 55 },
  { id: 'top-red', kind: 'top', value: { c: '#d8473a' }, name: '빨간 셔츠', price: 35 },
  { id: 'top-dress', kind: 'top', value: { c: '#e07aa0', dress: true }, name: '원피스', price: 70 },
  { id: 'top-suit', kind: 'top', value: { c: '#2f3a52', tie: '#d8473a' }, name: '정장', price: 90 },
  { id: 'hat-straw', kind: 'hat', value: 'straw', name: '밀짚모자', price: 40 },
  { id: 'hat-beanie', kind: 'hat', value: 'beanie', name: '비니', price: 40 },
  { id: 'hat-cap', kind: 'hat', value: 'cap', name: '야구모자', price: 45 },
  { id: 'hat-flower', kind: 'hat', value: 'flower', name: '꽃핀', price: 30 },
  { id: 'hat-crown', kind: 'hat', value: 'crown', name: '왕관', price: 200 },
];
// ── Landmarks: one an era, built on the south side; each changes something ────────────────────────────────────────

const LANDMARKS = [
  { id: 'temple', name: '신전', era: 1, x: 36, w: 4, cost: 100, does: '범죄가 줄어요' },
  { id: 'castle', name: '성', era: 2, x: 29, w: 6, cost: 400, does: '도둑과 전쟁이 절반으로 줄어요' },
  { id: 'factory', name: '공장', era: 3, x: 89, w: 5, cost: 1000, does: '수입이 10% 늘어요' },
  { id: 'hospital', name: '병원', era: 4, x: 96, w: 5, cost: 1800, does: '병과 사망 위험이 절반이 돼요' },
  { id: 'rocket', name: '로켓 발사대', era: 5, x: 104, w: 5, cost: 3500, does: '우주로 가요' },
];
const has = (id) => S.landmarks.includes(id);
const nextLandmark = () => LANDMARKS.find((l) => !has(l.id) && l.era <= S.era) ?? null;

const ACHIEVEMENTS = [
  ['first-harvest', '첫 수확', () => S.harvested >= 1],
  ['houses-5', '이웃 5가구', () => S.houses >= 5],
  ['houses-15', '이웃 15가구', () => S.houses >= 15],
  ['houses-26', '이웃 26가구', () => S.houses >= 26],
  ['married', '결혼', () => S.spouse != null],
  ['kid', '첫 아이', () => S.kids >= 1],
  ['kids-3', '아이 셋', () => S.kids >= 3],
  ['chickens', '닭 6마리', () => S.chickens >= 6],
  ['cows', '소 3마리', () => S.cows >= 3],
  ['dog', '강아지', () => S.dog],
  ['golden', '황금 작물', () => S.golden >= 1],
  ['outfits', '옷 5벌', () => S.owned.length >= 5],
  ['crown', '왕관', () => S.owned.includes('hat-crown')],
  ...ERAS.slice(1).map((e, i) => [`era-${i + 1}`, e.name, () => S.era >= i + 1]),
  ...LANDMARKS.map((l) => [`lm-${l.id}`, l.name, () => has(l.id)]),
  ['days-30', '30일 생존', () => S.age >= 30],
  ['level-20', 'Lv.20', () => levelOf(S.xp) >= 20],
];
function checkAchievements() {
  if (MODE !== 'life') return;
  for (const [id, name, ok] of ACHIEVEMENTS)
    if (!S.ach.includes(id) && ok()) {
      S.ach.push(id);
      story(`🏅 업적 달성: ${name}`);
    }
}
/** Everyone who lives here, counted the way spawnFamily() puts them in town: you, your spouse and children, two
 *  per lived-in house (and the grandparent in some), and the residents you invited. Visiting friends aren't counted. */
const population = () => {
  let n = 1 + (S.spouse != null ? 1 : 0) + S.kids + (S.folk ?? 0);
  for (let i = 0; i < occupied(); i++) if (i !== S.spouse) n += 2 + (hasElder(i) ? 1 : 0);
  return n;
};

/** Something new the pocket money covers (cheapest first), or null. */
const shopPick = () =>
  CATALOG.filter((i) => !S.owned.includes(i.id) && i.price <= S.pocket).sort((a, b) => a.price - b.price)[0] ?? null;

// ── Traits: born with them; some lives are easy, some are hard ────────────────────────────────────────────────────

const TRAITS = [
  ['health', '체력'],
  ['green', '손재주'],
  ['charm', '매력'],
  ['trade', '장사'],
  ['luck', '행운'],
];
const roll = () => 1 + Math.floor(Math.random() * 5);
const rollTraits = (parent) =>
  Object.fromEntries(
    TRAITS.map(([k]) => [k, parent ? Math.max(1, Math.min(5, Math.round((parent[k] + roll()) / 2))) : roll()]),
  );
const trait = (k) => S.traits?.[k] ?? 3;
const growMul = () => 0.6 + trait('green') * 0.15; //  0.75 … 1.35
const priceMul = () => 0.7 + trait('trade') * 0.15; // 0.85 … 1.45
const goldenChance = () => 0.01 + trait('luck') * 0.025; // 3.5 % … 13.5 %

/** A new day for the protagonist: getting older, maybe falling ill, maybe not getting up again. */
function liveADay() {
  S.age++;
  S.kidAges = S.kidAges.map((a, i) => {
    const who = ['첫째', '둘째', '셋째'][i] ?? '아이';
    const age = a + 1;
    if (age === 3) story(`${who}가 첫걸음마를 뗐어요!`);
    if (age === 7) story(`${who}가 ${S.era >= 3 ? '학교' : S.era >= 1 ? '서당' : '숲속 놀이터'}에 다니기 시작했어요.`);
    if (age === 14) {
      const t = S.kidTraits[i];
      const best = t && TRAITS.reduce((m, x) => (t[x[0]] > t[m[0]] ? x : m));
      const parent = S.gender === 'f' ? '엄마' : '아빠';
      const like = best && S.traits && S.traits[best[0]] >= t[best[0]] ? `${parent}를 닮아 ` : '';
      story(`${who}가 어른이 됐어요. ${best ? `${like}${best[1]}이(가) 뛰어나요.` : ''} 이제 농사를 도와줘요.`);
    }
    return age;
  });
  if (S.dog) {
    S.dogAge++;
    if (S.dogAge === 5) story('강아지가 쑥 자라서 듬직한 개가 됐어요.');
  }
  // Yesterday without work: the family missed you.
  if (S.dayEarned >= 1) lifeCount('worked');
  if (S.dayEarned < 1) {
    // A loner minds a quiet day less; the gentle take it in their stride.
    S.happy = Math.max(0, S.happy - (S.temper === 'loner' ? 7 : S.temper === 'gentle' ? 11 : 15));
    if (S.happy < 30 && (S.spouse != null || S.kids)) story('가족이 요즘 외로워해요. 조금 더 같이 일해 볼까요?');
  }
  familyMoment();
  const h = trait('health');
  if (S.sickDays > 0) {
    S.sickDays--;
    // Old and frail: a hard illness can be the last one.
    const risk = ([0, 0.07, 0.035, 0.015, 0.006, 0.003][h] + Math.max(0, S.age - 60) * 0.01) * (has('hospital') ? 0.5 : 1);
    if (Math.random() < risk) return die('병을 이기지 못하고');
    if (S.sickDays === 0) story('몸이 다 나았어요. 다시 일하러 나가요.');
    return;
  }
  const ill = ([0, 0.22, 0.14, 0.08, 0.04, 0.02][h] + Math.max(0, S.age - 45) * 0.01) * (has('hospital') ? 0.5 : 1);
  if (Math.random() < ill) {
    S.sickDays = 1 + Math.floor(Math.random() * (7 - h));
    story(h <= 2 ? '몸이 약해서 또 앓아누웠어요…' : '감기에 걸려 며칠 쉬어야 해요.');
  }
}

/** Small things the family does on its own, now and then. */
function familyMoment() {
  if (Math.random() > 0.35) return;
  const kids = S.kidAges.map((a, i) => ({ a, who: ['첫째', '둘째', '셋째'][i] }));
  const options = [];
  const small = kids.filter((k) => k.a >= 3 && k.a < 14);
  if (small.length) {
    const k = small[Math.floor(Math.random() * small.length)];
    options.push(`${k.who}가 혼자 닭 모이를 줬어요.`, `${k.who}가 강가에서 예쁜 돌을 주워 왔어요.`, `${k.who}가 이웃집 아이랑 하루 종일 뛰어놀았어요.`);
  }
  if (S.dog) options.push('강아지가 밭에 구멍을 파 놨어요… 그래도 귀여워요.', '강아지가 도둑고양이를 쫓아냈어요.');
  if (S.spouse != null) options.push(`${FAMILIES[S.spouse].single}이(가) 저녁을 맛있게 해 줬어요.`, `${FAMILIES[S.spouse].single}와(과) 광장에서 산책했어요.`);
  if (options.length) story(options[Math.floor(Math.random() * options.length)]);
}

/** Now and then something goes missing: coins, a hen, the ripe crops. Bigger towns tempt more; luck helps. */
function crime() {
  const chance = (0.04 + S.houses * 0.002 - trait('luck') * 0.006 - (has('temple') ? 0.02 : 0)) * (has('castle') ? 0.5 : 1) * tellerMul();
  if (Math.random() >= chance) return;
  const r = Math.random();
  const ripe = S.plots.filter((p) => p.planted && p.g >= GROW);
  if (r < 0.2 && S.chickens > 0) {
    S.chickens--;
    story('밤사이 닭 도둑이 들었어요. 닭 한 마리가 사라졌어요.');
    spawnAnimals();
  } else if (r < 0.45 && ripe.length) {
    for (const p of ripe) Object.assign(p, { planted: false, g: 0 });
    story(`누군가 밭을 서리해 갔어요. 다 익은 ${era().crop} ${ripe.length}개가 없어졌어요.`);
  } else {
    const lost = Math.floor(S.coins * (0.1 + Math.random() * 0.15));
    if (lost < 1) return;
    S.coins -= lost;
    story(S.era === 5 ? `해킹을 당했어요! 🪙${fmt(lost)}이 빠져나갔어요.` : `도둑이 들어 🪙${fmt(lost)}을 훔쳐 갔어요.`);
  }
  cache.dirty = true;
  thief = make('thief', [0, ROAD_Y], { speed: 3 });
  route(thief, [COLS - 1, ROAD_Y]);
  thief.x = me.x - VIEW_W / 2 - 10;
}
let thief = null;

/** Now and then a neighbouring land attacks. Won: a scare. Lost: houses fall, families flee, the town rebuilds. */
function war() {
  if (S.era < 1 || S.houses < 3) return;
  const chance = (0.015 + S.houses * 0.0008) * (has('castle') ? 0.5 : 1) * tellerMul();
  if (Math.random() >= chance) return;
  S.wars++;
  const enemy = S.era === 5 ? '로봇 군단' : ['', '이웃 부족', '기사단', '외국 군대', '외국 군대'][S.era];
  const defend = 0.25 + S.era * 0.08 + (has('castle') ? 0.25 : 0);
  if (Math.random() < defend) {
    const lost = Math.floor(S.coins * 0.05);
    S.coins -= lost;
    story(`⚔️ ${enemy}이(가) 쳐들어왔지만 마을이 힘을 모아 막아 냈어요!${lost ? ` (전쟁 비용 🪙${fmt(lost)})` : ''}`);
    return;
  }
  const fall = Math.max(1, Math.round(S.houses * (0.2 + Math.random() * 0.2)));
  for (let i = S.houses - fall; i < S.houses; i++) collapseLot(i); // they come down where you can see
  const lost = Math.floor(S.coins * 0.3);
  S.houses -= fall;
  S.ruins += fall;
  S.coins -= lost;
  S.friends.length = Math.max(S.houses, S.spouse != null ? S.spouse + 1 : 0);
  story(`🔥 ${enemy}과(와)의 전쟁에서 졌어요. 집 ${fall}채가 무너지고 그 가족들은 피난을 떠났어요. 🪙${fmt(lost)}을 빼앗겼어요. 다시 일으켜 세워야 해요.`);
  cache.dirty = true;
  spawnFamily();
}

const occupied = () => S.houses - S.vacant;

/** Sometimes a sickness goes round: families leave, you may fall ill. A hospital halves it. */
function epidemic() {
  if (S.houses < 3) return;
  const care = has('hospital') ? 0.5 : 1;
  if (Math.random() >= (0.012 + S.houses * 0.0005) * care * tellerMul()) return;
  const name = S.era === 5 ? '신종 바이러스' : '역병';
  const left = Math.max(1, Math.round(occupied() * (0.15 + Math.random() * 0.15) * care));
  const before = occupied();
  S.vacant = Math.min(S.houses, S.vacant + left);
  // One from each family that leaves didn't make it: a grave where they stood.
  for (let i = occupied(); i < before; i++) {
    const p = people.find((e) => e.home === i && !e.small);
    if (p) tomb(p.x, p.y);
  }
  S.plagueUntil = Date.now() + 15 * 60_000; // for a while, the sick walk about green-faced
  S.happy = Math.max(0, S.happy - 20);
  let me = '';
  if (Math.random() < 0.5 * care) {
    S.sickDays = Math.max(S.sickDays, 2 + Math.floor(Math.random() * 3));
    me = ' 나도 옮아서 앓아누웠어요.';
  }
  story(`😷 ${name}이 돌았어요. 몇몇은 세상을 떠났고 ${left}가구가 마을을 떠나 빈집이 생겼어요.${me}`);
  cache.dirty = true;
  spawnFamily();
}

/** The protagonist is gone: that's the end of this town. Its record stays on screen until you start again. */
function die(how) {
  tomb(me.x, me.y);
  photoSoon('마지막 날');
  story(`${how} 세상을 떠났어요. 이 마을의 이야기는 여기까지예요.`);
  S.over = {
    days: S.age,
    era: era().name,
    houses: S.houses,
    family: 1 + (S.spouse != null ? 1 : 0) + S.kids,
    level: levelOf(S.xp),
  };
  S.sickDays = 0;
}

// ── Level: everything you earn and do is experience ────────────────────────────────────────────────────────────────

const levelOf = (xp) => Math.floor(Math.sqrt(xp / 15)) + 1;
const xpFor = (level) => (level - 1) ** 2 * 15;
function gainXp(n) {
  const before = levelOf(S.xp);
  S.xp += n * learnMul();
  const after = levelOf(S.xp);
  if (after > before) story(`레벨이 올랐어요! 이제 Lv.${after}이에요.`);
}
let S = fresh();

const today = () => new Date().toLocaleDateString('sv');
const SEASONS = ['봄', '여름', '가을', '겨울'];
/** A season a week (Claude's weekly limit resets weekly too): spring, summer, autumn, winter, again. */
const seasonNow = () => Math.floor((Date.now() / 86_400_000 + 3) / 7) % 4;

function tickDay() {
  if (MODE !== 'life') return;
  if (S.lastDay === today()) return;
  const first = !S.lastDay;
  S.lastDay = today();
  S.days++;
  if (first) return;
  if (S.dayEarned >= 1)
    S.story.unshift({
      day: S.days - 1,
      text: `하루 동안 🪙${fmt(S.dayEarned)}을 벌었어요.${(S.jobToday ?? 0) >= 1 ? ` 그중 직업 수입이 ${fmt(S.jobToday)}이에요.` : ''}`,
    });
  S.jobToday = 0;
  if (S.traits && !S.over) merchantRoll();
  if (S.traits && !S.over) {
    liveADay();
    if (!S.over) crime();
    if (!S.over) war();
    if (!S.over) epidemic();
    if (!S.over) crows();
    if (!S.over) wishDaily();
    if (!S.over) villageDay();
    if (!S.over && S.days % YEAR_DAYS === 0) awards();
  }
  S.dayEarned = 0;
}

function checkSeason() {
  const now = seasonNow();
  if (now === S.season) return;
  const firstLook = S.season < 0;
  S.season = now;
  cache.dirty = true;
  if (firstLook) return;
  S.festival = today();
  story(`${SEASONS[now]}이 왔어요! 광장에서 ${SEASONS[now]} 축제가 열려요.`);
}
const festivalToday = () => S.festival === today();
function story(text) {
  tickDay();
  S.story.unshift({ day: S.days, text, t: Date.now() });
  chronicle(text);
  S.story.length = Math.min(S.story.length, 40);
}

let saveTimer = 0;
function save() {
  if (MODE !== 'life') return; // a sandbox or a friend's town is never saved; the life town is safe
  clearTimeout(saveTimer);
  // The life town as it is now: if a visit or chaos swaps S in the meantime, it's still this one that's written.
  const town = S;
  saveTimer = setTimeout(() => void aquila.storage.set('save', town).catch(() => {}), 800);
}

// ── Economy: usage → coins, growth, animals' produce, babies ──────────────────────────────────────────────────────

function absorb(list) {
  if (MODE !== 'life') return 0; // counted when you're back (the baseline lives in the life town)
  if (!Array.isArray(list) || S.over) return 0;
  let gain = 0;
  for (const u of list) {
    const key = `${u.account}:${u.kind}`;
    const prev = S.usage[key];
    const cur = { w: u.weekly ?? null, h: u.fiveHour ?? null };
    if (prev) {
      if (cur.w != null && prev.w != null) gain += Math.max(0, cur.w - prev.w) * COINS_PER_WEEKLY_PCT;
      else if (cur.h != null && prev.h != null) gain += Math.max(0, cur.h - prev.h) * COINS_PER_5H_PCT;
    }
    S.usage[key] = cur;
  }
  gain = Math.round(gain * 10) / 10;
  if (gain <= 0) return 0;
  // Eggs and milk: the animals earn a little alongside you.
  // Grown-up children help on the farm: 5 % more each.
  const grown = S.kidAges.filter((a) => a >= 14).length;
  const produce =
    gain *
    (0.1 * S.chickens + 0.25 * S.cows + 0.12 * S.sheep + 0.15 * S.pigs + 0.1 * S.goats + 0.12 * S.horses +
      0.14 * S.alpacas + 0.1 * (S.donkeys ?? 0) + 0.08 * (S.turkeys ?? 0) + 0.05 * grown + (has('factory') ? 0.1 : 0) + farmProduce());
  // On top: pay from your job (era × how well your traits fit it) and the neighbours' jobs' tax.
  const jobIncome = gain * (myPay() + townPay());
  S.jobToday = (S.jobToday ?? 0) + jobIncome;
  S.happy = Math.min(100, S.happy + gain * 0.6);
  S.pocket += (gain + produce + jobIncome) * POCKET_SHARE;
  S.coins += (gain + produce + jobIncome) * (1 - POCKET_SHARE);
  S.dayEarned += gain + produce + jobIncome;
  gainXp(gain);
  const rainBoost = raining() ? 1.25 : 1;
  for (const p of S.plots) if (p.planted) p.g = Math.min(GROW, p.g + gain * growMul() * rainBoost * farmGrowMul());
  passiveGathering(gain);
  if (S.spouse) {
    S.sinceKid += gain;
    const every = S.happy >= 70 ? KID_EVERY * 0.7 : KID_EVERY;
    while (S.sinceKid >= every && S.kids < MAX_KIDS) {
      S.sinceKid -= every;
      S.kidTraits.push(rollTraits(S.traits ?? undefined));
      S.kids++;
      S.kidAges.push(0);
      story(`아기가 태어났어요! 우리 가족은 이제 ${2 + S.kids}명이에요.`);
      photoSoon('아기가 태어난 날');
      spawnFamily();
    }
  }
  return gain + produce;
}

// ── Map: 120 × 12 tiles of 16 px (eight views wide); the view (15 × 12) follows you along it ────────────────────
// Your home is mid-town; the farm, pond, shop, pen, square and lake are around it, woods and meadows further out.

const COLS = 225; // fifteen views wide; the view follows you (or your drag)
const ROWS = 12;
const T = 16;
const W = COLS * T;
const H = ROWS * T;
const VIEW_W = 15 * T;
const ROAD_Y = 6;
const HOME = { x: 58, w: 3 }; // yours: 3 tiles wide
// Neighbours' houses: 2 tiles wide, above the road, filled nearest to your home first.
const LOT_X = Array.from({ length: Math.floor((COLS - 2) / 3) }, (_, i) => 1 + i * 3)
  .filter((x) => x + 1 < HOME.x - 1 || x > HOME.x + HOME.w)
  .sort((a, b) => Math.abs(a - HOME.x) - Math.abs(b - HOME.x))
  .slice(0, LOTS);
// Up to 24 fields (x 43–50, rows 8–10), filled from the pond side outward as the farm grows.
const PLOT_AT = [50, 49, 48, 47, 46, 45, 44, 43].flatMap((x) => [8, 9, 10].map((y) => [x, y]));
const POND = { x: 52, y: 8, w: 3, h: 2 };
const STALL = [56, 7];
const PEN = { x: 62, y: 7, w: 8, h: 4 };
const PEN_GATE = [65, ROAD_Y];
const PLAZA = { x: 71, y: 8 };
const LAKE = { x: 77, y: 8, w: 9, h: 3 };
const GROVES = [
  { x: 11, w: 27 },
  { x: 87, w: 33 },
];
const MINE = { x: 1, y: 7, w: 9, h: 3 }; // a rocky hill with the mine, west end
const STORE = { x: 57, y: 9 }; //           the town store (logs and stones)

const doorOf = (i) => [lotX(i), ROAD_Y];
const HOME_DOOR = [HOME.x + 1, ROAD_Y];
const STALL_SPOT = [STALL[0], ROAD_Y];

// ── Tasks: what you do next ────────────────────────────────────────────────────────────────────────────────────────

const fmt = (n) => Math.floor(n).toLocaleString('ko');
const era = () => ERAS[S.era];
const plotSpot = (i) => [PLOT_AT[i][0], PLOT_AT[i][1] - 1];

function nextTask() {
  if (MODE !== 'life') return null; // visiting: just a stroll
  if (!S.gender || S.over || S.sickDays > 0) return null;
  const ripe = S.plots.findIndex((p) => p.planted && p.g >= GROW);
  if (ripe >= 0) return { to: plotSpot(ripe), tool: 'basket', what: `${era().crop} 수확`, act: () => harvest(ripe) };
  const keep = keepTask(); // a neighbour about to move away (village.js)
  if (keep) return keep;
  if (S.bag >= 4 || (S.bag > 0 && !S.plots.some((p) => !p.planted)))
    return { to: STALL_SPOT, tool: 'coin', what: '가게에 작물 팔기', act: sell };
  const lm = nextLandmark();
  if (lm && S.coins >= lm.cost && haveMaterials(materialsFor('landmark', lm))) return { to: [lm.x + Math.floor(lm.w / 2), ROAD_Y], tool: 'hammer', what: `${lm.name} 짓기`, act: () => raise(lm) };
  const next = ERAS[S.era + 1];
  if (next && !lm && S.coins >= next.cost && haveMaterials(materialsFor('era')) && occupied() >= Math.min(houseCap(), (S.era + 1) * 2))
    return { to: HOME_DOOR, tool: 'hammer', what: `${next.name}로 발전`, act: advance };
  if (S.houses < houseCap() && wantClearing() && S.coins >= clearCost()) {
    const c = clearable();
    return { to: [c.x + 4, ROAD_Y + 1], tool: 'axe', what: '숲 개간하기', act: clearWoods };
  }
  if (S.vacant > 0 && S.coins >= Math.ceil(buildCost(occupied()) / 2))
    return { to: doorOf(occupied()), tool: 'heart', what: '빈집에 새 가족 맞이하기', act: welcome };
  if (S.houses < houseCap() && S.coins >= buildCost(S.houses) && haveMaterials(materialsFor('house', S.houses)))
    return { to: doorOf(S.houses), tool: 'hammer', what: S.ruins ? '무너진 집 다시 짓기' : '새 집 짓기', act: build };
  if (S.chickens < MAX_CHICKENS && S.coins >= 20) return { to: PEN_GATE, tool: 'heart', what: '닭 들이기', act: buyChicken };
  if (S.era >= 1 && S.cows < MAX_COWS && S.coins >= 70) return { to: PEN_GATE, tool: 'heart', what: '소 들이기', act: buyCow };
  if (S.era >= 1 && S.sheep < 3 && S.coins >= 45) return { to: PEN_GATE, tool: 'heart', what: '양 들이기', act: () => buyAnimal('sheep', 45, '양') };
  const up = farmPick();
  if (up) return { to: [FARM.x + 7, 7], tool: 'hammer', what: `농장에 ${up.name} 들이기`, act: () => farmBuy(up) };
  if (S.era >= 4 && S.alpacas < 2 && S.coins >= 120) return { to: PEN_GATE, tool: 'heart', what: '알파카 들이기', act: () => buyAnimal('alpacas', 120, '알파카') };
  if (S.goats < 3 && S.coins >= 35) return { to: PEN_GATE, tool: 'heart', what: '염소 들이기', act: () => buyAnimal('goats', 35, '염소') };
  if (S.era >= 1 && S.horses < 2 && S.coins >= 80) return { to: PEN_GATE, tool: 'heart', what: '말 들이기', act: () => buyAnimal('horses', 80, '말') };
  if (S.era >= 2 && S.pigs < 2 && S.coins >= 55) return { to: PEN_GATE, tool: 'heart', what: '돼지 들이기', act: () => buyAnimal('pigs', 55, '돼지') };
  if (S.era >= 1 && (S.donkeys ?? 0) < 1 && S.coins >= 60) return { to: PEN_GATE, tool: 'heart', what: '당나귀 들이기', act: () => buyAnimal('donkeys', 60, '당나귀') };
  if (S.era >= 2 && (S.turkeys ?? 0) < 2 && S.coins >= 40) return { to: PEN_GATE, tool: 'heart', what: '칠면조 들이기', act: () => buyAnimal('turkeys', 40, '칠면조') };
  const empty = S.plots.findIndex((p) => !p.planted);
  if (empty >= 0 && S.coins >= SEED) return { to: plotSpot(empty), tool: 'hoe', what: '씨앗 심기', act: () => plant(empty) };
  if (!S.dog && levelOf(S.xp) >= 3) return { to: HOME_DOOR, tool: 'heart', what: '강아지 입양', act: adoptDog };
  const ware = merchantPick();
  if (ware) return { to: [PLAZA.x + 4, PLAZA.y + 1], tool: 'sparkle', what: `떠돌이 상인에게서 ${ware.name} 사기`, act: () => merchantBuy(ware) };
  const item = shopPick();
  if (item) return { to: STALL_SPOT, tool: 'sparkle', what: `옷가게에서 ${item.name} 사기`, act: () => buy(item) };
  const ride = rideTask(); // this era's ride, when there's plenty to spare (rides.js)
  if (ride) return ride;
  // Your job, when there's nothing more pressing (only while you're watching: off screen nobody walks).
  const mine = myJob();
  if (mine && live() && Math.random() < 0.45)
    return { to: jobPlace(me, mine), tool: mine.tool ?? 'sparkle', what: `${mine.name}로 일하기`, act: () => jobDone(mine), job: true };
  const f = S.friends.findIndex((x, i) => i < occupied() && x && x.day !== today() && i !== S.spouse);
  if (f >= 0) return { to: doorOf(f), tool: 'talk', what: `${FAMILIES[f].family}에 놀러 가기`, act: () => visit(f) };
  return null;
}

function welcome() {
  const i = occupied();
  S.coins -= Math.ceil(buildCost(i) / 2);
  S.vacant--;
  S.friends[i] = i === S.spouse ? S.friends[i] : { f: 0, day: '' };
  story(`빈집에 ${FAMILIES[i].family} 가족이 새로 이사 왔어요.`);
  cache.dirty = true;
  spawnFamily();
}
function raise(lm) {
  useMaterials(materialsFor('landmark', lm));
  openSite(lm.x, lm.w);
  S.coins -= lm.cost;
  S.landmarks.push(lm.id);
  photoSoon(`${lm.name}을(를) 지은 날`);
  cache.dirty = true;
  if (lm.id === 'rocket') {
    S.launched = true;
    story('🚀 로켓이 하늘로 날아올랐어요! 원시의 움막에서 시작한 마을이 우주까지 닿았어요. (엔딩) 마을의 하루는 계속돼요.');
  } else story(`${lm.name}을(를) 지었어요. ${lm.does}.`);
}
function buy(item) {
  S.pocket -= item.price;
  S.owned.push(item.id);
  S.style[item.kind] = item.value;
  story(`옷가게에서 ${item.name}을(를) 샀어요. 바로 바꿔 봤어요!`);
}
function adoptDog() {
  S.dog = true;
  S.dogBreed = pickBreed();
  story(`떠돌이 ${dogBreed().name} 강아지를 입양했어요. 어디든 졸졸 따라와요.`);
  spawnFamily();
}
function harvest(i) {
  S.plots[i] = { planted: false, g: 0 };
  if (Math.random() < goldenChance()) {
    S.bag += 3;
    if (++S.golden === 1) story(`황금빛 ${era().crop}이(가) 열렸어요! 세 배로 수확했어요.`);
  } else S.bag++;
  if (++S.harvested === 1) story(`처음으로 ${era().crop}을(를) 수확했어요.`);
  cache.dirty = true;
}
function sell() {
  S.coins += Math.round(S.bag * era().price * priceMul() * farmPriceMul() * (S.temper === 'trader' ? 1.05 : 1));
  S.bag = 0;
}
function advance() {
  useMaterials(materialsFor('era'));
  S.coins -= ERAS[S.era + 1].cost;
  S.era++;
  story(`마을이 ${era().name}로 발전했어요. 이제 나는 '${era().title}'!`);
  photoSoon(`${era().name} 시대가 열린 날`);
  updateMyJob();
  const newJobs = JOBS.filter((j) => j.era === S.era).map((j) => j.name);
  story(`새 직업이 생겼어요: ${newJobs.join(', ')}. 이웃들이 하나둘 일을 바꿔요.`);
  spawnFamily();
  cache.dirty = true;
  spawnCars();
}
function build(withMats = true) {
  const i = S.houses;
  if (withMats) useMaterials(materialsFor('house', i));
  S.coins -= buildCost(i);
  S.houses++;
  if (S.ruins > 0) S.ruins--;
  openSite(lotX(i));
  if (S.friends.length <= i) S.friends.push({ f: 0, day: '' });
  else S.friends[i] = i === S.spouse ? S.friends[i] : { f: 0, day: '' };
  story(`${FAMILIES[i].family} 가족이 ${S.ruins ? '다시 지은' : '새'} 집으로 이사 왔어요.`);
  cache.dirty = true;
  spawnFamily();
}
function buyChicken() {
  S.coins -= 20;
  if (++S.chickens === 1) story('닭장을 짓고 닭을 키우기 시작했어요.');
  spawnAnimals();
  cache.dirty = true;
}
function buyCow() {
  S.coins -= 70;
  if (++S.cows === 1) story('외양간에 소가 들어왔어요. 우유가 나와요.');
  spawnAnimals();
  cache.dirty = true;
}
function buyAnimal(key, cost, name) {
  S.coins -= cost;
  S[key] = S[key] ?? 0;
  if (++S[key] === 1) story(`목장에 ${name}을(를) 들였어요.`);
  wishDone('animal', key);
  spawnAnimals();
}
function plant(i) {
  S.coins -= SEED;
  S.plots[i] = { planted: true, g: 0 };
  cache.dirty = true;
}
function visit(i) {
  const fr = S.friends[i];
  fr.day = today();
  tickDay();
  const charm = trait('charm') >= 4 ? 1 : 0;
  if (S.bag > 0 && fr.f < MAX_FRIEND) {
    S.bag--;
    fr.f = Math.min(MAX_FRIEND, fr.f + 2 + charm);
  } else fr.f = Math.min(MAX_FRIEND, fr.f + 1 + (trait('charm') === 5 || S.temper === 'chatty' ? 1 : 0));
  lifeCount('visits');
  const who = FAMILIES[i].single;
  if (fr.f >= MAX_FRIEND && S.spouse == null) {
    S.spouse = i;
    S.sinceKid = 0;
    story(`${who}와(과) 결혼했어요! 이제 한 집에 살아요.`);
    photoSoon(`${who}와(과) 결혼한 날`);
    spawnFamily();
    return `${who}: "평생 함께해요."`;
  }
  const tier = fr.f >= 7 ? 'high' : fr.f >= 3 ? 'mid' : 'low';
  return `${who}: "${LINES[tier][Math.floor(Math.random() * LINES[tier].length)]}"`;
}

/** The next big thing coins are saved for: a house, then the next era. */
function nextGoal() {
  const lm = nextLandmark();
  if (lm) return { what: `${lm.name} 짓기 (${lm.does})`, cost: lm.cost, mat: materialsFor('landmark', lm) };
  const next = ERAS[S.era + 1];
  const needHouses = next ? Math.min(houseCap(), (S.era + 1) * 2) : 0;
  const house = { what: '새 집 짓기', cost: buildCost(S.houses), mat: materialsFor('house', S.houses) };
  if (S.houses < houseCap() && (!next || S.houses < needHouses)) return house;
  if (next) return { what: `${next.name}로 발전`, cost: next.cost, mat: materialsFor('era') };
  if (S.houses < houseCap()) return house;
  return null;
}

/** Off screen / power saver: everything pending happens at once. */
function catchUp() {
  for (let t = nextTask(), n = 0; t && n < 60; t = nextTask(), n++) {
    const before = S.coins;
    t.act();
    if (S.coins < before) lifeCount('spent', before - S.coins);
    gainXp(3);
  }
}

// ── Pixel helpers ──────────────────────────────────────────────────────────────────────────────────────────────────

const OL = '#4a3a40'; // outline: a soft plum, not black

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function R(g, x, y, w, h, c) {
  g.fillStyle = c;
  g.fillRect(Math.round(x), Math.round(y), w, h);
}
/** A rectangle with a 1 px outline. */
function box(g, x, y, w, h, fill, line = OL) {
  R(g, x, y, w, h, line);
  R(g, x + 1, y + 1, w - 2, h - 2, fill);
}
/** A crisp pixel disc (no anti-aliasing). */
function disc(g, cx, cy, r, c) {
  g.fillStyle = c;
  for (let dy = -r; dy <= r; dy++) {
    const dx = Math.floor(Math.sqrt(r * r - dy * dy) + 0.3);
    g.fillRect(Math.round(cx - dx), Math.round(cy + dy), dx * 2 + 1, 1);
  }
}
/** A triangle roof, filled row by row, with shingle lines and an outline. */
function gable(g, x, y, w, h, fill, line) {
  for (let j = 0; j < h; j++) {
    const half = Math.round(((j + 1) / h) * (w / 2));
    const cx = x + w / 2;
    R(g, cx - half - 1, y + j, half * 2 + 2, 1, OL);
    if (j > 0) R(g, cx - half, y + j, half * 2, 1, j % 3 === 0 ? line : fill);
  }
  R(g, x - 1, y + h, w + 2, 1, OL);
}

// ── The still picture: drawn into a cache when something changes ──────────────────────────────────────────────────

const canvas = document.getElementById('world');
/** Whole-number scale only, so every pixel stays a crisp square. */
let scale = 1;
function fitCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const card = canvas.closest('.town');
  const boxW = card ? card.clientWidth - 16 : VIEW_W;
  // As wide as the panel, but never taller than the window leaves room for (a small panel shrinks the town);
  // always the town's 5:4 shape.
  const tall = window.innerHeight;
  const maxH = tall <= 420 ? Math.max(90, tall - 96) : Math.max(140, tall * 0.62);
  const cssW = Math.min(boxW, (maxH * VIEW_W) / H);
  // Drawn at the whole-number scale nearest to what's shown, so pixels stay as square as they can.
  scale = Math.max(1, Math.round((cssW * dpr) / VIEW_W));
  if (canvas.width !== VIEW_W * scale) {
    canvas.width = VIEW_W * scale;
    canvas.height = H * scale;
  }
  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${(cssW * H) / VIEW_W}px`;
}
fitCanvas();
let camX = (HOME.x + 1.5) * T - VIEW_W / 2; // starts at home
const ctx = canvas.getContext('2d');
const cache = { canvas: document.createElement('canvas'), dirty: true };
cache.canvas.width = W;
cache.canvas.height = H;

const GRASS = [
  ['#7cbd56', '#6eae4b', '#88c962', '#5f9c42'],
  ['#80bb55', '#72ad4a', '#8cc660', '#649a43'],
  ['#78b552', '#6aa548', '#84c15c', '#5c9540'],
  ['#74ae52', '#679f48', '#80ba5c', '#57903f'],
  ['#77b257', '#69a34d', '#83be61', '#5a9444'],
  ['#6fb28a', '#62a37c', '#7cc098', '#558f6c'],
];

const isNight = () => {
  if (typeof window.__night === 'boolean') return window.__night; // tests
  const h = new Date().getHours();
  return h >= 19 || h < 6;
};
let night = isNight();

/** The ground's four greens, tinted by season (winter is snow). */
function groundColours() {
  const season = Math.max(0, S.season);
  if (season === 3) return ['#eef2f5', '#dfe6ec', '#ffffff', '#c9d3dc'];
  const [base, dark, light, tuft] = GRASS[S.era];
  if (season === 1) return [base, dark, light, tuft].map((c) => mix(c, '#3f8f3a', 0.2));
  if (season === 2) return [base, dark, light, tuft].map((c) => mix(c, '#c9a23a', 0.38));
  return [base, dark, light, tuft];
}
function mix(a, b, t) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (sh) => Math.round(((pa >> sh) & 255) * (1 - t) + ((pb >> sh) & 255) * t);
  return `#${[16, 8, 0].map((sh) => ch(sh).toString(16).padStart(2, '0')).join('')}`;
}


function drawRoad(g) {
  const y = ROAD_Y * T;
  const r = rng(11);
  const surface = [
    () => {
      R(g, 0, y + 1, W, T - 2, '#b88d5d');
      for (let i = 0; i < 1100; i++) R(g, r() * W, y + 2 + r() * 12, 1, 1, r() < 0.5 ? '#a67b4d' : '#c9a170');
      for (let i = 0; i < 18; i++) R(g, r() * W, y + 3 + r() * 10, 2, 1, '#8f6a43');
    },
    () => {
      R(g, 0, y + 1, W, T - 2, '#dcc392');
      for (let i = 0; i < 140; i++) R(g, r() * W, y + 2 + r() * 12, 1, 1, r() < 0.5 ? '#c9ad78' : '#ead6ad');
    },
    () => {
      R(g, 0, y + 1, W, T - 2, '#8f8f97');
      for (let row = 0; row < 3; row++)
        for (let x = -((row * 3) % 6); x < W; x += 6) box(g, x, y + 2 + row * 4, 6, 4, row % 2 ? '#a9a9b2' : '#b5b5bd', '#76767f');
    },
    () => {
      R(g, 0, y + 1, W, T - 2, '#7c3a30');
      for (let row = 0; row < 4; row++)
        for (let x = row % 2 ? -3 : 0; x < W; x += 7) R(g, x, y + 2 + row * 3, 6, 2, row % 2 ? '#b25a45' : '#a44e3c');
    },
    () => {
      R(g, 0, y, W, 2, '#c8c8cc');
      R(g, 0, y + 14, W, 2, '#c8c8cc');
      R(g, 0, y + 2, W, 12, '#4a4e57');
      for (let i = 0; i < 80; i++) R(g, r() * W, y + 3 + r() * 10, 1, 1, '#555a64');
      for (let x = 2; x < W; x += 10) R(g, x, y + 7, 5, 1, '#f2f2f2');
    },
    () => {
      R(g, 0, y, W, 2, '#7fe7f5');
      R(g, 0, y + 14, W, 2, '#7fe7f5');
      R(g, 0, y + 2, W, 12, '#232a3d');
      for (let x = 0; x < W; x += 8) R(g, x, y + 7, 4, 1, '#5ad7e8');
    },
  ][S.era];
  surface();
  if (S.era < 4) {
    R(g, 0, y, W, 1, 'rgba(60, 40, 20, 0.35)');
    R(g, 0, y + T - 1, W, 1, 'rgba(60, 40, 20, 0.35)');
  }
}



function fence(g) {
  const x0 = PEN.x * T;
  const y0 = PEN.y * T + 2;
  const x1 = (PEN.x + PEN.w) * T - 1;
  const y1 = (PEN.y + PEN.h) * T - 2;
  const wood = '#9a6a3c';
  for (const yy of [y0, y1]) {
    R(g, x0, yy + 2, x1 - x0, 2, OL);
    R(g, x0, yy + 2, x1 - x0, 1, wood);
  }
  for (const xx of [x0, x1]) {
    R(g, xx, y0 + 2, 2, y1 - y0, OL);
    R(g, xx, y0 + 2, 1, y1 - y0, wood);
  }
  for (let x = x0; x <= x1; x += 8) for (const yy of [y0, y1]) box(g, x - 1, yy - 1, 3, 7, '#b07a46');
  for (let y = y0; y <= y1; y += 8) for (const xx of [x0, x1]) box(g, xx - 1, y - 1, 3, 7, '#b07a46');
  if (S.chickens > 0) {
    // Coop in the corner.
    const cx = x1 - 22;
    const cy = y0 + 4;
    box(g, cx, cy + 6, 16, 10, '#c98d4b');
    gable(g, cx - 1, cy, 18, 7, '#a8453a', '#8a3a30');
    R(g, cx + 6, cy + 10, 4, 6, '#4a2f1f');
  }
}

function plots(g) {
  S.plots.forEach((p, i) => {
    const [tx, ty] = PLOT_AT[i];
    const x = tx * T;
    const y = ty * T;
    box(g, x + 1, y + 1, T - 2, T - 2, S.era === 5 ? '#2e3a52' : '#7a5232', S.era === 5 ? '#5ad7e8' : '#5a3a22');
    for (const fy of [5, 9, 13]) R(g, x + 3, y + fy, T - 6, 1, S.era === 5 ? '#3c4c68' : '#68442a');
    if (!p.planted) return;
    const stage = p.g >= GROW ? 3 : p.g >= GROW / 2 ? 2 : 1;
    const stem = S.era === 5 ? '#6fe0c8' : '#3f9a3a';
    const leaf = S.era === 5 ? '#9ff0de' : '#5cb84e';
    R(g, x + 7, y + 14 - stage * 3, 2, stage * 3, stem);
    R(g, x + 4, y + 13 - stage * 2, 3, 2, leaf);
    R(g, x + 9, y + 12 - stage * 2, 3, 2, leaf);
    if (stage === 3) {
      const fruit = ['#d9334d', '#e8c24a', '#7a3e9a', '#f0cf3a', '#e2402e', '#5ad7e8'][S.era];
      for (const [fx, fy] of [[4, 3], [10, 4], [7, 1]]) {
        box(g, x + fx, y + fy, 4, 4, fruit);
        R(g, x + fx + 1, y + fy + 1, 1, 1, 'rgba(255,255,255,0.7)');
      }
    }
  });
}

function stall(g) {
  const [tx, ty] = STALL;
  const x = tx * T;
  const y = ty * T;
  shadow(g, x + 8, y + 15, 16);
  if (S.era <= 1) {
    box(g, x + 1, y + 6, 14, 9, '#a87344');
    R(g, x + 2, y + 9, 12, 1, '#8a5a32');
    for (const [fx, c] of [[3, '#d9334d'], [7, '#e8c24a'], [11, '#5cb84e']]) disc(g, x + fx, y + 5, 2, c);
    return;
  }
  if (S.era >= 4) {
    box(g, x + 3, y - 6, 11, 21, S.era === 5 ? '#e9f6fb' : '#d8473a');
    box(g, x + 5, y - 3, 7, 9, S.era === 5 ? '#5ad7e8' : '#cfe8f5');
    R(g, x + 5, y + 9, 7, 2, '#2b2131');
    return;
  }
  box(g, x, y + 7, 16, 8, '#b07a46');
  box(g, x - 1, y - 2, 18, 5, S.era === 2 ? '#c94a3a' : '#3d6b8a');
  for (let i = 0; i < 18; i += 4) R(g, x - 1 + i, y - 1, 2, 3, '#f2efe6');
  R(g, x + 1, y + 3, 1, 4, '#6b4428');
  R(g, x + 14, y + 3, 1, 4, '#6b4428');
}

/** A house in the current era's style. `w` in tiles; the door is on the bottom row. */
// Each house gets one of four colourings (by where it stands), so a street never looks copy-pasted.
const HOUSE_LOOKS = [
  { thatch: '#d4ad5b', adobe: '#d9a86c', cloth: '#8a3a30', plaster: '#efe2c4', roof: '#b84a3a', brick: '#a54b3c', slate: '#5f6670', paint: '#e8ecef', accent: '#3b5b8c', shutter: '#3f7a4a', glass: '#8fe3f2' },
  { thatch: '#c9a24e', adobe: '#e2b77e', cloth: '#2f6b8a', plaster: '#f4ead8', roof: '#3a6a9a', brick: '#8a5a4a', slate: '#4a5a6a', paint: '#f4efe6', accent: '#c8503a', shutter: '#3a5a8a', glass: '#a8f0d0' },
  { thatch: '#dcb868', adobe: '#cf9a62', cloth: '#6b8a2f', plaster: '#e8d8b8', roof: '#4a7a3a', brick: '#b86a4a', slate: '#6a5a5a', paint: '#e6eef4', accent: '#3a8a6a', shutter: '#8a3a30', glass: '#c8d8ff' },
  { thatch: '#c8a05a', adobe: '#e8c493', cloth: '#8a5a2f', plaster: '#f2e6cc', roof: '#8a5a3a', brick: '#9a4a4a', slate: '#3a4a5a', paint: '#f0e8ee', accent: '#8a6cc9', shutter: '#6b4428', glass: '#ffe0a8' },
];

function house(g, tx, w, mine, bottomAt = ROAD_Y * T - 1) {
  const x = tx * T;
  const bottom = bottomAt;
  const width = w * T - 2;
  const left = x + 1;
  const L = HOUSE_LOOKS[mine && S.homeLook != null ? S.homeLook : (tx * 7 + 3) % HOUSE_LOOKS.length];
  shadow(g, left + width / 2, bottom + 1, width + 6);
  const doorX = left + Math.floor(width / 2) - 3;
  /** A wall: its colour, a shaded right side and a shadow under the eaves. */
  const wall = (top, colour, line = shadeOf(colour, 0.6)) => {
    box(g, left, top, width, bottom - top + 1, colour, line);
    R(g, left + width - 4, top + 1, 3, bottom - top - 1, shadeOf(colour, 0.88));
    R(g, left + 1, top + 1, width - 2, 1, shadeOf(colour, 0.78));
  };
  const door = (c, step = true) => {
    box(g, doorX - 1, bottom - 12, 9, 12, shadeOf(c, 0.7), shadeOf(c, 0.45));
    R(g, doorX, bottom - 11, 7, 11, c);
    R(g, doorX + 1, bottom - 10, 2, 9, lighten(c, 0.15));
    R(g, doorX + 5, bottom - 6, 1, 1, '#f2c94c');
    if (step) R(g, doorX - 1, bottom + 1, 9, 2, '#b8b4aa');
  };
  const win = (wx, wy, { glass = '#9fd6f0', frame = '#5a3d2b', shutter = null, flowers = false } = {}) => {
    if (shutter) {
      R(g, wx - 2, wy, 2, 7, shutter);
      R(g, wx + 8, wy, 2, 7, shutter);
    }
    box(g, wx, wy, 8, 7, frame);
    R(g, wx + 1, wy + 1, 6, 5, night ? '#ffd86b' : glass);
    R(g, wx + 4, wy + 1, 1, 5, frame);
    R(g, wx + 1, wy + 3, 6, 1, frame);
    if (!night) R(g, wx + 1, wy + 1, 2, 1, 'rgba(255,255,255,0.8)');
    if (flowers) {
      R(g, wx - 1, wy + 7, 10, 2, '#8a5a3a');
      for (const [dx, c] of [[0, '#ff6b81'], [3, '#ffe066'], [6, '#ff9ec2']]) R(g, wx + dx, wy + 6, 2, 1, c);
      R(g, wx + 1, wy + 6, 6, 1, '#5aa84a');
    }
  };
  const bushAt = (bx) => {
    disc(g, bx, bottom - 3, 4, '#2f6b3a');
    disc(g, bx, bottom - 3, 3, '#4e9a4c');
    R(g, bx - 1, bottom - 5, 2, 1, '#74bf5e');
  };
  const mailbox = (mx) => {
    R(g, mx, bottom - 8, 1, 8, '#5a5e66');
    box(g, mx - 2, bottom - 12, 5, 4, L.accent);
  };
  switch (S.era) {
    case 0: {
      // A round thatched hut, a little different in every family's hands.
      // Smaller than the lot, so the huts stand apart with grass between them.
      const cx = left + width / 2;
      const r = Math.floor(width / 2) - 3;
      disc(g, cx, bottom - 8, r, shadeOf(L.thatch, 0.55));
      disc(g, cx, bottom - 8, r - 1, L.thatch);
      disc(g, cx - 3, bottom - 12, r - 6, lighten(L.thatch, 0.2));
      for (let j = -7; j < 7; j += 3) R(g, cx - 8, bottom - 8 + j, 16, 1, shadeOf(L.thatch, 0.82));
      R(g, left + 3, bottom - 2, width - 6, 3, L.thatch);
      box(g, doorX, bottom - 9, 7, 9, '#3a2616');
      R(g, doorX + 1, bottom - 8, 5, 1, L.cloth);
      if (mine) {
        R(g, left + width + 1, bottom - 3, 6, 2, '#6b4428');
        disc(g, left + width + 4, bottom - 6, 2, '#f08a2e');
        R(g, left + width + 4, bottom - 8, 1, 1, '#f7d84a');
      } else bushAt(left + 2);
      break;
    }
    case 1: {
      wall(bottom - 22, L.adobe);
      for (let i = 0; i < 12; i++) R(g, left + 2 + ((i * 7) % (width - 6)), bottom - 20 + ((i * 5) % 18), 2, 1, shadeOf(L.adobe, 0.9));
      R(g, left - 2, bottom - 25, width + 4, 3, shadeOf(L.adobe, 0.55));
      R(g, left - 1, bottom - 24, width + 2, 1, shadeOf(L.adobe, 0.75));
      for (let bx = left + 2; bx < left + width; bx += 5) R(g, bx, bottom - 27, 2, 3, '#8a5a32');
      door(L.cloth);
      win(left + 4, bottom - 18, { glass: '#3a2a20', frame: shadeOf(L.adobe, 0.6), flowers: true });
      if (mine) win(left + width - 12, bottom - 18, { glass: '#3a2a20', frame: shadeOf(L.adobe, 0.6), flowers: true });
      else bushAt(left + width - 3);
      break;
    }
    case 2: {
      wall(bottom - 20, L.plaster);
      for (const bx of [left + 1, left + width - 4]) R(g, bx, bottom - 19, 2, 19, '#6b4428');
      R(g, left + 1, bottom - 12, width - 2, 2, '#6b4428');
      R(g, left + 6, bottom - 19, 1, 7, '#6b4428');
      R(g, left + width - 8, bottom - 19, 1, 7, '#6b4428');
      gable(g, left - 3, bottom - 37, width + 6, 17, L.roof, shadeOf(L.roof, 0.75));
      R(g, left + width / 2 - 1, bottom - 37, 2, 1, lighten(L.roof, 0.4));
      door('#7a4a2a');
      win(left + 4, bottom - 19, { shutter: L.shutter, flowers: true });
      win(left + width - 12, bottom - 19, { shutter: L.shutter, flowers: true });
      if (!mine) bushAt(left - 1);
      break;
    }
    case 3: {
      wall(bottom - 22, L.brick);
      for (let row = 0; row < 7; row++)
        for (let bx = left + 1 + (row % 2) * 3; bx < left + width - 4; bx += 6) R(g, bx, bottom - 20 + row * 3, 5, 1, shadeOf(L.brick, 0.82));
      // A lighter slate roof with little overhang and one thin chimney: rows of these read as a street, not a wall.
      gable(g, left - 1, bottom - 34, width + 2, 13, lighten(L.slate, 0.18), shadeOf(L.slate, 0.8));
      box(g, left + width - 9, bottom - 37, 5, 9, '#7a3a30');
      R(g, left + width - 10, bottom - 38, 7, 2, '#5a2a24');
      if ((tx * 5) % 3 === 0) disc(g, left + width - 6, bottom - 42, 2, '#e4e4e8');
      door('#3d4a5a');
      win(left + 4, bottom - 19, { frame: '#e8e0d0', flowers: true });
      win(left + width - 12, bottom - 19, { frame: '#e8e0d0', flowers: true });
      if (!mine) mailbox(left + width + 1);
      break;
    }
    case 4: {
      wall(bottom - 34, L.paint);
      R(g, left - 2, bottom - 37, width + 4, 4, shadeOf(L.accent, 0.6));
      R(g, left - 1, bottom - 36, width + 2, 2, L.accent);
      // A balcony and an awning over the door.
      R(g, left + 2, bottom - 19, width - 4, 1, '#5a5e66');
      for (let bx = left + 3; bx < left + width - 3; bx += 3) R(g, bx, bottom - 22, 1, 3, '#8a8e96');
      for (let i = 0; i < 12; i += 3) R(g, doorX - 3 + i, bottom - 15, 3, 2, i % 6 ? '#ffffff' : L.accent);
      for (const wy of [bottom - 31]) {
        win(left + 3, wy, { glass: '#8fd0f0', frame: '#4a5563' });
        win(left + width - 11, wy, { glass: '#8fd0f0', frame: '#4a5563' });
      }
      win(left + width - 11, bottom - 13, { glass: '#8fd0f0', frame: '#4a5563', flowers: true });
      door(L.accent);
      if (!mine) mailbox(left - 1);
      break;
    }
    default: {
      // An apartment tower: its own glass colour and a coloured band.
      const top = bottom - (ROAD_Y * T - 1) + (mine ? 2 : 6 + ((tx * 7) % 5) * 5);
      box(g, left, top, width, bottom - top + 1, '#dfe8f0', '#3a4a66');
      R(g, left + width - 4, top + 1, 3, bottom - top - 1, '#c8d4e0');
      for (let wy = top + 4; wy < bottom - 12; wy += 7)
        for (let wx = left + 3; wx < left + width - 5; wx += 7) {
          box(g, wx, wy, 5, 5, '#3a4a66');
          R(g, wx + 1, wy + 1, 3, 3, night || (wx * 7 + wy * 3) % 5 === 0 ? '#f7e38a' : L.glass);
        }
      R(g, left, top - 1, width, 1, '#5ad7e8');
      R(g, left + 1, bottom - 13, width - 2, 2, L.accent);
      R(g, left + width / 2, top - 6, 1, 6, '#3a4a66');
      R(g, left + width / 2 - 1, top - 7, 3, 1, '#ff6b6b');
      box(g, doorX - 1, bottom - 10, 9, 10, '#5ad7e8', '#3a4a66');
    }
  }
  // Your home flies a little flag.
  if (mine && S.era < 5) {
    const fx = left + width - 4;
    const fy = S.era === 0 ? bottom - 28 : S.era === 4 ? bottom - 44 : bottom - 46;
    R(g, fx, fy, 1, 10, '#5a3a26');
    R(g, fx + 1, fy, 5, 3, '#ff6b6b');
    R(g, fx + 1, fy + 3, 3, 1, '#ff6b6b');
  }
}

/** An empty house: greyed, boards across the door. */
function boarded(g, tx, bottomAt = ROAD_Y * T - 1) {
  const x = tx * T + 1;
  const bottom = ROAD_Y * T - 1;
  g.fillStyle = 'rgba(70, 70, 80, 0.35)';
  g.fillRect(x, bottom - 30, 2 * T - 2, 31);
  const dx = x + T - 4;
  R(g, dx - 2, bottom - 9, 12, 2, '#9a6a3c');
  R(g, dx - 2, bottom - 5, 12, 2, '#9a6a3c');
}

/** What a war leaves: burnt beams and stones. */
function rubble(g, tx, bottomAt = ROAD_Y * T - 1) {
  const x = tx * T + 2;
  const y = bottomAt - 3;
  shadow(g, x + 14, y + 3, 28);
  const r = rng(tx * 31);
  // What it was made of: thatch and planks, then stone and brick, then concrete, glass and steel.
  const bits = S.era <= 1 ? ['#c9a24e', '#8a5a32', '#a87a42'] : S.era <= 3 ? ['#a54b3c', '#8a8a92', '#c8b8a0'] : ['#b8bcc4', '#9aa0aa', '#8fd3f2'];
  const pile = S.era >= 4 ? 18 : 14;
  for (let i = 0; i < pile; i++) {
    const rx = x + Math.floor(r() * 26);
    const ry = y - Math.floor(r() * (S.era >= 4 ? 16 : 10));
    box(g, rx, ry, 4 + Math.floor(r() * (S.era >= 4 ? 6 : 4)), 3, bits[i % 3]);
  }
  if (S.era >= 4) {
    // A standing piece of wall with empty windows, and bent steel bars.
    box(g, x + 2, y - 26, 9, 24, '#c8ccd4');
    for (const wy of [y - 22, y - 14]) R(g, x + 4, wy, 4, 4, '#3a3f4a');
    R(g, x + 16, y - 20, 1, 12, '#8a4a2a');
    R(g, x + 17, y - 21, 3, 1, '#8a4a2a');
    R(g, x + 22, y - 16, 1, 9, '#8a4a2a');
  } else {
    R(g, x + 4, y - 14, 2, 12, '#2e2420');
    R(g, x + 20, y - 10, 2, 9, '#2e2420');
  }
  disc(g, x + 12, y - 16, 2, 'rgba(120, 120, 130, 0.7)');
}

function emptyLot(g, tx, bottomAt = ROAD_Y * T - 1) {
  const x = tx * T + 9;
  const y = bottomAt - 11;
  box(g, x, y, 12, 8, '#e9d9b0');
  R(g, x + 2, y + 2, 8, 1, '#a07040');
  R(g, x + 2, y + 4, 6, 1, '#a07040');
  R(g, x + 5, y + 8, 2, 4, '#7a4f2e');
}

/** The square: a well, then a fountain, then a statue, then a hologram. */
function plaza(g) {
  if (S.era < 1 && !festivalToday()) return;
  const x = PLAZA.x * T;
  const y = PLAZA.y * T;
  box(g, x, y, 4 * T, 2 * T, S.era >= 4 ? '#c9ccd2' : '#cdb98e', S.era >= 4 ? '#8a8e96' : '#9c8758');
  for (let i = 0; i < 4 * T; i += 8) R(g, x + i, y + 1, 1, 2 * T - 2, S.era >= 4 ? '#b8bbc2' : '#bba77c');
  const cx = x + 2 * T;
  const cy = y + T + 4;
  shadow(g, cx, cy + 6, 22);
  if (S.era <= 2) {
    disc(g, cx, cy, 9, OL);
    disc(g, cx, cy, 8, '#8f8f97');
    disc(g, cx, cy, 6, '#4aa3d8');
    R(g, cx - 1, cy - 14, 2, 9, '#6b4428');
    R(g, cx - 8, cy - 15, 16, 2, '#6b4428');
  } else if (S.era <= 4) {
    disc(g, cx, cy, 11, OL);
    disc(g, cx, cy, 10, '#b5b5bd');
    disc(g, cx, cy, 8, '#5ab0e0');
    box(g, cx - 2, cy - 12, 5, 12, '#d0d0d8');
    R(g, cx - 4, cy - 15, 9, 1, '#9fd8f5');
    R(g, cx - 5, cy - 14, 1, 2, '#9fd8f5');
    R(g, cx + 5, cy - 14, 1, 2, '#9fd8f5');
  } else {
    disc(g, cx, cy, 10, '#3a4a66');
    disc(g, cx, cy, 8, '#5ad7e8');
    for (let i = 0; i < 6; i++) R(g, cx - 3 + i, cy - 18 + i * 2, 1, 6, 'rgba(120, 240, 255, 0.6)');
  }
  if (festivalToday()) {
    const flags = ['#e0534a', '#f2c94c', '#5ab4e0', '#5cb84e', '#e07aa0'];
    R(g, x, y - 6, 4 * T, 1, OL);
    for (let i = 0; i < 4 * T; i += 6) {
      R(g, x + i, y - 5, 4, 3, flags[(i / 6) % flags.length]);
      R(g, x + i + 1, y - 2, 2, 1, flags[(i / 6) % flags.length]);
    }
  }
  for (const bx of [x + 4, x + 4 * T - 16]) {
    box(g, bx, y + 2 * T - 8, 12, 4, '#9a6a3c');
    R(g, bx + 1, y + 2 * T - 4, 1, 3, OL);
    R(g, bx + 10, y + 2 * T - 4, 1, 3, OL);
  }
}

/** The landmarks, in pixel art; built ones clear the trees on their spot. */
function landmark(g, l) {
  const x = l.x * T;
  const w = l.w * T;
  const base = (ROAD_Y + 4) * T + 8;
  shadow(g, x + w / 2, base + 1, w);
  if (l.id === 'temple') {
    box(g, x + 2, base - 6, w - 4, 6, '#d8d2c2');
    box(g, x + 6, base - 10, w - 12, 4, '#e6e0d0');
    for (let px = x + 10; px < x + w - 10; px += 9) box(g, px, base - 32, 5, 22, '#f2eee4');
    gable(g, x + 6, base - 44, w - 12, 10, '#e6e0d0', '#cfc8b6');
  } else if (l.id === 'castle') {
    box(g, x + 10, base - 30, w - 20, 30, '#a3a3ab');
    for (let px = x + 10; px < x + w - 12; px += 6) R(g, px, base - 34, 4, 4, '#a3a3ab');
    for (const tx of [x + 2, x + w - 16]) {
      box(g, tx, base - 40, 14, 40, '#9696a0');
      gable(g, tx - 1, base - 52, 16, 12, '#c94a3a', '#a33a2e');
    }
    box(g, x + w / 2 - 6, base - 14, 12, 14, '#5a3a22');
    R(g, x + w / 2, base - 62, 1, 10, OL);
    R(g, x + w / 2 + 1, base - 62, 6, 4, '#f2c94c');
  } else if (l.id === 'factory') {
    box(g, x + 2, base - 26, w - 4, 26, '#a54b3c');
    for (let px = x + 2; px < x + w - 6; px += 12) {
      g.fillStyle = OL;
      for (let j = 0; j < 8; j++) g.fillRect(px + j, base - 34 + 8 - j, 12 - j, 1);
      for (let j = 1; j < 7; j++) R(g, px + j, base - 34 + 8 - j, 11 - j - 1, 1, '#6e737c');
    }
    box(g, x + w - 14, base - 56, 8, 30, '#7a3a30');
    for (const [dx, dy, r] of [[-10, -62, 3], [-6, -68, 4], [-1, -76, 5]]) disc(g, x + w + dx, base + dy, r, '#d8d8dc');
    for (let px = x + 8; px < x + w - 20; px += 10) box(g, px, base - 18, 6, 6, night ? '#ffd86b' : '#8fd0f0');
  } else if (l.id === 'hospital') {
    box(g, x + 2, base - 44, w - 4, 44, '#f4f6f8');
    box(g, x + w / 2 - 7, base - 40, 14, 14, '#ffffff');
    R(g, x + w / 2 - 2, base - 38, 4, 10, '#e0475a');
    R(g, x + w / 2 - 5, base - 35, 10, 4, '#e0475a');
    for (let px = x + 6; px < x + w - 8; px += 10) box(g, px, base - 22, 7, 6, night ? '#ffd86b' : '#8fd0f0');
    box(g, x + w / 2 - 6, base - 12, 12, 12, '#5ab4e0');
  } else {
    for (let j = 0; j < 70; j += 6) R(g, x + 6, base - 70 + j, w - 30, 1, '#8a8e96');
    R(g, x + 6, base - 72, 2, 72, '#6e737c');
    R(g, x + w - 26, base - 72, 2, 72, '#6e737c');
    const rx = x + w - 18;
    if (!S.launched || true) {
      box(g, rx, base - 64, 10, 52, '#f2f4f6');
      gable(g, rx, base - 76, 10, 12, '#e0475a', '#c03a4a');
      R(g, rx - 4, base - 18, 4, 8, '#e0475a');
      R(g, rx + 10, base - 18, 4, 8, '#e0475a');
      box(g, rx + 3, base - 50, 4, 4, '#5ad7e8');
    }
    R(g, x, base - 4, w, 4, '#5a5e66');
  }
}

/** The ground: grass, woods, the road, water, the hill. Redrawn only when the era, season, map or woods change. */
const ground = { canvas: document.createElement('canvas'), key: '' };
function paintGround() {
  const key = [S.era, S.season, S.mapSeed, HOME.x, FARM.x, PEN.x, (S.cleared ?? []).length, S.landmarks.join(), (S.wreckedLm ?? []).join()].join('|');
  if (ground.key === key) return;
  ground.key = key;
  ground.canvas.width = W;
  ground.canvas.height = H;
  const g = ground.canvas.getContext('2d');
  drawGrassArt(g);
  const r = rng(3);
  for (let x = 6; x < W; x += 14 + Math.floor(r() * 10)) drawTree(g, x, 24 + Math.floor(r() * 6), 6);
  drawRoad(g);
  drawWater(g, POND);
  drawWater(g, LAKE);
  pier(g, (LAKE.x + 3) * T, LAKE.y * T - 2, 12);
  mine(g, MINE);
  for (const [bx, by] of [[2, 10], [7, 10.5], [4.5, 7.2]]) boulder(g, (MINE.x + bx) * T, by * T, 3 + ((bx * 3) % 3));
  drawCleared(g);
  const clearOfLandmarks = (x) => !LANDMARKS.some((l) => has(l.id) && x > l.x * T - 8 && x < (l.x + l.w) * T + 8);
  // Woods south of the road, away from town.
  for (const grove of GROVES)
    for (let i = 0; i < grove.w * 1.4; i++) {
      const x = grove.x * T + 6 + Math.floor(r() * (grove.w * T - 12));
      const y = (ROAD_Y + 2) * T + 10 + Math.floor(r() * (3 * T));
      const size = 5 + Math.floor(r() * 3);
      if (clearOfLandmarks(x)) drawTree(g, x, y, size);
    }
  for (let x = 6; x < W; x += 22 + Math.floor(r() * 12)) drawTree(g, x, H - 1, 5);
  // Berry bushes and mushrooms in the woods (what foragers pick).
  for (const grove of GROVES)
    for (let i = 0; i < grove.w / 2; i++) {
      const x = grove.x * T + 8 + Math.floor(r() * (grove.w * T - 16));
      const y = (ROAD_Y + 2) * T + 6 + Math.floor(r() * (3 * T));
      if (!clearOfLandmarks(x)) continue;
      if (i % 3 === 0) mushroom(g, x, y);
      else bush(g, x, y, i % 2 ? '#e8505b' : '#6a5ad8');
    }
}

/** The still picture: the ground, then what changes more often (houses, fields, the store, lamps…). */
function paintCache() {
  paintGround();
  if (cache.canvas.width !== W) cache.canvas.width = W;
  const g = cache.canvas.getContext('2d');
  g.drawImage(ground.canvas, 0, 0);
  store(g, STORE.x * T, (STORE.y + 1) * T - 2, S.stock.wood, S.stock.stone);
  fence(g);
  plots(g);
  stall(g);
  plaza(g);
  drawLamps(g);
  drawDecor(g);
  drawFarm(g);
  for (const l of LANDMARKS) if (has(l.id) && !S.wreckedLm?.includes(l.id)) landmark(g, l);
  ensureLots(S.houses + S.ruins);
  for (let i = 0; i < S.houses + S.ruins; i++) {
    const tx = lotX(i);
    const b = lotBottom(i);
    if (i < S.houses && S.wrecked?.includes(i)) rubble(g, tx, b);
    else if (i < S.houses) {
      house(g, tx, 2, false, b);
      if (i >= occupied()) boarded(g, tx, b);
    } else rubble(g, tx, b);
  }
  // "For sale" signs on the next few free lots.
  for (const l of lotCandidates().slice(0, 6)) emptyLot(g, l.x, l.s ? SOUTH_BOTTOM() : ROAD_Y * T - 1);
  house(g, HOME.x, HOME.w, true);
  paintChaos(g);
  paintVisit(g);
  cache.dirty = false;
}

// ── Moving things: people, animals, cars ───────────────────────────────────────────────────────────────────────────

/** An entity walks tile by tile (across, then down) at `speed` px a frame, with pauses. */
const make = (kind, tile, extra = {}) => ({
  kind,
  x: tile[0] * T + T / 2,
  y: tile[1] * T + T - 2,
  path: [],
  wait: Math.floor(Math.random() * 20),
  frame: 0,
  seed: Math.floor(Math.random() * 18),
  dir: 'd',
  ...extra,
});

let people = [];
let animals = [];
let cars = [];
const me = make('me', HOME_DOOR, { speed: 1.5, look: null, gender: null });


function step(e) {
  const target = e.path[0];
  if (!target) return false;
  const tx = target[0] * T + T / 2;
  const ty = target[1] * T + T - 2;
  const dx = tx - e.x;
  const dy = ty - e.y;
  const s = e.speed ?? 1;
  if (Math.abs(dx) > 0.5) {
    e.x += Math.sign(dx) * Math.min(s, Math.abs(dx));
    e.dir = dx > 0 ? 'r' : 'l';
  } else if (Math.abs(dy) > 0.5) {
    e.y += Math.sign(dy) * Math.min(s, Math.abs(dy));
    e.dir = dy > 0 ? 'd' : 'u';
  }
  else {
    e.x = tx;
    e.y = ty;
    e.path.shift();
  }
  e.frame++;
  return true;
}

function spawnFamily() {
  people = [];
  for (let i = 0; i < S.houses - S.vacant; i++) {
    if (i === S.spouse) continue;
    const f = FAMILIES[i];
    people.push(
      make('villager', doorOf(i), {
        who: `h${i}a`,
        look: villagerLook(i, { ...f.look, top: jobFor(i).top }, f.gender),
        home: i,
        gender: f.gender,
        role: ROLES[i % ROLES.length],
        job: jobFor(i),
        speed: jobFor(i).at === 'run' ? 2 : 1,
        needs: { energy: 60 + Math.random() * 40, hunger: 50 + Math.random() * 50, social: 40 + Math.random() * 60 },
      }),
    );
    people.push(
      make('villager', doorOf(i), {
        who: `h${i}s`,
        look: villagerLook(i + 60, { ...f.look, top: shade(f.look.top) }, i % 3 ? 'm' : 'f'),
        home: i,
        speed: 0.8,
        small: true,
        gender: i % 3 ? 'm' : 'f',
        needs: { energy: 100, hunger: 100, social: 50 },
      }),
    );
    if (hasElder(i)) {
      const g = i % 4 ? 'f' : 'm';
      people.push(
        make('villager', doorOf(i), {
          who: `h${i}e`,
          look: villagerLook(i + 200, { ...f.look, top: ['#8a6a8a', '#6a7a5a', '#9a7a5a', '#5a6a8a'][i % 4] }, g, { elder: true }),
          home: i,
          speed: 0.5,
          gender: g,
          needs: { energy: 50 + Math.random() * 30, hunger: 60, social: 30 + Math.random() * 40 },
        }),
      );
    }
  }
  people.push(...folkPeople());
  if (Date.now() < (S.plagueUntil ?? 0)) for (const p of people) if (p.kind === 'villager' && Math.random() < 0.35) p.plague = true;
  if (S.spouse != null)
    people.push(
      make('spouse', HOME_DOOR, {
        who: 'sp',
        look: FAMILIES[S.spouse].look,
        home: -1,
        speed: 1,
        gender: FAMILIES[S.spouse].gender,
        role: 'farmer',
        needs: { energy: 80, hunger: 80, social: 60 },
      }),
    );
  const kidTops = ['#f2a65a', '#5ab4e0', '#e05a9a'];
  for (let k = 0; k < S.kids; k++)
    people.push(
      make('kid', HOME_DOOR, {
        who: `k${k}`,
        look: { hair: '#4a2f1f', top: kidTops[k], legs: '#4b4560' },
        home: -1,
        speed: (S.kidAges[k] ?? 0) < 3 ? 0.4 : 0.9,
        small: (S.kidAges[k] ?? 0) < 7,
        baby: (S.kidAges[k] ?? 0) < 3,
        gender: k % 2 ? 'm' : 'f',
        needs: { energy: 100, hunger: 100, social: 50 },
      }),
    );
  if (S.dog) people.push(make('dog', HOME_DOOR, { home: -1, speed: 1.6, puppy: S.dogAge < 5 }));
  if (S.cat) people.push(make('petcat', HOME_DOOR, { home: -1, speed: 1.4 }));
  // A chaos town passed between friends: whoever fell stays gone (chaos.js ghost()).
  if (MODE === 'chaos' && S.gone?.length) people = people.filter((p) => !p.who || !S.gone.includes(p.who));
  people.push(...guestPeople()); // friends walking around (visit.js)
  villageSpawn();
}
function shade(hex) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(v * 0.8 + 40)));
  return `#${[n >> 16, (n >> 8) & 255, n & 255].map((v) => f(v).toString(16).padStart(2, '0')).join('')}`;
}

function spawnAnimals() {
  animals = [];
  const pen = { x: PEN.x + 1, y: PEN.y, w: PEN.w - 2, h: PEN.h };
  const at = (z) => [z.x + Math.floor(Math.random() * z.w), z.y + Math.floor(Math.random() * z.h)];
  const add = (kind, zone, speed) => animals.push(make(kind, at(zone), { zone, speed }));
  for (let i = 0; i < S.chickens; i++) add('chicken', pen, 0.6);
  for (let i = 0; i < S.cows; i++) add('cow', pen, 0.4);
  for (let i = 0; i < S.sheep; i++) add('sheep', pen, 0.45);
  for (let i = 0; i < S.pigs; i++) add('pig', pen, 0.5);
  for (let i = 0; i < S.goats; i++) add('goat', pen, 0.5);
  for (let i = 0; i < S.horses; i++) add('horse', pen, 0.6);
  for (let i = 0; i < S.alpacas; i++) add('alpaca', pen, 0.5);
  // Wildlife: ducks on the lake, rabbits in the woods, a cat about town.
  for (let i = 0; i < 3; i++) add('duck', { x: LAKE.x + 1, y: LAKE.y, w: LAKE.w - 2, h: LAKE.h - 1 }, 0.3);
  // In the woods (wherever the map put them): rabbits, deer, a fox or two.
  GROVES.filter((g) => g.w >= 4).forEach((g, gi) => {
    const zone = { x: g.x, y: ROAD_Y + 2, w: g.w, h: 3 };
    for (let i = 0; i < Math.min(3, Math.ceil(g.w / 10)); i++) add('rabbit', zone, 0.9);
    if (g.w >= 8) add('deer', zone, 0.6);
    if (gi % 2 === 0 && g.w >= 10) add('fox', zone, 0.9);
  });
  add('cat', { x: Math.max(0, HOME.x - 10), y: ROAD_Y, w: 22, h: 2 }, 0.7);
  for (let i = 0; i < 6; i++) add('squirrel', { x: Math.floor((i + 0.5) * (COLS / 6)) - 5, y: 2, w: 10, h: 1 }, 0.9);
  for (let i = 0; i < 2; i++) add('frog', { x: POND.x, y: POND.y, w: POND.w, h: POND.h }, 0.5);
  spawnMoreAnimals(add);
  tagVariants(animals);
}

/** What goes down the road: runners, riders, carts … cars, buses, hover cars (life.js). */
function spawnCars() {
  cars = spawnTraffic();
}


// ── Sprites ────────────────────────────────────────────────────────────────────────────────────────────────────────

const OUTFIT = [
  { top: '#8a5a32', legs: '#6b4428', hair: '#3a2418' }, // fur
  { top: '#efe6d2', legs: '#c9b48a', hair: '#3a2418' }, // tunic
  { top: '#3f7a4a', legs: '#5a3d2b', hair: '#3a2418' }, // jerkin
  { top: '#5a4a3a', legs: '#2f2f3a', hair: '#3a2418' }, // waistcoat
  { top: '#3567c9', legs: '#2f3a52', hair: '#3a2418' }, // hoodie
  { top: '#d7e3ee', legs: '#8a9bb0', hair: '#3a2418' }, // suit
];






/** Anyone on two legs: villagers, family, a thief, and you (in what the shop sold you). */
function person(g, e, c) {
  if (e.sick || e.plague || (e.kind === 'me' && S.sickDays > 0)) c = { ...c, skin: SICK_SKIN };
  if (e.baby) return drawBaby(g, e, c);
  if (e.kind !== 'me') {
    const at = drawPerson(g, e, c, c?.style ? { hairStyle: c.style } : undefined);
    if (c?.skin) lookExtras(g, c, at);
    if (e.job && !e.zombie) drawGear(g, e.job, at.x, at.y, at.side, at.flip);
    return;
  }
  const st = S.style;
  const look = { ...c, hair: st.hairColor ?? c.hair };
  if (st.top) look.top = st.top.c;
  const hairStyle = st.hair;
  const at = drawPerson(g, { ...e, gender: hairStyle ? null : S.gender }, look, { hairStyle });
  const { x, y, side, flip, pal } = at;
  // Hair styles bought at the shop.
  hairOverlay(g, hairStyle, at);
  // Clothes over the plain shirt.
  const top = st.top;
  const T2 = { k: top?.stripe, v: top?.over, d: top?.c, n: top?.tie };
  const tp = { ...pal, k: T2.k, v: T2.v, d: T2.d, n: T2.n };
  if (top?.stripe) spr(g, ['............', '...kkkkkk...', '............'], tp, x, y + 11, flip);
  if (top?.over) spr(g, ['...v....v...', '...vvvvvv...', '...vvvvvv...'], tp, x, y + 11, flip);
  if (top?.dress) spr(g, ['..oddddddo..', '.oddddddddo.'], tp, x, y + 13, flip);
  if (top?.tie && side !== 'u') spr(g, ['.....nn.....', '.....n......'], tp, x, y + 11, flip);
  // Hats.
  const hp = { o: OL, y: '#f2d27a', Y: '#d9b25a', r: '#e8505b', b: '#5ab4e0', B: '#3a8fc0', p: '#ff9ec2', g: '#ffd23f', G: '#e0a91a', w: '#ffffff' };
  const H2 = (rows, dy, dx = 0) => spr(g, rows, hp, x + dx, y + dy, flip);
  if (st.hat === 'straw') H2(['...oooooo...', '..oyyyyyyo..', '..orrrrrro..', 'ooyyyyyyyyoo', 'oYYYYYYYYYYo'], -3, 0);
  else if (st.hat === 'beanie') H2(['.....ww.....', '...oooooo...', '..obbbbbbo..', '.obbbbbbbbo.', '.oBBBBBBBBo.'], -3);
  else if (st.hat === 'cap') H2(['...oooooo...', '..orrrrrro..', '.orrrrrrrroo', '.oooooooorrr'], -2, side === 'u' ? 0 : 0);
  else if (st.hat === 'flower' && side !== 'u') H2(['.p.', 'pwp', '.p.'], 3, flip ? 1 : 8);
  else if (st.hat === 'crown') H2(['..g.g..g.g..', '..gGggGggg..', '..gggrgggg..'], -3);
  else if (myJob()) drawGear(g, myJob(), x, y, side, flip); // the job's hat when the shop sold you none
  else if (S.era >= 2) H2(['.....gg.....'], -1); // a little badge of office
}

function chicken(g, e) {
  drawAnimal(g, e, CHICKEN, CHICKEN_PAL, 10, 8, 8);
}
function cow(g, e) {
  drawAnimal(g, e, COW, COW_PAL, 16, 10, 14);
}
function dog(g, e) {
  const DOG_PAL = dogBreed().pal; // the breed's colours (village.js)
  if (e.puppy) {
    // A puppy: the dog, squashed a little.
    const x = Math.round(e.x) - 6;
    const y = Math.round(e.y) - 8;
    shadow(g, e.x, e.y, 8);
    spr(g, DOG[e.path.length ? Math.floor(e.frame / 3) % 2 : 0].filter((_, i) => i !== 5), DOG_PAL, x, y, animalFlip(e));
    return;
  }
  drawAnimal(g, e, DOG, DOG_PAL, 12, 9, 10);
}

function car(g, c) {
  const x = Math.round(c.x);
  const y = c.y;
  const right = c.v > 0;
  shadow(g, x + 7, y + 6, 14);
  box(g, x, y, 15, 6, c.c);
  box(g, x + (right ? 3 : 4), y - 3, 8, 4, '#cfe8f5');
  if (S.era === 5) R(g, x + 1, y + 6, 13, 1, '#5ad7e8');
  else for (const wx of [x + 2, x + 10]) R(g, wx, y + 5, 3, 2, OL);
}

/** A heart or "…" over someone's head while they talk. */
let bubble = null;

// ── 60 fps: minds tick 8 times a second; frames in between slide everyone smoothly (interpolation) ───────────────

let prevCam = 0;
let alpha = 1; //    how far between the last tick and the next (0–1)
let viewX = 0; //    the view's left edge for this frame
/** Where to draw someone this frame: between where they were at the last tick and where they are now. */
function at(e) {
  if (e.px === undefined || Math.abs(e.x - e.px) > 24 || Math.abs(e.y - e.py) > 24) return e;
  return { ...e, x: e.px + (e.x - e.px) * alpha, y: e.py + (e.y - e.py) * alpha };
}
const onScreen = (x) => x > viewX - 28 && x < viewX + VIEW_W + 28;

function frame() {
  if (cache.dirty) paintCache();
  // A view you're dragging goes straight there; otherwise it glides with everyone else.
  const manual = MODE === 'chaos' || lifeCam;
  viewX = manual ? camX : prevCam + (camX - prevCam) * alpha;
  const [sx, sy] = shakeOffset(); // a big hit in chaos mode shakes the view (juice.js)
  ctx.setTransform(scale, 0, 0, scale, sx * scale, sy * scale);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(cache.canvas, -Math.round(viewX), 0);
  ctx.save();
  ctx.translate(-Math.round(viewX), 0);
  drawTraffic(ctx, cars);
  drawGolden(ctx);
  drawFx(ctx);
  drawHoliday(ctx);
  drawMerchant(ctx);
  drawCritters(ctx);
  drawFarmLife(ctx);
  drawVillageUnder(ctx);
  drawChimneys(ctx);
  drawParked(ctx);
  drawChaos(ctx);
  // Only what's on screen, each at its in-between position, back to front.
  const all = [...animals, ...people, me, ...(thief ? [thief] : [])]
    .filter((e) => !e.hidden && onScreen(e.x))
    .map(at)
    .sort((a, b) => a.y - b.y);
  for (const e of all) {
    if (e.kind === 'chicken') chicken(ctx, e);
    else if (e.kind === 'cow') cow(ctx, e);
    else if (e.kind === 'sheep') drawAnimal(ctx, e, SHEEP, SHEEP_PAL, 12, 7, 11);
    else if (e.kind === 'pig') drawAnimal(ctx, e, PIG, PIG_PAL, 12, 7, 11);
    else if (e.kind === 'cat') drawAnimal(ctx, e, CAT, CAT_PAL, 10, 7, 8);
    else if (e.kind === 'duck') drawAnimal(ctx, e, DUCK, DUCK_PAL, 8, 6, 0);
    else if (e.kind === 'rabbit') drawAnimal(ctx, e, RABBIT, RABBIT_PAL, 8, 6, 6);
    else if (e.kind === 'horse') drawAnimal(ctx, e, HORSE, HORSE_PAL, 16, 11, 14);
    else if (e.kind === 'alpaca') drawAnimal(ctx, e, ALPACA, ALPACA_PAL, 12, 12, 11);
    else if (e.kind === 'goat') drawAnimal(ctx, e, GOAT, GOAT_PAL, 11, 9, 10);
    else if (e.kind === 'deer') drawAnimal(ctx, e, DEER, DEER_PAL, 14, 11, 12);
    else if (e.kind === 'fox') drawAnimal(ctx, e, FOX, FOX_PAL, 12, 8, 10);
    else if (e.kind === 'squirrel') drawAnimal(ctx, e, SQUIRREL, SQUIRREL_PAL, 8, 7, 6);
    else if (e.kind === 'frog') drawAnimal(ctx, e, FROG, FROG_PAL, 7, 5, 0);
    else if (drawMoreAnimal(ctx, e) || drawWildMore(ctx, e)) continue;
    else if (e.kind === 'dog') dog(ctx, e);
    else if (e.kind === 'petcat') drawAnimal(ctx, e, CAT, { ...CAT_PAL, y: '#f4f1ea' }, 10, 7, 8);
    else if (e.kind === 'thief') person(ctx, e, { hair: '#1a1a22', top: '#2a2a33', legs: '#1a1a22' });
    else {
      const hop = e.hop ?? 0;
      const sitting = e.act?.tool === 'sit' ? 2 : 0;
      const drawn = hop || sitting ? { ...e, y: e.y + hop + sitting } : e;
      if (e.kind === 'me' && drawMeRiding(ctx, drawn)) continue;
      person(ctx, drawn, e.kind === 'me' ? OUTFIT[S.era] : e.look);
      if (e.act && !drawHunt(ctx, drawn) && !drawJobTool(ctx, drawn, e.act) && !drawWork(ctx, drawn, e.act)) drawAction(ctx, drawn, e.act);
      drawVillager(ctx, drawn);
      drawDust(ctx, drawn);
    }
  }
  drawWishes(ctx);
  drawVillageOver(ctx);
  drawJuice(ctx);
  drawPops(ctx, frameK);
  drawMeMarker(ctx);
  drawVisit(ctx);
  if (bubble) {
    const x = Math.round(bubble.x);
    const y = Math.round(bubble.y) - 32;
    box(ctx, x - 5, y, 11, 8, '#ffffff');
    if (bubble.heart) {
      R(ctx, x - 2, y + 2, 2, 2, '#e0475a');
      R(ctx, x + 1, y + 2, 2, 2, '#e0475a');
      R(ctx, x - 1, y + 4, 3, 2, '#e0475a');
    } else for (const dx of [-2, 0, 2]) R(ctx, x + dx, y + 4, 1, 1, OL);
    R(ctx, x - 1, y + 8, 2, 2, '#ffffff');
  }
  // Building sites: scaffolding and dust while builders hammer.
  for (const s of sites) {
    const x = s.tx * T;
    const w = s.w * T;
    for (let px = x; px < x + w; px += 8) R(ctx, px, ROAD_Y * T - 30, 1, 30, '#b07a46');
    for (let py = ROAD_Y * T - 28; py < ROAD_Y * T; py += 9) R(ctx, x, py, w, 1, '#b07a46');
    if (s.left % 6 < 3) for (const dx of [4, 14, 24]) R(ctx, x + dx, ROAD_Y * T - 4 - (s.left % 5), 2, 2, 'rgba(230, 220, 200, 0.8)');
  }
  for (const b of birds) spr(ctx, BIRD[Math.floor(b.f / 6) % 2], BIRD_PAL, Math.round(b.x), Math.round(b.y), b.v < 0);
  if (S.sickDays > 0) {
    const x = Math.round(me.x) + 4;
    const y = Math.round(me.y) - 30;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 7px sans-serif';
    ctx.fillText('z', x, y + 6);
    ctx.fillText('z', x + 4, y + 1);
  }
  ctx.restore();
  if (night) {
    ctx.fillStyle = 'rgba(16, 24, 64, 0.38)';
    ctx.fillRect(0, 0, VIEW_W, H);
    drawLampGlow(ctx);
    drawSky(ctx);
  } else drawSkyShade(ctx); // golden hour, dusk, dawn (motion.js)
  drawWeather(ctx);
  drawChaosFlash(ctx);
  drawComboHud(ctx);
  drawMini();
}

/** A small yellow arrow bobbing over your character, so you can find yourself in a crowd (wherever you walk). */
function drawMeMarker(g) {
  if (me.hidden || !S.gender || !onScreen(me.x)) return;
  const m = at(me);
  const x = Math.round(m.x);
  const lift = bubble && Math.abs(bubble.x - me.x) < 12 ? 12 : 0; // over a talk bubble, not under it
  const y = Math.round(m.y) - 33 - lift + (Math.floor(clockTick() / 4) % 2);
  R(g, x - 3, y - 1, 7, 1, OL);
  R(g, x - 3, y, 7, 1, '#ffd23f');
  R(g, x - 2, y + 1, 5, 1, '#ffd23f');
  R(g, x - 1, y + 2, 3, 1, '#ffd23f');
  R(g, x, y + 3, 1, 1, '#ffd23f');
  R(g, x - 4, y, 1, 1, OL);
  R(g, x + 4, y, 1, 1, OL);
  R(g, x - 3, y + 1, 1, 1, OL);
  R(g, x + 3, y + 1, 1, 1, OL);
  R(g, x - 2, y + 2, 1, 1, OL);
  R(g, x + 2, y + 2, 1, 1, OL);
  R(g, x - 1, y + 3, 1, 1, OL);
  R(g, x + 1, y + 3, 1, 1, OL);
  R(g, x, y + 4, 1, 1, OL);
}

/**
 * A view you move yourself (drag, wheel, ◀ ▶, chaos mode) glides there every drawn frame, not at the minds' 8 Hz,
 * so scrolling is smooth: most of the way within a tick (125 ms).
 */
function cameraTick(k) {
  const target = MODE === 'chaos' ? chaosCam : lifeCam ? lifeCam.x : null;
  if (target == null) return;
  const d = Math.max(0, Math.min(W - VIEW_W, target)) - camX;
  camX = Math.abs(d) < 0.3 ? camX + d : camX + d * (1 - Math.pow(0.03, k));
}

/** The view follows you; true when it moved. */
function follow() {
  if (MODE !== 'chaos' && lifeFollow()) return true;
  if (MODE === 'chaos') {
    chaosCam = Math.max(0, Math.min(W - VIEW_W, chaosCam));
    return Math.abs(chaosCam - camX) >= 0.5; // cameraTick() glides there, frame by frame
  }
  // Tests can hold the view somewhere (window.__camAt, in tiles).
  if (typeof window.__camAt === 'number') {
    camX = Math.max(0, Math.min(W - VIEW_W, window.__camAt * T - VIEW_W / 2));
    return true;
  }
  const want = Math.max(0, Math.min(W - VIEW_W, me.x - VIEW_W / 2));
  if (Math.abs(want - camX) < 0.5) return false;
  camX += Math.sign(want - camX) * Math.max(0.5, Math.min(3, Math.abs(want - camX) * 0.15));
  return true;
}

// ── The day loop: 8 frames a second while on screen ────────────────────────────────────────────────────────────────

const FRAME_MS = 125;
let shown = true;
let saver = false;
let loop = 0;
let task = null;
let rest = 0;
let talkFrames = 0;

let onBattery = false;
let canvasVisible = true; // the town scrolled out of the panel draws nothing
const live = () => shown && !saver && canvasVisible;

let clock = 0;
function tick() {
  let moved = false;
  // Where everyone was, so frames in between can slide smoothly to where they are now.
  for (const e of people) [e.px, e.py] = [e.x, e.y];
  for (const e of animals) [e.px, e.py] = [e.x, e.y];
  [me.px, me.py] = [me.x, me.y];
  if (thief) [thief.px, thief.py] = [thief.x, thief.y];
  prevCam = camX;
  me.gender = S.gender;
  if (++clock % 480 === 0) {
    // About once a minute: day / night, a new day, a new season.
    const n = isNight();
    if (n !== night) {
      night = n;
      cache.dirty = true;
    }
    const d = S.days;
    tickDay();
    checkSeason();
    if (checkWeather()) {
      paintUi();
      if (weather !== 'sun') story(weather === 'snow' ? '눈이 소복소복 내려요.' : weather === 'storm' ? '폭풍이 몰아쳐요! 다들 집으로 피했어요.' : '비가 와요. 작물이 쑥쑥 자라요.');
    }
    if (S.days !== d) paintUi();
  }
  if (S.sickDays > 0 && !me.path.length && !task) {
    const [hx, hy] = HOME_DOOR;
    if (Math.round((me.x - T / 2) / T) !== hx) route(me, [hx, hy]);
  }
  for (const e of people) moved = (e.kind === 'dog' || e.kind === 'petcat' ? dogThink(e) : think(e)) || moved;
  for (const e of animals) moved = animalThink(e) || moved;
  moved = chaosTick() || moved;
  moved = villageTick() || moved;
  moved = juiceTick() || moved;
  if (me.sulk > 0) me.sulk--;
  for (const s of sites) s.left--;
  if (sites.length && sites[0].left <= 0) sites.shift();
  moved = moved || sites.length > 0;
  if (talkFrames > 0 && --talkFrames === 0) bubble = null;
  if (thief) {
    moved = true;
    if (!step(thief) || thief.x > me.x + VIEW_W) thief = null;
  }
  if (me.path.length) {
    const walk = me.speed;
    me.speed = walk * rideSpeed(); // faster on your ride (rides.js)
    moved = step(me) || moved;
    me.speed = walk;
    if (me.dir === 'l' || me.dir === 'r') me.lastLR = me.dir;
  }
  else if (task && !me.act) {
    // Arrived: play the action (hoe, hammer, basket…), then it happens.
    me.act = { tool: task.tool ?? 'sparkle', n: 10, t: 10 };
    me.dir = 'd';
    moved = true;
  } else if (task && --me.act.t > 0) moved = true;
  else if (task && !task.job && nextTask()?.what !== task.what) {
    // Things changed on the way (a thief, a war, the bill came first): don't pay for what's no longer affordable.
    me.act = null;
    task = null;
    rest = 2;
    moved = true;
  } else if (task) {
    me.act = null;
    const before = S.coins;
    const said = task.act();
    if (S.coins < before) lifeCount('spent', before - S.coins);
    popAt(me.x, me.y);
    gainXp(3);
    save();
    if (typeof said === 'string') {
      $('now').textContent = said;
      bubble = { x: me.x, y: me.y, heart: S.spouse != null && said.includes('평생') };
      talkFrames = 20;
    }
    task = null;
    rest = restAfter();
    moved = true;
    paintUi();
  } else if (rest > 0) rest--;
  else {
    task = nextTask();
    if (task) {
      $('now').textContent = task.what;
      route(me, nearestWalkable(task.to[0], task.to[1]));
      startTrip();
    } else {
      $('now').textContent = '마을 산책';
      if (Math.random() < 0.3) {
        route(me, [Math.floor(Math.random() * COLS), ROAD_Y]);
        startTrip();
      }
      rest = 24;
    }
  }
  moved = follow() || moved;
}

let raf = 0;
let lastTick = 0;
let lastFrame = 0;
/** One animation frame: catch the minds up (8 Hz), move the little things by the time passed, draw. */
const FPS = 45; // everywhere: smooth scrolling, still well under 60
let lastRaf = 0;
let frameK = 0; //  this frame's ticks' worth of time (for effects drawn in frame())
let drawDebt = 0; // ms owed to drawing: at 60 Hz, 45 fps draws three frames of every four (a gap check could only halve)
function loopFrame(now) {
  raf = 0;
  if (!live()) return;
  drawDebt += lastRaf ? Math.min(100, now - lastRaf) : 1000 / FPS;
  lastRaf = now;
  if (drawDebt < 1000 / FPS - 1) {
    raf = requestAnimationFrame(loopFrame);
    return;
  }
  drawDebt = Math.min(drawDebt - 1000 / FPS, 1000 / FPS);
  if (hitStop > 0) {
    // A big hit holds the picture for a beat (the view still shakes); time doesn't pile up meanwhile.
    hitStop--;
    if (lastTick) lastTick += 1000 / FPS;
    lastFrame = now;
    frame();
    raf = requestAnimationFrame(loopFrame);
    return;
  }
  if (!lastTick || now - lastTick > 1000) lastTick = now - FRAME_MS;
  while (now - lastTick >= FRAME_MS) {
    tick();
    lastTick += FRAME_MS;
  }
  const k = Math.min(4, (now - (lastFrame || now)) / FRAME_MS); // ticks' worth of time since the last frame
  frameK = k;
  lastFrame = now;
  alpha = Math.min(1, (now - lastTick) / FRAME_MS);
  birdsThink(k);
  weatherTick(k);
  skyTick(k);
  critterTick(k);
  farmTick(k);
  chaosVisual(k);
  villageVisual(k);
  juiceVisual(k);
  trafficTick(cars, k);
  goldenTick(k);
  fxTick(k);
  holidayTick(k);
  cameraTick(k);
  frame();
  raf = requestAnimationFrame(loopFrame);
}

function wake() {
  clearInterval(loop);
  loop = 0;
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
  lastTick = 0;
  lastFrame = 0;
  lastRaf = 0;
  drawDebt = 0;
  if (live()) raf = requestAnimationFrame(loopFrame);
  else {
    catchUp();
    task = null;
    me.path = [];
    save();
    paintUi();
    frame();
  }
}

// ── The page around the picture ────────────────────────────────────────────────────────────────────────────────────

const $ = (id) => document.getElementById(id);
/** What kind of moment a story line is (a coloured dot instead of an emoji), and its text without the emoji. */
function storyKind(text) {
  const t = text.replace(/^\p{Extended_Pictographic}️?\s*/u, '');
  const kind =
    /^(🔥|⚔️)/u.test(text) || /도둑|해킹|서리|전쟁/.test(text) ? 'war'
    : /^😷/u.test(text) || /앓|병|역병|바이러스/.test(text) ? 'ill'
    : /^🏅/u.test(text) || /레벨이 올랐/.test(text) ? 'ach'
    : /^(⚡)/u.test(text) || /앙숙/.test(text) ? 'war'
    : /^(💍|👶|💕|💔|🤝)/u.test(text) || /결혼|아기|아이|첫째|둘째|셋째|연인|고백|화해/.test(text) ? 'love'
    : /^📖/u.test(text) ? 'dex'
    : /^(🪓|🌾|🏛)/u.test(text) || /지었|이사 왔|발전했|개간/.test(text) ? 'build'
    : /^🛒/u.test(text) || /옷가게|상인/.test(text) ? 'shop'
    : /비가|눈이|폭풍/.test(text) ? 'weather'
    : '';
  return { kind, text: t };
}
const el = (tag, cls, text) => Object.assign(document.createElement(tag), cls ? { className: cls } : {}, text != null ? { textContent: text } : {});
const chip = (label, value, cls = '') => {
  const c = el('span', `chip ${cls}`);
  c.append(`${label} `, el('b', '', value));
  return c;
};

function paintUi() {
  const lv = levelOf(S.xp);
  const into = xpFor(lv + 1) - xpFor(lv);
  $('coins').textContent = fmt(S.coins);
  $('bag').textContent = fmt(S.bag);
  $('level').textContent = `Lv.${lv}`;
  $('xp').style.width = `${Math.round(((S.xp - xpFor(lv)) / into) * 100)}%`;
  $('xpText').textContent = `${fmt(S.xp - xpFor(lv))} / ${fmt(into)}`;
  $('house').textContent = [era().name, era().title, myJob()?.name].filter(Boolean).join(' · ');
  $('hudDay').textContent = `${S.days}일차 · ${SEASONS[Math.max(0, S.season)]}`;
  checkAchievements();
  $('pop').textContent = fmt(population());

  const familySize = 1 + (S.spouse != null ? 1 : 0) + S.kids;
  const animalsOwned = S.chickens + S.cows + S.sheep + S.pigs + S.goats + S.horses + S.alpacas + (S.donkeys ?? 0) + (S.turkeys ?? 0);
  $('family').replaceChildren(
    chip('가족', `${familySize}명`),
    chip('이웃', `${S.houses}가구`),
    chip('행복', S.happy >= 70 ? '좋아요' : S.happy >= 30 ? '보통' : '외로워요'),
    chip('용돈', `${fmt(S.pocket)}코인`),
    chip('창고', `나무 ${fmt(S.stock.wood)} · 돌 ${fmt(S.stock.stone)}`),
    chip('동물', `${animalsOwned}마리`),
  );
  $('traits').replaceChildren(
    ...(S.traits ? TRAITS.map(([k, name]) => {
      const d = el('div', '', name);
      d.append(el('b', '', '★'.repeat(S.traits[k]) + '☆'.repeat(5 - S.traits[k])));
      return d;
    }) : []),
  );

  $('over').hidden = !S.over;
  if (S.over)
    $('overText').textContent = `${S.over.days}일 동안 살면서 ${S.over.era}까지 키웠어요. 이웃 ${S.over.houses}가구, 가족 ${S.over.family}명, Lv.${S.over.level}. 다음 마을은 유산 🪙${fmt(inherit(S).gift)}을 받고 시작해요.${S.hall?.length ? ` 지난 마을: ${S.hall.map((h) => `${h.era} ${h.days}일`).join(' · ')}` : ''}`;
  const goal = nextGoal();
  const mat = goal?.mat ? materialsText(goal.mat).replace('🪵', '나무 ').replace('🪨', '돌 ') : '';
  $('goal').textContent =
    S.sickDays > 0 ? `${S.sickDays}일 더 쉬어야 해요` : goal ? `${goal.what.replace(/ \(.*\)$/, '')} · ${fmt(goal.cost)}코인${mat ? ` · ${mat}` : ''}` : '다 이뤘어요';
  $('goalbar').style.width = goal ? `${Math.min(100, Math.round((S.coins / goal.cost) * 100))}%` : '100%';
  $('weather').textContent = `${WEATHER_NAMES[weather]}${rainbow ? ' · 무지개' : ''}${merchantHere() ? ' · 상인 왔어요' : ''}`;

  $('achCount').textContent = `업적 ${S.ach.length}`;
  $('achList').replaceChildren(
    ...ACHIEVEMENTS.map(([id, name]) => {
      const got = S.ach.includes(id);
      const li = el('li', '', got ? `✓ ${name}` : name);
      li.style.opacity = got ? '1' : '0.45';
      return li;
    }),
  );
  const jobs = new Map();
  for (const p of people) if (p.job && !p.zombie) jobs.set(p.job.name, (jobs.get(p.job.name) ?? 0) + 1);
  $('jobCount').textContent = `직업 ${jobs.size}`;
  const mine = myJob();
  const head = el('li', 'me');
  if (mine) {
    const [a, b] = JOB_FIT[mine.id];
    head.textContent = `내 직업 ${mine.name} · 수입 +${pct(myPay(0.5))}${VOLATILE.has(mine.id) ? ' (들쭉날쭉)' : ''} · ${traitName(a)} ${S.traits?.[a] ?? '-'} ${traitName(b)} ${S.traits?.[b] ?? '-'} · 오늘 ${fmt(S.jobToday ?? 0)}코인`;
  } else head.textContent = '캐릭터를 고르면 직업이 생겨요';
  const town = el('li', 'me', `이웃 직업 세금 +${pct(townPay())}`);
  $('jobList').replaceChildren(
    head,
    town,
    ...JOBS.map((j) => {
      const n = jobs.get(j.name);
      const li = el('li', '', j.era > S.era ? `${ERAS[j.era].name}에 열려요` : `${j.name}${n ? ` ${n}명` : ''} · +${pct(jobPay(j, null))}`);
      li.style.opacity = n || j.id === S.job ? '1' : '0.45';
      return li;
    }),
  );
  paintBuild();
  paintTimeline();
  paintMe();
  meFeel();
  paintAlbum();
  $('dexCount').textContent = `도감 ${S.dex.length + (S.variants?.length ?? 0)}/${DEX_TOTAL + VARIANT_TOTAL}`;
  const rare = (S.variants ?? []).map((k) => {
    const [kind, v] = k.split(':');
    return el('li', 'rare', `${VARIANTS.find((x) => x.id === v)?.name ?? ''} ${ANIMAL_NAMES[kind] ?? kind}`);
  });
  $('dexList').replaceChildren(
    ...rare,
    ...Object.entries(DEX).flatMap(([kind, list]) =>
      list.map(([name]) => {
        const got = S.dex.includes(`${kind}:${name}`);
        const li = el('li', '', got ? name : `${{ fish: '물고기', gem: '광물', forage: '숲' }[kind]} ???`);
        li.style.opacity = got ? '1' : '0.45';
        return li;
      }),
    ),
  );
  $('story').replaceChildren(
    ...(storyItems() ?? S.story.map((s) => {
      const { kind, text } = storyKind(s.text);
      const li = el('li');
      li.append(el('span', 'day', `${s.day}일차`), el('span', `dot ${kind}`), el('span', '', text));
      return li;
    })),
  );
  if (MODE !== 'life') return;
  const ripe = S.plots.some((p) => p.planted && p.g >= GROW);
  void aquila.chip(`${fmt(S.coins)}${ripe ? ' 수확' : ''}`).catch(() => {});
}

/** The one choice at the start: who you live as. Traits are rolled, a job follows. */
function pickGender(gender) {
  if (S.gender) return;
  S.gender = gender === 'm' ? 'm' : 'f';
  S.traits = rollTraits();
  S.temper = TEMPERS[Math.floor(Math.random() * TEMPERS.length)].id; // born with it, like the abilities
  updateMyJob(true);
  $('pick').hidden = true;
  const best = TRAITS.reduce((a, t) => (S.traits[t[0]] > S.traits[a[0]] ? t : a));
  const worst = TRAITS.reduce((a, t) => (S.traits[t[0]] < S.traits[a[0]] ? t : a));
  story(`빈 들판에 작은 움막을 지었어요. 타고난 ${best[1]}은(는) 좋지만 ${worst[1]}은(는) 약해요. 성격은 ${myTemper().name}이에요.`);
  save();
  paintUi();
  wake();
}

async function start() {
  // In Chrome the town grows with browser time instead of Claude / Codex usage (see chrome/chrome-shim.js).
  // In Chrome: this Mac's Claude / Codex usage through the local helper, or else browser time (chrome/chrome-shim.js).
  if (window.VILLAGE_SOURCE) {
    await aquila.usage().catch(() => null);
    $('hint').textContent =
      window.VILLAGE_SOURCE === 'local'
        ? '이 맥의 Claude·Codex 사용량만큼 마을이 자라요. 주간 사용량 1%가 코인 10이에요.'
        : '브라우저를 켜 둔 1시간마다 코인 10. Claude·Codex 도우미를 설치하면 사용량으로 자라요.';
  }
  try {
    const saved = await aquila.storage.get('save');
    if (saved && saved.v === 2) S = { ...fresh(), ...saved };
    ensurePlots();
  } catch {
    /* first run */
  }
  tickDay();
  checkSeason();
  checkWeather();
  $('again').addEventListener('click', () => {
    // A new town; usage so far stays the baseline (it was this town's, not the next one's).
    // What the fallen town leaves: coins for a start, and a place in the hall of towns.
    const inh = inherit(S);
    S = { ...fresh(), usage: S.usage, hall: inh.hall, runs: inh.runs };
    S.coins += inh.gift;
    story(`🎁 지난 마을이 남긴 유산으로 🪙${fmt(inh.gift)}을 받았어요. ${inh.runs}번째 마을이에요.`);
    applyLayout(S.mapSeed); // a new map for the new town
    ensureLots(0);
    tickDay();
    checkSeason();
    spawnFamily();
    spawnAnimals();
    spawnCars();
    cache.dirty = true;
    $('over').hidden = true;
    $('pick').hidden = false;
    save();
    paintUi();
    frame();
  });
  if (!S.mapSeed) S.mapSeed = Math.floor(Math.random() * 1e9);
  applyLayout(S.mapSeed);
  carveGroves();
  ensureLots(S.houses + S.ruins);
  wireCamera();
  wireChaos();
  wireVisit();
  if (!S.gender) $('mode').hidden = false;
  for (const b of document.querySelectorAll('#pick button')) b.addEventListener('click', () => pickGender(b.dataset.gender));
  try {
    const p = await aquila.power();
    saver = !!p.saver;
    onBattery = !!p.onBattery;
  } catch {
    /* fine */
  }
  try {
    const gain = absorb(await aquila.usage());
    if (gain >= 1) story(`그동안 일한 덕분에 ${fmt(gain)}코인이 들어왔어요.`);
  } catch {
    /* no usage yet */
  }
  spawnFamily();
  spawnAnimals();
  spawnCars();
  save();
  paintUi();
  frame();
  aquila.on('usage', (list) => {
    if (absorb(list) <= 0) return;
    save();
    paintUi();
    if (!live()) wake();
  });
  aquila.on('visible', ({ visible }) => {
    shown = visible;
    wake();
  });
  aquila.on('power', ({ saver: s, onBattery: b }) => {
    saver = !!s;
    onBattery = !!b;
    wake();
  });
  const refit = () => {
    fitCanvas();
    frame();
  };
  // Next frame, not inside the observer: resizing the canvas there would trip the observer again.
  new ResizeObserver(() => requestAnimationFrame(refit)).observe(canvas.closest('.town') ?? canvas.parentElement);
  window.addEventListener('resize', refit);
  new IntersectionObserver(([entry]) => {
    canvasVisible = entry.isIntersecting;
    wake();
  }).observe(canvas);
  wireTabs();
  wireBuild();
  wireFun();
  welcomeBack();
  void loadAlbum().then(paintAlbum);
  checkHoliday();
  setInterval(checkHoliday, 10 * 60_000);
  $('snap')?.addEventListener('click', () => {
    snapshot('찰칵');
    toast('사진을 앨범에 넣었어요');
  });
  document.getElementById('albumTab')?.addEventListener('click', () => paintAlbum());
  setInterval(() => live() && paintTimeline(), 30_000);
  wake();
}

void start();
