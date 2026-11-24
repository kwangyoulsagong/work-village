// 작은 마을 — more on the road and in the sky, era by era (a travois, a chariot, a palanquin, a rickshaw, a tram,
// a fire engine, an ice-cream van, a sports car, pods and walking robots; an eagle, kites, a hot-air balloon, an
// airship, a biplane, planes and helicopters, sky cars and a shuttle), and a ride of your own: an ox cart, a
// donkey, a horse, a carriage, a bike, a classic car, a scooter, your own car, a sports car, a hoverboard, a hover
// car. You ride it on long trips (faster) and it waits by your door. Loaded after life.js and before game.js:
// only life.js's tables are touched at load time.
'use strict';

// ── More traffic ─────────────────────────────────────────────────────────────────────────────────────────────────

Object.assign(VEHICLE, {
  sled: { len: 22, v: 0.55, slow: true },
  chariot: { len: 26, v: 1.6 },
  donkey: { len: 16, v: 0.9, slow: true },
  palanquin: { len: 28, v: 0.6, slow: true },
  wagon: { len: 30, v: 0.8, slow: true },
  rickshaw: { len: 22, v: 1.0, slow: true },
  tram: { len: 40, v: 0.9 },
  firetruck: { len: 30, v: 1.8 },
  icecream: { len: 20, v: 0.9 },
  sports: { len: 17, v: 2.4 },
  ambulance: { len: 20, v: 2.0 },
  pod: { len: 12, v: 1.3 },
  walker: { len: 12, v: 0.7, slow: true },
  hoverboard: { len: 12, v: 1.8 },
  // In the sky (y: how high, set when spawned).
  eagle: { len: 12, v: 1.1, sky: true },
  kite: { len: 10, v: 0.25, sky: true },
  balloon: { len: 16, v: 0.3, sky: true },
  airship: { len: 40, v: 0.45, sky: true },
  biplane: { len: 20, v: 1.6, sky: true },
  plane: { len: 26, v: 2.2, sky: true },
  heli: { len: 22, v: 1.2, sky: true },
  skycar: { len: 17, v: 2.0, sky: true },
  shuttle: { len: 26, v: 2.8, sky: true },
});
const MORE_TRAFFIC = [
  ['sled', 'eagle', 'eagle'],
  ['chariot', 'donkey', 'kite', 'eagle'],
  ['palanquin', 'wagon', 'donkey', 'kite', 'kite'],
  ['rickshaw', 'rickshaw', 'tram', 'balloon', 'airship', 'biplane'],
  ['firetruck', 'icecream', 'sports', 'ambulance', 'plane', 'heli', 'balloon'],
  ['pod', 'pod', 'walker', 'hoverboard', 'skycar', 'skycar', 'shuttle'],
];
MORE_TRAFFIC.forEach((list, era) => TRAFFIC_BY_ERA[era].push(...list));

/** The new vehicles (drawVehicle in life.js hands over what it doesn't know). True when drawn. */
function drawMoreVehicle(g, c, x, b, r, flip, step) {
  const bob = (n) => Math.round(Math.sin(c.f / n));
  const person = (px, py, walk = true) => {
    const e = { x: px, y: py, dir: r ? 'r' : 'l', path: walk ? [1] : [], frame: Math.floor(c.f * 1.5), seed: 0, gender: c.look?.style ? null : c.gender };
    drawPerson(g, e, c.look ?? { hair: '#3a2418', top: '#888', legs: '#555' }, { hairStyle: c.look?.style });
  };
  switch (c.type) {
    case 'sled': {
      // A travois: two poles dragged behind, a bundle of hides on them.
      const px = r ? x + 18 : x + 4;
      shadow(g, x + 11, b, 22);
      const tail = r ? x : x + 22;
      R(g, Math.min(px, tail), b - 6, Math.abs(px - tail), 1, '#8a5a3a');
      R(g, Math.min(px, tail), b - 3, Math.abs(px - tail), 1, '#6b4428');
      box(g, (r ? x + 2 : x + 10), b - 8, 9, 4, '#a87a4a');
      person(px, b);
      return true;
    }
    case 'chariot': {
      const hx = r ? x + 10 : x;
      const cx = r ? x : x + 18;
      shadow(g, x + 13, b, 26);
      spr(g, HORSE[step % 2], HORSE_PAL, hx, b - 11, flip);
      box(g, cx, b - 8, 8, 5, '#b8843a');
      wheel(g, cx + 1, b, step);
      person(cx + 4, b - 4, false);
      return true;
    }
    case 'donkey': {
      shadow(g, x + 8, b, 14);
      spr(g, HORSE[step % 2], DONKEY_PAL, x, b - 11, flip);
      rider(g, c, x + 2, b - 19, flip, null);
      return true;
    }
    case 'palanquin': {
      // 가마: two bearers and a little curtained room between them.
      shadow(g, x + 14, b, 28);
      R(g, x, b - 12, 28, 1, '#6b4428');
      box(g, x + 8, b - 20, 12, 10, '#a83a2a');
      R(g, x + 10, b - 17, 8, 5, '#f2d27a');
      R(g, x + 7, b - 22, 14, 2, '#5a2a1a');
      person(x + 3, b);
      person(x + 25, b);
      return true;
    }
    case 'wagon': {
      // A covered merchant's wagon.
      const hx = r ? x + 14 : x;
      const cx = r ? x : x + 16;
      shadow(g, x + 15, b, 30);
      box(g, cx, b - 9, 14, 5, '#8a5a3a');
      disc(g, cx + 7, b - 12, 7, '#efe6d2');
      R(g, cx, b - 12, 14, 3, '#efe6d2');
      wheel(g, cx + 1, b, step);
      wheel(g, cx + 9, b, step);
      spr(g, HORSE[step % 2], { ...HORSE_PAL, h: '#7a5a3a' }, hx, b - 11, flip);
      return true;
    }
    case 'rickshaw': {
      const px = r ? x + 16 : x + 4;
      const cx = r ? x : x + 10;
      shadow(g, x + 11, b, 22);
      R(g, Math.min(px, cx + 6), b - 7, Math.abs(px - (cx + 6)), 1, '#3a2a2a');
      box(g, cx, b - 12, 11, 7, '#2a2a33');
      R(g, cx + 1, b - 16, 9, 4, '#3a3a48');
      wheel(g, cx + 3, b, step);
      rider(g, { ...c, look: { ...c.look, top: '#f4efe6' } }, cx, b - 24, flip, null);
      person(px, b);
      return true;
    }
    case 'tram': {
      shadow(g, x + 20, b, 40);
      box(g, x, b - 14, 40, 11, '#3a6a4a');
      R(g, x + 1, b - 6, 38, 1, '#e8c860');
      for (let i = 0; i < 6; i++) R(g, x + 3 + i * 6, b - 12, 4, 4, '#cfe8f5');
      R(g, x + 18, b - 22, 1, 8, '#2a2a33');
      R(g, x + 16, b - 23, 6, 1, '#2a2a33');
      for (const wx of [x + 4, x + 30]) R(g, wx, b - 3, 5, 3, OL);
      return true;
    }
    case 'firetruck':
    case 'ambulance':
    case 'icecream': {
      const len = c.type === 'firetruck' ? 30 : 20;
      const body = c.type === 'firetruck' ? '#e0403a' : c.type === 'ambulance' ? '#f4f6f8' : '#ffd6e6';
      shadow(g, x + len / 2, b, len);
      box(g, x, b - 12, len, 9, body);
      R(g, x + (r ? len - 7 : 2), b - 10, 5, 3, '#cfe8f5');
      if (c.type === 'firetruck') {
        R(g, x + 2, b - 15, len - 10, 2, '#c8c8d0');
        for (let i = 0; i < len - 10; i += 3) R(g, x + 2 + i, b - 16, 1, 1, '#c8c8d0');
      } else if (c.type === 'ambulance') {
        R(g, x + 6, b - 9, 5, 1, '#e0403a');
        R(g, x + 8, b - 11, 1, 5, '#e0403a');
      } else {
        disc(g, x + 10, b - 15, 3, '#ff8ac0');
        R(g, x + 9, b - 13, 3, 3, '#e8b878');
      }
      if ((c.type !== 'icecream') && Math.floor(c.f / 4) % 2) R(g, x + len / 2, b - 13, 2, 1, '#4060ff');
      R(g, x + 3, b - 3, 4, 3, OL);
      R(g, x + len - 7, b - 3, 4, 3, OL);
      return true;
    }
    case 'sports': {
      shadow(g, x + 8, b, 17);
      box(g, x, b - 6, 17, 4, c.c === '#e8e8ee' ? '#e0403a' : c.c);
      box(g, x + (r ? 5 : 4), b - 9, 7, 3, '#2a2a33');
      R(g, x + (r ? 0 : 15), b - 7, 2, 1, '#2a2a33'); // the spoiler
      R(g, x + 2, b - 2, 3, 2, OL);
      R(g, x + 12, b - 2, 3, 2, OL);
      return true;
    }
    case 'pod': {
      const y = b - 2 + bob(5);
      shadow(g, x + 6, b, 10);
      disc(g, x + 6, y - 6, 6, '#e8eef4');
      disc(g, x + 6, y - 7, 4, '#9fd6f0');
      R(g, x + 1, y, 10, 1, '#5ad7e8');
      return true;
    }
    case 'walker': {
      // A friendly walking robot.
      const leg = step % 2;
      shadow(g, x + 6, b, 10);
      R(g, x + 3, b - 5, 2, 5 - leg, '#8a929a');
      R(g, x + 8, b - 5, 2, 4 + leg, '#8a929a');
      box(g, x + 1, b - 13, 11, 8, '#d7e3ee', '#3a4a66');
      R(g, x + (r ? 6 : 3), b - 11, 4, 2, '#5ad7e8');
      R(g, x + 6, b - 16, 1, 3, '#3a4a66');
      R(g, x + 5, b - 17, 3, 1, '#ff6b6b');
      return true;
    }
    case 'hoverboard': {
      const y = b + bob(4);
      shadow(g, x + 6, b, 12);
      box(g, x, y - 4, 13, 2, c.c);
      R(g, x + 1, y - 1, 11, 1, '#5ad7e8');
      person(x + 6, y - 4, false);
      return true;
    }
    // ── The sky ──
    case 'eagle': {
      const flap = Math.floor(c.f / 5) % 2;
      spr(g, flap ? ['o.........o', '.oo.....oo.', '...ooooo...', '....oyo....'] : ['...........', 'ooooooooooo', '...ooooo...', '....oyo....'], { o: '#5a3a26', y: '#f0c040' }, x, b, flip);
      return true;
    }
    case 'kite': {
      // A kite on a long string that wanders off the top of the view.
      const y = b + bob(7) * 2;
      spr(g, ['..o..', '.ooo.', 'ooooo', '.ooo.', '..o..'], { o: c.c }, x, y);
      R(g, x + 2, y + 2, 1, 1, '#ffffff');
      for (let i = 0; i < 6; i++) R(g, x + 2 + Math.round(Math.sin(c.f / 5 + i) * 1.5), y + 5 + i * 2, 1, 1, i % 2 ? '#e8505b' : '#ffd23f');
      return true;
    }
    case 'balloon': {
      const y = b + bob(12);
      disc(g, x + 8, y, 8, c.c);
      R(g, x + 3, y - 4, 2, 9, lighten(c.c, 0.3));
      R(g, x + 11, y - 4, 2, 9, shadeOf(c.c, 0.8));
      R(g, x + 4, y + 7, 1, 5, '#6b4428');
      R(g, x + 11, y + 7, 1, 5, '#6b4428');
      box(g, x + 4, y + 11, 8, 4, '#a87a4a');
      return true;
    }
    case 'airship': {
      const y = b + bob(14);
      disc(g, x + 10, y, 6, '#c8c0b0');
      disc(g, x + 30, y, 6, '#c8c0b0');
      R(g, x + 10, y - 6, 20, 13, '#c8c0b0');
      R(g, x + 6, y - 2, 28, 2, '#a8a090');
      R(g, x + (r ? 0 : 36), y - 5, 4, 10, '#a8a090');
      box(g, x + 15, y + 7, 10, 4, '#6b4428');
      return true;
    }
    case 'biplane':
    case 'plane': {
      const big = c.type === 'plane';
      const len = big ? 26 : 18;
      const y = b;
      R(g, x, y, len, 4, big ? '#f2f4f6' : '#e0a23a');
      R(g, x + (r ? len - 3 : 0), y + 1, 3, 2, big ? '#3a6aa8' : '#8a5a3a');
      R(g, x + (r ? 0 : len - 4), y - 4, 4, 4, big ? '#3a6aa8' : '#c8843a');
      R(g, x + len / 2 - 4, y - (big ? 1 : 3), 8, 1, big ? '#c8d0d8' : '#c8843a');
      R(g, x + len / 2 - 5, y + 4, 10, 1, big ? '#c8d0d8' : '#c8843a');
      if (big) for (let i = 0; i < 4; i++) R(g, x + 6 + i * 4, y + 1, 2, 1, '#8fd0f0');
      else R(g, x + (r ? len : -1), y - 1 + (c.f % 2) * 4, 1, 3, '#9a9aa8');
      return true;
    }
    case 'heli': {
      const y = b + bob(6);
      box(g, x + 4, y, 12, 7, '#e05a4a');
      R(g, x + (r ? 12 : 6), y + 1, 3, 3, '#cfe8f5');
      R(g, r ? x - 6 : x + 16, y + 2, 10, 2, '#e05a4a');
      const spin = c.f % 2;
      R(g, x + (spin ? 0 : 4), y - 2, spin ? 20 : 12, 1, '#3a3a48');
      R(g, x + 9, y - 1, 1, 1, '#3a3a48');
      R(g, x + 3, y + 8, 14, 1, '#3a3a48');
      return true;
    }
    case 'skycar': {
      const y = b + bob(5);
      box(g, x, y, 17, 5, c.c);
      box(g, x + 4, y - 3, 9, 4, '#bfe8ff');
      R(g, x + 2, y + 6, 13, 1, `rgba(90, 215, 232, ${0.5 + (c.f % 3) * 0.15})`);
      return true;
    }
    case 'shuttle': {
      const y = b;
      R(g, x + 4, y, 20, 5, '#f2f4f6');
      disc(g, r ? x + 23 : x + 4, y + 2, 3, '#f2f4f6');
      R(g, x + 8, y - 3, 6, 3, '#3a4a66');
      R(g, x + 8, y + 5, 10, 2, '#3a4a66');
      R(g, r ? x : x + 24, y + 1, 4, 3, c.f % 2 ? '#ffd23f' : '#ff8a3a');
      return true;
    }
  }
  return false;
}

// ── Your own ride ────────────────────────────────────────────────────────────────────────────────────────────────

const RIDES = [
  { id: 'ox', name: '소달구지', era: 0, cost: 80, type: 'ox', speed: 1.3, note: '느리지만 든든해요' },
  { id: 'donkey', name: '당나귀', era: 1, cost: 90, type: 'donkey', speed: 1.6, note: '고집이 세요' },
  { id: 'horse', name: '말', era: 1, cost: 170, type: 'horse', speed: 2.3, note: '바람처럼 달려요' },
  { id: 'carriage', name: '마차', era: 2, cost: 340, type: 'carriage', speed: 2.1, note: '귀족처럼 다녀요' },
  { id: 'bike', name: '자전거', era: 3, cost: 140, type: 'bike', speed: 1.9, note: '따르릉' },
  { id: 'oldcar', name: '클래식카', era: 3, cost: 680, type: 'oldcar', speed: 2.5, note: '마을 첫 자동차예요' },
  { id: 'scooter', name: '스쿠터', era: 4, cost: 320, type: 'moto', speed: 2.3, note: '골목도 쌩쌩' },
  { id: 'car', name: '내 차', era: 4, cost: 950, type: 'car', speed: 2.8, note: '드디어 내 차!' },
  { id: 'sports', name: '스포츠카', era: 4, cost: 1700, type: 'sports', speed: 3.4, note: '이웃들이 다 쳐다봐요' },
  { id: 'hoverboard', name: '호버보드', era: 5, cost: 520, type: 'hoverboard', speed: 2.6, note: '땅에서 살짝 떠요' },
  { id: 'hovercar', name: '호버카', era: 5, cost: 1600, type: 'hover', speed: 3.4, note: '도로가 필요 없어요' },
];
const myRide = () => RIDES.find((r) => r.id === S.ride) ?? null;
const rideColour = () => S.rideColour ?? '#e05a4a';
const RIDE_COLOURS = ['#e05a4a', '#3a7ad0', '#f0c040', '#2fb0a0', '#2a2a33', '#f2f4f6', '#8a6cc9'];

function buyRide(r) {
  S.coins -= r.cost;
  S.rides = [...new Set([...(S.rides ?? []), r.id])];
  S.ride = r.id;
  S.rideColour ??= RIDE_COLOURS[Math.floor(Math.random() * RIDE_COLOURS.length)];
  story(`🚗 ${josa(r.name, '을', '를')} 샀어요! ${r.note}.`);
  photoSoon(`${josa(r.name, '을', '를')} 산 날`);
}
/** Rows for the build tab: this era's rides and the ones from before. */
function rideRows(add) {
  for (const r of RIDES) {
    if (r.era > S.era) continue;
    const owned = S.rides?.includes(r.id);
    if (owned)
      add('탈것', r.name, S.ride === r.id ? '타는 중이에요' : '갖고 있어요 · 눌러서 갈아타요', 0, S.ride !== r.id, () => {
        S.ride = r.id;
        toast(`${josa(r.name, '으로', '로')} 갈아탔어요`);
      });
    else add('탈것', r.name, `${r.note} · 빨라져요`, r.cost, true, () => buyRide(r));
  }
  if (myRide())
    add('탈것', '탈것 색 바꾸기', '새로 칠해요', 30, true, () => {
      S.coins -= 30;
      const i = RIDE_COLOURS.indexOf(rideColour());
      S.rideColour = RIDE_COLOURS[(i + 1) % RIDE_COLOURS.length];
    });
}
/** You buy one yourself when you've plenty to spare (game.js nextTask asks last of all). */
function rideTask() {
  const r = [...RIDES].reverse().find((x) => x.era === S.era && !S.rides?.includes(x.id));
  if (!r || MODE !== 'life') return null;
  const goal = nextGoal();
  if (S.coins < r.cost + (goal?.cost ?? 0) + 100) return null;
  return { to: HOME_DOOR, tool: 'sparkle', what: `${r.name} 사기`, act: () => buyRide(r) };
}

/** On a long trip you take your ride (faster); for short hops, you walk. */
function rideFor(pathLength) {
  const r = myRide();
  if (!r || MODE !== 'life' || pathLength < 6 || S.sickDays > 0) return null;
  return r;
}
function startTrip() {
  const r = rideFor(me.path.length);
  me.riding = r ? r.id : null;
}
const rideSpeed = () => (me.riding ? (RIDES.find((r) => r.id === me.riding)?.speed ?? 1) : 1);

/** What you look like riding: your clothes on the rider. */
function riderLook() {
  const o = OUTFIT[S.era];
  return { hair: S.style.hairColor ?? S.hair ?? o.hair, top: S.style.top?.c ?? o.top, legs: o.legs, skin: S.skin };
}
/** You on your ride (instead of walking). True when drawn. */
function drawMeRiding(g, e) {
  if (!me.riding || !e.path?.length) return false;
  const r = RIDES.find((x) => x.id === me.riding);
  if (!r) return false;
  const right = (e.lastLR ?? 'r') !== 'l';
  const len = VEHICLE[r.type]?.len ?? 16;
  const c = { type: r.type, x: e.x - len / 2, right, f: e.frame * 1.5, c: rideColour(), look: riderLook(), gender: S.gender, ofs: 0, b: Math.round(e.y) + 1 };
  drawVehicle(g, c);
  return true;
}
/** Parked by your door when you're not out on it. */
function drawParked(g) {
  const r = myRide();
  if (!r || MODE !== 'life' || (me.riding && me.path.length)) return;
  const x = (HOME.x + 3) * T + 2;
  if (!onScreen(x)) return;
  const c = { type: r.type, x, right: false, f: 0, c: rideColour(), look: riderLook(), gender: S.gender, ofs: 0, b: ROAD_Y * T - 1, parked: true };
  if (['horse', 'donkey', 'bike', 'moto', 'hoverboard'].includes(r.type)) {
    // Animals and two-wheelers wait without a rider.
    if (r.type === 'horse' || r.type === 'donkey') spr(g, HORSE[0], r.type === 'donkey' ? DONKEY_PAL : HORSE_PAL, x, c.b - 11, true);
    else {
      shadow(g, x + 6, c.b, 12);
      if (r.type === 'hoverboard') box(g, x, c.b - 4, 13, 2, c.c);
      else {
        wheel(g, x, c.b, 0);
        wheel(g, x + 8, c.b, 0);
        if (r.type === 'moto') box(g, x + 3, c.b - 7, 7, 3, c.c);
        else R(g, x + 2, c.b - 4, 9, 1, c.c);
      }
    }
    return;
  }
  drawVehicle(g, c);
}
