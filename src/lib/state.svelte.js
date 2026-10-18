import t24 from './inspection-t24.json';
import tendons from './tendons-retrofit.json';
import * as db from './db.js';
import * as fs from './folder.js';
import { makeZip, readZip } from './zip.js';
import { t, lang, locale } from './i18n.svelte.js';
import * as rules from './rules.js';

export const MAPS = [t24, tendons];
export const mapById = (id) => MAPS.find((m) => m.id === id);
// Definições de imagem (iguais às do Mac): tamanho máximo e qualidade JPEG.
export const IMAGE_SIZES = [1024, 1600, 2048];
export const QUALITIES = [{ id: 'high', value: 0.85 }, { id: 'medium', value: 0.7 }];
export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0';
export const UI_SIZES = [0.9, 1, 1.1, 1.2];
/** Idioma do iPhone: a primeira língua preferida decide; só português fica em PT, o resto em inglês. */
export const deviceLang = () => {
  const first = navigator.languages?.[0] || navigator.language || Intl.DateTimeFormat().resolvedOptions().locale || 'en';
  return first.toLowerCase().startsWith('pt') ? 'pt' : 'en';
};

let uid = 0;
const newId = (p = 'id') => `${p}${Date.now().toString(36)}${(uid++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const app = $state({
  ready: false,
  projects: [],
  projectId: null,
  settingsOpen: false,
  tab: 'inbox',
  triage: null, // { index }
  viewer: null, // { slotId, index }
  sheet: null, // 'new' | 'export' | 'menu' | 'homeMenu'
  alert: null, // { title, body, actions: [{label, style, run}] }
  toast: null,
  busy: null, // { text, done, total }
  cols: 'auto', // 'auto' ou número fixo
  width: typeof window !== 'undefined' ? window.innerWidth : 390,
  theme: 'auto', // 'auto' | 'light' | 'dark'
  langPref: 'auto', // 'auto' | 'pt' | 'en'
  ui: 1, // tamanho da interface (escala de elementos e letra)
  zipLayout: 'folders', // 'folders' (estrutura de pastas) | 'flat' (só as fotos numa pasta)
  group: null,
  persisted: false,
  updateReady: false,
  imagePx: 1024,
  jpegQuality: 0.85,
  shortcuts: false, // folha de atalhos aberta
  notes: false, // notas da versão abertas
  seenVersion: null
});

// ---------- Mapas e slots ----------

export const { slotToken, slotPath, groupsOf, orderedSlots, slugify } = rules;

export function slotLabel(slot, short = false) {
  if (slot.isInbox) return t('slot.inbox');
  if (slot.isTrash) return t('slot.trash');
  if (slot.folder === 'General') return t('slot.general');
  if (slot.group && !short) return `${slot.group} · ${slot.folder}`;
  return slot.folder;
}

export function mapName(map) {
  return map.name[lang.code] ?? map.name.pt;
}

export function fileName(project, slot, index) {
  return rules.formatName(mapById(project.mapId).fileNamePattern, project.slug, slot, index);
}

export const isFolder = (p) => p?.kind === 'folder';

/** Caminho do ficheiro dentro da pasta do projeto (modo pasta). */
function pathOf(project, photo) {
  const slot = mapById(project.mapId).slots.find((s) => s.id === photo.slot);
  return `${slotPath(slot)}/${photo.name}`;
}

// ---------- Persistência ----------

const saveTimers = new Map();
function record(p) {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    mapId: p.mapId,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    exportedAt: p.exportedAt,
    kind: p.kind ?? 'internal',
    handle: p.handle ?? null,
    placed: isFolder(p) ? [] : [...(p.placed ?? [])],
    photos: p.photos.map((x) => ({ id: x.id, slot: x.slot, w: x.w, h: x.h, bytes: x.bytes, ...(isFolder(p) ? { name: x.name } : {}) }))
  };
}

/** Grava o projeto (agrupa alterações seguidas). */
export function save(p, immediate = false) {
  clearTimeout(saveTimers.get(p.id));
  const run = () => {
    saveTimers.delete(p.id);
    db.putProject(record(p)).catch((e) => console.error('save', e));
  };
  if (immediate) run();
  else saveTimers.set(p.id, setTimeout(run, 250));
}

function touched(p) {
  p.updatedAt = new Date().toISOString();
  p.exportedAt = null;
  save(p);
}

async function storePhoto(projectId, id, full, thumb) {
  await db.putBlob({ id, projectId, full, thumb });
}

function urls(full, thumb) {
  return { full: URL.createObjectURL(full), thumb: URL.createObjectURL(thumb) };
}

export async function boot() {
  try {
    const { projects, blobs, settings } = await db.loadAll();
    const byId = new Map(blobs.map((b) => [b.id, b]));
    app.projects = projects
      .map((r) =>
        r.kind === 'folder'
          ? { ...r, undo: [], placed: [], loaded: false } // fotos lidas do disco ao abrir
          : {
              ...r,
              undo: [],
              placed: r.placed ?? [],
              photos: r.photos
                .filter((x) => byId.has(x.id))
                .map((x) => ({ ...x, ...urls(byId.get(x.id).full, byId.get(x.id).thumb) }))
            }
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (settings.cols) app.cols = settings.cols;
    // 'langPref' substitui o antigo 'lang' da 1.0, que fixava PT sem querer.
    if (['auto', 'pt', 'en'].includes(settings.langPref)) app.langPref = settings.langPref;
    if (settings.theme) app.theme = settings.theme;
    if (UI_SIZES.includes(settings.ui)) app.ui = settings.ui;
    if (['folders', 'flat'].includes(settings.zipLayout)) app.zipLayout = settings.zipLayout;
    if (IMAGE_SIZES.includes(settings.imagePx)) app.imagePx = settings.imagePx;
    if (QUALITIES.some((q) => q.value === settings.jpegQuality)) app.jpegQuality = settings.jpegQuality;
    app.seenVersion = settings.seenVersion ?? null;
  } catch (e) {
    console.error('boot', e);
  }
  applyLang();
  applyTheme();
  applyUi();
  addEventListener('resize', () => (app.width = innerWidth));
  addEventListener('languagechange', applyLang);
  try {
    app.persisted = (await navigator.storage?.persisted?.()) ?? false;
  } catch {}
  app.ready = true;
  // Notas da versão: aparecem uma vez depois de uma atualização (não na primeira instalação).
  if (app.seenVersion && rules.compareVersions(APP_VERSION, app.seenVersion) > 0) app.notes = true;
  if (app.seenVersion !== APP_VERSION) db.putSetting('seenVersion', APP_VERSION).catch(() => {});
}

export async function requestPersistence() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
      app.persisted = await navigator.storage.persist();
    } else {
      app.persisted = (await navigator.storage?.persisted?.()) ?? false;
    }
  } catch {}
}

/** Colunas em uso: automático = pela largura do ecrã (5 num iPhone normal). */
export function colsNow() {
  if (app.cols !== 'auto') return app.cols;
  return Math.max(4, Math.min(7, Math.round(app.width / (80 * app.ui))));
}

export function setCols(n) {
  app.cols = n;
  db.putSetting('cols', n).catch(() => {});
}

function applyLang() {
  lang.code = app.langPref === 'auto' ? deviceLang() : app.langPref;
  document.documentElement.lang = lang.code === 'en' ? 'en' : 'pt-PT';
}

export function setLang(pref) {
  app.langPref = pref;
  applyLang();
  db.putSetting('langPref', pref).catch(() => {});
}

function applyTheme() {
  const root = document.documentElement;
  if (app.theme === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', app.theme);
  const dark = app.theme === 'dark' || (app.theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', dark ? '#000000' : '#f2f2f7'));
}

export function setTheme(theme) {
  app.theme = theme;
  applyTheme();
  db.putSetting('theme', theme).catch(() => {});
}

function applyUi() {
  document.documentElement.style.fontSize = `${16 * app.ui}px`;
}

export function setUi(v) {
  app.ui = v;
  applyUi();
  db.putSetting('ui', v).catch(() => {});
}

export function setImagePx(v) {
  app.imagePx = v;
  db.putSetting('imagePx', v).catch(() => {});
}

export function setQuality(v) {
  app.jpegQuality = v;
  db.putSetting('jpegQuality', v).catch(() => {});
}

export function setZipLayout(v) {
  app.zipLayout = v;
  db.putSetting('zipLayout', v).catch(() => {});
}

if (typeof window !== 'undefined') matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => applyTheme());

// ---------- Projeto ----------

export function current() {
  return app.projects.find((p) => p.id === app.projectId) ?? null;
}

export function photosIn(project, slotId) {
  return project.photos.filter((p) => p.slot === slotId);
}

export function inboxSlot(project) {
  return mapById(project.mapId).slots.find((s) => s.isInbox);
}

export function trashSlot(project) {
  return mapById(project.mapId).slots.find((s) => s.isTrash);
}

export function stats(project) {
  const inbox = inboxSlot(project).id;
  const trash = trashSlot(project)?.id;
  let pending = 0, trashed = 0, bytes = 0;
  for (const ph of project.photos) {
    if (ph.slot === inbox) pending++;
    else if (ph.slot === trash) trashed++;
    bytes += ph.bytes || 0;
  }
  const total = project.photos.length;
  return { total, pending, trashed, sorted: total - pending - trashed, bytes };
}

export function nameTaken(name, exceptId = null) {
  const slug = slugify(name).toLowerCase();
  return app.projects.some((p) => p.id !== exceptId && p.slug.toLowerCase() === slug);
}

export function createProject(name, mapId, extra = {}) {
  const now = new Date().toISOString();
  const p = {
    id: newId('p'),
    name: name.trim(),
    slug: slugify(name),
    mapId,
    createdAt: now,
    updatedAt: now,
    exportedAt: null,
    photos: [],
    undo: [],
    placed: [],
    ...extra
  };
  app.projects.unshift(p);
  const proxied = app.projects[0]; // usar sempre a versão reativa
  save(proxied, true);
  requestPersistence();
  return proxied;
}

export async function deleteProject(id) {
  const i = app.projects.findIndex((p) => p.id === id);
  if (i < 0) return;
  const [p] = app.projects.splice(i, 1);
  if (app.projectId === id) app.projectId = null;
  clearTimeout(saveTimers.get(id));
  stopWatch(id);
  for (const ph of p.photos) { if (ph.full) URL.revokeObjectURL(ph.full); if (ph.thumb) URL.revokeObjectURL(ph.thumb); }
  // Modo pasta: só sai da lista. Os ficheiros no disco ficam intactos.
  if (isFolder(p)) await db.deleteThumbs(id).catch(() => {});
  await db.deleteProject(id);
}

// ---------- Pasta no disco (Chrome/Edge) ----------

export const folderSupported = fs.folderSupported;
const queues = new Map(); // id do projeto → promessa (operações no disco em fila, uma de cada vez)
const watchers = new Map();
const flushTimers = new Map();
const sigs = new Map();
const ledgers = new Map(); // id → { placedIDs } vindos do Mac (preservados)

function enqueue(p, job) {
  const prev = queues.get(p.id) ?? Promise.resolve();
  const next = prev.then(job).catch((e) => {
    console.error('folder', e);
    diskError(p, e);
  });
  queues.set(p.id, next);
  return next;
}

function diskError(p, e) {
  toast(e?.name === 'NotAllowedError' ? t('folder.noPermission') : t('folder.error'), 'danger');
  // Volta a ler o disco para o ecrã mostrar o que lá está de facto.
  enqueue(p, () => reload(p, true));
}

function metaFor(name, mapId, createdAt) {
  return { createdAt: createdAt.replace(/\.\d{3}Z$/, 'Z'), displayName: name, mapId, schemaVersion: 1 };
}

/** Novo projeto numa pasta real: escolhe-se a pasta-mãe e cria-se lá "<Nome>/Inbox, T1…". */
export async function createFolderProject(name, mapId) {
  const parent = await window.showDirectoryPicker({ id: 'fastreport-parent', mode: 'readwrite', startIn: 'documents' });
  const map = mapById(mapId);
  const folderName = name.trim().replace(/[\/\\:\0]/g, '-');
  const now = new Date().toISOString();
  const handle = await fs.createProjectFolder(parent, folderName, map, metaFor(name.trim(), mapId, now));
  const p = createProject(name, mapId, { kind: 'folder', handle, createdAt: now, loaded: true });
  sigs.set(p.id, await fs.signature(handle, map));
  startWatch(p);
  return p;
}

/** Abre uma pasta de projeto do FastReport (com fastreport.json), por exemplo criada no Mac. */
export async function openFolderProject(handle) {
  handle ??= await window.showDirectoryPicker({ id: 'fastreport-open', mode: 'readwrite' });
  const known = [];
  for (const p of app.projects) if (isFolder(p) && p.handle && (await p.handle.isSameEntry?.(handle))) known.push(p);
  if (known[0]) return (await openProject(known[0])) ? known[0] : null;
  const meta = await fs.readMeta(handle);
  if (!meta) throw new Error(t('folder.notProject'));
  const map = mapById(meta.mapId);
  if (!map) throw new Error(t('zip.unknownMap', { id: meta.mapId }));
  let name = (meta.displayName || handle.name).trim();
  const createdAt = meta.createdAt ? new Date(meta.createdAt).toISOString() : new Date().toISOString();
  const p = createProject(name, map.id, { kind: 'folder', handle, createdAt, loaded: false, exportedAt: null });
  if (!(await openProject(p))) return null;
  return p;
}

/** Abre um projeto. No modo pasta pede acesso (se preciso) e lê o disco. */
export async function openProject(p) {
  if (isFolder(p)) {
    try {
      if (!(await fs.ensurePermission(p.handle))) { toast(t('folder.noPermission'), 'danger'); return false; }
      await reload(p, false, true);
    } catch (e) {
      console.error(e);
      app.alert = { title: t('folder.title'), body: e?.name === 'NotFoundError' ? t('folder.missing') : e.message, actions: [{ label: t('app.ok'), style: 'default' }] };
      return false;
    }
    startWatch(p);
  }
  app.tab = stats(p).pending ? 'inbox' : 'review';
  app.projectId = p.id;
  return true;
}

export function closeProject() {
  const p = current();
  if (p && isFolder(p)) stopWatch(p.id);
  app.projectId = null;
}

const thumbKey = (p, file) => `${p.id}|${file.size}|${file.lastModified}`;

async function thumbFor(p, file) {
  const key = thumbKey(p, file);
  const hit = await db.getThumb(key).catch(() => null);
  if (hit) return hit;
  const bmp = await decode(file, file.name);
  const w = bmp.width || bmp.naturalWidth, h = bmp.height || bmp.naturalHeight;
  const c = drawScaled(bmp, 256);
  bmp.close?.();
  const thumb = await toBlob(c, 0.75);
  c.width = c.height = 0;
  const rec = { thumb, w, h };
  db.putThumb(key, rec).catch(() => {});
  return rec;
}

/** Lê as pastas do disco e reconstrói a lista de fotos (mantém os ids das que já conhecia). */
async function reload(p, quiet = false, first = false) {
  const map = mapById(p.mapId);
  if (!first) await flushNow(p);
  const items = await fs.scan(p.handle, map);
  const byDisk = new Map(p.loaded ? p.photos.map((x) => [x.disk, x]) : []);
  if (!quiet && items.length > 30) app.busy = { text: 'open', done: 0, total: items.length };
  const photos = [];
  let k = 0;
  const pool = async () => {
    while (k < items.length) {
      const i = k++;
      const it = items[i];
      const old = byDisk.get(it.path);
      try {
        const same = old && old.bytes === it.file.size && old._mod === it.file.lastModified;
        const th = same ? null : await thumbFor(p, it.file);
        if (old?.full) URL.revokeObjectURL(old.full);
        if (!same && old?.thumb) URL.revokeObjectURL(old.thumb);
        photos[i] = {
          id: old?.id ?? newId('f'),
          slot: it.slot,
          name: it.name,
          disk: it.path,
          bytes: it.file.size,
          _mod: it.file.lastModified,
          w: same ? old.w : th.w,
          h: same ? old.h : th.h,
          full: URL.createObjectURL(it.file),
          thumb: same ? old.thumb : URL.createObjectURL(th.thumb)
        };
      } catch (e) {
        console.warn('scan', it.path, e);
      }
      if (app.busy?.text === 'open') app.busy.done++;
    }
  };
  await Promise.all([pool(), pool(), pool(), pool()]);
  const next = photos.filter(Boolean);
  const keep = new Set(next.map((x) => x.id));
  for (const old of p.photos) if (!keep.has(old.id)) { if (old.full) URL.revokeObjectURL(old.full); if (old.thumb) URL.revokeObjectURL(old.thumb); }
  p.photos = next;
  p.undo = p.undo.filter((u) => keep.has(u.id));
  // Entrega: as marcações do Mac são por caminho; os ids do Mac (inode) guardam-se tal como vêm.
  const ledger = rules.parseLedger((await fs.readText(p.handle, fs.LEDGER_FILE)) ?? '');
  ledgers.set(p.id, ledger);
  const placedPaths = new Set(ledger.placedPaths);
  p.placed = next.filter((x) => placedPaths.has(x.disk)).map((x) => x.id);
  p.loaded = true;
  sigs.set(p.id, await fs.signature(p.handle, map));
  if (app.busy?.text === 'open') app.busy = null;
  save(p);
  if (!first && !quiet) toast(t('folder.synced'));
}

function startWatch(p) {
  stopWatch(p.id);
  const stop = fs.watch(p.handle, () => {
    if (queues.get(p.id + ':checking')) return;
    queues.set(p.id + ':checking', true);
    enqueue(p, async () => {
      try {
        const sig = await fs.signature(p.handle, mapById(p.mapId));
        if (sig !== sigs.get(p.id)) await reload(p);
      } finally {
        queues.delete(p.id + ':checking');
      }
    });
  });
  watchers.set(p.id, stop);
}

function stopWatch(id) {
  watchers.get(id)?.();
  watchers.delete(id);
}

/** Grava no disco as mudanças de nome/pasta pendentes (agrupa alterações seguidas). */
function scheduleFlush(p) {
  clearTimeout(flushTimers.get(p.id));
  flushTimers.set(p.id, setTimeout(() => enqueue(p, () => flushNow(p)), 120));
}

async function flushNow(p) {
  clearTimeout(flushTimers.get(p.id));
  const moves = [];
  for (const ph of p.photos) {
    const to = pathOf(p, ph);
    if (ph.disk && ph.disk !== to) moves.push({ ph, from: ph.disk, to });
  }
  if (!moves.length) return;
  await fs.applyMoves(p.handle, moves);
  const ledger = ledgers.get(p.id) ?? rules.emptyLedger();
  for (const m of moves) {
    m.ph.disk = m.to;
    const file = await fs.readFile(p.handle, m.to);
    if (m.ph.full) URL.revokeObjectURL(m.ph.full);
    m.ph.full = URL.createObjectURL(file);
    m.ph._mod = file.lastModified;
    // Mesma miniatura com a chave nova (a cópia muda a data do ficheiro).
    db.getThumb(thumbKey(p, { size: m.ph.bytes, lastModified: m.ph._mod })).then((hit) => hit || fetch(m.ph.thumb).then((r) => r.blob()).then((thumb) => db.putThumb(thumbKey(p, file), { thumb, w: m.ph.w, h: m.ph.h }))).catch(() => {});
    ledger.placedPaths = ledger.placedPaths.map((x) => (x === m.from ? m.to : x));
  }
  if (p.placed.length || ledger.placedPaths.length) await writeLedger(p);
  sigs.set(p.id, await fs.signature(p.handle, mapById(p.mapId)));
}

async function writeLedger(p) {
  const old = ledgers.get(p.id) ?? rules.emptyLedger();
  const placed = new Set(p.placed);
  const ledger = { schemaVersion: 1, placedIDs: old.placedIDs, placedPaths: p.photos.filter((x) => placed.has(x.id)).map((x) => x.disk) };
  ledgers.set(p.id, ledger);
  await fs.writeFile(p.handle, fs.LEDGER_FILE, rules.serializeLedger(ledger));
}

/** Nome do ficheiro quando uma foto chega a um slot no modo pasta (regras do Mac). */
function folderName(project, photo, slot, preferred) {
  const others = project.photos.filter((x) => x.slot === slot.id && x.id !== photo.id).map((x) => x.name);
  if (slot.isInbox) return rules.uniqueJpegName(preferred ?? photo.name, others);
  return fileName(project, slot, rules.nextIndex(others));
}

/** Renumera um slot pela ordem atual: _1, _2, _3… (reordenar no Mac). */
function renumber(project, slotId) {
  const slot = mapById(project.mapId).slots.find((s) => s.id === slotId);
  if (slot.isInbox) return;
  photosIn(project, slotId).forEach((ph, i) => (ph.name = fileName(project, slot, i + 1)));
}

// ---------- Mover, desfazer ----------

/** Move uma foto para um slot. toIndex é a posição dentro do slot (null = fim). */
export function movePhoto(project, photoId, toSlot, toIndex = null, rec = true, prevName = null) {
  const arr = project.photos;
  const from = arr.findIndex((p) => p.id === photoId);
  if (from < 0) return;
  const photo = arr[from];
  const fromSlot = photo.slot;
  const fromIndex = arr.filter((p) => p.slot === fromSlot).findIndex((p) => p.id === photoId);
  const sameEnd = toIndex == null && fromIndex === photosIn(project, toSlot).length - 1;
  if (fromSlot === toSlot && (toIndex === fromIndex || sameEnd)) return;
  const oldName = photo.name;
  arr.splice(from, 1);
  const target = arr.filter((p) => p.slot === toSlot);
  let insertAt;
  if (isFolder(project) && toIndex == null && fromSlot !== toSlot) {
    // Classificar: o ficheiro recebe o menor número livre e fica no seu lugar pela ordem dos nomes.
    const slot = mapById(project.mapId).slots.find((s) => s.id === toSlot);
    photo.name = folderName(project, photo, slot, prevName);
    const after = slot.isInbox ? null : target.find((x) => rules.natural.compare(x.name, photo.name) > 0);
    insertAt = after ? arr.indexOf(after) : target.length ? arr.indexOf(target[target.length - 1]) + 1 : arr.length;
  } else if (toIndex == null || toIndex >= target.length) {
    insertAt = target.length ? arr.indexOf(target[target.length - 1]) + 1 : arr.length;
  } else {
    insertAt = arr.indexOf(target[Math.max(0, toIndex)]);
  }
  photo.slot = toSlot;
  arr.splice(insertAt, 0, photo);
  if (isFolder(project) && !(toIndex == null && fromSlot !== toSlot)) {
    const slot = mapById(project.mapId).slots.find((s) => s.id === toSlot);
    if (slot.isInbox && fromSlot !== toSlot) photo.name = folderName(project, photo, slot, prevName);
    renumber(project, toSlot);
  }
  if (rec) project.undo.push({ type: 'move', id: photoId, slot: fromSlot, index: fromIndex, name: oldName });
  touched(project);
  if (isFolder(project)) scheduleFlush(project);
}

export function undo(project) {
  const last = project.undo.pop();
  if (!last) return null;
  const photo = project.photos.find((p) => p.id === last.id);
  if (!photo) return null;
  if (last.type === 'move') {
    movePhoto(project, last.id, last.slot, last.index, false, last.name);
  } else if (last.type === 'image') {
    const { full, thumb, blobs, w, h, bytes } = last.before;
    if (isFolder(project)) {
      enqueue(project, async () => {
        await fs.writeFile(project.handle, photo.disk, blobs.full);
        await afterWrite(project, photo, blobs.thumb, w, h);
      });
    } else {
      Object.assign(photo, { full, thumb, w, h, bytes });
      storePhoto(project.id, photo.id, blobs.full, blobs.thumb);
    }
    touched(project);
  }
  return last;
}

export async function emptyTrash(project) {
  const trash = trashSlot(project).id;
  const gone = project.photos.filter((p) => p.slot === trash);
  project.photos = project.photos.filter((p) => p.slot !== trash);
  const ids = new Set(gone.map((p) => p.id));
  project.undo = project.undo.filter((u) => !ids.has(u.id));
  project.placed = (project.placed ?? []).filter((id) => !ids.has(id));
  touched(project);
  if (isFolder(project)) {
    await enqueue(project, async () => {
      await flushNow(project);
      for (const ph of gone) await fs.removeFile(project.handle, ph.disk);
      sigs.set(project.id, await fs.signature(project.handle, mapById(project.mapId)));
    });
  } else {
    await db.deleteBlobs([...ids]);
  }
  for (const p of gone) { URL.revokeObjectURL(p.full); URL.revokeObjectURL(p.thumb); }
  return gone.length;
}

// ---------- Entrega (marcar fotos já colocadas no relatório) ----------

export const isPlaced = (project, photo) => (project.placed ?? []).includes(photo.id);

export function setPlaced(project, photo, on = !isPlaced(project, photo)) {
  const set = new Set(project.placed ?? []);
  if (on) set.add(photo.id);
  else set.delete(photo.id);
  project.placed = [...set];
  if (isFolder(project)) enqueue(project, () => writeLedger(project));
  else save(project);
}

export function resetPlaced(project) {
  project.placed = [];
  if (isFolder(project)) enqueue(project, () => writeLedger(project));
  else save(project);
}

// ---------- Imagens ----------

const toBlob = (canvas, q) => new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('toBlob'))), 'image/jpeg', q));

/** Gera o JPEG final e uma miniatura a partir de um canvas. */
async function encode(canvas) {
  const full = await toBlob(canvas, app.jpegQuality);
  const tw = 256, th = Math.max(1, Math.round((256 * canvas.height) / canvas.width));
  const tc = document.createElement('canvas');
  tc.width = tw; tc.height = th;
  tc.getContext('2d').drawImage(canvas, 0, 0, tw, th);
  const thumb = await toBlob(tc, 0.75);
  tc.width = tc.height = 0;
  return { full, thumb, w: canvas.width, h: canvas.height, bytes: full.size };
}

const isHeic = (blob, name = '') => /hei[cf]/i.test(blob.type) || /\.hei[cf]$/i.test(name);

async function decode(blob, name = blob.name) {
  try {
    return await createImageBitmap(blob, { imageOrientation: 'from-image' });
  } catch {
    const url = URL.createObjectURL(blob);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return img;
    } catch (e) {
      // HEIC fora do Safari: descodificador WASM, carregado só quando é preciso.
      if (!isHeic(blob, name)) throw e;
      const { default: heic2any } = await import('heic2any');
      const jpeg = await heic2any({ blob, toType: 'image/jpeg', quality: 0.95 });
      return createImageBitmap(Array.isArray(jpeg) ? jpeg[0] : jpeg);
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

function drawScaled(source, max = app.imagePx) {
  const sw = source.width || source.naturalWidth, sh = source.height || source.naturalHeight;
  const scale = Math.min(1, max / Math.max(sw, sh));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(sw * scale));
  c.height = Math.max(1, Math.round(sh * scale));
  const ctx = c.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, c.width, c.height);
  return c;
}

/** Ficheiro JPEG completo de uma foto, venha do IndexedDB ou do disco. */
export async function photoBlob(project, photo) {
  if (isFolder(project)) return fs.readFile(project.handle, photo.disk);
  return (await db.getBlob(photo.id))?.full ?? null;
}

async function afterWrite(project, photo, thumb, w, h) {
  const file = await fs.readFile(project.handle, photo.disk);
  if (photo.full) URL.revokeObjectURL(photo.full);
  if (photo.thumb) URL.revokeObjectURL(photo.thumb);
  Object.assign(photo, { full: URL.createObjectURL(file), thumb: URL.createObjectURL(thumb), w, h, bytes: file.size, _mod: file.lastModified });
  db.putThumb(thumbKey(project, file), { thumb, w, h }).catch(() => {});
  sigs.set(project.id, await fs.signature(project.handle, mapById(project.mapId)));
}

export async function editPhoto(project, photo, kind, crop) {
  const run = async () => {
    const src = await photoBlob(project, photo);
    if (!src) return;
    const img = await decode(src);
    const w = img.width || img.naturalWidth, h = img.height || img.naturalHeight;
    const c = document.createElement('canvas');
    const ctx = c.getContext('2d');
    if (kind === 'rotate') {
      c.width = h; c.height = w;
      ctx.translate(h, 0); ctx.rotate(Math.PI / 2);
      ctx.drawImage(img, 0, 0);
    } else if (kind === 'flip') {
      c.width = w; c.height = h;
      ctx.translate(w, 0); ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0);
    } else if (kind === 'crop') {
      const sx = crop.x * w, sy = crop.y * h, sw = crop.w * w, sh = crop.h * h;
      c.width = Math.max(1, Math.round(sw)); c.height = Math.max(1, Math.round(sh));
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
    }
    img.close?.();
    const out = await encode(c);
    c.width = c.height = 0;
    const beforeThumb = isFolder(project) ? await fetch(photo.thumb).then((r) => r.blob()) : (await db.getBlob(photo.id)).thumb;
    project.undo.push({
      type: 'image',
      id: photo.id,
      before: { full: photo.full, thumb: photo.thumb, w: photo.w, h: photo.h, bytes: photo.bytes, blobs: { full: src, thumb: beforeThumb } }
    });
    if (isFolder(project)) {
      // Guarda o original em memória (para desfazer) antes de o substituir no disco.
      const keep = new Blob([await src.arrayBuffer()], { type: 'image/jpeg' });
      project.undo[project.undo.length - 1].before.blobs.full = keep;
      await fs.writeFile(project.handle, photo.disk, out.full);
      await afterWrite(project, photo, out.thumb, out.w, out.h);
    } else {
      await storePhoto(project.id, photo.id, out.full, out.thumb);
      Object.assign(photo, urls(out.full, out.thumb), { w: out.w, h: out.h, bytes: out.bytes });
    }
    touched(project);
  };
  if (isFolder(project)) {
    await enqueue(project, async () => { await flushNow(project); await run(); });
  } else {
    await run();
  }
}

// ---------- Importar fotos (fototeca, câmara ou arrastar do Finder) ----------

export async function importFiles(project, files) {
  const list = [...files].filter((f) => f.type.startsWith('image/') || rules.IMAGE_RE.test(f.name));
  if (!list.length) return;
  const inbox = inboxSlot(project);
  app.busy = { text: 'import', done: 0, total: list.length };
  let failed = 0;
  const work = async () => {
    for (const file of list) {
      try {
        const bmp = await decode(file, file.name);
        const c = drawScaled(bmp);
        bmp.close?.();
        const out = await encode(c);
        c.width = c.height = 0;
        const id = newId('f');
        if (isFolder(project)) {
          const names = photosIn(project, inbox.id).map((x) => x.name);
          const name = rules.uniqueJpegName(file.name || 'photo', names);
          const disk = `${slotPath(inbox)}/${name}`;
          await fs.writeFile(project.handle, disk, out.full);
          const saved = await fs.readFile(project.handle, disk);
          db.putThumb(thumbKey(project, saved), { thumb: out.thumb, w: out.w, h: out.h }).catch(() => {});
          project.photos.push({ id, slot: inbox.id, name, disk, w: out.w, h: out.h, bytes: saved.size, _mod: saved.lastModified, full: URL.createObjectURL(saved), thumb: URL.createObjectURL(out.thumb) });
        } else {
          await storePhoto(project.id, id, out.full, out.thumb);
          project.photos.push({ id, slot: inbox.id, w: out.w, h: out.h, bytes: out.bytes, ...urls(out.full, out.thumb) });
        }
        if (app.busy.done % 10 === 9) save(project);
      } catch (e) {
        console.warn('import', file.name, e);
        failed++;
      }
      app.busy.done++;
    }
    if (isFolder(project)) sigs.set(project.id, await fs.signature(project.handle, mapById(project.mapId)));
  };
  if (isFolder(project)) await enqueue(project, async () => { await flushNow(project); await work(); });
  else await work();
  app.busy = null;
  touched(project);
  save(project, true);
  requestPersistence();
  const ok = list.length - failed;
  if (ok) toast(ok === 1 ? t('project.imported1') : t('project.imported', { n: ok }));
  if (failed) setTimeout(() => toast(t('project.importFailed', { n: failed })), 1900);
}

// ---------- Exportar ZIP (mesma estrutura de pastas do Mac) ----------

export function exportPlan(project) {
  const map = mapById(project.mapId);
  const folders = orderedSlots(map)
    .filter((s) => !s.isTrash)
    .map((slot) => ({ slot, photos: photosIn(project, slot.id) }));
  return folders;
}

function safeFolder(name, fallback) {
  return name.replace(/[\/\\:\0]/g, '-').replace(/\.+$/, '').trim() || fallback;
}

/** Nome único dentro de uma pasta: "a.jpeg", "a-2.jpeg", "a-3.jpeg"… */
function uniqueName(name, used) {
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name, ext = dot > 0 ? name.slice(dot) : '';
  let out = name;
  for (let k = 2; used.has(out.toLowerCase()); k++) out = `${base}-${k}${ext}`;
  used.add(out.toLowerCase());
  return out;
}

/** layout: 'folders' (pastas do mapa + fastreport.json) ou 'flat' (todas as fotos numa só pasta). */
export async function buildZip(project, onProgress, layout = 'folders') {
  const map = mapById(project.mapId);
  const flat = layout === 'flat';
  const root = safeFolder(project.name, project.slug) + '/';
  const entries = [{ name: root }];
  if (!flat) {
    for (const slot of map.slots) {
      if (slot.group && !entries.some((e) => e.name === `${root}${slot.group}/`)) entries.push({ name: `${root}${slot.group}/` });
      entries.push({ name: `${root}${slotPath(slot)}/` });
    }
  }
  const used = new Set();
  for (const { slot, photos } of exportPlan(project)) {
    for (let i = 0; i < photos.length; i++) {
      const full = await photoBlob(project, photos[i]);
      const name = slot.isInbox ? `${project.slug}_Inbox_${i + 1}.jpeg` : fileName(project, slot, i + 1);
      const path = flat ? root + uniqueName(name, used) : `${root}${slotPath(slot)}/${name}`;
      entries.push({ name: path, data: full });
    }
  }
  if (!flat) {
    const meta = {
      createdAt: project.createdAt.replace(/\.\d{3}Z$/, 'Z'),
      displayName: project.name,
      mapId: project.mapId,
      schemaVersion: 1
    };
    entries.push({ name: `${root}fastreport.json`, data: JSON.stringify(meta, null, 2) + '\n' });
  }
  const blob = await makeZip(entries, onProgress);
  return new File([blob], `${project.slug}${flat ? '_fotos' : ''}.zip`, { type: 'application/zip' });
}

export function markExported(project) {
  project.exportedAt = new Date().toISOString();
  save(project, true);
}

// ---------- Importar ZIP do FastReport (Mac ou outro iPhone) ----------

const natural = rules.natural;

export async function importZip(file) {
  app.busy = { text: 'zip', done: 0, total: 1 };
  try {
    const entries = (await readZip(file)).filter((e) => !e.name.split('/').some((p) => p.startsWith('.') || p === '__MACOSX'));
    const metaEntry = entries.find((e) => /(^|\/)\.?fastreport\.json$/.test(e.name));
    if (!metaEntry) throw new Error(t('zip.invalid'));
    const meta = JSON.parse(new TextDecoder().decode(await metaEntry.read()));
    const map = mapById(meta.mapId);
    if (!map) throw new Error(t('zip.unknownMap', { id: meta.mapId }));
    const base = metaEntry.name.slice(0, metaEntry.name.lastIndexOf('/') + 1);
    let name = (meta.displayName || file.name.replace(/\.zip$/i, '')).trim();
    if (nameTaken(name)) name = `${name} (2)`;
    if (nameTaken(name)) throw new Error(t('zip.exists'));

    const jobs = [];
    for (const slot of map.slots) {
      const prefix = `${base}${slotPath(slot)}/`;
      const files = entries
        .filter((e) => e.name.startsWith(prefix) && !e.name.slice(prefix.length).includes('/') && /\.(jpe?g|png|heic|heif)$/i.test(e.name))
        .sort((a, b) => natural.compare(a.name, b.name));
      for (const f of files) jobs.push({ slot, f });
    }
    const p = createProject(name, map.id);
    if (meta.createdAt) p.createdAt = new Date(meta.createdAt).toISOString();
    app.busy = { text: 'zip', done: 0, total: jobs.length };
    for (const { slot, f } of jobs) {
      try {
        const bytes = await f.read();
        const src = new Blob([bytes], { type: 'image/jpeg' });
        const bmp = await decode(src);
        const bw = bmp.width || bmp.naturalWidth, bh = bmp.height || bmp.naturalHeight;
        const c = drawScaled(bmp, /\.jpe?g$/i.test(f.name) ? 256 : app.imagePx);
        bmp.close?.();
        let out = await encode(c);
        // JPEG vindo do Mac: guarda o ficheiro original tal e qual (sem perder qualidade).
        if (/\.jpe?g$/i.test(f.name)) out = { ...out, full: src, w: bw, h: bh, bytes: src.size };
        c.width = c.height = 0;
        const id = newId('f');
        await storePhoto(p.id, id, out.full, out.thumb);
        p.photos.push({ id, slot: slot.id, w: out.w, h: out.h, bytes: out.bytes, ...urls(out.full, out.thumb) });
      } catch (e) {
        console.warn('zip photo', f.name, e);
      }
      app.busy.done++;
    }
    p.exportedAt = new Date().toISOString();
    save(p, true);
    toast(t('zip.imported', { name }));
    return p;
  } catch (e) {
    console.error(e);
    app.alert = { title: 'ZIP', body: e.message?.startsWith('zip.') ? t('zip.invalid') : e.message, actions: [{ label: t('app.ok'), style: 'default' }] };
    return null;
  } finally {
    app.busy = null;
  }
}

// ---------- UI helpers ----------

let toastTimer;
export function toast(text, tone = 'default') {
  app.toast = { text, tone, key: Math.random() };
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (app.toast = null), 1800);
}

export function confirmAlert(title, body, label, run, style = 'destructive') {
  app.alert = {
    title,
    body,
    actions: [
      { label: t('app.cancel'), style: 'cancel' },
      { label, style, run }
    ]
  };
}

export function formatBytes(n) {
  if (!n) return '0 KB';
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return `${(n / 1024 / 1024).toFixed(n > 100 * 1024 * 1024 ? 0 : 1)} MB`;
}

export function formatDate(iso) {
  return new Date(iso).toLocaleDateString(locale(), { day: 'numeric', month: 'short' });
}

export function formatTime(iso) {
  return new Date(iso).toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' });
}

// ---------- Projeto de exemplo ----------

export async function createDemo() {
  const { makeSamples } = await import('./samples.js');
  app.busy = { text: 'import', done: 0, total: 60 };
  const base = lang.code === 'en' ? 'Sample tower' : 'Exemplo Torre';
  let name = base, n = 2;
  while (nameTaken(name)) name = `${base} ${n++}`;
  const p = createProject(name, 'inspection-t24');
  const samples = await makeSamples(60, (v) => (app.busy.done = Math.round(v * 60)));
  const plan = ['general', 'general', 't1', 't1', 't1', 't2', 't2', 't3', 'trash'];
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    const id = newId('f');
    await storePhoto(p.id, id, s.full, s.thumb);
    p.photos.push({ id, slot: plan[i] ?? 'inbox', w: s.w, h: s.h, bytes: s.full.size, ...urls(s.full, s.thumb) });
  }
  app.busy = null;
  save(p, true);
  toast(t('settings.demoDone'));
  return p;
}
