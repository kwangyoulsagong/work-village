// Counts the minutes the browser is open (not while the screen is locked). The town grows with them:
// 60 minutes = 1 % in the game's terms = 🪙10.
const tick = () => chrome.alarms.create('minute', { periodInMinutes: 1 });

chrome.runtime.onInstalled.addListener(() => {
  tick();
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});
chrome.runtime.onStartup.addListener(tick);

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== 'minute') return;
  if ((await chrome.idle.queryState(600)) === 'locked') return;
  const { minutes = 0 } = await chrome.storage.local.get('minutes');
  await chrome.storage.local.set({ minutes: minutes + 1 });
});
