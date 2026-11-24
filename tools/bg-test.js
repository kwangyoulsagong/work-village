// background.js with a fake chrome: helper there → minutes don't count, usage flows; helper gone → minutes count.
// Usage: node tools/bg-test.js [game dir] [out dir]   (offscreen: no window ever shows)
const GAME = process.argv[2] || require('path').join(__dirname, '..', 'chrome');
const OUT = process.argv[3] || require('path').join(__dirname, 'out');
require('fs').mkdirSync(OUT, { recursive: true });
const fs = require('fs'), vm = require('vm');
const src = fs.readFileSync(GAME + '/background.js', 'utf8');
async function run(hostAnswer) {
  const store = {};
  let alarmCb;
  const chrome = {
    runtime: { onInstalled: { addListener() {} }, onStartup: { addListener() {} }, lastError: null,
      sendNativeMessage(name, msg, cb) { if (!hostAnswer) { chrome.runtime.lastError = { message: 'not found' }; cb(undefined); chrome.runtime.lastError = null; } else cb(hostAnswer(msg)); } },
    alarms: { create() {}, onAlarm: { addListener: (cb) => (alarmCb = cb) } },
    sidePanel: { setPanelBehavior() {} },
    idle: { queryState: async () => 'active' },
    storage: { local: { get: async (k) => Object.fromEntries((Array.isArray(k) ? k : [k]).map((x) => [x, store[x]])), set: async (o) => Object.assign(store, o) } },
  };
  const RealDate = Date;
  let fake = new RealDate(2026, 10, 24, 14, 0).getTime();
  class FakeDate extends RealDate { constructor(...a) { super(...(a.length ? a : [fake])); } static now() { return fake; } }
  vm.runInNewContext(src, { chrome, Date: FakeDate, console });
  for (let i = 0; i < 30; i++) { await alarmCb({ name: 'minute' }); fake += 60_000; }
  return store;
}
(async () => {
  const withHost = await run((msg) => ({ ok: true, claude: msg.claude ? { weekly: 5, fiveHour: 15 } : undefined, codex: { weekly: 1, fiveHour: null } }));
  console.log('helper ok:', JSON.stringify({ minutes: withHost.minutes ?? 0, live: withHost.live }));
  const without = await run(null);
  console.log('no helper:', JSON.stringify({ minutes: without.minutes, host: without.live?.host }));
  const empty = await run(() => ({ ok: true, claude: null, codex: null }));
  console.log('helper but no usage:', JSON.stringify({ minutes: empty.minutes }));
})();
