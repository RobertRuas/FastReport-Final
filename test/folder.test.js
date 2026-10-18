import { describe, it, expect } from 'vitest';
import t24 from '../src/lib/inspection-t24.json';
import tendons from '../src/lib/tendons-retrofit.json';
import { createProjectFolder, scan, applyMoves, writeFile, readText, readMeta, moveFile, signature } from '../src/lib/folder.js';
import { MemDir } from './memfs.js';

const meta = { createdAt: '2026-10-18T10:00:00Z', displayName: 'Obra B', mapId: 'inspection-t24', schemaVersion: 1 };

describe('modo pasta no disco', () => {
  it('cria a pasta do projeto com as pastas do mapa e o fastreport.json', async () => {
    const parent = new MemDir();
    const root = await createProjectFolder(parent, 'Obra B', t24, meta);
    expect(root.name).toBe('Obra B');
    const dirs = [...root.children.keys()];
    for (const f of ['Inbox', 'General', 'Trash', 'T1', 'T24']) expect(dirs).toContain(f);
    expect(await readMeta(root)).toEqual(meta);
  });

  it('não escreve por cima de uma pasta que já existe', async () => {
    const parent = new MemDir();
    await createProjectFolder(parent, 'Obra B', t24, meta);
    await expect(createProjectFolder(parent, 'Obra B', t24, meta)).rejects.toMatchObject({ name: 'FolderExists' });
  });

  it('grupos ficam em subpastas (C12/T01)', async () => {
    const root = await createProjectFolder(new MemDir(), 'Tendões', tendons, { ...meta, mapId: 'tendons-retrofit' });
    await writeFile(root, 'C12/T01/Obra_C12_T01_1.jpeg', 'x');
    const items = await scan(root, tendons);
    expect(items.map((i) => [i.slot, i.path])).toEqual([['c12-t01', 'C12/T01/Obra_C12_T01_1.jpeg']]);
  });

  it('lê as fotos por ordem natural e ignora ficheiros escondidos e não-imagens', async () => {
    const root = await createProjectFolder(new MemDir(), 'P', t24, meta);
    for (const n of ['P_T1_10.jpeg', 'P_T1_2.jpeg', 'P_T1_1.jpeg', '.DS_Store', 'notas.txt']) await writeFile(root, `T1/${n}`, 'x');
    const items = await scan(root, t24);
    expect(items.map((i) => i.name)).toEqual(['P_T1_1.jpeg', 'P_T1_2.jpeg', 'P_T1_10.jpeg']);
  });

  it('renumera e move vários ficheiros de uma vez sem perder nenhum', async () => {
    const root = await createProjectFolder(new MemDir(), 'P', t24, meta);
    await writeFile(root, 'T1/P_T1_1.jpeg', 'A');
    await writeFile(root, 'T1/P_T1_2.jpeg', 'B');
    await writeFile(root, 'Inbox/IMG.jpeg', 'C');
    await applyMoves(root, [
      { from: 'T1/P_T1_1.jpeg', to: 'T1/P_T1_2.jpeg' },
      { from: 'T1/P_T1_2.jpeg', to: 'T1/P_T1_1.jpeg' },
      { from: 'Inbox/IMG.jpeg', to: 'T2/P_T2_1.jpeg' }
    ]);
    const text = async (p) => (await (await (await root.getDirectoryHandle(p.split('/')[0])).getFileHandle(p.split('/')[1])).getFile()).text();
    expect(await text('T1/P_T1_1.jpeg')).toBe('B');
    expect(await text('T1/P_T1_2.jpeg')).toBe('A');
    expect(await text('T2/P_T2_1.jpeg')).toBe('C');
    expect(root.list().filter((p) => p.endsWith('.jpeg'))).toEqual(['T1/P_T1_1.jpeg', 'T1/P_T1_2.jpeg', 'T2/P_T2_1.jpeg']);
  });

  it('recusa mover para cima de um ficheiro que já existe', async () => {
    const root = await createProjectFolder(new MemDir(), 'P', t24, meta);
    await writeFile(root, 'T1/a.jpeg', 'A');
    await writeFile(root, 'T1/b.jpeg', 'B');
    await expect(moveFile(root, 'T1/a.jpeg', 'T1/b.jpeg')).rejects.toMatchObject({ name: 'DestinationExists' });
    expect(root.list().filter((p) => p.endsWith('.jpeg'))).toEqual(['T1/a.jpeg', 'T1/b.jpeg']);
  });

  it('a impressão digital muda quando alguém mexe na pasta', async () => {
    const root = await createProjectFolder(new MemDir(), 'P', t24, meta);
    const a = await signature(root, t24);
    await writeFile(root, 'Inbox/nova.jpeg', 'x');
    expect(await signature(root, t24)).not.toBe(a);
  });

  it('lê texto inexistente como null', async () => {
    expect(await readText(new MemDir(), 'fastreport-delivery.json')).toBe(null);
  });
});
