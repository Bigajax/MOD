/* =====================================================================
   Croqui de implantação vivo: o lote visto de cima, redesenhado a cada
   tecla. Deitado — rua à esquerda — para caber na coluna do carimbo.
   Traço do lote em tinta média, envelope dos recuos tracejado, medidas
   e teto de construção no centro, agulha do norte quando informado.

   Coordenadas a K unidades por metro (o Chrome impõe piso ao font-size
   computado; texto de 1 "metro" seria inflado).
   ===================================================================== */

import type { OrientacaoNorte } from "@/lib/solver/tipos.ts";

const K = 10;

/* Deitado, a rosa gira junto: frente do lote fica à esquerda. */
const ANGULO: Record<OrientacaoNorte, number> = {
  frente: 270,
  fundos: 90,
  esquerda: 0,
  direita: 180,
};

function fmt(n: number) {
  return String(Math.round(n * 100) / 100).replace(".", ",");
}

export function CroquiLote({
  largura,
  profundidade,
  recuoFrontal,
  recuoFundos,
  recuoEsquerda,
  recuoDireita,
  taxa,
  norte,
}: {
  largura: number;
  profundidade: number;
  recuoFrontal: number;
  recuoFundos: number;
  recuoEsquerda: number;
  recuoDireita: number;
  /** em % */
  taxa: number;
  norte?: OrientacaoNorte;
}) {
  const ok =
    [largura, profundidade].every((n) => Number.isFinite(n) && n > 2) &&
    [recuoFrontal, recuoFundos, recuoEsquerda, recuoDireita].every(
      (n) => Number.isFinite(n) && n >= 0,
    );
  if (!ok) {
    return (
      <p className="dado py-3 text-center text-[11px] text-tinta-fraca">
        preencha as medidas para ver o lote
      </p>
    );
  }

  // deitado: profundidade no eixo x, largura no eixo y
  const W = profundidade * K;
  const H = largura * K;
  const ex = recuoFrontal * K;
  const ey = recuoEsquerda * K;
  const ew = Math.max(0, profundidade - recuoFrontal - recuoFundos) * K;
  const eh = Math.max(0, largura - recuoEsquerda - recuoDireita) * K;
  const areaMax = Math.round(
    Math.min(
      (ew / K) * (eh / K),
      Number.isFinite(taxa) ? largura * profundidade * (taxa / 100) : Infinity,
    ),
  );

  const mEsq = 15;
  const mTopo = norte ? 17 : 8;
  const cx = ex + ew / 2;
  const cy = ey + eh / 2;
  const nx = W - 8;
  const ny = -9;

  return (
    <svg
      viewBox={`${-mEsq} ${-mTopo} ${W + mEsq + 6} ${H + mTopo + 6}`}
      role="img"
      aria-label={`Lote de ${fmt(largura)} por ${fmt(profundidade)} metros`}
      style={{ display: "block", width: "100%", marginTop: 4 }}
    >
      <rect
        x={0}
        y={0}
        width={W}
        height={H}
        fill="none"
        stroke="var(--color-tinta-media)"
        strokeWidth={1.4}
      />
      {ew > 0 && eh > 0 ? (
        <rect
          x={ex}
          y={ey}
          width={ew}
          height={eh}
          fill="none"
          stroke="var(--color-traco-forte)"
          strokeWidth={1}
          strokeDasharray="4 3"
        />
      ) : null}

      {ew > 0 && eh > 26 ? (
        <>
          <text
            x={cx}
            y={cy - 4.5}
            textAnchor="middle"
            fill="var(--color-tinta-media)"
            style={{ font: "9.5px var(--font-mono)", letterSpacing: "0.05em" }}
          >
            {fmt(largura)} × {fmt(profundidade)} m
          </text>
          {Number.isFinite(areaMax) && eh > 44 ? (
            <text
              x={cx}
              y={cy + 9.5}
              textAnchor="middle"
              fill="var(--color-tinta-fraca)"
              style={{ font: "8px var(--font-mono)" }}
            >
              até {areaMax} m² de construção
            </text>
          ) : null}
        </>
      ) : null}

      <text
        x={-8}
        y={H / 2}
        textAnchor="middle"
        transform={`rotate(-90 -8 ${H / 2})`}
        fill="var(--color-tinta-fraca)"
        style={{ font: "7px var(--font-mono)", letterSpacing: "0.4em" }}
      >
        RUA
      </text>

      {norte ? (
        <g transform={`rotate(${ANGULO[norte]} ${nx} ${ny})`}>
          <line
            x1={nx}
            y1={ny + 5}
            x2={nx}
            y2={ny - 2}
            stroke="var(--color-tinta-media)"
            strokeWidth={1}
          />
          <path
            d={`M ${nx} ${ny - 7} L ${nx - 2.4} ${ny - 1.5} L ${nx + 2.4} ${ny - 1.5} Z`}
            fill="var(--color-tinta-media)"
          />
        </g>
      ) : null}
    </svg>
  );
}
