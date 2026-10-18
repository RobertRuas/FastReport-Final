// Armazenamento local (IndexedDB). Projetos = metadados pequenos; fotos = blobs JPEG.

const DB_NAME = 'fastreport';
const VERSION = 1;
let dbp;

function open() {
  dbp ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('projects')) db.createObjectStore('projects', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('blobs')) {
        const s = db.createObjectStore('blobs', { keyPath: 'id' });
        s.createIndex('projectId', 'projectId');
      }
      if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbp;
}

function done(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('abort'));
  });
}

function result(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function loadAll() {
  const db = await open();
  const tx = db.transaction(['projects', 'blobs', 'settings'], 'readonly');
  const [projects, blobs, keys, values] = await Promise.all([
    result(tx.objectStore('projects').getAll()),
    result(tx.objectStore('blobs').getAll()),
    result(tx.objectStore('settings').getAllKeys()),
    result(tx.objectStore('settings').getAll())
  ]);
  const settings = Object.fromEntries(keys.map((k, i) => [k, values[i]]));
  return { projects, blobs, settings };
}

export async function putProject(record) {
  const db = await open();
  const tx = db.transaction('projects', 'readwrite');
  tx.objectStore('projects').put(record);
  await done(tx);
}

export async function putBlob(record) {
  const db = await open();
  const tx = db.transaction('blobs', 'readwrite');
  tx.objectStore('blobs').put(record);
  await done(tx);
}

export async function getBlob(id) {
  const db = await open();
  return result(db.transaction('blobs').objectStore('blobs').get(id));
}

export async function deleteBlobs(ids) {
  if (!ids.length) return;
  const db = await open();
  const tx = db.transaction('blobs', 'readwrite');
  const s = tx.objectStore('blobs');
  for (const id of ids) s.delete(id);
  await done(tx);
}

export async function deleteProject(id) {
  const db = await open();
  const tx = db.transaction(['projects', 'blobs'], 'readwrite');
  tx.objectStore('projects').delete(id);
  const idx = tx.objectStore('blobs').index('projectId');
  const keys = await result(idx.getAllKeys(IDBKeyRange.only(id)));
  for (const k of keys) tx.objectStore('blobs').delete(k);
  await done(tx);
}

export async function putSetting(key, value) {
  const db = await open();
  const tx = db.transaction('settings', 'readwrite');
  tx.objectStore('settings').put(value, key);
  await done(tx);
}
