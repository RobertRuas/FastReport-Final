# Teste real (Fase 5)

Lista para confirmar no iPhone e no Mac antes de chamar a esta versão **1.0** e arquivar o repositório Swift.
Marca cada linha com ✅ ou escreve o que correu mal (abre uma issue com o modelo "Erro").

App: https://robertruas.github.io/FastReport-Final/

## O que já foi verificado automaticamente

| Teste | Resultado |
|---|---|
| 41 testes (regras, mapas, motor de pastas com disco simulado) | ✅ verdes no CI |
| 320 fotos 2400×1800 importadas no modo "nesta app" | ✅ ~51 ms/foto (16 s no total), 320 classificações em <1 s, ZIP de 320 fotos em 0,1 s |
| 320 ficheiros numa pasta (modo pasta) | ✅ abrir 1,5 s; classificar tudo e gravar no disco em ~6 s; reabrir 0,16 s (miniaturas em cache); nomes `_1…_14` sem buracos |
| Preencher buracos, reordenar, desfazer, rodar e desfazer, esvaziar lixo (modo pasta) | ✅ |
| Mudança feita "por fora" na pasta aparece sozinha | ✅ em < 5 s |
| `fastreport-delivery.json` acompanha a renumeração | ✅ |
| Triagem por teclado (12↵, g↵, ⌘⌫, ⌘Z, 99↵ → aviso, +, ⌘0, Esc) | ✅ |

## iPhone (Safari, app no ecrã principal)

- [ ] Abrir a app pelo ícone; aparece "Novidades" depois da atualização.
- [ ] Projeto novo "Nesta app", importar 300+ fotos da fototeca (incluindo HEIC).
- [ ] Tirar uma fotografia com a câmara.
- [ ] Triagem por toques com háptica; rodar, inverter, cortar, desfazer.
- [ ] Revisão: arrastar para reordenar e para outra pasta; o separador Entrega abre.
- [ ] Exportar ZIP com pastas → abrir no FastReport do Mac (ou no Finder) e ver nomes `Projeto_T10_1.jpeg`.
- [ ] Modo avião: a app abre e funciona.

## Mac (Chrome ou Edge, app instalada pelo ícone da barra de endereço)

- [ ] Instalar a app (ícone de instalar na barra de endereço) e abrir numa janela própria.
- [ ] **Abrir pasta de projeto** criada pelo FastReport do Mac (com `fastreport.json`): fotos e contagens iguais às do Mac.
- [ ] **Novo projeto → Numa pasta do disco**: a pasta aparece no Finder com Inbox, General, Trash, T1…T24.
- [ ] Arrastar fotos do Finder para a janela → entram em Sem categoria (e no disco, na pasta Inbox).
- [ ] Triagem só com o teclado: `12` Enter, `0` Enter, Tab (mapa de tendões), ⌘⌫, ⌘Z, R/F/C, setas, `+`/`−`, pinça no trackpad.
- [ ] No Finder, mover uma foto à mão de Inbox para T3 → a app atualiza sozinha.
- [ ] **Entrega → arrastar uma foto para o Word** (o ponto de maior risco): a imagem entra no documento e a foto fica marcada/esbatida.
- [ ] **Entrega → botão direito → Copiar imagem** e colar no Word.
- [ ] Abrir o mesmo projeto no FastReport do Mac: as marcações da Entrega aparecem lá também.
- [ ] Exportar contagens (CSV) e abrir no Excel/Numbers.
- [ ] Safari no Mac: a app funciona no modo "Nesta app" (sem a opção de pasta).

## Depois do teste

1. Se tudo estiver ✅: pedir para publicar a **1.0.0** e arquivar o repositório `RobertRuas/FastReport` (Swift) com uma nota a apontar para este.
2. O repositório `RobertRuas/FastReport-Mobile` pode também ser arquivado, porque esta app o substitui.
