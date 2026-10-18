import { describe, it, expect } from 'vitest';
import t24 from '../src/lib/inspection-t24.json';
import tendons from '../src/lib/tendons-retrofit.json';

const maps = { t24, tendons };

describe('mapas: contrato de dados partilhado com o FastReport do Mac', () => {
  for (const [key, map] of Object.entries(maps)) {
    describe(key, () => {
      it('tem os campos de topo obrigatórios', () => {
        expect(typeof map.id).toBe('string');
        expect(map.id.length).toBeGreaterThan(0);
        expect(map.name).toBeTruthy();
        expect(map.fileNamePattern).toContain('{project}');
        expect(map.fileNamePattern).toContain('{slot}');
        expect(map.fileNamePattern).toContain('{index}');
        expect(Array.isArray(map.slots)).toBe(true);
      });

      it('tem exatamente uma Inbox e uma Trash', () => {
        expect(map.slots.filter((s) => s.isInbox)).toHaveLength(1);
        expect(map.slots.filter((s) => s.isTrash)).toHaveLength(1);
      });

      it('cada slot tem id e pasta, e os ids são únicos', () => {
        const ids = new Set();
        for (const s of map.slots) {
          expect(typeof s.id).toBe('string');
          expect(typeof s.folder).toBe('string');
          expect(s.folder.length).toBeGreaterThan(0);
          expect(ids.has(s.id)).toBe(false);
          ids.add(s.id);
        }
      });
    });
  }

  it('Inspeção T24 tem General e T1…T24', () => {
    const folders = new Set(t24.slots.map((s) => s.folder));
    expect(folders.has('General')).toBe(true);
    for (let i = 1; i <= 24; i++) expect(folders.has(`T${i}`)).toBe(true);
  });

  it('Retrofit de tendões usa os grupos C12 e C25', () => {
    const groups = new Set(tendons.slots.map((s) => s.group).filter(Boolean));
    expect(groups).toEqual(new Set(['C12', 'C25']));
  });
});
