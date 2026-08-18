/* =====================================================================
   <PlantaSVG /> — a variante desenhada como prancha técnica.

   Parede é polígono cheio, não linha: um bloco de tinta na projeção
   inteira e o miolo de cada cômodo recortado em papel por cima — o
   offset do eixo (7,5 cm externa, 5 cm interna) sai de graça. Porta é
   vão com folha e arco de giro; janela é o vão com o par de traços
   finos, nas faces externas dos cômodos de permanência. O lettering é
   miúdo e espaçado: numa prancha quem fala é o traço, não a letra.

   O desenho trabalha a U unidades por metro (e não a 1) porque o
   Chrome impõe um piso ao font-size computado: texto menor que ~6px
   de valor seria inflado e engoliria a planta.
   ===================================================================== */

import type {
  Comodo,
  OrientacaoNorte,
  Porta,
  Variante,
} from "@/lib/solver/tipos.ts";
import { PERMANENCIA, ROTULO_COMODO } from "@/lib/solver/tipos.ts";
import { envolvente, sobreposicao } from "@/lib/solver/geometria.ts";

/* Giro da agulha do norte: o desenho tem a rua no topo. */
const ANGULO_NORTE: Record<OrientacaoNorte, number> = {
  frente: 0,
  direita: 90,
  fundos: 180,
  esquerda: 270,
};

const U = 40; // unidades SVG por metro
const META_EXT = 0.075; // metade da parede externa de 15 cm
const META_INT = 0.05; // metade da parede interna de 10 cm
const EPS = 0.03;

function m(n: number) {
  return n.toFixed(2).replace(".", ",");
}

/** "Quarto 2" quando há mais de um do tipo; senão só "Quarto". */
function rotulos(comodos: Comodo[]): Map<string, string> {
  const porTipo = new Map<string, number>();
  for (const c of comodos) porTipo.set(c.tipo, (porTipo.get(c.tipo) ?? 0) + 1);
  const vistos = new Map<string, number>();
  const nomes = new Map<string, string>();
  for (const c of comodos) {
    const n = (vistos.get(c.tipo) ?? 0) + 1;
    vistos.set(c.tipo, n);
    const base = ROTULO_COMODO[c.tipo];
    nomes.set(c.id, (porTipo.get(c.tipo) ?? 1) > 1 ? `${base} ${n}` : base);
  }
  return nomes;
}

type Janela = { x: number; y: number; comprimento: number; orientacao: "h" | "v" };

/* A face pode receber janela? Art. 88: nunca na divisa nem a menos de
   1,50 m dela. A frente é alinhamento (rua), sempre pode. */
function facePermitida(
  fixo: number,
  ori: "h" | "v",
  ehFundo: boolean,
  lote?: { largura: number; profundidade: number },
): boolean {
  if (!lote) return true;
  if (ori === "v") {
    return fixo >= 1.5 - EPS && lote.largura - fixo >= 1.5 - EPS;
  }
  if (ehFundo) return lote.profundidade - fixo >= 1.5 - EPS;
  return true; // frente
}

/* Uma janela por cômodo de permanência, na maior face externa permitida,
   desviando dos vãos de porta que dividem a mesma parede. */
function calcularJanelas(
  comodos: Comodo[],
  portas: Porta[],
  caixa: { x0: number; y0: number; x1: number; y1: number },
  lote?: { largura: number; profundidade: number },
): Janela[] {
  const janelas: Janela[] = [];

  for (const c of comodos) {
    if (!PERMANENCIA.includes(c.tipo)) continue;

    // faces externas do cômodo: [linha fixa, início, fim, orientação]
    const faces: { fixo: number; a: number; b: number; ori: "h" | "v" }[] = [];
    if (Math.abs(c.y - caixa.y0) < EPS)
      faces.push({ fixo: c.y, a: c.x, b: c.x + c.largura, ori: "h" });
    if (
      Math.abs(c.y + c.profundidade - caixa.y1) < EPS &&
      facePermitida(c.y + c.profundidade, "h", true, lote)
    )
      faces.push({ fixo: c.y + c.profundidade, a: c.x, b: c.x + c.largura, ori: "h" });
    if (
      Math.abs(c.x - caixa.x0) < EPS &&
      facePermitida(c.x, "v", false, lote)
    )
      faces.push({ fixo: c.x, a: c.y, b: c.y + c.profundidade, ori: "v" });
    if (
      Math.abs(c.x + c.largura - caixa.x1) < EPS &&
      facePermitida(c.x + c.largura, "v", false, lote)
    )
      faces.push({ fixo: c.x + c.largura, a: c.y, b: c.y + c.profundidade, ori: "v" });

    // maior face primeiro
    faces.sort((f, g) => g.b - g.a - (f.b - f.a));

    let feita = false;
    for (const f of faces) {
      if (feita) break;
      const vao = f.b - f.a;
      if (vao < 1.4) continue;
      const comp = Math.min(1.8, Math.max(1, vao * 0.4));
      for (const fracao of [0.5, 0.3, 0.7]) {
        const inicio = f.a + vao * fracao - comp / 2;
        if (inicio < f.a + 0.25 || inicio + comp > f.b - 0.25) continue;
        const bate = portas.some((p) => {
          if (p.orientacao !== f.ori) return false;
          const linha = f.ori === "h" ? p.y : p.x;
          if (Math.abs(linha - f.fixo) > EPS) return false;
          const p0 = f.ori === "h" ? p.x : p.y;
          return sobreposicao(inicio, inicio + comp, p0 - 0.2, p0 + p.comprimento + 0.2) > 0;
        });
        if (bate) continue;
        janelas.push(
          f.ori === "h"
            ? { x: inicio, y: f.fixo, comprimento: comp, orientacao: "h" }
            : { x: f.fixo, y: inicio, comprimento: comp, orientacao: "v" },
        );
        feita = true;
        break;
      }
    }
  }
  return janelas;
}

/* Folha + arco de giro da porta, no padrão de desenho: a folha encosta
   num batente e o arco varre até o outro. */
function Giro({ porta }: { porta: Porta }) {
  const L = porta.comprimento * U;
  const s = porta.lado;
  if (porta.orientacao === "h") {
    const hx = porta.x * U;
    const hy = porta.y * U;
    return (
      <g fill="none">
        <path
          d={`M ${hx} ${hy} L ${hx} ${hy + s * L}`}
          stroke="var(--color-tinta)"
          strokeWidth={0.035 * U}
        />
        <path
          d={`M ${hx} ${hy + s * L} A ${L} ${L} 0 0 ${s > 0 ? 0 : 1} ${hx + L} ${hy}`}
          stroke="var(--color-traco-forte)"
          strokeWidth={0.018 * U}
        />
      </g>
    );
  }
  const hx = porta.x * U;
  const hy = porta.y * U;
  return (
    <g fill="none">
      <path
        d={`M ${hx} ${hy} L ${hx + s * L} ${hy}`}
        stroke="var(--color-tinta)"
        strokeWidth={0.035 * U}
      />
      <path
        d={`M ${hx + s * L} ${hy} A ${L} ${L} 0 0 ${s > 0 ? 1 : 0} ${hx} ${hy + L}`}
        stroke="var(--color-traco-forte)"
        strokeWidth={0.018 * U}
      />
    </g>
  );
}

export function PlantaSVG({
  variante,
  escala,
  norte,
  lote,
}: {
  variante: Variante;
  /** pixels por metro; sem escala o SVG ocupa a largura disponível */
  escala?: number;
  /** quando informado, desenha a agulha do norte no canto das cotas */
  norte?: OrientacaoNorte;
  /** medidas do lote: janelas respeitam a divisa (Art. 88) e a vaga aparece */
  lote?: { largura: number; profundidade: number };
}) {
  const { comodos, portas, patio, vaga } = variante;
  const caixa = envolvente(comodos);
  const nomes = rotulos(comodos);
  const janelas = calcularJanelas(comodos, portas, caixa, lote);

  // tudo em unidades do desenho a partir daqui
  const x0 = caixa.x0 * U;
  const y0 = caixa.y0 * U;
  const x1 = caixa.x1 * U;
  const y1 = caixa.y1 * U;

  // a vaga fica na frente (entre a rua e a casa): o desenho sobe até ela
  const topoY = vaga ? Math.min(y0, vaga.y * U) : y0;

  // margens: esquerda para a cota de profundidade; a cota de largura
  // desce para os fundos, porque a frente agora é da vaga
  const mEsq = 1.4 * U;
  const mTopo = 0.7 * U;
  const mBaixo = 1.3 * U;
  const mDir = 0.5 * U;
  const vbX = x0 - mEsq;
  const vbY = topoY - mTopo;
  const vbW = x1 - x0 + mEsq + mDir;
  const vbH = y1 - topoY + mTopo + mBaixo;

  // linha de cota afastada da parede, chamadas até os cantos
  const yCota = y1 + 0.8 * U;
  const xCota = x0 - 0.8 * U;

  const fonteNome = {
    font: `500 ${0.22 * U}px var(--font-mono)`,
    letterSpacing: "0.16em",
    textTransform: "uppercase" as const,
  };
  const fonteDado = {
    font: `${0.18 * U}px var(--font-mono)`,
    letterSpacing: "0.04em",
  };
  const fonteCirc = {
    font: `${0.17 * U}px var(--font-mono)`,
    letterSpacing: "0.3em",
    textTransform: "uppercase" as const,
  };
  const fonteCota = { font: `${0.24 * U}px var(--font-mono)` };

  return (
    <svg
      viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
      width={escala ? (vbW / U) * escala : undefined}
      role="img"
      aria-label={`Planta baixa, ${m(caixa.largura)} por ${m(caixa.profundidade)} metros`}
      style={{ display: "block", width: escala ? undefined : "100%" }}
    >
      {/* massa de parede: projeção inteira em tinta */}
      <rect
        x={x0 - META_EXT * U}
        y={y0 - META_EXT * U}
        width={x1 - x0 + 2 * META_EXT * U}
        height={y1 - y0 + 2 * META_EXT * U}
        fill="var(--color-tinta)"
      />

      {/* miolo de cada cômodo recortado em papel, com offset do eixo */}
      {comodos.map((c) => {
        const eEsq = (Math.abs(c.x * U - x0) < 1 ? META_EXT : META_INT) * U;
        const eTopo = (Math.abs(c.y * U - y0) < 1 ? META_EXT : META_INT) * U;
        const eDir =
          (Math.abs((c.x + c.largura) * U - x1) < 1 ? META_EXT : META_INT) * U;
        const eBaixo =
          (Math.abs((c.y + c.profundidade) * U - y1) < 1
            ? META_EXT
            : META_INT) * U;
        return (
          <rect
            key={c.id}
            x={c.x * U + eEsq}
            y={c.y * U + eTopo}
            width={c.largura * U - eEsq - eDir}
            height={c.profundidade * U - eTopo - eBaixo}
            fill="var(--color-painel)"
          />
        );
      })}

      {/* pátio: recorte aberto na projeção — o chão de fora entra na
          planta, com contorno tracejado e rótulo */}
      {patio
        ? (() => {
            const naEsq = Math.abs(patio.x - caixa.x0) < EPS;
            const naDir =
              Math.abs(patio.x + patio.largura - caixa.x1) < EPS;
            const noTopo = Math.abs(patio.y - caixa.y0) < EPS;
            const noFundo =
              Math.abs(patio.y + patio.profundidade - caixa.y1) < EPS;
            const px0 = patio.x - (naEsq ? META_EXT + 0.02 : -META_EXT);
            const px1 =
              patio.x + patio.largura + (naDir ? META_EXT + 0.02 : -META_EXT);
            const py0 = patio.y - (noTopo ? META_EXT + 0.02 : -META_EXT);
            const py1 =
              patio.y +
              patio.profundidade +
              (noFundo ? META_EXT + 0.02 : -META_EXT);
            const cx = ((px0 + px1) / 2) * U;
            const cy = ((py0 + py1) / 2) * U;
            return (
              <g>
                <rect
                  x={px0 * U}
                  y={py0 * U}
                  width={(px1 - px0) * U}
                  height={(py1 - py0) * U}
                  fill="var(--color-viewport)"
                />
                <rect
                  x={(px0 + 0.12) * U}
                  y={(py0 + 0.12) * U}
                  width={(px1 - px0 - 0.24) * U}
                  height={(py1 - py0 - 0.24) * U}
                  fill="none"
                  stroke="var(--color-traco-forte)"
                  strokeWidth={0.02 * U}
                  strokeDasharray={`${0.14 * U} ${0.1 * U}`}
                />
                <text
                  x={cx}
                  y={cy + 0.06 * U}
                  textAnchor="middle"
                  fill="var(--color-tinta-fraca)"
                  style={fonteCirc}
                >
                  pátio
                </text>
              </g>
            );
          })()
        : null}

      {/* vaga de auto descoberta na frente (Art. 23; Art. 25 red. 2019) */}
      {vaga ? (
        <g>
          <rect
            x={vaga.x * U}
            y={vaga.y * U}
            width={vaga.largura * U}
            height={vaga.profundidade * U}
            fill="var(--color-viewport)"
          />
          <rect
            x={(vaga.x + 0.1) * U}
            y={(vaga.y + 0.1) * U}
            width={(vaga.largura - 0.2) * U}
            height={(vaga.profundidade - 0.2) * U}
            fill="none"
            stroke="var(--color-traco-forte)"
            strokeWidth={0.02 * U}
            strokeDasharray={`${0.14 * U} ${0.1 * U}`}
          />
          <text
            x={(vaga.x + vaga.largura / 2) * U}
            y={(vaga.y + vaga.profundidade / 2) * U + 0.06 * U}
            textAnchor="middle"
            fill="var(--color-tinta-fraca)"
            style={fonteCirc}
            transform={`rotate(-90 ${(vaga.x + vaga.largura / 2) * U} ${(vaga.y + vaga.profundidade / 2) * U})`}
          >
            vaga
          </text>
        </g>
      ) : null}

      {/* portas: vão na parede + folha e arco de giro */}
      {portas.map((p, i) => (
        <g key={`p-${i}`}>
          {p.orientacao === "h" ? (
            <rect
              x={p.x * U}
              y={(p.y - 0.1) * U}
              width={p.comprimento * U}
              height={0.2 * U}
              fill="var(--color-painel)"
            />
          ) : (
            <rect
              x={(p.x - 0.1) * U}
              y={p.y * U}
              width={0.2 * U}
              height={p.comprimento * U}
              fill="var(--color-painel)"
            />
          )}
          <Giro porta={p} />
        </g>
      ))}

      {/* janelas: vão com par de traços finos */}
      {janelas.map((j, i) => {
        if (j.orientacao === "h") {
          const a = j.x * U;
          const b = (j.x + j.comprimento) * U;
          const yj = j.y * U;
          return (
            <g key={`j-${i}`} stroke="var(--color-tinta)" strokeWidth={0.022 * U}>
              <rect
                x={a}
                y={yj - 0.1 * U}
                width={b - a}
                height={0.2 * U}
                fill="var(--color-painel)"
                stroke="none"
              />
              <line x1={a} y1={yj - 0.045 * U} x2={b} y2={yj - 0.045 * U} />
              <line x1={a} y1={yj + 0.045 * U} x2={b} y2={yj + 0.045 * U} />
            </g>
          );
        }
        const a = j.y * U;
        const b = (j.y + j.comprimento) * U;
        const xj = j.x * U;
        return (
          <g key={`j-${i}`} stroke="var(--color-tinta)" strokeWidth={0.022 * U}>
            <rect
              x={xj - 0.1 * U}
              y={a}
              width={0.2 * U}
              height={b - a}
              fill="var(--color-painel)"
              stroke="none"
            />
            <line x1={xj - 0.045 * U} y1={a} x2={xj - 0.045 * U} y2={b} />
            <line x1={xj + 0.045 * U} y1={a} x2={xj + 0.045 * U} y2={b} />
          </g>
        );
      })}

      {/* nome + área de cada cômodo. O rótulo foge da parede da porta,
          para o arco de giro não atravessar a letra. */}
      {comodos.map((c) => {
        let dx = 0;
        let dy = 0;
        const porta = portas.find((p) => {
          if (p.orientacao === "v") {
            const naParede =
              Math.abs(p.x - c.x) < EPS ||
              Math.abs(p.x - (c.x + c.largura)) < EPS;
            return (
              naParede &&
              sobreposicao(p.y, p.y + p.comprimento, c.y, c.y + c.profundidade) >
                p.comprimento / 2
            );
          }
          const naParede =
            Math.abs(p.y - c.y) < EPS ||
            Math.abs(p.y - (c.y + c.profundidade)) < EPS;
          return (
            naParede &&
            sobreposicao(p.x, p.x + p.comprimento, c.x, c.x + c.largura) >
              p.comprimento / 2
          );
        });
        if (porta && c.tipo !== "circulacao") {
          const passo = Math.min(0.3, c.largura / 6, c.profundidade / 6);
          if (porta.orientacao === "v") {
            dx = Math.abs(porta.x - c.x) < EPS ? passo : -passo;
          } else {
            dy = Math.abs(porta.y - c.y) < EPS ? passo : -passo;
          }
        }
        const cx = (c.x + c.largura / 2 + dx) * U;
        const cy = (c.y + c.profundidade / 2 + dy) * U;
        const deitado = c.tipo === "circulacao" && c.profundidade > c.largura;
        if (c.tipo === "circulacao") {
          return (
            <text
              key={`t-${c.id}`}
              x={cx}
              y={cy + 0.06 * U}
              textAnchor="middle"
              fill="var(--color-tinta-fraca)"
              style={fonteCirc}
              transform={deitado ? `rotate(-90 ${cx} ${cy})` : undefined}
            >
              circ.
            </text>
          );
        }
        return (
          <g key={`t-${c.id}`}>
            <text
              x={cx}
              y={cy - 0.06 * U}
              textAnchor="middle"
              fill="var(--color-tinta)"
              style={fonteNome}
            >
              {nomes.get(c.id)}
            </text>
            <text
              x={cx}
              y={cy + 0.26 * U}
              textAnchor="middle"
              fill="var(--color-tinta-fraca)"
              style={fonteDado}
            >
              {c.area.toFixed(1).replace(".", ",")} m²
            </text>
          </g>
        );
      })}

      {/* cota geral de largura — nos fundos: a frente agora é da vaga */}
      <g stroke="var(--color-traco-forte)" strokeWidth={0.02 * U}>
        <line x1={x0} y1={y1 + 0.2 * U} x2={x0} y2={yCota + 0.12 * U} />
        <line x1={x1} y1={y1 + 0.2 * U} x2={x1} y2={yCota + 0.12 * U} />
        <line x1={x0} y1={yCota} x2={x1} y2={yCota} />
        <line
          x1={x0 - 0.08 * U}
          y1={yCota + 0.08 * U}
          x2={x0 + 0.08 * U}
          y2={yCota - 0.08 * U}
          strokeWidth={0.032 * U}
        />
        <line
          x1={x1 - 0.08 * U}
          y1={yCota + 0.08 * U}
          x2={x1 + 0.08 * U}
          y2={yCota - 0.08 * U}
          strokeWidth={0.032 * U}
        />
      </g>
      <text
        x={(x0 + x1) / 2}
        y={yCota + 0.34 * U}
        textAnchor="middle"
        fill="var(--color-tinta-media)"
        style={fonteCota}
      >
        {m(caixa.largura)}
      </text>

      {/* cota geral de profundidade (esquerda) */}
      <g stroke="var(--color-traco-forte)" strokeWidth={0.02 * U}>
        <line x1={x0 - 0.2 * U} y1={y0} x2={xCota - 0.12 * U} y2={y0} />
        <line x1={x0 - 0.2 * U} y1={y1} x2={xCota - 0.12 * U} y2={y1} />
        <line x1={xCota} y1={y0} x2={xCota} y2={y1} />
        <line
          x1={xCota - 0.08 * U}
          y1={y0 + 0.08 * U}
          x2={xCota + 0.08 * U}
          y2={y0 - 0.08 * U}
          strokeWidth={0.032 * U}
        />
        <line
          x1={xCota - 0.08 * U}
          y1={y1 + 0.08 * U}
          x2={xCota + 0.08 * U}
          y2={y1 - 0.08 * U}
          strokeWidth={0.032 * U}
        />
      </g>
      <text
        x={xCota - 0.14 * U}
        y={(y0 + y1) / 2}
        textAnchor="middle"
        transform={`rotate(-90 ${xCota - 0.14 * U} ${(y0 + y1) / 2})`}
        fill="var(--color-tinta-media)"
        style={fonteCota}
      >
        {m(caixa.profundidade)}
      </text>

      {/* a frente do lote fica no topo do desenho */}
      <text
        x={(x0 + x1) / 2}
        y={topoY - 0.24 * U}
        textAnchor="middle"
        fill="var(--color-tinta-fraca)"
        style={{
          font: `${0.16 * U}px var(--font-mono)`,
          letterSpacing: "0.42em",
        }}
      >
        RUA
      </text>

      {/* agulha do norte, no canto morto junto às cotas de baixo */}
      {norte
        ? (() => {
            const nx = x0 - 0.85 * U;
            const ny = y1 + 0.85 * U;
            return (
              <g transform={`rotate(${ANGULO_NORTE[norte]} ${nx} ${ny})`}>
                <line
                  x1={nx}
                  y1={ny + 0.22 * U}
                  x2={nx}
                  y2={ny - 0.08 * U}
                  stroke="var(--color-tinta-media)"
                  strokeWidth={0.025 * U}
                />
                <path
                  d={`M ${nx} ${ny - 0.3 * U} L ${nx - 0.07 * U} ${ny - 0.07 * U} L ${nx + 0.07 * U} ${ny - 0.07 * U} Z`}
                  fill="var(--color-tinta-media)"
                />
                <text
                  x={nx + 0.16 * U}
                  y={ny - 0.12 * U}
                  fill="var(--color-tinta-fraca)"
                  style={{ font: `500 ${0.18 * U}px var(--font-mono)` }}
                >
                  N
                </text>
              </g>
            );
          })()
        : null}
    </svg>
  );
}
