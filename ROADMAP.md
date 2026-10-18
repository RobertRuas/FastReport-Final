# FastReport: viabilidade da unificação (Mac + telemóvel → um só PWA)

**Veredito: é viável.** A melhor base é o **FastReport-Mobile (Svelte 5 + Vite, já é PWA)**. O app de Mac (Swift/SwiftUI) não se reaproveita como código, mas serve de especificação: as suas funcionalidades exclusivas são portadas para a web. Os mapas JSON são **idênticos** nos dois repositórios e o formato de pastas/nomes já é compatível (o ZIP do telemóvel abre no Mac).

Repositórios analisados: `RobertRuas/FastReport` (último commit 30/09/2026) e `RobertRuas/FastReport-Mobile` (último commit 18/10/2026, v1.5.0).

---

## 1. Stack de cada projeto

| | FastReport (Mac) | FastReport-Mobile |
|---|---|---|
| Linguagem / UI | Swift 6, SwiftUI + AppKit | JavaScript, Svelte 5 (runes) |
| Build | Xcode + XcodeGen (`project.yml`) | Vite 7 |
| Dependências | Sparkle 2 (atualizações) | sortablejs (arrastar) |
| Onde ficam as fotos | **Pastas reais no disco** (Finder é a fonte da verdade), bookmarks de sandbox | IndexedDB no próprio aparelho; entra/sai por ZIP |
| Imagens | ImageIO (HEIC/PNG/JPEG → JPEG 1024, qualidade configurável) | Canvas (→ JPEG 1024, qualidade 0,85 fixa) |
| Distribuição | `.dmg` no GitHub Releases + Sparkle (exige "Abrir Mesmo Assim" no Gatekeeper) | GitHub Pages (HTTPS), "Adicionar ao ecrã principal" |
| Offline | Nativo | Service worker com pré-cache completo |
| Testes / CI | XCTest (fluxo, domínio, mapas) + Actions de build/release | Só build no Actions (sem testes) |
| Tamanho | ~7 800 linhas Swift | ~4 400 linhas (JS + Svelte + JSON) |

## 2. Inventário de funcionalidades

✅ existe · ➖ não existe · ⚠️ existe de forma parcial

| Funcionalidade | Mac | Mobile | No app unificado |
|---|:-:|:-:|---|
| Mapas Inspeção T24 e Retrofit de tendões (C12/C25) | ✅ | ✅ | Igual (mesmo JSON) |
| Criar projeto a partir de um mapa, nome → slug dos ficheiros | ✅ | ✅ | Igual |
| Importar fotos e converter para JPEG 1024 | ✅ | ✅ | Igual |
| Tirar fotografia com a câmara direto para a Inbox | ➖ | ✅ | Manter (telemóvel) |
| Importar HEIC | ✅ | ✅ (Safari) | ⚠️ No Chrome de computador precisa de um descodificador HEIC (WASM) |
| Inbox em grelha + contadores (classificadas/total, lixo) | ✅ | ✅ | Igual |
| Triagem: Geral, Lixo, Saltar, Anterior, Desfazer | ✅ | ✅ | Igual |
| Triagem por **teclado** (número + Enter, 0, ⌘⌫, ⌘Z, setas, Esc, Tab para grupos) | ✅ | ➖ | **Portar do Mac** |
| Triagem por **toques** e háptica | ➖ | ✅ | Manter |
| Rodar, inverter (espelho), recortar | ✅ | ✅ | Igual |
| Zoom na foto (+/−, ⌘0, trackpad) | ✅ | ⚠️ (visualizador) | Unificar: pinça no telemóvel, teclado/trackpad no computador |
| Revisão por linhas/slots, aviso n/esperado | ✅ | ✅ | Igual |
| Reordenar arrastando, renumerar `_1`, `_2`… | ✅ | ✅ | Igual |
| Recategorizar / mover foto para outro slot | ✅ | ✅ | Igual |
| Esvaziar lixo | ✅ | ✅ | Igual |
| Numeração sem buracos (`_1`, `_2`, `_3`…) | ✅ (preenche buracos no disco) | ✅ (nome calculado pela ordem) | Igual; no modo pasta seguir a regra do Mac |
| **Trabalhar direto numa pasta do disco** (abrir/criar projeto em pasta, `fastreport.json`) | ✅ | ➖ | **Portar** via File System Access API (Chrome/Edge) |
| **Acompanhar mudanças feitas no Finder** (watcher) | ✅ | ➖ | **Portar** (FileSystemObserver ou releitura periódica) |
| Revelar no Finder / mandar para o Lixo do Mac | ✅ | ➖ | ⚠️ Browser não abre o Finder; substituir por "copiar caminho" e lixo dentro do projeto |
| **Entrega**: quadro para arrastar JPEGs para Word/outro programa, com marcação do que já foi usado (`fastreport-delivery.json`) | ✅ | ➖ | **Portar**; arrastar imagem do browser para o Word funciona, mas é o ponto de maior risco (testar cedo) |
| Projetos recentes | ✅ | ✅ (lista de projetos) | Igual |
| Exportar ZIP (com pastas ou só fotos) e marcar como exportado | ➖ | ✅ | Manter (útil também no computador) |
| Importar ZIP de projeto | ➖ | ✅ | Manter |
| Renomear e apagar projeto, aviso "por exportar" | ⚠️ | ✅ | Manter |
| Projeto de exemplo (demo) | ➖ | ✅ | Manter |
| Idioma PT/EN | ✅ | ✅ (+ automático) | Igual |
| Tema claro/escuro | sistema | ✅ escolha manual | Manter |
| Tamanho da interface (4 níveis) | ➖ | ✅ | Manter |
| Miniaturas por linha / pinça | ✅ (tamanho) | ✅ | Manter |
| Tamanho máximo e qualidade JPEG nas Definições | ✅ | ➖ (fixo) | **Portar do Mac** |
| Estado do armazenamento, proteção contra limpeza, offline, instalado | ➖ | ✅ | Manter |
| Folha de atalhos | ✅ | ➖ | **Portar** (só no computador) |
| Notas da versão | ✅ | ➖ | **Portar** |
| Atualizações | Sparkle | aviso "nova versão, toca para atualizar" | Service worker (substitui Sparkle) |
| Instalação | DMG + Gatekeeper | ecrã principal | PWA instalável no Chrome/Edge do Mac e no iPhone |

**Exclusivos do Mac a não perder:** teclado completo, trabalho direto em pastas + watcher, Entrega com marcações, qualidade/tamanho configuráveis, folha de atalhos, notas da versão, zoom por teclado.
**Exclusivos do telemóvel a não perder:** câmara, ZIP (exportar/importar, 2 formatos), tema/tamanho de interface, demo, háptica, estado de armazenamento, aviso de projetos por exportar.

## 3. Stack recomendada

**Svelte 5 + Vite, PWA**, partindo do repositório FastReport-Mobile.

Porquê:
- Já está feito e afinado para o iPhone (gestos, safe areas, service worker, ecrã cheio, instalável). Reescrever isso noutra stack seria o maior custo.
- Svelte gera pouco JavaScript e é rápido com 300+ fotos, o que importa num telemóvel.
- Nenhum ganho real em trocar para React/Next/Flutter Web: mais peso e mais reescrita, mesmo resultado.

Arquitetura proposta:
1. **Uma camada de armazenamento com dois motores**, escolhida automaticamente:
   - *Pasta no disco* (Chrome/Edge no computador): lê e grava em pastas reais, como o app de Mac faz hoje. O Finder continua a ser a fonte da verdade.
   - *Interno* (iPhone, Safari, Firefox): IndexedDB/OPFS como hoje, com entrada e saída por ZIP.
2. **Layout adaptativo**: no telemóvel, as telas atuais em pilha com barra de navegação; em tela larga, barra lateral com slots + grelha + painel da foto, menus e atalhos de teclado.
3. **Camada de entrada única**: toques/gestos e teclado chamam as mesmas ações (mover, desfazer, rodar…).
4. Testes automáticos (Vitest) portados dos testes do Mac para as regras de mover/renomear/desfazer, que hoje no mobile não têm testes.

Navegador no computador: **Chrome ou Edge** para ter o modo "pasta no disco". No Safari do Mac a app funciona no modo interno (como no iPhone), sem acesso direto ao Finder.

### O que se aproveita e o que se reescreve

| Origem | Aproveita | Reescreve / porta |
|---|---|---|
| Mobile | Quase tudo: telas, componentes, estado, ZIP, i18n, service worker, mapas | `state.svelte.js` dividido em regras + armazenamento; telas ganham layout de tela larga |
| Mac | Mapas JSON (já iguais), regras de nomes/numeração/undo, textos PT/EN, testes como especificação | Todo o código Swift (não corre no browser): teclado, pasta no disco, watcher, Entrega, definições de imagem, atalhos, notas da versão |
| Mac (deixa de ser preciso) | — | Sparkle, DMG, assinatura, Gatekeeper, scripts de release |

## 4. Melhorias propostas (sem perder nada)

- **Design**: um só sistema visual nos dois tamanhos (o do mobile já é bom), com tela larga a sério: barra lateral de slots, grelha grande, pré-visualização ao lado, menu de contexto com clique direito, arrastar e largar fotos do Finder para a janela.
- **Fiabilidade**: testes automáticos das regras de ficheiros; escrita segura de rotação/recorte (regra do Mac: nunca apagar o original se a gravação falhar).
- **Configurável**: tamanho e qualidade JPEG também no telemóvel (hoje fixos).
- **Instalação mais simples no Mac**: acaba o DMG e o "Abrir Mesmo Assim"; instala pelo ícone de instalar do Chrome.
- **Atualizações iguais nos dois**: aviso de nova versão + notas da versão.
- Do PLANO.md do Mac, ainda por fazer: exportar contagens (CSV) e aviso de fotos duplicadas.

## 5. Riscos

| Risco | Como tratar |
|---|---|
| Arrastar fotos do browser para o Word/Pages (Entrega) pode não se comportar igual ao nativo | Prova técnica logo na Fase 1; alternativa: copiar imagem para a área de transferência |
| Safari e Firefox não têm acesso direto a pastas | Modo interno + ZIP; recomendar Chrome/Edge no Mac |
| HEIC no Chrome do computador | Descodificador WASM só quando necessário |
| iPhone: remover o ícone apaga os dados | Já avisado na app; manter o aviso "por exportar" |
| Atalhos do browser (⌘W, ⌘R…) colidem | Em PWA instalada a maioria fica livre; ajustar onde colidir |

## 6. Roteiro (alto nível)

| Fase | O quê | Resultado |
|---|---|---|
| 0 | Novo repositório unificado a partir do Mobile; testes (Vitest) das regras; manifesto e ícones revistos | Mesmo app de hoje, com testes |
| 1 | Camada de armazenamento (interno + pasta no disco) e provas técnicas: arrastar para o Word, HEIC, watcher | Riscos respondidos antes de investir |
| 2 | Layout de tela larga + atalhos de teclado completos + folha de atalhos | Usável no Mac como o app nativo |
| 3 | Portar exclusivos do Mac: Entrega com marcações, watcher, definições de imagem, notas da versão | Paridade total de funcionalidades |
| 4 | Passagem de design nos dois tamanhos | Visual unificado e melhorado |
| 5 | Teste real (300+ fotos) no iPhone e no Mac, publicar no GitHub Pages, arquivar o repo Swift | App único em produção |

A implementação pode seguir o teu "Método Chief of Staff" (uma fase de cada vez, cada fase com entrega verificável) assim que aprovares este plano.
