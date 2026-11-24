// Aquila extension client. Include it with <script src="aquila.js"></script>; then use window.aquila.
// Talks to Aquila over window.postMessage. Every call returns a Promise; refused calls reject with the reason.
(() => {
  let seq = 0;
  const pending = new Map();
  const listeners = new Map();
  window.addEventListener('message', (e) => {
    const m = e.data;
    if (e.source !== window || !m || typeof m !== 'object') return;
    if (m.aquila === 'response' && pending.has(m.id)) {
      const { resolve, reject } = pending.get(m.id);
      pending.delete(m.id);
      if ('error' in m) reject(new Error(m.error));
      else resolve(m.result);
    } else if (m.aquila === 'event') {
      for (const cb of listeners.get(m.name) || []) cb(m.data);
    }
  });
  const call = (method, params) =>
    new Promise((resolve, reject) => {
      const id = ++seq;
      pending.set(id, { resolve, reject });
      window.postMessage({ aquila: 'request', id, method, params }, location.origin);
    });
  const on = (name, cb) => {
    if (!listeners.has(name)) listeners.set(name, new Set());
    listeners.get(name).add(cb);
    return () => listeners.get(name).delete(cb);
  };
  window.aquila = {
    call,
    on,
    info: () => call('info.get'),
    power: () => call('power.get'),
    system: () => call('system.get'),
    sessions: () => call('sessions.status'),
    usage: () => call('usage.get'),
    storage: {
      get: (key) => call('storage.get', { key }),
      set: (key, value) => call('storage.set', { key, value }),
      remove: (key) => call('storage.remove', { key }),
      keys: () => call('storage.keys'),
    },
    notify: (title, body) => call('notify', { title, body }),
    chip: (text) => call('chip.set', { text }),
  };
})();
