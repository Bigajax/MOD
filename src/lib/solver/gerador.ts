/* =====================================================================
   Gerador de uma variante de partido (uma seed → uma planta).

   BSP em dois níveis sobre o envelope edificável:
   1º corte separa a zona social (frente) do bloco de fundos;
   2º corte organiza os fundos ao redor da circulação de 1,10 m.
   Duas famílias de partido:
   A — corredor perpendicular à rua, cômodos dos dois lados (lote fundo);
   B — corredor paralelo à rua, cômodos enfileirados atrás (lote largo).
   Toda escolha e todo jitter (±8%) saem da seed — nada de Math.random.
   O gerador só propõe; quem aprova é o validador.
   ===================================================================== */

import type {
  Comodo,
  Implantacao,
  ItemPrograma,
  Lote,
  OpcoesGeracao,
  ParametrosSolver,
  Porta,
  RecuoLateral,
  Retangulo,
  TipoComodo,
} from "./tipos.ts";
import { AREA_MINIMA, MOLHADO, VAO_PORTA, r1, r5 } from "./tipos.ts";
import type { Rng } from "./rng.ts";
import { embaralhar, entre, escolha, jitter, mulberry32 } from "./rng.ts";
import { envolvente, sobreposicao, temFaceLivre } from "./geometria.ts";

const CORR = 1.1;

type Pedido = { tipo: TipoComodo; alvo: number; min: number };

export type PlantaBruta = {
  comodos: Comodo[];
  portas: Porta[];
  patio?: Retangulo;
  vaga: Retangulo;
  implantacao: Implantacao;
  areaConstruida: number;
  /** profundidade do corte social, para o score medir distância dos quartos */
  corteSocial: number;
};

function expandir(programa: ItemPrograma[]): Pedido[] {
  const pedidos: Pedido[] = [];
  for (const item of programa) {
    for (let i = 0; i < item.quantidade; i++) {
      pedidos.push({
        tipo: item.tipo,
        alvo: Math.max(item.areaAlvo, item.areaMin, 1),
        min: Math.max(item.areaMin, AREA_MINIMA[item.tipo] ?? 0),
      });
    }
  }
  return pedidos;
}

/* Reparte `total` metros entre células proporcionalmente ao alvo, com
   jitter da seed e respeito aos limites de cada célula. É o coração do
   corte BSP: um corte reto por célula, posição proporcional + ruído. */
function repartir(
  rng: Rng,
  total: number,
  itens: { alvo: number; minTam: number; maxTam: number }[],
): number[] | null {
  const somaMin = itens.reduce((s, i) => s + i.minTam, 0);
  if (somaMin > total + 0.01) return null;

  const brutos = itens.map((i) => i.alvo * jitter(rng, 0.08));
  const somaBruta = brutos.reduce((s, b) => s + b, 0);
  let tams = brutos.map((b) => (b / somaBruta) * total);

  for (let passo = 0; passo < 4; passo++) {
    tams = tams.map((t, i) =>
      Math.min(itens[i].maxTam, Math.max(itens[i].minTam, t)),
    );
    const sobra = total - tams.reduce((s, t) => s + t, 0);
    if (Math.abs(sobra) < 0.01) break;
    const livres = tams
      .map((t, i) => i)
      .filter((i) =>
        sobra > 0 ? tams[i] < itens[i].maxTam - 0.01 : tams[i] > itens[i].minTam + 0.01,
      );
    if (livres.length === 0) return null;
    const base = livres.reduce((s, i) => s + brutos[i], 0);
    for (const i of livres) tams[i] += sobra * (brutos[i] / base);
  }
  return tams;
}

/* Profundidade mínima de uma célula de largura `faixa` para o cômodo
   acomodar seu retângulo de mobiliário (2A). null = a faixa é estreita
   demais para o tipo — a variante não fecha neste partido. */
function minCelula(
  tipo: TipoComodo,
  faixa: number,
  params: ParametrosSolver,
): number | null {
  const exig = params.mobiliario.porTipo[tipo];
  if (!exig) return 0.9;
  if (faixa < exig.larguraMinima - 0.01) return null;
  let req = exig.larguraMinima;
  if (exig.retangulos) {
    let melhor = Infinity;
    for (const [a, b] of exig.retangulos) {
      if (a <= faixa + 0.01) melhor = Math.min(melhor, b);
      if (b <= faixa + 0.01) melhor = Math.min(melhor, a);
    }
    if (!Number.isFinite(melhor)) return null;
    req = Math.max(req, melhor);
  }
  return Math.max(0.9, req);
}

/* Largura da folha de porta conforme o cômodo servido (config). Com a
   flag de acessibilidade, nenhuma folha desce de 0,80 (NBR 9050). */
function folhaPara(
  tipo: TipoComodo,
  params: ParametrosSolver,
  opcoes: OpcoesGeracao,
): number {
  const base =
    tipo === "banho" || tipo === "lavabo"
      ? params.portas.folhaPorTipo[tipo]
      : params.portas.folhaPorTipo.padrao;
  return opcoes.casaAcessivel
    ? Math.max(base, params.acessibilidade.vaoLivrePortaMinimo)
    : base;
}

/* Empilha células num trecho [inicio, fim] de um eixo, na malha de 5 cm.
   A última célula fecha exatamente no fim do trecho. */
function empilhar(inicio: number, fim: number, tams: number[]): number[] {
  const cortes: number[] = [inicio];
  let pos = inicio;
  for (let i = 0; i < tams.length - 1; i++) {
    pos = r5(pos + tams[i]);
    cortes.push(pos);
  }
  cortes.push(fim);
  return cortes; // n+1 cortes para n células
}

export function gerarVariante(
  lote: Lote,
  programa: ItemPrograma[],
  seed: number,
  params: ParametrosSolver,
  opcoes: OpcoesGeracao = {},
): PlantaBruta | null {
  const rng = mulberry32(seed);
  const ficha = lote.ficha;
  const quintal = params.implantacao.quintalMinimo;

  // vaga obrigatória (Art. 23) descoberta na frente; a casa alinha atrás
  // dela quando a vaga entra no recuo (Art. 25, red. LC 1.152/2019) —
  // simplificação registrada: sem recorte de fachada nesta versão.
  const frenteCasa = r5(
    params.vaga.vagaPodeOcuparRecuoFrontal
      ? Math.max(ficha.recuoFrontal, params.vaga.comprimento)
      : ficha.recuoFrontal + params.vaga.comprimento,
  );
  const profDisp = r5(lote.profundidade - frenteCasa - quintal);
  if (profDisp < 5) return null;

  const pedidos = expandir(programa);
  if (pedidos.length === 0) return null;
  const alvoTotal = pedidos.reduce((s, p) => s + p.alvo, 0);
  const areaMaxTaxa =
    ficha.taxaOcupacaoMax * lote.largura * lote.profundidade;
  const areaFoot = alvoTotal * (1.06 + rng() * 0.12);

  const social = pedidos.filter((p) =>
    (["sala", "cozinha", "varanda"] as TipoComodo[]).includes(p.tipo),
  );
  const fundos = pedidos.filter((p) => !social.includes(p));
  if (social.length === 0) return null;

  // a casa precisa de fundo para empilhar ~metade dos cômodos íntimos em
  // células que acomodem o mobiliário (>= 2,4 m) atrás da zona social
  const hBnecessario = Math.ceil(fundos.length / 2) * 2.9;
  const dPisoPrograma = fundos.length > 0 ? 2.8 + hBnecessario : 5;

  // ---- implantação discreta (Art. 13 §1º): recuo nulo ou 1,50 m -------
  const R = Math.max(
    ...params.implantacao.recuosLateraisPermitidos,
  ) as RecuoLateral;
  const combos: Implantacao[] = [
    { recuoEsquerda: 0, recuoDireita: R },
    { recuoEsquerda: R, recuoDireita: 0 },
    { recuoEsquerda: 0, recuoDireita: 0 },
    { recuoEsquerda: R, recuoDireita: R },
  ];
  const pMin = params.implantacao.proporcaoProfundidadeMin;
  const pMax = params.implantacao.proporcaoProfundidadeMax;
  const viaveis = combos.filter((cb) => {
    const w = lote.largura - cb.recuoEsquerda - cb.recuoDireita;
    if (w < 4.2) return false;
    const dMin = pMin * w;
    if (dMin > profDisp + 0.01) return false;
    if (w * dMin > areaMaxTaxa + 0.05) return false;
    return true;
  });
  if (viaveis.length === 0) return null;
  const impl = escolha(rng, viaveis);
  const W = r5(lote.largura - impl.recuoEsquerda - impl.recuoDireita);

  const dTeto = Math.min(pMax * W, profDisp, areaMaxTaxa / W);
  const dPiso = Math.max(pMin * W, 5, dPisoPrograma);
  let D = r5(Math.min(dTeto, Math.max(dPiso, areaFoot / W)));
  while (W * D > areaMaxTaxa + 0.05) D = r5(D - 0.05);
  if (D < dPiso - 0.01) return null;

  const envX = impl.recuoEsquerda;
  const envY = frenteCasa;
  const envD = profDisp;
  const offX = 0;

  // lado cego = colado na divisa: nenhuma abertura (Art. 88 §1º)
  const cegoEsq = impl.recuoEsquerda < R;
  const cegoDir = impl.recuoDireita < R;

  // ---- corte primário: social na frente, resto atrás -------------------
  // O corte social cede espaço para a pilha de fundos (dPiso garantiu D).
  const alvoSocial = social.reduce((s, p) => s + p.alvo, 0);
  const dsTeto = Math.min(D - 4.2, D - hBnecessario);
  const ds =
    fundos.length === 0
      ? D
      : r5(
          Math.min(
            dsTeto,
            Math.max(2.8, D * (alvoSocial / alvoTotal) * jitter(rng, 0.08)),
          ),
        );
  if (fundos.length > 0 && (ds < 2.8 || dsTeto < 2.8)) return null;
  const hB = r5(D - ds);

  // ---- família do partido ---------------------------------------------
  const famA = fundos.length >= 2 && W - CORR >= 4.6 && hB >= 2.6;
  const famB =
    fundos.length >= 1 && W / fundos.length >= 2.3 && hB - CORR >= 2.3;
  const familias: ("A" | "B")[] = [];
  if (famA) familias.push("A");
  if (famB) familias.push("B");
  if (fundos.length > 0 && familias.length === 0) return null;
  const familia = fundos.length === 0 ? null : escolha(rng, familias);

  /* Lado molhado: onde ficam cozinha, banhos e serviço. Se um lado é
     cego (colado na divisa), os molhados vão para ele — transitória não
     precisa de fachada (Art. 87) e a fachada sobra para os quartos.
     Senão, o norte informado manda os quartos para o sol da manhã. */
  let ladoMolhado: "esquerda" | "direita";
  if (cegoEsq !== cegoDir) {
    ladoMolhado = cegoEsq ? "esquerda" : "direita";
  } else {
    ladoMolhado = escolha(rng, ["esquerda", "direita"] as const);
    if (lote.orientacaoNorte && rng() < 0.75) {
      ladoMolhado =
        lote.orientacaoNorte === "frente" || lote.orientacaoNorte === "direita"
          ? "esquerda"
          : "direita";
    }
  }
  const molhadoCego =
    (ladoMolhado === "esquerda" && cegoEsq) ||
    (ladoMolhado === "direita" && cegoDir);
  const comodos: Comodo[] = [];
  const portas: Porta[] = [];
  let patio: Retangulo | undefined;
  const contador: Partial<Record<TipoComodo, number>> = {};

  function abrir(
    tipo: TipoComodo,
    x: number,
    y: number,
    l: number,
    p: number,
  ): Comodo {
    contador[tipo] = (contador[tipo] ?? 0) + 1;
    const c: Comodo = {
      id: `${tipo}-${contador[tipo]}`,
      tipo,
      x: r5(x),
      y: r5(y),
      largura: r5(l),
      profundidade: r5(p),
      area: 0,
      faceExterna: false,
    };
    c.area = r1(c.largura * c.profundidade);
    comodos.push(c);
    return c;
  }

  // ---- zona social: células verticais na faixa da frente ---------------
  // cozinha encosta no lado molhado (prumada), varanda no canto oposto,
  // sala no meio — de onde ela alcança o corredor.
  const ordemSocial = social.slice().sort((a, b) => {
    const peso = (p: Pedido) =>
      p.tipo === "cozinha" ? 0 : p.tipo === "sala" ? 1 : 2;
    return peso(a) - peso(b);
  });
  if (ladoMolhado === "direita") ordemSocial.reverse();

  const reqsSocial = ordemSocial.map((p) => minCelula(p.tipo, ds, params));
  if (reqsSocial.some((r) => r === null)) return null;
  const tamsSocial = repartir(
    rng,
    W,
    ordemSocial.map((p, k) => ({
      alvo: p.alvo,
      minTam: Math.max(ds / 2.45, p.min / ds, reqsSocial[k]!),
      maxTam: ds * 2.5,
    })),
  );
  if (!tamsSocial) return null;
  const cortesSocial = empilhar(0, W, tamsSocial);
  const celulasSociais = ordemSocial.map((p, i) =>
    abrir(p.tipo, cortesSocial[i], 0, cortesSocial[i + 1] - cortesSocial[i], ds),
  );
  const sala = celulasSociais.find((c) => c.tipo === "sala");
  if (!sala) return null;

  // ---- fundos ----------------------------------------------------------
  const molhados = fundos.filter((p) => MOLHADO.includes(p.tipo));
  const secos = fundos.filter((p) => !MOLHADO.includes(p.tipo));

  if (familia === "A") {
    // corredor perpendicular à rua; molhados na frente do lado molhado
    const wRooms = W - CORR;
    const grupoM = embaralhar(rng, molhados);
    const grupoS = embaralhar(rng, secos);
    const lados: { pedidos: Pedido[]; alvo: number }[] = [
      { pedidos: [...grupoM], alvo: grupoM.reduce((s, p) => s + p.alvo, 0) },
      { pedidos: [], alvo: 0 },
    ];
    // Faixa cega (colada na divisa): só a última célula, no fundo, tem
    // luz (Art. 88 §1º) — cabe no máximo UM cômodo de permanência nela,
    // sempre no fim da pilha. Vale para os dois lados.
    const cegoLado = [
      molhadoCego,
      ladoMolhado === "esquerda" ? cegoDir : cegoEsq,
    ];
    for (const p of grupoS) {
      const nSecos = (lado: { pedidos: Pedido[] }) =>
        lado.pedidos.filter((x) => !MOLHADO.includes(x.tipo)).length;
      const cabe0 = !cegoLado[0] || nSecos(lados[0]) < 1;
      const cabe1 = !cegoLado[1] || nSecos(lados[1]) < 1;
      let alvoDest: (typeof lados)[number];
      if (cabe0 && cabe1)
        alvoDest = lados[0].alvo <= lados[1].alvo ? lados[0] : lados[1];
      else if (cabe0) alvoDest = lados[0];
      else if (cabe1) alvoDest = lados[1];
      else return null; // duas divisas e permanências demais: partido inviável
      alvoDest.pedidos.push(p);
      alvoDest.alvo += p.alvo;
    }
    if (lados[0].pedidos.length === 0 || lados[1].pedidos.length === 0)
      return null;

    const fra = lados[0].alvo / (lados[0].alvo + lados[1].alvo);
    const wLadoM = r5(
      Math.min(wRooms - 2.3, Math.max(2.3, wRooms * fra * jitter(rng, 0.08))),
    );
    const wOutro = r5(wRooms - wLadoM);
    const xLadoM = ladoMolhado === "esquerda" ? 0 : W - wLadoM;
    const xCorr = ladoMolhado === "esquerda" ? wLadoM : wOutro;
    const xOutro = ladoMolhado === "esquerda" ? wLadoM + CORR : 0;

    // a sala precisa cobrir a boca do corredor
    if (
      sobreposicao(sala.x, sala.x + sala.largura, xCorr, xCorr + CORR) <
      VAO_PORTA + 0.05
    )
      return null;

    /* Família A′ — casa em L: em parte das seeds a casa cresce dp metros
       para os fundos só do lado molhado + corredor, e o canto que sobra
       no lado dos quartos vira pátio aberto. Quarto ganha vista e luz,
       a projeção desconta o recorte. */
    let dp = 0;
    if (rng() < 0.45 && W - wOutro > 0) {
      const dpMax = Math.min(
        3.4,
        r5(envD - D),
        r5(pMax * W - D),
        (areaMaxTaxa - W * D) / (W - wOutro),
      );
      if (dpMax >= 2.2) dp = r5(Math.min(dpMax, entre(rng, 2.2, 3.2)));
    }
    const dFundo = r5(D + dp);
    if (dp > 0) {
      patio = { x: xOutro, y: D, largura: wOutro, profundidade: dp };
    }

    const corredor = abrir("circulacao", xCorr, ds, CORR, r5(dFundo - ds));

    for (const [xLado, wLado, grupo, fim] of [
      [xLadoM, wLadoM, lados[0].pedidos, dFundo],
      [xOutro, wOutro, lados[1].pedidos, D],
    ] as const) {
      const reqs = grupo.map((p) => minCelula(p.tipo, wLado, params));
      if (reqs.some((r) => r === null)) return null;
      const tams = repartir(
        rng,
        r5(fim - ds),
        grupo.map((p, k) => ({
          alvo: p.alvo,
          minTam: Math.max(wLado / 2.45, p.min / wLado, reqs[k]!),
          maxTam: wLado * 2.5,
        })),
      );
      if (!tams) return null;
      const cortes = empilhar(ds, fim, tams);
      grupo.forEach((p, i) => {
        const c = abrir(p.tipo, xLado, cortes[i], wLado, cortes[i + 1] - cortes[i]);
        // porta para o corredor, centrada no trecho de parede comum
        const f = folhaPara(p.tipo, params, opcoes);
        const y0 = Math.max(c.y, corredor.y);
        const y1 = Math.min(c.y + c.profundidade, corredor.y + corredor.profundidade);
        portas.push({
          x: xLado < xCorr ? xCorr : xCorr + CORR,
          y: r5((y0 + y1) / 2 - f / 2),
          comprimento: f,
          orientacao: "v",
          lado: xLado < xCorr ? -1 : 1,
        });
      });
    }

    // boca do corredor abre para a sala
    portas.push({
      x: r5(xCorr + (CORR - 0.9) / 2),
      y: ds,
      comprimento: 0.9,
      orientacao: "h",
      lado: -1,
    });
  } else if (familia === "B") {
    // corredor paralelo à rua; cômodos enfileirados no fundo
    const hR = r5(hB - CORR);
    abrir("circulacao", 0, ds, W, CORR);

    const ordem = [...embaralhar(rng, molhados), ...embaralhar(rng, secos)];
    if (ladoMolhado === "direita") ordem.reverse();
    const reqsB = ordem.map((p) => minCelula(p.tipo, hR, params));
    if (reqsB.some((r) => r === null)) return null;
    const tams = repartir(
      rng,
      W,
      ordem.map((p, k) => ({
        alvo: p.alvo,
        minTam: Math.max(hR / 2.45, p.min / hR, reqsB[k]!),
        maxTam: hR * 2.5,
      })),
    );
    if (!tams) return null;
    const cortes = empilhar(0, W, tams);
    ordem.forEach((p, i) => {
      const c = abrir(p.tipo, cortes[i], ds + CORR, cortes[i + 1] - cortes[i], hR);
      const f = folhaPara(p.tipo, params, opcoes);
      portas.push({
        x: r5(c.x + c.largura / 2 - f / 2),
        y: ds + CORR,
        comprimento: f,
        orientacao: "h",
        lado: 1,
      });
    });

    // o corredor abre para a sala num vão centrado na sala
    portas.push({
      x: r5(sala.x + sala.largura / 2 - 0.45),
      y: ds,
      comprimento: 0.9,
      orientacao: "h",
      lado: -1,
    });
  }

  // ---- portas da zona social ------------------------------------------
  // entrada na parede da frente da sala
  const fEntrada = params.portas.folhaPorTipo.entrada;
  const folga = sala.largura - fEntrada - 0.6;
  portas.push({
    x: r5(sala.x + 0.3 + Math.max(0, entre(rng, 0, Math.max(0, folga)))),
    y: 0,
    comprimento: fEntrada,
    orientacao: "h",
    lado: 1,
  });
  // cada vizinho da sala na faixa social ganha um vão na parede comum
  for (const c of celulasSociais) {
    if (c === sala) continue;
    const f = folhaPara(c.tipo, params, opcoes);
    const encosta =
      Math.abs(c.x + c.largura - sala.x) < 0.01 ? c.x + c.largura : c.x;
    portas.push({
      x: encosta,
      y: r5(ds / 2 - f / 2),
      comprimento: f,
      orientacao: "v",
      lado: encosta === c.x ? 1 : -1,
    });
  }

  // ---- coordenadas absolutas e face externa ---------------------------
  for (const c of comodos) {
    c.x = r5(c.x + envX + offX);
    c.y = r5(c.y + envY);
  }
  for (const p of portas) {
    p.x = r5(p.x + envX + offX);
    p.y = r5(p.y + envY);
  }
  if (patio) {
    patio = {
      x: r5(patio.x + envX + offX),
      y: r5(patio.y + envY),
      largura: r5(patio.largura),
      profundidade: r5(patio.profundidade),
    };
  }
  const caixa = envolvente(comodos);
  for (const c of comodos) c.faceExterna = temFaceLivre(c, comodos);

  // vaga de auto descoberta na frente (Art. 23; Art. 25 red. 2019),
  // encostada no lado molhado — serviço e cozinha por perto
  const vaga: Retangulo = {
    x: r5(
      ladoMolhado === "esquerda" ? 0 : lote.largura - params.vaga.largura,
    ),
    y: params.vaga.vagaPodeOcuparRecuoFrontal ? 0 : r5(ficha.recuoFrontal),
    largura: params.vaga.largura,
    profundidade: params.vaga.comprimento,
  };

  return {
    comodos,
    portas,
    patio,
    vaga,
    implantacao: impl,
    areaConstruida: r1(
      caixa.largura * caixa.profundidade -
        (patio ? patio.largura * patio.profundidade : 0),
    ),
    corteSocial: r5(envY + ds),
  };
}
