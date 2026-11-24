// 작은 마을 — weather, building materials, the collection book, the travelling merchant, the night sky, lamps.
// Loaded after ai.js, before game.js. Everything here happens on its own; nothing needs a click.
'use strict';

// ── Weather: changes every 3 hours with the season; the same for everyone at the same time ─────────────────────────

const WEATHER_SLOT_MS = 3 * 3600_000;
const WEATHER_NAMES = { sun: '맑음', rain: '비', storm: '폭풍', snow: '눈' };

function weatherAt(slot) {
  const season = Math.max(0, S.season);
  const r = rng(slot * 7919 + 13)();
  if (season === 3) return r < 0.4 ? 'snow' : 'sun';
  const rain = [0.3, 0.35, 0.25][season];
  if (season === 1 && r < 0.1) return 'storm';
  return r < rain ? 'rain' : 'sun';
}
const slotNow = () => Math.floor(Date.now() / WEATHER_SLOT_MS);
let weather = 'sun';
let rainbow = false;
function checkWeather() {
  const before = weather;
  weather = weatherAt(slotNow());
  // A rainbow for the slot right after rain.
  rainbow = weather === 'sun' && ['rain', 'storm'].includes(weatherAt(slotNow() - 1));
  return before !== weather;
}
const raining = () => weather === 'rain' || weather === 'storm';

let drops = [];
function weatherTick(k = 1) {
  if (weather === 'sun') {
    drops.length = 0;
    return false;
  }
  const n = weather === 'storm' ? 70 : weather === 'rain' ? 45 : 35;
  while (drops.length < n) drops.push({ x: Math.random() * VIEW_W, y: Math.random() * H, v: 0.6 + Math.random() * 0.8 });
  for (const d of drops) {
    if (weather === 'snow') {
      d.y += d.v * 0.8 * k;
      d.x += Math.sin((d.y + d.v * 40) / 9) * 0.4 * k;
    } else {
      d.y += (5 + d.v * 3) * k;
      d.x -= (weather === 'storm' ? 2 : 1) * k;
    }
    if (d.y > H) {
      d.y = -4;
      d.x = Math.random() * (VIEW_W + 40);
    }
  }
  return true;
}
let flash = 0;
function drawWeather(g) {
  if (weather === 'rain' || weather === 'storm') {
    g.fillStyle = 'rgba(40, 60, 90, 0.18)';
    g.fillRect(0, 0, VIEW_W, H);
    g.fillStyle = 'rgba(200, 225, 255, 0.75)';
    for (const d of drops) {
      g.fillRect(Math.round(d.x), Math.round(d.y), 1, 3);
      g.fillRect(Math.round(d.x) - 1, Math.round(d.y) + 3, 1, 1);
    }
    if (weather === 'storm') {
      if (flash > 0) flash--;
      else if (Math.random() < 0.0006) flash = 12; // per frame (60 fps)
      if (flash) {
        g.fillStyle = 'rgba(255, 255, 255, 0.35)';
        g.fillRect(0, 0, VIEW_W, H);
      }
    }
  } else if (weather === 'snow') {
    g.fillStyle = '#ffffff';
    for (const d of drops) g.fillRect(Math.round(d.x), Math.round(d.y), d.v > 1 ? 2 : 1, d.v > 1 ? 2 : 1);
  }
  if (rainbow && !isNight()) {
    const colours = ['#ff6b6b', '#ffa94d', '#ffe066', '#69db7c', '#4dabf7', '#9775fa'];
    colours.forEach((c, i) => {
      g.fillStyle = c;
      g.globalAlpha = 0.35;
      const r = 120 - i * 3;
      for (let a = 0; a <= 180; a += 1) {
        const rad = (a * Math.PI) / 180;
        g.fillRect(Math.round(VIEW_W / 2 + Math.cos(rad) * r), Math.round(150 - Math.sin(rad) * r * 0.9), 2, 2);
      }
    });
    g.globalAlpha = 1;
  }
}

// ── Building materials: what villagers bring to the store is what houses are made of ───────────────────────────────

/** Wood and stone something needs (none in the stone age, which builds with branches). */
function materialsFor(kind, arg) {
  if (kind === 'house') return { wood: 2 + Math.floor(arg / 4), stone: S.era >= 1 ? 1 + Math.floor(arg / 6) : 0 };
  if (kind === 'landmark') return { wood: 10 + arg.era * 8, stone: 5 + arg.era * 6 };
  if (kind === 'era') return { wood: 0, stone: 5 * (S.era + 1) };
  return { wood: 0, stone: 0 };
}
const haveMaterials = (m) => S.stock.wood >= m.wood && S.stock.stone >= m.stone;
function useMaterials(m) {
  S.stock.wood -= m.wood;
  S.stock.stone -= m.stone;
  cache.dirty = true;
}
const materialsText = (m) => [m.wood ? `🪵${m.wood}` : '', m.stone ? `🪨${m.stone}` : ''].filter(Boolean).join(' ');

/** While nobody watches, villagers still work: the store fills with what you earn. */
function passiveGathering(gain) {
  S.stock.wood += Math.round(gain * 0.2 * 10) / 10;
  S.stock.stone += Math.round(gain * 0.15 * 10) / 10;
  S.stock.fish += Math.round(gain * 0.04 * 10) / 10;
  S.stock.berries += Math.round(gain * 0.06 * 10) / 10;
  // One find per 10 coins: a fish, a mineral or something from the woods.
  for (let i = 0; i < Math.floor(gain / 10); i++) find(['fish', 'gem', 'forage'][Math.floor(Math.random() * 3)]);
}

// ── The collection book ────────────────────────────────────────────────────────────────────────────────────────────

const DEX = {
  fish: [
    ['붕어', 30], ['잉어', 22], ['송어', 16], ['메기', 12], ['연어', 9], ['뱀장어', 6], ['무지개송어', 3], ['황금잉어', 1],
  ],
  gem: [['석탄', 30], ['철광석', 22], ['구리', 16], ['은', 10], ['금', 6], ['다이아몬드', 2], ['운석 조각', 0.6]],
  forage: [['산딸기', 30], ['블루베리', 24], ['버섯', 20], ['송이버섯', 5], ['네잎클로버', 2]],
  // Dug up or found when clearing woods; shown in a museum (pastimes.js).
  relic: [['토기 조각', 30], ['돌도끼', 24], ['청동 거울', 14], ['암모나이트 화석', 10], ['공룡 이빨', 5], ['금관', 2], ['공룡 뼈 화석', 1]],
  // From the pier or your own boat, on maps with a sea.
  sea: [['고등어', 30], ['오징어', 24], ['꽃게', 18], ['문어', 12], ['참치', 6], ['복어', 4], ['고래상어', 1]],
  // Rare visitors drawn by what you placed: never rolled, added when they come (weight 0).
  visitor: [['공작', 0], ['두루미', 0], ['레서판다', 0], ['흰 사슴', 0]],
};
const DEX_VERB = { fish: '낚았어요', gem: '캐냈어요', forage: '찾았어요', relic: '발굴했어요', sea: '낚았어요' };
const DEX_TOTAL = Object.values(DEX).reduce((a, l) => a + l.length, 0);

/** Rolls a find; a new one goes in the book (rare ones pay). */
function find(kind) {
  const list = DEX[kind];
  const total = list.reduce((a, [, w]) => a + w, 0);
  let r = Math.random() * total;
  let i = 0;
  for (; i < list.length - 1; i++) if ((r -= list[i][1]) < 0) break;
  const [name] = list[i];
  const key = `${kind}:${name}`;
  if (S.dex.includes(key)) return;
  S.dex.push(key);
  const rare = i >= list.length - 2;
  const bonus = rare ? 30 + i * 10 : 0;
  S.coins += bonus;
  story(`📖 도감에 새로 올랐어요: ${name}을(를) ${DEX_VERB[kind]}!${bonus ? ` 귀한 거라 🪙${bonus}에 팔렸어요.` : ''}`);
}

// ── The travelling merchant: now and then, at the square, for a day ──────────────────────────────────────────────

const MERCHANT_ITEMS = [
  { id: 'golden-seeds', name: '황금 씨앗', price: 30, does: '밭의 작물이 모두 바로 익어요' },
  { id: 'charm', name: '행운 부적', price: 60, does: '행운이 1 올라요' },
  { id: 'tonic', name: '보약', price: 80, does: '체력이 1 올라요' },
  { id: 'cat', name: '아기 고양이', price: 40, does: '고양이가 졸졸 따라다녀요' },
];
const merchantHere = () => S.merchant?.day === today();
function merchantRoll() {
  if (S.era < 1 || Math.random() > 0.2) return;
  S.merchant = { day: today(), sold: [] };
  story('🛒 떠돌이 상인이 수레를 끌고 광장에 왔어요. 오늘 하루만 있어요.');
}
/** What you'd buy from the merchant now (pocket money), or null. */
function merchantPick() {
  if (!merchantHere()) return null;
  return (
    MERCHANT_ITEMS.find(
      (i) =>
        !S.merchant.sold.includes(i.id) &&
        i.price <= S.pocket &&
        !(i.id === 'charm' && trait('luck') >= 5) &&
        !(i.id === 'tonic' && trait('health') >= 5) &&
        !(i.id === 'cat' && S.cat),
    ) ?? null
  );
}
function merchantBuy(item) {
  S.pocket -= item.price;
  S.merchant.sold.push(item.id);
  if (item.id === 'golden-seeds') S.plots.forEach((p) => Object.assign(p, { planted: true, g: GROW }));
  if (item.id === 'charm') S.traits.luck = Math.min(5, S.traits.luck + 1);
  if (item.id === 'tonic') S.traits.health = Math.min(5, S.traits.health + 1);
  if (item.id === 'cat') S.cat = true;
  story(`떠돌이 상인에게서 ${item.name}을(를) 샀어요. ${item.does}.`);
  cache.dirty = true;
  spawnFamily();
}
const MERCHANT_LOOK = { hair: '#5a4a3a', top: '#7a5ab0', legs: '#3a3048' };
function drawMerchant(g) {
  if (!merchantHere()) return;
  const x = (PLAZA.x + 4) * T + 6;
  const y = (PLAZA.y + 1) * T + 10;
  // The cart: a striped awning over crates.
  shadow(g, x + 10, y + 1, 22);
  box(g, x, y - 10, 20, 9, '#a87344', '#5a3a26');
  for (let i = 0; i < 22; i += 4) R(g, x - 1 + i, y - 16, 2, 4, i % 8 ? '#f2efe6' : '#7a5ab0');
  R(g, x - 1, y - 17, 22, 1, '#5a3a26');
  for (const [dx, c] of [[3, '#ffe066'], [8, '#e8505b'], [13, '#5ab4e0']]) R(g, x + dx, y - 12, 3, 2, c);
  disc(g, x + 3, y, 2, '#4a3026');
  disc(g, x + 17, y, 2, '#4a3026');
  drawPerson(g, { x: x - 6, y: y + 2, dir: 'r', frame: 0, path: [], seed: 3 }, MERCHANT_LOOK);
}

// ── The night sky: shooting stars, and fireworks on a summer festival night ───────────────────────────────────────

let sky = [];
function skyTick(k = 1) {
  if (!isNight()) {
    sky.length = 0;
    return false;
  }
  if (Math.random() < 0.006 * k) sky.push({ kind: 'star', x: Math.random() * VIEW_W, y: 4 + Math.random() * 30, t: 14 });
  if (festivalToday() && S.season === 1 && Math.random() < 0.04 * k) {
    const colour = ['#ff6b81', '#ffe066', '#69db7c', '#74c0fc', '#da77f2'][Math.floor(Math.random() * 5)];
    sky.push({ kind: 'firework', x: 20 + Math.random() * (VIEW_W - 40), y: 10 + Math.random() * 30, t: 18, colour });
  }
  sky = sky.filter((s) => (s.t -= k) > 0);
  return sky.length > 0;
}
function drawSky(g) {
  for (const s of sky) {
    if (s.kind === 'star') {
      const k = 14 - s.t;
      for (let i = 0; i < 5; i++) {
        g.fillStyle = `rgba(255, 255, 230, ${0.9 - i * 0.18})`;
        g.fillRect(Math.round(s.x + k * 3 - i * 2), Math.round(s.y + k * 1.5 - i), 1, 1);
      }
    } else {
      const k = 18 - s.t;
      g.fillStyle = s.colour;
      for (let a = 0; a < 12; a++) {
        const rad = (a / 12) * Math.PI * 2;
        g.fillRect(Math.round(s.x + Math.cos(rad) * k), Math.round(s.y + Math.sin(rad) * k + k * 0.15), 1, 1);
      }
    }
  }
}

// ── Lamps along the road: torches, gas lamps, street lights — lit at night ────────────────────────────────────────

const LAMP_X = Array.from({ length: 60 }, (_, i) => 3 + i * 6); // filtered to the map's width when drawn
function drawLamps(g) {
  if (S.era < 1) return;
  const y = ROAD_Y * T - 1;
  for (const lx of LAMP_X) {
    if (lx >= COLS) break;
    if (inSeaTile(lx)) continue;
    const x = lx * T + 12;
    if (S.era <= 2) {
      R(g, x, y - 10, 2, 10, '#6b4428');
      R(g, x - 1, y - 12, 4, 2, '#4a3026');
      if (night) {
        R(g, x, y - 15, 2, 3, '#ffb347');
        R(g, x, y - 14, 2, 1, '#ffe066');
      }
    } else {
      R(g, x, y - 16, 1, 16, S.era >= 4 ? '#5a5e66' : '#3a3a42');
      R(g, x - 2, y - 18, 5, 3, S.era === 5 ? '#5ad7e8' : '#3a3a42');
      R(g, x - 1, y - 16, 3, 1, night ? '#ffe9a8' : '#c8ccd2');
    }
  }
}
/** Soft pools of light under the lamps (drawn over the night tint). */
function drawLampGlow(g) {
  if (S.era < 1 || !night) return;
  for (const lx of LAMP_X) {
    if (inSeaTile(lx)) continue;
    const x = lx * T + 13 - Math.round(viewX);
    if (x < -20 || x > VIEW_W + 20) continue;
    const y = ROAD_Y * T - (S.era <= 2 ? 14 : 15);
    for (const [r, a] of [[14, 0.06], [9, 0.08], [5, 0.12]]) {
      g.fillStyle = `rgba(255, 220, 140, ${a})`;
      disc(g, x, y + 6, r, g.fillStyle);
    }
  }
}

// ── Little life: butterflies over the flowers, fireflies on summer nights, fish jumping in the lake ────────────────

let critters = [];
function critterTick(k = 1) {
  const day = !isNight();
  const left = camX - 20;
  const right = camX + VIEW_W + 20;
  const wantFlies = day && weather === 'sun' && S.season <= 1 ? 6 : 0;
  const wantGlow = !day && S.season === 1 && weather === 'sun' ? 14 : 0;
  const count = (k) => critters.filter((c) => c.k === k).length;
  while (count('fly') < wantFlies)
    critters.push({ k: 'fly', x: left + Math.random() * (right - left), y: 40 + Math.random() * 130, c: ['#ff9ec2', '#ffe066', '#a8d4ff', '#ffffff'][critters.length % 4], t: 0 });
  while (count('glow') < wantGlow)
    critters.push({ k: 'glow', x: left + Math.random() * (right - left), y: 100 + Math.random() * 80, t: Math.floor(Math.random() * 40) });
  if (Math.random() < 0.01 * k && camX + VIEW_W > LAKE.x * T && camX < (LAKE.x + LAKE.w) * T)
    critters.push({ k: 'jump', x: (LAKE.x + 1 + Math.random() * (LAKE.w - 2)) * T, y: (LAKE.y + 1.5) * T, t: 0 });
  critters = critters.filter((c) => {
    c.t += k;
    if (c.k === 'fly') {
      c.x += Math.sin(c.t / 7 + c.y) * 0.8 * k;
      c.y += Math.cos(c.t / 5 + c.x) * 0.5 * k;
      return wantFlies > 0 && c.x > left - 40 && c.x < right + 40;
    }
    if (c.k === 'glow') {
      c.x += Math.sin(c.t / 11) * 0.3 * k;
      c.y += Math.cos(c.t / 13) * 0.3 * k;
      return wantGlow > 0;
    }
    return c.t < 18; // a jump lasts 18 frames
  });
  return critters.length > 0;
}
function drawCritters(g) {
  for (const c of critters) {
    const x = Math.round(c.x);
    const y = Math.round(c.y);
    if (c.k === 'fly') {
      const open = Math.floor(c.t / 3) % 2 === 0;
      R(g, x, y, 1, 2, '#4a3a40');
      if (open) {
        R(g, x - 2, y - 1, 2, 2, c.c);
        R(g, x + 1, y - 1, 2, 2, c.c);
      } else {
        R(g, x - 1, y - 1, 1, 2, c.c);
        R(g, x + 1, y - 1, 1, 2, c.c);
      }
    } else if (c.k === 'glow') {
      if (Math.floor(c.t) % 40 < 26) {
        R(g, x, y, 1, 1, '#fff6a0');
        g.fillStyle = 'rgba(255, 246, 160, 0.25)';
        g.fillRect(x - 1, y - 1, 3, 3);
      }
    } else {
      const k = Math.floor(c.t);
      const fy = y - Math.round(Math.sin((k / 18) * Math.PI) * 10);
      if (k < 16) {
        R(g, x + k, fy, 4, 2, '#8fb8d8');
        R(g, x + k + 3, fy - 1, 1, 1, '#c9e4f5');
      }
      if (k < 4 || k > 14) {
        R(g, x + (k > 14 ? 16 : 0) - 2, y + 1, 6, 1, '#e9f7ff');
        R(g, x + (k > 14 ? 16 : 0) - 3, y + 2, 1, 1, '#e9f7ff');
        R(g, x + (k > 14 ? 16 : 0) + 4, y + 2, 1, 1, '#e9f7ff');
      }
    }
  }
}

// ── The farm grows too: more fields, a scarecrow, an orchard, beehives, sprinklers, a greenhouse, a tractor ───────

const FARM_UPGRADES = [
  { id: 'scarecrow', name: '허수아비', era: 0, cost: 20, does: '까마귀가 작물을 못 쪼아 먹어요' },
  { id: 'field2', name: '밭 넓히기', era: 1, cost: 120, does: '밭이 12칸이 돼요' },
  { id: 'orchard', name: '과수원', era: 1, cost: 150, does: '사과가 열려 수입이 늘어요' },
  { id: 'beehive', name: '벌통', era: 1, cost: 90, does: '꿀이 모여 수입이 늘어요' },
  { id: 'field3', name: '밭 더 넓히기', era: 2, cost: 350, does: '밭이 18칸이 돼요' },
  { id: 'sprinkler', name: '스프링클러', era: 3, cost: 600, does: '작물이 20% 빨리 자라요' },
  { id: 'field4', name: '큰 농장', era: 3, cost: 800, does: '밭이 24칸이 돼요' },
  { id: 'greenhouse', name: '온실', era: 4, cost: 1200, does: '겨울에도 작물이 잘 자라요' },
  { id: 'tractor', name: '트랙터', era: 4, cost: 1000, does: '작물이 10% 비싸게 팔려요' },
];
const farmHas = (id) => S.farm.includes(id);
const plotCount = () => 6 + 6 * ['field2', 'field3', 'field4'].filter(farmHas).length;
function ensurePlots() {
  while (S.plots.length < plotCount()) S.plots.push({ planted: false, g: 0 });
}
const farmPick = () => FARM_UPGRADES.find((u) => !farmHas(u.id) && u.era <= S.era && S.coins >= u.cost) ?? null;
function farmBuy(u) {
  S.coins -= u.cost;
  S.farm.push(u.id);
  ensurePlots();
  story(`🌾 농장에 ${u.name}을(를) 들였어요. ${u.does}.`);
  cache.dirty = true;
}
/** How fast crops grow now: sprinklers help, winter slows them unless there's a greenhouse. */
const farmGrowMul = () => (farmHas('sprinkler') ? 1.2 : 1) * (S.season === 3 && !farmHas('greenhouse') ? 0.6 : 1);
const farmProduce = () => (farmHas('orchard') ? 0.08 : 0) + (farmHas('beehive') ? 0.06 : 0);
const farmPriceMul = () => (farmHas('tractor') ? 1.1 : 1);

/** A new day: without a scarecrow, crows may get the ripe crops. */
function crows() {
  if (farmHas('scarecrow')) return;
  const ripe = S.plots.filter((p) => p.planted && p.g >= GROW);
  if (!ripe.length || Math.random() > 0.3) return;
  for (const p of ripe) Object.assign(p, { planted: false, g: 0 });
  story(`까마귀 떼가 내려와 다 익은 ${era().crop} ${ripe.length}개를 쪼아 먹었어요. 허수아비가 있었다면…`);
  cache.dirty = true;
}

const ORCHARD = [[40, 9], [42, 9], [41, 11]];
const HIVES = [[39, 10], [39.6, 11]];
function drawFarm(g) {
  if (farmHas('scarecrow')) scarecrow(g, (FARM.x + 3.5) * T, 9 * T);
  if (farmHas('orchard')) for (const [x, y] of ORCHARD) appleTree(g, x * T + 8, y * T + 4, S.season === 1 || S.season === 2);
  if (farmHas('beehive')) for (const [x, y] of HIVES) beehive(g, x * T, y * T);
  if (farmHas('sprinkler')) for (const [x, y] of PLOT_AT.slice(0, plotCount())) if ((x + y) % 2 === 0) sprinklerHead(g, x * T + 15, y * T + 15);
  if (farmHas('greenhouse')) greenhouse(g, (FARM.x + 10) * T - 1, 8 * T - 4, 2 * T + 2, 3 * T + 4);
}

/** Moving farm life: bees by the hives, sprinkler spray, crows on the field, the tractor going up and down. */
let farmBits = [];
let tractor = { x: 43 * 16, v: 0.5 }; // tile 43 (T isn't defined yet when this file loads)
function farmTick(k = 1) {
  const day = !isNight() && weather === 'sun';
  const visible = camX + VIEW_W > (FARM.x - 3) * T && camX < (FARM.x + 13) * T;
  if (!visible) return false;
  if (farmHas('beehive') && day && S.season !== 3 && farmBits.filter((b) => b.k === 'bee').length < 6)
    farmBits.push({ k: 'bee', x: HIVES[0][0] * T, y: HIVES[0][1] * T - 8, t: Math.floor(Math.random() * 50) });
  if (farmHas('sprinkler') && day && Math.random() < 0.15 * k) {
    const [x, y] = PLOT_AT[Math.floor(Math.random() * plotCount())];
    farmBits.push({ k: 'spray', x: x * T + 15, y: y * T + 10, t: 0 });
  }
  const ripe = S.plots.some((p) => p.planted && p.g >= GROW);
  if (!farmHas('scarecrow') && ripe && day && farmBits.filter((b) => b.k === 'crow').length < 3 && Math.random() < 0.01 * k) {
    const [x, y] = PLOT_AT[Math.floor(Math.random() * plotCount())];
    farmBits.push({ k: 'crow', x: x * T + 8, y: y * T + 12, t: 0 });
  }
  farmBits = farmBits.filter((b) => {
    b.t += k;
    if (b.k === 'bee') {
      b.x = HIVES[0][0] * T + Math.sin(b.t / 6) * 14 + Math.cos(b.t / 17) * 10;
      b.y = HIVES[0][1] * T - 10 + Math.cos(b.t / 5) * 6;
      return day;
    }
    if (b.k === 'spray') return b.t < 10;
    return b.t < 160; // crows peck a while, then fly off
  });
  if (farmHas('tractor') && day) {
    tractor.x += tractor.v * k;
    if (tractor.x > (FARM.x + 11) * T || tractor.x < (FARM.x + 4) * T) tractor.v *= -1;
  }
  return farmBits.length > 0 || farmHas('tractor');
}
function drawFarmLife(g) {
  for (const b of farmBits) {
    const x = Math.round(b.x);
    const y = Math.round(b.y);
    if (b.k === 'bee') {
      R(g, x, y, 2, 1, '#f2c24a');
      R(g, x + 1, y, 1, 1, '#2a2a30');
      if (b.t % 4 < 2) R(g, x, y - 1, 1, 1, '#ffffff');
    } else if (b.k === 'spray') {
      for (const [dx, dy] of [[-3, -b.t / 2], [3, -b.t / 2], [0, -b.t / 1.5], [-5, -b.t / 3], [5, -b.t / 3]])
        R(g, x + dx * (b.t / 6), Math.round(y + dy), 1, 1, '#bfe6ff');
    } else {
      const flying = b.t > 140;
      spr(g, flying ? BIRD[Math.floor(b.t / 4) % 2] : CROW[Math.floor(b.t / 12) % 2], flying ? BIRD_PAL : CROW_PAL, x, flying ? y - (b.t - 140) * 2 : y - 4, b.t % 80 > 40);
    }
  }
  if (farmHas('tractor')) {
    const x = Math.round(tractor.x);
    const y = 10 * T + 12;
    const left = tractor.v < 0;
    shadow(g, x + 8, y + 1, 16);
    box(g, x + 2, y - 8, 12, 6, '#e05a3a', '#8a2a1a');
    box(g, x + (left ? 2 : 8), y - 13, 6, 6, '#cfe8f5', '#5a6a7a');
    disc(g, x + (left ? 12 : 4), y - 2, 3, '#2a2a30');
    disc(g, x + (left ? 12 : 4), y - 2, 1, '#8a8e96');
    disc(g, x + (left ? 3 : 13), y - 1, 2, '#2a2a30');
    R(g, x + (left ? 14 : 1), y - 12, 1, 4, '#5a5e66');
  }
}
