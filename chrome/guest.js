// 작은 마을 — calling on a neighbour: you knock, and the door opens only if someone of that family is home (inside,
// not out at work or in the square). Asleep, ill, or the one you broke up with: a short, kind word at the door.
// Friendship sets how far in you get: 3 for tea, a gift, a look round; 6 to stay for dinner or play with their child;
// 8 to listen to what's on their mind. One visit per family a day, at most +3 friendship from it. Neighbours you're
// close to invite you over in the evening now and then (then the door is sure to open). Their room is drawn by era,
// tinted per family, with something of theirs by what they're best at (drawCorner, family.js). Neighbours call on
// each other the same way: in only if someone's home, a bubble over the door while they're in.
// Life mode only; a friend's town is never visited this way. Loaded before game.js: game.js names inside functions.
'use strict';

const CALL_MIN = 3; //  friendship to be let in
const CALL_GAIN = 3; // most friendship a day from one family's visits
let wantCall = null; // { i, invited } on your way to their door
let guestStay = null; // { i, invited, act, t, n } while you're inside

const guestHour = () => (typeof window.__hour === 'number' ? window.__hour : hour()); // tests set the hour
const guestView = () => MODE === 'life' && !!guestStay && !lifeCam;
const calledToday = (i) => S.friends[i]?.callDay === today();
const familyOf = (i) => people.filter((p) => p.home === i && p.kind === 'villager' && !p.dying && !p.zombie);
/** Who of family i is at home: inside, or standing right at their door. */
function hostsHome(i) {
  const [dx] = doorOf(i);
  return familyOf(i).filter((p) => p.hidden || (!p.path.length && !p.act && Math.abs(p.x - (dx * T + T / 2)) < T * 1.2));
}
/** Why you can't call on family i now ('' when you can head over). */
function callWhy(i) {
  if (MODE !== 'life' || i == null || i < 0 || i === S.spouse) return '갈 수 없어요';
  if (i === S.ex) return '지금은 만나기 싫대요';
  if ((S.friends[i]?.f ?? 0) < CALL_MIN) return `호감 ${CALL_MIN}부터 놀러 갈 수 있어요`;
  if (calledToday(i)) return '오늘은 벌써 다녀왔어요';
  if (S.sickDays > 0) return '몸이 나으면 가요';
  return '';
}
/** The host heads home and waits inside for you a while. */
function sendHome(p, i) {
  p.held = false;
  p.act = null;
  p.busy = true;
  p.goal = { what: 'shelter', to: doorOf(i), tool: 'bowl', dur: 240, done: () => {} };
  route(p, nearestWalkable(...doorOf(i)));
}
/** From the person card: 집에 놀러 가기. The one you asked goes home first ("집에서 봐요"). */
function requestCall(e, i) {
  const why = callWhy(i);
  if (why) return toast(why);
  closeTalk();
  sendHome(e, i);
  e.shout = { text: '집에서 봐요!', t: 24 };
  startCall(i, false);
}
function startCall(i, invited) {
  wantCall = { i, invited };
  wantHobby = null;
  wantFamily = null;
  homeStay = null;
  houseView = false;
  task = null;
  me.path = [];
  me.act = null;
  me.hidden = false;
  rest = 0;
}
/** Asked by nextTask(): on the way to their door, or an invitation for this evening. */
function callTask() {
  if (MODE !== 'life') return null;
  if (!wantCall) {
    const inv = S.invite;
    const h = guestHour();
    if (!inv || inv.day !== S.days || calledToday(inv.i) || h < 17 || h >= 22 || !live()) return null;
    const host = familyOf(inv.i).find((p) => !p.small);
    if (host && !host.hidden) sendHome(host, inv.i);
    startCall(inv.i, true);
  }
  const { i, invited } = wantCall;
  if (i >= occupied() || callWhy(i)) return (wantCall = null);
  return { to: doorOf(i), tool: 'talk', what: `${FAMILIES[i].family}에 놀러 가기${invited ? ' (초대)' : ''}`, dur: 12, dir: 'u', act: () => {
    wantCall = null;
    return knock(i, invited);
  } };
}
/** At the door: in, or a kind word why not. */
function knock(i, invited = false) {
  const fam = FAMILIES[i];
  const all = hostsHome(i);
  if (!all.length) return `${fam.family}: 아무도 없나 봐요. 나중에 와요`;
  if (all.every((p) => p.act?.tool === 'sleep') && isNight()) return `${fam.family}: 다들 자고 있어요. 내일 와요`;
  if (all.every((p) => p.sick || p.plague)) return `${fam.family}: 몸이 안 좋대요. 나으면 와요`;
  // In: everyone who's home stays in while you're there.
  for (const p of all) {
    p.hidden = true;
    p.path = [];
    p.goal = null;
    p.busy = true;
    p.act = { tool: 'bowl', n: 400, t: Math.max(p.act?.t ?? 0, 400), done: () => {} };
  }
  const fr = S.friends[i];
  fr.callDay = today();
  fr.callGain = 0;
  fr.day = today(); // counts as today's visit too
  if (S.invite?.i === i) S.invite = null;
  lifeCount('visits');
  guestStay = { i, invited, act: null, t: 160, n: 160, hosts: all.map((p) => p.who) };
  me.hidden = true;
  lifeCam = null;
  paintGuest();
  return `${fam.family}에 들어왔어요${invited ? '. 기다리고 있었대요' : ''}`;
}

// ── Inside: one thing to do, then home ────────────────────────────────────────────────────────────────────────────

const hosts = () => (guestStay ? people.filter((p) => guestStay.hosts.includes(p.who) && p.hidden) : []);
const evening = () => guestHour() >= 17 && guestHour() < 22;
const GUEST_ACTS = [
  { id: 'tea', min: 3, gain: 1, name: () => (S.era === 0 ? '약초 물 마시며 얘기하기' : '차 마시며 얘기하기'), note: '따뜻한 차를 마시며 수다를 떨었어요' },
  { id: 'gift', min: 3, gain: 2, name: () => `${era().crop} 선물하기`, why: () => (home().bag > 0 ? '' : '가방에 작물이 없어요'), note: '정말 고마워했어요' },
  { id: 'look', min: 3, gain: 1, name: () => '집 구경하기', why: (fr) => (fr.looked ? '벌써 구경했어요' : ''), note: '집 안을 한 바퀴 둘러봤어요' },
  { id: 'dinner', min: 6, gain: 2, name: () => '저녁 먹고 가기', why: () => (evening() || guestStay?.invited ? '' : '저녁에만 할 수 있어요'), note: '배불리 먹고 왔어요' },
  { id: 'kids', min: 6, gain: 1, name: () => '아이랑 놀아 주기', why: () => (hosts().some((p) => p.small) ? '' : '아이가 집에 없어요'), note: '아이가 또 오래요' },
  { id: 'listen', min: 8, gain: 2, name: () => '고민 들어주기', why: (fr) => (S.days - (fr.listened ?? -99) < 7 ? '일주일에 한 번 들어줄 수 있어요' : ''), note: '속이 후련하대요' },
];
function guestWhy(a, fr) {
  if (fr.f < a.min) return `호감 ${a.min}부터`;
  return a.why?.(fr) ?? '';
}
function guestDo(id) {
  if (!guestStay || guestStay.act) return;
  const i = guestStay.i;
  const fr = S.friends[i];
  const a = GUEST_ACTS.find((x) => x.id === id);
  if (!a || guestWhy(a, fr)) return;
  guestStay.act = id;
  guestStay.t = guestStay.n = 72; // 9 s
  paintGuest();
}
/** When it's done: friendship (up to the day's cap), and whatever that visit brings. */
function guestDone() {
  const { i, act, invited } = guestStay;
  const fam = FAMILIES[i];
  const fr = S.friends[i];
  const a = GUEST_ACTS.find((x) => x.id === act);
  let gain = a ? a.gain : 0;
  let extra = '';
  if (act === 'gift') {
    home().bag--;
    if (trait('charm') >= 4) gain++;
    if (Math.random() < 0.35) {
      const [k, name] = [['wood', '나무'], ['stone', '돌'], ['berries', '열매']][rand(0, 2)];
      const n = rand(1, 2);
      stock(k, n);
      extra = ` · 답례로 ${name} ${n}개를 받았어요`;
    }
  }
  if (act === 'look') {
    fr.looked = true;
    const k = TRAITS.reduce((m, x) => (villagerTraits(i)[x[0]] > villagerTraits(i)[m[0]] ? x : m))[0];
    story(`🏠 ${fam.family}에 놀러 가 집 구경을 했어요. ${josa(jobFor(i).name, '이라', '라')} 그런지 ${josa(CORNER[k][Math.max(0, Math.min(5, S.era))], '이', '가')} 있었어요.`);
    photoSoon(`${fam.family} 집 구경`);
  }
  if (act === 'dinner') S.happy = Math.min(100, S.happy + 3);
  if (act === 'kids') gainXp(5);
  if (act === 'listen') {
    fr.listened = S.days;
    story(`🫖 ${fam.single}의 고민을 들어줬어요. 속이 후련하대요.`);
  }
  if (invited) gain++;
  S.happy = Math.min(100, S.happy + 1);
  gain = Math.max(0, Math.min(gain, CALL_GAIN - (fr.callGain ?? 0), MAX_FRIEND - fr.f));
  fr.f += gain;
  fr.callGain = (fr.callGain ?? 0) + gain;
  if (i === S.myLover) S.loverQuiet = 0;
  if (a && Math.random() < 0.3 && act !== 'look' && act !== 'listen') story(`🏠 ${fam.family}에서 ${josa(a.name(), '을', '를')} 했어요. ${a.note}.`);
  leaveGuest();
  saveSoon();
  return `${a ? a.note : '잘 놀다 왔어요'}${gain ? ` (호감 +${gain})` : ''}${extra}`;
}
/** Out you go: the hosts carry on with their day a moment later. */
function leaveGuest(say = '') {
  if (!guestStay) return;
  for (const p of hosts()) if (p.act) p.act.t = rand(10, 40);
  guestStay = null;
  me.hidden = false;
  rest = Math.max(rest, 6);
  if (say) $('now').textContent = say;
  paintGuest();
}
/** Each tick while inside. */
function guestTick() {
  if (!guestStay) return false;
  if (MODE !== 'life' || S.over) return (guestStay = null), (me.hidden = false), false;
  rest = Math.max(rest, 2);
  me.hidden = true;
  if (!hosts().length) return leaveGuest(`${FAMILIES[guestStay.i].single}: 나가 봐야 한대요. 다음에 또 와요`), true;
  if (--guestStay.t > 0) return true;
  // Waited without picking anything: tea it is.
  if (!guestStay.act) return guestDo('tea'), true;
  $('now').textContent = guestDone();
  paintUi();
  return true;
}

// ── Invitations: once in a while, someone close asks you over this evening ───────────────────────────────────────

function guestDay() {
  if (MODE !== 'life') return;
  if (S.invite && S.invite.day !== S.days) S.invite = null;
  if (S.invite || Math.random() > 0.35) return;
  const close = S.friends.map((f, i) => [i, f?.f ?? 0]).filter(([i, f]) => i < occupied() && i !== S.spouse && i !== S.ex && f >= 6);
  if (!close.length) return;
  const [i] = close[rand(0, close.length - 1)];
  S.invite = { i, day: S.days };
  story(`💌 ${josa(FAMILIES[i].family, '이', '가')} 오늘 저녁에 놀러 오래요.`);
}

// ── The card while you're in, and the room ───────────────────────────────────────────────────────────────────────

function paintGuest() {
  const card = document.getElementById('guestCard');
  if (!card) return;
  card.hidden = !guestView();
  if (card.hidden) return;
  const i = guestStay.i;
  const fr = S.friends[i];
  document.getElementById('guestName').textContent = `${FAMILIES[i].family} 집`;
  const box = document.getElementById('guestActs');
  const sig = `${guestStay.act}|${fr.f}|${home().bag > 0}|${hosts().length}`;
  if (box.dataset.sig !== sig) {
    box.dataset.sig = sig;
    box.replaceChildren(
      ...GUEST_ACTS.map((a) => {
        const why = guestWhy(a, fr);
        const b = el('button', 'btn', why ? `${a.name()} · ${why}` : a.name());
        b.disabled = !!why || !!guestStay.act;
        if (guestStay.act === a.id) b.setAttribute('aria-pressed', 'true');
        b.addEventListener('click', () => guestDo(a.id));
        return b;
      }),
    );
  }
  const left = Math.max(0, CALL_GAIN - (fr.callGain ?? 0));
  document.getElementById('guestNote').textContent = guestStay.act
    ? `${GUEST_ACTS.find((a) => a.id === guestStay.act).name()} 하는 중이에요`
    : `집에 ${hosts().length}명 있어요 · 오늘 호감은 ${left}까지 더 오를 수 있어요 · 고르지 않으면 차를 마셔요`;
}
function wireGuest() {
  document.getElementById('guestLeave')?.addEventListener('click', () => leaveGuest('다음에 또 올게요'));
}

const GUEST_WALL = ['#e8d8c8', '#d8e4d0', '#d8dcec', '#ecd8dc', '#e4e0c8', '#d4e4e4'];
const GUEST_RUG = ['#5a8ad0', '#5aa04a', '#c8503a', '#8a6cc9', '#e8a030', '#3aa0a0'];
function drawGuestRoom(g) {
  const k = scale * 2;
  g.setTransform(k, 0, 0, k, 0, 0);
  g.imageSmoothingEnabled = false;
  const { i, act } = guestStay;
  const e = Math.max(0, Math.min(5, S.era));
  const c = ROOM[e];
  const t = clockTick();
  const r = rng(i * 977 + (S.mapSeed ?? 0));
  const wall = e === 0 ? c.wall : GUEST_WALL[Math.floor(r() * GUEST_WALL.length)];
  const rug = GUEST_RUG[Math.floor(r() * GUEST_RUG.length)];
  R(g, 0, 0, 120, 60, wall);
  R(g, 0, 57, 120, 3, c.trim);
  R(g, 0, 60, 120, 36, c.floor);
  for (let y = 64; y < 96; y += 6) R(g, 0, y, 120, 1, c.floor2);
  // The window, the sky as it is now.
  box(g, 44, 10, 26, 20, c.trim);
  R(g, 46, 12, 22, 16, night ? '#1c2448' : raining() ? '#8a9aa8' : '#8fd3f4');
  R(g, 46, 24, 22, 4, '#6cbf4a');
  R(g, 56, 12, 1, 16, c.trim);
  // A shelf, the bed, the table, the rug, and something of theirs.
  box(g, 82, 14, 28, 3, c.trim);
  for (let n = 0; n < 6; n++) R(g, 84 + n * 4, 7 + (n % 3), 3, 7 - (n % 3), ['#d8503a', '#3a7ad0', '#e8c050', '#5aa04a'][(n + i) % 4]);
  box(g, 4, 46, 30, 12, c.trim, OL);
  R(g, 6, 48, 26, 6, rug);
  R(g, 6, 46, 8, 4, '#f4efe6');
  box(g, 30, 74, 60, 14, rug, OL);
  R(g, 33, 77, 54, 8, lighten(rug, 0.25));
  const best = TRAITS.reduce((m, x) => (villagerTraits(i)[x[0]] > villagerTraits(i)[m[0]] ? x : m))[0];
  drawCorner(g, e, best, 98, 66);
  box(g, 56, 52, 22, 4, c.trim);
  R(g, 58, 56, 2, 8, c.trim);
  R(g, 74, 56, 2, 8, c.trim);
  // On the table: cups, or dinner.
  if (act === 'dinner') for (let n = 0; n < 3; n++) disc(g, 61 + n * 6, 50, 2, ['#f4efe6', '#e8c050', '#d8503a'][n]);
  else for (let n = 0; n < 2; n++) box(g, 61 + n * 9, 48, 4, 4, '#f4efe6', OL);
  if (act === 'tea' || act === 'dinner') for (let n = 0; n < 2; n++) R(g, 62 + n * 9, 45 - ((t + n * 5) % 8), 1, 2, 'rgba(255,255,255,0.8)');
  // Them, and you.
  const here = hosts();
  const head = here.find((p) => p.who?.endsWith('a')) ?? here.find((p) => !p.small) ?? here[0];
  const kid = here.find((p) => p.small);
  const elder = here.find((p) => p !== head && p !== kid);
  const put = (p, x, y, dir, hop = 0) => person(g, { ...p, x, y: y + hop, dir, path: [], frame: 0, hidden: false, act: null }, p.look);
  if (head) put(head, 84, 66, 'l');
  if (elder) put(elder, 92, 82, 'l');
  if (kid) put(kid, act === 'kids' ? 52 + Math.round(Math.sin(t / 5) * 6) : 66, 80, act === 'kids' ? (Math.sin(t / 5) > 0 ? 'l' : 'r') : 'u', act === 'kids' && t % 6 < 3 ? -2 : 0);
  const look = OUTFIT[S.era];
  const meAt = act === 'look' ? [20 + ((t * 0.6) % 70), 84] : act === 'kids' ? [44, 82] : [50, 66];
  person(g, { kind: 'me', x: Math.round(meAt[0]), y: meAt[1], dir: act === 'look' ? 'r' : 'r', path: [], frame: act === 'look' ? t : 0, seed: 1, gender: S.gender }, look);
  if (act === 'gift') box(g, 62, 40 - (t % 8 < 4 ? 1 : 0), 6, 5, '#e0475f', '#ffd23f');
  if (act === 'listen' && t % 16 < 10) spr(g, ['.rr.rr.', 'rrrrrrr', '.rrrrr.', '..rrr..', '...r...'], { r: '#ff8aa8' }, 64, 36);
  // A label, top left.
  g.font = '5px sans-serif';
  const label = `${FAMILIES[i].family} 집`;
  const w = Math.ceil(g.measureText(label).width) + 6;
  g.fillStyle = 'rgba(25, 31, 40, 0.7)';
  g.fillRect(2, 2, w, 8);
  g.fillStyle = '#ffffff';
  g.fillText(label, 5, 8);
}

// ── Neighbours calling on each other: someone has to be home ─────────────────────────────────────────────────────

let npcCalls = []; // { guest, j } while a neighbour is visiting family j (a little bubble over their door)
/** A villager's option (village.js villageOptions): drop in on a family they get on with, in the daytime. */
function npcCallOption(e, i, add) {
  if (MODE !== 'life' || !e.who?.endsWith('a') || e.needs.social > 75 || Math.random() > 0.5) return;
  const others = [];
  for (let j = 0; j < occupied(); j++) if (j !== i && j !== S.spouse && relOf(i, j) > -5) others.push([j, relOf(i, j)]);
  if (!others.length) return;
  const [j, rel] = others[rand(0, others.length - 1)];
  add((100 - e.needs.social) * 0.45 + rel * 2 + (isLovers(i, j) ? 12 : 0), 'call', doorOf(j), 'talk', 10, () => npcKnock(e, i, j));
}
/** At the door: in if someone's home (everyone stays in a while together), or off again. */
function npcKnock(e, i, j) {
  if (MODE !== 'life') return;
  const home = hostsHome(j).filter((p) => p !== e);
  if (!home.length) {
    e.shout = { text: '아무도 없네…', t: 20 };
    return;
  }
  if (home.every((p) => p.act?.tool === 'sleep')) {
    e.shout = { text: '자나 봐요', t: 20 };
    return;
  }
  const stay = rand(120, 200); // 15–25 s
  for (const p of home) {
    p.hidden = true;
    p.path = [];
    p.goal = null;
    p.busy = true;
    if (!p.act || p.act.t < stay) p.act = { tool: 'bowl', n: stay, t: stay, done: p.act?.done };
  }
  e.hidden = true;
  e.act = { tool: 'bowl', n: stay, t: stay, done: () => (e.needs.social = 100) };
  npcCalls.push({ guest: e, j });
  addRel(i, j, 2);
  if (Math.random() < 0.15) story(`🏠 ${josa(nameOf(i), '이', '가')} ${FAMILIES[j].family}에 놀러 갔어요.${isLovers(i, j) ? ' 둘이 요즘 부쩍 가까워요 💕' : ''}`);
}
/** Over the door of a house with a guest in: a bubble with a teacup, now and then a note. */
function drawNpcCalls(g) {
  if (MODE !== 'life' || !npcCalls.length) return;
  npcCalls = npcCalls.filter((c) => c.guest.hidden && people.includes(c.guest) && c.j < occupied());
  const t = clockTick();
  for (const { j } of npcCalls) {
    const x = doorOf(j)[0] * T + T / 2;
    if (!onScreen(x)) continue;
    const y = ROAD_Y * T - 34 - (t % 24 < 12 ? 0 : 1);
    R(g, x - 5, y, 11, 8, '#ffffff');
    R(g, x - 6, y + 1, 13, 6, '#ffffff');
    R(g, x - 1, y + 8, 2, 2, '#ffffff');
    if (t % 48 < 24) {
      R(g, x - 3, y + 3, 5, 3, '#c8843a'); // a teacup
      R(g, x + 2, y + 4, 1, 1, '#c8843a');
    } else spr(g, ['.oo', '.o.', 'oo.'], { o: '#4a3a60' }, x - 1, y + 2);
  }
}
