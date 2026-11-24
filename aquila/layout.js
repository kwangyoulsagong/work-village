// 작은 마을 — a new map every game. A seed (saved with the game) places your home, then the farm, the pond with the
// shop and store, the pen and the square around it in a shuffled order, then the lake, the mine and the landmark
// sites wherever there's room; the rest becomes woods. Same seed, same map — a new game, a new town.
'use strict';

/** The farm block, 12 tiles: beehives, an orchard (3), then up to 24 fields (8 × 3). */
const FARM = { x: 39 };

function applyLayout(seed) {
  const r = rng(seed);
  const ri = (a, b) => a + Math.floor(r() * (b - a + 1));
  const shuffle = (a) => {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  placeSea(); // sea.js: from S.sea, not the seed (older towns keep their map)
  HOME.x = ri(30, COLS - 34);
  HOME_DOOR[0] = HOME.x + 1;

  // Around home, in a shuffled order: farm, pond (+ shop + store), pen, square.
  const core = shuffle([
    { id: 'farm', w: 12, place: (x) => (FARM.x = x) },
    {
      id: 'pond',
      w: 7,
      place: (x) => {
        POND.x = x;
        STALL[0] = x + 4;
        STALL_SPOT[0] = x + 4;
        STORE.x = x + 5;
      },
    },
    {
      id: 'pen',
      w: 8,
      place: (x) => {
        PEN.x = x;
        PEN_GATE[0] = x + 3;
      },
    },
    { id: 'plaza', w: 6, place: (x) => (PLAZA.x = x) },
  ]);
  // Blocks you moved yourself (build menu) keep your order.
  const order = MODE !== 'chaos' && Array.isArray(S.coreOrder) && S.coreOrder.length === core.length ? S.coreOrder : null;
  if (order) core.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  const total = core.reduce((a, b) => a + b.w + 2, -2);
  const seaW = SEA.side === 'w' ? SEA.w : 0;
  const seaE = SEA.side === 'e' ? SEA.w : 0;
  let x = Math.max(12 + seaW, Math.min(COLS - 12 - total - seaE, HOME.x + 1 - Math.floor(total / 2) + ri(-5, 5)));
  const used = [];
  for (const b of core) {
    b.place(x);
    used.push([x, x + b.w]);
    x += b.w + ri(1, 2);
  }

  // The lake, the mine and the landmark sites: anywhere that's free, a tile apart from the rest.
  if (SEA.side) used.push([SEA.x - 1, SEA.x + SEA.w]);
  const rest = shuffle([
    { w: 9, place: (x) => (LAKE.x = x) },
    { w: 9, place: (x) => (MINE.x = x) },
    ...LANDMARKS.map((l) => ({ w: l.w, place: (x) => (l.x = x) })),
  ]);
  for (const b of rest)
    for (let tries = 0; tries < 400; tries++) {
      const cx = ri(1, COLS - b.w - 1);
      if (used.every(([a, z]) => cx + b.w + 1 <= a || cx >= z + 1)) {
        b.place(cx);
        used.push([cx, cx + b.w]);
        break;
      }
    }

  // The farm's parts.
  PLOT_AT.length = 0;
  for (let c = FARM.x + 11; c >= FARM.x + 4; c--) for (const y of [8, 9, 10]) PLOT_AT.push([c, y]);
  ORCHARD.splice(0, ORCHARD.length, [FARM.x + 1, 9], [FARM.x + 3, 9], [FARM.x + 2, 11]);
  HIVES.splice(0, HIVES.length, [FARM.x + 0.3, 10], [FARM.x + 0.9, 11]);
  tractor.x = (FARM.x + 4) * T;

  // Woods: every free stretch of 5+ tiles on the south side.
  GROVES.length = 0;
  used.sort((a, b) => a[0] - b[0]);
  let at = 0;
  for (const [a, z] of [...used, [COLS, COLS]]) {
    if (a - at >= 5) GROVES.push({ x: at + 1, w: a - at - 2 });
    at = Math.max(at, z);
  }

  // House lots: north of the road, nearest to the new home first.
  LOT_X.length = 0;
  LOT_X.push(
    ...Array.from({ length: Math.floor((COLS - 2) / 3) }, (_, i) => 1 + i * 3)
      .filter((lx) => (lx + 1 < HOME.x - 1 || lx > HOME.x + HOME.w) && !inSeaTile(lx) && !inSeaTile(lx + 1))
      .sort((a, b) => Math.abs(a - HOME.x) - Math.abs(b - HOME.x))
      .slice(0, LOTS),
  );

  // You start at your door, the view on it.
  me.x = HOME_DOOR[0] * T + T / 2;
  me.y = ROAD_Y * T + T - 2;
  me.path = [];
  camX = Math.max(0, Math.min(W - VIEW_W, (HOME.x + 1.5) * T - VIEW_W / 2));
  cache.dirty = true;
}

/** A spot in the woods (south of the road). */
function groveSpot(e = null) {
  // The woods nearest to whoever goes (or to home): one of the two closest stretches, and the part of it nearest
  // them. Picking any wood within 70 tiles sent people on long walks there and back between chores.
  const from = e ? e.x / T : HOME.x;
  if (!GROVES.length) return [12, ROAD_Y + 2];
  const dist = (g) => (from < g.x ? g.x - from : from > g.x + g.w ? from - g.x - g.w : 0);
  const near = [...GROVES].sort((a, b) => dist(a) - dist(b)).slice(0, 2);
  const g = near[Math.random() < 0.75 ? 0 : near.length - 1];
  const edge = Math.max(g.x, Math.min(g.x + g.w - 1, Math.round(from)));
  const x = Math.max(g.x, Math.min(g.x + g.w - 1, edge + Math.round((Math.random() - 0.5) * 8)));
  return [x, ROAD_Y + 2 + Math.floor(Math.random() * 3)];
}
/** In front of a landmark. */
function landmarkSpot(id) {
  const l = LANDMARKS.find((x) => x.id === id);
  return [l.x + Math.floor(l.w / 2), ROAD_Y + 1];
}

// ── The camera: follows you, or goes where you drag it (both modes); a minimap of the whole town ─────────────────

let lifeCam = null; // { x, until }: a view you moved yourself, until 10 s after you let go
let dragged = false;
const HOLD_MS = 10_000;

function moveCam(to) {
  if (MODE === 'chaos') chaosCam = to;
  else lifeCam = { x: to, until: Date.now() + HOLD_MS };
  paintCamMe();
}
/** 내 캐릭터로 shows whether the view is following you (on, blue) or somewhere you moved it (off). */
let camMeOn = null;
function paintCamMe() {
  const b = document.getElementById('camMe');
  if (!b) return;
  const on = MODE !== 'chaos' && !lifeCam;
  if (camMeOn === on) return;
  camMeOn = on;
  b.setAttribute('aria-pressed', String(on));
  b.title = on ? '내 캐릭터를 따라가는 중이에요' : '누르면 내 캐릭터로 돌아가요';
}
const camTarget = () => (MODE === 'chaos' ? chaosCam : lifeCam?.x ?? camX);

/** Life mode: the view you moved, for a while; then back to following you. */
function lifeFollow() {
  if (!lifeCam) return false;
  if (Date.now() > lifeCam.until) {
    lifeCam = null;
    paintCamMe(); // following you again
    return false;
  }
  lifeCam.x = Math.max(0, Math.min(W - VIEW_W, lifeCam.x));
  return true; // cameraTick() glides there, frame by frame
}

function wireCamera() {
  let down = null;
  canvas.addEventListener('pointerdown', (ev) => {
    down = { x: ev.clientX, cam: camTarget() };
    dragged = false;
  });
  window.addEventListener('pointermove', (ev) => {
    if (!down) return;
    const dx = ev.clientX - down.x;
    if (Math.abs(dx) > 4) dragged = true;
    if (dragged) moveCam(down.cam - (dx * VIEW_W) / canvas.getBoundingClientRect().width);
  });
  window.addEventListener('pointerup', () => (down = null));
  canvas.addEventListener(
    'wheel',
    (ev) => {
      ev.preventDefault();
      moveCam(camTarget() + (ev.deltaX || ev.deltaY) * 0.6);
    },
    { passive: false },
  );
  let held = 0;
  for (const [id, dir] of [['camLeft', -1], ['camRight', 1]]) {
    const b = $(id);
    b.addEventListener('pointerdown', () => {
      clearInterval(held);
      held = setInterval(() => moveCam(camTarget() + dir * 8), 30);
    });
    for (const ev of ['pointerup', 'pointerleave']) b.addEventListener(ev, () => clearInterval(held));
  }
  // Straight to you: no glide across the map.
  $('camMe').addEventListener('click', () => {
    lifeCam = null;
    camX = prevCam = Math.max(0, Math.min(W - VIEW_W, me.x - VIEW_W / 2));
    paintCamMe();
    frame();
  });
  paintCamMe();
  mini.addEventListener('click', (ev) => {
    const r = mini.getBoundingClientRect();
    moveCam(((ev.clientX - r.left) / r.width) * W - VIEW_W / 2);
  });
}

// The minimap: the whole town squeezed into a strip, the view as a frame, home and you as dots.
const mini = document.getElementById('mini');
let miniTick = 0;
function drawMini() {
  if (++miniTick % 4 !== 0 && !cache.dirty) return;
  const cssW = mini.clientWidth || 300;
  const dpr = window.devicePixelRatio || 1;
  if (mini.width !== Math.round(cssW * dpr)) {
    mini.width = Math.round(cssW * dpr);
    mini.height = Math.round(24 * dpr);
  }
  const g = mini.getContext('2d');
  const sx = mini.width / W;
  g.imageSmoothingEnabled = true;
  g.drawImage(cache.canvas, 0, 0, W, H, 0, 0, mini.width, mini.height);
  g.strokeStyle = '#ffffff';
  g.lineWidth = Math.max(1, dpr);
  g.strokeRect(viewX * sx, 1, VIEW_W * sx, mini.height - 2);
  const dot = (x, c) => {
    g.fillStyle = c;
    g.fillRect(Math.round(x * sx) - 2 * dpr, mini.height / 2 - 2 * dpr, 4 * dpr, 4 * dpr);
  };
  dot((HOME.x + 1.5) * T, '#ffd23f');
  if (!me.hidden) dot(me.x, '#e8404b');
}

// ── House lots: north of the road, and south of it where woods were cleared. Built ones are remembered (S.lots) ───

const SOUTH_BOTTOM = () => (ROAD_Y + 5) * T - 3;
/** Free lots, nearest to home first: the north row, and three per cleared stretch of woods. */
function lotCandidates() {
  const taken = new Set((S.lots ?? []).map((l) => `${l.s ? 's' : 'n'}${l.x}`));
  const south = (S.cleared ?? []).flatMap((c) => [0, 3, 6].filter((d) => d + 2 <= c.w).map((d) => ({ x: c.x + d, s: true })));
  return [...LOT_X.map((x) => ({ x, s: false })), ...south]
    .filter((l) => !taken.has(`${l.s ? 's' : 'n'}${l.x}`))
    .sort((a, b) => Math.abs(a.x - HOME.x) - Math.abs(b.x - HOME.x));
}
function ensureLots(n) {
  S.lots ??= [];
  while (S.lots.length < n) {
    const next = lotCandidates()[0];
    if (!next) break;
    S.lots.push(next);
  }
}
const lotOf = (i) => {
  ensureLots(i + 1);
  return S.lots[i] ?? { x: LOT_X[i] ?? 0, s: false };
};
const lotX = (i) => lotOf(i).x;
/** The pixel row a lot's building stands on. */
const lotBottom = (i) => (lotOf(i).s ? SOUTH_BOTTOM() : ROAD_Y * T - 1);
const lotCenter = (i) => [lotX(i) * T + T, lotBottom(i) - 15];
/** South lots free right now (in cleared land). */
const freeSouthLots = () => lotCandidates().filter((l) => l.s).length;

// ── Clearing the woods: every six houses, a stretch of woods near home becomes a new street ────────────────────────

const CLEAR_W = 9;
/** The stretch of woods nearest home that's wide enough, or null. */
function clearable() {
  let best = null;
  for (const g of GROVES) {
    if (g.w < CLEAR_W) continue;
    // The end of the grove nearest home.
    const x = g.x + g.w / 2 < HOME.x ? g.x + g.w - CLEAR_W : g.x;
    const d = Math.abs(x + CLEAR_W / 2 - HOME.x);
    if (!best || d < best.d) best = { x, d };
  }
  return best;
}
const clearCost = () => 40 + 30 * (S.cleared?.length ?? 0);
/** Time to clear more land: every six houses, when no cleared lot is left. */
const wantClearing = () => S.houses >= 6 * ((S.cleared?.length ?? 0) + 1) && freeSouthLots() === 0 && !!clearable();
function clearWoods() {
  const c = clearable();
  if (!c) return;
  S.coins -= clearCost();
  S.cleared ??= [];
  S.cleared.push({ x: c.x, w: CLEAR_W });
  S.stock.wood += 15;
  carveGroves();
  story('🪓 숲을 개간해 새 동네 터를 닦았어요. 나무 15개가 창고에 들어왔어요.');
  if (MODE === 'life' && Math.random() < 0.3) find('relic'); // the ground turned over
  cache.dirty = true;
  spawnAnimals();
}
/** Cleared stretches aren't woods any more. */
function carveGroves() {
  for (const c of S.cleared ?? []) {
    const out = [];
    for (const g of GROVES) {
      const a = g.x;
      const z = g.x + g.w;
      if (c.x + c.w <= a || c.x >= z) out.push(g);
      else {
        if (c.x - a >= 4) out.push({ x: a, w: c.x - a - 1 });
        if (z - (c.x + c.w) >= 4) out.push({ x: c.x + c.w + 1, w: z - (c.x + c.w) - 1 });
      }
    }
    GROVES.splice(0, GROVES.length, ...out);
  }
}
/** Cleared ground: trodden earth, a few stumps. */
function drawCleared(g) {
  for (const c of S.cleared ?? []) {
    const x = c.x * T;
    const y = (ROAD_Y + 2) * T;
    R(g, x, y, c.w * T, 3 * T - 2, '#b89a6a');
    const r = rng(c.x * 17);
    for (let i = 0; i < 40; i++) R(g, x + Math.floor(r() * c.w * T), y + Math.floor(r() * (3 * T - 4)), 2, 1, r() < 0.5 ? '#a8885a' : '#c8aa7a');
    for (let i = 0; i < 4; i++) {
      const sx = x + 6 + Math.floor(r() * (c.w * T - 12));
      const sy = y + 6 + Math.floor(r() * (2 * T));
      box(g, sx, sy, 5, 3, '#a8724a', '#5a3a26');
      R(g, sx + 1, sy, 3, 1, '#e8c49a');
    }
  }
}

/** The tabs under the town: stories, achievements, the collection book, jobs. */
function wireTabs() {
  const tabs = [...document.querySelectorAll('[role=tab]')];
  for (const t of tabs)
    t.addEventListener('click', () => {
      for (const o of tabs) o.setAttribute('aria-selected', String(o === t));
      for (const b of document.querySelectorAll('.tab-body')) b.hidden = b.dataset.body !== t.dataset.tab;
      t.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    });
  // A narrow panel scrolls the tabs sideways: a mouse wheel does it too, not only a trackpad or a drag.
  const bar = document.querySelector('.segment');
  if (!bar) return;
  const edges = () => {
    bar.classList.toggle('more-left', bar.scrollLeft > 2);
    bar.classList.toggle('more-right', bar.scrollLeft + bar.clientWidth < bar.scrollWidth - 2);
  };
  bar.addEventListener('scroll', edges, { passive: true });
  // Drag the row with a mouse; a drag isn't a click on the tab it ends over.
  let grab = null;
  bar.addEventListener('pointerdown', (ev) => {
    if (ev.pointerType !== 'mouse' || bar.scrollWidth <= bar.clientWidth) return;
    grab = { x: ev.clientX, left: bar.scrollLeft, moved: false };
  });
  window.addEventListener('pointermove', (ev) => {
    if (!grab) return;
    const dx = ev.clientX - grab.x;
    if (!grab.moved && Math.abs(dx) < 5) return;
    grab.moved = true;
    bar.classList.add('dragging');
    bar.scrollLeft = grab.left - dx;
  });
  window.addEventListener('pointerup', () => {
    if (grab?.moved) {
      bar.addEventListener('click', (e) => (e.stopPropagation(), e.preventDefault()), { capture: true, once: true });
      bar.classList.remove('dragging');
    }
    grab = null;
  });
  new ResizeObserver(edges).observe(bar);
  edges();
  bar.addEventListener(
    'wheel',
    (ev) => {
      if (bar.scrollWidth <= bar.clientWidth || Math.abs(ev.deltaX) > Math.abs(ev.deltaY)) return;
      bar.scrollLeft += ev.deltaY;
      ev.preventDefault();
    },
    { passive: false },
  );
}
