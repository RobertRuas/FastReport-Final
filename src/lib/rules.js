// Regras puras do FastReport (sem browser, sem estado): nomes, numeração, teclas da triagem,
// planos de renomeação no disco e marcações da Entrega. Portadas do app de Mac e testadas em test/.

// ---------- Slots ----------

export const slotToken = (slot) => (slot.group ? `${slot.group}_${slot.folder}` : slot.folder);
export const slotPath = (slot) => (slot.group ? `${slot.group}/${slot.folder}` : slot.folder);
export const isGeneral = (slot) => slot.folder === 'General' && !slot.group;

/** Grupos de classificação do mapa (ex.: C12, C25), pela ordem em que aparecem. */
export function groupsOf(map) {
  return [...new Set(map.slots.map((s) => s.group).filter(Boolean))];
}

/** Pasta de topo com o nome de um grupo (ex.: C12): recebe fotos "do cabo" sem tendão. */
export function isGroupBucket(map, slot) {
  return !slot.group && !slot.isInbox && !slot.isTrash && groupsOf(map).includes(slot.folder);
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

// ---------- Nomes ----------

/** Igual ao ProjectSlug do Mac: sem acentos, só letras/números, separadores viram "_". */
export function slugify(name) {
  return name
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '_')
    .replace(/^_+|_+$/g, '');
}

export function formatName(pattern, projectSlug, slot, index) {
  return pattern.replace('{project}', projectSlug).replace('{slot}', slotToken(slot)).replace('{index}', String(index));
}

export const natural = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

/** Índice no fim do nome ("Obra_T10_3.jpeg" → 3), como FileOrganizer.index(fromFileName:). */
export function indexFromName(name) {
  const stem = name.replace(/\.[^.]*$/, '');
  const last = stem.split('_').pop();
  if (!/^\d+$/.test(last)) return null;
  const n = Number(last);
  return n >= 1 ? n : null;
}

/** Menor índice livre numa pasta: preenche buracos (_1, _3 → _2), como o Mac. */
export function nextIndex(names) {
  const used = new Set(names.map(indexFromName).filter(Boolean));
  let n = 1;
  while (used.has(n)) n++;
  return n;
}

/** Nome .jpeg livre: "foto.jpeg", "foto-1.jpeg", "foto-2.jpeg"… (uniqueJPEGName do Mac). */
export function uniqueJpegName(preferred, names) {
  const taken = new Set([...names].map((n) => n.toLowerCase()));
  const stem = preferred.replace(/\.[^.]*$/, '').replace(/[\/\\:\0]/g, '-').trim() || 'photo';
  for (let k = 0; k < 10000; k++) {
    const name = k === 0 ? `${stem}.jpeg` : `${stem}-${k}.jpeg`;
    if (!taken.has(name.toLowerCase())) return name;
  }
  return `${Date.now().toString(36)}.jpeg`;
}

export const IMAGE_RE = /\.(jpe?g|png|heic|heif|webp|tiff?|gif|bmp)$/i;

// ---------- Teclas da triagem (ClassificationBuffer do Mac) ----------

/** Junta uma tecla ao que já foi escrito: "g" reinicia, até dois dígitos. */
export function bufferAppend(text, ch) {
  if (ch.toLowerCase() === 'g') return 'g';
  if (!/^\d$/.test(ch)) return text;
  if (text === 'g') text = '';
  if (text.length >= 2) return text;
  return text + ch;
}

/**
 * Slot para um atalho, dentro do grupo ativo (ex.: C12 + "3" → C12/T03).
 * Sem correspondência no grupo, procura nas pastas de topo (ex.: "25" → C25).
 */
export function slotForHotkey(map, text, group = null) {
  const k = text.trim().toLowerCase();
  if (!k) return null;
  const hit = (s) => (s.hotkeys ?? []).some((h) => h.toLowerCase() === k);
  if (group) {
    return map.slots.find((s) => s.group === group && hit(s)) ?? map.slots.find((s) => !s.group && hit(s)) ?? null;
  }
  return map.slots.find((s) => !s.group && hit(s)) ?? map.slots.find(hit) ?? null;
}

// ---------- Renomear no disco ----------

/**
 * Plano seguro para mudar vários ficheiros de sítio de uma vez (renumerar, mover entre pastas).
 * Primeiro tudo vai para nomes temporários, depois para o nome final: nunca há colisões
 * (o mesmo truque de FileOrganizer.renumber no Mac).
 * moves: [{ from, to }] com caminhos relativos à pasta do projeto.
 */
export function planRenames(moves, tag = 'x') {
  const real = moves.filter((m) => m.from !== m.to);
  const dir = (p) => (p.includes('/') ? p.slice(0, p.lastIndexOf('/') + 1) : '');
  const stage = real.map((m, i) => ({ from: m.from, to: `${dir(m.from)}.__fastreport_tmp_${tag}_${i}.jpeg` }));
  const final = real.map((m, i) => ({ from: stage[i].to, to: m.to }));
  return [...stage, ...final];
}

// ---------- Entrega (fastreport-delivery.json, igual ao Mac) ----------

export function emptyLedger() {
  return { schemaVersion: 1, placedIDs: [], placedPaths: [] };
}

export function parseLedger(text) {
  try {
    const v = JSON.parse(text);
    if (v?.schemaVersion !== 1) return emptyLedger();
    return { schemaVersion: 1, placedIDs: [...(v.placedIDs ?? [])], placedPaths: [...(v.placedPaths ?? [])] };
  } catch {
    return emptyLedger();
  }
}

/** JSON com chaves ordenadas, como o JSONEncoder do Mac (.sortedKeys, .prettyPrinted). */
export function serializeLedger(ledger) {
  const sorted = { placedIDs: ledger.placedIDs, placedPaths: ledger.placedPaths, schemaVersion: ledger.schemaVersion };
  return JSON.stringify(sorted, null, 2) + '\n';
}

// ---------- Versões ----------

/** Compara "1.2.0" com "1.10.0" (numérico). */
export function compareVersions(a, b) {
  const pa = String(a).split('.').map(Number), pb = String(b).split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return Math.sign(d);
  }
  return 0;
}

// ---------- Resumo de contagens (CSV para o relatório) ----------

/** CSV com ";" (o Excel em português abre direto) e BOM para os acentos. */
export function countsCsv(rows, headers) {
  const esc = (v) => {
    const s = String(v ?? '');
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '﻿' + [headers, ...rows].map((r) => r.map(esc).join(';')).join('\r\n') + '\r\n';
}

// ---------- Duplicados (mesmo JPEG) ----------

/** Ids das fotos cujo conteúdo (hash) aparece mais de uma vez, fora da lixeira. */
export function duplicateIds(photos, trashId) {
  const seen = new Map();
  for (const p of photos) {
    if (!p.hash || p.slot === trashId) continue;
    seen.set(p.hash, [...(seen.get(p.hash) ?? []), p.id]);
  }
  return new Set([...seen.values()].filter((ids) => ids.length > 1).flat());
}
