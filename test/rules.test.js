import { describe, it, expect } from 'vitest';
import t24 from '../src/lib/inspection-t24.json';
import tendons from '../src/lib/tendons-retrofit.json';
import { bufferAppend, slotForHotkey, planRenames, parseLedger, serializeLedger, compareVersions, isGroupBucket, orderedSlots } from '../src/lib/rules.js';

const type = (keys) => [...keys].reduce(bufferAppend, '');

describe('teclas da triagem (ClassificationBuffer do Mac)', () => {
  it('aceita até dois dígitos', () => {
    expect(type('1')).toBe('1');
    expect(type('12')).toBe('12');
    expect(type('123')).toBe('12');
  });
  it('"g" reinicia e um dígito depois de "g" começa de novo', () => {
    expect(type('12g')).toBe('g');
    expect(type('g3')).toBe('3');
  });
  it('ignora letras que não são atalhos', () => {
    expect(type('1x')).toBe('1');
  });
});

describe('atalho → pasta', () => {
  it('Inspeção: número vai para T<n>, 0 e g para Geral', () => {
    expect(slotForHotkey(t24, '7').id).toBe('t7');
    expect(slotForHotkey(t24, '24').id).toBe('t24');
    expect(slotForHotkey(t24, '0').id).toBe('general');
    expect(slotForHotkey(t24, 'g').id).toBe('general');
    expect(slotForHotkey(t24, '25')).toBe(null);
  });
  it('Tendões: o número é dentro do grupo ativo', () => {
    expect(slotForHotkey(tendons, '3', 'C12').id).toBe('c12-t03');
    expect(slotForHotkey(tendons, '3', 'C25').id).toBe('c25-t03');
    expect(slotForHotkey(tendons, '12', 'C25').id).toBe('c25-t12');
  });
  it('Tendões: sem grupo, 12 e 25 são as pastas dos cabos', () => {
    expect(slotForHotkey(tendons, '12').id).toBe('c12');
    expect(slotForHotkey(tendons, '25').id).toBe('c25');
    expect(slotForHotkey(tendons, 'g', 'C12').id).toBe('general');
  });
  it('C12 e C25 são pastas de grupo', () => {
    const c12 = tendons.slots.find((s) => s.id === 'c12');
    expect(isGroupBucket(tendons, c12)).toBe(true);
    expect(isGroupBucket(t24, t24.slots.find((s) => s.id === 't1'))).toBe(false);
  });
  it('ordem de apresentação: Inbox, Geral, …, Lixo', () => {
    const o = orderedSlots(t24).map((s) => s.id);
    expect(o[0]).toBe('inbox');
    expect(o[1]).toBe('general');
    expect(o.at(-1)).toBe('trash');
  });
});

describe('plano de renomeação sem colisões', () => {
  // Simula o disco para provar que nenhum passo escreve por cima de outro ficheiro.
  function run(files, moves) {
    const disk = new Set(files);
    for (const op of planRenames(moves, 't')) {
      expect(disk.has(op.from)).toBe(true);
      expect(disk.has(op.to)).toBe(false);
      disk.delete(op.from);
      disk.add(op.to);
    }
    return [...disk].sort();
  }
  it('troca dois nomes (reordenar)', () => {
    expect(run(['T1/a_1.jpeg', 'T1/a_2.jpeg'], [
      { from: 'T1/a_1.jpeg', to: 'T1/a_2.jpeg' },
      { from: 'T1/a_2.jpeg', to: 'T1/a_1.jpeg' }
    ])).toEqual(['T1/a_1.jpeg', 'T1/a_2.jpeg']);
  });
  it('rodar três nomes e mover entre pastas', () => {
    expect(run(['T1/a_1.jpeg', 'T1/a_2.jpeg', 'T1/a_3.jpeg', 'Inbox/x.jpeg'], [
      { from: 'T1/a_1.jpeg', to: 'T1/a_2.jpeg' },
      { from: 'T1/a_2.jpeg', to: 'T1/a_3.jpeg' },
      { from: 'T1/a_3.jpeg', to: 'T2/a_1.jpeg' },
      { from: 'Inbox/x.jpeg', to: 'T1/a_1.jpeg' }
    ])).toEqual(['T1/a_1.jpeg', 'T1/a_2.jpeg', 'T1/a_3.jpeg', 'T2/a_1.jpeg']);
  });
  it('ignora o que não muda', () => {
    expect(planRenames([{ from: 'a', to: 'a' }])).toEqual([]);
  });
});

describe('Entrega: fastreport-delivery.json', () => {
  it('lê o formato do Mac', () => {
    const l = parseLedger('{"placedIDs":["inode-1-2"],"placedPaths":["T1/a_1.jpeg"],"schemaVersion":1}');
    expect(l.placedPaths).toEqual(['T1/a_1.jpeg']);
    expect(l.placedIDs).toEqual(['inode-1-2']);
  });
  it('ignora versões desconhecidas e lixo', () => {
    expect(parseLedger('{"schemaVersion":2,"placedPaths":["x"]}').placedPaths).toEqual([]);
    expect(parseLedger('não é json').placedPaths).toEqual([]);
  });
  it('grava com chaves ordenadas, como o Mac', () => {
    const text = serializeLedger({ schemaVersion: 1, placedIDs: [], placedPaths: ['T1/a.jpeg'] });
    expect(Object.keys(JSON.parse(text))).toEqual(['placedIDs', 'placedPaths', 'schemaVersion']);
  });
});

describe('versões', () => {
  it('compara numericamente', () => {
    expect(compareVersions('1.10.0', '1.2.0')).toBe(1);
    expect(compareVersions('0.2.0', '0.2.0')).toBe(0);
    expect(compareVersions('0.1.9', '0.2')).toBe(-1);
  });
});
