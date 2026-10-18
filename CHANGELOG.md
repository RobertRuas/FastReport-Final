# Registo de alterações

O formato segue, de forma simples, o [Keep a Changelog](https://keepachangelog.com/pt-BR/).

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
