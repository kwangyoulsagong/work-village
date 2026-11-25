// Offscreen: two panels on one machine join live (WebRTC, no ICE servers), see each other move, and a guestbook note
// written by the guest appears in the host's town at once. Usage: npx electron tools/live-test.js [out dir]
const OUT = process.argv[2] || require('path').join(__dirname, 'out');
const GAME = require('path').join(__dirname, '..', 'aquila');
require('fs').mkdirSync(OUT, { recursive: true });
const { app, BrowserWindow } = require('electron');
const path = require('path'), fs = require('fs');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
app.dock?.hide();
const panel = async (part, errors) => {
  const win = new BrowserWindow({ width: 560, height: 1000, show: false,
    webPreferences: { offscreen: true, partition: part, preload: path.join(__dirname, 'preload.js'), contextIsolation: false, sandbox: false } });
  win.webContents.setFrameRate(30);
  win.webContents.on('console-message', (e) => { if (e.level === 'error') errors.push(part + ': ' + e.message); });
  await win.loadFile(path.join(GAME, 'index.html'));
  const js = (c) => win.webContents.executeJavaScript(c);
  await js('localStorage.clear()'); await win.webContents.reload(); await wait(1200);
  await js(`document.getElementById('modeLife').click(); pickGender('f');`); await wait(300);
  return { win, js };
};
app.whenReady().then(async () => {
  const errors = [], fails = [];
  const ok = (c, m) => c || fails.push(m);
  const host = await panel('live-a', errors), guest = await panel('live-b', errors);
  await host.js(`nick = '집주인'; S.gender = 'f'; S.hair = '#111111'; S.skin = '#ffe0c4'`); await guest.js(`nick = '손님'; S.gender = 'm'; S.hair = '#a05a2c'; S.skin = '#8a5636'`);
  await host.js(`openVisitCard(); startLive()`); await wait(3000);
  const offer = await host.js(`document.getElementById('myCode').value`);
  ok(offer.startsWith('작은마을1:'), 'offer code');
  // Your own live invite doesn't open (it would show you twice).
  await host.js(`openCode(${JSON.stringify(offer)})`); await wait(300);
  ok((await host.js('MODE')) === 'life', 'own live code does not open');
  await guest.js(`openCode(${JSON.stringify(offer)})`); await wait(3500);
  const answer = await guest.js(`document.getElementById('myCode').value`);
  const gm = await guest.js(`({ mode: MODE, title: document.getElementById('myCodeTitle').textContent })`);
  ok(gm.mode === 'visit' && gm.title === '답 코드', 'guest visits and gets an answer code: ' + JSON.stringify(gm));
  await host.js(`openCode(${JSON.stringify(answer)})`);
  let st;
  for (let i = 0; i < 20; i++) {
    await wait(300);
    st = await host.js(`({ open: peerLink?.ch?.readyState, guests: guests.map((g) => g.name) })`);
    if (st.open === 'open') break;
  }
  ok(st.open === 'open', 'connected: ' + JSON.stringify(st));
  // The host walks somewhere; the guest sees them there.
  await host.js(`me.x = 200; me.y = ROAD_Y * T + 10; me.hidden = false;`); await wait(1500);
  const seen = await guest.js(`(() => { const g = guests.find((x) => x.liveWalk); return g && { x: Math.round(g.x), y: Math.round(g.y), tx: g.tx }; })()`);
  const meOnGuest = await guest.js(`({ g: S.gender, hair: S.hair, skin: S.skin, name: myCard().name })`);
  ok(meOnGuest.g === 'm' && meOnGuest.hair === '#a05a2c' && meOnGuest.skin === '#8a5636' && meOnGuest.name === '손님', 'guest still looks like themselves: ' + JSON.stringify(meOnGuest));
  const hostOnGuest = await guest.js(`guests.map((g) => ({ name: g.name, hair: g.look.hair, live: !!g.liveWalk }))`);
  ok(hostOnGuest.length === 1 && hostOnGuest[0].name === '집주인', 'guest sees the host by the host\'s name: ' + JSON.stringify(hostOnGuest));
  ok(seen && Math.abs(seen.tx - (await host.js('Math.round(me.x)'))) < 3, 'guest sees host position: ' + JSON.stringify(seen));
  // The guest walks (a tap) and the host sees them.
  await guest.js(`me.x = 340; me.y = ROAD_Y * T + 10;`); await wait(1500);
  const seen2 = await host.js(`(() => { const g = guests.find((x) => x.liveWalk); return g && { name: g.name, tx: g.tx }; })()`);
  ok(seen2 && seen2.name === '손님', 'host sees guest: ' + JSON.stringify(seen2));
  // A note goes straight over.
  await guest.js(`document.getElementById('signText').value = '안녕 왔다감'; visitNote();`); await wait(800);
  const book = await host.js(`(S.guestbook ?? []).map((n) => n.name + ':' + n.text)`);
  ok(book.includes('손님:안녕 왔다감'), 'note arrives: ' + JSON.stringify(book));
  fs.writeFileSync(path.join(OUT, 'live-host.png'), (await host.win.webContents.capturePage()).toPNG());
  fs.writeFileSync(path.join(OUT, 'live-guest.png'), (await guest.win.webContents.capturePage()).toPNG());
  // The guest goes home: the host's friend leaves.
  await guest.js(`leaveVisit()`); await wait(1200);
  const after = await host.js(`({ link: !!peerLink, guests: guests.length })`);
  ok(!after.link && after.guests === 0, 'bye ends it: ' + JSON.stringify(after));
  console.log(JSON.stringify({ errors, fails }, null, 1));
  app.exit(0);
});
