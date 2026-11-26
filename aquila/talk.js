// 작은 마을 — tap a villager: talk, sell them your harvest, buy wood and stone, ask them out, propose. In chaos mode
// (the 👆 tool) there is one more: 때리기, a close-up of their face that swells with every hit until they're down.
// Loaded before game.js: game constants are only used inside functions.
'use strict';

let talkWith = null; // the villager whose card is open
const TALKS_A_DAY = 3; // talks that raise the friendship gauge, per family a day
const LOVE_AT = 6; // the gauge where asking them out can work
const PROPOSE_AT = 8; // the gauge where a proposal can work; at MAX_FRIEND it always does
let parting = null; // the one you pressed 헤어지기 on once: a second press parts
const SAY = {
  low: ['안녕하세요.', '아, 네… 반가워요.', '날씨가 좋네요.', '무슨 일이에요?'],
  mid: ['또 왔네요! 반가워요.', '요즘 어때요?', '같이 산책할래요?', '오늘 밭은 잘 됐어요?'],
  high: ['보고 싶었어요!', '오늘도 와 줬네요 :)', '당신이랑 얘기하면 시간 가는 줄 몰라요.', '우리 내일도 봐요.'],
  love: ['오늘 예뻐/멋져 보여요.', '손 잡아도 돼요?', '당신 생각만 했어요.', '같이 노을 보러 갈래요?'],
  kid: ['아저씨/아줌마 안녕!', '같이 놀아요!', '사탕 있어요?', '헤헤.'],
};

// ── Names: made up per town, and people come from all over (written in Hangul) ─────────────────────────────────────

const KO1 = ['민', '서', '지', '하', '도', '유', '시', '은', '예', '수', '주', '채', '윤', '다', '나', '태', '현', '우', '소', '라', '가', '로', '아', '건', '세', '이', '연', '한', '새', '보'];
const KO2 = ['준', '아', '윤', '우', '진', '린', '은', '호', '율', '원', '안', '온', '희', '결', '빈', '오', '나', '현', '서', '람', '솔', '별', '봄', '찬'];
const KO_OLD1 = ['순', '말', '춘', '옥', '복', '정', '덕', '만', '영', '팔', '갑', '상', '봉', '금', '분', '판'];
const KO_OLD2 = ['자', '순', '례', '분', '배', '복', '수', '봉', '식', '돌', '희', '남', '이', '녀'];
const ORIGINS = [
  { flag: '🇰🇷', land: '한국' }, // names made of syllables (KO1/KO2, old-fashioned for elders)
  { flag: '🇯🇵', land: '일본', gen: { f: [['유', '하', '사', '미', '아', '리', '나', '치', '메', '카', '모', '에', '후', '키', '코', '마', '시', '아야', '스미', '하루'], ['코', '미', '나', '에', '카', '리', '호', '네', '요', '사', '노', '키']], m: [['하', '유', '소', '켄', '다', '료', '히', '타', '카', '신', '렌', '코', '마', '요', '쇼', '데', '이', '아키'], ['토', '타', '키', '지', '스케', '로', '야', '마', '이치', '헤이', '오', '세이']] } },
  { flag: '🇨🇳', land: '중국', gen: { f: [['메이', '링', '샤오', '윈', '팡', '징', '후이', '란', '유에', '칭', '슈', '리', '안', '쉐', '잉', '춘'], ['링', '핑', '잉', '롄', '팡', '화', '칭', '루', '윈', '메이', '아이', '쥐안']], m: [['웨이', '하오', '준', '레이', '밍', '첸', '펑', '량', '타오', '쥔', '보', '카이', '즈', '원', '자', '신'], ['밍', '웨이', '하오', '펑', '룽', '청', '양', '량', '후아', '진', '쥔', '칭']] } },
  { flag: '🇻🇳', land: '베트남', gen: { f: [['린', '마이', '투', '란', '흐엉', '짱', '응옥', '타오', '하', '비', '미', '안', '홍', '꾸인', '투이'], ['안', '린', '마이', '하', '비', '짱', '응아', '타오', '란', '투', '오앙']], m: [['민', '안', '남', '둥', '훙', '꽝', '롱', '탄', '후이', '바오', '풍', '캉', '득', '띠엔', '빈'], ['안', '남', '둥', '훙', '롱', '탄', '바오', '풍', '캉', '꾸앙', '빈', '하이']] } },
  { flag: '🇮🇳', land: '인도', gen: { f: [['아', '라', '비', '데', '산', '니', '카', '프리', '디', '미', '이', '푸', '타', '수', '아누', '시', '마'], ['야', '나', '샤', '카', '티', '니', '라', '디', '바티', '자', '리아', '미타']], m: [['아', '라', '비', '데', '산', '니', '카', '로', '아르', '라후', '시', '바', '수', '마', '하', '디'], ['준', '훌', '크람', '브', '제이', '킬', '트', '르', '한', '렌', '니시', '빈', '시', '락']] } },
  { flag: '🇳🇬', land: '나이지리아', gen: { f: [['치', '아', '은', '페', '이', '토', '부', '아이', '지', '에', '오', '세', '니', '아다', '이페'], ['오마', '마카', '고지', '미', '페', '루', '키', '샤', '데', '니', '오마', '요미', '부오', '케']], m: [['춘', '에', '오', '투', '아데', '세', '이', '쿤', '다', '바', '은남', '오순', '치', '에메', '올루'], ['디', '카', '비', '데', '운', '레', '요', '순', '케', '미', '와', '세운', '지', '도']] } },
  { flag: '🇺🇸', land: '미국', f: ['에밀리', '올리비아', '엘라', '루시', '애니', '케이트', '그레이스', '클레어', '몰리', '헤일리', '제니', '노라', '에이미', '사라', '레베카', '줄리', '메건', '앨리스', '에바', '미아', '조이', '테일러', '릴리', '헤더', '페니', '스텔라', '로즈', '바이올렛'], m: ['제이크', '노아', '리암', '벤', '맥스', '샘', '타일러', '라이언', '잭', '루크', '에단', '밀로', '조시', '네이선', '오웬', '칼렙', '헨리', '윌', '데이브', '톰', '마이크', '크리스', '앤디', '브래드', '케빈', '댄', '스콧', '팀'] },
  { flag: '🇫🇷', land: '프랑스', f: ['클로에', '레아', '마농', '쥘리', '카미유', '엠마', '이네스', '루이즈', '상드린', '엘로디', '마리', '조에', '아멜리', '브리지트', '셀린', '다프네', '에디트', '파니', '지젤', '엘렌', '이렌', '자닌', '로르', '마틸드'], m: ['루이', '위고', '레오', '쥘', '가브리엘', '아르튀르', '라파엘', '폴', '앙투안', '테오', '니콜라', '바티스트', '피에르', '장', '마르셀', '프랑수아', '앙리', '알랭', '기욤', '로맹', '세드릭', '에티엔', '파스칼', '뤽'] },
  { flag: '🇪🇸', land: '스페인', f: ['루시아', '카르멘', '마리아', '롤라', '파울라', '엘레나', '이사벨', '알바', '소피아', '클라라', '아나', '마르타', '이레네', '라우라', '노에미', '로시오', '필라르', '돌로레스', '크리스티나', '베아트리스', '인마', '네레아', '아이타나', '시아'], m: ['마테오', '파블로', '디에고', '카를로스', '하비에르', '알바로', '후안', '미겔', '세르히오', '다니엘', '이케르', '루이스', '안토니오', '마누엘', '라파', '호르헤', '다비드', '곤살로', '이반', '라울', '페드로', '엔리케', '하이메', '우고'] },
  { flag: '🇧🇷', land: '브라질', f: ['줄리아', '라리사', '비아', '아나', '루아나', '카밀라', '마리아나', '이자벨라', '레티시아', '가브리엘라', '라우라', '브루나', '탈리타', '페르난다', '아드리아나', '지젤리', '하켈', '타티아나', '파트리시아', '클라리시', '엘로이자', '소냐', '바네사', '파비아나'], m: ['가브리엘', '루카스', '티아고', '페드루', '마테우스', '하파엘', '브루누', '펠리피', '지오구', '이고르', '카이우', '엔조', '조앙', '안드레', '마르쿠', '파울루', '호드리구', '세자르', '에두아르두', '레안드루', '다닐루', '비토르', '자이르', '넬송'] },
  { flag: '🇷🇺', land: '러시아', f: ['안나', '나타샤', '올가', '소냐', '마샤', '이리나', '타냐', '베라', '다샤', '폴리나', '알료나', '니나', '류다', '스베타', '카탸', '옥사나', '갈리나', '지나', '라리사', '마리나', '율리야', '크세니야', '아냐', '레나'], m: ['이반', '드미트리', '미샤', '알렉세이', '세르게이', '보리스', '파벨', '니키타', '올레그', '안톤', '일리야', '유리', '표도르', '블라디미르', '콘스탄틴', '그리샤', '바샤', '코랴', '사샤', '페탸', '레오니드', '아르툠', '막심', '뱌체슬라프'] },
  { flag: '🇪🇬', land: '이집트', f: ['야스민', '레일라', '누르', '파리다', '살마', '후다', '라니아', '다리아', '아미라', '말락', '나디아', '시린', '파티마', '하나', '자이나브', '마르얌', '아야', '라일라', '사나', '다나', '가다', '하디르', '루브나', '사피야'], m: ['오마르', '카림', '유세프', '아마드', '하산', '타렉', '사미르', '무스타파', '칼리드', '나빌', '아델', '지아드', '마흐무드', '이브라힘', '셰리프', '함디', '와엘', '아므르', '라미', '파리드', '바셈', '에삼', '하템', '후삼'] },
];
/** A town is like a country: most of its people come from there, and one in five from somewhere else. */
const townOrigin = (seed) => ORIGINS[hashOf(seed, 'land') % ORIGINS.length];
/** A number from a seed and a key, the same every time (a town's names never change). */
function hashOf(seed, key) {
  let h = (seed >>> 0) ^ 0x9e3779b9;
  for (const ch of String(key)) h = Math.imul(h ^ ch.charCodeAt(0), 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  return Math.imul(h, 0xc2b2ae35) >>> 0;
}
/** Someone's name and flag, from their town and who they are. Elders of Korea have old-fashioned names. */
function personName(seed, key, gender, elder) {
  const h = hashOf(seed, key);
  const o = h % 5 ? townOrigin(seed) : ORIGINS[Math.floor(h / 5) % ORIGINS.length];
  const k = Math.floor(h / 97);
  // Two parts put together: hundreds of names a country (a list only where made-up ones would sound wrong).
  const parts = o.gen ? o.gen[gender === 'm' ? 'm' : 'f'] : !o.f ? (elder ? [KO_OLD1, KO_OLD2] : [KO1, KO2]) : null;
  if (parts) {
    const [a, b] = parts;
    const first = a[k % a.length];
    let second = b[Math.floor(k / a.length) % b.length];
    if (second === first) second = b[(Math.floor(k / a.length) + 1) % b.length]; // no "둥둥"
    let name = first + second;
    if (name.length < 2) name += b[(k >> 7) % b.length]; // one syllable is too short
    return { name, flag: o.flag };
  }
  const list = gender === 'm' ? o.m : o.f;
  return { name: list[k % list.length], flag: o.flag };
}
/** Each town names its own families (FAMILIES is shared by every file: stories, cards, codes). */
function nameTown(seed) {
  const used = new Set();
  FAMILIES.forEach((f, i) => {
    let n = personName(seed, `h${i}`, f.gender);
    for (let t = 1; used.has(n.name) && t < 8; t++) n = personName(seed, `h${i}#${t}`, f.gender);
    used.add(n.name);
    f.single = n.name;
    f.family = `${n.name}네`;
    f.flag = n.flag;
  });
}
const nameFor = (e, elder) => personName(S.mapSeed ?? 0, e.who ?? `${Math.round(e.x)}`, e.gender, elder);

/** Who someone is, for the card and the name tag: a name and what they are to you. */
function whoIs(e) {
  const i = e.home;
  const fam = i >= 0 && FAMILIES[i] ? FAMILIES[i] : null;
  if (e.car) return { name: e.car.type === 'runner' ? '달리던 사람' : '지나가던 사람', role: '나그네' };
  if (e.kind === 'guest') return { name: e.name ?? '이웃', role: '친구', guest: true };
  if (e.kind === 'spouse') return { name: FAMILIES[S.spouse]?.single ?? '배우자', role: '내 배우자', heart: true };
  if (e.kind === 'kid' && !e.baby && youRule() && S.era >= 1 && S.era <= 2 && !movedOut(+String(e.who).slice(1))) return { name: nameFor(e).name, role: e.gender === 'm' ? '왕자' : '공주', kid: true, mine: true };
  if (e.kind === 'kid') return { name: nameFor(e).name, role: e.baby ? '내 아기' : movedOut(+String(e.who).slice(1)) ? '독립한 내 아이' : '내 아이', kid: true, mine: true };
  if (e.who?.startsWith('h') && e.who.endsWith('a') && fam) return { name: fam.single, role: `${e.job?.name ?? '주민'} ${fam.flag ?? ''}`, head: i };
  if (e.who?.startsWith('h') && e.who.endsWith('s') && fam) return { name: nameFor(e).name, role: `${fam.family} 아이`, kid: true };
  if (e.who?.startsWith('h') && e.who.endsWith('e') && fam) {
    const n = nameFor(e, true);
    return { name: n.name, role: `${fam.family} ${e.gender === 'm' ? '할아버지' : '할머니'} ${n.flag}` };
  }
  if (e.zombie) return { name: '좀비', role: '으어어…' };
  if (e.who?.startsWith('f')) {
    const n = nameFor(e);
    return { name: n.name, role: `${e.job?.name ?? '주민'} ${n.flag}` };
  }
  return { name: e.job ? `${e.job.name} 주민` : '행인', role: e.job?.name ?? '지나가던 사람' };
}

// ── Name tags under everyone; the colour says what they are to you ────────────────────────────────────────────────

const TAG = { me: '#3182f6', spouse: '#e0475f', lover: '#f06a9a', family: '#e8892a', friend: '#2f9e5a', other: 'rgba(40, 30, 30, 0.62)' };
/** [text, colour] of someone's tag. Neighbours' friendship counts only in your own town. */
function tagOf(e) {
  if (e === me) return [MODE === 'life' ? nick || '나' : myCard().name, TAG.me];
  const w = whoIs(e);
  if (w.guest) return [`${w.name}·친구`, TAG.friend];
  if (MODE !== 'life') return [w.name, TAG.other];
  if (e.kind === 'spouse') return [`${w.name}·배우자`, TAG.spouse];
  if (w.mine) return [`${w.name}·가족`, TAG.family];
  if (w.head != null && S.myLover === w.head) return [`${w.name}·연인`, TAG.lover];
  if (w.head != null && (S.friends[w.head]?.f ?? 0) >= 5) return [`${w.name}·친구`, TAG.friend];
  return [w.name, TAG.other];
}
/** Each frame, for those on screen (the width is measured once per text). */
function drawNames(g) {
  g.font = '6px sans-serif';
  const one = (e) => {
    if (e.hidden || e.dying || !onScreen(e.x)) return;
    const [text, c] = tagOf(e);
    if (e.tagText !== text) [e.tagText, e.tagW] = [text, Math.min(60, Math.ceil(g.measureText(text).width) + 4)];
    const x = Math.round(e.x - e.tagW / 2);
    const y = Math.round(e.y) + 1;
    g.fillStyle = c;
    g.fillRect(x, y, e.tagW, 8);
    g.fillStyle = '#ffffff';
    g.fillText(text, x + 2, y + 6, 56);
  };
  for (const e of people) if (e.kind !== 'dog' && e.kind !== 'petcat' && !e.zombie) one(e);
  if (MODE !== 'chaos') one(me);
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

/** Your friendship with a family (only in your own town or a chaos copy: a friend's neighbours aren't yours). */
const friendOf = (i) => (MODE !== 'visit' && i != null && i >= 0 ? (S.friends[i] ??= { f: 0, day: '' }) : null);
/** Your own town: what you carry, earn and learn, even while visiting (a friend's town is only looked at). */
const home = () => (MODE === 'visit' ? homeState() : S);
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
  const fr = friendOf(w.head ?? (e.kind === 'spouse' ? S.spouse : null));
  if (parting !== e) parting = null;
  card.hidden = false;
  document.getElementById('talkName').textContent = w.name;
  document.getElementById('talkRole').textContent = w.head != null && S.myLover === w.head ? '연인 ♥' : w.role;
  const gauge = document.getElementById('talkGauge');
  gauge.hidden = !fr;
  if (fr) {
    document.getElementById('talkFill').style.width = `${(Math.min(MAX_FRIEND, fr.f) / MAX_FRIEND) * 100}%`;
    document.getElementById('talkGaugeText').textContent = `호감 ${Math.min(MAX_FRIEND, Math.round(fr.f))}/${MAX_FRIEND}`;
  }
  const stats = document.getElementById('talkStats');
  const statLine = MODE === 'life' && (e.kind === 'spouse' || e.kind === 'kid') ? familyStatLine(e) : '';
  stats.hidden = !statLine;
  stats.textContent = statLine;
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
  if (MODE === 'life' && (e.kind === 'spouse' || e.kind === 'kid'))
    add('📊 가족 능력치', () => {
      closeTalk();
      document.querySelector('[data-tab="me"]')?.click();
      document.querySelector('[data-tab="me"]')?.scrollIntoView?.({ block: 'nearest' });
    });
  if (!w.kid && e.kind !== 'spouse') {
    const p = cropPrice();
    add(`🌾 팔기 (${p + Math.round(p * Math.min(0.2, (fr?.f ?? 0) * 0.02))}코인)`, () => sellTo(e), home().bag > 0 ? null : '팔 작물이 없어요');
    for (const [k, name] of [['wood', '🪵 나무'], ['stone', '🪨 돌']]) {
      const cost = goodsPrice(k, w.head) * 3;
      add(`${name} 3개 사기 (${cost}코인)`, () => buyFrom(e, k), home().coins >= cost ? null : '코인이 모자라요');
    }
  }
  if (MODE === 'life' && w.head != null && e.kind !== 'spouse') add('🎩 모자 선물하기', () => paintTalk(giveHat(e, w.head)), hatsInHand().some((h) => S.worn?.[w.head] !== h.id) ? null : '줄 모자가 없어요');
  if (MODE === 'life' && w.head != null) add('📖 지나온 이야기', () => paintTalk(`${w.name}의 이야기\n${bioLine(w.head)}`));
  if (MODE === 'life' && e.job && !w.kid && !e.zombie) add('💼 일하는 모습 보기', () => (closeTalk(), watchWork(e, w.name, w.head != null ? villagerTraits(w.head) : null)), watchWorkWhy(e) || null);
  if (MODE === 'life' && w.head != null && e.kind !== 'spouse') {
    const why = callWhy(w.head);
    add('🏠 집에 놀러 가기', () => requestCall(e, w.head), why || null);
  }
  if (w.head != null && S.spouse == null && MODE !== 'visit') {
    if (S.myLover !== w.head) add('💌 고백하기', () => askOut(e), fr.f >= LOVE_AT ? null : `호감 ${LOVE_AT}부터 할 수 있어요`);
    else {
      const can = fr.f >= PROPOSE_AT;
      add(can ? `💍 청혼하기 (${Math.round(proposeOdds(fr.f) * 100)}%)` : '💍 청혼하기', () => propose(e), can ? null : `호감 ${PROPOSE_AT}부터 할 수 있어요`);
    }
  }
  if (MODE !== 'visit' && (e.kind === 'spouse' || (w.head != null && S.myLover === w.head && S.spouse == null)))
    add(parting === e ? '💔 정말 헤어지기' : '💔 헤어지기', () => partWith(e));
  if (MODE === 'chaos') add('🥊 때리기', () => openFight(e));
  placeTalk();
}

function line(tier) {
  const list = SAY[tier];
  return list[Math.floor(Math.random() * list.length)];
}

function talk(e) {
  const w = whoIs(e);
  const fr = friendOf(w.head ?? (e.kind === 'spouse' ? S.spouse : null));
  e.shout = { text: '♪', t: 10 };
  if (w.kid) return paintTalk(`${w.name}: "${line('kid')}"${kidTalked(e)}`);
  if (!fr) {
    const xp = MODE === 'visit' && !e.car && abroadOk();
    if (xp) homeXp(1), saveSoon();
    return paintTalk(`${w.name}: "${line('low')}"${xp ? ' (경험치 +1)' : ''}`);
  }
  const day = today();
  if (fr.talkDay !== day) [fr.talkDay, fr.talks] = [day, 0];
  let note = '';
  if (w.head != null && S.myLover === w.head) S.loverQuiet = 0;
  if (fr.talks < TALKS_A_DAY && fr.f < MAX_FRIEND) {
    fr.talks++;
    fr.f = Math.min(MAX_FRIEND, fr.f + 1 + (trait('charm') >= 4 ? 0.5 : 0));
    note = ' (호감 +1)';
  } else note = ' (오늘은 충분히 얘기했어요)';
  const tier = e.kind === 'spouse' || S.myLover === w.head ? 'love' : fr.f >= 7 ? 'high' : fr.f >= 3 ? 'mid' : 'low';
  saveSoon();
  paintTalk(`${w.name}: "${line(tier)}"${note}`);
}

function sellTo(e) {
  const h = home();
  if (h.bag <= 0) return;
  const w = whoIs(e);
  const f = friendOf(w.head)?.f ?? 0;
  const p = cropPrice();
  const got = p + Math.round(p * Math.min(0.2, f * 0.02));
  h.bag--;
  h.coins += got;
  e.shout = { text: '고마워요!', t: 14 };
  saveSoon();
  paintUi();
  paintTalk(`${josa(era().crop, '을', '를')} 하나 팔았어요. +${got}코인`);
}

function buyFrom(e, kind) {
  const w = whoIs(e);
  const cost = goodsPrice(kind, w.head) * 3;
  const h = home();
  if (h.coins < cost) return;
  h.coins -= cost;
  h.stock[kind] = (h.stock[kind] ?? 0) + 3;
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

/** A proposal's chance: sure at full friendship; below it, charm, savings and a furnished home help. */
function proposeOdds(f) {
  if (f >= MAX_FRIEND) return 1;
  const h = home();
  const rich = Math.min(0.15, (h.coins / buildCost(S.houses)) * 0.15);
  const homey = Math.min(0.1, (h.furnOwned?.length ?? 0) * 0.02);
  return Math.min(0.95, Math.max(0.05, 0.25 + (f - PROPOSE_AT) * 0.2 + (trait('charm') - 3) * 0.06 + rich + homey));
}

function propose(e) {
  const w = whoIs(e);
  const fr = friendOf(w.head);
  if (fr.f < PROPOSE_AT || S.spouse != null) return;
  if (Math.random() >= proposeOdds(fr.f)) {
    fr.f = Math.max(0, fr.f - 1);
    saveSoon();
    return paintTalk(`${w.name}: "조금만 더 생각해 볼게요." (호감 −1 · 호감, 매력, 모은 코인, 집 꾸밈이 클수록 잘 돼요)`);
  }
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

/** 헤어지기, pressed twice: a lover goes back to being a friend; a spouse moves back home (the children stay with you). */
function partWith(e) {
  if (parting !== e) {
    parting = e;
    return paintTalk('정말 헤어질까요? 한 번 더 누르면 헤어져요.');
  }
  parting = null;
  const w = whoIs(e);
  if (e.kind === 'spouse') {
    closeTalk();
    divorce();
  } else {
    const fr = friendOf(w.head);
    S.myLover = null;
    if (fr) fr.f = Math.max(0, fr.f - 3);
    story(`💔 ${josa(w.name, '과', '와')} 헤어졌어요. 이제 친구로 지내요.`);
    closeTalk();
  }
  saveSoon();
  paintUi();
  toast(e.kind === 'spouse' ? '이혼했어요' : '헤어졌어요', 2400);
}

/** The marriage ends: the spouse goes back to their family's house, the children stay, and the family is sad for a while. */
function divorce(drifted) {
  const i = S.spouse;
  if (i == null) return;
  const who = FAMILIES[i]?.single ?? '배우자';
  S.spouse = null;
  S.myLover = null;
  S.ex = i;
  S.sinceKid = 0;
  const fr = friendOf(i);
  if (fr) fr.f = 2;
  S.happy = Math.max(0, S.happy - 20);
  story(`💔 ${josa(who, '과', '와')} 이혼했어요.${drifted ? ' 오래 함께하지 못해 마음이 멀어졌대요.' : ''} ${josa(who, '은', '는')} 원래 집으로 돌아갔어요.${S.kids ? ' 아이들은 계속 함께 살아요.' : ''}`);
  spawnFamily();
  cache.dirty = true;
}

/** Once a day: a lover you leave alone for days cools off, and one who has cooled may end it. */
function loveDay() {
  const fr = friendOf(S.myLover);
  if (!fr || S.spouse != null) return;
  S.loverQuiet = (S.loverQuiet ?? 0) + 1;
  if (S.loverQuiet <= 3) return;
  fr.f = Math.max(0, fr.f - 1);
  if (fr.f < LOVE_AT - 1 && Math.random() < 0.25) {
    story(`💔 ${josa(FAMILIES[S.myLover]?.single ?? '연인', '이', '가')} 이별을 말했어요. 요즘 너무 못 만났대요. 이제 친구로 지내요.`);
    S.myLover = null;
    S.loverQuiet = 0;
  } else if (S.loverQuiet === 4) story(`💌 ${josa(FAMILIES[S.myLover]?.single ?? '연인', '이', '가')} 보고 싶대요. 말을 걸어 주세요.`);
}

/** Once a day: a happy home brings you closer; a long lonely stretch drifts you apart, and at the bottom it can end. */
function marriageDay() {
  const fr = friendOf(S.spouse);
  if (!fr) return;
  if (S.happy >= 40) return void (fr.f = Math.min(MAX_FRIEND, fr.f + 0.5));
  if (S.happy >= 20) return;
  fr.f = Math.max(0, fr.f - 0.5);
  if (fr.f <= 2 && Math.random() < 0.1) return divorce(true);
  if (fr.f <= 4) story(`💔 ${josa(FAMILIES[S.spouse]?.single ?? '배우자', '이', '가')} 요즘 서운해해요. 말을 걸어 주세요.`);
}

/** Life saves (save() waits a moment, so taps in a row save once); a chaos town is never saved. */
let homeTimer = 0;
function saveSoon() {
  if (MODE === 'life') return save();
  if (MODE !== 'visit' || !VISIT?.home) return;
  // Visiting: only your own town is written (the friend's stays a copy that is never saved).
  const town = VISIT.home;
  clearTimeout(homeTimer);
  homeTimer = setTimeout(() => void writeTown(town), 800);
}

/** Abroad: a little XP for talking, a crop or two picked to take home; a few a day. */
const ABROAD_A_DAY = 6;
function abroadOk() {
  const h = home();
  const day = today();
  if (h.abroad?.day !== day) h.abroad = { day, n: 0 };
  if (h.abroad.n >= ABROAD_A_DAY) return false;
  h.abroad.n++;
  return true;
}
function homeXp(n) {
  const h = home();
  const before = levelOf(h.xp);
  h.xp += n;
  if (levelOf(h.xp) > before) toast(`레벨이 올랐어요! 이제 Lv.${levelOf(h.xp)}이에요`, 2200);
}
/** Visiting: a tap on a ripe crop picks it for your bag at home. True when it did. */
function tryPickAbroad(x, y) {
  if (MODE !== 'visit') return false;
  const [tx, ty] = [Math.floor(x / T), Math.floor(y / T)];
  const i = PLOT_AT.findIndex(([px, py]) => px === tx && py === ty);
  const p = S.plots?.[i];
  if (!p?.planted) return false;
  if (p.g < GROW) return void toast('아직 덜 익었어요'), true;
  if (!abroadOk()) return void toast('오늘은 충분히 거들었어요. 내일 또 와요'), true;
  S.plots[i] = { planted: false, g: 0 }; // only on your copy of their town
  cache.dirty = true;
  home().bag++;
  homeXp(2);
  popAt(x, y);
  saveSoon();
  toast(`${josa(era().crop, '을', '를')} 거들어 하나 얻었어요. 가방에 넣었어요`);
  return true;
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
