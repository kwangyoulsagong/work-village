// The Claude Code mod's engine, in plain Node (no browser): the game from claude-mod/hooks/game.gen.js on the
// stand-ins of claude-mod/hooks/host.js. Grows a town from usage, runs a few seconds of frames, saves PNGs of the
// view, plays chaos, round-trips a visit code. Run ./build-claude-mod.sh first.
// Usage: node tools/mod-engine-test.mjs [out dir]
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = process.argv[2] || path.join(here, 'out');
fs.mkdirSync(OUT, { recursive: true });
const { makeHost } = await import(path.join(here, '../claude-mod/hooks/host.js'));
const { makeGame, HIDDEN_IDS } = await import(path.join(here, '../claude-mod/hooks/game.gen.js'));

function png(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1);
  const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (b) => { let c = 0xffffffff; for (const x of b) c = crcTable[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

const check = [];
const ok = (name, cond) => check.push((cond ? 'ok   ' : 'FAIL ') + name);
const saved = {};
let usage = [{ account: 'claude-code', kind: 'claude', weekly: 10, fiveHour: 20, near: false }];
const host = makeHost({ store: { get: async (k) => saved[k], set: async (k, v) => void (saved[k] = JSON.parse(JSON.stringify(v ?? null))) }, usage: () => usage, hidden: HIDDEN_IDS });
const t0 = Date.now();
const game = makeGame(host.env);
let t = 0;
const run = async (ms, step = 125) => { for (const end = t + ms; t < end; ) { t += step; host.advance(t); await new Promise((r) => setImmediate(r)); } };
await run(500);
ok('game boots without a browser', game.S && game.MODE === 'life');

// Pick a character, then grow from usage.
game.$('modeLife').click();
const pick = game.$('pick');
ok('asks for a character first', !pick.hidden || !game.S.gender);
// The pick buttons are found with querySelectorAll in the page; here we set what the click would.
Object.assign(game.S, { gender: 'f', traits: { health: 4, green: 4, charm: 4, trade: 4, luck: 4 } });
game.wake();
await run(1000);
const before = game.S.coins;
usage = [{ account: 'claude-code', kind: 'claude', weekly: 25, fiveHour: 40, near: false }];
host.emit('usage', usage);
await run(500);
ok(`usage grows the town (coins ${Math.round(before)} → ${Math.round(game.S.coins)})`, game.S.coins > before + 100);

// A grown town to look at.
Object.assign(game.S, { era: 4, houses: 16, coins: 2000, chickens: 6, cows: 3, sheep: 3, lastDay: new Date().toLocaleDateString('sv') });
game.S.friends = Array.from({ length: 16 }, () => ({ f: 1, day: '' }));
game.wake();
await run(3000);
const frameMs = [];
for (let i = 0; i < 40; i++) { const a = performance.now(); t += 125; host.advance(t); frameMs.push(performance.now() - a); }
frameMs.sort((a, b) => a - b);
ok(`frame time p50 ${frameMs[20].toFixed(1)} ms, p95 ${frameMs[38].toFixed(1)} ms (8 frames a second)`, frameMs[38] < 40);
const w = host.world;
fs.writeFileSync(path.join(OUT, 'mod-engine-town.png'), png(w.width, w.height, w.data));
const px = new Set(); for (let i = 0; i < w.data.length; i += 4 * 7) px.add((w.data[i] << 16) | (w.data[i + 1] << 8) | w.data[i + 2]);
ok(`the view is drawn (${w.width}×${w.height}, ${px.size} colours)`, w.width === 240 && w.height === 192 && px.size > 40);
ok('saved through the mod store', !!saved.save && saved.save.houses === 16);

// Chaos: break a house; the life town stays.
game.enterChaos(3);
await run(800);
const lotX = game.S.lots?.[0]?.x;
game.chaosTool = 'smash';
game.useTool((game.S.lots?.[0]?.x ?? 70) * game.T + game.T, 7 * game.T - 16);
game.chaosTool = 'nuke';
game.useTool(game.chaosCam + 120, 6 * game.T);
await run(1500);
fs.writeFileSync(path.join(OUT, 'mod-engine-chaos.png'), png(w.width, w.height, w.data));
ok(`chaos tools work (wrecked ${game.S.wrecked.length})`, game.MODE === 'chaos' && game.S.wrecked.length >= 1);
game.leaveChaos();
await run(300);
ok('back to the untouched life town', game.MODE === 'life' && game.S.houses === 16 && !(game.S.wrecked?.length));

// Visit codes work here too.
game.nick = '모드';
const code = await game.myCode();
ok(`invite code made (${code.length} chars)`, code.startsWith('작은마을1:'));
console.log(check.join('\n'));
console.log(JSON.stringify({ failed: check.filter((x) => x.startsWith('FAIL')).length, ms: Date.now() - t0 }));
process.exit(0);
