// A fake `chrome` for the side panel: storage.local with onChanged, and the toolbar badge.
const data = {};
const changed = new Set();
window.__badge = '';
window.chrome = {
  storage: {
    local: {
      get: async (k) => (k == null ? { ...data } : Object.fromEntries((Array.isArray(k) ? k : [k]).map((x) => [x, data[x]]))),
      set: async (o) => { for (const [k, v] of Object.entries(o)) { const old = data[k]; data[k] = JSON.parse(JSON.stringify(v)); changed.forEach((cb) => cb({ [k]: { oldValue: old, newValue: data[k] } }, 'local')); } },
      remove: async (k) => { for (const x of Array.isArray(k) ? k : [k]) delete data[x]; },
    },
    onChanged: { addListener: (cb) => changed.add(cb) },
  },
  action: { setBadgeText: async ({ text }) => { window.__badge = text; }, setBadgeBackgroundColor: async () => {} },
};
window.__chromeData = data;
