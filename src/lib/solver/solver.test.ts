/* =====================================================================
   Testes do solver — aceites do v1 + KISS v3 (conformidade legal).
   Roda sem dependência externa: `npm run test:solver`.
   As configs vêm dos JSON de config/ — mudar lá muda o resultado aqui.
   ===================================================================== */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import type {
  Comodo,
  FichaTecnica,
  ItemPrograma,
  Lote,
  ParametrosSolver,
  PesosPadroes,
  Porta,
} from "./tipos.ts";
import { gerarEstudo } from "./index.ts";
import { gerarVariante } from "./gerador.ts";
import { faceComAberturaPermitida, validar } from "./validador.ts";
import { facesDoComodo } from "./geometria.ts";
import {
  PESOS_BASE,
  calibrarPesos,
  pontuarPadroes,
  type Componentes,
} from "./score.ts";

const PARAMS: ParametrosSolver = JSON.parse(
  readFileSync(
    new URL("../../../config/parametros-solver.json", import.meta.url),
    "utf8",
  ),
);
const SCORE_CFG = JSON.parse(
  readFileSync(new URL("../../../config/score.json", import.meta.url), "utf8"),
);
const PESOS_PADROES: PesosPadroes = {
  gradienteIntimidade: SCORE_CFG.padroes.gradienteIntimidade.pesoSugerido,
  luzDeDoisLados: SCORE_CFG.padroes.luzDeDoisLados.pesoSugerido,
  passagensCurtas: SCORE_CFG.padroes.passagensCurtas.pesoSugerido,
  salaNoCoracao: SCORE_CFG.padroes.salaNoCoracao.pesoSugerido,
};
const PADROES_ZERO: PesosPadroes = {
  gradienteIntimidade: 0,
  luzDeDoisLados: 0,
  passagensCurtas: 0,
  salaNoCoracao: 0,
};

const FICHA: FichaTecnica = {
  recuoFrontal: 3,
  taxaOcupacaoMax: 0.7,
  coeficienteAproveitamento: 1.4,
  permeabilidadeMinima: 0.1,
  dataEmissao: "2026-08-01",
};

const LOTE_10x25: Lote = { largura: 10, profundidade: 25, ficha: FICHA };
const LOTE_12x30: Lote = { largura: 12, profundidade: 30, ficha: FICHA };

const PROGRAMA_ACEITE: ItemPrograma[] = [
  { tipo: "sala", quantidade: 1, areaMin: 12, areaAlvo: 20 },
  { tipo: "cozinha", quantidade: 1, areaMin: 6, areaAlvo: 10 },
  { tipo: "quarto", quantidade: 3, areaMin: 9, areaAlvo: 10 },
  { tipo: "suite", quantidade: 1, areaMin: 12, areaAlvo: 14 },
  { tipo: "servico", quantidade: 1, areaMin: 3, areaAlvo: 5 },
];

function comodo(parcial: Partial<Comodo> & Pick<Comodo, "id" | "tipo">): Comodo {
  return {
    x: 0,
    y: 0,
    largura: 3,
    profundidade: 3,
    area: 9,
    faceExterna: true,
    ...parcial,
    ...(parcial.largura && parcial.profundidade
      ? { area: Math.round(parcial.largura * parcial.profundidade * 10) / 10 }
      : {}),
  };
}

function gerar6(lote: Lote, pesosPadroes: PesosPadroes = PESOS_PADROES) {
  return gerarEstudo(lote, PROGRAMA_ACEITE, 6, PARAMS, pesosPadroes);
}

/* ---------------- v1: aceites originais ------------------------------- */

test("v1: lote 10×25 devolve 6 variantes válidas em menos de 3 s", () => {
  const inicio = performance.now();
  const r = gerar6(LOTE_10x25);
  const duracao = performance.now() - inicio;
  assert.ok(!("erro" in r), `erro inesperado: ${JSON.stringify(r)}`);
  if ("erro" in r) return;
  assert.equal(r.variantes.length, 6);
  assert.ok(duracao < 3000, `demorou ${duracao.toFixed(0)} ms`);
});

test("v1: mesma seed gera a mesma planta, byte a byte", () => {
  const a = gerarVariante(LOTE_10x25, PROGRAMA_ACEITE, 42, PARAMS);
  const b = gerarVariante(LOTE_10x25, PROGRAMA_ACEITE, 42, PARAMS);
  assert.equal(JSON.stringify(a), JSON.stringify(b));
  assert.equal(JSON.stringify(gerar6(LOTE_10x25)), JSON.stringify(gerar6(LOTE_10x25)));
});

test("v1: nenhuma variante retornada viola hard constraint", () => {
  const r = gerar6(LOTE_10x25);
  assert.ok(!("erro" in r));
  if ("erro" in r) return;
  for (const v of r.variantes) {
    const violacoes = validar(
      v.comodos,
      LOTE_10x25,
      PARAMS,
      v.patio,
      v.portas,
      v.vaga,
    );
    assert.deepEqual(violacoes, [], `seed ${v.seed}: ${violacoes.join("; ")}`);
  }
});

test("v1: programa impossível devolve o erro estruturado", () => {
  const pequeno: Lote = { largura: 7, profundidade: 14, ficha: FICHA };
  const r = gerar6(pequeno);
  assert.ok("erro" in r && r.erro === "PROGRAMA_EXCEDE_ENVELOPE");
});

/* ---------------- v3 legal: aceites novos ------------------------------ */

test("aceite L1: abertura só em face longe da divisa (Art. 88)", () => {
  // quarto colado na divisa esquerda: a única face livre é a da divisa
  const quarto = comodo({ id: "quarto-1", tipo: "quarto", x: 0, y: 8, largura: 3, profundidade: 4 });
  const vizinhos = [
    comodo({ id: "sala-1", tipo: "sala", x: 0, y: 4, largura: 3, profundidade: 4 }),
    comodo({ id: "quarto-2", tipo: "quarto", x: 3, y: 8, largura: 3, profundidade: 4 }),
    comodo({ id: "quarto-3", tipo: "quarto", x: 0, y: 12, largura: 3, profundidade: 4 }),
  ];
  const violacoes = validar([quarto, ...vizinhos], LOTE_10x25, PARAMS);
  assert.ok(
    violacoes.some((v) => v.includes("quarto-1") && v.includes("Art. 88")),
    violacoes.join("; "),
  );
  // e a mesma face, afastada 1,50 m da divisa, é permitida
  const solto = comodo({ id: "q", tipo: "quarto", x: 1.5, y: 8, largura: 3, profundidade: 4 });
  const faces = facesDoComodo(solto, [solto]);
  const esquerda = faces.find((f) => f.lado === "esquerda")!;
  assert.ok(faceComAberturaPermitida(esquerda, LOTE_10x25, PARAMS));
});

test("aceite L2: recuo lateral entre 0 e 1,50 m reprova (Art. 13 §1º)", () => {
  const sala = comodo({ id: "sala-1", tipo: "sala", x: 0.8, y: 5, largura: 4, profundidade: 4.5 });
  const violacoes = validar([sala], LOTE_10x25, PARAMS);
  assert.ok(
    violacoes.some((v) => v.includes("Art. 13")),
    violacoes.join("; "),
  );
});

test("aceite L3: banho/serviço aparecem SEM face externa (Art. 87)", () => {
  const r = gerar6(LOTE_12x30);
  assert.ok(!("erro" in r));
  if ("erro" in r) return;
  let cegos = 0;
  for (const v of r.variantes) {
    for (const c of v.comodos) {
      if (!["banho", "lavabo", "servico"].includes(c.tipo)) continue;
      const permitidas = facesDoComodo(c, v.comodos).filter((f) =>
        faceComAberturaPermitida(f, LOTE_12x30, PARAMS),
      );
      if (permitidas.length === 0) cegos++;
    }
  }
  assert.ok(
    cegos > 0,
    "nenhum banho/serviço interno — a regra do Art. 87 não está sendo usada",
  );
});

test("aceite L5: vaga presente, quintal >= 3 m e permeabilidade ok", () => {
  const r = gerar6(LOTE_10x25);
  assert.ok(!("erro" in r));
  if ("erro" in r) return;
  for (const v of r.variantes) {
    assert.ok(v.vaga, `seed ${v.seed} sem vaga (Art. 23)`);
    const fundoMax = Math.max(...v.comodos.map((c) => c.y + c.profundidade));
    assert.ok(25 - fundoMax >= 3 - 0.05, `seed ${v.seed}: quintal curto`);
    const areaLote = 10 * 25;
    const larguras = v.comodos.map((c) => c.x);
    const x0 = Math.min(...larguras);
    const x1 = Math.max(...v.comodos.map((c) => c.x + c.largura));
    const y0 = Math.min(...v.comodos.map((c) => c.y));
    const proj =
      (x1 - x0) * (fundoMax - y0) -
      (v.patio ? v.patio.largura * v.patio.profundidade : 0);
    const permeavel = areaLote - proj - v.vaga.largura * v.vaga.profundidade;
    assert.ok(permeavel >= 0.1 * areaLote - 0.1, `seed ${v.seed}: permeável`);
  }
});

test("aceite L6: sem Ficha Técnica o sistema não gera (Art. 110)", () => {
  const semFicha: Lote = {
    largura: 10,
    profundidade: 25,
    ficha: { ...FICHA, taxaOcupacaoMax: 0 },
  };
  const r = gerar6(semFicha);
  assert.ok("erro" in r && r.erro === "PROGRAMA_INVALIDO");
  if ("erro" in r && r.erro === "PROGRAMA_INVALIDO") {
    assert.ok(r.detalhe.includes("Ficha"));
  }
});

test("aceite L8: toda reprovação cita artigo ou fonte", () => {
  // fixture ruim de propósito: estreito, colado, sem vaga, sem quintal
  const violacoes = validar(
    [
      comodo({ id: "quarto-1", tipo: "quarto", x: 0.8, y: 3, largura: 2.2, profundidade: 20 }),
    ],
    LOTE_10x25,
    PARAMS,
  );
  assert.ok(violacoes.length >= 3);
  for (const v of violacoes) {
    assert.ok(
      /Art\.|NBR|Neufert|Ficha|escritório|implantação/.test(v),
      `violação sem fonte: "${v}"`,
    );
  }
});

test("v3: implantações variadas — existe variante encostada na divisa", () => {
  const r = gerar6(LOTE_12x30);
  assert.ok(!("erro" in r));
  if ("erro" in r) return;
  const encostadas = r.variantes.filter(
    (v) => v.implantacao.recuoEsquerda === 0 || v.implantacao.recuoDireita === 0,
  );
  assert.ok(encostadas.length > 0, "nenhuma variante encostada (Art. 13 §1º)");
});

test("v3: acessibilidade opcional reprova giro apertado só com a flag", () => {
  const banho = comodo({ id: "banho-1", tipo: "banho", x: 3, y: 8, largura: 2.6, profundidade: 1.2 });
  const sem = validar([banho], LOTE_10x25, PARAMS, undefined, [], undefined, {});
  assert.ok(!sem.some((v) => v.includes("NBR 9050")));
  const com = validar([banho], LOTE_10x25, PARAMS, undefined, [], undefined, {
    casaAcessivel: true,
  });
  assert.ok(com.some((v) => v.includes("NBR 9050")));
});

/* ---------------- F2 anteriores que continuam valendo ------------------ */

test("F2: área certa com largura insuficiente reprova (mobiliário)", () => {
  const violacoes = validar(
    [comodo({ id: "quarto-1", tipo: "quarto", x: 2, y: 5, largura: 2.2, profundidade: 4.5 })],
    LOTE_10x25,
    PARAMS,
  );
  assert.ok(violacoes.some((v) => v.includes("estreito demais para o mobiliário")));
});

test("F2: arco de porta colidindo reprova", () => {
  const sala = comodo({ id: "sala-1", tipo: "sala", x: 2, y: 5, largura: 5, profundidade: 5 });
  const portas: Porta[] = [
    { x: 2.5, y: 5, comprimento: 0.9, orientacao: "h", lado: 1 },
    { x: 3.0, y: 5, comprimento: 0.9, orientacao: "h", lado: 1 },
  ];
  const violacoes = validar([sala], LOTE_10x25, PARAMS, undefined, portas);
  assert.ok(violacoes.some((v) => v.includes("se chocam ao abrir")));
});

test("F2: vão de iluminação insuficiente reprova", () => {
  const quarto = comodo({ id: "quarto-1", tipo: "quarto", x: 4, y: 8, largura: 4, profundidade: 4 });
  const vizinhos = [
    comodo({ id: "sala-1", tipo: "sala", x: 4, y: 4, largura: 4, profundidade: 4 }),
    comodo({ id: "quarto-2", tipo: "quarto", x: 0.5, y: 8, largura: 3.5, profundidade: 4 }),
    comodo({ id: "quarto-3", tipo: "quarto", x: 4, y: 12, largura: 4, profundidade: 4 }),
    comodo({ id: "banho-1", tipo: "banho", x: 8, y: 8, largura: 1.5, profundidade: 3 }),
  ];
  const violacoes = validar([quarto, ...vizinhos], LOTE_10x25, PARAMS);
  assert.ok(
    violacoes.some((v) => v.includes("quarto-1") && v.includes("iluminação")),
    violacoes.join("; "),
  );
});

test("F2: mudar o config muda o resultado sem tocar em código", () => {
  const duros: ParametrosSolver = JSON.parse(JSON.stringify(PARAMS));
  duros.mobiliario.porTipo.quarto!.larguraMinima = 5;
  duros.mobiliario.porTipo.quarto!.retangulos = [[5, 5]];
  const r = gerarEstudo(LOTE_10x25, PROGRAMA_ACEITE, 6, duros, PESOS_PADROES);
  assert.ok("erro" in r && r.erro === "SEM_VARIANTE_VALIDA");
});

test("F2: ligar os padrões muda o ranking das variantes", () => {
  const sem = gerar6(LOTE_12x30, PADROES_ZERO);
  const com = gerar6(LOTE_12x30);
  assert.ok(!("erro" in sem) && !("erro" in com));
  if ("erro" in sem || "erro" in com) return;
  const a = sem.variantes.map((v) => v.seed).join(",");
  const b = com.variantes.map((v) => v.seed).join(",");
  assert.notEqual(a, b, `ranking não mudou (${a})`);
});

test("F2: corredor esbelto demais é penalizado no padrão 132", () => {
  const base = comodo({ id: "sala-1", tipo: "sala", x: 2, y: 5, largura: 4, profundidade: 4 });
  const curto = comodo({ id: "circulacao-1", tipo: "circulacao", x: 2, y: 9, largura: 1.2, profundidade: 3.5 });
  const longo = comodo({ id: "circulacao-1", tipo: "circulacao", x: 2, y: 9, largura: 1.1, profundidade: 9 });
  const a = pontuarPadroes([base, curto], [], LOTE_10x25, PARAMS);
  const b = pontuarPadroes([base, longo], [], LOTE_10x25, PARAMS);
  assert.ok(a.passagensCurtas > 0.8);
  assert.equal(b.passagensCurtas, 0);
});

test("v2: calibração — o que as favoritas têm mais pesa mais", () => {
  const comp = (p: Partial<Componentes>): Componentes => ({
    hidraulica: 0.5,
    areaAlvo: 0.5,
    proximidade: 0.5,
    insolacao: 0.5,
    proporcao: 0.5,
    compacidade: 0.5,
    ...p,
  });
  const amostras = [
    ...Array.from({ length: 4 }, () => ({
      comp: comp({ hidraulica: 1, compacidade: 0.2 }),
      favorita: true,
    })),
    ...Array.from({ length: 8 }, () => ({
      comp: comp({ hidraulica: 0.3, compacidade: 0.9 }),
      favorita: false,
    })),
  ];
  const pesos = calibrarPesos(amostras);
  assert.ok(pesos.hidraulica > PESOS_BASE.hidraulica);
  assert.ok(pesos.compacidade < PESOS_BASE.compacidade);
});
