// 작은 마을 — the sea. Some maps end in a beach and open water (east or west, picked with the new town; older
// towns keep their map as it was). The road runs out onto a pier; boats of the era sail back and forth (a raft,
// a sailing boat, a galleon, a steamship, a yacht and a cargo ship, a hydrofoil and a submarine), fishing boats
// go out, fish jump, dolphins play, now and then a shark's fin cuts through and a whale blows. People fish off the
// pier. Loaded before game.js: nothing here touches game.js at load time, only when called.
'use strict';

const SEA = { side: null, x: 0, w: 16 }; // set by placeSea() from S.sea
const SEA_SAND = 2; //                     tiles of beach on the land side
const PIER_LEN = 6; //                     tiles of pier out over the water, on the road's row

/** A new town's sea: none, east or west (half the maps have one). */
const rollSea = () => (Math.random() < 0.5 ? null : Math.random() < 0.5 ? 'e' : 'w');
function placeSea() {
  SEA.side = S.sea === 'e' || S.sea === 'w' ? S.sea : null;
  SEA.x = SEA.side === 'e' ? COLS - SEA.w : 0;
}
const hasSea = () => !!SEA.side;
/** Water (or beach) columns, in tiles. */
const inSeaTile = (tx) => hasSea() && tx >= SEA.x && tx < SEA.x + SEA.w;
const waterX0 = () => (SEA.side === 'e' ? SEA.x + SEA_SAND : SEA.x); // first water column
const waterX1 = () => (SEA.side === 'e' ? SEA.x + SEA.w : SEA.x + SEA.w - SEA_SAND); // one past the last
const isWater = (tx) => hasSea() && tx >= waterX0() && tx < waterX1();
const pierTiles = () => {
  if (!hasSea()) return [];
  const start = SEA.side === 'e' ? waterX0() : waterX1() - PIER_LEN;
  return Array.from({ length: PIER_LEN }, (_, i) => start + i);
};
const isPier = (tx, ty) => ty === ROAD_Y && pierTiles().includes(tx);
/** Can you stand here? Sand yes, the pier yes, water no (ai.js asks). */
const seaBlocks = (tx, ty) => isWater(tx) && !isPier(tx, ty);
/** The land's ends in px: road traffic turns round at the beach. */
const landMinX = () => (SEA.side === 'w' ? waterX1() * T : -40);
const landMaxX = () => (SEA.side === 'e' ? waterX0() * T : W + 40);
/** A destination in the water is moved to the shore (ai.js route). */
const shoreClamp = (tx) => (!hasSea() || !isWater(tx) ? tx : SEA.side === 'e' ? waterX0() - 1 : waterX1());
/** The pier's far end, where people fish. */
const pierEnd = () => {
  const p = pierTiles();
  return SEA.side === 'e' ? p[p.length - 1] : p[0];
};

// ── The still part: beach, water, the pier, a lighthouse later on ─────────────────────────────────────────────────

function paintSea(g) {
  if (!hasSea()) return;
  const sx = SEA.x * T;
  const sw = SEA.w * T;
  const w0 = waterX0() * T;
  const w1 = waterX1() * T;
  const shore = SEA.side === 'e' ? w0 : w1;
  // Sand.
  const sand0 = SEA.side === 'e' ? sx : w1;
  R(g, sand0, 0, SEA_SAND * T, H, '#ecd9a6');
  const r = rng(77);
  for (let i = 0; i < 60; i++) R(g, sand0 + Math.floor(r() * SEA_SAND * T), Math.floor(r() * H), 1, 1, r() < 0.5 ? '#d8c08a' : '#f6e8c0');
  // Water: lighter by the shore, deeper out.
  for (let x = w0; x < w1; x += 4) {
    const d = Math.abs(x - shore) / (w1 - w0);
    const c = mix('#7fd0e8', '#2a7ab0', Math.min(1, d * 1.3));
    R(g, x, 0, 4, H, c);
  }
  for (let i = 0; i < 40; i++) R(g, w0 + Math.floor(r() * (w1 - w0 - 6)), Math.floor(r() * H), 4 + Math.floor(r() * 4), 1, 'rgba(255, 255, 255, 0.25)');
  // Foam along the shore.
  for (let y = 0; y < H; y += 3) R(g, shore + (SEA.side === 'e' ? 0 : -2) + ((y / 3) % 2), y, 2, 2, '#f4fbff');
  // The road ends; the pier goes on.
  const p = pierTiles();
  const px0 = p[0] * T;
  const y = ROAD_Y * T;
  R(g, px0, y + 2, PIER_LEN * T, T - 4, '#a8743a');
  for (let x = px0; x < px0 + PIER_LEN * T; x += 4) R(g, x, y + 2, 1, T - 4, '#7a5232');
  for (let x = px0 + 2; x < px0 + PIER_LEN * T; x += 16) {
    R(g, x, y + T - 2, 2, 3, '#5a3a26');
    R(g, x, y + 1, 2, 2, '#5a3a26');
  }
  // Rocks in the shallows, a lighthouse from the middle ages on.
  for (const [dx, dy] of [[1, 2.4], [2.2, 9.6], [0.6, 10.8]]) {
    const rx = SEA.side === 'e' ? w0 + dx * T : w1 - dx * T;
    disc(g, rx, dy * T, 4, '#7a7e88');
    disc(g, rx - 1, dy * T - 1, 2, '#9aa0aa');
  }
  if (S.era >= 2) {
    const lx = sand0 + (SEA.side === 'e' ? 6 : SEA_SAND * T - 14);
    const ly = 3 * T + 6;
    box(g, lx, ly - 30, 8, 30, '#f4f4f8');
    for (let i = 0; i < 3; i++) R(g, lx + 1, ly - 26 + i * 9, 6, 3, '#e0403a');
    box(g, lx - 1, ly - 36, 10, 6, '#3a3f4a');
    R(g, lx + 2, ly - 35, 4, 3, night ? '#ffe066' : '#cfe8f5');
  }
}

// ── Boats ────────────────────────────────────────────────────────────────────────────────────────────────────────

const BOATS_BY_ERA = [
  ['raft', 'canoe'],
  ['sail', 'canoe', 'fishing'],
  ['galleon', 'sail', 'fishing'],
  ['steam', 'sail', 'fishing'],
  ['yacht', 'cargo', 'jetski', 'fishing'],
  ['hydrofoil', 'sub', 'yacht', 'fishing'],
];
let boats = [];
let seaLife = [];
function spawnBoats() {
  boats = [];
  seaLife = [];
  if (!hasSea()) return;
  const list = BOATS_BY_ERA[S.era] ?? [];
  const rows = [3.3, 5.0, 8.6, 10.4];
  list.forEach((type, i) => {
    boats.push({ type, x: (waterX0() + 2 + ((i * 5) % (SEA.w - 6))) * T, y: rows[i % rows.length] * T, v: (i % 2 ? -1 : 1) * (0.25 + (i % 3) * 0.12), f: i * 7 });
  });
  // Yours, if you have one (pastimes.js): it flies a red flag.
  const mine = MODE === 'life' ? myBoat() : null;
  if (mine) boats.push({ type: mine.id, x: (waterX0() + 3) * T, y: 9.6 * T, v: 0.3, f: 3, mine: true }); // clear of the pier
}
function seaTick(k) {
  if (!hasSea()) return;
  const x0 = waterX0() * T + 4;
  const x1 = waterX1() * T - 4;
  for (const b of boats) {
    b.f += k;
    b.x += b.v * k;
    const len = BOAT_LEN[b.type] ?? 16;
    if (b.x < x0 && b.v < 0) b.v = -b.v;
    if (b.x + len > x1 && b.v > 0) b.v = -b.v;
  }
  // Something in the water now and then: a fish, dolphins, a shark's fin, a whale.
  if (seaLife.length < 3 && Math.random() < 0.01 * k) {
    const roll = Math.random();
    const kind = roll < 0.55 ? 'fish' : roll < 0.75 ? 'dolphin' : roll < 0.93 ? 'shark' : 'whale';
    const y = (2.5 + Math.random() * 8.5) * T;
    const right = Math.random() < 0.5;
    seaLife.push({ kind, x: right ? x0 : x1 - 10, y, v: (right ? 1 : -1) * (kind === 'shark' ? 0.9 : kind === 'whale' ? 0.25 : 0.6), t: 0 });
  }
  for (const s of seaLife) {
    s.t += k;
    s.x += s.v * k;
  }
  seaLife = seaLife.filter((s) => s.x > x0 - 12 && s.x < x1 + 12 && s.t < (s.kind === 'fish' ? 12 : 200));
}
const BOAT_LEN = { raft: 14, canoe: 14, sail: 16, fishing: 18, galleon: 30, steam: 30, yacht: 22, cargo: 36, jetski: 10, hydrofoil: 24, sub: 22 };

function drawBoat(g, b) {
  const x = Math.round(b.x);
  const y = Math.round(b.y + Math.sin(b.f / 6) * 1);
  if (b.mine) {
    R(g, x + 2, y - 20, 1, 8, '#3a2418');
    R(g, x + 3, y - 20, 5, 3, '#ff5a5a');
  }
  const r = b.v > 0;
  const len = BOAT_LEN[b.type] ?? 16;
  // A wake behind it.
  for (let i = 1; i < 4; i++) R(g, r ? x - i * 4 : x + len + i * 3, y + 2 + (i % 2), 3, 1, `rgba(255, 255, 255, ${0.5 - i * 0.12})`);
  const hull = (c, h = 4, rim = '#5a3a26') => {
    R(g, x, y - h, len, h, c);
    R(g, x + 1, y, len - 2, 1, rim);
  };
  const man = (mx, top = '#d8644f') => {
    R(g, mx, y - 10, 3, 3, '#ffd9b8');
    R(g, mx, y - 7, 3, 3, top);
  };
  switch (b.type) {
    case 'raft':
      for (let i = 0; i < len; i += 3) R(g, x + i, y - 3, 2, 3, i % 2 ? '#8a5a32' : '#a8743a');
      man(x + 5, '#8a5a32');
      R(g, x + 9, y - 12, 1, 9, '#6b4428');
      return;
    case 'canoe':
      hull('#8a5a32', 3);
      man(x + 5, '#8a5a32');
      R(g, x + (b.f % 8 < 4 ? 2 : 10), y - 6, 1, 6, '#6b4428');
      return;
    case 'sail':
    case 'fishing':
      hull(b.type === 'fishing' ? '#3a7ab0' : '#f2f2f2', 4);
      R(g, x + 7, y - 16, 1, 12, '#6b4428');
      if (b.type === 'sail') {
        for (let i = 0; i < 10; i++) R(g, x + 8, y - 15 + i, Math.max(1, 7 - Math.abs(i - 4)), 1, '#ffffff');
      } else {
        man(x + 3, '#f0c040');
        R(g, x + 11, y - 12, 1, 8, '#3a3a42');
        R(g, x + 12, y - 12, 4, 1, '#3a3a42');
        R(g, x + 15, y - 11, 1, 10 + (b.f % 6 < 3 ? 1 : 0), 'rgba(255,255,255,0.7)');
      }
      return;
    case 'galleon':
      hull('#6b4428', 6, '#3a2418');
      R(g, x + 2, y - 7, len - 4, 1, '#c8a050');
      for (const mx of [9, 19]) {
        R(g, mx + x, y - 22, 1, 16, '#3a2418');
        R(g, mx + x - 5, y - 20, 11, 6, '#f4ead8');
        R(g, mx + x - 4, y - 13, 9, 5, '#f4ead8');
      }
      R(g, x + 19, y - 24, 4, 2, '#e0403a');
      return;
    case 'steam': {
      hull('#2a2a33', 5, '#e0403a');
      R(g, x + 4, y - 9, 20, 4, '#f4f4f8');
      for (let i = 0; i < 4; i++) R(g, x + 6 + i * 4, y - 8, 2, 2, '#3a4a66');
      R(g, x + 13, y - 15, 4, 6, '#e0403a');
      R(g, x + 13, y - 15, 4, 1, '#2a2a33');
      const age = b.f % 18;
      disc(g, x + 15 + (r ? -age * 0.4 : age * 0.4), y - 17 - age * 0.5, 2 + Math.floor(age / 7), `rgba(200, 200, 210, ${(0.7 - age / 26).toFixed(2)})`);
      return;
    }
    case 'yacht':
      hull('#f4f6f8', 4, '#3a7ab0');
      R(g, x + (r ? 4 : 6), y - 8, 12, 4, '#f4f6f8');
      R(g, x + (r ? 6 : 8), y - 7, 8, 2, '#3a4a66');
      return;
    case 'cargo':
      hull('#3a6a8a', 5, '#e0403a');
      for (let i = 0; i < 6; i++) R(g, x + 3 + i * 4, y - 9 - (i % 2) * 3, 4, 4 + (i % 2) * 3, ['#e0403a', '#f0c040', '#3a8a5a'][i % 3]);
      R(g, x + (r ? 30 : 2), y - 13, 4, 8, '#f4f4f8');
      return;
    case 'jetski':
      hull('#f0c040', 3, '#2a2a33');
      man(x + 4, '#2a2a33');
      for (let i = 0; i < 3; i++) R(g, r ? x - 2 - i * 2 : x + len + i * 2, y - 2 - i, 1, 1, '#ffffff');
      return;
    case 'hydrofoil': {
      const lift = 3;
      R(g, x + 2, y + 1, 2, lift, '#3a4a66');
      R(g, x + len - 4, y + 1, 2, lift, '#3a4a66');
      R(g, x, y - 4 - lift + 3, len, 4, '#e8eef4');
      R(g, x + 3, y - 7 - lift + 3, len - 8, 3, '#5ad7e8');
      return;
    }
    case 'sub': {
      // Mostly under: a dark shape, the tower and a periscope.
      g.globalAlpha = 0.55;
      R(g, x, y - 2, len, 4, '#1a3a5a');
      g.globalAlpha = 1;
      R(g, x + 9, y - 6, 5, 4, '#3a4a5a');
      R(g, x + 12, y - 10, 1, 4, '#3a4a5a');
      R(g, x + (r ? 13 : 10), y - 10, 2, 1, '#3a4a5a');
      return;
    }
  }
}
function drawSeaLife(g, s) {
  const x = Math.round(s.x);
  const y = Math.round(s.y);
  const r = s.v > 0;
  switch (s.kind) {
    case 'fish': {
      const p = s.t / 12;
      const fy = Math.round(y - Math.sin(p * Math.PI) * 10);
      spr(g, ['.ooo.o', 'owwwoo', '.ooo.o'], { o: '#3a5a7a', w: '#c8ecff' }, x, fy, !r);
      if (s.t < 2 || s.t > 10) for (const dx of [-2, 2, 6]) R(g, x + dx, y + 2, 1, 1, '#ffffff');
      return;
    }
    case 'dolphin': {
      for (let k = 0; k < 2; k++) {
        const p = ((s.t + k * 9) % 24) / 24;
        const dy = Math.round(-Math.sin(p * Math.PI) * 8);
        if (p > 0.85) continue;
        spr(g, ['....oo..', '.oooooo.', 'owwwwwoo', '.oo....o'], { o: '#4a6a8a', w: '#9ab4cc' }, x + k * 12, y + dy + k * 3, !r);
      }
      return;
    }
    case 'shark':
      // Just the fin, and the water it cuts.
      spr(g, ['...o', '..oo', '.ooo', 'oooo'], { o: '#5a6470' }, x, y - 4, !r);
      R(g, x - 2, y, 9, 1, '#ffffff');
      return;
    case 'whale': {
      R(g, x - 10, y - 2, 22, 4, 'rgba(30, 60, 90, 0.55)');
      if (s.t % 60 < 14) {
        const h = Math.min(8, Math.floor((s.t % 60) / 1.5));
        for (let i = 0; i < h; i++) R(g, x + 6 + (i % 2), y - 4 - i, 1, 1, '#ffffff');
        R(g, x + 4, y - 4 - h, 5, 1, '#ffffff');
      }
      return;
    }
  }
}
/** Each frame: waves, what swims and what sails (only when the sea is on screen). */
function drawSea(g) {
  if (!hasSea() || waterX1() * T < viewX - 40 || waterX0() * T > viewX + VIEW_W + 40) return;
  const t = clockTick();
  const w0 = waterX0() * T;
  const w1 = waterX1() * T;
  for (let i = 0; i < 14; i++) {
    const wx = w0 + ((i * 37 + t * 2) % (w1 - w0 - 6));
    const wy = ((i * 53) % (H - 20)) + 10;
    if ((t + i * 3) % 16 < 10) R(g, Math.round(wx), wy, 4, 1, 'rgba(255, 255, 255, 0.45)');
  }
  for (const s of seaLife) drawSeaLife(g, s);
  for (const b of boats) drawBoat(g, b);
}
