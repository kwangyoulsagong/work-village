// 작은 마을 — 놀러가기: visit a friend's town with a code, no server.
// A life town is only looked at (your character walks around it, you can leave a guestbook note that goes back as a
// short reply code). A chaos town can be broken by both of you: the code carries the whole sandbox, so you wreck it
// and send it back, and so on. Your own town is put aside untouched while you visit, and nothing you visit is saved.
'use strict';

let VISIT = null; // { home, host, chaos } while you're in someone else's town
let nick = ''; //    the name your friends see
let guests = []; //  other people's characters walking around this town (not saved)
let replyCode = ''; // after a guestbook note: the code to send back
const CODE_HEAD = '작은마을1:';
const GUESTBOOK_MAX = 8;

// ── The code: JSON → deflate → base64, with a head so a pasted message can be found ───────────────────────────────

async function pipeBytes(bytes, stream) {
  return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer());
}
const zipBytes = (bytes) => pipeBytes(bytes, new CompressionStream('deflate-raw'));
const unzipBytes = (bytes) => pipeBytes(bytes, new DecompressionStream('deflate-raw'));
async function packCode(obj) {
  const z = await zipBytes(new TextEncoder().encode(JSON.stringify(obj)));
  let s = '';
  for (let i = 0; i < z.length; i += 0x8000) s += String.fromCharCode(...z.subarray(i, i + 0x8000));
  return CODE_HEAD + btoa(s) + '.'; // the dot ends the code, whatever chat follows it
}
async function unpackCode(text) {
  const all = String(text ?? '');
  const at = all.indexOf(CODE_HEAD);
  if (at < 0) return null;
  // A messenger may wrap the code over lines, and chat may follow it. New codes end with a dot; for older ones,
  // try the longest run of whitespace-separated pieces that decodes (chat glued on fails to inflate).
  const rest = all.slice(at + CODE_HEAD.length);
  const dot = rest.indexOf('.');
  const pieces = (dot >= 0 ? rest.slice(0, dot) : rest).split(/\s+/).filter(Boolean);
  for (let n = pieces.length; n > 0; n--) {
    const body = /^[A-Za-z0-9+/]+=*/.exec(pieces.slice(0, n).join(''))?.[0];
    if (!body) continue;
    try {
      const bin = atob(body);
      const raw = await unzipBytes(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
      const obj = JSON.parse(new TextDecoder().decode(raw));
      if (obj && typeof obj === 'object') return obj;
    } catch {
      /* shorter */
    }
    if (dot >= 0) break; // a dotted code is exactly that much
  }
  return null;
}

/** Your own life town, wherever you are right now. */
const homeState = () => VISIT?.home ?? (MODE === 'chaos' ? lifeState : null) ?? S;

/** Who you are, as a friend sees you: your name and your character's look. */
function myCard() {
  const h = homeState();
  return { name: nick || '이웃', gender: h.gender ?? 'f', style: h.style ?? null, era: h.era ?? 0 };
}

/** This town without what only matters to its owner (usage baseline, the long story). */
function townForCode() {
  const t = { ...S };
  // Also what only the owner's own town uses (who likes whom, the grain of a life): the code stays short.
  for (const k of ['usage', 'story', 'chronicle', 'hall', 'merchant', 'over', 'rel', 'lovers', 'rumours', 'life', 'leaving']) delete t[k];
  return t;
}

const myCode = () =>
  packCode({ k: MODE === 'chaos' ? 'chaos' : 'town', from: myCard(), town: townForCode(), news: MODE === 'life' ? newsForCode() : [] });

// ── Other people's characters ──────────────────────────────────────────────────────────────────────────────────────

function guestLook(card) {
  const base = OUTFIT[Math.max(0, Math.min(OUTFIT.length - 1, card.era ?? 0))];
  const st = card.style ?? {};
  return { ...base, hair: st.hairColor ?? base.hair, top: st.top?.c ?? base.top, style: st.hair ?? undefined };
}
function addGuest(card) {
  if (!card) return;
  const g = make('guest', HOME_DOOR, {
    look: guestLook(card),
    gender: card.gender === 'm' ? 'm' : 'f',
    name: String(card.name ?? '이웃').slice(0, 8),
    speed: 1,
    needs: { energy: 100, hunger: 100, social: 100 },
  });
  guests.push(g);
  people.push(g);
}
/** spawnFamily() starts the crowd over: the guests stay. */
const guestPeople = () => guests;

/** A guest strolls up and down the street near the house, stopping now and then. */
function guestThink(e) {
  if (e.path.length) return step(e);
  if (e.wait > 0) {
    e.wait--;
    return false;
  }
  const near = me.hidden ? HOME.x : Math.round(me.x / T);
  const x = Math.max(1, Math.min(COLS - 2, near + Math.floor(Math.random() * 24) - 12));
  route(e, [x, ROAD_Y]);
  e.wait = 10 + Math.floor(Math.random() * 30);
  return true;
}

/** Names over guests (and over you, while you visit). */
function drawVisit(g) {
  if (!guests.length && !VISIT) return;
  g.font = '6px sans-serif';
  const tag = (e, text, bg, up = 0) => {
    if (e.hidden || !onScreen(e.x)) return;
    const w = Math.min(50, g.measureText(text).width + 4);
    const x = Math.round(e.x - w / 2);
    const y = Math.round(e.y) - 34 - up;
    g.fillStyle = bg;
    g.fillRect(x, y, w, 8);
    g.fillStyle = '#ffffff';
    g.fillText(text, x + 2, y + 6, 46);
  };
  for (const e of guests) tag(e, e.name, 'rgba(40, 30, 30, 0.7)');
  if (VISIT && !me.hidden) tag(me, myCard().name, 'rgba(49, 130, 246, 0.85)', 9); // above your arrow
}

// ── Guestbook signs left by visitors (life towns; chaos towns have their own signs) ────────────────────────────────

function paintSigns(g, list) {
  for (const s of list ?? []) {
    R(g, s.x, s.y - 10, 1, 10, '#6b4428');
    box(g, s.x - 8, s.y - 16, 17, 7, '#e9d9b0', '#8a5a32');
    g.font = '6px sans-serif';
    const text = s.name ? `${s.name}: ${s.text}` : s.text;
    const w = Math.min(90, g.measureText(text).width + 4);
    g.fillStyle = 'rgba(40, 30, 30, 0.75)';
    g.fillRect(s.x - w / 2, s.y - 26, w, 9);
    g.fillStyle = '#ffffff';
    g.fillText(text, s.x - w / 2 + 2, s.y - 19.5, 86);
  }
}
function paintVisit(g) {
  if (MODE !== 'chaos') paintSigns(g, S.guestbook);
}

// ── Going over and coming back ─────────────────────────────────────────────────────────────────────────────────────

/** After S changed to another town: the map, the crowd, the view. */
function settleTown(chaos) {
  fx = [];
  fires = [];
  task = null;
  me.path = [];
  me.act = null;
  me.hidden = false;
  applyLayout(S.mapSeed);
  [me.x, me.y] = [HOME_DOOR[0] * T + T / 2, HOME_DOOR[1] * T + T - 2]; // their door, now that their map is laid out
  me.px = me.x;
  me.py = me.y;
  if (!chaos) carveGroves();
  ensureLots(S.houses + (S.ruins ?? 0));
  guests = [];
  spawnFamily();
  spawnAnimals();
  spawnCars();
  sites = [];
  addGuest(VISIT.host);
  if (chaos) chaosCam = (HOME.x + 1.5) * T - VIEW_W / 2;
  lifeCam = null;
  cache.dirty = true;
  for (const id of ['eraPick', 'mode', 'pick', 'over', 'signBox']) $(id).hidden = true;
  $('visitCard').hidden = true;
  replyCode = '';
}

/** Someone's life town: look around, walk, leave a note. */
function enterVisit(obj) {
  const mine = myCard();
  VISIT = { home: homeState(), host: obj.from, chaos: false };
  lifeState = null;
  MODE = 'visit';
  S = { ...fresh(), sea: null, ...obj.town, usage: {}, story: [], over: null, sickDays: 0, gender: mine.gender, style: mine.style ?? fresh().style };
  settleTown(false);
  juiceReset(); // nothing of your own town's effects follows you in
  story(`🧳 ${VISIT.host?.name ?? '이웃'}님이 코드를 만든 순간의 마을에 놀러 왔어요. 주민들 움직임은 각자 화면에서 따로 흘러가요.`);
  document.body.dataset.mode = 'visit';
  $('visitHost').textContent = `${VISIT.host?.name ?? '이웃'}님의 ${ERAS[S.era]?.name ?? ''} 마을`;
  // The news they sent along, as plain text.
  const news = (Array.isArray(obj.news) ? obj.news : []).filter((s) => typeof s === 'string').slice(0, 3).map((s) => s.slice(0, 60));
  $('visitNews').hidden = !news.length;
  $('visitNews').textContent = news.length ? `마을 소식 · ${news.join(' · ')}` : '';
  paintUi();
  wake();
}

/** Someone's chaos town: the tools work, and you send it back when you're done. */
function enterChaosVisit(obj) {
  const mine = myCard();
  const home = homeState();
  VISIT = { home, host: obj.from, chaos: true };
  lifeState = home; // leaveChaos() brings it back
  MODE = 'chaos';
  const era = Math.max(0, Math.min(ERAS.length - 1, obj.town?.era ?? 0));
  S = { ...sandboxFor(era), sea: null, ...obj.town, story: [], gender: mine.gender, style: mine.style ?? fresh().style };
  S.wrecked ??= [];
  S.wreckedLm ??= [];
  S.scorch ??= [];
  S.signs ??= [];
  S.bananas ??= [];
  S.chaosStats ??= { houses: 0, people: 0, animals: 0 };
  // Your round starts now: the sender's score, timer and challenge stay theirs.
  for (const k of ['score', 'startedAt', 'done', 'secs', 'bestCombo']) delete S.chaosStats[k];
  settleTown(true);
  juiceReset();
  story(`😈 ${VISIT.host?.name ?? '이웃'}님이 보낸 ${ERAS[era].name} 마을이에요. 같이 부수고, 다 되면 코드를 돌려보내세요.`);
  document.body.dataset.mode = 'chaos';
  paintChaosUi();
  paintUi();
  wake();
}

function leaveVisit() {
  if (!VISIT) return;
  lifeState = VISIT.home;
  VISIT = null;
  guests = [];
  leaveChaos(); // the same way home: back to the life town, untouched
}

/** A note on a life town: it stays on your screen and goes back to its owner as a reply code. */
async function visitNote() {
  if (MODE !== 'visit' || !VISIT) return;
  const text = ($('signText').value || '잘 보고 가요').slice(0, 24);
  const x = Math.round(Math.max(12, Math.min(W - 12, me.x)));
  const y = (ROAD_Y + 2) * T + 8; // on the grass below the road, clear of name tags
  const name = myCard().name;
  S.guestbook = [...(S.guestbook ?? []), { x, y, text, name }].slice(-GUESTBOOK_MAX);
  $('signBox').hidden = true;
  cache.dirty = true;
  story(`✍️ 방명록: "${text}"`);
  replyCode = await packCode({ k: 'note', from: myCard(), seed: S.mapSeed, text, x, y });
  openVisitCard();
  paintUi();
}

/** A friend's note on your own town. */
function takeNote(obj) {
  if (MODE !== 'life') return toast('방명록 코드는 내 마을에서 열어 주세요');
  if (obj.seed !== S.mapSeed) return toast('다른 마을에 남긴 방명록이에요');
  const name = String(obj.from?.name ?? '이웃').slice(0, 8);
  const text = String(obj.text ?? '').slice(0, 24);
  const x = Math.round(Math.max(12, Math.min(W - 12, Number(obj.x) || HOME.x * T)));
  const y = Math.round(Number(obj.y) || (ROAD_Y + 2) * T + 8);
  S.guestbook = [...(S.guestbook ?? []), { x, y, text, name }].slice(-GUESTBOOK_MAX);
  addGuest(obj.from);
  story(`✍️ ${name}님이 놀러 와서 방명록을 남겼어요: "${text}"`);
  caravanArrives(obj); // their caravan, with a small gift, once per note (pastimes.js)
  cache.dirty = true;
  save();
  paintUi();
  toast(`${name}님이 놀러 왔어요`);
}

async function openCode(text) {
  const obj = await unpackCode(text);
  if (!obj) return toast('코드를 읽지 못했어요. 끝까지 복사했는지 확인해 주세요', 2600);
  if (obj.k === 'note') return takeNote(obj);
  if (!obj.town || typeof obj.town !== 'object') return toast('코드를 읽지 못했어요', 2000);
  if (obj.k === 'town' && obj.town.mapSeed === homeState().mapSeed) return toast('내 마을 코드예요. 친구에게 보내 주세요');
  $('theirCode').value = '';
  if (obj.k === 'chaos') return enterChaosVisit(obj);
  if (obj.k === 'town') return enterVisit(obj);
  toast('코드를 읽지 못했어요');
}

// ── The page ───────────────────────────────────────────────────────────────────────────────────────────────────────

async function openVisitCard() {
  $('visitCard').hidden = false;
  $('nick').value = nick;
  const title = $('myCodeTitle');
  const note = $('myCodeNote');
  $('myCode').value = '';
  if (MODE === 'visit') {
    title.textContent = '방명록 코드';
    note.textContent = replyCode ? `${VISIT.host?.name ?? '친구'}님에게 보내면 방명록 팻말이 생겨요.` : '방명록을 남기면 여기에 코드가 생겨요.';
    $('myCode').value = replyCode;
  } else if (MODE === 'chaos') {
    title.textContent = VISIT ? '돌려보낼 코드' : '이 마을 코드';
    note.textContent = VISIT
      ? `${VISIT.host?.name ?? '친구'}님에게 보내면 지금 부서진 그대로 이어서 부술 수 있어요.`
      : '친구에게 보내면 지금 부서진 그대로 받아서 같이 부술 수 있어요.';
    $('myCode').value = await myCode();
  } else {
    title.textContent = '내 마을 초대 코드';
    note.textContent = '친구에게 보내면 지금 이 순간의 마을을 구경할 수 있어요. 실시간으로 이어지지는 않아요.';
    $('myCode').value = await myCode();
  }
  $('copyCode').disabled = !$('myCode').value;
}

async function copyCode() {
  const area = $('myCode');
  if (!area.value) return;
  try {
    await navigator.clipboard.writeText(area.value);
    toast('코드를 복사했어요');
  } catch {
    area.focus();
    area.select();
    toast('코드를 선택해 두었어요. ⌘C로 복사해 주세요', 2600);
  }
}

function wireVisit() {
  $('toVisit').addEventListener('click', () => ($('visitCard').hidden ? openVisitCard() : ($('visitCard').hidden = true)));
  $('visitClose').addEventListener('click', () => ($('visitCard').hidden = true));
  $('copyCode').addEventListener('click', copyCode);
  $('openCode').addEventListener('click', () => openCode($('theirCode').value));
  $('visitExit').addEventListener('click', leaveVisit);
  $('visitWrite').addEventListener('click', () => {
    $('signBox').hidden = false;
    $('signText').value = '';
    $('signText').focus();
  });
  $('nick').addEventListener('change', () => {
    nick = $('nick').value.trim().slice(0, 8);
    void aquila.storage.set('nick', nick).catch(() => {});
    if (!$('visitCard').hidden && MODE !== 'visit') void openVisitCard();
  });
  void aquila.storage
    .get('nick')
    .then((v) => (nick = typeof v === 'string' ? v : ''))
    .catch(() => {});
}
