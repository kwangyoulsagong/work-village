// What the town grows with, in Chrome:
// 1. This Mac's Claude / Codex usage, through the local helper (chrome/install-host.sh registers it). Codex every
//    3 minutes, Claude every 10 (it runs `claude -p /usage`).
// 2. If neither is there: the minutes the browser is open (not while the screen is locked). 60 minutes = 1 % = 🪙10.
// Minutes only count while the helper has nothing, so switching between the two never counts twice. If you chose
// browser time at the start (storage `source: 'browser'`), minutes always count and the helper's usage is ignored.
const HOST = 'com.work_village.usage';
const STALE_MS = 30 * 60_000;
const tick = () => chrome.alarms.create('minute', { periodInMinutes: 1 });

chrome.runtime.onInstalled.addListener(() => {
  tick();
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  void poll(true);
});
chrome.runtime.onStartup.addListener(() => {
  tick();
  void poll(true);
});

function ask(claude) {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendNativeMessage(HOST, { claude }, (res) => resolve(chrome.runtime.lastError ? null : res));
    } catch {
      resolve(null);
    }
  });
}

/** Ask the helper; keep what it says (with when) in storage, where the side panel reads it. */
async function poll(withClaude) {
  const res = await ask(withClaude);
  const { live = {} } = await chrome.storage.local.get('live');
  const now = Date.now();
  if (!res) {
    await chrome.storage.local.set({ live: { ...live, host: false, checked: now } });
    return;
  }
  const next = { ...live, host: true, checked: now };
  if (res.codex) next.codex = { ...res.codex, at: now };
  if (withClaude && res.claude) next.claude = { ...res.claude, at: now };
  await chrome.storage.local.set({ live: next });
}

// The side panel's setup card: "try the helper now" (just installed, or the panel just opened).
chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  if (!msg?.check) return false;
  void (async () => {
    // Already answering? Then the regular polls are enough: no extra `claude -p /usage` on every panel open.
    const { live } = await chrome.storage.local.get('live');
    if (!live?.host) await poll(false);
    reply({ host: !!(await chrome.storage.local.get('live')).live?.host });
  })();
  return true; // answering later
});

/** Is real usage coming in? Then browser minutes don't count. */
const hasLive = (live, now) => !!live?.host && ['claude', 'codex'].some((k) => live[k] && now - live[k].at < STALE_MS);

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== 'minute') return;
  const now = new Date();
  const m = now.getHours() * 60 + now.getMinutes();
  if (m % 3 === 0) await poll(m % 10 === 0);
  if ((await chrome.idle.queryState(600)) === 'locked') return;
  const { live, minutes = 0, source } = await chrome.storage.local.get(['live', 'minutes', 'source']);
  if (source !== 'browser' && hasLive(live, Date.now())) return;
  await chrome.storage.local.set({ minutes: minutes + 1 });
});
