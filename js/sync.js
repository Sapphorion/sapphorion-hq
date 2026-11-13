// Keep HQ the same on every device. Changes upload a few seconds after you make them; other devices
// pick them up when they open or come back into view. If two devices changed things at the same time, you choose.
import { state, onChange, replaceAll } from './state.js';
import { gh } from './github.js';
import { h, modal } from './ui.js';

const LS = 'sapphorion-hq.sync';
const meta = () => { try { return JSON.parse(localStorage.getItem(LS) || '{}'); } catch { return {}; } };
const listeners = new Set();
const setMeta = p => { const m = { ...meta(), ...p }; localStorage.setItem(LS, JSON.stringify(m)); listeners.forEach(f => f(m)); return m; };
export const onSync = f => (listeners.add(f), () => listeners.delete(f));
export const syncInfo = () => ({ ...meta(), connected: gh.ready() });
export const resetSync = () => { localStorage.removeItem(LS); listeners.forEach(f => f({})); };

let busy = null, applying = false, timer = null;
let redraw = () => {};
export const setRedraw = fn => { redraw = fn; };

async function push(prev) {
  const v = await gh.upload(state.data, prev);
  setMeta({ seen: v, dirty: false, lastSync: new Date().toISOString(), error: '' });
}
async function pull(v) {
  const data = await gh.download();
  applying = true;
  try { await replaceAll(data, { quiet: true }); redraw(); } finally { applying = false; }
  setMeta({ seen: v, dirty: false, lastSync: new Date().toISOString(), error: '' });
}

function askConflict() {
  return new Promise(res => {
    const m = modal('Changes on two devices', [
      h('p', {}, 'This device has changes that aren’t synced yet, and another device saved changes too. Which one do you want to keep?'),
      h('div', { class: 'row wrap' },
        h('button', { class: 'btn primary', onclick: () => { m.close(); res('mine'); } }, 'Keep this device’s version'),
        h('button', { class: 'btn', onclick: () => { m.close(); res('cloud'); } }, 'Use the other device’s version'),
        h('button', { class: 'btn ghost', onclick: () => { m.close(); res('later'); } }, 'Decide later')),
      h('p', { class: 'hint' }, 'The version you don’t keep is replaced, but every sync is saved on GitHub, so it can be recovered there.'),
    ]);
  });
}

// Bring this device and the shared copy in line. Safe to call often.
export function syncNow({ quiet = true, sendMine = false } = {}) {
  if (busy) return busy;
  busy = (async () => {
    if (!gh.ready() || !navigator.onLine) return 'skipped';
    setMeta({ syncing: true });
    try {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const v = await gh.version();
          const m = meta();
          if (!v) { await push(null); return 'pushed'; }
          if (v === m.seen) { if (m.dirty || sendMine) { await push(v); return 'pushed'; } setMeta({ lastSync: new Date().toISOString(), error: '' }); return 'same'; }
          if (!m.seen && !m.dirty) { await pull(v); return 'pulled'; }
          if (!m.dirty) { await pull(v); return 'pulled'; }
          const pick = await askConflict();
          if (pick === 'mine') { await push(v); return 'pushed'; }
          if (pick === 'cloud') { await pull(v); return 'pulled'; }
          return 'later';
        } catch (e) { if (e.message === 'conflict' && attempt === 0) continue; throw e; }
      }
      return 'later';
    } catch (e) {
      setMeta({ error: e.message });
      if (!quiet) throw e;
      return 'error';
    } finally { setMeta({ syncing: false }); busy = null; }
  })();
  return busy;
}

let started = false;
export function startSync() {
  if (started) { syncNow(); return; }
  started = true;
  onChange(() => {
    if (applying) return;
    setMeta({ dirty: true }); // remembered even before sync is connected, so connecting never silently overwrites your changes
    if (!gh.ready()) return;
    clearTimeout(timer); timer = setTimeout(() => syncNow(), 5000);
  });
  let last = 0;
  const check = () => { if (gh.ready() && Date.now() - last > 30000) { last = Date.now(); syncNow(); } };
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); else if (meta().dirty) syncNow(); });
  window.addEventListener('online', check);
  window.addEventListener('focus', check);
  setInterval(() => { if (document.visibilityState === 'visible') check(); }, 5 * 60 * 1000);
  syncNow();
}
