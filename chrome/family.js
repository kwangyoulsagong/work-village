// 작은 마을 — the family: what your spouse and children are good at, and things you do together. At home (the 같이
// 하기 button: dinner, a story, a board game, crafts, a pillow fight, songs, a film, a family photo) and out (a picnic,
// kites, stargazing, with everyone walking along). Doing things together trains a child's abilities (until 14) and
// their bond with you. Small moments ride along: height marks on the wall, the children's drawings, first words,
// birthdays and anniversaries with a cake, a child asking for something (a bubble), a family memory log, your
// spouse's own corner of the room, and grown children who move out and come home for the festivals.
// Life mode only; nothing here writes a friend's town. Loaded before game.js: game.js names are used only inside
// functions.
'use strict';

const KID_TOPS = ['#f2a65a', '#5ab4e0', '#e05a9a']; // the same shirts spawnFamily() gives them
const ORDINAL = ['첫째', '둘째', '셋째'];
const kidName = (i) => personName(S.mapSeed ?? 0, `k${i}`, i % 2 ? 'm' : 'f').name;
const kidStage = (a) => (a < 3 ? '아기' : a < 7 ? '꼬마' : a < 14 ? '어린이' : '어른');
const FAMILY_PER_DAY = 3;
const TRAIN_STEP = 3; // three times together on the same ability: one more star (children only)

/** The family's bit of the save (old saves don't have it yet). */
function famState() {
  S.fam ??= {};
  const f = S.fam;
  f.bond ??= [];
  f.train ??= [];
  f.draws ??= [];
  f.mem ??= [];
  f.done ??= [];
  return f;
}
const hasFamily = () => S.spouse != null || S.kids > 0;
const kidsAt = (min, max = 99) => S.kidAges.map((a, i) => ({ a, i })).filter((k) => k.a >= min && k.a < max);
const MOVE_OUT_AGE = 20;
const movedOut = (i) => !!S.fam?.moved?.includes(i);
/** Home for a festival: a grown child who moved out is back for the day. */
const homeToday = (i) => !movedOut(i) || S.fam?.visit === today();
/** Where a child starts the day: at home, or (moved out) at their own place across town. */
function kidStart(i) {
  if (!movedOut(i) || homeToday(i)) return HOME_DOOR;
  const x = HOME.x + (i % 2 ? 1 : -1) * (24 + i * 9);
  return nearestWalkable(Math.max(1, Math.min(COLS - 2, x)), ROAD_Y);
}

// ── Things to do together ─────────────────────────────────────────────────────────────────────────────────────────

/** kids: needs a child of 3 or more. train: the ability it grows in children. out: done outside, everyone along. */
const FAMILY_ACTS = [
  { id: 'dinner', name: () => '다 같이 저녁 먹기', ask: '같이 밥 먹자!', note: '오늘 있었던 일을 서로 얘기했어요' },
  { id: 'story', kids: true, train: 'charm', name: () => (S.era === 0 ? '옛날이야기 들려주기' : '책 읽어 주기'), ask: '이야기 해 줘!', note: '아이들이 눈을 반짝이며 들었어요' },
  { id: 'game', train: 'trade', name: () => ['공기놀이', '윷놀이', '윷놀이', '윷놀이', '보드게임', '홀로 보드게임'][S.era], ask: '한 판 하자!', note: '한 판만 더 하재요' },
  { id: 'craft', kids: true, train: 'green', name: () => ['흙 인형 빚기', '짚풀 공예', '짚풀 공예', '종이접기', '블록 쌓기', '3D 펜 만들기'][S.era], ask: '같이 만들자!', note: '아이가 그림도 그려서 벽에 붙였어요' },
  { id: 'pillow', kids: true, train: 'health', name: () => '베개 싸움', ask: '베개 싸움!', note: '깃털이 온 방에 날렸어요' },
  { id: 'sing', train: 'charm', name: () => '다 같이 노래하기', ask: '노래 부르자!', note: '집 안이 노래로 가득했어요' },
  { id: 'movie', era: 4, name: () => (S.era === 5 ? '홀로그램 영화 보기' : '같이 영화 보기'), ask: '영화 보자!', note: '다 같이 웃다가 울었어요' },
  { id: 'photo', name: () => (S.era >= 3 ? '가족사진 찍기' : '가족 그림 그리기'), note: '한 장 남겼어요' },
  { id: 'picnic', out: true, name: () => '소풍 가기', ask: '소풍 가자!', note: '돗자리 펴고 도시락을 먹었어요' },
  { id: 'kite', out: true, era: 1, kids: true, train: 'health', name: () => '연날리기', ask: '연 날리자!', note: '연이 하늘 높이 올라갔어요' },
  { id: 'stars', out: true, night: true, train: 'luck', name: () => '별 보기', ask: '별 보러 가자!', note: '별똥별을 봤어요. 소원도 빌었어요' },
];
const famAct = (id) => FAMILY_ACTS.find((a) => a.id === id) ?? null;
const lateNow = () => hour() >= 19 || hour() < 5;
/** Why an activity can't happen now, or '' when it can. */
function famWhy(a) {
  if (!hasFamily()) return '가족이 생기면 할 수 있어요';
  if (a.era && S.era < a.era) return `${ERAS[a.era].name}부터 할 수 있어요`;
  if (a.kids && !kidsAt(3).length) return '아이가 조금 더 크면 할 수 있어요';
  if (a.night && !lateNow()) return '밤에만 할 수 있어요';
  return '';
}
const famLeft = () => {
  const f = famState();
  return f.day === today() ? Math.max(0, FAMILY_PER_DAY - (f.n ?? 0)) : FAMILY_PER_DAY;
};

let wantFamily = null; // an activity you picked: you head home (or out) for it first
let famOut = null; //     { id, x, y } while the family is out together

function requestFamily(id) {
  if (MODE !== 'life' || !S.gender || S.over) return;
  const a = famAct(id);
  if (!a) return;
  const why = famWhy(a);
  if (why) return toast(why);
  if (S.sickDays > 0) return toast('몸이 나으면 같이 해요');
  if (!famLeft()) return toast('오늘은 충분히 같이 했어요. 내일 또 해요');
  if (homeStay && !a.out) return void (startFamilyHome(a), paintHome());
  wantFamily = id;
  wantHobby = null;
  wantCall = null;
  task = null;
  me.path = [];
  me.act = null;
  rest = 0;
  if (a.out) {
    houseView = false;
    if (homeStay) homeStay.t = 1; // out of the house first
  } else {
    houseView = true;
    lifeCam = null;
    paintCamMe();
  }
  paintHome();
}
/** Asked by nextTask(): on the way to what you picked. */
function familyTask() {
  if (!wantFamily || MODE !== 'life') return null;
  const a = famAct(wantFamily);
  if (!a || famWhy(a)) return (wantFamily = null);
  if (!a.out)
    return { to: HOME_DOOR, tool: 'heart', what: `가족과 ${a.name()}`, dur: 6, dir: 'u', act: () => {
      wantFamily = null;
      return startFamilyHome(a);
    } };
  const spot =
    a.id === 'kite' ? [PLAZA.x + rand(0, 3), ROAD_Y + 1]
    : a.id === 'stars' ? [LAKE.x + rand(1, LAKE.w - 2), LAKE.y - 1]
    : [LAKE.x + rand(1, LAKE.w - 2), LAKE.y - 1];
  return { to: spot, tool: 'heart', what: `가족과 ${a.name()}`, dur: 96, dir: a.id === 'kite' ? 'u' : 'd', arrive: () => {
    famOut = { id: a.id, x: me.x, y: me.y };
    gatherFamily(64);
  }, act: () => {
    wantFamily = null;
    famOut = null;
    return familyDone(a.id);
  } };
}
/** Everyone comes over and stays a while around you. */
function gatherFamily(dur) {
  const [mx, my] = tileOf(me);
  people.filter((p) => p.kind === 'spouse' || (p.kind === 'kid' && homeToday(+p.who.slice(1)))).forEach((p, i) => {
    p.act = null;
    p.busy = true;
    p.hidden = false;
    p.goal = { what: 'play', to: [mx, my], tool: p.kind === 'kid' && !p.baby ? 'dance' : 'heart', dur, done: () => {} };
    route(p, nearestWalkable(mx + (i % 2 ? 1 : -1) * (1 + (i >> 1)), my));
  });
}
/** At home: everyone in the room for a while (homeStay with fam set; homeTick ends it with familyDone()). */
function startFamilyHome(a) {
  homeStay = { hobby: 'fam', fam: a.id, t: 96, n: 96 };
  me.hidden = true;
  return `가족과 ${a.name()} 시간이에요`;
}

/** The end of a time together: everyone a little happier, closer, and a child a little better at something. */
function familyDone(id) {
  const a = famAct(id);
  if (!a || MODE !== 'life') return '';
  const f = famState();
  if (f.day !== today()) [f.day, f.n] = [today(), 0];
  f.n++;
  const wanted = f.want && f.want.id === id;
  S.happy = Math.min(100, S.happy + 5 + (wanted ? 3 : 0));
  const sp = S.spouse != null ? friendOf(S.spouse) : null;
  if (sp) sp.f = Math.min(MAX_FRIEND, sp.f + 0.5);
  const grew = [];
  S.kidAges.forEach((age, i) => {
    if (!homeToday(i)) return;
    f.bond[i] = Math.min(100, (f.bond[i] ?? 30) + (wanted && f.want.k === i ? 15 : 8));
    if (!a.train || age < 3 || age >= 14 || !S.kidTraits[i]) return;
    f.train[i] ??= {};
    f.train[i][a.train] = (f.train[i][a.train] ?? 0) + 1;
    if (f.train[i][a.train] < TRAIN_STEP) return;
    f.train[i][a.train] = 0;
    if (S.kidTraits[i][a.train] >= 5) return;
    S.kidTraits[i][a.train]++;
    grew.push(`${ORDINAL[i]} ${josa(traitName(a.train), '이', '가')} ★${S.kidTraits[i][a.train]}`);
  });
  if (wanted) {
    remember(`${ORDINAL[f.want.k]} ${kidName(f.want.k)}의 소원대로 ${josa(a.name(), '을', '를')} 했어요`);
    f.want = null;
  }
  if (!f.done.includes(id)) {
    f.done.push(id);
    remember(`처음으로 가족과 ${josa(a.name(), '을', '를')} 했어요`);
  }
  if (id === 'craft' && kidsAt(3, 14).length) {
    const k = kidsAt(3, 14)[rand(0, kidsAt(3, 14).length - 1)];
    f.draws.push({ k: k.i, seed: (Math.random() * 1e6) | 0, day: S.days });
    if (f.draws.length > 3) f.draws.shift();
  }
  if (id === 'photo') photoSoon(S.era >= 3 ? '가족사진' : '가족 그림');
  for (const g of grew) story(`✨ 같이 놀면서 ${g}로 늘었어요.`);
  if (!grew.length && Math.random() < 0.35) story(`👪 가족과 ${a.name()}: ${a.note}.`);
  saveSoon();
  paintUi();
  return `${a.note}${grew.length ? ` · ${grew.join(', ')}` : ''}`;
}
function remember(text) {
  const f = famState();
  f.mem.unshift({ day: S.days, text });
  f.mem.length = Math.min(f.mem.length, 60);
}

// ── Each day: birthdays, anniversaries, first words, a child's wish ──────────────────────────────────────────────

function familyDay() {
  if (MODE !== 'life') return;
  const f = famState();
  if (S.spouse == null) f.wed = null;
  else if (f.wed == null) f.wed = S.days;
  const sp = S.spouse != null ? FAMILIES[S.spouse] : null;
  if (sp && f.wed != null && S.days > f.wed && (S.days - f.wed) % 30 === 0) {
    const n = S.days - f.wed;
    f.cake = S.days;
    const fr = friendOf(S.spouse);
    if (fr) fr.f = Math.min(MAX_FRIEND, fr.f + 1);
    story(`💍 ${josa(sp.single, '과', '와')} 결혼한 지 ${n}일이에요. 오늘은 케이크를 먹어요.`);
    remember(`결혼 ${n}일을 축하했어요`);
  }
  S.kidAges.forEach((age, i) => {
    f.bond[i] = Math.max(0, (f.bond[i] ?? 30) - 4); // a day apart: a little further away
    const who = `${ORDINAL[i]} ${kidName(i)}`;
    if (age === 2) {
      const mine = S.gender === 'f' ? '엄마' : '아빠';
      const words = [mine, mine, sp ? (sp.gender === 'f' ? '엄마' : '아빠') : mine, S.dog ? '멍멍' : '맘마', era().crop];
      const w = words[rand(0, words.length - 1)];
      story(`👶 ${josa(who, '이', '가')} 처음으로 "${w}"라고 말했어요!`);
      remember(`${josa(who, '이', '가')} 처음 한 말: "${w}"`);
    }
    if (age > 0 && age < 14 && age % 5 === 0) {
      f.cake = S.days;
      story(`🎂 ${josa(who, '이', '가')} 태어난 지 ${age}일 됐어요. 다 같이 케이크를 먹어요.`);
      remember(`${who} ${age}일 잔치`);
    }
    if (age >= MOVE_OUT_AGE && !movedOut(i) && Math.random() < 0.3) {
      f.moved ??= [];
      f.moved.push(i);
      story(`🏡 ${josa(who, '이', '가')} 독립했어요. 마을 건너편에서 ${josa(bestJob(S.kidTraits[i] ?? rollTraits(), i).name, '으로', '로')} 일하며 살아요. 축제 때 집에 온대요.`);
      remember(`${josa(who, '이', '가')} 독립했어요`);
      if (typeof spawnFamily === 'function' && typeof people !== 'undefined' && people.length) spawnFamily();
    } else if (movedOut(i) && (f.bond[i] ?? 0) >= 50 && Math.random() < 0.1)
      story(`💌 독립한 ${josa(who, '이', '가')} 안부 편지를 보내왔어요.`);
    if (age >= 3 && age < 14 && (f.bond[i] ?? 0) >= 70 && Math.random() < 0.15)
      story(`🌼 ${josa(who, '이', '가')} 꽃을 꺾어 와서 ${S.gender === 'f' ? '엄마' : '아빠'}한테 줬어요.`);
  });
  // A wish: one child asks for something; it waits two days.
  if (f.want && S.days - f.want.day > 2) f.want = null;
  const asking = kidsAt(3, 14);
  if (!f.want && asking.length && Math.random() < 0.5) {
    const k = asking[rand(0, asking.length - 1)];
    const can = FAMILY_ACTS.filter((a) => a.ask && !a.night && !(a.era && S.era < a.era));
    const a = can[rand(0, can.length - 1)];
    f.want = { k: k.i, id: a.id, day: S.days };
  }
}

/** Each tick: a child with a wish says it now and then; your spouse greets you once a day. */
let famTicks = 0;
function familyTick() {
  if (famOut && (MODE !== 'life' || !task?.what?.startsWith('가족과'))) famOut = null; // the outing was called off
  if (MODE !== 'life' || !hasFamily() || ++famTicks % 120) return false;
  const f = famState();
  if (festivalToday() && f.moved?.length && f.visit !== today()) {
    // A festival: the children who moved out come home for the day.
    f.visit = today();
    f.cake = S.days;
    S.happy = Math.min(100, S.happy + 6);
    for (const i of f.moved) f.bond[i] = Math.min(100, (f.bond[i] ?? 30) + 10);
    const names = f.moved.map((i) => ORDINAL[i]).join('·');
    story(`🎉 축제라 독립한 ${josa(names, '이', '가')} 집에 왔어요. 오늘은 다 같이 저녁을 먹어요.`);
    remember(`축제 날 ${josa(names, '이', '가')} 집에 왔어요`);
    for (const p of people) if (p.kind === 'kid' && movedOut(+p.who.slice(1))) route(p, nearestWalkable(HOME_DOOR[0], HOME_DOOR[1]));
    saveSoon();
  }
  if (f.want) {
    const kid = people.find((p) => p.kind === 'kid' && p.who === `k${f.want.k}`);
    if (kid && !kid.hidden && !kid.shout && onScreen(kid.x)) kid.shout = { text: famAct(f.want.id)?.ask ?? '놀아 줘!', t: 40 };
  }
  if (S.spouse != null && f.said !== today()) {
    const sp = people.find((p) => p.kind === 'spouse');
    if (sp && !sp.hidden && !sp.shout && onScreen(sp.x)) {
      f.said = today();
      const lines = [
        '오늘도 힘내요!', '밥은 먹고 해요', '같이 있어서 좋아요', '아이들이 보고 싶대요',
        raining() ? '비 와서 밭은 쉬어요' : weather === 'snow' ? '눈사람 만들까요?' : '날씨 좋다!',
        S.happy < 40 ? '요즘 좀 외로워요…' : '요즘 행복해요',
      ];
      sp.shout = { text: lines[rand(0, lines.length - 1)], t: 48 };
    }
  }
  return false;
}

// ── The 우리 집 card: the 같이 하기 row ───────────────────────────────────────────────────────────────────────────

function paintFamilyRow() {
  const row = document.getElementById('famRow');
  if (!row) return;
  row.hidden = !hasFamily();
  const note = document.getElementById('famNote');
  note.hidden = row.hidden;
  if (row.hidden) return;
  const f = famState();
  const pick = document.getElementById('famPick');
  const sig = FAMILY_ACTS.map((a) => a.id + a.name() + (famWhy(a) ? 'x' : '') + (f.want?.id === a.id ? 'w' : '')).join();
  if (pick.dataset.sig !== sig) {
    pick.dataset.sig = sig;
    const keep = pick.value;
    pick.replaceChildren(
      ...FAMILY_ACTS.map((a) => {
        const why = famWhy(a);
        const o = Object.assign(document.createElement('option'), { value: a.id, textContent: `${f.want?.id === a.id ? '⭐ ' : ''}${a.out ? '🌳 ' : ''}${a.name()}${why ? ` · ${why}` : ''}` });
        o.disabled = !!why;
        return o;
      }),
    );
    if (keep && [...pick.options].some((o) => o.value === keep && !o.disabled)) pick.value = keep;
    else if (f.want) pick.value = f.want.id;
    else pick.value = [...pick.options].find((o) => !o.disabled)?.value ?? '';
  }
  const left = famLeft();
  document.getElementById('famGo').disabled = !left || !pick.value;
  const wish = f.want ? `${ORDINAL[f.want.k]}가 ${josa(famAct(f.want.id).name(), '을', '를')} 하고 싶대요 ⭐ · ` : '';
  note.textContent = homeStay?.fam
    ? `가족과 ${famAct(homeStay.fam).name()} 하는 중이에요`
    : famOut || (wantFamily && famAct(wantFamily)?.out)
      ? '가족이랑 나가는 중이에요'
      : `${wish}${left ? `오늘 ${left}번 더 같이 할 수 있어요` : '오늘은 충분히 같이 했어요'}`;
}
function wireFamily() {
  document.getElementById('famGo')?.addEventListener('click', () => requestFamily(document.getElementById('famPick').value));
  document.getElementById('famPick')?.addEventListener('change', () => paintFamilyRow());
}

// ── Inside: the family together, the height marks, the children's drawings, a cake ──────────────────────────────

/** Everyone at home, for drawing: you, your spouse, the children (babies as bundles). */
function famPeople() {
  const out = [{ kind: 'me', gender: S.gender, look: OUTFIT[S.era] }];
  if (S.spouse != null) out.push({ kind: 'spouse', gender: FAMILIES[S.spouse].gender, look: FAMILIES[S.spouse].look });
  S.kidAges.forEach((a, i) =>
    homeToday(i) && out.push({ kind: 'kid', gender: i % 2 ? 'm' : 'f', small: a < 7, baby: a < 3, look: { hair: '#4a2f1f', top: KID_TOPS[i], legs: '#4b4560' } }),
  );
  return out;
}
function famPut(g, p, x, y, dir, i, hop = 0) {
  person(g, { kind: p.kind, x, y: y + hop, dir, path: [], frame: 0, seed: 7 + i, gender: p.gender, small: p.small, baby: p.baby }, p.look);
}
const NOTE_PX = ['.oo', '.o.', 'oo.'];
function drawFamilyAct(g, t, e) {
  const id = homeStay?.fam;
  if (!id) return;
  const all = famPeople();
  const [adults, kids] = [all.filter((p) => p.kind !== 'kid'), all.filter((p) => p.kind === 'kid')];
  const done = 1 - homeStay.t / homeStay.n;
  if (id === 'dinner') {
    shifted(g, pieceKey('table'), () => {
      famPut(g, adults[0], 49, 66, 'r', 0);
      if (adults[1]) famPut(g, adults[1], 85, 66, 'l', 1);
      kids.forEach((k, i) => famPut(g, k, 56 + i * 11, 76, 'u', 2 + i));
      for (let i = 0; i < 3; i++) disc(g, 61 + i * 6, 50, 2, ['#f4efe6', '#e8c050', '#d8503a'][i]);
      for (let i = 0; i < 3; i++) R(g, 61 + i * 6, 46 - ((t + i * 5) % 8), 1, 2, 'rgba(255,255,255,0.8)');
    });
    return;
  }
  shifted(g, pieceKey('rug'), () => {
    const row = (y, dir, x0 = 60 - (all.length - 1) * 6) => all.forEach((p, i) => famPut(g, p, x0 + i * 12, y, dir, i));
    switch (id) {
      case 'story':
        famPut(g, adults[0], 38, 84, 'r', 0);
        box(g, 41, 74, 6, 5, '#d8503a');
        R(g, 42, 75, 4, 3, '#f4efe6');
        if (adults[1]) famPut(g, adults[1], 88, 82, 'l', 1);
        kids.forEach((k, i) => famPut(g, k, 52 + i * 11, 86, 'l', 2 + i));
        break;
      case 'game':
      case 'craft': {
        famPut(g, adults[0], 40, 84, 'r', 0);
        if (adults[1]) famPut(g, adults[1], 82, 84, 'l', 1);
        kids.forEach((k, i) => famPut(g, k, 50 + i * 11, 93, 'u', 2 + i));
        if (id === 'game') {
          box(g, 55, 78, 12, 7, S.era >= 4 ? '#3a4a66' : '#e8d4a8', OL);
          R(g, 61, 79, 1, 5, OL);
          for (let i = 0; i < 4; i++) R(g, 57 + i * 2, 72 - (t % 12 < 6 ? (i % 2) * 3 : 3 - (i % 2) * 3), 1, 4, S.era >= 1 && S.era <= 3 ? '#c89a5a' : '#ffffff');
        } else {
          const n = 1 + Math.floor(done * 5);
          for (let i = 0; i < n; i++) R(g, 58 + (i % 2), 84 - i * 3, 6, 3, ['#d8503a', '#3a7ad0', '#e8c050', '#5aa04a', '#8a6cc9'][i]);
        }
        break;
      }
      case 'pillow':
        all.forEach((p, i) => famPut(g, p, 38 + i * 14 + Math.round(Math.sin(t / 4 + i * 2) * 5), 84, i % 2 ? 'l' : 'r', i, t % 6 < 3 ? -2 : 0));
        for (let i = 0; i < 8; i++) R(g, 30 + ((i * 17 + t) % 64), 60 + ((i * 11 + t * 2) % 28), 2, 1, '#ffffff');
        break;
      case 'sing':
        all.forEach((p, i) => famPut(g, p, 60 - (all.length - 1) * 6 + i * 12, 84, 'd', i, (t + i * 3) % 8 < 4 ? -1 : 0));
        for (let i = 0; i < 3; i++) spr(g, NOTE_PX, { o: '#4a3a60' }, 40 + i * 18 + ((t + i * 5) % 6), 62 - ((t + i * 7) % 10));
        break;
      case 'movie':
        all.forEach((p, i) => famPut(g, p, 62 + i * 11, 88, 'u', i));
        break;
      case 'photo': {
        row(84, 'd');
        if (homeStay.t < 10) {
          g.fillStyle = `rgba(255, 255, 255, ${(homeStay.t / 10).toFixed(2)})`;
          g.fillRect(0, 0, 120, 96);
        }
        break;
      }
    }
  });
  // The film on the screen: the TV (modern) or the hologram (future) flickers.
  if (id === 'movie') shifted(g, 'hearth', () => R(g, 92, 34, 22, 14, ['#5ad7e8', '#ff8ac0', '#ffd23f', '#9a7aff'][Math.floor(t / 6) % 4]));
}
/** On the wall, between the bed and the window: each child's height so far, and up to three of their drawings. */
function drawFamilyWall(g) {
  if (!S.kids) return;
  R(g, 39, 28, 1, 30, 'rgba(90, 60, 40, 0.35)');
  S.kidAges.forEach((a, i) => {
    for (let d = 0; d <= Math.min(a, 21); d += 3) R(g, 37, 57 - Math.round(6 + d * 1.2), 5, 1, 'rgba(90, 60, 40, 0.3)');
    R(g, 36, 57 - Math.round(6 + Math.min(a, 21) * 1.2), 7, 1, KID_TOPS[i]);
  });
  (S.fam?.draws ?? []).forEach((d, i) => {
    const x = 8 + i * 10;
    const y = 30;
    R(g, x, y, 8, 7, '#ffffff');
    R(g, x + 3, y - 1, 2, 1, '#d8503a'); // a pin
    const r = rng(d.seed);
    const ink = ['#d8503a', '#3a7ad0', '#5aa04a', '#e8a030', '#8a6cc9'];
    if (r() < 0.4) disc(g, x + 2, y + 2, 1, '#ffd23f');
    const n = 1 + Math.floor(r() * 3);
    for (let p = 0; p < n; p++) {
      const c = ink[Math.floor(r() * ink.length)];
      const px = x + 2 + p * 2;
      R(g, px, y + 3, 1, 1, c);
      R(g, px, y + 4, 1, 2, c);
    }
    R(g, x, y + 6, 8, 1, '#7ac04a');
  });
}
/** A birthday or anniversary: a cake on the table all day. */
function drawFamilyTable(g) {
  if (S.fam?.cake !== S.days) return;
  shifted(g, pieceKey('table'), () => {
    box(g, 63, 44, 8, 5, '#ffe8f0', '#d87a9a');
    R(g, 63, 46, 8, 1, '#ff8ac0');
    R(g, 67, 41, 1, 3, '#f4efe6');
    R(g, 67, 40, 1, 1, clockTick() % 4 < 2 ? '#ffd23f' : '#f08a2e');
  });
}

// ── Your spouse's corner: something of theirs, by what they're best at and the era ───────────────────────────────

const CORNER = {
  health: ['무거운 돌', '역기', '역기', '아령 선반', '러닝머신', '중력 운동기'],
  green: ['약초 바구니', '화분 선반', '화분 선반', '화분 선반', '화분 선반', '수경 재배기'],
  charm: ['조개 목걸이', '청동 거울', '화장대', '화장대', '화장대', '홀로 거울'],
  trade: ['셈 돌', '주판 책상', '주판 책상', '장부 책상', '노트북 책상', '홀로 장부'],
  luck: ['네잎 풀', '복주머니', '복주머니', '네잎클로버 액자', '복고양이', '행운 수정'],
};
function spouseBest() {
  if (S.spouse == null) return null;
  const t = villagerTraits(S.spouse);
  return TRAITS.reduce((m, x) => (t[x[0]] > t[m[0]] ? x : m))[0];
}
const cornerName = () => (spouseBest() ? CORNER[spouseBest()][Math.max(0, Math.min(5, S.era))] : '');
/** On the floor under the bed's end (left): drawn before the furniture, so anything you put there covers it. */
function drawSpouseCorner(g, e) {
  const k = spouseBest();
  if (k) drawCorner(g, e, k, 8, 66);
}
/** Something of someone's, by their best ability and the era (a neighbour's room uses it too: guest.js). */
function drawCorner(g, e, k, x, y) {
  const t = clockTick();
  switch (k) {
    case 'health':
      if (e === 0) return void box(g, x + 2, y + 6, 9, 6, '#8a8e96', OL);
      if (e === 4) return void (box(g, x, y + 4, 16, 6, '#2a2a33', OL), R(g, x + 12, y - 4, 2, 8, '#5a5e66'));
      R(g, x, y + 7, 16, 1, '#5a5e66');
      box(g, x - 1, y + 4, 3, 7, '#2a2a33');
      box(g, x + 14, y + 4, 3, 7, '#2a2a33');
      if (e === 5) R(g, x, y + 12, 16, 1, 'rgba(90, 215, 232, 0.6)');
      return;
    case 'green':
      box(g, x, y + 6, 16, 2, ROOM[e].trim);
      for (let i = 0; i < 3; i++) {
        box(g, x + 1 + i * 5, y + 8, 4, 4, e === 5 ? '#d7e3ee' : '#b8643a', OL);
        R(g, x + 2 + i * 5, y + 3 + (i % 2), 2, 5, '#5aa04a');
        R(g, x + 1 + i * 5, y + 4 + (i % 2), 1, 2, '#7ac04a');
      }
      return;
    case 'charm':
      if (e === 0) return void spr(g, ['o...o', '.o.o.', '..w..'], { o: '#c8a050', w: '#f4efe6' }, x + 4, y + 6);
      box(g, x + 3, y, 10, 9, e === 5 ? '#5ad7e8' : '#c8a050', OL);
      R(g, x + 5, y + 2, 6, 5, t % 40 < 4 ? '#ffffff' : '#cfe8f5');
      box(g, x + 1, y + 9, 14, 4, ROOM[e].trim);
      return;
    case 'trade':
      box(g, x, y + 6, 16, 3, ROOM[e].trim, OL);
      R(g, x + 2, y + 9, 1, 4, ROOM[e].trim);
      R(g, x + 13, y + 9, 1, 4, ROOM[e].trim);
      if (e >= 4) box(g, x + 4, y + 1, 8, 5, '#2a2a33', OL), R(g, x + 5, y + 2, 6, 3, e === 5 ? '#9a7aff' : '#5ab4e0');
      else for (let i = 0; i < 4; i++) R(g, x + 3 + i * 3, y + 4, 2, 2, ['#8a5a3a', '#c89a5a'][i % 2]);
      return;
    case 'luck':
      if (e === 4) {
        box(g, x + 4, y + 4, 8, 8, '#ffffff', OL);
        R(g, x + 6, y + 6, 1, 1, OL);
        R(g, x + 9, y + 6, 1, 1, OL);
        R(g, x + 12, y + 2 + (Math.floor(t / 8) % 2), 2, 3, '#ffffff'); // the waving paw
        return;
      }
      if (e === 5) return void (disc(g, x + 8, y + 8, 3, t % 16 < 8 ? '#9a7aff' : '#5ad7e8'), R(g, x + 5, y + 11, 6, 2, '#3a4a66'));
      box(g, x + 4, y + 5, 8, 7, e === 0 ? '#5aa04a' : '#d8503a', OL);
      R(g, x + 6, y + 7, 4, 1, '#ffd23f');
      return;
  }
}

// ── Out together: a picnic blanket on the grass, a kite in the sky ───────────────────────────────────────────────

function drawFamilyUnder(g) {
  if (!famOut || famOut.id !== 'picnic' || MODE !== 'life') return;
  const x = Math.round(famOut.x) - 10;
  const y = Math.round(famOut.y) - 2;
  for (let i = 0; i < 5; i++) R(g, x + i * 4, y, 4, 5, i % 2 ? '#ffffff' : '#e0475f');
  box(g, x + 16, y - 3, 5, 4, '#c89a5a', OL);
}
function drawFamilyOver(g) {
  if (!famOut || famOut.id !== 'kite' || MODE !== 'life') return;
  const t = clockTick();
  const kx = Math.round(famOut.x) + 14 + Math.round(Math.sin(t / 10) * 3);
  const ky = Math.round(famOut.y) - 46 + Math.round(Math.cos(t / 8) * 2);
  for (let i = 1; i < 8; i++) R(g, Math.round(famOut.x + ((kx - famOut.x) * i) / 8), Math.round(famOut.y - 10 + ((ky - famOut.y + 10) * i) / 8), 1, 1, '#ffffff');
  spr(g, ['..r..', '.rry.', 'rryyy', '.ryy.', '..y..'], { r: '#e0475f', y: '#ffd23f' }, kx - 2, ky - 2);
  R(g, kx, ky + 3, 1, 3, '#3a7ad0');
}

// ── The 나 tab: your family's numbers and memories ───────────────────────────────────────────────────────────────

function starsOf(traits) {
  const box = el('div', 'fam-traits');
  for (const [k, name] of TRAITS) {
    const v = traits?.[k] ?? 0;
    const c = el('span', '', name);
    c.append(el('b', 'stars', '★'.repeat(v) + '☆'.repeat(5 - v)));
    box.append(c);
  }
  return box;
}
function familyRows() {
  if (!hasFamily()) return [];
  const f = famState();
  const out = [el('li', 'group', '가족')];
  if (S.spouse != null) {
    const fam = FAMILIES[S.spouse];
    const t = villagerTraits(S.spouse);
    const best = TRAITS.reduce((m, x) => (t[x[0]] > t[m[0]] ? x : m));
    const li = el('li', 'fam');
    const top = el('div', 'stat__top');
    top.append(el('span', '', `${fam.single} · 배우자`), el('b', '', `호감 ${Math.round(friendOf(S.spouse)?.f ?? 0)}/${MAX_FRIEND}`));
    li.append(top, starsOf(t), el('div', 'stat__note', `${josa(best[1], '이', '가')} 뛰어나요 · 집에 ${cornerName()}${f.wed != null ? ` · 결혼 ${Math.max(0, S.days - f.wed)}일째` : ''}`));
    out.push(li);
  }
  S.kidAges.forEach((a, i) => {
    const t = S.kidTraits[i];
    const li = el('li', 'fam');
    const top = el('div', 'stat__top');
    top.append(el('span', '', `${ORDINAL[i]} ${kidName(i)} · ${kidStage(a)} ${a}일`), el('b', '', `유대 ${Math.round(f.bond[i] ?? 30)}`));
    const bar = el('div', 'progress');
    const fill = el('i');
    fill.style.width = `${Math.round(f.bond[i] ?? 30)}%`;
    bar.append(fill);
    li.append(top, bar);
    if (t) li.append(starsOf(t));
    const notes = [];
    if (t && S.traits) {
      const like = TRAITS.filter(([k]) => t[k] === S.traits[k] && t[k] >= 3);
      if (like.length) notes.push(`${S.gender === 'f' ? '엄마' : '아빠'}를 닮아 ${josa(like[0][1], '이', '가')} 좋아요`);
    }
    if (t && a >= 7) notes.push(`${a >= 14 ? '직업' : '꿈'}: ${bestJob(t, i).name}`);
    if (movedOut(i)) notes.push('독립했어요 · 축제 때 와요');
    if (a < 14) notes.push('같이 놀면 능력이 자라요');
    li.append(el('div', 'stat__note', notes.join(' · ')));
    out.push(li);
  });
  if (f.mem.length) {
    out.push(el('li', 'group', '가족 추억'));
    for (const m of f.mem.slice(0, 8)) out.push(el('li', 'stat__note', `${m.day}일 · ${m.text}`));
  }
  return out;
}
/** One short line for the person card (spouse and children). */
function familyStatLine(e) {
  const t = e.kind === 'spouse' ? villagerTraits(S.spouse) : e.kind === 'kid' ? S.kidTraits[+String(e.who).slice(1)] : null;
  if (!t) return '';
  return TRAITS.map(([k, n]) => `${n} ${t[k]}`).join(' · ');
}
/** Talking with your child brings you a little closer (three times a day). */
function kidTalked(e) {
  if (MODE !== 'life' || e.kind !== 'kid') return '';
  const i = +String(e.who).slice(1);
  const f = famState();
  if (f.talkDay !== today()) [f.talkDay, f.talks] = [today(), 0];
  if (f.talks >= 3) return '';
  f.talks++;
  f.bond[i] = Math.min(100, (f.bond[i] ?? 30) + 3);
  saveSoon();
  return ' (유대 +3)';
}

/** Inside, any other time: the baby in a cradle by the rug, the little ones playing on it, a grown child at home. */
function drawFamilyHome(g, t) {
  if (homeStay?.fam || !S.kids) return;
  let small = 0;
  shifted(g, pieceKey('rug'), () =>
    S.kidAges.forEach((a, i) => {
      if (!homeToday(i)) return;
      const p = { kind: 'kid', gender: i % 2 ? 'm' : 'f', small: a < 7, baby: a < 3, look: { hair: '#4a2f1f', top: KID_TOPS[i], legs: '#4b4560' } };
      if (p.baby) {
        drawCradle(g, 50, 66, t, KID_TOPS[i]);
      } else if (p.small || a < 14) {
        famPut(g, p, 72 + small * 12 + Math.round(Math.sin(t / 6 + i) * 3), 84, small % 2 ? 'l' : 'r', i, (t + i * 4) % 12 < 6 ? -1 : 0);
        small++;
      } else famPut(g, p, 96, 84, 'l', i);
    }),
  );
}

/** A cradle, clear at a glance: rockers, a woven basket, a hood, a blanket in the baby's colour, a sleeping face. */
function drawCradle(g, x, y, t, colour) {
  const rock = Math.round(Math.sin(t / 12));
  const wood = '#f6efe4'; // a painted cradle stands out from the wooden floor
  const dark = '#8a6a4a';
  // Rockers.
  R(g, x + 1, y + 12, 18, 1, dark);
  R(g, x, y + 11, 1, 1, dark);
  R(g, x + 19, y + 11, 1, 1, dark);
  R(g, x + 4, y + 10, 1, 2, dark);
  R(g, x + 15, y + 10, 1, 2, dark);
  const bx = x + rock;
  // The basket, with a woven line.
  box(g, bx + 1, y + 4, 18, 7, wood, OL);
  for (let k = bx + 3; k < bx + 18; k += 3) R(g, k, y + 6, 1, 4, '#ddd0bf');
  // The hood over the head end.
  box(g, bx + 1, y - 1, 7, 6, colour, OL);
  R(g, bx + 2, y, 5, 1, lighten(colour, 0.35));
  // The baby: a face on the pillow, eyes shut, rosy cheeks; the blanket up to the chin.
  R(g, bx + 8, y + 2, 5, 3, '#f4efe6'); // pillow
  disc(g, bx + 10, y + 3, 2, SKIN);
  R(g, bx + 9, y + 3, 1, 1, '#3a2a3a');
  R(g, bx + 11, y + 3, 1, 1, '#3a2a3a');
  R(g, bx + 8, y + 4, 1, 1, '#ffa8b0');
  R(g, bx + 12, y + 4, 1, 1, '#ffa8b0');
  R(g, bx + 8, y + 5, 10, 3, lighten(colour, 0.2));
  R(g, bx + 8, y + 5, 10, 1, '#ffffff');
  for (let k = bx + 9; k < bx + 18; k += 3) R(g, k, y + 7, 1, 1, '#ffffff'); // dots on the blanket
  // Asleep.
  const z = t % 36;
  g.font = 'bold 5px sans-serif';
  g.fillStyle = 'rgba(90, 106, 138, 0.9)';
  g.fillText('z', bx + 14 + z / 9, y - 1 - z / 6);
}
