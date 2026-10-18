# Como contribuir

Obrigado pelo interesse no FastReport Final.

## Antes de começar
- Usa Node.js 22 ou superior.
- Instala as dependências com `npm install`.

## Fluxo
1. Cria um ramo a partir de `main` (ex.: `feat/exportar-csv`).
2. Faz as alterações. Antes de abrir o pull request, confirma que passa:
   ```bash
   npm run build
   npm test
   ```
3. Abre um pull request para `main`. O CI corre a build e os testes automaticamente.

## Convenções
- Mensagens de commit e textos para o utilizador em **português**.
- Nomes de pastas e de ficheiros no disco mantêm-se em inglês estável (`Inbox`, `T1`, `General`, `Trash`) — a interface é que traduz.
- Mantém o `CHANGELOG.md` atualizado nas mudanças visíveis para o utilizador.
