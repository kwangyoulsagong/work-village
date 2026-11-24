// The same `window.aquila` the game uses inside Aquila, answered by Chrome: browser minutes stand in for
// Claude / Codex usage, chrome.storage keeps the save, the toolbar badge shows the coins.
'use strict';
(() => {
  window.VILLAGE_SOURCE = 'browser';
  const listeners = new Map();
  const emit = (name, data) => (listeners.get(name) ?? []).forEach((cb) => cb(data));
  const usageFrom = (minutes) => [{ account: 'browser', kind: 'chrome', weekly: minutes / 60, fiveHour: null, near: false }];
  const get = (key) => chrome.storage.local.get(key).then((v) => v[key]);

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.minutes) emit('usage', usageFrom(changes.minutes.newValue ?? 0));
  });
  document.addEventListener('visibilitychange', () => emit('visible', { visible: !document.hidden }));

  const badge = (text) => {
    const n = Number(String(text).replace(/[^\d]/g, ''));
    if (!Number.isFinite(n)) return '';
    return n >= 10000 ? `${Math.floor(n / 1000)}k` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
  };

  window.aquila = {
    on(name, cb) {
      if (!listeners.has(name)) listeners.set(name, new Set());
      listeners.get(name).add(cb);
      return () => listeners.get(name).delete(cb);
    },
    info: async () => ({ host: 'chrome' }),
    power: async () => ({ saver: false, onBattery: false }),
    usage: async () => usageFrom((await get('minutes')) ?? 0),
    storage: {
      get: async (key) => (await get(`game:${key}`)) ?? null,
      set: (key, value) => chrome.storage.local.set({ [`game:${key}`]: value }),
      remove: (key) => chrome.storage.local.remove(`game:${key}`),
      keys: async () => Object.keys(await chrome.storage.local.get(null)).filter((k) => k.startsWith('game:')).map((k) => k.slice(5)),
    },
    chip: async (text) => {
      await chrome.action.setBadgeBackgroundColor({ color: '#3f7d3a' });
      await chrome.action.setBadgeText({ text: badge(text) });
    },
    notify: async () => {},
    system: async () => ({}),
    sessions: async () => ({ counts: {}, total: 0 }),
  };
})();
