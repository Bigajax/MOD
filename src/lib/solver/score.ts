/* =====================================================================
   Soft constraints → nota 0–100. Não descartam nada; só ordenam.

   A nota é o produto escalar de seis componentes (0–1) por seis pesos.
   Os pesos de fábrica seguem a spec: prumada e desvio de área pesam
   alto, quartos perto da social e insolação pesam médio, proporção e
   compacidade pesam baixo. Quando o escritório marca favoritas, a
   calibração desloca os pesos na direção do que foi escolhido — o
   motor passa a ter o gosto de quem o usa.
   ===================================================================== */

import type {
  ChavePadrao,
  Comodo,
  ItemPrograma,
  Lote,
  OrientacaoNorte,
  ParametrosSolver,
  PesosPadroes,
  Porta,
  Retangulo,
  TipoComodo,
} from "./tipos.ts";
import { MOLHADO, PERMANENCIA } from "./tipos.ts";
import {
  envolvente,
  facesDoComodo,
  paredeComum,
  proporcao,
} from "./geometria.ts";
import { grafoAcessos } from "./grafo.ts";

export type ChaveComponente =
  | "hidraulica"
  | "areaAlvo"
  | "proximidade"
  | "insolacao"
  | "proporcao"
  | "compacidade";

export type Componentes = Record<ChaveComponente, number>;
export type Pesos = Record<ChaveComponente, number>;

export const PESOS_BASE: Pesos = {
  hidraulica: 0.25,
  areaAlvo: 0.25,
  proximidade: 0.15,
  insolacao: 0.15,
  proporcao: 0.1,
  compacidade: 0.1,
};

/* Rosa dos ventos: para cada posição do norte, a direção cardeal de cada
   lado do lote (frente = rua). */
const ROSA: Record<
  OrientacaoNorte,
  Record<"frente" | "fundos" | "esquerda" | "direita", "N" | "S" | "L" | "O">
> = {
  frente: { frente: "N", direita: "L", fundos: "S", esquerda: "O" },
  direita: { direita: "N", fundos: "L", esquerda: "S", frente: "O" },
  fundos: { fundos: "N", esquerda: "L", frente: "S", direita: "O" },
  esquerda: { esquerda: "N", frente: "L", direita: "S", fundos: "O" },
};

/* A variante gravada no banco não guarda o corte social; ele é a linha
   onde a circulação começa — derivável dos próprios cômodos. */
export function corteSocialDe(comodos: Comodo[]): number {
  const circ = comodos.filter((c) => c.tipo === "circulacao");
  if (circ.length > 0) return Math.min(...circ.map((c) => c.y));
  return envolvente(comodos).y1;
}

export function componentes(
  comodos: Comodo[],
  programa: ItemPrograma[],
  corteSocial: number,
  lote?: Lote,
  patio?: Retangulo,
): Componentes {
  const caixa = envolvente(comodos);

  // prumada hidráulica: quantos cômodos com água encostam em outro
  const molhados = comodos.filter((c) => MOLHADO.includes(c.tipo));
  let hidraulica = 1;
  if (molhados.length > 1) {
    const agrupados = molhados.filter((a) =>
      molhados.some((b) => b !== a && paredeComum(a, b) >= 0.5),
    );
    hidraulica = agrupados.length / molhados.length;
  }

  // desvio da área alvo, por tipo
  const alvoPorTipo = new Map(programa.map((i) => [i.tipo, i.areaAlvo]));
  const comAlvo = comodos.filter(
    (c) => c.tipo !== "circulacao" && (alvoPorTipo.get(c.tipo) ?? 0) > 0,
  );
  const desvio =
    comAlvo.length === 0
      ? 0
      : comAlvo.reduce(
          (s, c) =>
            s +
            Math.abs(c.area - alvoPorTipo.get(c.tipo)!) /
              alvoPorTipo.get(c.tipo)!,
          0,
        ) / comAlvo.length;
  const areaAlvo = Math.max(0, 1 - desvio * 2);

  // quartos perto da zona social
  const quartos = comodos.filter(
    (c) => c.tipo === "quarto" || c.tipo === "suite",
  );
  const fundoTotal = caixa.y1 - corteSocial;
  const proximidade =
    quartos.length === 0 || fundoTotal <= 0
      ? 1
      : 1 -
        quartos.reduce(
          (s, c) =>
            s +
            Math.min(
              1,
              Math.max(
                0,
                (c.y + c.profundidade / 2 - corteSocial) / fundoTotal,
              ),
            ),
          0,
        ) /
          quartos.length;

  // proporção próxima de 1:1,4
  const habitaveis = comodos.filter((c) => c.tipo !== "circulacao");
  const proporcaoMedia =
    habitaveis.reduce(
      (s, c) => s + Math.max(0, 1 - Math.abs(proporcao(c) - 1.4) / 1.1),
      0,
    ) / habitaveis.length;

  // compacidade: menor perímetro externo por m² construído (quadrado = 1).
  // O pátio de canto desconta área mas não muda o perímetro do recorte.
  const area =
    caixa.largura * caixa.profundidade -
    (patio ? patio.largura * patio.profundidade : 0);
  const perimetro = 2 * (caixa.largura + caixa.profundidade);
  const compacidade = (4 * Math.sqrt(area)) / perimetro;

  // insolação: quarto bom acorda com sol — face externa a leste ou norte.
  // Sem orientação informada o termo fica neutro (não muda o ranking).
  let insolacao = 0.5;
  if (lote?.orientacaoNorte && quartos.length > 0) {
    const rosa = ROSA[lote.orientacaoNorte];
    const EPS = 0.03;
    const bemOrientados = quartos.filter((c) => {
      const lados: ("frente" | "fundos" | "esquerda" | "direita")[] = [];
      if (Math.abs(c.y - caixa.y0) < EPS) lados.push("frente");
      if (Math.abs(c.y + c.profundidade - caixa.y1) < EPS) lados.push("fundos");
      if (Math.abs(c.x - caixa.x0) < EPS) lados.push("esquerda");
      if (Math.abs(c.x + c.largura - caixa.x1) < EPS) lados.push("direita");
      return lados.some((l) => rosa[l] === "N" || rosa[l] === "L");
    });
    insolacao = bemOrientados.length / quartos.length;
  }

  return {
    hidraulica,
    areaAlvo,
    proximidade,
    insolacao,
    proporcao: proporcaoMedia,
    compacidade,
  };
}

const CHAVES = Object.keys(PESOS_BASE) as ChaveComponente[];

/* =====================================================================
   2C — Padrões de A Pattern Language, medidos sobre o grafo de acessos
   e as faces livres. O v2 mede o que é frequente; Alexander mede o que
   é bom. Rodam em paralelo — pesos em config/score.json.
   ===================================================================== */

const SOCIAIS: TipoComodo[] = ["sala", "cozinha", "varanda", "lavabo"];
const INTIMOS: TipoComodo[] = ["quarto", "suite", "banho"];

function rampa(valor: number, bom: number, ruim: number): number {
  if (valor <= bom) return 1;
  if (valor >= ruim) return 0;
  return (ruim - valor) / (ruim - bom);
}

function ehDivisa(
  fixo: number,
  ori: "h" | "v",
  lote: Lote,
  params: ParametrosSolver,
): boolean {
  const lados = params.divisa.ladosQueSaoDivisa;
  const EPS = 0.03;
  if (ori === "v") {
    return (
      (lados.includes("esquerda") && Math.abs(fixo) < EPS) ||
      (lados.includes("direita") && Math.abs(fixo - lote.largura) < EPS)
    );
  }
  return (
    (lados.includes("fundos") && Math.abs(fixo - lote.profundidade) < EPS) ||
    (lados.includes("frente") && Math.abs(fixo) < EPS)
  );
}

export function pontuarPadroes(
  comodos: Comodo[],
  portas: Porta[],
  lote: Lote,
  params: ParametrosSolver,
  patio?: Retangulo,
): Record<ChavePadrao, number> {
  const g = grafoAcessos(comodos, portas);
  const prof = (c: Comodo) => g.profundidade.get(c.id) ?? Infinity;

  // 127 — gradiente de intimidade: íntimo mais fundo que o social
  const sociais = comodos.filter(
    (c) => SOCIAIS.includes(c.tipo) && Number.isFinite(prof(c)),
  );
  const intimos = comodos.filter(
    (c) => INTIMOS.includes(c.tipo) && Number.isFinite(prof(c)),
  );
  let gradienteIntimidade = 1;
  if (sociais.length > 0 && intimos.length > 0) {
    let ok = 0;
    for (const s of sociais)
      for (const i of intimos) if (prof(s) < prof(i)) ok++;
    gradienteIntimidade = ok / (sociais.length * intimos.length);
  }

  // 159 — luz de dois lados: permanência com faces livres não paralelas
  const permanencias = comodos.filter((c) => PERMANENCIA.includes(c.tipo));
  let luzDeDoisLados = 1;
  if (permanencias.length > 0) {
    const comCanto = permanencias.filter((c) => {
      const faces = facesDoComodo(c, comodos).filter((f) => {
        if (f.livre < 0.6) return false;
        if (ehDivisa(f.fixo, f.ori, lote, params)) return false;
        if (!params.padroes.luzDoisLados.patioConta && patio) {
          const dentroPatio =
            f.ori === "h"
              ? f.fixo >= patio.y - 0.03 &&
                f.fixo <= patio.y + patio.profundidade + 0.03 &&
                f.a >= patio.x - 0.03
              : f.fixo >= patio.x - 0.03 &&
                f.fixo <= patio.x + patio.largura + 0.03 &&
                f.a >= patio.y - 0.03;
          if (dentroPatio) return false;
        }
        return true;
      });
      return faces.some((f) => f.ori === "h") && faces.some((f) => f.ori === "v");
    });
    luzDeDoisLados = comCanto.length / permanencias.length;
  }

  // 132 — passagens curtas: comprimento e esbeltez da circulação
  const circs = comodos.filter((c) => c.tipo === "circulacao");
  const cfgP = params.padroes.passagens;
  const passagensCurtas =
    circs.length === 0
      ? 1
      : circs.reduce((s, c) => {
          const comprimento = Math.max(c.largura, c.profundidade);
          return (
            s +
            rampa(comprimento, cfgP.comprimentoBom, cfgP.comprimentoRuim) *
              rampa(proporcao(c), cfgP.esbeltezBoa, cfgP.esbeltezRuim)
          );
        }, 0) / circs.length;

  // 129 — sala no coração: grau da sala no grafo
  const sala = comodos.find((c) => c.tipo === "sala");
  const salaNoCoracao = sala
    ? Math.min(g.grau.get(sala.id) ?? 0, params.padroes.salaCoracao.grauBom) /
      params.padroes.salaCoracao.grauBom
    : 0;

  return { gradienteIntimidade, luzDeDoisLados, passagensCurtas, salaNoCoracao };
}

const CHAVES_PADROES: ChavePadrao[] = [
  "gradienteIntimidade",
  "luzDeDoisLados",
  "passagensCurtas",
  "salaNoCoracao",
];

export function pontuar(
  comodos: Comodo[],
  programa: ItemPrograma[],
  corteSocial: number,
  lote: Lote,
  patio: Retangulo | undefined,
  pesos: Pesos,
  portas: Porta[],
  params: ParametrosSolver,
  pesosPadroes: PesosPadroes,
): number {
  const comp = componentes(comodos, programa, corteSocial, lote, patio);
  const padr = pontuarPadroes(comodos, portas, lote, params, patio);
  const somaPesos =
    CHAVES.reduce((s, k) => s + pesos[k], 0) +
    CHAVES_PADROES.reduce((s, k) => s + pesosPadroes[k], 0);
  const nota =
    (CHAVES.reduce((s, k) => s + pesos[k] * comp[k], 0) +
      CHAVES_PADROES.reduce((s, k) => s + pesosPadroes[k] * padr[k], 0)) /
    somaPesos;
  return Math.round(nota * 100);
}

/* =====================================================================
   Calibração pelas favoritas.

   Para cada componente, compara a média entre as variantes favoritadas
   e as demais: o que as favoritas têm mais, pesa mais. O deslocamento
   é multiplicativo e limitado (⅓× a 3× do peso de fábrica) — o gosto
   ajusta o motor, não o descarrilha. Com menos de 3 favoritas, valem
   os pesos de fábrica: amostra pequena não é opinião.
   ===================================================================== */
export function calibrarPesos(
  amostras: { comp: Componentes; favorita: boolean }[],
  base: Pesos = PESOS_BASE,
): Pesos {
  const favs = amostras.filter((a) => a.favorita);
  const outras = amostras.filter((a) => !a.favorita);
  if (favs.length < 3 || outras.length === 0) return { ...base };

  const media = (grupo: typeof amostras, k: ChaveComponente) =>
    grupo.reduce((s, a) => s + a.comp[k], 0) / grupo.length;

  const pesos = { ...base };
  for (const k of CHAVES) {
    const delta = media(favs, k) - media(outras, k);
    const bruto = base[k] * Math.exp(2 * delta);
    pesos[k] =
      Math.round(
        Math.min(base[k] * 3, Math.max(base[k] / 3, bruto)) * 1e4,
      ) / 1e4;
  }
  return pesos;
}
