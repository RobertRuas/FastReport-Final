// Teclado: utilitários partilhados pelas telas.

export const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

/** ⌘ no Mac, Ctrl nos outros sistemas. */
export const mod = (e) => (isMac ? e.metaKey : e.ctrlKey);

export const modLabel = isMac ? '⌘' : 'Ctrl';

/** Não roubar teclas enquanto se escreve num campo. */
export function isTyping(e) {
  const el = e.target;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
}
