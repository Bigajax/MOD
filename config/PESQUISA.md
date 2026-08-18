# PESQUISA — KISS v3 (spec de conformidade legal), Fase 1

Atualizado em **2026-08-18**. Esta rodada substitui a anterior do v3. Entregáveis: `codigo-obras-maringa.json` (texto do arquiteto + anexo de verificação SAPL), `mobiliario.json`, seção `padroes` de `config/score.json`, este relatório. **Nenhum código de solver foi alterado nesta fase. Aguardando aprovação para a Fase 2.**

---

## 1. Fontes

| Fonte | O que é | Confiança |
|---|---|---|
| PDF da LC 1.045/2016 (texto original, 23/03/2016) | Leitura do arquiteto — base do `codigo-obras-maringa.json` | alta (para o texto de 2016) |
| SAPL Câmara de Maringá — sapl.cmm.pr.gov.br/ta/130/text | Texto **compilado** da LC 1.045 ("vigência a partir de 03/08/2026, dada por LC 1.548/2026"), lido em 2026-08-18 | alta |
| SAPL — /norma/15259 | LC 1.548/2026, texto integral | alta |
| SAPL — /ta/1534/text | NRM E-10003 (Lei 10.257/2016, vagas), consolidada até Lei 11.834/2024 | alta |
| SAPL — /ta/946/text | LUOS LC 1.468/2024 + Anexo II (red. LC 1.513/2025) — só referência p/ conferir Ficha Técnica | alta |
| NBR 15575-1, Anexo G (PDF UNMP) | Tabelas de móveis-padrão e circulações — base do `mobiliario.json` | alta |
| Neufert, 5ª ed. bras. 1976 (scan IST Lisboa) | Quartos, cozinhas, banheiros, portas, passagens — páginas citadas item a item | alta |
| Alexander, *A Pattern Language* (1977) | Padrões 127, 129, 132, 159 — traduções em métrica são propostas de projeto | baixa (faixas) |

## 2. Pendências do texto do arquiteto que a verificação SAPL resolveu

1. **LC 1.548/2026** — altera **apenas o art. 31 §1º** (calçadas). Os arts. 13, 17, 23, 25 e 88 estão intactos. Os valores do texto de 2016 usados pelo solver **valem no consolidado**.
2. **Art. 25 (vaga no recuo frontal)** — no consolidado, redação da **LC 1.152/2019**: expressamente permitido em **residenciais uni/bifamiliares, descoberto**. A flag `vagaPodeOcuparRecuoFrontal: true` do spec tem base legal direta (trecho literal no JSON).
3. **NRM de vagas (Art. 23 §1º)** — **foi publicada**: NRM E-10003 (Lei 10.257/2016). Mínimos legais: 1 vaga/unidade; 2,60 × 4,50 m (vaga única). O padrão do escritório 2,50 × 5,00 é mais restritivo no comprimento e menos na largura — pela regra do mais restritivo (Art. 1º §1º), o validador usará **2,60 × 5,00** se o escritório mantiver os 5,00 m; decisão registrada abaixo.

## 3. O que fica `null` / `baixa` (inalterado — a lei realmente não fixa)

| Item | Estado | Base |
|---|---|---|
| Fração de vão de iluminação | null → **padrão do escritório 1/6** (spec 2F) | Art. 86 §1º remete a lux/NBR |
| Área/dimensão mínima por cômodo | null → mobiliário Neufert/NBR | Arts. 8º, 80 |
| Recuo frontal, TO, CA, permeabilidade por zona | null → **input da Ficha Técnica** (Art. 110, 90 dias) | Não estão no Código |
| Retângulos de mobiliário derivados | baixa (somas próprias sobre parcelas com fonte) | NBR não fixa cômodo |
| Faixas dos padrões de Alexander | baixa (proposta de projeto) | — |
| Altura útil de janela (modelo 2D) | política do escritório 1,20 m | — |

## 4. Conflitos registrados

- **Art. 25**: texto 2016 (só comerciais) × consolidado 2019 (uni/bifamiliar ok) — resolvido a favor do consolidado, com trecho literal e URL.
- **Vaga**: NRM 2,60×4,50 × escritório 2,50×5,00 — pela prevalência do mais restritivo, dimensão efetiva 2,60×5,00 salvo decisão contrária.
- **Cozinha**: largura 1,50 (NBR) × 1,875 (Neufert) — adotado 1,50; trocável no config.
- **Lavabo**: 0,80 (Neufert) × 1,10 (se regra de banheiro da NBR se aplicar) — adotado 0,80; trocável.
- **Score**: padrão 127 (íntimo fundo) × termo estatístico `proximidade` — arbitragem de pesos com arquiteto.

## 5. Decisões que precisam de arquiteto humano

1. Fração de iluminação **1/6** como padrão do escritório (o spec 2F já indica o default — confirmar).
2. Dimensão de vaga: manter 2,50×5,00 (→ efetivo 2,60×5,00 pela prevalência) ou adotar o mínimo legal 2,60×4,50.
3. Validar os retângulos de mobiliário (`confianca: baixa`) antes de seguirem como hard constraint.
4. `vagaPodeOcuparRecuoFrontal` — a base legal existe (Art. 25 consolidado); confirmar prática da prefeitura por prudência.
5. Faixas dos padrões 132 (4,5 m / esbeltez 5) e pesos do bloco Alexander.
6. Quintal mínimo de 3,00 m (spec 2C) — não localizei artigo que o fixe; entra como **padrão do escritório** salvo indicação do artigo pelo arquiteto.

---

*Fase 1 encerrada. Aguardando aprovação para a Fase 2 (ordem: Art. 88 no validador → implantação discreta → Ficha Técnica → vaga → mobiliário/arcos → iluminação → Alexander → acessibilidade).*
