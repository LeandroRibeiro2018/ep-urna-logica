# Documentação de entrega — Urna Lógica

| Arquivo | Para quê |
|---|---|
| [`relatorio-tecnico.pdf`](relatorio-tecnico.pdf) | **Relatório técnico** (seção 16.1 do enunciado): narrativa e regras, modelagem, arquitetura, estruturas, algoritmos, testes, métricas, complexidade, IAG e conclusão. |
| [`relatorio-tecnico.html`](relatorio-tecnico.html) | Fonte do PDF (gerado por `npm run relatorio`; imprimir como PDF para atualizar). |
| [`guia-da-professora.md`](guia-da-professora.md) | Como abrir e jogar em poucos minutos, com gabarito. |
| [`roteiro-demonstracao.md`](roteiro-demonstracao.md) | Roteiro de ≈ 12 min da demonstração em sala (partida manual + solver). |
| [`uso-de-iag.md`](uso-de-iag.md) | Registro de uso de IAG (seção 14.4) e curadoria. |
| [`checklist-entrega.md`](checklist-entrega.md) | Checklist da seção 19, RF01–RF12, rastreabilidade (seção 10) e pendências dos autores. |
| [`prints/`](prints) | Capturas de tela usadas no relatório. |

## Atualizar o relatório depois de mudar o código

```bash
npm run relatorio      # recalcula todas as métricas e regrava docs/relatorio-tecnico.html (≈ 20 s)
```

Depois abra o HTML no navegador → **Imprimir → Salvar como PDF** (A4, sem cabeçalhos/rodapés, com *gráficos de segundo plano* ligado), ou rode no Windows:

```powershell
& "C:\Program Files\Google\Chrome\Application\chrome.exe" --headless=new --no-pdf-header-footer `
  --print-to-pdf="docs\relatorio-tecnico.pdf" "file:///$((Resolve-Path docs\relatorio-tecnico.html).Path -replace '\\','/')"
```

As frases em amarelo no relatório (`[nomes da equipe]`, `[URL…]`, `[Complementar…]`) são pontos que só os autores podem preencher.
