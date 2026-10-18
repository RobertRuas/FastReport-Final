import { describe, it, expect } from 'vitest';

// Regra de slug partilhada com o Mac (ProjectSlug): sem acentos, só letras/números,
// separadores viram "_", sem "_" no início/fim. Mantida aqui como contrato.
function slugify(name) {
  return name
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '_')
    .replace(/^_+|_+$/g, '');
}

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
  const fileName = (pattern, project, slot, index) =>
    pattern.replace('{project}', project).replace('{slot}', slot).replace('{index}', String(index));
  it('produz Projeto_T10_1.jpeg', () => {
    expect(fileName('{project}_{slot}_{index}.jpeg', 'Inspecao1', 'T10', 1)).toBe('Inspecao1_T10_1.jpeg');
  });
});
