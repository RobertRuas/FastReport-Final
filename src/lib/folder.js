// Motor "pasta no disco" (File System Access API, Chrome/Edge no computador).
// Lê e grava ficheiros reais, como o FastReport do Mac: o Finder continua a ser a fonte da verdade.

import { slotPath, IMAGE_RE, natural, planRenames } from './rules.js';

export const folderSupported = () => typeof window !== 'undefined' && 'showDirectoryPicker' in window;
export const META_FILE = 'fastreport.json';
export const LEDGER_FILE = 'fastreport-delivery.json';

const split = (path) => path.split('/').filter(Boolean);

async function dirAt(root, parts, create = false) {
  let d = root;
  for (const p of parts) d = await d.getDirectoryHandle(p, { create });
  return d;
}

async function fileHandle(root, path, create = false) {
  const parts = split(path);
  const name = parts.pop();
  const dir = await dirAt(root, parts, create);
  return dir.getFileHandle(name, { create });
}

export async function ensurePermission(handle, ask = true) {
  const opts = { mode: 'readwrite' };
  if ((await handle.queryPermission?.(opts)) === 'granted') return true;
  if (!ask || !handle.requestPermission) return !handle.queryPermission; // OPFS não tem permissões
  return (await handle.requestPermission(opts)) === 'granted';
}

export async function readFile(root, path) {
  return (await fileHandle(root, path)).getFile();
}

export async function readText(root, path) {
  try {
    return await (await readFile(root, path)).text();
  } catch (e) {
    if (e?.name === 'NotFoundError') return null;
    throw e;
  }
}

/** Escreve um ficheiro. createWritable grava numa cópia e só substitui no close(): se falhar, o original fica. */
export async function writeFile(root, path, data) {
  const h = await fileHandle(root, path, true);
  const w = await h.createWritable();
  try {
    await w.write(data);
    await w.close();
  } catch (e) {
    await w.abort?.().catch(() => {});
    throw e;
  }
}

export async function removeFile(root, path) {
  const parts = split(path);
  const name = parts.pop();
  try {
    await (await dirAt(root, parts)).removeEntry(name);
  } catch (e) {
    if (e?.name !== 'NotFoundError') throw e;
  }
}

async function exists(root, path) {
  try { await fileHandle(root, path); return true; } catch { return false; }
}

/** Move/renomeia. Usa handle.move() quando existe; senão copia e apaga (só depois de copiar). */
export async function moveFile(root, from, to) {
  if (from === to) return;
  if (await exists(root, to)) throw Object.assign(new Error(`exists: ${to}`), { name: 'DestinationExists' });
  const src = await fileHandle(root, from);
  const parts = split(to);
  const name = parts.pop();
  const destDir = await dirAt(root, parts, true);
  if (typeof src.move === 'function') {
    try {
      await src.move(destDir, name);
      return;
    } catch (e) {
      if (!['NotSupportedError', 'InvalidModificationError', 'TypeError'].includes(e?.name)) throw e;
    }
  }
  const file = await src.getFile();
  await writeFile(root, to, file);
  await removeFile(root, from);
}

/** Aplica um conjunto de mudanças { from, to } sem colisões (passa por nomes temporários). */
export async function applyMoves(root, moves) {
  const plan = planRenames(moves, Date.now().toString(36));
  for (const op of plan) await moveFile(root, op.from, op.to);
}

/** Lista as fotos de cada pasta do mapa, por ordem natural do nome. */
export async function scan(root, map) {
  const out = [];
  for (const slot of map.slots) {
    let dir;
    try { dir = await dirAt(root, split(slotPath(slot))); } catch { continue; }
    const files = [];
    for await (const [name, h] of dir.entries()) {
      if (h.kind !== 'file' || name.startsWith('.') || !IMAGE_RE.test(name)) continue;
      files.push({ name, handle: h });
    }
    files.sort((a, b) => natural.compare(a.name, b.name));
    for (const f of files) out.push({ slot: slot.id, name: f.name, path: `${slotPath(slot)}/${f.name}`, file: await f.handle.getFile() });
  }
  return out;
}

/** "Impressão digital" das pastas: muda quando alguém mexe nos ficheiros no Finder. */
export async function signature(root, map) {
  const items = await scan(root, map);
  return items.map((i) => `${i.path}:${i.file.size}:${i.file.lastModified}`).join('|');
}

/** Cria a pasta do projeto dentro de `parent`, com as pastas do mapa e o fastreport.json. */
export async function createProjectFolder(parent, folderName, map, meta) {
  try {
    await parent.getDirectoryHandle(folderName);
    throw Object.assign(new Error('exists'), { name: 'FolderExists' });
  } catch (e) {
    if (e?.name === 'FolderExists') throw e;
  }
  const root = await parent.getDirectoryHandle(folderName, { create: true });
  for (const slot of map.slots) await dirAt(root, split(slotPath(slot)), true);
  await writeFile(root, META_FILE, JSON.stringify(meta, null, 2) + '\n');
  return root;
}

export async function readMeta(root) {
  const text = await readText(root, META_FILE);
  if (text == null) return null;
  return JSON.parse(text);
}

/** Observa mudanças: FileSystemObserver quando existe (Chrome recente), senão releitura periódica. */
export function watch(root, onChange, every = 4000) {
  let observer = null, timer = null, stopped = false;
  if (typeof FileSystemObserver === 'function') {
    try {
      observer = new FileSystemObserver(() => !stopped && onChange());
      observer.observe(root, { recursive: true }).catch(() => (observer = null));
    } catch { observer = null; }
  }
  const tick = () => {
    if (stopped) return;
    if (document.visibilityState === 'visible') onChange();
    timer = setTimeout(tick, observer ? every * 4 : every);
  };
  timer = setTimeout(tick, every);
  const vis = () => document.visibilityState === 'visible' && onChange();
  document.addEventListener('visibilitychange', vis);
  return () => {
    stopped = true;
    clearTimeout(timer);
    observer?.disconnect?.();
    document.removeEventListener('visibilitychange', vis);
  };
}
