// 작은 마을 — the art: hand-placed pixel sprites (chibi people, animals), fluffy trees, soft ground and water.
// Loaded before game.js; everything here is drawn at 1 px = 1 pixel and scaled up by whole numbers only.
'use strict';

// ── Sprites: one string per row, one character per pixel ('.' = clear) ────────────────────────────────────────────

/** Draws a sprite; `flip` mirrors it (facing left). Colours come from `pal`; unknown keys are skipped. */
function spr(g, rows, pal, x, y, flip = false) {
  const w = rows[0].length;
  for (let j = 0; j < rows.length; j++) {
    const row = rows[j];
    for (let i = 0; i < row.length; i++) {
      const c = pal[row[i]];
      if (!c) continue;
      g.fillStyle = c;
      g.fillRect(Math.round(x + (flip ? w - 1 - i : i)), Math.round(y + j), 1, 1);
    }
  }
}

// People: 12 × 16. o outline · h/H hair · s/S skin · e/w eye · b blush · m mouth · t/T top · p legs · f shoes.
const HEAD = {
  d: [
    '...oooooo...',
    '..ohhhhhho..',
    '.ohhHHhhhho.',
    '.ohHhhhhhhho',
    'ohhhhhhhhhho',
    'ohhshhhhshho',
    'osssssssssso',
    'osewssssewso',
    'oseesssseeso',
    'obbssmmssbbo',
    '.osssssssso.',
  ],
  r: [
    '....ooooo...',
    '...ohhhhho..',
    '..ohhHHhhho.',
    '.ohhhhhhhhho',
    '.ohhhhhhhhho',
    '.ohhhhhhshso',
    '.ohhhsssssso',
    '.ohhssssewso',
    '.ohhsssseeso',
    '..ohssbsssmo',
    '...osssssso.',
  ],
  u: [
    '...oooooo...',
    '..ohhhhhho..',
    '.ohhHHhhhho.',
    '.ohHhhhhhhho',
    'ohhhhhhhhhho',
    'ohhhhhhhhhho',
    'ohhhHhhhhhho',
    'ohhhhhhhhhho',
    'ohhhhhhhhhho',
    '.ohhhhhhhho.',
    '..osssssso..',
  ],
};
const BODY = {
  d: ['..otttttto..', '.osttttttso.', '..oTttttTo..'],
  r: ['....otttto..', '...otttsto..', '...oTttTo...'],
};
BODY.u = BODY.d;
const LEGS = {
  d: [
    ['..oppooppo..', '..offooffo..'],
    ['..oppooppo..', '..offo.ooo..'],
    ['..oppooppo..', '..offooffo..'],
    ['..oppooppo..', '..ooo.offo..'],
  ],
  r: [
    ['....oppo....', '....offfo...'],
    ['...opo.opo..', '..ofo...ofo.'],
    ['....opop....', '....offo....'],
    ['...opo.opo..', '...ofo.ofo..'],
  ],
};
LEGS.u = LEGS.d;

const SKIN = '#ffd9b8';
const PERSON_PAL = (c) => ({
  o: shadeOf(c.hair, 0.55),
  h: c.hair,
  H: lighten(c.hair, 0.35),
  s: c.skin ?? SKIN,
  S: c.skin ? shadeOf(c.skin, 0.85) : '#f2b896',
  e: '#3a2a3a',
  w: '#ffffff',
  b: '#ffa8b0',
  m: '#d9706e',
  t: c.top,
  T: shadeOf(c.top, 0.8),
  p: c.legs ?? '#4b4560',
  f: '#5a3a2a',
});

function shadeOf(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  return `#${[n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(v * k).toString(16).padStart(2, '0')).join('')}`;
}
function lighten(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  return `#${[n >> 16, (n >> 8) & 255, n & 255]
    .map((v) => Math.round(v + (255 - v) * k).toString(16).padStart(2, '0'))
    .join('')}`;
}

/** Soft oval shadow under a thing standing at (cx, cy). */
function shadow(g, cx, cy, w) {
  g.fillStyle = 'rgba(40, 60, 30, 0.22)';
  const half = Math.round(w / 2);
  g.fillRect(Math.round(cx - half + 1), Math.round(cy), half * 2 - 2, 1);
  g.fillRect(Math.round(cx - half + 2), Math.round(cy + 1), half * 2 - 4, 1);
  g.fillRect(Math.round(cx - half + 2), Math.round(cy - 1), half * 2 - 4, 1);
}

/** Which way something faces, from how it last moved. */
function faceOf(e) {
  return e.dir ?? 'd';
}

/** Animation frame for walking (4 frames) and a gentle breathing bob when standing. */
function poseOf(e) {
  const walking = e.path && e.path.length > 0;
  if (walking) {
    const f = Math.floor(e.frame / 2) % 4;
    return { legs: f, bob: f % 2 ? -1 : 0 };
  }
  return { legs: 0, bob: Math.floor((clockTick() + (e.seed ?? 0)) / 9) % 2 };
}
const clockTick = () => (typeof clock === 'number' ? clock : 0);

/** A person: 12 × 16, feet at (e.x, e.y). Long hair for 'f'. Tools / bubbles drawn by the caller. */
function drawPerson(g, e, c, extra) {
  const dir = faceOf(e);
  const side = dir === 'l' || dir === 'r' ? 'r' : dir;
  const flip = dir === 'l';
  const { legs, bob } = poseOf(e);
  const x = Math.round(e.x) - 6;
  const y = Math.round(e.y) - 16;
  const pal = PERSON_PAL(c);
  shadow(g, e.x, e.y, 10);
  spr(g, LEGS[side][legs], pal, x, y + 14, flip);
  spr(g, BODY[side], pal, x, y + 11 + bob, flip);
  if (e.gender === 'f' && !extra?.hairStyle) longHair(g, side, flip, pal, x, y + bob);
  spr(g, HEAD[side], pal, x, y + bob, flip);
  if (e.gender === 'f' && !extra?.hairStyle) frontLocks(g, side, flip, pal, x, y + bob);
  return { x, y: y + bob, side, flip, pal };
}

/** Long hair: behind the head, falling to the shoulders. */
function longHair(g, side, flip, pal, x, y) {
  const rows =
    side === 'u'
      ? ['ohhhhhhhhhho', 'ohhhhhhhhhho', 'ohhhhhhhhhho', '.ohhhhhhhho.']
      : side === 'r'
        ? ['.ohhh.......', '.ohhh.......', '.ohhh.......', '..oho.......']
        : ['oh........ho', 'oh........ho', 'oh........ho', '.o........o.'];
  spr(g, rows, pal, x, y + 9, flip);
}
/** Front locks over the cheeks (front view only). */
function frontLocks(g, side, flip, pal, x, y) {
  if (side !== 'd') return;
  spr(g, ['oh........ho', 'oh........ho', 'oh........ho'], pal, x, y + 6, flip);
}

/** A baby: a round bundle with a face. */
const BABY = ['..oooo..', '.osssso.', 'osewewso', 'osbssbso', '.otttto.', 'otttttto', '.otttto.', '..oooo..'];

function drawBaby(g, e, c) {
  const x = Math.round(e.x) - 4;
  const y = Math.round(e.y) - 8 + (Math.floor((clockTick() + (e.seed ?? 0)) / 6) % 2);
  shadow(g, e.x, e.y, 7);
  spr(g, BABY, { o: shadeOf(c.top, 0.6), s: SKIN, e: '#3a2a3a', w: '#ffffff', b: '#ffa8b0', t: c.top }, x, y);
}

// ── Animals ────────────────────────────────────────────────────────────────────────────────────────────────────────

const CHICKEN = [
  ['.....rr...', '....owwo..', '...owwewo.', '.oowwwwwyy', 'owwwwwwwo.', 'owWwwwwwo.', '.owwwwwo..', '..oyo.oyo.'],
  ['.....rr...', '....owwo..', '...owwewo.', '.oowwwwwyy', 'owwwwwwwo.', 'owWwwwwwo.', '.owwwwwo..', '...oyoyo..'],
];
const CHICKEN_PAL = { o: '#8a6a4a', w: '#fffaf0', W: '#eadfcd', r: '#ef5b63', y: '#f5b041', e: '#3a2a3a' };

const COW = [
  [
    '..........oooo..',
    '.........owwwwo.',
    '.oooooooowwewwo.',
    'owwwwBBwwwwwwppo',
    'owwBBBwwwwwwwppo',
    'owwBBwwwwBBwwwo.',
    'owwwwwwwwBBwwo..',
    '.owwwwwwwwwwwo..',
    '.ol.ol....ol.ol.',
    '.oo.oo....oo.oo.',
  ],
  [
    '..........oooo..',
    '.........owwwwo.',
    '.oooooooowwewwo.',
    'owwwwBBwwwwwwppo',
    'owwBBBwwwwwwwppo',
    'owwBBwwwwBBwwwo.',
    'owwwwwwwwBBwwo..',
    '.owwwwwwwwwwwo..',
    '..ol.ol..ol.ol..',
    '..oo.oo..oo.oo..',
  ],
];
const COW_PAL = { o: '#6b5a52', w: '#fbf8f2', B: '#4a3f3f', p: '#f5a5a8', e: '#3a2a3a', l: '#e8e0d4' };

const DOG = [
  [
    '........o.o.',
    '.......oyoyo',
    '.......oyeyo',
    'o......oyyyn',
    'oo.oooooyyo.',
    '.oyyyyyyyyo.',
    '.oyWWyyyyyo.',
    '.oyo.oo.oyo.',
    '.oo..oo..oo.',
  ],
  [
    '........o.o.',
    '.......oyoyo',
    '.......oyeyo',
    '.o.....oyyyn',
    'oo.oooooyyo.',
    '.oyyyyyyyyo.',
    '.oyWWyyyyyo.',
    '..oyo.oyo...',
    '..oo..oo....',
  ],
];
const DOG_PAL = { o: '#7a4a2a', y: '#e8a65e', W: '#fff3e0', e: '#3a2a3a', n: '#3a2a3a' };

function animalFlip(e) {
  return faceOf(e) === 'l';
}
function drawAnimal(g, e, rows, pal, wid, hei, scaleShadow) {
  if (e.variant && typeof variantPal === 'function') pal = variantPal(pal, e.variant); // rare colours (more.js)
  const walking = e.path && e.path.length > 0;
  const f = walking ? Math.floor(e.frame / 3) % rows.length : 0;
  const x = Math.round(e.x) - Math.floor(wid / 2);
  const y = Math.round(e.y) - hei;
  shadow(g, e.x, e.y, scaleShadow);
  spr(g, rows[f], pal, x, y, animalFlip(e));
}

// ── Ground, trees, water ───────────────────────────────────────────────────────────────────────────────────────────

/** Fluffy three-tone tree with a soft outline; snow, blossoms or autumn leaves by season. */
function drawTree(g, x, y, r = 7) {
  const season = Math.max(0, typeof S === 'object' ? S.season : 0);
  const leaves = [
    ['#2f6b3a', '#4e9a4c', '#74bf5e', '#a8dd78'],
    ['#25603a', '#3f8a44', '#5fb054', '#8fd06a'],
    ['#8a3a26', '#c8612e', '#ec9a3a', '#f8c96a'],
    ['#30553f', '#456e52', '#5a8466', '#7aa086'],
  ][season];
  shadow(g, x, y + 1, r * 2 + 2);
  // Trunk with a little root flare.
  R(g, x - 2, y - 6, 4, 7, '#5a3a26');
  R(g, x - 1, y - 6, 2, 6, '#8a5a3a');
  R(g, x - 3, y, 6, 1, '#5a3a26');
  // Canopy: a dark base, mid clusters, light tops, a few highlight pixels.
  const cy = y - 6 - r;
  for (const [dx, dy, rr] of [[-r + 3, 2, r - 2], [r - 3, 2, r - 2], [0, 0, r]]) disc(g, x + dx, cy + dy, rr + 1, shadeOf(leaves[0], 0.8));
  for (const [dx, dy, rr] of [[-r + 3, 2, r - 2], [r - 3, 2, r - 2], [0, 0, r]]) disc(g, x + dx, cy + dy, rr, leaves[0]);
  for (const [dx, dy, rr] of [[-r + 3, 0, r - 3], [r - 4, 1, r - 3], [-1, -2, r - 2]]) disc(g, x + dx, cy + dy, rr, leaves[1]);
  for (const [dx, dy, rr] of [[-2, -3, r - 4], [-r + 3, -1, r - 5]]) disc(g, x + dx, cy + dy, Math.max(1, rr), leaves[2]);
  for (const [dx, dy] of [[-3, -5], [-1, -6], [-5, -2], [2, -4]]) R(g, x + dx, cy + dy, 1, 1, leaves[3]);
  if (season === 0) for (const [dx, dy] of [[-4, -1], [3, -3], [1, 2], [-1, -4], [5, 1]]) {
    R(g, x + dx, cy + dy, 2, 2, '#ffc1d6');
    R(g, x + dx, cy + dy, 1, 1, '#ffffff');
  }
  if (season === 1) for (const [dx, dy] of [[3, 1], [-3, 2]]) {
    R(g, x + dx, cy + dy, 2, 2, '#e8505b');
    R(g, x + dx, cy + dy, 1, 1, '#ff9aa2');
  }
  if (season === 3) {
    disc(g, x - 1, cy - 3, r - 3, '#ffffff');
    R(g, x - r + 1, cy - 1, r * 2 - 2, 1, '#eef4f8');
  }
}

/** Soft grass: a calm base, gentle patches, blade tufts and little flowers. */
function drawGrassArt(g) {
  const [base, dark, light, tuft] = groundColours();
  R(g, 0, 0, W, H, base);
  const r = rng(7);
  // Large soft patches (tile-sized), a shade lighter or darker.
  for (let ty = 0; ty < ROWS; ty++)
    for (let tx = 0; tx < COLS; tx++) {
      const v = r();
      if (v < 0.18) R(g, tx * T, ty * T, T, T, mix(base, dark, 0.35));
      else if (v > 0.84) R(g, tx * T, ty * T, T, T, mix(base, light, 0.35));
    }
  // Sparse speckles.
  const k = COLS / 120; // density scales with the map's width
  for (let i = 0; i < 5000 * k; i++) R(g, Math.floor(r() * W), Math.floor(r() * H), 1, 1, r() < 0.5 ? dark : light);
  // Grass blades: a light tip over a dark root.
  for (let i = 0; i < 900 * k; i++) {
    const x = Math.floor(r() * W);
    const y = Math.floor(r() * H);
    R(g, x, y + 1, 1, 2, tuft);
    R(g, x + 2, y + 1, 1, 2, tuft);
    R(g, x + 1, y, 1, 2, light);
  }
  if (S.season === 3) return;
  const petals = ['#ffffff', '#ffe066', '#ff9ec2', '#a8d4ff', '#c9a0ff'];
  for (let i = 0; i < (S.season === 0 ? 420 : 260) * k; i++) {
    const x = Math.floor(r() * W);
    const y = Math.floor(r() * H);
    const c = petals[i % petals.length];
    R(g, x, y - 1, 1, 1, c);
    R(g, x - 1, y, 1, 1, c);
    R(g, x + 1, y, 1, 1, c);
    R(g, x, y + 1, 1, 1, c);
    R(g, x, y, 1, 1, '#f7b733');
    R(g, x, y + 2, 1, 1, tuft);
  }
}

/** Water with a sandy shore, a lighter rim, depth and sparkles. */
function drawWater(g, P) {
  const x = P.x * T;
  const y = P.y * T;
  const w = P.w * T;
  const h = P.h * T;
  const round = (x0, y0, ww, hh, c) => {
    R(g, x0 + 2, y0, ww - 4, hh, c);
    R(g, x0 + 1, y0 + 1, ww - 2, hh - 2, c);
    R(g, x0, y0 + 2, ww, hh - 4, c);
  };
  round(x, y, w, h, '#e9d6a4');
  round(x + 2, y + 2, w - 4, h - 4, '#8fd3f4');
  round(x + 3, y + 3, w - 6, h - 6, '#5bb3e6');
  R(g, x + 5, y + h / 2, w - 10, h / 2 - 5, '#4a9fd6');
  for (let i = 0; i < P.w * 3; i++) {
    const sx = x + 6 + ((i * 23) % (w - 16));
    const sy = y + 6 + ((i * 11) % (h - 12));
    R(g, sx, sy, 4, 1, '#c9ecff');
    if (i % 3 === 0) R(g, sx + 1, sy - 1, 1, 1, '#ffffff');
  }
  // Lily pads with a flower.
  for (const [lx, ly] of [[x + 9, y + h - 8], [x + w - 11, y + 8]]) {
    disc(g, lx, ly, 2, '#5aa84a');
    R(g, lx, ly - 1, 1, 1, '#ff9ec2');
  }
}

// ── Tools and little effects for actions ──────────────────────────────────────────────────────────────────────────

/** A tool in the hand while an action plays (`t` counts down from `n`). */
function drawAction(g, e, act) {
  const k = act.n - act.t; // 0 … n
  const swing = k % 4 < 2;
  const flip = faceOf(e) === 'l';
  const hx = Math.round(e.x) + (flip ? -8 : 5);
  const hy = Math.round(e.y) - 8;
  const wood = '#8a5a3a';
  switch (act.tool) {
    case 'hoe':
      if (swing) {
        R(g, hx, hy - 7, 1, 8, wood);
        R(g, hx + (flip ? -2 : 0), hy - 8, 3, 2, '#b8bcc4');
      } else {
        R(g, hx, hy - 1, 6 * (flip ? -1 : 1), 1, wood);
        R(g, hx + (flip ? -6 : 5), hy - 1, 2, 3, '#b8bcc4');
        R(g, hx + (flip ? -5 : 3), hy + 6, 3, 1, '#7a5232');
      }
      break;
    case 'hammer':
      R(g, hx, hy - (swing ? 6 : 2), 1, 6, wood);
      R(g, hx - 1, hy - (swing ? 8 : 4), 4, 3, '#7a7e88');
      if (!swing) {
        R(g, hx + 3, hy + 2, 1, 1, '#ffe066');
        R(g, hx + 5, hy, 1, 1, '#ffe066');
      }
      break;
    case 'basket':
      R(g, hx - 1, hy + 1, 6, 4, '#c98d4b');
      R(g, hx - 1, hy + 1, 6, 1, '#8a5a32');
      R(g, hx, hy - 1 - (swing ? 1 : 0), 2, 2, '#e8505b');
      R(g, hx + 2, hy - (swing ? 1 : 0), 2, 2, '#ffe066');
      break;
    case 'coin':
      disc(g, hx + 1, hy - 4 - k, 2, '#f5c542');
      R(g, hx + 1, hy - 5 - k, 1, 1, '#fff2b0');
      break;
    case 'heart':
    case 'talk':
    case 'sparkle': {
      const bx = Math.round(e.x) - 3;
      const by = Math.round(e.y) - 26 - (k % 2);
      R(g, bx - 1, by - 1, 9, 8, '#ffffff');
      R(g, bx - 2, by, 11, 6, '#ffffff');
      R(g, bx + 2, by + 7, 2, 2, '#ffffff');
      if (act.tool === 'talk') for (const dx of [1, 3, 5]) R(g, bx + dx, by + 3, 1, 1, '#6b5a6a');
      else if (act.tool === 'heart') {
        R(g, bx + 1, by + 1, 2, 2, '#ff6b81');
        R(g, bx + 4, by + 1, 2, 2, '#ff6b81');
        R(g, bx + 1, by + 3, 5, 1, '#ff6b81');
        R(g, bx + 2, by + 4, 3, 1, '#ff6b81');
        R(g, bx + 3, by + 5, 1, 1, '#ff6b81');
      } else {
        R(g, bx + 3, by, 1, 6, '#ffd23f');
        R(g, bx, by + 3, 7, 1, '#ffd23f');
        R(g, bx + 3, by + 3, 1, 1, '#ffffff');
      }
      break;
    }
  }
}

// ── More animals ───────────────────────────────────────────────────────────────────────────────────────────────────

const SHEEP = [
  ['..oooooo....', '.owwwwwwo...', 'owwwwwwwwoo.', 'owwwwwwwoKKo', 'owwwwwwwoKeo', '.owwwwwwwoo.', '..oKo..oKo..'],
  ['..oooooo....', '.owwwwwwo...', 'owwwwwwwwoo.', 'owwwwwwwoKKo', 'owwwwwwwoKeo', '.owwwwwwwoo.', '...oKo.oKo..'],
];
const SHEEP_PAL = { o: '#9a8a80', w: '#fbf7ee', K: '#5a4a4a', e: '#ffffff' };
const PIG = [
  ['..oooooo.oo.', '.oppppppoppo', 'oppppppppepo', 'oppppppppPPo', 'oppppppppPPo', '.oppppppppo.', '..opo..opo..'],
  ['..oooooo.oo.', '.oppppppoppo', 'oppppppppepo', 'oppppppppPPo', 'oppppppppPPo', '.oppppppppo.', '...opo.opo..'],
];
const PIG_PAL = { o: '#c06a7a', p: '#ffbcc8', P: '#f08a9a', e: '#3a2a3a' };
const CAT = [
  ['......o.o.', '.....oyoyo', 'o....oyeyo', 'o.oooyyyyo', '.oyyyyyyo.', '.oyyyyyyo.', '.oyo..oyo.'],
  ['......o.o.', '.....oyoyo', '.o...oyeyo', 'o.oooyyyyo', '.oyyyyyyo.', '.oyyyyyyo.', '..oyooyo..'],
];
const CAT_PAL = { o: '#3a3038', y: '#f0a050', e: '#3a2a3a' };
const DUCK = [
  ['....ooo.', '...oggey', '.o..ogo.', 'owwwwwo.', 'owWWwwwo', '.oooooo.'],
  ['....ooo.', '...oggey', '....ogo.', 'owwwwwo.', 'owWWwwwo', '.oooooo.'],
];
const DUCK_PAL = { o: '#6a5a48', w: '#f4eedc', W: '#c8b89a', g: '#3f8f5a', y: '#f5b041', e: '#222222' };
const RABBIT = [
  ['.....o.o', '....owow', '...owwew', 'oooowwwo', 'owwwwwwo', '.oooooo.'],
  ['.....o.o', '....owow', '...owwew', 'oooowwwo', 'owwwwwwo', 'oo....oo'],
];
const RABBIT_PAL = { o: '#a8968a', w: '#f7f1e8', e: '#3a2a3a' };
const BIRD = [['o....o', '.o..o.', '..oo..'], ['......', 'oooooo', '..oo..']];
const BIRD_PAL = { o: '#3a3a48' };

// ── More ground: rocks, the mine, bushes, mushrooms, the store, a pier ──────────────────────────────────────────────

function boulder(g, x, y, r = 4) {
  shadow(g, x, y + 1, r * 2 + 2);
  disc(g, x, y - r + 1, r + 1, '#5a5a66');
  disc(g, x, y - r + 1, r, '#9a9aa8');
  disc(g, x - 1, y - r, Math.max(1, r - 2), '#b8b8c6');
  R(g, x - 2, y - r - 1, 1, 1, '#e4e4ee');
}

/** A rocky hill with a timbered mine entrance and a cart on rails. */
function mine(g, M) {
  const x = M.x * T;
  const y = M.y * T;
  const w = M.w * T;
  const h = M.h * T;
  // A rounded hill: an outline, three bands of rock lighter towards the top, cracks, pebbles and a grassy brow.
  const top = (px) => y + 6 + Math.round(10 * Math.pow((px - x - w / 2) / (w / 2), 2)) + (((px * 7) % 5) === 0 ? 1 : 0);
  for (let px = x; px < x + w; px++) {
    const t0 = top(px);
    R(g, px, t0 - 1, 1, y + h - t0 + 1, '#4a4a58');
    R(g, px, t0, 1, y + h - t0, '#7a7a8a');
    R(g, px, t0, 1, Math.max(0, Math.round((y + h - t0) * 0.55)), '#8e8e9e');
    R(g, px, t0, 1, Math.max(0, Math.round((y + h - t0) * 0.25)), '#a6a6b6');
    R(g, px, t0 - 2, 1, 2, px % 3 ? '#5fae4a' : '#4e9a3e');
  }
  for (let i = 0; i < 26; i++) {
    const cx = x + 8 + ((i * 37) % (w - 16));
    const cy = Math.max(top(cx) + 4, y + 10 + ((i * 17) % (h - 16)));
    R(g, cx, cy, 4, 1, '#5e5e6e');
    R(g, cx + 4, cy + 1, 2, 1, '#5e5e6e');
    R(g, cx + 1, cy - 1, 3, 1, '#c4c4d2');
  }
  const mx = x + Math.floor(w / 2) - 10;
  const my = y + h - 22;
  disc(g, mx + 10, my + 8, 10, '#5a3a26');
  disc(g, mx + 10, my + 8, 8, '#1e1a22');
  R(g, mx, my + 8, 20, 14, '#1e1a22');
  R(g, mx - 2, my + 4, 3, 18, '#8a5a3a');
  R(g, mx + 19, my + 4, 3, 18, '#8a5a3a');
  R(g, mx - 3, my + 2, 26, 3, '#a8724a');
  for (let i = 0; i < 40; i += 4) R(g, mx - 10 + i, my + 22, 2, 2, '#6b4428');
  R(g, mx - 10, my + 21, 40, 1, '#8a8e96');
  box(g, mx + 22, my + 13, 10, 7, '#7a7e88', '#4a4e58');
  for (const [dx, c] of [[24, '#c0c0cc'], [27, '#e8c24a'], [30, '#9a9aa8']]) R(g, mx + dx, my + 12, 2, 2, c);
  R(g, mx + 23, my + 20, 2, 2, OL);
  R(g, mx + 29, my + 20, 2, 2, OL);
}

function bush(g, x, y, berries) {
  shadow(g, x, y + 1, 12);
  disc(g, x, y - 4, 6, '#2f6b3a');
  disc(g, x, y - 4, 5, '#4e9a4c');
  disc(g, x - 2, y - 6, 3, '#74bf5e');
  if (berries) for (const [dx, dy] of [[-3, -3], [2, -5], [3, -1], [-1, -7], [0, -2]]) {
    R(g, x + dx, y + dy, 2, 2, berries);
    R(g, x + dx, y + dy, 1, 1, '#ffffff');
  }
}
function mushroom(g, x, y) {
  R(g, x - 1, y - 3, 2, 3, '#f4ead8');
  R(g, x - 3, y - 5, 6, 2, '#e8505b');
  R(g, x - 2, y - 6, 4, 1, '#e8505b');
  R(g, x - 2, y - 5, 1, 1, '#ffffff');
  R(g, x + 1, y - 6, 1, 1, '#ffffff');
}
/** The town store: a log pile and a stone heap that grow with what villagers bring. */
function store(g, x, y, wood, stone) {
  const logs = Math.min(4, 1 + Math.floor(wood / 15));
  for (let i = 0; i < logs; i++) {
    const lx = x + (i % 2) * 7 + Math.floor(i / 2) * 3;
    const ly = y - Math.floor(i / 2) * 4;
    box(g, lx, ly - 4, 10, 4, '#a8724a', '#5a3a26');
    R(g, lx + 8, ly - 3, 1, 2, '#e8c49a');
  }
  const stones = Math.min(5, 1 + Math.floor(stone / 12));
  for (let i = 0; i < stones; i++) boulder(g, x + 22 + (i % 3) * 4, y - Math.floor(i / 3) * 4, 2);
}
function pier(g, x, y, w) {
  for (let i = 0; i < w; i += 4) box(g, x + i, y, 4, 8, '#b07a46', '#6b4428');
  R(g, x, y + 8, 2, 4, '#6b4428');
  R(g, x + w - 2, y + 8, 2, 4, '#6b4428');
}

// ── More actions ───────────────────────────────────────────────────────────────────────────────────────────────────

/** Tools for the villagers' work, and little states (sleep, sit, dance) — on top of drawAction's set. */
function drawWork(g, e, act) {
  const k = act.n - act.t;
  const swing = Math.floor(k / 3) % 2 === 0;
  const flip = faceOf(e) === 'l';
  const hx = Math.round(e.x) + (flip ? -8 : 5);
  const hy = Math.round(e.y) - 8;
  const wood = '#8a5a3a';
  switch (act.tool) {
    case 'axe':
      R(g, hx, hy - (swing ? 7 : 2), 1, 7, wood);
      R(g, hx + (flip ? -2 : 1), hy - (swing ? 8 : 3), 3, 4, '#b8bcc4');
      if (!swing) R(g, hx + (flip ? -5 : 5), hy + 3, 2, 1, '#e8c49a');
      return true;
    case 'pickaxe':
      R(g, hx, hy - (swing ? 7 : 2), 1, 7, wood);
      R(g, hx - 2, hy - (swing ? 8 : 3), 6, 1, '#8a8e96');
      R(g, hx - 3, hy - (swing ? 7 : 2), 1, 1, '#8a8e96');
      R(g, hx + 4, hy - (swing ? 7 : 2), 1, 1, '#8a8e96');
      if (!swing) R(g, hx + (flip ? -4 : 4), hy + 4, 1, 1, '#ffe066');
      return true;
    case 'rod': {
      const tip = flip ? hx - 10 : hx + 10;
      for (let i = 0; i < 10; i++) R(g, hx + (flip ? -i : i), hy - 2 - Math.floor(i / 2), 1, 1, wood);
      R(g, tip, hy - 6, 1, 10, 'rgba(255,255,255,0.7)');
      const bob = Math.floor(k / 6) % 2;
      R(g, tip - 1, hy + 4 + bob, 3, 2, '#e8505b');
      R(g, tip - 1, hy + 4 + bob, 3, 1, '#ffffff');
      return true;
    }
    case 'pick':
      R(g, hx - 1, hy + 1, 6, 4, '#c98d4b');
      R(g, hx - 1, hy + 1, 6, 1, '#8a5a32');
      if (swing) R(g, hx + 1, hy - 1, 2, 2, '#5a6ad8');
      return true;
    case 'bowl':
      R(g, hx - 2, hy + 1, 6, 3, '#f4ead8');
      R(g, hx - 1, hy, 4, 1, '#e8a65e');
      if (swing) R(g, hx, hy - 3, 1, 2, 'rgba(255,255,255,0.7)');
      return true;
    case 'feed':
      if (swing) for (const dx of [2, 5, 8]) R(g, hx + (flip ? -dx : dx), hy + 4 + (dx % 3), 1, 1, '#f2d27a');
      return true;
    case 'sleep': {
      const z = Math.floor(k / 8) % 3;
      g.fillStyle = '#ffffff';
      g.font = 'bold 6px sans-serif';
      g.fillText('z', Math.round(e.x) + 4 + z, Math.round(e.y) - 18 - z * 2);
      return true;
    }
    case 'sit':
    case 'dance':
      return true;
  }
  return false;
}

// ── Even more animals: horse, goat (the pen); deer, fox, squirrel, frog (wild) ────────────────────────────────────

const HORSE = [
  ['...........o.o..', '..........ohho..', '..........ohhho.', '.........ohhheho', 'oo......ohhhhhNo', 'oMooooooohhho...', '.ohhhhhhhhhho...', '.ohhhhhhhhhho...', '.ohhhhhhhhho....', '..ol.ol..ol.ol..', '..oo.oo..oo.oo..'],
  ['...........o.o..', '..........ohho..', '..........ohhho.', '.........ohhheho', 'oo......ohhhhhNo', 'oMooooooohhho...', '.ohhhhhhhhhho...', '.ohhhhhhhhhho...', '.ohhhhhhhhho....', '...ol.ol.ol.ol..', '...oo.oo.oo.oo..'],
];
const HORSE_PAL = { o: '#4a2e1e', h: '#a8693a', M: '#5a3a26', e: '#222222', N: '#7a4a2a', l: '#8a5530' };
const GOAT = [
  ['........o.o', '.......owwo', '.......owew', 'oo.....owwo', '.oooooowwo.', 'owwwwwwwwo.', 'owwwwwwwwo.', '.ol.ol.olo.', '.oo.oo.oo..'],
  ['........o.o', '.......owwo', '.......owew', '.o.....owwo', 'o.oooooowwo', 'owwwwwwwwo.', 'owwwwwwwwo.', '..ol.olol..', '..oo.oooo..'],
];
const GOAT_PAL = { o: '#8a7a6a', w: '#f2ede2', l: '#c8c0b0', e: '#222222' };
const DEER = [
  ['..........o.o.', '..........oo.o', '...........ooo', '..........oddo', '..........odeo', '.o.......oddoN', 'ooooooooodo...', 'odWdddWddddo..', 'oddddddddddo..', '.ol.ol..ol.ol.', '.oo.oo..oo.oo.'],
  ['..........o.o.', '..........oo.o', '...........ooo', '..........oddo', '..........odeo', '.o.......oddoN', 'ooooooooodo...', 'odWdddWddddo..', 'oddddddddddo..', '..ol.ol.ol.ol.', '..oo.oo.oo.oo.'],
];
const DEER_PAL = { o: '#6a4428', d: '#c08850', W: '#f4e4c8', l: '#a87040', e: '#222222', N: '#3a2a1a' };
const FOX = [
  ['.........o.o', '........oyoy', 'W.......oyey', 'Wy......oyyn', '.yyooooooyyo', '..oyyyyyyyo.', '..oyWWyyyyo.', '..oyo..oyo..'],
  ['.........o.o', '........oyoy', '........oyey', 'WW......oyyn', '.yyooooooyyo', '..oyyyyyyyo.', '..oyWWyyyyo.', '...oyooyo...'],
];
const FOX_PAL = { o: '#7a3a1a', y: '#e8743a', W: '#ffffff', e: '#222222', n: '#222222' };
const SQUIRREL = [
  ['.yyy..o.', 'yyyy.oyo', 'yy...oey', 'yy..oyyo', '.y.oyyo.', '..oyyyo.', '..oo.oo.'],
  ['.yyy..o.', 'yyyy.oyo', 'yy...oey', 'yy..oyyo', '.y.oyyo.', '..oyyyo.', '...ooo..'],
];
const SQUIRREL_PAL = { o: '#5a3020', y: '#b86a3a', e: '#222222' };
const FROG = [
  ['.o...o.', 'oeo.oeo', 'ogggggo', 'ogGGGgo', 'oo...oo'],
  ['.......', '.o...o.', 'oeo.oeo', 'ogggggo', 'oGGGGGo'],
];
const FROG_PAL = { o: '#2f6b2a', g: '#5cb84e', G: '#9ad86a', e: '#222222' };

const ALPACA = [
  ['........o.o.', '........owwo', '........owew', '........owwn', '.........owo', '.........owo', '.oooooooowwo', 'owwwwwwwwwwo', 'owwwwwwwwwwo', '.owwwwwwwwo.', '.ol.ol.ol.ol', '.oo.oo.oo.oo'],
  ['........o.o.', '........owwo', '........owew', '........owwn', '.........owo', '.........owo', '.oooooooowwo', 'owwwwwwwwwwo', 'owwwwwwwwwwo', '.owwwwwwwwo.', '..ol.ol.ol.o', '..oo.oo.oo.o'],
];
const ALPACA_PAL = { o: '#9a8670', w: '#f6efe0', l: '#d8ccb6', e: '#222222', n: '#7a6a5a' };
const CROW = [['..oo.', '.oeoy', 'oooo.', '.o.o.'], ['..oo.', '.oeoy', 'oooo.', 'o..o.']];
const CROW_PAL = { o: '#2a2a35', e: '#ffffff', y: '#e8a030' };

/** Farm buildings and things, drawn into the still picture. */
function scarecrow(g, x, y) {
  R(g, x, y - 16, 1, 16, '#8a5a3a');
  R(g, x - 5, y - 12, 11, 1, '#8a5a3a');
  box(g, x - 3, y - 13, 7, 6, '#4f8fb0', '#2f5a70');
  disc(g, x, y - 17, 3, '#e8c96a');
  R(g, x - 4, y - 20, 9, 2, '#c98d4b');
  R(g, x - 2, y - 22, 5, 2, '#c98d4b');
  R(g, x - 1, y - 17, 1, 1, OL);
  R(g, x + 1, y - 17, 1, 1, OL);
}
function appleTree(g, x, y, apples) {
  shadow(g, x, y + 1, 14);
  R(g, x - 1, y - 6, 3, 7, '#6b4428');
  disc(g, x, y - 11, 7, '#2f6b3a');
  disc(g, x, y - 11, 6, '#4e9a4c');
  disc(g, x - 2, y - 13, 3, '#74bf5e');
  for (const [dx, dy] of apples ? [[-3, -9], [3, -12], [1, -7], [-1, -14], [4, -8]] : [])
    R(g, x + dx, y + dy, 2, 2, '#e8404b');
}
function beehive(g, x, y) {
  shadow(g, x, y + 1, 10);
  R(g, x - 4, y - 2, 9, 2, '#8a5a3a');
  for (let i = 0; i < 3; i++) box(g, x - 4 + i, y - 6 - i * 3, 9 - i * 2, 4, '#f2c24a', '#a8762a');
  R(g, x, y - 4, 2, 1, OL);
}
function greenhouse(g, x, y, w, h) {
  box(g, x, y, w, h, 'rgba(190, 235, 230, 0.55)', '#7a9a9a');
  for (let i = x + 6; i < x + w; i += 7) R(g, i, y, 1, h, '#9ab8b8');
  R(g, x, y + Math.floor(h / 2), w, 1, '#9ab8b8');
  for (let i = 0; i < w - 4; i += 5) R(g, x + 3 + i, y + 2, 2, 1, 'rgba(255,255,255,0.8)');
}
function sprinklerHead(g, x, y) {
  R(g, x, y - 4, 1, 4, '#8a8e96');
  R(g, x - 1, y - 5, 3, 1, '#5a5e66');
}
