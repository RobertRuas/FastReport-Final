import { describe, it, expect } from 'vitest';
import { slugify, formatName, indexFromName, nextIndex, uniqueJpegName } from '../src/lib/rules.js';

// Regras de nomes partilhadas com o Mac (ProjectSlug, FileNameFormatter, FileOrganizer).
describe('slug do projeto', () => {
  it('remove acentos e espaços', () => {
    expect(slugify('Inspeção Torre B')).toBe('Inspecao_Torre_B');
  });
  it('não deixa separadores nas pontas', () => {
    expect(slugify('  obra 1!  ')).toBe('obra_1');
  });
  it('mantém números', () => {
    expect(slugify('Inspeção 2026')).toBe('Inspecao_2026');
  });
});

describe('padrão do nome do ficheiro', () => {
  it('produz Projeto_T10_1.jpeg', () => {
    expect(formatName('{project}_{slot}_{index}.jpeg', 'Inspecao1', { folder: 'T10' }, 1)).toBe('Inspecao1_T10_1.jpeg');
  });
  it('slots de grupo levam o grupo no nome (C12_T03)', () => {
    expect(formatName('{project}_{slot}_{index}.jpeg', 'Obra', { folder: 'T03', group: 'C12' }, 2)).toBe('Obra_C12_T03_2.jpeg');
  });
});

describe('numeração sem buracos (regra do Mac)', () => {
  it('lê o índice do fim do nome', () => {
    expect(indexFromName('Obra_T10_3.jpeg')).toBe(3);
    expect(indexFromName('IMG_0001.jpeg')).toBe(1);
    expect(indexFromName('foto.jpeg')).toBe(null);
    expect(indexFromName('Obra_T10_0.jpeg')).toBe(null);
  });
  it('usa o menor número livre', () => {
    expect(nextIndex([])).toBe(1);
    expect(nextIndex(['O_T1_1.jpeg', 'O_T1_2.jpeg'])).toBe(3);
    expect(nextIndex(['O_T1_1.jpeg', 'O_T1_3.jpeg'])).toBe(2);
  });
  it('nome livre na Inbox: foto.jpeg, foto-1.jpeg…', () => {
    expect(uniqueJpegName('IMG_1.HEIC', [])).toBe('IMG_1.jpeg');
    expect(uniqueJpegName('IMG_1.jpg', ['img_1.jpeg'])).toBe('IMG_1-1.jpeg');
    expect(uniqueJpegName('IMG_1.jpg', ['IMG_1.jpeg', 'IMG_1-1.jpeg'])).toBe('IMG_1-2.jpeg');
  });
});
