# FastReport Final

**PWA para organizar fotos de trabalho em projetos.** No telemóvel funciona como uma app nativa instalável (ecrã cheio, offline, ícone no ecrã principal); no computador adapta-se ao ecrã grande. Uma só aplicação, na web, sem contas nem nuvem — tudo fica no teu dispositivo.

[![CI](https://github.com/RobertRuas/FastReport-Final/actions/workflows/ci.yml/badge.svg)](https://github.com/RobertRuas/FastReport-Final/actions/workflows/ci.yml)
[![Pages](https://github.com/RobertRuas/FastReport-Final/actions/workflows/pages.yml/badge.svg)](https://github.com/RobertRuas/FastReport-Final/actions/workflows/pages.yml)
[![Licença: MIT](https://img.shields.io/badge/Licen%C3%A7a-MIT-blue.svg)](LICENSE)

**App online:** https://robertruas.github.io/FastReport-Final/

> Este projeto unifica dois projetos anteriores — o FastReport (app nativa de macOS) e o FastReport Mobile (web app para iPhone) — numa só base. A stack escolhida é **Svelte 5 + Vite (PWA)**. O plano completo e o estado da unificação estão em [ROADMAP.md](ROADMAP.md).

---

## O que faz

A partir de um **mapa** (hoje: Inspeção T1–T24 e Retrofit de tendões), cria um **projeto**, importa fotos (ou tira-as com a câmara), converte para JPEG 1024, e deixa classificar foto a foto. No fim, exporta um ZIP com as pastas e os nomes certos, pronto para montar o relatório noutro programa.

- **Projetos a partir de mapas** — cada mapa define pastas, atalhos e o padrão dos nomes.
- **Importar e converter** — fotos para JPEG 1024, ou tirar na hora com a câmara.
- **Triagem** — uma foto de cada vez: classificar, rodar, inverter, cortar, saltar, desfazer.
- **Revisão** — grelha por pasta, reordenar arrastando, recategorizar.
- **Exportar / importar ZIP** — com a estrutura de pastas (abre no FastReport do Mac) ou só as fotos.
- **Offline e instalável** — service worker e manifesto; funciona sem rede depois de aberta uma vez.
- **Português e inglês**, tema claro/escuro, tamanho da interface ajustável.

## Instalar

- **Telemóvel (iPhone):** abre a [app online](https://robertruas.github.io/FastReport-Final/) no Safari e toca em Partilhar → "Adicionar ao ecrã principal".
- **Computador (Chrome / Edge):** abre a app e usa o ícone de instalar na barra de endereço.

## Desenvolver

Requer [Node.js](https://nodejs.org) 22 ou superior.

```bash
npm install
npm run dev     # servidor de desenvolvimento (porta 5173)
npm run build   # gera dist/ (inclui sw.js para o modo offline)
npm test        # corre os testes
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
