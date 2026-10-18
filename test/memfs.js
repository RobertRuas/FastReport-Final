// Sistema de ficheiros em memória com a mesma forma da File System Access API (só o que a app usa).
const notFound = () => Object.assign(new Error('not found'), { name: 'NotFoundError' });

export class MemFile {
  constructor(name, parent) { this.kind = 'file'; this.name = name; this.parent = parent; this.data = new Blob([]); this.mod = Date.now(); }
  async getFile() { return new File([this.data], this.name, { lastModified: this.mod, type: 'image/jpeg' }); }
  async createWritable() {
    const parts = [];
    return {
      write: async (d) => parts.push(d),
      close: async () => { this.data = new Blob(parts); this.mod = Date.now() + Math.random(); },
      abort: async () => {}
    };
  }
  async isSameEntry(o) { return o === this; }
}

export class MemDir {
  constructor(name = 'root') { this.kind = 'directory'; this.name = name; this.children = new Map(); }
  async getDirectoryHandle(name, { create = false } = {}) {
    let c = this.children.get(name);
    if (!c && create) this.children.set(name, (c = new MemDir(name)));
    if (!c || c.kind !== 'directory') throw notFound();
    return c;
  }
  async getFileHandle(name, { create = false } = {}) {
    let c = this.children.get(name);
    if (!c && create) this.children.set(name, (c = new MemFile(name, this)));
    if (!c || c.kind !== 'file') throw notFound();
    return c;
  }
  async removeEntry(name) { if (!this.children.delete(name)) throw notFound(); }
  async *entries() { for (const e of [...this.children]) yield e; }
  async isSameEntry(o) { return o === this; }
  /** Lista plana "pasta/ficheiro" para as asserções. */
  list(prefix = '') {
    return [...this.children].flatMap(([n, c]) => (c.kind === 'file' ? [prefix + n] : c.list(`${prefix}${n}/`))).sort();
  }
}
