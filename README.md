# FastReport Final

**PWA para organizar fotos de trabalho em projetos.** No telemóvel funciona como uma app nativa instalável (ecrã cheio, offline, ícone no ecrã principal); no computador adapta-se ao ecrã grande. Uma só aplicação, na web, sem contas nem nuvem — tudo fica no teu dispositivo.

[![CI](https://github.com/RobertRuas/FastReport-Final/actions/workflows/ci.yml/badge.svg)](https://github.com/RobertRuas/FastReport-Final/actions/workflows/ci.yml)
[![Pages](https://github.com/RobertRuas/FastReport-Final/actions/workflows/pages.yml/badge.svg)](https://github.com/RobertRuas/FastReport-Final/actions/workflows/pages.yml)
[![Licença: MIT](https://img.shields.io/badge/Licen%C3%A7a-MIT-blue.svg)](LICENSE)

**App online:** https://robertruas.github.io/FastReport-Final/

> Este projeto unifica dois projetos anteriores — o FastReport (app nativa de macOS) e o FastReport Mobile (web app para iPhone) — numa só base. A stack escolhida é **Svelte 5 + Vite (PWA)**. O plano completo e o estado da unificação estão em [ROADMAP.md](ROADMAP.md).

---

## O que faz

A partir de um **mapa** (hoje: Inspeção T1–T24 e Retrofit de tendões C12/C25), cria um **projeto**, importa fotos (ou tira-as com a câmara), converte para JPEG e deixa classificar foto a foto. No fim, exporta um ZIP com as pastas e os nomes certos — ou, no computador, trabalha diretamente numa pasta do disco e entrega as fotos arrastando-as para o relatório.

- **Projetos a partir de mapas** — cada mapa define pastas, atalhos e o padrão dos nomes (`Projeto_T10_1.jpeg`).
- **Dois modos de armazenamento**
  - *Nesta app* (iPhone, Safari, Firefox, qualquer browser): fotos guardadas no próprio browser; entram e saem por ZIP.
  - *Pasta no disco* (Chrome/Edge no computador): pastas e ficheiros reais, como no FastReport do Mac. Abre pastas de projeto criadas no Mac (`fastreport.json`) e acompanha as mudanças feitas no Finder.
- **Importar e converter** — fotos (incluindo HEIC) para JPEG 1024/1600/2048 px, câmara no telemóvel, ou arrastar do Finder para a janela.
- **Triagem** — uma foto de cada vez: por toques (telemóvel) ou por teclado (computador, igual ao Mac: número + Enter, `0`/`G` Geral, Tab muda de grupo, ⌘⌫ Lixeira, R/F/C, setas, zoom). Rodar, inverter, cortar, saltar, desfazer.
- **Revisão** — grelha por pasta com contagem `n/esperado`, reordenar arrastando (renumera `_1`, `_2`…), recategorizar, menu de contexto, índice de pastas no ecrã largo.
- **Entrega** — arrastar cada foto para o Word/Pages pasta a pasta, com marcação das já colocadas (`fastreport-delivery.json`, compatível com o Mac) e "Copiar imagem".
- **Exportar / importar ZIP** — com a estrutura de pastas (abre no FastReport do Mac) ou só as fotos; resumo de contagens em CSV.
- **Avisos úteis** — fotos repetidas (mesmo JPEG), projetos por exportar.
- **Offline e instalável** — service worker e manifesto; notas da versão a cada atualização.
- **Português e inglês**, tema claro/escuro, tamanho da interface ajustável, folha de atalhos (`?`).

### Que browser usar

| | iPhone / iPad (Safari) | Mac ou PC — Chrome / Edge | Mac — Safari / Firefox |
|---|:-:|:-:|:-:|
| Projetos nesta app + ZIP | ✅ | ✅ | ✅ |
| Pasta no disco + Finder | — | ✅ | — |
| Câmara | ✅ | — | — |
| Teclado completo, Entrega | — | ✅ | ✅ (sem pasta) |

## Instalar

- **Telemóvel (iPhone):** abre a [app online](https://robertruas.github.io/FastReport-Final/) no Safari e toca em Partilhar → "Adicionar ao ecrã principal".
- **Computador (Chrome / Edge):** abre a app e usa o ícone de instalar na barra de endereço.

## Desenvolver

Requer [Node.js](https://nodejs.org) 22 ou superior.

```bash
npm install
npm run dev     # servidor de desenvolvimento (porta 5173)
npm run build   # gera dist/ (inclui sw.js para o modo offline)
npm test        # corre os testes (regras, mapas, motor de pastas com disco simulado)
```

Estrutura principal:

```
src/lib/rules.js      regras puras partilhadas com o Mac (nomes, numeração, atalhos, Entrega)
src/lib/folder.js     motor "pasta no disco" (File System Access API)
src/lib/db.js         motor "nesta app" (IndexedDB)
src/lib/state.svelte.js  estado da app e ações (mover, desfazer, importar, exportar…)
src/screens/          Home, Projeto, Triagem, Revisão, Entrega, Visualizador, Definições
test/                 Vitest
```

## Publicação

Cada push para `main` publica a app no GitHub Pages através de `.github/workflows/pages.yml`. O workflow `ci.yml` corre a build e os testes em cada push e pull request.

## Formato do ZIP

```
<Nome do projeto>/
  fastreport.json        {createdAt, displayName, mapId, schemaVersion}
  Inbox/  General/  Trash/  T1/ … T24/     (ou C12/T01…, C25/T01… no mapa de tendões)
  T10/<slug>_T10_1.jpeg …
```

Compatível com o FastReport para Mac: um ZIP com pastas abre lá, e um ZIP do Mac importa-se aqui.

## Licença

[MIT](LICENSE) © 2026 Robert Ruas
