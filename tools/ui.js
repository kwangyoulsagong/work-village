// Offscreen: nothing ever shows on screen. The panel at several sizes, light and dark.
// Usage: npx electron tools/ui.js [game dir] [out dir]   (offscreen: no window ever shows)
const GAME = process.argv[2] || require('path').join(__dirname, '..', 'aquila');
const OUT = process.argv[3] || require('path').join(__dirname, 'out');
require('fs').mkdirSync(OUT, { recursive: true });
const { app, BrowserWindow, nativeTheme } = require('electron');
const path = require('path'), fs = require('fs');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
app.dock?.hide();
app.whenReady().then(async () => {
  const errors = [];
  const win = new BrowserWindow({ width: 420, height: 1000, show: false, useContentSize: true,
    webPreferences: { offscreen: true, preload: path.join(__dirname, 'preload.js'), contextIsolation: false, sandbox: false } });
  win.webContents.setFrameRate(30);
  win.webContents.on('console-message', (e) => { if (e.level === 'error') errors.push(e.message); });
  const shoot = async (name, w, h, dark, setup) => {
    console.log('a', name); win.setContentSize(w, h);
    console.log('b'); await win.loadFile(path.join(GAME, 'index.html'));
    if (!win.webContents.debugger.isAttached()) win.webContents.debugger.attach('1.3');
    await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: dark ? 'dark' : 'light' }] });
    console.log('c'); await wait(900);
    await win.webContents.executeJavaScript(`(() => { try { ${setup} } catch (e) { console.error(e.stack); } })()`);
    console.log('d'); await wait(3000);
    fs.writeFileSync(path.join(OUT, name + '.png'), (await win.webContents.capturePage()).toPNG());
  };
  const today = new Date().toLocaleDateString('sv');
  const town = `
    S = { ...fresh(), gender: 'f', traits: { health: 2, green: 4, charm: 5, trade: 3, luck: 1 }, era: 3, houses: 15, chickens: 5, cows: 2, sheep: 2, dog: true, spouse: 1, kids: 2, kidAges: [9, 2],
      landmarks: ['temple', 'castle', 'factory'], farm: ['scarecrow', 'field2', 'orchard', 'beehive'], season: 2, coins: 1234, pocket: 48, xp: 2400, days: 34, age: 34, lastDay: '${today}',
      dex: ['fish:붕어', 'gem:금', 'forage:송이버섯'], ach: ['first-harvest', 'houses-5', 'married', 'kid', 'era-1', 'era-2', 'era-3'], stock: { wood: 42, stone: 17, fish: 5, berries: 9 },
      story: [
        { day: 34, text: '🪓 숲을 개간해 새 동네 터를 닦았어요. 나무 15개가 창고에 들어왔어요.' },
        { day: 33, text: '🔥 외국 군대과(와)의 전쟁에서 졌어요. 집 2채가 무너졌어요.' },
        { day: 31, text: '😷 역병이 돌았어요. 2가구가 마을을 떠났어요.' },
        { day: 30, text: '🏅 업적 달성: 산업 시대' },
        { day: 29, text: '📖 도감에 새로 올랐어요: 송이버섯을(를) 찾았어요!' },
        { day: 22, text: '💍 하나와(과) 결혼했어요! 이제 한 집에 살아요.' },
      ] };
    applyLayout(S.mapSeed); carveGroves(); ensureLots(S.houses); updateMyJob(true); S.friends = Array.from({ length: 15 }, () => ({ f: 3, day: '' }));
    spawnFamily(); spawnAnimals(); spawnCars(); cache.dirty = true; $('mode').hidden = true; $('pick').hidden = true; $('now').textContent = '씨앗 심기'; paintUi(); fitCanvas(); wake();`;
  await shoot('ui-wide', 420, 1000, false, town);
  await shoot('ui-dark', 420, 1000, true, town);
  await shoot('ui-narrow', 300, 760, false, town);
  await shoot('ui-short', 420, 480, false, town);
  await shoot('ui-tiny', 420, 360, false, town);
  await shoot('ui-mode', 420, 760, false, `$('mode').hidden = false;`);
  await shoot('ui-chaos', 420, 900, false, `enterChaos(4);`);
  console.log(JSON.stringify({ errors }));
  app.exit(0);
});
