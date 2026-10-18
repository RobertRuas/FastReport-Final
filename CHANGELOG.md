# Registo de alterações

O formato segue, de forma simples, o [Keep a Changelog](https://keepachangelog.com/pt-BR/).

## [0.5.3] — 2026-10-18

### Alterado
- Entrega: a imagem arrastada usa um endereço `data:` (com os bytes da foto) em vez de `blob:`, para o Safari e outras apps conseguirem ler a foto.

## [0.5.2] — 2026-10-18

### Corrigido
- Entrega: arrastar uma foto para outra app (Word, Pages…) chegava ao destino mas a imagem não carregava. Agora usa o arrasto nativo da própria imagem em tamanho real (a miniatura troca pela foto completa ao passar o rato), que leva os bytes da foto. Deixou de se usar `DownloadURL` com `blob:` e HTML com `data:`.

## [0.5.1] — 2026-10-18 · Fase 5 (preparação)

### Corrigido
- Modo pasta: ler a pasta já não falha quando um ficheiro desaparece a meio (Finder ou outra app); a recuperação depois de um erro de disco corre uma só vez, sem ciclos.

### Adicionado
- Testes de carga com 320 fotos nos dois modos e lista de verificação para o teste real ([docs/TESTE-REAL.md](docs/TESTE-REAL.md)).

## [0.5.0] — 2026-10-18 · Fase 4

### Adicionado
- Revisão em ecrã largo com índice de pastas (contagem `n/esperado`) e menu de contexto nas fotos: abrir, rodar, inverter, mandar para a Lixeira / voltar para Sem categoria, copiar caminho (modo pasta).
- Aviso de fotos repetidas (mesmo JPEG): marca "2×" na grelha e na triagem, aviso ao importar.
- Exportar contagens por pasta em CSV (separador `;`, abre direto no Excel em português).
- Menu de contexto partilhado (Revisão e Entrega).

### Alterado
- Manifesto: `display: standalone`, para a app instalada no computador abrir numa janela normal.
- Definições centradas no ecrã largo; nome real do ficheiro no visualizador (modo pasta); hover e foco visível para rato e teclado.

## [0.4.0] — 2026-10-18 · Fase 3

### Adicionado
- Separador **Entrega**: fotos classificadas por pasta, para arrastar para o Word/Pages. Arrastar leva o ficheiro com o nome final (`DownloadURL`) e a imagem em HTML; quando o destino aceita, a foto fica marcada como colocada. Clique abre a foto; botão direito marca/desmarca ou copia a imagem; contador "n / total colocadas" e "Limpar marcações".
- Marcações guardadas no projeto (modo interno) ou em `fastreport-delivery.json` (modo pasta, igual ao Mac).
- Definições → Imagens: tamanho máximo ao importar (1024 / 1600 / 2048 px) e qualidade JPEG (alta 85 % / média 70 %), como no Mac.
- Textos do computador já não falam do "iPhone".

## [0.3.0] — 2026-10-18 · Fase 2

### Adicionado
- Layout de ecrã largo (≥ 900 px): barra lateral com os projetos e o projeto ao lado; separadores no topo; botões Importar e Iniciar triagem na barra.
- Triagem por teclado com as regras do Mac: número (até 2 dígitos) + Enter, `0`/`G` → Geral, Enter sem número → pasta do grupo (C12/C25), Tab/⇧Tab muda de grupo, ⌘⌫ → Lixeira, ⌘Z, ←/→, S, R, F, C (Enter aplica o corte), `+`/`−`/⌘0 e pinça do trackpad para zoom.
- Visualizador com teclado (←/→, R, F, M, ⌘⌫, Esc), setas laterais e zoom com trackpad.
- Atalhos gerais: ⌘N, ⌘O, ⌘,, ⌘E, ⌘1/2/3, ⌘+/⌘− (miniaturas), ⌘⇧W, T, `?`.
- Folha de atalhos e notas da versão (Definições → Novidades; aparecem sozinhas depois de uma atualização).
- Arrastar fotos do Finder para a janela do projeto importa-as para Sem categoria.

## [0.2.0] — 2026-10-18 · Fase 1

### Adicionado
- **Pasta no disco** (Chrome/Edge no computador): criar um projeto numa pasta real ou abrir uma pasta de projeto do FastReport do Mac (`fastreport.json`). As fotos são ficheiros reais; classificar, reordenar, rodar, inverter, cortar e esvaziar o lixo mexem diretamente nas pastas.
- Numeração no disco igual à do Mac: classificar usa o menor número livre; reordenar renumera `_1`, `_2`, `_3`…; renomeação em duas passagens, sem nunca escrever por cima de outro ficheiro.
- Acompanhar mudanças feitas no Finder (FileSystemObserver quando existe, senão releitura periódica).
- Marcações da Entrega guardadas em `fastreport-delivery.json`, no mesmo formato do Mac.
- Importar HEIC no Chrome do computador (descodificador carregado só quando é preciso).
- Regras partilhadas em `src/lib/rules.js`, com testes (39 no total), incluindo um disco simulado.

## [0.1.0] — 2026-10-18

### Adicionado
- Base unificada do FastReport, a partir do FastReport Mobile (Svelte 5 + Vite, PWA).
- Projetos a partir de mapas (Inspeção T24 e Retrofit de tendões), importação e câmara, triagem, revisão, exportação e importação de ZIP, offline e instalável, PT/EN, temas.
- Estrutura profissional do repositório: CI, publicação automática no GitHub Pages, modelos de issues e pull requests, testes e Dependabot.
