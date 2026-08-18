/* =====================================================================
   POST /api/estudo/gerar
   Recebe lote + programa, roda o solver e grava estudo + variantes.
   O solver é síncrono e puro; a rota só autentica, valida e persiste.
   ===================================================================== */

import { criarClienteServidor } from "@/lib/supabase/server";
import { gerarEstudo } from "@/lib/solver/index.ts";
import {
  calibrarPesos,
  componentes,
  corteSocialDe,
  type Pesos,
} from "@/lib/solver/score.ts";
import {
  PARAMETROS,
  PESOS_ESTATISTICOS,
  PESOS_PADROES,
} from "@/lib/estudo/config";
import type {
  Comodo,
  FichaTecnica,
  ItemPrograma,
  Lote,
  OrientacaoNorte,
  Retangulo,
  TipoComodo,
} from "@/lib/solver/tipos.ts";

const ORIENTACOES: OrientacaoNorte[] = [
  "frente",
  "fundos",
  "esquerda",
  "direita",
];

const TIPOS: TipoComodo[] = [
  "sala",
  "cozinha",
  "quarto",
  "suite",
  "banho",
  "lavabo",
  "servico",
  "varanda",
];

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

/* Sem Ficha Técnica o sistema não gera (Art. 110): os parâmetros da
   zona vêm dela, lote a lote — nunca de default no código. */
function lerFicha(bruto: unknown): FichaTecnica | null {
  if (typeof bruto !== "object" || bruto === null) return null;
  const b = bruto as Record<string, unknown>;
  const ficha: FichaTecnica = {
    recuoFrontal: num(b.recuoFrontal),
    taxaOcupacaoMax: num(b.taxaOcupacaoMax),
    coeficienteAproveitamento: num(b.coeficienteAproveitamento),
    permeabilidadeMinima: num(b.permeabilidadeMinima),
    dataEmissao: typeof b.dataEmissao === "string" ? b.dataEmissao : "",
  };
  const ok =
    Number.isFinite(ficha.recuoFrontal) &&
    ficha.recuoFrontal >= 0 &&
    Number.isFinite(ficha.taxaOcupacaoMax) &&
    ficha.taxaOcupacaoMax > 0 &&
    ficha.taxaOcupacaoMax <= 1 &&
    Number.isFinite(ficha.coeficienteAproveitamento) &&
    ficha.coeficienteAproveitamento > 0 &&
    Number.isFinite(ficha.permeabilidadeMinima) &&
    ficha.permeabilidadeMinima >= 0 &&
    ficha.permeabilidadeMinima <= 1;
  return ok ? ficha : null;
}

function lerLote(bruto: unknown, ficha: FichaTecnica): Lote | null {
  if (typeof bruto !== "object" || bruto === null) return null;
  const b = bruto as Record<string, unknown>;
  const largura = num(b.largura);
  const profundidade = num(b.profundidade);
  if (!Number.isFinite(largura) || !Number.isFinite(profundidade)) return null;
  const lote: Lote = { largura, profundidade, ficha };
  if (ORIENTACOES.includes(b.orientacaoNorte as OrientacaoNorte)) {
    lote.orientacaoNorte = b.orientacaoNorte as OrientacaoNorte;
  }
  return lote;
}

function lerPrograma(bruto: unknown): ItemPrograma[] | null {
  if (!Array.isArray(bruto) || bruto.length === 0 || bruto.length > 30)
    return null;
  const programa: ItemPrograma[] = [];
  for (const item of bruto) {
    if (typeof item !== "object" || item === null) return null;
    const i = item as Record<string, unknown>;
    const tipo = i.tipo as TipoComodo;
    const quantidade = num(i.quantidade);
    const areaMin = num(i.areaMin);
    const areaAlvo = num(i.areaAlvo);
    if (!TIPOS.includes(tipo)) return null;
    if (
      !Number.isInteger(quantidade) ||
      quantidade < 0 ||
      quantidade > 10 ||
      !Number.isFinite(areaMin) ||
      !Number.isFinite(areaAlvo) ||
      areaMin < 0 ||
      areaAlvo < 0 ||
      areaAlvo > 200
    )
      return null;
    programa.push({ tipo, quantidade, areaMin, areaAlvo });
  }
  return programa;
}

export async function POST(request: Request) {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ erro: "NAO_AUTENTICADO" }, { status: 401 });
  }

  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return Response.json({ erro: "CORPO_INVALIDO" }, { status: 400 });
  }
  const b = corpo as Record<string, unknown>;
  const ficha = lerFicha(b.ficha);
  if (!ficha) {
    // aceite 6: sem Ficha Técnica o sistema não gera
    return Response.json(
      {
        erro: "FICHA_OBRIGATORIA",
        detalhe:
          "preencha a Ficha Técnica do lote (Art. 110): recuo frontal, taxa de ocupação, coeficiente e permeabilidade",
      },
      { status: 422 },
    );
  }
  const lote = lerLote(b.lote, ficha);
  const programa = lerPrograma(b.programa);
  if (!lote || !programa) {
    return Response.json({ erro: "CORPO_INVALIDO" }, { status: 400 });
  }
  const quantidade = Math.min(10, Math.max(1, num(b.quantidadeVariantes) || 6));
  const clienteId = typeof b.clienteId === "string" ? b.clienteId : null;
  const opcoes = { casaAcessivel: b.casaAcessivel === true };

  // calibração: as favoritas já marcadas puxam os pesos do score na
  // direção do gosto do escritório. Falha aqui nunca trava a geração.
  let pesos: Pesos = PESOS_ESTATISTICOS;
  let calibrado = false;
  try {
    const { data: historico } = await supabase
      .from("variantes")
      .select("comodos, patio, favorita, estudos(lote, programa)")
      .limit(500);
    if (historico) {
      const amostras = historico
        .filter((h) => h.estudos)
        .map((h) => {
          const est = h.estudos as unknown as {
            lote: Lote;
            programa: ItemPrograma[];
          };
          const comodos = h.comodos as unknown as Comodo[];
          return {
            comp: componentes(
              comodos,
              est.programa,
              corteSocialDe(comodos),
              est.lote,
              (h.patio as unknown as Retangulo | null) ?? undefined,
            ),
            favorita: Boolean(h.favorita),
          };
        });
      pesos = calibrarPesos(amostras, PESOS_ESTATISTICOS);
      calibrado = amostras.filter((a) => a.favorita).length >= 3;
    }
  } catch {
    pesos = PESOS_ESTATISTICOS;
  }

  const resultado = gerarEstudo(
    lote,
    programa,
    quantidade,
    PARAMETROS,
    PESOS_PADROES,
    pesos,
    opcoes,
  );
  if ("erro" in resultado) {
    return Response.json(resultado, { status: 422 });
  }

  // persistência: melhor esforço — se falhar, as plantas ainda voltam
  let estudoId: string | null = null;
  const idPorSeed = new Map<number, string>();
  const { data: perfil } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .maybeSingle();

  if (perfil) {
    const { data: estudo } = await supabase
      .from("estudos")
      .insert({
        org_id: perfil.org_id,
        cliente_id: clienteId,
        lote,
        programa,
      })
      .select("id")
      .single();

    if (estudo) {
      estudoId = estudo.id;
      const { data: gravadas } = await supabase
        .from("variantes")
        .insert(
          resultado.variantes.map((v) => ({
            org_id: perfil.org_id,
            estudo_id: estudo.id,
            seed: v.seed,
            comodos: v.comodos,
            portas: v.portas,
            patio: v.patio ?? null,
            area_construida: v.areaConstruida,
            score: v.score,
          })),
        )
        .select("id, seed");
      for (const g of gravadas ?? []) idPorSeed.set(g.seed, g.id);
    }
  }

  return Response.json({
    estudoId,
    calibrado,
    variantes: resultado.variantes.map((v) => ({
      ...v,
      id: idPorSeed.get(v.seed) ?? null,
    })),
  });
}
