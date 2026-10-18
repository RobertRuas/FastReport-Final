// ZIP sem dependências. Escrita: método "store" (JPEG já vem comprimido).
// Leitura: "store" e "deflate" (ZIPs criados pelo Finder no Mac).

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function dosTime(d) {
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2);
  const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return { time, date };
}

/**
 * entries: [{ name: 'Pasta/ficheiro.jpeg', data: Blob|Uint8Array|string }]; nomes acabados em '/' são pastas.
 * onProgress(0..1). Devolve um Blob application/zip.
 */
export async function makeZip(entries, onProgress = () => {}) {
  const enc = new TextEncoder();
  const parts = [];
  const central = [];
  let offset = 0;
  const { time, date } = dosTime(new Date());
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const nameBytes = enc.encode(e.name);
    let data;
    if (e.name.endsWith('/')) data = new Uint8Array(0);
    else if (typeof e.data === 'string') data = enc.encode(e.data);
    else if (e.data instanceof Uint8Array) data = e.data;
    else data = new Uint8Array(await e.data.arrayBuffer());
    const crc = crc32(data);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true); // UTF-8
    local.setUint16(8, 0, true);
    local.setUint16(10, time, true);
    local.setUint16(12, date, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, data.length, true);
    local.setUint32(22, data.length, true);
    local.setUint16(26, nameBytes.length, true);
    local.setUint16(28, 0, true);
    parts.push(local.buffer, nameBytes, data);

    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true);
    c.setUint16(4, 20, true);
    c.setUint16(6, 20, true);
    c.setUint16(8, 0x0800, true);
    c.setUint16(10, 0, true);
    c.setUint16(12, time, true);
    c.setUint16(14, date, true);
    c.setUint32(16, crc, true);
    c.setUint32(20, data.length, true);
    c.setUint32(24, data.length, true);
    c.setUint16(28, nameBytes.length, true);
    c.setUint32(38, e.name.endsWith('/') ? 0x10 : 0, true);
    c.setUint32(42, offset, true);
    central.push(c.buffer, nameBytes);
    offset += 30 + nameBytes.length + data.length;
    onProgress((i + 1) / entries.length);
    if (i % 10 === 9) await new Promise((r) => setTimeout(r, 0));
  }
  const cdSize = central.reduce((a, p) => a + p.byteLength, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, entries.length, true);
  end.setUint16(10, entries.length, true);
  end.setUint32(12, cdSize, true);
  end.setUint32(16, offset, true);
  return new Blob([...parts, ...central, end.buffer], { type: 'application/zip' });
}

async function inflateRaw(bytes) {
  const ds = new DecompressionStream('deflate-raw');
  const out = new Blob([bytes]).stream().pipeThrough(ds);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

/** Lê um ZIP e devolve [{ name, read: () => Promise<Uint8Array> }] (sem pastas). */
export async function readZip(blob) {
  const buf = new Uint8Array(await blob.arrayBuffer());
  const dv = new DataView(buf.buffer);
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 70000); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('zip.invalid');
  const count = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  const dec = new TextDecoder();
  const out = [];
  for (let i = 0; i < count; i++) {
    if (dv.getUint32(p, true) !== 0x02014b50) throw new Error('zip.invalid');
    const method = dv.getUint16(p + 10, true);
    const csize = dv.getUint32(p + 20, true);
    const nlen = dv.getUint16(p + 28, true);
    const xlen = dv.getUint16(p + 30, true);
    const clen = dv.getUint16(p + 32, true);
    const lho = dv.getUint32(p + 42, true);
    const name = dec.decode(buf.subarray(p + 46, p + 46 + nlen));
    p += 46 + nlen + xlen + clen;
    if (name.endsWith('/')) continue;
    out.push({
      name,
      read: async () => {
        const ln = dv.getUint16(lho + 26, true), lx = dv.getUint16(lho + 28, true);
        const start = lho + 30 + ln + lx;
        const raw = buf.subarray(start, start + csize);
        if (method === 0) return raw;
        if (method === 8) return inflateRaw(raw);
        throw new Error('zip.method');
      }
    });
  }
  return out;
}
