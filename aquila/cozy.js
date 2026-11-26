// 작은 마을 — small glance-sized joys, picked from outside research (sources in TODO.md):
//  • the town paper: a headline that changes every 10 s, written from what's going on (Cookie Clicker's news ticker);
//  • the work grove: each day you worked plants a tree in the 나 tab; days off stay bare ground, trees never die
//    (Forest, without the dying);
//  • finds while you work: every 🪙50 earned from usage, something small turns up, odds shown openly (Bongo Cat);
//  • poke anything: tap an animal or your pet for a heart and a hop (Spirit City, Townscaper).
// Life mode only. Nothing here touches coins or growth (the balance stays where `npm run sim` put it).
// Loaded before game.js: game.js names are used only inside functions.
'use strict';

// ── The town paper ────────────────────────────────────────────────────────────────────────────────────────────────

const PAPER = ['동굴 소식', '마을 방', '저잣거리 소식', '마을 신문', '마을 뉴스', '홀로 뉴스'];
const RARE_NEWS = [
  '하늘에서 이상한 빛을 봤다는 제보가 들어왔어요',
  '고양이 한 마리가 이장 선거에 나가겠대요',
  '연못 오리가 사람 말을 했다는 소문이 돌아요',
  '마을 최고령 돌멩이, 오늘도 그 자리에 있어요',
  '누가 밤마다 광장 의자를 닦아 놓는대요',
];
/** Every headline that fits the town right now. */
function headlines() {
  const out = [];
  const add = (cond, text) => cond && out.push(text);
  const pop = population();
  add(true, `주민 ${fmt(pop)}명, ${era().name}을 살아가는 중이에요`);
  add(S.houses >= 3, `이웃이 ${S.houses}가구로 늘었어요. 골목이 북적여요`);
  add(raining(), '비 소식에 농부들이 웃었어요. 작물이 쑥쑥 자라요');
  add(weather === 'snow', '눈이 쌓였어요. 아이들은 눈사람 만들기에 바빠요');
  add(weather === 'sun' && !night, '맑은 날이에요. 빨래가 잘 마르겠어요');
  add(night, '밤이 깊었어요. 창마다 불이 하나둘 꺼져요');
  add(festivalToday(), `${SEASONS[Math.max(0, S.season)]} 축제가 한창이에요. 광장으로 모여요`);
  add(S.coins >= 500, `마을 금고가 두둑해요. 🪙${fmt(S.coins)}이 모였어요`);
  add(S.kids > 0, `우리 집 아이 ${S.kids}명, 오늘도 무럭무럭`);
  add(S.dog, `${dogBreed().name}가 동네 순찰을 돌았어요`);
  add(S.happy >= 70, '요즘 마을 사람들 얼굴이 밝아요');
  add(S.happy < 30, '요즘 집이 조용해요. 가족이 기다려요');
  add(hasMuseum(), '박물관에 새 유물을 기다리는 빈 자리가 있어요');
  add(S.invite?.day === S.days, `${FAMILIES[S.invite?.i]?.family ?? '이웃'}가 오늘 저녁 손님을 기다려요`);
  for (const k of (S.lovers ?? []).slice(0, 2)) {
    const [a, b] = k.split('|').map(Number);
    add(FAMILIES[a] && FAMILIES[b], `소문: ${wa(FAMILIES[a].single)} ${FAMILIES[b].single}, 요즘 자주 붙어 다닌대요`);
  }
  for (const [k, v] of Object.entries(S.rel ?? {}).slice(0, 40)) {
    if (v > -5) continue;
    const [a, b] = k.split('|').map(Number);
    if (FAMILIES[a] && FAMILIES[b]) out.push(`${wa(FAMILIES[a].single)} ${FAMILIES[b].single}, 아직 말을 안 한대요`);
    break;
  }
  const latest = S.story[0];
  if (latest && S.days - latest.day <= 1) out.push(storyKind(latest.text).text);
  return out;
}
let paperAt = 0;
/** One headline: today's big news first, then the rest in turn; a rare odd one now and then. */
function tickerLine() {
  if (MODE !== 'life' || !S.gender) return '';
  const head = PAPER[Math.max(0, Math.min(5, S.era))];
  if (Math.random() < 0.02) return `[${head}] ${RARE_NEWS[rand(0, RARE_NEWS.length - 1)]}`;
  const today = todayLine();
  const list = today ? [today, ...headlines()] : headlines();
  const line = list[paperAt++ % list.length];
  return line ? `[${head}] ${line}` : '';
}
function paintTicker() {
  const news = document.getElementById('dayNews');
  if (!news) return;
  const line = tickerLine();
  news.hidden = !line;
  if (news.textContent !== line) news.textContent = line;
}

// ── The work grove ────────────────────────────────────────────────────────────────────────────────────────────────

const GROVE_DAYS = 56; // eight weeks shown
/** At the end of each day (liveADay): a tree if you worked, bare ground if not. */
function groveDay(worked) {
  if (MODE !== 'life') return;
  S.grove = ((S.grove ?? '') + (worked ? '1' : '0')).slice(-GROVE_DAYS);
  if (worked) {
    S.trees = (S.trees ?? 0) + 1;
    if (S.trees % 10 === 0) story(`🌳 일한 날 숲에 나무가 ${S.trees}그루가 됐어요.`);
  }
}
const GROVE_TREE = ['🌱', '🌿', '🌳', '🌳', '🌲', '🎄'];
function groveRows() {
  if (!S.gender) return [];
  const days = (S.grove ?? '').padStart(GROVE_DAYS, '·');
  const out = [el('li', 'group', `일한 날 숲 · 나무 ${S.trees ?? 0}그루`)];
  const box = el('li', 'grove');
  for (const [k, d] of [...days].entries()) {
    const c = el('span', d === '1' ? 'on' : d === '0' ? 'off' : 'none', d === '1' ? GROVE_TREE[(k * 7 + (S.mapSeed ?? 0)) % 4 === 0 ? 4 : 2] : '');
    box.append(c);
  }
  out.push(box, el('li', 'stat__note', 'Claude·Codex를 쓴 날마다 나무가 한 그루씩 자라요. 쉰 날은 빈 땅으로 남고, 나무는 시들지 않아요.'));
  return out;
}

// ── Finds while you work (odds shown) ─────────────────────────────────────────────────────────────────────────────

const FIND_EVERY = 50; // coins from usage
const FIND_ODDS = [['흔함', 0.9], ['드묾', 0.095], ['희귀', 0.0049], ['전설', 0.0001]];
const FINDS = [
  ['흔함', ['반들반들한 조약돌', '도토리', '깃털', '네잎 아닌 세잎클로버', '단추', '병뚜껑', '솔방울', '조개껍데기', '빨간 낙엽', '구슬', '연필 토막', '실타래']],
  ['드묾', ['네잎클로버', '오래된 동전', '유리 구슬', '새 둥지', '작은 열쇠', '녹슨 나침반', '말린 꽃', '나비 날개 무늬 돌']],
  ['희귀', ['별 모양 돌', '은반지', '보물 지도 조각']],
  ['전설', ['무지개 비늘']],
];
/** From absorb(): coins earned from your own usage. */
function findTick(gain) {
  if (MODE !== 'life' || !(gain > 0)) return;
  S.findAcc = (S.findAcc ?? 0) + gain;
  while (S.findAcc >= FIND_EVERY) {
    S.findAcc -= FIND_EVERY;
    let r = Math.random();
    const [tier] = FIND_ODDS.find(([, p]) => (r -= p) < 0) ?? FIND_ODDS[0];
    const list = FINDS.find(([t]) => t === tier)[1];
    const name = list[rand(0, list.length - 1)];
    S.finds ??= {};
    const first = !S.finds[name];
    S.finds[name] = (S.finds[name] ?? 0) + 1;
    if (tier !== '흔함' || first) story(`🎁 일하다가 ${eul(name)} 주웠어요${tier === '흔함' ? '' : ` (${tier})`}.`);
    if (typeof toast === 'function' && first && typeof document !== 'undefined') toast(`🎁 ${eul(name)} 주웠어요 · ${tier}`, 2200);
  }
}
function findRows() {
  if (!S.gender) return [];
  const total = FINDS.reduce((a, [, l]) => a + l.length, 0);
  const got = Object.keys(S.finds ?? {}).length;
  const out = [el('li', 'group', `주운 물건 ${got}/${total}`)];
  const chips = el('li', 'chips');
  for (const [tier, list] of FINDS)
    for (const name of list) {
      const n = S.finds?.[name] ?? 0;
      const c = el('span', `chip${tier === '흔함' ? '' : ' rare'}`, n ? `${name}${n > 1 ? ` ×${n}` : ''}` : '???');
      c.title = n ? `${tier}` : `${tier} · 아직 못 주웠어요`;
      if (!n) c.style.opacity = '0.45';
      chips.append(c);
    }
  out.push(chips, el('li', 'stat__note', `사용량으로 🪙${FIND_EVERY}을 벌 때마다 하나씩 주워요. 확률: ${FIND_ODDS.map(([t, p]) => `${t} ${+(p * 100).toFixed(2)}%`).join(' · ')}`));
  return out;
}

// ── Poke anything ─────────────────────────────────────────────────────────────────────────────────────────────────

let pokes = []; // { x, y, t, text }
const POKE_SAY = { dog: ['멍!', '왈!', '헥헥'], petcat: ['냐옹', '골골', '냥!'], cat: ['냐옹', '하악', '냥'], chicken: ['꼬꼬', '꼭!'], cow: ['음메', '음머'], sheep: ['메에', '매애'], pig: ['꿀꿀', '꿀!'], duck: ['꽥!', '꽥꽥'], goat: ['메헤헤'], horse: ['히힝'], frog: ['개굴'] };
/** Tap an animal or your pet: it hops and says something; your first pokes of the day cheer you a little. */
function tryPoke(x, y) {
  if (MODE !== 'life') return false;
  let best = null;
  let bestD = 12;
  for (const e of [...animals, ...people.filter((p) => p.kind === 'dog' || p.kind === 'petcat')]) {
    if (e.hidden || e.dying) continue;
    const d = Math.hypot(e.x - x, e.y - 5 - y);
    if (d < bestD) [best, bestD] = [e, d];
  }
  if (!best) return false;
  const say = POKE_SAY[best.kind] ?? ['♥'];
  pokes.push({ x: best.x, y: best.y - 14, t: 16, text: say[rand(0, say.length - 1)] });
  if (pokes.length > 6) pokes.shift();
  best.hop = -3;
  best.pokeT = 6;
  if (best.wait != null) best.wait = Math.max(best.wait, 12); // stays a moment to be petted
  const day = today();
  if (S.pokeDay !== day) [S.pokeDay, S.pokes] = [day, 0];
  if (S.pokes++ < 3) S.happy = Math.min(100, S.happy + 1);
  frame();
  return true;
}
function pokeTick() {
  let moved = false;
  for (const p of pokes) (p.t--, (moved = true));
  pokes = pokes.filter((p) => p.t > 0);
  for (const e of animals) if (e.pokeT > 0 && --e.pokeT === 0) e.hop = 0;
  for (const e of people) if (e.pokeT > 0 && --e.pokeT === 0) e.hop = 0;
  return moved;
}
function drawPokes(g) {
  if (!pokes.length) return;
  g.font = '6px sans-serif';
  for (const p of pokes) {
    const y = Math.round(p.y - (16 - p.t) * 0.6);
    spr(g, ['.r.r.', 'rrrrr', '.rrr.', '..r..'], { r: '#ff6a8a' }, Math.round(p.x) - 2, y - 6);
    const w = Math.ceil(g.measureText(p.text).width) + 4;
    g.fillStyle = 'rgba(255, 255, 255, 0.9)';
    g.fillRect(Math.round(p.x) - w / 2, y - 15, w, 8);
    g.fillStyle = '#3a2a30';
    g.fillText(p.text, Math.round(p.x) - w / 2 + 2, y - 9);
  }
}

function wireCozy() {
  // The paper turns every 10 s, only while the panel is showing.
  if (typeof setInterval !== 'function') return;
  setInterval(() => {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible' && MODE === 'life') paintTicker();
  }, 10_000);
}

// ── Hats: found while you work, given to neighbours, worn about town ─────────────────────────────────────────────

const HAT_EVERY = 300; // coins from usage
const HATS = [
  { id: 'straw', name: '밀짚모자', px: ['...oooooo...', '..oyyyyyyo..', 'oyyyyyyyyyyo'], pal: { o: '#8a6a2a', y: '#e8c860' } },
  { id: 'beanie', name: '털모자', px: ['.....oo.....', '...orrrro...', '..orrrrrro..', '..owwwwwwo..'], pal: { o: '#7a2a2a', r: '#d8503a', w: '#f4efe6' } },
  { id: 'flower', name: '꽃 머리띠', px: ['.p.y.p.y.p..', 'gggggggggggg'], pal: { p: '#ff8ac0', y: '#ffd23f', g: '#5aa04a' } },
  { id: 'fedora', name: '중절모', px: ['...oooooo...', '...obbbbo...', '...orrrro...', '.oooooooooo.'], pal: { o: '#2a2a33', b: '#4a4a5a', r: '#8a3a3a' } },
  { id: 'cap', name: '야구모자', px: ['...oooooo...', '..obbbbbbo..', '..obbbbbbbbb'], pal: { o: '#1a3a7a', b: '#3182f6' } },
  { id: 'beret', name: '베레모', px: ['......o.....', '..oooooooo..', '.orrrrrrrro.'], pal: { o: '#3a1a2a', r: '#8a2a4a' } },
  { id: 'party', name: '파티 모자', px: ['.....y......', '.....o......', '....oro.....', '...orbro....', '..orbrbro...'], pal: { o: '#6a3a8a', r: '#ff5a9a', b: '#5ad7e8', y: '#ffd23f' } },
  { id: 'helmet', name: '우주 헬멧', px: ['...oooooo...', '..owccccwo..', '.owcc..ccwo.'], pal: { o: '#8a9aa8', w: '#ffffff', c: 'rgba(160, 220, 255, 0.7)' } },
];
const hatBy = (id) => HATS.find((h) => h.id === id) ?? null;
/** From absorb() too (with findTick): every 🪙300 from usage, a hat. */
function hatTick(gain) {
  if (MODE !== 'life' || !(gain > 0)) return;
  S.hatAcc = (S.hatAcc ?? 0) + gain;
  while (S.hatAcc >= HAT_EVERY) {
    S.hatAcc -= HAT_EVERY;
    const h = HATS[rand(0, HATS.length - 1)];
    S.hats ??= {};
    S.hats[h.id] = (S.hats[h.id] ?? 0) + 1;
    story(`🎩 일하다가 ${eul(h.name)} 주웠어요. 이웃에게 선물해 보세요.`);
  }
}
const hatsInHand = () => HATS.filter((h) => (S.hats?.[h.id] ?? 0) > 0);
/** From the person card: give a hat (the one they'd like best: one they don't wear yet), once a day each. */
function giveHat(e, i) {
  const fr = S.friends[i];
  const pick = hatsInHand().filter((h) => S.worn?.[i] !== h.id);
  if (!fr || !pick.length) return '';
  const h = pick[rand(0, pick.length - 1)];
  S.hats[h.id]--;
  S.worn ??= {};
  S.worn[i] = h.id;
  const first = fr.hatDay !== today();
  fr.hatDay = today();
  if (first) fr.f = Math.min(MAX_FRIEND, fr.f + 1);
  e.shout = { text: '잘 어울려요?', t: 30 };
  saveSoon();
  return `${FAMILIES[i].single}: "${h.name}, 고마워요!"${first ? ' (호감 +1)' : ''}`;
}
/** Over a villager's head (person(), after their job's gear). */
function drawHat(g, e, at) {
  if (MODE === 'chaos' && !e.who) return;
  const i = e.who && /^h\d+a$/.test(e.who) ? +e.who.slice(1, -1) : -1;
  const h = i >= 0 ? hatBy(S.worn?.[i]) : null;
  if (!h) return;
  spr(g, h.px, h.pal, at.x, at.y - h.px.length + 2, at.flip);
}
function hatRows() {
  const have = hatsInHand();
  const worn = Object.entries(S.worn ?? {}).filter(([i, id]) => +i < occupied() && hatBy(id));
  if (!have.length && !worn.length) return [];
  const out = [el('li', 'group', '모자')];
  const chips = el('li', 'chips');
  for (const h of have) chips.append(el('span', 'chip', `${h.name} ×${S.hats[h.id]}`));
  for (const [i, id] of worn) chips.append(el('span', 'chip rare', `${FAMILIES[i].single} · ${hatBy(id).name}`));
  out.push(chips, el('li', 'stat__note', `사용량으로 🪙${HAT_EVERY}을 벌 때마다 모자를 하나 주워요. 이웃을 눌러 선물하면 쓰고 다녀요.`));
  return out;
}
