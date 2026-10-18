import t24 from './inspection-t24.json';
import tendons from './tendons-retrofit.json';
import * as db from './db.js';
import { makeZip, readZip } from './zip.js';
import { t, lang, locale } from './i18n.svelte.js';

export const MAPS = [t24, tendons];
export const mapById = (id) => MAPS.find((m) => m.id === id);
export const JPEG_QUALITY = 0.85;
export const IMPORT_PX = 1024;
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
  updateReady: false
});

// ---------- Mapas e slots ----------

export function slotToken(slot) {
  return slot.group ? `${slot.group}_${slot.folder}` : slot.folder;
}

export function slotPath(slot) {
  return slot.group ? `${slot.group}/${slot.folder}` : slot.folder;
}

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

export function groupsOf(map) {
  return [...new Set(map.slots.map((s) => s.group).filter(Boolean))];
}

/** Ordem de apresentação: Sem categoria, Geral, extras, T…, Lixeira. */
export function orderedSlots(map) {
  const s = map.slots;
  const inbox = s.filter((x) => x.isInbox);
  const general = s.filter((x) => x.folder === 'General');
  const trash = s.filter((x) => x.isTrash);
  const rest = s.filter((x) => !x.isInbox && !x.isTrash && x.folder !== 'General');
  const extras = rest.filter((x) => !x.group && !/^T\d+$/i.test(x.folder));
  const numbered = rest.filter((x) => !extras.includes(x));
  return [...inbox, ...general, ...extras, ...numbered, ...trash];
}

/** Igual ao ProjectSlug do Mac: sem acentos, só letras/números, separadores viram "_". */
export function slugify(name) {
  return name
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '_')
    .replace(/^_+|_+$/g, '');
}

export function fileName(project, slot, index) {
  const map = mapById(project.mapId);
  return map.fileNamePattern
    .replace('{project}', project.slug)
    .replace('{slot}', slotToken(slot))
    .replace('{index}', String(index));
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
    photos: p.photos.map((x) => ({ id: x.id, slot: x.slot, w: x.w, h: x.h, bytes: x.bytes }))
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
      .map((r) => ({
        ...r,
        undo: [],
        photos: r.photos
          .filter((x) => byId.has(x.id))
          .map((x) => ({ ...x, ...urls(byId.get(x.id).full, byId.get(x.id).thumb) }))
      }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (settings.cols) app.cols = settings.cols;
    // 'langPref' substitui o antigo 'lang' da 1.0, que fixava PT sem querer.
    if (['auto', 'pt', 'en'].includes(settings.langPref)) app.langPref = settings.langPref;
    if (settings.theme) app.theme = settings.theme;
    if (UI_SIZES.includes(settings.ui)) app.ui = settings.ui;
    if (['folders', 'flat'].includes(settings.zipLayout)) app.zipLayout = settings.zipLayout;
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

export function createProject(name, mapId) {
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
    undo: []
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
  for (const ph of p.photos) { URL.revokeObjectURL(ph.full); URL.revokeObjectURL(ph.thumb); }
  await db.deleteProject(id);
}

/** Move uma foto para um slot. toIndex é a posição dentro do slot (null = fim). */
export function movePhoto(project, photoId, toSlot, toIndex = null, rec = true) {
  const arr = project.photos;
  const from = arr.findIndex((p) => p.id === photoId);
  if (from < 0) return;
  const photo = arr[from];
  const fromSlot = photo.slot;
  const fromIndex = arr.filter((p) => p.slot === fromSlot).findIndex((p) => p.id === photoId);
  const sameEnd = toIndex == null && fromIndex === photosIn(project, toSlot).length - 1;
  if (fromSlot === toSlot && (toIndex === fromIndex || sameEnd)) return;
  arr.splice(from, 1);
  const target = arr.filter((p) => p.slot === toSlot);
  let insertAt;
  if (toIndex == null || toIndex >= target.length) {
    insertAt = target.length ? arr.indexOf(target[target.length - 1]) + 1 : arr.length;
  } else {
    insertAt = arr.indexOf(target[Math.max(0, toIndex)]);
  }
  photo.slot = toSlot;
  arr.splice(insertAt, 0, photo);
  if (rec) project.undo.push({ type: 'move', id: photoId, slot: fromSlot, index: fromIndex });
  touched(project);
}

export function undo(project) {
  const last = project.undo.pop();
  if (!last) return null;
  const photo = project.photos.find((p) => p.id === last.id);
  if (!photo) return null;
  if (last.type === 'move') {
    movePhoto(project, last.id, last.slot, last.index, false);
  } else if (last.type === 'image') {
    const { full, thumb, blobs, w, h, bytes } = last.before;
    Object.assign(photo, { full, thumb, w, h, bytes });
    storePhoto(project.id, photo.id, blobs.full, blobs.thumb);
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
  touched(project);
  await db.deleteBlobs([...ids]);
  for (const p of gone) { URL.revokeObjectURL(p.full); URL.revokeObjectURL(p.thumb); }
  return gone.length;
}

// ---------- Imagens ----------

const toBlob = (canvas, q) => new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('toBlob'))), 'image/jpeg', q));

/** Gera o JPEG final (≤1024 px) e uma miniatura a partir de um canvas. */
async function encode(canvas) {
  const full = await toBlob(canvas, JPEG_QUALITY);
  const tw = 256, th = Math.max(1, Math.round((256 * canvas.height) / canvas.width));
  const tc = document.createElement('canvas');
  tc.width = tw; tc.height = th;
  tc.getContext('2d').drawImage(canvas, 0, 0, tw, th);
  const thumb = await toBlob(tc, 0.75);
  tc.width = tc.height = 0;
  return { full, thumb, w: canvas.width, h: canvas.height, bytes: full.size };
}

async function decode(blob) {
  try {
    return await createImageBitmap(blob, { imageOrientation: 'from-image' });
  } catch {
    const url = URL.createObjectURL(blob);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return img;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

function drawScaled(source, max = IMPORT_PX) {
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

export async function editPhoto(project, photo, kind, crop) {
  const rec = await db.getBlob(photo.id);
  if (!rec) return;
  const img = await decode(rec.full);
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
  project.undo.push({
    type: 'image',
    id: photo.id,
    before: { full: photo.full, thumb: photo.thumb, w: photo.w, h: photo.h, bytes: photo.bytes, blobs: { full: rec.full, thumb: rec.thumb } }
  });
  await storePhoto(project.id, photo.id, out.full, out.thumb);
  Object.assign(photo, urls(out.full, out.thumb), { w: out.w, h: out.h, bytes: out.bytes });
  touched(project);
}

// ---------- Importar fotos (fototeca ou câmara) ----------

export async function importFiles(project, files) {
  const list = [...files].filter((f) => f.type.startsWith('image/') || /\.(heic|heif|jpe?g|png|webp|tiff?|gif|bmp)$/i.test(f.name));
  if (!list.length) return;
  const inbox = inboxSlot(project).id;
  app.busy = { text: 'import', done: 0, total: list.length };
  let failed = 0;
  for (const file of list) {
    try {
      const bmp = await decode(file);
      const c = drawScaled(bmp);
      bmp.close?.();
      const out = await encode(c);
      c.width = c.height = 0;
      const id = newId('f');
      await storePhoto(project.id, id, out.full, out.thumb);
      project.photos.push({ id, slot: inbox, w: out.w, h: out.h, bytes: out.bytes, ...urls(out.full, out.thumb) });
      if (app.busy.done % 10 === 9) save(project);
    } catch (e) {
      console.warn('import', file.name, e);
      failed++;
    }
    app.busy.done++;
  }
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
      const rec = await db.getBlob(photos[i].id);
      const name = slot.isInbox ? `${project.slug}_Inbox_${i + 1}.jpeg` : fileName(project, slot, i + 1);
      const path = flat ? root + uniqueName(name, used) : `${root}${slotPath(slot)}/${name}`;
      entries.push({ name: path, data: rec.full });
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

const natural = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

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
        const c = drawScaled(bmp, /\.jpe?g$/i.test(f.name) ? 256 : IMPORT_PX);
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
