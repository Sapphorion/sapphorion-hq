// Local storage (IndexedDB). Everything lives on this device, so Sapphorion HQ works offline.
// The whole HQ is one small record; sync copies that record to a private GitHub repository.
const DB_NAME = 'sapphorion-hq';
const STORE = 'kv';

let dbp = null;
function open() {
  if (dbp) return dbp;
  dbp = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbp;
}

const run = (mode, fn) => open().then(db => new Promise((resolve, reject) => {
  const t = db.transaction(STORE, mode);
  const req = fn(t.objectStore(STORE));
  t.oncomplete = () => resolve(req && req.result);
  t.onerror = () => reject(t.error);
  t.onabort = () => reject(t.error);
}));

export const kvGet = key => run('readonly', s => s.get(key));
export const kvPut = (key, value) => run('readwrite', s => s.put(value, key));
export const kvDel = key => run('readwrite', s => s.delete(key));
