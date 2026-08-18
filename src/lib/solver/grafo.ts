/* =====================================================================
   Grafo de acessos: cômodos são nós, portas são arestas. É sobre ele
   que os padrões de Alexander medem — profundidade desde a entrada
   (gradiente de intimidade) e grau da sala (coração da casa).
   ===================================================================== */

import type { Comodo, Porta } from "./tipos.ts";
import { sobreposicao } from "./geometria.ts";

const EPS = 0.03;

/** Cômodos que encostam no segmento de uma porta (0, 1 ou 2). */
function vizinhosDaPorta(p: Porta, comodos: Comodo[]): Comodo[] {
  return comodos.filter((c) => {
    if (p.orientacao === "h") {
      const naLinha =
        Math.abs(c.y - p.y) < EPS ||
        Math.abs(c.y + c.profundidade - p.y) < EPS;
      return (
        naLinha &&
        sobreposicao(p.x, p.x + p.comprimento, c.x, c.x + c.largura) >=
          p.comprimento - EPS
      );
    }
    const naLinha =
      Math.abs(c.x - p.x) < EPS || Math.abs(c.x + c.largura - p.x) < EPS;
    return (
      naLinha &&
      sobreposicao(p.y, p.y + p.comprimento, c.y, c.y + c.profundidade) >=
        p.comprimento - EPS
    );
  });
}

export type GrafoAcessos = {
  /** profundidade BFS desde a porta de entrada; Infinity = inalcançável */
  profundidade: Map<string, number>;
  /** número de portas de cada cômodo (a entrada conta) */
  grau: Map<string, number>;
  /** id do cômodo onde a porta de entrada abre (null se não houver) */
  entradaEm: string | null;
};

export function grafoAcessos(comodos: Comodo[], portas: Porta[]): GrafoAcessos {
  const arestas = new Map<string, string[]>();
  const grau = new Map<string, number>();
  for (const c of comodos) {
    arestas.set(c.id, []);
    grau.set(c.id, 0);
  }

  let entradaEm: string | null = null;
  for (const p of portas) {
    const viz = vizinhosDaPorta(p, comodos);
    if (viz.length === 2) {
      arestas.get(viz[0].id)!.push(viz[1].id);
      arestas.get(viz[1].id)!.push(viz[0].id);
      grau.set(viz[0].id, grau.get(viz[0].id)! + 1);
      grau.set(viz[1].id, grau.get(viz[1].id)! + 1);
    } else if (viz.length === 1) {
      // porta para fora: a primeira é a entrada da casa
      if (entradaEm === null) entradaEm = viz[0].id;
      grau.set(viz[0].id, grau.get(viz[0].id)! + 1);
    }
  }

  const profundidade = new Map<string, number>();
  for (const c of comodos) profundidade.set(c.id, Infinity);
  if (entradaEm !== null) {
    profundidade.set(entradaEm, 0);
    const fila = [entradaEm];
    while (fila.length > 0) {
      const atual = fila.shift()!;
      const d = profundidade.get(atual)!;
      for (const proximo of arestas.get(atual) ?? []) {
        if (profundidade.get(proximo)! > d + 1) {
          profundidade.set(proximo, d + 1);
          fila.push(proximo);
        }
      }
    }
  }

  return { profundidade, grau, entradaEm };
}
