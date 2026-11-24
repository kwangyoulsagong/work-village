// Plays Aquila's side of the extension protocol: requests answered from an in-memory store and usage list.
// Kept in localStorage so a reload (forced states) keeps it.
const store = new Proxy({}, {
  get: (_t, k) => { const v = localStorage.getItem('st:' + String(k)); return v == null ? undefined : JSON.parse(v); },
  set: (_t, k, v) => (localStorage.setItem('st:' + String(k), JSON.stringify(v)), true),
});
window.__usage = [{ account: 'work', kind: 'claude', fiveHour: 10, weekly: 5, near: false }];
window.__chips = [];
const reply = (id, result) => window.postMessage({ aquila: 'response', id, result }, '*');
window.addEventListener('message', (e) => {
  const m = e.data;
  if (!m || m.aquila !== 'request') return;
  const p = m.params || {};
  switch (m.method) {
    case 'storage.get': return reply(m.id, store[p.key] ?? null);
    case 'storage.set': store[p.key] = JSON.parse(JSON.stringify(p.value)); return reply(m.id, true);
    case 'storage.remove': localStorage.removeItem('st:' + p.key); return reply(m.id, true);
    case 'storage.keys': return reply(m.id, Object.keys(localStorage).filter((k) => k.startsWith('st:')).map((k) => k.slice(3)));
    case 'usage.get': return reply(m.id, window.__usage);
    case 'power.get': return reply(m.id, { saver: false, onBattery: false });
    case 'chip.set': window.__chips.push(p.text); return reply(m.id, true);
    default: return reply(m.id, null);
  }
});
window.__emit = (name, data) => window.postMessage({ aquila: 'event', name, data }, '*');
window.__store = store;
