// Chrome only: when the local usage helper isn't there, a card offers to set it up.
// Chrome won't let an extension install or run anything on the computer (macOS, Windows, Linux), so this is as close to automatic as it gets:
// one button saves a self-contained installer (the helper, built from this extension's own files, with this
// extension's ID) to Downloads, one line goes into Terminal, and the card notices the helper by itself.
// Nothing leaves the Mac: the installer is made here from packaged files, not downloaded from anywhere.
'use strict';
(() => {
  const HOST = 'com.work_village.usage';
  const WIN = /win/i.test(navigator.userAgentData?.platform ?? navigator.platform ?? '');
  // A .txt so Chrome never warns about a script download; the pasted line runs it. The newest copy in Downloads
  // counts (Chrome adds " (1)" to a second download).
  const FILE = 'work-village-helper.txt';
  // Windows: the real Downloads folder (it may be moved, e.g. to OneDrive); no $ for an outer PowerShell to expand
  // and no double quotes inside, so it pastes the same into PowerShell or cmd and survives spaces in the user name.
  const WIN_FIND = `(Get-ChildItem -LiteralPath ((New-Object -ComObject Shell.Application).NameSpace('shell:Downloads').Self.Path) -Filter 'work-village-helper*.txt' | Sort-Object LastWriteTime | Select-Object -Last 1).FullName`;
  const winRun = (args) => `powershell -NoProfile -ExecutionPolicy Bypass -Command "& ([scriptblock]::Create((Get-Content -Raw -Encoding UTF8 -LiteralPath ${WIN_FIND})))${args}"`;
  const COMMAND = WIN ? winRun('') : `sh "$(ls -t ~/Downloads/work-village-helper*.txt | head -1)"`;
  const UNDO = WIN ? winRun(' -Remove') : `sh "$(ls -t ~/Downloads/work-village-helper*.txt | head -1)" --remove`;
  const TERMINAL = WIN ? 'PowerShell' : '터미널';
  const LATER_MS = 7 * 86_400_000;
  const hasRuntime = () => typeof chrome !== 'undefined' && chrome.runtime?.id;

  /** macOS / Linux: writes the helper next to Chrome's other data and registers it. */
  function shInstaller(hostJs, id) {
    if (hostJs.includes('VILLAGE_HOST_EOF')) throw new Error('marker in host source');
    return `#!/bin/sh
# 작은 마을 도우미: lets the Chrome extension read this computer's Claude / Codex usage (Chrome native messaging).
# Local only: the helper reads ~/.claude and ~/.codex and talks to Chrome, nothing else.
# Undo: ${UNDO}
set -e
if [ "$(uname)" = "Darwin" ]; then
  APP="$HOME/Library/Application Support/work-village"
  DIR="$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts"
else
  APP="\${XDG_DATA_HOME:-$HOME/.local/share}/work-village"
  DIR="$HOME/.config/google-chrome/NativeMessagingHosts"
fi
FILE="$DIR/${HOST}.json"
if [ "$1" = "--remove" ]; then rm -f "$FILE"; rm -rf "$APP"; echo "작은 마을 도우미를 지웠어요."; exit 0; fi
NODE="$(command -v node || true)"
if [ -z "$NODE" ]; then echo "Node.js가 필요해요. https://nodejs.org 에서 설치한 뒤 다시 붙여 넣어 주세요."; exit 1; fi
NODE="$("$NODE" -p 'process.execPath')"
CLAUDE="$(command -v claude || true)"
mkdir -p "$APP" "$DIR"
cat > "$APP/village-host.js" <<'VILLAGE_HOST_EOF'
${hostJs.replace(/\n?$/, '\n')}VILLAGE_HOST_EOF
printf '{ "claude": "%s" }\\n' "$CLAUDE" > "$APP/config.json"
printf '#!/bin/sh\\nexec "%s" "%s/village-host.js"\\n' "$NODE" "$APP" > "$APP/run.sh"
chmod +x "$APP/run.sh"
cat > "$FILE" <<JSON
{
  "name": "${HOST}",
  "description": "작은 마을: Claude / Codex usage on this Mac",
  "path": "$APP/run.sh",
  "type": "stdio",
  "allowed_origins": ["chrome-extension://${id}/"]
}
JSON
echo "작은 마을 도우미를 설치했어요. Chrome 사이드 패널로 돌아가면 저절로 연결돼요."
[ -n "$CLAUDE" ] || echo "(claude 명령을 못 찾았어요. Codex 사용량만 읽어요.)"
`;
  }

  /** Windows: the helper in %LOCALAPPDATA%\\work-village, a .bat to start it, and Chrome's registry key. */
  function psInstaller(hostJs, id) {
    if (/^'@/m.test(hostJs)) throw new Error('here-string end in host source');
    // A BOM, so Windows PowerShell 5 reads the Korean text as UTF-8.
    return `\uFEFF# 작은 마을 도우미: lets the Chrome extension read this PC's Claude / Codex usage (Chrome native messaging).
# Local only: the helper reads ~/.claude and ~/.codex and talks to Chrome, nothing else.
# Undo: ${UNDO}
param([switch]$Remove)
$ErrorActionPreference = 'Stop'
$App = Join-Path $env:LOCALAPPDATA 'work-village'
$Key = 'HKCU:\\Software\\Google\\Chrome\\NativeMessagingHosts\\${HOST}'
if ($Remove) {
  Remove-Item $Key -Force -ErrorAction SilentlyContinue
  Remove-Item $App -Recurse -Force -ErrorAction SilentlyContinue
  Write-Host '작은 마을 도우미를 지웠어요.'
  exit 0
}
$Node = (Get-Command node.exe -ErrorAction SilentlyContinue | Select-Object -First 1).Source
if (-not $Node) { Write-Host 'Node.js가 필요해요. https://nodejs.org 에서 설치한 뒤 다시 붙여 넣어 주세요.'; exit 1 }
$Claude = (Get-Command claude.exe, claude.cmd -ErrorAction SilentlyContinue | Select-Object -First 1).Source
New-Item -ItemType Directory -Force -Path $App | Out-Null
$Utf8 = New-Object System.Text.UTF8Encoding $false
$HostJs = @'
${hostJs.replace(/\n?$/, '')}
'@
[IO.File]::WriteAllText((Join-Path $App 'village-host.js'), $HostJs, $Utf8)
[IO.File]::WriteAllText((Join-Path $App 'config.json'), (@{ claude = $Claude } | ConvertTo-Json), $Utf8)
# cmd reads .bat files in the console code page.
$Oem = [Text.Encoding]::GetEncoding([Globalization.CultureInfo]::CurrentCulture.TextInfo.OEMCodePage)
$Bat = '@echo off' + [Environment]::NewLine + '"' + $Node + '" "%~dp0village-host.js"' + [Environment]::NewLine
[IO.File]::WriteAllText((Join-Path $App 'run.bat'), $Bat, $Oem)
$Manifest = Join-Path $App '${HOST}.json'
$Json = @{
  name = '${HOST}'
  description = '작은 마을: Claude / Codex usage on this PC'
  path = (Join-Path $App 'run.bat')
  type = 'stdio'
  allowed_origins = @('chrome-extension://${id}/')
} | ConvertTo-Json
[IO.File]::WriteAllText($Manifest, $Json, $Utf8)
# The registry provider doesn't make missing parent keys: one level at a time.
foreach ($K in 'HKCU:\\Software\\Google', 'HKCU:\\Software\\Google\\Chrome', 'HKCU:\\Software\\Google\\Chrome\\NativeMessagingHosts') {
  if (-not (Test-Path -LiteralPath $K)) { New-Item -Path $K | Out-Null }
}
New-Item -Path $Key -Value $Manifest -Force | Out-Null
Write-Host '작은 마을 도우미를 설치했어요. Chrome 사이드 패널로 돌아가면 저절로 연결돼요.'
if (-not $Claude) { Write-Host '(claude 명령을 못 찾았어요. Codex 사용량만 읽어요.)' }
`;
  }
  const installer = WIN ? psInstaller : shInstaller;

  const style = document.createElement('style');
  style.textContent = `
    .helper ol { margin: 10px 0 0; padding: 0; list-style: none; display: grid; gap: 8px; counter-reset: step; }
    .helper li { display: flex; align-items: center; gap: 8px; font-size: 13px; counter-increment: step; }
    .helper li::before { content: counter(step); flex: none; width: 20px; height: 20px; border-radius: 50%; background: var(--blue-soft); color: var(--blue); font-size: 12px; font-weight: 700; display: grid; place-items: center; }
    .helper li > span { flex: 1; min-width: 0; }
    .helper code { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; margin-top: 2px; font: 11px/1.4 ui-monospace, Menlo, monospace; color: var(--text-2); word-break: break-all; user-select: all; }
    .helper .status { margin-top: 10px; }
    .helper .status.ok { color: var(--green); font-weight: 600; }
    body[data-mode='chaos'] .helper, body[data-mode='visit'] .helper { display: none; }
    #sourcePick .sheet { padding: 14px 14px 12px; gap: 6px; }
    #sourcePick h2 { font-size: 16px; }
    #sourcePick p { margin: 0 0 2px; }
    #sourcePick .choice { padding: 9px 12px; }
  `;
  document.head.append(style);

  const card = document.createElement('section');
  card.className = 'card helper';
  card.hidden = true;
  card.innerHTML = `
    <div class="eyebrow">사용량 연동</div>
    <div class="headline">Claude·Codex 사용량으로 키워 볼까요?</div>
    <p class="hint">지금은 브라우저를 켜 둔 시간으로 자라요. Chrome은 확장이 컴퓨터에 프로그램을 설치하지 못하게 막아서, 두 단계만 직접 해 주세요. Node.js가 있어야 해요.</p>
    <ol>
      <li><span><b>설치 파일 받기</b><br /><span class="hint">다운로드 폴더에 저장돼요.</span></span><button class="btn" data-act="save">받기</button></li>
      <li><span><b class="term">터미널에 붙여 넣기</b><code></code></span><button class="btn" data-act="copy">복사</button></li>
    </ol>
    <div class="hint status">설치하면 저절로 연결돼요.</div>
    <div class="row"><span class="grow"></span><button class="btn text" data-act="later">나중에</button></div>`;
  card.querySelector('code').textContent = COMMAND;
  card.querySelector('code').title = COMMAND;
  card.querySelector('.term').textContent = `${TERMINAL}에 붙여 넣기`;
  const status = card.querySelector('.status');
  const say = (text, ok = false) => {
    status.textContent = text;
    status.classList.toggle('ok', ok);
  };

  let waiting = 0;
  /** Ask the background to try the helper now; true when it answered. */
  const check = () =>
    new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage({ check: true }, (res) => resolve(!chrome.runtime.lastError && !!res?.host));
      } catch {
        resolve(false);
      }
    });
  function waitForHelper() {
    clearInterval(waiting);
    let tries = 0;
    say('설치를 기다리는 중이에요…');
    waiting = setInterval(async () => {
      if (document.hidden) return;
      if (++tries > 120) {
        clearInterval(waiting);
        return say(`아직 연결되지 않았어요. ${TERMINAL}에 오류가 나왔는지 확인해 주세요.`);
      }
      if (await check()) connected();
    }, 5000);
  }
  function connected() {
    clearInterval(waiting);
    say('연결됐어요. 이제 Claude·Codex 사용량으로 자라요.', true);
    setTimeout(() => (card.hidden = true), 4000);
  }

  card.addEventListener('click', async (ev) => {
    const act = ev.target.closest('button')?.dataset.act;
    if (act === 'save') {
      try {
        const hostJs = await (await fetch(chrome.runtime.getURL('host/village-host.js'))).text();
        const url = URL.createObjectURL(new Blob([installer(hostJs, chrome.runtime.id)], { type: 'text/plain' }));
        const a = Object.assign(document.createElement('a'), { href: url, download: FILE });
        document.body.append(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
        say(`받았어요. 이제 ${TERMINAL}에 붙여 넣어 주세요.`);
        waitForHelper();
      } catch {
        say('설치 파일을 만들지 못했어요. 확장을 다시 불러온 뒤 해 주세요.');
      }
    } else if (act === 'copy') {
      try {
        await navigator.clipboard.writeText(COMMAND);
        say(`복사했어요. ${TERMINAL}을 열고 붙여 넣은 뒤 Enter를 눌러 주세요.`);
      } catch {
        say('복사하지 못했어요. 위 명령을 직접 선택해서 복사해 주세요.');
      }
      waitForHelper();
    } else if (act === 'later') {
      clearInterval(waiting);
      card.hidden = true;
      void chrome.storage.local.set({ helperLater: Date.now() });
    }
  });

  async function refresh() {
    const { live, helperLater = 0, source } = await chrome.storage.local.get(['live', 'helperLater', 'source']);
    paintHint(source, live);
    if (source === 'browser') return void (card.hidden = true); // you chose browser time: nothing to install
    if (live?.host) {
      if (!card.hidden && waiting) connected();
      else card.hidden = true;
      return;
    }
    // AI usage chosen and no helper yet: show how to set it up. Otherwise only once the background has actually asked
    // the helper (live.checked), and not right after "later".
    card.hidden = source === 'ai' ? false : !live?.checked || Date.now() - helperLater < LATER_MS;
  }

  // ── What the town grows with: asked once at the very start (and changeable from the footer) ──
  const HINTS = {
    ai: '이 컴퓨터의 Claude·Codex 사용량만큼 마을이 자라요. 주간 사용량 1%가 코인 10이에요.',
    aiWaiting: 'AI 사용량으로 키우려면 아래 도우미를 설치해 주세요. 그전까지는 브라우저를 켜 둔 시간으로 자라요.',
    browser: '브라우저를 켜 둔 1시간마다 코인 10이에요. 설치할 건 없어요.',
  };
  function paintHint(source, live) {
    const hint = document.getElementById('hint');
    if (!hint || !source) return;
    hint.textContent = source === 'browser' ? HINTS.browser : live?.host ? HINTS.ai : HINTS.aiWaiting;
  }
  const sheet = document.createElement('div');
  sheet.className = 'pick';
  sheet.id = 'sourcePick';
  sheet.hidden = true;
  sheet.innerHTML = `
    <div class="sheet">
      <h2>무엇으로 마을을 키울까요?</h2>
      <p>나중에 언제든 바꿀 수 있어요.</p>
      <button class="choice" data-src="ai"><b>AI 사용량</b><span>Claude·Codex를 쓰는 만큼 자라요. 도우미 설치가 필요해요.</span></button>
      <button class="choice" data-src="browser"><b>브라우저 시간</b><span>켜 둔 1시간마다 코인 10. 설치 없이 바로 시작해요.</span></button>
    </div>`;
  sheet.addEventListener('click', async (ev) => {
    const src = ev.target.closest('[data-src]')?.dataset.src;
    if (!src) return;
    await chrome.storage.local.set({ source: src, helperLater: 0 });
    sheet.hidden = true;
    await refresh();
    if (src === 'ai' && !card.hidden) setTimeout(() => card.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
  });
  const switcher = Object.assign(document.createElement('button'), { className: 'btn text', textContent: '키우는 방법 바꾸기' });
  switcher.addEventListener('click', () => {
    sheet.hidden = false;
    document.querySelector('.town')?.scrollIntoView({ block: 'start' });
  });
  /** First start: ask. A town already under way keeps what it grew with until now, without asking. */
  async function askSource() {
    const { source, live, 'game:save': saved } = await chrome.storage.local.get(['source', 'live', 'game:save']);
    if (source) return;
    if (saved?.gender) return void (await chrome.storage.local.set({ source: live?.host ? 'ai' : 'browser' }));
    sheet.hidden = false;
  }

  if (!hasRuntime()) return; // not running as the extension (tests load the panel without it)
  (document.querySelector('.foot') ?? document.body.lastElementChild).after(card);
  document.querySelector('.stage')?.append(sheet); // over the game's own first sheet (life or chaos)
  document.getElementById('startOver')?.before(switcher);
  // Starting over from nothing asks again what the town grows with.
  document.getElementById('resetYes')?.addEventListener('click', () => void chrome.storage.local.remove(['source', 'helperLater']));
  chrome.storage.onChanged.addListener((changes, area) => area === 'local' && changes.source && void refresh());
  void askSource();
  chrome.storage.onChanged.addListener((changes, area) => area === 'local' && changes.live && void refresh());
  void refresh();
  // The panel just opened without a known helper: ask now instead of waiting for the next 3-minute poll.
  void chrome.storage.local.get('live').then(({ live }) => !live?.host && check().then(refresh));
})();
