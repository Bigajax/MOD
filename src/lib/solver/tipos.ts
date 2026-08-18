/* =====================================================================
   KISS — Gerador de estudo preliminar.
   Tipos do contrato entre gerador, validador, API e render.
   Unidade: metros, medidos no EIXO da parede. Origem (0,0) no canto
   frente-esquerda do lote; y cresce da rua para os fundos.
   ===================================================================== */

/** Para que lado do lote aponta o norte. */
export type OrientacaoNorte = "frente" | "fundos" | "esquerda" | "direita";

/* Os parâmetros urbanísticos NÃO estão no Código de Edificações: vêm da
   Lei de Uso e Ocupação, consultados lote a lote pela Ficha Técnica
   (Art. 110, validade de 90 dias). São INPUT — nunca default no código. */
export type FichaTecnica = {
  recuoFrontal: number;
  taxaOcupacaoMax: number; // 0..1
  coeficienteAproveitamento: number;
  permeabilidadeMinima: number; // 0..1 — o validador usa max(10% Art. 17, este)
  dataEmissao: string; // "YYYY-MM-DD"
};

export type Lote = {
  largura: number; // metros, testada
  profundidade: number; // metros
  ficha: FichaTecnica;
  /** opcional: com ela o solver favorece quartos a leste/norte */
  orientacaoNorte?: OrientacaoNorte;
};

/* Art. 13 §1º: recuo lateral facultado é nulo OU >= 1,50 m — valores
   intermediários são PROIBIDOS. Variável discreta, decidida por variante. */
export type RecuoLateral = 0 | 1.5;
export type Implantacao = {
  recuoEsquerda: RecuoLateral;
  recuoDireita: RecuoLateral;
};

export type OpcoesGeracao = {
  /** NBR 9050 como camada opcional (Art. 100 não obriga unifamiliar) */
  casaAcessivel?: boolean;
};

export type Retangulo = {
  x: number;
  y: number;
  largura: number;
  profundidade: number;
};

export type TipoComodo =
  | "sala"
  | "cozinha"
  | "quarto"
  | "suite"
  | "banho"
  | "lavabo"
  | "servico"
  | "circulacao"
  | "varanda";

export type ItemPrograma = {
  tipo: TipoComodo;
  quantidade: number;
  areaMin: number; // m²
  areaAlvo: number; // m²
};

export type Comodo = {
  id: string;
  tipo: TipoComodo;
  x: number;
  y: number;
  largura: number;
  profundidade: number; // eixo de parede, metros
  area: number;
  faceExterna: boolean;
};

/* Vão de porta: interrupção de 80–90 cm na parede, no eixo. `orientacao`
   diz se a parede interrompida é horizontal ou vertical; `lado` é a
   direção do giro da folha (normal à parede: +1 cresce no eixo, -1
   decresce) — a porta abre para dentro do cômodo servido. */
export type Porta = {
  x: number;
  y: number;
  comprimento: number;
  orientacao: "h" | "v";
  lado: 1 | -1;
};

export type Variante = {
  seed: number;
  comodos: Comodo[];
  portas: Porta[];
  /** recorte aberto na projeção (casa em L): quartos ganham vista e luz */
  patio?: Retangulo;
  /** vaga de auto obrigatória (Art. 23), descoberta no recuo frontal */
  vaga: Retangulo;
  implantacao: Implantacao;
  areaConstruida: number;
  score: number;
  violacoes: string[];
};

export type ErroGeracao =
  | {
      erro: "PROGRAMA_EXCEDE_ENVELOPE";
      areaNecessaria: number;
      areaDisponivel: number;
    }
  | { erro: "PROGRAMA_INVALIDO"; detalhe: string }
  | { erro: "SEM_VARIANTE_VALIDA" };

export type ResultadoGeracao = { variantes: Variante[] } | ErroGeracao;

/* ---------------------------------------------------------------------
   Limites do MVP (hard constraints da spec). Área mínima por tipo e
   dimensão mínima onde a norma pede largura, não área.
   --------------------------------------------------------------------- */
export const AREA_MINIMA: Partial<Record<TipoComodo, number>> = {
  quarto: 9,
  suite: 12,
  sala: 12,
  cozinha: 6,
  banho: 3,
};

export const LARGURA_MINIMA_BANHO = 1.5;
export const LARGURA_CIRCULACAO = 1.1;
export const PROPORCAO_MAXIMA = 2.5;
export const PAREDE_EXTERNA = 0.15;
export const PAREDE_INTERNA = 0.1;
export const VAO_PORTA = 0.8;

/* Permanência prolongada: precisa de face externa para janela. */
export const PERMANENCIA: TipoComodo[] = ["sala", "quarto", "suite", "cozinha"];

/* Cômodos com água: aproximá-los agrupa a prumada hidráulica. */
export const MOLHADO: TipoComodo[] = ["banho", "lavabo", "cozinha", "servico"];

export const ROTULO_COMODO: Record<TipoComodo, string> = {
  sala: "Sala",
  cozinha: "Cozinha",
  quarto: "Quarto",
  suite: "Suíte",
  banho: "Banho",
  lavabo: "Lavabo",
  servico: "Serviço",
  circulacao: "Circulação",
  varanda: "Varanda",
};

/* ---------------------------------------------------------------------
   Config externa (config/parametros-solver.json e config/score.json).
   O solver é puro: recebe tudo por parâmetro; quem carrega os JSON é o
   loader em src/lib/estudo/config.ts (Next) ou o teste (fs).
   --------------------------------------------------------------------- */
export type ExigenciaMobiliario = {
  larguraMinima: number;
  /** menor(es) retângulo(s) que acomodam o mobiliário essencial; null = sem exigência */
  retangulos: [number, number][] | null;
};

export type ParametrosSolver = {
  mobiliario: { porTipo: Partial<Record<TipoComodo, ExigenciaMobiliario>> };
  portas: {
    folhaPorTipo: { banho: number; lavabo: number; padrao: number; entrada: number };
  };
  iluminacao: {
    fracaoPisoIluminacao: number;
    fracaoVentilacaoDaIluminacao: number;
    alturaUtilJanela: number;
    profundidadeMaxIluminavel: number;
  };
  divisa: {
    faceNaDivisaContaParaIluminacao: boolean;
    ladosQueSaoDivisa: ("esquerda" | "direita" | "fundos" | "frente")[];
  };
  padroes: {
    passagens: {
      comprimentoBom: number;
      comprimentoRuim: number;
      esbeltezBoa: number;
      esbeltezRuim: number;
    };
    luzDoisLados: { patioConta: boolean; varandaConta: boolean };
    salaCoracao: { grauBom: number };
  };
  implantacao: {
    recuosLateraisPermitidos: number[];
    distanciaMinimaAberturaDivisa: number;
    quintalMinimo: number;
    proporcaoProfundidadeMin: number;
    proporcaoProfundidadeMax: number;
  };
  vaga: {
    obrigatoria: boolean;
    largura: number;
    comprimento: number;
    vagaPodeOcuparRecuoFrontal: boolean;
    impermeavel: boolean;
  };
  permeabilidade: { pisoMunicipal: number };
  acessibilidade: {
    circuloGiro: number;
    larguraCirculacaoMinima: number;
    vaoLivrePortaMinimo: number;
    ambientesPrincipais: TipoComodo[];
  };
};

export type ChavePadrao =
  | "gradienteIntimidade"
  | "luzDeDoisLados"
  | "passagensCurtas"
  | "salaNoCoracao";

export type PesosPadroes = Record<ChavePadrao, number>;

/* Arredonda para a malha de 5 cm: coordenada limpa e byte-determinística. */
export function r5(n: number) {
  return Math.round(n * 20) / 20;
}

/* Área com uma casa decimal. */
export function r1(n: number) {
  return Math.round(n * 10) / 10;
}
