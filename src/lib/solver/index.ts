/* =====================================================================
   Orquestração: viabilidade → seeds em sequência fixa → validar →
   pontuar → devolver as melhores. Sequência fixa de seeds garante que
   a mesma entrada devolve sempre o mesmo estudo.
   ===================================================================== */

import type {
  ItemPrograma,
  Lote,
  OpcoesGeracao,
  ParametrosSolver,
  PesosPadroes,
  ResultadoGeracao,
  Variante,
} from "./tipos.ts";
import { AREA_MINIMA, r1 } from "./tipos.ts";
import { gerarVariante } from "./gerador.ts";
import { validar } from "./validador.ts";
import { PESOS_BASE, pontuar, type Pesos } from "./score.ts";

const MAX_TENTATIVAS = 200;
const MAX_VALIDAS = 24;

/* Fator de circulação + folga de compatibilização sobre a soma dos mínimos:
   abaixo disso nem o programa mínimo fecha e a resposta certa é o erro
   estruturado, não uma planta ruim. */
const FATOR_MINIMO = 1.15;

export function checarPrograma(
  lote: Lote,
  programa: ItemPrograma[],
  params: ParametrosSolver,
): ResultadoGeracao | null {
  const itens = programa.filter((i) => i.quantidade > 0);
  if (itens.length === 0)
    return { erro: "PROGRAMA_INVALIDO", detalhe: "programa vazio" };
  if (!itens.some((i) => i.tipo === "sala"))
    return { erro: "PROGRAMA_INVALIDO", detalhe: "o programa precisa de uma sala" };

  if (![lote.largura, lote.profundidade].every((n) => Number.isFinite(n) && n > 0))
    return { erro: "PROGRAMA_INVALIDO", detalhe: "medidas do lote inválidas" };

  // sem Ficha Técnica o sistema não gera (Art. 110) — nada de assumir
  // recuo frontal nem taxa de ocupação
  const f = lote.ficha;
  if (
    !f ||
    ![f.recuoFrontal, f.coeficienteAproveitamento].every(
      (n) => Number.isFinite(n) && n >= 0,
    ) ||
    !Number.isFinite(f.taxaOcupacaoMax) ||
    f.taxaOcupacaoMax <= 0 ||
    f.taxaOcupacaoMax > 1 ||
    !Number.isFinite(f.permeabilidadeMinima) ||
    f.permeabilidadeMinima < 0 ||
    f.permeabilidadeMinima > 1
  )
    return {
      erro: "PROGRAMA_INVALIDO",
      detalhe:
        "preencha a Ficha Técnica do lote (Art. 110) — recuo frontal, taxa de ocupação, coeficiente e permeabilidade",
    };

  const frenteCasa = params.vaga.vagaPodeOcuparRecuoFrontal
    ? Math.max(f.recuoFrontal, params.vaga.comprimento)
    : f.recuoFrontal + params.vaga.comprimento;
  const envD = lote.profundidade - frenteCasa - params.implantacao.quintalMinimo;
  const areaDisponivel = Math.max(
    0,
    Math.min(
      lote.largura * envD,
      lote.largura * lote.profundidade * f.taxaOcupacaoMax,
    ),
  );
  const somaMinima = itens.reduce(
    (s, i) =>
      s + i.quantidade * Math.max(i.areaMin, AREA_MINIMA[i.tipo] ?? 0, 1),
    0,
  );
  const areaNecessaria = r1(somaMinima * FATOR_MINIMO);
  if (envD <= 0 || areaNecessaria > areaDisponivel) {
    return {
      erro: "PROGRAMA_EXCEDE_ENVELOPE",
      areaNecessaria,
      areaDisponivel: r1(areaDisponivel),
    };
  }
  return null;
}

export function gerarEstudo(
  lote: Lote,
  programa: ItemPrograma[],
  quantidadeVariantes: number,
  params: ParametrosSolver,
  pesosPadroes: PesosPadroes,
  pesos: Pesos = PESOS_BASE,
  opcoes: OpcoesGeracao = {},
): ResultadoGeracao {
  const problema = checarPrograma(lote, programa, params);
  if (problema) return problema;

  const itens = programa.filter((i) => i.quantidade > 0);
  const validas: Variante[] = [];

  for (let seed = 1; seed <= MAX_TENTATIVAS; seed++) {
    const bruta = gerarVariante(lote, itens, seed, params, opcoes);
    if (!bruta) continue;
    const violacoes = validar(
      bruta.comodos,
      lote,
      params,
      bruta.patio,
      bruta.portas,
      bruta.vaga,
      opcoes,
    );
    if (violacoes.length > 0) continue;
    validas.push({
      seed,
      comodos: bruta.comodos,
      portas: bruta.portas,
      patio: bruta.patio,
      vaga: bruta.vaga,
      implantacao: bruta.implantacao,
      areaConstruida: bruta.areaConstruida,
      score: pontuar(
        bruta.comodos,
        itens,
        bruta.corteSocial,
        lote,
        bruta.patio,
        pesos,
        bruta.portas,
        params,
        pesosPadroes,
      ),
      violacoes: [],
    });
    if (validas.length >= MAX_VALIDAS) break;
  }

  if (validas.length === 0) return { erro: "SEM_VARIANTE_VALIDA" };

  // Seleção com diversidade de implantação (spec 2C: distribuir entre as
  // combinações do Art. 13 §1º): melhor nota primeiro, mas nenhuma
  // implantação leva mais da metade das vagas enquanto houver alternativa.
  validas.sort((a, b) => b.score - a.score || a.seed - b.seed);
  const alvo = Math.max(1, quantidadeVariantes);
  const capPorCombo = Math.max(1, Math.ceil(alvo / 2));
  const porCombo = new Map<string, number>();
  const escolhidas: Variante[] = [];
  for (const v of validas) {
    if (escolhidas.length >= alvo) break;
    const k = `${v.implantacao.recuoEsquerda}/${v.implantacao.recuoDireita}`;
    const n = porCombo.get(k) ?? 0;
    if (n >= capPorCombo) continue;
    escolhidas.push(v);
    porCombo.set(k, n + 1);
  }
  for (const v of validas) {
    if (escolhidas.length >= alvo) break;
    if (!escolhidas.includes(v)) escolhidas.push(v);
  }
  return { variantes: escolhidas };
}
