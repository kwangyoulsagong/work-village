// Offscreen: draws the extension icon as pixel art (a 32 × 32 grid, and a simpler 16 × 16 one for the smallest
// size) and writes aquila/icon.png and chrome/icons/icon{16,32,48,128}.png. Usage: npx electron tools/icon.js
const { app, BrowserWindow } = require('electron');
const path = require('path'), fs = require('fs');
const ROOT = path.join(__dirname, '..');
app.dock?.hide();
app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 200, height: 200, show: false, webPreferences: { offscreen: true } });
  await win.loadURL('data:text/html,<canvas id=c></canvas>');
  const out = await win.webContents.executeJavaScript(`(() => {
    const P = {
      K: '#2b1d2e', B: '#8a5a32', b: '#c08a4a', d: '#5a3a20', h: '#e0b070',
      s: '#7ccaf0', S: '#a8def7', z: '#cdeefc', c: '#ffffff',
      y: '#ffd23f', Y: '#fff3a8',
      g: '#6cbf4a', G: '#3f8a3a', l: '#9be070', e: '#4fa43e',
      r: '#e0503a', R: '#a8382a', o: '#ff8a64',
      w: '#f6e7c4', W: '#d9c296', n: '#7a4a2a', N: '#5a3420', v: '#8fe0ff', V: '#ffe48a',
      t: '#45a84e', T: '#2d7a3c', q: '#6cc85a', u: '#7a4a2a',
      f: '#ff7aa8', F: '#ffe066', m: '#eef3f7', M: '#d4dde6', p: '#b0784a',
    };
    function draw(n, paint) {
      const px = Array.from({ length: n }, () => Array(n).fill(null));
      const set = (x, y, k) => { if (x >= 0 && y >= 0 && x < n && y < n) px[y][x] = k; };
      const rect = (x, y, w, h, k) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(x + i, y + j, k); };
      paint({ set, rect, px, n });
      return px;
    }
    // The big one: a framed little town under a summer sky.
    const big = draw(32, ({ set, rect, px, n }) => {
      // Sky, lighter towards the hills.
      rect(2, 2, 28, 28, 's');
      rect(2, 11, 28, 5, 'S');
      rect(2, 15, 28, 3, 'z');
      // The sun with a soft halo, top right.
      for (const [x, y] of [[24,4],[25,4],[23,5],[24,5],[25,5],[26,5],[23,6],[24,6],[25,6],[26,6],[24,7],[25,7]]) set(x, y, 'y');
      set(24, 5, 'Y'); set(24, 6, 'Y');
      for (const [x, y] of [[22,4],[27,4],[22,7],[27,7],[24,3],[25,3],[24,8],[25,8],[21,5],[28,6]]) set(x, y, 'Y');
      // A cloud, top left.
      rect(5, 6, 7, 2, 'c'); rect(6, 5, 3, 1, 'c'); rect(9, 4, 2, 2, 'c'); set(4, 7, 'c'); set(12, 7, 'M'); rect(5, 8, 7, 1, 'M');
      // Far hills.
      for (let x = 2; x < 30; x++) { const top = 16 + Math.round(Math.sin(x / 3.2) * 1.4); rect(x, top, 1, 30 - top, 'e'); }
      // Near grass.
      for (let x = 2; x < 30; x++) { const top = 20 + Math.round(Math.sin(x / 4.5 + 2) * 1); rect(x, top, 1, 30 - top, 'g'); set(x, top, 'l'); }
      for (const [x, y] of [[4,24],[9,27],[15,26],[21,28],[26,25],[12,23],[28,22]]) set(x, y, 'G');
      // The tree, right: a round three-tone crown and a trunk.
      const tree = ['..KKKK..', '.KqqttK.', 'KqqtttTK', 'KqtttTTK', 'KtttTTTK', '.KtTTTK.', '..KKKK..'];
      tree.forEach((row, j) => [...row].forEach((k, i) => k !== '.' && set(21 + i, 10 + j, k)));
      rect(24, 17, 2, 5, 'u'); set(23, 21, 'K'); set(26, 21, 'K'); rect(24, 17, 1, 5, 'n');
      // The cottage: a red roof, cream walls, a lit window, a door, a chimney with smoke.
      const house = [
        '......KK......',
        '.....KorK.....',
        '....KoorrK....',
        '...KoorrrrK...',
        '..KoorrrrrRK..',
        '.KoorrrrrrRRK.',
        'KKKKKKKKKKKKKK',
        '.KwwwwwwwwwWK.',
        '.KwKKKwwKKKWK.',
        '.KwKvVKwKnnWK.',
        '.KwKVvKwKnnWK.',
        '.KwKKKwwKnpWK.',
        '.KwwwwwwKnnWK.',
        '.KKKKKKKKKKKK.',
      ];
      house.forEach((row, j) => [...row].forEach((k, i) => k !== '.' && set(5 + i, 10 + j, k)));
      rect(14, 9, 2, 4, 'p'); set(13, 9, 'K'); set(16, 9, 'K'); rect(13, 8, 4, 1, 'K'); set(14, 9, 'R');
      for (const [x, y, k] of [[15,6,'m'],[16,5,'m'],[15,4,'M'],[17,3,'m'],[16,6,'M']]) set(x, y, k);
      // A fence and flowers in front.
      for (let x = 2; x < 30; x++) { if (x >= 5 && x <= 18) continue; set(x, 26, 'h'); if (x % 3 === 0) { set(x, 25, 'h'); set(x, 27, 'd'); } }
      for (const [x, y, k] of [[6,25,'f'],[9,26,'F'],[13,25,'f'],[17,26,'F'],[20,24,'f'],[27,27,'F']]) { set(x, y, k); set(x, y + 1, 'G'); }
      // A stone path from the door.
      for (const [x, y] of [[14,24],[15,25],[14,26],[15,27],[14,28]]) set(x, y, 'M');
      // The wooden frame with rounded corners (Stardew-style), outlined.
      for (let i = 0; i < n; i++) for (const [x, y] of [[i,0],[i,1],[i,30],[i,31],[0,i],[1,i],[30,i],[31,i]]) set(x, y, 'B');
      for (let i = 1; i < n - 1; i++) { set(i, 1, 'b'); set(1, i, 'b'); set(i, 30, 'd'); set(30, i, 'd'); }
      for (let i = 0; i < n; i++) { set(i, 0, 'K'); set(i, 31, 'K'); set(0, i, 'K'); set(31, i, 'K'); }
      for (const [x, y] of [[0,0],[1,0],[0,1],[30,0],[31,0],[31,1],[0,30],[0,31],[1,31],[31,30],[30,31],[31,31]]) px[y][x] = null;
      for (const [x, y] of [[1,1],[30,1],[1,30],[30,30]]) px[y][x] = 'K';
      set(2, 2, 'B'); set(29, 2, 'B'); set(2, 29, 'B'); set(29, 29, 'B');
    });
    // The small one: just the cottage and the tree on grass, bold outlines.
    const small = draw(16, ({ set, rect, px }) => {
      rect(1, 1, 14, 14, 's');
      rect(1, 10, 14, 5, 'g');
      for (let x = 1; x < 15; x++) set(x, 10, 'l');
      const house = ['...KK...', '..KorK..', '.KorrrK.', 'KorrrrRK', 'KKKKKKKK', '.KvwKnK.', '.KwwKnK.', '.KKKKKK.'];
      house.forEach((row, j) => [...row].forEach((k, i) => k !== '.' && set(1 + i, 4 + j, k)));
      const tree = ['.KKK.', 'KqttK', 'KtTTK', '.KKK.'];
      tree.forEach((row, j) => [...row].forEach((k, i) => k !== '.' && set(9 + i, 5 + j, k)));
      rect(11, 9, 1, 2, 'u');
      set(12, 2, 'y'); set(13, 2, 'y'); set(12, 3, 'y'); set(13, 3, 'Y');
      for (let i = 0; i < 16; i++) { set(i, 0, 'K'); set(i, 15, 'K'); set(0, i, 'K'); set(15, i, 'K'); }
      px[0][0] = px[0][15] = px[15][0] = px[15][15] = null;
    });
    const render = (grid, scale) => {
      const c = document.createElement('canvas');
      c.width = c.height = grid.length * scale;
      const g = c.getContext('2d');
      grid.forEach((row, y) => row.forEach((k, x) => { if (k) { g.fillStyle = P[k]; g.fillRect(x * scale, y * scale, scale, scale); } }));
      return c;
    };
    const down = (src, size) => {
      const c = document.createElement('canvas');
      c.width = c.height = size;
      const g = c.getContext('2d');
      g.imageSmoothingEnabled = true;
      g.imageSmoothingQuality = 'high';
      g.drawImage(src, 0, 0, size, size);
      return c;
    };
    const url = (c) => c.toDataURL('image/png').split(',')[1];
    return { 128: url(render(big, 4)), 48: url(down(render(big, 6), 48)), 32: url(render(big, 1)), 16: url(render(small, 1)) };
  })()`);
  const write = (file, b64) => fs.writeFileSync(path.join(ROOT, file), Buffer.from(b64, 'base64'));
  for (const s of [16, 32, 48, 128]) write(`chrome/icons/icon${s}.png`, out[s]);
  write('aquila/icon.png', out[128]);
  console.log('icons written');
  app.exit(0);
});
