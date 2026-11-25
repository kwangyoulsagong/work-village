// 작은 마을 — tap a villager: talk, sell them your harvest, buy wood and stone, ask them out, propose. In chaos mode
// (the 👆 tool) there is one more: 때리기, a close-up of their face that swells with every hit until they're down.
// Loaded before game.js: game constants are only used inside functions.
'use strict';

let talkWith = null; // the villager whose card is open
const TALKS_A_DAY = 3; // talks that raise the friendship gauge, per family a day
const LOVE_AT = 6; // the gauge where asking them out can work
const SAY = {
  low: ['안녕하세요.', '아, 네… 반가워요.', '날씨가 좋네요.', '무슨 일이에요?'],
  mid: ['또 왔네요! 반가워요.', '요즘 어때요?', '같이 산책할래요?', '오늘 밭은 잘 됐어요?'],
  high: ['보고 싶었어요!', '오늘도 와 줬네요 :)', '당신이랑 얘기하면 시간 가는 줄 몰라요.', '우리 내일도 봐요.'],
  love: ['오늘 예뻐/멋져 보여요.', '손 잡아도 돼요?', '당신 생각만 했어요.', '같이 노을 보러 갈래요?'],
  kid: ['아저씨/아줌마 안녕!', '같이 놀아요!', '사탕 있어요?', '헤헤.'],
};

/** Who someone is, for the card: a name and what they are to you. */
function whoIs(e) {
  const i = e.home;
  const fam = i >= 0 && FAMILIES[i] ? FAMILIES[i] : null;
  if (e.car) return { name: e.car.type === 'runner' ? '달리던 사람' : '지나가던 사람', role: '나그네' };
  if (e.kind === 'spouse') return { name: FAMILIES[S.spouse].single, role: '내 배우자', heart: true };
  if (e.kind === 'kid') return { name: '우리 아이', role: '내 아이', kid: true };
  if (e.who?.startsWith('h') && e.who.endsWith('a') && fam) return { name: fam.single, role: e.job?.name ?? '주민', head: i };
  if (e.who?.startsWith('h') && e.who.endsWith('s') && fam) return { name: `${fam.family} 아이`, role: '꼬마', kid: true };
  if (e.who?.startsWith('h') && e.who.endsWith('e') && fam) return { name: `${fam.family} ${e.gender === 'm' ? '할아버지' : '할머니'}`, role: '어르신' };
  if (e.zombie) return { name: '좀비', role: '으어어…' };
  return { name: e.job ? `${e.job.name} 주민` : '행인', role: e.job?.name ?? '지나가던 사람' };
}

/** The villager under a tap (people only: no pets, not you, not a friend's character). */
function villagerAt(x, y) {
  let best = null;
  let bestD = 14;
  for (const e of people) {
    if (e.hidden || e.kind === 'dog' || e.kind === 'petcat' || e.kind === 'guest' || e.kind === 'me' || e.dying || e.burning > 0) continue;
    const d = Math.hypot(e.x - x, e.y - 8 - y);
    if (d < bestD) [best, bestD] = [e, d];
  }
  return best;
}

/** Someone going by on the road (on foot, a cart, a bike…) under a tap: they stop for a chat. */
function travellerAt(x, y) {
  for (const c of cars) {
    if (c.sky || c.b != null) continue;
    const [cx, cy] = rideAt(c);
    if (Math.abs(cx - x) < 14 && Math.abs(cy - 8 - y) < 14) return { car: c, look: c.look, gender: c.gender, path: [] };
  }
  return null;
}

/** Life mode: a tap on a villager (or a traveller) opens their card. True when it did. */
function tryVillager(x, y) {
  const e = villagerAt(x, y) ?? travellerAt(x, y);
  if (!e) return false;
  openTalk(e);
  return true;
}

/** Let them go on their way again. */
function release(e) {
  if (!e) return;
  e.held = false;
  if (e.car) e.car.pause = 0;
}
function openTalk(e) {
  if (talkWith && talkWith !== e) release(talkWith);
  talkWith = e;
  e.held = true; // stands still while you talk
  if (e.car) e.car.pause = Infinity; // pulls over (trafficTick)
  e.path = [];
  e.dir = 'd';
  paintTalk();
  clearInterval(talkTimer);
  talkTimer = setInterval(placeTalk, 100); // the view can glide while it's open
}
let talkTimer = 0;
/** The card beside them, as a popover: to their right, or left when there's no room; inside the picture. */
function placeTalk() {
  const e = talkWith;
  const card = document.getElementById('talkCard');
  if (!e || card.hidden) return;
  const [x, y] = e.car ? rideAt(e.car) : [e.x, e.y];
  const stage = canvas.parentElement;
  const sx = canvas.offsetLeft + ((x - camX) / VIEW_W) * canvas.clientWidth;
  const sy = canvas.offsetTop + ((y - 12) / H) * canvas.clientHeight;
  const [w, h] = [card.offsetWidth, card.offsetHeight];
  const gap = (12 / VIEW_W) * canvas.clientWidth;
  let left = sx + gap;
  if (left + w > stage.clientWidth - 8) left = sx - gap - w;
  left = Math.max(8, Math.min(stage.clientWidth - w - 8, left));
  const top = Math.max(8, Math.min(stage.clientHeight - h - 8, sy - h / 2));
  card.style.left = `${Math.round(left)}px`;
  card.style.top = `${Math.round(top)}px`;
}
function closeTalk() {
  clearInterval(talkTimer);
  release(talkWith);
  talkWith = null;
  document.getElementById('talkCard').hidden = true;
}

const friendOf = (i) => (i != null && i >= 0 ? (S.friends[i] ??= { f: 0, day: '' }) : null);
const cropPrice = () => Math.max(1, Math.round(era().price * priceMul() * farmPriceMul() * weekPrice()));
/** What they sell you: wood and stone, cheaper for friends. */
function goodsPrice(kind, i) {
  const base = kind === 'wood' ? 6 + S.era * 4 : 10 + S.era * 6;
  const f = friendOf(i)?.f ?? 0;
  return Math.max(1, Math.round(base * (1 - Math.min(0.2, f * 0.02))));
}

function paintTalk(line) {
  const e = talkWith;
  const card = document.getElementById('talkCard');
  if (!e || (e.car ? !cars.includes(e.car) : !people.includes(e))) return closeTalk();
  const w = whoIs(e);
  const fr = friendOf(w.head);
  card.hidden = false;
  document.getElementById('talkName').textContent = w.name;
  document.getElementById('talkRole').textContent = w.head != null && S.myLover === w.head ? '연인 ♥' : w.role;
  const gauge = document.getElementById('talkGauge');
  gauge.hidden = !fr;
  if (fr) {
    document.getElementById('talkFill').style.width = `${(Math.min(MAX_FRIEND, fr.f) / MAX_FRIEND) * 100}%`;
    document.getElementById('talkGaugeText').textContent = `호감 ${Math.min(MAX_FRIEND, Math.round(fr.f))}/${MAX_FRIEND}`;
  }
  document.getElementById('talkLine').textContent = line ?? '';
  const box = document.getElementById('talkActions');
  box.replaceChildren();
  const add = (label, fn, why) => {
    const b = el('button', 'btn', label);
    if (why) {
      b.disabled = true;
      b.title = why;
    }
    b.addEventListener('click', fn);
    box.append(b);
  };
  add('💬 교류하기', () => talk(e));
  if (!w.kid && e.kind !== 'spouse') {
    const p = cropPrice();
    add(`🌾 팔기 (${p + Math.round(p * Math.min(0.2, (fr?.f ?? 0) * 0.02))}코인)`, () => sellTo(e), S.bag > 0 ? null : '팔 작물이 없어요');
    for (const [k, name] of [['wood', '🪵 나무'], ['stone', '🪨 돌']]) {
      const cost = goodsPrice(k, w.head) * 3;
      add(`${name} 3개 사기 (${cost}코인)`, () => buyFrom(e, k), S.coins >= cost ? null : '코인이 모자라요');
    }
  }
  if (w.head != null && S.spouse == null) {
    if (S.myLover !== w.head) add('💌 고백하기', () => askOut(e), fr.f >= LOVE_AT ? null : `호감 ${LOVE_AT}부터 할 수 있어요`);
    else add('💍 청혼하기', () => propose(e), fr.f >= MAX_FRIEND ? null : `호감 ${MAX_FRIEND}이 되면 할 수 있어요`);
  }
  if (MODE === 'chaos') add('🥊 때리기', () => openFight(e));
  placeTalk();
}

function line(tier) {
  const list = SAY[tier];
  return list[Math.floor(Math.random() * list.length)];
}

function talk(e) {
  const w = whoIs(e);
  const fr = friendOf(w.head);
  e.shout = { text: '♪', t: 10 };
  if (w.kid) return paintTalk(`${w.name}: "${line('kid')}"`);
  if (!fr) return paintTalk(`${w.name}: "${line('low')}"`);
  const day = today();
  if (fr.talkDay !== day) [fr.talkDay, fr.talks] = [day, 0];
  let note = '';
  if (fr.talks < TALKS_A_DAY && fr.f < MAX_FRIEND) {
    fr.talks++;
    fr.f = Math.min(MAX_FRIEND, fr.f + 1 + (trait('charm') >= 4 ? 0.5 : 0));
    note = ' (호감 +1)';
  } else note = ' (오늘은 충분히 얘기했어요)';
  const tier = S.myLover === w.head ? 'love' : fr.f >= 7 ? 'high' : fr.f >= 3 ? 'mid' : 'low';
  saveSoon();
  paintTalk(`${w.name}: "${line(tier)}"${note}`);
}

function sellTo(e) {
  if (S.bag <= 0) return;
  const w = whoIs(e);
  const f = friendOf(w.head)?.f ?? 0;
  const p = cropPrice();
  const got = p + Math.round(p * Math.min(0.2, f * 0.02));
  S.bag--;
  S.coins += got;
  e.shout = { text: '고마워요!', t: 14 };
  saveSoon();
  paintUi();
  paintTalk(`${josa(era().crop, '을', '를')} 하나 팔았어요. +${got}코인`);
}

function buyFrom(e, kind) {
  const w = whoIs(e);
  const cost = goodsPrice(kind, w.head) * 3;
  if (S.coins < cost) return;
  S.coins -= cost;
  S.stock[kind] = (S.stock[kind] ?? 0) + 3;
  cache.dirty = true;
  saveSoon();
  paintUi();
  paintTalk(`${kind === 'wood' ? '나무' : '돌'} 3개를 샀어요. 창고에 넣어 뒀어요.`);
}

function askOut(e) {
  const w = whoIs(e);
  const fr = friendOf(w.head);
  if (fr.f < LOVE_AT) return;
  const odds = 0.35 + (fr.f - LOVE_AT) * 0.12 + trait('charm') * 0.04;
  if (Math.random() < odds) {
    S.myLover = w.head;
    e.shout = { text: '♥', t: 24 };
    story(`💌 ${josa(w.name, '과', '와')} 연인이 됐어요!`);
    photoSoon(`${josa(w.name, '과', '와')} 사귄 날`);
    saveSoon();
    paintTalk(`${w.name}: "저도… 좋아해요."`);
  } else {
    fr.f = Math.max(0, fr.f - 1);
    saveSoon();
    paintTalk(`${w.name}: "미안해요, 아직은 친구로 지내요." (호감 −1)`);
  }
}

function propose(e) {
  const w = whoIs(e);
  const fr = friendOf(w.head);
  if (fr.f < MAX_FRIEND || S.spouse != null) return;
  S.spouse = w.head;
  S.myLover = null;
  S.sinceKid = 0;
  story(`💍 ${josa(w.name, '과', '와')} 결혼했어요! 이제 한 집에 살아요.`);
  photoSoon(`${josa(w.name, '과', '와')} 결혼한 날`);
  closeTalk();
  spawnFamily();
  saveSoon();
  paintUi();
  toast(`${josa(w.name, '과', '와')} 결혼했어요 💍`, 2400);
}

/** Life saves (save() waits a moment, so taps in a row save once); a chaos town is never saved. */
function saveSoon() {
  if (MODE === 'life') save();
}

// ── 때리기 (chaos mode only): a close-up of their face ────────────────────────────────────────────────────────────

const WEAPONS = [
  { id: 'fist', icon: '👊', name: '주먹', dmg: [6, 9], word: '퍽!' },
  { id: 'slap', icon: '🩴', name: '슬리퍼', dmg: [4, 6], word: '찰싹!' },
  { id: 'fish', icon: '🐟', name: '생선', dmg: [5, 8], word: '철퍽!' },
  { id: 'toy', icon: '🔨', name: '뿅망치', dmg: [2, 3], word: '뿅!' },
  { id: 'pan', icon: '🍳', name: '프라이팬', dmg: [12, 16], word: '깡!' },
  { id: 'bat', icon: '🏏', name: '방망이', dmg: [15, 20], word: '빡!' },
];
const OUCH = [
  [75, ['아야!', '왜 이래요!', '뭐 하는 거예요!']],
  [45, ['그만해요!', '아파요…', '잘못했어요!']],
  [20, ['살려 주세요…', '흐어엉…', '엄마…']],
  [0, ['으…', '……', '끄억']],
];
const FACE_W = 96; // the close-up canvas, in pixels (drawn ×3 by CSS)
const FACE_H = 96;
let fight = null; // { e, weapon, hp, bumps, recoil, pops, swing, raf, ko }

function openFight(e) {
  if (MODE !== 'chaos') return;
  document.getElementById('talkCard').hidden = true;
  e.held = true;
  e.hp ??= 100;
  e.bumps ??= [];
  fight = { e, weapon: fight?.weapon ?? 'fist', recoil: [0, 0], pops: [], swing: null, raf: 0, ko: 0, say: '', shake: 0 };
  const box = document.getElementById('fight');
  box.hidden = false;
  const bar = document.getElementById('fightWeapons');
  bar.replaceChildren(
    ...WEAPONS.map((w) => {
      const b = el('button', 'btn', `${w.icon} ${w.name}`);
      b.dataset.w = w.id;
      b.addEventListener('click', () => {
        fight.weapon = w.id;
        paintFightUi();
      });
      return b;
    }),
  );
  document.getElementById('fightName').textContent = whoIs(e).name;
  paintFightUi();
  drawFight();
}
function paintFightUi() {
  if (!fight) return;
  for (const b of document.getElementById('fightWeapons').children) b.setAttribute('aria-pressed', String(b.dataset.w === fight.weapon));
  const hp = Math.max(0, Math.round(fight.e.hp));
  document.getElementById('fightHp').style.width = `${hp}%`;
  document.getElementById('fightHp').dataset.low = String(hp < 30);
  document.getElementById('fightHpText').textContent = `HP ${hp}`;
}
function closeFight() {
  if (!fight) return;
  cancelAnimationFrame(fight.raf);
  const e = fight.e;
  e.held = false;
  fight = null;
  document.getElementById('fight').hidden = true;
  talkWith = null;
  if (e.hp <= 0 && people.includes(e)) {
    story(`🥊 ${josa(whoIs(e).name, '을', '를')} 때려눕혔어요.`);
    ghost(e);
  } else if (people.includes(e)) {
    // Off they run, sore.
    e.scared = 40;
    e.speed = 2;
    const [tx] = tileOf(e);
    route(e, nearestWalkable(Math.max(0, Math.min(COLS - 1, tx + (Math.random() < 0.5 ? -8 : 8))), ROAD_Y));
    e.shout = { text: '으앙!', t: 16 };
  }
  paintChaosUi();
  paintUi();
}

/** A tap on the face: the weapon swings there. */
function punch(ev) {
  if (!fight || fight.ko) return;
  const c = document.getElementById('fightFace');
  const r = c.getBoundingClientRect();
  const x = ((ev.clientX - r.left) / r.width) * FACE_W;
  const y = ((ev.clientY - r.top) / r.height) * FACE_H;
  const w = WEAPONS.find((k) => k.id === fight.weapon);
  const e = fight.e;
  const dmg = rand(w.dmg[0], w.dmg[1]);
  e.hp = Math.max(0, e.hp - dmg);
  // Where it lands swells; a hit near an old bump makes that one bigger.
  const [fx, fy] = [Math.max(26, Math.min(70, x)), Math.max(26, Math.min(76, y))];
  const near = e.bumps.find((b) => Math.hypot(b.x - fx, b.y - fy) < 9);
  if (near) near.r = Math.min(13, near.r + 1 + dmg / 10);
  else e.bumps.push({ x: Math.round(fx), y: Math.round(fy), r: 3 + dmg / 6 });
  if (e.bumps.length > 14) e.bumps.shift();
  fight.recoil = [x < FACE_W / 2 ? 5 : -5, y < FACE_H / 2 ? 3 : -2];
  fight.shake = 4 + dmg / 4;
  fight.swing = { x, y, t: 6, w: w.id };
  fight.pops.push({ x, y: y - 6, t: 14, text: `${w.word} -${dmg}` });
  for (const [at, list] of OUCH) if (e.hp >= at || at === 0) {
    fight.say = list[Math.floor(Math.random() * list.length)];
    break;
  }
  S.chaosStats.punches = (S.chaosStats.punches ?? 0) + 1;
  if (e.hp <= 0) {
    fight.ko = 1;
    fight.say = 'K.O.';
    setTimeout(() => fight?.e === e && closeFight(), 1400);
  }
  paintFightUi();
  animateFight();
}

function animateFight() {
  if (!fight || fight.raf) return;
  const tick = () => {
    if (!fight) return;
    fight.raf = 0;
    fight.recoil = fight.recoil.map((v) => (Math.abs(v) < 0.3 ? 0 : v * 0.7));
    fight.shake = Math.max(0, fight.shake - 0.8);
    if (fight.swing && --fight.swing.t <= 0) fight.swing = null;
    fight.pops = fight.pops.filter((p) => --p.t > 0);
    if (fight.ko) fight.ko++;
    drawFight();
    // Draw only while something moves: a still face costs nothing.
    if (fight.swing || fight.pops.length || fight.shake > 0 || fight.recoil.some((v) => v) || fight.ko) fight.raf = requestAnimationFrame(tick);
  };
  fight.raf = requestAnimationFrame(tick);
}

function drawFight() {
  if (!fight) return;
  const c = document.getElementById('fightFace');
  if (c.width !== FACE_W) [c.width, c.height] = [FACE_W, FACE_H];
  const g = c.getContext('2d');
  const e = fight.e;
  const look = e.look ?? {};
  const skin = look.skin ?? SKIN;
  const hurt = 1 - e.hp / 100; // 0 … 1
  const sx = Math.round(fight.recoil[0] + (fight.shake ? rand(-1, 1) * Math.ceil(fight.shake / 3) : 0));
  const sy = Math.round(fight.recoil[1]);
  g.fillStyle = fight.ko ? '#2a1a24' : '#f4e9dc';
  g.fillRect(0, 0, FACE_W, FACE_H);
  // Speed lines behind on a hit.
  if (fight.shake > 2) for (let i = 0; i < 10; i++) R(g, 0, i * 10 + 3, FACE_W, 1, 'rgba(255,160,120,0.35)');
  const cx = 48 + sx;
  const cy = 50 + sy;
  // Shoulders and shirt.
  blob(g, cx, 112 + sy, 40, look.top ?? '#888');
  R(g, cx - 7, 76 + sy, 14, 12, shadeOf(skin, 0.88));
  // Head: an oval, wider where it's swollen.
  const sw = Math.round(hurt * 5);
  oval(g, cx, cy, 26 + sw, 30, shadeOf(skin, 0.7));
  oval(g, cx, cy, 25 + sw, 29, skin);
  // Bumps: skin bulges, red to purple as they grow.
  for (const b of e.bumps) {
    const bx = b.x + sx;
    const by = b.y + sy;
    blob(g, bx, by, b.r + 1, shadeOf(skin, 0.75));
    blob(g, bx, by, b.r, skin);
    blob(g, bx, by, Math.max(1, b.r - 2), b.r > 8 ? 'rgba(120,60,150,0.55)' : 'rgba(220,80,80,0.45)');
    if (b.r > 6) R(g, bx - 2, by - Math.round(b.r / 2), 2, 2, 'rgba(255,255,255,0.5)'); // shine
  }
  // Hair on top.
  const hair = look.hair ?? '#3a2418';
  oval(g, cx, cy - 18, 27 + sw, 14, hair);
  R(g, cx - 27 - sw, cy - 18, 5, 16, hair);
  R(g, cx + 22 + sw, cy - 18, 5, 16, hair);
  // Eyes: open, then a black eye, then swollen shut; X when out.
  const eye = (ex, side) => {
    if (fight.ko) {
      for (let i = -3; i <= 3; i++) {
        R(g, ex + i, cy - 2 + i, 2, 2, '#3a2a3a');
        R(g, ex + i, cy - 2 - i, 2, 2, '#3a2a3a');
      }
      return;
    }
    const black = hurt > (side < 0 ? 0.3 : 0.55);
    if (black) blob(g, ex, cy - 2, 7, 'rgba(90,40,110,0.75)');
    if (hurt > (side < 0 ? 0.65 : 0.8)) R(g, ex - 5, cy - 2, 10, 2, '#3a2a3a'); // swollen shut
    else {
      R(g, ex - 3, cy - 5, 6, 6, '#ffffff');
      R(g, ex - 1 + (fight.shake ? rand(-1, 1) : 0), cy - 4, 3, 4, '#3a2a3a');
    }
    // Brows: worried as it goes on.
    R(g, ex - 4, cy - 10 - (hurt > 0.2 ? side : 0), 8, 2, shadeOf(hair, 0.8));
  };
  eye(cx - 10, -1);
  eye(cx + 10, 1);
  // Nose, and a nosebleed past halfway.
  R(g, cx - 1, cy + 2, 3, 6, shadeOf(skin, 0.82));
  if (hurt > 0.45) {
    R(g, cx - 2, cy + 8, 2, 5 + Math.round(hurt * 5), '#c8323a');
    R(g, cx + 2, cy + 9, 2, 3 + Math.round(hurt * 4), '#c8323a');
  }
  // Mouth: a smile, then a wobble, then wide open with a tooth gone.
  if (fight.ko) {
    R(g, cx - 6, cy + 14, 12, 3, '#6a2a3a');
    R(g, cx - 2, cy + 16, 5, 5, '#e86a7a'); // tongue out
  } else if (hurt < 0.15) R(g, cx - 5, cy + 15, 10, 2, '#d9706e');
  else if (hurt < 0.5) for (let i = 0; i < 5; i++) R(g, cx - 6 + i * 3, cy + 15 + (i % 2), 3, 2, '#b04a52');
  else {
    oval(g, cx, cy + 16, 7, 5, '#6a2a3a');
    R(g, cx - 5, cy + 12, 10, 2, '#ffffff');
    R(g, cx - 1, cy + 12, 2, 2, '#6a2a3a'); // the missing tooth
  }
  // Band-aid and tears.
  if (hurt > 0.35) {
    R(g, cx + 12 + sw, cy + 4, 10, 4, '#f2c79a');
    R(g, cx + 16 + sw, cy + 4, 2, 4, '#e0a878');
  }
  if (hurt > 0.6 && !fight.ko) {
    const drip = (Date.now() / 120) % 8;
    R(g, cx - 14, cy + 1 + drip, 2, 3, '#7ac8f0');
    R(g, cx + 13, cy + 3 + ((drip + 4) % 8), 2, 3, '#7ac8f0');
  }
  // Stars round a dizzy head.
  if (hurt > 0.7 || fight.ko) {
    const a = Date.now() / 300;
    for (let i = 0; i < 3; i++) star(g, cx + Math.cos(a + i * 2.1) * 28, cy - 30 + Math.sin(a + i * 2.1) * 5);
  }
  // The weapon (or your fist) where it lands, coming in from below.
  const me = lifeState?.skin ?? S.skin ?? SKIN;
  if (fight.swing) drawWeapon(g, fight.swing.w, fight.swing.x, fight.swing.y + fight.swing.t * 3, me);
  else if (!fight.ko) drawWeapon(g, fight.weapon, 74, 90, me, true);
  for (const p of fight.pops) {
    g.font = 'bold 9px sans-serif';
    g.fillStyle = '#3a1a1a';
    g.fillText(p.text, Math.round(p.x - 12) + 1, Math.round(p.y - (14 - p.t)) + 1);
    g.fillStyle = '#ffe066';
    g.fillText(p.text, Math.round(p.x - 12), Math.round(p.y - (14 - p.t)));
  }
  if (fight.ko) {
    g.font = 'bold 22px sans-serif';
    g.fillStyle = '#e8505b';
    g.fillText('K.O.', 26, 24);
  }
  document.getElementById('fightSay').textContent = fight.say ? `${whoIs(e).name}: "${fight.say}"` : '탭해서 때려요';
  if (hurt > 0.6 && !fight.ko && !fight.raf) fight.raf = requestAnimationFrame(() => ((fight.raf = 0), drawFight())); // tears keep falling
}

function oval(g, x, y, rx, ry, c) {
  g.fillStyle = c;
  g.beginPath();
  g.ellipse(Math.round(x), Math.round(y), rx, ry, 0, 0, Math.PI * 2);
  g.fill();
}
const blob = (g, x, y, r, c) => oval(g, x, y, r, r, c);
function star(g, x, y) {
  x = Math.round(x);
  y = Math.round(y);
  R(g, x - 1, y - 3, 2, 6, '#ffe066');
  R(g, x - 3, y - 1, 6, 2, '#ffe066');
}
/** Your fist, or what you hold, at (x, y). idle: resting at the corner. */
function drawWeapon(g, id, x, y, skin, idle) {
  x = Math.round(x);
  y = Math.round(y);
  const fist = () => {
    R(g, x - 7, y - 6, 14, 12, shadeOf(skin, 0.75));
    R(g, x - 6, y - 5, 12, 10, skin);
    for (let i = 0; i < 3; i++) R(g, x - 5 + i * 4, y - 5, 1, 4, shadeOf(skin, 0.75)); // knuckles
    R(g, x - 4, y + 5, 8, 10, '#5a6a8a'); // sleeve
  };
  switch (id) {
    case 'fist':
      fist();
      break;
    case 'slap':
      R(g, x - 6, y - 10, 12, 20, '#3aa0d8');
      R(g, x - 4, y - 4, 8, 2, '#f2f4f6');
      break;
    case 'fish':
      oval(g, x, y, 12, 5, '#8ab4c8');
      R(g, x + 10, y - 5, 4, 10, '#6a94a8');
      R(g, x - 8, y - 2, 2, 2, '#2a2a3a');
      break;
    case 'toy':
      R(g, x - 1, y, 3, 16, '#ffe066');
      R(g, x - 9, y - 6, 18, 9, '#e8505b');
      R(g, x - 9, y - 6, 4, 9, '#ffb347');
      R(g, x + 5, y - 6, 4, 9, '#ffb347');
      break;
    case 'pan':
      blob(g, x, y - 2, 10, '#3a3a42');
      blob(g, x, y - 2, 7, '#5a5a62');
      R(g, x - 1, y + 7, 3, 12, '#6a4a2a');
      break;
    case 'bat':
      g.save();
      g.translate(x, y);
      g.rotate(idle ? -0.5 : -0.9);
      R(g, -3, -14, 6, 22, '#c8945a');
      R(g, -2, 8, 4, 10, '#8a5a3a');
      g.restore();
      break;
  }
}

/** Leaving or restarting a town: both cards just close (nobody is hurt or saved). */
function endTalk() {
  clearInterval(talkTimer);
  if (fight) cancelAnimationFrame(fight.raf);
  fight = null;
  release(talkWith);
  talkWith = null;
  document.getElementById('fight').hidden = true;
  document.getElementById('talkCard').hidden = true;
}

function wireTalk() {
  document.getElementById('talkClose').addEventListener('click', closeTalk);
  document.getElementById('fightFace').addEventListener('pointerdown', punch);
  document.getElementById('fightStop').addEventListener('click', closeFight);
}
