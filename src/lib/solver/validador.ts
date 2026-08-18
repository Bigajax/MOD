/* =====================================================================
   Validador de hard constraints (v3 — conformidade legal). Toda
   reprovação cita o artigo ou a fonte que a causou (aceite 8).

   Regra central (2B): uma face admite abertura se, e somente se,
   (1) não coincide com divisa do lote — Art. 88 §1º — e
   (2) dista >= 1,50 m da divisa paralela — Art. 88 caput.
   A frente é alinhamento predial (rua), não divisa.

   Permanência prolongada (Art. 77, I) precisa de face com abertura
   permitida (Art. 86). Transitória (Art. 77, II) NÃO — Art. 87 admite
   ventilação por recinto adjacente: banho, lavabo e serviço podem ser
   internos, sem gastar fachada.
   ===================================================================== */

import type {
  Comodo,
  Lote,
  OpcoesGeracao,
  ParametrosSolver,
  Porta,
  Retangulo,
  TipoComodo,
} from "./tipos.ts";
import {
  LARGURA_CIRCULACAO,
  PERMANENCIA,
  PROPORCAO_MAXIMA,
  ROTULO_COMODO,
  VAO_PORTA,
} from "./tipos.ts";
import {
  envolvente,
  facesDoComodo,
  invade,
  paredeComum,
  proporcao,
  sobreposicao,
  type FaceComodo,
} from "./geometria.ts";

const EPS = 0.03;

function nome(c: Comodo) {
  return `${ROTULO_COMODO[c.tipo]} (${c.id})`;
}

/* Distância da face à divisa paralela, na direção para fora do cômodo.
   Frente devolve Infinity: alinhamento não é divisa. */
function distanciaDivisa(f: FaceComodo, lote: Lote): number {
  if (f.ori === "v") {
    // face vertical olha para esquerda ou direita
    return f.lado === "esquerda" ? f.fixo : lote.largura - f.fixo;
  }
  if (f.lado === "fundos") return lote.profundidade - f.fixo;
  return Infinity; // frente = alinhamento predial
}

/** A face está livre E pode receber abertura (Art. 88). */
export function faceComAberturaPermitida(
  f: FaceComodo,
  lote: Lote,
  params: ParametrosSolver,
): boolean {
  if (f.livre < 0.6) return false;
  return (
    distanciaDivisa(f, lote) >=
    params.implantacao.distanciaMinimaAberturaDivisa - EPS
  );
}

/** Retângulo varrido pela folha da porta ao abrir (quadrado folha×folha). */
export function retanguloGiro(p: Porta): Retangulo {
  if (p.orientacao === "h") {
    return {
      x: p.x,
      y: p.lado > 0 ? p.y : p.y - p.comprimento,
      largura: p.comprimento,
      profundidade: p.comprimento,
    };
  }
  return {
    x: p.lado > 0 ? p.x : p.x - p.comprimento,
    y: p.y,
    largura: p.comprimento,
    profundidade: p.comprimento,
  };
}

function dentroDeAlgumComodo(r: Retangulo, comodos: Comodo[]): boolean {
  return comodos.some(
    (c) =>
      r.x >= c.x - EPS &&
      r.y >= c.y - EPS &&
      r.x + r.largura <= c.x + c.largura + EPS &&
      r.y + r.profundidade <= c.y + c.profundidade + EPS,
  );
}

function sobreposicaoRet(a: Retangulo, b: Retangulo): number {
  return (
    sobreposicao(a.x, a.x + a.largura, b.x, b.x + b.largura) *
    sobreposicao(a.y, a.y + a.profundidade, b.y, b.y + b.profundidade)
  );
}

export function validar(
  comodos: Comodo[],
  lote: Lote,
  params: ParametrosSolver,
  patio?: Retangulo,
  portas: Porta[] = [],
  vaga?: Retangulo,
  opcoes: OpcoesGeracao = {},
): string[] {
  const violacoes: string[] = [];
  if (comodos.length === 0) return ["planta sem cômodos"];

  const caixa = envolvente(comodos);
  const areaLote = lote.largura * lote.profundidade;

  for (const c of comodos) {
    // proporção — a circulação é corredor por definição, fica de fora
    if (c.tipo !== "circulacao") {
      const p = proporcao(c);
      if (p > PROPORCAO_MAXIMA + 0.01) {
        violacoes.push(
          `${nome(c)} muito alongado: 1:${p.toFixed(1)} (limite 1:2,5 — padrão do escritório)`,
        );
      }
    }

    // 2E — teste de mobiliário (NBR 15575 Anexo G + Neufert; o Código
    // remete às NBR — Art. 8º e Art. 80)
    const exig = params.mobiliario.porTipo[c.tipo];
    const menor = Math.min(c.largura, c.profundidade);
    const maior = Math.max(c.largura, c.profundidade);
    if (exig) {
      if (menor < exig.larguraMinima - 0.01) {
        violacoes.push(
          `${nome(c)} estreito demais para o mobiliário: ${menor.toFixed(2)} m < ${exig.larguraMinima.toFixed(2)} m (Neufert/NBR 15575 via Art. 8º)`,
        );
      } else if (exig.retangulos) {
        const cabe = exig.retangulos.some(
          ([ra, rb]) =>
            (ra <= maior + 0.01 && rb <= menor + 0.01) ||
            (rb <= maior + 0.01 && ra <= menor + 0.01),
        );
        if (!cabe) {
          const [ra, rb] = exig.retangulos[0];
          violacoes.push(
            `${nome(c)} não acomoda o mobiliário essencial ${ra.toFixed(1)} × ${rb.toFixed(1)} m (Neufert/NBR 15575 via Art. 8º)`,
          );
        }
      }
    }

    if (c.tipo === "circulacao" && menor < LARGURA_CIRCULACAO - 0.01) {
      violacoes.push(
        `circulação com ${menor.toFixed(2)} m (mínimo 1,10 m — padrão do escritório)`,
      );
    }

    // 2B — permanência prolongada precisa de face com abertura permitida
    // (Art. 86); transitória NÃO precisa (Art. 87).
    if (PERMANENCIA.includes(c.tipo)) {
      const faces = facesDoComodo(c, comodos);
      const permitidas = faces.filter((f) =>
        faceComAberturaPermitida(f, lote, params),
      );
      if (permitidas.length === 0) {
        violacoes.push(
          `${nome(c)} sem face com abertura permitida (Art. 86; Art. 88 §1º e caput)`,
        );
      } else {
        // 2F — vão de iluminação: fração do piso (padrão do escritório —
        // Art. 86 §1º remete a desempenho em lux nas NBR)
        const extensao = permitidas.reduce((s, f) => s + f.livre, 0);
        const areaVao = extensao * params.iluminacao.alturaUtilJanela;
        const exigido = c.area * params.iluminacao.fracaoPisoIluminacao;
        if (areaVao + 0.01 < exigido) {
          violacoes.push(
            `${nome(c)} com vão de iluminação ${areaVao.toFixed(1)} m² < ${exigido.toFixed(1)} m² (fração ${params.iluminacao.fracaoPisoIluminacao} — padrão do escritório; Art. 86 §1º)`,
          );
        }
        const temH = permitidas.some((f) => f.ori === "h");
        const temV = permitidas.some((f) => f.ori === "v");
        const max = params.iluminacao.profundidadeMaxIluminavel;
        const alcanca =
          (temH && c.profundidade <= max + 0.01) ||
          (temV && c.largura <= max + 0.01);
        if (!alcanca) {
          violacoes.push(
            `${nome(c)} fundo demais para a janela (limite ${max.toFixed(1)} m — padrão do escritório)`,
          );
        }
      }
    }

    // 2G — acessibilidade opcional (NBR 9050; Art. 100 não obriga
    // unifamiliar — só entra com a flag)
    if (opcoes.casaAcessivel) {
      const a = params.acessibilidade;
      if (a.ambientesPrincipais.includes(c.tipo) && menor < a.circuloGiro - 0.01) {
        violacoes.push(
          `${nome(c)} não inscreve o círculo de giro de ${a.circuloGiro.toFixed(2)} m (NBR 9050 — flag casaAcessivel)`,
        );
      }
      if (c.tipo === "circulacao" && menor < a.larguraCirculacaoMinima - 0.01) {
        violacoes.push(
          `circulação abaixo de ${a.larguraCirculacaoMinima} m (NBR 9050 — flag casaAcessivel)`,
        );
      }
    }
  }

  if (opcoes.casaAcessivel) {
    for (const p of portas) {
      if (p.comprimento < params.acessibilidade.vaoLivrePortaMinimo - 0.01) {
        violacoes.push(
          `porta com vão de ${p.comprimento.toFixed(2)} m < ${params.acessibilidade.vaoLivrePortaMinimo} m (NBR 9050 — flag casaAcessivel)`,
        );
      }
    }
  }

  // pátio interno de iluminação (Art. 89 §1º): área >= 3,00 m² e
  // círculo inscrito >= 1,50 m
  if (patio) {
    const menorLado = Math.min(patio.largura, patio.profundidade);
    if (patio.largura * patio.profundidade < 3.0 - 0.05 || menorLado < 1.5 - 0.01) {
      violacoes.push(
        "pátio abaixo de 3,00 m² ou sem círculo de 1,50 m (Art. 89 §1º)",
      );
    }
  }

  // cômodos não podem se invadir
  for (let i = 0; i < comodos.length; i++) {
    for (let j = i + 1; j < comodos.length; j++) {
      if (invade(comodos[i], comodos[j])) {
        violacoes.push(`${nome(comodos[i])} e ${nome(comodos[j])} se sobrepõem`);
      }
    }
  }

  // acesso: todo cômodo alcança a circulação ou a sala (nenhuma ilha)
  const acessos: TipoComodo[] = ["circulacao", "sala"];
  const portais = comodos.filter((c) => acessos.includes(c.tipo));
  for (const c of comodos) {
    if (acessos.includes(c.tipo)) continue;
    const alcanca = portais.some((p) => paredeComum(c, p) >= VAO_PORTA - 0.01);
    if (!alcanca) {
      violacoes.push(
        `${nome(c)} sem acesso pela circulação ou pela sala (Art. 80 — compatibilidade de uso)`,
      );
    }
  }

  const circ = comodos.filter((c) => c.tipo === "circulacao");
  const salas = comodos.filter((c) => c.tipo === "sala");
  if (circ.length > 0 && salas.length > 0) {
    const liga = circ.some((ci) =>
      salas.some((s) => paredeComum(ci, s) >= VAO_PORTA - 0.01),
    );
    if (!liga) violacoes.push("circulação não encosta na sala");
  }

  // 2E — arcos de porta: giro dentro de um cômodo, sem cruzar outro giro
  const giros = portas.map((p) => retanguloGiro(p));
  giros.forEach((g, i) => {
    if (!dentroDeAlgumComodo(g, comodos)) {
      violacoes.push(
        `porta ${i + 1} bate na parede ao abrir (teste de mobiliário — Neufert)`,
      );
    }
  });
  for (let i = 0; i < giros.length; i++) {
    for (let j = i + 1; j < giros.length; j++) {
      if (sobreposicaoRet(giros[i], giros[j]) > 0.02) {
        violacoes.push(
          `portas ${i + 1} e ${j + 1} se chocam ao abrir (teste de mobiliário — Neufert)`,
        );
      }
    }
  }

  // 2C — implantação: recuo lateral discreto (Art. 13 §1º)
  const recuoEsq = caixa.x0;
  const recuoDir = lote.largura - caixa.x1;
  const recuoMinimo = Math.max(...params.implantacao.recuosLateraisPermitidos);
  for (const [nomeLado, valor] of [
    ["esquerdo", recuoEsq],
    ["direito", recuoDir],
  ] as const) {
    const permitido = valor < EPS || valor >= recuoMinimo - EPS;
    if (!permitido) {
      violacoes.push(
        `recuo lateral ${nomeLado} de ${valor.toFixed(2)} m — só nulo ou >= ${recuoMinimo.toFixed(2)} m (Art. 13 §1º)`,
      );
    }
  }

  // recuo frontal da Ficha Técnica (Art. 110 / LUOS)
  if (caixa.y0 < lote.ficha.recuoFrontal - EPS) {
    violacoes.push(
      `construção invade o recuo frontal de ${lote.ficha.recuoFrontal.toFixed(2)} m (Ficha Técnica / LUOS)`,
    );
  }

  // quintal mínimo nos fundos (padrão do escritório, spec 2C)
  const quintal = lote.profundidade - caixa.y1;
  if (quintal < params.implantacao.quintalMinimo - EPS) {
    violacoes.push(
      `quintal de ${quintal.toFixed(2)} m < ${params.implantacao.quintalMinimo.toFixed(2)} m (padrão do escritório)`,
    );
  }

  // proporção da projeção (diretriz de implantação, spec 2C)
  const propProj = caixa.profundidade / caixa.largura;
  if (
    propProj < params.implantacao.proporcaoProfundidadeMin - 0.01 ||
    propProj > params.implantacao.proporcaoProfundidadeMax + 0.01
  ) {
    violacoes.push(
      `projeção com profundidade ${propProj.toFixed(2)}× a largura — fora de ${params.implantacao.proporcaoProfundidadeMin}–${params.implantacao.proporcaoProfundidadeMax}× (diretriz de implantação)`,
    );
  }

  // taxa de ocupação (Ficha Técnica; área computável — Art. 83)
  const areaPatio = patio ? patio.largura * patio.profundidade : 0;
  const projecao = caixa.largura * caixa.profundidade - areaPatio;
  if (projecao > lote.ficha.taxaOcupacaoMax * areaLote + 0.05) {
    violacoes.push(
      `projeção de ${projecao.toFixed(1)} m² acima da taxa de ocupação de ${(lote.ficha.taxaOcupacaoMax * 100).toFixed(0)}% (Ficha Técnica; Art. 83)`,
    );
  }

  // coeficiente de aproveitamento (Ficha Técnica) — térreo: projeção
  if (projecao > lote.ficha.coeficienteAproveitamento * areaLote + 0.05) {
    violacoes.push(
      `área construída acima do coeficiente de aproveitamento ${lote.ficha.coeficienteAproveitamento} (Ficha Técnica)`,
    );
  }

  // 2D — vaga de auto (Art. 23)
  if (params.vaga.obrigatoria) {
    if (!vaga) {
      violacoes.push("variante sem vaga de auto (Art. 23)");
    } else {
      if (
        vaga.largura < params.vaga.largura - EPS ||
        vaga.profundidade < params.vaga.comprimento - EPS
      ) {
        violacoes.push(
          `vaga de ${vaga.largura.toFixed(2)} × ${vaga.profundidade.toFixed(2)} m abaixo de ${params.vaga.largura} × ${params.vaga.comprimento} m (NRM E-10003 + padrão do escritório, Art. 1º §1º)`,
        );
      }
      if (vaga.x < -EPS || vaga.x + vaga.largura > lote.largura + EPS || vaga.y < -EPS) {
        violacoes.push("vaga fora dos limites do lote (Art. 35 §2º)");
      }
      if (!params.vaga.vagaPodeOcuparRecuoFrontal && vaga.y < lote.ficha.recuoFrontal - EPS) {
        violacoes.push(
          "vaga no recuo frontal com a flag desativada (Art. 25 — confirmar prática da prefeitura)",
        );
      }
      const casaRect: Retangulo = {
        x: caixa.x0,
        y: caixa.y0,
        largura: caixa.largura,
        profundidade: caixa.profundidade,
      };
      if (sobreposicaoRet(vaga, casaRect) > 0.02) {
        violacoes.push("vaga sobrepõe a projeção da casa (Art. 23)");
      }
    }
  }

  // permeabilidade: max(piso municipal 10% — Art. 17, valor da Ficha)
  const exigidaPerm = Math.max(
    params.permeabilidade.pisoMunicipal,
    lote.ficha.permeabilidadeMinima,
  );
  const areaVaga =
    vaga && params.vaga.impermeavel ? vaga.largura * vaga.profundidade : 0;
  const permeavel = areaLote - projecao - areaVaga;
  if (permeavel + 0.05 < exigidaPerm * areaLote) {
    violacoes.push(
      `área permeável de ${permeavel.toFixed(1)} m² < ${(exigidaPerm * 100).toFixed(0)}% do lote (Art. 17 + Ficha Técnica)`,
    );
  }

  return violacoes;
}
