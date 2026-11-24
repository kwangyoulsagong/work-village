// 작은 마을 — the photo album, the yearly awards, residents' wishes, real holidays and rare animal colours.
// Loaded before game.js: nothing here touches game.js at load time, only when called.
'use strict';

// ── Photo album: the town at its big moments (and when you press the button) ─────────────────────────────────────

const ALBUM_MAX = 12;
let album = []; // { day, era, caption, src } — kept under its own storage key, apart from the save

async function loadAlbum() {
  try {
    const a = await aquila.storage.get('album');
    if (Array.isArray(a)) album = a;
  } catch {
    /* no album yet */
  }
}
/** A photo of what's on screen now, small (240 × 192 WebP), with a caption. */
function snapshot(caption) {
  if (MODE !== 'life' || typeof document === 'undefined') return;
  try {
    if (cache.dirty) paintCache();
    frame();
    const c = document.createElement('canvas');
    c.width = VIEW_W;
    c.height = H;
    const g = c.getContext('2d');
    if (!g) return;
    g.imageSmoothingEnabled = false;
    g.drawImage(canvas, 0, 0, VIEW_W, H);
    const src = c.toDataURL('image/webp', 0.7);
    if (!src.startsWith('data:image')) return;
    album.unshift({ day: S.days, era: S.era, caption, src });
    album.length = Math.min(album.length, ALBUM_MAX);
    void aquila.storage.set('album', album).catch(() => {
      album.pop(); // too big for the storage: keep fewer
      void aquila.storage.set('album', album).catch(() => {});
    });
    paintAlbum();
  } catch {
    /* a photo is never worth an error */
  }
}
/** Big moments take a photo a moment later, once the scene shows them. */
function photoSoon(caption) {
  setTimeout(() => snapshot(caption), 1500);
}
function paintAlbum() {
  const list = document.getElementById('albumList');
  if (!list) return;
  const tab = document.getElementById('albumTab');
  if (tab) tab.textContent = `앨범 ${album.length}`;
  if (list.closest('.tab-body')?.hidden) return;
  if (!album.length) return list.replaceChildren(el('li', 'empty', '큰 일이 생기면 사진이 남아요. 지금 찍어도 돼요.'));
  list.replaceChildren(
    ...album.map((p) => {
      const li = el('li', 'photo');
      const img = el('img');
      img.src = p.src;
      img.alt = p.caption;
      li.append(img, el('span', '', `${p.day}일차 · ${p.caption}`));
      return li;
    }),
  );
}

// ── Yearly awards: every 28 days (four seasons), the town hands out prizes ─────────────────────────────────────────

const YEAR_DAYS = 28;
function awards() {
  const n = occupied();
  if (n < 2) return;
  let best = -1;
  let bestPay = -1;
  for (let i = 0; i < n; i++) {
    if (i === S.spouse) continue;
    const p = jobPay(jobFor(i), villagerTraits(i));
    if (p > bestPay) [best, bestPay] = [i, p];
  }
  const friends = (S.friends ?? []).map((f, i) => [i, f?.f ?? 0]).filter(([i]) => i < n && i !== S.spouse);
  const pal = friends.sort((a, b) => b[1] - a[1])[0];
  const herd = SHOP_ANIMALS.map((a) => [a.name, S[a.key] ?? 0]).sort((a, b) => b[1] - a[1])[0];
  const year = Math.floor(S.days / YEAR_DAYS);
  const parts = [
    best >= 0 && `올해의 일꾼 ${FAMILIES[best].single}(${jobFor(best).name})`,
    pal && `올해의 단짝 ${FAMILIES[pal[0]].single}`,
    `올해의 새 이웃 ${FAMILIES[n - 1].family}`,
    herd && herd[1] > 0 && `올해의 동물 ${herd[0]}`,
  ].filter(Boolean);
  S.awards = [{ year, day: S.days, text: parts.join(' · ') }, ...(S.awards ?? [])].slice(0, 10);
  S.coins += 10 * (1 + S.era);
  story(`🏆 ${year}년차 시상식: ${parts.join(' · ')}. 축하금 🪙${10 * (1 + S.era)}.`);
  S.festival = today();
  photoSoon(`${year}년차 시상식`);
}

// ── Wishes: a neighbour hopes for something; get it for them (build tab) and they're thankful ─────────────────────

function wishDaily() {
  S.wishes = (S.wishes ?? []).filter((w) => w.until >= S.days && w.i < occupied());
  if (S.wishes.length >= 2 || occupied() < 1 || Math.random() > 0.6) return;
  const i = Math.floor(Math.random() * occupied());
  if (i === S.spouse || S.wishes.some((w) => w.i === i)) return;
  const decor = DECOR.filter((d) => d.era <= S.era);
  const pens = SHOP_ANIMALS.filter((a) => a.era <= S.era && (S[a.key] ?? 0) < PEN_MAX);
  const pickAnimal = pens.length && Math.random() < 0.4;
  const it = pickAnimal ? pens[Math.floor(Math.random() * pens.length)] : decor[Math.floor(Math.random() * decor.length)];
  if (!it) return;
  const w = pickAnimal ? { i, kind: 'animal', id: it.key, name: it.name } : { i, kind: 'decor', id: it.id, name: it.name };
  S.wishes.push({ ...w, until: S.days + 3 });
  story(`💭 ${FAMILIES[i].single}이(가) 마을에 ${w.name}이(가) 있으면 좋겠대요. (짓기 탭)`);
}
/** Something was bought or placed: does it make a wish come true? */
function wishDone(kind, id) {
  const w = (S.wishes ?? []).find((x) => x.kind === kind && x.id === id);
  if (!w) return;
  S.wishes = S.wishes.filter((x) => x !== w);
  const gift = 15 + 10 * S.era;
  S.coins += gift;
  S.happy = Math.min(100, S.happy + 10);
  if (S.friends[w.i]) S.friends[w.i].f = (S.friends[w.i].f ?? 0) + 2;
  story(`💌 ${FAMILIES[w.i].single}이(가) ${w.name} 고맙다고 편지를 보냈어요. 🪙${gift}과 우정이 늘었어요.`);
}
/** Build-tab rows: each wish, with the button that grants it. */
function wishRows() {
  const list = (S.wishes ?? []).filter((w) => w.i < occupied());
  if (!list.length) return [];
  const out = [el('li', 'group', '주민 소원')];
  for (const w of list) {
    const li = el('li', 'buy');
    const text = el('div', 'buy__text');
    text.append(el('b', '', `${FAMILIES[w.i].single}: ${w.name}`), el('span', 'buy__note', `${Math.max(0, w.until - S.days)}일 남았어요 · 들어주면 코인과 우정`));
    const item = w.kind === 'decor' ? DECOR.find((d) => d.id === w.id) : SHOP_ANIMALS.find((a) => a.key === w.id);
    const btn = el('button', 'btn primary buy__btn', `${fmt(item?.cost ?? 0)}코인`);
    btn.disabled = !item || S.coins < item.cost;
    btn.addEventListener('click', () => {
      if (!item || S.coins < item.cost) return;
      if (w.kind === 'decor') pick(item);
      else {
        buyAnimal(item.key, item.cost, item.name);
        save();
      }
      paintUi();
    });
    li.append(text, btn);
    out.push(li);
  }
  return out;
}
/** A thought bubble over whoever is wishing. */
function drawWishes(g) {
  for (const w of S.wishes ?? []) {
    const p = people.find((e) => e.home === w.i && e.kind === 'villager' && !e.small && !e.elder && !e.look?.elder);
    if (!p || !onScreen(p.x)) continue;
    const x = Math.round(p.x);
    const y = Math.round(p.y) - 30 + (Math.floor(clockTick() / 6) % 2);
    box(g, x - 4, y, 9, 7, '#ffffff');
    R(g, x - 1, y + 7, 2, 1, '#ffffff');
    R(g, x - 2, y + 9, 1, 1, '#ffffff');
    R(g, x - 1, y + 2, 1, 1, '#ff6b9a');
    R(g, x + 1, y + 2, 1, 1, '#ff6b9a');
    R(g, x - 2, y + 3, 5, 1, '#ff6b9a');
    R(g, x - 1, y + 4, 3, 1, '#ff6b9a');
    R(g, x, y + 5, 1, 1, '#ff6b9a');
  }
}

// ── Real holidays: the town celebrates the days you do ────────────────────────────────────────────────────────────

/** Seollal and Chuseok move with the moon: the day itself (the town keeps the day before and after, too). */
const LUNAR = {
  2026: { seol: '02-17', chuseok: '09-25' },
  2027: { seol: '02-07', chuseok: '09-15' },
  2028: { seol: '01-26', chuseok: '10-03' },
  2029: { seol: '02-13', chuseok: '09-22' },
  2030: { seol: '02-03', chuseok: '09-12' },
};
const HOLIDAY_LINES = {
  seol: '설날이에요! 마을 사람들이 한복을 입고 세배를 다녀요.',
  chuseok: '추석이에요! 보름달 아래 송편을 빚어요.',
  newyear: '새해 첫날이에요! 밤하늘에 불꽃이 터져요.',
  cherry: '벚꽃이 피었어요! 꽃잎이 바람에 날려요.',
  children: '어린이날이에요! 하늘에 풍선이 날아올라요.',
  halloween: '핼러윈이에요! 집집마다 호박등을 켰어요.',
  xmas: '메리 크리스마스! 광장에 큰 트리가 섰어요.',
  yearend: '한 해의 마지막 날이에요. 다들 수고했어요!',
};
const HOLIDAY_NAMES = { seol: '설날', chuseok: '추석', newyear: '새해', cherry: '벚꽃 주간', children: '어린이날', halloween: '핼러윈', xmas: '크리스마스', yearend: '연말' };

function holidayOn(date = new Date()) {
  const md = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const near = (target) => {
    if (!target) return false;
    const [m, d] = target.split('-').map(Number);
    const t = new Date(date.getFullYear(), m - 1, d);
    return Math.abs((new Date(date.getFullYear(), date.getMonth(), date.getDate()) - t) / 86_400_000) <= 1;
  };
  const lunar = LUNAR[date.getFullYear()];
  if (near(lunar?.seol)) return 'seol';
  if (near(lunar?.chuseok)) return 'chuseok';
  if (md === '01-01') return 'newyear';
  if (md >= '03-28' && md <= '04-08') return 'cherry';
  if (md === '05-05') return 'children';
  if (md === '10-31') return 'halloween';
  if (md === '12-24' || md === '12-25') return 'xmas';
  if (md === '12-31') return 'yearend';
  return null;
}
let holiday = null;
/** Once a day: is it a holiday? Then a festival, a story and a photo. */
function checkHoliday() {
  holiday = holidayOn();
  if (!holiday || MODE !== 'life' || !S.gender) return;
  if (S.holidayDay === today()) return;
  S.holidayDay = today();
  S.festival = today();
  story(`🎉 ${HOLIDAY_LINES[holiday]}`);
  photoSoon(HOLIDAY_NAMES[holiday]);
}

let petals = []; // cherry petals, balloons, snow on Christmas
function holidayTick(k) {
  if (!holiday) return;
  const kind = holiday === 'cherry' ? 'petal' : holiday === 'children' ? 'balloon' : holiday === 'xmas' ? 'snow' : null;
  if (!kind) return;
  if (petals.length < (kind === 'balloon' ? 8 : 30) && Math.random() < 0.5 * k)
    petals.push({
      x: viewX + Math.random() * VIEW_W,
      y: kind === 'balloon' ? H + 10 : -4,
      vx: kind === 'petal' ? 0.4 + Math.random() * 0.4 : (Math.random() - 0.5) * 0.3,
      vy: kind === 'balloon' ? -0.5 - Math.random() * 0.4 : 0.4 + Math.random() * 0.4,
      c: kind === 'balloon' ? ['#ff6b6b', '#ffd23f', '#5ab4e0', '#8a6cc9', '#5cb84e'][Math.floor(Math.random() * 5)] : null,
      kind,
    });
  petals = petals.filter((p) => {
    p.x += (p.vx + Math.sin((p.y + p.x) / 20) * 0.2) * k;
    p.y += p.vy * k;
    return p.y > -20 && p.y < H + 20;
  });
}
function drawHoliday(g) {
  if (!holiday || MODE === 'chaos') return;
  const night = isNight();
  const blink = Math.floor(clockTick() / 4) % 2;
  // Lanterns (Seollal, Chuseok) or lights (Christmas, year's end) strung along the road near the square.
  if (['seol', 'chuseok', 'xmas', 'yearend', 'newyear'].includes(holiday)) {
    const from = (PLAZA.x - 10) * T;
    const to = (PLAZA.x + 16) * T;
    for (let x = from; x < to; x += 12) {
      if (x < viewX - 12 || x > viewX + VIEW_W + 12) continue;
      const sag = Math.round(Math.sin(((x - from) / 24) * Math.PI) * 2);
      const y = ROAD_Y * T - 22 + sag;
      R(g, x, y - 1, 12, 1, '#6a5a50');
      const lantern = holiday === 'seol' || holiday === 'chuseok';
      const c = lantern ? ((x / 12) % 2 ? '#e8504a' : '#f0a030') : ['#ff5a5a', '#5ad75a', '#ffd23f', '#5ab4ff'][(x / 12 + blink) % 4];
      if (lantern) {
        box(g, x + 4, y, 4, 5, c, '#8a3a2a');
        if (night) disc(g, x + 6, y + 2, 4, 'rgba(255, 200, 120, 0.25)');
      } else R(g, x + 5, y, 2, 2, c);
    }
  }
  // A full moon for Chuseok.
  if (holiday === 'chuseok' && night) {
    disc(g, viewX + VIEW_W - 34, 26, 11, 'rgba(255, 240, 190, 0.25)');
    disc(g, viewX + VIEW_W - 34, 26, 8, '#fff2c4');
  }
  // Pumpkins by the nearest houses.
  if (holiday === 'halloween')
    for (let i = 0; i < Math.min(8, S.houses); i++) {
      const tx = lotX(i);
      if (!onScreen(tx * T)) continue;
      const x = tx * T + 20;
      const y = lotBottom(i) - 9;
      box(g, x, y, 11, 9, '#f08a2a', '#a0501a');
      R(g, x + 3, y + 1, 1, 7, '#d8701e'); // ridges
      R(g, x + 7, y + 1, 1, 7, '#d8701e');
      R(g, x + 5, y - 3, 2, 3, '#3f7a3a');
      R(g, x + 7, y - 2, 2, 1, '#5a9a4a'); // leaf
      if (night || blink) {
        if (night) disc(g, x + 5, y + 4, 7, 'rgba(255, 170, 60, 0.18)');
        R(g, x + 2, y + 2, 2, 2, '#ffe066');
        R(g, x + 7, y + 2, 2, 2, '#ffe066');
        R(g, x + 2, y + 6, 7, 1, '#ffe066');
        R(g, x + 3, y + 5, 1, 1, '#ffe066');
        R(g, x + 7, y + 5, 1, 1, '#ffe066');
      }
    }
  // A Christmas tree in the square.
  if (holiday === 'xmas') {
    const x = (PLAZA.x + 5) * T + 4;
    const y = (PLAZA.y + 2) * T - 2;
    if (night) disc(g, x, y - 22, 20, 'rgba(255, 220, 140, 0.12)');
    // Five tiers, narrow at the top; a pot under the trunk.
    for (let i = 0; i < 5; i++) box(g, x - 3 - i * 3, y - 40 + i * 7, 7 + i * 6, 8, '#2f7a3a', '#1f5a2a');
    R(g, x - 2, y - 5, 5, 3, '#7a4a2a');
    box(g, x - 4, y - 3, 9, 5, '#c8402e', '#8a2a1e');
    // Garland zigzags and blinking baubles.
    for (let i = 0; i < 4; i++) for (let k = -4 - i * 3; k <= 4 + i * 3; k += 2) R(g, x + k, y - 32 + i * 7 + ((k >> 1) & 1), 1, 1, '#f2d27a');
    const lights = ['#ff5a5a', '#5ab4ff', '#ffd23f', '#ff8ac0'];
    for (let t = 1, n = 0; t < 5; t++)
      for (let k = 0; k <= t; k++, n++) R(g, x - t * 3 + Math.round((k * t * 6) / Math.max(1, t)) - (k ? 1 : 0), y - 38 + t * 7 + (k & 1) * 2, 2, 2, lights[(n + blink) % 4]);
    // The star.
    R(g, x, y - 46, 1, 5, '#ffd23f');
    R(g, x - 2, y - 44, 5, 1, '#ffd23f');
    R(g, x - 1, y - 45, 3, 3, '#ffd23f');
    if (night || blink) disc(g, x, y - 44, 4, 'rgba(255, 230, 120, 0.3)');
    // Presents.
    box(g, x - 13, y - 3, 6, 5, '#5ab4ff', '#2a6a9a');
    R(g, x - 11, y - 3, 1, 5, '#ffffff');
    box(g, x + 7, y - 2, 5, 4, '#ffd23f', '#a0801a');
    R(g, x + 9, y - 2, 1, 4, '#c8402e');
  }
  for (const p of petals) {
    const x = Math.round(p.x);
    const y = Math.round(p.y);
    if (p.kind === 'petal') R(g, x, y, 2, 1, '#ffc0d6');
    else if (p.kind === 'snow') R(g, x, y, 1, 1, '#ffffff');
    else {
      disc(g, x, y, 3, p.c);
      R(g, x, y + 3, 1, 6, '#8a8a92');
    }
  }
}

// ── Rare colours: now and then an animal is born golden, black, white or pink ─────────────────────────────────────

const VARIANTS = [
  { id: 'golden', name: '황금', to: (c) => mixHex(c, '#ffcf3a', 0.55) },
  { id: 'black', name: '까만', to: (c) => mixHex(c, '#2a2630', 0.65) },
  { id: 'white', name: '새하얀', to: (c) => mixHex(c, '#ffffff', 0.7) },
  { id: 'pink', name: '분홍', to: (c) => mixHex(c, '#ff8ac0', 0.5) },
];
const ANIMAL_NAMES = {
  chicken: '닭', cow: '소', sheep: '양', pig: '돼지', goat: '염소', horse: '말', alpaca: '알파카', donkey: '당나귀', turkey: '칠면조',
  duck: '오리', rabbit: '토끼', deer: '사슴', fox: '여우', squirrel: '다람쥐', frog: '개구리', cat: '고양이', hedgehog: '고슴도치',
  turtle: '거북이', swan: '백조', boar: '멧돼지', bear: '곰', raccoon: '너구리', otter: '수달', magpie: '까치', gorani: '고라니',
};
const VARIANT_TOTAL = Object.keys(ANIMAL_NAMES).length * VARIANTS.length;
function mixHex(a, b, t) {
  if (typeof a !== 'string' || a[0] !== '#' || a.length !== 7) return a;
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (s) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
  return `#${[16, 8, 0].map((s) => ch(s).toString(16).padStart(2, '0')).join('')}`;
}
/** The same animal (kind + how many of its kind came before it) keeps its colour for this map. */
function variantFor(kind, n) {
  if (!ANIMAL_NAMES[kind]) return null;
  let h = (S.mapSeed ?? 0) + n * 7919;
  for (const ch of kind) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const r = rng(h);
  if (r() >= 0.05) return null;
  return VARIANTS[Math.floor(r() * VARIANTS.length)].id;
}
/** A palette in the animal's rare colour (outlines and eyes stay). */
const variantCache = new Map();
function variantPal(pal, v) {
  let m = variantCache.get(pal);
  if (!m) variantCache.set(pal, (m = new Map()));
  if (m.has(v)) return m.get(v);
  const vv = VARIANTS.find((x) => x.id === v);
  const out = Object.fromEntries(Object.entries(pal).map(([k, c]) => [k, ['o', 'e', 'n', 'E'].includes(k) || !vv ? c : vv.to(c)]));
  m.set(v, out);
  return out;
}
/** Tag the town's animals with their colours; a story the first time a colour shows up. */
function tagVariants(list) {
  const count = {};
  for (const a of list) {
    const n = (count[a.kind] = (count[a.kind] ?? 0) + 1);
    a.variant = variantFor(a.kind, n);
    if (!a.variant || MODE !== 'life') continue;
    const key = `${a.kind}:${a.variant}`;
    S.variants ??= [];
    if (S.variants.includes(key)) continue;
    S.variants.push(key);
    story(`✨ 희귀한 ${VARIANTS.find((v) => v.id === a.variant).name} ${ANIMAL_NAMES[a.kind]}이(가) 나타났어요!`);
  }
}
