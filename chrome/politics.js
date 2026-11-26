// 작은 마을 — politics by era (from outside research: Reigns' two-choice cards over a few visible meters, Tropico's
// few opposed factions, Democracy's simple voters, Frostpunk's spaced-out laws, CK3's ultimatum before a revolt,
// Animal Crossing's one ordinance at a time). Who rules: a chief, a king, a lord (appointed when the town looks up to
// you), then a mayor, a president, a council chair (elected every 14 days; you can run). Three or four factions per
// era, each family in the one its best ability belongs to; their mood (−5…5) is what you did for them plus how close
// you are to their families. Whoever rules makes one decision a week (a card, two choices, the effects shown); a law
// lasts a week. A faction pushed too far sends an ultimatum; refuse and you're ousted (never a game over: you keep the
// town, can rise again after a week; the calm storyteller only grumbles). A crown or a badge over the ruler's head.
// Life mode only. Loaded before game.js: game.js names are used only inside functions.
'use strict';

const SEATS = ['족장', '왕', '영주', '시장', '대통령', '의회 의장'];
const elected = (era = S.era) => era >= 3;
const FACTION_SETS = [
  [{ id: 'hunt', name: '사냥꾼', t: ['health'] }, { id: 'gather', name: '채집꾼', t: ['green', 'trade'] }, { id: 'shaman', name: '주술사', t: ['charm', 'luck'] }],
  [{ id: 'farm', name: '농민', t: ['green'] }, { id: 'merch', name: '상인', t: ['trade'] }, { id: 'soldier', name: '병사', t: ['health'] }, { id: 'priest', name: '사제', t: ['charm', 'luck'] }],
  null, // medieval: the same as ancient
  [{ id: 'labor', name: '노동자', t: ['health'] }, { id: 'biz', name: '기업', t: ['trade'] }, { id: 'green', name: '녹색당', t: ['green'] }, { id: 'order', name: '치안파', t: ['charm', 'luck'] }],
  null, // modern: the same as industrial
  [{ id: 'tech', name: '기술파', t: ['trade'] }, { id: 'nature', name: '자연파', t: ['green'] }, { id: 'free', name: '자유파', t: ['charm', 'luck'] }, { id: 'guard', name: '수호파', t: ['health'] }],
];
const factions = (era = S.era) => FACTION_SETS[era] ?? FACTION_SETS[era - 1];

/** One decision a week. a / b: label, mood changes, a law (a week), a cost (share of coins, at most 🪙150), happiness. */
const CARDS = [
  { id: 'tax', eras: [1, 5], q: '세금을 조금 올릴까요?', a: { label: '올려요', law: 'tax', mood: { merch: -2, biz: -2, tech: -1, farm: -1, labor: -1 }, say: '세금을 올렸어요. 이번 주 이웃 세금 +10%' }, b: { label: '그대로 둬요', mood: { merch: 1, biz: 1, tech: 1 }, say: '세금은 그대로예요' } },
  { id: 'feast', eras: [0, 5], q: '광장에서 잔치를 열까요?', a: { label: '열어요', cost: 0.04, happy: 8, mood: { farm: 1, priest: 1, labor: 1, free: 1, gather: 1, hunt: 1 }, say: '광장에서 잔치를 열었어요' }, b: { label: '아껴요', mood: { merch: 1, biz: 1, tech: 1 }, say: '잔치는 다음에 하기로 했어요' } },
  { id: 'guard', eras: [1, 5], q: '밤 경비를 늘릴까요?', a: { label: '늘려요', law: 'guard', mood: { soldier: 2, order: 2, guard: 2, farm: -1, free: -1 }, say: '경비를 늘렸어요. 이번 주 도둑이 반으로 줄어요' }, b: { label: '이대로 둬요', mood: { soldier: -1, order: -1, guard: -1, free: 1 }, say: '경비는 그대로예요' } },
  { id: 'care', eras: [1, 5], q: '약초밭과 병원에 돈을 쓸까요?', a: { label: '써요', law: 'care', cost: 0.03, mood: { priest: 1, labor: 1, nature: 1, green: 1 }, say: '병원을 지원했어요. 이번 주 역병이 반으로 줄어요' }, b: { label: '미뤄요', mood: { merch: 1, biz: 1 }, say: '병원 지원은 미뤘어요' } },
  { id: 'ally', eras: [1, 4], q: '이웃 나라와 동맹을 맺을까요?', a: { label: '맺어요', law: 'peace', mood: { merch: 2, biz: 2, soldier: -2, order: -1 }, say: '동맹을 맺었어요. 이번 주 전쟁 걱정이 줄어요' }, b: { label: '거절해요', mood: { soldier: 1, order: 1, merch: -1 }, say: '동맹을 거절했어요' } },
  { id: 'temple', eras: [1, 2], q: '신전에 제물을 바칠까요?', a: { label: '바쳐요', cost: 0.03, mood: { priest: 3, merch: -1 }, say: '신전에 제물을 바쳤어요' }, b: { label: '안 바쳐요', mood: { priest: -2, merch: 1 }, say: '이번엔 제물을 건너뛰었어요' } },
  { id: 'wage', eras: [3, 5], q: '노동자 임금을 올릴까요?', a: { label: '올려요', law: 'wage', mood: { labor: 3, guard: 1, biz: -2 }, say: '임금을 올렸어요. 이번 주 파업이 없어요' }, b: { label: '동결해요', mood: { biz: 1, labor: -2 }, say: '임금을 동결했어요' } },
  { id: 'forest', eras: [3, 5], q: '숲을 보호 구역으로 정할까요?', a: { label: '정해요', happy: 2, mood: { green: 2, nature: 2, biz: -1, tech: -1 }, say: '숲을 보호 구역으로 정했어요' }, b: { label: '개발해요', mood: { biz: 1, tech: 1, green: -1, nature: -1 }, say: '숲 개발을 허락했어요' } },
  { id: 'bighunt', eras: [0, 0], q: '다 같이 큰 사냥을 나갈까요?', a: { label: '나가요', mood: { hunt: 2, gather: -1 }, say: '큰 사냥을 다녀왔어요' }, b: { label: '열매를 따요', mood: { gather: 2, hunt: -1 }, say: '다 같이 열매를 땄어요' } },
  { id: 'firedance', eras: [0, 0], q: '밤새 모닥불 춤을 출까요?', a: { label: '춰요', happy: 5, mood: { shaman: 2, hunt: -1 }, say: '밤새 모닥불 춤을 췄어요' }, b: { label: '일찍 자요', mood: { hunt: 1, shaman: -1 }, say: '다들 일찍 잤어요' } },
  { id: 'ai', eras: [5, 5], q: 'AI 비서에게 마을 일을 맡길까요?', a: { label: '맡겨요', mood: { tech: 3, free: -2 }, say: 'AI 비서가 마을 일을 거들어요' }, b: { label: '사람이 해요', mood: { free: 2, tech: -1 }, say: '마을 일은 사람이 하기로 했어요' } },
];

// ── State ─────────────────────────────────────────────────────────────────────────────────────────────────────────

function gov() {
  S.gov ??= { ruler: null, mood: {}, last: [], vote: null, run: false, era: S.era };
  return S.gov;
}
const youRule = () => S.gov?.ruler === -1;
const lawOn = (id) => !!id && S.gov?.law?.id === id && S.days < S.gov.law.until;
/** Read by crime / war / epidemic / the town tax / strikes. */
const govMul = (kind) => (kind === 'crime' && lawOn('guard') ? 0.5 : kind === 'war' && lawOn('peace') ? 0.3 : kind === 'plague' && lawOn('care') ? 0.5 : 1);
const govTax = () => (lawOn('tax') ? 1.1 : 1);
const govNoStrike = () => lawOn('wage');

/** Which faction a family belongs to: the one their best ability is in. */
function factionOf(i, era = S.era) {
  const t = villagerTraits(i);
  const best = TRAITS.reduce((m, x) => (t[x[0]] > t[m[0]] ? x : m))[0];
  return factions(era).find((f) => f.t.includes(best)) ?? factions(era)[0];
}
const families = () => Array.from({ length: occupied() }, (_, i) => i).filter((i) => i !== S.spouse);
/** −5…5: what you did for them, and how close you are to their families. */
function moodOf(id) {
  const fam = families().filter((i) => factionOf(i).id === id);
  const close = fam.length ? fam.reduce((a, i) => a + ((S.friends[i]?.f ?? 0) - 4) / 2, 0) / fam.length : 0;
  return Math.max(-5, Math.min(5, Math.round((gov().mood[id] ?? 0) + Math.max(-2, Math.min(2, close)))));
}
const FACES = ['😠', '😠', '🙁', '🙁', '😐', '😐', '😐', '🙂', '🙂', '😀', '😀'];
const moodFace = (m) => FACES[m + 5];
/** 0–100: how much the town looks up to you. */
function influence() {
  const fam = families();
  const avg = fam.length ? fam.reduce((a, i) => a + (S.friends[i]?.f ?? 0), 0) / fam.length : 0;
  return Math.round(Math.min(100, avg * 4 + trait('charm') * 5 + Math.min(20, levelOf(S.xp)) + Math.min(15, (gov().gift ?? 0) / 40)));
}
const approval = () => {
  const fs = factions();
  return Math.max(0, Math.min(100, Math.round(50 + (fs.reduce((a, f) => a + moodOf(f.id), 0) / fs.length) * 9)));
};
const rulerName = () => {
  const g = gov();
  if (g.ruler === -1) return nick || '나';
  return g.ruler != null && FAMILIES[g.ruler] ? FAMILIES[g.ruler].single : '';
};
/** The neighbour the town would pick: charm and trade, not your spouse. */
function npcLeader(except = null) {
  let best = null;
  let score = -1;
  for (const i of families()) {
    if (i === except) continue;
    const t = villagerTraits(i);
    const s = t.charm * 2 + t.trade + ((i * 7) % 5) * 0.01;
    if (s > score) [best, score] = [i, s];
  }
  return best;
}
const APPOINT_AT = 55;
const RUN_AT = 35;
const canRise = () => S.days - (gov().ousted ?? -99) >= 7;

// ── Each day ──────────────────────────────────────────────────────────────────────────────────────────────────────

function govDay() {
  if (MODE !== 'life' || !S.gender) return;
  const g = gov();
  if (g.ruler != null && g.ruler !== -1 && (g.ruler >= occupied() || g.ruler === S.spouse)) g.ruler = null; // they left
  // A new era: the seat changes; a king becomes the first mayor until the first vote.
  if (g.era !== S.era) {
    const was = g.era;
    g.era = S.era;
    g.mood = {};
    g.card = null;
    if (elected() && !elected(was)) {
      g.vote = S.days + 7;
      story(`🗳️ ${SEATS[was]}의 시대가 끝났어요. 7일 뒤 첫 ${SEATS[S.era]} 선거가 열려요.`);
    } else if (g.ruler != null) story(`👑 ${rulerName()}, 이제 ${josa(SEATS[S.era], '이라고', '라고')} 불러요.`);
  }
  for (const k of Object.keys(g.mood)) g.mood[k] = Math.round(g.mood[k] * 0.85 * 10) / 10; // feelings fade
  if (g.ruler == null) g.ruler = npcLeader();
  if (!elected()) {
    // Appointed: when the town looks up to you, they ask you to lead.
    if (g.ruler !== -1 && canRise() && influence() >= APPOINT_AT && families().length >= 2) {
      g.ruler = -1;
      story(`👑 마을 사람들이 나를 ${josa(SEATS[S.era], '으로', '로')} 모시기로 했어요!`);
      photoSoon(`${SEATS[S.era]}이 된 날`);
    }
  } else {
    g.vote ??= S.days + 14;
    if (S.days >= g.vote) election();
    else if (g.vote - S.days === 3 && (g.run || youRule())) story(`🗳️ ${SEATS[S.era]} 선거까지 3일 남았어요. 선거 운동이 시작됐어요.`);
  }
  // This week's decision: yours waits three days, then things stay as they are; a neighbour ruler just decides.
  if (g.card && S.days - g.card.day >= 3) decide('b', true);
  if (!g.card && S.days >= (g.next ?? 0)) {
    if (youRule()) drawCard();
    else if (g.ruler != null && families().length >= 2) {
      const c = pickCard();
      if (c) {
        const side = Math.random() < 0.5 ? 'a' : 'b';
        applySide(c, side);
        g.next = S.days + 7;
        if (Math.random() < 0.5) story(`📜 ${SEATS[S.era]} ${josa(rulerName(), '이', '가')} 정했어요: ${c[side].say}.`);
      }
    }
  }
}
function pickCard() {
  const g = gov();
  const fit = CARDS.filter((c) => S.era >= c.eras[0] && S.era <= c.eras[1] && !g.last.includes(c.id));
  return fit.length ? fit[rand(0, fit.length - 1)] : null;
}
/** Your card for the week: an ultimatum first, if a faction is fed up. */
function drawCard() {
  const g = gov();
  const angry = factions().find((f) => moodOf(f.id) <= -4);
  if (angry) {
    g.card = { id: 'ultimatum', f: angry.id, day: S.days };
    story(`📣 ${josa(angry.name, '이', '가')} 불만이 커요. 요구를 들어달래요.`);
    return;
  }
  const c = pickCard();
  if (c) g.card = { id: c.id, day: S.days };
}
function applySide(c, side) {
  const g = gov();
  const s = c[side];
  for (const [k, v] of Object.entries(s.mood ?? {})) g.mood[k] = Math.max(-5, Math.min(5, (g.mood[k] ?? 0) + v));
  if (s.law) g.law = { id: s.law, until: S.days + 7 };
  if (s.cost && youRule()) S.coins -= Math.min(150, Math.floor(S.coins * s.cost)); // a neighbour ruler pays their own way
  if (s.happy) S.happy = Math.min(100, S.happy + s.happy);
  g.last = [c.id, ...g.last].slice(0, 4);
}
/** Your answer to this week's card (auto: three days unanswered, things stay as they are). */
function decide(side, auto = false) {
  const g = gov();
  const card = g.card;
  if (!card) return '';
  g.card = null;
  g.next = S.days + 7;
  if (card.id === 'ultimatum') {
    const f = factions().find((x) => x.id === card.f);
    if (!f) return '';
    if (side === 'a') {
      for (const x of factions()) g.mood[x.id] = Math.max(-5, (g.mood[x.id] ?? 0) + (x.id === f.id ? 4 : -1));
      S.coins -= Math.min(150, Math.floor(S.coins * 0.03));
      story(`🤝 ${f.name}의 요구를 들어줬어요. 다른 쪽은 조금 서운해해요.`);
      return `${f.name}의 요구를 들어줬어요`;
    }
    if (S.teller === 'calm' || !youRule() || auto) {
      // Left unanswered, things stay as they are (as the card says): they only grumble.
      g.mood[f.id] = Math.max(-5, (g.mood[f.id] ?? 0) - 1);
      story(`😤 ${josa(f.name, '이', '가')} 투덜대요.`);
      return `${josa(f.name, '이', '가')} 투덜대요`;
    }
    oust(elected() ? `${f.name}의 시위가 커져서 ${SEATS[S.era]} 자리에서 물러났어요` : `${f.name}의 반란으로 ${SEATS[S.era]} 자리를 잃었어요`);
    return '자리에서 물러났어요';
  }
  const c = CARDS.find((x) => x.id === card.id);
  if (!c) return '';
  applySide(c, side);
  story(`📜 ${auto ? '정하지 못한 채 일주일이 지나 ' : ''}${c[side].say}.`);
  saveSoon();
  return c[side].say;
}
/** Out of the seat: someone else takes it; you can rise again in a week. */
function oust(why) {
  const g = gov();
  g.ruler = npcLeader();
  g.ousted = S.days;
  g.run = false;
  g.card = null;
  for (const k of Object.keys(g.mood)) g.mood[k] = Math.round(g.mood[k] / 2);
  story(`🏳️ ${why}. 새 ${josa(SEATS[S.era], '은', '는')} ${josa(rulerName(), '이에요', '예요')}. 일주일 뒤에 다시 도전할 수 있어요.`);
}
/** Vote day: each family votes by how they feel about you and their faction; ties go to whoever holds the seat. */
function election() {
  const g = gov();
  const inc = youRule();
  const fam = families();
  const rival = npcLeader();
  g.vote = S.days + 14;
  if (!g.run && !inc) {
    const winner = fam.length ? fam[rand(0, fam.length - 1)] : rival;
    g.ruler = Math.random() < 0.6 && g.ruler != null && g.ruler !== -1 ? g.ruler : winner;
    story(`🗳️ ${SEATS[S.era]} 선거가 끝났어요. ${josa(rulerName(), '이', '가')} 뽑혔어요.`);
    return;
  }
  let yes = 0;
  for (const i of fam) {
    const p = 0.5 + ((S.friends[i]?.f ?? 0) - 5) * 0.06 + moodOf(factionOf(i).id) * 0.05 + (trait('charm') - 3) * 0.03 + (inc ? (approval() - 50) * 0.004 : 0);
    if (Math.random() < Math.max(0.05, Math.min(0.95, p))) yes++;
  }
  const share = fam.length ? yes / fam.length : 1;
  g.run = false;
  g.lastVote = { day: S.days, share: Math.round(share * 100) };
  if (share > 0.5 || (share === 0.5 && inc)) {
    g.ruler = -1;
    story(`🎉 ${SEATS[S.era]} 선거에서 ${Math.round(share * 100)}% 표를 얻어 ${inc ? '다시 ' : ''}당선됐어요!`);
    photoSoon(`${SEATS[S.era]} 당선`);
  } else {
    g.ruler = rival;
    g.card = null; // the new ruler decides from now on
    if (inc) g.ousted = S.days;
    story(`🗳️ ${SEATS[S.era]} 선거에서 ${Math.round(share * 100)}%로 떨어졌어요. ${josa(rulerName(), '이', '가')} 뽑혔어요.${inc ? ` 이제 전 ${josa(SEATS[S.era], '이에요', '예요')}.` : ''}`);
  }
}
function runForOffice() {
  const g = gov();
  if (!elected() || youRule() || g.run || !canRise() || influence() < RUN_AT) return;
  g.run = true;
  if (g.vote - S.days < 3) g.vote = S.days + 3; // a campaign takes three days
  story(`🗳️ ${SEATS[S.era]} 선거에 나가기로 했어요. ${g.vote - S.days}일 뒤가 투표예요.`);
  saveSoon();
  paintGov(true);
}
function wireGov() {
  document.getElementById('govTab')?.addEventListener('click', () => paintGov(true));
}
function donate() {
  if (S.coins < 50) return toast('코인이 모자라요');
  S.coins -= 50;
  gov().gift = (gov().gift ?? 0) + 50;
  toast('광장에 🪙50을 기부했어요. 영향력이 조금 올라요');
  saveSoon();
  paintUi();
}

// ── In town: a crown or a badge over the ruler, posters while you campaign ───────────────────────────────────────

const CROWN = ['y.y.y', 'yyyyy', 'yryry'];
const BADGE = ['.y.', 'yyy', '.r.'];
let campaignTicks = 0;
function govTick() {
  if (MODE !== 'life' || !S.gov?.run || ++campaignTicks % 160) return false;
  const p = people.find((e) => e.kind === 'villager' && !e.small && !e.hidden && !e.shout && onScreen(e.x) && (S.friends[e.home]?.f ?? 0) >= 5);
  if (p) p.shout = { text: `${nick || '이웃'} 뽑아요!`, t: 32 };
  return false;
}
function drawGov(g) {
  if (MODE !== 'life' || !S.gov) return;
  const gv = S.gov;
  const art = elected() ? BADGE : CROWN;
  const ruler = gv.ruler === -1 ? me : gv.ruler != null ? people.find((p) => p.who === `h${gv.ruler}a`) : null;
  if (ruler && !ruler.hidden && onScreen(ruler.x)) spr(g, art, { y: '#ffd23f', r: '#e0475f' }, Math.round(ruler.x) - (art === CROWN ? 2 : 1), Math.round(ruler.y) - 27);
  if (gv.run && gv.vote - S.days <= 3) {
    // Posters by the square.
    for (const dx of [-1, 5]) {
      const x = (PLAZA.x + dx) * T + 4;
      if (!onScreen(x)) continue;
      const y = PLAZA.y * T - 6;
      R(g, x + 3, y + 6, 1, 6, '#6b4428');
      box(g, x, y, 8, 7, '#ffffff', OL);
      R(g, x + 2, y + 2, 4, 1, '#3182f6');
      R(g, x + 2, y + 4, 3, 1, '#e0475f');
    }
  }
}

// ── The 정치 tab ──────────────────────────────────────────────────────────────────────────────────────────────────

function cardEffects(s) {
  const fs = factions();
  const bits = Object.entries(s.mood ?? {}).map(([k, v]) => [fs.find((f) => f.id === k), v]).filter(([f]) => f).map(([f, v]) => `${f.name} ${v > 0 ? '▲' : '▼'}`);
  if (s.law === 'tax') bits.push('세금 ▲');
  if (s.law === 'guard') bits.push('도둑 ▼');
  if (s.law === 'care') bits.push('역병 ▼');
  if (s.law === 'peace') bits.push('전쟁 ▼');
  if (s.law === 'wage') bits.push('파업 없음');
  if (s.cost) bits.push('코인 조금');
  if (s.happy) bits.push('행복 ▲');
  return bits.join(' · ');
}
let govSig = '';
function paintGov(force = false) {
  const list = document.getElementById('govList');
  if (!list || (list.closest('.tab-body')?.hidden && !force)) return;
  if (MODE !== 'life' || !S.gender) return void list.replaceChildren(el('li', 'empty', '캐릭터를 고르면 정치가 보여요'));
  const g = gov();
  const fs = factions();
  const sig = JSON.stringify([g.ruler, g.card, g.run, g.vote, g.law, S.days, S.era, influence(), fs.map((f) => moodOf(f.id)), S.coins >= 50]);
  if (sig === govSig && !force) return;
  govSig = sig;
  const out = [];
  const head = el('li', 'me-head');
  const seat = SEATS[S.era];
  head.append(
    el('b', '', youRule() ? `내가 ${josa(seat, '이에요', '예요')} · 지지율 ${approval()}%` : `${seat}: ${rulerName() || '아직 없어요'}`),
    el('span', '', elected() ? `${g.vote != null ? `선거까지 ${Math.max(0, g.vote - S.days)}일` : '곧 선거가 열려요'}${g.run ? ' · 출마했어요' : ''}${g.lastVote ? ` · 지난 득표 ${g.lastVote.share}%` : ''}` : `영향력 ${APPOINT_AT}이 되면 마을 사람들이 ${josa(seat, '으로', '로')} 모셔요`),
  );
  out.push(head);
  // Influence.
  const inf = influence();
  const li = el('li', 'stat');
  const top = el('div', 'stat__top');
  top.append(el('span', '', '내 영향력'), el('b', '', String(inf)));
  const bar = el('div', 'progress');
  const fill = el('i');
  fill.style.width = `${inf}%`;
  bar.append(fill);
  li.append(top, bar, el('div', 'stat__note', '이웃과 친할수록, 매력과 레벨이 높을수록, 광장에 기부할수록 올라요'));
  out.push(li);
  const acts = el('li', 'chips');
  const btn = (label, fn, why) => {
    const b = el('button', 'btn', label);
    b.disabled = !!why;
    if (why) b.title = why;
    b.addEventListener('click', fn);
    acts.append(b);
  };
  if (elected() && !youRule())
    btn(g.run ? '출마했어요' : '🗳️ 선거에 나가기', runForOffice, g.run ? '이미 나갔어요' : !canRise() ? '물러난 지 일주일이 지나야 해요' : inf < RUN_AT ? `영향력 ${RUN_AT}부터 나갈 수 있어요` : '');
  btn('🪙50 광장에 기부', donate, S.coins < 50 ? '코인이 모자라요' : '');
  out.push(acts);
  // Factions.
  out.push(el('li', 'group', '세력'));
  for (const f of fs) {
    const n = families().filter((i) => factionOf(i).id === f.id).length;
    const m = moodOf(f.id);
    const row = el('li', 'stat');
    const t2 = el('div', 'stat__top');
    t2.append(el('span', '', `${faceOf(m)} ${f.name} · ${n}가구`), el('b', '', m > 0 ? `+${m}` : String(m)));
    row.append(t2);
    out.push(row);
  }
  // This week's card.
  if (youRule()) {
    out.push(el('li', 'group', '이번 주 결정'));
    const card = g.card;
    if (!card) out.push(el('li', 'stat__note', `다음 결정은 ${Math.max(0, (g.next ?? S.days) - S.days)}일 뒤에 와요`));
    else {
      const ult = card.id === 'ultimatum';
      const f = ult && fs.find((x) => x.id === card.f);
      const c = ult
        ? { q: `${josa(f?.name ?? '세력', '이', '가')} 요구를 들어달래요`, a: { label: '들어줘요', mood: { [card.f]: 4 }, cost: 0.03 }, b: { label: '거절해요', mood: { [card.f]: -1 } } }
        : CARDS.find((x) => x.id === card.id);
      const box = el('li', 'gov-card');
      box.append(el('b', '', c.q));
      for (const side of ['a', 'b']) {
        const b = el('button', 'btn', `${c[side].label}`);
        b.append(el('span', 'gov-eff', cardEffects(c[side]) + (ult && side === 'b' && S.teller !== 'calm' ? ' · 자리를 잃을 수 있어요' : '')));
        b.addEventListener('click', () => {
          $('now').textContent = decide(side);
          paintUi();
          paintGov(true);
        });
        box.append(b);
      }
      box.append(el('div', 'stat__note', '3일 안에 고르지 않으면 지금대로 가요'));
      out.push(box);
    }
  }
  if (lawOn(g.law?.id)) out.push(el('li', 'stat__note', `지금 법: ${{ tax: '세금 인상', guard: '경비 강화', care: '병원 지원', peace: '동맹', wage: '임금 인상' }[g.law.id]} · ${g.law.until - S.days}일 남았어요`));
  list.replaceChildren(...out);
}
