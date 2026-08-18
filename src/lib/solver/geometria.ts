/* Geometria de retângulos no eixo de parede. Tolerância de 1 cm para
   absorver o arredondamento da malha de 5 cm. */

import type { Comodo } from "./tipos.ts";

const EPS = 0.01;

export function sobreposicao(
  a0: number,
  a1: number,
  b0: number,
  b1: number,
): number {
  return Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));
}

/** Comprimento da parede que dois cômodos compartilham (0 se não encostam). */
export function paredeComum(a: Comodo, b: Comodo): number {
  // lado a lado (parede vertical comum)
  if (
    Math.abs(a.x + a.largura - b.x) < EPS ||
    Math.abs(b.x + b.largura - a.x) < EPS
  ) {
    return sobreposicao(a.y, a.y + a.profundidade, b.y, b.y + b.profundidade);
  }
  // um atrás do outro (parede horizontal comum)
  if (
    Math.abs(a.y + a.profundidade - b.y) < EPS ||
    Math.abs(b.y + b.profundidade - a.y) < EPS
  ) {
    return sobreposicao(a.x, a.x + a.largura, b.x, b.x + b.largura);
  }
  return 0;
}

/** Os dois retângulos se invadem (não só encostam)? */
export function invade(a: Comodo, b: Comodo): boolean {
  return (
    sobreposicao(a.x, a.x + a.largura, b.x, b.x + b.largura) > EPS &&
    sobreposicao(a.y, a.y + a.profundidade, b.y, b.y + b.profundidade) > EPS
  );
}

/** Proporção do retângulo: sempre ≥ 1 (lado maior / lado menor). */
export function proporcao(c: Comodo): number {
  const menor = Math.min(c.largura, c.profundidade);
  const maior = Math.max(c.largura, c.profundidade);
  return menor > 0 ? maior / menor : Infinity;
}

/** Caixa envolvente do conjunto (a projeção construída). */
export function envolvente(comodos: Comodo[]) {
  const x0 = Math.min(...comodos.map((c) => c.x));
  const y0 = Math.min(...comodos.map((c) => c.y));
  const x1 = Math.max(...comodos.map((c) => c.x + c.largura));
  const y1 = Math.max(...comodos.map((c) => c.y + c.profundidade));
  return { x0, y0, x1, y1, largura: x1 - x0, profundidade: y1 - y0 };
}

/** O cômodo tem ao menos uma face inteira no perímetro da projeção? */
export function tocaPerimetro(
  c: Comodo,
  caixa: { x0: number; y0: number; x1: number; y1: number },
): boolean {
  return (
    Math.abs(c.x - caixa.x0) < EPS ||
    Math.abs(c.y - caixa.y0) < EPS ||
    Math.abs(c.x + c.largura - caixa.x1) < EPS ||
    Math.abs(c.y + c.profundidade - caixa.y1) < EPS
  );
}

export type FaceComodo = {
  /** coordenada da linha da face (y para "h", x para "v") */
  fixo: number;
  a: number;
  b: number;
  ori: "h" | "v";
  /** "frente" | "fundos" | "esquerda" | "direita" relativo ao cômodo */
  lado: "frente" | "fundos" | "esquerda" | "direita";
  /** metros de parede sem vizinho nessa face */
  livre: number;
};

/* As quatro faces do cômodo com o quanto de cada uma está sem vizinho —
   base do teste de iluminação (2B) e do padrão luz-de-dois-lados. */
export function facesDoComodo(c: Comodo, comodos: Comodo[]): FaceComodo[] {
  const faces: FaceComodo[] = [
    { fixo: c.y, a: c.x, b: c.x + c.largura, ori: "h", lado: "frente", livre: 0 },
    { fixo: c.y + c.profundidade, a: c.x, b: c.x + c.largura, ori: "h", lado: "fundos", livre: 0 },
    { fixo: c.x, a: c.y, b: c.y + c.profundidade, ori: "v", lado: "esquerda", livre: 0 },
    { fixo: c.x + c.largura, a: c.y, b: c.y + c.profundidade, ori: "v", lado: "direita", livre: 0 },
  ];
  for (const f of faces) {
    let coberto = 0;
    for (const o of comodos) {
      if (o === c) continue;
      if (f.ori === "h") {
        const encosta =
          Math.abs(o.y - f.fixo) < EPS ||
          Math.abs(o.y + o.profundidade - f.fixo) < EPS;
        if (encosta) coberto += sobreposicao(f.a, f.b, o.x, o.x + o.largura);
      } else {
        const encosta =
          Math.abs(o.x - f.fixo) < EPS ||
          Math.abs(o.x + o.largura - f.fixo) < EPS;
        if (encosta) coberto += sobreposicao(f.a, f.b, o.y, o.y + o.profundidade);
      }
    }
    f.livre = Math.max(0, f.b - f.a - coberto);
  }
  return faces;
}

/* O cômodo tem parede com o lado de fora? Uma face é livre quando nenhum
   outro cômodo cobre um trecho dela de pelo menos 90 cm — vale para o
   perímetro da casa e para o pátio de uma planta em L, onde a janela
   também é legítima. */
export function temFaceLivre(c: Comodo, comodos: Comodo[]): boolean {
  const faces: { fixo: number; a: number; b: number; ori: "h" | "v" }[] = [
    { fixo: c.y, a: c.x, b: c.x + c.largura, ori: "h" },
    { fixo: c.y + c.profundidade, a: c.x, b: c.x + c.largura, ori: "h" },
    { fixo: c.x, a: c.y, b: c.y + c.profundidade, ori: "v" },
    { fixo: c.x + c.largura, a: c.y, b: c.y + c.profundidade, ori: "v" },
  ];
  for (const f of faces) {
    let coberto = 0;
    for (const o of comodos) {
      if (o === c) continue;
      if (f.ori === "h") {
        const encosta =
          Math.abs(o.y - f.fixo) < EPS ||
          Math.abs(o.y + o.profundidade - f.fixo) < EPS;
        if (encosta) coberto += sobreposicao(f.a, f.b, o.x, o.x + o.largura);
      } else {
        const encosta =
          Math.abs(o.x - f.fixo) < EPS ||
          Math.abs(o.x + o.largura - f.fixo) < EPS;
        if (encosta) coberto += sobreposicao(f.a, f.b, o.y, o.y + o.profundidade);
      }
    }
    if (f.b - f.a - coberto >= 0.9) return true;
  }
  return false;
}
