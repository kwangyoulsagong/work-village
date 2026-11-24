// 작은 마을 for Claude Code: what the game expects of a browser, without one.
// A software 2D canvas (the few calls the game makes: rectangles, image copies, a little text, alpha), a DOM of
// remembered stand-ins (so `$('coins').textContent = …` and `$('theirCode').value` work and can be read back),
// timers and animation frames run by our own clock, and `window.aquila` answered by the mod.
import { deflateRaw, inflateRaw } from './zip.js';

// Plain JS on purpose: the game is plain JS too, and this file has no `$` of the mod in it.

// ── Colours ────────────────────────────────────────────────────────────────────────────────────────────────────────

const colorCache = new Map();
/** '#rgb', '#rrggbb', 'rgb(…)', 'rgba(…)' → [r, g, b, a 0–1]; anything else is transparent. */
export function parseColor(c) {
  if (typeof c !== 'string') return [0, 0, 0, 0];
  let v = colorCache.get(c);
  if (v) return v;
  const s = c.trim();
  if (s[0] === '#') {
    const h = s.length === 4 ? s.slice(1).replace(/./g, (x) => x + x) : s.slice(1, 7);
    const n = parseInt(h, 16);
    v = [(n >> 16) & 255, (n >> 8) & 255, n & 255, s.length === 9 ? parseInt(s.slice(7, 9), 16) / 255 : 1];
  } else {
    const m = /^rgba?\(([^)]+)\)$/.exec(s);
    if (m) {
      const p = m[1].split(',').map((x) => parseFloat(x));
      v = [p[0] | 0, p[1] | 0, p[2] | 0, p.length > 3 ? p[3] : 1];
    } else v = s === 'white' ? [255, 255, 255, 1] : s === 'black' ? [0, 0, 0, 1] : [0, 0, 0, 0];
  }
  if (colorCache.size > 4000) colorCache.clear();
  colorCache.set(c, v);
  return v;
}

// ── A tiny pixel font for the ASCII the game writes ('z' for sleepers; names are drawn by the panel instead) ──────

const GLYPHS = {
  z: ['111', '001', '010', '100', '111'],
  Z: ['111', '001', '010', '100', '111'],
  '!': ['1', '1', '1', '0', '1'],
  '?': ['111', '001', '011', '000', '010'],
};

// ── The software canvas ────────────────────────────────────────────────────────────────────────────────────────────

export class SoftCanvas {
  constructor(w = 300, h = 150) {
    this._w = w;
    this._h = h;
    this.data = new Uint8ClampedArray(w * h * 4);
    this.style = {};
    this.dataset = {};
    this._ctx = null;
  }
  get width() {
    return this._w;
  }
  set width(v) {
    this._w = Math.max(1, v | 0);
    this.data = new Uint8ClampedArray(this._w * this._h * 4);
  }
  get height() {
    return this._h;
  }
  set height(v) {
    this._h = Math.max(1, v | 0);
    this.data = new Uint8ClampedArray(this._w * this._h * 4);
  }
  getContext() {
    return (this._ctx ??= new SoftContext(this));
  }
  // What the page code asks of a <canvas> element.
  closest() {
    return null;
  }
  getBoundingClientRect() {
    return { left: 0, top: 0, width: this._w, height: this._h, right: this._w, bottom: this._h };
  }
  addEventListener() {}
  removeEventListener() {}
  setAttribute() {}
  toDataURL() {
    return '';
  }
  get parentElement() {
    return { clientWidth: this._w };
  }
}

class SoftContext {
  constructor(canvas) {
    this.canvas = canvas;
    this.fillStyle = '#000000';
    this.strokeStyle = '#000000';
    this.globalAlpha = 1;
    this.lineWidth = 1;
    this.font = '10px sans-serif';
    this.imageSmoothingEnabled = false;
    this.textAlign = 'start';
    this.textBaseline = 'alphabetic';
    this._s = 1; // scale (whole numbers only: the game draws pixel art)
    this._tx = 0;
    this._ty = 0;
    this._stack = [];
  }
  save() {
    this._stack.push([this.fillStyle, this.strokeStyle, this.globalAlpha, this.lineWidth, this.font, this._s, this._tx, this._ty]);
  }
  restore() {
    const s = this._stack.pop();
    if (s) [this.fillStyle, this.strokeStyle, this.globalAlpha, this.lineWidth, this.font, this._s, this._tx, this._ty] = s;
  }
  setTransform(a = 1, _b = 0, _c = 0, _d = 1, e = 0, f = 0) {
    this._s = a;
    this._tx = e;
    this._ty = f;
  }
  translate(x, y) {
    this._tx += x * this._s;
    this._ty += y * this._s;
  }
  scale(k) {
    this._s *= k;
  }
  /** Device rectangle [x0, y0, x1, y1), clipped. */
  _rect(x, y, w, h) {
    const c = this.canvas;
    let x0 = Math.round(this._tx + x * this._s);
    let y0 = Math.round(this._ty + y * this._s);
    let x1 = Math.round(this._tx + (x + w) * this._s);
    let y1 = Math.round(this._ty + (y + h) * this._s);
    if (x1 < x0) [x0, x1] = [x1, x0];
    if (y1 < y0) [y0, y1] = [y1, y0];
    return [Math.max(0, x0), Math.max(0, y0), Math.min(c._w, x1), Math.min(c._h, y1)];
  }
  _fill(x0, y0, x1, y1, color) {
    const [r, g, b, a0] = parseColor(color);
    const a = a0 * this.globalAlpha;
    if (a <= 0 || x1 <= x0 || y1 <= y0) return;
    const d = this.canvas.data;
    const W = this.canvas._w;
    if (a >= 1) {
      for (let y = y0; y < y1; y++)
        for (let i = (y * W + x0) * 4, e = (y * W + x1) * 4; i < e; i += 4) {
          d[i] = r;
          d[i + 1] = g;
          d[i + 2] = b;
          d[i + 3] = 255;
        }
      return;
    }
    const k = 1 - a;
    for (let y = y0; y < y1; y++)
      for (let i = (y * W + x0) * 4, e = (y * W + x1) * 4; i < e; i += 4) {
        d[i] = r * a + d[i] * k;
        d[i + 1] = g * a + d[i + 1] * k;
        d[i + 2] = b * a + d[i + 2] * k;
        d[i + 3] = Math.min(255, a * 255 + d[i + 3] * k);
      }
  }
  fillRect(x, y, w, h) {
    const [x0, y0, x1, y1] = this._rect(x, y, w, h);
    this._fill(x0, y0, x1, y1, this.fillStyle);
  }
  clearRect(x, y, w, h) {
    const [x0, y0, x1, y1] = this._rect(x, y, w, h);
    const d = this.canvas.data;
    const W = this.canvas._w;
    for (let yy = y0; yy < y1; yy++) d.fill(0, (yy * W + x0) * 4, (yy * W + x1) * 4);
  }
  strokeRect(x, y, w, h) {
    const t = this.lineWidth || 1;
    const prev = this.fillStyle;
    this.fillStyle = this.strokeStyle;
    this.fillRect(x, y, w, t);
    this.fillRect(x, y + h - t, w, t);
    this.fillRect(x, y, t, h);
    this.fillRect(x + w - t, y, t, h);
    this.fillStyle = prev;
  }
  drawImage(src, ...a) {
    if (!src || !src.data) return; // only our own canvases
    let sx = 0, sy = 0, sw = src._w, sh = src._h, dx, dy, dw, dh;
    if (a.length === 2) [dx, dy] = a, (dw = sw), (dh = sh);
    else if (a.length === 4) [dx, dy, dw, dh] = a;
    else [sx, sy, sw, sh, dx, dy, dw, dh] = a;
    const [x0, y0, x1, y1] = this._rect(dx, dy, dw, dh);
    if (x1 <= x0 || y1 <= y0) return;
    // Device size of the destination before clipping, for the source step.
    const fullW = dw * this._s;
    const fullH = dh * this._s;
    const ox = Math.round(this._tx + dx * this._s);
    const oy = Math.round(this._ty + dy * this._s);
    const fx = sw / fullW;
    const fy = sh / fullH;
    const s = src.data;
    const d = this.canvas.data;
    const W = this.canvas._w;
    const SW = src._w;
    const ga = this.globalAlpha;
    const plain = ga >= 1 && fx === 1 && fy === 1;
    for (let y = y0; y < y1; y++) {
      const syy = Math.floor(sy + (y - oy) * fy);
      if (syy < 0 || syy >= src._h) continue;
      if (plain) {
        // Same size, fully opaque copy where the source is opaque: row at a time.
        const sx0 = sx + (x0 - ox);
        let si = (syy * SW + sx0) * 4;
        let di = (y * W + x0) * 4;
        for (let x = x0; x < x1; x++, si += 4, di += 4) {
          const sa = s[si + 3];
          if (sa === 255) {
            d[di] = s[si];
            d[di + 1] = s[si + 1];
            d[di + 2] = s[si + 2];
            d[di + 3] = 255;
          } else if (sa) {
            const a = sa / 255, k = 1 - a;
            d[di] = s[si] * a + d[di] * k;
            d[di + 1] = s[si + 1] * a + d[di + 1] * k;
            d[di + 2] = s[si + 2] * a + d[di + 2] * k;
            d[di + 3] = Math.min(255, sa + d[di + 3] * k);
          }
        }
        continue;
      }
      for (let x = x0; x < x1; x++) {
        const sxx = Math.floor(sx + (x - ox) * fx);
        if (sxx < 0 || sxx >= SW) continue;
        const si = (syy * SW + sxx) * 4;
        const a = (s[si + 3] / 255) * ga;
        if (a <= 0) continue;
        const di = (y * W + x) * 4, k = 1 - a;
        d[di] = s[si] * a + d[di] * k;
        d[di + 1] = s[si + 1] * a + d[di + 1] * k;
        d[di + 2] = s[si + 2] * a + d[di + 2] * k;
        d[di + 3] = Math.min(255, a * 255 + d[di + 3] * k);
      }
    }
  }
  _size() {
    return parseFloat(/(\d+(?:\.\d+)?)px/.exec(this.font)?.[1] ?? '10');
  }
  measureText(text) {
    return { width: String(text).length * this._size() * 0.6 };
  }
  /** ASCII marks only ('z' over a sleeper); other text is the panel's to show. */
  fillText(text, x, y) {
    const t = String(text);
    if (!/^[zZ!?]+$/.test(t)) return;
    let cx = x;
    for (const ch of t) {
      const gl = GLYPHS[ch];
      gl.forEach((row, ry) => {
        for (let rx = 0; rx < row.length; rx++) if (row[rx] === '1') this.fillRect(cx + rx, y - 5 + ry, 1, 1);
      });
      cx += gl[0].length + 1;
    }
  }
  // Paths aren't used by the game; harmless no-ops if a later change adds one.
  beginPath() {}
  closePath() {}
  moveTo() {}
  lineTo() {}
  arc() {}
  rect() {}
  fill() {}
  stroke() {}
  clip() {}
}

// ── The DOM: elements that remember what's set on them ─────────────────────────────────────────────────────────────

class FakeElement {
  constructor(tag = 'div', id = '') {
    this.tagName = tag.toUpperCase();
    this.id = id;
    this.hidden = false;
    this.value = '';
    this.disabled = false;
    this.className = '';
    this.dataset = {};
    this.style = {};
    this.children = [];
    this._text = '';
    this._on = {};
    this.classList = { add() {}, remove() {}, toggle() {}, contains: () => false };
  }
  get textContent() {
    return this._text;
  }
  set textContent(v) {
    this._text = String(v ?? '');
    this.children = [];
  }
  get childElementCount() {
    return this.children.length;
  }
  get firstElementChild() {
    return this.children[0] ?? null;
  }
  get parentElement() {
    return { clientWidth: 400 };
  }
  get clientWidth() {
    return 400;
  }
  append(...xs) {
    for (const x of xs) this.children.push(x);
  }
  prepend(...xs) {
    this.children.unshift(...xs);
  }
  replaceChildren(...xs) {
    this.children = xs;
  }
  remove() {}
  after() {}
  before() {}
  setAttribute(k, v) {
    this[`attr:${k}`] = v;
  }
  getAttribute(k) {
    return this[`attr:${k}`] ?? null;
  }
  removeAttribute(k) {
    delete this[`attr:${k}`];
  }
  addEventListener(type, fn) {
    (this._on[type] ??= []).push(fn);
  }
  removeEventListener() {}
  dispatchEvent(ev) {
    for (const fn of this._on[ev?.type] ?? []) fn(ev);
    return true;
  }
  click() {
    this.dispatchEvent({ type: 'click', preventDefault() {}, stopPropagation() {}, target: this });
  }
  focus() {}
  blur() {}
  select() {}
  closest() {
    return null;
  }
  querySelector() {
    return null;
  }
  querySelectorAll() {
    return [];
  }
  getBoundingClientRect() {
    return { left: 0, top: 0, width: 400, height: 300, right: 400, bottom: 300 };
  }
}

// ── The host: one game's world of stand-ins ────────────────────────────────────────────────────────────────────────

/**
 * Everything the game's files read from the global scope, plus the handles the mod drives it by.
 * `store` is the save (get/set by key), `usage()` the current list in Aquila's shape.
 */
export function makeHost({ store, usage, hidden = [] }) {
  const startsHidden = new Set(hidden);
  const els = new Map();
  const listeners = new Map(); // aquila events
  let now = 0; // our clock, in ms
  let nextId = 1;
  const timers = new Map(); // id → { at, fn, every }
  let frameCb = null;
  const world = new SoftCanvas(240, 192);

  const document = {
    visibilityState: 'visible',
    hidden: false,
    body: new FakeElement('body'),
    head: new FakeElement('head'),
    getElementById(id) {
      if (id === 'world') return world;
      if (id === 'mini') return (els.get('mini') ?? els.set('mini', new SoftCanvas(240, 22)).get('mini'));
      let e = els.get(id);
      if (!e) {
        els.set(id, (e = new FakeElement('div', id)));
        e.hidden = startsHidden.has(id);
      }
      return e;
    },
    createElement(tag) {
      return tag === 'canvas' ? new SoftCanvas() : new FakeElement(tag);
    },
    createTextNode: (t) => ({ textContent: String(t) }),
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener() {},
    removeEventListener() {},
  };
  document.body.dataset = {};

  const setTimeout_ = (fn, ms = 0) => {
    const id = nextId++;
    timers.set(id, { at: now + Math.max(0, ms), fn });
    return id;
  };
  const setInterval_ = (fn, ms = 0) => {
    const id = nextId++;
    timers.set(id, { at: now + Math.max(1, ms), fn, every: Math.max(1, ms) });
    return id;
  };
  const clear = (id) => void timers.delete(id);

  const aquila = {
    on(name, cb) {
      if (!listeners.has(name)) listeners.set(name, new Set());
      listeners.get(name).add(cb);
      return () => listeners.get(name).delete(cb);
    },
    info: async () => ({ host: 'claude-code' }),
    power: async () => ({ saver: false, onBattery: false }),
    usage: async () => usage(),
    storage: {
      get: async (k) => (await store.get(k)) ?? null,
      set: async (k, v) => store.set(k, v),
      remove: async (k) => store.set(k, undefined),
      keys: async () => [],
    },
    chip: async () => {},
    notify: async () => {},
    system: async () => ({}),
    sessions: async () => ({ counts: {}, total: 0 }),
  };

  const window = {
    devicePixelRatio: 1,
    innerHeight: 900,
    innerWidth: 400,
    addEventListener() {},
    removeEventListener() {},
    VILLAGE_SOURCE: 'claude-code',
    VILLAGE_ZIP: { deflate: deflateRaw, inflate: inflateRaw }, // no CompressionStream here
  };

  const env = {
    document,
    window,
    aquila,
    navigator: { platform: 'claude-code', clipboard: { writeText: async () => Promise.reject(new Error('no clipboard')) } },
    requestAnimationFrame: (fn) => ((frameCb = fn), 1),
    cancelAnimationFrame: () => void (frameCb = null),
    setTimeout: setTimeout_,
    clearTimeout: clear,
    setInterval: setInterval_,
    clearInterval: clear,
    ResizeObserver: class {
      observe() {}
      disconnect() {}
    },
    IntersectionObserver: class {
      observe() {}
      disconnect() {}
    },
    // The invite codes: real compression where the runtime has it, else JSON in base64 (still a valid code here).
    CompressionStream: globalThis.CompressionStream,
    DecompressionStream: globalThis.DecompressionStream,
    Blob: globalThis.Blob,
    Response: globalThis.Response,
    TextEncoder: globalThis.TextEncoder,
    TextDecoder: globalThis.TextDecoder,
    btoa: globalThis.btoa,
    atob: globalThis.atob,
  };

  return {
    env,
    world,
    el: (id) => document.getElementById(id),
    /** Raise an aquila event ('usage', 'visible', 'power'). */
    emit(name, data) {
      for (const cb of listeners.get(name) ?? []) cb(data);
    },
    /** Move our clock to `t` ms: due timers run, then the animation frame (if the game asked for one). */
    advance(t) {
      now = Math.max(now, t);
      for (let guard = 0; guard < 200; guard++) {
        let due = null;
        for (const [id, tm] of timers) if (tm.at <= now && (!due || tm.at < due[1].at)) due = [id, tm];
        if (!due) break;
        const [id, tm] = due;
        if (tm.every) tm.at += tm.every * Math.max(1, Math.ceil((now - tm.at + 1) / tm.every));
        else timers.delete(id);
        try {
          tm.fn();
        } catch (e) {
          console.error?.('village timer', e);
        }
      }
      const cb = frameCb;
      frameCb = null;
      if (cb) cb(now);
    },
    get now() {
      return now;
    },
  };
}
