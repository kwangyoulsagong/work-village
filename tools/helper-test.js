// Offscreen: the Chrome side panel's helper setup card (chrome/helper-setup.js).
// The card shows only when the helper was asked and isn't there; "받기" saves an installer. The macOS installer is
// run for real with HOME pointed at a temp folder (nothing is registered on this Mac), then the helper it wrote
// answers a native-messaging request. The Windows installer is generated and checked as text (no PowerShell here).
// Usage: [HELPER_PLATFORM=win] npx electron tools/helper-test.js [chrome dir] [out dir]   (offscreen: no window ever shows)
const GAME = process.argv[2] || require('path').join(__dirname, '..', 'chrome');
const OUT = process.argv[3] || require('path').join(__dirname, 'out');
const { app, BrowserWindow } = require('electron');
const path = require('path'), fs = require('fs'), os = require('os');
const { spawnSync } = require('child_process');
fs.mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
app.dock?.hide();

const check = [];
const ok = (name, cond) => { check.push((cond ? 'ok   ' : 'FAIL ') + name); if (process.env.V) console.log(check.at(-1)); };

app.whenReady().then(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'village-helper-'));
  const preload = path.join(OUT, 'helper-runtime-preload.js'); // a preload under os.tmpdir() fails to load
  // chrome-preload.js has storage and the badge; add runtime and the platform before the page runs.
  // One platform per run: a second window in the same Electron process fails to load the panel.
  for (const platform of [process.env.HELPER_PLATFORM === 'win' ? 'Win32' : 'MacIntel']) {
    fs.writeFileSync(preload, `
      require(${JSON.stringify(path.join(__dirname, 'chrome-preload.js'))});
      Object.defineProperty(navigator, 'platform', { get: () => ${JSON.stringify(platform)} });
      Object.defineProperty(navigator, 'userAgentData', { get: () => undefined });
      window.__hostThere = false;
      window.chrome.runtime = {
        id: 'ikempfhclagjilfebmgnpkddbgdjocee',
        lastError: null,
        getURL: (p) => ${JSON.stringify('file://' + GAME + '/')} + p,
        sendMessage: (msg, cb) => setTimeout(async () => {
          const live = { host: window.__hostThere, checked: Date.now() };
          await window.chrome.storage.local.set({ live });
          cb({ host: live.host });
        }, 10),
      };
    `);
    const win = new BrowserWindow({ width: 400, height: 1100, show: false,
      webPreferences: { offscreen: true, preload, contextIsolation: false, sandbox: false } });
    const errors = [];
    win.webContents.on('console-message', (e) => { if (e.level === 'error' || e.level === 3) errors.push(e.message); });
    const saved = new Promise((resolve) => win.webContents.session.once('will-download', (_e, item) => {
      const to = path.join(tmp, item.getFilename());
      item.setSavePath(to);
      item.once('done', () => resolve(to));
    }));
    win.webContents.on('preload-error', (_e, _p, er) => console.log('preload error', er.message));
    win.webContents.on('did-fail-load', (_e, code, desc, url) => console.log('fail', code, desc, url));
    await win.loadFile(path.join(GAME, 'sidepanel.html')).catch((e) => console.log('load', e.message));
    await wait(1500);
    const js = (c) => win.webContents.executeJavaScript(`(async () => { ${c} })()`);
    await js(`document.querySelector('#pick button[data-gender=f]')?.click(); document.getElementById('mode').hidden = true; return 1`);
    const tag = platform === 'Win32' ? 'win' : 'mac';
    ok(`${tag}: card shows when the helper isn't there`, await js(`return !document.querySelector('.helper').hidden`));
    const cmd = await js(`return document.querySelector('.helper code').textContent`);
        ok(`${tag}: command for ${tag === 'win' ? 'PowerShell' : 'sh'}`, tag === 'win' ? cmd.startsWith('powershell -NoProfile -ExecutionPolicy Bypass') && cmd.includes('[scriptblock]::Create') : cmd.startsWith('sh "$(ls -t ~/Downloads/'));
    await js(`window.scrollTo(0, document.body.scrollHeight); return 1`); await wait(200);
    fs.writeFileSync(path.join(OUT, `helper-card-${tag}.png`), (await win.webContents.capturePage()).toPNG());
    await js(`document.querySelector('.helper [data-act=save]').click(); return 1`);
    const file = await Promise.race([saved, wait(5000).then(() => null)]);
    ok(`${tag}: installer saved (${file && path.basename(file)})`, !!file && fs.existsSync(file) && file.endsWith('.txt'));
    const text = file ? fs.readFileSync(file, 'utf8') : '';
    const hostSrc = fs.readFileSync(path.join(GAME, 'host/village-host.js'), 'utf8').trimEnd();

    if (tag === 'mac' && file) {
      // Run it for real, in a pretend home.
      const home = path.join(tmp, 'home');
      fs.mkdirSync(home, { recursive: true });
      const out = spawnSync('sh', [file], { env: { ...process.env, HOME: home }, encoding: 'utf8' });
      ok('mac: installer runs', out.status === 0 && out.stdout.includes('설치했어요'));
      const manifest = path.join(home, 'Library/Application Support/Google/Chrome/NativeMessagingHosts/com.work_village.usage.json');
      const m = fs.existsSync(manifest) ? JSON.parse(fs.readFileSync(manifest, 'utf8')) : {};
      ok('mac: manifest points at run.sh, allows this extension', fs.existsSync(m.path ?? '') && m.allowed_origins?.[0] === 'chrome-extension://ikempfhclagjilfebmgnpkddbgdjocee/');
      const written = fs.readFileSync(path.join(home, 'Library/Application Support/work-village/village-host.js'), 'utf8').trimEnd();
      ok('mac: helper copied byte for byte', written === hostSrc);
      // The helper answers Chrome's framing (Claude skipped: this is a test, not a usage read).
      const body = Buffer.from(JSON.stringify({ claude: false }));
      const head = Buffer.alloc(4); head.writeUInt32LE(body.length, 0);
      const res = spawnSync(m.path, [], { input: Buffer.concat([head, body]), env: { HOME: home, PATH: '/usr/bin:/bin' } });
      const n = res.stdout.length >= 4 ? res.stdout.readUInt32LE(0) : 0;
      const answer = n ? JSON.parse(res.stdout.subarray(4, 4 + n).toString('utf8')) : null;
      ok('mac: installed helper answers with a bare PATH', answer?.ok === true);
      const rm = spawnSync('sh', [file, '--remove'], { env: { ...process.env, HOME: home }, encoding: 'utf8' });
      ok('mac: --remove undoes it', rm.status === 0 && !fs.existsSync(manifest) && !fs.existsSync(path.join(home, 'Library/Application Support/work-village')));
    }
    if (tag === 'win' && process.env.KEEP) fs.copyFileSync(file, path.join(OUT, path.basename(file)));
    if (tag === 'win') {
      ok('win: UTF-8 BOM for Windows PowerShell', text.charCodeAt(0) === 0xfeff);
      const hs = /\$HostJs = @'\n([\s\S]*?)\n'@\n/.exec(text);
      ok('win: helper inside the here-string, intact', hs && hs[1].trimEnd() === hostSrc);
      ok('win: registry key, run.bat, -Remove', text.includes('# Undo: powershell') && text.includes("HKCU:\\Software\\Google\\Chrome\\NativeMessagingHosts\\com.work_village.usage") && text.includes("'run.bat'") && text.includes('%~dp0village-host.js') && text.includes('[switch]$Remove'));
      ok('win: run.bat built without escapes PowerShell would choke on', text.includes(`$Bat = '@echo off' + [Environment]::NewLine + '"' + $Node + '" "%~dp0village-host.js"' + [Environment]::NewLine`) && !/"@echo off/.test(text));
      ok('win: parent registry keys made one by one', text.includes("'HKCU:\\Software\\Google\\Chrome\\NativeMessagingHosts') {"));
      ok('win: pasted command has no $ and no inner double quotes', !cmd.includes('$') && cmd.split('"').length === 3 && cmd.includes("shell:Downloads") && cmd.includes("'work-village-helper*.txt'"));
      // Outside the here-string, every double-quoted string must be balanced, and no JS escapes may leak through.
      const outside = text.replace(/@'\n[\s\S]*?\n'@/, '');
      ok('win: no JS escapes outside the helper', !/\\[rn"]/.test(outside) && outside.split('\n').every((l) => (l.match(/"/g) ?? []).length % 2 === 0));
      ok('win: origin is this extension', text.includes("chrome-extension://ikempfhclagjilfebmgnpkddbgdjocee/"));
    }
    // The helper turns up: the card says so and goes away.
    await js(`window.__hostThere = true; return 1`);
    await wait(5600);
    ok(`${tag}: card notices the helper`, await js(`return document.querySelector('.helper .status').classList.contains('ok')`));
    await wait(4200);
    ok(`${tag}: card goes away`, await js(`return document.querySelector('.helper').hidden`));
    ok(`${tag}: no errors`, errors.length === 0);
    if (errors.length) console.log(errors);
    win.destroy();
  }
  console.log(check.join('\n'));
  console.log(JSON.stringify({ failed: check.filter((x) => x.startsWith('FAIL')).length }));
  fs.rmSync(tmp, { recursive: true, force: true });
  app.exit(0);
});
