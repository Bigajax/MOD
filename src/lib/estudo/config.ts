/* =====================================================================
   Loader da config do solver. Os números moram em config/*.json — editar
   lá muda o resultado sem tocar em código (aceite 6 da Fase 2). O solver
   é puro e recebe tudo por parâmetro; este módulo é o único que conhece
   os arquivos, e funciona tanto no servidor quanto no client (o bundler
   embute os JSON).
   ===================================================================== */

import parametrosJson from "../../../config/parametros-solver.json";
import scoreJson from "../../../config/score.json";
import type {
  ChavePadrao,
  ParametrosSolver,
  PesosPadroes,
} from "@/lib/solver/tipos.ts";
import type { Pesos } from "@/lib/solver/score.ts";

export const PARAMETROS = parametrosJson as unknown as ParametrosSolver;

type ScoreConfig = {
  estatisticos: Pesos;
  padroes: Record<ChavePadrao, { pesoSugerido: number }>;
};

const score = scoreJson as unknown as ScoreConfig;

export const PESOS_ESTATISTICOS: Pesos = score.estatisticos;

export const PESOS_PADROES: PesosPadroes = {
  gradienteIntimidade: score.padroes.gradienteIntimidade.pesoSugerido,
  luzDeDoisLados: score.padroes.luzDeDoisLados.pesoSugerido,
  passagensCurtas: score.padroes.passagensCurtas.pesoSugerido,
  salaNoCoracao: score.padroes.salaNoCoracao.pesoSugerido,
};
